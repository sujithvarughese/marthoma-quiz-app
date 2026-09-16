"use client";

import { useGame } from "@/lib/store";
import { AdminGate } from "./AdminGate";
import { TopBar } from "./TopBar";
import { Landing } from "./Landing";
import { HomeScreen } from "./HomeScreen";
import { RoundBoard } from "./RoundBoard";
import { QuestionView } from "./QuestionView";
import { PictureView } from "./PictureView";
import { RapidFire } from "./RapidFire";
import { ResultsScreen } from "./ResultsScreen";
import { Scoreboard } from "./Scoreboard";

/**
 * Host control shell. The whole event runs on this one screen — we switch the
 * main area based on the host `view` rather than routing between URLs. The setup
 * screen is full-screen (no top bar); everything else shares the top bar and the
 * permanent scoreboard bar across the bottom.
 */
export function QuizApp() {
  return (
    <AdminGate>
      <HostShell />
    </AdminGate>
  );
}

/**
 * `readOnly` renders the exact same screens with every control inert — used
 * by the /speaker view, which mirrors the host screen for an emcee without
 * letting them touch anything. See the `.host-readonly` rule in globals.css:
 * it disables (and dims) every button/input/select/textarea inside, without
 * touching pointer-events on any scroll container, so scrolling still works.
 */
export function HostShell({ readOnly = false }: { readOnly?: boolean }) {
  const { view, loaded } = useGame();

  if (!loaded) {
    return (
      <div className="flex h-dvh items-center justify-center text-2xl font-semibold text-slate-400">
        Loading game…
      </div>
    );
  }

  if (view === "setup") {
    return (
      <div className={readOnly ? "host-readonly" : undefined}>
        <Landing />
      </div>
    );
  }

  return (
    <div className={`flex h-dvh flex-col ${readOnly ? "host-readonly" : ""}`}>
      <TopBar />

      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-10 sm:py-8">
        {view === "home" && <HomeScreen />}
        {view === "board" && <RoundBoard />}
        {view === "question" && <QuestionView />}
        {view === "picture" && <PictureView />}
        {view === "rapidfire" && <RapidFire />}
        {view === "scoreboard" && <ResultsScreen />}
        {view === "winner" && <ResultsScreen winner />}
      </main>

      <Scoreboard />
    </div>
  );
}
