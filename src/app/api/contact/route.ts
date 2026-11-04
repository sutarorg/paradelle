import { NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { sendContactMessageNotification } from "@/lib/email";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_MESSAGE_LENGTH = 10_000;

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
  if (name.length < 2 || name.length > 120) return NextResponse.json({ ok: false, message: "Please enter a name between 2 and 120 characters." }, { status: 400 });
  if (!EMAIL_RE.test(email) || email.length > 320) return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  if (message.length < 10 || message.length > MAX_MESSAGE_LENGTH) return NextResponse.json({ ok: false, message: "Please enter a message between 10 and 10,000 characters." }, { status: 400 });

  try {
    await db.insert(contactMessages).values({ name, email, message });
  } catch (error) {
    console.error("contact:store", error instanceof Error ? error.message : "database write failed");
    return NextResponse.json({ ok: false, message: "We could not save your message right now. Please try again." }, { status: 500 });
  }

  const delivery = await sendContactMessageNotification({ name, email, message });
  if (!delivery.sent) {
    const responseMessage = delivery.reason === "not_configured"
      ? "Your message is saved, but email delivery is not configured yet. Please email hello@paradelle.store for urgent help."
      : "Your message is saved, but we could not email the atelier right now. Please try again shortly or email hello@paradelle.store.";
    return NextResponse.json({ ok: false, message: responseMessage }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
