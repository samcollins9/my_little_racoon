// Sprint 49 manual check, headless Chromium over CDP against a running build:
// what document.title is on each page (what a tab and Google Analytics
// read), and whether it follows client-side navigation.
//   node cdp49.mjs <origin> <out.json> <path> [<path> ...]
// A path written "<from>-><linkSelector>" loads <from>, clicks the first
// element matching <linkSelector> (a client-side navigation), and records
// the title after it too.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [origin, outFile, ...specs] = process.argv.slice(2);
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu",
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/claude-1000/cdp49-profile-${port}`, "about:blank"], { stdio: "ignore" });
let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find((t) => t.type === "page"); } catch { /* not up yet */ }
}
if (!target) throw new Error("chromium did not start");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let nextId = 1;
const pending = new Map();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (!m.id || !pending.has(m.id)) return;
  const p = pending.get(m.id);
  pending.delete(m.id);
  if (m.error) p.reject(new Error(JSON.stringify(m.error)));
  else p.resolve(m.result);
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });

const TITLES = `({ path: location.pathname, documentTitle: document.title,
  visible404: document.body.innerText.includes('This page could not be found.'),
  titleElements: [...document.querySelectorAll('title')].map(t => ({ text: t.textContent, in: t.closest('head') ? 'head' : 'body' })) })`;

const report = { origin, browser: (await send("Browser.getVersion")).product, pages: [] };
for (const spec of specs) {
  const [path, selector] = spec.split("->");
  await send("Page.navigate", { url: origin + path });
  await sleep(4000);
  const entry = { requested: path, ...(await evaluate(TITLES)) };
  if (selector) {
    await evaluate(`(() => { window.__sameDocument = true; document.querySelector(${JSON.stringify(selector)}).click(); })()`);
    await sleep(3000);
    entry.afterClientNavigation = { ...(await evaluate(TITLES)), sameDocument: await evaluate("window.__sameDocument === true") };
  }
  report.pages.push(entry);
}
writeFileSync(outFile, JSON.stringify(report, null, 2));
ws.close();
chrome.kill();
console.log(JSON.stringify(report, null, 1));
