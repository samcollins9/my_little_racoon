import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReadingModel } from "../chart/model";
import { buildPrompt, generateHoroscope, resolveOpenAiConfig } from "./horoscope";

function reading(overrides: Partial<ReadingModel["chart"]> = {}, events: ReadingModel["events"] = []): ReadingModel {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    events,
    horoscope: null,
    chart: {
      date: "1977-03-31",
      julianDay: 2443234,
      positions: [
        { body: "Sun", eclipticLongitude: 10.656992801956903, sign: "Aries", degreeInSign: 10.656992801956903, retrograde: false },
        { body: "Venus", eclipticLongitude: 19.8669, sign: "Aries", degreeInSign: 19.8669, retrograde: true },
      ],
      aspects: [
        { bodyA: "Sun", bodyB: "Saturn", aspect: "trine", orb: 0.6, tightness: 0.914, applying: false },
        { bodyA: "Saturn", bodyB: "Uranus", aspect: "square", orb: 0.891234, tightness: 0.872, applying: true },
        { bodyA: "Mars", bodyB: "Uranus", aspect: "trine", orb: 2.05, tightness: 0.707, applying: true },
        { bodyA: "Sun", bodyB: "Pluto", aspect: "opposition", orb: 2.23, tightness: 0.722, applying: true },
        { bodyA: "Moon", bodyB: "Venus", aspect: "trine", orb: 2.58, tightness: 0.631, applying: false },
        { bodyA: "Saturn", bodyB: "Pluto", aspect: "sextile", orb: 2.83, tightness: 0.293, applying: true },
        { bodyA: "Moon", bodyB: "Mercury", aspect: "trine", orb: 3.07, tightness: 0.561, applying: false },
        { bodyA: "Moon", bodyB: "Jupiter", aspect: "square", orb: 6.94, tightness: 0.009, applying: true },
      ],
      elements: { Fire: 6, Earth: 1, Air: 1, Water: 2 },
      modalities: { Cardinal: 4, Fixed: 4, Mutable: 2 },
      moonPhase: { elongation: 131.79, waxing: true, phaseName: "Waxing gibbous" },
      ...overrides,
    },
  };
}

describe("buildPrompt", () => {
  it("sends only the top 6 aspects, tightest first, dropping the tail (R2)", () => {
    const prompt = buildPrompt(reading());
    expect(prompt).toContain("Saturn sextile Pluto");
    expect(prompt).not.toContain("Moon square Jupiter"); // 8th of 8, orb 6.94 -- past the top 6
    expect(prompt).not.toContain("Moon trine Mercury"); // 7th of 8
  });

  it("rounds degrees and orbs to two decimals (R2)", () => {
    const prompt = buildPrompt(reading());
    expect(prompt).toContain("Sun in Aries at 10.66°");
    expect(prompt).toContain("Venus in Aries at 19.87° (retrograde)");
    expect(prompt).toContain("Saturn square Uranus — orb 0.89°, applying");
  });

  it("labels applying/separating per aspect", () => {
    const prompt = buildPrompt(reading());
    expect(prompt).toContain("Sun trine Saturn — orb 0.60°, separating");
    expect(prompt).toContain("Saturn square Uranus — orb 0.89°, applying");
  });

  it("includes the balance and moon phase", () => {
    const prompt = buildPrompt(reading());
    expect(prompt).toContain("Elements: Fire 6, Earth 1, Air 1, Water 2");
    expect(prompt).toContain("Modalities: Cardinal 4, Fixed 4, Mutable 2");
    expect(prompt).toContain("Moon: Waxing gibbous");
  });

  it("lists events when present", () => {
    const prompt = buildPrompt(reading({}, [{ year: 1889, text: "Something happened" }]));
    expect(prompt).toContain("1889: Something happened");
  });

  it("says plainly when there are no events", () => {
    const prompt = buildPrompt(reading({}, []));
    expect(prompt).toContain("Nothing specific on record for this date.");
  });
});

describe("resolveOpenAiConfig", () => {
  it("throws when OPENAI_API_KEY is missing (R5)", () => {
    expect(() => resolveOpenAiConfig({})).toThrow(/OPENAI_API_KEY/);
  });

  it("returns the key when present", () => {
    expect(resolveOpenAiConfig({ OPENAI_API_KEY: "sk-test" })).toEqual({ apiKey: "sk-test" });
  });
});

describe("generateHoroscope", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it("never calls the real OpenAI API (R10) -- posts to a mocked fetch with the right shape", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: "gpt-4o-mini-2024-07-18",
        choices: [{ message: { content: "A horoscope." } }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateHoroscope(reading());

    expect(result).toEqual({ text: "A horoscope.", model: "gpt-4o-mini-2024-07-18" });
    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect(options.headers.Authorization).toBe("Bearer sk-test");
    const body = JSON.parse(options.body);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.temperature).toBe(0.9);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1].role).toBe("user");
  });

  it("throws on a non-2xx response, surfacing rather than swallowing (R8)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 429, json: async () => ({}) }));

    await expect(generateHoroscope(reading())).rejects.toThrow(/429/);
  });

  it("throws when the response has no message content (R8)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ choices: [] }) })
    );

    await expect(generateHoroscope(reading())).rejects.toThrow(/message content/);
  });

  it("throws on a timeout rather than hanging or swallowing (R7, R8)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "sk-test");
    vi.useFakeTimers();
    const fetchMock = vi.fn((_url: string, options: { signal: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => {
          const err = new Error("The operation was aborted");
          err.name = "AbortError";
          reject(err);
        });
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const pending = generateHoroscope(reading());
    const assertion = expect(pending).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(25000);
    await assertion;
  });
});
