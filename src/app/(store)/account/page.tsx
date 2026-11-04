import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import Link from "next/link";
import { desc, eq, or } from "drizzle-orm";
import { LogOut, Package, ShoppingBag, CircleCheck, CreditCard, Flame, Truck, Home, MapPin, Star, Trash2, Plus } from "lucide-react";
import { db } from "@/db";
import { addresses, orders, orderItems } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { deleteAddressAction, logoutAction, saveAddressAction, setDefaultAddressAction } from "@/lib/actions";
import { Field, inputClass } from "@/components/ui";
import { getCatalog } from "@/lib/catalog";
import { formatINR, formatDate, cn } from "@/lib/utils";
import { Kicker, ButtonLink } from "@/components/ui";
import { Reveal } from "@/components/reveal";

export const metadata: Metadata = { title: "Your Account" };
export const dynamic = "force-dynamic";

const STATUS_STEPS = [
  { key: "payment_pending", label: "Reserved", icon: CreditCard },
  { key: "paid", label: "Paid", icon: CircleCheck },
  { key: "crafting", label: "Crafting", icon: Flame },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "delivered", label: "Delivered", icon: Home },
] as const;

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const sp = await searchParams;

  const catalog = await getCatalog();
  const bySlug = (slug: string) => catalog.find((c) => c.slug === slug);
  const savedAddresses = await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault));

  const rows = await db
    .select()
    .from(orders)
    .where(or(eq(orders.userId, user.id), eq(orders.email, user.email)))
    .orderBy(desc(orders.createdAt));

  const itemsByOrder = new Map<string, (typeof orderItems.$inferSelect)[]>();
  for (const o of rows) {
    itemsByOrder.set(o.id, await db.select().from(orderItems).where(eq(orderItems.orderId, o.id)));
  }

  return (
    <div className="mx-auto max-w-5xl px-4 pb-24 pt-14 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <Reveal>
          <div>
            <Kicker>Your account</Kicker>
            <h1 className="font-display mt-3 text-4xl text-espresso lg:text-5xl">
              Good to see you, <span className="text-gilt">{user.name.split(" ")[0]}.</span>
            </h1>
            <p className="mt-2 text-sm text-espresso/55">{user.email}</p>
          </div>
        </Reveal>
        <form action={logoutAction}>
          <button type="submit" className="inline-flex items-center gap-2 rounded-full border border-espresso/20 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[0.18em] text-espresso/70 transition-colors hover:border-plum hover:text-plum">
            <LogOut className="h-4 w-4" strokeWidth={1.7} /> Sign out
          </button>
        </form>
      </div>

      <div className="mt-12">
        <Reveal>
          <h2 className="font-display flex items-center gap-3 text-2xl text-espresso">
            <Package className="h-5 w-5 text-bronze" strokeWidth={1.7} /> Orders &amp; tracking
          </h2>
        </Reveal>

        {rows.length === 0 ? (
          <Reveal delay={100}>
            <div className="mt-6 flex flex-col items-center rounded-3xl border hairline-gold bg-cream px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-plum text-gold">
                <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
              </span>
              <p className="font-display mt-5 text-2xl text-espresso">No orders yet</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-espresso/60">Your first box of gold-detailed sleeves is four clicks away.</p>
              <ButtonLink href="/collection" className="mt-7">Explore the collection</ButtonLink>
            </div>
          </Reveal>
        ) : (
          <ul className="mt-6 space-y-6">
            {rows.map((o, idx) => {
              const items = itemsByOrder.get(o.id) ?? [];
              const activeIdx = Math.max(0, STATUS_STEPS.findIndex((s) => s.key === o.status));
              return (
                <Reveal key={o.id} delay={Math.min(idx * 70, 210)}>
                  <li className="overflow-hidden rounded-3xl border hairline-gold bg-ivory">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b hairline-gold bg-cream px-6 py-4 sm:px-8">
                      <div>
                        <p className="font-display text-lg text-espresso">{o.orderNumber}</p>
                        <p className="text-[11px] uppercase tracking-[0.18em] text-espresso/45">{formatDate(o.createdAt)} &middot; {items.reduce((n, i) => n + i.qty, 0)} bars</p>
                      </div>
                      <p className="font-display text-xl text-espresso">{formatINR(o.total)}</p>
                    </div>

                    <div className="px-6 py-6 sm:px-8">
                      {/* Tracking timeline */}
                      <ol className="flex items-center">
                        {STATUS_STEPS.map((s, i) => {
                          const reached = i <= activeIdx;
                          return (
                            <li key={s.key} className="relative flex flex-1 flex-col items-center">
                              {i < STATUS_STEPS.length - 1 ? (
                                <span className={cn("absolute left-1/2 top-[13px] h-px w-full", i < activeIdx ? "bg-bronze" : "bg-espresso/12")} aria-hidden />
                              ) : null}
                              <span className={cn("z-10 flex h-7 w-7 items-center justify-center rounded-full border", reached ? "border-bronze bg-plum text-gold" : "border-espresso/15 bg-ivory text-espresso/30")}>
                                <s.icon className="h-3.5 w-3.5" strokeWidth={1.8} />
                              </span>
                              <span className={cn("mt-2 text-[9px] font-semibold uppercase tracking-[0.14em] sm:text-[10px]", reached ? "text-espresso" : "text-espresso/35")}>
                                {s.label}
                              </span>
                            </li>
                          );
                        })}
                      </ol>
                      {o.status === "payment_pending" ? (
                        <p className="mt-5 rounded-xl bg-gold/10 px-4 py-3 text-[12.5px] leading-relaxed text-espresso/65">
                          This order is <span className="font-semibold text-espresso">reserved</span> — a secure Razorpay payment link will arrive by email when live payment capture launches. Nothing is charged yet.
                        </p>
                      ) : null}

                      <ul className="mt-6 flex flex-wrap gap-3">
                        {items.map((it) => {
                          const p = bySlug(it.slug);
                          return (
                            <li key={it.id} className="flex items-center gap-2.5 rounded-full border border-espresso/10 bg-cream py-1.5 pl-1.5 pr-4">
                              {p ? (
                                <span className="relative block h-9 w-9 overflow-hidden rounded-full ring-1 ring-espresso/10">
                                  <Image src={p.images.front} alt={p.name} fill sizes="36px" className="object-cover" />
                                </span>
                              ) : null}
                              <span className="text-[12.5px] text-espresso/75">
                                {it.name} <span className="text-espresso/40">&times; {it.qty}</span>
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </li>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>

      {sp.ok || sp.error ? (
        <p className={cn("mt-10 rounded-xl px-4 py-3 text-sm", sp.ok ? "bg-gold/10 text-espresso" : "bg-red-50 text-red-800")}>{sp.ok ?? sp.error}</p>
      ) : null}

      {/* Address book */}
      <div className="mt-12">
        <Reveal>
          <h2 className="font-display flex items-center gap-3 text-2xl text-espresso">
            <MapPin className="h-5 w-5 text-bronze" strokeWidth={1.7} /> Address book
          </h2>
        </Reveal>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {savedAddresses.map((a) => (
            <div key={a.id} className={cn("rounded-2xl border p-5", a.isDefault ? "border-gold/50 bg-cream" : "border-espresso/10 bg-ivory")}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-bronze">{a.label}</p>
                {a.isDefault ? <span className="flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-bronze"><Star className="h-3 w-3 fill-bronze" /> Default</span> : null}
              </div>
              <p className="mt-3 text-sm font-medium text-espresso">{a.name}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-espresso/60">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} — {a.pincode}</p>
              <p className="mt-1 text-[12px] text-espresso/45">{a.phone}</p>
              <div className="mt-4 flex gap-2">
                {!a.isDefault ? (
                  <form action={setDefaultAddressAction}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="rounded-full border border-espresso/15 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-espresso/60 hover:border-gold hover:text-bronze">Make default</button>
                  </form>
                ) : null}
                <form action={deleteAddressAction}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className="inline-flex items-center gap-1.5 rounded-full border border-red-900/20 px-3.5 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-red-800 hover:bg-red-50">
                    <Trash2 className="h-3 w-3" strokeWidth={1.8} /> Remove
                  </button>
                </form>
              </div>
            </div>
          ))}

          <details className="group rounded-2xl border border-dashed border-espresso/20 bg-cream/60">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 p-5 text-[12px] font-semibold uppercase tracking-[0.16em] text-bronze marker:hidden [&::-webkit-details-marker]:hidden">
              <span className="rounded-full border border-espresso/15 p-1.5 transition-transform duration-300 group-open:rotate-45"><Plus className="h-3.5 w-3.5" strokeWidth={2} /></span>
              Add a new address
            </summary>
            <form action={saveAddressAction} className="grid gap-3 px-5 pb-5">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Label"><input name="label" defaultValue="Home" className={inputClass} /></Field>
                <Field label="Full name"><input name="name" required className={inputClass} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Phone"><input name="phone" required minLength={10} className={inputClass} /></Field>
                <Field label="PIN"><input name="pincode" required pattern="\d{6}" className={inputClass} /></Field>
              </div>
              <Field label="Address"><input name="line1" required className={inputClass} placeholder="Flat / house, street" /></Field>
              <Field label="Line 2"><input name="line2" className={inputClass} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City"><input name="city" required className={inputClass} /></Field>
                <Field label="State"><input name="state" required className={inputClass} /></Field>
              </div>
              <label className="flex items-center gap-2.5 text-[13px] text-espresso/70"><input type="checkbox" name="isDefault" className="h-4 w-4 accent-[#795038]" /> Make default</label>
              <button type="submit" className="justify-self-start rounded-full bg-espresso px-6 py-3 text-[12px] font-semibold uppercase tracking-[0.16em] text-ivory hover:bg-plum">Save address</button>
            </form>
          </details>
        </div>
      </div>

      <Reveal delay={120}>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border hairline-gold bg-cream px-6 py-5">
          <p className="text-[13px] text-espresso/60">Questions about an order? Quote the order number and we&rsquo;ll help immediately.</p>
          <Link href="/contact" className="text-[12px] font-semibold uppercase tracking-[0.2em] text-bronze underline-offset-4 hover:underline">Contact the atelier</Link>
        </div>
      </Reveal>
    </div>
  );
}
