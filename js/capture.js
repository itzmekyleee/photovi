// Capture sequence primitives: countdown and flash overlays.

import { sound } from './audio.js';

export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function runCountdown({ from, el, tick }) {
  return new Promise((resolve) => {
    let n = from;
    const go = () => {
      el.textContent = n;
      el.classList.remove('show');
      void el.offsetWidth;
      el.classList.add('show');
      if (tick) tick(n);
      n--;
      if (n < 0) {
        el.textContent = '';
        resolve();
      } else {
        setTimeout(go, 700);
      }
    };
    go();
  });
}

export function flashOverlay(host) {
  return new Promise((resolve) => {
    const flash = document.createElement('div');
    flash.className = 'flash-overlay fire';
    host.appendChild(flash);
    setTimeout(() => {
      flash.remove();
      resolve();
    }, 350);
  });
}

export const DEFAULT_TICK = (from, n) => sound.tick(from, n);