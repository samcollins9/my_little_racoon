import Script from "next/script";
import { GTM_LOADER_SCRIPT, shouldLoadTagManager } from "@/lib/analytics/tag-manager";

/**
 * Sprint 46: Google's Tag Manager snippet, loaded once per page from the
 * root layout, production only (R3). Rendered on the server, so the
 * VERCEL_ENV check never reaches the client.
 *
 * One afterInteractive inline script (GTM_LOADER_SCRIPT): Google's inline
 * half runs first, then it inserts the async container script itself, so
 * `dataLayer` always exists before the container runs (R2) and rendering
 * is never blocked. afterInteractive runs through Next's client loader
 * after hydration, so it works on every page, including a route-level 404
 * served as Next's bare error document (see GTM_LOADER_SCRIPT). The root
 * layout doesn't re-render on client navigation, so it loads once.
 */
export function TagManager({
  source = process.env,
}: {
  source?: Record<string, string | undefined>;
}) {
  if (!shouldLoadTagManager(source)) return null;
  return (
    <Script id="gtm" strategy="afterInteractive">
      {GTM_LOADER_SCRIPT}
    </Script>
  );
}
