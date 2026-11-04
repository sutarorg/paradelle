import { ProductForm } from "@/components/admin/product-form";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata = { title: "New product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireAdmin("catalog");
  const sp = await searchParams;
  return (
    <>
      <PageHeader title="New product" sub="Create as draft first, add images, then set Active when it is ready for the shelf." />
      {sp.error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">{sp.error}</p> : null}
      <div className="mt-7 max-w-4xl">
        <ProductForm />
      </div>
    </>
  );
}
