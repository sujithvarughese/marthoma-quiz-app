/**
 * SESSION MODEL — the durable, per-event state that changes during play.
 *
 * Stored at:
 *   games/{gameId}         → game document (settings, rotation, progress)
 *   games/{gameId}/teams/* → one doc per team (name, order, score)
 *
 * The host is the only writer (through the protected /api/state route, using the
 * Admin SDK). Both host and display read it. This is separate from the projector
 * doc (lib/live.ts): the game doc is the source of truth; the projector doc is a
 * derived view the host publishes for the audience screen.
 */

export type GameStatus = "not_started" | "active" | "completed";

export interface SessionTeam {
  id: string;
  name: string;
  /** Short label for tight scoreboard cells; falls back to name. */
  shortName?: string;
  /** Stable display / rotation order. */
  order: number;
  score: number;
}

/** Tunable scoring + timing. Constants, not per-question (Phase 1). */
export interface GameSettings {
  correctPoints: number; // active team answers a standard question
  stealPoints: number; // another team steals a missed question
  picturePoints: number; // per correct team in the picture round
  rapidFirePoints: number; // each rapid-fire question answered correctly

  normalAnswerSeconds: number;
  stealAnswerSeconds: number;
  pictureAnswerSeconds: number;
  rapidFireSeconds: number;

  rapidFireQuestionCount: number;

  allowSteals: boolean;
  rotateStartingTeam: boolean;
}

/**
 * Rapid-fire is split into two phases: every team plays first (recording the
 * host's typed transcript of what was said, no scoring), then — once every
 * team has played — the host reviews each team's answers and grades them.
 * Both phases are persisted so a host refresh mid-round never loses a
 * team's recorded answers or an in-progress review.
 */
export interface RapidFireResult {
  teamId: string;
  questionIds: string[];
  answers: Record<string, string>;
}

export interface RapidFireReview {
  teamIds: string[];
  currentIndex: number;
  questionIndex: number;
  graded: Record<string, boolean>;
  awarded: boolean;
}

export const DEFAULT_SETTINGS: GameSettings = {
  correctPoints: 10,
  stealPoints: 5,
  picturePoints: 5,
  rapidFirePoints: 5,

  normalAnswerSeconds: 60,
  stealAnswerSeconds: 20,
  pictureAnswerSeconds: 60,
  rapidFireSeconds: 60,

  rapidFireQuestionCount: 5,

  allowSteals: true,
  rotateStartingTeam: true,
};

/** The full game document + teams, as loaded/saved together. */
export interface SessionState {
  status: GameStatus;
  name: string;
  subtitle: string;

  teams: SessionTeam[];
  /** Team ids in rotation order (a subset/permutation of teams). */
  teamOrder: string[];
  /** Index into teamOrder of the team that starts the next standard question. */
  activeTeamIndex: number;

  currentRoundId: string | null;
  currentQuestionId: string | null;

  /** Ids of every question already played this event. */
  usedQuestionIds: string[];

  /** Rapid-fire: team ids still due a turn, in locked play order (least
   * points first, ties broken alphabetically); null until first entered. */
  rapidQueue: string[] | null;
  /** Rapid-fire: completed turns awaiting review, in play order. */
  rapidCompleted: RapidFireResult[];
  /** Rapid-fire: the active grading pass, or null before review starts. */
  rapidReview: RapidFireReview | null;

  settings: GameSettings;
}

/** The subset written to the game document (teams are their own subcollection). */
export interface GameDoc {
  status: GameStatus;
  name: string;
  subtitle: string;
  teamOrder: string[];
  activeTeamIndex: number;
  currentRoundId: string | null;
  currentQuestionId: string | null;
  usedQuestionIds: string[];
  rapidQueue: string[] | null;
  rapidCompleted: RapidFireResult[];
  rapidReview: RapidFireReview | null;
  settings: GameSettings;
}

/** Whose turn it is to start the current question (or null if none/rotation off). */
export function activeTeamId(session: SessionState): string | null {
  const { teamOrder, activeTeamIndex } = session;
  if (teamOrder.length === 0) return null;
  return teamOrder[activeTeamIndex % teamOrder.length] ?? null;
}

/* ------------------------------------------------------------------ *
 * Runtime validation for data crossing the network / Firestore.
 * ------------------------------------------------------------------ */

function isTeam(v: unknown): v is SessionTeam {
  if (typeof v !== "object" || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.id === "string" &&
    typeof t.name === "string" &&
    typeof t.order === "number" &&
    typeof t.score === "number"
  );
}

function isStringRecord(v: unknown): v is Record<string, string> {
  if (typeof v !== "object" || v === null) return false;
  return Object.values(v).every((val) => typeof val === "string");
}

function isBooleanRecord(v: unknown): v is Record<string, boolean> {
  if (typeof v !== "object" || v === null) return false;
  return Object.values(v).every((val) => typeof val === "boolean");
}

function isRapidFireResult(v: unknown): v is RapidFireResult {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.teamId === "string" &&
    Array.isArray(r.questionIds) &&
    r.questionIds.every((id) => typeof id === "string") &&
    isStringRecord(r.answers)
  );
}

function isRapidFireReview(v: unknown): v is RapidFireReview {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    Array.isArray(r.teamIds) &&
    r.teamIds.every((id) => typeof id === "string") &&
    typeof r.currentIndex === "number" &&
    typeof r.questionIndex === "number" &&
    isBooleanRecord(r.graded) &&
    typeof r.awarded === "boolean"
  );
}

export function isGameDoc(v: unknown): v is GameDoc {
  if (typeof v !== "object" || v === null) return false;
  const g = v as Record<string, unknown>;
  return (
    (g.status === "not_started" ||
      g.status === "active" ||
      g.status === "completed") &&
    typeof g.name === "string" &&
    typeof g.subtitle === "string" &&
    Array.isArray(g.teamOrder) &&
    g.teamOrder.every((id) => typeof id === "string") &&
    typeof g.activeTeamIndex === "number" &&
    (g.currentRoundId === null || typeof g.currentRoundId === "string") &&
    (g.currentQuestionId === null || typeof g.currentQuestionId === "string") &&
    Array.isArray(g.usedQuestionIds) &&
    g.usedQuestionIds.every((id) => typeof id === "string") &&
    (g.rapidQueue === null ||
      (Array.isArray(g.rapidQueue) &&
        g.rapidQueue.every((id) => typeof id === "string"))) &&
    Array.isArray(g.rapidCompleted) &&
    g.rapidCompleted.every(isRapidFireResult) &&
    (g.rapidReview === null || isRapidFireReview(g.rapidReview)) &&
    typeof g.settings === "object" &&
    g.settings !== null
  );
}

export function isSessionState(v: unknown): v is SessionState {
  if (!isGameDoc(v)) return false;
  const s = v as unknown as Record<string, unknown>;
  return Array.isArray(s.teams) && s.teams.every(isTeam);
}
