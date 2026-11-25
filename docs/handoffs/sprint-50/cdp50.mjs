// Sprint 50 manual check, headless Chromium over CDP against a running build.
//   node cdp50.mjs <origin> <outDir> <label>
// On /date/1969-07-20 at 1280: a style fingerprint of the desktop "Other
// notable dates" panel (heading, list, links, current date, an open
// tooltip, the panel's own box), an element screenshot of it, the strip's
// contents, where the panel sits, and the tab order. Then R4: at each
// width, scrollWidth with every tooltip closed and while hovering every
// date (page scrolled to the bottom), and whether each open tooltip lies
// inside the card and the viewport. Writes <label>-report.json and
// <label>-*.png.
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [origin, outDir, label] = process.argv.slice(2);
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/claude-1000/cdp50-profile-${port}`, "about:blank"], { stdio: "ignore" });
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
const move = (x, y) => send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
const viewport = (width, height) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
const load = async (path) => { await send("Page.navigate", { url: origin + path }); await sleep(3500); };
const PAGE = "/date/1969-07-20";

await send("Page.enable");
await send("Runtime.enable");

/** The desktop panel: whichever nav is labelled by a heading reading "Other notable dates" and is shown. */
const PANEL = `[...document.querySelectorAll('nav[aria-labelledby]')].find(n => n.getBoundingClientRect().height > 0 && n.querySelector('h2')?.textContent === 'Other notable dates')`;

const FINGERPRINT = `(() => {
  const panel = ${PANEL};
  const pick = (el, props) => { const cs = getComputedStyle(el); return Object.fromEntries(props.map(p => [p, cs.getPropertyValue(p)])); };
  const TEXT = ['font-family', 'font-size', 'font-weight', 'font-style', 'letter-spacing', 'text-transform', 'line-height', 'color', 'text-decoration-line', 'text-decoration-color', 'text-underline-offset'];
  const BOX = ['margin-top', 'margin-right', 'margin-bottom', 'margin-left', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left'];
  const heading = panel.querySelector('h2');
  const list = panel.querySelector('ol');
  const link = list.querySelector('a');
  const current = list.querySelector('[aria-current]');
  const tooltip = list.querySelector('[role=tooltip]');
  const pr = panel.getBoundingClientRect(), hr = heading.getBoundingClientRect(), lr = list.getBoundingClientRect();
  const card = document.querySelector('main').getBoundingClientRect();
  const firstItem = list.querySelector('li').getBoundingClientRect();
  return {
    heading: { text: heading.textContent, ...pick(heading, [...TEXT, ...BOX]) },
    list: pick(list, ['display', 'flex-wrap', 'row-gap', 'column-gap', 'font-family', 'font-size', 'letter-spacing', ...BOX]),
    link: pick(link, TEXT),
    current: { text: current?.textContent, ...pick(current, ['color', 'font-size', 'font-family']) },
    tooltipClosed: pick(tooltip, ['display', 'position', 'max-width', 'padding-top', 'padding-left', 'border-top-width', 'border-top-color', 'background-color', 'color', 'font-family', 'font-size', 'line-height']),
    // Where the content sits: gutter from the card's sides, the gap from
    // the panel's top edge (or the rule above it) to the heading, and from
    // the list's foot to the panel's bottom edge, as laid out.
    layout: {
      leftGutter: Math.round(hr.left - card.left), rightGutter: Math.round(card.right - lr.right) ,
      listWidth: Math.round(lr.width),
      headingToList: Math.round(lr.top - hr.bottom),
      rows: [...new Set([...list.querySelectorAll('li')].map(li => Math.round(li.getBoundingClientRect().top)))].length,
      firstRowLeft: Math.round(firstItem.left - card.left),
    },
  };
})()`;

const report = { origin, label, browser: (await send("Browser.getVersion")).product };

await viewport(1280, 900);
await load(PAGE);
await move(2, 2);
report.fingerprint = await evaluate(FINGERPRINT);
report.placement = await evaluate(`(() => {
  const panel = ${PANEL};
  const strip = document.querySelector('[class*=flowSlot]');
  const body = [...document.querySelectorAll('main > div')].find(d => d.querySelector('h3') && [...d.querySelectorAll('h3')].some(h => h.textContent === 'The reading'));
  const main = document.querySelector('main');
  const shownChildren = [...main.children].filter(c => c.getBoundingClientRect().height > 0);
  return {
    panelInStrip: strip.contains(panel),
    panelAfterBody: !!body && !!(body.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING),
    panelIsLastShownSectionInCard: shownChildren[shownChildren.length - 1] === panel || shownChildren[shownChildren.length - 1]?.contains(panel),
    strip: { picker: !!strip.querySelector('form[action="/date"]'), randomLink: [...strip.querySelectorAll('a')].some(a => a.textContent === 'Discover random reading' && a.getBoundingClientRect().height > 0),
      dayLinks: [...strip.querySelectorAll('nav[aria-label="Previous and next day"] a')].map(a => a.getAttribute('href')),
      notableInside: [...strip.querySelectorAll('nav')].some(n => n.querySelector('h2')?.textContent === 'Other notable dates') },
    panelRuleAbove: (() => { const cs = getComputedStyle(panel); return cs.borderTopWidth + ' ' + cs.borderTopStyle; })(),
    count: panel.querySelectorAll('li').length,
    currentMarked: panel.querySelector('[aria-current="page"]')?.textContent ?? null,
    describedBy: [...panel.querySelectorAll('a')].every(a => { const id = a.getAttribute('aria-describedby'); return !!id && document.getElementById(id)?.getAttribute('role') === 'tooltip'; }),
  };
})()`);
// An open tooltip's look: focus a link with the keyboard path (focus-visible).
await evaluate(`(() => { const a = (${PANEL}).querySelector('a'); a.scrollIntoView({ block: 'center' }); a.focus({ focusVisible: true }); })()`);
await sleep(150);
report.fingerprint.tooltipOpen = await evaluate(`(() => {
  const t = [...document.querySelectorAll('[role=tooltip]')].find(x => getComputedStyle(x).display !== 'none');
  const cs = getComputedStyle(t);
  return { text: t.textContent, display: cs.display, maxWidth: cs.maxWidth, padding: cs.padding, border: cs.borderTop, background: cs.backgroundColor, color: cs.color, font: cs.fontFamily + ' ' + cs.fontSize + '/' + cs.lineHeight };
})()`);
await evaluate("document.activeElement?.blur()");
// Element screenshot of the panel alone, for a before/after comparison.
const clip = await evaluate(`(() => { const p = ${PANEL}; p.scrollIntoView({ block: 'center' }); const r = p.getBoundingClientRect(); return { x: r.left, y: r.top + scrollY, width: r.width, height: r.height }; })()`);
await sleep(200);
{
  const r = await send("Page.captureScreenshot", { format: "png", clip: { ...clip, scale: 1 }, captureBeyondViewport: true });
  writeFileSync(`${outDir}/${label}-panel-1280.png`, Buffer.from(r.data, "base64"));
}

// Tab order, from a fresh load (blur() would keep the earlier focus as
// the browser's starting point for Tab).
await load(PAGE);
const stops = [];
for (let i = 0; i < 90; i++) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  const where = await evaluate(`(() => { const a = document.activeElement; if (a === document.body) return 'body';
    const panel = ${PANEL}; if (panel?.contains(a)) return 'notable';
    const s = a.closest('section'); const h = s?.querySelector('h2, h3')?.textContent;
    if (h === 'The reading') return 'reading'; if (h === 'What happened') return 'events';
    if (a.closest('[class*=flowSlot]')) return 'strip'; if (a.closest('[role=tablist], [role=tabpanel]')) return 'chart'; return a.closest('header') ? 'banner' : 'other'; })()`);
  stops.push(where);
  if (where === "body" && i > 5) break;
}
report.tabOrder = stops.filter((s, i) => s !== stops[i - 1]);

// R4: widths.
report.widths = [];
for (const width of [901, 1000, 1100, 1200, 1279, 1280, 1440]) {
  await viewport(width, 900);
  await load(PAGE);
  await move(2, 2);
  await evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
  await sleep(200);
  const closed = await evaluate(`({ docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight, vw: innerWidth })`);
  const items = await evaluate(`[...(${PANEL}).querySelectorAll('li')].map(li => { const e = li.querySelector('a, [aria-current]'); const r = e.getBoundingClientRect(); return { date: e.textContent, x: r.left + 4, y: r.top + r.height / 2, top: Math.round(r.top) }; })`);
  const rowTops = [...new Set(items.map((i) => i.top))];
  const hovers = [];
  for (const it of items) {
    await move(it.x, it.y);
    await sleep(50);
    hovers.push(await evaluate(`(() => {
      const t = [...document.querySelectorAll('[role=tooltip]')].filter(x => getComputedStyle(x).display !== 'none');
      const r = t[0]?.getBoundingClientRect(); const card = document.querySelector('main').getBoundingClientRect();
      const li = t[0]?.closest('li').getBoundingClientRect();
      return { date: ${JSON.stringify(it.date)}, open: t.length, docW: document.documentElement.scrollWidth, docH: document.documentElement.scrollHeight,
        insideCard: !!r && r.left >= card.left && r.right <= card.right && r.top >= card.top && r.bottom <= card.bottom,
        insideViewport: !!r && r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight,
        opens: !r ? null : Math.abs(r.top - li.bottom) < 1 ? 'below' : Math.abs(r.bottom - li.top) < 1 ? 'above' : 'detached' };
    })()`));
  }
  const lastRow = rowTops[rowTops.length - 1];
  report.widths.push({
    width, closedScrollWidth: closed.docW, closedScrollHeight: closed.docH,
    maxScrollWidthWhileOpen: Math.max(...hovers.map((h) => h.docW)),
    maxScrollHeightWhileOpen: Math.max(...hovers.map((h) => h.docH)),
    rows: rowTops.length,
    allOpenExactlyOne: hovers.every((h) => h.open === 1),
    allInsideCard: hovers.every((h) => h.insideCard), allInsideViewport: hovers.every((h) => h.insideViewport),
    noneDetached: hovers.every((h) => h.opens !== "detached"),
    lastRowOpens: [...new Set(hovers.filter((h, i) => items[i].top === lastRow).map((h) => h.opens))],
    firstRowOpens: [...new Set(hovers.filter((h, i) => items[i].top === rowTops[0]).map((h) => h.opens))],
    failures: hovers.filter((h) => !h.insideCard || !h.insideViewport || h.open !== 1),
  });
  if (width === 1280) {
    const last = items.filter((i) => i.top === lastRow).pop();
    await move(last.x, last.y);
    await sleep(150);
    const r = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${outDir}/${label}-1280-bottom-last-row-tooltip.png`, Buffer.from(r.data, "base64"));
    await move(2, 2);
    await evaluate("window.scrollTo(0, 0)");
    await sleep(200);
    const t = await send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${outDir}/${label}-1280-top-strip.png`, Buffer.from(t.data, "base64"));
  }
}

writeFileSync(`${outDir}/${label}-report.json`, JSON.stringify(report, null, 2));
ws.close();
chrome.kill();
console.log(JSON.stringify({ placement: report.placement, tabOrder: report.tabOrder, layout: report.fingerprint.layout }, null, 1));
for (const w of report.widths) console.log(JSON.stringify({ ...w, failures: w.failures.length }));
