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
  rapidFireGroups,
  rapidFireQuestions,
  tiebreakerQuestions,
  type GameContent,
  type QuestionDoc,
  type RoundDoc,
} from "./content";
import {
  activeTeamId as activeTeamIdOf,
  DEFAULT_SETTINGS,
  type RapidFireResult,
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
import type { HostMirror } from "./hostMirror";
import type { HostLock } from "./hostLock";
import { loadContent, subscribeHostLock, subscribeHostMirror } from "./firebaseClient";
import { buildRulesPages } from "./rulesContent";

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
  | "tiebreaker" // sudden-death tiebreaker flow
  | "scoreboard" // full standings
  | "winner"; // final results

// Same shape as LiveTimer so it maps straight into the projector doc.
type HostTimer = LiveTimer;

/**
 * Rapid-fire is split into two phases: every team plays first (recording the
 * host's typed transcript of what was said, no scoring), then — once every
 * team has played — the host reviews each team's answers one at a time and
 * grades them, awarding points at the end of each team's review. The play
 * queue, completed transcripts, and review progress all live on the
 * persisted session (see lib/session.ts) so a host refresh can't lose them;
 * only the single team currently mid-turn is kept here, ephemerally.
 */
interface RapidPlayState {
  teamId: string;
  /** The fixed set of questions dealt to this team, in dealt order. */
  questionIds: string[];
  /** Index into questionIds of whichever one the host is currently reading
   * aloud — shown highlighted on host/speaker (and mirrored to the
   * display). All 5 answer boxes stay editable regardless of this. */
  currentIndex: number;
  /** Host-typed transcript of what the team said, keyed by question id —
   * editable for any question at any time, not just the current one. */
  answers: Record<string, string>;
  /** Host's answered/skipped decision per question id — absent means still
   * pending. See RAPID_MARK_QUESTION: skipped questions come back around
   * (in dealt order) until every question is answered or time runs out. */
  questionStatus: Record<string, "answered" | "skipped">;
  /** True once the host ends the turn. */
  finished: boolean;
  /** False on deal — shows a "get ready" intro until the host presses Start. */
  started: boolean;
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
  tiebreakerCorrect: string[]; // tiebreaker: team ids marked correct this question
  awarded: boolean; // points already awarded for current question
  /** The last points award(s) for the current question, so UNDO_QUESTION can retract them. */
  lastAward: { teamId: string; amount: number }[] | null;
  /** One-shot cue for the projector to play a "correct"/"wrong" sound — see
   * LiveDisplay.answerCue. Bumped by every grading decision (AWARD_CORRECT,
   * STEAL_MISS, etc.), never read back except by nonce comparison. */
  answerCue: { correct: boolean; nonce: number } | null;

  /** The single team currently mid-turn (not yet persisted — see note above). */
  rapid: RapidPlayState | null;
  timer: HostTimer;

  /** How-to-play guide overlay — auto-opened on a fresh START_GAME, and
   * reopenable any time from the gear menu. Mirrored to the projector (see
   * buildLive) so the audience follows the same page, but not to the
   * read-only speaker mirror. */
  rulesOpen: boolean;
  rulesPage: number;
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

/**
 * Whichever team should glow as "up now" on the persistent scoreboard bar —
 * the standard/picture round's active team, or during Rapid Fire, whoever's
 * mid-turn (or up next, before a group's been dealt), or whoever's being
 * graded during the review pass.
 */
export function currentTurnTeam(state: HostState): SessionTeam | null {
  const { session } = state;
  if (!session) return null;
  if (state.view === "rapidfire") {
    if (session.rapidReview) {
      const id =
        session.rapidReview.teamIds[session.rapidReview.currentIndex] ?? null;
      return id ? (session.teams.find((t) => t.id === id) ?? null) : null;
    }
    const id = state.rapid?.teamId ?? session.rapidQueue?.[0] ?? null;
    return id ? (session.teams.find((t) => t.id === id) ?? null) : null;
  }
  return activeTeam(state);
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

/** How many of this round's questions have already been played. */
function roundPlayedCount(session: SessionState, round: RoundDoc): number {
  return round.questionIds.filter((id) => session.usedQuestionIds.includes(id))
    .length;
}

/**
 * Once every team has had one turn in a standard round, the remaining
 * questions are open "for fun" bonus questions for the whole audience — no
 * team is assigned and no points are awarded. The Picture Round is exempt
 * (everyone already plays every question there).
 */
export function isAudienceQuestion(state: HostState): boolean {
  const { session } = state;
  const round = currentRound(state);
  if (!session || !round || round.type !== "standard") return false;
  const teamCount = session.teamOrder.length;
  if (teamCount === 0) return false;
  return roundPlayedCount(session, round) > teamCount;
}

/**
 * Same check as isAudienceQuestion, but for the *next* question about to be
 * picked from the board (before it's marked used) — lets the board show
 * "up next: audience" ahead of time.
 */
export function isNextRoundQuestionAudienceTurn(
  session: SessionState,
  round: RoundDoc,
): boolean {
  if (round.type !== "standard") return false;
  const teamCount = session.teamOrder.length;
  if (teamCount === 0) return false;
  return roundPlayedCount(session, round) >= teamCount;
}

/** Teams sorted highest-score first (stable by roster order on ties). */
export function rankedTeams(teams: SessionTeam[]): SessionTeam[] {
  return [...teams].sort((a, b) => b.score - a.score || a.order - b.order);
}

/**
 * Teams tied for 1st place with a score above zero — the tiebreaker only
 * makes sense once at least two teams share the top score. Returns an empty
 * array otherwise (including the all-zero case before anyone has scored).
 */
export function tiedForFirst(teams: SessionTeam[]): SessionTeam[] {
  if (teams.length === 0) return [];
  const top = Math.max(...teams.map((t) => t.score));
  if (top <= 0) return [];
  const tied = teams.filter((t) => t.score === top);
  return tied.length >= 2 ? tied : [];
}

/**
 * The id of whichever round/Rapid Fire/Tiebreaker the host should play
 * next, in the fixed sequence rounds (in order) → Rapid Fire → Tiebreaker
 * — used to put a glow on that card everywhere (host, speaker, display).
 * Returns null once nothing playable is left (game over, no tie).
 */
export function currentFocusId(
  content: GameContent,
  session: SessionState,
): string | null {
  const used = new Set(session.usedQuestionIds);
  const nextRound = [...content.rounds]
    .sort((a, b) => a.order - b.order)
    .find((r) => r.questionIds.some((id) => !used.has(id)));
  if (nextRound) return nextRound.id;
  if (!session.rapidFireCompleted) return "rapid-fire";
  if (tiedForFirst(session.teams).length > 0) return "tiebreaker";
  return null;
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
  | { type: "SELECT_TEAM_TURN"; teamId: string } // host manually overrides whose turn is current, just in case
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
  | { type: "RAPID_SELECT_GROUP"; groupKey: string } // host picks a lettered group for the up-next team
  | { type: "RAPID_BEGIN_TURN" } // host presses Start on the "get ready" intro
  | { type: "RAPID_RECORD_ANSWER"; questionId: string; text: string } // editable for any of the 5 questions, any time
  | { type: "RAPID_SET_CURRENT_QUESTION"; index: number } // host clicks a question row to highlight it as current — never fired by typing an answer
  | { type: "RAPID_MARK_QUESTION"; questionId: string; status: "answered" | "skipped" } // marking the current question auto-advances; skips cycle back around
  | { type: "RAPID_FINISH" } // host ends the current team's turn early (e.g. time's up)
  | { type: "EXIT_RAPIDFIRE" }
  // rapid fire — review phase (after every team has played)
  | { type: "RAPID_REVIEW_START" }
  | { type: "RAPID_REVIEW_GRADE"; correct: boolean } // reveals + grades the current question in one step
  | { type: "RAPID_REVIEW_NEXT_TEAM" }
  | { type: "RAPID_REVIEW_DONE" }
  // sudden-death tiebreaker
  | { type: "ENTER_TIEBREAKER" } // host picks the Tiebreaker card on Home
  | { type: "START_TIEBREAKER_TIMER" }
  | { type: "TOGGLE_TIEBREAKER_TEAM"; teamId: string }
  | { type: "AWARD_TIEBREAKER" }
  | { type: "NEXT_TIEBREAKER_QUESTION" } // still tied — deal another question to the same teams
  | { type: "FINISH_TIEBREAKER" } // resolved (or abandoned) — back to Home
  // scores admin
  | { type: "ADJUST_SCORE"; teamId: string; amount: number }
  // how-to-play guide
  | { type: "OPEN_RULES" }
  | { type: "CLOSE_RULES" }
  | { type: "RULES_NEXT" }
  | { type: "RULES_BACK" }
  | { type: "RULES_GOTO"; page: number }

  | { type: "TOGGLE_AUDIO_MUTED" }; // host controls whether the projector plays sound

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

/** The next not-yet-played question from the tiebreaker pool, in authored order. */
function nextTiebreakerQuestion(
  content: GameContent,
  session: SessionState,
): QuestionDoc | null {
  const used = new Set(session.usedQuestionIds);
  return tiebreakerQuestions(content).find((q) => !used.has(q.id)) ?? null;
}

function startTimer(seconds: number): HostTimer {
  return {
    running: true,
    endsAt: Date.now() + seconds * 1000,
    durationSeconds: seconds,
  };
}

/**
 * Where the rapid-fire cursor should land after marking `fromIndex`
 * answered or skipped: the next question (in dealt order, wrapping around)
 * that isn't already answered. Because the search wraps and only reaches
 * `fromIndex` again last, a skipped question is revisited only once every
 * other question has had a turn — so skips cycle back around in order
 * instead of being asked again immediately. Returns null once everything
 * is answered.
 */
function nextPendingIndex(
  questionIds: string[],
  status: Record<string, "answered" | "skipped">,
  fromIndex: number,
): number | null {
  for (let step = 1; step <= questionIds.length; step++) {
    const idx = (fromIndex + step) % questionIds.length;
    if (status[questionIds[idx]] !== "answered") return idx;
  }
  return null;
}

/**
 * If the in-progress rapid-fire turn has been finished (completed or ended
 * early), fold it into the completed list and drop it from the play queue —
 * so leaving the round (Home, EXIT_RAPIDFIRE) never silently loses a team's
 * recorded answers before they've been reviewed.
 */
function archiveFinishedRapid(
  state: HostState,
): { queue: string[] | null; completed: RapidFireResult[] } {
  const session = state.session;
  const rf = state.rapid;
  const queue = session?.rapidQueue ?? null;
  const completed = session?.rapidCompleted ?? [];
  if (!rf || !rf.finished) {
    return { queue, completed };
  }
  return {
    queue: (queue ?? []).filter((id) => id !== rf.teamId),
    completed: [
      ...completed,
      { teamId: rf.teamId, questionIds: rf.questionIds, answers: rf.answers },
    ],
  };
}

/**
 * Team turn-order direction/starting point, keyed off a round "slot" — a
 * real round's `order`, or Rapid Fire's virtual slot (one past the last
 * round). Rounds before the Picture Round move forward through the roster
 * starting at team 1, 2, 3…; the Picture Round itself has no turn order
 * (everyone plays at once); rounds after it — and Rapid Fire — move
 * backward, continuing that same sweep from the last team down.
 */
function pictureRoundOrder(content: GameContent): number {
  return content.rounds.find((r) => r.type === "picture")?.order ?? Infinity;
}

/** Rapid Fire's virtual slot in the round sequence — one past the last real round. */
function rapidFireOrderSlot(content: GameContent): number {
  return content.rounds.reduce((max, r) => Math.max(max, r.order), 0) + 1;
}

function turnDirectionFor(order: number, content: GameContent): 1 | -1 {
  return order < pictureRoundOrder(content) ? 1 : -1;
}

function turnStartIndexFor(
  order: number,
  content: GameContent,
  teamCount: number,
): number {
  if (teamCount === 0) return 0;
  const pictureOrder = pictureRoundOrder(content);
  if (order < pictureOrder) return (order - 1) % teamCount;
  const stepsAfterPicture = order - pictureOrder;
  return (((teamCount - stepsAfterPicture) % teamCount) + teamCount) % teamCount;
}

/** All team ids in roster order starting at `startIndex` and stepping by
 * `direction`, wrapping around exactly once so every team appears once. */
function teamRotation(
  teamOrder: string[],
  startIndex: number,
  direction: 1 | -1,
): string[] {
  const n = teamOrder.length;
  if (n === 0) return [];
  const order: string[] = [];
  for (let i = 0; i < n; i++) {
    order.push(teamOrder[(((startIndex + direction * i) % n) + n) % n]);
  }
  return order;
}

/** The current round's turn direction (defaults forward if there's no round
 * in play, e.g. rapid fire/tiebreaker — callers that need Rapid Fire's own
 * direction use turnDirectionFor(rapidFireOrderSlot(content), content) instead). */
function currentTurnDirection(state: HostState): 1 | -1 {
  const round = currentRound(state);
  if (!round || !state.content) return 1;
  return turnDirectionFor(round.order, state.content);
}

/**
 * Steal turn order: every other team, starting with the one immediately after
 * the team that missed and continuing in the round's turn direction — but
 * never including that team itself (getting back around to them means the
 * audience's turn instead).
 */
function stealOrderFor(session: SessionState, direction: 1 | -1): string[] {
  if (session.teamOrder.length <= 1) return [];
  return teamRotation(session.teamOrder, session.activeTeamIndex, direction).slice(1);
}

function rotate(session: SessionState, direction: 1 | -1): number {
  if (!session.settings.rotateStartingTeam || session.teamOrder.length === 0) {
    return session.activeTeamIndex;
  }
  const n = session.teamOrder.length;
  return (((session.activeTeamIndex + direction) % n) + n) % n;
}

const CLEARED = {
  activeQuestionId: null,
  revealed: false,
  stealing: false,
  stealOrder: [] as string[],
  stealIndex: 0,
  pictureCorrect: [] as string[],
  tiebreakerCorrect: [] as string[],
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
    tiebreakerCorrect: [],
    rapid: null,
    timer: IDLE_TIMER,
    awarded: false,
    lastAward: null,
    answerCue: null,
    rulesOpen: false,
    rulesPage: 0,
  };
}

/** Bumps the one-shot answer cue so the projector plays a fresh correct/wrong sound. */
function cue(state: HostState, correct: boolean): HostState["answerCue"] {
  return { correct, nonce: (state.answerCue?.nonce ?? 0) + 1 };
}

function reducer(state: HostState, action: Action): HostState {
  switch (action.type) {
    case "HYDRATE_CONTENT":
      return { ...state, content: action.content };

    case "HYDRATE_SESSION": {
      const s = {
        ...action.session,
        // Backward-compat: older saves predate rapid-fire persistence.
        rapidQueue: action.session.rapidQueue ?? null,
        rapidCompleted: action.session.rapidCompleted ?? [],
        rapidReview: action.session.rapidReview ?? null,
        rapidFireCompleted: action.session.rapidFireCompleted ?? false,
        tiebreaker: action.session.tiebreaker ?? null,
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

    case "SELECT_TEAM_TURN": {
      if (!state.session) return state;
      const index = state.session.teamOrder.indexOf(action.teamId);
      if (index === -1) return state;
      return {
        ...state,
        session: { ...state.session, activeTeamIndex: index },
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
        // Greet a freshly-started game with the how-to-play guide. Resuming
        // an already-active game (GO_HOME) never touches this.
        rulesOpen: true,
        rulesPage: 0,
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
          rapidQueue: null,
          rapidCompleted: [],
          rapidReview: null,
          rapidFireCompleted: false,
          tiebreaker: null,
        },
        view: "setup",
        rapid: null,
        ...CLEARED,
      };
    }

    /* ---- navigation ---- */
    case "GO_HOME": {
      const { queue, completed } = archiveFinishedRapid(state);
      return {
        ...state,
        session: state.session
          ? {
              ...state.session,
              currentRoundId: null,
              currentQuestionId: null,
              rapidQueue: queue,
              rapidCompleted: completed,
            }
          : state.session,
        view: "home",
        rapid: null,
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
      // Only set the round's fixed starting team the first time it's
      // opened — resuming a round already in progress must not restart its
      // rotation. The Picture Round has no turn order (everyone plays).
      const alreadyStarted = roundPlayedCount(state.session, round) > 0;
      const activeTeamIndex =
        round.type !== "picture" && !alreadyStarted
          ? turnStartIndexFor(round.order, state.content, state.session.teamOrder.length)
          : state.session.activeTeamIndex;
      return {
        ...state,
        session: {
          ...state.session,
          currentRoundId: round.id,
          currentQuestionId: null,
          activeTeamIndex,
        },
        view: "board",
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
      if (!state.session || state.awarded || isAudienceQuestion(state)) return state;
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
        answerCue: cue(state, true),
        timer: IDLE_TIMER,
      };
    }

    case "OPEN_STEAL": {
      if (!state.session || state.awarded || isAudienceQuestion(state)) return state;
      // Determine who's up next but leave the clock paused — the host starts
      // it with START_STEAL_TURN once they're ready to announce the team.
      return {
        ...state,
        stealing: true,
        stealOrder: stealOrderFor(state.session, currentTurnDirection(state)),
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
          answerCue: cue(state, false),
          timer: IDLE_TIMER,
        };
      }
      // Advance to the next team in line (or the audience, once the order is
      // exhausted), but leave the clock paused until the host starts it.
      return {
        ...state,
        stealIndex: state.stealIndex + 1,
        answerCue: cue(state, false),
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
        answerCue: cue(state, true),
        timer: IDLE_TIMER,
      };
    }

    case "UNDO_QUESTION": {
      if (!state.session || !state.activeQuestionId) return state;
      // Only meaningful once a decision has been made (points awarded, or
      // paused between steal turns) — otherwise there's nothing to undo.
      const pendingStealTurn =
        state.stealing && state.timer.endsAt === null && !state.awarded;
      if (!state.awarded && !pendingStealTurn) return state;
      let teams = state.session.teams;
      for (const a of state.lastAward ?? []) {
        teams = award(teams, a.teamId, -a.amount);
      }

      // Once steal mode has been opened, step back exactly one turn instead
      // of jumping all the way back to the original team: undoing an
      // awarded/missed steal attempt returns to that same team's (or the
      // audience's) "Next Team" screen, ready to start over. The only time
      // undo should fall all the way back to the original team is the very
      // first steal turn (stealIndex 0, never yet started) — there is no
      // earlier steal turn to step back to, so that undoes the original
      // "missed — open to steal" decision instead.
      const isFirstStealTurn = pendingStealTurn && state.stealIndex === 0;
      if (state.stealOrder.length > 0 && !isFirstStealTurn) {
        return {
          ...state,
          session: { ...state.session, teams },
          revealed: false,
          stealing: true,
          stealIndex: state.awarded ? state.stealIndex : state.stealIndex - 1,
          pictureCorrect: [],
          tiebreakerCorrect: [],
          awarded: false,
          lastAward: null,
          timer: IDLE_TIMER,
        };
      }

      return {
        ...state,
        session: { ...state.session, teams },
        revealed: false,
        stealing: false,
        stealOrder: [],
        stealIndex: 0,
        pictureCorrect: [],
        tiebreakerCorrect: [],
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
        answerCue: cue(state, state.pictureCorrect.length > 0),
        timer: IDLE_TIMER,
      };
    }

    case "CLOSE_QUESTION": {
      if (!state.session) return state;
      const round = currentRound(state);
      // Rotate the starting team only after a standard question that had an
      // assigned team — audience bonus questions don't consume a turn.
      const activeTeamIndex =
        round && round.type === "standard" && !isAudienceQuestion(state)
          ? rotate(state.session, currentTurnDirection(state))
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
      if (state.session?.rapidReview) {
        // Resume an in-progress review pass rather than restarting play.
        return { ...state, view: "rapidfire" };
      }
      if (!state.session || !state.content) {
        return { ...state, ...CLEARED, view: "rapidfire", rapid: null };
      }

      // Fold the just-finished team's turn into the completed list.
      const { queue: archivedQueue, completed } = archiveFinishedRapid(state);

      // Lock in a fresh turn order only on a true first entry (queue still
      // null); once a full pass empties it, stop and wait for review. Rapid
      // Fire continues the same backward sweep started by rounds after the
      // Picture Round (see turnStartIndexFor/turnDirectionFor).
      const rapidSlot = rapidFireOrderSlot(state.content);
      const queue =
        archivedQueue === null
          ? teamRotation(
              state.session.teamOrder,
              turnStartIndexFor(rapidSlot, state.content, state.session.teamOrder.length),
              turnDirectionFor(rapidSlot, state.content),
            )
          : archivedQueue;

      // No auto-deal: land on the group board so the host can pick a lettered
      // group of questions for whichever team is up next (queue[0]).
      return {
        ...state,
        ...CLEARED,
        session: {
          ...state.session,
          rapidQueue: queue,
          rapidCompleted: completed,
        },
        view: "rapidfire",
        rapid: null,
      };
    }

    case "RAPID_SELECT_GROUP": {
      const { session, content } = state;
      if (!session || !content) return state;
      const nextTeamId = session.rapidQueue?.[0];
      if (!nextTeamId) return state;

      const group = rapidFireGroups(content).find(
        (g) => g.key === action.groupKey,
      );
      const used = new Set(session.usedQuestionIds);
      if (!group || group.questionIds.some((id) => used.has(id))) {
        return state;
      }

      return {
        ...state,
        ...CLEARED,
        session: {
          ...session,
          usedQuestionIds: [...session.usedQuestionIds, ...group.questionIds],
        },
        view: "rapidfire",
        rapid: {
          teamId: nextTeamId,
          questionIds: group.questionIds,
          currentIndex: 0,
          answers: {},
          questionStatus: {},
          finished: false,
          started: false,
        },
        timer: IDLE_TIMER,
      };
    }

    case "RAPID_BEGIN_TURN": {
      const rf = state.rapid;
      if (!rf || rf.started || rf.finished || !state.session) return state;
      return {
        ...state,
        rapid: { ...rf, started: true },
        timer: startTimer(state.session.settings.rapidFireSeconds),
      };
    }

    case "RAPID_RECORD_ANSWER": {
      const rf = state.rapid;
      if (!rf || rf.finished || !rf.questionIds.includes(action.questionId)) {
        return state;
      }
      return {
        ...state,
        rapid: {
          ...rf,
          answers: { ...rf.answers, [action.questionId]: action.text },
        },
      };
    }

    case "RAPID_SET_CURRENT_QUESTION": {
      const rf = state.rapid;
      if (!rf || rf.finished) return state;
      const index = Math.max(
        0,
        Math.min(rf.questionIds.length - 1, action.index),
      );
      return { ...state, rapid: { ...rf, currentIndex: index } };
    }

    case "RAPID_MARK_QUESTION": {
      const rf = state.rapid;
      if (!rf || rf.finished) return state;
      const idx = rf.questionIds.indexOf(action.questionId);
      if (idx === -1) return state;
      const questionStatus = {
        ...rf.questionStatus,
        [action.questionId]: action.status,
      };
      // Only auto-advance when marking whichever question is currently
      // highlighted — correcting an earlier question's status shouldn't
      // yank the host's focus away from where they actually are.
      const currentIndex =
        idx === rf.currentIndex
          ? (nextPendingIndex(rf.questionIds, questionStatus, idx) ?? idx)
          : rf.currentIndex;
      return { ...state, rapid: { ...rf, questionStatus, currentIndex } };
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
          ? {
              ...state.session,
              currentRoundId: null,
              currentQuestionId: null,
              rapidQueue: queue,
              rapidCompleted: completed,
            }
          : state.session,
        view: "home",
        rapid: null,
        ...CLEARED,
      };
    }

    /* ---- rapid fire: review phase ---- */
    case "RAPID_REVIEW_START": {
      if (!state.session) return state;
      // Fold in the just-finished team's turn if the host jumped straight
      // here from the "all teams done" screen without an intervening
      // ENTER_RAPIDFIRE — otherwise that last team's answers would be
      // missing from the review pass.
      const { queue, completed } = archiveFinishedRapid(state);
      if (completed.length === 0) return state;
      return {
        ...state,
        rapid: null,
        session: {
          ...state.session,
          rapidQueue: queue,
          rapidCompleted: completed,
          rapidReview: {
            teamIds: completed.map((r) => r.teamId),
            currentIndex: 0,
            questionIndex: 0,
            graded: {},
            awarded: false,
          },
        },
      };
    }

    case "RAPID_REVIEW_GRADE": {
      const session = state.session;
      const rv = session?.rapidReview;
      if (!session || !rv || rv.awarded) return state;
      const teamId = rv.teamIds[rv.currentIndex];
      const result = session.rapidCompleted.find((r) => r.teamId === teamId);
      if (!teamId || !result) return state;
      const qid = result.questionIds[rv.questionIndex];
      if (!qid) return state;

      const graded = { ...rv.graded, [qid]: action.correct };
      const questionIndex = rv.questionIndex + 1;
      const teamDone = questionIndex >= result.questionIds.length;

      if (!teamDone) {
        return {
          ...state,
          session: {
            ...session,
            rapidReview: { ...rv, questionIndex, graded },
          },
          answerCue: cue(state, action.correct),
        };
      }

      const correctCount = Object.values(graded).filter(Boolean).length;
      const points = correctCount * session.settings.rapidFirePoints;
      return {
        ...state,
        session: {
          ...session,
          teams: award(session.teams, teamId, points),
          rapidReview: {
            ...rv,
            questionIndex,
            graded,
            awarded: true,
          },
        },
        answerCue: cue(state, action.correct),
      };
    }

    case "RAPID_REVIEW_NEXT_TEAM": {
      const session = state.session;
      const rv = session?.rapidReview;
      if (!session || !rv || !rv.awarded) return state;
      return {
        ...state,
        session: {
          ...session,
          rapidReview: {
            ...rv,
            currentIndex: rv.currentIndex + 1,
            questionIndex: 0,
            graded: {},
            awarded: false,
          },
        },
      };
    }

    case "RAPID_REVIEW_DONE":
      return {
        ...state,
        session: state.session
          ? {
              ...state.session,
              currentRoundId: null,
              currentQuestionId: null,
              rapidQueue: null,
              rapidCompleted: [],
              rapidReview: null,
              rapidFireCompleted: true,
            }
          : state.session,
        view: "home",
        rapid: null,
        ...CLEARED,
      };

    /* ---- sudden-death tiebreaker ---- */
    case "ENTER_TIEBREAKER": {
      if (!state.session || !state.content) return state;

      // Resume an in-progress tiebreaker (e.g. after a trip back to Home)
      // rather than recomputing the tied teams and dealing a new question.
      if (state.session.tiebreaker) {
        return {
          ...state,
          ...CLEARED,
          view: "tiebreaker",
          activeQuestionId: state.session.currentQuestionId,
        };
      }

      const tied = tiedForFirst(state.session.teams);
      if (tied.length < 2) return state;
      const q = nextTiebreakerQuestion(state.content, state.session);
      if (!q) return state;

      return {
        ...state,
        ...CLEARED,
        session: {
          ...state.session,
          currentRoundId: null,
          currentQuestionId: q.id,
          usedQuestionIds: markUsed(state.session, q.id),
          tiebreaker: { teamIds: tied.map((t) => t.id) },
        },
        view: "tiebreaker",
        activeQuestionId: q.id,
      };
    }

    case "START_TIEBREAKER_TIMER": {
      if (!state.session || !state.activeQuestionId || state.awarded) return state;
      const raw = state.session.settings.tiebreakerSeconds;
      const seconds = raw && raw > 10 ? raw : 60;
      return { ...state, timer: startTimer(seconds) };
    }

    case "TOGGLE_TIEBREAKER_TEAM": {
      if (state.awarded) return state;
      const has = state.tiebreakerCorrect.includes(action.teamId);
      return {
        ...state,
        tiebreakerCorrect: has
          ? state.tiebreakerCorrect.filter((id) => id !== action.teamId)
          : [...state.tiebreakerCorrect, action.teamId],
      };
    }

    case "AWARD_TIEBREAKER": {
      if (!state.session || state.awarded) return state;
      const amount = state.session.settings.tiebreakerPoints;
      let teams = state.session.teams;
      for (const id of state.tiebreakerCorrect) {
        teams = award(teams, id, amount);
      }
      return {
        ...state,
        session: { ...state.session, teams },
        lastAward: state.tiebreakerCorrect.map((teamId) => ({ teamId, amount })),
        revealed: true,
        awarded: true,
        answerCue: cue(state, state.tiebreakerCorrect.length > 0),
        timer: IDLE_TIMER,
      };
    }

    case "NEXT_TIEBREAKER_QUESTION": {
      if (!state.session || !state.content || !state.session.tiebreaker) return state;
      const q = nextTiebreakerQuestion(state.content, state.session);
      if (!q) return state;
      return {
        ...state,
        session: {
          ...state.session,
          currentQuestionId: q.id,
          usedQuestionIds: markUsed(state.session, q.id),
        },
        activeQuestionId: q.id,
        revealed: false,
        tiebreakerCorrect: [],
        awarded: false,
        lastAward: null,
        timer: IDLE_TIMER,
      };
    }

    case "FINISH_TIEBREAKER": {
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          currentQuestionId: null,
          tiebreaker: null,
        },
        view: "home",
        ...CLEARED,
      };
    }

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

    /* ---- how-to-play guide ---- */
    case "OPEN_RULES":
      return { ...state, rulesOpen: true, rulesPage: 0 };

    case "CLOSE_RULES":
      return { ...state, rulesOpen: false };

    case "RULES_NEXT": {
      const total = buildRulesPages(state.session?.settings ?? DEFAULT_SETTINGS).length;
      return { ...state, rulesPage: Math.min(total - 1, state.rulesPage + 1) };
    }

    case "RULES_BACK":
      return { ...state, rulesPage: Math.max(0, state.rulesPage - 1) };

    case "RULES_GOTO": {
      const total = buildRulesPages(state.session?.settings ?? DEFAULT_SETTINGS).length;
      return { ...state, rulesPage: Math.max(0, Math.min(total - 1, action.page)) };
    }

    case "TOGGLE_AUDIO_MUTED": {
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          settings: {
            ...state.session.settings,
            audioMuted: !state.session.settings.audioMuted,
          },
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
  const rounds: LiveRoundSummary[] = content.rounds.map((r) => ({
    id: r.id,
    order: r.order,
    name: r.name,
    description: r.description,
    type: r.type,
    totalQuestions: r.questionIds.length,
    remainingQuestions: r.questionIds.filter((id) => !used.has(id)).length,
  }));

  // Rapid Fire isn't a RoundDoc (it's a separate question pool, dealt out in
  // lettered groups rather than picked off a board) — append a synthetic
  // entry so the "What's Ahead" screen still lists it as part of the lineup.
  const rapidFire = rapidFireQuestions(content);
  rounds.push({
    id: "rapid-fire",
    order: rounds.length + 1,
    name: "Rapid Fire",
    description:
      "Lightning round — answer as many as you can before time runs out! The questions are selected from a pool of Bible, General Knowledge, India, Current Affairs, & Mar Thoma Church.",
    type: "rapid_fire",
    totalQuestions: rapidFire.length,
    remainingQuestions: rapidFire.filter((q) => !used.has(q.id)).length,
  });

  return rounds;
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
    focusId: currentFocusId(content, session),
    board: null,
    scores: scoresOf(session),
    rapidFire: null,
    rapidReview: null,
    rules: null,
    audioMuted: session.settings.audioMuted,
    answerCue: state.answerCue,
    updatedAt: Date.now(),
  };

  // The how-to-play guide is an overlay independent of `view` (it can be
  // open on top of "home", or reopened mid-game from the gear menu) — so it
  // takes over the projector regardless of whatever screen is underneath,
  // the same way it takes over the host's own screen.
  if (state.rulesOpen) {
    const pages = buildRulesPages(session.settings);
    const page = pages[state.rulesPage] ?? pages[0];
    return {
      ...base,
      screen: "rules",
      message: null,
      timer: IDLE_TIMER,
      rules: {
        icon: page.icon,
        eyebrow: page.eyebrow,
        title: page.title,
        body: page.body,
        page: state.rulesPage,
        totalPages: pages.length,
        showRounds: page.showRounds ?? false,
      },
    };
  }

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
      const nextAudienceTurn = isNextRoundQuestionAudienceTurn(session, round);
      return {
        ...base,
        screen: "board",
        roundId: round.id,
        roundName: round.name,
        roundDescription: round.description ?? null,
        roundOrder: round.order,
        activeTeamId: nextAudienceTurn ? null : team?.id ?? null,
        activeTeamName: nextAudienceTurn ? null : team?.name ?? null,
        message: nextAudienceTurn
          ? "🎉 Bonus question — audience's turn! No points"
          : null,
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
      const stealAudienceTurn = isAudienceSteal(state);
      const roundAudienceTurn = isAudienceQuestion(state);
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
        activeTeamId: roundAudienceTurn
          ? null
          : state.stealing
            ? (stealTeam?.id ?? null)
            : (team?.id ?? null),
        activeTeamName: roundAudienceTurn
          ? null
          : state.stealing
            ? (stealTeam?.name ?? null)
            : (team?.name ?? null),
        message: roundAudienceTurn
          ? "🎉 Bonus question — audience's turn! No points"
          : state.stealing
            ? stealAudienceTurn
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

    case "tiebreaker": {
      if (!q || !session.tiebreaker) return { ...base, screen: "scoreboard" };
      const tiedTeams = session.tiebreaker.teamIds
        .map((id) => session.teams.find((t) => t.id === id))
        .filter((t): t is SessionTeam => !!t);
      const screen = state.revealed ? "answer" : "question";
      const resolved = state.awarded && state.tiebreakerCorrect.length === 1;
      const winner = resolved
        ? tiedTeams.find((t) => t.id === state.tiebreakerCorrect[0])
        : null;
      return {
        ...base,
        screen,
        roundId: null,
        roundName: "Sudden-Death Tiebreaker",
        roundDescription:
          "Whiteboards up — 60 seconds, then everyone reveals at once.",
        roundOrder: null,
        questionId: q.id,
        questionNumber: null,
        question: q.question,
        answer: state.revealed ? q.answer : null,
        imageUrl: q.imageUrl ?? null,
        showAnswer: state.revealed,
        message: winner
          ? `🏆 ${winner.name} wins the tiebreaker!`
          : `🔥 Tiebreaker: ${tiedTeams.map((t) => t.name).join(" vs ")}`,
        board: null,
      };
    }

    case "rapidfire": {
      if (session.rapidReview) {
        const rv = session.rapidReview;
        const teamId = rv.teamIds[rv.currentIndex];
        const team = teamId ? session.teams.find((t) => t.id === teamId) : null;
        const result = teamId
          ? session.rapidCompleted.find((r) => r.teamId === teamId)
          : null;

        if (!team || !result) {
          return {
            ...base,
            screen: "scoreboard",
            message: "Rapid Fire review complete!",
            timer: IDLE_TIMER,
          };
        }

        const items = result.questionIds.map((qid, i) => {
          const q = getQuestion(state, qid);
          const isGraded = i < rv.questionIndex;
          const status: "pending" | "correct" | "incorrect" = isGraded
            ? rv.graded[qid]
              ? "correct"
              : "incorrect"
            : "pending";
          const teamAnswer = result.answers[qid]?.trim();
          return {
            question: q?.question ?? "",
            teamAnswer: teamAnswer || "No answer given",
            correctAnswer: status === "pending" ? null : (q?.answer ?? null),
            status,
          };
        });

        return {
          ...base,
          screen: "rapid_review",
          rapidReview: {
            teamName: team.name,
            items,
            currentIndex: rv.questionIndex,
          },
          timer: IDLE_TIMER,
        };
      }
      const rf = state.rapid;
      if (!rf) {
        return { ...base, screen: "scoreboard", message: "Rapid Fire", timer: IDLE_TIMER };
      }
      const team2 = session.teams.find((t) => t.id === rf.teamId);
      const cur = getQuestion(state, rf.questionIds[rf.currentIndex] ?? null);
      const answeredCount = rf.questionIds.filter(
        (id) => rf.questionStatus[id] === "answered",
      ).length;
      return {
        ...base,
        screen: "rapid_fire",
        activeTeamId: team2?.id ?? null,
        activeTeamName: team2?.name ?? null,
        rapidFire: {
          teamName: team2?.name ?? "",
          total: rf.questionIds.length,
          answered: answeredCount,
          question:
            rf.finished || !rf.started ? null : cur?.question ?? null,
          finished: rf.finished,
          started: rf.started,
        },
      };
    }

    default:
      return base;
  }
}

/**
 * The host mirror is just the host's own state minus the (large, static)
 * content bank — the /speaker screen loads content itself and merges it back
 * in, the same way it loads the question content independently of the live
 * session doc. Unlike buildLive(), nothing here is redacted.
 */
export function buildHostMirror(state: HostState): HostMirror {
  return {
    session: state.session,
    loaded: state.loaded,
    view: state.view,
    activeQuestionId: state.activeQuestionId,
    revealed: state.revealed,
    stealing: state.stealing,
    stealOrder: state.stealOrder,
    stealIndex: state.stealIndex,
    pictureCorrect: state.pictureCorrect,
    tiebreakerCorrect: state.tiebreakerCorrect,
    awarded: state.awarded,
    lastAward: state.lastAward,
    rapid: state.rapid,
    timer: state.timer,
    updatedAt: Date.now(),
  };
}

/* ------------------------------------------------------------------ *
 * Persistence — session via /api/state, projector via /api/live,
 * host mirror (speaker screen) via /api/host-mirror.
 * ------------------------------------------------------------------ */

const HOST_CODE_KEY = "church-quiz-app:hostCode";
const HOST_CLIENT_ID_KEY = "church-quiz-app:hostClientId";
const SESSION_DEBOUNCE_MS = 350;
const LIVE_DEBOUNCE_MS = 150;

/** A lock not renewed in this long is treated as abandoned and up for grabs. */
const HOST_LOCK_TIMEOUT_MS = 12_000;
/** How often the owning tab renews its lock. */
const HOST_LOCK_HEARTBEAT_MS = 4_000;

export type SyncStatus =
  | "loading"
  | "saving"
  | "saved"
  | "offline"
  | "locked"
  | "disabled"
  | "watching"; // speaker screen: read-only, mirroring the host live

/**
 * Which tab currently controls the game. "owner" is the only state allowed
 * to save the session or publish the display/speaker docs — every other
 * open /host tab sits in "locked-out" so it can never silently overwrite
 * the active host's game with its own stale local state.
 */
export type HostLockStatus = "loading" | "owner" | "locked-out";

function hostHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const code = window.localStorage.getItem(HOST_CODE_KEY);
    if (code) headers["x-host-code"] = code;
  }
  return headers;
}

/** Stable id for this browser tab (sessionStorage, not shared across tabs —
 * a duplicated or reopened tab is deliberately treated as a new session). */
function getOrCreateClientId(): string {
  if (typeof window === "undefined") return "server";
  try {
    const existing = window.sessionStorage.getItem(HOST_CLIENT_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.sessionStorage.setItem(HOST_CLIENT_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

interface SyncApi {
  status: SyncStatus;
  setHostCode: (code: string) => void;
  lockStatus: HostLockStatus;
  /** Epoch ms of the current lock holder's last heartbeat, or null before
   * the lock doc has loaded — used to show "last seen Ns ago" when locked out. */
  lockUpdatedAt: number | null;
  /** Force-claim the lock even though another tab actively holds it. */
  takeOverHost: () => void;
}

const StateContext = createContext<HostState | null>(null);
const DispatchContext = createContext<Dispatch<Action> | null>(null);
const SyncContext = createContext<SyncApi | null>(null);

/** No-op dispatch for read-only contexts (the speaker screen). */
const noopDispatch: Dispatch<Action> = () => {};

/**
 * Debounced, retrying publisher for a doc under games/{gameId}/live/*. Used
 * for both the projector doc (buildLive) and the host mirror doc
 * (buildHostMirror) — same debounce/retry/coalesce behavior, different URL
 * and payload.
 */
function usePublisher<T>(
  url: string,
  hydratedRef: { current: boolean },
  canWriteRef: { current: boolean },
  build: () => T | null,
  debounceMs: number,
  deps: unknown[],
) {
  const timer = useRef<number | null>(null);
  const latestRef = useRef<T | null>(null);
  const inFlightRef = useRef(false);
  const pendingRef = useRef(false);
  const retryTimer = useRef<number | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!hydratedRef.current || !canWriteRef.current) return;
    const payload = build();
    if (!payload) return;
    latestRef.current = payload;

    const doPublish = async () => {
      if (!canWriteRef.current) return;
      if (inFlightRef.current) {
        pendingRef.current = true;
        return;
      }
      inFlightRef.current = true;
      pendingRef.current = false;
      const toSend = latestRef.current;
      if (!toSend) {
        inFlightRef.current = false;
        return;
      }

      try {
        const res = await fetch(url, {
          method: "PUT",
          headers: hostHeaders(),
          body: JSON.stringify(toSend),
        });
        if (!res.ok) {
          throw new Error(`Publish failed with status ${res.status}`);
        }
      } catch (err) {
        console.warn(`Publish to ${url} failed, will retry:`, err);
        if (retryTimer.current) window.clearTimeout(retryTimer.current);
        retryTimer.current = window.setTimeout(() => {
          void doPublish();
        }, 1000);
      } finally {
        inFlightRef.current = false;
        if (pendingRef.current) {
          void doPublish();
        }
      }
    };

    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void doPublish();
    }, debounceMs);

    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, debounceMs, ...deps]);
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, makeInitialState);
  const [status, setStatus] = useState<SyncStatus>("loading");

  const hydratedRef = useRef(false);
  const sessionTimer = useRef<number | null>(null);

  // --- Host lock: only the tab that owns it may write anything below. ---
  const [clientId] = useState(getOrCreateClientId);
  const [lock, setLock] = useState<HostLock | null>(null);
  const [lockLoaded, setLockLoaded] = useState(false);
  const lockRef = useRef<HostLock | null>(null);
  const isOwnerRef = useRef(false);
  const claimingRef = useRef(false);
  const isOwner = lockLoaded && lock !== null && lock.clientId === clientId;

  // Keep the "latest value" refs in sync after each commit — read by the
  // effects below and by usePublisher, never during render.
  useEffect(() => {
    lockRef.current = lock;
    isOwnerRef.current = isOwner;
  });

  // Writes are fire-and-forget: the state transition to "owner" happens only
  // once the subscribeHostLock echo comes back, never optimistically here —
  // that keeps this a pure "synchronize with an external system" effect.
  const writeLock = useCallback(
    async (claimedAt: number) => {
      const payload: HostLock = { clientId, claimedAt, updatedAt: Date.now() };
      try {
        await fetch("/api/host-lock", {
          method: "PUT",
          headers: hostHeaders(),
          body: JSON.stringify(payload),
        });
      } catch (err) {
        console.warn("Host lock claim failed, will retry on next check:", err);
      }
    },
    [clientId],
  );

  useEffect(() => subscribeHostLock((l) => {
    setLock(l);
    setLockLoaded(true);
  }), []);

  // Auto-claim an empty or abandoned lock — but never one another tab is
  // actively renewing, so two tabs opened around the same time settle on a
  // single owner instead of fighting over it.
  useEffect(() => {
    if (!lockLoaded || isOwner || claimingRef.current) return;
    const stale = !lock || Date.now() - lock.updatedAt > HOST_LOCK_TIMEOUT_MS;
    if (!stale) return;
    claimingRef.current = true;
    void writeLock(Date.now()).finally(() => {
      claimingRef.current = false;
    });
  }, [lockLoaded, lock, isOwner, writeLock]);

  // Heartbeat while owning, so this tab keeps its claim renewed.
  useEffect(() => {
    if (!isOwner) return;
    const id = window.setInterval(() => {
      void writeLock(lockRef.current?.claimedAt ?? Date.now());
    }, HOST_LOCK_HEARTBEAT_MS);
    return () => window.clearInterval(id);
  }, [isOwner, writeLock]);

  const takeOverHost = useCallback(() => {
    void writeLock(Date.now());
  }, [writeLock]);

  // Re-sync from the server whenever this tab (re)gains ownership — it may
  // have been sitting locked-out for a while with stale local session state.
  useEffect(() => {
    if (!isOwner) return;
    (async () => {
      try {
        const res = await fetch("/api/state", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { session: SessionState | null };
          if (data.session) {
            dispatch({ type: "HYDRATE_SESSION", session: data.session });
          }
        }
      } catch (err) {
        console.warn("Re-sync on host takeover failed:", err);
      } finally {
        hydratedRef.current = true;
      }
    })();
  }, [isOwner]);

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

  // Persist the session (game doc + teams) whenever it changes. Gated on
  // owning the host lock — a locked-out tab must never overwrite the active
  // host's session with its own stale local state.
  useEffect(() => {
    if (!hydratedRef.current || !session || !isOwnerRef.current) return;
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

  // Publish the projector doc (audience-safe) and the host mirror doc
  // (unredacted, for the /speaker screen) on any visible change.
  usePublisher(
    "/api/live",
    hydratedRef,
    isOwnerRef,
    () => buildLive(state),
    LIVE_DEBOUNCE_MS,
    [state],
  );
  usePublisher(
    "/api/host-mirror",
    hydratedRef,
    isOwnerRef,
    () => buildHostMirror(state),
    LIVE_DEBOUNCE_MS,
    [state],
  );

  const setHostCode = useCallback((code: string) => {
    if (typeof window !== "undefined") {
      if (code) window.localStorage.setItem(HOST_CODE_KEY, code);
      else window.localStorage.removeItem(HOST_CODE_KEY);
    }
  }, []);

  const lockStatus: HostLockStatus = !lockLoaded
    ? "loading"
    : isOwner
      ? "owner"
      : "locked-out";

  const sync: SyncApi = {
    status,
    setHostCode,
    lockStatus,
    lockUpdatedAt: lock?.updatedAt ?? null,
    takeOverHost,
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

/**
 * Read-only counterpart to GameProvider for the /speaker screen: loads the
 * content bank itself (same public read GameProvider uses) and mirrors the
 * host's full live state from the host-mirror doc, instead of owning a
 * reducer. Dispatch is a no-op — the speaker screen renders the same
 * components as the host, with every control disabled (see HostShell's
 * `readOnly` prop), so nothing should ever reach it, but it's a no-op either
 * way as a second line of defense.
 */
export function SpeakerProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<GameContent | null>(null);
  const [mirror, setMirror] = useState<HostMirror | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadContent()
      .then((c) => {
        if (!cancelled) setContent(c);
      })
      .catch((err) => console.error("content load failed:", err));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => subscribeHostMirror(setMirror), []);

  const base = makeInitialState();
  const state: HostState = mirror
    ? { ...base, ...mirror, content, loaded: mirror.loaded && content !== null }
    : { ...base, content, loaded: false };

  // The host lock doesn't apply to a read-only viewer — these are unused here.
  const sync: SyncApi = {
    status: "watching",
    setHostCode: () => {},
    lockStatus: "owner",
    lockUpdatedAt: null,
    takeOverHost: () => {},
  };

  return (
    <StateContext.Provider value={state}>
      <DispatchContext.Provider value={noopDispatch}>
        <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>
      </DispatchContext.Provider>
    </StateContext.Provider>
  );
}

// Re-export settings default for convenience.
export { DEFAULT_SETTINGS };
