import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Sprint 25, R2 (amended after LiveQA round 1): the one place that decides
 * whether a Supabase error means *the database is unavailable*. Every call
 * site imports this; none inspects error text itself.
 *
 * The rule is an explicit list of what is NOT an outage, taken from R1's
 * recordings (docs/sprint-25-database-outage-findings.md). Every other error
 * -- including any shape nobody has recorded yet -- counts as unavailable.
 * Round 1 had it the other way round (a list of what IS an outage) and it
 * failed live: the first real pause failed DNS resolution, the second came
 * back as an HTTP "Project paused" response, and only the first was on the
 * list. A paused project is not one shape, so the outage side can't be
 * enumerated; the not-an-outage side can.
 *
 * Not-an-outage, per operation:
 *   lookup (get_reading_by_id): Postgres 22P02, a malformed id -- a 404
 *     (Sprint 10's uniformity). An empty result isn't an error at all and
 *     never reaches this function.
 *   insert (readings): any SQLSTATE in class 22 (data exception) or 23
 *     (integrity constraint, e.g. the recorded 23502) -- the save was
 *     rejected, keep the generic message.
 *
 * Accepted cost (sprint file, Risks): a genuine server-side bug now shows
 * "temporarily unavailable" with a 5xx instead of a 404. For a server fault
 * that's the honest status, and logDatabaseUnavailable records it in full.
 *
 * Deliberately never used as signals: message/details text (including
 * "Project paused"), the hostname, and `instanceof PostgrestError` -- the
 * declared type is a class, but every recorded error was a plain object.
 */
export type SupabaseOperation = "lookup" | "insert";

type SupabaseErrorLike = Partial<Pick<PostgrestError, "code" | "message" | "details" | "hint">>;

export type SupabaseResultLike = {
  error: SupabaseErrorLike | null;
  status: number;
};

const SQLSTATE_CLASS_22_OR_23 = /^2[23][0-9A-Z]{3}$/;

const NOT_AN_OUTAGE: Record<SupabaseOperation, (code: string) => boolean> = {
  lookup: (code) => code === "22P02",
  insert: (code) => SQLSTATE_CLASS_22_OR_23.test(code),
};

export function isDatabaseUnavailable(
  operation: SupabaseOperation,
  { error }: Pick<SupabaseResultLike, "error">
): boolean {
  if (error === null) return false;
  return !NOT_AN_OUTAGE[operation](error.code ?? "");
}

/**
 * R8 (amended round 1): the unavailable path logs the whole error and the
 * HTTP status, not just the message -- round 1's paused shape was never
 * captured because only part of it was logged. Fields are copied out
 * explicitly so the log looks the same whether supabase-js hands back a
 * plain object (every recording so far) or a PostgrestError instance (its
 * declared type), where console.error would otherwise print a stack.
 */
export function logDatabaseUnavailable(where: string, { error, status }: SupabaseResultLike): void {
  console.error(`${where}: database unavailable`, {
    status,
    code: error?.code,
    message: error?.message,
    details: error?.details,
    hint: error?.hint,
  });
}

/**
 * Thrown by a server component or action that has classified its result as
 * unavailable, so the route's error boundary renders the unavailable state
 * with a 5xx -- a server component has no other way to set its own status.
 * The message is fixed and carries nothing request-specific (R3: the
 * unavailable output must not echo the requested id).
 */
export class DatabaseUnavailableError extends Error {
  constructor() {
    super("Database unavailable");
    this.name = "DatabaseUnavailableError";
  }
}
