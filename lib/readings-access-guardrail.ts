import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

export function referencesReadingsTable(source: string): boolean {
  return source.includes('"readings"') || source.includes("'readings'");
}

/**
 * R5/R8: the danger is specifically a call that can return more than one
 * existing row -- a `.select(` not scoped to a single id and not going
 * through the get_reading_by_id RPC (see the Sprint 4 migration for why a
 * plain select policy can't express "by id only" in the first place).
 * `.insert(`/`.update(`/`.delete(` without a trailing `.select()` never
 * return existing rows at all (there is no SELECT policy for them to read
 * back through), so they're not what this is checking for.
 */
export function hasUnscopedReadingsSelect(source: string): boolean {
  if (!source.includes(".select(")) return false;
  if (source.includes("get_reading_by_id")) return false;
  if (/\.eq\(\s*["'`]id["'`]/.test(source)) return false;
  return true;
}

function walkSourceFiles(dir: string): string[] {
  let files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files = files.concat(walkSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

/** Returns the paths of any files that fail the check above. */
export function findUnfilteredReadingsQueries(appDir: string): string[] {
  const offenders: string[] = [];
  for (const file of walkSourceFiles(appDir)) {
    const source = readFileSync(file, "utf8");
    if (referencesReadingsTable(source) && hasUnscopedReadingsSelect(source)) {
      offenders.push(file);
    }
  }
  return offenders;
}
