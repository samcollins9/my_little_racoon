import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  findUnfilteredReadingsQueries,
  hasUnscopedReadingsSelect,
  referencesReadingsTable,
} from "./readings-access-guardrail";

describe("referencesReadingsTable", () => {
  it("detects the table name in either quote style", () => {
    expect(referencesReadingsTable('from("readings")')).toBe(true);
    expect(referencesReadingsTable("from('readings')")).toBe(true);
  });

  it("does not flag unrelated source", () => {
    expect(referencesReadingsTable('from("schema_migrations")')).toBe(false);
  });
});

describe("hasUnscopedReadingsSelect", () => {
  it("rejects a bare select with no id filter", () => {
    expect(hasUnscopedReadingsSelect('from("readings").select("*")')).toBe(true);
  });

  it("rejects filtering by a different column, since that still isn't id-scoped", () => {
    expect(hasUnscopedReadingsSelect('from("readings").select("*").eq("event_date", date)')).toBe(
      true
    );
  });

  it("accepts a select scoped to a single id", () => {
    expect(hasUnscopedReadingsSelect('.select("*").eq("id", id)')).toBe(false);
    expect(hasUnscopedReadingsSelect(".select('*').eq('id', id)")).toBe(false);
  });

  it("accepts the get_reading_by_id RPC path", () => {
    expect(
      hasUnscopedReadingsSelect('rpc("get_reading_by_id", { reading_id }).select()')
    ).toBe(false);
  });

  it("does not flag an insert or update with no trailing select -- it can't return existing rows", () => {
    expect(hasUnscopedReadingsSelect('from("readings").insert({ id, event_date })')).toBe(false);
    expect(hasUnscopedReadingsSelect('from("readings").update({ event_date }).eq("id", id)')).toBe(
      false
    );
  });
});

describe("no listing route for readings anywhere in app/ (R5, R8)", () => {
  it("every file referencing readings is id-scoped, insert-only, or uses the RPC", () => {
    const offenders = findUnfilteredReadingsQueries(join(process.cwd(), "app"));
    expect(offenders).toEqual([]);
  });
});
