import { NextResponse } from "next/server";
import { rounds as roundsSeed } from "@/data/rounds";
import { rapidFirePool as rapidFireSeed } from "@/data/rapidFire";
import { tiebreakerPool as tiebreakerSeed } from "@/data/tiebreaker";
import type { QuestionDoc, RoundDoc, RoundType } from "@/lib/content";
import { DEFAULT_SETTINGS, type SessionState } from "@/lib/session";
import { welcomeLive } from "@/lib/live";
import {
  isFirestoreConfigured,
  loadGameDoc,
  saveContent,
  saveLive,
  saveSession,
} from "@/lib/firestore";

export const dynamic = "force-dynamic";

/**
 * One-shot migration: pushes the static content in /data into Firestore under
 * the new schema, and (unless a game already exists) initializes the game doc,
 * team roster and projector doc.
 *
 * Run once after deploy / whenever content changes:
 *   POST /api/seed          → (re)writes content; inits session only if absent
 *   POST /api/seed?reset=1  → also resets the game doc, teams and scores
 *
 * If HOST_ACCESS_CODE is set, the request must include a matching x-host-code
 * header (same protection as the write routes).
 */

const EVENT_NAME = "Wisdom Across Generations";
const EVENT_SUBTITLE = "Mar Thoma Church of South Florida";

const DEFAULT_TEAMS = [
  "Sevika Sangham",
  "Yuvajana Sakhyam",
  "Sunday School",
  "Edavaka Mission",
  "Choir",
  "Young Family Fellowship",
];

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Transform the /data seed into flat rounds + questions docs. */
function buildContent(): { rounds: RoundDoc[]; questions: QuestionDoc[] } {
  const rounds: RoundDoc[] = [];
  const questions: QuestionDoc[] = [];

  for (const r of roundsSeed) {
    const type: RoundType = r.isPicture ? "picture" : "standard";
    rounds.push({
      id: r.id,
      name: r.name,
      description: r.description,
      order: r.order,
      type,
      questionIds: r.questions.map((q) => q.id),
    });
    r.questions.forEach((q, i) => {
      questions.push({
        id: q.id,
        roundId: r.id,
        category: r.name,
        type,
        order: i + 1,
        question: q.question,
        answer: q.answer,
        imageUrl: q.imageUrl ?? null,
        funFact: q.funFact ?? "",
      });
    });
  }

  let order = 0;
  for (const group of rapidFireSeed) {
    for (const q of group.questions) {
      order += 1;
      questions.push({
        id: q.id,
        roundId: null,
        category: group.name,
        type: "rapid_fire",
        order,
        question: q.question,
        answer: q.answer,
        imageUrl: null,
        funFact: q.funFact ?? "",
      });
    }
  }

  tiebreakerSeed.forEach((q, i) => {
    questions.push({
      id: q.id,
      roundId: null,
      category: "Tiebreaker",
      type: "tiebreaker",
      order: i + 1,
      question: q.question,
      answer: q.answer,
      imageUrl: q.imageUrl ?? null,
      funFact: q.funFact ?? "",
    });
  });

  return { rounds, questions };
}

function freshSession(): SessionState {
  const teams = DEFAULT_TEAMS.map((name, i) => ({
    id: slugify(name),
    name,
    order: i,
    score: 0,
  }));
  return {
    status: "not_started",
    name: EVENT_NAME,
    subtitle: EVENT_SUBTITLE,
    teams,
    teamOrder: teams.map((t) => t.id),
    activeTeamIndex: 0,
    currentRoundId: null,
    currentQuestionId: null,
    usedQuestionIds: [],
    rapidQueue: null,
    rapidCompleted: [],
    rapidReview: null,
    tiebreaker: null,
    settings: DEFAULT_SETTINGS,
  };
}

function writeAllowed(request: Request): boolean {
  const required = process.env.HOST_ACCESS_CODE;
  if (!required) return true;
  return request.headers.get("x-host-code") === required;
}

export async function POST(request: Request) {
  if (!isFirestoreConfigured()) {
    return NextResponse.json(
      { error: "Firestore is not configured on the server." },
      { status: 503 },
    );
  }
  if (!writeAllowed(request)) {
    return NextResponse.json(
      { error: "Invalid or missing host access code." },
      { status: 401 },
    );
  }

  const reset = new URL(request.url).searchParams.get("reset") === "1";

  try {
    const { rounds, questions } = buildContent();
    await saveContent(rounds, questions);

    const existing = await loadGameDoc();
    let sessionInitialized = false;
    if (!existing || reset) {
      const session = freshSession();
      await saveSession(session);
      await saveLive(welcomeLive(session.name, session.subtitle));
      sessionInitialized = true;
    }

    return NextResponse.json({
      ok: true,
      rounds: rounds.length,
      questions: questions.length,
      sessionInitialized,
      reset,
    });
  } catch (err) {
    console.error("Seed failed:", err);
    return NextResponse.json({ error: "Seed failed." }, { status: 500 });
  }
}
