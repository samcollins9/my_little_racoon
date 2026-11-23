#!/usr/bin/env node
'use strict';
// Sprint 36: `npm run verify`, this project's own check command (not a
// framework file -- hence the `project-` prefix; nothing else in scripts/
// is modified by it).
//
// Runs CI's `build` job steps locally, in ci.yml's own order (lint,
// typecheck, test, build), stops at the first failure, and always ends with
// exactly one result line:
//
//   VERIFY PASS (lint, typecheck, test, build) exit=0
//   VERIFY FAIL at <step> exit=<n>
//
// and exits with that same code. The exit code is the evidence (CLAUDE.md,
// "Check evidence is an exit code"): each step's own output streams through
// untouched (stdio inherited, nothing captured, filtered or piped), so the
// result line is the only thing this script adds.

const { spawnSync } = require('node:child_process');

/** CI's `build` job, after `npm ci`, in .github/workflows/ci.yml's order. */
const STEPS = ['lint', 'typecheck', 'test', 'build'];

/**
 * A failed step's exit code, or 1 when there isn't a usable one: the process
 * couldn't be started (`error`), was killed by a signal (`status` null), or
 * somehow reported failure as 0.
 */
function failureCode(result) {
  if (result.error || typeof result.status !== 'number' || result.status === 0) return 1;
  return result.status;
}

/**
 * Runs `steps` in order through `runStep` until one fails. Returns the exit
 * code and the result line; prints nothing itself, so it can be tested
 * without spawning anything.
 *
 * @param {string[]} steps
 * @param {(step: string) => { status: number | null, error?: Error }} runStep
 * @returns {{ code: number, line: string }}
 */
function verify(steps, runStep) {
  for (const step of steps) {
    const result = runStep(step);
    if (result.error || result.status !== 0) {
      const code = failureCode(result);
      return { code, line: `VERIFY FAIL at ${step} exit=${code}` };
    }
  }
  return { code: 0, line: `VERIFY PASS (${steps.join(', ')}) exit=0` };
}

/**
 * `npm run <step>`, output inherited. Under `npm run verify`, npm sets
 * npm_execpath to its own CLI script, which runs through this same Node on
 * every platform. Run directly (`node scripts/project-verify.js`), it falls
 * back to the `npm` on PATH -- through a shell on Windows, where that is
 * npm.cmd and can't be spawned without one.
 */
function runNpmScript(step) {
  const npmCli = process.env.npm_execpath;
  if (npmCli && npmCli.endsWith('.js')) {
    return spawnSync(process.execPath, [npmCli, 'run', step], { stdio: 'inherit' });
  }
  return spawnSync('npm', ['run', step], { stdio: 'inherit', shell: process.platform === 'win32' });
}

module.exports = { STEPS, verify, failureCode };

if (require.main === module) {
  const { code, line } = verify(STEPS, (step) => {
    const result = runNpmScript(step);
    if (result.error) console.error(`verify: could not run "npm run ${step}": ${result.error.message}`);
    return result;
  });
  console.log(line);
  process.exitCode = code;
}
