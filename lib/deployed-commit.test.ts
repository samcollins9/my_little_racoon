import { describe, expect, it } from "vitest";
import { getDeployedCommit } from "./deployed-commit";

describe("getDeployedCommit", () => {
  it("reads and shortens the SHA Vercel sets on a real deployment", () => {
    const result = getDeployedCommit({
      VERCEL_GIT_COMMIT_SHA: "abcdef1234567890",
    });

    expect(result).toEqual({
      sha: "abcdef1234567890",
      short: "abcdef1",
      isLocal: false,
    });
  });

  it("falls back to a local marker when the env var is absent", () => {
    const result = getDeployedCommit({});

    expect(result.isLocal).toBe(true);
    expect(result.sha).toBe("local-dev");
    expect(result.short).toBe("local-dev");
  });
});
