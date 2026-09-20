"use client";

import { rapidFireGroups } from "@/lib/content";
import { useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";

/**
 * Board shown before each team's rapid-fire turn: one lettered card per
 * group from /data/rapidFire.ts. Picking a card deals every question in
 * that group to the up-next team; a used group locks with a checkmark so it
 * can't be dealt again.
 */
export function RapidFireBoard() {
  const state = useGame();
  const dispatch = useDispatch();
  const { content, session } = state;
  if (!content || !session) return null;

  const groups = rapidFireGroups(content);
  const used = new Set(session.usedQuestionIds);
  const isGroupUsed = (questionIds: string[]) =>
    questionIds.length > 0 && questionIds.every((id) => used.has(id));
  const remaining = groups.filter((g) => !isGroupUsed(g.questionIds)).length;

  const teamId = session.rapidQueue?.[0] ?? null;
  const team = session.teams.find((t) => t.id === teamId) ?? null;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tight text-yellow-300 sm:text-5xl">
            ⚡ Rapid Fire
          </h2>
          {team && (
            <p className="mt-2 text-xl font-semibold text-slate-300">
              Up next:{" "}
              <span className="font-black text-emerald-300">{team.name}</span>
            </p>
          )}
        </div>
        <p className="text-lg font-semibold text-slate-400">
          {remaining} of {groups.length} groups remaining
        </p>
      </div>

      {remaining === 0 ? (
        <div className="panel flex flex-col items-center gap-6 px-6 py-20 text-center">
          <p className="text-3xl font-bold">
            The rapid-fire pool is empty — no groups left to deal.
          </p>
          <Button size="lg" onClick={() => dispatch({ type: "GO_HOME" })}>
            Back to rounds
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {groups.map((g) => {
            const isDone = isGroupUsed(g.questionIds);
            return (
              <button
                key={g.key}
                disabled={isDone}
                onClick={() =>
                  dispatch({ type: "RAPID_SELECT_GROUP", groupKey: g.key })
                }
                aria-label={
                  isDone ? `Group ${g.label} (used)` : `Group ${g.label}`
                }
                className={
                  isDone
                    ? "flex aspect-square flex-col items-center justify-center rounded-3xl border border-white/5 bg-white/5 text-white/20"
                    : "flex aspect-square flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-600 text-white shadow-xl transition-transform hover:scale-[1.04] focus:outline-none focus-visible:ring-4 focus-visible:ring-white/50"
                }
              >
                {isDone ? (
                  <span className="text-6xl font-black">✓</span>
                ) : (
                  <span className="text-6xl font-black leading-none">
                    {g.label}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
