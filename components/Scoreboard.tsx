"use client";

import { rankedTeams, useGame } from "@/lib/store";

/**
 * Always-visible scoreboard across the bottom of the host screen. Display only —
 * points are awarded from the question / rapid-fire views. Highest score first.
 */
export function Scoreboard() {
  const { session } = useGame();
  const ranked = rankedTeams(session?.teams ?? []);

  return (
    <footer className="shrink-0 border-t border-white/10 bg-black/40 px-4 py-3 backdrop-blur">
      {ranked.length === 0 ? (
        <p className="py-2 text-center text-lg font-semibold text-slate-400">
          No teams yet — add teams on the setup screen.
        </p>
      ) : (
        <div className="flex gap-3 overflow-x-auto">
          {ranked.map((team, position) => (
            <div
              key={team.id}
              className={`flex min-w-[9rem] flex-1 items-center justify-between gap-3 rounded-2xl px-4 py-2 ${
                position === 0
                  ? "bg-amber-400/15 ring-2 ring-amber-400/60"
                  : "bg-white/5"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg font-black ${
                    position === 0
                      ? "bg-amber-400 text-slate-900"
                      : "bg-slate-700 text-white"
                  }`}
                >
                  {position + 1}
                </span>
                <span className="truncate text-lg font-bold sm:text-xl">
                  {team.name}
                </span>
              </div>
              <span className="shrink-0 font-mono text-3xl font-black tabular-nums sm:text-4xl">
                {team.score}
              </span>
            </div>
          ))}
        </div>
      )}
    </footer>
  );
}
