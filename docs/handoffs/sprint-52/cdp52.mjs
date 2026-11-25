// Sprint 52 manual check, headless Chromium over CDP against a running build.
//   node cdp52.mjs <origin> <today> <outDir>
// At 1280 and 390 on /date/1969-07-20: the landmarks' on-screen order, the
// "Another date" panel's rows and (390) touch-target heights, sideways
// scroll, top and bottom screenshots. At 390 on today's page: the disabled
// Next day under the banner. At 1280: the Tab order, and the picker
// submitted from its new place. Writes report.json and the screenshots.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [origin, today, outDir] = process.argv.slice(2);
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/claude-1000/cdp52-profile-${port}`, "about:blank"], { stdio: "ignore" });
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
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/${name}`, Buffer.from(r.data, "base64"));
};
const viewport = (width, height, mobile) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
const load = async (path) => { await send("Page.navigate", { url: origin + path }); await sleep(3500); };

await send("Page.enable");
await send("Runtime.enable");

const LAYOUT = `(() => {
  const shown = (el) => !!el && el.getBoundingClientRect().height > 0;
  const top = (el) => Math.round(el.getBoundingClientRect().top + scrollY);
  const marks = {
    banner: document.querySelector('header'),
    dayNavigation: document.querySelector('nav[aria-label="Previous and next day"]'),
    dateBand: [...document.querySelectorAll('span')].find(s => s.textContent === 'The sky over')?.parentElement?.parentElement,
    body: [...document.querySelectorAll('[role=tablist]')][0]?.closest('main > div'),
    anotherDate: document.querySelector('form[action="/date"]'),
    notableDates: [...document.querySelectorAll('nav[aria-labelledby]')].find(n => shown(n) && n.querySelector('h2')?.textContent === 'Notable dates'),
  };
  const order = Object.entries(marks).filter(([, el]) => shown(el)).sort((a, b) => top(a[1]) - top(b[1])).map(([n]) => n);
  const form = marks.anotherDate;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top + scrollY), bottom: Math.round(r.bottom + scrollY), height: Math.round(r.height), left: Math.round(r.left), right: Math.round(r.right) }; };
  const label = form.querySelector('label'), input = form.querySelector('input'), go = form.querySelector('button'), random = form.querySelector('a'), or = random?.previousElementSibling;
  const card = document.querySelector('main');
  return {
    vw: innerWidth, scrollWidth: document.documentElement.scrollWidth, order,
    dateBandToBodyGap: marks.dateBand && marks.body ? Math.round(marks.body.getBoundingClientRect().top - marks.dateBand.getBoundingClientRect().bottom) : null,
    notableHeading: marks.notableDates?.querySelector('h2')?.textContent ?? null,
    panel: { label: box(label), input: box(input), go: box(go), or: box(or), random: box(random), form: box(form),
      labelInputGoOneRow: !!label && Math.abs(box(label).top + box(label).height / 2 - (box(go).top + box(go).height / 2)) < 12 && Math.abs(box(input).top - box(go).top) < 6,
      randomOnSameRowAsGo: !!random && Math.abs(box(random).top - box(go).top) < 6,
      insideCard: [input, go, random].filter(Boolean).every(el => el.getBoundingClientRect().right <= card.getBoundingClientRect().right) },
    readingMessage: [...document.querySelectorAll('p')].map(p => p.textContent).find(t => /Pick a different date/.test(t)) ?? null,
  };
})()`;

const report = { origin, today, browser: (await send("Browser.getVersion")).product };
for (const [label, w, h, mobile] of [["desktop-1280", 1280, 900, false], ["phone-390", 390, 844, true]]) {
  await viewport(w, h, mobile);
  await load("/date/1969-07-20");
  report[label] = await evaluate(LAYOUT);
  await shot(`${label}-top.png`);
  await evaluate(`(() => { const f = document.querySelector('form[action="/date"]'); window.scrollTo(0, f.getBoundingClientRect().top + scrollY - (innerHeight * 0.35)); })()`);
  await sleep(300);
  await shot(`${label}-bottom.png`);
}

// Today's page at 390: the disabled Next day under the banner.
await viewport(390, 844, true);
await load(`/date/${today}`);
report.phoneToday = await evaluate(`(() => {
  const nav = document.querySelector('nav[aria-label="Previous and next day"]');
  const d = nav.querySelector('[aria-disabled="true"]');
  const banner = document.querySelector('header').getBoundingClientRect();
  const band = [...document.querySelectorAll('span')].find(s => s.textContent === 'The sky over').getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  return { disabledText: d?.innerText.replace(/\\s+/g, ' ').trim(), betweenBannerAndBand: n.top >= banner.bottom && n.bottom <= band.top, scrollWidth: document.documentElement.scrollWidth };
})()`);
await shot("phone-390-today-top.png");

// An unmatched date: Sprint 39's message without "above", and the panel right after the body.
await viewport(1280, 900, false);
await load("/date/1931-03-03");
report.unmatched = await evaluate(`(() => ({ message: [...document.querySelectorAll('p')].map(p => p.textContent).find(t => /Pick a different date/.test(t)) ?? null,
  panelFollowsBody: document.querySelector('form[action="/date"]').previousElementSibling?.querySelector('[role=tablist]') !== null }))()`);

// Tab order at 1280 from a fresh load.
await load("/date/1969-07-20");
const stops = [];
for (let i = 0; i < 90; i++) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  const where = await evaluate(`(() => { const a = document.activeElement; if (a === document.body) return 'body';
    if (a.closest('header')) return 'banner';
    if (a.closest('nav[aria-label="Previous and next day"]')) return 'dayLinks';
    if (a.closest('form[action="/date"]')) return a.tagName === 'INPUT' ? 'picker' : a.tagName === 'BUTTON' ? 'go' : 'randomLink';
    const nav = a.closest('nav[aria-labelledby]'); if (nav) return 'notableDates';
    const s = a.closest('section'); const h = s?.querySelector('h2, h3')?.textContent;
    if (h === 'The reading') return 'reading'; if (h === 'What happened') return 'events';
    if (a.closest('[role=tablist], [role=tabpanel]')) return 'chart'; return 'other:' + a.tagName; })()`);
  stops.push(where);
  if (where === "body" && i > 5) break;
}
report.tabOrder = stops.filter((s, i) => s !== stops[i - 1]);

// The picker from its new place: type a past date, press Go.
await load("/date/1969-07-20");
await evaluate(`(() => { const i = document.querySelector('#date-page-picker'); i.value = '1955-12-01'; i.form.requestSubmit(); })()`);
await sleep(3500);
report.pickerSubmit = { landed: await evaluate("location.pathname") };

writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
ws.close();
chrome.kill();
console.log(JSON.stringify(report, null, 1));
