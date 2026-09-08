"use client";

import {
  AWARD_RAPID,
  RAPID_FIRE_COUNT,
  TIME_RAPID,
  useDispatch,
  useGame,
} from "@/lib/store";
import { Button } from "./ui";
import { Timer } from "./Timer";

export function RapidFire() {
  const { teams, rapidFire, rapidFirePool } = useGame();
  const dispatch = useDispatch();

  const poolRemaining = rapidFirePool.filter((q) => !q.used).length;

  /* ---- Lobby: pick a team ---- */
  if (!rapidFire) {
    return (
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-5xl font-black tracking-tight text-yellow-300">
          ⚡ Rapid Fire
        </h2>
        <p className="mt-3 text-xl text-slate-300">
          Each team gets {RAPID_FIRE_COUNT} questions in one {TIME_RAPID}-second
          countdown · +{AWARD_RAPID} each · no passing.
        </p>
        <p className="mt-1 text-lg text-slate-400">
          {poolRemaining} question{poolRemaining === 1 ? "" : "s"} left in pool
        </p>

        <h3 className="mt-10 mb-4 text-2xl font-bold">Which team is up?</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((team) => (
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
        {poolRemaining === 0 && (
          <p className="mt-6 text-lg text-rose-300">
            The rapid-fire pool is empty. Reset questions from the Home screen to
            play again.
          </p>
        )}
      </div>
    );
  }

  const team = teams.find((t) => t.id === rapidFire.teamId);
  const teamName = team?.name ?? "Team";

  /* ---- Finished: summary ---- */
  if (rapidFire.finished) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl font-bold text-slate-300">{teamName}</h2>
        <p className="mt-6 text-2xl">Rapid fire complete</p>
        <p className="mt-4 font-mono text-8xl font-black text-emerald-400">
          +{rapidFire.correct * AWARD_RAPID}
        </p>
        <p className="mt-2 text-2xl text-slate-300">
          {rapidFire.correct} of {rapidFire.questions.length} correct
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Button
            size="lg"
            variant="amber"
            onClick={() => dispatch({ type: "ENTER_RAPIDFIRE" })}
          >
            Next team
          </Button>
          <Button size="lg" variant="ghost" onClick={() => dispatch({ type: "GO_HOME" })}>
            Home
          </Button>
        </div>
      </div>
    );
  }

  /* ---- In play ---- */
  const current = rapidFire.questions[rapidFire.index];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-3xl font-black text-yellow-300">
          ⚡ {teamName}
        </h2>
        <div className="flex items-center gap-6 text-xl font-bold">
          <span className="text-slate-300">
            Q {rapidFire.index + 1} / {rapidFire.questions.length}
          </span>
          <span className="text-emerald-400">
            {rapidFire.correct} correct · +{rapidFire.correct * AWARD_RAPID}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="panel flex min-h-[40vh] flex-col justify-center p-8">
          <p className="text-4xl font-bold leading-snug sm:text-5xl">
            {current.question}
          </p>

          {rapidFire.revealed ? (
            <p className="mt-6 text-3xl font-black text-emerald-300">
              {current.answer}
            </p>
          ) : (
            <div className="mt-6">
              <Button size="md" variant="ghost" onClick={() => dispatch({ type: "RAPIDFIRE_REVEAL" })}>
                Peek answer
              </Button>
            </div>
          )}

          <div className="mt-8 grid grid-cols-2 gap-4">
            <Button
              size="lg"
              variant="success"
              onClick={() => dispatch({ type: "RAPIDFIRE_NEXT", correct: true })}
            >
              ✓ Correct (+{AWARD_RAPID})
            </Button>
            <Button
              size="lg"
              variant="ghost"
              onClick={() => dispatch({ type: "RAPIDFIRE_NEXT", correct: false })}
            >
              ✗ Skip
            </Button>
          </div>
        </div>

        <div className="panel flex flex-col items-center justify-between gap-6 p-8">
          {/* One continuous countdown for all questions. Mounted once so it
              does not reset between questions. */}
          <Timer
            duration={TIME_RAPID}
            autoStart
            label="Rapid fire"
            onExpire={() => dispatch({ type: "RAPIDFIRE_FINISH" })}
          />
          <Button
            size="md"
            variant="danger"
            onClick={() => dispatch({ type: "RAPIDFIRE_FINISH" })}
          >
            End round
          </Button>
        </div>
      </div>
    </div>
  );
}
