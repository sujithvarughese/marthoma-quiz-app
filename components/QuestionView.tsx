"use client";

/* eslint-disable @next/next/no-img-element */
// Plain <img> (not next/image) so hosts can drop in any local path or remote
// URL in the data file without configuring remote image domains.

import {
  AWARD_CORRECT,
  AWARD_PASSED,
  TIME_DIRECT,
  TIME_PASSED,
  useDispatch,
  useGame,
} from "@/lib/store";
import { Button } from "./ui";
import { Timer } from "./Timer";

export function QuestionView() {
  const { activeQuestion, rounds, showScoreboard } = useGame();
  const dispatch = useDispatch();

  if (!activeQuestion) return null;
  const { question, status, revealed, roundId } = activeQuestion;
  const round = rounds.find((r) => r.id === roundId);
  const isPassed = status === "passed";

  return (
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.6fr_1fr]">
      {/* Question */}
      <div className="panel flex flex-col p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="rounded-full bg-indigo-500 px-4 py-1.5 text-xl font-black text-white">
            {question.points} pts
          </span>
          {isPassed && (
            <span className="rounded-full bg-amber-500 px-4 py-1.5 text-xl font-black text-slate-900">
              PASSED · answer for +{AWARD_PASSED}
            </span>
          )}
        </div>

        {question.imageUrl && (
          <img
            src={question.imageUrl}
            alt="Question"
            className="mb-6 max-h-[45vh] w-full rounded-2xl object-contain"
          />
        )}

        <p className="text-4xl font-bold leading-snug sm:text-5xl">
          {question.question}
        </p>

        <div className="mt-8">
          {revealed ? (
            <div className="rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 px-6 py-5">
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">
                Answer
              </p>
              <p className="mt-1 text-3xl font-black text-emerald-200 sm:text-4xl">
                {question.answer}
              </p>
            </div>
          ) : (
            <Button size="lg" onClick={() => dispatch({ type: "REVEAL_ANSWER" })}>
              Reveal answer
            </Button>
          )}
        </div>
      </div>

      {/* Timer + controls */}
      <div className="flex flex-col gap-6">
        <div className="panel flex flex-col items-center gap-6 p-8">
          <Timer
            key={`${question.id}-${status}`}
            duration={isPassed ? TIME_PASSED : TIME_DIRECT}
            label={
              isPassed
                ? `Passed question · ${TIME_PASSED}s`
                : `Direct question · ${TIME_DIRECT}s`
            }
          />
        </div>

        <div className="panel flex flex-col gap-3 p-6">
          {!isPassed && (
            <Button
              variant="amber"
              size="lg"
              onClick={() => dispatch({ type: "MARK_PASSED" })}
            >
              Mark as passed (→ +{AWARD_PASSED})
            </Button>
          )}

          <Button
            variant={showScoreboard ? "neutral" : "success"}
            size="lg"
            onClick={() => {
              if (!showScoreboard) dispatch({ type: "TOGGLE_SCOREBOARD" });
            }}
          >
            Award points ({showScoreboard ? "scoreboard open →" : `+${AWARD_CORRECT} / +${AWARD_PASSED}`})
          </Button>

          <div className="mt-2 grid grid-cols-2 gap-3">
            <Button
              variant="ghost"
              size="md"
              onClick={() => dispatch({ type: "CLOSE_QUESTION" })}
            >
              ← Board
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => dispatch({ type: "CLOSE_QUESTION" })}
            >
              Next question →
            </Button>
          </div>
          {round && (
            <p className="mt-1 text-center text-sm text-slate-400">
              {round.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
