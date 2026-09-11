"use client";

import { useGame } from "@/lib/store";

/**
 * Always-visible scoreboard across the bottom of the host screen.
 * Displays teams in their original roster order as entered on the home/setup screen.
 */
export function Scoreboard() {
  const { session } = useGame();
  const teams = session?.teams
    ? [...session.teams].sort((a, b) => a.order - b.order)
    : [];
  const maxScore = Math.max(0, ...teams.map((t) => t.score));

  return (
    <footer className="shrink-0 border-t border-white/10 bg-black/40 px-4 py-3 backdrop-blur">
      {teams.length === 0 ? (
        <p className="py-2 text-center text-lg font-semibold text-slate-400">
          No teams yet — add teams on the setup screen.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto">
          {teams.map((team, idx) => {
            const isLeader = team.score > 0 && team.score === maxScore;
            return (
              <div
                key={team.id}
                className={`flex min-w-[9rem] flex-1 items-center justify-between gap-3 rounded-2xl px-4 py-2 ${
                  isLeader
                    ? "bg-amber-400/15 ring-2 ring-amber-400/60"
                    : "bg-white/5"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                      isLeader
                        ? "bg-amber-400 text-slate-900"
                        : "bg-slate-700 text-white"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="truncate text-lg font-bold sm:text-xl">
                    {team.name}
                  </span>
                </div>
                <span className="shrink-0 font-mono text-3xl font-black tabular-nums sm:text-4xl">
                  {team.score}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </footer>
  );
}
