"use client";

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
    <footer className="relative z-30 shrink-0 border-t-2 border-white/10 bg-gradient-to-b from-slate-950/80 to-slate-950/95 px-6 py-5 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="mx-auto flex flex-nowrap items-center justify-center gap-3 overflow-x-auto overflow-y-visible py-1">
        {teams.map((team, idx) => {
          const isActive = currentActiveTeam?.id === team.id;
          const isLeader = team.score > 0 && team.score === maxScore;
          const accent = TEAM_ACCENTS[idx % TEAM_ACCENTS.length];

          return (
            <div
              key={team.id}
              className={`relative flex flex-shrink-0 items-center gap-3 rounded-full border px-5 py-3 transition-all duration-300 ${accent.chip} ${
                isActive
                  ? "ring-2 ring-emerald-400/80 shadow-[0_0_24px_rgba(16,185,129,0.4)]"
                  : "shadow-md"
              }`}
            >
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
