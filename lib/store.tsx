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
  type LiveRoundSummary,
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

/**
 * Rapid-fire is split into two phases: every team plays first (recording the
 * host's typed transcript of what was said, no scoring), then — once every
 * team has played — the host reviews each team's answers one at a time and
 * grades them, awarding points at the end of each team's review.
 */
interface RapidPlayState {
  teamId: string;
  /** The fixed set of questions dealt to this team, in dealt order. */
  questionIds: string[];
  /** Questions still owed an answer attempt this turn; front = current.
   * Skipping moves the front id to the back so it comes up again later. */
  queue: string[];
  /** Host-typed transcript of what the team said, keyed by question id. */
  answers: Record<string, string>;
  /** True once the queue is empty (all answered) or the host ended the turn early. */
  finished: boolean;
}

/** One team's completed rapid-fire turn, awaiting review. */
interface RapidTeamResult {
  teamId: string;
  questionIds: string[];
  answers: Record<string, string>;
}

interface RapidReviewState {
  /** Team ids to review, in the order they played. */
  teamIds: string[];
  /** Index into teamIds of the team currently being reviewed. */
  currentIndex: number;
  /** Index into that team's questionIds of the question currently being judged. */
  questionIndex: number;
  /** Correct/incorrect calls made so far for the current team. */
  graded: Record<string, boolean>;
  /** True once every question for the current team has been graded and points awarded. */
  awarded: boolean;
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
  /** Team ids eligible to steal, in turn order, starting right after the team that missed. */
  stealOrder: string[];
  /** Index into stealOrder of the team currently attempting the steal; === stealOrder.length means it's the audience's turn. */
  stealIndex: number;
  pictureCorrect: string[]; // picture round: team ids marked correct
  awarded: boolean; // points already awarded for current question
  /** The last points award(s) for the current question, so UNDO_QUESTION can retract them. */
  lastAward: { teamId: string; amount: number }[] | null;

  rapid: RapidPlayState | null;
  /** Team ids still due a rapid-fire turn, in order (least points first, ties
   * broken alphabetically) — locked in when the round is first entered, and
   * consumed as each team finishes their turn. Null until first entered. */
  rapidQueue: string[] | null;
  /** Completed team turns awaiting review, in play order. */
  rapidCompleted: RapidTeamResult[];
  /** Active grading pass over rapidCompleted, or null before review starts. */
  rapidReview: RapidReviewState | null;
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

/** Whether the steal has cycled past every other team — the audience's turn, no points. */
export function isAudienceSteal(state: HostState): boolean {
  return state.stealing && state.stealIndex >= state.stealOrder.length;
}

/** The team currently attempting the steal, or null if it's the audience's turn. */
export function currentStealTeam(state: HostState): SessionTeam | null {
  if (!state.session || !state.stealing) return null;
  const id = state.stealOrder[state.stealIndex];
  if (!id) return null;
  return state.session.teams.find((t) => t.id === id) ?? null;
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
  | { type: "REORDER_TEAMS"; teamIds: string[] }
  | { type: "RANDOMIZE_TEAMS" }
  | { type: "REVERSE_TEAM_ORDER" }
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
  | { type: "START_QUESTION_TIMER" } // host is ready — start the main answer clock
  | { type: "REVEAL_ANSWER" }
  | { type: "AWARD_CORRECT" } // active team answered
  | { type: "OPEN_STEAL" }
  | { type: "STEAL_MISS" } // current steal attempt missed too — advance to the next team (or the audience)
  | { type: "START_STEAL_TURN" } // host is ready — start the clock for the now-current steal team
  | { type: "AWARD_STEAL" } // current team in the steal order answered correctly
  | { type: "UNDO_QUESTION" } // retract the last decision (award + points, or open-steal) for the current question
  | { type: "TOGGLE_PICTURE_TEAM"; teamId: string } // picture round
  | { type: "AWARD_PICTURE" }
  | { type: "CLOSE_QUESTION" }
  // rapid fire — play phase (every team plays before anyone is scored)
  | { type: "ENTER_RAPIDFIRE" }
  | { type: "RAPID_RECORD_ANSWER"; text: string }
  | { type: "RAPID_SKIP" }
  | { type: "RAPID_FINISH" } // host ends the current team's turn early (e.g. time's up)
  | { type: "EXIT_RAPIDFIRE" }
  // rapid fire — review phase (after every team has played)
  | { type: "RAPID_REVIEW_START" }
  | { type: "RAPID_REVIEW_GRADE"; correct: boolean }
  | { type: "RAPID_REVIEW_NEXT_TEAM" }
  | { type: "RAPID_REVIEW_DONE" }
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

/**
 * If the in-progress rapid-fire turn has been finished (completed or ended
 * early), fold it into the completed list and drop it from the play queue —
 * so leaving the round (Home, EXIT_RAPIDFIRE) never silently loses a team's
 * recorded answers before they've been reviewed.
 */
function archiveFinishedRapid(
  state: HostState,
): { queue: string[] | null; completed: RapidTeamResult[] } {
  const rf = state.rapid;
  if (!rf || !rf.finished) {
    return { queue: state.rapidQueue, completed: state.rapidCompleted };
  }
  return {
    queue: (state.rapidQueue ?? []).filter((id) => id !== rf.teamId),
    completed: [
      ...state.rapidCompleted,
      { teamId: rf.teamId, questionIds: rf.questionIds, answers: rf.answers },
    ],
  };
}

/**
 * Steal turn order: every other team, starting with the one immediately after
 * the team that missed and wrapping around — but never including that team
 * itself (getting back around to them means the audience's turn instead).
 */
function stealOrderFor(session: SessionState): string[] {
  const { teamOrder, activeTeamIndex } = session;
  const n = teamOrder.length;
  if (n <= 1) return [];
  const order: string[] = [];
  for (let i = 1; i < n; i++) {
    order.push(teamOrder[(activeTeamIndex + i) % n]);
  }
  return order;
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
  stealOrder: [] as string[],
  stealIndex: 0,
  pictureCorrect: [] as string[],
  timer: IDLE_TIMER,
  awarded: false,
  lastAward: null,
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
    stealOrder: [],
    stealIndex: 0,
    pictureCorrect: [],
    rapid: null,
    rapidQueue: null,
    rapidCompleted: [],
    rapidReview: null,
    timer: IDLE_TIMER,
    awarded: false,
    lastAward: null,
  };
}

function reducer(state: HostState, action: Action): HostState {
  switch (action.type) {
    case "HYDRATE_CONTENT":
      return { ...state, content: action.content };

    case "HYDRATE_SESSION": {
      const s = {
        ...action.session,
        settings: {
          ...DEFAULT_SETTINGS,
          ...(action.session.settings || {}),
          // Enforce 60s per question / 20s steal defaults even if old save had 20/30/10
          normalAnswerSeconds:
            action.session.settings?.normalAnswerSeconds &&
            action.session.settings.normalAnswerSeconds > 30
              ? action.session.settings.normalAnswerSeconds
              : 60,
          stealAnswerSeconds:
            action.session.settings?.stealAnswerSeconds &&
            action.session.settings.stealAnswerSeconds > 10
              ? action.session.settings.stealAnswerSeconds
              : 20,
          pictureAnswerSeconds:
            action.session.settings?.pictureAnswerSeconds &&
            action.session.settings.pictureAnswerSeconds > 30
              ? action.session.settings.pictureAnswerSeconds
              : 60,
        },
      };
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

    case "REORDER_TEAMS": {
      if (!state.session) return state;
      const byId = new Map(state.session.teams.map((t) => [t.id, t]));
      const teams = action.teamIds
        .map((id) => byId.get(id))
        .filter((t): t is SessionTeam => !!t)
        .map((t, i) => ({ ...t, order: i }));
      if (teams.length !== state.session.teams.length) return state;
      return {
        ...state,
        session: { ...state.session, teams, teamOrder: teams.map((t) => t.id) },
      };
    }

    case "RANDOMIZE_TEAMS": {
      if (!state.session) return state;
      const shuffled = [...state.session.teams];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      const teams = shuffled.map((t, i) => ({ ...t, order: i }));
      return {
        ...state,
        session: { ...state.session, teams, teamOrder: teams.map((t) => t.id) },
      };
    }

    case "REVERSE_TEAM_ORDER": {
      if (!state.session) return state;
      const activeId = activeTeamIdOf(state.session);
      const teams = [...state.session.teams]
        .sort((a, b) => a.order - b.order)
        .reverse()
        .map((t, i) => ({ ...t, order: i }));
      const teamOrder = teams.map((t) => t.id);
      const activeTeamIndex = activeId ? teamOrder.indexOf(activeId) : -1;
      return {
        ...state,
        session: {
          ...state.session,
          teams,
          teamOrder,
          activeTeamIndex:
            activeTeamIndex >= 0
              ? activeTeamIndex
              : state.session.activeTeamIndex,
        },
      };
    }

    case "START_GAME": {
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          status: "active",
          currentRoundId: null,
          currentQuestionId: null,
        },
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
        rapidQueue: null,
        rapidCompleted: [],
        rapidReview: null,
        ...CLEARED,
      };
    }

    /* ---- navigation ---- */
    case "GO_HOME": {
      const { queue, completed } = archiveFinishedRapid(state);
      return {
        ...state,
        session: state.session
          ? { ...state.session, currentRoundId: null, currentQuestionId: null }
          : state.session,
        view: "home",
        rapid: null,
        rapidQueue: queue,
        rapidCompleted: completed,
        ...CLEARED,
      };
    }

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
        stealOrder: [],
        stealIndex: 0,
        pictureCorrect: [],
        awarded: false,
        lastAward: null,
        // The clock stays paused until the host clicks "Start Timer" — gives
        // them time to read the question aloud first.
        timer: IDLE_TIMER,
      };
    }

    case "START_QUESTION_TIMER": {
      if (!state.session || !state.activeQuestionId || state.awarded) return state;
      const round = currentRound(state);
      if (!round) return state;
      const isPicture = round.type === "picture";
      const rawSeconds = isPicture
        ? state.session.settings.pictureAnswerSeconds
        : state.session.settings.normalAnswerSeconds;
      const seconds = rawSeconds && rawSeconds > 30 ? rawSeconds : 60;
      return { ...state, timer: startTimer(seconds) };
    }

    case "REVEAL_ANSWER":
      return { ...state, revealed: true, stealing: false, timer: IDLE_TIMER };

    case "AWARD_CORRECT": {
      if (!state.session || state.awarded) return state;
      const team = activeTeam(state);
      if (!team) return state;
      const amount = state.session.settings.correctPoints;
      return {
        ...state,
        session: {
          ...state.session,
          teams: award(state.session.teams, team.id, amount),
        },
        lastAward: [{ teamId: team.id, amount }],
        revealed: true,
        awarded: true,
        timer: IDLE_TIMER,
      };
    }

    case "OPEN_STEAL": {
      if (!state.session || state.awarded) return state;
      // Determine who's up next but leave the clock paused — the host starts
      // it with START_STEAL_TURN once they're ready to announce the team.
      return {
        ...state,
        stealing: true,
        stealOrder: stealOrderFor(state.session),
        stealIndex: 0,
        revealed: false,
        timer: IDLE_TIMER,
      };
    }

    case "STEAL_MISS": {
      if (!state.session || !state.stealing || state.awarded) return state;
      // The audience already had their shot and missed too — close it out, no points.
      if (state.stealIndex >= state.stealOrder.length) {
        return {
          ...state,
          stealing: false,
          revealed: true,
          awarded: true,
          timer: IDLE_TIMER,
        };
      }
      // Advance to the next team in line (or the audience, once the order is
      // exhausted), but leave the clock paused until the host starts it.
      return {
        ...state,
        stealIndex: state.stealIndex + 1,
        timer: IDLE_TIMER,
      };
    }

    case "START_STEAL_TURN": {
      if (!state.session || !state.stealing || state.awarded) return state;
      const rawSteal = state.session.settings.stealAnswerSeconds;
      const stealSeconds = rawSteal && rawSteal > 10 ? rawSteal : 20;
      return { ...state, timer: startTimer(stealSeconds) };
    }

    case "AWARD_STEAL": {
      if (!state.session || state.awarded) return state;
      const team = currentStealTeam(state);
      if (!team) return state;
      const amount = state.session.settings.stealPoints;
      return {
        ...state,
        session: {
          ...state.session,
          teams: award(state.session.teams, team.id, amount),
        },
        lastAward: [{ teamId: team.id, amount }],
        stealing: false,
        revealed: true,
        awarded: true,
        timer: IDLE_TIMER,
      };
    }

    case "UNDO_QUESTION": {
      if (!state.session || !state.activeQuestionId) return state;
      // Only meaningful once a decision has been made (points awarded, or
      // paused between steal turns) — otherwise there's nothing to undo.
      const pendingStealTurn = state.stealing && state.timer.endsAt === null;
      if (!state.awarded && !pendingStealTurn) return state;
      let teams = state.session.teams;
      for (const a of state.lastAward ?? []) {
        teams = award(teams, a.teamId, -a.amount);
      }
      return {
        ...state,
        session: { ...state.session, teams },
        revealed: false,
        stealing: false,
        stealOrder: [],
        stealIndex: 0,
        pictureCorrect: [],
        awarded: false,
        lastAward: null,
        // Back to the pristine, pre-start state — the host starts the clock again when ready.
        timer: IDLE_TIMER,
      };
    }

    case "TOGGLE_PICTURE_TEAM": {
      if (state.awarded) return state;
      const has = state.pictureCorrect.includes(action.teamId);
      return {
        ...state,
        pictureCorrect: has
          ? state.pictureCorrect.filter((id) => id !== action.teamId)
          : [...state.pictureCorrect, action.teamId],
      };
    }

    case "AWARD_PICTURE": {
      if (!state.session || state.awarded) return state;
      const amount = state.session.settings.picturePoints;
      let teams = state.session.teams;
      for (const id of state.pictureCorrect) {
        teams = award(teams, id, amount);
      }
      return {
        ...state,
        session: { ...state.session, teams },
        lastAward: state.pictureCorrect.map((teamId) => ({ teamId, amount })),
        revealed: true,
        awarded: true,
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

    /* ---- rapid fire: play phase ---- */
    case "ENTER_RAPIDFIRE": {
      if (state.rapidReview) {
        // Resume an in-progress review pass rather than restarting play.
        return { ...state, view: "rapidfire" };
      }
      if (!state.session || !state.content) {
        return { ...state, ...CLEARED, view: "rapidfire", rapid: null };
      }

      // Fold the just-finished team's turn into the completed list.
      const { queue: archivedQueue, completed } = archiveFinishedRapid(state);

      // Lock in a fresh turn order only on a true first entry (queue still
      // null); once a full pass empties it, stop and wait for review.
      const queue =
        archivedQueue === null
          ? [...state.session.teams]
              .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
              .map((t) => t.id)
          : archivedQueue;

      const nextTeamId = queue[0] ?? null;
      const dealt = nextTeamId
        ? pickRandomUnused(
            rapidFireQuestions(state.content),
            state.session.usedQuestionIds,
            state.session.settings.rapidFireQuestionCount,
          )
        : [];

      if (!nextTeamId || dealt.length === 0) {
        return {
          ...state,
          ...CLEARED,
          view: "rapidfire",
          rapid: null,
          rapidQueue: queue,
          rapidCompleted: completed,
        };
      }

      return {
        ...state,
        ...CLEARED,
        session: {
          ...state.session,
          usedQuestionIds: [...state.session.usedQuestionIds, ...dealt],
        },
        view: "rapidfire",
        rapid: {
          teamId: nextTeamId,
          questionIds: dealt,
          queue: [...dealt],
          answers: {},
          finished: false,
        },
        rapidQueue: queue,
        rapidCompleted: completed,
        timer: startTimer(state.session.settings.rapidFireSeconds),
      };
    }

    case "RAPID_RECORD_ANSWER": {
      const rf = state.rapid;
      if (!rf || rf.finished) return state;
      const qid = rf.queue[0];
      if (!qid) return state;
      const answers = { ...rf.answers, [qid]: action.text };
      const queue = rf.queue.slice(1);
      const finished = queue.length === 0;
      return {
        ...state,
        rapid: { ...rf, answers, queue, finished },
        timer: finished ? IDLE_TIMER : state.timer,
      };
    }

    case "RAPID_SKIP": {
      const rf = state.rapid;
      if (!rf || rf.finished || rf.queue.length <= 1) return state;
      const [front, ...rest] = rf.queue;
      return { ...state, rapid: { ...rf, queue: [...rest, front] } };
    }

    case "RAPID_FINISH": {
      // The host is ending the current team's turn early (e.g. time's up) —
      // archiving happens on the next ENTER_RAPIDFIRE / on leaving the round.
      const rf = state.rapid;
      if (!rf) return state;
      return {
        ...state,
        rapid: { ...rf, finished: true },
        timer: IDLE_TIMER,
      };
    }

    case "EXIT_RAPIDFIRE": {
      const { queue, completed } = archiveFinishedRapid(state);
      return {
        ...state,
        session: state.session
          ? { ...state.session, currentRoundId: null, currentQuestionId: null }
          : state.session,
        view: "home",
        rapid: null,
        rapidQueue: queue,
        rapidCompleted: completed,
        ...CLEARED,
      };
    }

    /* ---- rapid fire: review phase ---- */
    case "RAPID_REVIEW_START": {
      if (state.rapidCompleted.length === 0) return state;
      return {
        ...state,
        rapidReview: {
          teamIds: state.rapidCompleted.map((r) => r.teamId),
          currentIndex: 0,
          questionIndex: 0,
          graded: {},
          awarded: false,
        },
      };
    }

    case "RAPID_REVIEW_GRADE": {
      const rv = state.rapidReview;
      if (!rv || rv.awarded || !state.session) return state;
      const teamId = rv.teamIds[rv.currentIndex];
      const result = state.rapidCompleted.find((r) => r.teamId === teamId);
      if (!teamId || !result) return state;
      const qid = result.questionIds[rv.questionIndex];
      if (!qid) return state;

      const graded = { ...rv.graded, [qid]: action.correct };
      const questionIndex = rv.questionIndex + 1;
      const teamDone = questionIndex >= result.questionIds.length;

      if (!teamDone) {
        return { ...state, rapidReview: { ...rv, questionIndex, graded } };
      }

      const correctCount = Object.values(graded).filter(Boolean).length;
      const points = correctCount * state.session.settings.rapidFirePoints;
      return {
        ...state,
        session: {
          ...state.session,
          teams: award(state.session.teams, teamId, points),
        },
        rapidReview: { ...rv, questionIndex, graded, awarded: true },
      };
    }

    case "RAPID_REVIEW_NEXT_TEAM": {
      const rv = state.rapidReview;
      if (!rv || !rv.awarded) return state;
      return {
        ...state,
        rapidReview: {
          ...rv,
          currentIndex: rv.currentIndex + 1,
          questionIndex: 0,
          graded: {},
          awarded: false,
        },
      };
    }

    case "RAPID_REVIEW_DONE":
      return {
        ...state,
        session: state.session
          ? { ...state.session, currentRoundId: null, currentQuestionId: null }
          : state.session,
        view: "home",
        rapid: null,
        rapidQueue: null,
        rapidCompleted: [],
        rapidReview: null,
        ...CLEARED,
      };

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
  return [...session.teams]
    .sort((a, b) => a.order - b.order)
    .map((t) => ({
      id: t.id,
      name: t.name,
      score: t.score,
    }));
}

function roundsSummaryOf(content: GameContent, session: SessionState): LiveRoundSummary[] {
  const used = new Set(session.usedQuestionIds);
  return content.rounds.map((r) => ({
    id: r.id,
    order: r.order,
    name: r.name,
    description: r.description,
    type: r.type,
    totalQuestions: r.questionIds.length,
    remainingQuestions: r.questionIds.filter((id) => !used.has(id)).length,
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
    rounds: roundsSummaryOf(content, session),
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
      return {
        ...base,
        screen: "rounds",
        roundId: null,
        roundName: null,
        roundDescription: null,
        questionId: null,
        questionNumber: null,
        question: null,
        answer: null,
        imageUrl: null,
        showAnswer: false,
        activeTeamId: null,
        activeTeamName: null,
        message: "Let's Begin!",
        timer: IDLE_TIMER,
      };

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
        roundId: round.id,
        roundName: round.name,
        roundDescription: round.description ?? null,
        roundOrder: round.order,
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
      const board = round.questionIds.map((id, i) => ({
        questionId: id,
        order: i + 1,
        used: session.usedQuestionIds.includes(id),
      }));
      const stealTeam = currentStealTeam(state);
      const audienceTurn = isAudienceSteal(state);
      return {
        ...base,
        screen,
        roundId: round.id,
        roundName: round.name,
        roundDescription: round.description ?? null,
        roundOrder: round.order,
        questionId: q.id,
        questionNumber: number,
        question: q.question,
        answer: state.revealed ? q.answer : null,
        imageUrl: null,
        showAnswer: state.revealed,
        activeTeamId: state.stealing ? (stealTeam?.id ?? null) : team?.id ?? null,
        activeTeamName: state.stealing ? (stealTeam?.name ?? null) : team?.name ?? null,
        message: state.stealing
          ? audienceTurn
            ? "Audience steal — no points!"
            : `Steal attempt: ${stealTeam?.name ?? ""}`
          : null,
        board,
      };
    }

    case "picture": {
      if (!q || !round) return base;
      const number = round.questionIds.indexOf(q.id) + 1;
      const screen = state.revealed ? "answer" : "question";
      const board = round.questionIds.map((id, i) => ({
        questionId: id,
        order: i + 1,
        used: session.usedQuestionIds.includes(id),
      }));
      return {
        ...base,
        screen,
        roundId: round.id,
        roundName: round.name,
        roundDescription: round.description ?? null,
        roundOrder: round.order,
        questionId: q.id,
        questionNumber: number,
        question: q.question,
        answer: state.revealed ? q.answer : null,
        imageUrl: q.imageUrl ?? null,
        showAnswer: state.revealed,
        message: "Everyone plays — whiteboards ready!",
        board,
      };
    }

    case "rapidfire": {
      if (state.rapidReview) {
        const rv = state.rapidReview;
        const teamId = rv.teamIds[rv.currentIndex];
        const team = teamId ? session.teams.find((t) => t.id === teamId) : null;
        return {
          ...base,
          screen: "scoreboard",
          message: team
            ? `Reviewing ${team.name}'s Rapid Fire answers…`
            : "Rapid Fire review complete!",
          timer: IDLE_TIMER,
        };
      }
      const rf = state.rapid;
      if (!rf) {
        return { ...base, screen: "scoreboard", message: "Rapid Fire", timer: IDLE_TIMER };
      }
      const team2 = session.teams.find((t) => t.id === rf.teamId);
      const cur = getQuestion(state, rf.queue[0] ?? null);
      return {
        ...base,
        screen: "rapid_fire",
        rapidFire: {
          teamName: team2?.name ?? "",
          total: rf.questionIds.length,
          answered: rf.questionIds.length - rf.queue.length,
          question: rf.finished ? null : cur?.question ?? null,
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
  const latestLiveRef = useRef<LiveDisplay | null>(null);
  const publishInFlightRef = useRef(false);
  const publishPendingRef = useRef(false);
  const publishRetryTimer = useRef<number | null>(null);

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
    latestLiveRef.current = live;

    const doPublish = async () => {
      if (publishInFlightRef.current) {
        publishPendingRef.current = true;
        return;
      }
      publishInFlightRef.current = true;
      publishPendingRef.current = false;
      const toSend = latestLiveRef.current;
      if (!toSend) {
        publishInFlightRef.current = false;
        return;
      }

      try {
        const res = await fetch("/api/live", {
          method: "PUT",
          headers: hostHeaders(),
          body: JSON.stringify(toSend),
        });
        if (!res.ok) {
          throw new Error(`Publish failed with status ${res.status}`);
        }
      } catch (err) {
        console.warn("Live publish failed, will retry:", err);
        if (publishRetryTimer.current) window.clearTimeout(publishRetryTimer.current);
        publishRetryTimer.current = window.setTimeout(() => {
          void doPublish();
        }, 1000);
      } finally {
        publishInFlightRef.current = false;
        if (publishPendingRef.current) {
          void doPublish();
        }
      }
    };

    if (liveTimer.current) window.clearTimeout(liveTimer.current);
    liveTimer.current = window.setTimeout(() => {
      void doPublish();
    }, LIVE_DEBOUNCE_MS);

    return () => {
      if (liveTimer.current) window.clearTimeout(liveTimer.current);
    };
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
