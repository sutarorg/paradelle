import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Check, Lock, Package, ArrowRight, CircleCheck } from "lucide-react";
import { PayNowButton } from "@/components/pay-now";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCatalog } from "@/lib/catalog";
import { formatINR } from "@/lib/utils";
import { ButtonLink, Kicker } from "@/components/ui";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = { title: "Order received" };
export const dynamic = "force-dynamic";

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderNumber } = await searchParams;
  const catalog = await getCatalog();
  const findImage = (slug: string) => catalog.find((c) => c.slug === slug);

  let order: typeof orders.$inferSelect | null = null;
  let items: (typeof orderItems.$inferSelect)[] = [];
  if (orderNumber) {
    try {
      const found = await db.select().from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
      order = found[0] ?? null;
      if (order) items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
    } catch {
      order = null;
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-16 text-center sm:px-6 lg:px-8">
      <Reveal>
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-plum text-gold">
          <Check className="h-9 w-9" strokeWidth={1.8} />
        </span>
      </Reveal>

      <Reveal delay={100}>
        <Kicker className="mt-8 justify-center">Order received</Kicker>
        <h1 className="font-display mt-3 text-4xl leading-tight text-espresso lg:text-5xl">
          Consider it <span className="text-gilt">crafted for you.</span>
        </h1>
      </Reveal>

      {order ? (
        <>
          <Reveal delay={180}>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-espresso/65">
              Order <span className="font-display text-lg text-espresso">{order.orderNumber}</span> is reserved in the
              atelier&rsquo;s book for <span className="font-medium text-espresso">{order.name}</span>.
            </p>
          </Reveal>

          <Reveal delay={260}>
            <div className="mt-10 rounded-3xl border hairline-gold bg-ivory p-6 text-left sm:p-8">
              <h2 className="font-display text-xl text-espresso">Order summary</h2>
              <ul className="mt-5 space-y-4">
                {items.map((it) => {
                  const p = findImage(it.slug);
                  return (
                    <li key={it.id} className="flex items-center gap-3.5">
                      {p ? (
                        <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg ring-1 ring-espresso/10">
                          <Image src={p.images.front} alt={p.name} fill sizes="56px" className="object-cover" />
                        </span>
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="font-display text-[15px] text-espresso">{it.name}</p>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-espresso/45">Qty {it.qty} &middot; {formatINR(it.unitPrice)} each</p>
                      </div>
                      <p className="text-sm font-medium tabular-nums">{formatINR(it.lineTotal)}</p>
                    </li>
                  );
                })}
              </ul>
              <dl className="mt-6 space-y-2 border-t hairline-gold pt-5 text-[13.5px]">
                <div className="flex justify-between"><dt className="text-espresso/60">Subtotal</dt><dd className="tabular-nums">{formatINR(order.subtotal)}</dd></div>
                {order.discount > 0 ? <div className="flex justify-between text-bronze"><dt>Coupon {order.coupon}</dt><dd className="tabular-nums">−{formatINR(order.discount)}</dd></div> : null}
                <div className="flex justify-between"><dt className="text-espresso/60">Shipping</dt><dd className="tabular-nums">{order.shipping === 0 ? "Complimentary" : formatINR(order.shipping)}</dd></div>
                <div className="flex items-baseline justify-between border-t hairline-gold pt-3">
                  <dt className="font-display text-lg">Total</dt>
                  <dd className="font-display text-2xl tabular-nums">{formatINR(order.total)}</dd>
                </div>
              </dl>
              <p className="mt-5 text-[12.5px] text-espresso/50">
                Delivering to: {order.line1}{order.line2 ? `, ${order.line2}` : ""}, {order.city}, {order.state} — {order.pincode}
              </p>
            </div>
          </Reveal>

          <Reveal delay={340}>
            <div className="mt-8 grid gap-4 text-left sm:grid-cols-2">
              {order.status === "payment_pending" ? (
                <div className="rounded-2xl border hairline-gold bg-cream p-5">
                  <Lock className="h-5 w-5 text-bronze" strokeWidth={1.6} />
                  <p className="font-display mt-3 text-lg text-espresso">Finish payment anytime</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-espresso/60">
                    Your batch hold lasts 24 hours. Cards, UPI, net banking and wallets via Razorpay.
                  </p>
                  <div className="mt-4">
                    <PayNowButton orderNumber={order.orderNumber} />
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-900/15 bg-emerald-900/5 p-5">
                  <CircleCheck className="h-5 w-5 text-emerald-900" strokeWidth={1.6} />
                  <p className="font-display mt-3 text-lg text-espresso">Payment confirmed</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-espresso/60">
                    Verified by Razorpay signature and server-side reconciliation. A receipt was emailed to {order.email}.
                  </p>
                </div>
              )}
              <div className="rounded-2xl border hairline-gold bg-cream p-5">
                <Package className="h-5 w-5 text-bronze" strokeWidth={1.6} />
                <p className="font-display mt-3 text-lg text-espresso">Then straight to dispatch</p>
                <p className="mt-1.5 text-[13px] leading-relaxed text-espresso/60">
                  Once paid, your parcel is insulated, sealed and dispatched within 1–2 business days with tracking.
                </p>
              </div>
            </div>
          </Reveal>
        </>
      ) : (
        <Reveal delay={180}>
          <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-espresso/65">
            Thank you for choosing PARADELLE. If you placed an order, a confirmation is on its way to your inbox.
          </p>
        </Reveal>
      )}

      <Reveal delay={420}>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href="/account" variant="espresso">Track in your account</ButtonLink>
          <Link href="/collection" className="inline-flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-bronze">
            <ArrowRight className="h-4 w-4 rotate-180" strokeWidth={1.8} /> Back to the collection
          </Link>
        </div>
      </Reveal>
    </div>
  );
}
