export type PacingValues = {
  typingMs: number;
  normalPauseMs: number;
  tensionPauseMs: number;
  timeJumpHoldMs: number;
  imageRevealHoldMs: number;
};

export type LegacyPacingValues = {
  typing: number;
  normal: number;
  tension: number;
  jump: number;
  reveal: number;
};

export type PacingPresetId =
  | 'slow-burn'
  | 'tiktok-fast'
  | 'cinematic'
  | 'panic-mode'
  | 'group-chat-chaos'
  | 'cliffhanger-series'
  | 'late-night-dread'
  | 'found-footage'
  | 'soft-romance';

export type PacingPreset = {
  id: PacingPresetId;
  name: string;
  description: string;
  values: PacingValues;
};

export const PACING_PRESETS: PacingPreset[] = [
  { id: 'slow-burn', name: 'Slow Burn', description: 'Patient suspense and long, unsettling reveals.', values: { typingMs: 2200, normalPauseMs: 3800, tensionPauseMs: 6500, timeJumpHoldMs: 5500, imageRevealHoldMs: 9500 } },
  { id: 'tiktok-fast', name: 'TikTok Fast', description: 'Rapid, punchy pacing for quick twists.', values: { typingMs: 700, normalPauseMs: 1500, tensionPauseMs: 2500, timeJumpHoldMs: 2500, imageRevealHoldMs: 4000 } },
  { id: 'cinematic', name: 'Cinematic', description: 'Emotional pacing with space to absorb big moments.', values: { typingMs: 2000, normalPauseMs: 4500, tensionPauseMs: 6000, timeJumpHoldMs: 6500, imageRevealHoldMs: 8000 } },
  { id: 'panic-mode', name: 'Panic Mode', description: 'Fast reactions with sharp danger beats.', values: { typingMs: 900, normalPauseMs: 1800, tensionPauseMs: 3500, timeJumpHoldMs: 3500, imageRevealHoldMs: 6000 } },
  { id: 'group-chat-chaos', name: 'Group Chat Chaos', description: 'Fast interruptions and escalating group reactions.', values: { typingMs: 800, normalPauseMs: 2100, tensionPauseMs: 3900, timeJumpHoldMs: 3000, imageRevealHoldMs: 5500 } },
  { id: 'cliffhanger-series', name: 'Cliffhanger Series', description: 'Built for dramatic Part 2 endings.', values: { typingMs: 1700, normalPauseMs: 3200, tensionPauseMs: 6300, timeJumpHoldMs: 5300, imageRevealHoldMs: 10000 } },
  { id: 'late-night-dread', name: 'Late-Night Dread', description: 'Heavy pauses and frightening late-night reveals.', values: { typingMs: 2800, normalPauseMs: 4000, tensionPauseMs: 7500, timeJumpHoldMs: 6000, imageRevealHoldMs: 11000 } },
  { id: 'found-footage', name: 'Found Footage', description: 'Evidence drops, deleted messages, and visual suspense.', values: { typingMs: 2000, normalPauseMs: 3600, tensionPauseMs: 6200, timeJumpHoldMs: 6000, imageRevealHoldMs: 10000 } },
  { id: 'soft-romance', name: 'Soft Romance', description: 'Warm pacing with emotional breathing room.', values: { typingMs: 1500, normalPauseMs: 3700, tensionPauseMs: 5000, timeJumpHoldMs: 5000, imageRevealHoldMs: 7500 } },
];

export const DEFAULT_PACING = PACING_PRESETS[0].values;

export const GENRE_TONE_RECOMMENDATIONS: Record<string, PacingPresetId> = {
  'thriller|creepy': 'slow-burn',
  'horror|dark': 'late-night-dread',
  'mystery|tense': 'found-footage',
  'drama|emotional': 'cinematic',
  'romance|emotional': 'soft-romance',
  'comedy|chaotic': 'tiktok-fast',
  'school drama|messy': 'group-chat-chaos',
  'sci-fi|mysterious': 'found-footage',
  'fantasy|epic': 'cinematic',
};

export function toLegacyPacing(values: PacingValues): LegacyPacingValues {
  return { typing: values.typingMs, normal: values.normalPauseMs, tension: values.tensionPauseMs, jump: values.timeJumpHoldMs, reveal: values.imageRevealHoldMs };
}

export function fromLegacyPacing(values: Partial<LegacyPacingValues>): PacingValues {
  return { typingMs: values.typing ?? DEFAULT_PACING.typingMs, normalPauseMs: values.normal ?? DEFAULT_PACING.normalPauseMs, tensionPauseMs: values.tension ?? DEFAULT_PACING.tensionPauseMs, timeJumpHoldMs: values.jump ?? DEFAULT_PACING.timeJumpHoldMs, imageRevealHoldMs: values.reveal ?? DEFAULT_PACING.imageRevealHoldMs };
}

export function samePacing(a: PacingValues, b: PacingValues): boolean {
  return a.typingMs === b.typingMs && a.normalPauseMs === b.normalPauseMs && a.tensionPauseMs === b.tensionPauseMs && a.timeJumpHoldMs === b.timeJumpHoldMs && a.imageRevealHoldMs === b.imageRevealHoldMs;
}

export function getPreset(id: PacingPresetId): PacingPreset {
  return PACING_PRESETS.find((preset) => preset.id === id) ?? PACING_PRESETS[0];
}

export function matchingPreset(values: PacingValues): PacingPreset | null {
  return PACING_PRESETS.find((preset) => samePacing(values, preset.values)) ?? null;
}

export function recommendedPreset(genre: string, tone: string): PacingPreset {
  const key = `${genre.trim().toLowerCase()}|${tone.trim().toLowerCase()}`;
  return getPreset(GENRE_TONE_RECOMMENDATIONS[key] ?? 'cinematic');
}

export function expectedEventCount(length: string): number {
  if (length === '4–5 minutes') return 122;
  if (length === '2–3 minutes') return 92;
  if (length === '90 seconds') return 55;
  return 33;
}

export function estimatePlaybackMs(length: string, values: PacingValues, imageCount = 2): number {
  const total = expectedEventCount(length);
  const tensionEvents = Math.max(4, Math.round(total * 0.2));
  const jumps = Math.max(1, Math.round(total * 0.05));
  const normalEvents = Math.max(0, total - tensionEvents - jumps - imageCount);
  return total * values.typingMs + normalEvents * values.normalPauseMs + tensionEvents * values.tensionPauseMs + jumps * values.timeJumpHoldMs + imageCount * values.imageRevealHoldMs;
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(1, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
}
