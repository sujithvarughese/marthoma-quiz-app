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

export const DEFAULT_SETTINGS: GameSettings = {
  correctPoints: 10,
  stealPoints: 5,
  picturePoints: 10,
  rapidFirePoints: 5,

  normalAnswerSeconds: 60,
  stealAnswerSeconds: 20,
  pictureAnswerSeconds: 60,
  rapidFireSeconds: 60,

  rapidFireQuestionCount: 6,

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
    typeof g.settings === "object" &&
    g.settings !== null
  );
}

export function isSessionState(v: unknown): v is SessionState {
  if (!isGameDoc(v)) return false;
  const s = v as unknown as Record<string, unknown>;
  return Array.isArray(s.teams) && s.teams.every(isTeam);
}
