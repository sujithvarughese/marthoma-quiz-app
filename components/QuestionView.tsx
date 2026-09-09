"use client";

/* eslint-disable @next/next/no-img-element */
// Plain <img> (not next/image) so hosts can drop in any local path or remote
// URL in the data file without configuring remote image domains.

import { useState } from "react";
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
  const { activeQuestion, rounds, teams } = useGame();
  const dispatch = useDispatch();
  // The host selects the team that answered; points are committed when they
  // continue. This avoids accidental double-awards (there is no way to subtract
  // points, so awards can't be immediate-and-undoable).
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

  if (!activeQuestion) return null;
  const { question, status, revealed, roundId } = activeQuestion;
  const round = rounds.find((r) => r.id === roundId);
  const isPassed = status === "passed";
  const amount = isPassed ? AWARD_PASSED : AWARD_CORRECT;

  // Commit any selected award, then leave the question.
  const finish = () => {
    if (selectedTeamId)
      dispatch({ type: "AWARD", teamId: selectedTeamId, amount });
    dispatch({ type: "CLOSE_QUESTION" });
  };

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
              onClick={() => {
                setSelectedTeamId(null);
                dispatch({ type: "MARK_PASSED" });
              }}
            >
              Mark as passed (→ +{AWARD_PASSED})
            </Button>
          )}

          {/* Pick the team that answered; +{amount} is applied on continue. */}
          {teams.length === 0 ? (
            <p className="rounded-xl bg-white/5 px-4 py-3 text-center text-base font-semibold text-slate-300">
              Add teams from the Home screen to award points.
            </p>
          ) : (
            <div>
              <p className="mb-2 text-center text-base font-semibold text-slate-300">
                Who answered correctly?{" "}
                <span className="text-emerald-300">+{amount}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {teams.map((team) => {
                  const selected = team.id === selectedTeamId;
                  return (
                    <Button
                      key={team.id}
                      variant={selected ? "success" : "neutral"}
                      size="sm"
                      onClick={() =>
                        setSelectedTeamId(selected ? null : team.id)
                      }
                    >
                      {selected ? "✓ " : ""}
                      {team.name}
                    </Button>
                  );
                })}
              </div>
              <p className="mt-2 text-center text-xs text-slate-400">
                {selectedTeamId
                  ? `+${amount} applied when you continue · tap again to deselect`
                  : "No one? Just continue without selecting."}
              </p>
            </div>
          )}

          <div className="mt-2 grid grid-cols-2 gap-3">
            <Button variant="ghost" size="md" onClick={finish}>
              ← Board
            </Button>
            <Button variant="primary" size="md" onClick={finish}>
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
