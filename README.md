# Photovi

A client-side photobooth web app for taking multi-shot photo strips right in your browser. Snap, style, and export your strips as PNG/JPG or share them — everything stays local, no uploads required.

## Features

- **Multi-shot photobooth**: Capture sequences of photos with customizable shot counts and layouts
- **Live preview**: Real-time camera view with mirror toggles, filters, torch support, and device selection
- **Strip layouts**: Choose from different frame orientations (landscape/portrait) and layouts for how shots are arranged
- **Custom theming**: Pick accent/backdrop colors, titles, subtitles, and themes to style your strip
- **Stickers & frames**: Add decorative stickers and frame styles to personalize your strips
- **Export & share**: Download as PNG or JPG, copy to clipboard, share natively (where supported), or export as GIF
- **Offline-first PWA**: Installable as a progressive web app with a web app manifest and icons
- **Local storage**: Your strips are saved in your browser's local storage (no server required)
- **Sound & UI polish**: Toggleable sound effects, animated countdowns, and a clean responsive UI with light/dark theme support

## Tech Stack

- **Vanilla HTML/CSS/JS**: No build step required, runs directly in the browser
- **HTML5 APIs**: Camera access (`getUserMedia`), Canvas for rendering, Web Share API, Clipboard API
- **PWA**: Web App Manifest + SVG/PNG icons (generated from source SVGs)
- **Icons**: SVG sprite system for UI icons
- **LocalStorage**: Persists created strips in the gallery

## Getting Started

### Prerequisites

- A modern browser with camera access support (Chrome, Firefox, Safari, Edge)
- HTTPS or `localhost` to access the camera (required by `getUserMedia`)

### Running Locally

1. Clone or download this repository
2. Serve the files with a local HTTP server (required for camera access and PWA features)

```bash
# Using Python
python3 -m http.server 8000

# Using Node.js (http-server)
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

3. Open `http://localhost:8000` in your browser
4. Grant camera permissions when prompted

## Usage

1. **Setup**: Select camera, resolution, orientation, layout, and number of shots in the Capture panel
2. **Style**: Customize your strip with themes, colors, title, subtitle, stickers, and frames in the Style panel
3. **Capture**: Click "Start session" to begin - you'll get a countdown before each shot
4. **Review**: After all shots are taken, your strip will be rendered on the Results screen
5. **Export/Share**: Download as PNG/JPG, copy to clipboard, share, or save to your gallery
6. **Gallery**: Access saved strips via the "Your strips" button in the top bar

## Project Structure

```
photovi/
├── assets/
│   ├── icons/          # PWA icons (PNG) + SVG sprite + app-icon source
│   ├── stickers/       # Sticker SVG assets
│   ├── photovi_logo.svg
│   └── photovi_logo_foreground.svg
├── js/
│   └── app.js          # Main application logic
├── tools/
│   └── generate-icons.py  # Generates PNG icons from SVG sources
├── vendor/             # Third-party dependencies (e.g., gif.js)
├── index.html          # Main HTML structure
├── style.css           # Styles and theming
├── manifest.webmanifest # PWA manifest
└── USE_CASE.md         # Use case documentation
```

## Assets

- **Source SVGs**: Logos and stickers live in `assets/` as SVG files
- **SVG Sprite**: UI icons are defined in `assets/icons/sprite.svg` and referenced via `<use href="...">`
- **Generated Icons**: PWA PNG icons in `assets/icons/` are generated from SVG sources using `tools/generate-icons.py`. Run it with Python 3 (requires Chrome/Chromium headless and optionally Pillow for optimization).

```bash
python3 tools/generate-icons.py
```

## Browser Compatibility

Photovi works in modern browsers that support:
- `getUserMedia` (camera access)
- Canvas 2D
- Web Share API (for native sharing)
- Clipboard API (for copy-to-clipboard)
- CSS backdrop-filter and modern CSS features

## Privacy

Everything runs entirely in your browser. No photos, data, or settings are sent to any server. Strips are stored locally in your browser's localStorage.

## License

See the repository for license details.
