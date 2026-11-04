import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, razorpayWebhookEvents, refunds, payments } from "@/db/schema";
import { confirmPayment, failPayment } from "@/lib/payments-core";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { sendOrderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

type WebhookPayload = {
  event: string;
  payload: {
    payment?: { entity: { id: string; order_id?: string; amount: number; method?: string; status?: string } };
    refund?: { entity: { id: string; payment_id: string; amount: number; status?: string } };
    order?: { entity: { id: string; amount: number; amount_paid?: number; status?: string } };
  };
};

/**
 * Razorpay signed webhook. Guarantees:
 *  - signature validated over the RAW body (constant-time compare)
 *  - exact-once processing via the unique event_key (duplicate → 200 no-op)
 *  - idempotent state machine: payment.captured after order.paid (or vice versa) settles once
 *  - every event persisted BEFORE processing, processedAt stamped after
 */
export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false, message: "webhook secret not configured" }, { status: 503 });
  }
  const valid = verifyWebhookSignature(raw, signature);
  if (!valid) {
    return NextResponse.json({ ok: false, message: "invalid signature" }, { status: 401 });
  }

  let data: WebhookPayload;
  try {
    data = JSON.parse(raw) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, message: "bad json" }, { status: 400 });
  }

  const eventKey =
    req.headers.get("x-razorpay-event-id") ??
    createHash("sha256").update(raw, "utf8").digest("hex");

  const paymentEntity = data.payload.payment?.entity;

  // Duplicate protection: first writer wins.
  const inserted = await db
    .insert(razorpayWebhookEvents)
    .values({
      eventKey,
      event: data.event,
      orderNumber: null,
      razorpayPaymentId: paymentEntity?.id ?? data.payload.refund?.entity.payment_id ?? null,
      signatureValid: true,
      payload: data as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing()
    .returning({ id: razorpayWebhookEvents.id });

  if (inserted.length === 0) {
    return NextResponse.json({ ok: true, duplicate: true });
  }
  const eventRowId = inserted[0].id;

  let result = "ignored";
  try {
    result = await processEvent(data);
  } catch (err) {
    console.error("webhook:process", err);
    result = `error: ${err instanceof Error ? err.message : "unknown"}`;
  }

  await db
    .update(razorpayWebhookEvents)
    .set({ processedAt: new Date(), processingResult: result })
    .where(eq(razorpayWebhookEvents.id, eventRowId));

  // Always ACK — Razorpay retries on non-2xx.
  return NextResponse.json({ ok: true, result });
}

async function processEvent(data: WebhookPayload): Promise<string> {
  switch (data.event) {
    case "payment.captured": {
      const p = data.payload.payment!.entity;
      if (!p.order_id) return "captured-without-order-id";
      const res = await confirmPayment({
        razorpayOrderId: p.order_id,
        razorpayPaymentId: p.id,
        amountPaise: p.amount,
        method: p.method ?? null,
        source: "webhook",
      });
      return `captured:${res.outcome}${"orderNumber" in res ? ":" + res.orderNumber : ""}`;
    }
    case "order.paid": {
      // Out-of-order tolerance: if payment.captured hasn't arrived yet, settle now.
      const o = data.payload.order!.entity;
      if (typeof o.amount_paid !== "number" || o.amount_paid <= 0) return "order-paid-no-money";
      const rows = await db.select().from(orders).where(eq(orders.razorpayOrderId, o.id)).limit(1);
      if (!rows[0]) return "order-paid-unknown-order";
      if (rows[0].status !== "payment_pending") return "order-paid-already-processed";
      // payment id arrives via payment.captured shortly; mark paid now, attach id then (confirmPayment is idempotent).
      const res = await confirmPayment({
        razorpayOrderId: o.id,
        razorpayPaymentId: `orderpaid:${o.id}`,
        amountPaise: o.amount_paid,
        source: "webhook",
      });
      return `order.paid:${res.outcome}`;
    }
    case "payment.failed": {
      const p = data.payload.payment!.entity;
      if (!p.order_id) return "failed-without-order-id";
      const res = await failPayment({ razorpayOrderId: p.order_id, razorpayPaymentId: p.id });
      return `failed:${res.outcome}`;
    }
    case "refund.processed": {
      const r = data.payload.refund!.entity;
      const updated = await db
        .update(refunds)
        .set({ status: "processed", processedAt: new Date(), razorpayRefundId: r.id })
        .where(sql`${refunds.razorpayRefundId} = ${r.id} or ${refunds.paymentId} = (select id from payments where razorpay_payment_id = ${r.payment_id} limit 1)`)
        .returning({ id: refunds.id, orderId: refunds.orderId, amount: refunds.amount });
      if (updated[0]) {
        const ord = await db.select().from(orders).where(eq(orders.id, updated[0].orderId)).limit(1);
        if (ord[0]) void sendOrderEmail("refund_processed", ord[0], { amount: updated[0].amount });
      }
      return updated.length ? `refund:processed:${r.id}` : "refund:unmatched";
    }
    default:
      return `ignored:${data.event}`;
  }
}
