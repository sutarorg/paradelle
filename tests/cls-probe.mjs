import { chromium } from "playwright";
const BASE = process.env.BASE_URL;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.addInitScript(() => {
  window.__log = [];
  window.__track = () => {
    const els = [document.querySelector("header"), document.querySelector("main"), document.querySelector("footer")];
    window.__log.push({ t: Math.round(performance.now()), h: document.body.scrollHeight, mainTop: document.querySelector("main")?.getBoundingClientRect().top ?? -1 });
  };
});
await page.goto(BASE + "/checkout", { waitUntil: "domcontentloaded" });
await page.evaluate("window.__track()");
await page.waitForLoadState("domcontentloaded");
await page.waitForTimeout(400); await page.evaluate("window.__track()");
await page.waitForTimeout(1200); await page.evaluate("window.__track()");
await page.waitForTimeout(2000); await page.evaluate("window.__track()");
console.log(JSON.stringify(await page.evaluate("window.__log"), null, 0));
await browser.close();
