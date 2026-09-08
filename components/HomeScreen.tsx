"use client";

import { useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";
import { TeamSetup } from "./TeamSetup";

// Accent colours cycle through the six rounds for quick visual distinction.
const ROUND_ACCENTS = [
  "from-indigo-500 to-indigo-700",
  "from-emerald-500 to-emerald-700",
  "from-fuchsia-500 to-fuchsia-700",
  "from-sky-500 to-sky-700",
  "from-amber-500 to-amber-700",
  "from-rose-500 to-rose-700",
];

export function HomeScreen() {
  const { rounds, rapidFirePool, tiebreakerPool } = useGame();
  const dispatch = useDispatch();

  const rapidRemaining = rapidFirePool.filter((q) => !q.used).length;
  const tbRemaining = tiebreakerPool.filter((q) => !q.used).length;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[2fr_1fr]">
      {/* Rounds */}
      <div>
        <h2 className="mb-5 text-3xl font-black tracking-tight">
          Choose a round
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {rounds.map((round, i) => {
            const remaining = round.questions.filter((q) => !q.used).length;
            const total = round.questions.length;
            return (
              <button
                key={round.id}
                onClick={() => dispatch({ type: "OPEN_ROUND", roundId: round.id })}
                className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-gradient-to-br ${ROUND_ACCENTS[i % ROUND_ACCENTS.length]} p-6 text-left shadow-xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50`}
              >
                <span className="text-6xl font-black text-white/25">
                  {round.order}
                </span>
                <div className="mt-4">
                  <h3 className="text-2xl font-black leading-tight text-white">
                    {round.name}
                  </h3>
                  {round.description && (
                    <p className="text-lg font-medium text-white/80">
                      {round.description}
                    </p>
                  )}
                </div>
                <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-white/70">
                  {remaining} of {total} left
                  {round.isPicture && " · picture round"}
                </p>
              </button>
            );
          })}
        </div>

        {/* Special modes */}
        <h2 className="mb-4 mt-8 text-3xl font-black tracking-tight">
          Special rounds
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => dispatch({ type: "ENTER_RAPIDFIRE" })}
            className="flex flex-col justify-between rounded-3xl border-2 border-yellow-400/60 bg-yellow-400/10 p-6 text-left shadow-xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
          >
            <span className="text-4xl">⚡</span>
            <h3 className="mt-3 text-2xl font-black text-yellow-300">
              Rapid Fire
            </h3>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-yellow-200/70">
              {rapidRemaining} questions in pool
            </p>
          </button>

          <button
            onClick={() => dispatch({ type: "START_TIEBREAKER" })}
            className="flex flex-col justify-between rounded-3xl border-2 border-rose-400/60 bg-rose-400/10 p-6 text-left shadow-xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
          >
            <span className="text-4xl">⚔️</span>
            <h3 className="mt-3 text-2xl font-black text-rose-300">
              Sudden-Death Tiebreaker
            </h3>
            <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-rose-200/70">
              {tbRemaining} questions in pool
            </p>
          </button>
        </div>
      </div>

      {/* Sidebar: teams + controls */}
      <div className="space-y-6">
        <TeamSetup />

        <section className="panel p-6">
          <h2 className="mb-4 text-2xl font-bold">Game controls</h2>
          <div className="flex flex-col gap-3">
            <Button
              variant="neutral"
              onClick={() => dispatch({ type: "TOGGLE_SCOREBOARD" })}
            >
              Show scoreboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm("Reset all scores to 0?"))
                  dispatch({ type: "RESET_SCORES" });
              }}
            >
              Reset scores
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                if (confirm("Mark every question as unused again?"))
                  dispatch({ type: "RESET_QUESTIONS" });
              }}
            >
              Reset questions
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (
                  confirm(
                    "Start a new game? Scores reset to 0 and all questions become available (team names are kept).",
                  )
                )
                  dispatch({ type: "RESET_GAME" });
              }}
            >
              New game
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
