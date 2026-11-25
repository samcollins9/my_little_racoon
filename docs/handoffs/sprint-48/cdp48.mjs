// Sprint 48 manual check, headless Chromium over CDP against a running build.
//   node cdp48.mjs <origin> <outDir> <name>=<path> [<name>=<path> ...]
// For each page, at 1280 and at 390: the order of "What happened" and "The
// reading" (and, on phones, what follows), the gap and rules between the
// two sections, and (desktop) whether Tab reaches the reading before the
// events. Writes report.json and a screenshot per page and width.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [origin, outDir, ...specs] = process.argv.slice(2);
const pages = specs.map((spec) => {
  const [name, path] = spec.split("=");
  return { name, path };
});
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/claude-1000/cdp48-profile-${port}`, "about:blank"], { stdio: "ignore" });
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
const tab = async () => {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
};

await send("Page.enable");
await send("Runtime.enable");

const STATE = `(() => {
  const heading = (text) => [...document.querySelectorAll('h2, h3')].find(h => h.textContent === text);
  const events = heading('What happened')?.closest('section');
  const reading = heading('The reading')?.closest('section');
  const random = document.querySelector('[class*=randomSection]');
  const notable = document.querySelector('nav[aria-labelledby="notable-dates-section-heading"]');
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), shown: r.height > 0 }; };
  const rules = (el) => { const cs = getComputedStyle(el); return { top: cs.borderTopWidth + ' ' + cs.borderTopStyle, bottom: cs.borderBottomWidth + ' ' + cs.borderBottomStyle, flexGrow: cs.flexGrow }; };
  const first = reading.compareDocumentPosition(events) & Node.DOCUMENT_POSITION_FOLLOWING ? 'reading' : 'events';
  const [upper, lower] = first === 'reading' ? [reading, events] : [events, reading];
  const shown = [['events', events], ['reading', reading], ['random', random], ['notable', notable]]
    .filter(([, el]) => el && el.getBoundingClientRect().height > 0)
    .sort((a, b) => a[1].getBoundingClientRect().top - b[1].getBoundingClientRect().top)
    .map(([n]) => n);
  return {
    path: location.pathname, vw: innerWidth, docW: document.documentElement.scrollWidth,
    status: document.querySelector('[class*=eventsStatus]')?.textContent ?? null,
    domOrder: first === 'reading' ? ['reading', 'events'] : ['events', 'reading'],
    visualOrder: shown,
    gapBetween: Math.round(lower.getBoundingClientRect().top - upper.getBoundingClientRect().bottom),
    rulesBetween: (parseFloat(getComputedStyle(upper).borderBottomWidth) || 0) + (parseFloat(getComputedStyle(lower).borderTopWidth) || 0),
    events: { box: box(events), rules: rules(events) },
    reading: { box: box(reading), rules: rules(reading) },
    column: box(reading.parentElement),
    cssReordering: [events, reading].map(el => { const cs = getComputedStyle(el); return cs.order; }).concat(getComputedStyle(reading.parentElement).flexDirection),
  };
})()`;

const report = { origin, browser: (await send("Browser.getVersion")).product, pages: [] };
for (const { name, path } of pages) {
  for (const [label, width, height, mobile] of [["desktop-1280", 1280, 900, false], ["phone-390", 390, 844, true]]) {
    await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await send("Page.navigate", { url: origin + path });
    await sleep(3500);
    const state = await evaluate(STATE);
    if (!mobile) {
      // Tab from the top: does focus reach something in the reading section
      // before an event's year link?
      await evaluate("document.activeElement?.blur(); window.scrollTo(0, 0)");
      let firstReading = null;
      let firstEventLink = null;
      for (let i = 1; i <= 80 && (firstReading === null || firstEventLink === null); i++) {
        await tab();
        const where = await evaluate(`(() => { const a = document.activeElement; const s = a.closest('section'); const h = s?.querySelector('h2, h3')?.textContent; return h === 'The reading' ? 'reading' : h === 'What happened' && a.matches('a[href^="/date/"]') ? 'eventLink' : null; })()`);
        if (where === "reading" && firstReading === null) firstReading = i;
        if (where === "eventLink" && firstEventLink === null) firstEventLink = i;
      }
      state.tab = { firstReadingStop: firstReading, firstEventYearLinkStop: firstEventLink };
    }
    // Screenshot from the top of whichever of the two sections comes first.
    await evaluate(`(() => { const h = [...document.querySelectorAll('h2, h3')].find(x => x.textContent === ${JSON.stringify(state.domOrder[0] === "reading" ? "The reading" : "What happened")}); window.scrollTo(0, h.closest('section').getBoundingClientRect().top + scrollY - 20); })()`);
    await evaluate("document.activeElement?.blur()");
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2 });
    await sleep(300);
    const shot = await send("Page.captureScreenshot", { format: "png" });
    const file = `${label}-${name}.png`;
    writeFileSync(`${outDir}/${file}`, Buffer.from(shot.data, "base64"));
    const entry = { name, width: label, screenshot: file, ...state };
    // Phones: a second shot where the card's foot starts, so the order
    // after the two sections (random link, notable dates) is visible too.
    if (mobile && state.visualOrder.includes("random")) {
      await evaluate(`(() => { const e = document.querySelector('[class*=randomSection]'); window.scrollTo(0, e.getBoundingClientRect().top + scrollY - innerHeight / 2); })()`);
      await sleep(300);
      const foot = await send("Page.captureScreenshot", { format: "png" });
      entry.footScreenshot = `${label}-${name}-foot.png`;
      writeFileSync(`${outDir}/${entry.footScreenshot}`, Buffer.from(foot.data, "base64"));
    }
    report.pages.push(entry);
  }
}
writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
ws.close();
chrome.kill();
for (const p of report.pages) {
  console.log(p.width, p.name, p.path, JSON.stringify({ status: p.status, dom: p.domOrder, visual: p.visualOrder, gap: p.gapBetween, rules: p.rulesBetween, docW: p.docW, tab: p.tab, css: p.cssReordering, readingGrow: p.reading.rules.flexGrow, colBottom: p.column?.bottom, lowerBottom: Math.max(p.events.box.bottom, p.reading.box.bottom) }));
}
