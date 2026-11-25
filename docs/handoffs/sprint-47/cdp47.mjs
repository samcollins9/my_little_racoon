// Sprint 47 manual check, headless Chromium over CDP against a running build.
//   node cdp47.mjs <origin> <today> <outDir>
// Writes report.json and the three R10 screenshots to <outDir>.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [origin, today, outDir] = process.argv.slice(2);
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/claude-1000/cdp47-profile-${port}`, "about:blank"], { stdio: "ignore" });
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
  await evaluate("window.scrollTo(0, 0)");
  await sleep(200);
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/${name}`, Buffer.from(r.data, "base64"));
};
const viewport = (width, height, mobile) =>
  send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: mobile ? 2 : 1, mobile });
const load = async (path) => { await send("Page.navigate", { url: origin + path }); await sleep(3500); };
const tab = async () => {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
};

await send("Page.enable");
await send("Runtime.enable");

const STATE = `(() => {
  const nav = document.querySelector('nav[aria-label="Previous and next day"]');
  const rect = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right), bottom: Math.round(r.bottom), visible: r.height > 0 && getComputedStyle(el).visibility !== 'hidden' }; };
  const go = document.querySelector('button[type=submit]');
  const random = [...document.querySelectorAll('a')].find(a => a.textContent === 'Discover random reading');
  const or = random?.previousElementSibling;
  const disabled = nav?.querySelector('[aria-disabled="true"]');
  const pick = (el) => { if (!el) return null; const cs = getComputedStyle(el); return { borderTop: cs.borderTop, fontFamily: cs.fontFamily, fontSize: cs.fontSize, letterSpacing: cs.letterSpacing, textTransform: cs.textTransform, padding: cs.padding, color: cs.color, textDecorationLine: cs.textDecorationLine }; };
  return {
    path: location.pathname, vw: innerWidth, docW: document.documentElement.scrollWidth,
    picker: (() => { const i = document.getElementById('date-page-picker'); return { min: i.min, max: i.max, value: i.value }; })(),
    dayLinks: nav ? [...nav.querySelectorAll('a')].map(a => ({ href: a.getAttribute('href'), rel: a.rel, text: a.innerText.replace(/\\s+/g, ' ').trim(), rect: rect(a) })) : null,
    disabledNext: disabled ? { tag: disabled.tagName, role: disabled.getAttribute('role'), ariaDisabled: disabled.getAttribute('aria-disabled'), text: disabled.innerText.replace(/\\s+/g, ' ').trim(), tabIndex: disabled.tabIndex, labelColor: getComputedStyle(disabled.firstElementChild).color, rect: rect(disabled) } : null,
    go: { rect: rect(go), style: pick(go) },
    or: or ? { text: or.textContent, rect: rect(or) } : null,
    random: random ? { href: random.getAttribute('href'), rect: rect(random), style: pick(random) } : null,
    notableStripVisible: rect(document.querySelector('nav[aria-labelledby="notable-dates-strip-heading"]'))?.visible ?? false,
    notableSectionVisible: rect(document.querySelector('nav[aria-labelledby="notable-dates-section-heading"]'))?.visible ?? false,
  };
})()`;

const report = { origin, today, browser: (await send("Browser.getVersion")).product };

// 1. Desktop 1280, an ordinary date.
await viewport(1280, 900, false);
await load("/date/1969-07-20");
report.desktopOrdinary = await evaluate(STATE);
const goStyle = report.desktopOrdinary.go.style;
const randomStyle = report.desktopOrdinary.random?.style ?? {};
report.desktopOrdinary.randomMatchesGo = Object.fromEntries(
  Object.keys(goStyle).filter((k) => k !== "textDecorationLine").map((k) => [k, goStyle[k] === randomStyle[k]])
);
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
await shot("desktop-1280-picker-row-and-days.png");
// Hover colour, Go and the random link.
const hoverColour = async (selector) => {
  const box = await evaluate(`(() => { const r = ${selector}.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: box.x, y: box.y });
  await sleep(150);
  return evaluate(`(() => { const cs = getComputedStyle(${selector}); return { color: cs.color, borderColor: cs.borderTopColor }; })()`);
};
report.desktopOrdinary.hover = {
  go: await hoverColour("document.querySelector('button[type=submit]')"),
  random: await hoverColour("[...document.querySelectorAll('a')].find(a => a.textContent === 'Discover random reading')"),
};

// 2. Five loads: where the random link points.
report.randomTargets = [];
for (let i = 0; i < 5; i++) {
  await load("/date/1969-07-20");
  report.randomTargets.push(await evaluate(`[...document.querySelectorAll('a')].find(a => a.textContent === 'Discover random reading')?.getAttribute('href') ?? null`));
}

// 3. Desktop 1280, today's page: the disabled Next day, and Tab never lands on it.
await load(`/date/${today}`);
report.desktopToday = await evaluate(STATE);
await evaluate("document.activeElement?.blur()");
const focused = [];
for (let i = 0; i < 40; i++) {
  await tab();
  focused.push(await evaluate(`(() => { const a = document.activeElement; return a === document.body ? 'body' : a.tagName + (a.getAttribute('href') ? ' ' + a.getAttribute('href') : '') + (a.getAttribute('aria-disabled') ? ' aria-disabled' : ''); })()`));
}
report.desktopToday.tabStops = focused;
report.desktopToday.tabEverReachedDisabled = focused.some((f) => f.includes("aria-disabled"));
report.desktopToday.tabEverReachedTomorrow = focused.some((f) => f.includes("/date/") && f.split(" ")[1] > `/date/${today}`);
const before = await evaluate("location.pathname");
const d = report.desktopToday.disabledNext.rect;
await send("Input.dispatchMouseEvent", { type: "mousePressed", x: (d.left + d.right) / 2, y: (d.top + d.bottom) / 2, button: "left", clickCount: 1 });
await send("Input.dispatchMouseEvent", { type: "mouseReleased", x: (d.left + d.right) / 2, y: (d.top + d.bottom) / 2, button: "left", clickCount: 1 });
await sleep(1500);
report.desktopToday.clickOnDisabled = { before, after: await evaluate("location.pathname") };
await evaluate("document.activeElement?.blur()");
await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: 5 });
await shot("desktop-1280-today-next-day-disabled.png");

// 4. Phone 390 (R6 as amended in round 2): no random link on the picker
// row; at the bottom, the reading, then the link, then the notable dates;
// and the folded horoscope's sticky reveal bar never covers the link.
await viewport(390, 844, true);
await load("/date/1969-07-20");
report.phone = await evaluate(STATE);
report.phone.layout = await evaluate(`(() => {
  const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), height: Math.round(b.height), shown: b.height > 0 }; };
  const copies = [...document.querySelectorAll('a')].filter(a => a.textContent === 'Discover random reading');
  const shown = copies.filter(a => a.getBoundingClientRect().height > 0);
  const reading = [...document.querySelectorAll('h3')].find(h => h.textContent === 'The reading')?.closest('section');
  const reveal = document.querySelector('details[class*=reveal]');
  const notable = document.querySelector('nav[aria-labelledby="notable-dates-section-heading"]');
  const picker = document.querySelector('form[action="/date"]');
  const days = document.querySelector('nav[aria-label="Previous and next day"]');
  const chart = document.querySelector('[role=tablist]');
  return {
    copies: copies.map(a => ({ href: a.getAttribute('href'), shown: a.getBoundingClientRect().height > 0, inPicker: !!a.closest('form') })),
    pickerShowsRandomOrOr: [...picker.querySelectorAll('a, span')].some(e => /^(or|Discover random reading)$/.test(e.textContent) && e.getBoundingClientRect().height > 0),
    revealFolded: !!reveal && !reveal.open, revealPosition: reveal && getComputedStyle(reveal).position,
    order: { picker: r(picker), days: r(days), chart: r(chart), reading: r(reading), random: r(shown[0]), notable: r(notable) },
    randomInsideReading: !!reading && !!shown[0] && reading.contains(shown[0]),
  };
})()`);
await shot("phone-390-top-no-random-link.png");
// Hit-test the link's centre with the link at several heights in the
// viewport, including flush with the bottom edge, where a sticky bar sits.
report.phone.stickyHits = [];
for (const fromBottom of [0, 40, 80, 160, 300]) {
  report.phone.stickyHits.push(await evaluate(`(() => {
    const a = [...document.querySelectorAll('a')].find(x => x.textContent === 'Discover random reading' && x.getBoundingClientRect().height > 0);
    const b = a.getBoundingClientRect();
    window.scrollBy(0, b.bottom - (innerHeight - ${fromBottom}));
    const c = a.getBoundingClientRect();
    const hit = document.elementFromPoint(c.left + c.width / 2, c.top + c.height / 2);
    const reveal = document.querySelector('details[class*=reveal]')?.getBoundingClientRect();
    return { linkBottomFromViewportBottom: Math.round(innerHeight - c.bottom), hitIsLink: hit === a, hit: hit?.tagName + '.' + String(hit?.className).slice(0, 40),
      revealBarTop: reveal ? Math.round(reveal.top) : null, linkTop: Math.round(c.top), overlap: reveal ? Math.max(0, Math.min(c.bottom, reveal.bottom) - Math.max(c.top, reveal.top)) : 0 };
  })()`));
}
await evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
await evaluate(`(() => { const s = [...document.querySelectorAll('h3')].find(h => h.textContent === 'The reading')?.closest('section'); s?.scrollIntoView({ block: 'start' }); })()`);
await sleep(200);
{
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/phone-390-bottom-reading-random-notable.png`, Buffer.from(r.data, "base64"));
}
report.phone.sameHrefInBothCopies = new Set(report.phone.layout.copies.map((c) => c.href)).size === 1;

// 5. Desktop 1280 again: the bottom copy isn't shown there.
await viewport(1280, 900, false);
await load("/date/1969-07-20");
report.desktopCopies = await evaluate(`[...document.querySelectorAll('a')].filter(a => a.textContent === 'Discover random reading').map(a => ({ href: a.getAttribute('href'), shown: a.getBoundingClientRect().height > 0, inPicker: !!a.closest('form') }))`);

writeFileSync(`${outDir}/report.json`, JSON.stringify(report, null, 2));
ws.close();
chrome.kill();
console.log(JSON.stringify(report, null, 1));
