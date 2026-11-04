import { NextRequest, NextResponse } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { getReservedByProduct } from "@/lib/catalog";
import { clientKey, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Public catalogue + search API (?q= handles name, notes, ingredients; ?sort=price-asc…). */
export async function GET(req: NextRequest) {
  const rl = rateLimit(clientKey(req, "products"), 60, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false, message: "Rate limited." }, { status: 429 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().toLowerCase();
  const sort = req.nextUrl.searchParams.get("sort") ?? "featured";
  const [catalog, reserved] = await Promise.all([getCatalog(), getReservedByProduct()]);

  let list = catalog.filter(
    (p) =>
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.tagline.toLowerCase().includes(q) ||
      p.tastingNotes.some((t) => t.toLowerCase().includes(q)) ||
      p.ingredients.join(" ").toLowerCase().includes(q),
  );
  if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
  if (sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({
    ok: true,
    count: list.length,
    products: list.map((p) => ({
      slug: p.slug,
      name: p.name,
      tagline: p.tagline,
      pricePaise: p.price,
      mrpPaise: p.mrp,
      weightGrams: p.weightGrams,
      cocoaPercent: p.cocoaPercent,
      available: Math.max(0, p.stock - (reserved[p.slug] ?? 0)),
      images: p.images,
    })),
  });
}
