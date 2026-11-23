import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

// Sprint 36, R2/R3: the runner's stop-at-first-failure and result-line logic,
// with the steps faked. The real end-to-end runs (a clean tree, a lint error,
// a failing test) are recorded in the sprint handoff, since running the real
// `npm run verify` from inside `npm test` would recurse.
const { STEPS, verify } = createRequire(import.meta.url)("./project-verify.js");

/** A fake runStep: each step's status from `statuses`, recording what ran. */
function fakeRunner(statuses) {
  const ran = [];
  const runStep = (step) => {
    ran.push(step);
    return step in statuses ? statuses[step] : { status: 0 };
  };
  return { ran, runStep };
}

describe("project-verify (Sprint 36)", () => {
  it("runs CI's build-job steps in ci.yml's order (R1)", () => {
    expect(STEPS).toEqual(["lint", "typecheck", "test", "build"]);
  });

  it("all steps pass: every step runs, exit 0, the PASS line (R3)", () => {
    const { ran, runStep } = fakeRunner({});

    expect(verify(STEPS, runStep)).toEqual({
      code: 0,
      line: "VERIFY PASS (lint, typecheck, test, build) exit=0",
    });
    expect(ran).toEqual(STEPS);
  });

  it("a lint failure stops there with lint's own code; nothing after it runs (R2)", () => {
    const { ran, runStep } = fakeRunner({ lint: { status: 2 } });

    expect(verify(STEPS, runStep)).toEqual({ code: 2, line: "VERIFY FAIL at lint exit=2" });
    expect(ran).toEqual(["lint"]);
  });

  it("a test failure stops at test; build never runs (R2)", () => {
    const { ran, runStep } = fakeRunner({ test: { status: 1 } });

    expect(verify(STEPS, runStep)).toEqual({ code: 1, line: "VERIFY FAIL at test exit=1" });
    expect(ran).toEqual(["lint", "typecheck", "test"]);
  });

  it.each([
    ["killed by a signal (no status)", { status: null }],
    ["could not be started", { status: null, error: new Error("spawn npm ENOENT") }],
    ["an error alongside a zero status", { status: 0, error: new Error("boom") }],
  ])("a step that %s fails with exit 1 (R2)", (_label, result) => {
    const { ran, runStep } = fakeRunner({ typecheck: result });

    expect(verify(STEPS, runStep)).toEqual({ code: 1, line: "VERIFY FAIL at typecheck exit=1" });
    expect(ran).toEqual(["lint", "typecheck"]);
  });
});
