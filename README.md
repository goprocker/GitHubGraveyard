# GitHub Graveyard

A 3D cemetery of GitHub repositories. Enter any username to see their public repositories, or open the owner's graveyard. Long-untouched repositories become mossy, cracked graves. Starred ones get grander monuments.

## Setup

Requires Node 24.

1. Create a [fine-grained token](https://github.com/settings/personal-access-tokens/new) with your account as owner, **All repositories**, and **Metadata: Read-only**.
2. Copy `.env.example` to `.env.local` and fill it in. `.env.local` is ignored by git.
3. Run:

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | Yes | Decides whose repositories appear. Read only on the server. |
| `GRAVEYARD_PASSWORD` | No | Protects every route and shows private repositories too. The browser asks for it, and any username works. When unset, the site is open and shows public repositories only. |
| `NEXT_PUBLIC_E2E` | No | Tests only. Set by the Playwright config. Leave it unset in production. |

## How graves are classified

Status comes from whole UTC calendar days since `pushed_at`:

| Status | Days since last push |
|---|---|
| Alive | 0 to 30 |
| Forgotten | 31 to 90 |
| Buried | 91 to 365 |
| Ancient | More than 365 |
| Archived | Any, when the repository is archived |

Marker size comes from stars: gravestone (0 to 4), decorative (5 to 19), elaborate (20 to 99), monument (100 or more).

**`pushed_at` caveat:** this is an approximate activity signal, not a judgement of code quality. A finished, stable project can look "ancient". If GitHub returns no push date, the creation date is used and the UI says so.

## Architecture

- `proxy.ts`: password gate for every route.
- `app/api/graveyard/route.ts`: server-side GitHub proxy. It allowlists response fields, forbids shared caching and never sends the token to the browser.
- `lib/github/`: GitHub client, field sanitizing, error types and a 10-minute in-memory cache.
- `lib/`: pure logic for classification, filtering, seeded layout, terrain and epitaphs, plus the UI store.
- `components/three/`: the React Three Fiber scene, lazy-loaded on the client.
- `components/ui/`: landing page, HUD, repository list and details panel. The list is also the keyboard path into the scene and the fallback when WebGL isn't available.

The same account and repositories always produce the same layout. `decisions.md` records why each choice was made.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e   # Run `npx playwright install chromium` first
```

## Limitations

- Only repositories the account owns, at most 500. Organisation repositories are left out. Lookups by username show public repositories only and share the server token's rate limit.
- Deploy only over HTTPS, because the password gate uses HTTP Basic auth.
- The 3D scene shows at most 100 graves, chosen by stars and then recent pushes. The list shows every fetched repository.
- The cache is per server instance, so it resets on restart and isn't shared across instances.
- The password gate has no lockout after failed attempts, so use a long password.
- Demo Resurrection is only a visual effect for the current visit. It changes nothing on GitHub and doesn't detect real revivals.
- Frame rate hasn't been measured on real GPUs. Automated tests use software rendering.

## Deployment

**Vercel:** import the repository and set `GITHUB_TOKEN`. Add `GRAVEYARD_PASSWORD` only to show private repositories behind a password.

**Any Node host:**

```bash
npm ci
npm run build
GITHUB_TOKEN=your_token GRAVEYARD_PASSWORD=your_password npm start
```

The server listens on port 3000 unless you set `PORT`.
