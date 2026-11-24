import { describe, expect, it } from "vitest";
import { stripPictureNotes } from "./picture-notes";

describe("stripPictureNotes (Sprint 42, R1/R4)", () => {
  // Requirement 4's table, one row per test.
  it.each([
    ["Foo (pictured) did X.", "Foo did X."],
    ["Foo (pictured), bar", "Foo, bar"],
    ["The fragment (fragment pictured) was found", "The fragment was found"],
    ["A (signing pictured) and B", "A and B"],
    ["X (pictured left) and Y (pictured right)", "X and Y"],
    ["(Pictured) The treaty", "The treaty"],
  ])("%j becomes %j", (input, expected) => {
    expect(stripPictureNotes(input)).toBe(expected);
  });

  it('leaves "(depicted)" alone: the whole word "pictured" is required', () => {
    const input = "Painting (depicted) shown";
    expect(stripPictureNotes(input)).toBe(input);
  });

  it("nested parentheses: removes only the inner note, keeps the outer group, and doesn't throw", () => {
    expect(() => stripPictureNotes("A (b (pictured) c) d")).not.toThrow();
    expect(stripPictureNotes("A (b (pictured) c) d")).toBe("A (b c) d");
  });

  it("returns text with no note as the identical string, untouched", () => {
    // Doubled and trailing spaces would be tidied if anything were removed;
    // with nothing removed, they must survive exactly.
    const input = "  Apollo 11  lands on the Moon. ";
    expect(stripPictureNotes(input)).toBe(input);
  });

  // QA1's two hand-checked cases (R1), pinned here too.
  it("returns an empty string unchanged", () => {
    expect(stripPictureNotes("")).toBe("");
  });

  it("removes two notes in one string", () => {
    expect(stripPictureNotes("Armstrong (pictured) and Aldrin (right, pictured) walk.")).toBe(
      "Armstrong and Aldrin walk."
    );
  });

  it("matches any capitals of the word", () => {
    expect(stripPictureNotes("Foo (PICTURED) bar")).toBe("Foo bar");
    expect(stripPictureNotes("Foo (Pictured Left) bar")).toBe("Foo bar");
  });

  it("leaves groups that only contain part of the word, or a different word", () => {
    for (const input of [
      "Foo (the picture) bar",
      "Foo (unpictured) bar",
      "Foo (picturedness) bar",
      "Foo pictured bar", // not in parentheses
    ]) {
      expect(stripPictureNotes(input)).toBe(input);
    }
  });

  it("takes a non-breaking space before the note with it", () => {
    expect(stripPictureNotes("Foo (pictured) bar")).toBe("Foo bar");
  });

  it("a note that is the whole text leaves an empty string", () => {
    expect(stripPictureNotes(" (pictured) ")).toBe("");
  });

  it("is stable across repeated calls (the regex is global; no lastIndex carry-over)", () => {
    expect(stripPictureNotes("Foo (pictured) bar")).toBe("Foo bar");
    expect(stripPictureNotes("Foo (pictured) bar")).toBe("Foo bar");
  });
});
