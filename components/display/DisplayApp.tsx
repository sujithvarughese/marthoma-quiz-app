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
import { useGameShowAudio } from "@/lib/useGameShowAudio";

/** Category color accents matching the host themes */
const CATEGORY_GRADIENTS = [
  {
    bg: "from-indigo-900/90 via-indigo-700/80 to-blue-950/90",
    border: "border-indigo-400/40",
    glow: "shadow-[0_0_35px_rgba(99,102,241,0.25)]",
    tag: "bg-indigo-500/30 text-indigo-200 border-indigo-400/30",
    num: "text-indigo-300/70",
  },
  {
    bg: "from-emerald-900/90 via-emerald-700/80 to-teal-950/90",
    border: "border-emerald-400/40",
    glow: "shadow-[0_0_35px_rgba(16,185,129,0.25)]",
    tag: "bg-emerald-500/30 text-emerald-200 border-emerald-400/30",
    num: "text-emerald-300/70",
  },
  {
    bg: "from-purple-900/90 via-purple-700/80 to-slate-950/90",
    border: "border-purple-400/40",
    glow: "shadow-[0_0_35px_rgba(168,85,247,0.25)]",
    tag: "bg-purple-500/30 text-purple-200 border-purple-400/30",
    num: "text-purple-300/70",
  },
  {
    bg: "from-sky-900/90 via-cyan-700/80 to-blue-950/90",
    border: "border-sky-400/40",
    glow: "shadow-[0_0_35px_rgba(56,189,248,0.25)]",
    tag: "bg-sky-500/30 text-sky-200 border-sky-400/30",
    num: "text-sky-300/70",
  },
  {
    bg: "from-amber-900/90 via-amber-700/80 to-orange-950/90",
    border: "border-amber-400/40",
    glow: "shadow-[0_0_35px_rgba(245,158,11,0.25)]",
    tag: "bg-amber-500/30 text-amber-200 border-amber-400/30",
    num: "text-amber-300/70",
  },
  {
    bg: "from-rose-900/90 via-rose-700/80 to-pink-950/90",
    border: "border-rose-400/40",
    glow: "shadow-[0_0_35px_rgba(244,63,94,0.25)]",
    tag: "bg-rose-500/30 text-rose-200 border-rose-400/30",
    num: "text-rose-300/70",
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

  const { unlocked, muted, enable, toggleMute } = useGameShowAudio(currentLive);

  const showScoreboardDock =
    currentLive.screen !== "welcome" &&
    currentLive.screen !== "scoreboard" &&
    currentLive.screen !== "winner" &&
    currentLive.screen !== "rules";

  return (
    <div className="relative flex h-dvh flex-col bg-[#070b14] text-white selection:bg-amber-500 selection:text-slate-900 overflow-hidden">
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
        <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between overflow-hidden">
          <main className="flex min-h-0 flex-1 flex-col overflow-y-auto">
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

      {/* Audio needs a user gesture before it's allowed to play — whoever
          sets up the projector taps this once and it disappears. */}
      {connected && !unlocked && (
        <button
          onClick={enable}
          className="animate-pulse fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-amber-400/60 bg-slate-950/90 px-5 py-3 text-lg font-bold text-amber-200 shadow-[0_0_25px_rgba(251,191,36,0.35)] backdrop-blur-md"
        >
          🔊 Tap to enable sound
        </button>
      )}

      {connected && unlocked && (
        <button
          onClick={toggleMute}
          aria-label={muted ? "Unmute" : "Mute"}
          title={muted ? "Unmute" : "Mute"}
          className="fixed bottom-4 right-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-lg text-slate-300 opacity-40 backdrop-blur-md transition-opacity hover:opacity-100"
        >
          {muted ? "🔇" : "🔈"}
        </button>
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
    case "rapid_review":
      return <RapidReviewScreen live={live} />;
    case "winner":
      return <WinnerScreen live={live} />;
    case "rules":
      return <RulesScreen live={live} />;
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

/**
 * welcomeLive() always formats its message as "<subtitle> — <name>" (see
 * lib/live.ts) — split it back into a small eyebrow line and the big
 * headline rather than rendering the whole thing as one giant sentence.
 */
function splitWelcomeMessage(message: string | null): [string, string] {
  const fallback: [string, string] = [
    "Mar Thoma Church Quiz",
    "Wisdom Across Generations",
  ];
  if (!message) return fallback;
  const parts = message.split(" — ");
  return parts.length === 2 ? [parts[0], parts[1]] : [fallback[0], message];
}

/**
 * Welcome / Standby Screen — the projector sits here for minutes at a time
 * before the host starts the game, so the crest gets slow ambient motion
 * (a rotating light sweep, a soft breathing glow, a gentle float) and the
 * headline shimmers, to keep the audience's eye occupied while they wait.
 */
function WelcomeScreen({ live }: { live: LiveDisplay }) {
  const [eyebrow, headline] = splitWelcomeMessage(live.message);

  return (
    <Centered>
      <div className="flex flex-col items-center gap-8">
        <div className="relative flex items-center justify-center py-4">
          <div className="animate-spotlight-rotate absolute h-72 w-72 rounded-full bg-radial from-amber-400/30 via-amber-500/5 to-transparent blur-2xl sm:h-96 sm:w-96" />
          <div className="animate-gold-pulse absolute h-48 w-48 rounded-full sm:h-60 sm:w-60" />
          <img
            src="/marthomalogo.png"
            alt="Mar Thoma Church crest — Lighted to Lighten"
            className="animate-logo-float relative h-40 w-auto mix-blend-screen drop-shadow-[0_10px_40px_rgba(251,191,36,0.35)] sm:h-52"
          />
        </div>

        <div className="inline-flex items-center gap-3 rounded-full border border-amber-400/40 bg-amber-400/10 px-8 py-3 text-2xl font-bold uppercase tracking-widest text-amber-300 shadow-[0_0_30px_rgba(251,191,36,0.2)]">
          ✝️ {eyebrow}
        </div>

        <h1 className="animate-shimmer-text bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-7xl font-black tracking-tight text-transparent sm:text-8xl">
          {headline}
        </h1>

        <p className="mt-4 flex items-center gap-3 text-3xl font-semibold text-slate-300">
          Please wait for the host to begin the game
          <span className="inline-flex gap-1.5" aria-hidden="true">
            <span className="animate-wait-dot h-3 w-3 rounded-full bg-amber-300 [animation-delay:0ms]" />
            <span className="animate-wait-dot h-3 w-3 rounded-full bg-amber-300 [animation-delay:200ms]" />
            <span className="animate-wait-dot h-3 w-3 rounded-full bg-amber-300 [animation-delay:400ms]" />
          </span>
        </p>
      </div>
    </Centered>
  );
}

/** Categories / Choose a Round Screen */
function RoundsScreen({ live }: { live: LiveDisplay }) {
  const rounds = live.rounds ?? [];

  // Only 3 columns (lg) ever leaves a remainder — a single trailing card
  // (Rapid Fire, always last) — so centering only needs to handle that case.
  const lgCols = 3;
  const trailingCount = rounds.length % lgCols;

  return (
    <div className="relative flex min-h-0 flex-1 flex-col justify-between p-8 pb-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-block rounded-lg border border-indigo-400/40 bg-indigo-500/20 px-4 py-1.5 text-lg font-black uppercase tracking-widest text-indigo-300">
            Game Categories
          </div>
          <h1 className="mt-2 text-5xl font-black tracking-tight text-white drop-shadow-lg">
            What&apos;s Ahead
          </h1>
        </div>
        {/* The tiebreaker only shows up here once it's eligible (rather than
            a permanent 7th tile) — sitting in the header keeps the card
            grid's row math (and the page's total height) unchanged. */}
        <div className="flex flex-wrap items-center gap-4">
          {live.focusId === "tiebreaker" && (
            <div className="animate-focus-glow inline-flex items-center gap-3 rounded-full border-2 border-rose-400/70 bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-rose-950/80 px-6 py-3 shadow-lg backdrop-blur-md">
              <span className="text-2xl">🔥</span>
              <span className="text-2xl font-black tracking-wide text-rose-200">
                Tiebreaker Ready!
              </span>
            </div>
          )}
          <ActiveBanner live={live} />
        </div>
      </header>

      {/* Grid of Category Cards (Read-only presentation for projector).
          CSS Grid with auto-rows-fr so every row shares the remaining
          height equally — the grid always fills exactly the space left
          after the header/dock, so the page never needs to scroll no
          matter how many rounds there are. A trailing lone card (Rapid
          Fire, always last) is nudged into the middle column to center it
          instead of sticking to the grid's first column. */}
      <div className="my-auto grid min-h-0 flex-1 auto-rows-fr grid-cols-1 gap-3 py-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 lg:gap-6">
        {rounds.map((r, i) => {
          const isRapidFire = r.type === "rapid_fire";
          const style = CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length];
          const isSelected = live.roundId === r.id;
          const isCompleted = r.remainingQuestions === 0;
          const isCenteredTrailer =
            trailingCount === 1 && i === rounds.length - 1;
          // "Up next" glow — suppressed once the card is actively selected
          // (that ring already says "look here"), and combined into a
          // single animation declaration for Rapid Fire, which already has
          // its own permanent gold pulse (an element can only run one
          // `animation` shorthand, so the two can't come from separate
          // classes).
          const isFocus = live.focusId === r.id && !isSelected;

          return (
            <div
              key={r.id}
              className={`group relative flex h-full min-h-0 flex-col justify-between overflow-hidden rounded-3xl border-2 p-3 text-left shadow-2xl backdrop-blur-xl transition-all duration-500 select-none sm:p-5 lg:p-8 ${
                isCenteredTrailer ? "lg:col-start-2" : ""
              } ${
                isRapidFire
                  ? `${isFocus ? "animate-gold-pulse-focus" : "animate-gold-pulse"} border-amber-300 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600`
                  : `${isFocus ? "animate-focus-glow" : ""} bg-gradient-to-br ${style.bg} ${style.border} ${style.glow}`
              } ${
                isSelected
                  ? "animate-category-chosen scale-105 ring-4 ring-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.6)] z-20"
                  : ""
              } ${isCompleted ? "opacity-60" : ""}`}
            >
              {/* Watermark — a bolt for Rapid Fire instead of a round number,
                  since it isn't picked off a numbered board like the others. */}
              {isRapidFire ? (
                <span
                  className="absolute -right-1 -top-1 text-5xl text-black/10 select-none sm:-right-2 sm:-top-2 sm:text-7xl lg:-right-4 lg:-top-4 lg:text-9xl"
                  aria-hidden="true"
                >
                  ⚡
                </span>
              ) : (
                <span
                  className={`absolute top-2 right-3 font-mono text-4xl font-black select-none sm:top-3 sm:right-4 sm:text-6xl lg:top-5 lg:right-7 lg:text-8xl ${style.num}`}
                >
                  0{r.order}
                </span>
              )}

              <div className="relative z-10 flex min-h-0 flex-col gap-1 overflow-hidden sm:gap-2 lg:gap-3">
                {/* Badges hidden below sm: with 7 cards in a single column, a
                    row is only tall enough for the title itself — the round
                    number watermark and footer status already carry enough
                    context at that size. */}
                <div className="hidden flex-wrap items-center gap-2 sm:flex">
                  <span
                    className={`inline-block w-fit rounded-full border px-4 py-1 text-xs font-black uppercase tracking-wider lg:px-5 lg:py-1.5 lg:text-sm ${
                      isRapidFire
                        ? "border-slate-950/25 bg-slate-950/15 text-slate-950"
                        : style.tag
                    }`}
                  >
                    {isRapidFire
                      ? "⚡ Special Round"
                      : r.type === "picture"
                        ? "🖼️ Picture Clues"
                        : "📖 Standard Round"}
                  </span>
                  {/* Completed badge — mirrors the host's round cards. */}
                  {isCompleted && (
                    <span className="inline-flex w-fit items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-black uppercase tracking-wide text-white shadow-lg lg:px-4 lg:py-1.5 lg:text-sm">
                      ✓ Completed
                    </span>
                  )}
                </div>
                <h2
                  className={`line-clamp-1 text-lg font-black leading-tight drop-shadow-md sm:line-clamp-2 sm:text-2xl lg:text-4xl ${
                    isRapidFire ? "text-slate-950" : "text-white"
                  }`}
                >
                  {r.name}
                </h2>
                {/* Hidden below sm: for the same reason as the badges above. */}
                {r.description && (
                  <p
                    className={`hidden text-sm font-medium leading-snug sm:line-clamp-2 lg:line-clamp-3 lg:text-xl ${
                      isRapidFire ? "text-slate-900/80" : "text-slate-200/90"
                    }`}
                  >
                    {r.description}
                  </p>
                )}
              </div>

              <div
                className={`relative z-10 flex shrink-0 items-center justify-between border-t pt-2 sm:pt-3 lg:pt-4 ${
                  isRapidFire ? "border-slate-950/20" : "border-white/10"
                }`}
              >
                <span
                  className={`text-xs font-bold sm:text-sm lg:text-lg ${
                    isRapidFire ? "text-slate-900" : "text-slate-300"
                  }`}
                >
                  {isCompleted
                    ? "All Questions Played"
                    : `${r.remainingQuestions} of ${r.totalQuestions} questions left`}
                </span>
                {isSelected && (
                  <span className="animate-pulse text-xs font-black text-amber-300 sm:text-sm lg:text-lg">
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
        <div className="relative mx-auto mb-2 flex h-24 w-24 items-center justify-center">
          <div className="animate-spotlight-rotate absolute h-24 w-24 rounded-full bg-radial from-amber-400/30 via-amber-500/5 to-transparent blur-xl" />
          <span className="relative text-7xl drop-shadow-[0_0_30px_rgba(251,191,36,0.4)]">
            🏆
          </span>
        </div>
        <h1 className="animate-shimmer-text bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-7xl font-black tracking-tight text-transparent">
          Current Standings
        </h1>
        <p className="mt-2 text-2xl font-semibold text-slate-400">
          Live Scores & Leaderboard
        </p>
      </header>
      <ScoreTable scores={scores} activeTeamId={live.activeTeamId} />
    </div>
  );
}

/** Medal for the top 3 rows — replaces the old plain leader star. */
const MEDALS = ["👑", "🥈", "🥉"];

const TIER_STYLES = [
  "border-amber-400/80 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-slate-900/80 shadow-[0_0_40px_rgba(251,191,36,0.3)]",
  "border-slate-300/50 bg-gradient-to-r from-slate-600/40 via-slate-800/40 to-slate-900/80 shadow-[0_0_25px_rgba(203,213,225,0.15)]",
  "border-orange-700/60 bg-gradient-to-r from-orange-950/50 via-orange-900/30 to-slate-900/80 shadow-[0_0_25px_rgba(194,120,3,0.2)]",
];

// Row sizing shrinks as the team count grows so any realistic roster still
// fits the 1200px projector height without the page needing to scroll.
function scoreRowSizing(count: number) {
  if (count <= 6) return { gap: "gap-5", pad: "px-10 py-7", name: "text-4xl", score: "text-6xl" };
  if (count <= 9) return { gap: "gap-3", pad: "px-8 py-4", name: "text-3xl", score: "text-5xl" };
  return { gap: "gap-2", pad: "px-6 py-2", name: "text-2xl", score: "text-4xl" };
}

function ScoreTable({
  scores,
  activeTeamId,
}: {
  scores: LiveScore[];
  activeTeamId?: string | null;
}) {
  const maxScore = Math.max(0, ...scores.map((s) => s.score));
  const sizing = scoreRowSizing(scores.length);

  return (
    <div className={`mx-auto flex w-full max-w-5xl flex-col ${sizing.gap}`}>
      {scores.map((t, i) => {
        const isActive = activeTeamId === t.id;
        const tier = i < 3 && t.score > 0 ? i : null;
        const barPct = maxScore > 0 ? (t.score / maxScore) * 100 : 0;

        return (
          <div
            key={t.id}
            style={{ animationDelay: `${i * 90}ms` }}
            className={`animate-board-cascade relative flex items-center justify-between gap-8 overflow-hidden rounded-3xl border-2 ${sizing.pad} transition-all ${
              isActive
                ? "border-emerald-400/70 bg-gradient-to-r from-emerald-950/60 to-slate-900/80 shadow-[0_0_30px_rgba(16,185,129,0.25)]"
                : tier !== null
                  ? TIER_STYLES[tier]
                  : "border-white/10 bg-slate-900/60 shadow-xl"
            }`}
          >
            {/* Continuous glow pulse for 1st place — its own layer, since an
                element can only run one `animation` shorthand at a time and
                this row already animates in via animate-board-cascade. */}
            {tier === 0 && !isActive && (
              <div className="animate-gold-pulse pointer-events-none absolute inset-0 rounded-3xl" />
            )}

            {/* Score proportion bar — fills in once on mount */}
            <div
              className="animate-bar-fill pointer-events-none absolute inset-y-0 left-0 bg-white/10"
              style={
                {
                  "--bar-target": `${barPct}%`,
                  animationDelay: `${i * 90 + 150}ms`,
                } as React.CSSProperties
              }
            />

            <div className="relative z-10 flex items-center gap-4">
              {tier !== null && (
                <span
                  className="text-4xl drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]"
                  aria-label={
                    tier === 0 ? "First place" : tier === 1 ? "Second place" : "Third place"
                  }
                  title={
                    tier === 0 ? "First place" : tier === 1 ? "Second place" : "Third place"
                  }
                >
                  {MEDALS[tier]}
                </span>
              )}
              <span
                className={`font-extrabold tracking-wide text-white drop-shadow ${sizing.name}`}
              >
                {t.name}
              </span>
            </div>
            <span
              className={`relative z-10 font-mono font-black tabular-nums text-white ${sizing.score}`}
            >
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

      {/* Grid of Jeopardy Numbered Cards — the Picture Round always has
          exactly 5 questions, so it gets one unbroken row instead of
          wrapping 4+1 like the 8-question standard rounds. Capped to
          max-w so tiles (aspect-square, sized off column width) can't grow
          tall enough on a 1920px-wide projector to push the two-row
          standard layout past the 1200px viewport height. */}
      <div
        className={`mx-auto my-auto grid min-h-0 w-full max-w-[1500px] flex-1 content-center gap-8 py-8 ${
          tiles.length === 5 ? "grid-cols-5" : "grid-cols-2 sm:grid-cols-4"
        }`}
      >
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
// Question length varies a lot (some are short, some are long bilingual
// Bible questions with an English + Malayalam translation) — the projector
// is a fixed 1920x1200, so text and timer size must shrink for long
// questions instead of ever needing to scroll or clip.
function questionTextClasses(len: number) {
  if (len <= 90) return "max-w-5xl text-5xl sm:text-6xl";
  if (len <= 150) return "max-w-5xl text-4xl sm:text-5xl";
  if (len <= 220) return "max-w-6xl text-3xl sm:text-4xl";
  if (len <= 320) return "max-w-6xl text-2xl sm:text-3xl";
  return "max-w-7xl text-xl sm:text-2xl";
}

function QuestionScreen({ live }: { live: LiveDisplay }) {
  const tiles = live.board ?? [];
  const questionNum = live.questionNumber ?? 1;
  const questionLen = live.question?.length ?? 0;
  const isLongQuestion = questionLen > 150;
  const cols = 4;
  const tileIndex = Math.max(0, Math.min(tiles.length - 1, questionNum - 1));
  const colIndex = tileIndex % cols; // 0, 1, 2, 3
  const rowIndex = Math.floor(tileIndex / cols); // 0, 1

  // Compute 2D center offset to launch card directly from number tile position
  const launchX = (colIndex - (cols - 1) / 2) * 215;
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
          <div className="my-auto grid flex-1 grid-cols-2 content-center gap-8 py-8 sm:grid-cols-4">
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

      {/* Card Flip Reveal: the chosen tile travels from its board position to
          center stage while physically flipping from face-down to the
          question — slow and deliberate so the audience can watch it happen. */}
      <div
        key={live.questionId ?? `q-${live.questionNumber}`}
        className="perspective-1500 relative z-10 my-auto flex flex-1 flex-col items-center justify-center py-6"
      >
        <div
          style={
            {
              "--launch-x": `${launchX}px`,
              "--launch-y": `${launchY}px`,
              "--launch-scale": "0.2",
            } as React.CSSProperties
          }
          className="animate-card-reveal-travel relative w-full max-w-6xl"
        >
          <div className="animate-card-reveal-flip relative grid">
            {/* FRONT FACE — face-down tile, shown before the flip */}
            <div className="card-face relative flex flex-col items-center justify-center rounded-3xl border-4 border-amber-400/80 bg-gradient-to-br from-[#0a2569] via-[#103b9b] to-[#081844] p-12 text-center shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(251,191,36,0.35)] select-none">
              <div className="pointer-events-none absolute inset-3 rounded-2xl border-2 border-amber-400/30" />
              {live.questionNumber && (
                <span className="font-mono text-9xl font-black text-amber-300 drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                  {live.questionNumber}
                </span>
              )}
            </div>

            {/* BACK FACE — the actual question, revealed by the flip */}
            <div className="card-face card-face-back relative flex flex-col items-center justify-center rounded-3xl border-4 border-amber-400/80 bg-gradient-to-br from-[#0a1945] via-[#102d84] to-[#071337] p-12 text-center shadow-[0_20px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(251,191,36,0.35)] select-none">
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

              <p
                className={`relative z-10 font-extrabold leading-snug tracking-wide text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] ${questionTextClasses(questionLen)}`}
              >
                {live.question}
              </p>

              {live.timer?.endsAt != null && (
                <div
                  className={`relative z-10 ${isLongQuestion ? "mt-5" : "mt-10"}`}
                >
                  <CountdownTimer
                    endsAt={live.timer.endsAt}
                    durationSeconds={live.timer.durationSeconds}
                    size={isLongQuestion ? "md" : "lg"}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Secondary/faded question recap on the answer-reveal screen — same long
// bilingual questions as QuestionScreen, but scaled down since it's no
// longer the star of the screen (the answer box is).
function answerRecapClasses(len: number) {
  if (len <= 150) return "max-w-5xl text-3xl sm:text-4xl";
  if (len <= 300) return "max-w-6xl text-2xl sm:text-3xl";
  return "max-w-6xl text-xl sm:text-2xl";
}

function answerTextClasses(len: number) {
  if (len <= 40) return "text-6xl sm:text-7xl";
  if (len <= 70) return "text-5xl sm:text-6xl";
  return "text-4xl sm:text-5xl";
}

/** Correct Answer Revealed Screen */
function AnswerScreen({ live }: { live: LiveDisplay }) {
  const questionLen = live.question?.length ?? 0;
  const answerLen = live.answer?.length ?? 0;
  const isLongQuestion = questionLen > 150;

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between p-10 pb-6">
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

      <div
        className={`perspective-1500 my-auto flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden py-6 ${isLongQuestion ? "gap-4" : "gap-8"}`}
      >
        {live.imageUrl && (
          <div className="overflow-hidden rounded-2xl border-2 border-slate-600 shadow-2xl">
            <img
              src={live.imageUrl}
              alt=""
              className="max-h-[28vh] w-auto object-contain"
            />
          </div>
        )}

        <p
          className={`text-center font-semibold text-slate-300 drop-shadow ${answerRecapClasses(questionLen)}`}
        >
          {live.question}
        </p>

        {/* 3D Animated Emerald Answer Box */}
        <div
          className={`animate-answer-reveal w-full max-w-5xl rounded-3xl border-4 border-emerald-400/90 bg-gradient-to-br from-emerald-950/90 via-emerald-900/80 to-teal-950/90 text-center shadow-[0_20px_60px_rgba(0,0,0,0.8),0_0_60px_rgba(16,185,129,0.4)] ${isLongQuestion ? "p-6" : "p-10"}`}
        >
          <p className="text-2xl font-black uppercase tracking-widest text-emerald-300">
            ✓ Correct Answer
          </p>
          <p
            className={`mt-4 font-black text-white drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)] ${answerTextClasses(answerLen)}`}
          >
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
        ) : !rf.started ? (
          <div className="rounded-3xl border-4 border-yellow-400/80 bg-gradient-to-br from-slate-900 via-yellow-950/40 to-slate-950 p-16 shadow-[0_0_50px_rgba(250,204,21,0.25)]">
            <p className="text-4xl font-bold uppercase tracking-widest text-yellow-300">
              Get Ready!
            </p>
            <p className="mt-4 text-5xl font-black text-white">
              {rf.teamName}, you&apos;re up
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

      {live.timer?.endsAt != null && !rf.finished && rf.started && (
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

/** Rapid Fire Review Screen — family-feud-style reveal board */
function RapidReviewScreen({ live }: { live: LiveDisplay }) {
  const rv = live.rapidReview;
  if (!rv) return <WelcomeScreen live={live} />;

  return (
    <div className="flex flex-1 flex-col p-10 pb-6">
      <header className="mb-6 text-center">
        <div className="inline-block rounded-lg border border-yellow-400/40 bg-yellow-500/10 px-4 py-1.5 text-lg font-black uppercase tracking-widest text-yellow-300">
          Rapid Fire Review
        </div>
        <h1 className="mt-2 text-6xl font-black tracking-tight text-white drop-shadow-lg">
          ⚡ {rv.teamName}
        </h1>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-3">
        {rv.items.map((item, i) => {
          const isCurrent = i === rv.currentIndex;
          return (
            <div
              key={i}
              className={`flex items-center justify-between gap-6 rounded-2xl border-2 px-8 py-5 transition-all duration-500 ${
                item.status === "correct"
                  ? "border-emerald-400/70 bg-emerald-950/50"
                  : item.status === "incorrect"
                    ? "border-rose-400/70 bg-rose-950/50"
                    : isCurrent
                      ? "border-amber-400/80 bg-amber-950/30 shadow-[0_0_30px_rgba(251,191,36,0.25)]"
                      : "border-white/10 bg-white/5"
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-lg font-bold text-slate-400">
                  {item.question}
                </p>
                <p className="mt-1 truncate text-3xl font-black text-white">
                  {item.teamAnswer}
                </p>
              </div>

              <div className="flex flex-shrink-0 items-center gap-4">
                {item.correctAnswer ? (
                  <p className="animate-answer-reveal text-3xl font-black text-emerald-300">
                    {item.correctAnswer}
                  </p>
                ) : (
                  <p className="text-3xl font-black tracking-widest text-slate-600">
                    ?????
                  </p>
                )}
                {item.status === "correct" && (
                  <span className="text-4xl">✅</span>
                )}
                {item.status === "incorrect" && (
                  <span className="text-4xl">❌</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Lightweight CSS-only confetti — randomized once per mount, never re-rolled. */
const CONFETTI_COLORS = ["#fbbf24", "#34d399", "#38bdf8", "#f472b6", "#a78bfa", "#fb923c"];

interface ConfettiPiece {
  id: number;
  left: number;
  color: string;
  width: number;
  height: number;
  duration: number;
  delay: number;
  drift: number;
  spin: number;
  rounded: boolean;
}

// Randomized (impure), so this must only ever be called from an effect —
// never inline during render — to keep the component itself pure.
function rollConfettiPieces(count: number): ConfettiPiece[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    width: 6 + Math.random() * 8,
    height: 10 + Math.random() * 10,
    duration: 4 + Math.random() * 3.5,
    delay: Math.random() * 4,
    drift: (Math.random() - 0.5) * 220,
    spin: 360 + Math.random() * 360,
    rounded: Math.random() > 0.5,
  }));
}

function Confetti({ count = 32 }: { count?: number }) {
  // A lazy useState initializer is the sanctioned way to run one-time,
  // impure setup (random rolls) exactly once at mount without touching it
  // on every render.
  const [pieces] = useState<ConfettiPiece[]>(() => rollConfettiPieces(count));

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`confetti-piece ${p.rounded ? "rounded-full" : "rounded-sm"}`}
          style={
            {
              left: `${p.left}%`,
              width: `${p.width}px`,
              height: `${p.height}px`,
              backgroundColor: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              "--confetti-drift": `${p.drift}px`,
              "--confetti-spin": `${p.spin}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** Champions / Final Results Screen */
function WinnerScreen({ live }: { live: LiveDisplay }) {
  const scores = [...(live.scores ?? [])].sort((a, b) => b.score - a.score);
  const champ = scores[0];

  return (
    <div className="relative flex flex-1 flex-col justify-center gap-10 overflow-hidden p-10">
      {champ && <Confetti />}

      <header className="relative z-10 text-center">
        <div className="relative mx-auto mb-3 flex h-32 w-32 items-center justify-center">
          <div className="animate-spotlight-rotate absolute h-32 w-32 rounded-full bg-radial from-amber-400/40 via-amber-500/10 to-transparent blur-2xl" />
          <div className="animate-gold-pulse absolute h-24 w-24 rounded-full" />
          <span className="animate-champion-pop relative text-8xl drop-shadow-[0_0_40px_rgba(251,191,36,0.8)]">
            🏆
          </span>
        </div>

        <div className="animate-champion-pop" style={{ animationDelay: "0.15s" }}>
          <h1 className="animate-shimmer-text bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-8xl font-black tracking-tight text-transparent">
            {champ ? champ.name : "Final Standings"}
          </h1>
        </div>

        {champ && (
          <p
            className="animate-champion-pop mt-2 text-4xl font-extrabold text-white"
            style={{ animationDelay: "0.3s" }}
          >
            🎉 GRAND CHAMPIONS! 🎉
          </p>
        )}
      </header>

      <div className="relative z-10">
        <ScoreTable scores={scores} />
      </div>
    </div>
  );
}

/**
 * How-to-play guide — mirrors the host's RulesGuide overlay onto the
 * projector one page at a time, so the audience follows along on the same
 * page the host is narrating from (see LiveRules / buildLive).
 */
function RulesScreen({ live }: { live: LiveDisplay }) {
  const rules = live.rules;
  if (!rules) return <WelcomeScreen live={live} />;
  const rounds = live.rounds ?? [];

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 p-10 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/15 px-5 py-1.5 text-lg font-black uppercase tracking-widest text-indigo-300">
          {rules.eyebrow}
        </div>
        <h1 className="flex items-center gap-4 text-7xl font-black tracking-tight text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] sm:text-8xl">
          <span>{rules.icon}</span>
          <span>{rules.title}</span>
        </h1>
      </div>

      <ul className="flex max-w-4xl flex-col gap-6 text-left">
        {rules.body.map((line, i) => (
          <li
            key={i}
            className="flex items-start gap-4 text-3xl font-medium leading-snug text-slate-200 sm:text-4xl"
          >
            <span className="mt-2.5 h-3 w-3 flex-shrink-0 rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]" />
            <span>{line}</span>
          </li>
        ))}
      </ul>

      {rules.showRounds && rounds.length > 0 && (
        <div className="flex max-w-4xl flex-wrap justify-center gap-3">
          {rounds
            .filter((r) => r.type !== "rapid_fire")
            .map((r, i) => {
            const style = CATEGORY_GRADIENTS[i % CATEGORY_GRADIENTS.length];
            return (
              <span
                key={r.id}
                className={`inline-flex items-center gap-2 rounded-full border bg-gradient-to-r ${style.bg} ${style.border} px-5 py-2 text-lg font-bold text-white shadow-lg`}
              >
                <span className="text-white/70">{r.order}</span>
                <span>{r.name}</span>
              </span>
            );
          })}
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-amber-400/70 bg-amber-400/15 px-5 py-2 text-lg font-bold text-amber-300 shadow-lg">
            <span>⚡</span>
            <span>Rapid Fire</span>
          </span>
        </div>
      )}

      {/* Page progress — read-only on the projector, the host drives paging. */}
      <div className="flex items-center gap-2" aria-hidden="true">
        {Array.from({ length: rules.totalPages }).map((_, i) => (
          <span
            key={i}
            className={`h-3 rounded-full transition-all ${
              i === rules.page ? "w-9 bg-amber-400" : "w-3 bg-white/20"
            }`}
          />
        ))}
      </div>
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
                  ? "animate-team-glow ring-2 ring-emerald-400/80"
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
