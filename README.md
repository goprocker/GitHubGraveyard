# GitHub Graveyard

Enter a GitHub username and walk through a 3D cemetery of that account's public repositories. Long-untouched repositories become mossy, cracked graves. Starred ones get grander monuments.

Try `/demo` for a sample cemetery of invented repositories.

## Setup

Requires Node 24.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `GITHUB_TOKEN` | No | Raises the GitHub limit from 60 to 5,000 requests an hour. Read only on the server. No scopes are needed for public data. |
| `NEXT_PUBLIC_E2E` | No | Tests only. Set by the Playwright config to expose a test hook. Leave it unset in production. |

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

- `app/api/github/[username]/route.ts`: server-side GitHub proxy. It validates the username, allowlists response fields and never sends the token to the browser.
- `lib/github/`: GitHub client, field sanitizing, error types and an in-memory LRU cache.
- `lib/`: pure logic for classification, filtering, seeded layout, terrain and epitaphs, plus the UI store.
- `components/three/`: the React Three Fiber scene, lazy-loaded on the client.
- `components/ui/`: landing page, HUD, repository list and details panel. The list is also the keyboard path into the scene and the fallback when WebGL isn't available.

The same username and repositories always produce the same layout. `decisions.md` records why each choice was made.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e   # Run `npx playwright install chromium` first
```

To capture review screenshots, set `SHOT_DIR` to a folder before running `npm run test:e2e`.

## Limitations

- Public repositories only, and at most 500 per account.
- The 3D scene shows at most 100 graves, chosen by stars and then recent pushes. The list shows every fetched repository.
- The cache is per server instance, so it resets on restart and isn't shared across instances.
- There is no per-IP rate limiting, so visitors share the server's GitHub quota.
- Demo Resurrection is only a visual effect for the current visit. It changes nothing on GitHub and doesn't detect real revivals.
- Frame rate hasn't been measured on real GPUs. Automated tests use software rendering.

## Deployment

**Vercel:** import the repository and optionally set `GITHUB_TOKEN`. No other configuration is needed.

**Any Node host:**

```bash
npm ci
npm run build
GITHUB_TOKEN=your_token npm start
```

The server listens on port 3000 unless you set `PORT`.
