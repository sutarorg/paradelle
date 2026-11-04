import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, payments } from "@/db/schema";
import { razorpayConfigured, razorpayMode, rzpCreateOrder } from "@/lib/razorpay";
import { createRazorpaySchema, zodError } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * Server-side Razorpay order creation (Standard Checkout, prepaid only).
 * The browser only receives the gateway order id + public key — never secrets.
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "rzp-create"), 15, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, message: "Slow down a moment." }, { status: 429 });

  const parsed = createRazorpaySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: zodError(parsed.error) }, { status: 400 });

  const found = await db.select().from(orders).where(eq(orders.orderNumber, parsed.data.orderNumber)).limit(1);
  const order = found[0];
  if (!order) return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });
  if (order.status !== "payment_pending") {
    return NextResponse.json({ ok: false, status: "already-processed", message: "This order has already moved past payment." }, { status: 409 });
  }

  if (!razorpayConfigured()) {
    return NextResponse.json(
      { ok: false, status: "gateway_pending", mode: "off", message: "Razorpay keys are not configured. Order reserved; a secure payment link follows by email." },
      { status: 503 },
    );
  }

  try {
    // Reuse an existing gateway order (retry-safe) or create fresh.
    let gatewayOrderId = order.razorpayOrderId;
    if (!gatewayOrderId) {
      const rzpOrder = await rzpCreateOrder({
        amountPaise: order.total, // already integer paise server-side
        receipt: order.orderNumber,
        notes: { orderNumber: order.orderNumber, email: order.email },
      });
      gatewayOrderId = rzpOrder.id;
      await db.update(orders).set({ razorpayOrderId: gatewayOrderId }).where(eq(orders.id, order.id));
    }

    await db.insert(payments).values({
      orderId: order.id,
      provider: "razorpay",
      status: "created",
      amount: order.total,
      razorpayOrderId: gatewayOrderId,
      verified: false,
    });

    return NextResponse.json({
      ok: true,
      mode: razorpayMode(),
      keyId: process.env.RAZORPAY_KEY_ID,
      razorpayOrderId: gatewayOrderId,
      amount: order.total,
      currency: "INR",
      prefill: { name: order.name, email: order.email, contact: order.phone },
    });
  } catch (err) {
    console.error("razorpay:create", err);
    return NextResponse.json({ ok: false, message: "Payment gateway is busy. Please retry in a moment." }, { status: 502 });
  }
}
