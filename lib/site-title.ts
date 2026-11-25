/**
 * The site's name in page titles and metadata (Sprint 43 kept it as
 * "Retroactive Horoscope"; the banner's "Ask Reloy" is visible text only).
 */
export const SITE_TITLE = "Retroactive Horoscope";

/**
 * Sprint 49, R1: the title of a page showing a date -- the site's name, one
 * ASCII space, then the date as YYYY-MM-DD ("Retroactive Horoscope
 * 1969-07-20"). The one place such a title is put together; every page with
 * a date uses it, and every page without one keeps SITE_TITLE (the root
 * layout's default).
 */
export function datedTitle(isoDate: string): string {
  return `${SITE_TITLE} ${isoDate}`;
}
