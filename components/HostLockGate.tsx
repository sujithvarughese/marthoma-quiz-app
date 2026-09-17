"use client";

import { useEffect, useState } from "react";
import { useSync } from "@/lib/store";
import { Button } from "./ui";

/**
 * Blocks the host control screen unless this tab currently owns the host
 * lock (see lib/store.tsx / lib/hostLock.ts). Without this, a second open
 * /host tab — another device, an old tab left in the background, a
 * duplicated tab — would silently race the active host to publish the
 * display and save the session, which looked to the audience like the
 * projector randomly jumping between rounds and awarding points on its own.
 */
export function HostLockGate({ children }: { children: React.ReactNode }) {
  const { lockStatus, lockUpdatedAt, takeOverHost } = useSync();
  const [confirming, setConfirming] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  // Reset the confirmation if this tab stops being locked out (it took
  // over, or the other session simply disappeared) — a plain render-time
  // adjustment rather than an effect, per React's guidance for syncing
  // state to a changed value.
  const [prevLockStatus, setPrevLockStatus] = useState(lockStatus);
  if (lockStatus !== prevLockStatus) {
    setPrevLockStatus(lockStatus);
    if (lockStatus !== "locked-out" && confirming) setConfirming(false);
  }

  // Tick a local clock only while there's a timestamp to render relative to.
  useEffect(() => {
    if (lockUpdatedAt === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [lockUpdatedAt]);

  if (lockStatus === "owner") return <>{children}</>;

  if (lockStatus === "loading") {
    return (
      <div className="flex h-dvh items-center justify-center text-2xl font-semibold text-slate-400">
        Checking for other host sessions…
      </div>
    );
  }

  const secondsAgo =
    lockUpdatedAt !== null
      ? Math.max(0, Math.round((now - lockUpdatedAt) / 1000))
      : null;

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-black tracking-tight text-amber-300 sm:text-4xl">
        Another device is hosting
      </h1>
      <p className="max-w-md text-lg text-slate-300">
        This game is currently being controlled from another tab or device
        {secondsAgo !== null && (
          <>
            {" "}
            — last active {secondsAgo}s ago
          </>
        )}
        . To avoid two screens fighting over the projector, this tab is
        read-only until you take over.
      </p>

      {confirming ? (
        <div className="flex flex-col items-center gap-3">
          <p className="max-w-md text-base font-semibold text-rose-300">
            Taking over will disconnect the other host tab. Only do this if
            you know it&apos;s no longer needed (a stale tab, a device you&apos;re
            replacing).
          </p>
          <div className="flex gap-3">
            <Button variant="ghost" size="md" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={takeOverHost}>
              Yes, take over
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="primary" size="lg" onClick={() => setConfirming(true)}>
          Take over hosting here
        </Button>
      )}
    </div>
  );
}
