import { chromium } from "playwright";
const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";
const email = process.env.ADMIN_TEST_EMAIL;
const password = process.env.ADMIN_TEST_PASSWORD;
if (!email || !password) { console.error("Set ADMIN_TEST_EMAIL and ADMIN_TEST_PASSWORD in the test environment."); process.exit(1); }
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("response", (r) => { if (r.request().method() === "POST") console.log("POST", r.url(), "→", r.status()); });
await page.goto(BASE + "/admin/login", { waitUntil: "networkidle" });
await page.fill('input[name="email"]', email);
await page.fill('input[name="password"]', password);
await page.getByRole("button", { name: /Enter the atelier/ }).click();
await page.waitForTimeout(5000);
console.log("URL now:", page.url());
const body = (await page.textContent("body")) ?? "";
console.log("error visible:", body.match(/Invalid credentials[^*]{0,60}/)?.[0] ?? body.match(/Too many[^*]{0,40}/)?.[0] ?? "none");
const cookies = await page.context().cookies();
console.log("cookies:", cookies.map((c) => c.name).join(","));
await browser.close();
