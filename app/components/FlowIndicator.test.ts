import { describe, expect, it } from "vitest";
import { stepState } from "./FlowIndicator";

// Sprint 24, R2: the four required states, driven by a single
// `completedSteps` number so /chart's "1 done, 2 current" state is
// mechanically the same code path as /reading's "1/2 done, 3 current" --
// never a per-route hardcoded state (the sprint's stated failure mode).
describe("stepState", () => {
  it("/chart, no date submitted: 1 current, 2 and 3 ahead", () => {
    expect(stepState(1, 0)).toBe("current");
    expect(stepState(2, 0)).toBe("ahead");
    expect(stepState(3, 0)).toBe("ahead");
  });

  it("/chart?date=..., positions rendered: 1 done, 2 current, 3 ahead", () => {
    expect(stepState(1, 1)).toBe("done");
    expect(stepState(2, 1)).toBe("current");
    expect(stepState(3, 1)).toBe("ahead");
  });

  it("/reading/[id], horoscope null: 1 and 2 done, 3 current", () => {
    expect(stepState(1, 2)).toBe("done");
    expect(stepState(2, 2)).toBe("done");
    expect(stepState(3, 2)).toBe("current");
  });

  it("/reading/[id], horoscope present: all three done", () => {
    expect(stepState(1, 3)).toBe("done");
    expect(stepState(2, 3)).toBe("done");
    expect(stepState(3, 3)).toBe("done");
  });
});
