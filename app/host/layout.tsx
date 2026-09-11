import type { ReactNode } from "react";
import { GameProvider } from "@/lib/store";

// The host store (reducer + Firestore sync) lives only under /host. The /display
// route is a read-only subscriber and deliberately does not run it.
export default function HostLayout({ children }: { children: ReactNode }) {
  return <GameProvider>{children}</GameProvider>;
}
