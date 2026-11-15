import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculationInstantForDate, computePositions } from "../ephemeris/adapter";
import type { WikipediaEventsPayload } from "../events/wikipedia";
import {
  CAST_DISABLED_MESSAGE,
  CAST_SAVE_FAILED_MESSAGE,
  CAST_UNAVAILABLE_MESSAGE,
  castHoroscopeForDate,
} from "./cast";
import { EMPTY_LOOKUP, PAUSED_LOOKUP, fakeSupabase, type FakeResult } from "./test-support";

const DATE = "2012-11-11";

const EVENTS: WikipediaEventsPayload = {
  source: "wikipedia-onthisday",
  requestedDate: DATE,
  matchedYear: false,
  fetchedAt: "2026-11-15T00:00:00.000Z",
  events: [],
};

const SAVED: FakeResult = {
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

/**
 * R12: separate doubles for the anon reader and the admin writer, so every
 * test also pins which client each call goes to. The reader answers only the
 * R4 lookup; the writer answers no RPC at all (generation is injected), so
 * any lookup on the writer, or insert on the reader, shows up as a failure.
 */
function clients({ lookup = EMPTY_LOOKUP, insertResult }: { lookup?: FakeResult; insertResult?: FakeResult } = {}) {
  const reader = fakeSupabase({ rpc: { get_reading_by_date: lookup } });
  const writer = fakeSupabase({ insertResult });
  return { reader, writer, pair: { reader: reader.client, writer: writer.client } };
}

function deps(generateResult: { ok: true } | { ok: false; error: string } = { ok: true }) {
  return {
    fetchEvents: vi.fn().mockResolvedValue(EVENTS),
    generate: vi.fn().mockResolvedValue(generateResult),
  };
}

describe("castHoroscopeForDate (R5, R12)", () => {
  it("disabled: refuses before touching the database or generating", async () => {
    vi.stubEnv("HOROSCOPE_ENABLED", "false");
    const c = clients();
    const d = deps();

    const result = await castHoroscopeForDate(c.pair, DATE, d);

    expect(result).toEqual({ ok: false, message: CAST_DISABLED_MESSAGE });
    expect(c.reader.rpc).not.toHaveBeenCalled();
    expect(c.writer.rpc).not.toHaveBeenCalled();
    expect(c.writer.from).not.toHaveBeenCalled();
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("success: looks up on the reader, inserts and generates on the writer, all values server-computed", async () => {
    vi.stubEnv("HOROSCOPE_ENABLED", "true");
    const c = clients();
    const d = deps();

    const result = await castHoroscopeForDate(c.pair, DATE, d);

    expect(result).toEqual({ ok: true });
    expect(c.reader.rpc).toHaveBeenCalledWith("get_reading_by_date", { reading_date: DATE });
    expect(c.reader.from).not.toHaveBeenCalled();
    expect(c.writer.rpc).not.toHaveBeenCalled();

    const positions = computePositions(calculationInstantForDate(DATE));
    expect(c.writer.from).toHaveBeenCalledWith("readings");
    expect(c.writer.insert).toHaveBeenCalledTimes(1);
    const inserted = c.writer.insert.mock.calls[0][0];
    expect(inserted).toEqual({ id: expect.any(String), event_date: DATE, positions, events: EVENTS });
    expect(d.generate).toHaveBeenCalledWith(c.pair.writer, inserted.id, {
      id: inserted.id,
      event_date: DATE,
      positions,
      events: EVENTS,
      horoscope: null,
    });
  });

  it("a horoscope is already saved for the date: writes nothing, doesn't regenerate", async () => {
    const c = clients({ lookup: SAVED });
    const d = deps();

    expect(await castHoroscopeForDate(c.pair, DATE, d)).toEqual({ ok: true });
    expect(c.writer.from).not.toHaveBeenCalled();
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("lookup unavailable: no insert, the unavailable message", async () => {
    const c = clients({ lookup: PAUSED_LOOKUP });
    const d = deps();

    expect(await castHoroscopeForDate(c.pair, DATE, d)).toEqual({
      ok: false,
      message: CAST_UNAVAILABLE_MESSAGE,
    });
    expect(c.writer.from).not.toHaveBeenCalled();
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("insert outage (classified by availability.ts): unavailable message, logged in full, no generation", async () => {
    const c = clients({ insertResult: PAUSED_LOOKUP });
    const d = deps();

    expect(await castHoroscopeForDate(c.pair, DATE, d)).toEqual({
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
    const c = clients({
      insertResult: { data: null, error: { code: "23502", message: "not-null" }, status: 400 },
    });
    const d = deps();

    expect(await castHoroscopeForDate(c.pair, DATE, d)).toEqual({
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
    const c = clients();
    const d = deps({ ok: false, error: "Horoscope generation failed, try again." });

    expect(await castHoroscopeForDate(c.pair, DATE, d)).toEqual({
      ok: false,
      message: "Horoscope generation failed, try again.",
    });
    expect(c.writer.insert).toHaveBeenCalledTimes(1);
  });
});
