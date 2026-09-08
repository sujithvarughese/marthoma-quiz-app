"use client";

import { MAX_TEAMS, useDispatch, useGame } from "@/lib/store";
import { Button } from "./ui";

/** Editable roster: rename, remove, and add teams (up to MAX_TEAMS). */
export function TeamSetup() {
  const { teams } = useGame();
  const dispatch = useDispatch();

  return (
    <section className="panel p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">
          Teams{" "}
          <span className="text-lg font-normal text-slate-400">
            ({teams.length}/{MAX_TEAMS})
          </span>
        </h2>
        <Button
          variant="primary"
          size="sm"
          disabled={teams.length >= MAX_TEAMS}
          onClick={() => dispatch({ type: "ADD_TEAM" })}
        >
          + Add team
        </Button>
      </div>

      <div className="space-y-2">
        {teams.map((team, i) => (
          <div key={team.id} className="flex items-center gap-3">
            <span className="w-6 shrink-0 text-right font-mono text-lg text-slate-500">
              {i + 1}
            </span>
            <input
              value={team.name}
              onChange={(e) =>
                dispatch({
                  type: "RENAME_TEAM",
                  teamId: team.id,
                  name: e.target.value,
                })
              }
              aria-label={`Team ${i + 1} name`}
              className="flex-1 rounded-lg border border-white/15 bg-black/30 px-4 py-2 text-xl font-semibold text-white outline-none focus:border-indigo-400"
            />
            <Button
              variant="danger"
              size="sm"
              aria-label={`Remove ${team.name}`}
              onClick={() => dispatch({ type: "REMOVE_TEAM", teamId: team.id })}
            >
              ✕
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
