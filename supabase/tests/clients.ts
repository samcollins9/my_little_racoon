import { createClient } from "@supabase/supabase-js";
import { resolveAdminConfig } from "../../lib/supabase/admin";
import { resolvePublicConfig } from "../../lib/supabase/config";

// Shared by every RLS suite. Not a `.test.ts` file, so vitest doesn't
// collect it as one.
//
// `anon` is the client every assertion runs on -- the role RLS actually
// governs. Using the service role for an assertion would bypass RLS and
// make the suite pass no matter what the policies say (Sprint 4, R7).
const { url, anonKey } = resolvePublicConfig();
export const anon = createClient(url, anonKey);

// `seed` (Sprint 28, R12) exists only because anon can no longer write
// readings at all: the app writes server-side with the service role, so the
// suites seed their fixture rows the same way. Seeding only -- never read
// through this, or an assertion stops meaning anything. Reads go through
// `anon` and the RPCs, exactly as the app does them.
const admin = resolveAdminConfig();
export const seed = createClient(admin.url, admin.serviceRoleKey, {
  auth: { persistSession: false },
});
