import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminProduct } from "@/lib/catalog";
import { requireAdmin } from "@/lib/admin-auth";
import { ProductForm, ProductImages } from "@/components/admin/product-form";
import { Flash, PageHeader, StatusBadge } from "@/components/admin/ui";
import { formatINR } from "@/lib/utils";

export const metadata = { title: "Edit product" };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  await requireAdmin("catalog");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const product = await getAdminProduct(id);
  if (!product) notFound();

  return (
    <>
      <Link href="/admin/products" className="inline-flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.16em] text-bronze hover:underline underline-offset-4">
        <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} /> All products
      </Link>
      <div className="mt-4">
        <PageHeader
          title={product.name}
          sub={`${product.sku} · /product/${product.slug} · ${product.weightGrams} g · ${formatINR(product.price)} (MRP ${formatINR(product.mrp)})`}
          actions={<StatusBadge status={product.status} />}
        />
      </div>
      <div className="mt-5"><Flash ok={sp.ok} error={sp.error} /></div>

      <div className="grid items-start gap-8 xl:grid-cols-[1fr_420px]">
        <ProductForm product={product} />
        <ProductImages product={product} />
      </div>
    </>
  );
}
