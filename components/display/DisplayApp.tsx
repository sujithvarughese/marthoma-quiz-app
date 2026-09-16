"use client";

/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeLive } from "@/lib/firebaseClient";
import {
  welcomeLive,
  type LiveDisplay,
  type LiveScore,
} from "@/lib/live";
import { CountdownTimer } from "@/components/CountdownTimer";

/** Category color accents matching the host themes */
const CATEGORY_GRADIENTS = [
  {
    bg: "from-indigo-900/90 via-indigo-700/80 to-blue-950/90",
    border: "border-indigo-400/40",
    glow: "shadow-[0_0_35px_rgba(99,102,241,0.25)]",
    tag: "bg-indigo-500/30 text-indigo-200 border-indigo-400/30",
    num: "text-indigo-400/30",
  },
  {
    bg: "from-emerald-900/90 via-emerald-700/80 to-teal-950/90",
    border: "border-emerald-400/40",
    glow: "shadow-[0_0_35px_rgba(16,185,129,0.25)]",
    tag: "bg-emerald-500/30 text-emerald-200 border-emerald-400/30",
    num: "text-emerald-400/30",
  },
  {
    bg: "from-purple-900/90 via-purple-700/80 to-slate-950/90",
    border: "border-purple-400/40",
    glow: "shadow-[0_0_35px_rgba(168,85,247,0.25)]",
    tag: "bg-purple-500/30 text-purple-200 border-purple-400/30",
    num: "text-purple-400/30",
  },
  {
    bg: "from-sky-900/90 via-cyan-700/80 to-blue-950/90",
    border: "border-sky-400/40",
    glow: "shadow-[0_0_35px_rgba(56,189,248,0.25)]",
    tag: "bg-sky-500/30 text-sky-200 border-sky-400/30",
    num: "text-sky-400/30",
  },
  {
    bg: "from-amber-900/90 via-amber-700/80 to-orange-950/90",
    border: "border-amber-400/40",
    glow: "shadow-[0_0_35px_rgba(245,158,11,0.25)]",
    tag: "bg-amber-500/30 text-amber-200 border-amber-400/30",
    num: "text-amber-400/30",
  },
  {
    bg: "from-rose-900/90 via-rose-700/80 to-pink-950/90",
    border: "border-rose-400/40",
    glow: "shadow-[0_0_35px_rgba(244,63,94,0.25)]",
    tag: "bg-rose-500/30 text-rose-200 border-rose-400/30",
    num: "text-rose-400/30",
  },
];

interface ScoreDelta {
  id: string;
  teamId: string;
  delta: number;
  timestamp: number;
}

/**
 * Read-only projector screen. Subscribes to the live doc via onSnapshot and
 * renders high-contrast, broadcast-quality animations for projector audiences.
 */
export function DisplayApp() {
  return <DisplaySurface />;
}

function DisplaySurface() {
  const [live, setLive] = useState<LiveDisplay | null>(null);
  const [connected, setConnected] = useState(false);
  const [prevScreen, setPrevScreen] = useState<string | null>(null);
  const liveRef = useRef<LiveDisplay | null>(null);

  // Score deltas tracking (+5, -5, etc.)
  const prevScoresRef = useRef<Record<string, number>>({});
  const [scoreDeltas, setScoreDeltas] = useState<ScoreDelta[]>([]);

  const applyUpdate = useCallback((next: LiveDisplay | null) => {
    if (!next) return;
    setConnected(true);
    setLive((prev) => {
      if (!prev) {
        liveRef.current = next;
        // Record initial scores without delta fireworks
        if (next.scores) {
          const map: Record<string, number> = {};
          next.scores.forEach((s) => {
            map[s.id] = s.score;
          });
          prevScoresRef.current = map;
        }
        return next;
      }
      const prevTs = prev.updatedAt ?? 0;
      const nextTs = next.updatedAt ?? 0;
      if (nextTs >= prevTs) {
        if (prev.screen !== next.screen) {
          setPrevScreen(prev.screen);
        }
        liveRef.current = next;

        // Compare team scores to detect point awards
        if (next.scores) {
          const newDeltas: ScoreDelta[] = [];
          const currentMap: Record<string, number> = { ...prevScoresRef.current };

          next.scores.forEach((team) => {
            const oldScore = currentMap[team.id];
            if (oldScore !== undefined && oldScore !== team.score) {
              const diff = team.score - oldScore;
              newDeltas.push({
                id: `${team.id}-${Date.now()}-${Math.random()}`,
                teamId: team.id,
                delta: diff,
                timestamp: Date.now(),
              });
            }
            currentMap[team.id] = team.score;
          });

          prevScoresRef.current = currentMap;

          if (newDeltas.length > 0) {
            setScoreDeltas((prev) => [...prev, ...newDeltas]);
            // Clean up deltas after the burst animation completes (2.2s)
            setTimeout(() => {
              const now = Date.now();
              setScoreDeltas((cur) => cur.filter((d) => now - d.timestamp < 2100));
            }, 2200);
          }
        }

        return next;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    // 1. Real-time Firestore onSnapshot subscription (with auto-reconnect)
    const unsub = subscribeLive((l) => {
      if (l) applyUpdate(l);
    });

    // 2. Active fallback polling via HTTP endpoint
    let cancelled = false;
    const fetchFallback = async () => {
      try {
        const res = await fetch("/api/live", { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { live: LiveDisplay | null };
          if (!cancelled && data.live) {
            applyUpdate(data.live);
          }
        }
      } catch {
        // Fallback polling network errors are non-fatal
      }
    };

    void fetchFallback();
    const interval = setInterval(() => {
      void fetchFallback();
    }, 2000);

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void fetchFallback();
      }
    };
    window.addEventListener("focus", fetchFallback);
    window.addEventListener("online", fetchFallback);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener("focus", fetchFallback);
      window.removeEventListener("online", fetchFallback);
      document.removeEventListener("visibilitychange", onVisible);
      unsub();
    };
  }, [applyUpdate]);

  const currentLive =
    live ??
    welcomeLive("Wisdom Across Generations", "Mar Thoma Church of South Florida");

  const showScoreboardDock =
    currentLive.screen !== "welcome" &&
    currentLive.screen !== "scoreboard" &&
    currentLive.screen !== "winner";

  return (
    <div className="relative flex min-h-dvh flex-col bg-[#070b14] text-white selection:bg-amber-500 selection:text-slate-900 overflow-hidden">
      {/* Dynamic Projector Background Atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] h-[70vw] w-[70vw] rounded-full bg-radial from-indigo-600/15 via-blue-900/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-[20%] -right-[10%] h-[70vw] w-[70vw] rounded-full bg-radial from-blue-600/15 via-purple-900/5 to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[50vh] w-[80vw] rounded-full bg-radial from-amber-500/5 to-transparent blur-3xl" />
        {/* Subtle projector TV scanline texture */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:100%_4px] opacity-40" />
      </div>

      {!connected ? (
        <Centered>
          <div className="flex flex-col items-center gap-6">
            <div className="h-16 w-16 animate-spin rounded-full border-4 border-amber-400/30 border-t-amber-400 shadow-[0_0_25px_rgba(251,191,36,0.4)]" />
            <p className="text-3xl font-black tracking-wider text-amber-200">
              Connecting Projector…
            </p>
          </div>
        </Centered>
      ) : (
        <div className="relative z-10 flex flex-1 flex-col justify-between overflow-hidden">
          <main className="flex flex-1 flex-col overflow-hidden">
            <Screen
              live={currentLive}
              fromQuestion={
                prevScreen === "question" || prevScreen === "answer"
              }
            />
          </main>

          {/* Persistent Bottom Scoreboard Dock */}
          {showScoreboardDock && (
            <BottomScoreboardDock
              scores={currentLive.scores ?? []}
              activeTeamId={currentLive.activeTeamId}
              deltas={scoreDeltas}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Screen({
  live,
  fromQuestion = false,
}: {
  live: LiveDisplay;
  fromQuestion?: boolean;
}) {
  switch (live.screen) {
    case "welcome":
      return <WelcomeScreen live={live} />;
    case "scoreboard":
      return <ScoreboardScreen live={live} />;
    case "rounds":
      return <RoundsScreen live={live} />;
    case "board":
      return (
        <BoardScreen
          key={live.roundId ?? live.roundName ?? "board"}
          live={live}
          fromQuestion={fromQuestion}
        />
      );
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
/* SCREEN COMPONENTS                                                  */
/* ------------------------------------------------------------------ */

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-8 p-10 text-center">
      {children}
    </div>
  );
}

/** Active Team or Special Event Banner */
function ActiveBanner({ live }: { live: LiveDisplay }) {
  if (live.message) {
    return (
      <div className="inline-flex items-center gap-3 rounded-full border border-amber-400/50 bg-gradient-to-r from-amber-500/20 via-yellow-500/30 to-amber-500/20 px-8 py-3 shadow-[0_0_30px_rgba(251,191,36,0.3)] backdrop-blur-md">
        <span className="text-3xl font-black tracking-wider text-amber-200">
          ✨ {live.message}
        </span>
      </div>
    );
  }
  if (live.activeTeamName) {
    return (
      <div className="inline-flex items-center gap-4 rounded-full border border-emerald-400/50 bg-gradient-to-r from-emerald-950/80 via-emerald-800/40 to-emerald-950/80 px-8 py-3 shadow-[0_0_30px_rgba(16,185,129,0.3)] backdrop-blur-md">
        <span className="h-4 w-4 animate-ping rounded-full bg-emerald-400" />
        <p className="text-3xl font-bold text-slate-200">
          <span className="font-black text-emerald-300 drop-shadow-[0_0_15px_rgba(52,211,153,0.8)]">
            {live.activeTeamName}
          </span>{" "}
          to answer
        </p>
      </div>
    );
  }
  return null;
}

/** Welcome / Standby Screen */
function WelcomeScreen({ live }: { live: LiveDisplay }) {
  return (
    <Centered>
      <div className="flex flex-col items-center gap-6">
        <div className="inline-flex items-center gap-3 rounded-full border border-amber-400/40 bg-amber-400/10 px-8 py-3 text-2xl font-bold uppercase tracking-widest text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
          ✝️ Mar Thoma Church Quiz
        </div>
        <h1 className="text-7xl font-black tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] sm:text-8xl">
          {live.message ?? "Wisdom Across Generations"}
        </h1>
        <p className="mt-4 text-3xl font-semibold text-slate-300">
          Please wait for the host to begin the game
        </p>
      </div>
    </Centered>
  );
}

/** Categories / Choose a Round Screen */
function RoundsScreen({ live }: { live: LiveDisplay }) {
  const rounds = live.rounds ?? [];

  return (
    <div className="relative flex flex-1 flex-col justify-between p-10 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div>
          <div className="inline-block rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-4 py-1.5 text-lg font-black uppercase tracking-widest text-indigo-300">
            Game Categories
          </div>
          <h1 className="mt-2 text-6xl font-black tracking-tight text-white drop-shadow-lg">
            What&apos;s Ahead
          </h1>
        </div>
        <ActiveBanner live={live} />
      </header>

      {/* Grid of Category Cards (Read-only presentation for projector) */}
      <div className="my-auto grid grid-cols-1 gap-6 py-6 sm:grid-cols-2 lg:grid-cols-3">
        {rounds.map((r, i) => {
          const style = CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length];
          const isSelected = live.roundId === r.id;

          return (
            <div
              key={r.id}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 bg-gradient-to-br ${style.bg} ${style.border} ${style.glow} p-8 text-left shadow-2xl backdrop-blur-xl transition-all duration-500 select-none ${
                isSelected
                  ? "animate-category-chosen scale-105 ring-4 ring-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.6)] z-20"
                  : ""
              }`}
            >
              {/* Category Number watermark */}
              <span
                className={`absolute top-4 right-6 font-mono text-7xl font-black select-none ${style.num}`}
              >
                0{r.order}
              </span>

              <div className="relative z-10 flex flex-col gap-3">
                <span
                  className={`inline-block w-fit rounded-full border px-4 py-1 text-xs font-black uppercase tracking-wider ${style.tag}`}
                >
                  {r.type === "picture"
                    ? "🖼️ Picture Clues"
                    : r.type === "rapid_fire"
                      ? "⚡ Rapid Fire"
                      : "📖 Standard Round"}
                </span>
                <h2 className="text-3xl font-black leading-tight text-white drop-shadow-md">
                  {r.name}
                </h2>
                {r.description && (
                  <p className="mt-1 text-lg font-medium leading-snug text-slate-200/90">
                    {r.description}
                  </p>
                )}
              </div>

              <div className="relative z-10 mt-6 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-base font-bold text-slate-300">
                  {r.remainingQuestions} of {r.totalQuestions} questions left
                </span>
                {isSelected && (
                  <span className="animate-pulse font-black text-amber-300">
                    Selected!
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Standings Scoreboard Screen */
function ScoreboardScreen({ live }: { live: LiveDisplay }) {
  const scores = [...(live.scores ?? [])].sort((a, b) => b.score - a.score);
  return (
    <div className="flex flex-1 flex-col justify-center gap-10 p-10">
      <header className="text-center">
        <h1 className="text-7xl font-black tracking-tight text-amber-300 drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]">
          🏆 Current Standings
        </h1>
        <p className="mt-2 text-2xl font-semibold text-slate-400">
          Live Scores & Leaderboard
        </p>
      </header>
      <ScoreTable scores={scores} activeTeamId={live.activeTeamId} />
    </div>
  );
}

function ScoreTable({
  scores,
  activeTeamId,
}: {
  scores: LiveScore[];
  activeTeamId?: string | null;
}) {
  const maxScore = Math.max(0, ...scores.map((s) => s.score));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
      {scores.map((t, i) => {
        const isLeader = t.score > 0 && t.score === maxScore;
        const isActive = activeTeamId === t.id;

        return (
          <div
            key={t.id}
            className={`flex items-center justify-between gap-8 rounded-3xl border-2 px-10 py-7 transition-all ${
              isActive
                ? "border-emerald-400/70 bg-gradient-to-r from-emerald-950/60 to-slate-900/80 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                : "border-white/10 bg-slate-900/60 shadow-xl"
            }`}
          >
            <div className="flex items-center gap-8">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-800 text-3xl font-black text-slate-200 shadow-lg">
                {i + 1}
              </span>
              <span className="flex items-center gap-3 text-4xl font-extrabold tracking-wide text-white drop-shadow">
                {t.name}
                {isLeader && (
                  <span
                    className="text-3xl text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]"
                    aria-label="First place"
                    title="First place"
                  >
                    ⭐
                  </span>
                )}
              </span>
            </div>
            <span className="font-mono text-6xl font-black tabular-nums text-white">
              {t.score}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Jeopardy Question Grid Board */
function BoardScreen({
  live,
  fromQuestion = false,
}: {
  live: LiveDisplay;
  fromQuestion?: boolean;
}) {
  const tiles = live.board ?? [];
  // Only show the big category ceremony overlay when entering fresh from category select, never after answering a question
  const [showCeremony, setShowCeremony] = useState(!fromQuestion);

  // Auto-dismiss the ceremony banner after 2.2s so the question grid is prominent
  useEffect(() => {
    if (fromQuestion) return;
    const timer = window.setTimeout(() => {
      setShowCeremony(false);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [fromQuestion]);

  const remainingTiles = tiles.filter((t) => !t.used).length;

  return (
    <div className="relative flex flex-1 flex-col justify-between p-10 pb-6">
      {/* Category Selection Ceremony Announcement Overlay (only on initial category selection) */}
      {showCeremony && live.roundName && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-opacity duration-500">
          <div className="animate-category-reveal flex max-w-4xl flex-col items-center gap-6 rounded-3xl border-4 border-amber-400/90 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-950 p-12 text-center shadow-[0_0_90px_rgba(251,191,36,0.6)]">
            <div className="flex items-center gap-2 rounded-full border border-amber-400/70 bg-amber-400/20 px-8 py-2 text-2xl font-black uppercase tracking-widest text-amber-300 shadow-lg">
              ✨ CATEGORY SELECTED
            </div>
            <div className="text-2xl font-extrabold uppercase tracking-widest text-indigo-300">
              {live.roundOrder ? `Round ${live.roundOrder}` : "Question Category"}
            </div>
            <h2 className="text-7xl font-black tracking-tight text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.9)]">
              {live.roundName}
            </h2>
            {live.roundDescription && (
              <p className="max-w-2xl text-2xl font-semibold leading-relaxed text-slate-200">
                {live.roundDescription}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3 rounded-full bg-indigo-500/30 px-6 py-2 text-lg font-bold text-amber-300">
              <span className="h-3 w-3 animate-ping rounded-full bg-amber-400" />
              {remainingTiles} Questions on the Board
            </div>
          </div>
        </div>
      )}

      {/* Persistent Category Header Banner */}
      <header
        className={`${
          fromQuestion ? "" : "animate-category-banner"
        } flex flex-wrap items-center justify-between gap-6 rounded-3xl border-2 border-indigo-500/40 bg-gradient-to-r from-indigo-950/90 via-slate-900/90 to-indigo-950/90 p-6 shadow-2xl backdrop-blur-xl`}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <span className="rounded-lg border border-amber-400/70 bg-amber-400/20 px-4 py-1 text-base font-black uppercase tracking-widest text-amber-300 shadow-sm">
              {live.roundOrder ? `Round ${live.roundOrder}` : "Category"}
            </span>
            <span className="text-sm font-bold uppercase tracking-wider text-indigo-300">
              {remainingTiles} of {tiles.length} Questions Remaining
            </span>
          </div>
          <h1 className="mt-1 text-5xl font-black tracking-tight text-white drop-shadow-md">
            {live.roundName ?? "Question Board"}
          </h1>
          {live.roundDescription && (
            <p className="text-xl font-medium text-slate-300/90">
              {live.roundDescription}
            </p>
          )}
        </div>
        <ActiveBanner live={live} />
      </header>

      {/* Grid of Jeopardy Numbered Cards */}
      <div className="my-auto grid flex-1 grid-cols-5 content-center gap-8 py-8">
        {tiles.map((tile, i) => (
          <div
            key={tile.questionId}
            style={fromQuestion ? undefined : { animationDelay: `${i * 50}ms` }}
            className={`${
              fromQuestion ? "" : "animate-board-cascade"
            } relative flex aspect-square items-center justify-center rounded-3xl select-none transition-transform duration-300 ${
              tile.used
                ? "border border-white/5 bg-slate-900/40 text-white/20 shadow-inner"
                : "border-2 border-amber-400/70 bg-gradient-to-br from-[#0a2569] via-[#103b9b] to-[#081844] text-amber-300 shadow-[0_10px_35px_rgba(16,59,155,0.6),inset_0_2px_15px_rgba(251,191,36,0.25)]"
            }`}
          >
            {/* Outer Gold Border Accents */}
            {!tile.used && (
              <div className="pointer-events-none absolute inset-2 rounded-2xl border border-amber-400/30" />
            )}
            <span
              className={`font-mono text-8xl font-black drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] ${
                tile.used ? "text-slate-600 text-6xl" : "text-amber-300"
              }`}
            >
              {tile.used ? "✓" : tile.order}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Jeopardy Style 3D Card Fold-Out Question Screen Starting from the Number Tile */
function QuestionScreen({ live }: { live: LiveDisplay }) {
  const tiles = live.board ?? [];
  const questionNum = live.questionNumber ?? 1;
  const tileIndex = Math.max(0, Math.min(9, questionNum - 1));
  const cols = 5;
  const colIndex = tileIndex % cols; // 0, 1, 2, 3, 4
  const rowIndex = Math.floor(tileIndex / cols); // 0, 1

  // Compute 2D center offset to launch card directly from number tile position
  const launchX = (colIndex - 2) * 215;
  const launchY = rowIndex === 0 ? -115 : 115;

  return (
    <div className="relative flex flex-1 flex-col justify-between overflow-hidden p-10 pb-6">
      {/* Dimmed Board Grid in the background to anchor spatial origin */}
      {tiles.length > 0 && (
        <div className="pointer-events-none absolute inset-0 z-0 flex flex-col justify-between p-10 pb-6 opacity-20 filter blur-[1px] transition-opacity duration-1000">
          <header className="flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="inline-block rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-4 py-1.5 text-lg font-black uppercase tracking-widest text-indigo-300">
                Round Board
              </div>
              <h1 className="mt-2 text-6xl font-black tracking-tight text-white">
                {live.roundName ?? "Question Board"}
              </h1>
            </div>
          </header>
          <div className="my-auto grid flex-1 grid-cols-5 content-center gap-8 py-8">
            {tiles.map((tile) => {
              const isSelectedTile = tile.order === questionNum;
              return (
                <div
                  key={tile.questionId}
                  className={`relative flex aspect-square items-center justify-center rounded-3xl ${
                    isSelectedTile
                      ? "animate-tile-chosen ring-4 ring-amber-400 bg-amber-400/30 text-amber-300 shadow-[0_0_60px_rgba(251,191,36,0.9)]"
                      : tile.used
                        ? "border border-white/5 bg-slate-900/40 text-white/10"
                        : "border-2 border-amber-400/40 bg-gradient-to-br from-[#0a2569] to-[#081844] text-amber-300/40"
                  }`}
                >
                  <span className="font-mono text-8xl font-black">
                    {tile.order}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Foreground Question Content */}
      <header className="relative z-10 flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {live.roundName && (
            <div className="rounded-xl border border-indigo-400/40 bg-indigo-950/80 px-5 py-2 text-xl font-black uppercase tracking-widest text-indigo-300 shadow-md">
              {live.roundName}
            </div>
          )}
          {live.questionNumber && (
            <div className="rounded-xl border border-amber-400/60 bg-amber-500/20 px-5 py-2 text-xl font-black uppercase tracking-widest text-amber-300 shadow-md">
              Question {live.questionNumber}
            </div>
          )}
        </div>
        <ActiveBanner live={live} />
      </header>

      {/* 3D Fold-Out Jeopardy Question Card launching from Number Tile */}
      <div
        key={live.questionId ?? `q-${live.questionNumber}`}
        className="perspective-1500 relative z-10 my-auto flex flex-1 flex-col items-center justify-center py-6"
      >
        <div
          style={
            {
              "--launch-x": `${launchX}px`,
              "--launch-y": `${launchY}px`,
              "--launch-scale": "0.16",
            } as React.CSSProperties
          }
          className="animate-card-launch relative flex w-full max-w-6xl flex-col items-center justify-center rounded-3xl border-4 border-amber-400/80 bg-gradient-to-br from-[#0a1945] via-[#102d84] to-[#071337] p-12 text-center shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(251,191,36,0.35)] select-none"
        >
          {/* Inner Golden Trim Frame */}
          <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-amber-400/30" />

          {/* Number Watermark Badge */}
          {live.questionNumber && (
            <div className="pointer-events-none absolute top-4 left-6 select-none font-mono text-7xl font-black text-amber-300/15">
              #{live.questionNumber}
            </div>
          )}

          {live.imageUrl && (
            <div className="relative z-10 mb-8 overflow-hidden rounded-2xl border-2 border-amber-400/50 shadow-2xl">
              <img
                src={live.imageUrl}
                alt="Question visual"
                className="max-h-[38vh] w-auto object-contain"
              />
            </div>
          )}

          <p className="relative z-10 max-w-5xl text-5xl font-extrabold leading-snug tracking-wide text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] sm:text-6xl">
            {live.question}
          </p>

          {live.timer?.endsAt != null && (
            <div className="relative z-10 mt-10">
              <CountdownTimer
                endsAt={live.timer.endsAt}
                durationSeconds={live.timer.durationSeconds}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Correct Answer Revealed Screen */
function AnswerScreen({ live }: { live: LiveDisplay }) {
  return (
    <div className="flex flex-1 flex-col justify-between p-10 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {live.roundName && (
            <div className="rounded-xl border border-indigo-400/40 bg-indigo-950/80 px-5 py-2 text-xl font-black uppercase tracking-widest text-indigo-300">
              {live.roundName}
            </div>
          )}
          {live.questionNumber && (
            <div className="rounded-xl border border-amber-400/60 bg-amber-500/20 px-5 py-2 text-xl font-black uppercase tracking-widest text-amber-300">
              Question {live.questionNumber}
            </div>
          )}
        </div>
        <ActiveBanner live={live} />
      </header>

      <div className="perspective-1500 my-auto flex flex-1 flex-col items-center justify-center gap-8 py-6">
        {live.imageUrl && (
          <div className="overflow-hidden rounded-2xl border-2 border-slate-600 shadow-2xl">
            <img
              src={live.imageUrl}
              alt=""
              className="max-h-[30vh] w-auto object-contain"
            />
          </div>
        )}

        <p className="max-w-5xl text-center text-4xl font-semibold text-slate-300 drop-shadow">
          {live.question}
        </p>

        {/* 3D Animated Emerald Answer Box */}
        <div className="animate-answer-reveal w-full max-w-5xl rounded-3xl border-4 border-emerald-400/90 bg-gradient-to-br from-emerald-950/90 via-emerald-900/80 to-teal-950/90 p-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_60px_rgba(16,185,129,0.4)]">
          <p className="text-2xl font-black uppercase tracking-widest text-emerald-300">
            ✓ Correct Answer
          </p>
          <p className="mt-4 text-6xl font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] sm:text-7xl">
            {live.answer}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Rapid Fire Screen */
function RapidFireScreen({ live }: { live: LiveDisplay }) {
  const rf = live.rapidFire;
  if (!rf) return <WelcomeScreen live={live} />;

  return (
    <div className="flex flex-1 flex-col justify-between p-10 pb-6">
      <header className="flex flex-wrap items-center justify-between gap-6">
        <h1 className="text-6xl font-black tracking-tight text-yellow-300 drop-shadow-[0_0_25px_rgba(253,224,71,0.4)]">
          ⚡ {rf.teamName}
        </h1>
        {!rf.finished && (
          <span className="rounded-full border border-white/20 bg-white/10 px-6 py-2 text-4xl font-extrabold text-slate-200">
            {rf.answered} / {rf.total} answered
          </span>
        )}
      </header>

      <div className="perspective-1500 my-auto flex flex-1 flex-col items-center justify-center p-6 text-center">
        {rf.finished ? (
          <div className="rounded-3xl border-4 border-emerald-400/80 bg-emerald-950/80 p-16 shadow-[0_0_60px_rgba(16,185,129,0.4)]">
            <p className="text-4xl font-bold uppercase tracking-widest text-emerald-300">
              Answers Recorded!
            </p>
            <p className="mt-4 text-4xl font-black text-white">
              Results revealed after every team has played.
            </p>
          </div>
        ) : (
          <div className="animate-card-foldout relative flex w-full max-w-6xl flex-col items-center justify-center rounded-3xl border-4 border-yellow-400/80 bg-gradient-to-br from-slate-900 via-yellow-950/40 to-slate-950 p-12 shadow-[0_0_50px_rgba(250,204,21,0.25)]">
            <p className="max-w-5xl text-6xl font-black leading-tight text-white drop-shadow-lg">
              {rf.question}
            </p>
          </div>
        )}
      </div>

      {live.timer?.endsAt != null && !rf.finished && (
        <div className="flex justify-center pb-4">
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

/** Champions / Final Results Screen */
function WinnerScreen({ live }: { live: LiveDisplay }) {
  const scores = [...(live.scores ?? [])].sort((a, b) => b.score - a.score);
  const champ = scores[0];

  return (
    <div className="flex flex-1 flex-col justify-center gap-10 p-10">
      <header className="text-center">
        <span className="text-7xl drop-shadow-[0_0_40px_rgba(251,191,36,0.8)]">
          🏆
        </span>
        <h1 className="mt-3 text-8xl font-black tracking-tight text-amber-300 drop-shadow-[0_0_40px_rgba(251,191,36,0.5)]">
          {champ ? champ.name : "Final Standings"}
        </h1>
        {champ && (
          <p className="mt-2 text-4xl font-extrabold text-white">
            GRAND CHAMPIONS!
          </p>
        )}
      </header>
      <ScoreTable scores={scores} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PERSISTENT BOTTOM SCOREBOARD WITH ANIMATED DELTAS (+5 / -5)        */
/* ------------------------------------------------------------------ */

/** Playful per-team color identity, echoing the round-card palette above. */
const TEAM_ACCENTS = [
  { chip: "bg-indigo-500/25 border-indigo-400/50", badge: "bg-indigo-400 text-indigo-950" },
  { chip: "bg-emerald-500/25 border-emerald-400/50", badge: "bg-emerald-400 text-emerald-950" },
  { chip: "bg-purple-500/25 border-purple-400/50", badge: "bg-purple-400 text-purple-950" },
  { chip: "bg-sky-500/25 border-sky-400/50", badge: "bg-sky-400 text-sky-950" },
  { chip: "bg-amber-500/25 border-amber-400/50", badge: "bg-amber-400 text-amber-950" },
  { chip: "bg-rose-500/25 border-rose-400/50", badge: "bg-rose-400 text-rose-950" },
];

function BottomScoreboardDock({
  scores,
  activeTeamId,
  deltas,
}: {
  scores: LiveScore[];
  activeTeamId?: string | null;
  deltas: ScoreDelta[];
}) {
  if (scores.length === 0) return null;
  const maxScore = Math.max(0, ...scores.map((s) => s.score));

  return (
    <footer className="relative z-30 border-t-2 border-white/10 bg-gradient-to-b from-slate-950/80 to-slate-950/95 px-6 py-5 shadow-[0_-15px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl">
      <div className="mx-auto flex flex-wrap items-center justify-center gap-3 py-2">
        {scores.map((team, idx) => {
          const isActive = activeTeamId === team.id;
          const isLeader = team.score > 0 && team.score === maxScore;
          const teamDeltas = deltas.filter((d) => d.teamId === team.id);
          const accent = TEAM_ACCENTS[idx % TEAM_ACCENTS.length];

          return (
            <div
              key={team.id}
              className={`relative flex flex-shrink-0 items-center gap-3 rounded-full border px-5 py-3 transition-all duration-300 ${accent.chip} ${
                isActive
                  ? "ring-2 ring-emerald-400/80 shadow-[0_0_24px_rgba(16,185,129,0.4)]"
                  : "shadow-md"
              }`}
            >
              {/* Big Score Burst (+5 / -5) — large and unmissable from the audience. */}
              {teamDeltas.length > 0 && (
                <div className="pointer-events-none absolute -top-4 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center">
                  {teamDeltas.map((d) => (
                    <span
                      key={d.id}
                      className={`whitespace-nowrap font-mono text-5xl font-black sm:text-6xl ${
                        d.delta > 0
                          ? "animate-score-burst-up text-emerald-400 drop-shadow-[0_0_25px_rgba(52,211,153,0.95)]"
                          : "animate-score-burst-down text-rose-400 drop-shadow-[0_0_25px_rgba(244,63,94,0.95)]"
                      }`}
                    >
                      {d.delta > 0 ? `+${d.delta}` : d.delta}
                    </span>
                  ))}
                </div>
              )}

              {/* Team Index (Preserved Order) */}
              <span
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-black shadow-inner ${accent.badge}`}
              >
                {idx + 1}
              </span>

              {/* Team Name */}
              <span className="whitespace-nowrap text-lg font-black tracking-wide text-white">
                {team.name}
              </span>

              {/* First Place Star */}
              {isLeader && (
                <span
                  className="animate-bounce flex-shrink-0 text-base text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  aria-label="First place"
                  title="First place"
                >
                  ⭐
                </span>
              )}

              {/* Team Score */}
              <span className="font-mono text-2xl font-black tabular-nums text-white">
                {team.score}
              </span>
            </div>
          );
        })}
      </div>
    </footer>
  );
}
