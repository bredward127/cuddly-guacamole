export type SoundPrefs = {
  enabled: boolean;
  volume: number;
  messages: boolean;
  typing: boolean;
  images: boolean;
  timeJumps: boolean;
  dramatic: boolean;
};

export type SoundName =
  | 'incomingMessage'
  | 'outgoingMessage'
  | 'typingStart'
  | 'imageReveal'
  | 'deletedMessage'
  | 'timeJump'
  | 'twistHit'
  | 'playbackComplete';

const STORAGE_KEY = 'textflick-sound-prefs';

export const defaultSoundPrefs: SoundPrefs = {
  enabled: true,
  volume: 0.55,
  messages: true,
  typing: true,
  images: true,
  timeJumps: true,
  dramatic: true,
};

export function loadSoundPrefs(): SoundPrefs {
  if (typeof window === 'undefined') return defaultSoundPrefs;
  try {
    return { ...defaultSoundPrefs, ...JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}') };
  } catch {
    return defaultSoundPrefs;
  }
}

export function saveSoundPrefs(prefs: SoundPrefs) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)); } catch {}
}

let ctx: AudioContext | null = null;
let unlocked = false;

function getCtx() {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  return ctx;
}

export function unlockAudio() {
  const audio = getCtx();
  if (!audio) return;
  if (audio.state === 'suspended') void audio.resume();
  unlocked = true;
}

function canPlay(name: SoundName, prefs: SoundPrefs) {
  if (!prefs.enabled || !unlocked) return false;
  if (name === 'incomingMessage' || name === 'outgoingMessage' || name === 'deletedMessage') return prefs.messages;
  if (name === 'typingStart') return prefs.typing;
  if (name === 'imageReveal') return prefs.images;
  if (name === 'timeJump') return prefs.timeJumps;
  if (name === 'twistHit' || name === 'playbackComplete') return prefs.dramatic;
  return false;
}

function tone(audio: AudioContext, type: OscillatorType, freq: number, start: number, dur: number, peak: number, slideTo?: number) {
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + dur);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function noise(audio: AudioContext, start: number, dur: number, peak: number, hp = 800, lp = 2400) {
  const length = Math.max(1, Math.floor(audio.sampleRate * dur));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = audio.createBufferSource();
  const filter = audio.createBiquadFilter();
  const filter2 = audio.createBiquadFilter();
  const gain = audio.createGain();
  src.buffer = buffer;
  filter.type = 'highpass';
  filter.frequency.value = hp;
  filter2.type = 'lowpass';
  filter2.frequency.value = lp;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  src.connect(filter);
  filter.connect(filter2);
  filter2.connect(gain);
  gain.connect(audio.destination);
  src.start(start);
  src.stop(start + dur + 0.02);
}

export function playSound(name: SoundName, prefs: SoundPrefs) {
  const audio = getCtx();
  if (!audio || !canPlay(name, prefs)) return;
  const t = audio.currentTime;
  const v = Math.max(0.05, Math.min(prefs.volume, 1));
  try {
    if (name === 'incomingMessage') {
      tone(audio, 'sine', 740, t, 0.09, 0.11 * v);
      tone(audio, 'sine', 1108, t + 0.07, 0.12, 0.09 * v);
    } else if (name === 'outgoingMessage') {
      noise(audio, t, 0.11, 0.07 * v, 1200, 4200);
      tone(audio, 'sine', 520, t, 0.1, 0.05 * v, 180);
    } else if (name === 'typingStart') {
      tone(audio, 'triangle', 1680, t, 0.035, 0.035 * v);
      tone(audio, 'triangle', 1560, t + 0.07, 0.03, 0.03 * v);
      tone(audio, 'triangle', 1640, t + 0.13, 0.03, 0.028 * v);
    } else if (name === 'imageReveal') {
      noise(audio, t, 0.08, 0.08 * v, 900, 5000);
      tone(audio, 'sine', 1480, t + 0.03, 0.12, 0.07 * v, 880);
    } else if (name === 'deletedMessage') {
      tone(audio, 'triangle', 420, t, 0.16, 0.05 * v, 140);
    } else if (name === 'timeJump') {
      tone(audio, 'sine', 196, t, 0.16, 0.06 * v);
      tone(audio, 'sine', 294, t + 0.14, 0.2, 0.05 * v);
    } else if (name === 'twistHit') {
      tone(audio, 'sine', 98, t, 0.28, 0.08 * v);
      tone(audio, 'triangle', 147, t + 0.04, 0.22, 0.045 * v);
    } else if (name === 'playbackComplete') {
      tone(audio, 'sine', 523, t, 0.12, 0.06 * v);
      tone(audio, 'sine', 659, t + 0.11, 0.12, 0.05 * v);
      tone(audio, 'sine', 784, t + 0.22, 0.18, 0.045 * v);
    }
  } catch {
    // Autoplay or closed context: fail quiet.
  }
}

export function testCategory(category: 'messages' | 'typing' | 'images' | 'timeJumps' | 'dramatic', prefs: SoundPrefs) {
  unlockAudio();
  const map = {
    messages: 'incomingMessage',
    typing: 'typingStart',
    images: 'imageReveal',
    timeJumps: 'timeJump',
    dramatic: 'twistHit',
  } as const;
  playSound(map[category], { ...prefs, enabled: true, [category]: true });
}
