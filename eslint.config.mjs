import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone design prototype/handoff material, not application
    // source -- not meant to be held to this app's lint rules.
    "docs/design/**",
    // QA1, Sprint 24 round 1: standalone Node CJS tooling (the installer
    // and its launcher scripts), not Next.js application source -- same
    // rationale as docs/design/** above. These run directly under Node,
    // where require() is the normal, correct way to import, not a lint
    // violation to fix.
    "scripts/**",
  ]),
]);

export default eslintConfig;
