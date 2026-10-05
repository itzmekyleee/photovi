#!/usr/bin/env python3
"""Rasterise the Photovi launcher icons from their SVG sources.

Sources
    assets/icons/app-icon.svg              full-bleed mark
    assets/photovi_logo_foreground.svg    bare iris, no background

The maskable icon is assembled from the foreground file: platform masks can
crop up to 20% off every edge, so the iris is scaled to 64% and centred, which
keeps it inside the 80% safe zone the PWA spec guarantees.

Requires headless Chrome on PATH. Run from the repository root:

    python3 tools/generate-icons.py
"""

import io
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

try:
    from PIL import Image
except ImportError:  # optional: only used to shrink the PNGs after capture
    Image = None

ROOT = pathlib.Path(__file__).resolve().parent.parent
ICONS = ROOT / "assets" / "icons"

CHROME_CANDIDATES = ("google-chrome", "chromium", "chromium-browser", "google-chrome-stable")

# (output name, px, source, iris scale) — scale 1 means "use the source as-is".
TARGETS = [
    ("icon-192.png", 192, "app", 1.0),
    ("icon-512.png", 512, "app", 1.0),
    ("apple-touch-icon.png", 180, "app", 0.86),
    ("icon-maskable-512.png", 512, "maskable", 0.64),
]

HARNESS = """<!doctype html>
<meta charset="utf-8">
<style>
  html, body {{ margin: 0; padding: 0; background: transparent; }}
  svg {{ display: block; }}
</style>
{markup}
"""

ROOT_SVG = (
    '<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
    'viewBox="0 0 1024 1024">{body}</svg>'
)


def find_chrome() -> str:
    for name in CHROME_CANDIDATES:
        found = shutil.which(name)
        if found:
            return found
    sys.exit("No Chrome/Chromium binary found on PATH.")


def strip_svg_wrapper(text: str) -> str:
    """Return the inner markup of an SVG document, without the root element."""
    text = re.sub(r"<!--.*?-->", "", text, flags=re.S)
    text = re.sub(r"<\?xml.*?\?>", "", text, flags=re.S)
    inner = re.search(r"<svg\b[^>]*>(.*)</svg>", text, flags=re.S)
    if not inner:
        sys.exit("Could not find an <svg> root element in the source file.")
    return inner.group(1).strip()


def app_icon_parts() -> tuple[str, str]:
    """Split app-icon.svg into (defs + backdrop rects, iris group)."""
    inner = strip_svg_wrapper((ICONS / "app-icon.svg").read_text())
    head, sep, iris = inner.partition('<g id="iris"')
    if not sep:
        sys.exit('app-icon.svg is missing the <g id="iris"> split point.')
    return head.strip(), '<g id="iris"' + iris.rsplit("</svg>", 1)[0].strip()


def scaled(markup: str, scale: float) -> str:
    return (
        f'<g transform="translate(512 512) scale({scale}) translate(-512 -512)">'
        f"{markup}</g>"
    )


def build_markup(source: str, size: int, scale: float) -> str:
    backdrop, iris = app_icon_parts()
    if source == "app":
        body = backdrop + (iris if scale == 1.0 else scaled(iris, scale))
    else:
        # Maskable: reuse the bare iris from photovi_logo_foreground.svg so the
        # two files stay in lockstep, on top of the shared full-bleed backdrop.
        foreground = strip_svg_wrapper(
            (ROOT / "assets" / "photovi_logo_foreground.svg").read_text()
        )
        body = backdrop + scaled(foreground, scale)
    return ROOT_SVG.format(size=size, body=body)


def render(chrome: str, markup: str, size: int, out: pathlib.Path) -> None:
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False) as fh:
        fh.write(HARNESS.format(size=size, markup=markup))
        page = pathlib.Path(fh.name)
    try:
        subprocess.run(
            [
                chrome,
                "--headless",
                "--disable-gpu",
                "--no-sandbox",
                "--hide-scrollbars",
                "--default-background-color=00000000",
                f"--screenshot={out}",
                f"--window-size={size},{size}",
                page.as_uri(),
            ],
            check=True,
            capture_output=True,
        )
    finally:
        page.unlink(missing_ok=True)


def repack(out: pathlib.Path) -> None:
    """Re-encode the capture losslessly; Chrome's PNG writer is not tight."""
    if Image is None:
        return
    image = Image.open(out)
    buffer = io.BytesIO()
    image.save(buffer, "PNG", optimize=True)
    out.write_bytes(buffer.getvalue())


def main() -> None:
    chrome = find_chrome()
    for name, size, source, scale in TARGETS:
        out = ICONS / name
        render(chrome, build_markup(source, size, scale), size, out)
        repack(out)
        print(f"{name:26s} {size}x{size}  {out.stat().st_size / 1024:.1f} KB")


if __name__ == "__main__":
    main()