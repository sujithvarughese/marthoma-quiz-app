import { NextResponse } from "next/server";
import { isHostLock } from "@/lib/hostLock";
import { isFirestoreConfigured, loadHostLock, saveHostLock } from "@/lib/firestore";

// Never cache: this is the live host-lock state.
export const dynamic = "force-dynamic";

/**
 * The host lock doc (games/{id}/live/hostLock). Every /host tab watches it
 * live via client-SDK onSnapshot and only the tab that currently holds it is
 * allowed to write anything else (session, projector doc, host mirror) — see
 * lib/hostLock.ts for why. Writes here use the same optional host-code guard
 * as the other write routes.
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
    const lock = await loadHostLock();
    return NextResponse.json({ lock });
  } catch (err) {
    console.error("Failed to load host lock doc:", err);
    return NextResponse.json({ error: "Failed to load host lock doc." }, {
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

  if (!isHostLock(body)) {
    return NextResponse.json(
      { error: "Body is not a valid host lock doc." },
      { status: 400 },
    );
  }

  try {
    await saveHostLock(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save host lock doc:", err);
    return NextResponse.json({ error: "Failed to save host lock doc." }, {
      status: 500,
    });
  }
}
