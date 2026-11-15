import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculationInstantForDate, computePositions } from "../ephemeris/adapter";
import type { WikipediaEventsPayload } from "../events/wikipedia";
import {
  CAST_DISABLED_MESSAGE,
  CAST_SAVE_FAILED_MESSAGE,
  CAST_UNAVAILABLE_MESSAGE,
  castHoroscopeForDate,
} from "./cast";
import { EMPTY_LOOKUP, PAUSED_LOOKUP, fakeSupabase } from "./test-support";

const DATE = "2012-11-11";

const EVENTS: WikipediaEventsPayload = {
  source: "wikipedia-onthisday",
  requestedDate: DATE,
  matchedYear: false,
  fetchedAt: "2026-11-15T00:00:00.000Z",
  events: [],
};

const SAVED = {
  data: [{ id: "x", event_date: DATE, positions: [], events: null, horoscope: "Saved." }],
  error: null,
  status: 200,
};

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function deps(generateResult: { ok: true } | { ok: false; error: string } = { ok: true }) {
  return {
    fetchEvents: vi.fn().mockResolvedValue(EVENTS),
    generate: vi.fn().mockResolvedValue(generateResult),
  };
}

describe("castHoroscopeForDate (R5)", () => {
  it("disabled: refuses before touching the database or generating", async () => {
    vi.stubEnv("HOROSCOPE_ENABLED", "false");
    const fake = fakeSupabase();
    const d = deps();

    const result = await castHoroscopeForDate(fake.client, DATE, d);

    expect(result).toEqual({ ok: false, message: CAST_DISABLED_MESSAGE });
    expect(fake.rpc).not.toHaveBeenCalled();
    expect(fake.from).not.toHaveBeenCalled();
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("success: inserts the reading (positions and events), then generates for the inserted id", async () => {
    vi.stubEnv("HOROSCOPE_ENABLED", "true");
    const fake = fakeSupabase({ rpc: { get_reading_by_date: EMPTY_LOOKUP } });
    const d = deps();

    const result = await castHoroscopeForDate(fake.client, DATE, d);

    expect(result).toEqual({ ok: true });
    const positions = computePositions(calculationInstantForDate(DATE));
    expect(fake.from).toHaveBeenCalledWith("readings");
    expect(fake.insert).toHaveBeenCalledTimes(1);
    const inserted = fake.insert.mock.calls[0][0];
    expect(inserted).toEqual({ id: expect.any(String), event_date: DATE, positions, events: EVENTS });
    expect(d.generate).toHaveBeenCalledWith(fake.client, inserted.id, {
      id: inserted.id,
      event_date: DATE,
      positions,
      events: EVENTS,
      horoscope: null,
    });
  });

  it("a horoscope is already saved for the date: writes nothing, doesn't regenerate", async () => {
    const fake = fakeSupabase({ rpc: { get_reading_by_date: SAVED } });
    const d = deps();

    expect(await castHoroscopeForDate(fake.client, DATE, d)).toEqual({ ok: true });
    expect(fake.insert).not.toHaveBeenCalled();
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("lookup unavailable: no insert, the unavailable message", async () => {
    const fake = fakeSupabase({ rpc: { get_reading_by_date: PAUSED_LOOKUP } });
    const d = deps();

    expect(await castHoroscopeForDate(fake.client, DATE, d)).toEqual({
      ok: false,
      message: CAST_UNAVAILABLE_MESSAGE,
    });
    expect(fake.insert).not.toHaveBeenCalled();
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("insert outage (classified by availability.ts): unavailable message, logged in full, no generation", async () => {
    const fake = fakeSupabase({
      rpc: { get_reading_by_date: EMPTY_LOOKUP },
      insertResult: PAUSED_LOOKUP,
    });
    const d = deps();

    expect(await castHoroscopeForDate(fake.client, DATE, d)).toEqual({
      ok: false,
      message: CAST_UNAVAILABLE_MESSAGE,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      "castHoroscopeForDate (insert): database unavailable",
      expect.objectContaining({ status: 0, message: "TypeError: fetch failed" })
    );
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("insert rejected as data (class 23): the generic message, not the outage one", async () => {
    const fake = fakeSupabase({
      rpc: { get_reading_by_date: EMPTY_LOOKUP },
      insertResult: { data: null, error: { code: "23502", message: "not-null" }, status: 400 },
    });
    const d = deps();

    expect(await castHoroscopeForDate(fake.client, DATE, d)).toEqual({
      ok: false,
      message: CAST_SAVE_FAILED_MESSAGE,
    });
    expect(errorSpy).toHaveBeenCalledWith("castHoroscopeForDate: insert failed", {
      code: "23502",
      message: "not-null",
    });
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("generation failure: passes the existing error message through", async () => {
    const fake = fakeSupabase({ rpc: { get_reading_by_date: EMPTY_LOOKUP } });
    const d = deps({ ok: false, error: "Horoscope generation failed, try again." });

    expect(await castHoroscopeForDate(fake.client, DATE, d)).toEqual({
      ok: false,
      message: "Horoscope generation failed, try again.",
    });
    expect(fake.insert).toHaveBeenCalledTimes(1);
  });
});
