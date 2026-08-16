import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export function referencesReadingsTable(chunk: string): boolean {
  return chunk.includes('"readings"') || chunk.includes("'readings'");
}

/**
 * R5/R8: the danger is specifically a statement that can return more than
 * one existing `readings` row -- a `.select(` not scoped to a single id
 * and not going through the get_reading_by_id RPC (see the Sprint 4
 * migration for why a plain select policy can't express "by id only" in
 * the first place). `.insert(`/`.update(`/`.delete(` with no trailing
 * select never return existing rows at all, so they're not what this is
 * checking for.
 *
 * Takes a single statement/chunk, not a whole file. QA1's Sprint 10 round
 * 2 audit demonstrated that a per-file version of this check is close to
 * useless: one `get_reading_by_id` mention anywhere in a file exempted an
 * unrelated, genuinely unfiltered select living right next to it. The
 * exemption has to live on the same statement as the danger, not just
 * somewhere in the same file.
 */
export function chunkHasUnscopedReadingsSelect(chunk: string): boolean {
  if (!referencesReadingsTable(chunk)) return false;
  if (!chunk.includes(".select(")) return false;
  if (chunk.includes("get_reading_by_id")) return false;
  if (/\.eq\(\s*["'`]id["'`]/.test(chunk)) return false;
  return true;
}

// Splitting on `;` isn't a real parser, but a single fluent Supabase call
// chain (`.from(...).select(...).eq(...)`) is always one statement with no
// semicolon until its end, which is the only thing that has to hold for
// this to correctly keep a select and its id filter in the same chunk.
function statementChunks(source: string): string[] {
  return source.split(";");
}

// The guardrail's own implementation module necessarily contains the
// strings it's built to detect ("readings", ".select(", "get_reading_by_id")
// in its docstrings and match targets -- it's the detector, not a route.
// Excluded by name, not by cleverness, so self-reference doesn't need to
// be argued about differently every time this file changes.
const SELF_EXCLUDED_FILE = "readings-access-guardrail.ts";

function isTestFile(fileName: string): boolean {
  return fileName.endsWith(".test.ts") || fileName.endsWith(".test.tsx");
}

function walkSourceFiles(dir: string): string[] {
  let files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files = files.concat(walkSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry) && entry !== SELF_EXCLUDED_FILE && !isTestFile(entry)) {
      files.push(full);
    }
  }
  return files;
}

/**
 * Walks every given root directory -- not just app/, also lib/, since
 * QA1's Sprint 10 round 2 audit built a real working listing route by
 * putting the query one import away in a lib/ helper, which a
 * lib-blind version of this check never saw. Test files are excluded
 * throughout: they describe patterns (including deliberately-bad ones,
 * as fixtures) rather than being routes themselves.
 */
export function findUnfilteredReadingsQueries(rootDirs: string[]): string[] {
  const offenders: string[] = [];
  for (const dir of rootDirs) {
    for (const file of walkSourceFiles(dir)) {
      const source = readFileSync(file, "utf8");
      if (statementChunks(source).some(chunkHasUnscopedReadingsSelect)) {
        offenders.push(file);
      }
    }
  }
  return offenders;
}
