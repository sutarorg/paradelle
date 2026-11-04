import { chromium } from "playwright";
const BASE = process.env.BASE_URL;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 823 } });
await page.addInitScript(() => {
  window.__shifts = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      window.__shifts.push({
        t: Math.round(e.startTime), score: +e.value.toFixed(4),
        sources: (e.sources || []).map((s) => ({ sel: s.node ? (s.node.tagName + "." + (s.node.className || "")).slice(0, 120) : "?", prev: [Math.round(s.previousRect.top), Math.round(s.previousRect.left), Math.round(s.previousRect.width), Math.round(s.previousRect.height)], cur: [Math.round(s.currentRect.top), Math.round(s.currentRect.left), Math.round(s.currentRect.width), Math.round(s.currentRect.height)] })),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
});
await page.goto(BASE + "/checkout", { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
console.log(JSON.stringify(await page.evaluate("window.__shifts"), null, 1).slice(0, 3000));
await browser.close();
