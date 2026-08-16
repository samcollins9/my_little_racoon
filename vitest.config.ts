import { defineConfig, configDefaults } from "vitest/config";

// Default `npm run test`: fast, no network. RLS tests need a live Supabase
// stack and run separately via `npm run test:rls` + vitest.rls.config.ts.
export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "supabase/tests/**"],
  },
});
