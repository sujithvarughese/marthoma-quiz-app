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
  | "rounds"
  | "board"
  | "question"
  | "answer"
  | "rapid_fire"
  | "rapid_review"
  | "winner"
  | "rules";

export interface LiveTimer {
  running: boolean;
  /** Epoch ms when the countdown ends, or null if not running. */
  endsAt: number | null;
  /** Total duration (s) so the display can render a full ring/bar. */
  durationSeconds: number | null;
}

/** Summary of each round/category for the categories screen. */
export interface LiveRoundSummary {
  id: string;
  order: number;
  name: string;
  description?: string;
  type: "standard" | "picture" | "rapid_fire";
  totalQuestions: number;
  remainingQuestions: number;
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

/**
 * Rapid-fire progress shown to the audience during play. Scoring happens
 * later in a separate host-only review pass, so there's no live correct
 * count or answer reveal here — just the question and how far along the
 * team is.
 */
export interface LiveRapidFire {
  teamName: string;
  total: number;
  answered: number; // how many of `total` have been answered so far
  question: string | null;
  finished: boolean;
  /** True once the host has started the timer; before that, the audience
   * sees a "get ready" screen instead of the first question. */
  started: boolean;
}

/** One row of the family-feud-style rapid-fire review board. */
export interface LiveRapidReviewItem {
  question: string;
  teamAnswer: string;
  /** Only populated once the host has graded this question. */
  correctAnswer: string | null;
  status: "pending" | "correct" | "incorrect";
}

/** The full review board for whichever team the host is currently reviewing. */
export interface LiveRapidReview {
  teamName: string;
  items: LiveRapidReviewItem[];
  /** Index of the row currently being revealed/graded. */
  currentIndex: number;
}

/**
 * One page of the how-to-play guide, mirrored to the projector so the
 * audience follows along on the same page the host is narrating from (see
 * lib/rulesContent.ts for the shared copy).
 */
export interface LiveRules {
  icon: string;
  eyebrow: string;
  title: string;
  body: string[];
  page: number;
  totalPages: number;
  /** True on the welcome page — pairs with the top-level `rounds` field. */
  showRounds: boolean;
}

export interface LiveDisplay {
  screen: DisplayScreen;

  roundId: string | null;
  roundName: string | null;
  roundDescription?: string | null;
  roundOrder?: number | null;

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

  /** Categories/rounds summary for "rounds" screen (or null). */
  rounds?: LiveRoundSummary[] | null;
  /** Id of whichever round/"rapid-fire"/"tiebreaker" is up next in the
   * fixed play order, so the "rounds" screen can glow it — or null once
   * everything playable is done. See currentFocusId() in lib/store.tsx. */
  focusId?: string | null;

  /** Board tiles for the "board" screen (null on other screens). */
  board: LiveBoardTile[] | null;
  /** Scores for scoreboard/winner screens (null elsewhere). */
  scores: LiveScore[] | null;
  /** Rapid-fire block for the "rapid_fire" screen (null elsewhere). */
  rapidFire: LiveRapidFire | null;
  /** Rapid-fire review board for the "rapid_review" screen (null elsewhere). */
  rapidReview: LiveRapidReview | null;
  /** How-to-play guide page for the "rules" screen (null elsewhere). */
  rules: LiveRules | null;

  /** Host-controlled mute for the projector's game-show audio — the display
   * itself only gates the initial browser autoplay unlock; the host decides
   * whether sound plays at all. */
  audioMuted: boolean;
  /** One-shot cue for the projector to play a "correct"/"wrong" sound.
   * `nonce` increments every time the host grades an answer, so the display
   * can detect a fresh cue (vs. a re-delivery of the same live doc) by
   * comparing against the last nonce it acted on. */
  answerCue: { correct: boolean; nonce: number } | null;

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
    rounds: null,
    focusId: null,
    board: null,
    scores: null,
    rapidFire: null,
    rapidReview: null,
    rules: null,
    audioMuted: false,
    answerCue: null,
    updatedAt: 0,
  };
}

export function isDisplayScreen(v: unknown): v is DisplayScreen {
  return (
    v === "welcome" ||
    v === "scoreboard" ||
    v === "rounds" ||
    v === "board" ||
    v === "question" ||
    v === "answer" ||
    v === "rapid_fire" ||
    v === "rapid_review" ||
    v === "winner" ||
    v === "rules"
  );
}

export function isLiveDisplay(v: unknown): v is LiveDisplay {
  if (typeof v !== "object" || v === null) return false;
  const l = v as Record<string, unknown>;
  return isDisplayScreen(l.screen) && typeof l.showAnswer === "boolean";
}
