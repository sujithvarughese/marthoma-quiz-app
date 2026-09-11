"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { subscribeLive } from "@/lib/firebaseClient";
import { welcomeLive, type LiveDisplay, type LiveScore } from "@/lib/live";
import { CountdownTimer } from "@/components/CountdownTimer";
import { AdminGate } from "@/components/AdminGate";

/**
 * Read-only projector screen. Subscribes to the live doc via onSnapshot and
 * renders whatever the host publishes — no controls, no cursor, no access to the
 * question bank (answers only arrive once the host reveals them).
 */
export function DisplayApp() {
  return (
    <AdminGate>
      <DisplaySurface />
    </AdminGate>
  );
}

function DisplaySurface() {
  const [live, setLive] = useState<LiveDisplay | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsub = subscribeLive((l) => {
      setConnected(true);
      if (l) setLive(l);
    });
    return unsub;
  }, []);

  return (
    <div className="flex min-h-dvh cursor-none flex-col bg-[#0b1120] text-white [&_*]:cursor-none">
      {!connected ? (
        <Centered>
          <p className="text-3xl font-semibold text-slate-400">Connecting…</p>
        </Centered>
      ) : (
        <Screen live={live ?? welcomeLive("Wisdom Across Generations", "Mar Thoma Church of South Florida")} />
      )}
    </div>
  );
}

function Screen({ live }: { live: LiveDisplay }) {
  switch (live.screen) {
    case "welcome":
      return <WelcomeScreen live={live} />;
    case "scoreboard":
      return <ScoreboardScreen live={live} />;
    case "board":
      return <BoardScreen live={live} />;
    case "question":
      return <QuestionScreen live={live} />;
    case "answer":
      return <AnswerScreen live={live} />;
    case "rapid_fire":
      return <RapidFireScreen live={live} />;
    case "winner":
      return <WinnerScreen live={live} />;
    default:
      return <WelcomeScreen live={live} />;
  }
}

/* ------------------------------------------------------------------ */

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-10 text-center">
      {children}
    </div>
  );
}

function ActiveBanner({ live }: { live: LiveDisplay }) {
  if (live.message) {
    return (
      <p className="rounded-full bg-amber-400/20 px-6 py-2 text-3xl font-black text-amber-200">
        {live.message}
      </p>
    );
  }
  if (live.activeTeamName) {
    return (
      <p className="text-3xl font-semibold text-slate-300">
        <span className="font-black text-emerald-300">{live.activeTeamName}</span>{" "}
        to answer
      </p>
    );
  }
  return null;
}

function WelcomeScreen({ live }: { live: LiveDisplay }) {
  return (
    <Centered>
      <h1 className="text-7xl font-black tracking-tight sm:text-8xl">
        {live.message ?? "Welcome"}
      </h1>
      <p className="text-3xl text-slate-400">Please wait for the host to begin.</p>
    </Centered>
  );
}

function ScoreTable({ scores }: { scores: LiveScore[] }) {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      {scores.map((t, i) => (
        <div
          key={t.id}
          className={`flex items-center justify-between gap-6 rounded-3xl px-8 py-6 ${
            i === 0 ? "bg-amber-400/15 ring-2 ring-amber-400/60" : "bg-white/5"
          }`}
        >
          <div className="flex items-center gap-6">
            <span
              className={`flex h-14 w-14 items-center justify-center rounded-full text-3xl font-black ${
                i === 0 ? "bg-amber-400 text-slate-900" : "bg-slate-700 text-white"
              }`}
            >
              {i + 1}
            </span>
            <span className="text-4xl font-bold sm:text-5xl">{t.name}</span>
          </div>
          <span className="font-mono text-6xl font-black tabular-nums">
            {t.score}
          </span>
        </div>
      ))}
    </div>
  );
}

function ScoreboardScreen({ live }: { live: LiveDisplay }) {
  return (
    <div className="flex flex-1 flex-col justify-center gap-10 p-10">
      <h1 className="text-center text-6xl font-black tracking-tight">
        Scoreboard
      </h1>
      <ScoreTable scores={live.scores ?? []} />
    </div>
  );
}

function BoardScreen({ live }: { live: LiveDisplay }) {
  const tiles = live.board ?? [];
  return (
    <div className="flex flex-1 flex-col gap-8 p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-6xl font-black tracking-tight">{live.roundName}</h1>
        <ActiveBanner live={live} />
      </header>
      <div className="grid flex-1 grid-cols-5 content-center gap-6">
        {tiles.map((tile) => (
          <div
            key={tile.questionId}
            className={
              tile.used
                ? "flex aspect-square items-center justify-center rounded-3xl border border-white/5 bg-white/5 text-white/20"
                : "flex aspect-square items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-xl"
            }
          >
            <span className="text-7xl font-black">
              {tile.used ? "✓" : tile.order}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestionScreen({ live }: { live: LiveDisplay }) {
  return (
    <div className="flex flex-1 flex-col gap-8 p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          {live.roundName && (
            <p className="text-2xl font-semibold uppercase tracking-widest text-indigo-300">
              {live.roundName}
            </p>
          )}
          {live.questionNumber && (
            <p className="text-3xl font-black">Question {live.questionNumber}</p>
          )}
        </div>
        <ActiveBanner live={live} />
      </header>

      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        {live.imageUrl && (
          <img
            src={live.imageUrl}
            alt=""
            className="max-h-[45vh] w-auto rounded-3xl object-contain"
          />
        )}
        <p className="max-w-6xl text-center text-6xl font-bold leading-tight">
          {live.question}
        </p>
        {live.timer.endsAt !== null && (
          <CountdownTimer
            endsAt={live.timer.endsAt}
            durationSeconds={live.timer.durationSeconds}
          />
        )}
      </div>
    </div>
  );
}

function AnswerScreen({ live }: { live: LiveDisplay }) {
  return (
    <div className="flex flex-1 flex-col gap-8 p-10">
      <header>
        {live.roundName && (
          <p className="text-2xl font-semibold uppercase tracking-widest text-indigo-300">
            {live.roundName}
          </p>
        )}
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-10">
        {live.imageUrl && (
          <img
            src={live.imageUrl}
            alt=""
            className="max-h-[35vh] w-auto rounded-3xl object-contain"
          />
        )}
        <p className="max-w-5xl text-center text-4xl font-semibold text-slate-300">
          {live.question}
        </p>
        <div className="rounded-3xl border-2 border-emerald-500/50 bg-emerald-500/10 px-12 py-8 text-center">
          <p className="text-2xl font-bold uppercase tracking-widest text-emerald-400">
            Answer
          </p>
          <p className="mt-2 text-6xl font-black text-emerald-200">
            {live.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

function RapidFireScreen({ live }: { live: LiveDisplay }) {
  const rf = live.rapidFire;
  if (!rf) return <WelcomeScreen live={live} />;
  return (
    <div className="flex flex-1 flex-col gap-8 p-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-6xl font-black tracking-tight text-yellow-300">
          ⚡ {rf.teamName}
        </h1>
        <div className="flex items-center gap-8 text-4xl font-bold">
          {!rf.finished && (
            <span className="text-slate-300">
              {rf.index + 1} / {rf.total}
            </span>
          )}
          <span className="text-emerald-400">{rf.correct} correct</span>
        </div>
      </header>
      <div className="flex flex-1 flex-col items-center justify-center gap-10 text-center">
        {rf.finished ? (
          <p className="text-7xl font-black text-emerald-400">
            {rf.correct} correct!
          </p>
        ) : (
          <>
            <p className="max-w-6xl text-6xl font-bold leading-tight">
              {rf.question}
            </p>
            {rf.showAnswer && rf.answer && (
              <p className="text-5xl font-black text-emerald-300">{rf.answer}</p>
            )}
          </>
        )}
      </div>
      {live.timer.endsAt !== null && !rf.finished && (
        <div className="flex justify-center">
          <CountdownTimer
            endsAt={live.timer.endsAt}
            durationSeconds={live.timer.durationSeconds}
            size="md"
          />
        </div>
      )}
    </div>
  );
}

function WinnerScreen({ live }: { live: LiveDisplay }) {
  const scores = live.scores ?? [];
  const champ = scores[0];
  return (
    <div className="flex flex-1 flex-col justify-center gap-10 p-10">
      <header className="text-center">
        <p className="text-4xl">🏆</p>
        <h1 className="mt-2 text-7xl font-black tracking-tight">
          {champ ? champ.name : "Final Results"}
        </h1>
        {champ && (
          <p className="mt-2 text-3xl font-semibold text-amber-300">Champions!</p>
        )}
      </header>
      <ScoreTable scores={scores} />
    </div>
  );
}
