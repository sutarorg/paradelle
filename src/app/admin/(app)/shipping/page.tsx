import { Truck } from "lucide-react";
import { getShippingSettings } from "@/lib/catalog";
import { saveShippingAction } from "@/lib/admin/actions-core";
import { requireAdmin } from "@/lib/admin-auth";
import { PendingButton } from "@/components/admin/client";
import { AdminField, Flash, PageHeader, adminInput } from "@/components/admin/ui";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Shipping charges" };
export const dynamic = "force-dynamic";

export default async function ShippingPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("settings");
  const sp = await searchParams;
  const cfg = await getShippingSettings();

  return (
    <>
      <PageHeader title="Shipping charges" sub="The cart, checkout and every product page quote these numbers live — change with care." />
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      <div className="grid max-w-3xl gap-6 lg:grid-cols-2">
        <form action={saveShippingAction} className="rounded-2xl border border-espresso/8 bg-white p-6">
          <h2 className="font-display flex items-center gap-2 text-lg text-espresso"><Truck className="h-5 w-5 text-bronze" strokeWidth={1.7} /> Charges</h2>
          <div className="mt-5 space-y-4">
            <AdminField label="Flat shipping fee (₹)">
              <input name="flatFee" type="number" min={0} required defaultValue={cfg.flatFee / 100} className={adminInput} />
            </AdminField>
            <AdminField label="Free shipping at or above (₹)">
              <input name="freeThreshold" type="number" min={0} required defaultValue={cfg.freeThreshold / 100} className={adminInput} />
            </AdminField>
            <PendingButton className="w-full">Save charges</PendingButton>
          </div>
        </form>

        <div className="rounded-2xl border border-espresso/8 bg-cream/60 p-6 text-[13px] leading-relaxed text-espresso/65">
          <h3 className="font-display text-lg text-espresso">How customers see it</h3>
          <ul className="mt-3 list-none space-y-2.5">
            <li>— Cart page progress bar: “Add ₹X more for complimentary shipping”.</li>
            <li>— Checkout summary shows {formatINR(cfg.flatFee)} flat, or “Complimentary” at {formatINR(cfg.freeThreshold)}+.</li>
            <li>— Nothing extra is collected at delivery. Ever.</li>
          </ul>
          <p className="mt-4">Set the threshold roughly 20–30% above your typical basket to lift average order value without surprising anyone.</p>
        </div>
      </div>
    </>
  );
}
