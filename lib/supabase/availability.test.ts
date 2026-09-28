import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isDatabaseUnavailable,
  logDatabaseUnavailable,
  type SupabaseOperation,
  type SupabaseResultLike,
} from "./availability";

// Sprint 25, R2: recorded fixtures are read straight out of R1's findings
// doc -- the JSON blocks, verbatim -- rather than copied into a second file,
// so a fixture cannot drift from what was actually measured. The one
// exception is the synthetic unknown-shape case below, which the amended R2
// explicitly allows because it tests the default branch.
type Recording = {
  recordedAt: string;
  target: string;
  results: Array<{ label: string; data: unknown } & SupabaseResultLike>;
};

const findings = readFileSync(
  new URL("../../docs/sprint-25-database-outage-findings.md", import.meta.url),
  "utf8"
);
const recordings: Recording[] = [...findings.matchAll(/```json\n([\s\S]*?)\n```/g)].map(
  (match) => JSON.parse(match[1])
);

const PROD = "rzlojpwlhbcfzpohbwso.supabase.co";
const PAUSED_AT = "2026-09-27T19:59:12.431Z";
const recordingsOf = (target: string) => recordings.filter((r) => r.target === target);
const operationOf = (label: string): SupabaseOperation =>
  label.startsWith("insert") ? "insert" : "lookup";

function recorded(label: string) {
  const healthy = recordingsOf(PROD)[0];
  const result = healthy?.results.find((r) => r.label.startsWith(label));
  if (!result) throw new Error(`no healthy recording for ${label}`);
  return result;
}

describe("isDatabaseUnavailable, against R1's recorded results", () => {
  it("found every recording the doc is expected to hold", () => {
    // healthy, paused, restored (production) + DNS failure + connection refused
    expect(recordingsOf(PROD)).toHaveLength(3);
    expect(recordingsOf("no-such-project.invalid")).toHaveLength(1);
    expect(recordingsOf("127.0.0.1:54399")).toHaveLength(1);
  });

  it("paused project (the DNS-failure pause): unavailable, for the RPC and the insert", () => {
    // Identified by its recordedAt, not its position in the doc.
    const paused = recordingsOf(PROD).find((r) => r.recordedAt === PAUSED_AT);
    if (!paused) throw new Error(`no paused recording at ${PAUSED_AT}`);
    expect(paused.results).toHaveLength(3);
    for (const result of paused.results) {
      expect(isDatabaseUnavailable(operationOf(result.label), result)).toBe(true);
    }
  });

  it("DNS failure and connection refused: unavailable", () => {
    for (const target of ["no-such-project.invalid", "127.0.0.1:54399"]) {
      for (const result of recordingsOf(target)[0].results) {
        expect(isDatabaseUnavailable(operationOf(result.label), result)).toBe(true);
      }
    }
  });

  it("lookup, malformed uuid (22P02): not unavailable -- stays the 404 (R4)", () => {
    const result = recorded("rpc get_reading_by_id, malformed id");
    expect(result.error?.code).toBe("22P02");
    expect(isDatabaseUnavailable("lookup", result)).toBe(false);
  });

  it("lookup, well-formed id with no row (empty result): no error, not unavailable", () => {
    const result = recorded("rpc get_reading_by_id, random well-formed uuid");
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    expect(isDatabaseUnavailable("lookup", result)).toBe(false);
  });

  it("insert, constraint violation (23502): not unavailable -- keeps the generic message (R5)", () => {
    const result = recorded("insert readings, positions omitted");
    expect(result.error?.code).toBe("23502");
    expect(isDatabaseUnavailable("insert", result)).toBe(false);
  });

  it("each operation's list stays its own: a recorded 23502 on a lookup counts as unavailable", () => {
    // The lookup never legitimately raises a constraint error; only 22P02
    // is a known not-an-outage there.
    expect(isDatabaseUnavailable("lookup", recorded("insert readings, positions omitted"))).toBe(true);
  });
});

describe("isDatabaseUnavailable, default branch", () => {
  // SYNTHETIC -- the only hand-built fixture in this file (amended R2). It
  // matches no recording: a non-zero HTTP status and no SQLSTATE. It makes no
  // claim about what Supabase actually sends; it pins the default branch --
  // an error shape nobody has seen yet must count as unavailable.
  const SYNTHETIC_UNKNOWN_SHAPE: SupabaseResultLike = {
    status: 503,
    error: { code: "", message: "synthetic: shape matching no recording", details: "", hint: "" },
  };

  it("an unrecognised error shape is unavailable, for both operations", () => {
    expect(isDatabaseUnavailable("lookup", SYNTHETIC_UNKNOWN_SHAPE)).toBe(true);
    expect(isDatabaseUnavailable("insert", SYNTHETIC_UNKNOWN_SHAPE)).toBe(true);
  });
});

describe("logDatabaseUnavailable (R8, amended)", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs the HTTP status and every field of the recorded paused error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const paused = recordingsOf(PROD).find((r) => r.recordedAt === PAUSED_AT)!.results[0];

    logDatabaseUnavailable("ReadingPage", paused);

    expect(spy).toHaveBeenCalledWith("ReadingPage: database unavailable", {
      status: paused.status,
      code: paused.error?.code,
      message: paused.error?.message,
      details: paused.error?.details,
      hint: paused.error?.hint,
    });
  });
});
