import { NextResponse } from "next/server";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { clientKey, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "newsletter"), 5, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, message: "Too many attempts — try again shortly." }, { status: 429 });
  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    await db.insert(newsletterSubscribers).values({ email });
    return NextResponse.json({ ok: true, message: "Welcome to the maison." });
  } catch (err: unknown) {
    // Drizzle wraps driver errors (DrizzleQueryError) — the pg code may live on `.cause`.
    const code = (err as { code?: string; cause?: { code?: string } })?.code ?? (err as { cause?: { code?: string } })?.cause?.code;
    if (code === "23505") {
      // Already subscribed — still a success state for the reader.
      return NextResponse.json({ ok: true, message: "You are already on the list — good taste." });
    }
    console.error("newsletter:subscribe", err);
    return NextResponse.json({ ok: false, message: "Could not subscribe right now. Please try again." }, { status: 500 });
  }
}
