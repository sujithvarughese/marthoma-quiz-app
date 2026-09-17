/**
 * HOST LOCK — arbitrates which single browser tab is allowed to control the
 * game and publish to the audience display.
 *
 * The bug this exists to prevent: every open /host tab independently saves
 * the session and publishes the projector doc on its own local state. If two
 * tabs are open at once (a second device, an old tab left in the
 * background, a duplicated tab), they silently race to overwrite each
 * other's writes to Firestore — from the audience's perspective the display
 * "randomly" jumps to whatever round/question the OTHER tab last had open,
 * and any points that tab awards apply for real. Only the tab that holds
 * this lock is allowed to write; every other tab renders a "someone else is
 * hosting" screen instead of the game.
 *
 * Stored at: games/{gameId}/live/hostLock
 */

export interface HostLock {
  /** Random id generated per browser tab (sessionStorage-scoped, so a
   * duplicated/reopened tab is treated as a distinct session). */
  clientId: string;
  /** Epoch ms when this clientId first claimed the lock. */
  claimedAt: number;
  /** Epoch ms of the most recent heartbeat — a lock older than
   * HOST_LOCK_TIMEOUT_MS is considered abandoned and up for grabs. */
  updatedAt: number;
}

export function isHostLock(v: unknown): v is HostLock {
  if (typeof v !== "object" || v === null) return false;
  const l = v as Record<string, unknown>;
  return (
    typeof l.clientId === "string" &&
    l.clientId.length > 0 &&
    typeof l.claimedAt === "number" &&
    typeof l.updatedAt === "number"
  );
}
