import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  chunkHasUnscopedReadingsSelect,
  findUnfilteredReadingsQueries,
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

describe("chunkHasUnscopedReadingsSelect", () => {
  it("rejects a bare select with no id filter", () => {
    expect(chunkHasUnscopedReadingsSelect('from("readings").select("*")')).toBe(true);
  });

  it("rejects filtering by a different column, since that still isn't id-scoped", () => {
    expect(
      chunkHasUnscopedReadingsSelect('from("readings").select("*").eq("event_date", date)')
    ).toBe(true);
  });

  it("accepts a select scoped to a single id", () => {
    expect(chunkHasUnscopedReadingsSelect('.select("*").eq("id", id)')).toBe(false);
    expect(chunkHasUnscopedReadingsSelect(".select('*').eq('id', id)")).toBe(false);
  });

  it("accepts the get_reading_by_id RPC path", () => {
    expect(
      chunkHasUnscopedReadingsSelect('rpc("get_reading_by_id", { reading_id }).select()')
    ).toBe(false);
  });

  it("does not flag an insert or update with no trailing select -- it can't return existing rows", () => {
    expect(chunkHasUnscopedReadingsSelect('from("readings").insert({ id, event_date })')).toBe(
      false
    );
    expect(
      chunkHasUnscopedReadingsSelect('from("readings").update({ event_date }).eq("id", id)')
    ).toBe(false);
  });

  it("does not exempt an unfiltered select just because the RPC is mentioned nearby", () => {
    // The exact shape QA1's round 2 audit demonstrated: a safe RPC call
    // and a genuinely unfiltered select coexisting in one file. A
    // per-file check waved this through; a per-statement check must not.
    const fileSource = `
      const safe = await anon.rpc("get_reading_by_id", { reading_id: id });
      const leak = await anon.from("readings").select("*");
    `;
    const chunks = fileSource.split(";");
    expect(chunks.some(chunkHasUnscopedReadingsSelect)).toBe(true);
  });
});

describe("findUnfilteredReadingsQueries", () => {
  let fixtureDir: string | null = null;

  afterEach(() => {
    if (fixtureDir) {
      rmSync(fixtureDir, { recursive: true, force: true });
      fixtureDir = null;
    }
  });

  function writeFixture(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "readings-guardrail-fixture-"));
    fixtureDir = dir;
    for (const [relPath, content] of Object.entries(files)) {
      const full = join(dir, relPath);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, content);
    }
    return dir;
  }

  it("catches a listing route reached through a lib/ helper, not just app/", () => {
    // QA1's round 2 audit's hole 2: a complete working listing route with
    // the actual query living one import away in lib/, invisible to an
    // app/-only walk.
    const dir = writeFixture({
      "lib/list-readings.ts": `
        export async function listReadings(anon) {
          return anon.from("readings").select("*");
        }
      `,
      "app/admin-list/page.tsx": `
        import { listReadings } from "../../lib/list-readings";
        export default async function Page() {
          const data = await listReadings(anon);
          return null;
        }
      `,
    });

    const offenders = findUnfilteredReadingsQueries([join(dir, "app"), join(dir, "lib")]);
    expect(offenders).toContain(join(dir, "lib/list-readings.ts"));
  });

  it("catches an unfiltered select living in the same file as a safe RPC call", () => {
    // QA1's round 2 audit's hole 1: one get_reading_by_id mention used to
    // exempt an entire file, including an unrelated leak in it.
    const dir = writeFixture({
      "app/reading/[id]/page.tsx": `
        export default async function Page() {
          const safe = await anon.rpc("get_reading_by_id", { reading_id: id });
          const leak = await anon.from("readings").select("*");
          return null;
        }
      `,
    });

    const offenders = findUnfilteredReadingsQueries([join(dir, "app")]);
    expect(offenders).toContain(join(dir, "app/reading/[id]/page.tsx"));
  });

  it("does not flag a file where the only readings access is the RPC", () => {
    const dir = writeFixture({
      "app/reading/[id]/page.tsx": `
        export default async function Page() {
          const safe = await anon.rpc("get_reading_by_id", { reading_id: id });
          return null;
        }
      `,
    });

    expect(findUnfilteredReadingsQueries([join(dir, "app")])).toEqual([]);
  });

  it("does not flag a file where the only readings access is insert-only", () => {
    const dir = writeFixture({
      "app/chart/actions.ts": `
        export async function saveReading(anon, id, positions) {
          return anon.from("readings").insert({ id, positions });
        }
      `,
    });

    expect(findUnfilteredReadingsQueries([join(dir, "app")])).toEqual([]);
  });
});

describe("no listing route for readings anywhere in app/ or lib/ (R5, R8)", () => {
  it("every readings-referencing statement is id-scoped, insert-only, or uses the RPC", () => {
    const offenders = findUnfilteredReadingsQueries([
      join(process.cwd(), "app"),
      join(process.cwd(), "lib"),
    ]);
    expect(offenders).toEqual([]);
  });
});
