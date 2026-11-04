import Link from "next/link";
import { inArray, sql } from "drizzle-orm";
import { Download, TrendingUp } from "lucide-react";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { getDashboard, rangeLabel, PAID_STATUSES } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin-auth";
import { SalesChart } from "@/components/admin/sales-chart";
import { PageHeader, StatCard, tableClass, tableShell, tdClass, thClass } from "@/components/admin/ui";
import { cn, formatINR } from "@/lib/utils";

export const metadata = { title: "Reports & exports" };
export const dynamic = "force-dynamic";

const EXPORTS = [
  { kind: "orders", label: "Orders", note: "with courier + tracking fields" },
  { kind: "order-items", label: "Order line items", note: "per-bar quantities and prices" },
  { kind: "customers", label: "Customers", note: "aggregated lifetime value" },
  { kind: "accounts", label: "Registered accounts", note: "email + join date" },
  { kind: "products", label: "Products", note: "price, MRP, stock, status" },
  { kind: "stock", label: "Stock movements", note: "every adjustment with reason" },
  { kind: "payments", label: "Payments", note: "gateway events & verification flags" },
  { kind: "refunds", label: "Refunds", note: "requests and outcomes" },
  { kind: "coupons", label: "Coupons", note: "rules and usage" },
] as const;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  await requireAdmin("reports");
  const { range = "30" } = await searchParams;
  const data = await getDashboard(range);

  const statusRows = await db
    .select({ status: orders.status, count: sql<number>`count(*)::int` })
    .from(orders)
    .groupBy(orders.status);

  const collected = await db
    .select({ v: sql<number>`coalesce(sum(${orders.total}),0)::int` })
    .from(orders)
    .where(inArray(orders.status, [...PAID_STATUSES]));

  return (
    <>
      <PageHeader title="Reports &amp; exports" sub={`Everything below is computed from live tables. Window: ${rangeLabel(range)}.`} />

      <div className="mt-7 flex rounded-full border border-espresso/15 bg-white p-1 sm:w-fit">
        {["7", "30", "90", "all"].map((r) => (
          <Link key={r} href={`/admin/reports?range=${r}`} className={cn("rounded-full px-4 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em]", range === r ? "bg-espresso text-ivory" : "text-espresso/55 hover:text-espresso")}>
            {r === "all" ? "All" : `${r}d`}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Collected revenue" value={formatINR(Number(collected[0]?.v ?? 0))} hint="all-time, paid orders" icon={TrendingUp} />
        <StatCard label={`Revenue — ${rangeLabel(range).toLowerCase()}`} value={formatINR(data.revenue)} hint="paid orders" />
        <StatCard label="Average order value" value={formatINR(data.aov)} hint={rangeLabel(range)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <SalesChart points={data.series} />
        <div className={tableShell}>
          <table className={cn(tableClass, "min-w-[380px]")}>
            <thead><tr><th className={thClass}>Order status</th><th className={cn(thClass, "text-right")}>Count</th></tr></thead>
            <tbody>
              {statusRows.length === 0 ? (
                <tr><td className={tdClass} colSpan={2}>No orders yet.</td></tr>
              ) : (
                statusRows.map((r) => (
                  <tr key={r.status}>
                    <td className={cn(tdClass, "capitalize")}>{r.status.replace(/_/g, " ")}</td>
                    <td className={cn(tdClass, "text-right tabular-nums")}>{r.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="font-display mb-4 flex items-center gap-2.5 text-xl text-espresso"><Download className="h-5 w-5 text-bronze" strokeWidth={1.7} /> CSV exports</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EXPORTS.map((e) => (
            <Link key={e.kind} href={`/admin/api/export/${e.kind}`} className="group rounded-2xl border border-espresso/8 bg-white p-5 transition-colors hover:border-bronze/40">
              <p className="flex items-center justify-between font-medium text-espresso">
                {e.label}
                <Download className="h-4 w-4 text-espresso/35 transition-colors group-hover:text-bronze" strokeWidth={1.8} />
              </p>
              <p className="mt-1 text-[12px] text-espresso/50">{e.note}</p>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-[12px] text-espresso/45">Exports respect the session — they download only for signed-in staff and are logged implicitly by access logs.</p>
      </section>
    </>
  );
}
