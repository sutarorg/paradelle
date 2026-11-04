/**
 * Lightweight in-memory sliding-window rate limiter for API routes.
 * Production on Vercel should swap the store for Upstash Redis (documented in
 * docs/BACKEND.md) — the call-site contract stays identical.
 */
const buckets = new Map<string, { reset: number; count: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.reset < now) {
    buckets.set(key, { reset: now + windowMs, count: 1 });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.count >= limit) return { ok: false, retryAfterSec: Math.ceil((b.reset - now) / 1000) };
  b.count += 1;
  return { ok: true, retryAfterSec: 0 };
}

// Periodic sweep so Maps don't grow unbounded on long-lived servers.
if (typeof globalThis !== "undefined") {
  const g = globalThis as typeof globalThis & { __paradelleRlSweep?: boolean };
  if (!g.__paradelleRlSweep) {
    g.__paradelleRlSweep = true;
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of buckets) if (v.reset < now) buckets.delete(k);
    }, 60_000).unref?.();
  }
}

export function clientKey(req: Request, scope: string): string {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = fwd || req.headers.get("x-real-ip") || "local";
  return `${scope}:${ip}`;
}
