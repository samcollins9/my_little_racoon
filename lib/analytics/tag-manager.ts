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
 * The whole snippet as one inline script: Google's inline half, then
 * Google's `<script async src="…gtm.js?id=…">`, inserted by the script
 * itself, after the inline half has run, and only if it isn't already on
 * the page.
 *
 * One inline script rather than two next/script tags (Sprint 46, LiveQA
 * round 1): a route-level notFound() is served as Next's bare error
 * document, where the root layout renders only in the browser. There a
 * beforeInteractive inline script is inert, so the container ran with no
 * `gtag('js')` and sent no page view; and next/script's `src` path adds a
 * ReactDOM.preload whose fetch isn't reused, so the container downloaded
 * twice. An afterInteractive inline script with no `src` runs on every
 * page, server-rendered or not, and fetches the container once.
 */
export const GTM_LOADER_SCRIPT = [
  GTM_INIT_SCRIPT,
  `if (!document.querySelector('script[src="${GTM_SCRIPT_URL}"]')) {`,
  "  var gtm = document.createElement('script');",
  "  gtm.async = true;",
  `  gtm.src = '${GTM_SCRIPT_URL}';`,
  "  document.head.appendChild(gtm);",
  "}",
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
