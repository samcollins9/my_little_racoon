import type { SupabaseClient } from "@supabase/supabase-js";
import { vi } from "vitest";

type Result = { data: unknown; error: unknown; status: number };

/**
 * A Supabase client double for the date page's tests, shared by load.test.ts
 * and cast.test.ts. `rpc` answers per function name and `from(...).insert`
 * answers with `insertResult`; every call is recorded so a test can assert
 * what was NOT called (R3: a render never inserts or writes a horoscope).
 * Named without `.test.` so vitest doesn't collect it as a suite.
 */
export function fakeSupabase({
  rpc = {},
  insertResult = { data: null, error: null, status: 201 },
}: {
  rpc?: Record<string, Result>;
  insertResult?: Result;
} = {}) {
  const insert = vi.fn().mockResolvedValue(insertResult);
  const from = vi.fn().mockReturnValue({ insert });
  const rpcFn = vi.fn(async (name: string) => {
    const result = rpc[name];
    if (!result) throw new Error(`fakeSupabase: unexpected rpc ${name}`);
    return result;
  });
  return {
    client: { rpc: rpcFn, from } as unknown as SupabaseClient,
    rpc: rpcFn,
    from,
    insert,
  };
}

export const EMPTY_LOOKUP: Result = { data: [], error: null, status: 200 };

/** The DNS-failure shape a paused project produced (Sprint 25 findings). */
export const PAUSED_LOOKUP: Result = {
  data: null,
  error: { code: "", message: "TypeError: fetch failed", details: "", hint: "" },
  status: 0,
};
