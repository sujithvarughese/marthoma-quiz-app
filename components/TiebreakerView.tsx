"use client";

/* eslint-disable @next/next/no-img-element */
// Plain <img> so any local path or remote URL from the data works without
// configuring next/image remote domains.

import { useState } from "react";
import { tiebreakerQuestions } from "@/lib/content";
import type { SessionTeam } from "@/lib/session";
import { getQuestion, useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";
import { CountdownTimer } from "./CountdownTimer";

/**
 * Sudden-death tiebreaker flow. Only the teams tied for 1st place play — they
 * all get the same question at once and write their answer on a whiteboard,
 * exactly like the Picture Round, except the roster here is a fixed subset of
 * teams instead of everyone. The host works through the pool one question at
 * a time until exactly one tied team is ticked correct; anything else (none
 * correct, or more than one) means the tie isn't broken yet, so the host
 * deals another question to the same teams.
 */
export function TiebreakerView() {
  const state = useGame();
  const dispatch = useDispatch();
  const [confirmReveal, setConfirmReveal] = useState(false);

  const q = getQuestion(state, state.activeQuestionId);
  const session = state.session;
  const content = state.content;
  const tb = session?.tiebreaker;
  if (!q || !session || !content || !tb) return null;

  const { revealed, tiebreakerCorrect, timer, awarded } = state;
  const { tiebreakerPoints } = session.settings;
  const teams = tb.teamIds
    .map((id) => session.teams.find((t) => t.id === id))
    .filter((t): t is SessionTeam => !!t);
  const selected = new Set(tiebreakerCorrect);
  const pendingQuestionStart = timer.endsAt === null && !awarded && !revealed;
  const resolved = awarded && tiebreakerCorrect.length === 1;
  const winner = resolved
    ? teams.find((t) => t.id === tiebreakerCorrect[0])
    : null;
  const used = new Set(session.usedQuestionIds);
  const remaining = tiebreakerQuestions(content).filter(
    (tq) => !used.has(tq.id),
  ).length;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="panel flex flex-col p-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-rose-500 px-4 py-1.5 text-xl font-black text-white">
            🔥 Sudden-Death Tiebreaker
          </span>
        </div>

        <p className="mb-6 text-lg font-semibold text-rose-200">
          Tied at the top:{" "}
          <span className="text-white">
            {teams.map((t) => t.name).join(" vs ")}
          </span>
        </p>

        {q.imageUrl && (
          <img
            src={q.imageUrl}
            alt="Question"
            className="mb-6 max-h-[45vh] w-full rounded-2xl object-contain"
          />
        )}

        <p className="text-3xl font-bold leading-snug sm:text-4xl">
          {q.question}
        </p>

        <div className="mt-8 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-emerald-400">
                Correct Answer
              </p>
              <p className="mt-1 text-3xl font-black text-emerald-200 sm:text-4xl">
                {q.answer}
              </p>
            </div>
            <Button
              variant={revealed ? "neutral" : "primary"}
              size="md"
              disabled={revealed}
              onClick={() => setConfirmReveal(true)}
            >
              {revealed ? "✓ Revealed on Display" : "👁 Reveal on Display"}
            </Button>
          </div>

          {q.funFact && (
            <div className="mt-4 border-t border-emerald-500/30 pt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                Fun fact — say it aloud
              </p>
              <p className="mt-1 text-lg text-emerald-100">{q.funFact}</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <div className="panel flex flex-col items-center gap-6 p-8">
          <CountdownTimer
            endsAt={timer.endsAt}
            durationSeconds={timer.durationSeconds}
            label="Whiteboards up"
          />
        </div>

        <div className="panel flex flex-col gap-3 p-6">
          {pendingQuestionStart ? (
            <Button
              className="w-full"
              variant="success"
              size="lg"
              onClick={() => dispatch({ type: "START_TIEBREAKER_TIMER" })}
            >
              ▶ Start Timer
            </Button>
          ) : !awarded ? (
            <>
              <p className="text-center text-base font-semibold text-slate-300">
                Tick every team that got it right{" "}
                <span className="text-emerald-300">+{tiebreakerPoints}</span>
              </p>
              <div className="grid grid-cols-1 gap-2">
                {teams.map((t) => {
                  const on = selected.has(t.id);
                  return (
                    <Button
                      key={t.id}
                      variant={on ? "success" : "neutral"}
                      size="sm"
                      onClick={() =>
                        dispatch({
                          type: "TOGGLE_TIEBREAKER_TEAM",
                          teamId: t.id,
                        })
                      }
                    >
                      {on ? "✓ " : ""}
                      {t.name}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => dispatch({ type: "AWARD_TIEBREAKER" })}
              >
                {tiebreakerCorrect.length === 0
                  ? "Nobody got it — continue"
                  : `Award +${tiebreakerPoints} to ${tiebreakerCorrect.length} team${tiebreakerCorrect.length === 1 ? "" : "s"}`}
              </Button>
            </>
          ) : resolved ? (
            <>
              <div className="rounded-2xl border-2 border-amber-400/60 bg-amber-400/10 px-4 py-5 text-center">
                <p className="text-3xl">🏆</p>
                <p className="mt-1 text-2xl font-black text-amber-300">
                  {winner?.name} wins the tiebreaker!
                </p>
              </div>
              <Button
                className="mt-2 w-full"
                variant="primary"
                size="md"
                onClick={() => dispatch({ type: "FINISH_TIEBREAKER" })}
              >
                Finish → Back to Home
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-base font-semibold text-slate-300">
                {tiebreakerCorrect.length === 0
                  ? "Nobody got it — still tied."
                  : "More than one team got it — still tied."}{" "}
                <span className="text-rose-300">On to the next question</span>
              </p>
              <Button
                className="w-full"
                variant="primary"
                size="md"
                disabled={remaining === 0}
                onClick={() => dispatch({ type: "NEXT_TIEBREAKER_QUESTION" })}
              >
                {remaining === 0
                  ? "No tiebreaker questions left"
                  : "Next Question →"}
              </Button>
            </>
          )}

          {awarded && (
            <Button
              className="w-full"
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: "UNDO_QUESTION" })}
            >
              ↺ Undo
            </Button>
          )}

          <Button
            className="mt-2 w-full"
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "FINISH_TIEBREAKER" })}
          >
            ← Back to Home
          </Button>
        </div>
      </div>

      {confirmReveal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reveal-confirm-title"
        >
          <div className="w-full max-w-md rounded-3xl border border-white/15 bg-[#0f1729] p-8 text-center shadow-2xl">
            <h2 id="reveal-confirm-title" className="text-2xl font-black text-white">
              Reveal the answer?
            </h2>
            <p className="mt-3 text-lg text-slate-200">
              Are you sure you want to reveal the answer on the big screen for
              all teams and the audience to see?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="ghost"
                size="md"
                onClick={() => setConfirmReveal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  dispatch({ type: "REVEAL_ANSWER" });
                  setConfirmReveal(false);
                }}
              >
                Yes, Reveal It
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
