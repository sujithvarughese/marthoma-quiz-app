/**
 * CONTENT MODEL — pure, immutable question data stored in Firestore.
 *
 * Content lives at:
 *   games/{gameId}/rounds/{roundId}       → RoundDoc metadata
 *   games/{gameId}/questions/{questionId} → QuestionDoc
 *
 * Content never carries per-event state (no `used`, no scores, no `answeredBy`).
 * That dynamic state lives in the session layer (lib/session.ts) so the same
 * question bank can be replayed for future events without a reset.
 *
 * Both the host and the display read content; only the seed script writes it.
 */

/** Round / question kind. Drives host flow and display rendering. */
export type RoundType = "standard" | "picture" | "rapid_fire";

export interface QuestionDoc {
  id: string;
  /** Owning round for board questions; null for the rapid-fire pool. */
  roundId: string | null;
  /** Human-readable topic label the host can announce. */
  category: string;
  type: RoundType;
  /** Position within the round (1-based); used to lay out the board grid. */
  order: number;
  question: string;
  answer: string;
  /** Picture round only; otherwise null. Path in /public or a full URL. */
  imageUrl: string | null;
  /** Optional bit of trivia the host can share with the audience. */
  funFact: string;
}

export interface RoundDoc {
  id: string;
  name: string;
  description?: string;
  /** Round number shown to the host / audience (1-6). */
  order: number;
  type: RoundType;
  /** Ordered ids of the questions that make up this round's board. */
  questionIds: string[];
}

/** Everything the client needs after loading the content collections once. */
export interface GameContent {
  rounds: RoundDoc[];
  /** All questions, keyed by id, for O(1) pointer resolution. */
  questions: Record<string, QuestionDoc>;
}

/** Convenience: the rapid-fire pool (questions with no round), any order. */
export function rapidFireQuestions(content: GameContent): QuestionDoc[] {
  return Object.values(content.questions).filter(
    (q) => q.type === "rapid_fire",
  );
}

/** Convenience: a round's questions in board order, resolved from ids. */
export function roundQuestions(
  content: GameContent,
  round: RoundDoc,
): QuestionDoc[] {
  return round.questionIds
    .map((id) => content.questions[id])
    .filter((q): q is QuestionDoc => Boolean(q));
}
