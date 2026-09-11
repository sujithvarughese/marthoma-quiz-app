"use client";

import { useSync } from "@/lib/store";

/**
 * Small live indicator of the backend sync state, shown in the host top bar so
 * the operator always knows whether the game is safely saved to Firestore.
 */
export function SyncIndicator() {
  const { status, setHostCode } = useSync();

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
        <span
          title="Server unreachable — changes will retry automatically."
          className="flex items-center gap-2 text-sm font-semibold text-rose-300"
        >
          {dot("bg-rose-500", true)} Offline
        </span>
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
          title="Firestore isn't configured on the server."
          className="flex items-center gap-2 text-sm font-semibold text-slate-400"
        >
          {dot("bg-slate-500")} No server
        </span>
      );
  }
}
