"use client";

import { useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";
import { TeamSetup } from "./TeamSetup";

/**
 * Pre-game setup screen (host view "setup"). Teams are edited here before the
 * game starts. Once a game is running the roster is locked and a "Resume" option
 * appears alongside "New game".
 */
export function Landing() {
  const { session } = useGame();
  const dispatch = useDispatch();

  const started = session?.status !== "not_started";
  const teams = session?.teams ?? [];

  return (
    <div className="h-dvh overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-8 px-6 py-12">
        <header className="text-center">
          <p className="text-lg font-semibold uppercase tracking-widest text-indigo-300 sm:text-xl">
            {session?.subtitle ?? "Mar Thoma Church of South Florida"}
          </p>
          <h1 className="mt-2 text-5xl font-black tracking-tight text-white sm:text-6xl">
            {session?.name ?? "Wisdom Across Generations"}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            Host control screen. Open <span className="font-mono">/display</span>{" "}
            on the projector computer.
          </p>
        </header>

        <TeamSetup locked={started} />

        <div className="flex flex-col items-stretch gap-3">
          {started ? (
            <>
              <Button
                variant="success"
                size="xl"
                onClick={() => dispatch({ type: "GO_HOME" })}
              >
                ▶ Resume Game
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  if (
                    confirm(
                      "Start a new game? This clears all scores and question progress. Team names are kept but can then be edited.",
                    )
                  )
                    dispatch({ type: "NEW_GAME" });
                }}
              >
                New Game
              </Button>
            </>
          ) : (
            <Button
              variant="primary"
              size="xl"
              disabled={teams.length === 0}
              onClick={() => dispatch({ type: "START_GAME" })}
            >
              Start Game →
            </Button>
          )}
          {!started && teams.length === 0 && (
            <p className="text-center text-base font-semibold text-rose-300">
              Add at least one team to start.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
