import "server-only";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Never statically optimized -- this must hit the database on every
// request, not report a build-time snapshot.
export const dynamic = "force-dynamic";

// 42P01 is Postgres's own undefined_table SQLSTATE, reachable if this ever
// queries Postgres directly. PGRST205 is what PostgREST actually returns
// for a table absent from its schema cache -- the path this route is on
// today, since supabase-js talks to PostgREST, not Postgres, and passes
// its error code through unchanged.
const SCHEMA_MISSING_CODES = new Set(["42P01", "PGRST205"]);

export async function GET() {
  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return NextResponse.json(
      {
        status: "misconfigured",
        connected: false,
        migrationVersion: null,
        error: (error as Error).message,
      },
      { status: 503 }
    );
  }

  const { data, error } = await admin
    .from("schema_migrations")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    const schemaMissing = SCHEMA_MISSING_CODES.has(error.code);
    return NextResponse.json(
      {
        // A missing relation still means we reached the database -- the
        // schema just hasn't been migrated onto it yet. Any other error
        // (auth, network) means connectivity itself is unknown at best.
        status: schemaMissing ? "schema_missing" : "down",
        connected: schemaMissing,
        migrationVersion: null,
        error: error.message,
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: "ok",
    connected: true,
    migrationVersion: data?.version ?? null,
  });
}
