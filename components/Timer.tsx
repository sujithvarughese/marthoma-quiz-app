"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "./ui";

interface TimerProps {
  /** Countdown length in seconds. Changing it resets the timer. */
  duration: number;
  /** Start counting down immediately on mount / duration change. */
  autoStart?: boolean;
  /** Fired once when the timer reaches 0. */
  onExpire?: () => void;
  /** Optional label shown above the clock (e.g. "Passed – 30s"). */
  label?: string;
}

export function Timer({ duration, autoStart = false, onExpire, label }: TimerProps) {
  // State is initialised from props. To reset for a new question/duration,
  // callers remount this component with a `key` rather than mutating state.
  const [remaining, setRemaining] = useState(duration);
  const [running, setRunning] = useState(autoStart);

  // Keep the latest onExpire without re-subscribing the interval every render.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(id);
          setRunning(false);
          onExpireRef.current?.();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const reset = useCallback(() => {
    setRemaining(duration);
    setRunning(false);
  }, [duration]);

  const expired = remaining === 0;
  const low = remaining <= 10 && remaining > 5;
  const critical = remaining <= 5 && remaining > 0;

  const color = expired
    ? "text-rose-500"
    : critical
      ? "text-rose-400"
      : low
        ? "text-amber-400"
        : "text-emerald-400";

  const pct = duration > 0 ? (remaining / duration) * 100 : 0;

  return (
    <div className="flex flex-col items-center gap-4">
      {label && (
        <span className="text-lg font-semibold uppercase tracking-widest text-slate-400">
          {label}
        </span>
      )}

      <div
        className={`font-mono text-[7rem] font-black leading-none tabular-nums sm:text-[9rem] ${color} ${
          critical ? "animate-pulse" : ""
        }`}
        aria-live="polite"
      >
        {remaining}
      </div>

      {/* Progress bar */}
      <div className="h-3 w-72 overflow-hidden rounded-full bg-white/10 sm:w-96">
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${
            expired
              ? "bg-rose-500"
              : critical
                ? "bg-rose-400"
                : low
                  ? "bg-amber-400"
                  : "bg-emerald-400"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex gap-3">
        {!running && !expired && (
          <Button variant="success" size="md" onClick={() => setRunning(true)}>
            ▶ {remaining === duration ? "Start" : "Resume"}
          </Button>
        )}
        {running && (
          <Button variant="amber" size="md" onClick={() => setRunning(false)}>
            ⏸ Pause
          </Button>
        )}
        <Button variant="ghost" size="md" onClick={reset}>
          ↻ Reset
        </Button>
      </div>

      {expired && (
        <span className="text-2xl font-black uppercase tracking-widest text-rose-500">
          Time&apos;s up!
        </span>
      )}
    </div>
  );
}
