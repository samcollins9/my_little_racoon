// Sprint 54 manual check, headless Chromium over CDP against a running build.
//   node cdp54.mjs <origin> <outDir> <name>=<path> [<name>=<path> ...]
// At 1280 and 390, for each page: the events heading, the status label,
// Sprint 39's message (its lead and next step on separate lines, one <p>),
// the picker's label, sideways scroll, and screenshots of the events/reading
// area and of the picker panel. Writes report.json.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [origin, outDir, ...specs] = process.argv.slice(2);
const pages = specs.map((s) => { const [name, path] = s.split("="); return { name, path }; });
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/claude-1000/cdp54-profile-${port}`, "about:blank"], { stdio: "ignore" });
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
const shotOf = async (selectorExpr, file) => {
  await evaluate(`(() => { const el = ${selectorExpr}; if (el) window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 24); })()`);
  await sleep(250);
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/${file}`, Buffer.from(r.data, "base64"));
};

await send("Page.enable");
await send("Runtime.enable");

const STATE = `(() => {
  const events = document.querySelector('[class*=eventsSection]');
  const reading = [...document.querySelectorAll('h3')].find(h => h.textContent === 'The reading')?.closest('section');
  const heading = events?.querySelector('h2');
  const note = reading?.querySelector('p[class*=accuracyNote]');
  const lead = note?.querySelector('strong');
  const br = note?.querySelector('br');
  const label = document.querySelector('label[for="date-page-picker"]');
  const h = heading?.getBoundingClientRect();
  return {
    path: location.pathname, vw: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    heading: heading?.textContent ?? null, headingLines: h ? Math.round(h.height / parseFloat(getComputedStyle(heading).lineHeight)) : null,
    headingInsideSection: !!h && h.right <= events.getBoundingClientRect().right,
    status: events?.querySelector('[class*=eventsStatus]')?.textContent ?? null,
    eventsAfterReading: !!reading && !!events && !!(reading.compareDocumentPosition(events) & Node.DOCUMENT_POSITION_FOLLOWING),
    message: note ? { paragraphsInReading: reading.querySelectorAll('p').length, lead: lead?.textContent, next: note.lastChild?.textContent,
      brCount: note.querySelectorAll('br').length,
      nextStartsBelowLead: !!lead && !!note.lastChild && (() => { const r = document.createRange(); r.selectNodeContents(note.lastChild); const n = r.getClientRects()[0]; const l = lead.getClientRects(); return !!n && n.top >= l[l.length - 1].bottom - 1; })(),
      margin: getComputedStyle(note).margin, padding: getComputedStyle(note).padding, leadFont: getComputedStyle(lead).fontWeight + ' ' + getComputedStyle(lead).fontSize + ' ' + getComputedStyle(lead).color,
      accessibleText: note.innerText.replace(/\\n/g, '⏎') } : null,
    pickerLabel: label?.textContent ?? null,
  };
})()`;

const report = { origin, browser: (await send("Browser.getVersion")).product, pages: [] };
for (const { name, path } of pages) {
  for (const [w, h, mobile] of [[1280, 900, false], [390, 844, true]]) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await send("Page.navigate", { url: origin + path });
    await sleep(3500);
    const state = await evaluate(STATE);
    report.pages.push({ name, width: w, ...state });
    await shotOf(`[...document.querySelectorAll('h2, h3')].find(x => x.textContent === 'The reading' || x.closest('[class*=eventsSection]'))?.closest('section')`, `${name}-${w}-events-reading.png`);
    if (name === "matched") await shotOf(`document.querySelector('form[action="/date"]')`, `picker-panel-${w}.png`);
  }
}
writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
ws.close();
chrome.kill();
for (const p of report.pages) console.log(p.width, p.name, JSON.stringify({ heading: p.heading, lines: p.headingLines, inside: p.headingInsideSection, status: p.status, below: p.eventsAfterReading, label: p.pickerLabel, scrollW: p.scrollWidth, msg: p.message && { br: p.message.brCount, split: p.message.nextStartsBelowLead, ps: p.message.paragraphsInReading, margin: p.message.margin, next: p.message.next } }));
