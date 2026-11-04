import Link from "next/link";
import { Download, Search, Users, UserRound } from "lucide-react";
import { getCustomers, getRegisteredCount, getRegisteredUsers } from "@/lib/admin/queries";
import { db } from "@/db";
import { contactMessages, newsletterSubscribers } from "@/db/schema";
import { desc, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/admin-auth";
import { EmptyState, PageHeader, adminBtnGhost, adminInput, tableClass, tableShell, tdClass, thClass } from "@/components/admin/ui";
import { cn, formatDate, formatINR } from "@/lib/utils";

export const metadata = { title: "Customers" };
export const dynamic = "force-dynamic";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin("customers");
  const { q } = await searchParams;
  const [customers, registeredCount, registered, subs, messages] = await Promise.all([
    getCustomers(q),
    getRegisteredCount(),
    getRegisteredUsers(q),
    db.select({ count: sql<number>`count(*)::int` }).from(newsletterSubscribers),
    db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(10),
  ]);

  return (
    <>
      <PageHeader
        title="Customers"
        sub="Built only from real orders and registrations — no lists bought, no profiles invented."
        actions={<Link href="/admin/api/export/customers" className={adminBtnGhost}><Download className="h-4 w-4" strokeWidth={1.8} /> Export CSV</Link>}
      />

      <div className="mt-6 grid grid-cols-3 gap-4">
        {[
          [customers.length, "ordering customers"],
          [registeredCount, "registered accounts"],
          [Number(subs[0]?.count ?? 0), "newsletter subscribers"],
        ].map(([v, l]) => (
          <div key={l as string} className="rounded-2xl border border-espresso/8 bg-white p-5 text-center">
            <p className="font-display text-2xl tabular-nums text-espresso">{v}</p>
            <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-espresso/45">{l}</p>
          </div>
        ))}
      </div>

      <form method="get" className="mt-6 flex gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-espresso/40" strokeWidth={1.8} />
          <input name="q" defaultValue={q} placeholder="Search name or email…" className={cn(adminInput, "pl-10")} />
        </div>
        <button type="submit" className={adminBtnGhost}>Search</button>
      </form>

      <section className="mt-6">
        <h2 className="font-display mb-3 flex items-center gap-2 text-lg text-espresso"><Users className="h-4.5 w-4.5 text-bronze" strokeWidth={1.7} /> Ordering customers</h2>
        {customers.length === 0 ? (
          <EmptyState title="No customers yet" text="The moment the first order lands, its customer appears here." />
        ) : (
          <div className={tableShell}>
            <table className={tableClass}>
              <thead>
                <tr><th className={thClass}>Customer</th><th className={thClass}>City</th><th className={thClass}>Orders</th><th className={thClass}>Lifetime value (paid)</th><th className={thClass}>Last order</th></tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.email} className="hover:bg-cream/50">
                    <td className={tdClass}><p className="font-medium text-espresso">{c.name}</p><p className="text-[11.5px] text-espresso/45">{c.email}</p></td>
                    <td className={tdClass}>{c.city}</td>
                    <td className={cn(tdClass, "tabular-nums")}>{c.ordersCount}</td>
                    <td className={cn(tdClass, "font-medium tabular-nums")}>{formatINR(c.spend)}</td>
                    <td className={cn(tdClass, "text-espresso/55")}>{formatDate(c.lastOrder)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {messages.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display mb-3 text-lg text-espresso">Latest contact notes</h2>
          <ul className="space-y-3">
            {messages.map((m) => (
              <li key={m.id} className="rounded-2xl border border-espresso/8 bg-white p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-espresso">{m.name} <span className="text-espresso/45">· {m.email}</span></p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-espresso/40">{formatDate(m.createdAt)}</p>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-espresso/70">{m.message}</p>
                <a href={`mailto:${m.email}`} className="mt-2 inline-block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-bronze hover:underline underline-offset-4">Reply by email</a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {registered.length > 0 ? (
        <section className="mt-10">
          <h2 className="font-display mb-3 flex items-center gap-2 text-lg text-espresso"><UserRound className="h-4.5 w-4.5 text-bronze" strokeWidth={1.7} /> Registered accounts</h2>
          <div className={tableShell}>
            <table className={tableClass}>
              <thead><tr><th className={thClass}>Name</th><th className={thClass}>Email</th><th className={thClass}>Joined</th></tr></thead>
              <tbody>
                {registered.map((u) => (
                  <tr key={u.id} className="hover:bg-cream/50">
                    <td className={cn(tdClass, "font-medium text-espresso")}>{u.name}</td>
                    <td className={tdClass}>{u.email}</td>
                    <td className={cn(tdClass, "text-espresso/55")}>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </>
  );
}
