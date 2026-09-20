"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveDisplay } from "./live";
import * as audio from "./audio";

const MUTE_KEY = "church-quiz-app:displayMuted";

/**
 * Wires the display's live doc to the synthesized game-show audio: a very
 * quiet background pad throughout, a soft suspenseful pluck pattern while
 * any countdown timer is running, a buzzer the instant it hits zero, and a
 * dramatic sting when a new round (or Rapid Fire) begins.
 *
 * Autoplay policies mean nothing can play until a user gesture unlocks the
 * AudioContext — callers should show an "Enable Sound" control while
 * `unlocked` is false and call `enable()` from its onClick.
 */
export function useGameShowAudio(live: LiveDisplay | null) {
  const [unlocked, setUnlocked] = useState(false);
  // Lazy initializer (not an effect) so reading localStorage — impure and
  // SSR-unsafe — runs at most once, on mount, per React's documented escape
  // hatch for one-time impure setup.
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  });

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

  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      try {
        window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {
        // Ignore — private browsing / storage blocked.
      }
      return next;
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

  return { unlocked, muted, enable, toggleMute };
}
