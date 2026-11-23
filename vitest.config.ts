import { fileURLToPath } from "node:url";
import { defineConfig, configDefaults } from "vitest/config";

// Default `npm run test`: fast, no network. RLS tests need a live Supabase
// stack and run separately via `npm run test:rls` + vitest.rls.config.ts.
//
// Sprint 33: the "@/" alias mirrors tsconfig.json's `"@/*": ["./*"]`, so a
// test can render a page server component (whose imports use "@/") rather
// than only the pure helpers beside it. Anchored on "@/" so scoped packages
// such as "@supabase/supabase-js" are untouched.
export default defineConfig({
  resolve: {
    alias: [{ find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) }],
  },
  test: {
    exclude: [...configDefaults.exclude, "supabase/tests/**"],
  },
});
