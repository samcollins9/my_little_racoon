import { defineConfig } from "vitest/config";

// RLS policy tests need a live Supabase stack (`supabase start`) and the
// resulting URL/anon key as NEXT_PUBLIC_SUPABASE_URL /
// NEXT_PUBLIC_SUPABASE_ANON_KEY. Kept out of the default `npm run test`
// run (see vitest.config.ts) so that suite stays fast and network-free.
export default defineConfig({
  test: {
    include: ["supabase/tests/**/*.test.ts"],
    // One file at a time (Sprint 29): get_recent_reading_dates ranks the
    // whole table by generation time, so its exact-order assertions only
    // hold if no other suite is writing horoscopes at the same moment.
    // Tests inside a file already run in sequence.
    fileParallelism: false,
  },
});
