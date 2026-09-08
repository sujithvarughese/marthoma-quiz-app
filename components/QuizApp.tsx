"use client";

import { useGame } from "@/lib/store";
import { TopBar } from "./TopBar";
import { HomeScreen } from "./HomeScreen";
import { RoundBoard } from "./RoundBoard";
import { QuestionView } from "./QuestionView";
import { RapidFire } from "./RapidFire";
import { Tiebreaker } from "./Tiebreaker";
import { Scoreboard } from "./Scoreboard";

/**
 * Top-level shell. The whole event runs on this one screen — we switch the
 * main area based on `view` in the store rather than routing between URLs.
 */
export function QuizApp() {
  const { view, showScoreboard } = useGame();

  return (
    <div className="flex min-h-full flex-col">
      <TopBar />

      <main className="flex-1 px-6 py-6 sm:px-10 sm:py-8">
        {view === "home" && <HomeScreen />}
        {view === "board" && <RoundBoard />}
        {view === "question" && <QuestionView />}
        {view === "rapidfire" && <RapidFire />}
        {view === "tiebreaker" && <Tiebreaker />}
      </main>

      {showScoreboard && <Scoreboard />}
    </div>
  );
}
