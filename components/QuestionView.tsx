"use client";

import {
  activeTeam,
  currentRound,
  currentStealTeam,
  getQuestion,
  isAudienceSteal,
  useDispatch,
  useGame,
} from "@/lib/store";
import { Button } from "./ui";
import { CountdownTimer } from "./CountdownTimer";

/**
 * Standard-round question flow. The active (rotating) team answers for full
 * points; a miss can be opened to a steal for fewer points. The host reveals the
 * answer and advances — closing rotates the starting team.
 */
export function QuestionView() {
  const state = useGame();
  const dispatch = useDispatch();

  const q = getQuestion(state, state.activeQuestionId);
  const round = currentRound(state);
  const session = state.session;
  if (!q || !round || !session) return null;

  const team = activeTeam(state);
  const { revealed, stealing, timer, awarded } = state;
  const { correctPoints, stealPoints, allowSteals } = session.settings;
  const canSteal = session.teams.length > 1;
  const stealTeam = currentStealTeam(state);
  const audienceTurn = isAudienceSteal(state);

  return (
    <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1.6fr_1fr]">
      {/* Question */}
      <div className="panel flex flex-col p-8">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <span className="rounded-full bg-indigo-500 px-4 py-1.5 text-xl font-black text-white">
            {q.category}
          </span>
          {stealing && (
            <span className="rounded-full bg-amber-500 px-4 py-1.5 text-xl font-black text-slate-900">
              {audienceTurn
                ? "STEAL · audience's turn"
                : `STEAL · ${stealTeam?.name ?? ""} for +${stealPoints}`}
            </span>
          )}
        </div>

        <p className="text-4xl font-bold leading-snug sm:text-5xl">
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

      {/* Timer + controls */}
      <div className="flex flex-col gap-6">
        <div className="panel flex flex-col items-center gap-6 p-8">
          <CountdownTimer
            endsAt={timer.endsAt}
            durationSeconds={timer.durationSeconds}
            label={
              stealing
                ? audienceTurn
                  ? "Audience · no points"
                  : `${stealTeam?.name ?? "Steal"} · ${stealPoints} pts`
                : team
                  ? `${team.name}'s turn`
                  : "Answer"
            }
          />
        </div>

        <div className="panel flex flex-col gap-3 p-6">
          {!stealing ? (
            <>
              {team && (
                <Button
                  variant="success"
                  size="lg"
                  disabled={awarded}
                  onClick={() => dispatch({ type: "AWARD_CORRECT" })}
                >
                  ✓ {team.name} correct (+{correctPoints})
                </Button>
              )}
              {allowSteals && canSteal && (
                <Button
                  variant="amber"
                  size="md"
                  disabled={awarded}
                  onClick={() => dispatch({ type: "OPEN_STEAL" })}
                >
                  ✗ Missed — open to steal (+{stealPoints})
                </Button>
              )}
            </>
          ) : audienceTurn ? (
            <div>
              <p className="mb-3 text-center text-base font-semibold text-slate-300">
                Back around to {team?.name} — audience&apos;s turn.{" "}
                <span className="text-amber-300">No points awarded</span>
              </p>
              <Button
                variant="ghost"
                size="md"
                disabled={awarded}
                onClick={() => dispatch({ type: "STEAL_MISS" })}
              >
                → Reveal answer
              </Button>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-center text-base font-semibold text-slate-300">
                <span className="text-amber-300">{stealTeam?.name}</span>{" "}
                is stealing for +{stealPoints}
              </p>
              <Button
                variant="success"
                size="lg"
                disabled={awarded}
                onClick={() => dispatch({ type: "AWARD_STEAL" })}
              >
                ✓ {stealTeam?.name} correct (+{stealPoints})
              </Button>
              <Button
                className="mt-2 w-full"
                variant="amber"
                size="md"
                disabled={awarded}
                onClick={() => dispatch({ type: "STEAL_MISS" })}
              >
                ✗ Missed — open to steal (+{stealPoints})
              </Button>
            </div>
          )}

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
          <p className="mt-1 text-center text-sm text-slate-400">{round.name}</p>
        </div>
      </div>
    </div>
  );
}
