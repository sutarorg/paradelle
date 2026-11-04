import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { couponRedemptions, coupons, inventoryReservations, orderItems, orders, payments, products, stockMovements } from "@/db/schema";
import { sendOrderEmail } from "@/lib/email";

/**
 * Payment state machine — the ONLY code path allowed to move an order to `paid`.
 * Called from: (a) verified Checkout signature handler, (b) verified webhook.
 * Everything runs in one DB transaction: payment row, order flip, stock
 * decrement, reservation release, coupon redemption — atomic and idempotent.
 */
export type ConfirmResult =
  | { outcome: "paid"; orderNumber: string }
  | { outcome: "already-processed"; orderNumber: string }
  | { outcome: "amount-mismatch"; orderNumber: string }
  | { outcome: "unknown-order" };

export async function confirmPayment(params: {
  razorpayOrderId: string | null;
  razorpayPaymentId: string;
  amountPaise: number;
  method?: string | null;
  source: "checkout-verify" | "webhook";
}): Promise<ConfirmResult> {
  const { razorpayOrderId, razorpayPaymentId, amountPaise, method, source } = params;

  return db.transaction(async (tx) => {
    // Lock the candidate order row for the duration of this transaction.
    const rows = razorpayOrderId
      ? await tx.select().from(orders).where(eq(orders.razorpayOrderId, razorpayOrderId)).limit(1).for("update")
      : await tx
          .select()
          .from(orders)
          .where(eq(orders.id, sql`(select order_id from payments where razorpay_payment_id = ${razorpayPaymentId} limit 1)`))
          .limit(1)
          .for("update");
    const order = rows[0];
    if (!order) return { outcome: "unknown-order" } as const;

    // Idempotency + out-of-order safety: anything already beyond payment_pending is terminal for this purpose.
    if (order.status !== "payment_pending") {
      return { outcome: "already-processed", orderNumber: order.orderNumber } as const;
    }

    // Amount reconciliation — captured money must equal the server-quoted total exactly (paise).
    if (order.total !== amountPaise) {
      await tx.insert(payments).values({
        orderId: order.id,
        provider: "razorpay",
        status: "captured",
        amount: amountPaise,
        razorpayOrderId: razorpayOrderId ?? order.razorpayOrderId,
        razorpayPaymentId,
        method: method ?? null,
        verified: true,
      });
      return { outcome: "amount-mismatch", orderNumber: order.orderNumber } as const;
    }

    await tx.insert(payments).values({
      orderId: order.id,
      provider: "razorpay",
      status: "captured",
      amount: amountPaise,
      razorpayOrderId: razorpayOrderId ?? order.razorpayOrderId,
      razorpayPaymentId,
      method: method ?? null,
      verified: true,
    });

    await tx
      .update(orders)
      .set({ status: "paid", razorpayPaymentId, razorpayOrderId: razorpayOrderId ?? order.razorpayOrderId })
      .where(eq(orders.id, order.id));

    // Atomic stock deduction (reservations already guarded this, clamped defensively).
    const lines = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    const productRows = await tx.select().from(products).where(inArraySafe(products.slug, lines.map((l) => l.slug)));
    const idBySlug = new Map(productRows.map((p) => [p.slug, p.id]));
    for (const line of lines) {
      const pid = idBySlug.get(line.slug);
      if (!pid) continue;
      await tx
        .update(products)
        .set({ stock: sql`greatest(${products.stock} - ${line.qty}, 0)`, updatedAt: new Date() })
        .where(eq(products.id, pid));
      await tx.insert(stockMovements).values({
        productId: pid,
        delta: -line.qty,
        reason: "sale",
        note: `${order.orderNumber} (${source})`,
      });
    }

    // Reservations converted → released.
    await tx.update(inventoryReservations).set({ released: true }).where(eq(inventoryReservations.orderId, order.id));

    // Coupon redemption (one per order+coupon; races ignored).
    if (order.coupon && order.discount > 0) {
      await tx
        .insert(couponRedemptions)
        .values({ coupon: order.coupon, orderId: order.id, email: order.email, discountPaise: order.discount })
        .onConflictDoNothing();
      await tx
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(eq(coupons.code, order.coupon));
    }

    return { outcome: "paid", orderNumber: order.orderNumber } as const;
  }).then(async (res) => {
    if (res.outcome === "paid") {
      const o = await db.select().from(orders).where(eq(orders.orderNumber, res.orderNumber)).limit(1);
      if (o[0]) void sendOrderEmail("order_paid", o[0]);
    }
    return res;
  });
}

/** A failed/declined attempt: record it, release the hold, keep the order payable. */
export async function failPayment(params: { razorpayOrderId: string; razorpayPaymentId?: string | null; reason?: string }) {
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(orders).where(eq(orders.razorpayOrderId, params.razorpayOrderId)).limit(1).for("update");
    const order = rows[0];
    if (!order) return { outcome: "unknown-order" } as const;
    if (order.status !== "payment_pending") return { outcome: "already-processed", orderNumber: order.orderNumber } as const;

    if (params.razorpayPaymentId) {
      await tx.insert(payments).values({
        orderId: order.id,
        provider: "razorpay",
        status: "failed",
        amount: order.total,
        razorpayOrderId: params.razorpayOrderId,
        razorpayPaymentId: params.razorpayPaymentId,
        verified: true,
      });
    }
    // Release holdings so stock sells to someone else; the order stays payable (retry-safe).
    await tx.update(inventoryReservations).set({ released: true }).where(eq(inventoryReservations.orderId, order.id));
    return { outcome: "retry-allowed", orderNumber: order.orderNumber } as const;
  });
}

function inArraySafe<T>(col: typeof products.slug, values: T[]) {
  return values.length ? sql`${col} in (${sql.join(values.map((v) => sql`${String(v)}`), sql`, `)})` : sql`false`;
}
