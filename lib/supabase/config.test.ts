import { describe, expect, it } from "vitest";
import { resolvePublicConfig } from "./config";

describe("resolvePublicConfig", () => {
  it("returns the URL and anon key when both are set", () => {
    const config = resolvePublicConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
    });

    expect(config).toEqual({
      url: "https://project.supabase.co",
      anonKey: "anon-key",
    });
  });

  it("throws when the URL is missing", () => {
    expect(() =>
      resolvePublicConfig({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key" })
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws when the anon key is missing", () => {
    expect(() =>
      resolvePublicConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" })
    ).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});
