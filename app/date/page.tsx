import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { datePagePath, parseDatePageParam, utcToday } from "@/lib/date-page/params";

/**
 * Sprint 28, R7: where the date picker's plain GET form lands
 * (/date?date=YYYY-MM-DD). Validates with the same parseDatePageParam the
 * date page uses and redirects (307) to /date/YYYY-MM-DD; an invalid or
 * out-of-range value gets the same 404 as /date/<bad>, never a 500. With no
 * value at all it goes to today (UTC), like `/`.
 */
export default async function DatePickerTarget({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  await connection();
  const { date } = await searchParams;

  if (date === undefined) redirect(datePagePath(utcToday()));

  const isoDate = parseDatePageParam(date);
  if (!isoDate) notFound();

  redirect(datePagePath(isoDate));
}
