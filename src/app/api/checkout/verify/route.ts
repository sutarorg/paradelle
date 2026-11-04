import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { confirmPayment } from "@/lib/payments-core";
import { razorpayConfigured, rzpFetchPayment, verifyCheckoutSignature } from "@/lib/razorpay";
import { verifyPaymentSchema, zodError } from "@/lib/validation";
import { clientKey, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/**
 * Standard Checkout completion handler.
 * Trusts NOTHING from the browser: verifies the signature, then independently
 * re-fetches the payment from Razorpay to confirm status + exact amount (paise)
 * before the fulfilment gate opens. The webhook remains the authoritative
 * fallback if this call is lost.
 */
export async function POST(req: Request) {
  const rl = rateLimit(clientKey(req, "rzp-verify"), 20, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, message: "Slow down a moment." }, { status: 429 });

  const parsed = verifyPaymentSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, message: zodError(parsed.error) }, { status: 400 });
  const { orderNumber, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  if (!razorpayConfigured()) {
    return NextResponse.json({ ok: false, message: "Payment verification is unavailable until Razorpay keys are configured." }, { status: 503 });
  }

  const sigOk = verifyCheckoutSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!sigOk) return NextResponse.json({ ok: false, message: "Signature verification failed." }, { status: 400 });

  // Independent server-side confirmation of the money itself.
  let payment;
  try {
    payment = await rzpFetchPayment(razorpay_payment_id);
  } catch (err) {
    console.error("verify:fetch", err);
    return NextResponse.json({ ok: false, status: "pending", message: "Gateway confirmation pending — the signed webhook will finish this within seconds." }, { status: 202 });
  }

  if (payment.order_id !== razorpay_order_id) {
    return NextResponse.json({ ok: false, message: "Payment/order mismatch." }, { status: 400 });
  }
  if (payment.status !== "captured" && payment.status !== "authorized") {
    return NextResponse.json({ ok: false, status: "pending", message: `Payment status is “${payment.status}” — no capture confirmed.` }, { status: 202 });
  }

  const orderRows = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
  const order = orderRows[0];
  if (!order) return NextResponse.json({ ok: false, message: "Order not found." }, { status: 404 });

  const result = await confirmPayment({
    razorpayOrderId: razorpay_order_id,
    razorpayPaymentId: razorpay_payment_id,
    amountPaise: payment.amount,
    method: payment.method ?? null,
    source: "checkout-verify",
  });

  if (result.outcome === "paid" || result.outcome === "already-processed") {
    return NextResponse.json({ ok: true, status: "paid", orderNumber: result.orderNumber });
  }
  if (result.outcome === "amount-mismatch") {
    return NextResponse.json(
      { ok: false, status: "review", message: "The captured amount did not match the order total. The team reconciles these by hand — your money is safe either way." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: false, message: "We could not match that payment to an open order." }, { status: 404 });
}
