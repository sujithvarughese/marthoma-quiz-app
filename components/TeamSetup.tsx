"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_TEAMS, useDispatch, useGame } from "@/lib/store";

interface DragState {
  teamId: string;
  startIndex: number;
  startY: number;
  currentY: number;
  slotDistance: number;
  targetIndex: number;
  isDropping: boolean;
}

/**
 * Editable roster: rename, remove, add, and reorder teams (up to MAX_TEAMS).
 * Teams can be smoothly dragged and reordered with animated tile displacement.
 * When `locked` (a game is in progress) teams can't be added, removed, or reordered.
 */
export function TeamSetup({ locked = false }: { locked?: boolean }) {
  const { session } = useGame();
  const dispatch = useDispatch();
  const teams = session?.teams ?? [];

  const [dragState, setDragState] = useState<DragState | null>(null);
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dropTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up any pending drop timer on unmount
  useEffect(() => {
    return () => {
      if (dropTimerRef.current) clearTimeout(dropTimerRef.current);
    };
  }, []);

  function startDrag(id: string, index: number, e: React.PointerEvent<HTMLElement>) {
    if (locked || teams.length < 2 || e.button !== 0 || dragState?.isDropping) return;
    e.preventDefault();

    // Calculate vertical slot distance between consecutive tiles
    let slotDistance = 68;
    const firstEl = rowRefs.current.get(teams[0]?.id);
    const secondEl = rowRefs.current.get(teams[1]?.id);
    if (firstEl && secondEl) {
      const r1 = firstEl.getBoundingClientRect();
      const r2 = secondEl.getBoundingClientRect();
      const dist = r2.top - r1.top;
      if (dist > 0) slotDistance = dist;
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore pointer capture errors if unsupported
    }

    setDragState({
      teamId: id,
      startIndex: index,
      startY: e.clientY,
      currentY: e.clientY,
      slotDistance,
      targetIndex: index,
      isDropping: false,
    });
  }

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    if (!dragState || dragState.isDropping) return;

    const currentY = e.clientY;
    const deltaY = currentY - dragState.startY;
    const rawTarget = dragState.startIndex + Math.round(deltaY / dragState.slotDistance);
    const targetIndex = Math.max(0, Math.min(teams.length - 1, rawTarget));

    setDragState((prev) =>
      prev ? { ...prev, currentY, targetIndex } : null,
    );
  }

  function handlePointerUp() {
    if (!dragState || dragState.isDropping) return;

    const { startIndex, targetIndex } = dragState;

    if (startIndex === targetIndex) {
      // Revert in place smoothly
      setDragState((prev) =>
        prev ? { ...prev, isDropping: true, currentY: prev.startY } : null,
      );
      dropTimerRef.current = setTimeout(() => {
        setDragState(null);
      }, 180);
      return;
    }

    // Animate smoothly into the target slot
    setDragState((prev) => (prev ? { ...prev, isDropping: true } : null));

    dropTimerRef.current = setTimeout(() => {
      const nextIds = teams.map((t) => t.id);
      const [movedId] = nextIds.splice(startIndex, 1);
      nextIds.splice(targetIndex, 0, movedId);
      dispatch({ type: "REORDER_TEAMS", teamIds: nextIds });
      setDragState(null);
    }, 180);
  }

  function handlePointerCancel() {
    if (!dragState || dragState.isDropping) return;
    setDragState(null);
  }

  // Keyboard navigation for reordering on the drag handle
  function handleKeyDown(e: React.KeyboardEvent, id: string, index: number) {
    if (locked) return;
    if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      const next = [...teams.map((t) => t.id)];
      [next[index], next[index - 1]] = [next[index - 1], next[index]];
      dispatch({ type: "REORDER_TEAMS", teamIds: next });
    } else if (e.key === "ArrowDown" && index < teams.length - 1) {
      e.preventDefault();
      const next = [...teams.map((t) => t.id)];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      dispatch({ type: "REORDER_TEAMS", teamIds: next });
    }
  }

  // Compute live visual rank for each tile based on current drag state
  function getProjectedRank(idx: number): number {
    if (!dragState) return idx + 1;
    const { startIndex, targetIndex } = dragState;
    if (idx === startIndex) return targetIndex + 1;
    if (startIndex < targetIndex) {
      if (idx > startIndex && idx <= targetIndex) return idx;
      return idx + 1;
    }
    if (startIndex > targetIndex) {
      if (idx >= targetIndex && idx < startIndex) return idx + 2;
      return idx + 1;
    }
    return idx + 1;
  }

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 p-6 sm:p-7 backdrop-blur-xl shadow-2xl shadow-black/40">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <h2 className="text-2xl font-black tracking-tight text-white">Teams</h2>
          <span className="rounded-full border border-indigo-400/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-bold text-indigo-300">
            {teams.length} / {MAX_TEAMS}
          </span>
        </div>

        {locked ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-bold text-amber-300">
            <span>🔒</span>
            <span>Locked during game</span>
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={teams.length < 2}
              onClick={() => dispatch({ type: "RANDOMIZE_TEAMS" })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition-all hover:bg-white/10 hover:text-white active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              title="Shuffle team play order"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4h4l4 6-4 6H4M20 20h-4l-2.5-3.75M20 4h-4l-7 10.5M16 4h4v4M16 20h4v-4" />
              </svg>
              <span>Randomize</span>
            </button>
            <button
              type="button"
              disabled={teams.length >= MAX_TEAMS}
              onClick={() => dispatch({ type: "ADD_TEAM" })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-600/30 transition-all hover:bg-indigo-500 hover:shadow-indigo-600/50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              <span>Add Team</span>
            </button>
          </div>
        )}
      </div>

      {teams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 py-10 text-center">
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <p className="text-base font-semibold text-slate-200">No teams added yet</p>
          <p className="mt-0.5 text-xs text-slate-400">Add at least one team to start playing</p>
          <button
            type="button"
            onClick={() => dispatch({ type: "ADD_TEAM" })}
            className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-indigo-500"
          >
            + Add your first team
          </button>
        </div>
      ) : (
        <div className="relative space-y-2.5">
          {teams.map((team, i) => {
            const isDraggingItem = dragState?.teamId === team.id;
            const isAnyDragging = dragState !== null;
            const projectedRank = getProjectedRank(i);

            // Compute vertical transform and transition
            let translateY = 0;
            let transition = "transform 240ms cubic-bezier(0.2, 0, 0, 1)";
            let zIndex = 1;

            if (dragState) {
              if (isDraggingItem) {
                zIndex = 30;
                if (!dragState.isDropping) {
                  // Follow cursor directly with clamped deltaY
                  const deltaY = dragState.currentY - dragState.startY;
                  const minDelta = -dragState.startIndex * dragState.slotDistance - 10;
                  const maxDelta = (teams.length - 1 - dragState.startIndex) * dragState.slotDistance + 10;
                  translateY = Math.max(minDelta, Math.min(maxDelta, deltaY));
                  transition = "none";
                } else {
                  // Animate smoothly to the target slot
                  translateY = (dragState.targetIndex - dragState.startIndex) * dragState.slotDistance;
                  transition = "transform 180ms cubic-bezier(0.2, 0, 0, 1)";
                }
              } else {
                // Non-dragged items shift up or down with animation
                const { startIndex, targetIndex, slotDistance } = dragState;
                if (startIndex < targetIndex) {
                  if (i > startIndex && i <= targetIndex) {
                    translateY = -slotDistance;
                  }
                } else if (startIndex > targetIndex) {
                  if (i >= targetIndex && i < startIndex) {
                    translateY = slotDistance;
                  }
                }
              }
            }

            return (
              <div
                key={team.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(team.id, el);
                  else rowRefs.current.delete(team.id);
                }}
                style={{
                  transform: translateY ? `translateY(${translateY}px)` : undefined,
                  transition: isAnyDragging ? transition : undefined,
                  zIndex,
                }}
                className={`group relative flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition-colors ${
                  isDraggingItem
                    ? "scale-[1.02] border-indigo-400/90 bg-slate-900/95 shadow-2xl shadow-indigo-500/25 ring-2 ring-indigo-400/60"
                    : "border-white/10 bg-slate-800/40 hover:border-white/20 hover:bg-slate-800/60"
                }`}
              >
                {/* Team Rank Badge */}
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-sm font-bold transition-all ${
                    isDraggingItem
                      ? "bg-indigo-500 text-white shadow-md shadow-indigo-500/40"
                      : "border border-white/10 bg-white/5 text-slate-400 group-hover:border-white/20 group-hover:text-slate-200"
                  }`}
                >
                  {projectedRank}
                </span>

                {/* Tactile Drag Handle */}
                {!locked && (
                  <button
                    type="button"
                    aria-label={`Drag to reorder ${team.name}`}
                    onPointerDown={(e) => startDrag(team.id, i, e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                    onKeyDown={(e) => handleKeyDown(e, team.id, i)}
                    disabled={teams.length < 2}
                    className={`flex shrink-0 cursor-grab items-center justify-center rounded-xl p-2 text-slate-400 transition-colors touch-none select-none hover:bg-white/10 hover:text-white active:cursor-grabbing disabled:cursor-default disabled:opacity-30 ${
                      isDraggingItem ? "cursor-grabbing text-indigo-300" : ""
                    }`}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <circle cx="7" cy="5" r="1.5" />
                      <circle cx="13" cy="5" r="1.5" />
                      <circle cx="7" cy="10" r="1.5" />
                      <circle cx="13" cy="10" r="1.5" />
                      <circle cx="7" cy="15" r="1.5" />
                      <circle cx="13" cy="15" r="1.5" />
                    </svg>
                  </button>
                )}

                {/* Team Name Input */}
                <input
                  type="text"
                  value={team.name}
                  disabled={locked}
                  onChange={(e) =>
                    dispatch({
                      type: "RENAME_TEAM",
                      teamId: team.id,
                      name: e.target.value,
                    })
                  }
                  aria-label={`Team ${projectedRank} name`}
                  placeholder="Enter team name…"
                  className="min-w-0 flex-1 rounded-xl bg-transparent px-3 py-1.5 text-lg font-bold text-white placeholder:text-slate-500 outline-none transition-all focus:bg-white/5 focus:ring-1 focus:ring-indigo-400/50 disabled:opacity-60"
                />

                {/* Remove Team Button */}
                {!locked && (
                  <button
                    type="button"
                    aria-label={`Remove ${team.name}`}
                    onClick={() => dispatch({ type: "REMOVE_TEAM", teamId: team.id })}
                    className="flex shrink-0 items-center justify-center rounded-xl p-2 text-slate-500 transition-all hover:bg-rose-500/15 hover:text-rose-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
