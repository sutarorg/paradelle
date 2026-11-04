import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { cartItems, carts } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { getCatalog } from "@/lib/catalog";
import { cartMergeSchema, cartMutationSchema, zodError } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * Server-authoritative cart for signed-in customers (guests stay on
 * localStorage). All reads/writes are scoped to the session's own cart.
 */
async function requireUser() {
  return getSessionUser();
}

async function getOrCreateCart(userId: string) {
  const existing = await db.select().from(carts).where(eq(carts.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  const created = await db.insert(carts).values({ userId }).returning();
  return created[0];
}

export async function GET() {
  const user = await requireUser();
  // Anonymous visitors get an inert 200 — a console error is not a luxury welcome.
  if (!user) return NextResponse.json({ ok: true, anonymous: true, items: [] });
  const cart = await getOrCreateCart(user.id);
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
  return NextResponse.json({ ok: true, items: items.map((i) => ({ slug: i.slug, qty: i.qty })) });
}

/** Merge (login sync): takes max(local, server) per slug against the live catalogue. */
export async function POST(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "cart"), 40, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, message: "Rate limited." }, { status: 429 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ ok: true, anonymous: true });

  const parsed = cartMergeSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: zodError(parsed.error) }, { status: 400 });

  const catalog = await getCatalog();
  const valid = new Set(catalog.map((p) => p.slug));
  const cart = await getOrCreateCart(user.id);
  const existing = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
  const current = new Map(existing.map((i) => [i.slug, i]));

  for (const line of parsed.data.items) {
    if (!valid.has(line.slug) || line.qty <= 0) continue;
    const prev = current.get(line.slug);
    const qty = Math.max(prev?.qty ?? 0, line.qty);
    if (prev) {
      await db.update(cartItems).set({ qty }).where(eq(cartItems.id, prev.id));
    } else {
      await db.insert(cartItems).values({ cartId: cart.id, slug: line.slug, qty });
    }
  }
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  const items = await db.select().from(cartItems).where(eq(cartItems.cartId, cart.id));
  return NextResponse.json({ ok: true, items: items.map((i) => ({ slug: i.slug, qty: i.qty })) });
}

/** Upsert one line (qty 0 removes it). */
export async function PATCH(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "cart"), 40, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, message: "Rate limited." }, { status: 429 });
  const user = await requireUser();
  if (!user) return NextResponse.json({ ok: true, anonymous: true });

  const parsed = cartMutationSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: zodError(parsed.error) }, { status: 400 });

  const cart = await getOrCreateCart(user.id);
  if (parsed.data.qty === 0) {
    await db.delete(cartItems).where(and(eq(cartItems.cartId, cart.id), eq(cartItems.slug, parsed.data.slug)));
  } else {
    const catalog = await getCatalog();
    if (!catalog.some((p) => p.slug === parsed.data.slug)) return NextResponse.json({ ok: false, message: "Unknown product." }, { status: 400 });
    await db
      .insert(cartItems)
      .values({ cartId: cart.id, slug: parsed.data.slug, qty: parsed.data.qty })
      .onConflictDoUpdate({ target: [cartItems.cartId, cartItems.slug], set: { qty: parsed.data.qty } });
  }
  await db.update(carts).set({ updatedAt: new Date() }).where(eq(carts.id, cart.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ ok: true, anonymous: true });
  const existing = await db.select().from(carts).where(eq(carts.userId, user.id)).limit(1);
  if (existing[0]) await db.delete(cartItems).where(eq(cartItems.cartId, existing[0].id));
  return NextResponse.json({ ok: true });
}
