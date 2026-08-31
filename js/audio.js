// Synthesized booth audio — no asset files.

const MUTE_KEY = 'photovi_muted';

let ctx = null;
let muted = localStorage.getItem(MUTE_KEY) === '1';

function ensure() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function beep(freq = 880, duration = 0.09, type = 'sine', gain = 0.05) {
  if (muted) return;
  ensure();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.value = gain;
  osc.connect(g).connect(ctx.destination);
  osc.start();
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  osc.stop(ctx.currentTime + duration);
}

export function isMuted() {
  return muted;
}

export function setMuted(m) {
  muted = m;
  localStorage.setItem(MUTE_KEY, m ? '1' : '0');
}

export const sound = {
  tick: (from, n) => beep(660 + (from - n) * 120, 0.09, 'sine', 0.05),
  shutter: () => {
    beep(1400, 0.04, 'square', 0.06);
    setTimeout(() => beep(700, 0.08, 'square', 0.05), 40);
  },
  ready: () => {
    beep(520, 0.12, 'sine', 0.05);
    setTimeout(() => beep(780, 0.14, 'sine', 0.05), 140);
  },
  finish: () => {
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => beep(f, 0.18, 'triangle', 0.06), i * 130);
    });
  },
  error: () => beep(150, 0.3, 'sawtooth', 0.045),
};