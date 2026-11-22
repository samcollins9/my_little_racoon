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
        { isoDate: "2013-01-05", isCurrent: false },
        { isoDate: DATE, isCurrent: true },
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

  it("keeps the recent list in the order the database returned it (newest written first)", () => {
    const nav = shapeDateNavigation(DATE, null, [
      { event_date: "1999-01-01" },
      { event_date: "2050-01-01" },
      { event_date: "1970-01-01" },
    ]);
    expect(nav.kind === "available" && nav.recent.map((d) => d.isoDate)).toEqual([
      "1999-01-01",
      "2050-01-01",
      "1970-01-01",
    ]);
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
        { isoDate: "2013-01-05", isCurrent: false },
        { isoDate: DATE, isCurrent: true },
        { isoDate: "2012-10-01", isCurrent: false },
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
