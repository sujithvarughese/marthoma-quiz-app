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

/** One selectable card on the rapid-fire group board (e.g. "Group A"). */
export interface RapidFireGroup {
  /** The group's category label as stored on its questions (e.g. "Group A"). */
  key: string;
  /** Short label for the board card, e.g. "A". */
  label: string;
  /** This group's question ids, in the order authored in /data/rapidFire.ts. */
  questionIds: string[];
}

/**
 * Convenience: the rapid-fire pool split back into the groups it was seeded
 * from (grouped by `category`, ordered by each group's first question).
 */
export function rapidFireGroups(content: GameContent): RapidFireGroup[] {
  const groups = new Map<string, { order: number; items: QuestionDoc[] }>();
  for (const q of rapidFireQuestions(content)) {
    const g = groups.get(q.category) ?? { order: q.order, items: [] };
    g.items.push(q);
    g.order = Math.min(g.order, q.order);
    groups.set(q.category, g);
  }
  return [...groups.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([category, g]) => ({
      key: category,
      label: category.replace(/^Group\s+/i, "") || category,
      questionIds: g.items
        .sort((a, b) => a.order - b.order)
        .map((q) => q.id),
    }));
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
