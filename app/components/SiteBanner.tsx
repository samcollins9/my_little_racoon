import Image from "next/image";
import Link from "next/link";
import styles from "./site-banner.module.css";

/** R4: 0a's portrait (manifest entry a22c751d…), extracted byte for byte. */
export const PORTRAIT_SRC = "/reloy-seer.png";
export const PORTRAIT_WIDTH = 133;
export const PORTRAIT_HEIGHT = 138;

/** R3: the one link's accessible name, the design's own label. */
export const HOME_LINK_LABEL = "Ask Reloy — home";

type SiteBannerProps = {
  /**
   * R8: one of lib/banner/taglines.ts's TAGLINES, picked on the server by
   * the page (pickTagline). `null` renders no tagline line at all, which is
   * what the reading page's error boundary passes: it's a client component,
   * so no server-picked value can reach it, and picking one there would mean
   * a random choice on the client (the user's decision, 24 Nov 2026).
   */
  tagline: string | null;
};

/**
 * Sprint 43: the "Ask Reloy" banner, Claude Design's direction 0a ("The
 * Seer") on desktop and 0e's Seer version on phones
 * (the banner variations file in docs/design/), minus the mock-up's nav and tagline
 * dots. One component, mounted at the top of the reading card by
 * ReadingView (/date/[date] and /reading/[id], every state) and by
 * /reading/[id]'s error boundary.
 *
 * No hooks, no state, no "use client": it's server-rendered wherever a page
 * renders it, and when the error boundary imports it, it's the same static
 * markup. Nothing in it changes after load, so the tagline isn't an
 * aria-live region (R9).
 *
 * R3, one tab stop. The design has two links to `/`: the portrait and the
 * wordmark. They can't be one <a>, because the tagline sits between them in
 * the layout and mustn't be part of the link's name. So the wordmark is the
 * link keyboard and assistive-technology users meet, named HOME_LINK_LABEL.
 * The portrait's link is a mouse and touch convenience only: tabIndex -1
 * takes it out of the tab order, and aria-hidden takes it out of the
 * accessibility tree. That's why its image's alt is empty (R4): a reader
 * never reaches it, and the meaning is carried by the wordmark link's name.
 */
export function SiteBanner({ tagline }: SiteBannerProps) {
  return (
    <header className={styles.banner}>
      <Link href="/" className={styles.portraitLink} tabIndex={-1} aria-hidden="true">
        {/* unoptimized: served as-is from public/, never resized or
            re-encoded, so the pixel art stays exactly 0a's bytes. */}
        <Image
          src={PORTRAIT_SRC}
          alt=""
          width={PORTRAIT_WIDTH}
          height={PORTRAIT_HEIGHT}
          unoptimized
          loading="eager"
          className={styles.portrait}
        />
      </Link>
      <div className={styles.text}>
        <Link href="/" className={styles.wordmark} aria-label={HOME_LINK_LABEL}>
          Ask <span className={styles.wordmarkAccent}>Reloy</span>
        </Link>
        {tagline ? <p className={styles.tagline}>{tagline}</p> : null}
      </div>
    </header>
  );
}
