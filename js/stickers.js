// Sticker palette: the SVG artwork in assets/stickers/, drawn onto the strip
// canvas as images (see drawSticker in composer.js). Each file is 24x24 with a
// white die-cut keyline so it reads against any photo.

export const STICKERS = [
  { id: 'heart', label: 'heart' },
  { id: 'star', label: 'star' },
  { id: 'sparkle', label: 'sparkle' },
  { id: 'crown', label: 'crown' },
  { id: 'rainbow', label: 'rainbow' },
  { id: 'sunburst', label: 'sunburst' },
  { id: 'bolt', label: 'lightning bolt' },
  { id: 'popper', label: 'party popper' },
  { id: 'flame', label: 'flame' },
  { id: 'flower', label: 'flower' },
  { id: 'butterfly', label: 'butterfly' },
  { id: 'aperture', label: 'aperture' },
];

const byId = new Map(STICKERS.map((s) => [s.id, s]));

// Strips saved before the emoji palette was replaced still carry `e`. Map the
// ones with a clear equivalent so old records keep their stickers.
const LEGACY_EMOJI = {
  '🥳': 'popper',
  '😍': 'heart',
  '🤩': 'star',
  '🔥': 'flame',
  '✨': 'sparkle',
  '❤️': 'heart',
  '💯': 'sunburst',
  '👑': 'crown',
  '🌈': 'rainbow',
  '🎈': 'popper',
  '🎉': 'popper',
  '⭐': 'star',
  '🌻': 'flower',
  '🦋': 'butterfly',
  '💖': 'heart',
};

const images = new Map();
let preload = null;

export function stickerSrc(id) {
  const entry = byId.get(id);
  return entry ? `assets/stickers/${entry.id}.svg` : null;
}

// Decoded sticker, or undefined if it has not loaded (or failed to).
export function stickerImage(id) {
  return images.get(id);
}

// Composer calls this so a sticker added seconds ago is never missing from the
// canvas. Idempotent and cheap once resolved; failures resolve too, and the
// sticker is simply skipped.
export function preloadStickers() {
  if (preload) return preload;
  preload = Promise.all(
    STICKERS.map(
      (s) =>
        new Promise((resolve) => {
          const img = new Image();
          img.onload = () => {
            images.set(s.id, img);
            resolve();
          };
          img.onerror = resolve;
          img.src = stickerSrc(s.id);
        }),
    ),
  ).then(() => undefined);
  return preload;
}

// Accepts both current and pre-emoji stickers; null when the artwork is gone.
export function resolveStickerId(sticker) {
  if (!sticker) return null;
  if (byId.has(sticker.id)) return sticker.id;
  return LEGACY_EMOJI[sticker.e] ?? null;
}

// A sticker placed on a frame: artwork id, relative position (0..1) within the
// cell, and relative size (fraction of the cell's short side).
export function makeSticker(id, size = 0.26) {
  return { id, x: 0.5, y: 0.5, size };
}