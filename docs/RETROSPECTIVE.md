# Retrospective — Deployment Lifecycle Exercise

Closed 16 Aug 2026. Author: Master Controller.
Scope: Sprints 1–10 of `docs/ROADMAP_v1.md`, against `docs/PRD_v1.md`.

---

## What shipped

A public web tool at https://my-little-racoon.vercel.app — enter a past date, get
geocentric planetary positions, save the reading, retrieve it at an unguessable
link. Next.js on Vercel, Postgres on Supabase, no accounts, no external API at
runtime.

| Sprint | Outcome | QA1 rounds | GroundTruth rounds |
|---|---|---|---|
| 1 Next.js on Vercel | done | 1 | 2 |
| 2 Supabase, migrations in CI | done | 2 | 2 |
| 3 Supabase Auth | **aborted** | 1 (CONDITIONAL) | — |
| 4 RLS proven by test | done | 3 | 1 |
| 5 Migration ordering, rollback | done | 1 | 3 |
| 6 Public reading page | done | 1 | 1 |
| 7, 8, 9 | **aborted** | — | — |
| 10 Save and retrieve by link | done | 3 | 1 |

Six sprints completed, four aborted. Eleven QA1 rounds and ten GroundTruth rounds
across six sprints — an average of nearly two per gate per sprint. **Sprint 6 was
the only sprint to clear both gates in a single round.**

## Was the question answered?

The roadmap's definition of done: a change travels from `/sprint-new` to
verified-live through all six roles and both gates, with migrations applied by CI,
RLS proven by test, secrets correct, and a rehearsed rollback — twice, with no
manual intervention outside the written procedure.

**Proven:**
- Push to `main` reaches production unattended. Demonstrated repeatedly, verified
  each time by a commit SHA rendered on the live page.
- Schema reaches production by CI, never by hand, with a drift check.
- RLS denies. Verified live against production with a real anon key, not inferred
  from a passing test suite.
- Rollback works. Executed on production and independently observed returning to a
  prior commit, then restored.
- Anonymous persistence with unguessable links, under those policies.

**Not proven, and worth stating plainly:**
- **Expand-then-contract has never been tested under a real rollback.** Sprint 5
  shipped no migration, so the rollback returned the app to exactly the schema it
  was built for. The rule is documented and QA1 verified the documentation. The
  first real test is the first rollback across a migration boundary, and it hasn't
  happened.
- **Preview environments do not work on this configuration** and the cause was
  never diagnosed. There is no pre-production environment.
- **"No manual intervention"** — deployments were unattended, but configuration was
  not. See below; it was the dominant cost of the exercise.

Verdict: the deployment question is answered. The two gaps are named rather than
absorbed.

---

## Lesson 1 — every stall was an external dependency, never code

Not one sprint stalled on Dev Team's work. Every delay came from an account-level
action nobody could see from a diff:

- Vercel was never actually connected to the repo. Authorizing the GitHub app and
  importing a project are different steps, and the first looks like completion.
  Sprint 1 sat in `groundtruth_live` with no deployment to test.
- The Supabase environment variables were set on nothing, because no project
  existed to hold them.
- Disabling public sign-up was a dashboard toggle absent from the sprint file, so
  the repo would have asserted sign-up was disabled while production accepted it.
- Deployment protection, disabling Vercel Authentication, and Instant Rollback all
  turned out to be plan-gated — discovered one at a time, at the gate.

The gates catch code. Nothing in the process catches "a human needs to click
something." **Fix: every sprint's External dependencies section should be checked
before `/sprint-start`, not read at the gate.** Three sprints lost a cycle to this.

## Lesson 2 — uncommitted sprint state actively lies

QA1 opened a Sprint 2 audit, read Sprint 1's *committed* state, found no ship
recorded, saw a commit on the remote, and correctly reported that someone had
pushed outside Pipeman's gate. Nobody had. Sprint 1's entire post-audit history —
audit, dev-done, ship, two live tests, close — existed only in one uncommitted
working tree.

CLAUDE.md warns that uncommitted sprint data risks losing history to a bad `clean`.
This is worse and more likely: it misinforms other roles while everything still
exists, and it nearly produced a wrong corrective action.

It is also **structural**. `/sprint-complete` always runs after Pipeman's last
push, so every closure record is stranded by construction, and since only Pipeman
pushes, sprint N's closure only reaches the remote during sprint N+1's ship. The
final sprint's closure never reaches it at all without a deliberate last push.

**Fix: commit the bookkeeping immediately on close, and treat a final push as part
of closing the last sprint.**

## Lesson 3 — the rules name a command where they mean an authority

Pipeman declined to perform the production rollback: CLAUDE.md grants Pipeman
exclusivity over `git push`, and a Vercel rollback is not a git push. GroundTruth
had the authenticated CLI and offered, correctly flagging it as out of lane.

Both reasoned correctly from what is written, and reached deadlock. The principle
is not about git — it is that one role controls what production serves. The
resolution was for the user to run it from their own console, which preserved
GroundTruth's independence.

**Fix: reword Pipeman's remit to cover changes to what production serves, by any
mechanism.** That is a change to this repo's own tooling — per CLAUDE.md, not
sprint-shaped, but it wants a real review before it lands.

## Lesson 4 — the gates worked, and the hardest part was refusal

Twice, a role was asked to produce a verdict and declined because there was nothing
to judge:

- QA1 found **zero** Sprint 2 code and recorded no verdict, reasoning that a FAIL
  would enter "a build was audited and found bad" into the permanent record, which
  was false.
- GroundTruth declined to close a criterion about production coexisting with a
  preview when no preview existed — production did serve correctly, but that was
  not the claim.

Both refused to manufacture a result that would have read as progress. That is the
single most valuable behaviour observed in this exercise, and it is the one most
easily eroded by schedule pressure.

GroundTruth also twice refused to take an assertion on trust: it checked CI receipts
to confirm two migrations applied in two separate runs rather than one shot against
an empty database, and it verified in Sprint 2's file that a criterion relocated out
of Sprint 1 had actually landed there before accepting the relocation.

## Lesson 5 — amendments need a paper trail, not just an edit

Sprint files were amended roughly a dozen times: gaps I had left, constraints
discovered at gates, and two large re-scopes. Two practices made that survivable.

**Record the reasoning in the file, not the chat.** When a criterion moved from
Sprint 1 to Sprint 2, GroundTruth verified the destination text before accepting the
move — and said it would have held its verdict had the text been absent. A silent
edit would have read as a deleted failing test.

**Record reversals as reversals.** Sprint 5's preview-verification requirement was
written, revised, and then dropped. The file says so, including that my first fix
was wrong on this account. The alternative — a clean-looking requirement with no
history — invites the next person to retry a setting that cannot be changed.

## Lesson 6 — the plan survived by being re-cut, not defended

Twenty-nine sprints became ten, then seven. Both re-scopes came from the user
clarifying the actual goal rather than from new information about the work: first
that this was a deployment exercise rather than a product build, then that
authentication was not wanted at all.

Cutting Sprints 7–9 was the right call and could have come sooner. The signal was
present early — "simple proof of concept" — and I kept a five-sprint astrology epic
for one exchange longer than the evidence supported.

---

## Outstanding

- **Sprint 10's closure bookkeeping is uncommitted**, and nothing follows it to
  carry it to the remote. Needs a deliberate final commit and push.
- **`preview-check` branch** remains on origin with no purpose. It produced the live
  evidence for Sprint 5's R2 and can go.
- **CLAUDE.md wording** — Lesson 3.
- **Vercel preview deployments** — undiagnosed. Anyone reviving them must verify
  `git.deploymentEnabled.main = false` is still in effect in the same pass, or the
  Sprint 2 migration race returns.

## For the design pass

- **There is no pre-production environment.** Design changes go from `main` straight
  to production. Acceptable only because this app has no users.
- **Rollback is the safety net, and it is rehearsed.** `vercel rollback <url>`, with
  the deployed commit SHA on the page as the observable.
- **Production is public.** Anything shipped is visible to anyone.
- **Keep the styling plain until the design pass.** Sprints 6 and 10 deliberately
  shipped legibility-only pages so nothing would be discarded twice.
