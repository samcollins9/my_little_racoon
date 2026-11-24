import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { NOTABLE_DATES } from "./notable-dates";
import { parseDatePageParam } from "./params";

/**
 * Sprint 45, R9. The expected table is copied from the sprint file's R1 by
 * hand, separately from the module, so an edit to either shows up here.
 */
const R1_TABLE: [string, string][] = [
  ["1912-04-15", "The Titanic sinks in the North Atlantic"],
  ["1914-06-28", "Archduke Franz Ferdinand is assassinated in Sarajevo"],
  ["1918-11-11", "The armistice ends fighting in World War I"],
  ["1929-10-24", "Black Thursday begins the Wall Street Crash"],
  ["1939-09-01", "Germany invades Poland, starting World War II"],
  ["1944-06-06", "D-Day: the Allies land in Normandy"],
  ["1945-05-08", "VE Day: the war in Europe ends"],
  ["1945-08-06", "An atomic bomb is dropped on Hiroshima"],
  ["1945-10-24", "The United Nations is founded"],
  ["1947-08-15", "India becomes independent"],
  ["1955-12-01", "Rosa Parks is arrested in Montgomery"],
  ["1961-04-12", "Yuri Gagarin becomes the first person in space"],
  ["1963-08-28", 'Martin Luther King Jr. gives his "I Have a Dream" speech'],
  ["1963-11-22", "President John F. Kennedy is assassinated"],
  ["1969-07-20", "Apollo 11 lands on the Moon"],
  ["1986-01-28", "The Space Shuttle Challenger breaks apart"],
  ["1989-11-09", "The Berlin Wall falls"],
  ["1990-02-11", "Nelson Mandela is released from prison"],
  ["2001-09-11", "The September 11 attacks"],
  ["2020-03-11", "The WHO declares COVID-19 a pandemic"],
];

describe("NOTABLE_DATES (Sprint 45, R1/R9)", () => {
  it("has exactly 20 entries", () => {
    expect(NOTABLE_DATES).toHaveLength(20);
  });

  it("every date is one the date page accepts", () => {
    for (const { isoDate } of NOTABLE_DATES) expect(parseDatePageParam(isoDate)).toBe(isoDate);
  });

  it("is oldest first, with no duplicate dates", () => {
    const dates = NOTABLE_DATES.map((d) => d.isoDate);
    // Zero-padded YYYY-MM-DD, so code-unit order is date order (Sprint 32).
    for (let i = 1; i < dates.length; i++) expect(dates[i - 1] < dates[i]).toBe(true);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("dates and descriptions are exactly R1's table", () => {
    expect(NOTABLE_DATES.map((d) => [d.isoDate, d.description])).toEqual(R1_TABLE);
  });
});

describe("notable-dates.ts needs no database or network (R2)", () => {
  it("imports nothing at all", () => {
    const source = readFileSync(fileURLToPath(new URL("./notable-dates.ts", import.meta.url)), "utf8");
    expect(source).not.toMatch(/^\s*import\b/m);
    expect(source).not.toMatch(/\brequire\(|\bimport\(/);
  });
});
