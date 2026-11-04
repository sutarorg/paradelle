import { desc } from "drizzle-orm";
import { ScrollText } from "lucide-react";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { EmptyState, PageHeader, tableClass, tableShell, tdClass, thClass } from "@/components/admin/ui";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Activity log" };
export const dynamic = "force-dynamic";

export default async function ActivityPage() {
  await requireAdmin("reports");
  const rows = await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(150);

  return (
    <>
      <PageHeader title="Activity log" sub="Every admin action, in order. Accountability is part of the craft." />
      <div className="mt-7">
        {rows.length === 0 ? (
          <EmptyState icon={ScrollText} title="No activity yet" text="Actions like product edits, stock changes and status updates appear here." />
        ) : (
          <div className={tableShell}>
            <table className={tableClass}>
              <thead>
                <tr><th className={thClass}>When</th><th className={thClass}>Who</th><th className={thClass}>Action</th><th className={thClass}>Entity</th><th className={thClass}>Details</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-cream/50">
                    <td className={cn(tdClass, "whitespace-nowrap text-espresso/55")}>{formatDate(r.createdAt)}</td>
                    <td className={cn(tdClass, "font-medium text-espresso")}>{r.adminEmail ?? "system"}</td>
                    <td className={tdClass}><span className="rounded-md bg-cream px-2 py-1 font-mono text-[11.5px]">{r.action}</span></td>
                    <td className={tdClass}>{r.entityType}{r.entityId ? <span className="text-espresso/40"> · {r.entityId.slice(0, 18)}</span> : null}</td>
                    <td className={cn(tdClass, "text-espresso/55")}>{r.details ?? "—"}</td>
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
