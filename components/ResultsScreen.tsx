"use client";

import { useState } from "react";
import { activeTeam, rankedTeams, useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";

/**
 * Full-screen standings for the host, used by both the "scoreboard" view
 * (mid-game) and the "winner" view (final results, with a champion callout),
 * matching the layout and styling of the scoreboard in the display route.
 * On the mid-game scoreboard, the host can click a score to correct it —
 * routed through the same ADJUST_SCORE action as every other point award, so
 * a manual correction still pops the usual +/- delta on the scoreboards.
 */
export function ResultsScreen({ winner = false }: { winner?: boolean }) {
  const state = useGame();
  const { session } = state;
  const dispatch = useDispatch();
  const ranked = rankedTeams(session?.teams ?? []);
  const currentActiveTeam = activeTeam(state);
  const top = ranked[0];

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (teamId: string, score: number) => {
    setEditingId(teamId);
    setDraft(String(score));
  };

  const commitEdit = (teamId: string, currentScore: number) => {
    const parsed = Number.parseInt(draft, 10);
    if (Number.isFinite(parsed) && parsed !== currentScore) {
      dispatch({
        type: "ADJUST_SCORE",
        teamId,
        amount: parsed - currentScore,
      });
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-1 flex-col justify-center gap-10 p-6 sm:p-10">
      <header className="text-center">
        {winner ? (
          <>
            <span className="text-7xl drop-shadow-[0_0_40px_rgba(251,191,36,0.8)]">
              🏆
            </span>
            <h1 className="mt-3 text-6xl font-black tracking-tight text-amber-300 drop-shadow-[0_0_40px_rgba(251,191,36,0.5)] sm:text-8xl">
              {top ? top.name : "Final Standings"}
            </h1>
            {top && (
              <p className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">
                GRAND CHAMPIONS!
              </p>
            )}
          </>
        ) : (
          <>
            <h1 className="text-5xl font-black tracking-tight text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.4)] sm:text-7xl">
              🏆 Current Standings
            </h1>
            <p className="mt-2 text-xl font-semibold text-slate-400 sm:text-2xl">
              Live Scores & Leaderboard
            </p>
            <p className="mt-1 text-base font-medium text-slate-500">
              Click a score to correct it
            </p>
          </>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
        {ranked.map((t, i) => {
          const isLeader = i === 0;
          const isActive = currentActiveTeam?.id === t.id;

          return (
            <div
              key={t.id}
              className={`flex items-center justify-between gap-8 rounded-3xl border-2 px-8 py-6 transition-all sm:px-10 sm:py-7 ${
                isLeader
                  ? "border-amber-400/80 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-slate-900/80 shadow-[0_0_40px_rgba(251,191,36,0.3)]"
                  : isActive
                    ? "border-emerald-400/70 bg-gradient-to-r from-emerald-950/60 to-slate-900/80 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                    : "border-white/10 bg-slate-900/60 shadow-xl"
              }`}
            >
              <div className="flex items-center gap-6 sm:gap-8">
                {isLeader && (
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-2xl font-black text-slate-950 shadow-lg ring-4 ring-amber-300/50 sm:h-16 sm:w-16 sm:text-3xl">
                    👑
                  </span>
                )}
                <span className="text-3xl font-extrabold tracking-wide text-white drop-shadow sm:text-4xl">
                  {t.name}
                </span>
              </div>
              {!winner && editingId === t.id ? (
                <input
                  type="number"
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={() => commitEdit(t.id, t.score)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="w-32 rounded-xl border-2 border-amber-400/70 bg-slate-950/80 px-3 py-1 text-right font-mono text-4xl font-black tabular-nums text-white focus:outline-none sm:w-40 sm:text-5xl"
                />
              ) : (
                <span
                  role={winner ? undefined : "button"}
                  tabIndex={winner ? undefined : 0}
                  onClick={winner ? undefined : () => startEdit(t.id, t.score)}
                  onKeyDown={
                    winner
                      ? undefined
                      : (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            startEdit(t.id, t.score);
                          }
                        }
                  }
                  title={winner ? undefined : "Click to edit score"}
                  className={`rounded-xl px-2 font-mono text-5xl font-black tabular-nums sm:text-6xl ${
                    isLeader ? "text-amber-300" : "text-white"
                  } ${winner ? "" : "cursor-pointer transition-colors hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"}`}
                >
                  {t.score}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-4">
        <Button size="lg" variant="ghost" onClick={() => dispatch({ type: "GO_HOME" })}>
          ← Home
        </Button>
        {!winner && (
          <Button
            size="lg"
            variant="amber"
            onClick={() => {
              if (confirm("Show the final results and end the game?"))
                dispatch({ type: "SHOW_WINNER" });
            }}
          >
            Final results →
          </Button>
        )}
      </div>
    </div>
  );
}
