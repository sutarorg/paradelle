"use client";

/**
 * Browser-side Razorpay Standard Checkout orchestration (prepaid only).
 * Loads checkout.js lazily, opens the modal, then hands the response to our
 * server verification API — the browser callback alone is never trusted.
 */

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open(): void };
  }
}

let scriptPromise: Promise<boolean> | null = null;

function loadCheckoutScript(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }
  return scriptPromise;
}

export type PayOutcome = "paid" | "pending" | "gateway-pending" | "cancelled" | "failed";

export async function payForOrder(
  orderNumber: string,
  callbacks: { onProgress?: (step: string) => void },
): Promise<{ outcome: PayOutcome; message?: string }> {
  const { onProgress } = callbacks;
  onProgress?.("Preparing secure payment…");

  const create = await fetch("/api/checkout/razorpay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderNumber }),
  });
  const created = (await create.json()) as {
    ok?: boolean;
    status?: string;
    keyId?: string;
    razorpayOrderId?: string;
    amount?: number;
    currency?: string;
    prefill?: { name?: string; email?: string; contact?: string };
    message?: string;
  };

  if (!created.ok) {
    if (created.status === "gateway_pending") return { outcome: "gateway-pending", message: created.message };
    return { outcome: "failed", message: created.message ?? "Could not reach the payment gateway." };
  }

  const scriptOk = await loadCheckoutScript();
  if (!scriptOk || !window.Razorpay) return { outcome: "failed", message: "Could not load Razorpay Checkout — check your connection." };

  return new Promise((resolve) => {
    const rzp = new window.Razorpay!({
      key: created.keyId,
      amount: created.amount,
      currency: created.currency ?? "INR",
      name: "PARADELLE CHOCOLATES",
      description: `Order ${orderNumber}`,
      order_id: created.razorpayOrderId,
      prefill: created.prefill,
      theme: { color: "#291813" },
      modal: {
        ondismiss: () => resolve({ outcome: "cancelled", message: "Payment window closed — your bars stay reserved for 24 hours." }),
      },
      handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        onProgress?.("Verifying payment with the gateway…");
        try {
          const res = await fetch("/api/checkout/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderNumber,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            }),
          });
          const data = (await res.json()) as { ok?: boolean; status?: string; message?: string };
          if (data.ok && data.status === "paid") resolve({ outcome: "paid" });
          else if (data.status === "pending") resolve({ outcome: "pending", message: data.message });
          else resolve({ outcome: "failed", message: data.message ?? "Verification failed." });
        } catch {
          resolve({ outcome: "pending", message: "Confirmation in progress — the signed webhook completes it automatically." });
        }
      },
    });
    onProgress?.("Opening Razorpay secure checkout…");
    rzp.open();
  });
}
