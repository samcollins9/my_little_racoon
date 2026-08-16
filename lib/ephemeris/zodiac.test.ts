import { describe, expect, it } from "vitest";
import { zodiacPositionFromLongitude } from "./zodiac";

describe("zodiacPositionFromLongitude", () => {
  it("0 degrees is 0 Aries", () => {
    expect(zodiacPositionFromLongitude(0)).toEqual({ sign: "Aries", degreeInSign: 0 });
  });

  it("29.99 degrees is still Aries, near the end of the sign", () => {
    const { sign, degreeInSign } = zodiacPositionFromLongitude(29.99);
    expect(sign).toBe("Aries");
    expect(degreeInSign).toBeCloseTo(29.99, 6);
  });

  it("30 degrees rolls over to 0 Taurus", () => {
    expect(zodiacPositionFromLongitude(30)).toEqual({ sign: "Taurus", degreeInSign: 0 });
  });

  it("180 degrees is 0 Libra", () => {
    expect(zodiacPositionFromLongitude(180)).toEqual({ sign: "Libra", degreeInSign: 0 });
  });

  it("359.5 degrees is deep in Pisces, not wrapped to Aries", () => {
    const { sign, degreeInSign } = zodiacPositionFromLongitude(359.5);
    expect(sign).toBe("Pisces");
    expect(degreeInSign).toBeCloseTo(29.5, 6);
  });

  it("360 degrees wraps to 0 Aries", () => {
    expect(zodiacPositionFromLongitude(360)).toEqual({ sign: "Aries", degreeInSign: 0 });
  });

  it("negative input normalizes into range", () => {
    expect(zodiacPositionFromLongitude(-1)).toEqual({ sign: "Pisces", degreeInSign: 29 });
  });
});
