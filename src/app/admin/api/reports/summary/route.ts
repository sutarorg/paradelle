import { NextRequest, NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin-auth";
import { getDashboard } from "@/lib/admin/queries";
import { clientKey, rateLimit } from "@/lib/ratelimit";

export const dynamic = "force-dynamic";

/** Machine-readable dashboard summary (same data as /admin) for Phase 4 tests. */
export async function GET(req: NextRequest) {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ ok: false }, { status: 401 });
  const rl = rateLimit(clientKey(req, "report"), 30, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: false }, { status: 429 });
  const range = req.nextUrl.searchParams.get("range") ?? "30";
  const data = await getDashboard(range);
  return NextResponse.json({ ok: true, range, paise: true, ...data, recentOrders: undefined, series: data.series });
}
