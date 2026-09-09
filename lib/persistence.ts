import type { Team } from "./types";

/**
 * The durable slice of game state that survives a refresh / crash. We never
 * persist question *text* (that always comes from /data) — only which cards
 * have been played (`usedIds`), the teams, and their scores. Kept tiny so it
 * fits comfortably in a single Firestore document.
 *
 * This type is shared by the client store and the server API/Firestore code,
 * so both sides agree on the wire format.
 */
export interface PersistedState {
  teams: Team[];
  teamSeq: number;
  usedIds: string[];
  /** Whether a game is in progress (drives the landing "Resume" option). */
  gameStarted: boolean;
}

/** Runtime validation for data coming off the network / out of Firestore. */
export function isPersistedState(value: unknown): value is PersistedState {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  if (typeof v.teamSeq !== "number") return false;
  // Older saves may predate this field — tolerate its absence.
  if (v.gameStarted !== undefined && typeof v.gameStarted !== "boolean")
    return false;
  if (!Array.isArray(v.usedIds) || !v.usedIds.every((id) => typeof id === "string"))
    return false;
  if (!Array.isArray(v.teams)) return false;
  return v.teams.every((t) => {
    if (typeof t !== "object" || t === null) return false;
    const team = t as Record<string, unknown>;
    return (
      typeof team.id === "string" &&
      typeof team.name === "string" &&
      typeof team.score === "number"
    );
  });
}
