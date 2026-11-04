import { asc, desc, eq, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import { inventoryReservations, orders, orderItems, productImages, products, settings, shippingRules } from "@/db/schema";
import { PRODUCTS, type Product } from "@/lib/products";
import { FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING_FEE } from "@/lib/commerce";

/**
 * Catalogue access layer (Phase 2).
 * The database is the source of truth (admin-editable). `PRODUCTS` from
 * lib/products remains as the seed + offline fallback so the storefront can
 * never break if the database is unreachable.
 */

export type CatalogProduct = Product & {
  id: string;
  sku: string;
  status: "active" | "draft" | "archived";
  stock: number;
  lowStockThreshold: number;
  mrp: number;
  seoTitle: string;
  seoDescription: string;
  sort: number;
  fssaiLicense: string;
  manufacturer: string;
  countryOfOrigin: string;
  bestBeforeMonths: number;
  netQuantityLabel: string;
  imageList: { id: string; url: string; alt: string; position: number }[];
};

export function dbToCatalogProduct(
  row: typeof products.$inferSelect,
  images: (typeof productImages.$inferSelect)[],
): CatalogProduct {
  const fallback = PRODUCTS.find((p) => p.slug === row.slug);
  const imgs = [...images].sort((a, b) => a.position - b.position).map((i) => ({ id: i.id, url: i.url, alt: i.alt, position: i.position }));
  return {
    id: row.id,
    sku: row.sku,
    status: row.status as CatalogProduct["status"],
    slug: row.slug,
    name: row.name,
    shortName: row.shortName,
    line: row.line,
    cocoaPercent: row.cocoaPercent,
    weightGrams: row.weightGrams,
    price: row.price,
    mrp: row.mrp,
    stock: row.stock,
    lowStockThreshold: row.lowStockThreshold,
    tagline: row.tagline,
    description: row.description,
    tastingNotes: row.tastingNotes ?? [],
    ingredients: row.ingredients ?? [],
    allergens: row.allergens ?? [],
    crossContact: row.crossContact,
    nutritionPer100g: row.nutrition,
    storage: row.storage || fallback?.storage || "",
    shippingNote: row.shippingNote || fallback?.shippingNote || "",
    accent: row.accent,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    sort: row.sort,
    fssaiLicense: row.fssaiLicense,
    manufacturer: row.manufacturer,
    countryOfOrigin: row.countryOfOrigin,
    bestBeforeMonths: row.bestBeforeMonths,
    netQuantityLabel: row.netQuantityLabel,
    imageList: imgs,
    images: {
      front: imgs[0]?.url ?? fallback?.images.front ?? "/images/products/milk-front.webp",
      angle: imgs[1]?.url ?? imgs[0]?.url ?? fallback?.images.angle ?? "/images/products/milk-angle.webp",
    },
  };
}

async function attachImages(rows: (typeof products.$inferSelect)[]): Promise<CatalogProduct[]> {
  if (rows.length === 0) return [];
  const imgs = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, rows.map((r) => r.id)))
    .orderBy(asc(productImages.position));
  return rows.map((r) => dbToCatalogProduct(r, imgs.filter((i) => i.productId === r.id)));
}

/** Storefront catalogue — active products only. Falls back to the static seed catalogue. */
export async function getCatalog(): Promise<CatalogProduct[]> {
  try {
    const rows = await db.select().from(products).where(eq(products.status, "active")).orderBy(asc(products.sort));
    if (rows.length === 0) return seedAsCatalog();
    return await attachImages(rows);
  } catch {
    return seedAsCatalog();
  }
}

/**
 * Product detail lookup uses the same storefront catalogue as collection cards.
 * In particular, when the database is empty, getCatalog() intentionally serves
 * the seed catalogue; looking up the product directly in the database here used
 * to turn those visible product links into 404s.
 */
export async function getCatalogProduct(slug: string): Promise<CatalogProduct | undefined> {
  const catalog = await getCatalog();
  return catalog.find((product) => product.slug === slug);
}

/** Admin catalogue — every status, no fallback. */
export async function getAdminCatalog(): Promise<CatalogProduct[]> {
  const rows = await db.select().from(products).orderBy(asc(products.sort));
  return attachImages(rows);
}

export async function getAdminProduct(id: string): Promise<CatalogProduct | undefined> {
  const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return rows[0] ? (await attachImages([rows[0]]))[0] : undefined;
}

function seedAsCatalog(): CatalogProduct[] {
  return PRODUCTS.map((p, i) => ({
    ...p,
    id: `seed-${p.slug}`,
    sku: `PDL-${p.slug.toUpperCase().replace(/-/g, "")}`,
    status: "active" as const,
    stock: 0,
    lowStockThreshold: 12,
    mrp: p.price,
    seoTitle: "",
    seoDescription: "",
    sort: i,
    fssaiLicense: "",
    manufacturer: "",
    countryOfOrigin: "India",
    bestBeforeMonths: 12,
    netQuantityLabel: `${p.weightGrams} g`,
    imageList: [],
  }));
}

/* ─────────────────────────── Inventory math ─────────────────────────── */

/**
 * Units locked by live stock reservations (payment-pending orders).
 * Lazily releases expired holds, then sums the active ones.
 */
export async function getReservedByProduct(): Promise<Record<string, number>> {
  try {
    await db
      .update(inventoryReservations)
      .set({ released: true })
      .where(sql`${inventoryReservations.released} = false and ${inventoryReservations.expiresAt} <= now()`);
    const rows = await db
      .select({ productId: inventoryReservations.productId, qty: sql<number>`coalesce(sum(${inventoryReservations.qty}),0)::int` })
      .from(inventoryReservations)
      .innerJoin(products, eq(products.id, inventoryReservations.productId))
      .where(eq(inventoryReservations.released, false))
      .groupBy(inventoryReservations.productId);
    const byId = new Map(rows.map((r) => [r.productId, Number(r.qty)]));
    const slugRows = await db.select({ id: products.id, slug: products.slug }).from(products);
    return Object.fromEntries(slugRows.map((p) => [p.slug, byId.get(p.id) ?? 0]));
  } catch {
    // Fallback: derive reservations from payment-pending order lines
    const rows = await db
      .select({ slug: orderItems.slug, qty: sql<number>`coalesce(sum(${orderItems.qty}),0)::int` })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(eq(orders.status, "payment_pending"))
      .groupBy(orderItems.slug);
    return Object.fromEntries(rows.map((r) => [r.slug, Number(r.qty)]));
  }
}

/** Units sold in confirmed orders. `since` narrows the window. */
export async function getSoldByProduct(since?: Date): Promise<Record<string, number>> {
  const conditions = [inArray(orders.status, ["paid", "crafting", "shipped", "delivered"])];
  if (since) conditions.push(sql`${orders.createdAt} >= ${since}`);
  const rows = await db
    .select({ slug: orderItems.slug, qty: sql<number>`coalesce(sum(${orderItems.qty}),0)::int` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(sql.join(conditions, sql` and `))
    .groupBy(orderItems.slug);
  return Object.fromEntries(rows.map((r) => [r.slug, Number(r.qty)]));
}

/* ─────────────────────────── Store settings ─────────────────────────── */

export type ShippingSettings = { flatFee: number; freeThreshold: number };

/** Paise. Active shipping_rules row wins; legacy settings keys are the fallback. */
export async function getShippingSettings(): Promise<ShippingSettings> {
  try {
    const ruleRows = await db
      .select()
      .from(shippingRules)
      .where(eq(shippingRules.active, true))
      .orderBy(desc(shippingRules.updatedAt))
      .limit(1);
    if (ruleRows[0]) return { flatFee: ruleRows[0].flatFeePaise, freeThreshold: ruleRows[0].freeThresholdPaise };
  } catch { /* table may not exist yet */ }
  try {
    const rows = await db.select().from(settings).where(inArray(settings.key, ["shipping.flat_fee", "shipping.free_threshold"]));
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    return {
      flatFee: Math.max(0, parseInt(map["shipping.flat_fee"] ?? "", 10) || FLAT_SHIPPING_FEE),
      freeThreshold: Math.max(0, parseInt(map["shipping.free_threshold"] ?? "", 10) || FREE_SHIPPING_THRESHOLD),
    };
  } catch {
    return { flatFee: FLAT_SHIPPING_FEE, freeThreshold: FREE_SHIPPING_THRESHOLD };
  }
}
