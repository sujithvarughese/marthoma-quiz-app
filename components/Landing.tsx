"use client";

import { useDispatch, useGame } from "@/lib/store";
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
    <div className="relative min-h-dvh overflow-x-hidden overflow-y-auto bg-[#0b1120]">
      {/* Ambient background glow accents */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[680px] -translate-x-1/2 rounded-full bg-gradient-to-b from-indigo-500/15 via-violet-600/10 to-transparent blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/2 h-[380px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-t from-indigo-600/10 via-purple-600/5 to-transparent blur-3xl" />

      <div className="relative mx-auto flex min-h-full max-w-2xl flex-col justify-center gap-7 px-5 py-10 sm:px-6 sm:py-14">
        {/* Header */}
        <header className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/25 bg-indigo-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-indigo-300 shadow-sm backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
            <span>{session?.subtitle ?? "Mar Thoma Church of South Florida"}</span>
          </div>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
            {session?.name ?? "The Mar Thoma Ever Rolling Trophy Quiz 2026"}
          </h1>

          <div className="mx-auto mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-slate-300">
            <span>Host control screen</span>
            <span className="text-slate-600">•</span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-0.5 font-mono text-xs text-indigo-300">
              <span>/display</span>
              <span className="text-slate-400">on projector</span>
            </span>
          </div>
        </header>

        {/* Team Setup Card */}
        <TeamSetup locked={started} />

        {/* Start Game / Game Actions */}
        <div className="flex flex-col items-stretch gap-3">
          {started ? (
            <>
              <button
                type="button"
                onClick={() => dispatch({ type: "GO_HOME" })}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 px-8 py-4 text-2xl font-black text-white shadow-xl shadow-emerald-600/30 transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-emerald-600/50 active:scale-[0.99]"
              >
                <span>▶ Resume Game</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (
                    confirm(
                      "Start a new game? This clears all scores and question progress. Team names are kept but can then be edited.",
                    )
                  )
                    dispatch({ type: "NEW_GAME" });
                }}
                className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 text-base font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white"
              >
                New Game
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={teams.length === 0}
              onClick={() => dispatch({ type: "START_GAME" })}
              className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 px-8 py-4.5 text-2xl font-black text-white shadow-xl shadow-indigo-600/30 transition-all hover:scale-[1.01] hover:shadow-2xl hover:shadow-indigo-600/50 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:shadow-none"
            >
              <span>Start Game</span>
              <span className="text-2xl transition-transform duration-200 group-hover:translate-x-1">➔</span>
            </button>
          )}

          {!started && teams.length === 0 && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-2.5 text-center text-sm font-semibold text-rose-300">
              <span>⚠️ Add at least one team to start the game.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
