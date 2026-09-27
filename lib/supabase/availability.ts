import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Sprint 25, R2: the one place that decides whether a Supabase result means
 * *the database is unavailable* rather than anything else (a bad id, a
 * constraint violation, an empty result). Every call site imports this; none
 * inspects error text itself.
 *
 * The rule comes from R1's recordings (docs/sprint-25-database-outage-findings.md),
 * not from expectation. A paused project stops resolving in DNS, and every
 * unreachable mode recorded -- paused, DNS failure, connection refused --
 * came back as `status: 0` with an empty `code`: supabase-js caught the
 * failed fetch and never got an HTTP response. Every error that reached
 * Postgres carried an HTTP status and a SQLSTATE code (22P02, 23502). So the
 * split is structural: no response at all means unavailable.
 *
 * Deliberately not used as signals: the message or `details` text (the
 * network cause lives there and varies by failure mode), the hostname, and
 * `instanceof PostgrestError` -- the declared type is a class, but every
 * recorded error was a plain object.
 */
export type SupabaseResultLike = {
  error: Pick<PostgrestError, "code"> | null;
  status: number;
};

export function isDatabaseUnavailable({ error, status }: SupabaseResultLike): boolean {
  return error !== null && status === 0 && !error.code;
}

/**
 * Thrown by a server component that has classified its result as
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
