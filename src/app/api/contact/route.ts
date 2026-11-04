import { NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { clientKey, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "contact"), 5, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, message: "Slow down — a note this considered deserves a pause." }, { status: 429 });
  let body: { name?: string; email?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid request." }, { status: 400 });
  }

  const name = (body.name ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const message = (body.message ?? "").trim();

  if (name.length < 2) return NextResponse.json({ ok: false, message: "Please tell us your name." }, { status: 400 });
  if (!EMAIL_RE.test(email)) return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  if (message.length < 10) return NextResponse.json({ ok: false, message: "A few more words would help us help you." }, { status: 400 });

  try {
    await db.insert(contactMessages).values({ name, email, message });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("contact:message", err);
    return NextResponse.json({ ok: false, message: "Could not send right now. Please email hello@paradelle.in directly." }, { status: 500 });
  }
}
