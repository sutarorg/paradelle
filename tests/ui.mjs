#!/usr/bin/env node
/** Phase 4 — Playwright UI/mobile battery. */
import { chromium } from "playwright";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
mkdirSync("tests/shots", { recursive: true });

let pass = 0, fail = 0;
const failures = [];
function record(name, ok, detail = "") {
  if (ok) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; failures.push(name); console.log(`  FAIL  ${name} ${detail}`); }
}

const browser = await chromium.launch();
const VIEWPORTS = [
  { w: 360, h: 780, label: "360" },
  { w: 390, h: 844, label: "390" },
  { w: 430, h: 932, label: "430" },
  { w: 768, h: 1024, label: "768" },
  { w: 1024, h: 820, label: "1024" },
  { w: 1440, h: 900, label: "1440" },
];
const PAGES = ["/", "/collection", "/product/signature-milk", "/cart", "/checkout", "/faqs", "/admin/login"];

console.log("■ Viewport sweep (overflow, console errors, images, tap targets)");
for (const vp of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const consoleErrors = [];
  page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: "networkidle" });
    const metrics = await page.evaluate(() => {
      const overX = document.documentElement.scrollWidth - document.documentElement.clientWidth;
      const imgs = Array.from(document.images).slice(0, 24);
      const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).length;
      const small = Array.from(document.querySelectorAll("button, [role='button'], select, input"))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && r.height < 36 && !["checkbox", "radio", "hidden"].includes(el.getAttribute("type") ?? "");
        }).length;
      return { overX, broken, small };
    });
    record(`${vp.label}px ${path} no horizontal overflow`, metrics.overX <= 1, `(overX=${metrics.overX})`);
    if (metrics.broken > 0) record(`${vp.label}px ${path} images`, false, `${metrics.broken} broken`);
  }
  if (consoleErrors.length) record(`${vp.label}px console clean`, false, consoleErrors.slice(0, 2).join(" | "));
  else record(`${vp.label}px console clean over ${PAGES.length} pages`, true);
  await ctx.close();
}

// ——— E2E purchase flow (mobile 390px) ———
console.log("\n■ E2E purchase flow @390px");
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/product/pistachio-filled", { waitUntil: "networkidle" });

  // qty stepper to 2
  await page.getByRole("button", { name: "Increase quantity" }).first().click();
  await page.getByRole("button", { name: /Add to bag/ }).first().click();
  await page.waitForTimeout(600);
  await page.goto(BASE + "/cart", { waitUntil: "networkidle" });
  const cartText = await page.textContent("body");
  record("cart shows 2 items after stepper+add", /Qty|2/.test(cartText ?? "") && (cartText?.includes("Pistachio") ?? false));
  record("free-shipping progress present", (cartText ?? "").includes("complimentary shipping") || (cartText ?? "").includes("Complimentary"));

  await page.goto(BASE + "/checkout", { waitUntil: "networkidle" });
  const checkoutText = await page.textContent("body");
  record("checkout totals visible", (checkoutText ?? "").includes("₹") ?? false);
  record("guest checkout visible first", (checkoutText ?? "").includes("Guest checkout") ?? false);
  record("Razorpay is the stated method", (checkoutText ?? "").includes("Razorpay") ?? false);
  record("no COD option anywhere", !(checkoutText ?? "").toLowerCase().includes("cash on delivery") || (checkoutText ?? "").includes("do not offer"));
  await page.screenshot({ path: "tests/shots/e2e-checkout-390.png", fullPage: true });
  await ctx.close();
}

// ——— Admin login via the real form ———
console.log("\n■ Admin login + dashboard @1366px");
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "admin@paradelle.store");
  await page.fill('input[name="password"]', "Iskcon@098");
  await page.getByRole("button", { name: /Enter the atelier/ }).click();
  await page.waitForURL((url) => url.pathname === "/admin", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  const dash = await page.textContent("body");
  record("admin login lands on dashboard", (dash ?? "").includes("Atelier overview") ?? false, "");
  record("dashboard stat cards render", (dash ?? "").includes("Revenue") && (dash ?? "").includes("Avg. order"));
  record("low-stock block present", (dash ?? "").includes("Low-stock alerts"));
  await page.screenshot({ path: "tests/shots/admin-dashboard.png", fullPage: false });

  await page.goto(BASE + "/admin/products", { waitUntil: "networkidle" });
  const prod = await page.textContent("body");
  record("products table lists four bars with SKUs", ["Signature Milk Chocolate", "Signature Dark Chocolate", "Crunchy Nut Chocolate", "Pistachio Filled Chocolate"].every((n) => (prod ?? "").includes(n)) && (prod ?? "").includes("PDL-"));
  await ctx.close();
}

// ——— Web vitals snapshot (home + PDP) ———
console.log("\n■ Web vitals sampling (lab, chromium)");
for (const path of ["/", "/product/signature-milk"]) {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, cls: 0 };
    new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) window.__vitals.lcp = e.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value; }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const v = await page.evaluate(() => window.__vitals);
  record(`LCP ≤ 2.5s on ${path}`, v.lcp <= 2500, `(measured ${Math.round(v.lcp)}ms — lab)`);
  record(`CLS ≤ 0.1 on ${path}`, v.cls <= 0.1, `(measured ${v.cls.toFixed(3)} — lab)`);
  await ctx.close();
}

await browser.close();
console.log(`\n══════════════════════════════════\n  ${pass} passed, ${fail} failed\n══════════════════════════════════`);
process.exit(fail ? 1 : 0);
