"use client";

import { useState } from "react";
import {
  AWARD_CORRECT,
  AWARD_PASSED,
  AWARD_RAPID,
  useDispatch,
  useGame,
} from "@/lib/store";
import { Button } from "./ui";

/**
 * Slide-in scoreboard that doubles as the point-awarding hub. Toggle it from
 * the top bar at any time; the host taps an award button on the team that
 * answered. No negative scoring — there is a "No points" acknowledgement only.
 */
export function Scoreboard() {
  const { teams } = useGame();
  const dispatch = useDispatch();
  const [flash, setFlash] = useState<string | null>(null);

  // Highest score first; keep a stable order for ties by original index.
  const ranked = teams
    .map((t, i) => ({ ...t, i }))
    .sort((a, b) => b.score - a.score || a.i - b.i);

  const award = (teamId: string, amount: number, key: string) => {
    if (amount > 0) dispatch({ type: "AWARD", teamId, amount });
    setFlash(key);
    window.setTimeout(() => setFlash((f) => (f === key ? null : f)), 600);
  };

  return (
    <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xl flex-col border-l border-white/10 bg-[#0b1120]/98 shadow-2xl backdrop-blur">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <h2 className="text-3xl font-black tracking-tight">Scoreboard</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => dispatch({ type: "TOGGLE_SCOREBOARD" })}
        >
          ✕ Close
        </Button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
        {ranked.length === 0 && (
          <p className="px-2 py-8 text-center text-xl text-slate-400">
            No teams yet — add teams from the Home screen.
          </p>
        )}

        {ranked.map((team, position) => (
          <div
            key={team.id}
            className="panel px-5 py-4"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl font-black ${
                    position === 0
                      ? "bg-amber-400 text-slate-900"
                      : "bg-slate-700 text-white"
                  }`}
                >
                  {position + 1}
                </span>
                <span className="truncate text-2xl font-bold">{team.name}</span>
              </div>
              <span
                className={`shrink-0 font-mono text-5xl font-black tabular-nums transition-colors ${
                  flash?.startsWith(team.id) ? "text-emerald-400" : "text-white"
                }`}
              >
                {team.score}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              <Button
                variant="success"
                size="sm"
                onClick={() => award(team.id, AWARD_CORRECT, `${team.id}-c`)}
              >
                +{AWARD_CORRECT}
              </Button>
              <Button
                variant="amber"
                size="sm"
                onClick={() => award(team.id, AWARD_PASSED, `${team.id}-p`)}
              >
                +{AWARD_PASSED}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => award(team.id, AWARD_RAPID, `${team.id}-r`)}
              >
                +{AWARD_RAPID}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => award(team.id, 0, `${team.id}-0`)}
              >
                No pts
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-white/10 px-6 py-3 text-center text-sm text-slate-400">
        +{AWARD_CORRECT} correct &nbsp;·&nbsp; +{AWARD_PASSED} passed
        &nbsp;·&nbsp; +{AWARD_RAPID} rapid fire
      </div>
    </aside>
  );
}
