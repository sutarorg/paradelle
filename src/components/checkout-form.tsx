"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Lock, ShoppingBag, Tag, ShieldCheck } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { getProduct, type Product } from "@/lib/products";
import { computeTotals } from "@/lib/commerce";
import { formatINR } from "@/lib/utils";
import { Field, inputClass } from "@/components/ui";
import { payForOrder } from "@/lib/razorpay-client";
import { PayNowButton } from "@/components/pay-now";

export type SavedAddress = {
  id: string;
  label: string;
  name: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

type Props = {
  user: { name: string; email: string } | null;
  catalog: Product[];
  shipping: { flatFee: number; freeThreshold: number };
  addresses?: SavedAddress[];
};

export function CheckoutForm({ user, catalog, shipping, addresses = [] }: Props) {
  const { items, coupon, hydrated, clear, setCoupon } = useCart();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [busyNote, setBusyNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reservedOrder, setReservedOrder] = useState<string | null>(null);

  const totals = useMemo(
    () => computeTotals(items, coupon || undefined, undefined, { catalog, flatFee: shipping.flatFee, freeThreshold: shipping.freeThreshold }),
    [items, coupon, catalog, shipping],
  );

  const findProduct = (slug: string) => catalog.find((p) => p.slug === slug) ?? getProduct(slug);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const form = e.currentTarget;
      const body = {
        items,
        coupon: coupon || undefined,
        customer: {
          email: (form.elements.namedItem("email") as HTMLInputElement).value.trim(),
          name: (form.elements.namedItem("name") as HTMLInputElement).value.trim(),
          phone: (form.elements.namedItem("phone") as HTMLInputElement).value.trim(),
          line1: (form.elements.namedItem("line1") as HTMLInputElement).value.trim(),
          line2: (form.elements.namedItem("line2") as HTMLInputElement).value.trim(),
          city: (form.elements.namedItem("city") as HTMLInputElement).value.trim(),
          state: (form.elements.namedItem("state") as HTMLInputElement).value.trim(),
          pincode: (form.elements.namedItem("pincode") as HTMLInputElement).value.trim(),
        },
      };
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; orderNumber?: string; message?: string };
      if (!res.ok || !data.ok || !data.orderNumber) throw new Error(data.message ?? "We could not place the order. Please try again.");

      const orderNumber = data.orderNumber;
      setReservedOrder(orderNumber);

      // Razorpay Standard Checkout (prepaid only). The browser callback is never
      // trusted — /api/checkout/verify validates signature + re-fetches the payment.
      const outcome = await payForOrder(orderNumber, { onProgress: setBusyNote });

      if (outcome.outcome === "paid" || outcome.outcome === "pending" || outcome.outcome === "gateway-pending") {
        clear();
        setCoupon("");
        router.push(`/checkout/success?order=${encodeURIComponent(orderNumber)}${outcome.outcome === "paid" ? "&paid=1" : ""}`);
        return;
      }
      // cancelled / failed — the order stays reserved; offer an immediate retry.
      setError(outcome.message ?? "Payment did not complete. Your order is reserved for 24 hours — retry below.");
      setBusy(false);
      setBusyNote(null);
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (!hydrated) {
    // Render the SAME card geometry as the empty-bag state so hydration swaps text, not layout (CLS guard).
    return (
      <div className="flex flex-col items-center rounded-3xl border hairline-gold bg-cream px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-plum text-gold">
          <ShoppingBag className="h-7 w-7" strokeWidth={1.4} />
        </span>
        <h2 className="font-display mt-6 text-3xl text-espresso animate-pulse">Preparing checkout…</h2>
        <p className="mt-3 max-w-sm text-sm text-espresso/70 animate-pulse">Your bag is being read from this device.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border hairline-gold bg-cream px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-plum text-gold">
          <ShoppingBag className="h-7 w-7" strokeWidth={1.4} />
        </span>
        <h2 className="font-display mt-6 text-3xl text-espresso">Nothing to check out yet</h2>
        <p className="mt-3 max-w-sm text-sm text-espresso/70">Your bag is empty — the collection is only four bars deep, and every one earns its place.</p>
        <Link href="/collection" className="mt-8 inline-flex items-center gap-2 rounded-full bg-espresso px-7 py-3.5 text-[13px] font-semibold uppercase tracking-[0.18em] text-ivory transition-colors hover:bg-plum">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} /> Back to the collection
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
      {/* ——— Details form ——— */}
      <form onSubmit={submit} className="space-y-8" noValidate={false}>
        <section aria-labelledby="contact-h">
          <div className="flex items-baseline justify-between gap-4">
            <h2 id="contact-h" className="font-display text-2xl text-espresso">Contact</h2>
            {user ? (
              <p className="text-[12px] text-espresso/55">Signed in as <span className="font-medium text-espresso">{user.email}</span></p>
            ) : (
              <p className="text-[12px] text-espresso/55">
                Guest checkout — <Link href={`/login?next=/checkout`} className="font-medium text-bronze underline-offset-4 hover:underline">sign in</Link>
              </p>
            )}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input name="email" type="email" required defaultValue={user?.email ?? ""} autoComplete="email" inputMode="email" className={inputClass} placeholder="you@email.com" />
            </Field>
            <Field label="Phone" hint="for delivery updates">
              <input name="phone" type="tel" required minLength={10} pattern="[0-9+ ()-]{10,15}" title="A phone number our courier can reach" autoComplete="tel" inputMode="tel" className={inputClass} placeholder="+91 …" />
            </Field>
          </div>
        </section>

        <section aria-labelledby="delivery-h">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="delivery-h" className="font-display text-2xl text-espresso">Delivery address</h2>
            {addresses.length > 0 ? (
              <select
                aria-label="Use a saved address"
                defaultValue=""
                className="rounded-full border border-espresso/15 bg-cream px-4 py-2 text-[12px] font-medium text-espresso outline-none focus:border-bronze"
                onChange={(e) => {
                  const a = addresses.find((x) => x.id === e.target.value);
                  if (!a) return;
                  const form = e.currentTarget.closest("form");
                  if (!form) return;
                  const set = (n: string, v: string) => {
                    const el = form.elements.namedItem(n) as HTMLInputElement | null;
                    if (el) el.value = v;
                  };
                  set("name", a.name);
                  set("phone", a.phone);
                  set("line1", a.line1);
                  set("line2", a.line2 ?? "");
                  set("city", a.city);
                  set("state", a.state);
                  set("pincode", a.pincode);
                }}
              >
                <option value="" disabled>Use a saved address…</option>
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>{a.label} — {a.city} {a.pincode}</option>
                ))}
              </select>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4">
            <Field label="Full name">
              <input name="name" required minLength={2} defaultValue={user?.name ?? ""} autoComplete="name" className={inputClass} placeholder="Recipient's full name" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Address line 1">
                <input name="line1" required className={inputClass} placeholder="Flat / house, street" autoComplete="address-line1" />
              </Field>
              <Field label="Line 2" hint="optional">
                <input name="line2" className={inputClass} placeholder="Landmark, area" autoComplete="address-line2" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City">
                <input name="city" required className={inputClass} placeholder="Mumbai" autoComplete="address-level2" />
              </Field>
              <Field label="State">
                <input name="state" required className={inputClass} placeholder="Maharashtra" autoComplete="address-level1" />
              </Field>
              <Field label="PIN code">
                <input name="pincode" required pattern="\d{6}" inputMode="numeric" title="6-digit PIN code" className={inputClass} placeholder="400001" autoComplete="postal-code" />
              </Field>
            </div>
          </div>
        </section>

        <section aria-labelledby="payment-h" className="rounded-3xl border hairline-gold bg-ivory p-6 sm:p-7">
          <h2 id="payment-h" className="font-display flex items-center gap-2.5 text-2xl text-espresso">
            <Lock className="h-5 w-5 text-bronze" strokeWidth={1.7} /> Payment
          </h2>
          <div className="mt-4 flex items-center justify-between rounded-2xl border border-gold/40 bg-gold/10 px-5 py-4">
            <div>
              <p className="text-sm font-semibold text-espresso">Razorpay — secure checkout</p>
              <p className="mt-0.5 text-[12px] text-espresso/60">UPI &middot; Credit &amp; debit cards &middot; NetBanking &middot; Wallets</p>
            </div>
            <ShieldCheck className="h-6 w-6 text-bronze" strokeWidth={1.6} />
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-espresso/55">
            All payments are prepaid and processed by Razorpay over encrypted connections; PARADELLE never sees your
            card or UPI credentials. We do not offer Cash on Delivery — prepaid orders keep the chilled chain reliable.
          </p>
        </section>

        {error ? (
          <div role="alert" className="space-y-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
            <p>{error}</p>
            {reservedOrder ? <PayNowButton orderNumber={reservedOrder} label="Retry payment" /> : null}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="flex w-full items-center justify-center gap-2.5 rounded-full border border-gold bg-gold px-7 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-espresso transition-all duration-300 hover:bg-transparent hover:text-bronze active:translate-y-px disabled:opacity-60"
        >
          <Lock className="h-4 w-4" strokeWidth={1.8} />
          {busy ? busyNote ?? "Working…" : `Pay ${formatINR(totals.total)} securely`}
        </button>
        <p className="text-center text-[11.5px] text-espresso/45">You&rsquo;ll confirm in Razorpay&rsquo;s secure window — nothing posts until it verifies.</p>
      </form>

      {/* ——— Summary ——— */}
      <aside className="h-fit rounded-3xl border hairline-gold bg-cream p-6 sm:p-8 lg:sticky lg:top-28">
        <h2 className="font-display text-2xl text-espresso">Your order</h2>
        <ul className="mt-6 space-y-4">
          {items.map((l) => {
            const p = findProduct(l.slug);
            if (!p) return null;
            return (
              <li key={l.slug} className="flex items-center gap-3.5">
                <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-espresso/10">
                  <Image src={p.images.front} alt={p.name} fill sizes="56px" className="object-cover" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-[15px] text-espresso">{p.shortName}</p>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-espresso/45">Qty {l.qty} &middot; {p.weightGrams} g</p>
                </div>
                <p className="text-sm font-medium tabular-nums">{formatINR(p.price * l.qty)}</p>
              </li>
            );
          })}
        </ul>

        <dl className="mt-6 space-y-2.5 border-t hairline-gold pt-5 text-[13.5px]">
          <div className="flex justify-between">
            <dt className="text-espresso/60">Subtotal</dt>
            <dd className="tabular-nums">{formatINR(totals.subtotal)}</dd>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-bronze">
              <dt className="flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" strokeWidth={1.8} />{totals.coupon?.code}</dt>
              <dd className="tabular-nums">−{formatINR(totals.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-espresso/60">Shipping</dt>
            <dd className="tabular-nums">{totals.shipping === 0 ? "Complimentary" : formatINR(totals.shipping)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t hairline-gold pt-3.5">
            <dt className="font-display text-lg">Total</dt>
            <dd className="text-right">
              <span className="font-display text-2xl tabular-nums">{formatINR(totals.total)}</span>
              <span className="block text-[11px] text-espresso/45">Taxes included</span>
            </dd>
          </div>
        </dl>
      </aside>
    </div>
  );
}
