---
id: 3
title: "Supabase Auth with per-environment redirects"
epic: "Deployment Lifecycle"
status: abandoned
created: 2026-08-15T20:07:45+00:00
---

# Master Controller Sprint Definition — Sprint 3

**Epic:** Deployment Lifecycle
**Sprint Objective:** Add Supabase email-and-password authentication for the single practitioner, with redirect and callback URLs configured correctly for local, preview, and production, so that identity works in every environment rather than only the one it was built in.

### Context

Auth is where "works on my machine" becomes "works on my machine and nowhere
else." The mechanism is dull and the failure is specific: the callback URL is
absolute, it is configured once for whichever environment the developer happened
to be in, and every other environment silently redirects to the wrong host or is
rejected by the allowlist. On Vercel this bites hardest because preview
deployments get a new hostname on every branch.

This sprint also adds `user_id` to `readings`, which Sprint 2 deliberately left
off. That is the first migration to alter an existing table in a live database,
and proving that works is worth more than the column is.

### Requirements

1. Supabase Auth configured for email and password, with **public sign-up
   disabled**. The single practitioner account is provisioned out of band.
2. Cookie-based server-side session handling, so that server components and route
   handlers can read the session, with session refresh handled in middleware.
3. Sign-in and sign-out flows, and a protected page that redirects unauthenticated
   visitors to sign-in.
4. Redirect and callback URLs configured for all three environment classes: local
   development, Vercel preview deployments, and production. The preview entry must
   cover Vercel's generated hostname pattern.
5. The redirect allowlist is restricted to hosts this project controls. No
   open-ended wildcard that would accept an arbitrary host.
6. A migration adding `user_id` to `readings`, not null, referencing `auth.users`,
   applied through the Sprint 2 pipeline like every other schema change.
7. `.env.example` and `README.md` updated: new variables, how to create the
   practitioner account, and how redirect URLs are configured per environment.
8. The sign-in page maps error states to a fixed set of codes rather than reflecting
   `searchParams` into the page. **Added 16 Aug 2026 from QA1 round 1 note 3.** React
   escapes the value so this is not XSS, but it lets anyone craft a `/sign-in?error=…`
   link showing the practitioner arbitrary text on a genuine sign-in page, moments
   before they type a password. This is a defect in code this sprint wrote, on this
   sprint's own auth surface — it is a fix to the deliverable, not new scope.

### Acceptance Criteria

**QA1 — static, from the diff:**

- R1: sign-up is disabled in committed configuration, and no public registration
  route or UI exists anywhere in the diff.
- R2: session handling is cookie-based and readable server-side; middleware
  refreshes the session. The session is not held in client-only state.
- R3: the protected page checks the session server-side before rendering. A
  client-side-only redirect does not satisfy this — it ships the protected content
  and then hides it.
- R4: all three environment classes are represented in committed configuration or
  documented setup, including the Vercel preview hostname pattern.
- R5: the allowlist contains no entry that would match a host outside this
  project's domains.
- R6: the migration is a new timestamped file in `supabase/migrations/`, adds
  `user_id` not null with a foreign key to `auth.users`, and no DDL appears outside
  that directory.
- R7: `.env.example` and `README.md` cover the listed items; no key, token, or
  password appears in the diff.

**GroundTruth — live, after Pipeman pushes:**

- Signing in on production with the practitioner account reaches the protected
  page.
- Signing out returns to sign-in, and the protected page then redirects when
  visited directly by URL.
- The session survives a full page reload. **This is the sprint's actual proof** —
  a session that only exists in memory looks identical until the first refresh.
- **Carried from Sprint 2's GroundTruth PASS (16 Aug 2026).** A request to the
  `readings` REST endpoint carrying a valid anon key, unauthenticated, returns zero
  rows. Sprint 2 shipped `readings` with full CRUD granted to the `anon` and
  `authenticated` roles at the grant level, protected by RLS alone, and GroundTruth
  could not verify deny-all live because it had no anon key. That assumption is
  fine while the table is empty and nothing touches it — but this sprint introduces
  real sessions against it, so the check moves here rather than waiting for Sprint 4
  to own it. It is a ten-second check. The anon key is readable in the Supabase
  dashboard under Settings → API; it is marked Sensitive in Vercel and cannot be
  read back from there.
- **Added 16 Aug 2026 from QA1 round 1.** An unauthenticated `POST /auth/v1/signup`
  carrying the anon key is refused. `config.toml` disabling sign-up governs the local
  stack; only this check proves the hosted project agrees. The failure is silent and
  it inverts the repository's own claim, so it is verified rather than assumed.

### Out of Scope

- Row Level Security policies — Sprint 4. `readings` still has RLS enabled with no
  policies; `user_id` existing does not mean anything enforces it yet.
- Verifying auth on a preview deployment — Sprint 5, which is where preview
  environments get their database story. This sprint *configures* preview redirects;
  it does not test them.
- Password reset, email confirmation, magic links, OAuth providers, multi-factor.
- Multiple users, roles, or permissions. §5 lists multi-user practices as a v1
  non-goal and nothing here should anticipate them.
- Any UI beyond sign-in, sign-out, and one protected page.
- Any change to `.claude/`, `scripts/`, or `CLAUDE.md`.

### Dependencies

- **Blocks:** Sprint 4 — policies cannot be written or tested without users to
  write them against.
- **Blocked by:** Sprint 2. Needs the migration pipeline and the Supabase project.
- **External:** The practitioner account must be created in the Supabase dashboard,
  since sign-up is disabled by design. Redirect URLs must be saved in Supabase's
  auth settings. **Public sign-up must be disabled on the hosted project**, which is
  a separate dashboard setting from `config.toml` — that file governs the local
  stack only, and nothing syncs the two. Added 16 Aug 2026 after QA1 round 1 noted
  its absence here: R1 passes on the repository while production could still accept
  public registration, and the repo would be asserting the opposite. All three are
  account-level actions the user performs.

### Risks & Mitigations

- **Redirect works in production, fails on preview.** The default outcome if
  callback URLs are configured once against whatever host was convenient. — R4
  requires all three environment classes up front, including the preview hostname
  pattern.
- **Open redirect.** The fastest way to make previews work is a permissive wildcard
  in the allowlist, which turns the auth callback into a redirect to any host an
  attacker names. — R5 constrains the allowlist to project-controlled hosts, checked
  by QA1 as a named item.
- **Client-side-only route protection.** The protected page renders, then redirects,
  having already shipped its content to an unauthenticated visitor. — R3 requires a
  server-side session check, and the acceptance criterion says so explicitly.
- **Sign-up left open.** The default Supabase configuration accepts public
  registration, which makes a single-practitioner tool an open one. — R1, verified
  in committed configuration rather than assumed from the dashboard.
- **`user_id` not null against existing rows.** Safe only because `readings` is
  empty. — Stated here so that the same move is not repeated later on a populated
  table without a backfill.

### Team Assignments

- **Dev Team 1:** the whole sprint.
- **Dev Team 2:** unassigned. Sprint 4 depends directly on this sprint's users.
