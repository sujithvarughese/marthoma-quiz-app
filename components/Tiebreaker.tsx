"use client";

import { useState } from "react";
import { AWARD_TIEBREAK, useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";

/**
 * Sudden-death loop. No timer — the host shows a question, and taps the team
 * that answered first to give them the point. Repeat until the tie is broken.
 */
export function Tiebreaker() {
  const { teams, tiebreaker } = useGame();
  const dispatch = useDispatch();
  const [awarded, setAwarded] = useState<string | null>(null);

  if (!tiebreaker) return null;
  const { question, revealed } = tiebreaker;

  const next = () => {
    setAwarded(null);
    dispatch({ type: "TIEBREAKER_NEXT" });
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-4xl font-black tracking-tight text-rose-300">
          ⚔️ Sudden Death
        </h2>
        <p className="text-lg font-semibold text-slate-400">
          First to answer wins +{AWARD_TIEBREAK}
        </p>
      </div>

      {!question ? (
        <div className="panel flex flex-col items-center gap-6 px-6 py-20 text-center">
          <p className="text-3xl font-bold">Tiebreaker pool is empty.</p>
          <Button size="lg" onClick={() => dispatch({ type: "GO_HOME" })}>
            Home
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="panel flex min-h-[35vh] flex-col justify-center p-10 text-center">
            <p className="text-5xl font-black leading-tight sm:text-6xl">
              {question.question}
            </p>
            {revealed && (
              <p className="mt-8 text-4xl font-black text-emerald-300">
                {question.answer}
              </p>
            )}
          </div>

          {!revealed && (
            <div className="text-center">
              <Button size="lg" onClick={() => dispatch({ type: "TIEBREAKER_REVEAL" })}>
                Reveal answer
              </Button>
            </div>
          )}

          {/* Award the point to whoever answered first */}
          <div className="panel p-6">
            <p className="mb-4 text-center text-xl font-bold text-slate-300">
              Who answered first?
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => (
                <Button
                  key={team.id}
                  size="md"
                  variant={awarded === team.id ? "success" : "neutral"}
                  onClick={() => {
                    dispatch({
                      type: "AWARD",
                      teamId: team.id,
                      amount: AWARD_TIEBREAK,
                    });
                    setAwarded(team.id);
                  }}
                >
                  {team.name}
                  {awarded === team.id ? ` +${AWARD_TIEBREAK} ✓` : ""}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-4">
            <Button size="lg" variant="primary" onClick={next}>
              Next question →
            </Button>
            <Button size="lg" variant="ghost" onClick={() => dispatch({ type: "GO_HOME" })}>
              Home
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
