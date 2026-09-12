"use client";

import { getQuestion, useDispatch, useGame } from "@/lib/store";
import { rapidFireQuestions } from "@/lib/content";
import { Button } from "./ui";
import { CountdownTimer } from "./CountdownTimer";

export function RapidFire() {
  const state = useGame();
  const dispatch = useDispatch();
  const { content, session, rapid, timer } = state;
  if (!content || !session) return null;

  const rapidPoints = session.settings.rapidFirePoints;
  const used = new Set(session.usedQuestionIds);
  const poolRemaining = rapidFireQuestions(content).filter(
    (q) => !used.has(q.id),
  ).length;

  /* ---- Lobby: pick a team ---- */
  if (!rapid) {
    return (
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-5xl font-black tracking-tight text-yellow-300">
          ⚡ Rapid Fire
        </h2>
        <p className="mt-3 text-xl text-slate-300">
          Each team gets {session.settings.rapidFireQuestionCount} questions in
          one {session.settings.rapidFireSeconds}-second countdown · +
          {rapidPoints} each.
        </p>
        <p className="mt-1 text-lg text-slate-400">
          {poolRemaining} question{poolRemaining === 1 ? "" : "s"} left in pool
        </p>

        <h3 className="mt-10 mb-4 text-2xl font-bold">Which team is up?</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {session.teams.map((team) => (
            <Button
              key={team.id}
              size="lg"
              variant="amber"
              disabled={poolRemaining === 0}
              onClick={() =>
                dispatch({ type: "START_RAPIDFIRE", teamId: team.id })
              }
            >
              {team.name}
            </Button>
          ))}
        </div>
        <div className="mt-8">
          <Button size="md" variant="ghost" onClick={() => dispatch({ type: "GO_HOME" })}>
            ← Home
          </Button>
        </div>
        {poolRemaining === 0 && (
          <p className="mt-6 text-lg text-rose-300">
            The rapid-fire pool is empty.
          </p>
        )}
      </div>
    );
  }

  const team = session.teams.find((t) => t.id === rapid.teamId);
  const teamName = team?.name ?? "Team";

  /* ---- Finished: summary ---- */
  if (rapid.finished) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-slate-300">{teamName}</h2>
        <p className="mt-6 text-2xl">Rapid fire complete</p>
        <p className="mt-4 font-mono text-8xl font-black text-emerald-400">
          +{rapid.correct * rapidPoints}
        </p>
        <p className="mt-2 text-2xl text-slate-300">
          {rapid.correct} of {rapid.questionIds.length} correct
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

  /* ---- In play ---- */
  const current = getQuestion(state, rapid.questionIds[rapid.index] ?? null);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-yellow-300">⚡ {teamName}</h2>
        <div className="flex items-center gap-6 text-xl font-bold">
          <span className="text-slate-300">
            Q {rapid.index + 1} / {rapid.questionIds.length}
          </span>
          <span className="text-emerald-400">
            {rapid.correct} correct · +{rapid.correct * rapidPoints}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="panel flex min-h-[40vh] flex-col justify-center p-8">
          <p className="text-4xl font-bold leading-snug sm:text-5xl">
            {current?.question}
          </p>

          <div className="mt-6 rounded-2xl border-2 border-emerald-500/50 bg-emerald-500/10 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Correct Answer
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-200 sm:text-3xl">
              {current?.answer}
            </p>
            {current?.funFact && (
              <div className="mt-3 border-t border-emerald-500/30 pt-3">
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-400">
                  Fun fact — say it aloud
                </p>
                <p className="mt-1 text-base text-emerald-100">{current.funFact}</p>
              </div>
            )}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <Button
              size="lg"
              variant="success"
              onClick={() => dispatch({ type: "RAPID_NEXT", correct: true })}
            >
              ✓ Correct (+{rapidPoints})
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => dispatch({ type: "RAPID_NEXT", correct: false })}
            >
              ✗ Skip
            </Button>
          </div>
        </div>

        <div className="panel flex flex-col items-center justify-between gap-6 p-8">
          <CountdownTimer
            endsAt={timer.endsAt}
            durationSeconds={timer.durationSeconds}
            label="Rapid fire"
          />
          <Button
            size="md"
            variant="danger"
            onClick={() => dispatch({ type: "RAPID_FINISH" })}
          >
            End round
          </Button>
        </div>
      </div>
    </div>
  );
}
