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

export type EmailSendResult = { sent: true } | { sent: false; reason: "not_configured" | "provider_error" };

type EmailMessage = { to: string; subject: string; text: string; replyTo?: string };

const ownerInbox = () => process.env.CONTACT_NOTIFICATION_EMAIL?.trim() || "tejassutar.business@gmail.com";

async function sendEmailMessage(message: EmailMessage, options: { inboundNotification?: boolean } = {}): Promise<EmailSendResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim() || `${BRAND} <orders@paradelle.store>`;
  if ((options.inboundNotification && process.env.ENABLE_INBOUND_EMAIL_NOTIFICATIONS !== "true") || !key) {
    return { sent: false, reason: "not_configured" };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from,
        to: message.to,
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });
    if (!response.ok) {
      console.error("email:send failed", response.status);
      return { sent: false, reason: "provider_error" };
    }
    return { sent: true };
  } catch (error) {
    console.error("email:send error", error instanceof Error ? error.message : "provider request failed");
    return { sent: false, reason: "provider_error" };
  }
}

export function sendContactMessageNotification(message: { name: string; email: string; message: string }) {
  const safeName = message.name.replace(/[\r\n]+/g, " ").slice(0, 120);
  return sendEmailMessage({
    to: ownerInbox(),
    replyTo: message.email,
    subject: `Website contact message from ${safeName}`,
    text: `Name: ${safeName}\nEmail: ${message.email}\n\nMessage:\n${message.message}`,
  }, { inboundNotification: true });
}

export function sendNewsletterSubscriberListNotification(emails: string[]) {
  return sendEmailMessage({
    to: ownerInbox(),
    subject: `Newsletter subscriber list updated (${emails.length})`,
    text: `Current newsletter subscribers (${emails.length}):\n\n${emails.join(", ")}`,
  }, { inboundNotification: true });
}

export async function sendOrderEmail(event: OrderEmailEvent, order: OrderRow, extra?: { trackingUrl?: string; amount?: number }) {
  const { subject, text } = template(event, order, extra);
  const result = await sendEmailMessage({ to: order.email, subject, text });
  if (!result.sent && result.reason === "not_configured") {
    console.log(`[email:queued-local] ${event} :: ${subject}`);
  }
  return result;
}
