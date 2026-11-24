// Sprint 45 manual check of "Other notable dates" on the real date page.
//   node cdp45.mjs <url> <desktop|phone> <outDir>
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [url, mode, outDir] = process.argv.slice(2);
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/claude-1000/cdp45-profile-${port}`, "about:blank"], { stdio: "ignore" });
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
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.reject(new Error(JSON.stringify(m.error))) : p.resolve(m.result); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => { const id = nextId++; pending.set(id, { resolve, reject }); ws.send(JSON.stringify({ id, method, params })); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
const shot = async (name, clip) => {
  const r = await send("Page.captureScreenshot", { format: "png", ...(clip ? { clip: { ...clip, scale: 1 }, captureBeyondViewport: true } : {}) });
  writeFileSync(`${outDir}/${name}`, Buffer.from(r.data, "base64"));
};
const key = async (k, code, vk, shift = false) => {
  const mods = shift ? 8 : 0;
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk, modifiers: mods });
};

await send("Page.enable");
await send("Runtime.enable");
await send("Accessibility.enable");
const phone = mode === "phone";
const W = phone ? 390 : 1280, H = phone ? 844 : 1000;
await send("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: phone ? 2 : 1, mobile: phone });
await send("Page.navigate", { url });
await sleep(9000);

const STATE = `(() => {
  const vis = (el) => !!el && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().height > 0 && !el.closest('[style*="display: none"]') && el.offsetParent !== null;
  const strip = document.querySelector('nav[aria-labelledby="notable-dates-strip-heading"]');
  const section = document.querySelector('nav[aria-labelledby="notable-dates-section-heading"]');
  const adjacent = document.querySelector('nav[aria-label="Previous and next readings"]');
  const flow = strip?.closest('[class*=flowSlot]');
  const reading = [...document.querySelectorAll('h3')].find(h => h.textContent === 'The reading')?.closest('section');
  const list = (nav) => nav ? [...nav.querySelectorAll('li')].map(li => { const a = li.querySelector('a'); const cur = li.querySelector('[aria-current]'); return { text: li.innerText.replace(/\\s+/g,' ').trim(), href: a?.getAttribute('href') ?? null, current: !!cur, h: Math.round(li.getBoundingClientRect().height) }; }) : null;
  return {
    path: location.pathname, vw: innerWidth, docW: document.documentElement.scrollWidth,
    recentlyWrittenOnPage: document.body.innerText.includes('Recently written'),
    adjacent: adjacent ? { visible: vis(adjacent), text: adjacent.innerText.replace(/\\s+/g,' ').trim(), inStrip: !!adjacent.closest('[class*=flowSlot]') } : null,
    strip: strip ? { visible: vis(strip), heading: strip.querySelector('h2')?.textContent, inStrip: !!flow, count: strip.querySelectorAll('li').length, items: list(strip) } : null,
    section: section ? { visible: vis(section), heading: section.querySelector('h2')?.textContent, headingFont: getComputedStyle(section.querySelector('h2')).fontSize, inStrip: !!section.closest('[class*=flowSlot]'), insideDetails: !!section.closest('details'), insideReading: !!reading?.contains(section), afterReading: !!reading && !!(reading.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING), count: section.querySelectorAll('li').length, items: list(section) } : null,
    readingSectionHasDetails: !!reading?.querySelector('details'),
  };
})()`;
const report = { url, mode, initial: await evaluate(STATE) };

const tooltipState = `(() => { const a = document.activeElement; const id = a?.getAttribute('aria-describedby'); const t = id && document.getElementById(id); return { active: a?.getAttribute('href'), activeText: a?.textContent, describedBy: id, tooltipText: t?.textContent, tooltipVisibility: t && getComputedStyle(t).visibility, focusVisible: a?.matches(':focus-visible') }; })()`;

if (!phone) {
  // Keyboard: Tab from the top of the page until a notable link has focus,
  // then on to the 1944 entry, to show the tooltip opened by focus alone.
  const targetHref = "/date/1944-06-06";
  let tabs = 0;
  for (; tabs < 80; tabs++) {
    await key("Tab", "Tab", 9);
    if ((await evaluate("document.activeElement?.getAttribute('href')")) === targetHref) break;
  }
  await sleep(300);
  report.keyboard = { tabs: tabs + 1, ...(await evaluate(tooltipState)) };
  const { nodes } = await send("Accessibility.getPartialAXTree", { backendNodeId: (await send("DOM.describeNode", { objectId: (await send("Runtime.evaluate", { expression: "document.activeElement" })).result.objectId })).node.backendNodeId, fetchRelatives: false });
  const ax = nodes[0];
  report.keyboard.ax = { role: ax.role?.value, name: ax.name?.value, description: ax.description?.value };
  report.otherTooltipsVisibleWhileFocused = await evaluate(`[...document.querySelectorAll('[role=tooltip]')].filter(t => getComputedStyle(t).visibility === 'visible').map(t => t.textContent)`);
  await shot("desktop-1280-tooltip-keyboard.png");

  // Mouse: move focus away (Escape does nothing; blur programmatically),
  // then hover the 2020 entry.
  await evaluate("document.activeElement.blur()");
  const r = await evaluate(`(() => { const a = document.querySelector('a[href="/date/2020-03-11"]'); const b = a.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: r.x, y: r.y });
  await sleep(300);
  report.hover = await evaluate(`(() => { const t = document.getElementById('notable-tooltip-2020-03-11'); const b = t.getBoundingClientRect(); return { visibility: getComputedStyle(t).visibility, text: t.textContent, right: Math.round(b.right), vw: innerWidth, visibleTooltips: [...document.querySelectorAll('[role=tooltip]')].filter(t => getComputedStyle(t).visibility === 'visible').map(t => t.textContent) }; })()`);
  await shot("desktop-1280-tooltip-hover.png");
  // Move the pointer off the list: the tooltip closes.
  await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 5, y: H - 5 });
  await sleep(200);
  report.afterHoverOut = await evaluate(`getComputedStyle(document.getElementById('notable-tooltip-2020-03-11')).visibility`);
  // Hover the current (unlinked) date: its tooltip shows too.
  const c = await evaluate(`(() => { const s = document.querySelector('nav[aria-labelledby="notable-dates-strip-heading"] [aria-current]'); if (!s) return null; const b = s.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height / 2 }; })()`);
  if (c) {
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x, y: c.y });
    await sleep(200);
    report.hoverCurrent = await evaluate(`[...document.querySelectorAll('[role=tooltip]')].filter(t => getComputedStyle(t).visibility === 'visible').map(t => t.textContent)`);
  }
} else {
  // Scroll to the very bottom: the sticky folded reveal (Sprint 38) must
  // not sit over the list.
  await evaluate("window.scrollTo(0, document.documentElement.scrollHeight)");
  await sleep(500);
  report.atBottom = await evaluate(`(() => {
    const section = document.querySelector('nav[aria-labelledby="notable-dates-section-heading"]');
    const pts = [${H - 4}, ${H - 60}, ${H - 200}].map(y => { const el = document.elementFromPoint(195, y); return { y, inList: !!section.contains(el), tag: el?.tagName, cls: el?.className?.toString().slice(0, 60) }; });
    return { scrollY: Math.round(scrollY), docH: document.documentElement.scrollHeight, points: pts };
  })()`);
  await shot("phone-390-bottom-viewport.png");
  // The whole bottom section, from the end of the reading section down.
  const clip = await evaluate(`(() => { const s = document.querySelector('nav[aria-labelledby="notable-dates-section-heading"]'); const b = s.getBoundingClientRect(); return { x: 0, y: Math.max(0, b.top + scrollY - 160), width: ${W}, height: Math.round(b.height + 160) }; })()`);
  await shot("phone-390-notable-section.png", clip);
  // Back to the top: the strip under the picker.
  await evaluate("window.scrollTo(0, 0)");
  await sleep(300);
  const top = await evaluate(`(() => { const f = document.querySelector('[class*=flowSlot]'); const b = f.getBoundingClientRect(); return { x: 0, y: 0, width: ${W}, height: Math.round(b.bottom + 20) }; })()`);
  await shot("phone-390-strip.png", top);
}

console.log(JSON.stringify(report, null, 2));
chrome.kill();
process.exit(0);
