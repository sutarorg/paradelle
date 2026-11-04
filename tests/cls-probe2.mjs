import { chromium } from "playwright";
const BASE = process.env.BASE_URL;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 823 } }); // LH mobile size
// measure pre-hydration skeleton box
await page.goto(BASE + "/checkout", { waitUntil: "domcontentloaded" });
const pre = await page.evaluate(() => {
  const sk = document.querySelector("main .animate-pulse");
  return sk ? sk.getBoundingClientRect().height : -1;
});
await page.waitForLoadState("networkidle");
await page.waitForTimeout(1500);
const post = await page.evaluate(() => {
  const card = document.querySelector("main .rounded-3xl.border");
  return card ? Math.round(card.getBoundingClientRect().height) : -1;
});
console.log("skeleton h:", pre, "| final empty-state h:", post);
await browser.close();
