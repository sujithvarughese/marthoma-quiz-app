"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveDisplay } from "./live";
import * as audio from "./audio";

/**
 * Wires the display's live doc to the synthesized game-show audio: an
 * upbeat-but-quiet background loop throughout, a "Final Jeopardy"-style
 * thinking melody while any countdown timer is running, a buzzer the
 * instant it hits zero, a dramatic sting when a new round (or Rapid Fire)
 * begins, and a ding/wrong cue whenever the host grades an answer.
 *
 * Autoplay policies mean nothing can play until a user gesture unlocks the
 * AudioContext — callers should show an "Enable Sound" control while
 * `unlocked` is false and call `enable()` from its onClick. Muting itself
 * is host-controlled (`live.audioMuted`), not a local display setting.
 */
export function useGameShowAudio(live: LiveDisplay | null) {
  const [unlocked, setUnlocked] = useState(false);
  const muted = live?.audioMuted ?? false;

  useEffect(() => {
    if (unlocked) audio.setMuted(muted);
  }, [muted, unlocked]);

  const enable = () => {
    void audio.unlockAudio().then(() => {
      setUnlocked(true);
      audio.setMuted(muted);
      audio.startBackgroundMusic();
    });
  };

  // Dramatic sting on a genuinely fresh round/Rapid Fire start — tracked by
  // (screen, roundId) so re-visiting the same round's board between
  // questions never re-triggers it.
  const lastRoundKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (!unlocked || !live) return;
    const key =
      live.screen === "board"
        ? `board:${live.roundId ?? ""}`
        : live.screen === "rapid_fire"
          ? "rapid_fire"
          : null;
    if (key && lastRoundKeyRef.current !== key) {
      lastRoundKeyRef.current = key;
      audio.playRoundStart();
    } else if (!key) {
      // Leaving both — the next board/rapid-fire entry should count as fresh.
      lastRoundKeyRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, live?.screen, live?.roundId]);

  // Thinking-music loop follows whether a countdown is currently running.
  const tensionActiveRef = useRef(false);
  useEffect(() => {
    if (!unlocked) return;
    const running = Boolean(live?.timer?.running && live.timer.endsAt);
    if (running && !tensionActiveRef.current) {
      tensionActiveRef.current = true;
      audio.startTimerTension();
    } else if (!running && tensionActiveRef.current) {
      tensionActiveRef.current = false;
      audio.stopTimerTension();
    }
  }, [unlocked, live?.timer?.running, live?.timer?.endsAt]);

  // Buzzer the instant the countdown crosses zero — polled independently of
  // Firestore updates since `endsAt` is a fixed target time, not a tick.
  const buzzedForRef = useRef<number | null>(null);
  useEffect(() => {
    if (!unlocked) return;
    const id = window.setInterval(() => {
      const endsAt = live?.timer?.endsAt ?? null;
      if (endsAt === null) return;
      if (Date.now() >= endsAt && buzzedForRef.current !== endsAt) {
        buzzedForRef.current = endsAt;
        if (tensionActiveRef.current) {
          tensionActiveRef.current = false;
          audio.stopTimerTension();
        }
        audio.playBuzzer();
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [unlocked, live?.timer?.endsAt]);

  // Ding on a correct answer, buzz-blip on a wrong one — one-shot per nonce
  // so a re-delivered live doc (same content, new snapshot) never replays it.
  const lastCueNonceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!unlocked || !live?.answerCue) return;
    const { correct, nonce } = live.answerCue;
    if (lastCueNonceRef.current === nonce) return;
    lastCueNonceRef.current = nonce;
    if (correct) audio.playCorrectDing();
    else audio.playWrongAnswer();
  }, [unlocked, live?.answerCue]);

  return { unlocked, enable };
}
