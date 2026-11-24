import Script from "next/script";
import {
  GTM_INIT_SCRIPT,
  GTM_SCRIPT_URL,
  shouldLoadTagManager,
} from "@/lib/analytics/tag-manager";

/**
 * Sprint 46: Google's Tag Manager snippet, loaded once per page from the
 * root layout, production only (R3). Rendered on the server, so the
 * VERCEL_ENV check never reaches the client.
 *
 * next/script rather than raw <script> tags, so the order is guaranteed
 * (R2): the inline half is beforeInteractive, in the initial HTML ahead of
 * any app code, and the container is afterInteractive, injected after
 * hydration, so it never blocks rendering and always finds `dataLayer`
 * already there. The root layout doesn't re-render on client navigation,
 * so neither script loads twice.
 */
export function TagManager({
  source = process.env,
}: {
  source?: Record<string, string | undefined>;
}) {
  if (!shouldLoadTagManager(source)) return null;
  return (
    <>
      <Script id="gtm-init" strategy="beforeInteractive">
        {GTM_INIT_SCRIPT}
      </Script>
      <Script id="gtm-container" src={GTM_SCRIPT_URL} strategy="afterInteractive" />
    </>
  );
}
