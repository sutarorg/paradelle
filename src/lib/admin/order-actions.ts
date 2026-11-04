"use server";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { inventoryReservations, orders, payments, products, refunds, stockMovements } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { asInt, asStr, flash, logActivity, safe } from "@/lib/admin/log";
import { razorpayConfigured, rzpRefund } from "@/lib/razorpay";
import { sendOrderEmail } from "@/lib/email";

/**
 * Order lifecycle enforcement (Phase 2):
 *  payment_pending → cancelled            (allowed: nothing paid yet)
 *  paid → crafting → shipped → delivered  (allowed)
 *  payment_pending → paid                 (FORBIDDEN manually — only a verified
 *                                          Razorpay webhook event may set it, Phase 3)
 */
const FLOW: Record<string, string[]> = {
  payment_pending: ["cancelled"],
  paid: ["crafting", "cancelled"],
  crafting: ["shipped"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const ORDER_STATUSES = ["payment_pending", "paid", "crafting", "shipped", "delivered", "cancelled"] as const;

export async function updateOrderStatusAction(formData: FormData) {
  const me = await requireAdmin("orders");
  const orderId = asStr(formData.get("orderId"));
  const target = asStr(formData.get("status"));
  if (!ORDER_STATUSES.includes(target as (typeof ORDER_STATUSES)[number])) return flash(`/admin/orders`, undefined, "Unknown status.");

  let back = `/admin/orders/${orderId}`;
  const err = await safe(async () => {
    const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const order = rows[0];
    if (!order) throw new Error("Order not found.");
    if (target === "paid") {
      throw new Error("Payments are confirmed automatically by Razorpay (Phase 3 webhooks). A payment can never be marked successful manually.");
    }
    const allowed = FLOW[order.status] ?? [];
    if (!allowed.includes(target)) {
      throw new Error(`Cannot move “${order.orderNumber}” from ${order.status.replace("_", " ")} to ${target.replace("_", " ")}.`);
    }
    await db
      .update(orders)
      .set({
        status: target,
        fulfilledAt: target === "delivered" ? new Date() : order.fulfilledAt,
        cancelledAt: target === "cancelled" ? new Date() : order.cancelledAt,
        cancelReason: target === "cancelled" ? asStr(formData.get("reason")) || "Cancelled by admin" : order.cancelReason,
      })
      .where(eq(orders.id, orderId));
    // Release the stock hold when an unpaid order is cancelled.
    if (target === "cancelled") {
      await db.update(inventoryReservations).set({ released: true }).where(eq(inventoryReservations.orderId, orderId));
    }
    await logActivity(me, `order.${target}`, "order", order.orderNumber);
    if (target === "shipped") {
      const updated = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (updated[0]) void sendOrderEmail("order_shipped", updated[0]);
    }
  }, "Status update not allowed for this order.");
  flash(back, err ? undefined : "Order updated.", err ?? undefined);
}

export async function updateTrackingAction(formData: FormData) {
  const me = await requireAdmin("orders");
  const orderId = asStr(formData.get("orderId"));
  const provider = asStr(formData.get("provider"));
  const trackingId = asStr(formData.get("trackingId"));
  const trackingUrl = asStr(formData.get("trackingUrl"));
  const err = await safe(async () => {
    const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!rows[0]) throw new Error("not found");
    await db
      .update(orders)
      .set({ shippingProvider: provider || null, trackingId: trackingId || null, trackingUrl: trackingUrl || null })
      .where(eq(orders.id, orderId));
    await logActivity(me, "order.tracking", "order", rows[0].orderNumber, `${provider} ${trackingId}`.trim());
  });
  flash(`/admin/orders/${orderId}`, err ? undefined : "Tracking saved.", err ?? undefined);
}

/** Record a refund request. Actual money movement happens via Razorpay in Phase 3. */
export async function requestRefundAction(formData: FormData) {
  const me = await requireAdmin("orders");
  const orderId = asStr(formData.get("orderId"));
  const amount = asInt(formData.get("amount"), 0);
  const reason = asStr(formData.get("reason"));
  if (amount < 1) return flash(`/admin/orders/${orderId}`, undefined, "Refund amount must be at least ₹1.");
  if (!reason) return flash(`/admin/orders/${orderId}`, undefined, "A reason is required.");

  const err = await safe(async () => {
    const rows = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const order = rows[0];
    if (!order) throw new Error("not found");
    if (!["paid", "crafting", "shipped", "delivered"].includes(order.status))
      throw new Error("Refunds apply only to paid orders.");
    if (amount > order.total) throw new Error("Refund cannot exceed the order total.");
    const latest = await db.select().from(payments).where(eq(payments.orderId, orderId)).orderBy(desc(payments.createdAt)).limit(1);
    await db.insert(refunds).values({ orderId, paymentId: latest[0]?.id ?? null, amount, reason, adminId: me.id });
    await logActivity(me, "refund.request", "order", order.orderNumber, `₹${amount} — ${reason}`);
  }, "Could not record the refund request.");
  flash(`/admin/orders/${orderId}`, err ? undefined : "Refund request recorded — it will be processed at the gateway (Phase 3).", err ?? undefined);
}

export async function rejectRefundAction(formData: FormData) {
  const me = await requireAdmin("orders");
  const refundId = asStr(formData.get("refundId"));
  const orderId = asStr(formData.get("orderId"));
  const err = await safe(async () => {
    await db.update(refunds).set({ status: "rejected", processedAt: new Date() }).where(eq(refunds.id, refundId));
    await logActivity(me, "refund.reject", "refund", refundId);
  });
  flash(`/admin/orders/${orderId}`, err ? undefined : "Refund request rejected.", err ?? undefined);
}

/** Execute a requested refund at the Razorpay gateway (full or partial, paise-exact). */
export async function processRefundAction(formData: FormData) {
  const me = await requireAdmin("orders");
  const refundId = asStr(formData.get("refundId"));
  const orderId = asStr(formData.get("orderId"));
  const back = `/admin/orders/${orderId}`;

  if (!razorpayConfigured()) {
    return flash(back, undefined, "Razorpay keys are not configured — refunds execute the moment gateway access is live.");
  }

  const err = await safe(async () => {
    const rows = await db.select().from(refunds).where(eq(refunds.id, refundId)).limit(1);
    const refund = rows[0];
    if (!refund || refund.status !== "requested") throw new Error("Refund is not awaiting processing.");
    const payRows = await db
      .select()
      .from(payments)
      .where(eq(payments.orderId, refund.orderId))
      .orderBy(desc(payments.createdAt));
    const captured = payRows.find((p) => p.status === "captured" && p.razorpayPaymentId);
    if (!captured || !captured.razorpayPaymentId) throw new Error("No captured payment to refund against.");

    const totalPaid = captured.amount;
    const already = await db
      .select({ v: sql<number>`coalesce(sum(${refunds.amount}),0)::int` })
      .from(refunds)
      .where(sql`${refunds.orderId} = ${refund.orderId} and ${refunds.status} = 'processed'`);
    const remaining = totalPaid - Number(already[0]?.v ?? 0);
    if (refund.amount > remaining) throw new Error(`Only ₹${remaining / 100} remains refundable on this payment.`);

    const gateway = await rzpRefund(captured.razorpayPaymentId, refund.amount);
    await db
      .update(refunds)
      .set({ status: "processed", processedAt: new Date(), razorpayRefundId: gateway.id, adminId: me.id })
      .where(eq(refunds.id, refundId));
    await db.insert(payments).values({
      orderId: refund.orderId,
      provider: "razorpay",
      status: "refunded",
      amount: -refund.amount,
      razorpayOrderId: captured.razorpayOrderId,
      razorpayPaymentId: captured.razorpayPaymentId,
      verified: true,
    });

    // Full refund on an unshipped order → cancel + restock.
    const ord = await db.select().from(orders).where(eq(orders.id, refund.orderId)).limit(1);
    if (ord[0] && refund.amount >= remaining && ["paid", "crafting"].includes(ord[0].status)) {
      await db.update(orders).set({ status: "cancelled", cancelledAt: new Date(), cancelReason: "Refunded in full" }).where(eq(orders.id, ord[0].id));
      const { orderItems } = await import("@/db/schema");
      const lines = await db.select().from(orderItems).where(eq(orderItems.orderId, ord[0].id));
      for (const line of lines) {
        const pr = await db.select().from(products).where(eq(products.slug, line.slug)).limit(1);
        if (pr[0]) {
          await db.update(products).set({ stock: sql`${products.stock} + ${line.qty}`, updatedAt: new Date() }).where(eq(products.id, pr[0].id));
          await db.insert(stockMovements).values({ productId: pr[0].id, delta: line.qty, reason: "refund", note: `Full refund ${ord[0].orderNumber}`, adminId: me.id });
        }
      }
    }
    if (ord[0]) void sendOrderEmail("refund_processed", ord[0], { amount: refund.amount });
    await logActivity(me, "refund.processed", "refund", refundId, `₹${refund.amount / 100}`);
  });
  flash(back, err ? undefined : "Refund processed at Razorpay.", err ?? undefined);
}
