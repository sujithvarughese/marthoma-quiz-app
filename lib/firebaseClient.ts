/**
 * Firebase CLIENT SDK — browser only.
 *
 * This is where initializeApp(firebaseConfig) lives. Import it ONLY from client
 * components (e.g. the /display app and any client-side reads). Never import it
 * from an API route or other server code — the server talks to Firestore
 * through the Admin SDK in lib/firestore.ts, using the FIREBASE_* service
 * account (which must stay server-only).
 *
 * The config values come from NEXT_PUBLIC_FIREBASE_* in .env.local. They are
 * safe to ship to the browser: they only identify the project. Actual access
 * is enforced by Firestore security rules (public read, no client writes).
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  collection,
  doc,
  getDocs,
  getFirestore,
  onSnapshot,
  type Firestore,
} from "firebase/firestore";
import type { GameContent, QuestionDoc, RoundDoc } from "./content";
import type { SessionTeam } from "./session";
import { isLiveDisplay, type LiveDisplay } from "./live";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Reuse the existing app across hot-reloads / re-imports instead of calling
// initializeApp twice (which throws).
export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getDb(): Firestore {
  return getFirestore(getFirebaseApp());
}

/** Which game document to read. Must match QUIZ_GAME_ID on the server. */
export function getGameId(): string {
  return process.env.NEXT_PUBLIC_QUIZ_GAME_ID || "mar-thoma-quiz-2026";
}

function gameRef() {
  return doc(getDb(), "games", getGameId());
}

/* ------------------------------------------------------------------ *
 * Reads / live subscriptions for the browser (host + display).
 * ------------------------------------------------------------------ */

/** One-time read of the content bank (rounds + questions). */
export async function loadContent(): Promise<GameContent> {
  const [roundsSnap, questionsSnap] = await Promise.all([
    getDocs(collection(gameRef(), "rounds")),
    getDocs(collection(gameRef(), "questions")),
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

/**
 * Subscribe to the projector doc. `cb` fires on every change; returns an
 * unsubscribe function. Automatically reconnects on snapshot error, network
 * recovery, or tab focus.
 */
export function subscribeLive(
  cb: (live: LiveDisplay | null) => void,
): () => void {
  let unsub: (() => void) | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let destroyed = false;
  let retryDelay = 1000;

  function connect() {
    if (destroyed) return;
    try {
      const ref = doc(collection(gameRef(), "live"), "display");
      unsub = onSnapshot(
        ref,
        (snap) => {
          retryDelay = 1000;
          const data = snap.data();
          cb(data && isLiveDisplay(data) ? (data as LiveDisplay) : null);
        },
        (err) => {
          console.warn("live subscription error, scheduling reconnect:", err);
          if (unsub) {
            try {
              unsub();
            } catch {}
            unsub = null;
          }
          if (!destroyed) {
            if (retryTimer) clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              connect();
            }, retryDelay);
            retryDelay = Math.min(retryDelay * 2, 10000);
          }
        },
      );
    } catch (err) {
      console.warn("Failed to attach live snapshot, retrying:", err);
      if (!destroyed) {
        if (retryTimer) clearTimeout(retryTimer);
        retryTimer = setTimeout(() => {
          connect();
        }, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 10000);
      }
    }
  }

  connect();

  function onReconnectTrigger() {
    if (destroyed) return;
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
    if (unsub) {
      try {
        unsub();
      } catch {}
      unsub = null;
    }
    retryDelay = 1000;
    connect();
  }

  if (typeof window !== "undefined") {
    window.addEventListener("online", onReconnectTrigger);
    window.addEventListener("focus", onReconnectTrigger);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        onReconnectTrigger();
      }
    });
  }

  return () => {
    destroyed = true;
    if (retryTimer) clearTimeout(retryTimer);
    if (unsub) {
      try {
        unsub();
      } catch {}
      unsub = null;
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("online", onReconnectTrigger);
      window.removeEventListener("focus", onReconnectTrigger);
    }
  };
}

/** Subscribe to team scores (ordered). Returns an unsubscribe function. */
export function subscribeTeams(
  cb: (teams: SessionTeam[]) => void,
): () => void {
  return onSnapshot(
    collection(gameRef(), "teams"),
    (snap) => {
      const teams = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<SessionTeam, "id">) }))
        .sort((a, b) => a.order - b.order);
      cb(teams);
    },
    (err) => {
      console.error("teams subscription error:", err);
      cb([]);
    },
  );
}

