/**
 * HOST MIRROR — a read-only broadcast of the full host screen, for a second
 * "speaker" device to watch in real time. Unlike the projector doc
 * (lib/live.ts), nothing here is redacted for the audience: the speaker sees
 * exactly what the host sees, including correct answers before they're
 * revealed on the projector. The speaker screen never writes this doc — only
 * the host publishes it, the same way it publishes the projector doc.
 *
 * Stored at: games/{gameId}/live/host
 */

import type { SessionState } from "./session";

export type HostMirrorView =
  | "setup"
  | "home"
  | "board"
  | "question"
  | "picture"
  | "rapidfire"
  | "tiebreaker"
  | "scoreboard"
  | "winner";

export interface HostMirrorTimer {
  running: boolean;
  endsAt: number | null;
  durationSeconds: number | null;
}

/** The single rapid-fire team currently mid-turn (mirrors RapidPlayState). */
export interface HostMirrorRapid {
  teamId: string;
  questionIds: string[];
  /** Index into questionIds of whichever one is currently highlighted. */
  currentIndex: number;
  answers: Record<string, string>;
  finished: boolean;
  /** True once the host has pressed Start on the "get ready" intro screen. */
  started: boolean;
}

export interface HostMirror {
  session: SessionState | null;
  loaded: boolean;
  view: HostMirrorView;

  activeQuestionId: string | null;
  revealed: boolean;
  stealing: boolean;
  stealOrder: string[];
  stealIndex: number;
  pictureCorrect: string[];
  tiebreakerCorrect: string[];
  awarded: boolean;
  lastAward: { teamId: string; amount: number }[] | null;

  rapid: HostMirrorRapid | null;
  timer: HostMirrorTimer;

  /** Epoch ms of the last publish, for staleness debugging. */
  updatedAt: number;
}

const VIEWS = new Set<string>([
  "setup",
  "home",
  "board",
  "question",
  "picture",
  "rapidfire",
  "tiebreaker",
  "scoreboard",
  "winner",
]);

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isStringRecord(v: unknown): v is Record<string, string> {
  if (typeof v !== "object" || v === null) return false;
  return Object.values(v).every((val) => typeof val === "string");
}

function isHostMirrorRapid(v: unknown): v is HostMirrorRapid {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.teamId === "string" &&
    isStringArray(r.questionIds) &&
    typeof r.currentIndex === "number" &&
    isStringRecord(r.answers) &&
    typeof r.finished === "boolean" &&
    typeof r.started === "boolean"
  );
}

function isHostMirrorTimer(v: unknown): v is HostMirrorTimer {
  if (typeof v !== "object" || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.running === "boolean" &&
    (t.endsAt === null || typeof t.endsAt === "number") &&
    (t.durationSeconds === null || typeof t.durationSeconds === "number")
  );
}

export function isHostMirror(v: unknown): v is HostMirror {
  if (typeof v !== "object" || v === null) return false;
  const m = v as Record<string, unknown>;
  return (
    (m.session === null || typeof m.session === "object") &&
    typeof m.loaded === "boolean" &&
    typeof m.view === "string" &&
    VIEWS.has(m.view) &&
    (m.activeQuestionId === null || typeof m.activeQuestionId === "string") &&
    typeof m.revealed === "boolean" &&
    typeof m.stealing === "boolean" &&
    isStringArray(m.stealOrder) &&
    typeof m.stealIndex === "number" &&
    isStringArray(m.pictureCorrect) &&
    isStringArray(m.tiebreakerCorrect) &&
    typeof m.awarded === "boolean" &&
    (m.rapid === null || isHostMirrorRapid(m.rapid)) &&
    isHostMirrorTimer(m.timer)
  );
}
