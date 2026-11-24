import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadDateNavigation, shapeDateNavigation } from "./navigation";
import { PAUSED_LOOKUP, fakeSupabase, type FakeResult } from "./test-support";

const DATE = "2012-11-11";

const ok = (data: unknown): FakeResult => ({ data, error: null, status: 200 });
const NEIGHBOURS = ok([{ previous_date: "2012-10-01", next_date: "2013-01-05" }]);

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("shapeDateNavigation (R2)", () => {
  it("carries both neighbours", () => {
    expect(shapeDateNavigation([{ previous_date: "2012-10-01", next_date: "2013-01-05" }])).toEqual({
      kind: "available",
      previous: "2012-10-01",
      next: "2013-01-05",
    });
  });

  it("no previous and no next: both sides are null", () => {
    const nav = shapeDateNavigation([{ previous_date: null, next_date: null }]);
    expect(nav).toMatchObject({ kind: "available", previous: null, next: null });
  });

  it("only one side present leaves the other null", () => {
    expect(shapeDateNavigation([{ previous_date: "2012-10-01", next_date: null }])).toMatchObject({
      previous: "2012-10-01",
      next: null,
    });
    expect(shapeDateNavigation([{ previous_date: null, next_date: "2013-01-05" }])).toMatchObject({
      previous: null,
      next: "2013-01-05",
    });
  });

  it("null or empty results are 'no neighbours', not an outage", () => {
    expect(shapeDateNavigation(null)).toEqual({ kind: "available", previous: null, next: null });
    expect(shapeDateNavigation([])).toMatchObject({ previous: null, next: null });
  });
});

describe("loadDateNavigation (R1/R4/R5)", () => {
  it("calls only the adjacent RPC, with the date as an explicit argument, and never touches the table", async () => {
    const fake = fakeSupabase({ rpc: { get_adjacent_reading_dates: NEIGHBOURS } });
    await loadDateNavigation(fake.client, DATE, "test");
    expect(fake.rpc).toHaveBeenCalledWith("get_adjacent_reading_dates", { reading_date: DATE });
    // Sprint 45, R8: the recent-dates lookup is retired.
    expect(fake.rpc).toHaveBeenCalledTimes(1);
    expect(fake.from).not.toHaveBeenCalled();
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("shapes successful results", async () => {
    const fake = fakeSupabase({ rpc: { get_adjacent_reading_dates: NEIGHBOURS } });
    expect(await loadDateNavigation(fake.client, DATE, "test")).toEqual({
      kind: "available",
      previous: "2012-10-01",
      next: "2013-01-05",
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("the adjacent lookup unavailable: the navigation is unavailable, logged in full", async () => {
    const fake = fakeSupabase({ rpc: { get_adjacent_reading_dates: PAUSED_LOOKUP } });
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

  it("any error code counts as unavailable, even a data-exception one (the date is pre-validated)", async () => {
    const fake = fakeSupabase({
      rpc: {
        get_adjacent_reading_dates: {
          data: null,
          error: { code: "22P02", message: "invalid input syntax", details: "", hint: "" },
          status: 400,
        },
      },
    });
    expect(await loadDateNavigation(fake.client, DATE, "test")).toEqual({ kind: "unavailable" });
  });
});
