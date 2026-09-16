import { NextResponse } from "next/server";
import { isHostMirror } from "@/lib/hostMirror";
import { isFirestoreConfigured, loadHostMirror, saveHostMirror } from "@/lib/firestore";

// Never cache: this is the live host-mirror state.
export const dynamic = "force-dynamic";

/**
 * The host mirror doc (games/{id}/live/host). Only the host writes it; the
 * /speaker screen reads it live via client-SDK onSnapshot, so this GET is
 * mainly a fallback / debugging aid. Writes are guarded by HOST_ACCESS_CODE
 * if set, same as the projector doc.
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
    const mirror = await loadHostMirror();
    return NextResponse.json({ mirror });
  } catch (err) {
    console.error("Failed to load host mirror doc:", err);
    return NextResponse.json({ error: "Failed to load host mirror doc." }, {
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

  if (!isHostMirror(body)) {
    return NextResponse.json(
      { error: "Body is not a valid host mirror doc." },
      { status: 400 },
    );
  }

  try {
    await saveHostMirror(body);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save host mirror doc:", err);
    return NextResponse.json({ error: "Failed to save host mirror doc." }, {
      status: 500,
    });
  }
}
