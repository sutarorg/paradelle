import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { Download, Search } from "lucide-react";
import { db } from "@/db";
import { orders, orderItems } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { EmptyState, Flash, PageHeader, StatusBadge, adminBtnGhost, adminInput, tableClass, tableShell, tdClass, thClass } from "@/components/admin/ui";
import { cn, formatDate, formatINR } from "@/lib/utils";

export const metadata = { title: "Orders" };
export const dynamic = "force-dynamic";

const STATUS_OPTIONS = ["", "payment_pending", "paid", "crafting", "shipped", "delivered", "cancelled"] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; ok?: string; error?: string }> }) {
  await requireAdmin("orders");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const status = sp.status ?? "";

  const where = sql.join(
    [
      q ? sql`(${orders.orderNumber} ilike ${"%" + q + "%"} or ${orders.email} ilike ${"%" + q + "%"} or ${orders.name} ilike ${"%" + q + "%"})` : sql`true`,
      status ? sql`${orders.status} = ${status}` : sql`true`,
    ],
    sql` and `,
  );

  const rows = await db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(100);

  const counts = await db
    .select({ orderId: orderItems.orderId, qty: sql<number>`coalesce(sum(${orderItems.qty}),0)::int` })
    .from(orderItems)
    .groupBy(orderItems.orderId);
  const countMap = new Map(counts.map((c) => [c.orderId, Number(c.qty)]));

  const exportHref = `/admin/api/export/orders${q || status ? `?${new URLSearchParams({ ...(q ? { q } : {}), ...(status ? { status } : {}) })}` : ""}`;

  return (
    <>
      <PageHeader
        title="Orders"
        sub="Reserve → pay → craft → ship → deliver. Payments confirm via Razorpay only — never by hand."
        actions={
          <Link href={exportHref} className={adminBtnGhost}>
            <Download className="h-4 w-4" strokeWidth={1.8} /> Export CSV
          </Link>
        }
      />
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      <form method="get" className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso/40" strokeWidth={1.8} />
          <input name="q" defaultValue={q} placeholder="Order no., customer or email…" className={cn(adminInput, "pl-10")} />
        </div>
        <select name="status" defaultValue={status} className={cn(adminInput, "sm:w-56")} aria-label="Filter by status">
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s ? s.replace(/_/g, " ") : "All statuses"}</option>
          ))}
        </select>
        <button type="submit" className={adminBtnGhost}>Filter</button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="No orders match" text="Adjust the filters — or wait for the first wave of customers." />
      ) : (
        <div className={tableShell}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Order</th>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Items</th>
                <th className={thClass}>Total</th>
                <th className={thClass}>Payment</th>
                <th className={thClass}>Status</th>
                <th className={cn(thClass, "text-right")}> </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const unpaid = o.status === "payment_pending";
                return (
                  <tr key={o.id} className="transition-colors hover:bg-cream/50">
                    <td className={tdClass}>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium text-bronze hover:underline underline-offset-4">{o.orderNumber}</Link>
                      <p className="text-[11px] text-espresso/40">{formatDate(o.createdAt)}</p>
                    </td>
                    <td className={tdClass}>
                      <p className="font-medium text-espresso">{o.name}</p>
                      <p className="text-[11.5px] text-espresso/45">{o.email}</p>
                    </td>
                    <td className={cn(tdClass, "tabular-nums")}>{countMap.get(o.id) ?? 0}</td>
                    <td className={cn(tdClass, "font-medium tabular-nums")}>{formatINR(o.total)}</td>
                    <td className={tdClass}>
                      {o.status === "cancelled" ? <StatusBadge status="cancelled" /> : unpaid ? <StatusBadge status="payment_pending" /> : <StatusBadge status="paid" />}
                      <p className="mt-1 text-[10.5px] text-espresso/40">Razorpay</p>
                    </td>
                    <td className={tdClass}><StatusBadge status={o.status} /></td>
                    <td className={cn(tdClass, "text-right")}>
                      <Link href={`/admin/orders/${o.id}`} className="text-[12px] font-semibold uppercase tracking-[0.12em] text-bronze hover:underline underline-offset-4">Manage</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
