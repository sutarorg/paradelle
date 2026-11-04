import { CreditCard, Database, Image, KeyRound, Store } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { changePasswordAction, saveStoreSettingsAction } from "@/lib/admin/actions-core";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { PendingButton } from "@/components/admin/client";
import { AdminField, Flash, PageHeader, StatusBadge, adminInput } from "@/components/admin/ui";

export const metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("settings");
  const sp = await searchParams;
  const rows = await db.select().from(settings);
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const integrations = [
    { icon: CreditCard, name: "Razorpay", ready: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET), note: "Phase 3 — order creation route is already wired; add keys to go live." },
    { icon: Image, name: "Supabase Storage", ready: !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY), note: "Product image uploads persist here when configured (bucket: product-media)." },
    { icon: Database, name: "Database", ready: !!process.env.DATABASE_URL, note: "Shared Postgres for storefront and admin." },
  ];

  return (
    <>
      <PageHeader title="General settings" sub="Store identity, your own sign-in security, and integration readiness." />
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <form action={saveStoreSettingsAction} className="rounded-2xl border border-espresso/8 bg-white p-6">
          <h2 className="font-display flex items-center gap-2 text-lg text-espresso"><Store className="h-5 w-5 text-bronze" strokeWidth={1.7} /> Store identity</h2>
          <div className="mt-5 space-y-4">
            <AdminField label="Business name (invoices)"><input name="legalName" defaultValue={map["store.legal_name"] ?? "PARADELLE CHOCOLATES"} className={adminInput} /></AdminField>
            <AdminField label="Support email (invoices &amp; replies)"><input name="supportEmail" type="email" defaultValue={map["store.support_email"] ?? "hello@paradelle.store"} className={adminInput} /></AdminField>
            <PendingButton>Save identity</PendingButton>
          </div>
        </form>

        <form action={changePasswordAction} className="rounded-2xl border border-espresso/8 bg-white p-6">
          <h2 className="font-display flex items-center gap-2 text-lg text-espresso"><KeyRound className="h-5 w-5 text-bronze" strokeWidth={1.7} /> Your password</h2>
          <div className="mt-5 space-y-4">
            <AdminField label="Current password"><input name="current" type="password" required autoComplete="current-password" className={adminInput} /></AdminField>
            <div className="grid grid-cols-2 gap-4">
              <AdminField label="New password"><input name="next" type="password" required minLength={8} autoComplete="new-password" className={adminInput} /></AdminField>
              <AdminField label="Confirm new"><input name="confirm" type="password" required minLength={8} autoComplete="new-password" className={adminInput} /></AdminField>
            </div>
            <PendingButton>Change password</PendingButton>
          </div>
        </form>

        <div className="rounded-2xl border border-espresso/8 bg-white p-6 lg:col-span-2">
          <h2 className="font-display text-lg text-espresso">Integrations</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {integrations.map((i) => (
              <div key={i.name} className="rounded-xl border border-espresso/10 bg-cream/60 p-5">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 text-sm font-semibold text-espresso"><i.icon className="h-4.5 w-4.5 text-bronze" strokeWidth={1.7} /> {i.name}</p>
                  <StatusBadge status={i.ready ? "active" : "draft"} />
                </div>
                <p className="mt-2.5 text-[12.5px] leading-relaxed text-espresso/55">{i.ready ? "Configured — secrets stay server-side, never exposed to the browser." : i.note}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl bg-cream px-4 py-3 text-[12.5px] leading-relaxed text-espresso/60">
            Phase notes: warehouse-dense admin auth (sessions + roles) is live now; Phase 3 adds edge middleware verification, Razorpay webhook signing (which alone may move an order to “paid”), refund execution and transactional email.
          </p>
        </div>
      </div>
    </>
  );
}
