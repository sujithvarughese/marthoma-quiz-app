"use client";

import { SpeakerProvider } from "@/lib/store";
import { AdminGate } from "@/components/AdminGate";
import { HostShell } from "@/components/QuizApp";

/**
 * Speaker/emcee screen: the exact same shell as the host control screen,
 * mirrored live from the host mirror doc, with every control disabled. It
 * shares the host's admin gate because it shows the same sensitive info the
 * host sees (answers before they're revealed on the projector).
 */
export function SpeakerApp() {
  return (
    <AdminGate>
      <SpeakerProvider>
        <HostShell readOnly />
      </SpeakerProvider>
    </AdminGate>
  );
}
