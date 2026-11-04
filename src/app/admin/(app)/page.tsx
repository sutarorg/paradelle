import Link from "next/link";
import { IndianRupee, ShoppingCart, Hourglass, Users, ArrowRight, PackageSearch } from "lucide-react";
import { getDashboard, rangeLabel } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/admin-auth";
import { SalesChart } from "@/components/admin/sales-chart";
import { Flash, PageHeader, StatCard, StatusBadge, tableClass, tdClass, thClass } from "@/components/admin/ui";
import { cn, formatDate, formatINR } from "@/lib/utils";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "7", label: "7 days" },
  { key: "30", label: "30 days" },
  { key: "90", label: "90 days" },
  { key: "all", label: "All time" },
];

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ range?: string; denied?: string }> }) {
  await requireAdmin();
  const { range = "30", denied } = await searchParams;
  const data = await getDashboard(range);

  return (
    <>
      {denied ? <Flash error={`Your role does not include access to “${denied}”. Ask a Super Admin to grant it.`} /> : null}
      <PageHeader
        title="Atelier overview"
        sub={`Real figures only — orders, revenue and stock straight from the database. ${rangeLabel(range)}.`}
        actions={
          <nav aria-label="Date range" className="flex rounded-full border border-espresso/15 bg-white p-1">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/admin?range=${r.key}`}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.1em] transition-colors",
                  range === r.key ? "bg-espresso text-ivory" : "text-espresso/55 hover:text-espresso",
                )}
              >
                {r.label}
              </Link>
            ))}
          </nav>
        }
      />

      <div className="mt-7 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Revenue" value={formatINR(data.revenue)} hint="paid orders only" icon={IndianRupee} />
        <StatCard label="Paid orders" value={String(data.paidOrders)} hint="confirmed payments" icon={ShoppingCart} />
        <StatCard label="Pending" value={String(data.pendingOrders)} hint="awaiting payment" icon={Hourglass} />
        <StatCard label="Customers" value={String(data.customers)} hint="unique order emails" icon={Users} />
        <StatCard label="Avg. order" value={formatINR(data.aov)} hint={rangeLabel(range)} icon={IndianRupee} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
        <section>
          <h2 className="font-display mb-3 text-lg text-espresso">Revenue by day (₹, paid orders)</h2>
          <SalesChart points={data.series} />
        </section>

        <section className="rounded-2xl border border-espresso/8 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-espresso">Best sellers</h2>
            <Link href="/admin/reports" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bronze hover:underline underline-offset-4">Reports</Link>
          </div>
          {data.bestSellers.length === 0 ? (
            <p className="mt-4 text-[13px] text-espresso/50">Best sellers appear once paid orders come in.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {data.bestSellers.map((b, i) => {
                const maxQty = data.bestSellers[0].qty || 1;
                return (
                  <li key={b.slug}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <p className="text-espresso"><span className="mr-2 font-display text-espresso/40">{i + 1}.</span>{b.name}</p>
                      <p className="tabular-nums text-espresso/60">{b.qty} bars · {formatINR(b.revenue)}</p>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-espresso/8">
                      <div className="h-full rounded-full bg-gradient-to-r from-bronze to-gold" style={{ width: `${(b.qty / maxQty) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-espresso/8 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display flex items-center gap-2 text-lg text-espresso">
              <PackageSearch className="h-4.5 w-4.5 text-bronze" strokeWidth={1.7} /> Low-stock alerts
            </h2>
            <Link href="/admin/inventory" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bronze hover:underline underline-offset-4">Inventory</Link>
          </div>
          {data.lowStock.length === 0 ? (
            <p className="mt-4 text-[13px] text-emerald-900">All products are comfortably stocked.</p>
          ) : (
            <ul className="mt-4 divide-y divide-espresso/8">
              {data.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <Link href={`/admin/products/${p.id}`} className="text-sm font-medium text-espresso hover:text-bronze">{p.name}</Link>
                    <p className="text-[12px] text-espresso/50">{p.available} available · {p.reserved} reserved · alert at {p.threshold}</p>
                  </div>
                  <Link href="/admin/inventory" className="inline-flex items-center gap-1 rounded-full border border-espresso/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-espresso/70 hover:border-bronze hover:text-bronze">
                    Restock <ArrowRight className="h-3 w-3" strokeWidth={2} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-espresso/8 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-espresso">Recent orders</h2>
            <Link href="/admin/orders" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-bronze hover:underline underline-offset-4">View all</Link>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="mt-4 text-[13px] text-espresso/50">Orders arrive here the moment customers reserve them.</p>
          ) : (
            <div className="-mx-5 mt-3 overflow-x-auto px-5">
              <table className={cn(tableClass, "min-w-[520px]")}>
                <thead>
                  <tr>
                    <th className={thClass}>Order</th>
                    <th className={thClass}>Customer</th>
                    <th className={thClass}>Total</th>
                    <th className={thClass}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((o) => (
                    <tr key={o.id} className="transition-colors hover:bg-cream/50">
                      <td className={tdClass}>
                        <Link href={`/admin/orders/${o.id}`} className="font-medium text-bronze hover:underline underline-offset-4">{o.orderNumber}</Link>
                        <p className="text-[11px] text-espresso/40">{formatDate(o.createdAt)}</p>
                      </td>
                      <td className={tdClass}>{o.name}</td>
                      <td className={cn(tdClass, "tabular-nums")}>{formatINR(o.total)}</td>
                      <td className={tdClass}><StatusBadge status={o.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
