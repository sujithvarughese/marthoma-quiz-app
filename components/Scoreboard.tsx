"use client";

import { activeTeam, useGame } from "@/lib/store";

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
    <footer className="relative z-30 shrink-0 border-t-2 border-white/10 bg-slate-950/85 px-8 py-4 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-4">
        {teams.map((team, idx) => {
          const isActive = currentActiveTeam?.id === team.id;
          const isLeader = team.score > 0 && team.score === maxScore;

          return (
            <div
              key={team.id}
              className={`relative flex items-center gap-3 rounded-2xl border px-5 py-2.5 transition-all ${
                isLeader
                  ? "border-amber-400/80 bg-amber-500/15 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                  : isActive
                    ? "border-emerald-400/80 bg-emerald-500/15 shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-2 ring-emerald-400/40"
                    : "border-white/10 bg-white/5"
              }`}
            >
              {/* Team Index (Preserved Order) */}
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black ${
                  isLeader
                    ? "bg-amber-400 text-slate-950"
                    : "bg-slate-800 text-slate-300"
                }`}
              >
                {isLeader ? "👑" : idx + 1}
              </span>

              {/* Team Name */}
              <span className="text-xl font-black tracking-wide text-white">
                {team.name}
              </span>

              {/* Team Score */}
              <span
                className={`font-mono text-2xl font-black tabular-nums ${
                  isLeader ? "text-amber-300" : "text-slate-200"
                }`}
              >
                {team.score}
              </span>
            </div>
          );
        })}
      </div>
    </footer>
  );
}
