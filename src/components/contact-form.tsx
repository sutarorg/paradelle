"use client";

import { useState } from "react";
import { Send, Check } from "lucide-react";
import { Field, inputClass, Button } from "@/components/ui";

export function ContactForm() {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (state === "sending") return;
    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement).value,
    };
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json()) as { ok: boolean; message?: string };
      if (!res.ok || !json.ok) throw new Error(json.message ?? "Something went wrong.");
      setState("done");
      form.reset();
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Please try again.");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-start gap-4 rounded-3xl border border-gold/40 bg-cream p-8">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-plum text-gold">
          <Check className="h-5 w-5" strokeWidth={2} />
        </span>
        <div>
          <p className="font-display text-xl text-espresso">Your note is with us.</p>
          <p className="mt-1.5 text-sm leading-relaxed text-espresso/60">
            We answer every message personally within two business days. If it concerns an order, include your order
            number for the fastest help.
          </p>
          <button type="button" onClick={() => setState("idle")} className="mt-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-bronze underline-offset-4 hover:underline">
            Send another note
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name">
          <input name="name" required minLength={2} className={inputClass} placeholder="Aanya Sharma" autoComplete="name" />
        </Field>
        <Field label="Email">
          <input name="email" type="email" required className={inputClass} placeholder="you@email.com" autoComplete="email" />
        </Field>
      </div>
      <Field label="Message" hint="orders, gifting, wholesale, press">
        <textarea name="message" required minLength={10} rows={5} className={inputClass} placeholder="Tell us how we can help…" />
      </Field>
      {state === "error" ? <p className="text-sm text-red-700">{message}</p> : null}
      <Button type="submit" disabled={state === "sending"}>
        <Send className="h-4 w-4" strokeWidth={1.8} />
        {state === "sending" ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
