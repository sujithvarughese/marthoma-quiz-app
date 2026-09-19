"use client";

import { useEffect, useMemo } from "react";
import { useDispatch, useGame } from "@/lib/store";
import { DEFAULT_SETTINGS } from "@/lib/session";
import type { RoundDoc } from "@/lib/content";
import { buildRulesPages } from "@/lib/rulesContent";
import { Button } from "./ui";
import { ROUND_ACCENTS } from "./HomeScreen";

/**
 * How-to-play guide: a short, paged briefing on the rules and mechanics of
 * the night. Auto-opens once, right when a fresh game is started (see
 * START_GAME in lib/store.tsx), and can be reopened any time from the gear
 * menu in TopBar. The current page is global state (rulesOpen/rulesPage),
 * so the projector's matching "rules" screen (see buildLive) always shows
 * exactly the page the host is on — never synced to the read-only speaker
 * mirror, though.
 */
export function RulesGuide() {
  const state = useGame();
  const dispatch = useDispatch();
  const { rulesOpen, rulesPage, session, content } = state;

  const pages = useMemo(
    () => buildRulesPages(session?.settings ?? DEFAULT_SETTINGS),
    [session?.settings],
  );

  useEffect(() => {
    if (!rulesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dispatch({ type: "CLOSE_RULES" });
      if (e.key === "ArrowRight") dispatch({ type: "RULES_NEXT" });
      if (e.key === "ArrowLeft") dispatch({ type: "RULES_BACK" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rulesOpen, dispatch]);

  if (!rulesOpen) return null;

  const current = pages[rulesPage] ?? pages[0];
  const isFirst = rulesPage === 0;
  const isLast = rulesPage === pages.length - 1;
  const rounds = content?.rounds ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-guide-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0f1729] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-8 pb-6 pt-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-black uppercase tracking-widest text-indigo-300">
              <span>{current.eyebrow}</span>
            </div>
            <h2
              id="rules-guide-title"
              className="mt-3 flex items-center gap-3 text-4xl font-black tracking-tight text-white sm:text-5xl"
            >
              <span>{current.icon}</span>
              <span>{current.title}</span>
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close guide"
            onClick={() => dispatch({ type: "CLOSE_RULES" })}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-2xl text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-8 py-7">
          <ul className="flex flex-col gap-4">
            {current.body.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-xl leading-relaxed text-slate-200 sm:text-2xl"
              >
                <span className="mt-1 text-amber-300">●</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          {current.showRounds && rounds.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-sm font-bold uppercase tracking-widest text-slate-400">
                Tonight&apos;s Lineup
              </p>
              <div className="flex flex-wrap gap-2.5">
                {rounds.map((r: RoundDoc, i: number) => (
                  <span
                    key={r.id}
                    className={`inline-flex items-center gap-2 rounded-full bg-gradient-to-r ${ROUND_ACCENTS[i % ROUND_ACCENTS.length]} px-4 py-2 text-sm font-bold text-white shadow-md`}
                  >
                    <span className="text-white/70">{r.order}</span>
                    <span>{r.name}</span>
                  </span>
                ))}
                <span className="inline-flex items-center gap-2 rounded-full border-2 border-amber-400/60 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-300 shadow-md">
                  <span>⚡</span>
                  <span>Rapid Fire</span>
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer: pagination + nav */}
        <div className="flex flex-col gap-4 border-t border-white/10 px-8 py-6">
          <div className="flex items-center justify-center gap-2">
            {pages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to page ${i + 1}`}
                onClick={() => dispatch({ type: "RULES_GOTO", page: i })}
                className={`h-2.5 rounded-full transition-all ${
                  i === rulesPage ? "w-7 bg-amber-400" : "w-2.5 bg-white/20 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="md"
              disabled={isFirst}
              onClick={() => dispatch({ type: "RULES_BACK" })}
            >
              ← Back
            </Button>
            <p className="text-sm font-semibold text-slate-500">
              {rulesPage + 1} of {pages.length}
            </p>
            {isLast ? (
              <Button
                variant="amber"
                size="md"
                onClick={() => dispatch({ type: "CLOSE_RULES" })}
              >
                Let&apos;s Play! →
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                onClick={() => dispatch({ type: "RULES_NEXT" })}
              >
                Next →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
