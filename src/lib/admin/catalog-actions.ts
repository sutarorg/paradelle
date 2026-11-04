"use server";

import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { productImages, products, stockMovements } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";
import { asInt, asList, asStr, flash, logActivity, safe } from "@/lib/admin/log";

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
}

/* ───────────────────────── Product CRUD ───────────────────────── */

export async function saveProductAction(formData: FormData) {
  const me = await requireAdmin("catalog");
  const id = asStr(formData.get("id"));
  const name = asStr(formData.get("name"));
  if (name.length < 2) return flash(id ? `/admin/products/${id}` : "/admin/products/new", undefined, "A product name is required.");
  // Admin enters rupees; storage is integer paise.
  const price = asInt(formData.get("price"), -1) * 100;
  const mrp = asInt(formData.get("mrp"), -1) * 100;
  if (price < 100 || mrp < 100) return flash(id ? `/admin/products/${id}` : "/admin/products/new", undefined, "Price and MRP must be at least ₹1.");
  if (mrp < price) return flash(id ? `/admin/products/${id}` : "/admin/products/new", undefined, "MRP cannot be below the selling price.");

  const values = {
    name,
    shortName: asStr(formData.get("shortName")) || name,
    line: asStr(formData.get("line")) || "The Signature Collection",
    sku: (asStr(formData.get("sku")) || `PDL-${randomUUID().slice(0, 8)}`).toUpperCase(),
    slug: slugify(asStr(formData.get("slug")) || name),
    status: (["active", "draft", "archived"].includes(asStr(formData.get("status"))) ? asStr(formData.get("status")) : "draft") as "active" | "draft" | "archived",
    cocoaPercent: Math.max(0, asInt(formData.get("cocoaPercent"), 45)),
    weightGrams: Math.max(1, asInt(formData.get("weightGrams"), 50)),
    price,
    mrp,
    lowStockThreshold: Math.max(0, asInt(formData.get("lowStockThreshold"), 12)),
    tagline: asStr(formData.get("tagline")),
    description: asStr(formData.get("description")),
    tastingNotes: asList(formData.get("tastingNotes")),
    ingredients: asList(formData.get("ingredients")),
    allergens: asList(formData.get("allergens")),
    crossContact: asStr(formData.get("crossContact")),
    nutrition: {
      energy: asStr(formData.get("n_energy")), protein: asStr(formData.get("n_protein")), carbs: asStr(formData.get("n_carbs")),
      sugars: asStr(formData.get("n_sugars")), fat: asStr(formData.get("n_fat")), satFat: asStr(formData.get("n_satFat")), sodium: asStr(formData.get("n_sodium")),
    },
    storage: asStr(formData.get("storage")),
    shippingNote: asStr(formData.get("shippingNote")),
    accent: asStr(formData.get("accent")) || "#C9A66B",
    seoTitle: asStr(formData.get("seoTitle")),
    seoDescription: asStr(formData.get("seoDescription")),
    fssaiLicense: asStr(formData.get("fssaiLicense")),
    manufacturer: asStr(formData.get("manufacturer")),
    netQuantityLabel: asStr(formData.get("netQuantityLabel")),
    bestBeforeMonths: Math.max(1, asInt(formData.get("bestBeforeMonths"), 12)),
    countryOfOrigin: asStr(formData.get("countryOfOrigin")) || "India",
    sort: asInt(formData.get("sort"), 0),
    updatedAt: new Date(),
  };

  let productId = id;
  const err = await safe(async () => {
    if (id) {
      await db.update(products).set(values).where(eq(products.id, id));
    } else {
      const initialStock = Math.max(0, asInt(formData.get("initialStock"), 0));
      const inserted = await db.insert(products).values({ ...values, stock: initialStock }).returning({ id: products.id });
      productId = inserted[0].id;
      if (initialStock > 0) {
        await db.insert(stockMovements).values({ productId, delta: initialStock, reason: "receipt", note: "Opening stock", adminId: me.id });
      }
    }
    await logActivity(me, id ? "product.update" : "product.create", "product", productId, name);
  }, "Could not save — SKU or slug may already exist.");

  if (err) return flash(id ? `/admin/products/${id}` : "/admin/products/new", undefined, err);
  flash(`/admin/products`, id ? `${name} updated.` : `${name} created.`);
}

export async function setProductStatusAction(formData: FormData) {
  const me = await requireAdmin("catalog");
  const id = asStr(formData.get("id"));
  const status = asStr(formData.get("status"));
  if (!["active", "draft", "archived"].includes(status)) return flash("/admin/products", undefined, "Invalid status.");
  const err = await safe(async () => {
    await db.update(products).set({ status: status as "active" | "draft" | "archived", updatedAt: new Date() }).where(eq(products.id, id));
    await logActivity(me, `product.${status}`, "product", id);
  });
  flash("/admin/products", err ? undefined : "Status updated.", err ?? undefined);
}

export async function deleteProductAction(formData: FormData) {
  const me = await requireAdmin("catalog");
  const id = asStr(formData.get("id"));
  const err = await safe(async () => {
    const imgs = await db.select().from(productImages).where(eq(productImages.productId, id));
    for (const img of imgs) await removeUploadFile(img.url);
    await db.delete(products).where(eq(products.id, id));
    await logActivity(me, "product.delete", "product", id);
  });
  flash("/admin/products", err ? undefined : "Product deleted.", err ?? undefined);
}

/* ───────────────────────── Product images ───────────────────────── */

async function storeImageFile(file: File, productId: string): Promise<string> {
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const fileName = `${productId.slice(0, 8)}-${randomUUID().slice(0, 8)}.${ext}`;

  // Supabase Storage (preferred, persistent) when configured — otherwise local public/.
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const bucket = "product-media";
    const res = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/uploads/${fileName}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": file.type, "x-upsert": "true" },
      body: Buffer.from(await file.arrayBuffer()),
    });
    if (!res.ok) throw new Error("supabase upload failed");
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/uploads/${fileName}`;
  }

  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${fileName}`;
}

async function removeUploadFile(url: string) {
  if (!url.startsWith("/uploads/")) return; // only remove files we own locally
  try {
    await unlink(path.join(process.cwd(), "public", url));
  } catch { /* already gone */ }
}

export async function uploadProductImageAction(formData: FormData) {
  const me = await requireAdmin("catalog");
  const productId = asStr(formData.get("productId"));
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return flash(`/admin/products/${productId}`, undefined, "Choose an image first.");
  if (!file.type.startsWith("image/")) return flash(`/admin/products/${productId}`, undefined, "Only image files are allowed.");
  if (file.size > 5 * 1024 * 1024) return flash(`/admin/products/${productId}`, undefined, "Images must be under 5 MB.");

  const err = await safe(async () => {
    const url = await storeImageFile(file, productId);
    const existing = await db.select().from(productImages).where(eq(productImages.productId, productId));
    const position = existing.length === 0 ? 0 : Math.max(...existing.map((i) => i.position)) + 1;
    await db.insert(productImages).values({ productId, url, alt: asStr(formData.get("alt")) || "Product image", position });
    await logActivity(me, "product.image_add", "product", productId, url);
  }, "Upload failed — try a smaller image.");
  flash(`/admin/products/${productId}#images`, err ? undefined : "Image added.", err ?? undefined);
}

export async function updateImageAltAction(formData: FormData) {
  const me = await requireAdmin("catalog");
  const id = asStr(formData.get("imageId"));
  const productId = asStr(formData.get("productId"));
  const err = await safe(async () => {
    await db.update(productImages).set({ alt: asStr(formData.get("alt")) }).where(eq(productImages.id, id));
  });
  flash(`/admin/products/${productId}#images`, err ? undefined : "Alt text saved.", err ?? undefined);
}

export async function moveProductImageAction(formData: FormData) {
  const me = await requireAdmin("catalog");
  const imageId = asStr(formData.get("imageId"));
  const productId = asStr(formData.get("productId"));
  const dir = asStr(formData.get("dir")) === "up" ? -1 : 1;
  const err = await safe(async () => {
    const imgs = await db.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.position));
    const idx = imgs.findIndex((i) => i.id === imageId);
    const swap = imgs[idx + dir];
    if (idx < 0 || !swap) return;
    await db.update(productImages).set({ position: swap.position }).where(eq(productImages.id, imgs[idx].id));
    await db.update(productImages).set({ position: imgs[idx].position }).where(eq(productImages.id, swap.id));
    await logActivity(me, "product.image_reorder", "product", productId);
  });
  flash(`/admin/products/${productId}#images`, err ? undefined : "Order updated.", err ?? undefined);
}

export async function deleteProductImageAction(formData: FormData) {
  const me = await requireAdmin("catalog");
  const imageId = asStr(formData.get("imageId"));
  const productId = asStr(formData.get("productId"));
  const err = await safe(async () => {
    const rows = await db.select().from(productImages).where(eq(productImages.id, imageId)).limit(1);
    if (rows[0]) {
      await db.delete(productImages).where(eq(productImages.id, imageId));
      await removeUploadFile(rows[0].url);
      await logActivity(me, "product.image_delete", "product", productId);
    }
  });
  flash(`/admin/products/${productId}#images`, err ? undefined : "Image removed.", err ?? undefined);
}

/* ───────────────────────── Inventory ───────────────────────── */

const STOCK_REASONS = ["receipt", "correction", "damage", "sample", "other"] as const;

export async function adjustStockAction(formData: FormData) {
  const me = await requireAdmin("inventory");
  const productId = asStr(formData.get("productId"));
  const delta = asInt(formData.get("delta"), 0);
  const reason = asStr(formData.get("reason"));
  const note = asStr(formData.get("note"));
  if (delta === 0) return flash("/admin/inventory", undefined, "Adjustment must be a non-zero number (e.g. 24 or −6).");
  if (!STOCK_REASONS.includes(reason as (typeof STOCK_REASONS)[number]))
    return flash("/admin/inventory", undefined, "Choose a reason for the adjustment.");

  const err = await safe(async () => {
    const rows = await db.select().from(products).where(eq(products.id, productId)).limit(1);
    const current = rows[0];
    if (!current) throw new Error("not found");
    const next = current.stock + delta;
    if (next < 0) throw new Error(`Only ${current.stock} in stock — cannot remove ${Math.abs(delta)}.`);
    await db.update(products).set({ stock: next, updatedAt: new Date() }).where(eq(products.id, productId));
    await db.insert(stockMovements).values({ productId, delta, reason, note: note || null, adminId: me.id });
    await logActivity(me, "inventory.adjust", "product", productId, `${delta > 0 ? "+" : ""}${delta} (${reason})`);
  }, "Adjustment failed — stock cannot go below zero.");
  flash("/admin/inventory", err ? undefined : "Stock updated.", err ?? undefined);
}
