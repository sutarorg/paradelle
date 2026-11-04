#!/usr/bin/env node
/** Phase 4 — security battery (OWASP-oriented probes; no destructive payloads). */
import { execSync } from "node:child_process";
const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";

let pass = 0, fail = 0;
function record(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.log(`  FAIL  ${name} ${detail}`); }
}
async function req(path, init) {
  const res = await fetch(BASE + path, { redirect: "manual", ...init });
  return { status: res.status, text: await res.text(), headers: res.headers };
}
const token = `sec-${Date.now()}`;
execSync(`psql -t -A postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "INSERT INTO admin_sessions (token, admin_id, expires_at) SELECT '${token}', id, now()+interval '1 hour' FROM admins WHERE email='admin@paradelle.store';" >/dev/null`);
const staffToken = `staff-${Date.now()}`;
execSync(`psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "DELETE FROM admins WHERE email='limited@paradelle.store';" >/dev/null`);
execSync(`psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "INSERT INTO admins (name,email,password_hash,role,permissions) VALUES ('Limited Staff','limited@paradelle.store','x:x','staff',ARRAY['reports']) RETURNING id;" >/dev/null`);
const staffId = execSync(`psql -t -A postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "SELECT id FROM admins WHERE email='limited@paradelle.store';"`).toString().trim();
execSync(`psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "INSERT INTO admin_sessions (token, admin_id, expires_at) VALUES ('${staffToken}','${staffId}',now()+interval '1 hour');" >/dev/null`);

console.log("■ Injection & XSS");
{
  let r = await req(`/api/products?q=${encodeURIComponent("' OR '1'='1")}`);
  record("SQLi in product search is inert", r.status === 200 && JSON.parse(r.text).count === 0, `(${r.status})`);

  r = await req(`/admin/api/export/orders?q=${encodeURIComponent("x%' OR '1'='1")}`, { headers: { cookie: `paradelle_admin=${token}` } });
  record("SQLi in export filter inert", r.status === 200 && r.text.split("\n").length <= 2, `(${r.status}, rows=${r.text.split("\n").length})`);

  // XSS probe stored earlier by functional battery
  r = await req("/admin/customers", { headers: { cookie: `paradelle_admin=${token}` } });
  const escaped = r.text.includes("&lt;script&gt;") || r.text.includes("&amp;lt;script") || !r.text.includes("<script>alert(1)");
  record("stored contact probe renders escaped (React output encoding)", escaped && r.status === 200);
  record("no executable <script>alert payload in admin HTML", !r.text.includes("<script>alert(1)</script> — is this stored safely?"));
}

console.log("\n■ AuthN/AuthZ");
{
  let r = await req("/admin/staff", { headers: { cookie: `paradelle_admin=${staffToken}` } });
  record("staff without 'staff' permission is redirected", r.status === 307, `(${r.status})`);
  r = await req("/admin/reports", { headers: { cookie: `paradelle_admin=${staffToken}` } });
  record("staff WITH 'reports' permission passes", r.status === 200, `(${r.status})`);
  r = await req("/api/checkout/verify", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderNumber: "PDL-BF0001", razorpay_order_id: "order_axiom", razorpay_payment_id: "pay_axiom", razorpay_signature: "9".repeat(64) }) });
  record("fabricated Razorpay signature rejected", [400, 503].includes(r.status), `(${r.status})`);
}

console.log("\n■ Rate limiting");
{
  let last = 0;
  for (let i = 0; i < 8; i++) {
    const r = await req("/api/newsletter", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: `burst${i}@test.in` }) });
    last = r.status;
  }
  record("newsletter flood is throttled (429 within 8 rapid posts)", last === 429, `(last=${last})`);
}

console.log("\n■ Webhook edge cases");
{
  let r = await req("/api/webhooks/razorpay", { method: "POST", headers: { "content-type": "application/json" }, body: "{\"event\":\"payment.captured\"}" });
  record("missing signature rejected", r.status === 401, `(${r.status})`);
  r = await req("/api/webhooks/razorpay", { method: "POST", headers: { "content-type": "application/json" }, body: "not json at all" });
  record("garbage body rejected", [400, 401].includes(r.status), `(${r.status})`);
}

console.log("\n■ Secrets exposure");
{
  const pages = ["/", "/collection", "/product/signature-milk", "/checkout", "/admin/login"];
  let leaked = false;
  for (const p of pages) {
    const r = await req(p);
    if (/RAZORPAY_KEY_SECRET|whsec_|SUPABASE_SERVICE_ROLE|DATABASE_URL/.test(r.text)) leaked = p;
  }
  record("no server secrets in public HTML", !leaked, leaked ? `leak on ${leaked}` : "");
  const grep = execSync(`grep -rEl "whsec_sandbox_test_key|RAZORPAY_KEY_SECRET=|SUPABASE_SERVICE_ROLE_KEY=" .next/static node_modules/.cache 2>/dev/null || true`).toString().trim();
  record("no secrets baked into static client bundles", grep === "", grep ? grep : "");
}

execSync(`psql postgresql://postgres:postgres@127.0.0.1:5432/app_db -c "DELETE FROM admin_sessions WHERE token IN ('${token}','${staffToken}'); DELETE FROM admins WHERE email='limited@paradelle.store'; DELETE FROM newsletter_subscribers WHERE email LIKE 'burst%';" >/dev/null`);
console.log(`\n══════════════════════════════════\n  ${pass} passed, ${fail} failed\n══════════════════════════════════`);
process.exit(fail ? 1 : 0);
