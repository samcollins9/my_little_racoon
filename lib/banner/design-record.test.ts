import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Sprint 43, R1/R4: the design record and the portrait shipped from it.
// Kept outside app/ on purpose: R1 asks that a grep of app/ for the design
// file finds nothing, and this file has to name it.

const ROOT = join(__dirname, "..", "..");
const DESIGN_FILE = join(ROOT, "docs", "design", "banner_variations.html");
const PORTRAIT_FILE = join(ROOT, "public", "reloy-seer.png");
/** 0a's portrait in the bundle's manifest. 0b and 0d's (a07d4809-…) isn't used. */
const PORTRAIT_MANIFEST_ID = "a22c751d-6a0c-445a-b519-3c7ddb95d36b";
/** sha256 of the user's untracked new_banner.html, taken before it was copied. */
const DESIGN_SHA256 = "0dd05937de99f5be28272e3495d0f9edebb78af8785579eac984a89246e90ee3";

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

function filesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("the banner's design record (Sprint 43, R1)", () => {
  it("docs/design/banner_variations.html is byte-identical to the original", () => {
    expect(sha256(readFileSync(DESIGN_FILE))).toBe(DESIGN_SHA256);
  });

  it("nothing in app/ references it, tests included", () => {
    for (const file of filesUnder(join(ROOT, "app"))) {
      expect(readFileSync(file).toString("latin1"), relative(ROOT, file)).not.toContain("banner_variations");
    }
  });

  it("no root copy is tracked by git", () => {
    // Asked of git, not the filesystem: the user's untracked original may
    // still sit in the primary checkout until they delete it (their call,
    // 24 Nov 2026), and verify must still pass there.
    const tracked = execFileSync("git", ["ls-files", "--", "new_banner.html"], { cwd: ROOT, encoding: "utf8" });
    expect(tracked).toBe("");
  });
});

describe("the portrait (Sprint 43, R4)", () => {
  it("public/reloy-seer.png is the manifest entry's decoded bytes, exactly", () => {
    const manifest = readFileSync(DESIGN_FILE, "utf8").match(
      /<script type="__bundler\/manifest"[^>]*>([\s\S]*?)<\/script>/
    )?.[1];
    expect(manifest).toBeDefined();
    const entry = JSON.parse(manifest!)[PORTRAIT_MANIFEST_ID];
    expect(entry).toMatchObject({ mime: "image/png", compressed: false });

    expect(readFileSync(PORTRAIT_FILE).equals(Buffer.from(entry.data, "base64"))).toBe(true);
  });

  it("is a 133 x 138 PNG, per its own header", () => {
    const png = readFileSync(PORTRAIT_FILE);
    expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(png.readUInt32BE(16)).toBe(133); // IHDR width
    expect(png.readUInt32BE(20)).toBe(138); // IHDR height
  });
});
