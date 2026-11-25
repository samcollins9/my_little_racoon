// Sprint 49: screenshot a 404 page at 1280x800, light and dark colour
// schemes, to compare app/not-found.tsx with Next's built-in 404.
//   node shot404.mjs <url> <outPrefix>
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const [url, prefix] = process.argv.slice(2);
const CHROME = `${process.env.HOME}/.cache/ms-playwright/chromium-1248/chrome-linux64/chrome`;
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ["--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${port}`, `--user-data-dir=/tmp/claude-1000/shot404-${port}`, "about:blank"], { stdio: "ignore" });
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
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
for (const scheme of ["light", "dark"]) {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: scheme }] });
  await send("Page.navigate", { url });
  await sleep(3500);
  const r = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${prefix}-${scheme}.png`, Buffer.from(r.data, "base64"));
}
ws.close();
chrome.kill();
