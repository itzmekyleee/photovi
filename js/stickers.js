// Emoji sticker palette for decorating strip frames.

export const STICKERS = [
  '😎',
  '🥳',
  '😍',
  '🤩',
  '🔥',
  '✨',
  '❤️',
  '💯',
  '👑',
  '🌈',
  '🎈',
  '🎉',
  '⭐',
  '🍕',
  '🌻',
  '🦋',
  '💖',
  '🐶',
];

// A sticker placed on a frame: emoji, relative position (0..1) within the
// cell, and relative size (fraction of the cell's short side).
export function makeSticker(emoji, size = 0.26) {
  return { e: emoji, x: 0.5, y: 0.5, size };
}