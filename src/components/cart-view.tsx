"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Minus, Plus, Trash2, ArrowRight, Tag, Truck, ShieldCheck, ShoppingBag, Check } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { getProduct, type Product } from "@/lib/products";
import { computeTotals } from "@/lib/commerce";
import { formatINR } from "@/lib/utils";
import { Button, ButtonLink, inputClass } from "@/components/ui";

export function CartView({ catalog, shipping }: { catalog: Product[]; shipping: { flatFee: number; freeThreshold: number } }) {
  const { items, hydrated, setQty, remove, coupon, setCoupon } = useCart();
  const [draftCoupon, setDraftCoupon] = useState<string | null>(null);
  const [appliedTick, setAppliedTick] = useState(false);

  const totals = useMemo(
    () => computeTotals(items, coupon || undefined, undefined, { catalog, flatFee: shipping.flatFee, freeThreshold: shipping.freeThreshold }),
    [items, coupon, catalog, shipping],
  );

  const findProduct = (slug: string): Product | undefined => catalog.find((p) => p.slug === slug) ?? getProduct(slug);

  if (!hydrated) {
    // Same geometry as the empty-bag state — hydration swaps text, not layout (CLS guard).
    return (
      <div className="flex flex-col items-center rounded-3xl border hairline-gold bg-cream px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-plum text-gold">
          <ShoppingBag className="h-7 w-7" strokeWidth={1.4} />
        </span>
        <h2 className="font-display mt-6 text-3xl text-espresso animate-pulse">Reading your bag…</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-espresso/70 animate-pulse">One moment.</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-3xl border hairline-gold bg-cream px-6 py-20 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-plum text-gold">
          <ShoppingBag className="h-7 w-7" strokeWidth={1.4} />
        </span>
        <h2 className="font-display mt-6 text-3xl text-espresso">Your bag is waiting to be filled</h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-espresso/70">
          Four signature bars, each wrapped in gold detail. The hardest part is choosing only one.
        </p>
        <ButtonLink href="/collection" className="mt-8">
          Explore the collection <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
      {/* ——— Lines ——— */}
      <div>
        {/* Free-shipping progress */}
        <div className="mb-8 rounded-2xl border hairline-gold bg-cream p-5">
          {totals.freeShipping ? (
            <p className="flex items-center gap-2.5 text-[13px] font-medium text-espresso">
              <Check className="h-4 w-4 text-bronze" strokeWidth={2.2} />
              Complimentary shipping unlocked — nicely done.
            </p>
          ) : (
            <>
              <p className="flex items-center gap-2.5 text-[13px] font-medium text-espresso">
                <Truck className="h-4 w-4 text-bronze" strokeWidth={1.8} />
                Add {formatINR(totals.amountToFreeShipping)} more for FREE shipping
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-espresso/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-bronze to-gold transition-all duration-700"
                  style={{ width: `${Math.min(100, ((totals.subtotal - totals.discount) / Math.max(1, shipping.freeThreshold)) * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>

        <ul className="divide-y divide-espresso/8 border-y hairline-gold">
          {items.map((line) => {
            const p = findProduct(line.slug);
            if (!p) return null;
            return (
              <li key={line.slug} className="flex gap-4 py-6 sm:gap-6">
                <Link href={`/product/${p.slug}`} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl ring-1 ring-espresso/10 sm:h-28 sm:w-28">
                  <Image src={p.images.front} alt={p.name} fill sizes="112px" className="object-cover" />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/product/${p.slug}`} className="font-display text-lg leading-snug text-espresso transition-colors hover:text-bronze">
                        {p.name}
                      </Link>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-espresso/45">
                        {p.weightGrams} g &middot; {formatINR(p.price)} each
                      </p>
                    </div>
                    <button type="button" onClick={() => remove(line.slug)} aria-label={`Remove ${p.shortName}`} className="rounded-full p-2 text-espresso/40 transition-colors hover:bg-red-50 hover:text-red-800">
                      <Trash2 className="h-4 w-4" strokeWidth={1.7} />
                    </button>
                  </div>
                  <div className="mt-auto flex items-end justify-between pt-4">
                    <div className="inline-flex items-center rounded-full border border-espresso/15 bg-ivory">
                      <button type="button" aria-label="Decrease quantity" onClick={() => setQty(line.slug, line.qty - 1)} className="p-2.5 text-espresso/60 hover:text-espresso">
                        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                      <span className="w-9 text-center text-sm font-semibold tabular-nums" aria-live="polite">{line.qty}</span>
                      <button type="button" aria-label="Increase quantity" onClick={() => setQty(line.slug, line.qty + 1)} className="p-2.5 text-espresso/60 hover:text-espresso">
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                    <p className="font-display text-lg text-espresso">{formatINR(p.price * line.qty)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <Link href="/collection" className="mt-6 inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-bronze hover:text-espresso">
          <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={1.8} /> Continue choosing
        </Link>
      </div>

      {/* ——— Summary ——— */}
      <aside className="h-fit rounded-3xl border hairline-gold bg-cream p-6 sm:p-8 lg:sticky lg:top-28">
        <h2 className="font-display text-2xl text-espresso">Order summary</h2>

        <div className="mt-6">
          <label className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-espresso/60">
            <Tag className="h-3.5 w-3.5 text-bronze" strokeWidth={1.8} /> Coupon code
          </label>
          <div className="mt-2.5 flex gap-2">
            <input
              value={draftCoupon ?? coupon}
              onChange={(e) => setDraftCoupon(e.target.value.toUpperCase())}
              onBlur={() => setDraftCoupon(null)}
              placeholder="e.g. WELCOME10"
              aria-label="Coupon code"
              className={inputClass}
            />
            <Button
              type="button"
              variant="outlineDark"
              className="shrink-0 px-5"
              onClick={() => {
                setCoupon((draftCoupon ?? coupon).trim());
                setDraftCoupon(null);
                setAppliedTick(true);
                window.setTimeout(() => setAppliedTick(false), 1800);
              }}
            >
              {appliedTick ? "Applied" : "Apply"}
            </Button>
          </div>
          {totals.couponError ? <p className="mt-2 text-[13px] text-red-700">{totals.couponError}</p> : null}
          {totals.coupon ? <p className="mt-2 text-[13px] text-bronze">{totals.coupon.code}: {totals.coupon.description}</p> : null}
        </div>

        <dl className="mt-7 space-y-3 border-t hairline-gold pt-6 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-espresso/60">Subtotal</dt>
            <dd className="font-medium tabular-nums">{formatINR(totals.subtotal)}</dd>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-bronze">
              <dt>Coupon {totals.coupon?.code}</dt>
              <dd className="tabular-nums">−{formatINR(totals.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-espresso/60">Shipping</dt>
            <dd className="font-medium tabular-nums">{totals.shipping === 0 ? "Complimentary" : formatINR(totals.shipping)}</dd>
          </div>
          <div className="flex items-baseline justify-between border-t hairline-gold pt-4">
            <dt className="font-display text-lg text-espresso">Total</dt>
            <dd className="text-right">
              <span className="font-display text-2xl tabular-nums text-espresso">{formatINR(totals.total)}</span>
              <span className="mt-0.5 block text-[11px] text-espresso/45">Taxes included · nothing more at delivery</span>
            </dd>
          </div>
        </dl>

        <Button variant="gold" className="mt-7 w-full" onClick={() => { window.location.href = "/checkout"; }}>
          Proceed to checkout <ArrowRight className="h-4 w-4" strokeWidth={1.8} />
        </Button>

        <p className="mt-4 flex items-center justify-center gap-2 text-[11.5px] text-espresso/50">
          <ShieldCheck className="h-4 w-4 text-bronze" strokeWidth={1.7} />
          Secure prepaid checkout via Razorpay — UPI, cards, net banking, wallets
        </p>
      </aside>
    </div>
  );
}
