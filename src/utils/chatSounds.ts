// Chat sound effects using Web Audio API - no external files needed

const AudioCtx = typeof AudioContext !== 'undefined' ? AudioContext : (window as any).webkitAudioContext;

let ctx: AudioContext | null = null;
const getCtx = () => {
  if (!ctx) ctx = new AudioCtx();
  return ctx;
};

const SOUNDS_KEY = 'auradesk-chat-sounds-enabled';

export const areSoundsEnabled = (): boolean => {
  return localStorage.getItem(SOUNDS_KEY) !== 'false';
};

export const setSoundsEnabled = (enabled: boolean) => {
  localStorage.setItem(SOUNDS_KEY, String(enabled));
};

/** Short "whoosh" for sending a message */
export const playSendSound = () => {
  if (!areSoundsEnabled()) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, c.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.12);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.12);
  } catch {}
};

/** Soft "pop" for receiving a message */
export const playReceiveSound = () => {
  if (!areSoundsEnabled()) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(500, c.currentTime + 0.1);
    gain.gain.setValueAtTime(0.12, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.15);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.15);
  } catch {}
};

/** Tiny sparkle for reactions */
export const playReactSound = () => {
  if (!areSoundsEnabled()) return;
  try {
    const c = getCtx();
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1000, c.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1800, c.currentTime + 0.06);
    gain.gain.setValueAtTime(0.1, c.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.1);
    osc.start(c.currentTime);
    osc.stop(c.currentTime + 0.1);
  } catch {}
};
