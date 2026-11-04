import Image from "next/image";
import Link from "next/link";
import { Package, Plus, SquarePen, Power } from "lucide-react";
import { getAdminCatalog, getReservedByProduct } from "@/lib/catalog";
import { requireAdmin } from "@/lib/admin-auth";
import { setProductStatusAction } from "@/lib/admin/catalog-actions";
import { DeleteButton } from "@/components/admin/client";
import { EmptyState, Flash, PageHeader, StatusBadge, adminBtn, tableClass, tableShell, tdClass, thClass } from "@/components/admin/ui";
import { cn, formatINR } from "@/lib/utils";
import { deleteProductAction } from "@/lib/admin/catalog-actions";

export const metadata = { title: "Products" };
export const dynamic = "force-dynamic";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("catalog");
  const sp = await searchParams;
  const [catalog, reserved] = await Promise.all([getAdminCatalog(), getReservedByProduct()]);

  return (
    <>
      <PageHeader
        title="Products"
        sub="The catalogue the storefront sells from. Drafts stay hidden; archived items are invisible."
        actions={
          <Link href="/admin/products/new" className={adminBtn}>
            <Plus className="h-4 w-4" strokeWidth={2} /> New product
          </Link>
        }
      />
      <div className="mt-6">
        <Flash ok={sp.ok} error={sp.error} />
      </div>

      {catalog.length === 0 ? (
        <EmptyState icon={Package} title="No products yet" text="Run the seed script or create the first bar." action={<Link href="/admin/products/new" className={adminBtn}>Create product</Link>} />
      ) : (
        <div className={tableShell}>
          <table className={tableClass}>
            <thead>
              <tr>
                <th className={thClass}>Product</th>
                <th className={thClass}>SKU</th>
                <th className={thClass}>Price / MRP</th>
                <th className={thClass}>Stock</th>
                <th className={thClass}>Status</th>
                <th className={cn(thClass, "text-right")}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((p) => {
                const r = reserved[p.slug] ?? 0;
                const available = Math.max(0, p.stock - r);
                return (
                  <tr key={p.id} className="transition-colors hover:bg-cream/50">
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-espresso/10">
                          <Image src={p.images.front} alt={p.name} fill sizes="48px" className="object-cover" />
                        </span>
                        <div>
                          <p className="font-medium text-espresso">{p.name}</p>
                          <p className="text-[11.5px] text-espresso/45">/{p.slug} · {p.weightGrams} g · {p.cocoaPercent}%</p>
                        </div>
                      </div>
                    </td>
                    <td className={cn(tdClass, "font-mono text-[12px]")}>{p.sku}</td>
                    <td className={cn(tdClass, "tabular-nums")}>
                      {formatINR(p.price)}
                      {p.mrp > p.price ? <span className="ml-1.5 text-espresso/40 line-through">{formatINR(p.mrp)}</span> : null}
                    </td>
                    <td className={tdClass}>
                      <p className="tabular-nums font-medium">{available} <span className="font-normal text-espresso/45">available</span></p>
                      <p className="text-[11.5px] text-espresso/45">{p.stock} on hand{r > 0 ? ` · ${r} reserved` : ""}</p>
                    </td>
                    <td className={tdClass}><StatusBadge status={p.status} /></td>
                    <td className={cn(tdClass, "text-right")}>
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/products/${p.id}`} className="inline-flex items-center gap-1.5 rounded-full border border-espresso/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-espresso/70 hover:border-bronze hover:text-bronze">
                          <SquarePen className="h-3.5 w-3.5" strokeWidth={1.8} /> Edit
                        </Link>
                        <form action={setProductStatusAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="status" value={p.status === "active" ? "draft" : "active"} />
                          <button type="submit" title={p.status === "active" ? "Take off shelf" : "Put on shelf"} className="inline-flex items-center gap-1.5 rounded-full border border-espresso/15 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-espresso/70 hover:border-bronze hover:text-bronze">
                            <Power className="h-3.5 w-3.5" strokeWidth={1.8} /> {p.status === "active" ? "Unlist" : "List"}
                          </button>
                        </form>
                        <form action={deleteProductAction}>
                          <input type="hidden" name="id" value={p.id} />
                          <DeleteButton label="" confirm={`Delete “${p.name}” permanently? Orders keep their snapshot history.`} />
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
