import type { Question } from "@/lib/types";

/**
 * SUDDEN-DEATH TIEBREAKER POOL — single questions with no timer.
 *
 * Used only if teams finish level. The host shows one question at a time and
 * awards the point to whichever team answers first (buzzer/hands). Keep a
 * healthy number here in case several rounds are needed.
 */

export const tiebreakerPool: Question[] = [
  { id: "tb-1", question: "Placeholder: tiebreaker question?", answer: "Placeholder", used: false },
  { id: "tb-2", question: "Placeholder: tiebreaker question?", answer: "Placeholder", used: false },
  { id: "tb-3", question: "Placeholder: tiebreaker question?", answer: "Placeholder", used: false },
  { id: "tb-4", question: "Placeholder: tiebreaker question?", answer: "Placeholder", used: false },
  { id: "tb-5", question: "Placeholder: tiebreaker question?", answer: "Placeholder", used: false },
  { id: "tb-6", question: "Placeholder: tiebreaker question?", answer: "Placeholder", used: false },
  { id: "tb-7", question: "Placeholder: tiebreaker question?", answer: "Placeholder", used: false },
  { id: "tb-8", question: "Placeholder: tiebreaker question?", answer: "Placeholder", used: false },
];
