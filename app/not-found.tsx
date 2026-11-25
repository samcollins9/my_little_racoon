import type { CSSProperties } from "react";

/**
 * Sprint 49, R4: every 404 -- notFound() on a bad date or an unknown
 * reading, and any URL no route matches -- keeps the root layout's plain
 * "Retroactive Horoscope" as its title.
 *
 * Next's built-in 404 renders its own <title>404: This page could not be
 * found.</title>, which a browser put ahead of the site's title on route
 * 404s (the user chose this file over accepting that, 25 Nov 2026). This
 * is the same page with that one tag left out: the markup, inline styles
 * and colour-scheme rule below are copied from Next 16.3's
 * HTTPAccessErrorFallback (next/dist/client/components/http-access-fallback/
 * error-fallback.js and styles/access-error-styles.js), so nothing a
 * visitor sees changes. The 404 status and Next's noindex tag are Next's
 * own and unaffected.
 */

const STATUS = 404;
const MESSAGE = "This page could not be found.";

const styles: Record<"error" | "desc" | "h1" | "h2", CSSProperties> = {
  error: {
    fontFamily: 'system-ui,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"',
    height: "100vh",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  desc: { display: "inline-block" },
  h1: {
    display: "inline-block",
    margin: "0 20px 0 0",
    padding: "0 23px 0 0",
    fontSize: 24,
    fontWeight: 500,
    verticalAlign: "top",
    lineHeight: "49px",
  },
  h2: { fontSize: 14, fontWeight: 400, lineHeight: "49px", margin: 0 },
};

const COLOUR_SCHEME_CSS =
  "body{color:#000;background:#fff;margin:0}.next-error-h1{border-right:1px solid rgba(0,0,0,.3)}" +
  "@media (prefers-color-scheme:dark){body{color:#fff;background:#000}.next-error-h1{border-right:1px solid rgba(255,255,255,.3)}}";

export default function NotFound() {
  return (
    <div style={styles.error}>
      <div>
        <style dangerouslySetInnerHTML={{ __html: COLOUR_SCHEME_CSS }} />
        <h1 className="next-error-h1" style={styles.h1}>
          {STATUS}
        </h1>
        <div style={styles.desc}>
          <h2 style={styles.h2}>{MESSAGE}</h2>
        </div>
      </div>
    </div>
  );
}
