import { desc } from "drizzle-orm";
import { Tag } from "lucide-react";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteCouponAction, saveCouponAction, toggleCouponAction } from "@/lib/admin/actions-core";
import { DeleteButton, PendingButton } from "@/components/admin/client";
import { AdminField, EmptyState, Flash, PageHeader, StatusBadge, adminBtnGhost, adminInput, tableClass, tableShell, tdClass, thClass } from "@/components/admin/ui";
import { cn, formatDate, formatINR } from "@/lib/utils";

export const metadata = { title: "Coupons" };
export const dynamic = "force-dynamic";

export default async function CouponsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("marketing");
  const sp = await searchParams;
  const rows = await db.select().from(coupons).orderBy(desc(coupons.createdAt));

  return (
    <>
      <PageHeader title="Coupons" sub="Honest promotions only: real percentages, visible caps, expiry dates. No fake urgency." />
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px]">
        {rows.length === 0 ? (
          <EmptyState icon={Tag} title="No coupons yet" text="Create the first one — WELCOME10 for new customers is a gentle classic." />
        ) : (
          <div className={tableShell}>
            <table className={tableClass}>
              <thead>
                <tr><th className={thClass}>Code</th><th className={thClass}>Offer</th><th className={thClass}>Rules</th><th className={thClass}>Used</th><th className={thClass}>Status</th><th className={cn(thClass, "text-right")}> </th></tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.code} className="hover:bg-cream/50">
                    <td className={tdClass}><span className="rounded-md bg-cream px-2.5 py-1 font-mono text-[12.5px] font-semibold text-espresso">{c.code}</span></td>
                    <td className={tdClass}>
                      <p className="font-medium text-espresso">{c.value}% off</p>
                      {c.description ? <p className="text-[11.5px] text-espresso/45">{c.description}</p> : null}
                    </td>
                    <td className={cn(tdClass, "text-[12px] leading-relaxed text-espresso/55")}>
                      {c.minSubtotal > 0 ? <>Min order {formatINR(c.minSubtotal)}<br /></> : null}
                      {c.maxDiscount ? <>Cap {formatINR(c.maxDiscount)}<br /></> : null}
                      {c.expiresAt ? <>Expires {formatDate(c.expiresAt)}</> : "No expiry"}
                    </td>
                    <td className={cn(tdClass, "tabular-nums")}>{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</td>
                    <td className={tdClass}><StatusBadge status={c.active ? "active" : "draft"} /></td>
                    <td className={cn(tdClass, "text-right")}>
                      <div className="flex items-center justify-end gap-2">
                        <form action={toggleCouponAction}>
                          <input type="hidden" name="code" value={c.code} />
                          <input type="hidden" name="next" value={c.active ? "0" : "1"} />
                          <button type="submit" className={adminBtnGhost}>{c.active ? "Pause" : "Activate"}</button>
                        </form>
                        <form action={deleteCouponAction}>
                          <input type="hidden" name="code" value={c.code} />
                          <DeleteButton label="" confirm={`Delete coupon ${c.code}?`} />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form action={saveCouponAction} className="rounded-2xl border border-espresso/8 bg-white p-6">
          <h2 className="font-display text-lg text-espresso">Create / update coupon</h2>
          <p className="mt-1 text-[12px] text-espresso/50">Existing codes are updated in place.</p>
          <div className="mt-5 space-y-4">
            <AdminField label="Code"><input name="code" required className={cn(adminInput, "font-mono uppercase")} placeholder="WELCOME10" /></AdminField>
            <div className="grid grid-cols-2 gap-4">
              <AdminField label="Discount %"><input name="value" type="number" min={1} max={90} required className={adminInput} placeholder="10" /></AdminField>
              <AdminField label="Min subtotal ₹" hint="optional"><input name="minSubtotal" type="number" min={0} className={adminInput} placeholder="0" /></AdminField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <AdminField label="Max discount ₹" hint="optional cap"><input name="maxDiscount" type="number" min={0} className={adminInput} placeholder="—" /></AdminField>
              <AdminField label="Usage limit" hint="optional"><input name="usageLimit" type="number" min={0} className={adminInput} placeholder="—" /></AdminField>
            </div>
            <AdminField label="Expires on" hint="optional"><input name="expiresAt" type="date" className={adminInput} /></AdminField>
            <AdminField label="Description" hint="shown at checkout"><input name="description" className={adminInput} placeholder="10% welcome treat on your first order" /></AdminField>
            <PendingButton className="w-full">Save coupon</PendingButton>
          </div>
        </form>
      </div>
    </>
  );
}
