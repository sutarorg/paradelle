"use client";

import { useState } from "react";
import { MailOpen, Check } from "lucide-react";

type State = "idle" | "sending" | "done" | "error";

export function NewsletterForm({ dark = false }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (state === "sending") return;
    setState("sending");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Something went wrong.");
      setState("done");
      setMessage(data.message ?? "Welcome to the maison.");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Please try again.");
    }
  }

  if (state === "done") {
    return (
      <div className={`flex items-start gap-3 rounded-2xl border px-5 py-4 ${dark ? "border-gold/30 bg-gold/10 text-ivory" : "border-bronze/25 bg-cream text-espresso"}`}>
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-gold" strokeWidth={2} />
        <div>
          <p className="font-display text-lg">{message}</p>
          <p className={`mt-1 text-sm ${dark ? "text-ivory/70" : "text-espresso/60"}`}>
            Your welcome code <span className="font-semibold tracking-[0.14em] text-gold">WELCOME10</span> is yours — apply it in your bag for 10% off your first order.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="w-full">
      <div className={`flex flex-col gap-3 sm:flex-row ${dark ? "" : ""}`}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          aria-label="Email address"
          className={`w-full flex-1 rounded-full border px-5 py-3.5 text-[15px] outline-none transition-colors ${
            dark
              ? "border-ivory/25 bg-ivory/10 text-ivory placeholder:text-ivory/40 focus:border-gold"
              : "border-espresso/15 bg-cream text-espresso placeholder:text-espresso/35 focus:border-bronze"
          }`}
        />
        <button
          type="submit"
          disabled={state === "sending"}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-gold bg-gold px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-espresso transition-all duration-300 hover:bg-transparent hover:text-gold disabled:opacity-60"
        >
          <MailOpen className="h-4 w-4" strokeWidth={1.8} />
          {state === "sending" ? "Subscribing…" : "Subscribe"}
        </button>
      </div>
      {state === "error" ? <p className="mt-2 text-sm text-red-700">{message}</p> : null}
      <p className={`mt-3 text-xs ${dark ? "text-ivory/65" : "text-espresso/45"}`}>
        One considered letter a month — new releases, atelier notes, early access. Unsubscribe anytime.
      </p>
    </form>
  );
}
