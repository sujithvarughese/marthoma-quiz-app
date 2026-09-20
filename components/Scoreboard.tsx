"use client";

import { useEffect, useRef, useState } from "react";
import { activeTeam, useGame } from "@/lib/store";

/** Playful per-team color identity, matching the display route scoreboard dock. */
const TEAM_ACCENTS = [
  { chip: "bg-indigo-500/25 border-indigo-400/50", badge: "bg-indigo-400 text-indigo-950" },
  { chip: "bg-emerald-500/25 border-emerald-400/50", badge: "bg-emerald-400 text-emerald-950" },
  { chip: "bg-purple-500/25 border-purple-400/50", badge: "bg-purple-400 text-purple-950" },
  { chip: "bg-sky-500/25 border-sky-400/50", badge: "bg-sky-400 text-sky-950" },
  { chip: "bg-amber-500/25 border-amber-400/50", badge: "bg-amber-400 text-amber-950" },
  { chip: "bg-rose-500/25 border-rose-400/50", badge: "bg-rose-400 text-rose-950" },
];

interface ScoreDelta {
  id: string;
  teamId: string;
  delta: number;
  timestamp: number;
}

/**
 * Always-visible scoreboard across the bottom of the host screen.
 * Displays teams in their original roster order as entered on the home/setup screen,
 * matching the layout and styling of the display route scoreboard dock.
 */
export function Scoreboard() {
  const state = useGame();
  const { session } = state;
  const currentActiveTeam = activeTeam(state);
  const teams = session?.teams
    ? [...session.teams].sort((a, b) => a.order - b.order)
    : [];
  const maxScore = Math.max(0, ...teams.map((t) => t.score));

  // Pop a floating +N / -N above whichever team's score just changed —
  // covers every round (award, steal, picture, rapid fire, undo, manual adjust).
  const prevScoresRef = useRef<Record<string, number> | null>(null);
  const [deltas, setDeltas] = useState<ScoreDelta[]>([]);
  const scoreSignature = teams.map((t) => `${t.id}:${t.score}`).join("|");

  useEffect(() => {
    const prev = prevScoresRef.current;
    const nextMap: Record<string, number> = {};
    teams.forEach((t) => {
      nextMap[t.id] = t.score;
    });

    if (prev === null) {
      // First mount / game load — record the baseline without any fireworks.
      prevScoresRef.current = nextMap;
      return;
    }

    const newDeltas: ScoreDelta[] = [];
    teams.forEach((t) => {
      const old = prev[t.id];
      if (old !== undefined && old !== t.score) {
        newDeltas.push({
          id: `${t.id}-${Date.now()}-${Math.random()}`,
          teamId: t.id,
          delta: t.score - old,
          timestamp: Date.now(),
        });
      }
    });
    prevScoresRef.current = nextMap;

    if (newDeltas.length > 0) {
      setDeltas((cur) => [...cur, ...newDeltas]);
      const timer = window.setTimeout(() => {
        const now = Date.now();
        setDeltas((cur) => cur.filter((d) => now - d.timestamp < 1500));
      }, 1600);
      return () => window.clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreSignature]);

  if (teams.length === 0) {
    return (
      <footer className="shrink-0 border-t-2 border-white/10 bg-slate-950/85 px-8 py-4 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
        <p className="py-2 text-center text-lg font-semibold text-slate-400">
          No teams yet — add teams on the setup screen.
        </p>
      </footer>
    );
  }

  return (
    <footer className="relative z-30 shrink-0 border-t-2 border-white/10 bg-gradient-to-b from-slate-950/80 to-slate-950/95 px-6 py-5 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="mx-auto flex flex-wrap items-center justify-center gap-3 py-2">
        {teams.map((team, idx) => {
          const isActive = currentActiveTeam?.id === team.id;
          const isLeader = team.score > 0 && team.score === maxScore;
          const accent = TEAM_ACCENTS[idx % TEAM_ACCENTS.length];
          const teamDeltas = deltas.filter((d) => d.teamId === team.id);

          return (
            <div
              key={team.id}
              className={`relative flex flex-shrink-0 items-center gap-3 rounded-full border px-5 py-3 transition-all duration-300 ${accent.chip} ${
                isActive
                  ? "ring-2 ring-emerald-400/80 shadow-[0_0_24px_rgba(16,185,129,0.4)]"
                  : "shadow-md"
              }`}
            >
              {/* Score Pop (+10 / -10) — anchored fully inside the pill so a
                  horizontally-scrolling row can never clip it. */}
              {teamDeltas.length > 0 && (
                <div className="pointer-events-none absolute -top-1 right-1 z-10">
                  {teamDeltas.map((d) => (
                    <span
                      key={d.id}
                      className={`animate-score-pop absolute right-0 top-0 font-mono text-lg font-black ${
                        d.delta > 0
                          ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]"
                          : "text-rose-400 drop-shadow-[0_0_10px_rgba(244,63,94,0.9)]"
                      }`}
                    >
                      {d.delta > 0 ? `+${d.delta}` : d.delta}
                    </span>
                  ))}
                </div>
              )}

              {/* Team Index (Preserved Order) */}
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black shadow-inner ${accent.badge}`}
              >
                {idx + 1}
              </span>

              {/* Team Name */}
              <span className="whitespace-nowrap text-lg font-black tracking-wide text-white">
                {team.name}
              </span>

              {/* First Place Star */}
              {isLeader && (
                <span
                  className="animate-bounce flex-shrink-0 text-base text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  aria-label="First place"
                  title="First place"
                >
                  ⭐
                </span>
              )}

              {/* Team Score */}
              <span className="whitespace-nowrap font-mono text-2xl font-black tabular-nums text-white">
                {team.score}
              </span>
            </div>
          );
        })}
      </div>
    </footer>
  );
}
