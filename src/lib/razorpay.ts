import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Razorpay gateway helpers — SECRETS SERVER-SIDE ONLY.
 * Test mode uses rzp_test_* keys; live mode uses rzp_live_* — same code path.
 * COD is never configured; all flows are prepaid capture.
 */
const API = "https://api.razorpay.com/v1";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function razorpayMode(): "test" | "live" | "off" {
  const key = process.env.RAZORPAY_KEY_ID ?? "";
  if (!razorpayConfigured()) return "off";
  return key.startsWith("rzp_live") ? "live" : "test";
}

function authHeader() {
  return `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`;
}

export type RazorpayOrder = { id: string; amount: number; currency: string; status: string };
export type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "failed" | string;
  method?: string;
};

export async function rzpCreateOrder(params: { amountPaise: number; receipt: string; notes?: Record<string, string> }): Promise<RazorpayOrder> {
  const res = await fetch(`${API}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify({ amount: params.amountPaise, currency: "INR", receipt: params.receipt, notes: params.notes ?? {} }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`razorpay order create failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as RazorpayOrder;
}

/** Independent server-side re-verification of a payment entity. */
export async function rzpFetchPayment(paymentId: string): Promise<RazorpayPayment> {
  const res = await fetch(`${API}/payments/${paymentId}`, { headers: { Authorization: authHeader() }, cache: "no-store" });
  if (!res.ok) throw new Error(`razorpay payment fetch failed: ${res.status}`);
  return (await res.json()) as RazorpayPayment;
}

export async function rzpFetchOrder(orderId: string): Promise<RazorpayOrder & { amount_paid?: number }> {
  const res = await fetch(`${API}/orders/${orderId}`, { headers: { Authorization: authHeader() }, cache: "no-store" });
  if (!res.ok) throw new Error(`razorpay order fetch failed: ${res.status}`);
  return (await res.json()) as RazorpayOrder & { amount_paid?: number };
}

/** Standard Checkout signature: HMAC_SHA256(key_secret, razorpay_order_id|razorpay_payment_id) */
export function verifyCheckoutSignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqual(expected, signature);
}

/** Webhook signature: HMAC_SHA256(webhook_secret, raw request body) — constant-time compare. */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  return safeEqual(expected, signature);
}

/** Full refund (omit amountPaise) or partial refund (with amountPaise). */
export async function rzpRefund(paymentId: string, amountPaise?: number): Promise<{ id: string; amount: number }> {
  const res = await fetch(`${API}/payments/${paymentId}/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader() },
    body: JSON.stringify(amountPaise ? { amount: amountPaise } : {}),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`razorpay refund failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as { id: string; amount: number };
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
