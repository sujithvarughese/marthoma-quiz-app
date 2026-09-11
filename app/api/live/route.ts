import { NextResponse } from "next/server";
import { isLiveDisplay } from "@/lib/live";
import { isFirestoreConfigured, loadLive, saveLive } from "@/lib/firestore";

// Never cache: this is the live projector state.
export const dynamic = "force-dynamic";

/**
 * The projector doc (games/{id}/live/display). Only the host writes it; the
 * /display screen reads it live via client-SDK onSnapshot, so this GET is mainly
 * a fallback / debugging aid. Writes are guarded by HOST_ACCESS_CODE if set.
 */
function writeAllowed(request: Request): boolean {
  const required = process.env.HOST_ACCESS_CODE;
  if (!required) return true;
  return request.headers.get("x-host-code") === required;
}

export async function GET() {
  if (!isFirestoreConfigured()) {
    return NextResponse.json(
      { error: "Firestore is not configured on the server." },
      { status: 503 },
    );
  }
  try {
    const live = await loadLive();
    return NextResponse.json({ live });
  } catch (err) {
    console.error("Failed to load live doc:", err);
    return NextResponse.json({ error: "Failed to load live doc." }, {
      status: 500,
    });
  }
}

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

  if (!isLiveDisplay(body)) {
    return NextResponse.json(
      { error: "Body is not a valid live display doc." },
      { status: 400 },
    );
  }

  try {
    await saveLive(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save live doc:", err);
    return NextResponse.json({ error: "Failed to save live doc." }, {
      status: 500,
    });
  }
}
