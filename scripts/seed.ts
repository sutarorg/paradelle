import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { admins, coupons, productImages, products, settings, shippingRules } from "../src/db/schema";
import { PRODUCTS } from "../src/lib/products";
import { hashPassword } from "../src/lib/password";

/**
 * Phase 1→2 seed: the four signature products (with their generated mockups),
 * default coupons, shipping settings and the initial Super Admin.
 * Idempotent — re-running never overwrites admin edits (onConflict do nothing).
 */
async function main() {
  // Products
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const existing = await db.select({ id: products.id }).from(products).where(eq(products.slug, p.slug)).limit(1);
    if (existing.length > 0) {
      console.log(`· product ${p.slug} already seeded`);
      continue;
    }
    const inserted = await db
      .insert(products)
      .values({
        sku: `PDL-${p.slug.toUpperCase().replace(/-/g, "")}`,
        slug: p.slug,
        name: p.name,
        shortName: p.shortName,
        line: p.line,
        status: "active",
        cocoaPercent: p.cocoaPercent,
        weightGrams: p.weightGrams,
        price: p.price,
        mrp: p.price,
        stock: 60,
        lowStockThreshold: 12,
        tagline: p.tagline,
        description: p.description,
        tastingNotes: p.tastingNotes,
        ingredients: p.ingredients,
        allergens: p.allergens,
        crossContact: p.crossContact,
        nutrition: p.nutritionPer100g,
        storage: p.storage,
        shippingNote: p.shippingNote,
        accent: p.accent,
        sort: i,
      })
      .returning({ id: products.id });
    await db.insert(productImages).values([
      { productId: inserted[0].id, url: p.images.front, alt: `${p.name} — sealed wrapper`, position: 0 },
      { productId: inserted[0].id, url: p.images.angle, alt: `${p.name} — three-quarter view`, position: 1 },
    ]);
    console.log(`+ seeded ${p.name} (60 bars, 2 mockups linked)`);
  }

  // Coupons
  for (const c of [
    { code: "WELCOME10", value: 10, minSubtotal: 0, description: "10% welcome treat on your first order" },
    { code: "GIFT250", value: 5, minSubtotal: 150000, description: "5% off gifting orders above ₹1,500" },
  ]) {
    const existing = await db.select({ code: coupons.code }).from(coupons).where(eq(coupons.code, c.code)).limit(1);
    if (existing.length === 0) {
      await db.insert(coupons).values({ ...c, kind: "percent" });
      console.log(`+ coupon ${c.code}`);
    }
  }

  // Shipping settings (paise) + primary shipping rule row
  for (const [key, value] of [
    ["shipping.flat_fee", "9900"],
    ["shipping.free_threshold", "150000"],
    ["store.legal_name", "PARADELLE CHOCOLATES"],
    ["store.support_email", "hello@paradelle.store"],
  ] as const) {
    const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
    if (existing.length === 0) {
      await db.insert(settings).values({ key, value });
      console.log(`+ setting ${key}=${value}`);
    }
  }

  // Primary shipping rule (paise)
  const ruleRows = await db.select().from(shippingRules).limit(1);
  if (ruleRows.length === 0) {
    await db.insert(shippingRules).values({ name: "Standard (all India)", flatFeePaise: 9900, freeThresholdPaise: 150000, active: true });
    console.log("+ shipping rule row");
  }

  // Super Admin (default credentials from the brief — change after first sign-in)
  const adminEmail = "admin@paradelle.store";
  const existingAdmin = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, adminEmail)).limit(1);
  if (existingAdmin.length === 0) {
    await db.insert(admins).values({
      name: "House Admin",
      email: adminEmail,
      passwordHash: await hashPassword("Iskcon@098"),
      role: "super",
      permissions: [],
    });
    console.log("+ super admin admin@paradelle.store created");
  } else {
    console.log("· super admin exists (password unchanged)");
  }

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
