import { describe, expect, it } from "vitest";
import { resolveAdminConfig } from "./admin";

describe("resolveAdminConfig", () => {
  it("returns the URL and service role key when both are set", () => {
    const config = resolveAdminConfig({
      NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: "service-role-secret",
    });

    expect(config).toEqual({
      url: "https://project.supabase.co",
      serviceRoleKey: "service-role-secret",
    });
  });

  it("throws when the URL is missing", () => {
    expect(() =>
      resolveAdminConfig({ SUPABASE_SERVICE_ROLE_KEY: "service-role-secret" })
    ).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws when the service role key is missing", () => {
    expect(() =>
      resolveAdminConfig({ NEXT_PUBLIC_SUPABASE_URL: "https://project.supabase.co" })
    ).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});
