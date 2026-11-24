/**
 * Sprint 46: Google Tag Manager, which carries the site's Google Analytics
 * stream. The GA4 tag itself is configured in Tag Manager, not here.
 */

/** R4: the one place the container ID lives. Public, so not a secret. */
export const GTM_CONTAINER_ID = "GTM-T9WQSKH3";

/** Where the container script loads from (Google's snippet, as given). */
export const GTM_SCRIPT_URL = `https://www.googletagmanager.com/gtm.js?id=${GTM_CONTAINER_ID}`;

/**
 * Google's snippet's inline half, as given: `dataLayer` exists, and gtag()
 * pushes onto it, before the container script runs (R2).
 */
export const GTM_INIT_SCRIPT = [
  "window.dataLayer = window.dataLayer || [];",
  "function gtag(){dataLayer.push(arguments);}",
  "gtag('js', new Date());",
].join("\n");

/**
 * R3: the container loads on Vercel's production deployment only. Vercel
 * sets VERCEL_ENV to "production", "preview" or "development"; nothing sets
 * it locally or in tests. Read on the server (no NEXT_PUBLIC_ copy), so
 * nothing on the client can switch it on.
 */
export function shouldLoadTagManager(
  source: Record<string, string | undefined> = process.env
): boolean {
  return source.VERCEL_ENV === "production";
}
