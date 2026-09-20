"use client";

import { getQuestion, useDispatch, useGame } from "@/lib/store";
import { rapidFireQuestions } from "@/lib/content";
import { Button } from "./ui";
import { CountdownTimer } from "./CountdownTimer";
import { RapidFireBoard } from "./RapidFireBoard";

export function RapidFire() {
  const state = useGame();
  const dispatch = useDispatch();
  const { content, session, rapid, timer } = state;
  if (!content || !session) return null;

  const { rapidReview, rapidCompleted, rapidQueue } = session;
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
                    <p className="text-xl font-bold leading-snug text-white sm:text-2xl">
                      <span className="text-slate-400">Q{i + 1} · </span>
                      {q?.question}
                    </p>
                    <p className="mt-2 text-xl font-bold text-white">
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
                      🎬 Reveal as Correct
                    </Button>
                    <Button
                      className="flex-1"
                      variant="danger"
                      size="md"
                      onClick={() =>
                        dispatch({ type: "RAPID_REVIEW_GRADE", correct: false })
                      }
                    >
                      🎬 Reveal as Wrong
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

  /* ---- No team currently mid-turn: either pick a group for the team up
   * next, or every team has gone and it's time to review. ---- */
  if (!rapid) {
    const remaining = rapidQueue?.length ?? 0;
    const allDone = remaining === 0;

    if (!allDone) {
      return <RapidFireBoard />;
    }

    return (
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-5xl font-black tracking-tight text-yellow-300">
          ⚡ Rapid Fire
        </h2>
        <p className="mt-3 text-xl text-slate-300">
          Each group is {session.settings.rapidFireQuestionCount} questions in
          one {session.settings.rapidFireSeconds}-second countdown · +
          {rapidPoints} each, graded afterward.
        </p>
        <p className="mt-8 text-2xl font-bold text-slate-200">
          Every team has had their turn.
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
  const answeredCount = rapid.questionIds.filter(
    (id) => rapid.questionStatus[id] === "answered",
  ).length;

  /* ---- Team finished their turn ---- */
  if (rapid.finished) {
    // Whether anyone else is still owed a turn — if not, skip straight to
    // review instead of a "Next team" button that has no one left to hand off to.
    const isLastTeam = (rapidQueue?.length ?? 0) <= 1;

    if (isLastTeam) {
      return (
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-5xl font-black tracking-tight text-yellow-300">
            ⚡ Rapid Fire Complete!
          </h2>
          <p className="mt-6 text-2xl font-bold text-slate-200">
            All teams have completed the Rapid Fire round.
          </p>
          <p className="mt-2 text-lg text-slate-400">
            Time to review everyone&apos;s answers and award points.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Button
              size="lg"
              variant="amber"
              onClick={() => dispatch({ type: "RAPID_REVIEW_START" })}
            >
              Review Responses →
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

  /* ---- Get ready: intro screen before the timer starts ---- */
  if (!rapid.started) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-2xl font-bold uppercase tracking-widest text-slate-400">
          Up next
        </p>
        <h2 className="mt-2 text-6xl font-black tracking-tight text-yellow-300">
          ⚡ {teamName}
        </h2>
        <p className="mt-8 text-3xl font-bold text-slate-200">Get ready?</p>
        <p className="mt-3 text-xl text-slate-400">
          {rapid.questionIds.length} questions ·{" "}
          {session.settings.rapidFireSeconds} seconds on the clock
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button
            size="lg"
            variant="success"
            onClick={() => dispatch({ type: "RAPID_BEGIN_TURN" })}
          >
            ▶ Start
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

  /* ---- In play: all 5 of this team's questions are visible and editable
   * at once (the host can jump ahead or back to fix any of them) — the
   * currentIndex one is just highlighted so whoever's reading questions
   * aloud (host or speaker) always knows which one is live right now. The
   * display mirrors currentIndex, so nothing there needs to change.
   *
   * Marking the current question answered or skipped (RAPID_MARK_QUESTION)
   * auto-advances currentIndex to the next one that isn't answered yet —
   * skipped questions are only revisited once every other question has had
   * a turn, so they cycle back around in dealt order rather than being
   * re-asked immediately. See nextPendingIndex in lib/store.tsx. */
  const currentQid = rapid.questionIds[rapid.currentIndex];
  const allAnswered = rapid.questionIds.every(
    (id) => rapid.questionStatus[id] === "answered",
  );

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-yellow-300">⚡ {teamName}</h2>
        <span className="text-xl font-bold text-slate-300">
          {answeredCount} / {rapid.questionIds.length} answered
        </span>
      </div>

      <div className="panel mb-6 flex flex-col items-center gap-4 p-6">
        <CountdownTimer
          endsAt={timer.endsAt}
          durationSeconds={timer.durationSeconds}
          label="Rapid fire"
          size="md"
        />
        {allAnswered ? (
          <p className="text-xl font-black text-emerald-300">
            🎉 All questions answered!
          </p>
        ) : (
          <div className="flex gap-3">
            <Button
              variant="success"
              size="md"
              onClick={() =>
                dispatch({
                  type: "RAPID_MARK_QUESTION",
                  questionId: currentQid,
                  status: "answered",
                })
              }
            >
              ✓ Answered → Next
            </Button>
            <Button
              variant="ghost"
              size="md"
              onClick={() =>
                dispatch({
                  type: "RAPID_MARK_QUESTION",
                  questionId: currentQid,
                  status: "skipped",
                })
              }
            >
              ⏭ Skip → Next
            </Button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3">
        {rapid.questionIds.map((qid, i) => {
          const q = getQuestion(state, qid);
          const isCurrent = i === rapid.currentIndex;
          const answerText = rapid.answers[qid] ?? "";
          const status = rapid.questionStatus[qid];

          return (
            <div
              key={qid}
              onClick={() =>
                dispatch({ type: "RAPID_SET_CURRENT_QUESTION", index: i })
              }
              className={`rapid-question-row panel flex cursor-pointer flex-col gap-3 p-5 transition-all ${
                isCurrent
                  ? "border-2 border-amber-400 bg-amber-400/10 shadow-[0_0_30px_rgba(251,191,36,0.25)]"
                  : "border border-white/10 opacity-70"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {isCurrent && (
                      <span className="animate-pulse rounded-full bg-amber-400 px-2.5 py-0.5 text-xs font-black uppercase tracking-wide text-slate-900">
                        ▶ Now
                      </span>
                    )}
                    <span className="text-sm font-bold uppercase tracking-wide text-slate-400">
                      Q{i + 1}
                    </span>
                  </div>
                  <p
                    className={`mt-1 font-bold leading-snug text-white ${
                      isCurrent ? "text-2xl sm:text-3xl" : "text-lg"
                    }`}
                  >
                    {q?.question}
                  </p>
                </div>

                <div
                  className="flex flex-shrink-0 items-center gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {status === "answered" && (
                    <span className="rounded-full bg-emerald-500/20 px-4 py-1.5 text-sm font-black text-emerald-300">
                      ✓ Answered
                    </span>
                  )}
                  {status === "skipped" && (
                    <span className="rounded-full bg-amber-500/20 px-4 py-1.5 text-sm font-black text-amber-300">
                      ⏭ Skipped
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Mark question ${i + 1} answered`}
                    onClick={() =>
                      dispatch({
                        type: "RAPID_MARK_QUESTION",
                        questionId: qid,
                        status: "answered",
                      })
                    }
                  >
                    ✓
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Mark question ${i + 1} skipped`}
                    onClick={() =>
                      dispatch({
                        type: "RAPID_MARK_QUESTION",
                        questionId: qid,
                        status: "skipped",
                      })
                    }
                  >
                    ⏭
                  </Button>
                </div>
              </div>

              {/* Host-only editable transcript box — hidden on the
                  read-only /speaker mirror (see .rapid-answer-box in
                  globals.css), which just shows the question clearly
                  instead of a control it can't use. Typing here never
                  touches currentIndex: the host can record any team's
                  answer to any of the 5 questions independent of whichever
                  one is currently live on the projector. */}
              <div
                className="rapid-answer-box"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  type="text"
                  aria-label={`Team's answer for question ${i + 1}`}
                  value={answerText}
                  onChange={(e) =>
                    dispatch({
                      type: "RAPID_RECORD_ANSWER",
                      questionId: qid,
                      text: e.target.value,
                    })
                  }
                  placeholder="Type the team's answer…"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-lg font-semibold text-white placeholder:text-slate-500 focus:border-emerald-400/60 focus:outline-none"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 flex justify-center">
        <Button
          size="md"
          variant="danger"
          onClick={() => dispatch({ type: "RAPID_FINISH" })}
        >
          End round
        </Button>
      </div>
    </div>
  );
}
