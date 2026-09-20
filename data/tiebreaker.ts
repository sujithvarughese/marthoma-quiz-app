import type { Question } from "@/lib/types";

/**
 * SUDDEN-DEATH TIEBREAKER POOL — used only if teams are tied for 1st place
 * once Rapid Fire is complete.
 *
 * All tied teams get the same question at the same time and have 60 seconds
 * to write their answer on a whiteboard; everyone reveals at once and the
 * host grades each board. The host works through this pool one question at a
 * time until exactly one tied team is correct and the rest are wrong. Keep a
 * healthy number here in case several rounds are needed.
 *
 * Some questions may be picture questions — add an `imageUrl` (a path in
 * /public or a full URL) the same way the Picture Round does.
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
