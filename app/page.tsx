import { redirect } from "next/navigation";
import { connection } from "next/server";
import { frontDoorDate } from "@/lib/date-page/front-door";
import { datePagePath, utcToday } from "@/lib/date-page/params";

/**
 * Sprint 28, R2: `/` lands on a date page worked out per request, today
 * meaning the UTC date (decision d). Sprint 41 keeps today's month and day
 * but picks the latest year with a Wikipedia event on it, falling back to
 * today itself (lib/date-page/front-door.ts). Nothing here touches the
 * database.
 *
 * What keeps it per request: `connection()` tells Next this render depends
 * on the incoming request, so the route is never prerendered at build time
 * and its output is never cached -- `utcToday()` reads the clock on every
 * request, and the landing page follows midnight UTC without a redeploy.
 * redirect() from a server component answers 307 (temporary): a 308 would
 * be cached by browsers and CDNs past midnight, Sprint 11's reason for
 * avoiding one. The landing year can change too, so the same reasoning
 * holds for it.
 */
export default async function Home() {
  await connection();
  redirect(datePagePath(await frontDoorDate(utcToday())));
}
