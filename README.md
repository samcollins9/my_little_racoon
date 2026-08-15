# Retroactive Horoscope

A Next.js + TypeScript app deployed on Vercel. This repository is currently
the deployment-lifecycle walking skeleton (Sprint 1) — see
`docs/ROADMAP_v1.md` for the full plan. The app itself is intentionally
minimal right now: the point of this sprint is a proven path from a push to
`main` to a live production page, not product functionality.

## Local setup

Use Node 22 (pinned in `.nvmrc` and `package.json` `engines`).

```bash
nvm use        # or otherwise ensure Node 22.x
npm install
npm run dev    # http://localhost:3000
```

No environment variables are required for local development — see
`.env.example` for the one variable the app reads and why it's fine to leave
unset locally.

## CI commands

Also see `.github/workflows/ci.yml`. Run any of these locally before pushing:

```bash
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
npm run test        # vitest run
npm run build        # next build — the same command Vercel runs
```

## Path to production

1. Push (or merge a PR) to `main`.
2. GitHub Actions runs install, lint, typecheck, test, and build on every
   push and pull request. A red run blocks confidence in the deploy, though
   it does not itself gate the Vercel deployment.
3. Vercel is connected to this repository's `main` branch and deploys to
   production automatically on push, using the same Node version and build
   command as CI.
4. The production page reads `VERCEL_GIT_COMMIT_SHA`, set automatically by
   Vercel, and displays it — that's how you confirm which commit is live.
