import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migrateJobCondition, REQUIRED_MIGRATE_GATE } from "./ci-guardrails";

describe("migrate job stays gated to main + push", () => {
  it("the actual workflow has exactly the required condition", () => {
    const workflowPath = join(process.cwd(), ".github/workflows/ci.yml");
    const yaml = readFileSync(workflowPath, "utf8");
    expect(migrateJobCondition(yaml)).toBe(REQUIRED_MIGRATE_GATE);
  });

  it("catches a widened condition, not just a removed one", () => {
    const widened = `
jobs:
  migrate:
    if: github.event_name == 'push'
`;
    expect(migrateJobCondition(widened)).not.toBe(REQUIRED_MIGRATE_GATE);
  });

  it("catches the condition being removed entirely", () => {
    const removed = `
jobs:
  migrate:
    runs-on: ubuntu-latest
`;
    expect(migrateJobCondition(removed)).toBeUndefined();
  });
});
