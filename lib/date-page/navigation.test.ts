import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadDateNavigation, shapeDateNavigation } from "./navigation";
import { PAUSED_LOOKUP, fakeSupabase, type FakeResult } from "./test-support";

const DATE = "2012-11-11";

const ok = (data: unknown): FakeResult => ({ data, error: null, status: 200 });
const NEIGHBOURS = ok([{ previous_date: "2012-10-01", next_date: "2013-01-05" }]);
const RECENT = ok([{ event_date: "2013-01-05" }, { event_date: DATE }, { event_date: "2012-10-01" }]);

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("shapeDateNavigation (R2/R3)", () => {
  it("carries both neighbours and marks only the current date in the recent list", () => {
    expect(
      shapeDateNavigation(
        DATE,
        [{ previous_date: "2012-10-01", next_date: "2013-01-05" }],
        [{ event_date: "2013-01-05" }, { event_date: DATE }]
      )
    ).toEqual({
      kind: "available",
      previous: "2012-10-01",
      next: "2013-01-05",
      recent: [
        { isoDate: DATE, isCurrent: true },
        { isoDate: "2013-01-05", isCurrent: false },
      ],
    });
  });

  it("no previous and no next: both sides are null", () => {
    const nav = shapeDateNavigation(DATE, [{ previous_date: null, next_date: null }], []);
    expect(nav).toMatchObject({ kind: "available", previous: null, next: null });
  });

  it("only one side present leaves the other null", () => {
    expect(
      shapeDateNavigation(DATE, [{ previous_date: "2012-10-01", next_date: null }], [])
    ).toMatchObject({ previous: "2012-10-01", next: null });
    expect(
      shapeDateNavigation(DATE, [{ previous_date: null, next_date: "2013-01-05" }], [])
    ).toMatchObject({ previous: null, next: "2013-01-05" });
  });

  it("an empty recent list stays empty", () => {
    expect(shapeDateNavigation(DATE, [{ previous_date: null, next_date: null }], [])).toMatchObject({
      recent: [],
    });
  });

  it("Sprint 32: shows the same dates the database chose, sorted oldest date first", () => {
    // Generation order (what get_recent_reading_dates returns), deliberately
    // not date order: mixed years, mixed months, and an 18th-century date
    // among 20th-century ones. Sorting on the long-date label would give
    // "1 March 1969, 11 November 2012, 11 September 2001, 14 July 1789, ..."
    // instead.
    const generationOrder = [
      { event_date: "1969-07-20" },
      { event_date: "1789-07-14" },
      { event_date: DATE },
      { event_date: "1969-03-01" },
      { event_date: "1945-05-08" },
      { event_date: "1969-12-31" },
      { event_date: "2001-09-11" },
    ];
    const input = generationOrder.map((row) => ({ ...row }));
    const nav = shapeDateNavigation(DATE, null, input);
    expect(nav.kind).toBe("available");
    if (nav.kind !== "available") return;
    expect(nav.recent).toEqual([
      { isoDate: "1789-07-14", isCurrent: false },
      { isoDate: "1945-05-08", isCurrent: false },
      { isoDate: "1969-03-01", isCurrent: false },
      { isoDate: "1969-07-20", isCurrent: false },
      { isoDate: "1969-12-31", isCurrent: false },
      { isoDate: "2001-09-11", isCurrent: false },
      { isoDate: DATE, isCurrent: true },
    ]);
    // R2: the set is unchanged (no date added or dropped) and the RPC rows are not mutated.
    expect(nav.recent.map((d) => d.isoDate).sort()).toEqual(
      generationOrder.map((r) => r.event_date).sort()
    );
    expect(input).toEqual(generationOrder);
  });

  it("null or empty results are 'no neighbours, no list', not an outage", () => {
    expect(shapeDateNavigation(DATE, null, null)).toEqual({
      kind: "available",
      previous: null,
      next: null,
      recent: [],
    });
    expect(shapeDateNavigation(DATE, [], [])).toMatchObject({ previous: null, next: null });
  });
});

describe("loadDateNavigation (R1/R4/R5)", () => {
  it("calls both date-only RPCs, the adjacent one with the date as an explicit argument, and never touches the table", async () => {
    const fake = fakeSupabase({
      rpc: { get_adjacent_reading_dates: NEIGHBOURS, get_recent_reading_dates: RECENT },
    });
    await loadDateNavigation(fake.client, DATE, "test");
    expect(fake.rpc).toHaveBeenCalledWith("get_adjacent_reading_dates", { reading_date: DATE });
    expect(fake.rpc).toHaveBeenCalledWith("get_recent_reading_dates");
    expect(fake.rpc).toHaveBeenCalledTimes(2);
    expect(fake.from).not.toHaveBeenCalled();
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("shapes successful results", async () => {
    const fake = fakeSupabase({
      rpc: { get_adjacent_reading_dates: NEIGHBOURS, get_recent_reading_dates: RECENT },
    });
    expect(await loadDateNavigation(fake.client, DATE, "test")).toEqual({
      kind: "available",
      previous: "2012-10-01",
      next: "2013-01-05",
      recent: [
        { isoDate: "2012-10-01", isCurrent: false },
        { isoDate: DATE, isCurrent: true },
        { isoDate: "2013-01-05", isCurrent: false },
      ],
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("the adjacent lookup unavailable: the whole navigation is unavailable, logged in full", async () => {
    const fake = fakeSupabase({
      rpc: { get_adjacent_reading_dates: PAUSED_LOOKUP, get_recent_reading_dates: RECENT },
    });
    expect(await loadDateNavigation(fake.client, DATE, "DatePage")).toEqual({ kind: "unavailable" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith("DatePage (adjacent dates): database unavailable", {
      status: 0,
      code: "",
      message: "TypeError: fetch failed",
      details: "",
      hint: "",
    });
  });

  it("the recent lookup unavailable: the whole navigation is unavailable, logged in full", async () => {
    const fake = fakeSupabase({
      rpc: { get_adjacent_reading_dates: NEIGHBOURS, get_recent_reading_dates: PAUSED_LOOKUP },
    });
    expect(await loadDateNavigation(fake.client, DATE, "DatePage")).toEqual({ kind: "unavailable" });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(
      "DatePage (recent dates): database unavailable",
      expect.objectContaining({ status: 0, message: "TypeError: fetch failed" })
    );
  });

  it("both unavailable: one 'unavailable' result, each failure logged", async () => {
    const fake = fakeSupabase({
      rpc: { get_adjacent_reading_dates: PAUSED_LOOKUP, get_recent_reading_dates: PAUSED_LOOKUP },
    });
    expect(await loadDateNavigation(fake.client, DATE, "DatePage")).toEqual({ kind: "unavailable" });
    expect(errorSpy).toHaveBeenCalledTimes(2);
  });

  it("any error code counts as unavailable, even a data-exception one (the date is pre-validated)", async () => {
    const fake = fakeSupabase({
      rpc: {
        get_adjacent_reading_dates: {
          data: null,
          error: { code: "22P02", message: "invalid input syntax", details: "", hint: "" },
          status: 400,
        },
        get_recent_reading_dates: RECENT,
      },
    });
    expect(await loadDateNavigation(fake.client, DATE, "test")).toEqual({ kind: "unavailable" });
  });
});
