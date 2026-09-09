"use client";

import { useSync } from "@/lib/store";

/**
 * Small live indicator of the backend sync state. Sits in the top bar so the
 * host always knows whether the game is safely saved to Firestore.
 */
export function SyncIndicator() {
  const { status, setHostCode, saveNow } = useSync();

  const dot = (color: string, pulse = false) => (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${color} ${
        pulse ? "animate-pulse" : ""
      }`}
    />
  );

  switch (status) {
    case "loading":
      return (
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-400">
          {dot("bg-slate-400", true)} Loading…
        </span>
      );
    case "saving":
      return (
        <span className="flex items-center gap-2 text-sm font-semibold text-amber-300">
          {dot("bg-amber-400", true)} Saving…
        </span>
      );
    case "saved":
      return (
        <span className="flex items-center gap-2 text-sm font-semibold text-emerald-300">
          {dot("bg-emerald-400")} Saved
        </span>
      );
    case "offline":
      return (
        <button
          onClick={saveNow}
          title="Server unreachable — running on the local cache. Click to retry."
          className="flex items-center gap-2 text-sm font-semibold text-rose-300 hover:text-rose-200"
        >
          {dot("bg-rose-500", true)} Offline · retry
        </button>
      );
    case "locked":
      return (
        <button
          onClick={() => {
            const code = window.prompt("Enter the host access code to save:");
            if (code != null) setHostCode(code.trim());
          }}
          title="The server requires a host access code before it will save."
          className="flex items-center gap-2 text-sm font-semibold text-amber-300 hover:text-amber-200"
        >
          {dot("bg-amber-400")} 🔒 Enter code
        </button>
      );
    case "disabled":
      return (
        <span
          title="Firestore isn't configured on the server — the game is saved in this browser only."
          className="flex items-center gap-2 text-sm font-semibold text-slate-400"
        >
          {dot("bg-slate-500")} Local only
        </span>
      );
  }
}
