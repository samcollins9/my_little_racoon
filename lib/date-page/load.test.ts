import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculationInstantForDate, computePositions } from "../ephemeris/adapter";
import type { WikipediaEventsPayload } from "../events/wikipedia";
import { loadDatePage, lookupSavedHoroscope } from "./load";
import { EMPTY_LOOKUP, PAUSED_LOOKUP, fakeSupabase } from "./test-support";

const DATE = "2012-11-11";

const FRESH_EVENTS: WikipediaEventsPayload = {
  source: "wikipedia-onthisday",
  requestedDate: DATE,
  matchedYear: true,
  fetchedAt: "2026-11-15T00:00:00.000Z",
  events: [{ year: 2012, text: "A fresh event" }],
};

const STORED_ROW = {
  id: "22222222-2222-2222-2222-222222222222",
  event_date: DATE,
  // Deliberately not what computePositions gives for this date -- a match
  // proves the stored row was rendered, not a recomputation.
  positions: [
    { body: "Sun", eclipticLongitude: 1, sign: "Aries", degreeInSign: 1, retrograde: false },
    { body: "Moon", eclipticLongitude: 2, sign: "Aries", degreeInSign: 2, retrograde: false },
  ],
  events: { ...FRESH_EVENTS, fetchedAt: "2026-01-01T00:00:00.000Z", events: [{ year: 1918, text: "Stored" }] },
  horoscope: "The stored horoscope.",
};

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => vi.restoreAllMocks());

describe("lookupSavedHoroscope (R4)", () => {
  it("calls get_reading_by_date with the date as an explicit argument", async () => {
    const fake = fakeSupabase({ rpc: { get_reading_by_date: EMPTY_LOOKUP } });
    await lookupSavedHoroscope(fake.client, DATE, "test");
    expect(fake.rpc).toHaveBeenCalledWith("get_reading_by_date", { reading_date: DATE });
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("an empty result is 'none'", async () => {
    const fake = fakeSupabase({ rpc: { get_reading_by_date: EMPTY_LOOKUP } });
    expect(await lookupSavedHoroscope(fake.client, DATE, "test")).toEqual({ kind: "none" });
  });

  it("a row is 'found', carrying that row", async () => {
    const fake = fakeSupabase({
      rpc: { get_reading_by_date: { data: [STORED_ROW], error: null, status: 200 } },
    });
    expect(await lookupSavedHoroscope(fake.client, DATE, "test")).toEqual({
      kind: "found",
      reading: STORED_ROW,
    });
  });

  it("an error is 'unavailable' and is logged in full (Sprint 25, R8)", async () => {
    const fake = fakeSupabase({ rpc: { get_reading_by_date: PAUSED_LOOKUP } });
    expect(await lookupSavedHoroscope(fake.client, DATE, "where")).toEqual({ kind: "unavailable" });
    expect(errorSpy).toHaveBeenCalledWith("where: database unavailable", {
      status: 0,
      code: "",
      message: "TypeError: fetch failed",
      details: "",
      hint: "",
    });
  });
});

describe("loadDatePage", () => {
  it("R3: no saved horoscope -> computes the chart and fetches events, and writes nothing", async () => {
    const fake = fakeSupabase({ rpc: { get_reading_by_date: EMPTY_LOOKUP } });
    const fetchEvents = vi.fn().mockResolvedValue(FRESH_EVENTS);

    const page = await loadDatePage(fake.client, DATE, { fetchEvents });

    expect(page.saved).toEqual({ kind: "none" });
    expect(page.eventDate).toBe(DATE);
    expect(page.positions).toEqual(computePositions(calculationInstantForDate(DATE)));
    expect(page.events).toBe(FRESH_EVENTS);
    expect(fetchEvents).toHaveBeenCalledWith(DATE);
    // The whole database surface of a render: one read-only RPC.
    expect(fake.rpc.mock.calls.map(([name]) => name)).toEqual(["get_reading_by_date"]);
    expect(fake.from).not.toHaveBeenCalled();
    expect(fake.insert).not.toHaveBeenCalled();
  });

  it("R4: a saved horoscope -> renders that row's stored positions and events, and doesn't re-fetch events", async () => {
    const fake = fakeSupabase({
      rpc: { get_reading_by_date: { data: [STORED_ROW], error: null, status: 200 } },
    });
    const fetchEvents = vi.fn();

    const page = await loadDatePage(fake.client, DATE, { fetchEvents });

    expect(page.saved).toEqual({ kind: "found", reading: STORED_ROW });
    expect(page.positions).toBe(STORED_ROW.positions);
    expect(page.events).toBe(STORED_ROW.events);
    expect(fetchEvents).not.toHaveBeenCalled();
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("R6: lookup unavailable -> still has the chart and events, flagged unavailable", async () => {
    const fake = fakeSupabase({ rpc: { get_reading_by_date: PAUSED_LOOKUP } });
    const fetchEvents = vi.fn().mockResolvedValue(FRESH_EVENTS);

    const page = await loadDatePage(fake.client, DATE, { fetchEvents });

    expect(page.saved).toEqual({ kind: "unavailable" });
    expect(page.positions).toEqual(computePositions(calculationInstantForDate(DATE)));
    expect(page.events).toBe(FRESH_EVENTS);
    expect(fake.from).not.toHaveBeenCalled();
  });

  it("an events outage (fetchDayEvents -> null) still renders the chart", async () => {
    const fake = fakeSupabase({ rpc: { get_reading_by_date: EMPTY_LOOKUP } });
    const page = await loadDatePage(fake.client, DATE, { fetchEvents: async () => null });
    expect(page.events).toBeNull();
    expect(page.positions).toHaveLength(10);
  });
});
