/**
 * GAME SHOW AUDIO — a tiny synthesized sound engine for the projector
 * display. Everything here is generated on the fly with the Web Audio API
 * (oscillators + envelopes) rather than shipped as audio files, so there's
 * nothing to download and no licensing to worry about — it's all original,
 * generic "game show" cues (a bouncy bumper-music loop, a "Final Jeopardy"
 * style thinking melody, a buzzer, a dramatic round-start sting, and
 * correct/wrong dings), not a reproduction of any specific show's music.
 *
 * Browsers require a user gesture before audio can play, so nothing here
 * makes a sound until `unlockAudio()` has resolved (see useGameShowAudio,
 * which gates this behind a one-time "Enable Sound" button on the display).
 * Whether sound actually plays at all is host-controlled (see setMuted).
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

/** A loud, cutting "time's up" buzzer — three detuned sawtooths through a
 * bright lowpass filter, pitch dipping as it decays. Deliberately the
 * loudest cue in the mix, since it marks a definitive game moment. */
export function playBuzzer(): void {
  const c = getCtx();
  const now = c.currentTime;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  filter.connect(masterGain!);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.55, now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.9);
  gain.connect(filter);

  [110, 114, 107].forEach((freq) => {
    const osc = c.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.78, now + 0.85);
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 0.92);
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

/** A bright, cheerful two-note ascending "ding" (plus a quiet shimmer
 * overtone for a bell-like quality) — the correct-answer cue. */
export function playCorrectDing(): void {
  const c = getCtx();
  const now = c.currentTime;

  [880, 1318.51].forEach((freq, i) => {
    const t = now + i * 0.09;

    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0006, t + 0.55);
    g.connect(masterGain!);
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.value = freq;
    o.connect(g);
    o.start(t);
    o.stop(t + 0.6);

    const g2 = c.createGain();
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(0.06, t + 0.012);
    g2.gain.exponentialRampToValueAtTime(0.0004, t + 0.35);
    g2.connect(masterGain!);
    const o2 = c.createOscillator();
    o2.type = "sine";
    o2.frequency.value = freq * 2;
    o2.connect(g2);
    o2.start(t);
    o2.stop(t + 0.4);
  });
}

/** A short descending "womp" — square wave dropping in pitch through a
 * lowpass filter — the wrong-answer cue. Distinct from (and quieter than)
 * the end-of-timer buzzer. */
export function playWrongAnswer(): void {
  const c = getCtx();
  const now = c.currentTime;

  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 650;
  filter.connect(masterGain!);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.5);
  gain.connect(filter);

  const osc = c.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(196, now);
  osc.frequency.exponentialRampToValueAtTime(123.47, now + 0.45);
  osc.connect(gain);
  osc.start(now);
  osc.stop(now + 0.5);
}

/* ------------------------------------------------------------------ *
 * Timer "thinking music" — a slow, melodic music-box phrase over a soft
 * sustained drone while a countdown is running: a "Final Jeopardy"-style
 * suspenseful waiting cue rather than a quick repeating tick.
 * ------------------------------------------------------------------ */

let tensionInterval: number | null = null;
let tensionStep = 0;
let tensionDroneOsc: OscillatorNode | null = null;
let tensionDroneGain: GainNode | null = null;
const TENSION_NOTE_MS = 480;
// A gently arcing 8-note phrase (up then down) — music-box character.
const TENSION_MELODY = [
  523.25, 659.25, 783.99, 659.25, 587.33, 493.88, 440.0, 493.88,
];

function playTensionNote(): void {
  const c = getCtx();
  const now = c.currentTime;
  const freq = TENSION_MELODY[tensionStep % TENSION_MELODY.length];
  tensionStep++;

  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.045, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0005, now + 0.42);
  g.connect(masterGain!);

  const o = c.createOscillator();
  o.type = "triangle";
  o.frequency.value = freq;
  o.connect(g);
  o.start(now);
  o.stop(now + 0.45);
}

export function startTimerTension(): void {
  if (tensionInterval !== null) return;
  tensionStep = 0;

  const c = getCtx();
  const now = c.currentTime;
  tensionDroneGain = c.createGain();
  tensionDroneGain.gain.setValueAtTime(0, now);
  tensionDroneGain.gain.linearRampToValueAtTime(0.012, now + 1.2);
  tensionDroneGain.connect(masterGain!);
  tensionDroneOsc = c.createOscillator();
  tensionDroneOsc.type = "sine";
  tensionDroneOsc.frequency.value = 130.81; // low C3 — unobtrusive suspense pad
  tensionDroneOsc.connect(tensionDroneGain);
  tensionDroneOsc.start(now);

  playTensionNote();
  tensionInterval = window.setInterval(playTensionNote, TENSION_NOTE_MS);
}

export function stopTimerTension(): void {
  if (tensionInterval !== null) {
    window.clearInterval(tensionInterval);
    tensionInterval = null;
    tensionStep = 0;
  }
  if (tensionDroneOsc && tensionDroneGain) {
    const c = getCtx();
    const now = c.currentTime;
    tensionDroneGain.gain.cancelScheduledValues(now);
    tensionDroneGain.gain.setTargetAtTime(0, now, 0.15);
    tensionDroneOsc.stop(now + 0.6);
    tensionDroneOsc = null;
    tensionDroneGain = null;
  }
}

/* ------------------------------------------------------------------ *
 * Background music — a soft, bouncy "game show bumper" loop: a walking
 * bass pluck on the beat with a twinkly chime on the off-beat. Still
 * deliberately understated per the "background, not the focus" brief —
 * every note peaks well under the timer/SFX volumes — but with more
 * rhythmic identity than a plain sustained pad.
 * ------------------------------------------------------------------ */

let bgInterval: number | null = null;
let bgStep = 0;
let bgChordIndex = 0;
const BG_STEP_MS = 150; // sixteenth notes at ~100bpm
const BG_CHORDS: { bass: number; arp: number[] }[] = [
  { bass: 65.41, arp: [261.63, 329.63, 392.0] }, // C
  { bass: 98.0, arp: [392.0, 493.88, 587.33] }, // G
  { bass: 110.0, arp: [440.0, 523.25, 659.25] }, // Am
  { bass: 87.31, arp: [349.23, 440.0, 523.25] }, // F
];

function pluckBass(freq: number, peak: number): void {
  const c = getCtx();
  const now = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(peak, now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0006, now + 0.45);
  g.connect(masterGain!);
  const o = c.createOscillator();
  o.type = "triangle";
  o.frequency.value = freq;
  o.connect(g);
  o.start(now);
  o.stop(now + 0.5);
}

function pluckChime(freq: number): void {
  const c = getCtx();
  const now = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.025, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0005, now + 0.28);
  g.connect(masterGain!);
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.value = freq;
  o.connect(g);
  o.start(now);
  o.stop(now + 0.3);
}

function bgTick(): void {
  const chord = BG_CHORDS[bgChordIndex % BG_CHORDS.length];
  const beat = bgStep % 16;
  if (beat === 0 || beat === 8) pluckBass(chord.bass, 0.05);
  else if (beat === 4 || beat === 12) pluckBass(chord.bass, 0.035);
  else if (beat % 4 === 2) {
    const arpIndex = (bgStep >> 2) % chord.arp.length;
    pluckChime(chord.arp[arpIndex]);
  }
  bgStep++;
  if (bgStep % 16 === 0) bgChordIndex++;
}

export function startBackgroundMusic(): void {
  if (bgInterval !== null) return;
  bgStep = 0;
  bgChordIndex = 0;
  bgTick();
  bgInterval = window.setInterval(bgTick, BG_STEP_MS);
}

export function stopBackgroundMusic(): void {
  if (bgInterval !== null) {
    window.clearInterval(bgInterval);
    bgInterval = null;
    bgStep = 0;
    bgChordIndex = 0;
  }
}

/** Overall mute — ducks everything to silence without tearing down the
 * loops, so unmuting resumes instantly in sync. */
export function setMuted(muted: boolean): void {
  if (!masterGain || !ctx) return;
  masterGain.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.05);
}
