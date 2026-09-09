import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { PersistedState } from "./persistence";

/**
 * Server-only Firestore access via the Firebase Admin SDK. Credentials come
 * from a service account supplied through environment variables (set these in
 * Vercel → Project → Settings → Environment Variables):
 *
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY   (paste the whole key; \n escapes are handled below)
 *
 * Optional:
 *   QUIZ_GAME_ID           which document to use (default "default")
 *
 * This module must never be imported from client components — it is only used
 * by the /api/state route handler, which runs on the server.
 */

const COLLECTION = "quizGames";

export function getGameId(): string {
  return process.env.QUIZ_GAME_ID || "default";
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

function doc() {
  return getFirestore(getApp()).collection(COLLECTION).doc(getGameId());
}

/** Read the saved game state, or null if nothing has been saved yet. */
export async function loadState(): Promise<PersistedState | null> {
  const snap = await doc().get();
  if (!snap.exists) return null;
  const data = snap.data();
  if (!data?.state) return null;
  return data.state as PersistedState;
}

/** Overwrite the saved game state. */
export async function saveState(state: PersistedState): Promise<void> {
  await doc().set({
    state,
    updatedAt: FieldValue.serverTimestamp(),
  });
}
