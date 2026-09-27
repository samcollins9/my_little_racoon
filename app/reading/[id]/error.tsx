"use client";

import Link from "next/link";
import styles from "./unavailable.module.css";

/**
 * Sprint 25, R3: the unavailable state for /reading/[id]. page.tsx throws
 * DatabaseUnavailableError when the shared classifier says the database is
 * down; a server component cannot set its own status, and throwing is what
 * makes Next answer 5xx rather than 200. "use client" is Next's requirement
 * for an error boundary, not a choice -- this component holds no state.
 *
 * Wording is deliberately general. In production Next redacts a server
 * error's message before it reaches this boundary, so it cannot tell the
 * outage apart from any other server-side exception on this route -- and
 * the copy is true for both: temporary, try again, nothing about the
 * reading being missing (that is still the 404, R4). Nothing here is
 * derived from the requested id: no params read, no error text rendered.
 *
 * Step 1 works with the database down (R6), so the one way forward offered
 * is casting a chart.
 */
export default function ReadingUnavailable() {
  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <span className={styles.eyebrow}>Temporarily unavailable</span>
        <h1 className={styles.heading}>This reading can&rsquo;t be shown right now.</h1>
        <p className={styles.text}>
          The service behind saved readings isn&rsquo;t responding. Try this link again in a few
          minutes.
        </p>
        <Link href="/chart" className={styles.link}>
          Cast a new chart
        </Link>
      </main>
    </div>
  );
}
