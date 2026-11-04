import "dotenv/config";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { db } from "../src/db";
import { productImages } from "../src/db/schema";

/**
 * Media pipeline — uploads all 16 supplied 1:1 product photos
 * (plus editorial imagery) to Supabase Storage (bucket: product-media) and
 * rewrites product_images rows to the public CDN URLs, preserving position/alt.
 *
 * Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * Usage:    npx tsx scripts/upload-media.ts
 */
const BUCKET = "product-media";

const FILES = [
  ...["signature-milk", "signature-dark", "crunchy-nut", "pistachio-filled"].flatMap((s) =>
    [1, 2, 3, 4].map((n) => `products/${s}-${n}.webp`),
  ),
  "hero.webp", "gifting.webp",
];

async function main() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
    process.exit(1);
  }

  // Ensure the bucket exists (public read; uploads via service key only).
  const bucketRes = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ id: BUCKET, name: BUCKET, public: true }),
  });
  if (!bucketRes.ok && bucketRes.status !== 409) {
    console.error("bucket:", bucketRes.status, await bucketRes.text());
    process.exit(1);
  }

  const mapping = new Map<string, string>();
  for (const rel of FILES) {
    const local = path.join(process.cwd(), "public", "images", rel);
    const body = await readFile(local);
    const dest = `${rel}`;
    const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${dest}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "image/webp", "x-upsert": "true" },
      body,
    });
    if (!res.ok) {
      console.error(`✗ ${rel}:`, res.status, await res.text());
      continue;
    }
    const publicUrl = `${url}/storage/v1/object/public/${BUCKET}/${dest}`;
    mapping.set(`/images/${rel}`, publicUrl);
    console.log(`+ ${rel} → ${publicUrl}`);
  }

  // Rewrite image URLs in the database (metadata stays as rows; url becomes CDN).
  const rows = await db.select().from(productImages);
  for (const row of rows) {
    const next = mapping.get(row.url);
    if (next) await db.update(productImages).set({ url: next }).where(eq(productImages.id, row.id));
  }
  console.log("Database product_images rows re-pointed to Supabase CDN. Done.");
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
