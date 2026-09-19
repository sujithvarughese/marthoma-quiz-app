/**
 * Shared copy for the how-to-play guide — used by both the host's RulesGuide
 * overlay (components/RulesGuide.tsx) and the projector's matching "rules"
 * screen (components/display/DisplayApp.tsx), so the audience always sees
 * the same page the host is narrating from. Point/timer values are pulled
 * live from the session's settings rather than hardcoded.
 */

import type { GameSettings } from "./session";

export interface RulesPage {
  icon: string;
  eyebrow: string;
  title: string;
  body: string[];
  /** Only the welcome page shows the round lineup strip. */
  showRounds?: boolean;
}

export function buildRulesPages(settings: GameSettings): RulesPage[] {
  return [
    {
      icon: "🎉",
      eyebrow: "Welcome",
      title: "How Tonight Works",
      body: [
        "We'll play through several rounds of trivia — general knowledge, Bible, current affairs, and more.",
        "Answer correctly to score points, and keep an eye on the live scoreboard as the night goes on.",
        "Here's a quick rundown of how each part works before we begin.",
      ],
      showRounds: true,
    },
    {
      icon: "🎯",
      eyebrow: "Standard Rounds",
      title: "Picking a Question",
      body: [
        "Teams take turns picking a numbered card from the board.",
        `The team on the clock has ${settings.normalAnswerSeconds} seconds to answer for +${settings.correctPoints} points.`,
        "Once every team has had one turn, any questions left on that board are opened up to the whole audience — just for fun, no points on the line.",
      ],
    },
    {
      icon: "🔁",
      eyebrow: "Missed It?",
      title: "Stealing the Points",
      body: [
        "If the team on the clock gets it wrong, the question opens up to a steal.",
        `Every other team gets a turn — ${settings.stealAnswerSeconds} seconds each — to steal it for +${settings.stealPoints} points.`,
        "If every team misses, it's opened to the whole audience — no points awarded either way.",
      ],
    },
    {
      icon: "🖼️",
      eyebrow: "Picture Round",
      title: "Everyone Plays at Once",
      body: [
        "No turns and no stealing here — every team plays every question together.",
        "Look at the photo on the big screen and write down your answer.",
        `Every team that gets it right earns +${settings.picturePoints} points.`,
      ],
    },
    {
      icon: "⚡",
      eyebrow: "Special Round",
      title: "Rapid Fire",
      body: [
        "Each team picks a lettered group of questions when it's their turn.",
        `One continuous ${settings.rapidFireSeconds}-second countdown — answer as many as you can before time runs out!`,
        `+${settings.rapidFirePoints} points for every correct answer, graded by the host once every team has had a turn.`,
      ],
    },
    {
      icon: "🏆",
      eyebrow: "Scoring",
      title: "Let's Play!",
      body: [
        "Points add up across every round — the scoreboard is always just a tap away.",
        "The team with the most points when we're done is crowned the Grand Champion.",
        "Good luck, and most of all — have fun! 🎉",
      ],
    },
  ];
}
