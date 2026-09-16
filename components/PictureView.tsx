"use client";

/* eslint-disable @next/next/no-img-element */
// Plain <img> so any local path or remote URL from the data works without
// configuring next/image remote domains.

import { useState } from "react";
import {
  currentRound,
  getQuestion,
  useDispatch,
  useGame,
} from "@/lib/store";
import { Button } from "./ui";
import { CountdownTimer } from "./CountdownTimer";

/**
 * Picture-round flow. Everyone plays on whiteboards: show the image, run the
 * timer, reveal the answer, then tick every team that got it right and award
 * them all at once. No steals, no single active team.
 */
export function PictureView() {
  const state = useGame();
  const dispatch = useDispatch();
  const [confirmReveal, setConfirmReveal] = useState(false);

  const q = getQuestion(state, state.activeQuestionId);
  const round = currentRound(state);
  const session = state.session;
  if (!q || !round || !session) return null;

  const { revealed, pictureCorrect, timer, awarded } = state;
  const { picturePoints } = session.settings;
  const selected = new Set(pictureCorrect);
  // The clock starts paused — gives the host time to reveal the picture and
  // read the question aloud before the countdown (and whiteboards) begin.
  const pendingQuestionStart = timer.endsAt === null && !awarded && !revealed;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div className="panel flex flex-col p-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-fuchsia-500 px-4 py-1.5 text-xl font-black text-white">
            Everyone plays
          </span>
        </div>

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
              onClick={() => dispatch({ type: "START_QUESTION_TIMER" })}
            >
              ▶ Start Timer
            </Button>
          ) : (
            <>
              <p className="text-center text-base font-semibold text-slate-300">
                Tick each team that got it right{" "}
                <span className="text-emerald-300">+{picturePoints}</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {session.teams.map((t) => {
                  const on = selected.has(t.id);
                  return (
                    <Button
                      key={t.id}
                      variant={on ? "success" : "neutral"}
                      size="sm"
                      disabled={awarded}
                      onClick={() =>
                        dispatch({ type: "TOGGLE_PICTURE_TEAM", teamId: t.id })
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
                disabled={pictureCorrect.length === 0 || awarded}
                onClick={() => dispatch({ type: "AWARD_PICTURE" })}
              >
                Award +{picturePoints} to {pictureCorrect.length} team
                {pictureCorrect.length === 1 ? "" : "s"}
              </Button>
            </>
          )}

          <Button
            className="mt-2 w-full"
            variant="primary"
            size="md"
            onClick={() => dispatch({ type: "CLOSE_QUESTION" })}
          >
            Back to Board →
          </Button>
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
