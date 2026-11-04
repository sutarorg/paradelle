import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { admins, coupons, productImages, products, settings, shippingRules } from "../src/db/schema";
import { PRODUCTS } from "../src/lib/products";
import { hashPassword } from "../src/lib/password";

/**
 * Phase 1→2 seed: the four signature products (with their supplied photo galleries),
 * default coupons, shipping settings and an optional initial Super Admin.
 * Idempotent — re-running never overwrites existing admin credentials.
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
    await db.insert(productImages).values(
      p.images.gallery.map((url, position) => ({
        productId: inserted[0].id,
        url,
        alt: `${p.name} — product photograph ${position + 1}`,
        position,
      })),
    );
    console.log(`+ seeded ${p.name} (60 bars, ${p.images.gallery.length} product photos linked)`);
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
    ["shipping.free_threshold", "49900"],
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
    await db.insert(shippingRules).values({ name: "Standard (all India)", flatFeePaise: 9900, freeThresholdPaise: 49900, active: true });
    console.log("+ shipping rule row");
  }

  // Super Admin — credentials must be provided out-of-band; no default password is stored in source.
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@paradelle.store").trim().toLowerCase();
  const initialAdminPassword = process.env.ADMIN_INITIAL_PASSWORD;
  const existingAdmin = await db.select({ id: admins.id }).from(admins).where(eq(admins.email, adminEmail)).limit(1);
  if (existingAdmin.length === 0) {
    if (!initialAdminPassword) {
      console.warn("! Super Admin not created. Set ADMIN_INITIAL_PASSWORD securely and rerun the seed.");
    } else if (initialAdminPassword.length < 12) {
      throw new Error("ADMIN_INITIAL_PASSWORD must be at least 12 characters.");
    } else {
      await db.insert(admins).values({
        name: "House Admin",
        email: adminEmail,
        passwordHash: await hashPassword(initialAdminPassword),
        role: "super",
        permissions: [],
      });
      console.log(`+ Super Admin created for ${adminEmail}`);
    }
  } else {
    console.log(`· Super Admin ${adminEmail} exists (password unchanged)`);
  }

  console.log("Seed complete.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
