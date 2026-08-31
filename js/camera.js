// Camera management + shared canvas/draw helpers.

const MAX_CAPTURE = 1920;

export const camera = {
  stream: null,
  facing: 'front', // 'front' | 'back'
  resolution: 'auto',
  torqueState: false,

  isRunning() {
    return !!this.stream;
  },

  track() {
    return this.stream ? this.stream.getVideoTracks()[0] : null;
  },

  async start(video) {
    this.stream = await navigator.mediaDevices.getUserMedia(this.constraints());
    video.srcObject = this.stream;
    await video.play();
    return this.stream;
  },

  async restart(video) {
    this.stop();
    return this.start(video);
  },

  stop() {
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
  },

  constraints() {
    const video = {};
    video.facingMode = this.facing === 'front' ? 'user' : 'environment';
    if (this.resolution === 'hd') {
      video.width = { ideal: 1280 };
      video.height = { ideal: 720 };
    } else if (this.resolution === 'max') {
      video.width = { ideal: 3840 };
      video.height = { ideal: 2160 };
    }
    return { video, audio: false };
  },

  torchSupported() {
    const track = this.track();
    if (!track) return false;
    const caps = track.getCapabilities && track.getCapabilities();
    return !!(caps && 'torch' in caps);
  },

  async setTorch(on) {
    const track = this.track();
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: on }] });
      this.torqueState = on;
    } catch {
      /* torch unsupported at runtime */
    }
  },
};

export function cameraErrorMessage(err) {
  const name = err && err.name;
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Permission denied. Click the camera icon in the address bar and allow access, then try again.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera was found on this device.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is in use by another app. Close it and try again.';
  }
  if (name === 'OverconstrainedError') {
    return 'No camera matches the requested settings.';
  }
  if (name === 'SecurityError' || name === 'TypeError') {
    return 'Camera requires a secure connection. Open via https:// or http://localhost.';
  }
  return 'Camera access failed. Check your browser permissions and try again.';
}

// The cover-crop source region of (vw × vh) that matches `aspect` (w/h).
export function coverRegion(vw, vh, aspect) {
  const srcRatio = vw / vh;
  let sx, sy, sw, sh;
  if (srcRatio > aspect) {
    sh = vh;
    sw = vh * aspect;
    sx = (vw - sw) / 2;
    sy = 0;
  } else {
    sw = vw;
    sh = vw / aspect;
    sx = 0;
    sy = (vh - sh) / 2;
  }
  return { sx, sy, sw, sh };
}

let currentDpr = 1;
export function getDpr() {
  return currentDpr;
}

export function syncDpr() {
  currentDpr = window.devicePixelRatio || 1;
}

// Draw `source` (video/image/htmlCanvas) cover-fitted into (destW × destH),
// optionally mirrored along X (preview & captures are mirrored by default so
// the export matches how the user saw themselves).
export function drawCover(ctx, source, destW, destH, mirror = true, filter = null) {
  const vw = source.videoWidth || source.naturalWidth || source.width;
  const vh = source.videoHeight || source.naturalHeight || source.height;
  if (!vw || !vh) return;
  const { sx, sy, sw, sh } = coverRegion(vw, vh, destW / destH);
  ctx.save();
  if (filter) ctx.filter = filter;
  if (mirror) {
    ctx.translate(destW, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, destW, destH);
  ctx.restore();
}

// Size an offscreen canvas to the exact source pixels of the cover region for
// `aspect`, scaling down (never up) to MAX_CAPTURE. Returns {w, h}.
export function sizeCaptureCanvas(canvas, vw, vh, aspect) {
  const reg = coverRegion(vw, vh, aspect);
  const longSide = Math.max(reg.sw, reg.sh);
  const scale = Math.min(1, MAX_CAPTURE / longSide);
  canvas.width = Math.max(1, Math.round(reg.sw * scale));
  canvas.height = Math.max(1, Math.round(reg.sh * scale));
  return { w: canvas.width, h: canvas.height };
}