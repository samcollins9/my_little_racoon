import { describe, expect, it } from "vitest";
import {
  GTM_CONTAINER_ID,
  GTM_INIT_SCRIPT,
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

  it("R3: loads only when VERCEL_ENV is production", () => {
    expect(shouldLoadTagManager({ VERCEL_ENV: "production" })).toBe(true);
    expect(shouldLoadTagManager({ VERCEL_ENV: "preview" })).toBe(false);
    expect(shouldLoadTagManager({ VERCEL_ENV: "development" })).toBe(false);
    expect(shouldLoadTagManager({})).toBe(false);
    expect(shouldLoadTagManager({ VERCEL_ENV: "" })).toBe(false);
    expect(shouldLoadTagManager({ VERCEL_ENV: "Production" })).toBe(false);
  });
});
