/**
 * GAME SHOW AUDIO — a tiny synthesized sound engine for the projector
 * display. Everything here is generated on the fly with the Web Audio API
 * (oscillators + envelopes) rather than shipped as audio files, so there's
 * nothing to download and no licensing to worry about — it's all original,
 * generic "game show" cues (a soft ambient pad, a suspenseful thinking-music
 * tick, a buzzer, and a dramatic round-start sting), not a reproduction of
 * any specific show's music.
 *
 * Browsers require a user gesture before audio can play, so nothing here
 * makes a sound until `unlockAudio()` has resolved (see useGameShowAudio,
 * which gates this behind a one-time "Enable Sound" button on the display).
 */

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext {
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    ctx = new Ctor();
    masterGain = ctx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(ctx.destination);
  }
  return ctx;
}

export async function unlockAudio(): Promise<void> {
  const c = getCtx();
  if (c.state === "suspended") {
    await c.resume();
  }
}

export function isAudioRunning(): boolean {
  return ctx !== null && ctx.state === "running";
}

/** A short, punchy "wrong answer" buzzer — two detuned sawtooths through a
 * lowpass filter, pitch dipping slightly as it decays. */
export function playBuzzer(): void {
  const c = getCtx();
  const now = c.currentTime;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 950;
  filter.connect(masterGain!);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.24, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.7);
  gain.connect(filter);

  [110, 114].forEach((freq) => {
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.82, now + 0.65);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.72);
  });
}

/** A dramatic "category selected" sting — a rising sweep capped with a
 * couple of bright, bell-like sparkle notes. */
export function playRoundStart(): void {
  const c = getCtx();
  const now = c.currentTime;

  const sweepGain = c.createGain();
  sweepGain.gain.setValueAtTime(0.0001, now);
  sweepGain.gain.exponentialRampToValueAtTime(0.22, now + 0.85);
  sweepGain.gain.exponentialRampToValueAtTime(0.0008, now + 1.3);
  sweepGain.connect(masterGain!);

  const sweep = c.createOscillator();
  sweep.type = "triangle";
  sweep.frequency.setValueAtTime(196, now);
  sweep.frequency.exponentialRampToValueAtTime(784, now + 0.9);
  sweep.connect(sweepGain);
  sweep.start(now);
  sweep.stop(now + 1.3);

  [880, 1108.73, 1318.51].forEach((freq, i) => {
    const t = now + 0.85 + i * 0.1;
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 0.55);
    g.connect(masterGain!);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    o.connect(g);
    o.start(t);
    o.stop(t + 0.6);
  });
}

/* ------------------------------------------------------------------ *
 * Timer "thinking music" — a soft, suspenseful repeating pluck pattern
 * while a countdown is running (Jeopardy-style vibe, original pattern).
 * ------------------------------------------------------------------ */

let tensionInterval: number | null = null;
let tensionStep = 0;
const TENSION_NOTES = [392.0, 466.16, 523.25, 466.16]; // G4, Bb4, C5, Bb4

function playTensionPluck(): void {
  const c = getCtx();
  const now = c.currentTime;
  const freq = TENSION_NOTES[tensionStep % TENSION_NOTES.length];
  tensionStep++;

  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.05, now + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0006, now + 0.32);
  g.connect(masterGain!);

  const o = c.createOscillator();
  o.type = "triangle";
  o.frequency.value = freq;
  o.connect(g);
  o.start(now);
  o.stop(now + 0.35);
}

export function startTimerTension(): void {
  if (tensionInterval !== null) return;
  playTensionPluck();
  tensionInterval = window.setInterval(playTensionPluck, 420);
}

export function stopTimerTension(): void {
  if (tensionInterval !== null) {
    window.clearInterval(tensionInterval);
    tensionInterval = null;
    tensionStep = 0;
  }
}

/* ------------------------------------------------------------------ *
 * Background music — a very quiet, slow-crossfading chord pad that loops
 * for the whole event. Deliberately understated per the "background, not
 * the focus" brief: each chord peaks well under the timer/SFX volumes.
 * ------------------------------------------------------------------ */

let bgInterval: number | null = null;
let bgChordIndex = 0;
const BG_CHORD_SECONDS = 7;
const BG_CHORDS: number[][] = [
  [130.81, 164.81, 196.0], // C major (low)
  [146.83, 174.61, 220.0], // D minor-ish voicing
  [164.81, 196.0, 246.94], // E minor-ish voicing
  [130.81, 164.81, 196.0], // back to C
];

function playBgChord(freqs: number[]): void {
  const c = getCtx();
  const now = c.currentTime;

  const chordGain = c.createGain();
  chordGain.gain.setValueAtTime(0, now);
  chordGain.gain.linearRampToValueAtTime(0.03, now + 2.5);
  chordGain.gain.linearRampToValueAtTime(0, now + BG_CHORD_SECONDS);
  chordGain.connect(masterGain!);

  freqs.forEach((freq) => {
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    o.connect(chordGain);
    o.start(now);
    o.stop(now + BG_CHORD_SECONDS + 0.1);
  });
}

export function startBackgroundMusic(): void {
  if (bgInterval !== null) return;
  const tick = () => {
    playBgChord(BG_CHORDS[bgChordIndex % BG_CHORDS.length]);
    bgChordIndex++;
  };
  tick();
  bgInterval = window.setInterval(tick, BG_CHORD_SECONDS * 1000);
}

export function stopBackgroundMusic(): void {
  if (bgInterval !== null) {
    window.clearInterval(bgInterval);
    bgInterval = null;
    bgChordIndex = 0;
  }
}

/** Overall mute — ducks everything to silence without tearing down the
 * loops, so unmuting resumes instantly in sync. */
export function setMuted(muted: boolean): void {
  if (!masterGain || !ctx) return;
  masterGain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
}
