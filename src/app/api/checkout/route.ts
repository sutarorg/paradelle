import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { coupons, inventoryReservations, orderItems, orders, pincodes, products } from "@/db/schema";
import { computeTotals, type Coupon } from "@/lib/commerce";
import { getCatalog, getReservedByProduct, getShippingSettings } from "@/lib/catalog";
import { getSessionUser } from "@/lib/auth";
import { checkoutSchema, zodError } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { sendOrderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

function bad(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "checkout"), 12, 60_000);
  if (!rl.ok) return bad(`Too many attempts — try again in ${rl.retryAfterSec}s.`, 429);

  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return bad(zodError(parsed.error));
  const { items, coupon: couponCode, customer: c } = parsed.data;

  const [catalog, shippingCfg] = await Promise.all([getCatalog(), getShippingSettings()]);

  // PIN serviceability
  try {
    const pinCount = await db.select({ n: sql<number>`count(*)::int` }).from(pincodes);
    if (Number(pinCount[0]?.n ?? 0) > 0) {
      const rows = await db.select().from(pincodes).where(eq(pincodes.pincode, c.pincode)).limit(1);
      const pin = rows[0];
      if (!pin || !pin.serviceable) {
        return bad(`We do not deliver to ${c.pincode} yet — write to hello@paradelle.in and we will try to arrange it.`);
      }
    }
  } catch { /* pincodes optional during rollout */ }

  // Coupons (DB first, static fallback)
  let dbCoupons: Coupon[] | undefined;
  try {
    const rows = await db.select().from(coupons);
    dbCoupons = rows
      .filter((r) => r.active)
      .map((r) => ({
        code: r.code, kind: "percent" as const, value: r.value, minSubtotal: r.minSubtotal,
        maxDiscount: r.maxDiscount, usageLimit: r.usageLimit, usedCount: r.usedCount, expiresAt: r.expiresAt, description: r.description,
      }));
  } catch { dbCoupons = undefined; }

  const totals = computeTotals(items, couponCode, dbCoupons, { catalog, flatFee: shippingCfg.flatFee, freeThreshold: shippingCfg.freeThreshold });
  if (totals.lines.length === 0) return bad("Your bag is empty.");
  if (couponCode && totals.couponError) return bad(totals.couponError);

  const orderNumber = `PDL-${randomBytes(3).toString("hex").toUpperCase()}`;
  const user = await getSessionUser();
  const reserved = await getReservedByProduct(); // also sweeps expired holds

  try {
    await db.transaction(async (tx) => {
      const slugs = totals.lines.map((l) => l.slug);
      const stockRows = await tx.select().from(products).where(inArray(products.slug, slugs)).for("update");
      const bySlug = new Map(stockRows.map((p) => [p.slug, p]));

      // Atomic oversell guard under row locks.
      for (const line of totals.lines) {
        const p = bySlug.get(line.slug);
        if (!p || p.status !== "active") throw new Error("A bar in your bag is no longer available.");
        const available = p.stock - (reserved[p.slug] ?? 0);
        if (available < line.qty) {
          throw new Error(
            available <= 0
              ? `${p.shortName} is awaiting its next batch. Remove it from your bag to continue.`
              : `Only ${available} of ${p.shortName} remain in this batch — please reduce the quantity.`,
          );
        }
      }

      const inserted = await tx
        .insert(orders)
        .values({
          orderNumber,
          userId: user?.id ?? null,
          email: c.email,
          name: c.name,
          phone: c.phone,
          line1: c.line1,
          line2: c.line2 || null,
          city: c.city,
          state: c.state,
          pincode: c.pincode,
          subtotal: totals.subtotal,
          discount: totals.discount,
          coupon: totals.coupon?.code ?? null,
          shipping: totals.shipping,
          total: totals.total,
          status: "payment_pending",
        })
        .returning({ id: orders.id });

      const orderId = inserted[0].id;
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 h hold

      await tx.insert(orderItems).values(
        totals.lines.map((l) => {
          const p = bySlug.get(l.slug)!;
          return { orderId, slug: p.slug, name: p.name, qty: l.qty, unitPrice: p.price, lineTotal: p.price * l.qty };
        }),
      );

      await tx.insert(inventoryReservations).values(
        totals.lines.map((l) => ({ orderId, productId: bySlug.get(l.slug)!.id, qty: l.qty, expiresAt })),
      );
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "We could not save your order. Please try again.";
    return bad(msg.startsWith("Only") || msg.startsWith("A bar") || msg.includes("next batch") ? msg : "We could not save your order. Please try again.", msg.startsWith("Only") || msg.includes("next batch") || msg.startsWith("A bar") ? 400 : 500);
  }

  const created = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  if (created[0]) void sendOrderEmail("order_reserved", created[0]);

  return NextResponse.json({
    ok: true,
    orderNumber,
    totals: { subtotal: totals.subtotal, discount: totals.discount, shipping: totals.shipping, total: totals.total },
  });
}
