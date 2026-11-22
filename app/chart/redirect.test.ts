import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { chartRedirectTarget } from "./redirect-target";
import { GET } from "./route";

// Sprint 31, R1/R7: every old /chart link lands somewhere that renders.

const ORIGIN = "https://example.test";

function target(query: string): string {
  return chartRedirectTarget(new URLSearchParams(query));
}

describe("chartRedirectTarget (R1)", () => {
  it("sends a valid, in-range date to that date's page", () => {
    expect(target("date=1969-07-20")).toBe("/date/1969-07-20");
  });

  it.each(["1700-01-01", "2100-12-31"])("sends the boundary date %s to its date page", (d) => {
    expect(target(`date=${d}`)).toBe(`/date/${d}`);
  });

  it("sends a leap day, which the date page accepts, to its date page", () => {
    expect(target("date=2024-02-29")).toBe("/date/2024-02-29");
  });

  it("decodes a percent-encoded date before validating it", () => {
    expect(target("date=1969%2D07%2D20")).toBe("/date/1969-07-20");
  });

  it.each(["garbage", "2024-02-30", "1969-7-20", "20-07-1969", "1969-07-20T00:00:00Z", " 1969-07-20"])(
    "sends a malformed date (%j) to /",
    (d) => {
      expect(target(`date=${encodeURIComponent(d)}`)).toBe("/");
    }
  );

  it.each(["1699-12-31", "2101-01-01", "2200-01-01"])(
    "sends an out-of-range date (%s) to /",
    (d) => {
      expect(target(`date=${d}`)).toBe("/");
    }
  );

  it("sends no date at all to /", () => {
    expect(target("")).toBe("/");
  });

  it("sends an empty date to /", () => {
    expect(target("date=")).toBe("/");
  });

  it("ignores unrelated parameters, including the old page's ?error=", () => {
    expect(target("error=Save%20failed&date=1969-07-20")).toBe("/date/1969-07-20");
    expect(target("error=Save%20failed")).toBe("/");
  });

  it("treats a repeated date as invalid, even when every value is valid", () => {
    expect(target("date=1969-07-20&date=1969-07-21")).toBe("/");
    expect(target("date=1969-07-20&date=1969-07-20")).toBe("/");
  });

  it.each(["//evil.example", "https://evil.example", "/etc/passwd", "../reading/x"])(
    "never builds a target from an unvalidated value (%j)",
    (d) => {
      expect(target(`date=${encodeURIComponent(d)}`)).toBe("/");
    }
  );
});

describe("GET /chart (R1: a 307, never a 308)", () => {
  async function get(path: string) {
    return GET(new NextRequest(`${ORIGIN}${path}`));
  }

  it.each([
    ["/chart?date=1969-07-20", `${ORIGIN}/date/1969-07-20`],
    ["/chart?date=1700-01-01", `${ORIGIN}/date/1700-01-01`],
    ["/chart?date=2100-12-31", `${ORIGIN}/date/2100-12-31`],
    ["/chart?date=garbage", `${ORIGIN}/`],
    ["/chart?date=2200-01-01", `${ORIGIN}/`],
    ["/chart", `${ORIGIN}/`],
  ])("%s answers 307 with Location %s", async (path, location) => {
    const response = await get(path);
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(location);
  });

  it("stays on the requesting origin", async () => {
    const response = await GET(new NextRequest("https://preview-abc.example.dev/chart?date=1969-07-20"));
    expect(response.headers.get("location")).toBe("https://preview-abc.example.dev/date/1969-07-20");
  });

  it("doesn't carry the old query string onto the target", async () => {
    const response = await get("/chart?date=1969-07-20&error=Save%20failed");
    expect(new URL(response.headers.get("location")!).search).toBe("");
  });
});
