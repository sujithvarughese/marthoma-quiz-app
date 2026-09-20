"use client";

import {
  activeTeam,
  currentRound,
  getQuestion,
  isNextRoundQuestionAudienceTurn,
  useDispatch,
  useGame,
} from "@/lib/store";
import { Button } from "./ui";

/**
 * Board for the active round: one card per question. The banner shows whose turn
 * it is (rotating each standard question). Picking a card opens the question.
 */
export function RoundBoard() {
  const state = useGame();
  const dispatch = useDispatch();

  const round = currentRound(state);
  const session = state.session;
  if (!round || !session) return null;

  const used = new Set(session.usedQuestionIds);
  const remaining = round.questionIds.filter((id) => !used.has(id)).length;
  const team = activeTeam(state);
  const isPicture = round.type === "picture";
  const nextAudienceTurn =
    !isPicture && isNextRoundQuestionAudienceTurn(session, round);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
            {round.name}
          </h2>
          {round.description && (
            <p className="mt-1 text-xl text-indigo-300">{round.description}</p>
          )}
          {isPicture ? (
            <p className="mt-2 inline-block rounded-full bg-fuchsia-500/20 px-4 py-1 text-lg font-bold text-fuchsia-200">
              Everyone plays — whiteboards
            </p>
          ) : nextAudienceTurn ? (
            <p className="mt-2 text-xl font-semibold text-slate-300">
              Up next:{" "}
              <span className="font-black text-fuchsia-300">
                🎉 Audience&apos;s turn
              </span>{" "}
              <span className="text-base font-medium text-slate-400">
                (bonus — no points)
              </span>
            </p>
          ) : (
            team && (
              <p className="mt-2 text-xl font-semibold text-slate-300">
                Up next:{" "}
                <span className="font-black text-emerald-300">{team.name}</span>
              </p>
            )
          )}
        </div>
        <p className="text-lg font-semibold text-slate-400">
          {remaining} of {round.questionIds.length} remaining
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
        <div
          className={`grid gap-4 ${isPicture ? "grid-cols-5" : "grid-cols-2 sm:grid-cols-4"}`}
        >
          {round.questionIds.map((id, i) => {
            const isDone = used.has(id);
            const q = getQuestion(state, id);
            return (
              <button
                key={id}
                disabled={isDone || !q}
                onClick={() =>
                  dispatch({ type: "SELECT_QUESTION", questionId: id })
                }
                aria-label={
                  isDone ? `Question ${i + 1} (used)` : `Question ${i + 1}`
                }
                className={
                  isDone
                    ? "flex aspect-square flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/5 text-white/20"
                    : "flex aspect-square flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-xl transition-transform hover:scale-[1.04] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
                }
              >
                {isDone ? (
                  <span className="text-6xl font-black">✓</span>
                ) : (
                  <span className="text-6xl font-black leading-none">
                    {i + 1}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
