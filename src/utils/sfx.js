// 🔊 KÂBUS MODU — WebAudio ile SENTEZ ses efektleri (ses DOSYASI YOK, bundle büyümez).
// Kurallar:
//  - AudioContext yalnız ilk kullanıcı etkileşiminden SONRA açılır (autoplay politikası).
//  - prefers-reduced-motion varsa sesler kapalı.
//  - Kullanıcı ayarı localStorage 'kabusSfx' ('on' | 'off'), varsayılan 'on'.
const KEY = 'kabusSfx';
const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ctx = null;
function ensureCtx() {
  if (reducedMotion) return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function sfxEnabled() {
  if (reducedMotion) return false;
  return localStorage.getItem(KEY) !== 'off';
}
export function setSfxEnabled(on) {
  localStorage.setItem(KEY, on ? 'on' : 'off');
  if (on) ensureCtx();   // ilk açışta context'i hazırla (kullanıcı tıklamasıyla)
}

// Zarflı bir osilatör çal (tek seslik blok)
function blip(c, { type, f0, f1, dur, gain = 0.18 }) {
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

// Kısa beyaz gürültü patlaması (zincir kırılması / kapı tıngırtısı için)
function noiseBurst(c, { dur, gain = 0.2, lp = 2200 }) {
  const t = c.currentTime;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const filt = c.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = lp;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filt).connect(g).connect(c.destination);
  src.start(t); src.stop(t + dur);
}

// ── Efektler ──
// Kapı çarpması: alçak kare dalga + hızlı sönüm (~150ms)
export function clang() {
  const c = ensureCtx(); if (!c || !sfxEnabled()) return;
  blip(c, { type: 'square', f0: 140, f1: 60, dur: 0.15, gain: 0.22 });
  noiseBurst(c, { dur: 0.12, gain: 0.12, lp: 900 });
}
// Zincir kırılması: kısa metalik gürültü patlaması (~80ms)
export function snap() {
  const c = ensureCtx(); if (!c || !sfxEnabled()) return;
  noiseBurst(c, { dur: 0.08, gain: 0.2, lp: 4000 });
  blip(c, { type: 'triangle', f0: 900, f1: 300, dur: 0.08, gain: 0.12 });
}
// Kurtuluş: yükselen sine süpürmesi (~200ms)
export function whoosh() {
  const c = ensureCtx(); if (!c || !sfxEnabled()) return;
  blip(c, { type: 'sine', f0: 300, f1: 1100, dur: 0.2, gain: 0.16 });
}
// Simya — başarılı kaynatma: yükselen baloncuk (~260ms)
export function bubble() {
  const c = ensureCtx(); if (!c || !sfxEnabled()) return;
  blip(c, { type: 'sine', f0: 420, f1: 900, dur: 0.16, gain: 0.14 });
  blip(c, { type: 'triangle', f0: 700, f1: 1300, dur: 0.26, gain: 0.1 });
}
// Simya — geçersiz birleşim: alçalan "puf" (~140ms)
export function poof() {
  const c = ensureCtx(); if (!c || !sfxEnabled()) return;
  noiseBurst(c, { dur: 0.14, gain: 0.12, lp: 700 });
  blip(c, { type: 'sine', f0: 240, f1: 110, dur: 0.14, gain: 0.08 });
}
