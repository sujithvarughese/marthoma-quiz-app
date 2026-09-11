"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "./ui";

/**
 * Admin gate shown before anything else. Because there are no per-user logins,
 * this is a single shared password that unlocks the host control screen so a
 * random person on the network can't open the app and tamper with scores.
 *
 * The password is read from NEXT_PUBLIC_ADMIN_PASSWORD (set in .env.local),
 * falling back to a default for local development. This is a lightweight,
 * client-side gate — not real security — but it's enough to keep the control
 * screen out of casual hands during the event.
 */
const ADMIN_PASSWORD =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "marthoma";

// Kept only for the browser session — a fresh tab/window asks again.
const UNLOCK_KEY = "church-quiz-app:admin-unlocked";

export function AdminGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [entry, setEntry] = useState("");
  const [rejected, setRejected] = useState(false);

  // Read the session flag on the client only, to avoid a hydration mismatch.
  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(UNLOCK_KEY) === "1") setUnlocked(true);
    } catch {
      /* sessionStorage disabled — fall back to asking each load */
    }
  }, []);

  // Render nothing until mounted so SSR output matches the first client paint.
  if (!mounted) return null;

  if (unlocked) return <>{children}</>;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (entry === ADMIN_PASSWORD) {
      try {
        sessionStorage.setItem(UNLOCK_KEY, "1");
      } catch {
        /* ignore */
      }
      setUnlocked(true);
    } else {
      setRejected(true);
    }
  }

  // Wrong password: send them to a dead-end "see the host" screen.
  if (rejected) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
        <h1 className="text-4xl font-black tracking-tight text-rose-300 sm:text-5xl">
          Invalid password
        </h1>
        <p className="max-w-md text-lg text-slate-300">
          Please see the host to continue.
        </p>
        <Button
          variant="ghost"
          size="lg"
          onClick={() => {
            setRejected(false);
            setEntry("");
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-6 text-center"
      >
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
            Host access
          </h1>
          <p className="mt-3 text-lg text-slate-300">
            Enter the admin password to continue.
          </p>
        </div>
        <input
          type="password"
          autoFocus
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          placeholder="Password"
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-center text-2xl text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/30"
        />
        <Button type="submit" variant="primary" size="lg" disabled={!entry}>
          Enter →
        </Button>
      </form>
    </div>
  );
}
