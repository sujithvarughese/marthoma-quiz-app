"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";
import type { Question, Round, Team, ViewMode } from "@/lib/types";
import { type PersistedState } from "@/lib/persistence";
import { rounds as roundsSeed } from "@/data/rounds";
import { rapidFirePool as rapidFireSeed } from "@/data/rapidFire";
import { tiebreakerPool as tiebreakerSeed } from "@/data/tiebreaker";

/* ------------------------------------------------------------------ *
 * Constants — the fixed scoring scheme (no negative scoring anywhere).
 * ------------------------------------------------------------------ */
export const AWARD_CORRECT = 10; // direct question answered correctly
export const AWARD_PASSED = 5; // passed question answered by another team
export const AWARD_RAPID = 5; // each rapid-fire question answered correctly
export const AWARD_TIEBREAK = 1; // sudden-death point

export const TIME_DIRECT = 60; // seconds for a direct question
export const TIME_PASSED = 30; // seconds for a passed question
export const TIME_RAPID = 60; // seconds for a team's 5 rapid-fire questions

export const RAPID_FIRE_COUNT = 5; // questions dealt per team
export const MAX_TEAMS = 8;

/* ------------------------------------------------------------------ *
 * State shape
 * ------------------------------------------------------------------ */

interface ActiveQuestion {
  roundId: string;
  question: Question;
  status: "direct" | "passed";
  revealed: boolean;
}

interface RapidFireState {
  teamId: string;
  questions: Question[]; // the 5 dealt questions
  index: number; // 0..questions.length (== length when finished)
  correct: number;
  revealed: boolean; // answer shown for the current question
  finished: boolean;
}

interface TiebreakerState {
  question: Question | null;
  revealed: boolean;
}

export interface GameState {
  teams: Team[];
  teamSeq: number; // monotonic counter for team ids
  rounds: Round[];
  rapidFirePool: Question[];
  tiebreakerPool: Question[];
  view: ViewMode;
  /** True once a game has been started from the landing screen. While true the
   *  team roster is locked and the landing offers a "Resume" option. */
  gameStarted: boolean;
  activeRoundId: string | null;
  activeQuestion: ActiveQuestion | null;
  rapidFire: RapidFireState | null;
  tiebreaker: TiebreakerState | null;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

/** Pick a random element (or null) from a list of unused questions. */
function pickRandomUnused(questions: Question[]): Question | null {
  const available = questions.filter((q) => !q.used);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

const DEFAULT_TEAM_NAMES = [
  "Sevika Sangham",
  "Yuvajana Sakhyam",
  "Sunday School",
  "Edavaka Mission",
  "Choir",
  "Young Family Fellowship"
];

function makeInitialState(): GameState {
  return {
    teams: DEFAULT_TEAM_NAMES.map((name, i) => ({
      id: `team-${i + 1}`,
      name,
      score: 0,
    })),
    teamSeq: DEFAULT_TEAM_NAMES.length,
    rounds: clone(roundsSeed),
    rapidFirePool: clone(rapidFireSeed),
    tiebreakerPool: clone(tiebreakerSeed),
    view: "landing",
    gameStarted: false,
    activeRoundId: null,
    activeQuestion: null,
    rapidFire: null,
    tiebreaker: null,
  };
}

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

export type Action =
  | { type: "HYDRATE"; state: GameState }
  | { type: "ADD_TEAM" }
  | { type: "REMOVE_TEAM"; teamId: string }
  | { type: "RENAME_TEAM"; teamId: string; name: string }
  | { type: "AWARD"; teamId: string; amount: number }
  | { type: "GO_HOME" }
  | { type: "OPEN_ROUND"; roundId: string }
  | { type: "REVEAL_QUESTION"; roundId: string; questionId: string }
  | { type: "REVEAL_ANSWER" }
  | { type: "MARK_PASSED" }
  | { type: "CLOSE_QUESTION" }
  | { type: "ENTER_RAPIDFIRE" }
  | { type: "START_RAPIDFIRE"; teamId: string }
  | { type: "RAPIDFIRE_REVEAL" }
  | { type: "RAPIDFIRE_NEXT"; correct: boolean }
  | { type: "RAPIDFIRE_FINISH" }
  | { type: "START_TIEBREAKER" }
  | { type: "TIEBREAKER_REVEAL" }
  | { type: "TIEBREAKER_NEXT" }
  | { type: "RESET_QUESTIONS" }
  | { type: "RESET_SCORES" }
  | { type: "GO_LANDING" }
  | { type: "START_GAME" }
  | { type: "NEW_GAME" };

function markUsed(pool: Question[], id: string): Question[] {
  return pool.map((q) => (q.id === id ? { ...q, used: true } : q));
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;

    case "ADD_TEAM": {
      if (state.teams.length >= MAX_TEAMS) return state;
      const seq = state.teamSeq + 1;
      return {
        ...state,
        teamSeq: seq,
        teams: [
          ...state.teams,
          { id: `team-${seq}`, name: `Team ${state.teams.length + 1}`, score: 0 },
        ],
      };
    }

    case "REMOVE_TEAM":
      return {
        ...state,
        teams: state.teams.filter((t) => t.id !== action.teamId),
      };

    case "RENAME_TEAM":
      return {
        ...state,
        teams: state.teams.map((t) =>
          t.id === action.teamId ? { ...t, name: action.name } : t,
        ),
      };

    case "AWARD":
      // No negative scoring: clamp any award at 0 or above.
      if (action.amount <= 0) return state;
      return {
        ...state,
        teams: state.teams.map((t) =>
          t.id === action.teamId
            ? { ...t, score: t.score + action.amount }
            : t,
        ),
      };

    case "GO_HOME":
      return {
        ...state,
        view: "home",
        activeRoundId: null,
        activeQuestion: null,
        rapidFire: null,
        tiebreaker: null,
      };

    case "OPEN_ROUND":
      return {
        ...state,
        view: "board",
        activeRoundId: action.roundId,
        activeQuestion: null,
      };

    case "REVEAL_QUESTION": {
      const round = state.rounds.find((r) => r.id === action.roundId);
      if (!round) return state;
      const picked = round.questions.find((q) => q.id === action.questionId);
      // Ignore if the card was already taken (e.g. a double-click race).
      if (!picked || picked.used) return state;
      return {
        ...state,
        view: "question",
        activeRoundId: action.roundId,
        activeQuestion: {
          roundId: action.roundId,
          question: picked,
          status: "direct",
          revealed: false,
        },
        rounds: state.rounds.map((r) =>
          r.id === action.roundId
            ? { ...r, questions: markUsed(r.questions, picked.id) }
            : r,
        ),
      };
    }

    case "REVEAL_ANSWER":
      if (!state.activeQuestion) return state;
      return {
        ...state,
        activeQuestion: { ...state.activeQuestion, revealed: true },
      };

    case "MARK_PASSED":
      if (!state.activeQuestion) return state;
      return {
        ...state,
        activeQuestion: { ...state.activeQuestion, status: "passed" },
      };

    case "CLOSE_QUESTION":
      return {
        ...state,
        view: "board",
        activeQuestion: null,
      };

    case "ENTER_RAPIDFIRE":
      // Show the rapid-fire lobby (team picker) without dealing questions yet.
      return { ...state, view: "rapidfire", rapidFire: null };

    case "START_RAPIDFIRE": {
      // Deal RAPID_FIRE_COUNT random unused questions and mark them used.
      let pool = state.rapidFirePool;
      const dealt: Question[] = [];
      for (let i = 0; i < RAPID_FIRE_COUNT; i++) {
        const picked = pickRandomUnused(pool);
        if (!picked) break;
        dealt.push(picked);
        pool = markUsed(pool, picked.id);
      }
      if (dealt.length === 0) return state;
      return {
        ...state,
        view: "rapidfire",
        rapidFirePool: pool,
        rapidFire: {
          teamId: action.teamId,
          questions: dealt,
          index: 0,
          correct: 0,
          revealed: false,
          finished: false,
        },
      };
    }

    case "RAPIDFIRE_REVEAL":
      if (!state.rapidFire) return state;
      return {
        ...state,
        rapidFire: { ...state.rapidFire, revealed: true },
      };

    case "RAPIDFIRE_NEXT": {
      const rf = state.rapidFire;
      if (!rf) return state;
      const correct = rf.correct + (action.correct ? 1 : 0);
      const nextIndex = rf.index + 1;
      const finished = nextIndex >= rf.questions.length;
      return {
        ...state,
        // Award +2 immediately so the scoreboard stays live.
        teams: action.correct
          ? state.teams.map((t) =>
              t.id === rf.teamId ? { ...t, score: t.score + AWARD_RAPID } : t,
            )
          : state.teams,
        rapidFire: {
          ...rf,
          index: nextIndex,
          correct,
          revealed: false,
          finished,
        },
      };
    }

    case "RAPIDFIRE_FINISH":
      if (!state.rapidFire) return state;
      return {
        ...state,
        rapidFire: { ...state.rapidFire, finished: true },
      };

    case "START_TIEBREAKER": {
      const picked = pickRandomUnused(state.tiebreakerPool);
      return {
        ...state,
        view: "tiebreaker",
        tiebreakerPool: picked
          ? markUsed(state.tiebreakerPool, picked.id)
          : state.tiebreakerPool,
        tiebreaker: { question: picked, revealed: false },
      };
    }

    case "TIEBREAKER_REVEAL":
      if (!state.tiebreaker) return state;
      return {
        ...state,
        tiebreaker: { ...state.tiebreaker, revealed: true },
      };

    case "TIEBREAKER_NEXT": {
      const picked = pickRandomUnused(state.tiebreakerPool);
      return {
        ...state,
        tiebreakerPool: picked
          ? markUsed(state.tiebreakerPool, picked.id)
          : state.tiebreakerPool,
        tiebreaker: { question: picked, revealed: false },
      };
    }

    case "RESET_QUESTIONS":
      return {
        ...state,
        rounds: state.rounds.map((r) => ({
          ...r,
          questions: r.questions.map((q) => ({ ...q, used: false })),
        })),
        rapidFirePool: state.rapidFirePool.map((q) => ({ ...q, used: false })),
        tiebreakerPool: state.tiebreakerPool.map((q) => ({ ...q, used: false })),
      };

    case "RESET_SCORES":
      return {
        ...state,
        teams: state.teams.map((t) => ({ ...t, score: 0 })),
      };

    case "GO_LANDING":
      // Show the intro/menu (e.g. the gear "New game" during play). Does not
      // reset anything — the landing offers Resume or New Game from there.
      return { ...state, view: "landing" };

    case "START_GAME":
      // Begin play from the landing setup. Teams are now locked.
      return {
        ...state,
        gameStarted: true,
        view: "home",
        activeRoundId: null,
        activeQuestion: null,
        rapidFire: null,
        tiebreaker: null,
      };

    case "NEW_GAME": {
      // Tear the current game down to a fresh setup: clear scores + question
      // progress, unlock the roster, and stay on the landing so the host can
      // adjust teams before starting again.
      const fresh = makeInitialState();
      return {
        ...fresh,
        teams: state.teams.map((t) => ({ ...t, score: 0 })),
        teamSeq: state.teamSeq,
        view: "landing",
        gameStarted: false,
      };
    }

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ *
 * Persistence — only the durable game data, not transient view state.
 * ------------------------------------------------------------------ */

// Firestore (via /api/state) is the source of truth; localStorage is an
// offline cache so a brief network blip never loses the game.
const STORAGE_KEY = "church-quiz-app:v2";
const HOST_CODE_KEY = "church-quiz-app:hostCode";
const SAVE_DEBOUNCE_MS = 700;

/**
 * We persist only teams and the set of *used* question ids — never the question
 * text itself. Content is always seeded fresh from the data files, so edits to
 * /data take effect on reload while an in-progress event keeps its scores and
 * which cards have been played. Stale ids (from removed questions) are ignored.
 */

/** Collect every used question id across rounds and the two pools. */
function collectUsedIds(
  rounds: Round[],
  rapidFirePool: Question[],
  tiebreakerPool: Question[],
): string[] {
  const ids: string[] = [];
  for (const r of rounds)
    for (const q of r.questions) if (q.used) ids.push(q.id);
  for (const q of rapidFirePool) if (q.used) ids.push(q.id);
  for (const q of tiebreakerPool) if (q.used) ids.push(q.id);
  return ids;
}

/** Apply a set of used ids onto a fresh (all-unused) question list. */
function applyUsed<T extends Question>(pool: T[], used: Set<string>): T[] {
  return pool.map((q) => (used.has(q.id) ? { ...q, used: true } : q));
}

/** Reduce full game state down to the durable slice we persist. */
function snapshot(state: GameState): PersistedState {
  return {
    teams: state.teams,
    teamSeq: state.teamSeq,
    gameStarted: state.gameStarted,
    usedIds: collectUsedIds(
      state.rounds,
      state.rapidFirePool,
      state.tiebreakerPool,
    ),
  };
}

/** Rebuild full game state from a persisted slice over the seed data. */
function applyPersisted(base: GameState, saved: PersistedState): GameState {
  const used = new Set(saved.usedIds);
  return {
    ...base,
    teams: saved.teams.length ? saved.teams : base.teams,
    teamSeq: saved.teamSeq,
    gameStarted: saved.gameStarted ?? false,
    rounds: base.rounds.map((r) => ({
      ...r,
      questions: applyUsed(r.questions, used),
    })),
    rapidFirePool: applyUsed(base.rapidFirePool, used),
    tiebreakerPool: applyUsed(base.tiebreakerPool, used),
  };
}

function loadLocal(): PersistedState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedState) : null;
  } catch {
    return null;
  }
}

function saveLocal(snap: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snap));
  } catch {
    /* storage full / disabled — server save still covers us */
  }
}

/* ------------------------------------------------------------------ *
 * Context + provider + hook
 * ------------------------------------------------------------------ */

/**
 * Sync state exposed to the UI (a small indicator in the top bar).
 *   loading  — fetching the saved game from the server
 *   saving   — a change is queued / being written
 *   saved    — successfully persisted to Firestore
 *   offline  — server unreachable; running on the local cache only
 *   locked   — server requires a host access code we don't have
 *   disabled — Firestore isn't configured on the server (local cache only)
 */
export type SyncStatus =
  | "loading"
  | "saving"
  | "saved"
  | "offline"
  | "locked"
  | "disabled";

interface SyncApi {
  status: SyncStatus;
  lastSavedAt: number | null;
  /** Store (or clear) the host access code and retry the last save. */
  setHostCode: (code: string) => void;
  /** Force an immediate save/retry, bypassing the debounce. */
  saveNow: () => void;
}

const StateContext = createContext<GameState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);
const SyncContext = createContext<SyncApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  // Lazy init keeps SSR output === first client render, then we hydrate from
  // the cache/server in effects to avoid a hydration mismatch.
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);

  const [status, setStatus] = useState<SyncStatus>("loading");
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const hydratedRef = useRef(false); // block saves until initial load finishes
  const serverDisabledRef = useRef(false); // Firestore not configured
  const saveTimer = useRef<number | null>(null);
  const latestSnapshot = useRef<PersistedState | null>(null);

  // Push a snapshot to the server (localStorage is written separately, first).
  const doSave = useCallback(async (snap: PersistedState) => {
    if (serverDisabledRef.current) {
      setStatus("disabled");
      return;
    }
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const code =
        typeof window !== "undefined"
          ? window.localStorage.getItem(HOST_CODE_KEY)
          : null;
      if (code) headers["x-host-code"] = code;

      const res = await fetch("/api/state", {
        method: "PUT",
        headers,
        body: JSON.stringify(snap),
      });
      if (res.status === 503) {
        serverDisabledRef.current = true;
        setStatus("disabled");
        return;
      }
      if (res.status === 401) {
        setStatus("locked");
        return;
      }
      if (!res.ok) throw new Error(`save failed: ${res.status}`);
      setStatus("saved");
      setLastSavedAt(Date.now());
    } catch {
      setStatus("offline");
    }
  }, []);

  // Initial hydrate: local cache first (instant), then the server (authoritative).
  useEffect(() => {
    let cancelled = false;

    const local = loadLocal();
    if (local) {
      dispatch({
        type: "HYDRATE",
        state: applyPersisted(makeInitialState(), local),
      });
    }

    (async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (res.status === 503) {
          serverDisabledRef.current = true;
          if (!cancelled) setStatus("disabled");
          return;
        }
        if (!res.ok) throw new Error(`load failed: ${res.status}`);
        const data = (await res.json()) as { state: PersistedState | null };
        if (!cancelled && data.state) {
          dispatch({
            type: "HYDRATE",
            state: applyPersisted(makeInitialState(), data.state),
          });
        }
        if (!cancelled) setStatus("saved");
      } catch {
        if (!cancelled) setStatus("offline");
      } finally {
        // Allow saves now — even offline, so the local cache keeps updating.
        hydratedRef.current = true;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist durable data whenever it changes (local immediately, server debounced).
  const { teams, teamSeq, rounds, rapidFirePool, tiebreakerPool, gameStarted } =
    state;
  useEffect(() => {
    if (!hydratedRef.current) return;
    const snap: PersistedState = {
      teams,
      teamSeq,
      gameStarted,
      usedIds: collectUsedIds(rounds, rapidFirePool, tiebreakerPool),
    };
    latestSnapshot.current = snap;
    saveLocal(snap);

    setStatus((s) => (s === "disabled" || s === "locked" ? s : "saving"));
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void doSave(snap);
    }, SAVE_DEBOUNCE_MS);
  }, [
    teams,
    teamSeq,
    rounds,
    rapidFirePool,
    tiebreakerPool,
    gameStarted,
    doSave,
  ]);

  const saveNow = useCallback(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    void doSave(latestSnapshot.current ?? snapshot(state));
  }, [doSave, state]);

  const setHostCode = useCallback(
    (code: string) => {
      if (typeof window !== "undefined") {
        if (code) window.localStorage.setItem(HOST_CODE_KEY, code);
        else window.localStorage.removeItem(HOST_CODE_KEY);
      }
      serverDisabledRef.current = false;
      void doSave(latestSnapshot.current ?? snapshot(state));
    },
    [doSave, state],
  );

  const sync: SyncApi = {
    status,
    lastSavedAt,
    setHostCode,
    saveNow,
  };

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={dispatch}>
        <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

export function useSync(): SyncApi {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error("useSync must be used within <GameProvider>");
  return ctx;
}

export function useGame(): GameState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider>");
  return ctx;
}

export function useDispatch(): Dispatch<Action> {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error("useDispatch must be used within <GameProvider>");
  return ctx;
}
