/**
 * LIVE / PROJECTOR MODEL — the single self-contained document the audience
 * screen subscribes to.
 *
 * Stored at: games/{gameId}/live/display
 *
 * The host publishes this (through /api/live) on every visible change; /display
 * renders purely from it via onSnapshot and never reads the question bank. Note:
 * `answer` is only populated when `showAnswer` is true, so upcoming answers are
 * never present on the projector device before the host reveals them.
 *
 * The timer is synced by absolute end time (`endsAt`, epoch ms): the display
 * counts down to it locally, so both machines agree without streaming ticks.
 */

export type DisplayScreen =
  | "welcome"
  | "scoreboard"
  | "board"
  | "question"
  | "answer"
  | "rapid_fire"
  | "winner";

export interface LiveTimer {
  running: boolean;
  /** Epoch ms when the countdown ends, or null if not running. */
  endsAt: number | null;
  /** Total duration (s) so the display can render a full ring/bar. */
  durationSeconds: number | null;
}

/** One board tile as the audience should see it. */
export interface LiveBoardTile {
  questionId: string;
  order: number;
  used: boolean;
}

/** Team scores as shown on the scoreboard / winner screens. */
export interface LiveScore {
  id: string;
  name: string;
  score: number;
}

/** Rapid-fire progress shown to the audience. */
export interface LiveRapidFire {
  teamName: string;
  total: number;
  index: number; // 0-based current question number
  correct: number;
  question: string | null;
  answer: string | null; // only when showAnswer
  showAnswer: boolean;
  finished: boolean;
}

export interface LiveDisplay {
  screen: DisplayScreen;

  roundId: string | null;
  roundName: string | null;

  questionId: string | null;
  /** Position of the current question within the round (1-based). */
  questionNumber: number | null;
  question: string | null;
  answer: string | null; // populated only when showAnswer === true
  imageUrl: string | null;
  showAnswer: boolean;

  /** Team whose turn it is (standard rounds), for the audience banner. */
  activeTeamId: string | null;
  activeTeamName: string | null;

  /** Free-form banner ("Steal!", "Everyone plays!", round intro, etc.). */
  message: string | null;

  timer: LiveTimer;

  /** Board tiles for the "board" screen (null on other screens). */
  board: LiveBoardTile[] | null;
  /** Scores for scoreboard/winner screens (null elsewhere). */
  scores: LiveScore[] | null;
  /** Rapid-fire block for the "rapid_fire" screen (null elsewhere). */
  rapidFire: LiveRapidFire | null;

  /** Epoch ms of the last publish, for staleness debugging. */
  updatedAt: number;
}

export const IDLE_TIMER: LiveTimer = {
  running: false,
  endsAt: null,
  durationSeconds: null,
};

/** The initial projector state before a game starts. */
export function welcomeLive(name: string, subtitle: string): LiveDisplay {
  return {
    screen: "welcome",
    roundId: null,
    roundName: null,
    questionId: null,
    questionNumber: null,
    question: null,
    answer: null,
    imageUrl: null,
    showAnswer: false,
    activeTeamId: null,
    activeTeamName: null,
    message: `${subtitle} — ${name}`,
    timer: IDLE_TIMER,
    board: null,
    scores: null,
    rapidFire: null,
    updatedAt: 0,
  };
}

export function isDisplayScreen(v: unknown): v is DisplayScreen {
  return (
    v === "welcome" ||
    v === "scoreboard" ||
    v === "board" ||
    v === "question" ||
    v === "answer" ||
    v === "rapid_fire" ||
    v === "winner"
  );
}

export function isLiveDisplay(v: unknown): v is LiveDisplay {
  if (typeof v !== "object" || v === null) return false;
  const l = v as Record<string, unknown>;
  return isDisplayScreen(l.screen) && typeof l.showAnswer === "boolean";
}
