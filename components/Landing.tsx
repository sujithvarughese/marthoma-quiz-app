"use client";

import { useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";
import { TeamSetup } from "./TeamSetup";

// Edit these to change the intro screen wording.
const EVENT_SUBTITLE = "Mar Thoma Church of South Florida";
const EVENT_TITLE = "Wisdom Across Generations";
const EVENT_TAGLINE =
  "Where everyone of all ages comes together for a challenge of knowledge, wisdom, and wit.";

/**
 * Intro screen shown on initial load and whenever the host chooses "New game"
 * during play. Teams are edited here before a game starts; once a game is
 * running the roster is locked and a "Resume" option appears.
 */
export function Landing() {
  const { teams, gameStarted } = useGame();
  const dispatch = useDispatch();

  return (
    <div className="h-dvh overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-8 px-6 py-12">
        {/* Event name */}
        <header className="text-center">
          <p className="text-lg font-semibold uppercase tracking-widest text-indigo-300 sm:text-xl">
            {EVENT_SUBTITLE}
          </p>
          <h1 className="mt-2 text-5xl font-black tracking-tight text-white sm:text-6xl">
            {EVENT_TITLE}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
            {EVENT_TAGLINE}
          </p>
        </header>

        {/* Teams */}
        <TeamSetup locked={gameStarted} />

        {/* Actions */}
        <div className="flex flex-col items-stretch gap-3">
          {gameStarted ? (
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
          {!gameStarted && teams.length === 0 && (
            <p className="text-center text-base font-semibold text-rose-300">
              Add at least one team to start.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
