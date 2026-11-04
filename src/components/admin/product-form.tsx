import Image from "next/image";
import { ArrowDown, ArrowUp, ImagePlus, Images } from "lucide-react";
import type { CatalogProduct } from "@/lib/catalog";
import {
  deleteProductImageAction,
  moveProductImageAction,
  saveProductAction,
  updateImageAltAction,
  uploadProductImageAction,
} from "@/lib/admin/catalog-actions";
import { DeleteButton, PendingButton } from "@/components/admin/client";
import { AdminField, adminInput } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

/** Full product editor (server-native forms; works without JS for core saving). */
export function ProductForm({ product }: { product?: CatalogProduct }) {
  const p = product;
  return (
    <form action={saveProductAction} className="space-y-8">
      {p ? <input type="hidden" name="id" value={p.id} /> : null}

      <section className="rounded-2xl border border-espresso/8 bg-white p-6">
        <h2 className="font-display text-lg text-espresso">Basics</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <AdminField label="Product name"><input name="name" required defaultValue={p?.name} className={adminInput} placeholder="Signature Milk Chocolate" /></AdminField>
          <AdminField label="Short name"><input name="shortName" defaultValue={p?.shortName} className={adminInput} placeholder="Signature Milk" /></AdminField>
          <AdminField label="Collection line"><input name="line" defaultValue={p?.line ?? "The Signature Collection"} className={adminInput} /></AdminField>
          <div className="grid grid-cols-2 gap-4">
            <AdminField label="SKU"><input name="sku" defaultValue={p?.sku} className={cn(adminInput, "font-mono")} placeholder="PDL-MILK01" /></AdminField>
            <AdminField label="Slug" hint="URL: /product/…"><input name="slug" defaultValue={p?.slug} className={cn(adminInput, "font-mono")} placeholder="auto from name" /></AdminField>
          </div>
          <AdminField label="Status">
            <select name="status" defaultValue={p?.status ?? "draft"} className={adminInput}>
              <option value="active">Active — on shelf</option>
              <option value="draft">Draft — hidden</option>
              <option value="archived">Archived — retired</option>
            </select>
          </AdminField>
          <AdminField label="Sort order" hint="lower shows first"><input name="sort" type="number" defaultValue={p?.sort ?? 0} className={adminInput} /></AdminField>
        </div>
      </section>

      <section className="rounded-2xl border border-espresso/8 bg-white p-6">
        <h2 className="font-display text-lg text-espresso">Pricing &amp; format</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <AdminField label="Selling price (₹)" hint="prestige round numbers"><input name="price" type="number" min={1} required defaultValue={p?.price} className={adminInput} placeholder="450" /></AdminField>
          <AdminField label="MRP (₹)" hint="≥ price; incl. taxes"><input name="mrp" type="number" min={1} required defaultValue={p?.mrp ?? p?.price} className={adminInput} placeholder="450" /></AdminField>
          <AdminField label="Net weight (g)"><input name="weightGrams" type="number" min={1} required defaultValue={p?.weightGrams ?? 50} className={adminInput} /></AdminField>
          <AdminField label="Cocoa %"><input name="cocoaPercent" type="number" min={0} max={100} defaultValue={p?.cocoaPercent ?? 45} className={adminInput} /></AdminField>
          {!p ? <AdminField label="Opening stock"><input name="initialStock" type="number" min={0} defaultValue={0} className={adminInput} /></AdminField> : null}
          <AdminField label="Low-stock alert at"><input name="lowStockThreshold" type="number" min={0} defaultValue={p?.lowStockThreshold ?? 12} className={adminInput} /></AdminField>
          <AdminField label="Accent colour"><input name="accent" type="color" defaultValue={p?.accent ?? "#C9A66B"} className={cn(adminInput, "h-11 py-1.5")} /></AdminField>
        </div>
        <p className="mt-4 rounded-xl bg-cream px-4 py-3 text-[12.5px] leading-relaxed text-espresso/60">
          Selling price is what customers pay. MRP shows struck-through only when genuinely above the selling price — never invent discounts.
        </p>
      </section>

      <section className="rounded-2xl border border-espresso/8 bg-white p-6">
        <h2 className="font-display text-lg text-espresso">Story</h2>
        <div className="mt-5 grid gap-5">
          <AdminField label="Tagline"><input name="tagline" defaultValue={p?.tagline} className={adminInput} placeholder="One elegant sentence." /></AdminField>
          <AdminField label="Description"><textarea name="description" rows={4} defaultValue={p?.description} className={adminInput} /></AdminField>
          <AdminField label="Tasting notes" hint="comma-separated"><input name="tastingNotes" defaultValue={p?.tastingNotes.join(", ")} className={adminInput} placeholder="Toffee, Warm milk, Vanilla bean" /></AdminField>
        </div>
      </section>

      <section className="rounded-2xl border border-espresso/8 bg-white p-6">
        <h2 className="font-display text-lg text-espresso">Ingredients &amp; allergens</h2>
        <div className="mt-5 grid gap-5">
          <AdminField label="Ingredients" hint="comma-separated, as printed on the wrapper"><textarea name="ingredients" rows={2} defaultValue={p?.ingredients.join(", ")} className={adminInput} /></AdminField>
          <div className="grid gap-5 sm:grid-cols-2">
            <AdminField label="Allergens" hint="comma-separated"><input name="allergens" defaultValue={p?.allergens.join(", ")} className={adminInput} placeholder="Milk, Hazelnuts" /></AdminField>
            <AdminField label="Cross-contact note"><input name="crossContact" defaultValue={p?.crossContact} className={adminInput} /></AdminField>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-espresso/8 bg-white p-6">
        <h2 className="font-display text-lg text-espresso">Nutrition — per 100 g</h2>
        <div className="mt-5 grid grid-cols-2 gap-5 sm:grid-cols-4">
          <AdminField label="Energy"><input name="n_energy" defaultValue={p?.nutritionPer100g.energy} className={adminInput} placeholder="555 kcal" /></AdminField>
          <AdminField label="Protein"><input name="n_protein" defaultValue={p?.nutritionPer100g.protein} className={adminInput} placeholder="7.5 g" /></AdminField>
          <AdminField label="Carbohydrate"><input name="n_carbs" defaultValue={p?.nutritionPer100g.carbs} className={adminInput} placeholder="50 g" /></AdminField>
          <AdminField label="of which sugars"><input name="n_sugars" defaultValue={p?.nutritionPer100g.sugars} className={adminInput} placeholder="47 g" /></AdminField>
          <AdminField label="Fat"><input name="n_fat" defaultValue={p?.nutritionPer100g.fat} className={adminInput} placeholder="35 g" /></AdminField>
          <AdminField label="of which saturates"><input name="n_satFat" defaultValue={p?.nutritionPer100g.satFat} className={adminInput} placeholder="21 g" /></AdminField>
          <AdminField label="Sodium"><input name="n_sodium" defaultValue={p?.nutritionPer100g.sodium} className={adminInput} placeholder="0.18 g" /></AdminField>
        </div>
      </section>

      <section className="rounded-2xl border border-espresso/8 bg-white p-6">
        <h2 className="font-display text-lg text-espresso">Care &amp; delivery notes</h2>
        <div className="mt-5 grid gap-5">
          <AdminField label="Storage instructions"><textarea name="storage" rows={2} defaultValue={p?.storage} className={adminInput} /></AdminField>
          <AdminField label="Shipping note"><textarea name="shippingNote" rows={2} defaultValue={p?.shippingNote} className={adminInput} /></AdminField>
        </div>
      </section>

      <section className="rounded-2xl border border-espresso/8 bg-white p-6">
        <h2 className="font-display text-lg text-espresso">Food label (FSSAI)</h2>
        <p className="mt-1 text-[12.5px] text-espresso/55">Enter exactly what is printed on the sleeve — leave blank until pack copy is final. Never guess legal details.</p>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <AdminField label="FSSAI licence no."><input name="fssaiLicense" defaultValue={p?.fssaiLicense} className={adminInput} placeholder="—" /></AdminField>
          <AdminField label="Manufacturer / packed by"><input name="manufacturer" defaultValue={p?.manufacturer} className={adminInput} placeholder="Paradelle Atelier, …" /></AdminField>
          <AdminField label="Net quantity label"><input name="netQuantityLabel" defaultValue={p?.netQuantityLabel} className={adminInput} placeholder="Net Qty: 50 g" /></AdminField>
          <AdminField label="Best before (months)"><input name="bestBeforeMonths" type="number" min={1} defaultValue={p?.bestBeforeMonths ?? 12} className={adminInput} /></AdminField>
          <AdminField label="Country of origin"><input name="countryOfOrigin" defaultValue={p?.countryOfOrigin ?? "India"} className={adminInput} /></AdminField>
        </div>
      </section>

      <section className="rounded-2xl border border-espresso/8 bg-white p-6">
        <h2 className="font-display text-lg text-espresso">SEO</h2>
        <div className="mt-5 grid gap-5">
          <AdminField label="Meta title"><input name="seoTitle" defaultValue={p?.seoTitle} className={adminInput} placeholder="Defaults to “Name — ₹price”" /></AdminField>
          <AdminField label="Meta description"><textarea name="seoDescription" rows={2} defaultValue={p?.seoDescription} className={adminInput} /></AdminField>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <PendingButton>{p ? "Save changes" : "Create product"}</PendingButton>
      </div>
    </form>
  );
}

/** Images manager — only rendered when editing an existing product. */
export function ProductImages({ product }: { product: CatalogProduct }) {
  const imgs = [...product.imageList].sort((a, b) => a.position - b.position);
  return (
    <section id="images" className="rounded-2xl border border-espresso/8 bg-white p-6">
      <h2 className="font-display flex items-center gap-2 text-lg text-espresso">
        <Images className="h-5 w-5 text-bronze" strokeWidth={1.7} /> Product images
      </h2>
      <p className="mt-1 text-[12.5px] text-espresso/55">
        First image = storefront packshot, second = three-quarter view. Uploads persist to Supabase Storage when configured, else local /uploads.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {imgs.map((img, i) => (
          <figure key={img.id} className="rounded-2xl border border-espresso/10 bg-cream p-3">
            <div className="relative aspect-square overflow-hidden rounded-xl ring-1 ring-espresso/10">
              <Image src={img.url} alt={img.alt} fill sizes="240px" className="object-cover" />
            </div>
            <figcaption className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-espresso/45">
              {i === 0 ? "Packshot (front)" : i === 1 ? "Composition" : `Image ${i + 1}`}
            </figcaption>
            <form action={updateImageAltAction} className="mt-2 flex gap-2">
              <input type="hidden" name="imageId" value={img.id} />
              <input type="hidden" name="productId" value={product.id} />
              <input name="alt" defaultValue={img.alt} aria-label="Alt text" className={cn(adminInput, "py-1.5 text-[12.5px]")} />
              <button type="submit" className="shrink-0 rounded-lg border border-espresso/15 px-3 text-[11px] font-semibold uppercase tracking-wider text-espresso/60 hover:border-bronze hover:text-bronze">Save</button>
            </form>
            <div className="mt-2 flex gap-2">
              <form action={moveProductImageAction}>
                <input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="dir" value="up" />
                <button type="submit" aria-label="Move earlier" disabled={i === 0} className="rounded-lg border border-espresso/15 p-2 text-espresso/60 hover:border-bronze disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" strokeWidth={2} /></button>
              </form>
              <form action={moveProductImageAction}>
                <input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="productId" value={product.id} /><input type="hidden" name="dir" value="down" />
                <button type="submit" aria-label="Move later" disabled={i === imgs.length - 1} className="rounded-lg border border-espresso/15 p-2 text-espresso/60 hover:border-bronze disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" strokeWidth={2} /></button>
              </form>
              <form action={deleteProductImageAction} className="ml-auto">
                <input type="hidden" name="imageId" value={img.id} /><input type="hidden" name="productId" value={product.id} />
                <DeleteButton label="Remove" confirm="Remove this image?" />
              </form>
            </div>
          </figure>
        ))}

        <form action={uploadProductImageAction} className="flex flex-col justify-center rounded-2xl border border-dashed border-espresso/20 bg-cream/60 p-5">
          <input type="hidden" name="productId" value={product.id} />
          <p className="text-sm font-medium text-espresso">Add an image</p>
          <p className="mt-0.5 text-[12px] text-espresso/50">JPG/PNG/WebP, up to 5 MB.</p>
          <input type="file" name="file" accept="image/*" required className="mt-3 w-full text-[12.5px] text-espresso/70 file:mr-3 file:rounded-full file:border-0 file:bg-espresso file:px-4 file:py-2 file:text-[11px] file:font-semibold file:uppercase file:tracking-wider file:text-ivory hover:file:bg-plum" />
          <input name="alt" placeholder="Alt text (accessibility)" className={cn(adminInput, "mt-3 py-2 text-[12.5px]")} />
          <PendingButton className="mt-3"><ImagePlus className="h-4 w-4" strokeWidth={1.8} /> Upload</PendingButton>
        </form>
      </div>
    </section>
  );
}
