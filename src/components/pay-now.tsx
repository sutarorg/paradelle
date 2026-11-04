"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { payForOrder } from "@/lib/razorpay-client";

/** Retry/complete payment CTA shown on confirmations and the /pay page. */
export function PayNowButton({ orderNumber, label = "Pay securely now" }: { orderNumber: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function start() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    const result = await payForOrder(orderNumber, { onProgress: setMessage });
    setBusy(false);
    setMessage(result.message ?? null);
    if (result.outcome === "paid" || result.outcome === "pending") {
      router.refresh();
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-gold bg-gold px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-espresso transition-all duration-300 hover:bg-transparent hover:text-bronze active:translate-y-px disabled:opacity-60 sm:w-auto"
      >
        <Lock className="h-4 w-4" strokeWidth={1.8} />
        {busy ? "Working…" : label}
      </button>
      {message ? <p className="text-[12.5px] text-espresso/60">{message}</p> : null}
    </div>
  );
}
