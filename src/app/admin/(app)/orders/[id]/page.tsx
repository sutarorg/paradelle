import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { ArrowLeft, FileText, MapPin, Phone, Mail, CreditCard, Undo2, Truck } from "lucide-react";
import { db } from "@/db";
import { orders, orderItems, refunds } from "@/db/schema";
import { getCatalog } from "@/lib/catalog";
import { getOrderPayments } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin-auth";
import { processRefundAction, requestRefundAction, rejectRefundAction, updateOrderStatusAction, updateTrackingAction } from "@/lib/admin/order-actions";
import { PendingButton } from "@/components/admin/client";
import { AdminField, Flash, PageHeader, StatusBadge, adminBtnGold, adminInput, tableClass, tableShell, tdClass, thClass } from "@/components/admin/ui";
import { cn, formatDate, formatINR } from "@/lib/utils";

export const metadata = { title: "Order detail" };
export const dynamic = "force-dynamic";

const FLOW: Record<string, { to: string; label: string }[]> = {
  payment_pending: [{ to: "cancelled", label: "Cancel order" }],
  paid: [{ to: "crafting", label: "Start crafting" }, { to: "cancelled", label: "Cancel & note refund" }],
  crafting: [{ to: "shipped", label: "Mark shipped" }],
  shipped: [{ to: "delivered", label: "Mark delivered" }],
  delivered: [],
  cancelled: [],
};

export default async function OrderDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("orders");
  const [{ id }, sp] = await Promise.all([params, searchParams]);

  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = rows[0];
  if (!order) notFound();

  const [items, paymentRows, refundRows, catalog] = await Promise.all([
    db.select().from(orderItems).where(eq(orderItems.orderId, order.id)),
    getOrderPayments(order.id),
    db.select().from(refunds).where(eq(refunds.orderId, order.id)).orderBy(desc(refunds.createdAt)),
    getCatalog(),
  ]);
  const imgFor = (slug: string) => catalog.find((c) => c.slug === slug)?.images.front;
  const nextSteps = FLOW[order.status] ?? [];
  const refundable = ["paid", "crafting", "shipped", "delivered"].includes(order.status);

  return (
    <>
      <Link href="/admin/orders" className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-bronze hover:underline underline-offset-4">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} /> All orders
      </Link>

      <div className="mt-4">
        <PageHeader
          title={order.orderNumber}
          sub={`Placed ${formatDate(order.createdAt)} · ${items.reduce((n, i) => n + i.qty, 0)} bars · ${order.paymentProvider}`}
          actions={
            <>
              <StatusBadge status={order.status} />
              <Link href={`/admin/orders/${order.id}/invoice`} className="inline-flex items-center gap-1.5 rounded-full border border-espresso/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-espresso/70 hover:border-bronze hover:text-bronze">
                <FileText className="h-3.5 w-3.5" strokeWidth={1.8} /> Invoice
              </Link>
            </>
          }
        />
      </div>
      <div className="mt-5"><Flash ok={sp.ok} error={sp.error} /></div>

      <div className="grid items-start gap-6 xl:grid-cols-[1.55fr_1fr]">
        {/* ——— Left: items, totals, address ——— */}
        <div className="space-y-6">
          <section className={cn(tableShell, "")}>
            <table className={cn(tableClass, "min-w-[520px]")}>
              <thead>
                <tr><th className={thClass}>Item</th><th className={thClass}>Qty</th><th className={thClass}>Unit</th><th className={cn(thClass, "text-right")}>Line total</th></tr>
              </thead>
              <tbody>
                {items.map((it) => {
                  const img = imgFor(it.slug);
                  return (
                    <tr key={it.id}>
                      <td className={tdClass}>
                        <div className="flex items-center gap-3">
                          {img ? <span className="relative block h-11 w-11 overflow-hidden rounded-lg ring-1 ring-espresso/10"><Image src={img} alt="" fill sizes="44px" className="object-cover" /></span> : null}
                          <span className="font-medium text-espresso">{it.name}</span>
                        </div>
                      </td>
                      <td className={cn(tdClass, "tabular-nums")}>{it.qty}</td>
                      <td className={cn(tdClass, "tabular-nums")}>{formatINR(it.unitPrice)}</td>
                      <td className={cn(tdClass, "text-right tabular-nums")}>{formatINR(it.lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          <section className="rounded-2xl border border-espresso/8 bg-white p-6">
            <dl className="space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-espresso/55">Subtotal</dt><dd className="tabular-nums">{formatINR(order.subtotal)}</dd></div>
              {order.discount > 0 ? <div className="flex justify-between text-bronze"><dt>Coupon {order.coupon}</dt><dd className="tabular-nums">−{formatINR(order.discount)}</dd></div> : null}
              <div className="flex justify-between"><dt className="text-espresso/55">Shipping</dt><dd className="tabular-nums">{order.shipping === 0 ? "Complimentary" : formatINR(order.shipping)}</dd></div>
              <div className="flex items-baseline justify-between border-t border-espresso/10 pt-3"><dt className="font-display text-lg text-espresso">Total</dt><dd className="font-display text-xl tabular-nums text-espresso">{formatINR(order.total)}</dd></div>
            </dl>
            <p className="mt-3 text-[12px] text-espresso/45">All prices are MRP, inclusive of taxes.</p>
          </section>

          <section className="rounded-2xl border border-espresso/8 bg-white p-6">
            <h3 className="font-display flex items-center gap-2 text-lg text-espresso"><MapPin className="h-4.5 w-4.5 text-bronze" strokeWidth={1.7} /> Delivery details</h3>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium text-espresso">{order.name}</p>
                <p className="mt-1 leading-relaxed text-espresso/60">{order.line1}{order.line2 ? `, ${order.line2}` : ""}<br />{order.city}, {order.state} — {order.pincode}</p>
              </div>
              <div className="space-y-1.5 text-espresso/60">
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-bronze" strokeWidth={1.8} /> {order.email}</p>
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-bronze" strokeWidth={1.8} /> {order.phone}</p>
                {order.userId ? <p className="text-[11.5px] text-emerald-900">Registered customer account</p> : <p className="text-[11.5px] text-espresso/40">Guest checkout</p>}
              </div>
            </div>
          </section>
        </div>

        {/* ——— Right: actions ——— */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-espresso/8 bg-white p-6">
            <h3 className="font-display text-lg text-espresso">Fulfilment</h3>
            {order.status === "payment_pending" ? (
              <p className="mt-3 rounded-xl bg-gold/12 px-4 py-3 text-[12.5px] leading-relaxed text-bronze">
                Awaiting payment. Razorpay webhooks (Phase 3) confirm capture automatically — a payment is never marked successful by hand. Once paid, fulfilment unlocks here.
              </p>
            ) : null}
            {nextSteps.length > 0 ? (
              <div className="mt-4 space-y-2.5">
                {nextSteps.map((s) => (
                  <form key={s.to} action={updateOrderStatusAction} className="flex flex-col gap-2">
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="status" value={s.to} />
                    {s.to === "cancelled" ? <input name="reason" placeholder="Reason for cancellation" className={adminInput} required /> : null}
                    <PendingButton className={cn("w-full", s.to === "cancelled" && "border-red-900/30 bg-white text-red-900 hover:bg-red-50 hover:border-red-900/40")}>{s.label}</PendingButton>
                  </form>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-espresso/50">No further transitions — this order is {order.status}.</p>
            )}
          </section>

          <section className="rounded-2xl border border-espresso/8 bg-white p-6">
            <h3 className="font-display flex items-center gap-2 text-lg text-espresso"><Truck className="h-4.5 w-4.5 text-bronze" strokeWidth={1.7} /> Shipping &amp; tracking</h3>
            <form action={updateTrackingAction} className="mt-4 space-y-3">
              <input type="hidden" name="orderId" value={order.id} />
              <AdminField label="Courier partner">
                <select name="provider" defaultValue={order.shippingProvider ?? ""} className={adminInput}>
                  <option value="">Choose…</option>
                  {["Delhivery", "BlueDart", "DTDC", "Ekart", "India Post", "Shadowfax", "Other"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </AdminField>
              <AdminField label="Tracking ID / AWB"><input name="trackingId" defaultValue={order.trackingId ?? ""} className={adminInput} /></AdminField>
              <AdminField label="Tracking URL" hint="optional"><input name="trackingUrl" type="url" defaultValue={order.trackingUrl ?? ""} className={adminInput} placeholder="https://…" /></AdminField>
              <PendingButton className="w-full">Save tracking</PendingButton>
            </form>
          </section>

          <section className="rounded-2xl border border-espresso/8 bg-white p-6">
            <h3 className="font-display flex items-center gap-2 text-lg text-espresso"><CreditCard className="h-4.5 w-4.5 text-bronze" strokeWidth={1.7} /> Payment history</h3>
            {paymentRows.length === 0 ? (
              <p className="mt-3 text-[13px] leading-relaxed text-espresso/55">
                No gateway events yet. When Razorpay goes live (Phase 3), every attempt — created, captured, failed — is recorded here with its signature verification result.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {paymentRows.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-espresso/8 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-espresso">{formatINR(p.amount)} · <span className="uppercase">{p.method ?? p.provider}</span></p>
                      <p className="text-[11px] text-espresso/45">{formatDate(p.createdAt)}{p.razorpayPaymentId ? ` · ${p.razorpayPaymentId}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={p.status} />
                      <StatusBadge status={p.verified ? "verified" : "unverified"} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-espresso/8 bg-white p-6">
            <h3 className="font-display flex items-center gap-2 text-lg text-espresso"><Undo2 className="h-4.5 w-4.5 text-bronze" strokeWidth={1.7} /> Refunds</h3>
            {refundRows.length === 0 ? <p className="mt-3 text-[13px] text-espresso/55">No refunds requested on this order.</p> : (
              <ul className="mt-4 space-y-3">
                {refundRows.map((r) => (
                  <li key={r.id} className="rounded-xl border border-espresso/8 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium tabular-nums text-espresso">{formatINR(r.amount)}</p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-[12px] text-espresso/55">{r.reason}</p>
                    {r.status === "requested" ? (
                      <div className="mt-2.5 flex flex-wrap gap-2">
                        <form action={processRefundAction}>
                          <input type="hidden" name="refundId" value={r.id} /><input type="hidden" name="orderId" value={order.id} />
                          <PendingButton className={adminBtnGold} confirm={`Refund ${formatINR(r.amount)} via Razorpay to the original payment method?`}>Process at gateway</PendingButton>
                        </form>
                        <form action={rejectRefundAction}>
                          <input type="hidden" name="refundId" value={r.id} /><input type="hidden" name="orderId" value={order.id} />
                          <PendingButton className="border-red-900/25 bg-white text-red-900 hover:bg-red-50 hover:border-red-900/40">Reject request</PendingButton>
                        </form>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
            <form action={requestRefundAction} className="mt-5 space-y-3 border-t border-espresso/8 pt-4">
              <input type="hidden" name="orderId" value={order.id} />
              <div className="grid grid-cols-2 gap-3">
                <AdminField label="Amount (₹)"><input name="amount" type="number" min={1} max={order.total} defaultValue={order.total} className={adminInput} /></AdminField>
                <AdminField label="Reason"><input name="reason" className={adminInput} placeholder="Melted in transit…" /></AdminField>
              </div>
              <PendingButton className="w-full" confirm="Record this refund request?">
                Record refund request
              </PendingButton>
              {!refundable ? <p className="text-[12px] text-espresso/45">Refunds apply once an order is paid.</p> : <p className="text-[12px] text-espresso/45">Requests queue for processing at the Razorpay gateway (Phase 3) — never marked paid back manually.</p>}
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
