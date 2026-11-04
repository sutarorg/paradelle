import { desc } from "drizzle-orm";
import { MapPin } from "lucide-react";
import { db } from "@/db";
import { pincodes } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { addPincodesAction, deletePincodeAction, togglePincodeAction } from "@/lib/admin/actions-core";
import { DeleteButton, PendingButton } from "@/components/admin/client";
import { AdminField, EmptyState, Flash, PageHeader, StatusBadge, adminInput, tableClass, tableShell, tdClass, thClass } from "@/components/admin/ui";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "PIN serviceability" };
export const dynamic = "force-dynamic";

export default async function PincodesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("settings");
  const sp = await searchParams;
  const rows = await db.select().from(pincodes).orderBy(desc(pincodes.createdAt));

  return (
    <>
      <PageHeader title="PIN code serviceability" sub="Once you publish codes here, checkout only accepts listed, serviceable PINs. An empty list means all of India." />
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      <div className="grid items-start gap-6 xl:grid-cols-[380px_1fr]">
        <form action={addPincodesAction} className="rounded-2xl border border-espresso/8 bg-white p-6">
          <h2 className="font-display flex items-center gap-2 text-lg text-espresso"><MapPin className="h-5 w-5 text-bronze" strokeWidth={1.7} /> Add PIN codes</h2>
          <div className="mt-5 space-y-4">
            <AdminField label="Bulk add" hint='one per line — "400001:Mumbai" names the city'>
              <textarea name="bulk" rows={7} className={adminInput} placeholder={"400001:Mumbai\n400002:Mumbai\n110001:Delhi"} />
            </AdminField>
            <PendingButton className="w-full">Add as serviceable</PendingButton>
          </div>
          <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-[12.5px] leading-relaxed text-espresso/60">
            Recommendation: start by listing only chilled-chain reliable metros, then expand as courier partners prove out.
          </p>
        </form>

        {rows.length === 0 ? (
          <EmptyState icon={MapPin} title="Serving all of India" text="No PIN list published. Add codes above to restrict checkout to specific serviceable areas." />
        ) : (
          <div className={tableShell}>
            <table className={cn(tableClass, "min-w-[520px]")}>
              <thead>
                <tr><th className={thClass}>PIN</th><th className={thClass}>City</th><th className={thClass}>Status</th><th className={thClass}>Added</th><th className={cn(thClass, "text-right")}> </th></tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.pincode} className="hover:bg-cream/50">
                    <td className={cn(tdClass, "font-mono font-medium text-espresso")}>{p.pincode}</td>
                    <td className={tdClass}>{p.city ?? "—"}</td>
                    <td className={tdClass}><StatusBadge status={p.serviceable ? "active" : "draft"} /></td>
                    <td className={cn(tdClass, "text-espresso/55")}>{formatDate(p.createdAt)}</td>
                    <td className={cn(tdClass, "text-right")}>
                      <div className="flex items-center justify-end gap-2">
                        <form action={togglePincodeAction}>
                          <input type="hidden" name="pincode" value={p.pincode} />
                          <input type="hidden" name="next" value={p.serviceable ? "0" : "1"} />
                          <button type="submit" className="rounded-full border border-espresso/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-espresso/70 hover:border-bronze hover:text-bronze">
                            {p.serviceable ? "Pause" : "Enable"}
                          </button>
                        </form>
                        <form action={deletePincodeAction}>
                          <input type="hidden" name="pincode" value={p.pincode} />
                          <DeleteButton label="" confirm={`Remove PIN ${p.pincode}?`} />
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
