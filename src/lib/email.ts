import { formatINR, formatDate } from "@/lib/utils";
import type { orders } from "@/db/schema";

/**
 * Transactional email service interface (Phase 3).
 * Provider-ready: set RESEND_API_KEY + RESEND_FROM to send real mail via Resend;
 * otherwise messages are logged server-side (no silent drops). Never blocks the
 * payment path — callers use `void sendOrderEmail(...)`.
 */

export type OrderEmailEvent = "order_reserved" | "order_paid" | "order_shipped" | "refund_processed";

type OrderRow = typeof orders.$inferSelect;

const BRAND = "PARADELLE CHOCOLATES";

function template(event: OrderEmailEvent, order: OrderRow, extra?: { trackingUrl?: string; amount?: number }): { subject: string; text: string } {
  const first = order.name.split(" ")[0];
  switch (event) {
    case "order_reserved":
      return {
        subject: `Your PARADELLE order ${order.orderNumber} is reserved`,
        text: `Dear ${first},\n\nYour order ${order.orderNumber} (${formatINR(order.total)}) is reserved in the atelier's book. Complete secure payment via the Razorpay link we have sent separately; the batch holds your bars for 24 hours.\n\nDelivering to: ${order.line1}, ${order.city}, ${order.state} — ${order.pincode}.\n\n— ${BRAND}`,
      };
    case "order_paid":
      return {
        subject: `Payment received — ${order.orderNumber} is being crafted`,
        text: `Dear ${first},\n\nPayment of ${formatINR(order.total)} on ${formatDate(order.createdAt)} is confirmed (Razorpay, prepaid). Your chocolate now moves to crafting and will dispatch in insulated packaging within 1–2 business days.\n\nOrder: ${order.orderNumber}\n\n— ${BRAND}`,
      };
    case "order_shipped":
      return {
        subject: `On its way — ${order.orderNumber}`,
        text: `Dear ${first},\n\n${order.orderNumber} has shipped${order.shippingProvider ? ` via ${order.shippingProvider}` : ""}${order.trackingId ? ` (${order.trackingId})` : ""}.${extra?.trackingUrl || order.trackingUrl ? `\nTrack: ${extra?.trackingUrl ?? order.trackingUrl}` : ""}\n\nBring the parcel inside promptly — chocolate prefers cool rooms.\n\n— ${BRAND}`,
      };
    case "refund_processed":
      return {
        subject: `Refund processed — ${order.orderNumber}`,
        text: `Dear ${first},\n\nA refund of ${formatINR(extra?.amount ?? order.total)} for order ${order.orderNumber} has been processed to the original payment method via Razorpay. Banks typically show it within 5–7 business days.\n\n— ${BRAND}`,
      };
  }
}

export async function sendOrderEmail(event: OrderEmailEvent, order: OrderRow, extra?: { trackingUrl?: string; amount?: number }) {
  const { subject, text } = template(event, order, extra);
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? `${BRAND} <orders@paradelle.store>`;
  if (!key) {
    console.log(`[email:queued-local] ${event} → ${order.email} :: ${subject}`);
    return { sent: false };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: order.email, subject, text }),
    });
    if (!res.ok) console.error("email:send failed", res.status, await res.text());
    return { sent: res.ok };
  } catch (err) {
    console.error("email:send error", err);
    return { sent: false };
  }
}
