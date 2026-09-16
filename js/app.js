import {
  FILTERS,
  ORIENTATIONS,
  LAYOUTS,
  layoutById,
  THEMES,
  RES_OPTIONS,
  EXPORT_WIDTH,
} from './config.js';
import { sound, isMuted, setMuted } from './audio.js';
import {
  camera,
  cameraErrorMessage,
  syncDpr,
  getDpr,
  drawCover,
  sizeCaptureCanvas,
} from './camera.js';
import { wait, runCountdown, flashOverlay } from './capture.js';
import { composeStrip, computeGeometry, headerMetrics } from './composer.js';
import { STICKERS, makeSticker } from './stickers.js';
import {
  saveStrip,
  putStrip,
  listStrips,
  getStrip,
  deleteStrip,
  dataURLtoBlob,
  blobToDataURL,
} from './gallery.js';
import {
  downloadCanvas,
  copyCanvas,
  shareCanvas,
  buildGIF,
  downloadGIFBlob,
} from './share.js';

(() => {
  'use strict';

  // ---------- State ----------
  const STYLE_KEY = 'photovi_style';

  function loadStyle() {
    try {
      return JSON.parse(localStorage.getItem(STYLE_KEY)) || {};
    } catch {
      return {};
    }
  }
  function saveStyle() {
    localStorage.setItem(
      STYLE_KEY,
      JSON.stringify({
        themeId: state.themeId,
        accent: state.accent,
        bg: state.bg,
        title: state.title,
        subtitle: state.subtitle,
      }),
    );
  }

  const saved = loadStyle();
  const baseTheme = THEMES.find((t) => t.id === saved.themeId) || THEMES[0];

  const state = {
    filter: FILTERS[0],
    orientation: 'landscape',
    layout: LAYOUTS[0],
    shots: LAYOUTS[0].shots[0],
    res: 'auto',
    mirror: true,
    themeId: baseTheme.id,
    accent: saved.accent || baseTheme.accent,
    bg: saved.bg || baseTheme.bg,
    title: saved.title || 'PHOTOVI',
    subtitle: saved.subtitle || '',
    frames: [],
    stickerMap: {},
    sessionRunning: false,
    selectedFrame: 0,
    selectedSticker: null, // { i, idx }
    stripNumber: 0,
    record: null, // { id, rec, urls, canvas }
    recordIndex: 0,
    galleryFilter: 'all',
    customShots: 6,
    customActive: false,
    liveInterval: null,
    renderToken: 0,
  };

  // ---------- DOM helpers ----------
  const $ = (id) => document.getElementById(id);
  const video = $('video');
  const liveCanvas = $('live-canvas');
  const liveCtx = liveCanvas.getContext('2d');
  const captureCanvas = $('capture-canvas');
  const captureCtx = captureCanvas.getContext('2d');
  const viewfinder = $('viewfinder');
  const countdownEl = $('countdown');
  const gate = $('permission-gate');
  const gateError = $('gate-error');
  const startBtn = $('start-capture');
  const shotCounter = $('shot-counter');
  const liveStrip = $('live-strip');
  const liveStripWrap = $('live-strip-wrap');
  const resultCanvas = $('result-canvas');
  const recordCanvas = $('record-canvas');
  const toastEl = $('toast');
  const muteBtn = $('mute-btn');
  const muteGlyph = $('mute-glyph');
  const themeBtn = $('theme-btn');
  const themeGlyph = $('theme-glyph');

  const confirmModal = $('confirm-modal');
  const confirmTitle = $('confirm-title');
  const confirmText = $('confirm-text');
  const confirmOk = $('confirm-ok');
  const confirmCancel = $('confirm-cancel');

  const screens = {
    booth: $('screen-booth'),
    result: $('screen-result'),
    gallery: $('screen-gallery'),
    record: $('screen-record'),
  };

  const galleryGrid = $('gallery-grid');
  const galleryEmpty = $('gallery-empty');
  const galleryFilters = $('gallery-filters');
  let galleryRecords = [];
  let galleryFiltered = [];
  let galleryView = [];

  const recordPos = $('record-pos');
  const shotStepper = $('shot-stepper');
  const shotValue = $('shot-value');

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function adoptCanvas(target, src) {
    target.width = src.width;
    target.height = src.height;
    target.getContext('2d').drawImage(src, 0, 0);
  }

  let toastTimer = null;
  function toast(msg, isError = false) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('toast-error', isError);
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
  }

  function confirmDialog({ title, message, confirmText: okLabel = 'Confirm' }) {
    return new Promise((resolve) => {
      confirmTitle.textContent = title;
      confirmText.textContent = message;
      confirmOk.textContent = okLabel;
      confirmModal.classList.add('show');
      const close = (val) => {
        confirmModal.classList.remove('show');
        confirmOk.removeEventListener('click', onOk);
        confirmCancel.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKey);
        confirmModal.removeEventListener('click', onOverlay);
        resolve(val);
      };
      const onOk = () => close(true);
      const onCancel = () => close(false);
      const onKey = (e) => {
        if (e.key === 'Escape') close(false);
      };
      const onOverlay = (e) => {
        if (e.target === confirmModal) close(false);
      };
      confirmOk.addEventListener('click', onOk);
      confirmCancel.addEventListener('click', onCancel);
      document.addEventListener('keydown', onKey);
      confirmModal.addEventListener('click', onOverlay);
    });
  }

  let currentScreen = 'booth';

  const DIRECTION_MAP = {
    'booth,result': 'up',
    'booth,gallery': 'right',
    'gallery,record': 'left',
    'gallery,booth': 'left',
    'record,gallery': 'right',
    'record,booth': 'right',
    'result,booth': 'right',
  };

  function showScreen(name, direction) {
    if (name === currentScreen) return;
    const prev = screens[currentScreen];
    const next = screens[name];

    if (!direction) {
      direction = DIRECTION_MAP[`${currentScreen},${name}`] || 'left';
    }

    if (prev === next) return;

    const inClass = `slide-${direction}-in`;
    const outClass = `slide-${direction}-out`;

    prev.classList.remove('active');
    prev.classList.add(outClass);

    const cleanup = () => {
      prev.classList.remove(outClass);
      prev.removeEventListener('animationend', cleanup);
    };
    prev.addEventListener('animationend', cleanup);

    next.classList.add(inClass);
    const finish = () => {
      next.classList.remove(inClass);
      next.classList.add('active');
      next.removeEventListener('animationend', finish);
    };
    next.addEventListener('animationend', finish);

    currentScreen = name;
  }

  function theme() {
    const t = THEMES.find((x) => x.id === state.themeId) || THEMES[0];
    return {
      bg: state.bg,
      header: t.header,
      accent: state.accent,
      caption: t.caption,
      cellStroke: t.cellStroke,
    };
  }

  // ---------- Chip builders ----------
  function buildTextChips(root, items, opts) {
    root.innerHTML = '';
    items.forEach((it) => {
      const btn = el('button', 'chip');
      btn.textContent = it.label;
      btn.classList.toggle('active', it.id === opts.active());
      btn.addEventListener('click', () => opts.onSelect(it));
      root.appendChild(btn);
    });
  }

  function buildShotChips() {
    const row = $('shot-row');
    row.innerHTML = '';
    const custom = state.layout.id === 'strip' && state.customActive;
    state.layout.shots.forEach((n) => {
      const btn = el('button', 'chip');
      btn.textContent = n;
      btn.classList.toggle('active', !custom && n === state.shots);
      btn.addEventListener('click', () => {
        if (state.sessionRunning) return;
        state.customActive = false;
        state.shots = n;
        buildShotChips();
        buildDots();
      });
      row.appendChild(btn);
    });
    if (state.layout.id === 'strip') {
      const btn = el('button', 'chip');
      btn.textContent = 'Custom';
      btn.classList.toggle('active', custom);
      btn.addEventListener('click', () => {
        if (state.sessionRunning) return;
        state.customActive = true;
        state.shots = state.customShots || 6;
        buildShotChips();
        buildDots();
      });
      row.appendChild(btn);
    }
    shotStepper.classList.toggle('hidden', !custom);
    shotValue.textContent = custom ? state.shots : '';
  }

  function wireShotStepper() {
    $('shot-minus').addEventListener('click', () => {
      if (state.sessionRunning) return;
      const n = Math.max(2, state.shots - 1);
      state.customActive = true;
      state.customShots = n;
      state.shots = n;
      buildShotChips();
      buildDots();
    });
    $('shot-plus').addEventListener('click', () => {
      if (state.sessionRunning) return;
      const n = Math.min(12, state.shots + 1);
      state.customActive = true;
      state.customShots = n;
      state.shots = n;
      buildShotChips();
      buildDots();
    });
  }

  function buildFilterChips() {
    const row = $('filter-row');
    row.innerHTML = '';
    FILTERS.forEach((f) => {
      const chip = el('button', 'filter-chip');
      chip.dataset.filter = f.id;
      chip.classList.toggle('active', f.id === state.filter.id);
      const thumb = document.createElement('canvas');
      thumb.width = 56;
      thumb.height = 56;
      thumb.className = 'filter-thumb';
      const label = el('span', null, f.label);
      chip.appendChild(thumb);
      chip.appendChild(label);
      chip.addEventListener('click', () => {
        if (state.sessionRunning) return;
        state.filter = f;
        [...row.children].forEach((c) => c.classList.toggle('active', c.dataset.filter === f.id));
        updateThumbnails();
      });
      row.appendChild(chip);
    });
  }

  function buildLayoutChips() {
    const row = $('layout-row');
    row.innerHTML = '';
    LAYOUTS.forEach((l) => {
      const btn = el('button', 'chip');
      btn.textContent = l.label;
      btn.classList.toggle('active', l.id === state.layout.id);
      btn.addEventListener('click', () => {
        if (state.sessionRunning) return;
        state.layout = l;
        if (!l.shots.includes(state.shots)) state.shots = l.shots[0];
        if (l.id !== 'strip') state.customActive = false;
        buildLayoutChips();
        buildShotChips();
        buildDots();
        syncStyleToPanel();
      });
      row.appendChild(btn);
    });
  }

  function buildOrientationChips() {
    const row = $('orientation-row');
    row.innerHTML = '';
    Object.values(ORIENTATIONS).forEach((o) => {
      const btn = el('button', 'chip');
      btn.textContent = o.label;
      btn.classList.toggle('active', o.id === state.orientation);
      btn.addEventListener('click', () => {
        if (state.sessionRunning) return;
        state.orientation = o.id;
        buildOrientationChips();
        applyOrientationClass();
      });
      row.appendChild(btn);
    });
  }

  function buildThemeChips() {
    const row = $('theme-row');
    row.innerHTML = '';
    THEMES.forEach((t) => {
      const btn = el('button', 'chip');
      btn.textContent = t.label;
      btn.classList.toggle('active', t.id === state.themeId);
      btn.addEventListener('click', () => {
        state.themeId = t.id;
        state.accent = t.accent;
        state.bg = t.bg;
        buildThemeChips();
        syncStyleToPanel();
        saveStyle();
      });
      row.appendChild(btn);
    });
  }

  function buildResChips() {
    buildTextChips($('resolution-row'), RES_OPTIONS, {
      active: () => state.res,
      onSelect: async (it) => {
        if (state.sessionRunning) return;
        state.res = it.id;
        camera.resolution = it.id;
        buildResChips();
        if (camera.isRunning()) {
          try {
            await camera.restart(video);
            resizeLive();
            updateThumbnails();
            updateTorchUI();
          } catch (e) {
            gateError.textContent = cameraErrorMessage(e);
          }
        }
      },
    });
  }

  function syncStyleToPanel() {
    $('title-input').value = state.title;
    $('subtitle-input').value = state.subtitle;
    $('accent-color').value = state.accent;
    $('bg-color').value = state.bg;
    buildThemeChips();
  }

  // ---------- Viewfinder / preview ----------
  function applyOrientationClass() {
    viewfinder.classList.toggle('viewfinder-portrait', state.orientation === 'portrait');
    viewfinder.classList.toggle('viewfinder-landscape', state.orientation === 'landscape');
    resizeLive();
  }

  function resizeLive() {
    syncDpr();
    const rect = viewfinder.getBoundingClientRect();
    liveCanvas.width = Math.max(1, Math.round(rect.width * getDpr()));
    liveCanvas.height = Math.max(1, Math.round(rect.height * getDpr()));
  }

  function liveLoop() {
    if (video.readyState >= 2) {
      const dpr = getDpr();
      liveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      liveCtx.filter = state.filter.css;
      drawCover(liveCtx, video, liveCanvas.width / dpr, liveCanvas.height / dpr, state.mirror);
    }
    requestAnimationFrame(liveLoop);
  }

  function updateThumbnails() {
    if (!video.videoWidth) return;
    [...$('filter-row').children].forEach((chip, i) => {
      const thumb = chip.querySelector('canvas');
      const tctx = thumb.getContext('2d');
      tctx.filter = FILTERS[i].css;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const side = Math.min(vw, vh);
      tctx.drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, 56, 56);
    });
  }

  // ---------- Dots ----------
  function buildDots() {
    shotCounter.innerHTML = '';
    for (let i = 0; i < state.shots; i++) {
      shotCounter.appendChild(el('span', 'dot'));
    }
  }

  // ---------- Camera ----------
  async function startCamera() {
    gateError.textContent = '';
    if (!window.isSecureContext) {
      gateError.textContent =
        'Camera requires a secure connection. Open this page via https:// or http://localhost, not file://.';
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      gateError.textContent = 'Camera API is not available in this browser.';
      return;
    }
    try {
      await camera.start(video);
      gate.style.display = 'none';
      startBtn.disabled = false;
      viewfinder.classList.add('live');
      resizeLive();
      requestAnimationFrame(liveLoop);
      state.liveInterval = setInterval(updateThumbnails, 220);
      updateTorchUI();
    } catch (err) {
      gateError.textContent = cameraErrorMessage(err);
    }
  }

  async function flipCamera() {
    if (!camera.isRunning() || state.sessionRunning) return;
    camera.facing = camera.facing === 'front' ? 'back' : 'front';
    try {
      await camera.restart(video);
      resizeLive();
      updateThumbnails();
      updateTorchUI();
    } catch (e) {
      toast('Could not switch camera.', true);
    }
  }

  function updateTorchUI() {
    const btn = $('torch-btn');
    const sup = camera.torchSupported();
    btn.classList.toggle('hidden', !sup);
    btn.classList.toggle('active', sup && camera.torqueState);
  }

  async function toggleTorch() {
    if (!camera.torchSupported()) return;
    await camera.setTorch(!camera.torqueState);
    updateTorchUI();
    toast(camera.torqueState ? 'Torch on' : 'Torch off');
  }

  function toggleMirror() {
    state.mirror = !state.mirror;
    $('mirror-toggle').textContent = `Mirror: ${state.mirror ? 'on' : 'off'}`;
  }

  // ---------- Capturing ----------
  function captureFrame(i) {
    const aspect = ORIENTATIONS[state.orientation].aspect;
    sizeCaptureCanvas(captureCanvas, video.videoWidth, video.videoHeight, aspect);
    captureCtx.setTransform(1, 0, 0, 1, 0, 0);
    captureCtx.filter = state.filter.css;
    drawCover(captureCtx, video, captureCanvas.width, captureCanvas.height, state.mirror);
    state.frames[i] = captureCanvas.toDataURL('image/jpeg', 0.92);
  }

  function markDot(i) {
    const dot = shotCounter.children[i];
    if (dot) dot.classList.add('done');
  }

  async function renderLiveStrip() {
    const filled = state.frames.some(Boolean);
    if (!filled || !state.sessionRunning) {
      liveStripWrap.classList.add('hidden');
      return;
    }
    liveStripWrap.classList.remove('hidden');
    const canvas = await composeStrip({
      width: 150,
      frames: state.frames,
      layout: layoutById(state.layout.id),
      orientation: ORIENTATIONS[state.orientation],
      theme: theme(),
      title: state.title,
      subtitle: state.subtitle,
      stickerMap: state.stickerMap,
      stripNumber: state.stripNumber || '',
      dateLabel: '',
    });
    adoptCanvas(liveStrip, canvas);
  }

  async function startSession() {
    if (!camera.isRunning() || state.sessionRunning) return;
    state.sessionRunning = true;
    startBtn.disabled = true;
    state.frames = new Array(state.shots).fill(null);
    state.stickerMap = {};
    buildDots();
    sound.ready();
    await wait(200);

    for (let i = 0; i < state.shots; i++) {
      await runCountdown({
        from: 3,
        el: countdownEl,
        tick: (n) => sound.tick(3, n),
      });
      captureFrame(i);
      await flashOverlay(viewfinder);
      sound.shutter();
      markDot(i);
      await renderLiveStrip();
      if (i < state.shots - 1) await wait(320);
    }

    finalizeSession();
  }

  async function finalizeSession() {
    state.sessionRunning = false;
    startBtn.disabled = false;
    state.stripNumber = nextStripNumber();
    sound.finish();
    celebrate();
    await renderLiveStrip();
    await composeResult();
    const saved = await saveSessionToGallery();
    if (saved && saved.id) {
      state.record = { id: saved.id, rec: saved, urls: [], canvas: null };
    }
    showScreen('result', 'up');
    state.selectedFrame = 0;
    renderFrameList();
  }

  function nextStripNumber() {
    const n = (Number(localStorage.getItem('photovi_count')) || 0) + 1;
    localStorage.setItem('photovi_count', String(n));
    return n;
  }

  // ---------- Composition (token-guarded) ----------
  async function composeResult() {
    const token = ++state.renderToken;
    const canvas = await composeStrip({
      width: EXPORT_WIDTH[state.orientation],
      frames: state.frames,
      layout: layoutById(state.layout.id),
      orientation: ORIENTATIONS[state.orientation],
      theme: theme(),
      title: state.title,
      subtitle: state.subtitle,
      stickerMap: state.stickerMap,
      stripNumber: state.stripNumber || null,
    });
    if (token !== state.renderToken) return;
    adoptCanvas(resultCanvas, canvas);
  }

  // ---------- Session editing ----------
  function renderFrameList() {
    const list = $('frame-list');
    list.innerHTML = '';
    state.frames.forEach((src, i) => {
      const item = el('div', 'frame-item' + (state.selectedFrame === i ? ' selected' : ''));

      const img = document.createElement('img');
      img.alt = `Frame ${i + 1}`;
      if (src) img.src = src;
      else img.style.visibility = 'hidden';

      const num = el('span', 'frame-num', String(i + 1));
      const tools = el('div', 'frame-tools');

      const addTool = (glyph, title, disabled, fn) => {
        const b = el('button', 'frame-tool', glyph);
        b.title = title;
        b.addEventListener('click', (ev) => {
          ev.stopPropagation();
          if (disabled) return;
          fn();
        });
        if (disabled) b.classList.add('is-empty');
        tools.appendChild(b);
      };

      addTool('\u21B6', 'Retake this frame', state.sessionRunning || !camera.isRunning(), () => retakeFrame(i));
      addTool('\u2039', 'Move left', i === 0 || state.sessionRunning, () => moveFrame(i, -1));
      addTool('\u203A', 'Move right', i === state.frames.length - 1 || state.sessionRunning, () => moveFrame(i, 1));
      addTool('\u2715', 'Remove frame', state.sessionRunning, () => deleteFrame(i));

      item.append(img, num, tools);
      item.addEventListener('click', () => {
        state.selectedFrame = i;
        state.selectedSticker = null;
        renderFrameList();
      });
      list.appendChild(item);
    });
  }

  async function retakeFrame(i) {
    if (state.sessionRunning || !camera.isRunning()) return;
    state.sessionRunning = true;
    startBtn.disabled = true;
    showScreen('booth', null);
    sound.ready();
    await wait(160);
    await runCountdown({ from: 3, el: countdownEl, tick: (n) => sound.tick(3, n) });
    captureFrame(i);
    await flashOverlay(viewfinder);
    sound.shutter();
    state.sessionRunning = false;
    startBtn.disabled = false;
    renderFrameList();
    await composeResult();
    showScreen('result', 'up');
  }

  function moveFrame(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= state.frames.length) return;
    [state.frames[i], state.frames[j]] = [state.frames[j], state.frames[i]];
    swapStickers(i, j);
    state.selectedFrame = j;
    renderFrameList();
    composeResult();
  }

  function swapStickers(i, j) {
    const a = state.stickerMap[i];
    const b = state.stickerMap[j];
    if (a) state.stickerMap[i] = b;
    else delete state.stickerMap[i];
    if (b) state.stickerMap[j] = a;
    else delete state.stickerMap[j];
  }

  async function deleteFrame(i) {
    if (state.sessionRunning || state.frames.length <= 1) return;
    state.frames.splice(i, 1);
    // Re-key stickers above the removed cell.
    const remap = {};
    Object.entries(state.stickerMap).forEach(([k, v]) => {
      const key = Number(k);
      const kk = key < i ? key : key - 1;
      if (kk >= 0) remap[kk] = v;
    });
    state.stickerMap = remap;
    if (state.selectedFrame >= state.frames.length) state.selectedFrame = state.frames.length - 1;
    state.selectedSticker = null;
    renderFrameList();
    await composeResult();
  }

  // ---------- Stickers ----------
  function buildEmojiRow() {
    const row = $('emoji-row');
    STICKERS.forEach((e) => {
      const b = el('button', 'emoji-btn');
      b.textContent = e;
      b.title = `Stick a ${e}`;
      b.addEventListener('click', () => addSticker(e));
      row.appendChild(b);
    });
  }

  function addSticker(emoji) {
    const i = state.selectedFrame;
    if (i == null || state.frames[i] == null) {
      toast('Select a frame to decorate it.');
      return;
    }
    if (!state.stickerMap[i]) state.stickerMap[i] = [];
    const size = Number($('stick-size').value) / 100;
    const st = makeSticker(emoji, size);
    state.stickerMap[i].push(st);
    state.selectedSticker = { i, idx: state.stickerMap[i].length - 1 };
    composeResult();
    schedulePersist();
  }

  function onStickSize() {
    const sel = state.selectedSticker;
    if (!sel) return;
    const arr = state.stickerMap[sel.i];
    if (!arr || !arr[sel.idx]) return;
    arr[sel.idx].size = Number($('stick-size').value) / 100;
    composeResult();
    schedulePersist();
  }

  function removeSelectedSticker() {
    const sel = state.selectedSticker;
    if (!sel) return;
    const arr = state.stickerMap[sel.i];
    if (arr) {
      arr.splice(sel.idx, 1);
      if (!arr.length) delete state.stickerMap[sel.i];
    }
    state.selectedSticker = null;
    composeResult();
    schedulePersist();
  }

  function clearStickers() {
    state.stickerMap = {};
    state.selectedSticker = null;
    composeResult();
    schedulePersist();
  }

  // ---------- Sticker dragging ----------
  function canvasPoint(ev, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - rect.left) * (canvas.width / rect.width),
      y: (ev.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function cellRects(canvas, frames) {
    const geo = computeGeometry({
      width: canvas.width,
      layout: layoutById(state.layout.id),
      orientation: ORIENTATIONS[state.orientation],
      count: frames.length,
    });
    const hdr = headerMetrics(canvas.width, state.title, state.subtitle);
    const gridX = Math.round((canvas.width - geo.gridW) / 2);
    const gridY = geo.pad + hdr.headerH + geo.gap;
    const cols = geo.cols || 1;
    const rects = [];
    for (let i = 0; i < frames.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      rects.push({
        x: gridX + col * (geo.cellW + geo.gap),
        y: gridY + row * (geo.cellH + geo.gap),
        w: geo.cellW,
        h: geo.cellH,
      });
    }
    return rects;
  }

  function hitSticker(pt, rects) {
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      const stickies = state.stickerMap[i];
      if (!stickies) continue;
      for (let idx = stickies.length - 1; idx >= 0; idx--) {
        const st = stickies[idx];
        const cx = rect.x + st.x * rect.w;
        const cy = rect.y + st.y * rect.h;
        const half = (st.size * Math.min(rect.w, rect.h)) / 2;
        if (Math.abs(pt.x - cx) <= half && Math.abs(pt.y - cy) <= half) {
          return { frame: i, idx };
        }
      }
    }
    return null;
  }

  function wireStickerDrag() {
    let drag = null;
    let dragPointerId = null;
    let recomposeQueued = false;

    const scheduleRecompose = () => {
      if (recomposeQueued) return;
      recomposeQueued = true;
      requestAnimationFrame(async () => {
        recomposeQueued = false;
        await composeResult();
      });
    };

    const endDrag = (ev) => {
      if (!drag || ev.pointerId !== dragPointerId) return;
      drag = null;
      dragPointerId = null;
      resultCanvas.classList.remove('dragging');
      schedulePersist();
      try {
        resultCanvas.releasePointerCapture(ev.pointerId);
      } catch {
        /* no-op */
      }
    };

    resultCanvas.addEventListener('pointerdown', (ev) => {
      if (!resultCanvas.width || !state.frames.length) return;
      if (!Object.keys(state.stickerMap).length) return;
      const hit = hitSticker(canvasPoint(ev, resultCanvas), cellRects(resultCanvas, state.frames));
      if (!hit) return;
      ev.preventDefault();
      drag = hit;
      dragPointerId = ev.pointerId;
      state.selectedSticker = { i: hit.frame, idx: hit.idx };
      resultCanvas.setPointerCapture(ev.pointerId);
      resultCanvas.classList.add('dragging');
    });

    resultCanvas.addEventListener('pointermove', (ev) => {
      if (!drag || ev.pointerId !== dragPointerId) return;
      const pt = canvasPoint(ev, resultCanvas);
      const rects = cellRects(resultCanvas, state.frames);
      const rect = rects[drag.frame];
      const st = state.stickerMap[drag.frame] && state.stickerMap[drag.frame][drag.idx];
      if (!rect || !st) return;
      const px = Math.min(resultCanvas.width, Math.max(0, pt.x));
      const py = Math.min(resultCanvas.height, Math.max(0, pt.y));
      st.x = (px - rect.x) / rect.w;
      st.y = (py - rect.y) / rect.h;
      scheduleRecompose();
    });

    resultCanvas.addEventListener('pointerup', endDrag);
    resultCanvas.addEventListener('pointercancel', endDrag);
  }

  // ---------- Celebration ----------
  function celebrate() {
    if (typeof window.confetti !== 'function') return;
    window.confetti({ particleCount: 120, spread: 78, origin: { y: 0.62 } });
    setTimeout(() => window.confetti({ particleCount: 50, angle: 60, spread: 55, origin: { x: 0 } }), 220);
    setTimeout(() => window.confetti({ particleCount: 50, angle: 120, spread: 55, origin: { x: 1 } }), 380);
  }

  // ---------- Persistence ----------
  function recordPalette() {
    const t = THEMES.find((x) => x.id === state.themeId) || THEMES[0];
    return {
      bg: state.bg,
      header: t.header,
      accent: state.accent,
      caption: t.caption,
      cellStroke: t.cellStroke,
    };
  }

  async function saveSessionToGallery() {
    try {
      const saved = await saveStrip({
        ts: Date.now(),
        stripNumber: state.stripNumber,
        title: state.title,
        subtitle: state.subtitle,
        themeId: state.themeId,
        palette: recordPalette(),
        layout: state.layout.id,
        orientation: state.orientation,
        stickerMap: state.stickerMap,
        frames: state.frames.filter(Boolean).map(dataURLtoBlob),
      });
      return saved;
    } catch (e) {
      toast('Could not save to your gallery.', true);
      return null;
    }
  }

  // ---------- Sticker autosave ----------
  function buildPersistRecord() {
    return {
      id: state.record.id,
      ts: state.record.rec.ts,
      stripNumber: state.stripNumber,
      title: state.title,
      subtitle: state.subtitle,
      themeId: state.themeId,
      palette: recordPalette(),
      layout: state.layout.id,
      orientation: state.orientation,
      stickerMap: { ...state.stickerMap },
      frames: state.record.rec.frames,
    };
  }

  let persistTimer = null;
  function schedulePersist(wait = 400) {
    if (!state.record || !state.record.id) return;
    clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      putStrip(buildPersistRecord()).catch(() => {});
    }, wait);
  }

  function flushPersist() {
    clearTimeout(persistTimer);
    persistTimer = null;
    if (!state.record || !state.record.id) return;
    putStrip(buildPersistRecord()).catch(() => {});
  }

  function cmpHeight(rec) {
    return (rec.frames ? rec.frames.length : 0) * (rec.orientation === 'landscape' ? 1 : 1.5);
  }

  async function openGallery(dir) {
    flushPersist();
    showScreen('gallery', dir);
    galleryRecords = await listStrips();
    buildGalleryFilters();
    renderGallery();
  }

  function buildGalleryFilters() {
    galleryFilters.innerHTML = '';
    const options = [
      { id: 'all', label: 'All' },
      ...Object.values(ORIENTATIONS).map((o) => ({ id: o.id, label: o.label })),
      ...LAYOUTS.map((l) => ({ id: l.id, label: l.label })),
    ];
    options.forEach((opt) => {
      const chip = el('button', 'chip');
      chip.textContent = opt.label;
      chip.classList.toggle('active', opt.id === state.galleryFilter);
      chip.addEventListener('click', () => {
        state.galleryFilter = opt.id;
        renderGallery();
      });
      galleryFilters.appendChild(chip);
    });
  }

  function renderGallery() {
    const grid = galleryGrid;
    const sub = $('gallery-sub');
    const filtered = galleryRecords.filter((rec) => {
      if (state.galleryFilter === 'all') return true;
      if (Object.prototype.hasOwnProperty.call(ORIENTATIONS, state.galleryFilter)) {
        return (rec.orientation || 'portrait') === state.galleryFilter;
      }
      return (rec.layout || LAYOUTS[0].id) === state.galleryFilter;
    });
    galleryFiltered = filtered;
    grid.innerHTML = '';
    sub.textContent = galleryRecords.length
      ? `${galleryRecords.length} strip${galleryRecords.length === 1 ? '' : 's'} saved on this device`
      : '';
    galleryFilters.querySelectorAll('.chip').forEach((c) => {
      c.classList.toggle('active', c.textContent === filterChipLabel(state.galleryFilter));
    });

    const buildCard = (rec, idx) => {
      const card = el('div', 'gallery-card');
      card.style.animationDelay = `${Math.min((idx || 0) * 45, 360)}ms`;
      const thumb = el('div', 'gallery-thumb');
      const c = document.createElement('canvas');
      const meta = el('div', 'gallery-card-meta');
      meta.appendChild(el('span', 'gallery-card-num', `#${rec.stripNumber}`));
      meta.appendChild(
        el(
          'span',
          null,
          new Date(rec.ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        ),
      );
      card.append(thumb, meta);
      thumb.appendChild(c);
      card.addEventListener('click', () => openRecord(rec.id, 0, true));
      composeThumb(c, rec);
      return card;
    };

    galleryEmpty.querySelector('p').textContent = galleryRecords.length
      ? 'No strips match this filter.'
      : 'No strips yet. Take your first one and it will live here, safely in your browser.';
    galleryEmpty.classList.toggle('hidden', filtered.length > 0);
    galleryView = [];

    const groups = new Map();
    filtered.forEach((rec) => {
      const id = rec.layout || LAYOUTS[0].id;
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(rec);
    });

    LAYOUTS.forEach((l) => {
      const group = groups.get(l.id);
      if (!group || !group.length) return;
      const section = el('div', 'gallery-section');
      const head = el('div', 'gallery-section-head');
      head.appendChild(el('h3', 'gallery-section-title', l.label));
      head.appendChild(
        el(
          'span',
          'gallery-section-count',
          `${group.length} strip${group.length === 1 ? '' : 's'}`,
        ),
      );
      const groupGrid = el('div', 'gallery-grid');
      const ordered = group.slice().sort((a, b) => cmpHeight(a) - cmpHeight(b));
      ordered.forEach((rec, idx) => groupGrid.appendChild(buildCard(rec, idx)));
      ordered.forEach((rec) => galleryView.push(rec));
      section.append(head, groupGrid);
      grid.appendChild(section);
    });
  }

  function filterChipLabel(id) {
    if (id === 'all') return 'All';
    const o = ORIENTATIONS[id];
    if (o) return o.label;
    const l = layoutById(id);
    if (l) return l.label;
    return id;
  }

  async function composeThumb(canvas, rec) {
    const srcs = [];
    for (const blob of rec.frames) srcs.push(await blobToDataURL(blob));
    const layout = layoutById(rec.layout);
    const orientation = ORIENTATIONS[rec.orientation] || ORIENTATIONS.portrait;
    try {
      const out = await composeStrip({
        width: 300,
        frames: srcs,
        layout,
        orientation,
        theme: rec.palette || theme(),
        title: rec.title,
        subtitle: rec.subtitle,
        stickerMap: rec.stickerMap || {},
        stripNumber: rec.stripNumber,
        dateLabel: '',
      });
      adoptCanvas(canvas, out);
    } catch {
      /* broken record — skip thumbnail */
    }
  }

  async function openRecord(id, dir = 0, initNav = false) {
    const rec = await getStrip(id);
    if (!rec) return;
    if (initNav) galleryView = galleryFiltered.length ? galleryFiltered.slice() : [];
    if (state.record) {
      state.record.urls.forEach((u) => URL.revokeObjectURL(u));
      state.record = null;
    }
    const urls = rec.frames.map((b) => URL.createObjectURL(b));
    state.record = { id, rec, urls, canvas: null };
    if (!galleryView.length) galleryView = [rec];
    state.recordIndex = Math.max(0, galleryView.findIndex((r) => r.id === id));

    $('record-title').textContent = `Strip #${rec.stripNumber}`;
    $('record-meta').textContent = [
      new Date(rec.ts).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
      layoutById(rec.layout).label,
      ORIENTATIONS[rec.orientation] ? ORIENTATIONS[rec.orientation].label : 'Portrait',
    ].join(' · ');
    recordPos.textContent =
      galleryView.length > 1 ? `${state.recordIndex + 1} / ${galleryView.length}` : '';

    if (!screens.record.classList.contains('active')) showScreen('record', 'left');

    const orientation = ORIENTATIONS[rec.orientation] || ORIENTATIONS.portrait;
    const out = await composeStrip({
      width: EXPORT_WIDTH[orientation.id],
      frames: urls,
      layout: layoutById(rec.layout),
      orientation,
      theme: rec.palette || theme(),
      title: rec.title,
      subtitle: rec.subtitle,
      stickerMap: rec.stickerMap || {},
      stripNumber: rec.stripNumber,
    });
    adoptCanvas(recordCanvas, out);
    if (state.record) state.record.canvas = recordCanvas;
    requestAnimationFrame(placeNav);
    const slide = dir === 1 ? 'slide-right' : dir === -1 ? 'slide-left' : 'slide-up';
    recordCanvas.classList.remove('slide-left', 'slide-right', 'slide-up');
    void recordCanvas.offsetWidth;
    recordCanvas.classList.add(slide);
    if (galleryView.length > 1) {
      recordPos.classList.remove('pop');
      void recordPos.offsetWidth;
      recordPos.classList.add('pop');
    }
  }

  function releaseRecord() {
    if (state.record) {
      state.record.urls.forEach((u) => URL.revokeObjectURL(u));
      state.record = null;
    }
  }

  function placeNav() {
    // Buttons are positioned via CSS (absolute within .result-wrap);
    // nothing to compute dynamically.
  }

  function navRecord(dir) {
    if (!state.record || !galleryView.length) return;
    const n = galleryView.length;
    const idx = (state.recordIndex + dir + n) % n;
    openRecord(galleryView[idx].id, dir);
  }

  function scopeRecordKeys(e) {
    if (screens.record.classList.contains('active') && state.record) {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        navRecord(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        navRecord(1);
      }
    }
  }

  async function deleteCurrentRecord() {
    if (!state.record) return;
    const ok = await confirmDialog({
      title: 'Delete this strip?',
      message: 'This strip will be permanently removed from your gallery.',
      confirmText: 'Delete',
    });
    if (!ok) return;
    const id = state.record.id;
    const removed = state.recordIndex;
    try {
      await deleteStrip(id);
    } catch {
      toast('Could not delete.', true);
      return;
    }
    releaseRecord();
    galleryView = galleryView.filter((r) => r.id !== id);
    toast('Strip deleted.');
    if (galleryView.length) {
      openRecord(galleryView[Math.min(removed, galleryView.length - 1)].id, 1);
    } else {
      openGallery('right');
    }
  }

  function recordFilename(ext) {
    const n = state.record ? state.record.rec.stripNumber : state.stripNumber;
    return ext ? `photovi-strip-${n || Date.now()}.${ext}` : `photovi-strip-${n || Date.now()}`;
  }

  // ---------- Actions (result + record) ----------
  function wireAction(btnId, fn) {
    $(btnId).addEventListener('click', fn);
  }

  async function doExport(kind) {
    if (!state.frames.length) return;
    await composeResult();
    downloadCanvas(resultCanvas, recordFilename(kind), kind);
    toast('Saved to your downloads.');
  }

  async function doCopy() {
    await composeResult();
    const ok = await copyCanvas(resultCanvas);
    toast(ok ? 'Copied to clipboard.' : 'Copy failed.', !ok);
  }

  async function doShare() {
    await composeResult();
    if (state.frames.length < 1) return;
    const ok = await shareCanvas(resultCanvas, recordFilename());
    toast(ok ? 'Sharing…' : 'Sharing not available here.', !ok);
  }

  async function doGIF() {
    await composeResult();
    try {
      toast('Rendering loop…');
      const { blob } = await buildGIF({
        frames: state.frames,
        orientation: ORIENTATIONS[state.orientation],
        stickerMap: state.stickerMap,
      });
      downloadGIFBlob(blob, recordFilename('gif'));
      toast('GIF saved.');
    } catch (e) {
      toast('GIF failed here — try PNG or JPG.', true);
    }
  }

  async function recordExport(kind) {
    if (!state.record || !state.record.canvas) return;
    downloadCanvas(state.record.canvas, recordFilename(kind), kind);
    toast('Saved to your downloads.');
  }

  async function recordCopy() {
    if (!state.record || !state.record.canvas) return;
    const ok = await copyCanvas(state.record.canvas);
    toast(ok ? 'Copied to clipboard.' : 'Copy failed.', !ok);
  }

  async function recordShare() {
    if (!state.record || !state.record.canvas) return;
    const ok = await shareCanvas(state.record.canvas, `photovi-strip-${state.record.rec.stripNumber}`);
    toast(ok ? 'Sharing…' : 'Sharing not available here.', !ok);
  }

  async function recordGIF() {
    if (!state.record) return;
    try {
      toast('Rendering loop…');
      const orientation = ORIENTATIONS[state.record.rec.orientation] || ORIENTATIONS.portrait;
      const { blob } = await buildGIF({
        frames: state.record.urls,
        orientation,
        stickerMap: state.record.rec.stickerMap || {},
      });
      downloadGIFBlob(blob, recordFilename('gif'));
      toast('GIF saved.');
    } catch (e) {
      toast('GIF failed here — try PNG or JPG.', true);
    }
  }

  // ---------- Style wiring ----------
  function wireStyle() {
    $('title-input').addEventListener('input', (e) => {
      state.title = e.target.value;
      saveStyle();
    });
    $('subtitle-input').addEventListener('input', (e) => {
      state.subtitle = e.target.value;
      saveStyle();
    });
    $('accent-color').addEventListener('input', (e) => {
      state.accent = e.target.value;
      buildThemeChips();
      saveStyle();
    });
    $('bg-color').addEventListener('input', (e) => {
      state.bg = e.target.value;
      buildThemeChips();
      saveStyle();
    });
  }

  // ---------- Viewfinder tap feedback ----------
  function wireViewfinderTap() {
    const pulse = $('tap-pulse');
    viewfinder.addEventListener('pointerdown', (e) => {
      if (viewfinder.classList.contains('live')) return;
      const rect = viewfinder.getBoundingClientRect();
      pulse.style.left = `${e.clientX - rect.left}px`;
      pulse.style.top = `${e.clientY - rect.top}px`;
      pulse.classList.remove('pulse');
      void pulse.offsetWidth;
      pulse.classList.add('pulse');
    });
  }

  // ---------- Panel tabs ----------
  function wireTabs() {
    const tabsEl = document.querySelector('.panel-tabs');
    document.querySelectorAll('.panel-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.panel-tab').forEach((t) => t.classList.toggle('active', t === tab));
        tabsEl.classList.toggle('tab-style', tab.dataset.tab === 'style');
        const name = tab.dataset.tab;
        document.querySelectorAll('[data-tabbody]').forEach((b) =>
          b.classList.toggle('hidden', b.dataset.tabbody !== name),
        );
      });
    });
  }

  // ---------- UI theme ----------
  const UI_THEME_KEY = 'photovi_theme';

  function applyUiTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    themeGlyph.textContent = t === 'dark' ? '\u{1F319}' : '\u{2600}\u{FE0F}';
    localStorage.setItem(UI_THEME_KEY, t);
  }

  function currentUiTheme() {
    const saved = localStorage.getItem(UI_THEME_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    const prefersDark =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  function initUiTheme() {
    applyUiTheme(currentUiTheme());
    themeBtn.addEventListener('click', () => {
      const next =
        document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyUiTheme(next);
    });
  }

  // ---------- Mute ----------
  function refreshMute() {
    muteGlyph.textContent = isMuted() ? '\u{1F507}' : '\u{1F50A}';
  }

  // ---------- Init ----------
  function init() {
    syncDpr();
    buildOrientationChips();
    buildLayoutChips();
    buildShotChips();
    wireShotStepper();
    buildFilterChips();
    buildResChips();
    buildThemeChips();
    buildEmojiRow();
    syncStyleToPanel();
    wireStyle();
    wireTabs();

    // Wire collapsible panel sections
    document.querySelectorAll('.panel-section-header[data-toggle]').forEach(header => {
      header.addEventListener('click', () => {
        const section = document.getElementById(header.dataset.toggle);
        if (section) section.classList.toggle('collapsed');
      });
    });

    wireViewfinderTap();
    initUiTheme();

    $('request-camera').addEventListener('click', startCamera);
    startBtn.addEventListener('click', startSession);
    $('flip-camera').addEventListener('click', flipCamera);
    $('torch-btn').addEventListener('click', toggleTorch);
    $('mirror-toggle').addEventListener('click', toggleMirror);

    $('retake-all').addEventListener('click', () => {
      flushPersist();
      if (state.frames.length) {
        showScreen('booth', 'up');
        startSession();
      }
    });
    $('new-session').addEventListener('click', () => {
      flushPersist();
      renderLiveStrip();
      showScreen('booth', 'right');
      buildDots();
    });

    $('stick-size').addEventListener('input', onStickSize);
    $('remove-sticker').addEventListener('click', removeSelectedSticker);
    $('clear-stickers').addEventListener('click', clearStickers);
    wireStickerDrag();

    wireAction('dl-png', () => doExport('png'));
    wireAction('dl-jpg', () => doExport('jpg'));
    wireAction('copy-btn', doCopy);
    wireAction('share-btn', doShare);
    wireAction('gif-btn', doGIF);

    wireAction('rec-dl-png', () => recordExport('png'));
    wireAction('rec-dl-jpg', () => recordExport('jpg'));
    wireAction('rec-copy-btn', recordCopy);
    wireAction('rec-share-btn', recordShare);
    wireAction('rec-gif-btn', recordGIF);
    $('record-back').addEventListener('click', () => {
      releaseRecord();
      openGallery('right');
    });
    $('record-delete').addEventListener('click', deleteCurrentRecord);
    $('record-prev').addEventListener('click', () => navRecord(-1));
    $('record-next').addEventListener('click', () => navRecord(1));

    document.addEventListener('keydown', scopeRecordKeys);
    const recordWrap = recordCanvas ? recordCanvas.closest('.result-wrap') : null;
    if (recordWrap) {
      let swipeX = null;
      let swipeY = null;
      recordWrap.addEventListener('touchstart', (e) => {
        swipeX = e.touches[0].clientX;
        swipeY = e.touches[0].clientY;
      }, { passive: true });
      recordWrap.addEventListener('touchend', (e) => {
        if (swipeX == null || !state.record) return;
        const dx = e.changedTouches[0].clientX - swipeX;
        const dy = e.changedTouches[0].clientY - swipeY;
        swipeX = null;
        swipeY = null;
        if (Math.abs(dx) < 40 || Math.abs(dy) > Math.abs(dx)) return;
        navRecord(dx < 0 ? 1 : -1);
      }, { passive: true });
    }

    $('gallery-btn').addEventListener('click', () => openGallery('right'));
    $('gallery-back').addEventListener('click', () => showScreen('booth', 'left'));
    document.querySelectorAll('[data-screen-link]').forEach((a) =>
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const target = a.dataset.screenLink;
        const from = currentScreen;
        const dir = DIRECTION_MAP[`${from},${target}`] || 'left';
        showScreen(target, dir);
      }),
    );

    muteBtn.addEventListener('click', () => {
      setMuted(!isMuted());
      refreshMute();
    });
    refreshMute();

    window.addEventListener('resize', resizeLive);
    window.addEventListener('resize', placeNav);
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => {
        resizeLive();
        updateThumbnails();
      });
    }

    buildDots();
  }

  init();
})();