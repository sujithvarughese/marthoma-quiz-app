"use client";

import { useState } from "react";
import { currentRound, useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";
import { SyncIndicator } from "./SyncIndicator";

export function TopBar() {
  const state = useGame();
  const dispatch = useDispatch();
  const [menuOpen, setMenuOpen] = useState(false);

  const round = currentRound(state);
  let context = "";
  if ((state.view === "board" || state.view === "question" || state.view === "picture") && round)
    context = round.name;
  else if (state.view === "rapidfire") context = "Rapid Fire";
  else if (state.view === "scoreboard") context = "Scoreboard";
  else if (state.view === "winner") context = "Final Results";

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-white/10 bg-[#0b1120]/90 px-6 py-4 backdrop-blur sm:px-10">
      <div className="flex items-baseline gap-4">
        <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
          {state.session?.subtitle ?? "Mar Thoma Church of South Florida"}
        </h1>
        {context && (
          <span className="text-lg font-semibold text-indigo-300 sm:text-xl">
            {context}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <SyncIndicator />
        {state.view !== "home" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => dispatch({ type: "GO_HOME" })}
          >
            ⌂ Home
          </Button>
        )}

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
                    dispatch({ type: "SHOW_SCOREBOARD" });
                  }}
                >
                  Show scoreboard
                </button>
                <button
                  role="menuitem"
                  className="block w-full px-4 py-3 text-left text-lg font-semibold text-slate-200 hover:bg-white/10"
                  onClick={() => {
                    setMenuOpen(false);
                    dispatch({ type: "GO_SETUP" });
                  }}
                >
                  Teams / New game…
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
