"use client";

import Link from "next/link";
import { SiteBanner } from "../../components/SiteBanner";
import styles from "./unavailable.module.css";

/**
 * Sprint 25, R3: the unavailable state for /reading/[id]. page.tsx throws
 * DatabaseUnavailableError when the shared classifier says the database is
 * down; a server component cannot set its own status, and throwing is what
 * makes Next answer 5xx rather than 200. "use client" is Next's requirement
 * for an error boundary, not a choice -- this component holds no state.
 *
 * Wording names no cause, because this boundary can't know one. In
 * production Next redacts a server error's message before it reaches
 * here, so a database outage looks the same as any other server-side
 * exception on this route -- and the amended R2 deliberately sends
 * unrecognised RPC errors, which may be genuine bugs, here too. An earlier
 * version said "The service behind saved readings isn't responding" and
 * claimed that was true for both; it wasn't (QA1, Sprint 25, non-blocking
 * note), so every sentence now has to hold for any server error: it went
 * wrong on our side, try again later, and nothing about the reading being
 * missing (that is still the 404, R4). Nothing here is derived from the
 * requested id: no params read, no error text rendered.
 *
 * Sprint 31, R4: the one way forward offered is `/`, which lands on today's
 * date page. That page still renders its chart and events with the database
 * down (Sprint 28, R6), so the link works in exactly the situation this
 * boundary is shown for. The label promises a date, not a chart or a reading,
 * because a saved horoscope may be what's unavailable.
 *
 * Sprint 43, R2: the banner opens this card too, with no tagline. This is a
 * client component, so a tagline picked on the server can't reach it, and
 * picking one here would be a random choice on the client (R8). The user
 * chose "banner, no tagline" for this state on 24 Nov 2026.
 */
export default function ReadingUnavailable() {
  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <SiteBanner tagline={null} />
        <div className={styles.cardBody}>
          <span className={styles.eyebrow}>Temporarily unavailable</span>
          <h1 className={styles.heading}>This reading can&rsquo;t be shown right now.</h1>
          <p className={styles.text}>
            Something went wrong on our side. Try this link again in a few minutes.
          </p>
          <Link href="/" className={styles.link}>
            Go to today
          </Link>
        </div>
      </main>
    </div>
  );
}
