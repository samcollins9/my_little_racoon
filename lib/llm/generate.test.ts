import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReadingModel } from "../chart/model";
import { generateAndPersistHoroscope, isHoroscopeEnabled } from "./generate";
import * as horoscope from "./horoscope";

const READING: ReadingModel = {
  id: "11111111-1111-1111-1111-111111111111",
  events: [],
  horoscope: null,
  chart: {
    date: "1977-03-31",
    julianDay: 2443234,
    positions: [],
    aspects: [],
    elements: { Fire: 0, Earth: 0, Air: 0, Water: 0 },
    modalities: { Cardinal: 0, Fixed: 0, Mutable: 0 },
    moonPhase: { elongation: 0, waxing: true, phaseName: "New" },
  },
};

function fakeAnon(rpcResult: { data: unknown; error: unknown }) {
  return { rpc: vi.fn().mockResolvedValue(rpcResult) } as unknown as SupabaseClient;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("isHoroscopeEnabled (R6)", () => {
  it("is enabled when the flag is absent", () => {
    expect(isHoroscopeEnabled({})).toBe(true);
  });

  it("is enabled for any value other than an explicit disable", () => {
    expect(isHoroscopeEnabled({ HOROSCOPE_ENABLED: "true" })).toBe(true);
    expect(isHoroscopeEnabled({ HOROSCOPE_ENABLED: "on" })).toBe(true);
    expect(isHoroscopeEnabled({ HOROSCOPE_ENABLED: "flase" })).toBe(true); // a typo is still enabled
  });

  it("is disabled only for an explicit false, case-insensitively", () => {
    expect(isHoroscopeEnabled({ HOROSCOPE_ENABLED: "false" })).toBe(false);
    expect(isHoroscopeEnabled({ HOROSCOPE_ENABLED: "FALSE" })).toBe(false);
    expect(isHoroscopeEnabled({ HOROSCOPE_ENABLED: " false " })).toBe(false);
  });
});

describe("generateAndPersistHoroscope", () => {
  it("does not call OpenAI or write when disabled (R6, R7)", async () => {
    vi.stubEnv("HOROSCOPE_ENABLED", "false");
    const generateSpy = vi.spyOn(horoscope, "generateHoroscope");
    const anon = fakeAnon({ data: null, error: null });

    const result = await generateAndPersistHoroscope(anon, "some-id", READING);

    expect(result).toEqual({ ok: false, error: "Horoscope generation is currently disabled." });
    expect(generateSpy).not.toHaveBeenCalled();
    expect(anon.rpc).not.toHaveBeenCalled();
  });

  it("surfaces a generation failure and performs no write (R8)", async () => {
    vi.spyOn(horoscope, "generateHoroscope").mockRejectedValue(new Error("OpenAI request failed: 429"));
    const anon = fakeAnon({ data: null, error: null });

    const result = await generateAndPersistHoroscope(anon, "some-id", READING);

    expect(result).toEqual({ ok: false, error: "Horoscope generation failed, try again." });
    expect(anon.rpc).not.toHaveBeenCalled();
  });

  it("surfaces a persistence failure without claiming success (R8)", async () => {
    vi.spyOn(horoscope, "generateHoroscope").mockResolvedValue({ text: "text", model: "gpt-4o-mini" });
    const anon = fakeAnon({ data: null, error: { message: "db error" } });

    const result = await generateAndPersistHoroscope(anon, "some-id", READING);

    expect(result).toEqual({ ok: false, error: "Could not save the horoscope, try again." });
  });

  it("persists exactly the generated text and model via set_reading_horoscope on success", async () => {
    vi.spyOn(horoscope, "generateHoroscope").mockResolvedValue({
      text: "A horoscope about Fire signs.",
      model: "gpt-4o-mini-2024-07-18",
    });
    const anon = fakeAnon({ data: true, error: null });

    const result = await generateAndPersistHoroscope(anon, "reading-id-123", READING);

    expect(result).toEqual({ ok: true });
    expect(anon.rpc).toHaveBeenCalledWith("set_reading_horoscope", {
      reading_id: "reading-id-123",
      horoscope: "A horoscope about Fire signs.",
      model: "gpt-4o-mini-2024-07-18",
    });
  });
});
