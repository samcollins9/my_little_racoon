import { describe, expect, it } from "vitest";
import {
  GTM_CONTAINER_ID,
  GTM_INIT_SCRIPT,
  GTM_LOADER_SCRIPT,
  GTM_SCRIPT_URL,
  shouldLoadTagManager,
} from "./tag-manager";

describe("Google Tag Manager settings (Sprint 46)", () => {
  it("R6: the container is GTM-T9WQSKH3", () => {
    expect(GTM_CONTAINER_ID).toBe("GTM-T9WQSKH3");
    expect(GTM_SCRIPT_URL).toBe("https://www.googletagmanager.com/gtm.js?id=GTM-T9WQSKH3");
  });

  it("R2: the inline half is Google's snippet, as given, and loads no second tag", () => {
    expect(GTM_INIT_SCRIPT).toBe(
      "window.dataLayer = window.dataLayer || [];\n" +
        "function gtag(){dataLayer.push(arguments);}\n" +
        "gtag('js', new Date());"
    );
    // No GA4 measurement ID or gtag/js tag alongside the container.
    expect(GTM_INIT_SCRIPT).not.toMatch(/G-[A-Z0-9]+|gtag\/js|gtag\('config'/);
  });

  it("R2: the loader runs Google's inline half first, then inserts the async container once", () => {
    expect(GTM_LOADER_SCRIPT.startsWith(`${GTM_INIT_SCRIPT}\n`)).toBe(true);
    const insertion = GTM_LOADER_SCRIPT.slice(GTM_INIT_SCRIPT.length);
    expect(insertion).toContain("gtm.async = true;");
    expect(insertion).toContain(`gtm.src = '${GTM_SCRIPT_URL}';`);
    expect(insertion).toContain(`if (!document.querySelector('script[src="${GTM_SCRIPT_URL}"]'))`);
    expect(GTM_LOADER_SCRIPT).not.toMatch(/G-[A-Z0-9]+|gtag\/js|gtag\('config'/);
  });

  it("R2: running the loader sets up dataLayer, then appends one async container, and only once", () => {
    const appended: { async: boolean; src: string }[] = [];
    const window: { dataLayer?: unknown[] } = {};
    const document = {
      createElement: () => ({ async: false, src: "" }),
      head: { appendChild: (el: { async: boolean; src: string }) => appended.push({ ...el }) },
      querySelector: (selector: string) =>
        appended.some((el) => selector === `script[src="${el.src}"]`) ? {} : null,
    };
    let dataLayerWhenAppended: unknown[] | undefined;
    const head = document.head.appendChild;
    document.head.appendChild = (el) => {
      dataLayerWhenAppended = window.dataLayer && [...window.dataLayer];
      return head(el);
    };
    // In a browser, window.dataLayer is also the global `dataLayer` that
    // gtag() pushes to; a Function body has no such global, so alias it.
    const run = new Function("window", "document", `var dataLayer; ${GTM_LOADER_SCRIPT.replace(
      "window.dataLayer = window.dataLayer || [];",
      "window.dataLayer = window.dataLayer || []; dataLayer = window.dataLayer;"
    )}`);
    run(window, document);
    run(window, document);

    expect(appended).toEqual([{ async: true, src: GTM_SCRIPT_URL }]);
    expect(dataLayerWhenAppended).toHaveLength(1);
    expect(Array.from(dataLayerWhenAppended?.[0] as ArrayLike<unknown>)[0]).toBe("js");
  });

  it("R3: loads only when VERCEL_ENV is production", () => {
    expect(shouldLoadTagManager({ VERCEL_ENV: "production" })).toBe(true);
    expect(shouldLoadTagManager({ VERCEL_ENV: "preview" })).toBe(false);
    expect(shouldLoadTagManager({ VERCEL_ENV: "development" })).toBe(false);
    expect(shouldLoadTagManager({})).toBe(false);
    expect(shouldLoadTagManager({ VERCEL_ENV: "" })).toBe(false);
    expect(shouldLoadTagManager({ VERCEL_ENV: "Production" })).toBe(false);
  });
});
