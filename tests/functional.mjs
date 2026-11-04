#!/usr/bin/env node
/** Phase 4 — functional battery. Node 20+ fetch against the live server. */
const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";

let pass = 0, fail = 0;
const failures = [];
function record(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name} ${detail}`); }
}
async function get(path, opts = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", ...opts });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}
async function post(path, body, opts = {}) {
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, text: await res.text() };
}
async function getAdminToken() {
  // Test-only backdoor: seed a session row directly (documented; never shipped in prod paths).
  const { execSync } = await import("node:child_process");
  const token = `phase4-${Date.now()}`;
  execSync(
    `psql -t -A postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "INSERT INTO admin_sessions (token, admin_id, expires_at) SELECT '${token}', id, now()+interval '1 hour' FROM admins WHERE email='admin@paradelle.store';"`,
  );
  return token;
}

const adminCookie = () => ({ headers: { Cookie: `paradelle_admin=${ADMIN}` } });
let ADMIN = "";

console.log(`\n■ Public pages (against ${BASE})`);
const pages = [
  ["/", "true indulgence"],
  ["/collection", "Four signatures"],
  ["/product/signature-milk", "Signature Milk Chocolate"],
  ["/product/signature-dark", "Signature Dark Chocolate"],
  ["/product/crunchy-nut", "Crunchy Nut Chocolate"],
  ["/product/pistachio-filled", "Pistachio Filled Chocolate"],
  ["/cart", "The bag"],
  ["/checkout", "Checkout"],
  ["/our-story", "Our Story"],
  ["/craftsmanship", "Craftsmanship"],
  ["/contact", "answer"],
  ["/faqs", "Frequently asked"],
  ["/legal/shipping", "Shipping Policy"],
  ["/legal/refunds", "Refund"],
  ["/legal/privacy", "Privacy Policy"],
  ["/legal/terms", "Terms of Service"],
  ["/login", "Sign in"],
  ["/register", "Create your account"],
];
for (const [path, marker] of pages) {
  const r = await get(path);
  record(`GET ${path}`, r.status === 200 && r.text.includes(marker), `(${r.status}, marker "${marker}")`);
}
{
  const r = await get("/definitely-not-a-page");
  record("404 page renders", r.status === 404 && r.text.includes("melted"), `(${r.status})`);
}

console.log("\n■ Public API behaviour");
{
  let r = await get("/api/health");
  record("health", r.status === 200 && r.text.includes('"ok":true'), `(${r.status})`);

  r = await get("/api/products");
  record("products list", r.status === 200 && JSON.parse(r.text).count === 4, `(${r.status})`);

  r = await get("/api/products?q=pistachio");
  record("product search", JSON.parse(r.text).count === 1, `(${r.status})`);

  r = await get("/api/products?q=unicorn");
  record("search empty is honest", JSON.parse(r.text).count === 0);

  r = await post("/api/newsletter", { email: "nope" });
  record("newsletter rejects bad email", r.status === 400, `(${r.status})`);

  r = await post("/api/newsletter", { email: "phase4@test.in" });
  record("newsletter accepts valid email", r.status === 200, `(${r.status})`);

  r = await post("/api/newsletter", { email: "phase4@test.in" });
  record("newsletter duplicate is graceful", r.status === 200, `(${r.status})`);

  r = await post("/api/contact", { name: "T", email: "t@t.in", message: "short" });
  record("contact enforces message length", r.status === 400, `(${r.status})`);

  r = await post("/api/contact", { name: "QA Tester", email: "qa@test.in", message: "<script>alert(1)</script> — is this stored safely?" });
  record("contact accepts (and stores) a would-be XSS probe for later render check", r.status === 200, `(${r.status})`);

  r = await get("/api/cart");
  record("cart answers anonymously (no console 401)", r.status === 200 && JSON.parse(r.text).anonymous === true, `(${r.status})`);

  r = await fetch(BASE + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: [] }) });
  record("checkout rejects empty bag", r.status === 400, `(${r.status})`);

  r = await post("/api/checkout", { items: [{ slug: "signature-milk", qty: 1 }], customer: { email: "x@test.in", name: "X T", phone: "9876543210", line1: "1 A St", city: "Pune", state: "MH", pincode: "12ab" } });
  record("checkout rejects invalid PIN", r.status === 400 && r.text.includes("PIN"), `(${r.status}) ${r.text.slice(0, 80)}`);

  r = await post("/api/checkout", { items: [{ slug: "signature-milk", qty: 1 }], coupon: "FAKE123", customer: { email: "x@test.in", name: "X T", phone: "9876543210", line1: "1 A St", city: "Pune", state: "MH", pincode: "411001" } });
  record("checkout rejects fake coupon", r.status === 400 && r.text.includes("not valid"), `(${r.status})`);

  r = await post("/api/checkout", { items: [{ slug: "signature-milk", qty: 999 }], customer: { email: "x@test.in", name: "X T", phone: "9876543210", line1: "1 A St", city: "Pune", state: "MH", pincode: "411001" } });
  record("oversell is blocked (stock guard)", r.status === 400 && (r.text.includes("remain") || r.text.includes("qty")), `(${r.status}) ${r.text.slice(0, 80)}`);

  r = await fetch(BASE + "/api/checkout/razorpay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderNumber: "PDL-AAAAAA" }) });
  record("razorpay create: unknown order 404s", r.status === 404, `(${r.status})`);

  r = await post("/api/checkout/verify", { orderNumber: "PDL-AAAAAA", razorpay_order_id: "order_x", razorpay_payment_id: "pay_x", razorpay_signature: "fraudulent_signature_123456" });
  record("verify: fabricated callback rejected", r.status === 503 || r.status === 400, `(${r.status})`);
}

console.log("\n■ Auth boundaries");
{
  let r = await get("/admin");
  record("/admin redirects anonymous", r.status === 307, `(${r.status})`);
  r = await get("/admin/api/export/orders");
  record("export requires admin session", r.status === 401, `(${r.status})`);
  r = await get("/admin/api/reports/summary");
  record("reports requires admin session", r.status === 401, `(${r.status})`);
  r = await get("/account");
  record("/account redirects anonymous", r.status === 307, `(${r.status})`);
}

console.log("\n■ Admin surface (with session)");
ADMIN = await getAdminToken();
const adminPages = ["", "/orders", "/products", "/inventory", "/customers", "/coupons", "/content", "/shipping", "/pincodes", "/reports", "/activity", "/staff", "/settings"];
for (const p of adminPages) {
  const r = await get(`/admin${p}`, adminCookie());
  record(`GET /admin${p || " (overview)"}`, r.status === 200, `(${r.status})`);
}
{
  const r = await get("/admin/api/export/orders", adminCookie());
  record("CSV export streams with session", r.status === 200 && r.text.includes("order,created,customer"), `(${r.status})`);
  const s = await get("/admin/api/reports/summary?range=30", adminCookie());
  const json = JSON.parse(s.text);
  record("reports summary JSON", s.status === 200 && json.ok === true && typeof json.revenue === "number", `(${s.status})`);
}

console.log(`\n══════════════════════════════════\n  ${pass} passed, ${fail} failed\n══════════════════════════════════`);
process.exit(fail ? 1 : 0);
