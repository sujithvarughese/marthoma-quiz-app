"use client";

import { rankedTeams, useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";

/**
 * Full-screen standings for the host, used by both the "scoreboard" view
 * (mid-game) and the "winner" view (final results, with a champion callout).
 */
export function ResultsScreen({ winner = false }: { winner?: boolean }) {
  const { session } = useGame();
  const dispatch = useDispatch();
  const ranked = rankedTeams(session?.teams ?? []);
  const top = ranked[0];

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <header className="text-center">
        <h2 className="text-5xl font-black tracking-tight sm:text-6xl">
          {winner ? "🏆 Final Results" : "Scoreboard"}
        </h2>
        {winner && top && (
          <p className="mt-3 text-2xl text-amber-300">
            Champions: <span className="font-black">{top.name}</span>
          </p>
        )}
      </header>

      <div className="flex flex-col gap-3">
        {ranked.map((team, i) => (
          <div
            key={team.id}
            className={`flex items-center justify-between gap-4 rounded-2xl px-6 py-4 ${
              i === 0
                ? "bg-amber-400/15 ring-2 ring-amber-400/60"
                : "bg-white/5"
            }`}
          >
            <div className="flex items-center gap-4">
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-2xl font-black ${
                  i === 0 ? "bg-amber-400 text-slate-900" : "bg-slate-700 text-white"
                }`}
              >
                {i + 1}
              </span>
              <span className="text-3xl font-bold">{team.name}</span>
            </div>
            <span className="font-mono text-5xl font-black tabular-nums">
              {team.score}
            </span>
          </div>
        ))}
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
