"use client";

import { useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";

export function TopBar() {
  const { view, rounds, activeRoundId, showScoreboard } = useGame();
  const dispatch = useDispatch();

  const activeRound = rounds.find((r) => r.id === activeRoundId);

  let context = "";
  if (view === "board" && activeRound) context = activeRound.name;
  else if (view === "question" && activeRound) context = activeRound.name;
  else if (view === "rapidfire") context = "Rapid Fire";
  else if (view === "tiebreaker") context = "Sudden-Death Tiebreaker";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-white/10 bg-[#0b1120]/90 px-6 py-4 backdrop-blur sm:px-10">
      <div className="flex items-baseline gap-4">
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          Quiz&nbsp;Night
        </h1>
        {context && (
          <span className="text-lg font-semibold text-indigo-300 sm:text-xl">
            {context}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {view !== "home" && (
          <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "GO_HOME" })}>
            ⌂ Home
          </Button>
        )}
        <Button
          variant={showScoreboard ? "primary" : "ghost"}
          size="sm"
          onClick={() => dispatch({ type: "TOGGLE_SCOREBOARD" })}
        >
          {showScoreboard ? "Hide Scores" : "Scoreboard"}
        </Button>
      </div>
    </header>
  );
}
