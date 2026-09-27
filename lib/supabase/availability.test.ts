import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isDatabaseUnavailable, type SupabaseResultLike } from "./availability";

// Sprint 25, R2: fixtures are read straight out of R1's findings doc -- the
// recorded JSON blocks, verbatim -- rather than copied into a second file,
// so a fixture cannot drift from what was actually measured.
type Recording = {
  recordedAt: string;
  target: string;
  results: Array<{ label: string } & SupabaseResultLike & { data: unknown }>;
};

const findings = readFileSync(
  new URL("../../docs/sprint-25-database-outage-findings.md", import.meta.url),
  "utf8"
);
const recordings: Recording[] = [...findings.matchAll(/```json\n([\s\S]*?)\n```/g)].map(
  (match) => JSON.parse(match[1])
);

function recorded(target: string, label: string) {
  const recording = recordings.find((r) => r.target === target);
  const result = recording?.results.find((r) => r.label.startsWith(label));
  if (!result) throw new Error(`no recording for ${target} / ${label}`);
  return result;
}

const PROD = "rzlojpwlhbcfzpohbwso.supabase.co";
const PAUSED_AT = "2026-09-27T19:59:12.431Z";
const recordingsOf = (target: string) => recordings.filter((r) => r.target === target);

describe("isDatabaseUnavailable, against R1's recorded results", () => {
  it("found every recording the doc is expected to hold", () => {
    // healthy, paused, restored (production) + DNS failure + connection refused
    expect(recordingsOf(PROD)).toHaveLength(3);
    expect(recordingsOf("no-such-project.invalid")).toHaveLength(1);
    expect(recordingsOf("127.0.0.1:54399")).toHaveLength(1);
  });

  it("paused project: unavailable, for the RPC and the insert", () => {
    // Identified by its recordedAt, not its position in the doc.
    const paused = recordingsOf(PROD).find((r) => r.recordedAt === PAUSED_AT);
    if (!paused) throw new Error(`no paused recording at ${PAUSED_AT}`);
    expect(paused.results).toHaveLength(3);
    for (const result of paused.results) {
      expect(result.error?.code).toBe("");
      expect(isDatabaseUnavailable(result)).toBe(true);
    }
  });

  it("DNS failure: unavailable", () => {
    for (const result of recordingsOf("no-such-project.invalid")[0].results) {
      expect(isDatabaseUnavailable(result)).toBe(true);
    }
  });

  it("connection refused: unavailable", () => {
    for (const result of recordingsOf("127.0.0.1:54399")[0].results) {
      expect(isDatabaseUnavailable(result)).toBe(true);
    }
  });

  it("malformed uuid (22P02): not unavailable -- stays a not-found (R4)", () => {
    const result = recorded(PROD, "rpc get_reading_by_id, malformed id");
    expect(result.error?.code).toBe("22P02");
    expect(isDatabaseUnavailable(result)).toBe(false);
  });

  it("well-formed id with no row (empty result): not unavailable", () => {
    const result = recorded(PROD, "rpc get_reading_by_id, random well-formed uuid");
    expect(result.error).toBeNull();
    expect(result.data).toEqual([]);
    expect(isDatabaseUnavailable(result)).toBe(false);
  });

  it("constraint violation on insert (23502): not unavailable -- keeps the generic save message (R5)", () => {
    const result = recorded(PROD, "insert readings, positions omitted");
    expect(result.error?.code).toBe("23502");
    expect(isDatabaseUnavailable(result)).toBe(false);
  });
});
