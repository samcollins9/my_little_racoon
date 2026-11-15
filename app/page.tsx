import { redirect } from "next/navigation";
import { connection } from "next/server";
import { datePagePath, utcToday } from "@/lib/date-page/params";

/**
 * Sprint 28, R2: `/` lands on today's date page, today meaning the UTC date
 * (decision d). This replaces Sprint 11's static redirect to /chart in
 * next.config.ts, which couldn't work out a date at all.
 *
 * What keeps it per request: `connection()` tells Next this render depends
 * on the incoming request, so the route is never prerendered at build time
 * and its output is never cached -- `utcToday()` reads the clock on every
 * request, and the landing page follows midnight UTC without a redeploy.
 * redirect() from a server component answers 307 (temporary): a 308 would
 * be cached by browsers and CDNs past midnight, Sprint 11's reason for
 * avoiding one.
 */
export default async function Home() {
  await connection();
  redirect(datePagePath(utcToday()));
}
