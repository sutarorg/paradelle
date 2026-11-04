import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { newsletterSubscribers } from "@/db/schema";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { sendNewsletterSubscriberListNotification } from "@/lib/email";

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
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, message: "Please enter a valid email address." }, { status: 400 });
  }

  try {
    const inserted = await db
      .insert(newsletterSubscribers)
      .values({ email })
      .onConflictDoNothing()
      .returning({ email: newsletterSubscribers.email });

    // Send the owner the full, append-only subscriber list after each submission.
    // Repeated submissions also retry delivery if the first provider request failed.
    const rows = await db
      .select({ email: newsletterSubscribers.email })
      .from(newsletterSubscribers)
      .orderBy(asc(newsletterSubscribers.createdAt), asc(newsletterSubscribers.email));
    const delivery = await sendNewsletterSubscriberListNotification(rows.map((row) => row.email));
    if (!delivery.sent) {
      console.error("newsletter:owner-notification", delivery.reason);
      return NextResponse.json({
        ok: false,
        message: "Your email is saved, but the atelier notification could not be delivered. Please try again shortly.",
      }, { status: 503 });
    }

    return NextResponse.json({
      ok: true,
      message: inserted.length > 0 ? "Welcome to the maison." : "You are already on the list — good taste.",
    });
  } catch (error) {
    console.error("newsletter:subscribe", error instanceof Error ? error.message : "subscription failed");
    return NextResponse.json({ ok: false, message: "Could not subscribe right now. Please try again." }, { status: 500 });
  }
}
