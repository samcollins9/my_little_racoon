# Sprint 40 handoff — README: export the service role key for local database tests

## Round 1

**Status:** ready for QA1's gate-1 audit.

**Verify:** `VERIFY PASS (lint, typecheck, test, build) exit=0` (35 test files, 444 tests).

**Only `README.md` changed**, plus this handoff and its evidence under `docs/handoffs/sprint-40/` (R4).

### A step the sprint file doesn't list yet: `npx supabase db reset`

**Master Controller needs to amend the sprint for this before QA1 records a verdict.** The user chose this fix ("A") in Dev Team 1's session on 24 Nov 2026.

- **What I found:** my first run of the corrected recipe failed `test:rls` with 29 of 43 tests (`PGRST202`, function not found).
  - Docker Desktop still had this project's database volume from August. `supabase start` restored it ("Starting database from backup"), so it had only 8 of the repo's 12 migrations, missing everything from Sprint 28 onwards.
  - `start` applies migrations only when it creates the database, and the recipe's own `supabase stop` keeps the volume. So the recipe tested an out-of-date schema on any machine that had run it before.
  - CI never sees this, because its stack is always fresh.
- **The fix:**
  - The recipe now runs `npx supabase db reset` after `start`.
  - `start`'s comment no longer claims it "applies every migration".
  - A paragraph explains why the reset is there and warns that it deletes local data.
- **Logs from the failed first run weren't kept.** I replaced them with the full run below, and the numbers above are from that session's output.

### What changed

| Req | Where | How |
|---|---|---|
| R1 | Tier 2 recipe | Adds `--override-name auth.service_role_key=SUPABASE_SERVICE_ROLE_KEY`. The filter is now `grep -E '^(NEXT_PUBLIC_SUPABASE_(URL\|ANON_KEY)\|SUPABASE_SERVICE_ROLE_KEY)='`, so it keeps exactly the three variables. `diff` of every `--override-name …` token in `ci.yml` against the README's is empty (exit 0). The prose names all three variables and CI's step by its current name, "Export local stack URL/anon key/service role key". |
| R2 | "Running the policy tests" | The two-command recipe is gone. The section now links to the Tier 2 recipe, so there is one recipe. The only other `test:rls` in the README is prose describing the config file (line 154). |
| R3 | Tier 2 prose, "Local setup" | **Tier 2 prose:** the key goes in the shell because Vitest doesn't load `.env.local`, so a key already in `.env.local` doesn't reach the tests. It is the local stack's well-known demo key, and production's key never goes in `.env.local` or anywhere else on a developer machine. **"Local setup":** one added sentence says the same about the demo key and production's key. Its instruction to copy the local key into `.env.local` is unchanged. |
| R5 | `docs/handoffs/sprint-40/` | See the evidence below. |

The Tier 2 prose also names the error you get without the service role mapping. It is `lib/supabase/admin.ts:38`'s message, thrown when `supabase/tests/clients.ts` loads. I took it from the code and didn't reproduce it by running the tests.

### Evidence (R5)

**How the run was done:**
- The run used a clean environment: `env -i HOME PATH TERM bash --noprofile --norc`. It set no `SUPABASE` variables, and `preset_supabase_vars=0` is printed at the start.
- There is no `.env.local` in the repo.
- Docker Desktop has WSL integration on, and `docker info` exits 0 (server 29.7.2). The Supabase CLI is 2.114.0.

**How the recipe was run:**
- The recipe is the Tier 2 `bash` block, taken from `README.md` with `awk` and run unedited. The copy is in [recipe-as-run.sh](sprint-40/recipe-as-run.sh).
- The runner added only an `echo "stepN_exit=$?"` straight after each command, plus a line that prints the names (not the values) of the exported variables before `test:rls`.

**Log:** [tier2-run.log](sprint-40/tier2-run.log). Keys printed by `supabase start` are redacted, even though they're the local demo keys.

| Step | Command | Exit |
|---|---|---|
| 1 | `npx supabase start` | `step1_exit=0` ("Starting database from backup…") |
| 2 | `npx supabase db reset` | `step2_exit=0` (applies all 12 migrations, listed in the log) |
| 3 | the `export $(…)` line | `step3_exit=0`; all three variable names are present |
| 4 | `npm run test:rls` | `step4_exit=0`: 5 files, 43 tests passed |
| 5 | `npx supabase stop` | `step5_exit=0` |

No exit code was read through a pipe. The one pipe, inside step 3's `$(…)`, is the recipe itself; the code recorded there is `export`'s own.

### Known limitations

- **"Local setup" still says** `supabase start` "applies every migration in `supabase/migrations/` to the local database automatically" (README lines 96–97). That's now contradicted by the Tier 2 paragraph, and it's wrong after the first start. The sprint allows only one new sentence in "Local setup", so I left it. Master Controller could add it to the amendment, or to a later sprint.
- **"Which `.env.local` is which" (around line 290)** describes using a `.env.local` that holds "the **production** project's URL and keys", "only deliberately". That isn't an instruction to do so, but it tolerates production keys in `.env.local`, which sits awkwardly with R3's new sentence. It's out of scope, so I didn't change it; see question 2.
- **The recipe's `npx supabase stop` still keeps the volume.** That's harmless now, because the next run resets the database.

### Questions for QA1

1. Is `db reset` as the fix acceptable, given that it deletes local data? I chose it over `supabase migration up` because it matches CI's fresh stack exactly. `migration up` would only add the missing migrations on top of whatever rows were already there.
2. Does "Which `.env.local` is which" fail R3's check that grep finds no instruction to put production's key in `.env.local`? I read it as a warning, not an instruction. If you disagree, the fix is outside this sprint's allowed edits.
