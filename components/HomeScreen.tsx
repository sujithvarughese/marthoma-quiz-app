"use client";

import { useDispatch, useGame } from "@/lib/store";
import { rapidFireQuestions } from "@/lib/content";

// Accent colours cycle through the rounds for quick visual distinction.
const ROUND_ACCENTS = [
  "from-indigo-500 to-indigo-700",
  "from-emerald-500 to-emerald-700",
  "from-fuchsia-500 to-fuchsia-700",
  "from-sky-500 to-sky-700",
  "from-amber-500 to-amber-700",
  "from-rose-500 to-rose-700",
];

/**
 * The in-game hub: pick a round or rapid fire, or jump to the scoreboard /
 * final results.
 */
export function HomeScreen() {
  const state = useGame();
  const dispatch = useDispatch();
  const { content, session } = state;
  if (!content || !session) return null;

  const used = new Set(session.usedQuestionIds);
  const rapidRemaining = rapidFireQuestions(content).filter(
    (q) => !used.has(q.id),
  ).length;

  return (
    <div className="mx-auto max-w-6xl">
      <h2 className="mb-5 text-3xl font-black tracking-tight">Choose a round</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {content.rounds.map((round, i) => {
          const total = round.questionIds.length;
          const remaining = round.questionIds.filter(
            (id) => !used.has(id),
          ).length;
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
                {round.type === "picture" && " · picture round"}
              </p>
            </button>
          );
        })}
      </div>

      <h2 className="mb-4 mt-8 text-3xl font-black tracking-tight">
        Special rounds
      </h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <button
          onClick={() => dispatch({ type: "ENTER_RAPIDFIRE" })}
          className="flex flex-col justify-between rounded-3xl border-2 border-yellow-400/60 bg-yellow-400/10 p-6 text-left shadow-xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
        >
          <span className="text-4xl">⚡</span>
          <h3 className="mt-3 text-2xl font-black text-yellow-300">Rapid Fire</h3>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-yellow-200/70">
            {rapidRemaining} questions in pool
          </p>
        </button>

        <button
          onClick={() => dispatch({ type: "SHOW_SCOREBOARD" })}
          className="flex flex-col justify-between rounded-3xl border-2 border-sky-400/60 bg-sky-400/10 p-6 text-left shadow-xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
        >
          <span className="text-4xl">📊</span>
          <h3 className="mt-3 text-2xl font-black text-sky-300">Scoreboard</h3>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-sky-200/70">
            Show standings on the projector
          </p>
        </button>

        <button
          onClick={() => {
            if (confirm("Show the final results and end the game?"))
              dispatch({ type: "SHOW_WINNER" });
          }}
          className="flex flex-col justify-between rounded-3xl border-2 border-amber-400/60 bg-amber-400/10 p-6 text-left shadow-xl transition-transform hover:scale-[1.02] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
        >
          <span className="text-4xl">🏆</span>
          <h3 className="mt-3 text-2xl font-black text-amber-300">Final Results</h3>
          <p className="mt-1 text-sm font-semibold uppercase tracking-wide text-amber-200/70">
            Reveal the winner
          </p>
        </button>
      </div>
    </div>
  );
}
