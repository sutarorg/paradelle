import { desc } from "drizzle-orm";
import { ShieldCheck, UserPlus } from "lucide-react";
import { db } from "@/db";
import { admins, ADMIN_PERMISSIONS } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { createStaffAction, toggleStaffActiveAction, updateStaffPermissionsAction } from "@/lib/admin/actions-core";
import { PendingButton } from "@/components/admin/client";
import { AdminField, Flash, PageHeader, StatusBadge, adminInput } from "@/components/admin/ui";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Team & roles" };
export const dynamic = "force-dynamic";

const PERM_LABELS: Record<(typeof ADMIN_PERMISSIONS)[number], string> = {
  catalog: "Products",
  inventory: "Inventory",
  orders: "Orders & refunds",
  customers: "Customers",
  marketing: "Coupons",
  content: "Website content",
  reports: "Reports & activity",
  staff: "Team management",
  settings: "Settings & shipping",
};

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireAdmin("staff");
  const sp = await searchParams;
  const rows = await db.select().from(admins).orderBy(desc(admins.createdAt));

  return (
    <>
      <PageHeader title="Team &amp; roles" sub="Super Admins hold every key. Staff receive only the permissions you grant — nothing more is even rendered in their sidebar." />
      <div className="mt-6"><Flash ok={sp.ok} error={sp.error} /></div>

      <div className="grid items-start gap-6 xl:grid-cols-[380px_1fr]">
        <form action={createStaffAction} className="rounded-2xl border border-espresso/8 bg-white p-6">
          <h2 className="font-display flex items-center gap-2 text-lg text-espresso"><UserPlus className="h-5 w-5 text-bronze" strokeWidth={1.7} /> Invite staff</h2>
          <div className="mt-5 space-y-4">
            <AdminField label="Full name"><input name="name" required className={adminInput} /></AdminField>
            <AdminField label="Email"><input name="email" type="email" required className={adminInput} /></AdminField>
            <AdminField label="Temporary password" hint="min. 8 characters"><input name="password" type="password" required minLength={8} className={adminInput} /></AdminField>
            <fieldset>
              <legend className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-espresso/60">Permissions</legend>
              <div className="mt-2.5 grid grid-cols-2 gap-2">
                {ADMIN_PERMISSIONS.filter((p) => p !== "staff").map((p) => (
                  <label key={p} className="flex items-center gap-2.5 rounded-xl border border-espresso/10 px-3 py-2.5 text-[13px] text-espresso/75 hover:border-bronze/40">
                    <input type="checkbox" name={`perm_${p}`} className="h-4 w-4 accent-[#795038]" /> {PERM_LABELS[p]}
                  </label>
                ))}
              </div>
            </fieldset>
            <PendingButton className="w-full">Create account</PendingButton>
          </div>
        </form>

        <div className="space-y-4">
          {rows.map((a) => (
            <div key={a.id} className="rounded-2xl border border-espresso/8 bg-white p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3.5">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-plum font-display text-gold">{a.name.charAt(0).toUpperCase()}</span>
                  <div>
                    <p className="font-medium text-espresso">{a.name} {a.id === me.id ? <span className="text-[11px] text-espresso/40">(you)</span> : null}</p>
                    <p className="text-[12px] text-espresso/50">{a.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={a.active ? "active" : "archived"} />
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-bronze">
                    <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.8} /> {a.role === "super" ? "Super Admin" : "Staff"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-[12px] text-espresso/45">
                Joined {formatDate(a.createdAt)}{a.lastLoginAt ? ` · last sign-in ${formatDate(a.lastLoginAt)}` : " · never signed in"}
              </p>

              {a.role !== "super" ? (
                <details className="mt-4 rounded-xl border border-espresso/10">
                  <summary className="cursor-pointer list-none px-4 py-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-bronze marker:hidden [&::-webkit-details-marker]:hidden">
                    Edit permissions &amp; access
                  </summary>
                  <div className="border-t border-espresso/10 p-4">
                    <form action={updateStaffPermissionsAction} className="space-y-3">
                      <input type="hidden" name="id" value={a.id} />
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {ADMIN_PERMISSIONS.map((p) => (
                          <label key={p} className="flex items-center gap-2.5 rounded-xl border border-espresso/10 px-3 py-2.5 text-[13px] text-espresso/75">
                            <input type="checkbox" name={`perm_${p}`} defaultChecked={a.permissions.includes(p)} className="h-4 w-4 accent-[#795038]" /> {PERM_LABELS[p]}
                          </label>
                        ))}
                      </div>
                      <PendingButton>Save permissions</PendingButton>
                    </form>
                    <form action={toggleStaffActiveAction} className="mt-3">
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="next" value={a.active ? "0" : "1"} />
                      <PendingButton className={cn(a.active && "border-red-900/25 bg-white text-red-900 hover:bg-red-50 hover:border-red-900/40")}>
                        {a.active ? "Deactivate account" : "Reactivate account"}
                      </PendingButton>
                    </form>
                  </div>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
