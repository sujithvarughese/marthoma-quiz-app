// Core data models for the quiz night app.
// Keep these stable — the data files in /data are typed against them.

export interface Question {
  /** Unique within its round (or within the rapid-fire pool). */
  id: string;
  /** Board tile value used to lay out the jeopardy grid (e.g. 10 / 20 / 30). */
  points: number;
  question: string;
  answer: string;
  /** Only used by the Picture Round. Path in /public or a full URL. */
  imageUrl?: string;
  /** Flipped to true once revealed during play so it isn't picked again. */
  used: boolean;
}

export interface Round {
  id: string;
  /** Round number shown on the home screen (1-6). */
  order: number;
  name: string;
  description?: string;
  /** Set true for the round whose questions carry images. */
  isPicture?: boolean;
  questions: Question[];
}

export interface Team {
  id: string;
  name: string;
  score: number;
}

/** How the currently-open question is being played. Drives timer + award. */
export type QuestionStatus = "direct" | "passed";

/** Top-level screen the host is looking at. */
export type ViewMode =
  | "home"
  | "board"
  | "question"
  | "rapidfire"
  | "tiebreaker";
