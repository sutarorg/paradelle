import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { PrintButton } from "@/components/admin/client";
import { formatDate, formatINR } from "@/lib/utils";

export const metadata = { title: "Invoice" };
export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("orders");
  const { id } = await params;
  const rows = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = rows[0];
  if (!order) notFound();
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link href={`/admin/orders/${order.id}`} className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-bronze hover:underline underline-offset-4">
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} /> Back to order
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-2xl border border-espresso/10 bg-white p-8 sm:p-12 print:rounded-none print:border-0">
        <header className="flex items-start justify-between border-b-2 border-espresso pb-8">
          <div className="flex items-center gap-4">
            <span className="relative block h-14 w-14 overflow-hidden rounded-full">
              <Image src="/images/logo.png" alt="" fill sizes="56px" className="object-cover" />
            </span>
            <div>
              <p className="font-display text-2xl tracking-[0.14em] text-espresso">PARADELLE</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.34em] text-bronze">Chocolates</p>
            </div>
          </div>
          <div className="text-right text-[12px] leading-relaxed text-espresso/55">
            <p className="font-display text-lg text-espresso">Tax Invoice</p>
            <p>{order.orderNumber}</p>
            <p>{formatDate(order.createdAt)}</p>
          </div>
        </header>

        <div className="grid gap-6 border-b border-espresso/10 py-7 text-[13px] sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-espresso/45">Billed &amp; shipped to</p>
            <p className="mt-2 font-medium text-espresso">{order.name}</p>
            <p className="mt-1 leading-relaxed text-espresso/60">{order.line1}{order.line2 ? `, ${order.line2}` : ""}, {order.city}, {order.state} — {order.pincode}</p>
            <p className="mt-1 text-espresso/60">{order.email} · {order.phone}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-espresso/45">From</p>
            <p className="mt-2 font-medium text-espresso">PARADELLE CHOCOLATES</p>
            <p className="mt-1 leading-relaxed text-espresso/60">The Atelier, Mumbai, India<br />hello@paradelle.store · paradelle.store</p>
          </div>
        </div>

        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b-2 border-espresso text-left">
              <th className="py-3 pr-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-espresso/55">Item</th>
              <th className="py-3 pr-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-espresso/55">Qty</th>
              <th className="py-3 pr-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-espresso/55">Rate (MRP)</th>
              <th className="py-3 text-right text-[10.5px] font-semibold uppercase tracking-[0.16em] text-espresso/55">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-espresso/8">
                <td className="py-3 pr-3 font-medium text-espresso">{it.name}</td>
                <td className="py-3 pr-3 tabular-nums text-espresso/70">{it.qty}</td>
                <td className="py-3 pr-3 tabular-nums text-espresso/70">{formatINR(it.unitPrice)}</td>
                <td className="py-3 text-right tabular-nums text-espresso">{formatINR(it.lineTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ml-auto mt-5 max-w-xs space-y-2 text-[13px]">
          <div className="flex justify-between"><dt className="text-espresso/55">Subtotal</dt><dd className="tabular-nums">{formatINR(order.subtotal)}</dd></div>
          {order.discount > 0 ? <div className="flex justify-between text-bronze"><dt>Coupon {order.coupon}</dt><dd className="tabular-nums">−{formatINR(order.discount)}</dd></div> : null}
          <div className="flex justify-between"><dt className="text-espresso/55">Shipping</dt><dd className="tabular-nums">{order.shipping === 0 ? "Complimentary" : formatINR(order.shipping)}</dd></div>
          <div className="flex justify-between border-t-2 border-espresso pt-2.5"><dt className="font-display text-base text-espresso">Grand total</dt><dd className="font-display text-lg tabular-nums text-espresso">{formatINR(order.total)}</dd></div>
        </dl>

        <footer className="mt-10 border-t border-espresso/10 pt-6 text-[11.5px] leading-relaxed text-espresso/50">
          <p>All amounts are MRP in INR, inclusive of applicable taxes. Payment: Razorpay (prepaid only).</p>
          <p className="mt-1">Chocolate is a perishable food product — see paradelle.store/legal/refunds for remedies. This is a system-generated invoice.</p>
          <p className="font-display mt-4 text-sm italic text-bronze">Crafted for true indulgence.</p>
        </footer>
      </div>
    </div>
  );
}
