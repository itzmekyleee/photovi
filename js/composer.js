// Strip composition: computes layout geometry, draws the strip (backdrop,
// header, photo cells, stickers, footer) and provides cell baking for the
// GIF / grid flows.

import { preloadStickers, resolveStickerId, stickerImage } from './stickers.js';

export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image failed to load'));
    img.src = src;
  });
}

export function roundedRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  if (ctx.roundRect) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, rr);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function spacedText(ctx, text, x, y, spacing) {
  ctx.save();
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (text.length - 1);
  let cx = x - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.restore();
}

export function computeGeometry({ width, layout, orientation, count }) {
  const pad = Math.max(18, Math.round(width * 0.032));
  const gap = Math.max(10, Math.round(width * 0.016));
  const aspect = orientation.aspect; // w / h
  const cols = layout.cols || 1;
  const rows = Math.max(1, Math.ceil(count / cols));
  const innerW = width - pad * 2;
  const cellW = layout.id === 'strip'
    ? Math.round(innerW * 0.72)
    : Math.floor((innerW - gap * (cols - 1)) / cols);
  const cellH = Math.round(cellW / aspect);
  const gridW = cellW * cols + gap * (cols - 1);
  const gridH = cellH * rows + gap * (rows - 1);
  return { pad, gap, cols, rows, cellW, cellH, gridW, gridH, innerW };
}

export function headerMetrics(width, title, subtitle) {
  const titleFont = Math.max(14, Math.round(width * 0.034));
  const subFont = Math.max(10, Math.round(width * 0.0135));
  const hasTitle = !!(title && title.trim());
  const hasSub = !!(subtitle && subtitle.trim());
  const headerH = (hasTitle ? titleFont + 4 : 0) + (hasSub ? subFont + 2 : 0) + 10;
  return { titleFont, subFont, hasTitle, hasSub, headerH };
}

function drawCellFrame(ctx, x, y, w, h, geo, theme) {
  const radius = Math.round(geo.cellW * 0.025);
  if (!theme.cellStroke || theme.cellStroke === 'transparent') return;
  roundedRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius);
  ctx.strokeStyle = theme.cellStroke;
  ctx.lineWidth = Math.max(1, Math.round(geo.cellW * 0.0028));
  ctx.stroke();
}

function drawEmptyCell(ctx, x, y, w, h, geo, theme) {
  const radius = Math.round(geo.cellW * 0.025);
  ctx.save();
  ctx.setLineDash([8, 8]);
  ctx.strokeStyle = theme.caption;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2;
  roundedRectPath(ctx, x, y, w, h, radius);
  ctx.stroke();
  ctx.restore();
}

// Draw an image cover-fit into a cell rectangle (crop-to-fill, no distortion).
function drawFitCell(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) {
    ctx.drawImage(img, x, y, w, h);
    return;
  }
  const dstA = w / h;
  const srcA = iw / ih;
  if (srcA > dstA) {
    const sw = ih * dstA;
    ctx.drawImage(img, (iw - sw) / 2, 0, sw, ih, x, y, w, h);
  } else {
    const sh = iw / dstA;
    ctx.drawImage(img, 0, (ih - sh) / 2, iw, sh, x, y, w, h);
  }
}

function drawSticker(ctx, x, y, w, h, sticker) {
  const img = stickerImage(resolveStickerId(sticker));
  if (!img) return;
  const size = sticker.size * Math.min(w, h);
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.28)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.04;
  ctx.drawImage(img, x + sticker.x * w - size / 2, y + sticker.y * h - size / 2, size, size);
  ctx.restore();
}

export async function composeStrip(opts) {
  const {
    width,
    frames,
    layout,
    orientation,
    theme,
    title,
    subtitle,
    stickerMap = {},
    stripNumber = null,
    dateLabel,
  } = opts;

  const count = frames.length;
  const geo = computeGeometry({ width, layout, orientation, count });
  const hdr = headerMetrics(width, title, subtitle);
  const footerFont = Math.max(10, Math.round(width * 0.012));
  const footerH = footerFont * 2 + 20;
  const height = geo.pad + hdr.headerH + geo.gap + geo.gridH + geo.gap + footerH + geo.pad;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  // Backdrop
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, width, height);

  const gridX = Math.round((width - geo.gridW) / 2);
  const gridY = geo.pad + hdr.headerH + geo.gap;

  // Header
  ctx.save();
  ctx.fillStyle = theme.header;
  ctx.font = `700 ${hdr.titleFont}px "Space Grotesk", sans-serif`;
  let cursorY = gridY - geo.gap - (hdr.hasSub ? hdr.subFont + 12 : 6);
  if (hdr.hasTitle) {
    spacedText(ctx, (title || '').toUpperCase(), width / 2, cursorY, Math.max(1, Math.round(hdr.titleFont * 0.14)));
    cursorY += hdr.titleFont;
  }
  if (hdr.hasSub) {
    ctx.fillStyle = theme.caption;
    ctx.font = `500 ${hdr.subFont}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(subtitle, width / 2, cursorY);
  }
  // Accent rule
  const ruleW = Math.max(26, Math.round(width * 0.05));
  ctx.fillStyle = theme.accent;
  roundedRectPath(ctx, width / 2 - ruleW / 2, cursorY + 4, ruleW, Math.max(3, Math.round(width * 0.0032)), 2);
  ctx.fill();
  ctx.restore();

  // Cells + stickers
  await preloadStickers();
  const radius = Math.round(geo.cellW * 0.025);
  const loaded = await Promise.all(
    frames.map((f) => (f ? loadImage(f).catch(() => null) : null)),
  );

  for (let i = 0; i < count; i++) {
    const col = i % (geo.cols || 1);
    const row = Math.floor(i / (geo.cols || 1));
    const x = gridX + col * (geo.cellW + geo.gap);
    const y = gridY + row * (geo.cellH + geo.gap);

    if (loaded[i]) {
      ctx.save();
      roundedRectPath(ctx, x, y, geo.cellW, geo.cellH, radius);
      ctx.clip();
      drawFitCell(ctx, loaded[i], x, y, geo.cellW, geo.cellH);
      ctx.restore();
      drawCellFrame(ctx, x, y, geo.cellW, geo.cellH, geo, theme);

      const stickies = stickerMap[i];
      if (stickies) stickies.forEach((s) => drawSticker(ctx, x, y, geo.cellW, geo.cellH, s));
    } else {
      drawEmptyCell(ctx, x, y, geo.cellW, geo.cellH, geo, theme);
    }
  }

  // Footer
  const footerY = height - geo.pad - footerH / 2;
  const date = dateLabel || new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  ctx.save();
  ctx.textBaseline = 'middle';
  ctx.font = `500 ${footerFont}px "Inter", sans-serif`;
  ctx.fillStyle = theme.caption;
  if (stripNumber != null) {
    ctx.textAlign = 'left';
    ctx.fillText(`photovi strip #${stripNumber}`, geo.pad, footerY);
  }
  ctx.textAlign = 'right';
  ctx.fillText(date, width - geo.pad, footerY);
  ctx.restore();

  return canvas;
}

// Bake just the photos (plus stickers) into a row of cell canvases, used by
// the boomerang GIF. Photos already arrive mirror-corrected from capture.
export async function bakeCellImages({ frames, orientation, stickerMap = {} }, cellW) {
  const cellH = Math.round(cellW / orientation.aspect);
  const out = [];
  await preloadStickers();
  for (let i = 0; i < frames.length; i++) {
    const c = document.createElement('canvas');
    c.width = cellW;
    c.height = cellH;
    const ctx = c.getContext('2d');
    const img = frames[i] ? await loadImage(frames[i]) : null;
    if (img) drawFitCell(ctx, img, 0, 0, cellW, cellH);
    const stickies = stickerMap[i];
    if (stickies) stickies.forEach((s) => drawSticker(ctx, 0, 0, cellW, cellH, s));
    out.push(c);
  }
  return out;
}