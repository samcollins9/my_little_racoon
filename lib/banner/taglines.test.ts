import { describe, expect, it } from "vitest";
import { TAGLINES, pickTagline } from "./taglines";

// Sprint 43, R7: Requirement 7's list, verbatim, typed out again here rather
// than imported, so a change to the module has to be made twice to pass.
const REQUIREMENT_7 = [
  "Yesterday a fortune awaits",
  "The uncertainties of yesterday are the certainties of tomorrow, as understood today.",
  "Fortune reveals itself most clearly to those who have already experienced it.",
  "The stars foretell that which time has graciously confirmed.",
  "What fate has already bestowed, the heavens need only reveal.",
  "The wise consult the heavens before drawing conclusions about what has already occurred.",
  "The wheel of fortune turns most accurately in the direction of its previous rotation.",
  "When the celestial bodies are in agreement with yesterday, the destiny of man becomes without doubt.",
  "The future of the past is seldom concealed from the properly aligned heavens.",
  "He who understands the arrival of yesterday need not fear its approaching.",
  "Only through the backward illumination of fortune can destiny become previously apparent.",
  "The stars do not alter what has been, but provide certainty in its having become.",
  "Discover what destiny had in store for you.",
  "Ancient wisdom. Unprecedented hindsight.",
  "Unlock the mysteries of what was to be.",
  "Tomorrow’s wisdom for yesterday’s uncertainties.",
  "Revealing the inevitable, one occurrence at a time.",
  "Let the heavens confirm your suspicions.",
  "For every yesterday, a prophecy awaits.",
];

describe("TAGLINES (Sprint 43, R7)", () => {
  it("is exactly Requirement 7's 19 taglines, verbatim and in order", () => {
    expect(TAGLINES).toHaveLength(19);
    expect([...TAGLINES]).toEqual(REQUIREMENT_7);
  });

  it("keeps the curly apostrophes in number 16", () => {
    expect(TAGLINES[15]).toBe("Tomorrow’s wisdom for yesterday’s uncertainties.");
    expect(TAGLINES[15]).not.toContain("'");
  });

  it("has no duplicates", () => {
    expect(new Set(TAGLINES).size).toBe(TAGLINES.length);
  });
});

describe("pickTagline (Sprint 43, R8/R11)", () => {
  const N = TAGLINES.length;

  it("a random source at 0 gives the first tagline", () => {
    expect(pickTagline(() => 0)).toBe(TAGLINES[0]);
  });

  it("a random source just under 1 gives the last tagline", () => {
    expect(pickTagline(() => 1 - Number.EPSILON)).toBe(TAGLINES[N - 1]);
  });

  it("every index is reachable, at both edges of its slice of [0, 1)", () => {
    for (let i = 0; i < N; i++) {
      const low = i / N;
      // The largest double below the next slice's start.
      const high = (i + 1) / N - Number.EPSILON;
      expect(pickTagline(() => low)).toBe(TAGLINES[i]);
      expect(pickTagline(() => high)).toBe(TAGLINES[i]);
    }
  });

  it("calls the random source exactly once", () => {
    let calls = 0;
    pickTagline(() => {
      calls++;
      return 0.5;
    });
    expect(calls).toBe(1);
  });

  it("always returns a member of the list, for Math.random itself", () => {
    for (let i = 0; i < 500; i++) expect(TAGLINES).toContain(pickTagline(Math.random));
  });

  it("a source that breaks its [0, 1) contract still returns a member, never undefined", () => {
    expect(pickTagline(() => 1)).toBe(TAGLINES[N - 1]);
    expect(pickTagline(() => 7)).toBe(TAGLINES[N - 1]);
    expect(pickTagline(() => -0.2)).toBe(TAGLINES[0]);
    expect(pickTagline(() => Number.NaN)).toBe(TAGLINES[0]);
    expect(pickTagline(() => Number.POSITIVE_INFINITY)).toBe(TAGLINES[0]);
  });
});
