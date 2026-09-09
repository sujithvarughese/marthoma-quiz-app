"use client";

import { useGame } from "@/lib/store";
import { TopBar } from "./TopBar";
import { Landing } from "./Landing";
import { HomeScreen } from "./HomeScreen";
import { RoundBoard } from "./RoundBoard";
import { QuestionView } from "./QuestionView";
import { RapidFire } from "./RapidFire";
import { Tiebreaker } from "./Tiebreaker";
import { Scoreboard } from "./Scoreboard";

/**
 * Top-level shell. The whole event runs on this one screen — we switch the
 * main area based on `view` in the store rather than routing between URLs.
 *
 * The landing/intro screen is a distinct full-screen view (no top bar or
 * scoreboard); everything else shares the top bar and the permanent scoreboard
 * bar across the bottom.
 */
export function QuizApp() {
  const { view } = useGame();

  if (view === "landing") return <Landing />;

  return (
    <div className="flex h-dvh flex-col">
      <TopBar />

      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-6 sm:px-10 sm:py-8">
        {view === "home" && <HomeScreen />}
        {view === "board" && <RoundBoard />}
        {view === "question" && <QuestionView />}
        {view === "rapidfire" && <RapidFire />}
        {view === "tiebreaker" && <Tiebreaker />}
      </main>

      <Scoreboard />
    </div>
  );
}
