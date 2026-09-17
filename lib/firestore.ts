import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import {
  FieldValue,
  getFirestore,
  type Firestore,
} from "firebase-admin/firestore";
import type { GameContent, QuestionDoc, RoundDoc } from "./content";
import type { GameDoc, SessionState, SessionTeam } from "./session";
import type { LiveDisplay } from "./live";
import type { HostMirror } from "./hostMirror";
import type { HostLock } from "./hostLock";

/**
 * Server-only Firestore access via the Firebase Admin SDK. Credentials come
 * from a service account supplied through environment variables:
 *
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (paste the whole key; \n escapes are handled below)
 *
 * Optional:
 *   QUIZ_GAME_ID           which game document to use (default below)
 *
 * This module must never be imported from client components — it is only used by
 * the /api route handlers, which run on the server. Browser reads use the client
 * SDK in lib/firebaseClient.ts instead.
 *
 * Firestore layout:
 *   games/{gameId}                          → GameDoc
 *   games/{gameId}/teams/{teamId}           → SessionTeam
 *   games/{gameId}/rounds/{roundId}         → RoundDoc
 *   games/{gameId}/questions/{questionId}   → QuestionDoc
 *   games/{gameId}/live/display             → LiveDisplay
 *   games/{gameId}/live/host                → HostMirror
 *   games/{gameId}/live/hostLock             → HostLock
 */

const COLLECTION = "games";

export function getGameId(): string {
  return process.env.QUIZ_GAME_ID || "mar-thoma-quiz-2026";
}

/** True when the Firebase service-account env vars are present. */
export function isFirestoreConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

function getApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel stores multi-line secrets with literal "\n"; turn them back into
  // real newlines so the PEM parses.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, " +
        "FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.",
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

function db(): Firestore {
  return getFirestore(getApp());
}

/**
 * Firestore rejects `undefined` values (e.g. a round with no description). Round
 * -tripping through JSON drops undefined keys, giving us plain, safe documents.
 * Only used on pure-data objects — never on values holding FieldValue sentinels.
 */
function clean<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj)) as T;
}

function gameRef() {
  return db().collection(COLLECTION).doc(getGameId());
}

/* ------------------------------------------------------------------ *
 * Content (rounds + questions) — written by the seed, read by everyone.
 * ------------------------------------------------------------------ */

/** Overwrite the whole content bank (rounds + questions) in one batch. */
export async function saveContent(
  rounds: RoundDoc[],
  questions: QuestionDoc[],
): Promise<void> {
  const batch = db().batch();
  const roundsCol = gameRef().collection("rounds");
  const questionsCol = gameRef().collection("questions");
  for (const r of rounds) batch.set(roundsCol.doc(r.id), clean(r));
  for (const q of questions) batch.set(questionsCol.doc(q.id), clean(q));
  await batch.commit();
}

/** Read the full content bank. */
export async function loadContent(): Promise<GameContent> {
  const [roundsSnap, questionsSnap] = await Promise.all([
    gameRef().collection("rounds").get(),
    gameRef().collection("questions").get(),
  ]);
  const rounds = roundsSnap.docs
    .map((d) => d.data() as RoundDoc)
    .sort((a, b) => a.order - b.order);
  const questions: Record<string, QuestionDoc> = {};
  for (const d of questionsSnap.docs) {
    const q = d.data() as QuestionDoc;
    questions[q.id] = q;
  }
  return { rounds, questions };
}

/* ------------------------------------------------------------------ *
 * Session (game doc + teams) — written by the host, read by everyone.
 * ------------------------------------------------------------------ */

function toGameDoc(s: SessionState): GameDoc {
  return {
    status: s.status,
    name: s.name,
    subtitle: s.subtitle,
    teamOrder: s.teamOrder,
    activeTeamIndex: s.activeTeamIndex,
    currentRoundId: s.currentRoundId,
    currentQuestionId: s.currentQuestionId,
    usedQuestionIds: s.usedQuestionIds,
    rapidQueue: s.rapidQueue,
    rapidCompleted: s.rapidCompleted,
    rapidReview: s.rapidReview,
    settings: s.settings,
  };
}

/** Read the game document, or null if the game hasn't been created yet. */
export async function loadGameDoc(): Promise<GameDoc | null> {
  const snap = await gameRef().get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data) return null;
  // Strip the Firestore-only serverTimestamp so it doesn't leak into session
  // state that gets re-serialized on the next save.
  delete data.updatedAt;
  return data as GameDoc;
}

/** Read all team docs, ordered. */
export async function loadTeams(): Promise<SessionTeam[]> {
  const snap = await gameRef().collection("teams").get();
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<SessionTeam, "id">) }))
    .sort((a, b) => a.order - b.order);
}

/** Read the full session (game doc + teams), or null if not created. */
export async function loadSession(): Promise<SessionState | null> {
  const gameDoc = await loadGameDoc();
  if (!gameDoc) return null;
  const teams = await loadTeams();
  return { ...gameDoc, teams };
}

/**
 * Persist the full session: game document + teams subcollection. Team docs no
 * longer present in `session.teams` are removed so the collection stays in sync
 * with the roster.
 */
export async function saveSession(session: SessionState): Promise<void> {
  const batch = db().batch();

  batch.set(gameRef(), {
    ...clean(toGameDoc(session)),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const teamsCol = gameRef().collection("teams");
  const existing = await teamsCol.get();
  const keep = new Set(session.teams.map((t) => t.id));
  for (const d of existing.docs) {
    if (!keep.has(d.id)) batch.delete(d.ref);
  }
  for (const t of session.teams) {
    const { id, ...rest } = t;
    batch.set(teamsCol.doc(id), clean(rest));
  }

  await batch.commit();
}

/* ------------------------------------------------------------------ *
 * Live projector doc — written by the host, read by the display.
 * ------------------------------------------------------------------ */

export async function saveLive(live: LiveDisplay): Promise<void> {
  await gameRef()
    .collection("live")
    .doc("display")
    .set(clean({ ...live, updatedAt: Date.now() }));
}

export async function loadLive(): Promise<LiveDisplay | null> {
  const snap = await gameRef().collection("live").doc("display").get();
  if (!snap.exists) return null;
  return snap.data() as LiveDisplay;
}

/* ------------------------------------------------------------------ *
 * Host mirror doc — written by the host, read by the speaker screen.
 * ------------------------------------------------------------------ */

export async function saveHostMirror(mirror: HostMirror): Promise<void> {
  await gameRef()
    .collection("live")
    .doc("host")
    .set(clean({ ...mirror, updatedAt: Date.now() }));
}

export async function loadHostMirror(): Promise<HostMirror | null> {
  const snap = await gameRef().collection("live").doc("host").get();
  if (!snap.exists) return null;
  return snap.data() as HostMirror;
}

/* ------------------------------------------------------------------ *
 * Host lock — arbitrates which single tab is allowed to control the game.
 * ------------------------------------------------------------------ */

export async function saveHostLock(lock: HostLock): Promise<void> {
  await gameRef().collection("live").doc("hostLock").set(clean(lock));
}

export async function loadHostLock(): Promise<HostLock | null> {
  const snap = await gameRef().collection("live").doc("hostLock").get();
  if (!snap.exists) return null;
  return snap.data() as HostLock;
}
