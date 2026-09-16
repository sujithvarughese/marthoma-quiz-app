"use client";

import { useState } from "react";
import { getQuestion, useDispatch, useGame } from "@/lib/store";
import { rapidFireQuestions } from "@/lib/content";
import { Button } from "./ui";
import { CountdownTimer } from "./CountdownTimer";

export function RapidFire() {
  const state = useGame();
  const dispatch = useDispatch();
  const { content, session, rapid, rapidReview, rapidCompleted, timer } = state;
  const [answerText, setAnswerText] = useState("");
  if (!content || !session) return null;

  const rapidPoints = session.settings.rapidFirePoints;
  const used = new Set(session.usedQuestionIds);
  const poolRemaining = rapidFireQuestions(content).filter(
    (q) => !used.has(q.id),
  ).length;

  /* ---- Review phase: every team has played, grade one at a time ---- */
  if (rapidReview) {
    const teamId = rapidReview.teamIds[rapidReview.currentIndex];
    const result = rapidCompleted.find((r) => r.teamId === teamId);

    if (!teamId || !result) {
      return (
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-5xl font-black tracking-tight text-yellow-300">
            ⚡ Review Complete!
          </h2>
          <p className="mt-4 text-xl text-slate-300">
            Every team&apos;s rapid-fire points have been awarded.
          </p>
          <div className="mt-10">
            <Button
              size="lg"
              variant="amber"
              onClick={() => dispatch({ type: "RAPID_REVIEW_DONE" })}
            >
              Done →
            </Button>
          </div>
        </div>
      );
    }

    const team = session.teams.find((t) => t.id === teamId);
    const correctSoFar = Object.values(rapidReview.graded).filter(
      Boolean,
    ).length;

    return (
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-black text-yellow-300">
            ⚡ Reviewing {team?.name ?? "Team"}
          </h2>
          <p className="mt-1 text-lg text-slate-400">
            Team {rapidReview.currentIndex + 1} of {rapidReview.teamIds.length}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {result.questionIds.map((qid, i) => {
            const q = getQuestion(state, qid);
            const status =
              i < rapidReview.questionIndex
                ? rapidReview.graded[qid]
                  ? "correct"
                  : "incorrect"
                : i === rapidReview.questionIndex && !rapidReview.awarded
                  ? "active"
                  : "pending";
            const answerGiven = result.answers[qid]?.trim();

            return (
              <div
                key={qid}
                className={`panel flex flex-col gap-2 p-5 transition-colors ${
                  status === "active" ? "border-2 border-amber-400/70" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                      Q{i + 1} · {q?.question}
                    </p>
                    <p className="mt-1 text-xl font-bold text-white">
                      {answerGiven || (
                        <span className="italic text-slate-500">
                          No answer given
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-emerald-300">
                      Correct answer: <span className="font-bold">{q?.answer}</span>
                    </p>
                  </div>

                  {status === "correct" && (
                    <span className="rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-black text-emerald-300">
                      ✓ Correct
                    </span>
                  )}
                  {status === "incorrect" && (
                    <span className="rounded-full bg-rose-500/20 px-4 py-1.5 text-sm font-black text-rose-300">
                      ✗ Incorrect
                    </span>
                  )}
                  {status === "pending" && (
                    <span className="rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-slate-400">
                      Pending
                    </span>
                  )}
                </div>

                {status === "active" && (
                  <div className="mt-2 flex gap-3">
                    <Button
                      className="flex-1"
                      variant="success"
                      size="md"
                      onClick={() =>
                        dispatch({ type: "RAPID_REVIEW_GRADE", correct: true })
                      }
                    >
                      ✓ Correct
                    </Button>
                    <Button
                      className="flex-1"
                      variant="danger"
                      size="md"
                      onClick={() =>
                        dispatch({ type: "RAPID_REVIEW_GRADE", correct: false })
                      }
                    >
                      ✗ Incorrect
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {rapidReview.awarded && (
          <div className="panel mt-6 flex flex-col items-center gap-3 p-6 text-center">
            <p className="text-2xl font-black text-emerald-300">
              {correctSoFar} of {result.questionIds.length} correct · +
              {correctSoFar * rapidPoints} points awarded
            </p>
            <Button
              size="lg"
              variant="amber"
              onClick={() => dispatch({ type: "RAPID_REVIEW_NEXT_TEAM" })}
            >
              Next team →
            </Button>
          </div>
        )}
      </div>
    );
  }

  /* ---- Nothing to play: every team has gone, or the pool ran dry ---- */
  if (!rapid) {
    const remaining = state.rapidQueue?.length ?? 0;
    const allDone = remaining === 0;
    return (
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-5xl font-black tracking-tight text-yellow-300">
          ⚡ Rapid Fire
        </h2>
        <p className="mt-3 text-xl text-slate-300">
          Each team gets {session.settings.rapidFireQuestionCount} questions in
          one {session.settings.rapidFireSeconds}-second countdown · +
          {rapidPoints} each, graded afterward.
        </p>
        <p className="mt-8 text-2xl font-bold text-slate-200">
          {allDone
            ? "Every team has had their turn."
            : "The rapid-fire pool is empty — no questions left to deal for the remaining teams."}
        </p>
        <p className="mt-1 text-lg text-slate-400">
          {poolRemaining} question{poolRemaining === 1 ? "" : "s"} left in pool
        </p>
        <div className="mt-8 flex justify-center gap-4">
          {rapidCompleted.length > 0 && (
            <Button
              size="lg"
              variant="amber"
              onClick={() => dispatch({ type: "RAPID_REVIEW_START" })}
            >
              Begin Review →
            </Button>
          )}
          <Button size="md" variant="ghost" onClick={() => dispatch({ type: "GO_HOME" })}>
            ← Home
          </Button>
        </div>
      </div>
    );
  }

  const team = session.teams.find((t) => t.id === rapid.teamId);
  const teamName = team?.name ?? "Team";
  const answeredCount = rapid.questionIds.length - rapid.queue.length;

  /* ---- Team finished their turn: hand off to the next team ---- */
  if (rapid.finished) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-slate-300">{teamName}</h2>
        <p className="mt-6 text-2xl">Answers recorded!</p>
        <p className="mt-4 text-xl text-slate-300">
          {answeredCount} of {rapid.questionIds.length} questions answered ·
          graded later during review
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button
            size="lg"
            variant="amber"
            onClick={() => dispatch({ type: "ENTER_RAPIDFIRE" })}
          >
            Next team
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={() => dispatch({ type: "EXIT_RAPIDFIRE" })}
          >
            Home
          </Button>
        </div>
      </div>
    );
  }

  /* ---- In play: host transcribes what the team said ---- */
  const currentQuestionId = rapid.queue[0] ?? null;
  const current = getQuestion(state, currentQuestionId);

  const submitAnswer = () => {
    dispatch({ type: "RAPID_RECORD_ANSWER", text: answerText.trim() });
    setAnswerText("");
  };

  const skipQuestion = () => {
    dispatch({ type: "RAPID_SKIP" });
    setAnswerText("");
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-yellow-300">⚡ {teamName}</h2>
        <div className="flex items-center gap-6 text-xl font-bold">
          <span className="text-slate-300">
            {answeredCount} / {rapid.questionIds.length} answered
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="panel flex min-h-[40vh] flex-col justify-center gap-6 p-8">
          <p className="text-4xl font-bold leading-snug sm:text-5xl">
            {current?.question}
          </p>

          <div>
            <label
              htmlFor="rapid-answer"
              className="text-xs font-bold uppercase tracking-widest text-slate-400"
            >
              What did they say?
            </label>
            <input
              id="rapid-answer"
              type="text"
              autoFocus
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitAnswer();
              }}
              placeholder="Type the team's answer…"
              className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-2xl font-semibold text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="panel flex flex-col items-center p-8">
            <CountdownTimer
              endsAt={timer.endsAt}
              durationSeconds={timer.durationSeconds}
              label="Rapid fire"
            />
          </div>

          <div className="panel flex flex-col gap-3 p-6">
            <Button
              className="w-full"
              size="lg"
              variant="success"
              onClick={submitAnswer}
            >
              ✓ Answered
            </Button>
            <Button
              className="w-full"
              size="md"
              variant="ghost"
              onClick={skipQuestion}
            >
              ↷ Skip — come back to it later
            </Button>
            <Button
              className="mt-2 w-full"
              size="md"
              variant="danger"
              onClick={() => dispatch({ type: "RAPID_FINISH" })}
            >
              End round
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
