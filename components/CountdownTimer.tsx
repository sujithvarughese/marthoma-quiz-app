"use client";

import { useEffect, useState } from "react";

/**
 * A countdown driven by an absolute end time (epoch ms). Both the host and the
 * projector render this from the same `endsAt` value (published in the live
 * doc / held in host state), so the two screens stay in agreement without
 * streaming per-second ticks between devices.
 *
 * Pass endsAt = null to show an idle/finished clock.
 */
export function CountdownTimer({
  endsAt,
  durationSeconds,
  label,
  size = "lg",
}: {
  endsAt: number | null;
  durationSeconds: number | null;
  label?: string;
  size?: "md" | "lg";
}) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (endsAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);

  const remainingMs = endsAt === null ? 0 : Math.max(0, endsAt - now);
  const remaining = Math.ceil(remainingMs / 1000);
  const expired = endsAt !== null && remainingMs === 0;

  const critical = remaining <= 5 && remaining > 0;
  const low = remaining <= 10 && remaining > 5;
  const color = expired
    ? "text-rose-500"
    : critical
      ? "text-rose-400"
      : low
        ? "text-amber-400"
        : "text-emerald-400";
  const bar = expired
    ? "bg-rose-500"
    : critical
      ? "bg-rose-400"
      : low
        ? "bg-amber-400"
        : "bg-emerald-400";

  const pct =
    durationSeconds && durationSeconds > 0
      ? Math.min(100, (remaining / durationSeconds) * 100)
      : 0;

  const digits =
    size === "lg"
      ? "text-[7rem] sm:text-[9rem]"
      : "text-6xl sm:text-7xl";

  return (
    <div className="flex flex-col items-center gap-4">
      {label && (
        <span className="text-lg font-semibold uppercase tracking-widest text-slate-400">
          {label}
        </span>
      )}
      <div
        className={`font-mono font-black leading-none tabular-nums ${digits} ${color} ${
          critical ? "animate-pulse" : ""
        }`}
        aria-live="polite"
      >
        {endsAt === null ? "—" : remaining}
      </div>
      <div className="h-3 w-72 overflow-hidden rounded-full bg-white/10 sm:w-96">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-linear ${bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {expired && (
        <span className="text-2xl font-black uppercase tracking-widest text-rose-500">
          Time&apos;s up!
        </span>
      )}
    </div>
  );
}
