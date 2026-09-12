"use client";

/* eslint-disable @next/next/no-img-element */
// Plain <img> so any local path or remote URL from the data works without
// configuring next/image remote domains.

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

  const q = getQuestion(state, state.activeQuestionId);
  const round = currentRound(state);
  const session = state.session;
  if (!q || !round || !session) return null;

  const { revealed, pictureCorrect, timer, awarded } = state;
  const { picturePoints } = session.settings;
  const selected = new Set(pictureCorrect);

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
              onClick={() => dispatch({ type: "REVEAL_ANSWER" })}
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
              Next →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
