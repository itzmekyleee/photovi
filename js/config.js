// Central configuration: filters, layouts, orientations, themes.

export const FILTERS = [
  { id: 'original', label: 'Original', css: 'none' },
  { id: 'noir', label: 'Noir', css: 'grayscale(1) contrast(1.2) brightness(0.95)' },
  { id: 'vintage', label: 'Vintage', css: 'sepia(0.45) contrast(1.05) brightness(1.05) saturate(1.15)' },
  { id: 'cool', label: 'Cool', css: 'saturate(1.3) hue-rotate(-8deg) contrast(1.05) brightness(1.02)' },
  { id: 'flash', label: 'Flash', css: 'saturate(1.45) contrast(1.18) brightness(1.1)' },
];

export const ORIENTATIONS = {
  portrait: { id: 'portrait', label: 'Portrait', aspect: 3 / 4 },
  landscape: { id: 'landscape', label: 'Landscape', aspect: 16 / 9 },
};

export const LAYOUTS = [
  { id: 'strip', label: 'Strip', shots: [3, 4, 6] },
  { id: 'grid2', label: '2 × 2', shots: [4], cols: 2 },
  { id: 'grid3', label: '3 × 3', shots: [9], cols: 3 },
  { id: 'single', label: 'Single', shots: [1] },
];

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) || LAYOUTS[0];
}

export const THEMES = [
  { id: 'classic', label: 'Classic', bg: '#fafafc', header: '#1c1c1e', accent: '#df6a2e', caption: '#8e8e93', cellStroke: 'transparent' },
  { id: 'neon', label: 'Neon', bg: '#140f1e', header: '#f7f2ff', accent: '#38e5c7', caption: '#9d93b8', cellStroke: 'rgba(56,229,199,0.45)' },
  { id: 'pastel', label: 'Pastel', bg: '#fdf3f5', header: '#5a4a56', accent: '#ef7fa3', caption: '#a68f9c', cellStroke: 'rgba(239,127,163,0.35)' },
  { id: 'studio', label: 'Studio', bg: '#eef0f3', header: '#22262b', accent: '#3b5bdb', caption: '#7d8590', cellStroke: 'rgba(59,91,219,0.4)' },
  { id: 'film', label: 'Film', bg: '#26201a', header: '#f5ead7', accent: '#e0b354', caption: '#b4a184', cellStroke: 'rgba(224,179,84,0.4)' },
];

export const RES_OPTIONS = [
  { id: 'auto', label: 'Auto' },
  { id: 'hd', label: 'HD' },
  { id: 'max', label: 'Max' },
];

// Longest side of the raw capture frame. Camera source pixels are used
// directly (never upscaled); cap keeps memory sane for huge sensors.
export const MAX_CAPTURE = 1920;

// Export width for portrait strips (heights derive from the layout).
export const EXPORT_WIDTH = {
  portrait: 1080,
  landscape: 1680,
};