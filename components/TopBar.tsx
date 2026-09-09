"use client";

import { useState } from "react";
import { useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";
import { SyncIndicator } from "./SyncIndicator";

export function TopBar() {
  const { view, rounds, activeRoundId } = useGame();
  const dispatch = useDispatch();
  const [menuOpen, setMenuOpen] = useState(false);

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
          Mar Thoma Church of South Florida Wisdom Across Generations: Where everyone of all ages comes together for a challenge of knowledge, wisdom, and wit.
        </h1>
        {context && (
          <span className="text-lg font-semibold text-indigo-300 sm:text-xl">
            {context}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SyncIndicator />
        {view !== "home" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "GO_HOME" })}
          >
            ⌂ Home
          </Button>
        )}

        {/* Destructive controls tucked behind a gear menu to avoid misclicks */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            aria-label="Game settings"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            ⚙
          </Button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setMenuOpen(false)}
              />
              <div
                role="menu"
                className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-white/15 bg-[#0b1120] shadow-2xl"
              >
                <button
                  role="menuitem"
                  className="block w-full px-4 py-3 text-left text-lg font-semibold text-slate-200 hover:bg-white/10"
                  onClick={() => {
                    setMenuOpen(false);
                    if (confirm("Reset all scores to 0?"))
                      dispatch({ type: "RESET_SCORES" });
                  }}
                >
                  Reset scores
                </button>
                <button
                  role="menuitem"
                  className="block w-full px-4 py-3 text-left text-lg font-semibold text-slate-200 hover:bg-white/10"
                  onClick={() => {
                    setMenuOpen(false);
                    if (confirm("Mark every question as unused again?"))
                      dispatch({ type: "RESET_QUESTIONS" });
                  }}
                >
                  Reset questions
                </button>
                <div className="border-t border-white/10" />
                <button
                  role="menuitem"
                  className="block w-full px-4 py-3 text-left text-lg font-semibold text-rose-300 hover:bg-rose-500/20"
                  onClick={() => {
                    setMenuOpen(false);
                    dispatch({ type: "GO_LANDING" });
                  }}
                >
                  New game…
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
