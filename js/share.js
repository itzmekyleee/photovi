// Export & sharing: downloads, clipboard, Web Share, and the boomerang GIF.

import { bakeCellImages } from './composer.js';

function downloadURL(url, filename) {
  const a = document.createElement('a');
  a.download = filename;
  a.href = url;
  a.click();
}

export function canvasToPNG(canvas) {
  return canvas.toDataURL('image/png');
}

export function canvasToJPEG(canvas, quality = 0.92) {
  return canvas.toDataURL('image/jpeg', quality);
}

export function downloadCanvas(canvas, filename, type = 'png') {
  const url =
    type === 'png' ? canvasToPNG(canvas) : canvasToJPEG(canvas, 0.9);
  downloadURL(url, filename);
}

export function downloadGIFBlob(blob, filename) {
  downloadURL(URL.createObjectURL(blob), filename);
}

export async function copyCanvas(canvas) {
  try {
    const blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('no blob'))), 'image/png'),
    );
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    // Fallback: copy the dataURL as text (limited but something).
    try {
      await navigator.clipboard.writeText(canvasToPNG(canvas));
      return true;
    } catch {
      return false;
    }
  }
}

export function canWebShareFile() {
  return typeof navigator.share === 'function' && typeof navigator.canShare === 'function';
}

export async function shareCanvas(canvas, title) {
  if (!canWebShareFile()) return false;
  try {
    const blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error('no blob'))), 'image/png'),
    );
    const file = new File([blob], `${title}.png`, { type: 'image/png' });
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file], title: `Photovi — ${title}` });
    return true;
  } catch {
    return false;
  }
}

// Build a boomerang GIF (forward then reverse) from the captured frames.
// Returns { blob } or throws. Resolution is deliberately modest — GIFs at
// portrait-strip size balloon in memory.
export async function buildGIF({ frames, orientation, stickerMap }, width = 440, delay = 240) {
  if (!window.GIF) throw new Error('gif.js not loaded');
  const cellW = Math.min(width, 520);
  const cells = await bakeCellImages({ frames, orientation, stickerMap }, cellW);
  const cellH = cells[0] ? cells[0].height : Math.round(cellW / orientation.aspect);

  const gif = new window.GIF({
    workers: 2,
    width: cellW,
    height: cellH,
    quality: 8,
    workerScript: 'vendor/gif.worker.js',
  });

  const sequence = [...cells, ...cells.slice().reverse().slice(1, -1)];

  return new Promise((resolve, reject) => {
    gif.on('finished', (blob) => resolve({ blob, width: cellW, height: cellH }));
    gif.on('abort', () => reject(new Error('GIF aborted')));
    gif.on('error', () => reject(new Error('GIF failed')));
    sequence.forEach((c) => gif.addFrame(c, { delay, copy: true }));
    gif.render();
  });
}