// Sprint 45, round 3: LiveQA round 1's sideways-scroll defect, re-measured.
// At each desktop width: the page's scroll width with every tooltip closed,
// then every notable date hovered in turn, checking that the open tooltip
// stays inside the card and the viewport, flush under its date, and that the page still can't
// scroll sideways. Then keyboard focus and Chrome's accessibility tree, to
// confirm aria-describedby still reads a display:none tooltip.
//   node cdp45-overflow.mjs <url> <outDir>
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [url, outDir] = process.argv.slice(2);
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/claude-1000/cdp45r3-profile-${port}`, "about:blank"], { stdio: "ignore" });
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
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${outDir}/${name}`, Buffer.from(r.data, "base64"));
};
const move = (x, y) => send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });

await send("Page.enable");
await send("Runtime.enable");
await send("Accessibility.enable");

const report = { url, browser: (await send("Browser.getVersion")).product, widths: [] };
const WIDTHS = [901, 1000, 1100, 1200, 1279, 1280, 1320, 1440];
for (const W of WIDTHS) {
  await send("Emulation.setDeviceMetricsOverride", { width: W, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  await sleep(W === WIDTHS[0] ? 12000 : 4000);
  await move(1, 1);
  const closed = await evaluate(`({ vw: innerWidth, docW: document.documentElement.scrollWidth,
    shownTooltips: [...document.querySelectorAll('[role=tooltip]')].filter(t => getComputedStyle(t).display !== 'none').length })`);
  const items = await evaluate(`[...document.querySelectorAll('nav[aria-labelledby="notable-dates-strip-heading"] li')].map(li => {
    const r = li.querySelector('a, [aria-current]').getBoundingClientRect();
    return { date: li.querySelector('a, [aria-current]').textContent, x: r.left + 4, y: r.top + r.height / 2 };
  })`);
  const hovers = [];
  for (const it of items) {
    await move(it.x, it.y);
    await sleep(60);
    hovers.push(await evaluate(`(() => {
      const card = document.querySelector('main').getBoundingClientRect();
      const shown = [...document.querySelectorAll('[role=tooltip]')].filter(t => getComputedStyle(t).display !== 'none');
      const t = shown[0]?.getBoundingClientRect();
      const anchor = [...document.querySelectorAll('nav[aria-labelledby="notable-dates-strip-heading"] li')]
        .find(li => li.contains(shown[0]))?.getBoundingClientRect();
      return { date: ${JSON.stringify(it.date)}, shown: shown.length, text: shown[0]?.textContent,
        left: Math.round(t?.left), right: Math.round(t?.right), cardLeft: Math.round(card.left), cardRight: Math.round(card.right),
        flipped: !!t && !!anchor && Math.abs(t.right - anchor.right) < 1 && Math.abs(t.left - anchor.left) >= 1,
        flushUnderDate: !!t && !!anchor && Math.abs(t.top - anchor.bottom) < 1,
        docW: document.documentElement.scrollWidth };
    })()`));
  }
  const worst = hovers.reduce((a, h) => (h.right > a.right ? h : a), hovers[0]);
  const entry = {
    width: W, closed,
    hoverAll: {
      count: hovers.length,
      everyOneShowsExactlyOne: hovers.every((h) => h.shown === 1),
      everyOneFlushUnderItsDate: hovers.every((h) => h.flushUnderDate),
      everyOneInsideCard: hovers.every((h) => h.left >= h.cardLeft && h.right <= h.cardRight),
      everyOneInsideViewport: hovers.every((h) => h.right <= W),
      maxDocWWhileOpen: Math.max(...hovers.map((h) => h.docW)),
      flippedLeftwards: hovers.filter((h) => h.flipped).map((h) => h.date),
      rightmost: worst,
    },
  };
  report.widths.push(entry);
  if (W === 901 || W === 1200) {
    await move(worst && items.find((i) => i.date === worst.date).x, items.find((i) => i.date === worst.date).y);
    await sleep(100);
    await shot(`round3-${W}-hover-rightmost.png`);
  }
}

// Keyboard and the accessibility tree at 1000px: a closed tooltip is
// display:none, so check its link still has the description.
await send("Emulation.setDeviceMetricsOverride", { width: 1000, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url });
await sleep(4000);
await move(1, 1);
const ax = async () => {
  const { nodes } = await send("Accessibility.getFullAXTree");
  return nodes.filter((n) => n.role?.value === "link" && n.description?.value)
    .map((n) => ({ name: n.name?.value, description: n.description?.value }));
};
const describedWhileClosed = await ax();
await evaluate(`document.querySelector('a[href="/date/1990-02-11"]').focus({ focusVisible: true })`);
for (let i = 0; i < 2; i++) {
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, modifiers: 8 });
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
}
report.keyboard1000 = await evaluate(`(() => {
  const a = document.activeElement;
  const shown = [...document.querySelectorAll('[role=tooltip]')].filter(t => getComputedStyle(t).display !== 'none');
  return { focused: a.textContent, focusVisible: a.matches(':focus-visible'), shown: shown.map(t => t.textContent),
    right: Math.round(shown[0]?.getBoundingClientRect().right), vw: innerWidth, docW: document.documentElement.scrollWidth };
})()`);
await shot("round3-1000-keyboard.png");
report.accessibility1000 = { linksWithDescriptionWhileAllClosed: describedWhileClosed.length, sample: describedWhileClosed.slice(0, 3) };

writeFileSync(`${outDir}/overflow-report.json`, JSON.stringify(report, null, 2));
ws.close();
chrome.kill();
console.log(JSON.stringify(report.widths.map((w) => ({ w: w.width, docW: w.closed.docW, ...w.hoverAll, rightmost: undefined })), null, 1));
console.log(JSON.stringify({ keyboard: report.keyboard1000, ax: report.accessibility1000 }, null, 1));
