// Sprint 46 manual check: on a running build, how many times each page
// requests the Tag Manager container, whether `dataLayer` already exists
// when the container script is inserted (so before it runs), and whether a
// client-side navigation loads it again.
//   node cdp46.mjs <origin> <outFile> <path> [<path> ...]
// A path written "<from>-><linkHref>" loads <from>, then clicks the link to
// <linkHref> (a client-side navigation) and counts again.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [origin, outFile, ...paths] = process.argv.slice(2);
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu",
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/claude-1000/cdp46-profile-${port}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch {}
}
if (!target) throw new Error("chromium did not start");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 1;
const pending = new Map();
const requests = [];
const blocked = new Set();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
  if (m.method === "Network.loadingFailed" && m.params.blockedReason) blocked.add(m.params.requestId);
  if (m.method === "Network.requestWillBeSent" && /googletagmanager\.com|google-analytics\.com/.test(m.params.request.url)) {
    requests.push({ id: m.params.requestId, url: m.params.request.url, type: m.params.type, initiator: m.params.initiator.type });
  }
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
// Never send hits to the real Analytics stream from a local check: GA's
// collect requests are blocked (still recorded, as attempted).
await send("Network.setBlockedURLs", { urls: ["*google-analytics.com/*"] });
// Before any page script: note, at the moment the container's <script> is
// inserted, whether dataLayer already exists. Inserted precedes executed.
await send("Page.addScriptToEvaluateOnNewDocument", { source: `
  window.__gtmInsertions = [];
  new MutationObserver((records) => {
    for (const r of records) for (const n of r.addedNodes) {
      if (n.tagName === 'SCRIPT' && /gtm\\.js/.test(n.src || '')) {
        window.__gtmInsertions.push({ src: n.src, async: n.async, dataLayerWasArray: Array.isArray(window.dataLayer),
          dataLayerFirst: Array.isArray(window.dataLayer) ? JSON.stringify(Array.from(window.dataLayer[0] || [])) : null });
      }
    }
  }).observe(document, { childList: true, subtree: true });
` });

const gtmLoads = () => requests.filter((r) => /gtm\.js\?id=/.test(r.url) && r.type === "Script");
const report = { origin, browser: (await send("Browser.getVersion")).product, pages: [] };
for (const spec of paths) {
  const [path, clickHref] = spec.split("->");
  requests.length = 0;
  const nav = await send("Page.navigate", { url: origin + path });
  await sleep(6000);
  await sleep(500);
  const page = await evaluate(`({
    status: performance.getEntriesByType('navigation')[0]?.responseStatus,
    title: document.title,
    insertions: window.__gtmInsertions,
    dataLayerIsArray: Array.isArray(window.dataLayer),
    containerReady: !!(window.google_tag_manager && window.google_tag_manager['GTM-T9WQSKH3']),
    gtagScripts: [...document.querySelectorAll('script[src*="gtag/js"]')].length,
  })`);
  const entry = { path, ...page, errorText: nav.errorText, gtmScriptRequests: gtmLoads().length, googleRequests: requests.map((r) => `${r.type} (${r.initiator})${blocked.has(r.id) ? " BLOCKED" : ""} ${r.url.slice(0, 90)}${/g\/collect/.test(r.url) ? ` en=${new URL(r.url).searchParams.get("en")} dl=${new URL(r.url).searchParams.get("dl")}` : ""}`) };
  if (clickHref) {
    const before = gtmLoads().length;
    const hitsBefore = requests.length;
    const clicked = await evaluate(`(() => { const a = document.querySelector('a[href="${clickHref}"]'); if (!a) return false; window.__sameDocument = true; a.click(); return true; })()`);
    await sleep(5000);
    entry.clientNavigation = {
      clicked, to: await evaluate("location.pathname"),
      sameDocument: await evaluate("window.__sameDocument === true"),
      gtmScriptRequestsAdded: gtmLoads().length - before,
      analyticsEventsAdded: requests.slice(hitsBefore).filter((r) => /g\/collect/.test(r.url))
        .map((r) => `${new URL(r.url).searchParams.get("en")} ${new URL(r.url).searchParams.get("dl")}`),
      gtmScriptsInDom: await evaluate(`document.querySelectorAll('script[src*="gtm.js"]').length`),
    };
  }
  report.pages.push(entry);
}
writeFileSync(outFile, JSON.stringify(report, null, 2));
ws.close();
chrome.kill();
console.log(JSON.stringify(report, null, 1));
