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
      title: "How Today's Game Works",
      body: [
        "We'll play through seven rounds of trivia — six themed rounds plus a Rapid Fire finale — covering general knowledge, Bible, current affairs, and more.",
        "Team seating is assigned by lottery, so find your spot before we start.",
        "Answer correctly to score points, and keep an eye on the live scoreboard as the night goes on.",
      ],
      showRounds: true,
    },
    {
      icon: "📋",
      eyebrow: "Before We Begin",
      title: "Ground Rules",
      body: [
        "Each team should designate one spokesperson — only that team's final answer will be accepted, so talk it over before you answer.",
        "Electronic devices and reference materials are not allowed at the table.",
      ],
    },
    {
      icon: "🎯",
      eyebrow: "Standard Rounds",
      title: "Picking a Question",
      body: [
        "Teams take turns picking their own question from the options shown on the board.",
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
        "Look at the photo on the big screen and write your answer on the whiteboard provided.",
        `Every team that gets it right earns +${settings.picturePoints} points.`,
      ],
    },
    {
      icon: "⚡",
      eyebrow: "Special Round",
      title: "Rapid Fire",
      body: [
        `Each team gets ${settings.rapidFireQuestionCount} questions in one continuous ${settings.rapidFireSeconds}-second countdown.`,
        "You can pass on a question and come back to it later if time remains.",
        `+${settings.rapidFirePoints} points for every correct answer, graded by the host once every team has had a turn.`,
      ],
    },
    {
      icon: "🏆",
      eyebrow: "Scoring",
      title: "Let's Play!",
      body: [
        "Points add up across every round — the scoreboard is always just a tap away, and there's no penalty for a wrong answer.",
        "If the top teams are tied at the end, we'll settle it with sudden-death tiebreaker questions until a winner emerges.",
        "Good luck, and most of all — have fun! 🎉",
      ],
    },
  ];
}
