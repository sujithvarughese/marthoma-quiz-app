"use client";

import { AWARD_CORRECT, useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";

/**
 * Board for the active round: one card per question, all worth the same points.
 * A team picks a card to reveal that question; a wrong answer can then be
 * passed to another team for half points. Once a card is chosen it locks so no
 * other team can pick the same question.
 */
export function RoundBoard() {
  const { rounds, activeRoundId } = useGame();
  const dispatch = useDispatch();

  const round = rounds.find((r) => r.id === activeRoundId);
  if (!round) return null;

  const remaining = round.questions.filter((q) => !q.used).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
            {round.name}
          </h2>
          {round.description && (
            <p className="mt-1 text-xl text-indigo-300">{round.description}</p>
          )}
          <p className="mt-1 text-lg font-semibold text-slate-400">
            {AWARD_CORRECT} points each · pick a card to answer
          </p>
        </div>
        <p className="text-lg font-semibold text-slate-400">
          {remaining} of {round.questions.length} remaining
        </p>
      </div>

      {remaining === 0 ? (
        <div className="panel flex flex-col items-center gap-6 px-6 py-20 text-center">
          <p className="text-3xl font-bold">All questions used in this round.</p>
          <Button size="lg" onClick={() => dispatch({ type: "GO_HOME" })}>
            Back to rounds
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {round.questions.map((q, i) => (
            <button
              key={q.id}
              disabled={q.used}
              onClick={() =>
                dispatch({
                  type: "REVEAL_QUESTION",
                  roundId: round.id,
                  questionId: q.id,
                })
              }
              aria-label={
                q.used ? `Question ${i + 1} (used)` : `Question ${i + 1}`
              }
              className={
                q.used
                  ? "flex aspect-square flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/5 text-white/20"
                  : "flex aspect-square flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xl transition-transform hover:scale-[1.04] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
              }
            >
              {q.used ? (
                <span className="text-6xl font-black">✓</span>
              ) : (
                <>
                  <span className="text-6xl font-black leading-none">
                    {i + 1}
                  </span>
                  <span className="mt-2 text-sm font-bold uppercase tracking-widest text-white/70">
                    {q.points} pts
                  </span>
                </>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
