import { NextResponse } from "next/server";
import { isPersistedState } from "@/lib/persistence";
import { isFirestoreConfigured, loadState, saveState } from "@/lib/firestore";

// Never cache: this is live, per-request game state.
export const dynamic = "force-dynamic";

/**
 * Optional write protection. If HOST_ACCESS_CODE is set in the environment,
 * saves must include a matching `x-host-code` header; otherwise anyone with the
 * URL could overwrite the scoreboard. Reads are always allowed.
 */
function writeAllowed(request: Request): boolean {
  const required = process.env.HOST_ACCESS_CODE;
  if (!required) return true;
  return request.headers.get("x-host-code") === required;
}

/** GET /api/state — load the saved game (or null if none yet). */
export async function GET() {
  if (!isFirestoreConfigured()) {
    return NextResponse.json(
      { error: "Firestore is not configured on the server." },
      { status: 503 },
    );
  }
  try {
    const state = await loadState();
    return NextResponse.json({ state });
  } catch (err) {
    console.error("Failed to load game state:", err);
    return NextResponse.json(
      { error: "Failed to load game state." },
      { status: 500 },
    );
  }
}

/** PUT /api/state — save the current game state. */
export async function PUT(request: Request) {
  if (!isFirestoreConfigured()) {
    return NextResponse.json(
      { error: "Firestore is not configured on the server." },
      { status: 503 },
    );
  }
  if (!writeAllowed(request)) {
    return NextResponse.json(
      { error: "Invalid or missing host access code." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isPersistedState(body)) {
    return NextResponse.json(
      { error: "Body is not a valid game state." },
      { status: 400 },
    );
  }

  try {
    await saveState(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save game state:", err);
    return NextResponse.json(
      { error: "Failed to save game state." },
      { status: 500 },
    );
  }
}
