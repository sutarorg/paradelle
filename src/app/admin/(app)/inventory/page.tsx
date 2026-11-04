import Image from "next/image";
import { Boxes, History } from "lucide-react";
import { getAdminCatalog, getReservedByProduct, getSoldByProduct } from "@/lib/catalog";
import { getStockMovements } from "@/lib/admin/queries";
import { adjustStockAction } from "@/lib/admin/catalog-actions";
import { requireAdmin } from "@/lib/admin-auth";
import { PendingButton } from "@/components/admin/client";
import { AdminField, Flash, PageHeader, adminInput, tableClass, tableShell, tdClass, thClass } from "@/components/admin/ui";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("inventory");
  const sp = await searchParams;
  const [catalog, reserved, sold, movements] = await Promise.all([
    getAdminCatalog(),
    getReservedByProduct(),
    getSoldByProduct(),
    getStockMovements(),
  ]);

  return (
    <>
      <PageHeader title="Inventory" sub="On-hand stock, reservations from unpaid orders, sold counts and every adjustment — with reasons." />
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-4">
        {catalog.map((p) => {
          const r = reserved[p.slug] ?? 0;
          const available = Math.max(0, p.stock - r);
          const s = sold[p.slug] ?? 0;
          const low = available <= p.lowStockThreshold;
          const out = available === 0;
          return (
            <div key={p.id} className="rounded-2xl border border-espresso/8 bg-white p-5">
              <div className="flex items-center gap-3">
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-espresso/10">
                  <Image src={p.images.front} alt={p.name} fill sizes="48px" className="object-cover" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-espresso">{p.shortName}</p>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-espresso/45">{p.sku}</p>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                {[
                  [available, "available"],
                  [r, "reserved"],
                  [s, "sold"],
                ].map(([v, l]) => (
                  <div key={l as string} className="rounded-xl bg-cream px-2 py-2.5">
                    <dt className="sr-only">{l}</dt>
                    <dd className={`font-display text-xl tabular-nums ${out ? "text-red-900" : low && l === "available" ? "text-bronze" : "text-espresso"}`}>{v}</dd>
                    <dd className="text-[10px] font-semibold uppercase tracking-[0.12em] text-espresso/45">{l}</dd>
                  </div>
                ))}
              </dl>

              {out ? (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[12px] font-medium text-red-900">Out of stock — checkout is paused for this bar.</p>
              ) : low ? (
                <p className="mt-3 rounded-lg bg-gold/15 px-3 py-2 text-[12px] font-medium text-bronze">Low stock — alert at {p.lowStockThreshold}.</p>
              ) : null}

              <form action={adjustStockAction} className="mt-4 space-y-2.5 border-t border-espresso/8 pt-4">
                <input type="hidden" name="productId" value={p.id} />
                <div className="grid grid-cols-2 gap-2">
                  <AdminField label="Adjust by"><input name="delta" type="number" required className={adminInput} placeholder="+24 / −6" /></AdminField>
                  <AdminField label="Reason">
                    <select name="reason" required className={adminInput}>
                      <option value="receipt">New batch</option>
                      <option value="correction">Count correction</option>
                      <option value="damage">Damage / melt loss</option>
                      <option value="sample">Samples / gifting</option>
                      <option value="other">Other</option>
                    </select>
                  </AdminField>
                </div>
                <input name="note" placeholder="Note (optional)" className={adminInput} />
                <PendingButton className="w-full">Apply adjustment</PendingButton>
              </form>
            </div>
          );
        })}
      </div>

      <section className="mt-10">
        <h2 className="font-display mb-4 flex items-center gap-2.5 text-xl text-espresso">
          <History className="h-5 w-5 text-bronze" strokeWidth={1.7} /> Movement history
        </h2>
        <div className={tableShell}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>When</th>
                <th className={thClass}>Product</th>
                <th className={thClass}>Change</th>
                <th className={thClass}>Reason</th>
                <th className={thClass}>Note</th>
              </tr>
            </thead>
            <tbody>
              {movements.length === 0 ? (
                <tr><td className={tdClass} colSpan={5}>No movements yet — the first receipt or adjustment appears here.</td></tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id} className="hover:bg-cream/50">
                    <td className={tdClass}>{formatDate(m.createdAt)}</td>
                    <td className={tdClass}>{m.productName}</td>
                    <td className={cn(tdClass, "font-medium tabular-nums", m.delta > 0 ? "text-emerald-900" : "text-red-900")}>{m.delta > 0 ? `+${m.delta}` : m.delta}</td>
                    <td className={cn(tdClass, "capitalize")}>{m.reason}</td>
                    <td className={cn(tdClass, "text-espresso/55")}>{m.note ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
