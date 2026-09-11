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
import {
  rapidFireQuestions,
  type GameContent,
  type QuestionDoc,
  type RoundDoc,
} from "./content";
import {
  activeTeamId as activeTeamIdOf,
  DEFAULT_SETTINGS,
  type SessionState,
  type SessionTeam,
} from "./session";
import {
  IDLE_TIMER,
  type LiveDisplay,
  type LiveScore,
  type LiveTimer,
} from "./live";
import { loadContent } from "./firebaseClient";

/* ------------------------------------------------------------------ *
 * Host-side state: read-only content + durable session + transient view.
 * ------------------------------------------------------------------ */

export const MAX_TEAMS = 8;

export type HostView =
  | "setup" // pre-game team roster
  | "home" // round menu
  | "board" // question grid for the current round
  | "question" // standard question flow
  | "picture" // picture / whiteboard flow
  | "rapidfire" // rapid-fire flow
  | "scoreboard" // full standings
  | "winner"; // final results

// Same shape as LiveTimer so it maps straight into the projector doc.
type HostTimer = LiveTimer;

interface RapidState {
  teamId: string;
  questionIds: string[];
  index: number; // 0..length (== length when finished)
  correct: number;
  revealed: boolean;
  finished: boolean;
}

export interface HostState {
  content: GameContent | null;
  session: SessionState | null;
  loaded: boolean;

  view: HostView;

  // standard/picture question flow
  activeQuestionId: string | null;
  revealed: boolean; // answer shown
  stealing: boolean; // standard round: open-steal phase
  pictureCorrect: string[]; // picture round: team ids marked correct

  rapid: RapidState | null;
  timer: HostTimer;
}

/* ------------------------------------------------------------------ *
 * Selectors
 * ------------------------------------------------------------------ */

export function currentRound(state: HostState): RoundDoc | null {
  const { content, session } = state;
  if (!content || !session?.currentRoundId) return null;
  return content.rounds.find((r) => r.id === session.currentRoundId) ?? null;
}

export function getQuestion(
  state: HostState,
  id: string | null,
): QuestionDoc | null {
  if (!id || !state.content) return null;
  return state.content.questions[id] ?? null;
}

export function activeTeam(state: HostState): SessionTeam | null {
  const { session } = state;
  if (!session) return null;
  const id = activeTeamIdOf(session);
  return session.teams.find((t) => t.id === id) ?? null;
}

export function isUsed(state: HostState, id: string): boolean {
  return state.session?.usedQuestionIds.includes(id) ?? false;
}

/** Teams sorted highest-score first (stable by roster order on ties). */
export function rankedTeams(teams: SessionTeam[]): SessionTeam[] {
  return [...teams].sort((a, b) => b.score - a.score || a.order - b.order);
}

/* ------------------------------------------------------------------ *
 * Actions
 * ------------------------------------------------------------------ */

export type Action =
  | { type: "HYDRATE_CONTENT"; content: GameContent }
  | { type: "HYDRATE_SESSION"; session: SessionState }
  | { type: "SESSION_ABSENT" }
  // setup
  | { type: "ADD_TEAM" }
  | { type: "REMOVE_TEAM"; teamId: string }
  | { type: "RENAME_TEAM"; teamId: string; name: string }
  | { type: "START_GAME" }
  | { type: "NEW_GAME" }
  // navigation
  | { type: "GO_HOME" }
  | { type: "GO_SETUP" }
  | { type: "SHOW_SCOREBOARD" }
  | { type: "SHOW_WINNER" }
  | { type: "OPEN_ROUND"; roundId: string }
  // standard / picture question flow
  | { type: "SELECT_QUESTION"; questionId: string }
  | { type: "REVEAL_ANSWER" }
  | { type: "AWARD_CORRECT" } // active team answered
  | { type: "OPEN_STEAL" }
  | { type: "AWARD_STEAL"; teamId: string }
  | { type: "TOGGLE_PICTURE_TEAM"; teamId: string } // picture round
  | { type: "AWARD_PICTURE" }
  | { type: "CLOSE_QUESTION" }
  // rapid fire
  | { type: "ENTER_RAPIDFIRE" }
  | { type: "START_RAPIDFIRE"; teamId: string }
  | { type: "RAPID_REVEAL" }
  | { type: "RAPID_NEXT"; correct: boolean }
  | { type: "RAPID_FINISH" }
  | { type: "EXIT_RAPIDFIRE" }
  // scores admin
  | { type: "ADJUST_SCORE"; teamId: string; amount: number };

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function award(teams: SessionTeam[], teamId: string, amount: number) {
  return teams.map((t) =>
    t.id === teamId ? { ...t, score: Math.max(0, t.score + amount) } : t,
  );
}

function markUsed(session: SessionState, id: string): string[] {
  return session.usedQuestionIds.includes(id)
    ? session.usedQuestionIds
    : [...session.usedQuestionIds, id];
}

function startTimer(seconds: number): HostTimer {
  return {
    running: true,
    endsAt: Date.now() + seconds * 1000,
    durationSeconds: seconds,
  };
}

function pickRandomUnused(pool: QuestionDoc[], usedIds: string[], n: number) {
  const used = new Set(usedIds);
  const available = pool.filter((q) => !used.has(q.id));
  const dealt: string[] = [];
  while (dealt.length < n && available.length) {
    const i = Math.floor(Math.random() * available.length);
    dealt.push(available[i].id);
    available.splice(i, 1);
  }
  return dealt;
}

function rotate(session: SessionState): number {
  if (!session.settings.rotateStartingTeam || session.teamOrder.length === 0) {
    return session.activeTeamIndex;
  }
  return (session.activeTeamIndex + 1) % session.teamOrder.length;
}

const CLEARED = {
  activeQuestionId: null,
  revealed: false,
  stealing: false,
  pictureCorrect: [] as string[],
  timer: IDLE_TIMER,
} as const;

/* ------------------------------------------------------------------ *
 * Reducer
 * ------------------------------------------------------------------ */

function makeInitialState(): HostState {
  return {
    content: null,
    session: null,
    loaded: false,
    view: "setup",
    activeQuestionId: null,
    revealed: false,
    stealing: false,
    pictureCorrect: [],
    rapid: null,
    timer: IDLE_TIMER,
  };
}

function reducer(state: HostState, action: Action): HostState {
  switch (action.type) {
    case "HYDRATE_CONTENT":
      return { ...state, content: action.content };

    case "HYDRATE_SESSION": {
      const s = action.session;
      const view: HostView =
        s.status === "not_started"
          ? "setup"
          : s.status === "completed"
            ? "winner"
            : "home";
      return { ...state, session: s, loaded: true, view, ...CLEARED };
    }

    case "SESSION_ABSENT":
      return { ...state, loaded: true };

    /* ---- setup ---- */
    case "ADD_TEAM": {
      if (!state.session) return state;
      const order = state.session.teams.length;
      const id = `team-${order + 1}-${Math.floor(Math.random() * 1e6)}`;
      const team: SessionTeam = { id, name: `Team ${order + 1}`, order, score: 0 };
      const teams = [...state.session.teams, team];
      return {
        ...state,
        session: { ...state.session, teams, teamOrder: teams.map((t) => t.id) },
      };
    }

    case "REMOVE_TEAM": {
      if (!state.session) return state;
      const teams = state.session.teams
        .filter((t) => t.id !== action.teamId)
        .map((t, i) => ({ ...t, order: i }));
      return {
        ...state,
        session: {
          ...state.session,
          teams,
          teamOrder: teams.map((t) => t.id),
          activeTeamIndex: 0,
        },
      };
    }

    case "RENAME_TEAM": {
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          teams: state.session.teams.map((t) =>
            t.id === action.teamId ? { ...t, name: action.name } : t,
          ),
        },
      };
    }

    case "START_GAME": {
      if (!state.session) return state;
      return {
        ...state,
        session: { ...state.session, status: "active" },
        view: "home",
        ...CLEARED,
      };
    }

    case "NEW_GAME": {
      if (!state.session) return state;
      const teams = state.session.teams.map((t) => ({ ...t, score: 0 }));
      return {
        ...state,
        session: {
          ...state.session,
          status: "not_started",
          teams,
          teamOrder: teams.map((t) => t.id),
          activeTeamIndex: 0,
          currentRoundId: null,
          currentQuestionId: null,
          usedQuestionIds: [],
        },
        view: "setup",
        rapid: null,
        ...CLEARED,
      };
    }

    /* ---- navigation ---- */
    case "GO_HOME":
      return { ...state, view: "home", rapid: null, ...CLEARED };

    case "GO_SETUP":
      return { ...state, view: "setup", rapid: null, ...CLEARED };

    case "SHOW_SCOREBOARD":
      return { ...state, view: "scoreboard", ...CLEARED };

    case "SHOW_WINNER": {
      if (!state.session) return state;
      return {
        ...state,
        session: { ...state.session, status: "completed" },
        view: "winner",
        rapid: null,
        ...CLEARED,
      };
    }

    case "OPEN_ROUND": {
      if (!state.session || !state.content) return state;
      const round = state.content.rounds.find((r) => r.id === action.roundId);
      if (!round) return state;
      return {
        ...state,
        session: { ...state.session, currentRoundId: round.id, currentQuestionId: null },
        view: round.type === "picture" ? "board" : "board",
        ...CLEARED,
      };
    }

    /* ---- question flow ---- */
    case "SELECT_QUESTION": {
      if (!state.session) return state;
      const q = getQuestion(state, action.questionId);
      const round = currentRound(state);
      if (!q || !round || isUsed(state, q.id)) return state;
      const isPicture = round.type === "picture";
      const seconds = isPicture
        ? state.session.settings.pictureAnswerSeconds
        : state.session.settings.normalAnswerSeconds;
      return {
        ...state,
        session: {
          ...state.session,
          currentQuestionId: q.id,
          usedQuestionIds: markUsed(state.session, q.id),
        },
        view: isPicture ? "picture" : "question",
        activeQuestionId: q.id,
        revealed: false,
        stealing: false,
        pictureCorrect: [],
        timer: startTimer(seconds),
      };
    }

    case "REVEAL_ANSWER":
      return { ...state, revealed: true, timer: IDLE_TIMER };

    case "AWARD_CORRECT": {
      if (!state.session) return state;
      const team = activeTeam(state);
      if (!team) return state;
      return {
        ...state,
        session: {
          ...state.session,
          teams: award(
            state.session.teams,
            team.id,
            state.session.settings.correctPoints,
          ),
        },
        revealed: true,
        timer: IDLE_TIMER,
      };
    }

    case "OPEN_STEAL": {
      if (!state.session) return state;
      return {
        ...state,
        stealing: true,
        revealed: false,
        timer: startTimer(state.session.settings.stealAnswerSeconds),
      };
    }

    case "AWARD_STEAL": {
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          teams: award(
            state.session.teams,
            action.teamId,
            state.session.settings.stealPoints,
          ),
        },
        stealing: false,
        revealed: true,
        timer: IDLE_TIMER,
      };
    }

    case "TOGGLE_PICTURE_TEAM": {
      const has = state.pictureCorrect.includes(action.teamId);
      return {
        ...state,
        pictureCorrect: has
          ? state.pictureCorrect.filter((id) => id !== action.teamId)
          : [...state.pictureCorrect, action.teamId],
      };
    }

    case "AWARD_PICTURE": {
      if (!state.session) return state;
      let teams = state.session.teams;
      for (const id of state.pictureCorrect) {
        teams = award(teams, id, state.session.settings.picturePoints);
      }
      return {
        ...state,
        session: { ...state.session, teams },
        revealed: true,
        timer: IDLE_TIMER,
      };
    }

    case "CLOSE_QUESTION": {
      if (!state.session) return state;
      const round = currentRound(state);
      // Rotate the starting team only after a standard question.
      const activeTeamIndex =
        round && round.type === "standard"
          ? rotate(state.session)
          : state.session.activeTeamIndex;
      return {
        ...state,
        session: {
          ...state.session,
          activeTeamIndex,
          currentQuestionId: null,
        },
        view: "board",
        ...CLEARED,
      };
    }

    /* ---- rapid fire ---- */
    case "ENTER_RAPIDFIRE":
      return { ...state, view: "rapidfire", rapid: null, ...CLEARED };

    case "START_RAPIDFIRE": {
      if (!state.session || !state.content) return state;
      const pool = rapidFireQuestions(state.content);
      const dealt = pickRandomUnused(
        pool,
        state.session.usedQuestionIds,
        state.session.settings.rapidFireQuestionCount,
      );
      if (dealt.length === 0) return state;
      return {
        ...state,
        session: {
          ...state.session,
          usedQuestionIds: [...state.session.usedQuestionIds, ...dealt],
        },
        view: "rapidfire",
        rapid: {
          teamId: action.teamId,
          questionIds: dealt,
          index: 0,
          correct: 0,
          revealed: false,
          finished: false,
        },
        timer: startTimer(state.session.settings.rapidFireSeconds),
      };
    }

    case "RAPID_REVEAL":
      if (!state.rapid) return state;
      return { ...state, rapid: { ...state.rapid, revealed: true } };

    case "RAPID_NEXT": {
      const rf = state.rapid;
      if (!rf || !state.session) return state;
      const correct = rf.correct + (action.correct ? 1 : 0);
      const nextIndex = rf.index + 1;
      const finished = nextIndex >= rf.questionIds.length;
      return {
        ...state,
        session: action.correct
          ? {
              ...state.session,
              teams: award(
                state.session.teams,
                rf.teamId,
                state.session.settings.rapidFirePoints,
              ),
            }
          : state.session,
        rapid: { ...rf, index: nextIndex, correct, revealed: false, finished },
        timer: finished ? IDLE_TIMER : state.timer,
      };
    }

    case "RAPID_FINISH":
      if (!state.rapid) return state;
      return {
        ...state,
        rapid: { ...state.rapid, finished: true },
        timer: IDLE_TIMER,
      };

    case "EXIT_RAPIDFIRE":
      return { ...state, view: "home", rapid: null, ...CLEARED };

    /* ---- score admin ---- */
    case "ADJUST_SCORE": {
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          teams: award(state.session.teams, action.teamId, action.amount),
        },
      };
    }

    default:
      return state;
  }
}

/* ------------------------------------------------------------------ *
 * Projector projection — derive the /display doc from host state.
 * ------------------------------------------------------------------ */

function scoresOf(session: SessionState): LiveScore[] {
  return rankedTeams(session.teams).map((t) => ({
    id: t.id,
    name: t.name,
    score: t.score,
  }));
}

export function buildLive(state: HostState): LiveDisplay | null {
  const { session, content } = state;
  if (!session || !content) return null;

  const base: LiveDisplay = {
    screen: "welcome",
    roundId: session.currentRoundId,
    roundName: null,
    questionId: null,
    questionNumber: null,
    question: null,
    answer: null,
    imageUrl: null,
    showAnswer: false,
    activeTeamId: null,
    activeTeamName: null,
    message: null,
    timer: state.timer,
    board: null,
    scores: scoresOf(session),
    rapidFire: null,
    updatedAt: Date.now(),
  };

  const round = currentRound(state);
  const team = activeTeam(state);
  const q = getQuestion(state, state.activeQuestionId);

  switch (state.view) {
    case "setup":
      return { ...base, screen: "welcome", message: `${session.subtitle} — ${session.name}`, timer: IDLE_TIMER };

    case "home":
      return { ...base, screen: "scoreboard", message: "Get ready…", timer: IDLE_TIMER };

    case "scoreboard":
      return { ...base, screen: "scoreboard", timer: IDLE_TIMER };

    case "winner":
      return { ...base, screen: "winner", timer: IDLE_TIMER };

    case "board": {
      if (!round) return { ...base, screen: "scoreboard" };
      const board = round.questionIds.map((id, i) => ({
        questionId: id,
        order: i + 1,
        used: session.usedQuestionIds.includes(id),
      }));
      return {
        ...base,
        screen: "board",
        roundName: round.name,
        activeTeamId: team?.id ?? null,
        activeTeamName: team?.name ?? null,
        board,
        timer: IDLE_TIMER,
      };
    }

    case "question": {
      if (!q || !round) return base;
      const number = round.questionIds.indexOf(q.id) + 1;
      const screen = state.revealed ? "answer" : "question";
      return {
        ...base,
        screen,
        roundName: round.name,
        questionId: q.id,
        questionNumber: number,
        question: q.question,
        answer: state.revealed ? q.answer : null,
        imageUrl: null,
        showAnswer: state.revealed,
        activeTeamId: state.stealing ? null : team?.id ?? null,
        activeTeamName: state.stealing ? null : team?.name ?? null,
        message: state.stealing ? "Open to steal!" : null,
      };
    }

    case "picture": {
      if (!q || !round) return base;
      const number = round.questionIds.indexOf(q.id) + 1;
      const screen = state.revealed ? "answer" : "question";
      return {
        ...base,
        screen,
        roundName: round.name,
        questionId: q.id,
        questionNumber: number,
        question: q.question,
        answer: state.revealed ? q.answer : null,
        imageUrl: q.imageUrl,
        showAnswer: state.revealed,
        message: "Everyone plays — whiteboards ready!",
      };
    }

    case "rapidfire": {
      const rf = state.rapid;
      if (!rf) {
        return { ...base, screen: "scoreboard", message: "Rapid fire — pick a team", timer: IDLE_TIMER };
      }
      const team2 = session.teams.find((t) => t.id === rf.teamId);
      const cur = getQuestion(state, rf.questionIds[rf.index] ?? null);
      return {
        ...base,
        screen: "rapid_fire",
        rapidFire: {
          teamName: team2?.name ?? "",
          total: rf.questionIds.length,
          index: rf.index,
          correct: rf.correct,
          question: rf.finished ? null : cur?.question ?? null,
          answer: rf.revealed && cur ? cur.answer : null,
          showAnswer: rf.revealed,
          finished: rf.finished,
        },
      };
    }

    default:
      return base;
  }
}

/* ------------------------------------------------------------------ *
 * Persistence — session via /api/state, projector via /api/live.
 * ------------------------------------------------------------------ */

const HOST_CODE_KEY = "church-quiz-app:hostCode";
const SESSION_DEBOUNCE_MS = 350;
const LIVE_DEBOUNCE_MS = 150;

export type SyncStatus = "loading" | "saving" | "saved" | "offline" | "locked" | "disabled";

function hostHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const code = window.localStorage.getItem(HOST_CODE_KEY);
    if (code) headers["x-host-code"] = code;
  }
  return headers;
}

interface SyncApi {
  status: SyncStatus;
  setHostCode: (code: string) => void;
}

const StateContext = createContext<HostState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);
const SyncContext = createContext<SyncApi | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const [status, setStatus] = useState<SyncStatus>("loading");

  const hydratedRef = useRef(false);
  const sessionTimer = useRef<number | null>(null);
  const liveTimer = useRef<number | null>(null);

  // Initial load: content (client SDK) + session (server route).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const content = await loadContent();
        if (!cancelled) dispatch({ type: "HYDRATE_CONTENT", content });
      } catch (err) {
        console.error("content load failed:", err);
      }
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (res.status === 503) {
          if (!cancelled) setStatus("disabled");
        } else if (res.ok) {
          const data = (await res.json()) as { session: SessionState | null };
          if (!cancelled) {
            if (data.session) dispatch({ type: "HYDRATE_SESSION", session: data.session });
            else dispatch({ type: "SESSION_ABSENT" });
            setStatus("saved");
          }
        }
      } catch {
        if (!cancelled) setStatus("offline");
      } finally {
        hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const { session } = state;

  // Persist the session (game doc + teams) whenever it changes.
  useEffect(() => {
    if (!hydratedRef.current || !session) return;
    setStatus((s) => (s === "disabled" || s === "locked" ? s : "saving"));
    if (sessionTimer.current) window.clearTimeout(sessionTimer.current);
    sessionTimer.current = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/state", {
          method: "PUT",
          headers: hostHeaders(),
          body: JSON.stringify(session),
        });
        if (res.status === 401) setStatus("locked");
        else if (res.status === 503) setStatus("disabled");
        else if (res.ok) setStatus("saved");
        else setStatus("offline");
      } catch {
        setStatus("offline");
      }
    }, SESSION_DEBOUNCE_MS);
  }, [session]);

  // Publish the projector doc on any visible change.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const live = buildLive(state);
    if (!live) return;
    if (liveTimer.current) window.clearTimeout(liveTimer.current);
    liveTimer.current = window.setTimeout(() => {
      void fetch("/api/live", {
        method: "PUT",
        headers: hostHeaders(),
        body: JSON.stringify(live),
      }).catch(() => {});
    }, LIVE_DEBOUNCE_MS);
    // Recompute when any of these change.
  }, [state]);

  const setHostCode = useCallback((code: string) => {
    if (typeof window !== "undefined") {
      if (code) window.localStorage.setItem(HOST_CODE_KEY, code);
      else window.localStorage.removeItem(HOST_CODE_KEY);
    }
  }, []);

  const sync: SyncApi = { status, setHostCode };

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

export function useGame(): HostState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error("useGame must be used within <GameProvider>");
  return ctx;
}

export function useDispatch(): Dispatch<Action> {
  const ctx = useContext(DispatchContext);
  if (!ctx) throw new Error("useDispatch must be used within <GameProvider>");
  return ctx;
}

// Re-export settings default for convenience.
export { DEFAULT_SETTINGS };
