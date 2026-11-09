# Decisions

A running log of meaningful changes: what changed, why this approach, and why this library or method over the alternatives. Newest entries go at the bottom.

## 1. Scaffolded with create-next-app

**What changed:** Generated the Next.js App Router project with TypeScript, Tailwind, ESLint and npm. Used `--disable-git`.

**Why this approach:** The brief specifies this stack, and the generator produces a config that is known to work with the current Next version. Git is off because no commits were requested.

**Why over alternatives:** Hand-writing the config risks subtle mismatches with Next 16 and Tailwind 4. Vite would need separate server routes, and the GitHub token must stay on a server.

## 2. Core domain logic as pure modules in `lib/`

**What changed:** Added `types`, `username`, `classify`, `prestige`, `seed`, `terrain`, `layout`, `epitaphs`, `languages`, `filter`, `timelines`, `webgl`, `quality`, `demo-data`.

**Why this approach:** Pure functions with an explicit `now` or seed can be unit tested without a browser, and the rules stay out of the rendering code.

**Why over alternatives:**
- **Calendar-day arithmetic with `Date.UTC`** rather than dividing elapsed milliseconds, which shifts status based on the time of day. A date library such as date-fns is not needed for one calculation.
- **FNV-1a plus mulberry32** rather than `Math.random` (not seedable) or a `seedrandom` dependency. About 15 lines give repeatable results across browsers.
- **Username rule allows consecutive and trailing hyphens**, unlike the stricter regexes commonly copied around, because older GitHub accounts have them and would otherwise be wrongly rejected. Only alphanumerics and hyphens get through, so path injection is still impossible.

**Deviation from the plan:** Every grave uses the same cell size instead of monuments getting larger cells. Cell size already fits the largest footprint, so overlap stays impossible and the layout code is simpler. Monuments still get the slots nearest the path.

**Known trade-off:** Placement order uses star tier, so a repo crossing a tier boundary can reshuffle the layout. The same collection with the same star tiers always produces the same layout.

## 3. GitHub proxy route and in-memory cache

**What changed:** Added `lib/github/*` and `GET /api/github/[username]`.

**Why this approach:** The URL is built only from a validated username, so callers cannot reach arbitrary GitHub paths. Response fields are allowlisted so nothing unexpected reaches the browser. The token is read only on the server.

**Why over alternatives:**
- **Own LRU cache plus `Cache-Control`** rather than the Next data cache. It lets the route serve stale data when GitHub rate limits, cache 404s for less time, and be tested directly. Redis would need a paid or external service, which the brief rules out.
- **Forks filtered after the cache** so toggling forks spends no GitHub quota.
- **In-flight request sharing** so simultaneous requests for one user do not spend several API calls.

**Known limitation:** The cache is per server instance, and there is no per-IP rate limiting.

## 4. zustand for UI state

**What changed:** Added `lib/store.ts`.

**Why this approach:** Each tombstone subscribes only to whether it is hovered or selected, so hovering rerenders at most two graves.

**Why over alternatives:** React context rerenders every consumer on each change, which the brief specifically rules out for hover. A hand-written store would duplicate zustand, which is already installed as a dependency of `@react-three/fiber`.

## 5. Turned off `cacheComponents` and `partialPrefetching`

**What changed:** Removed both flags that the scaffold enabled in `next.config.ts`, and added security headers there.

**Why this approach:** With `cacheComponents` on, Next keeps previous routes alive in a hidden `<Activity>`. That would leave a heavy WebGL scene and its context around after navigating away.

**Why over alternatives:** Keeping the flags would add Suspense requirements around `params` and give nothing back, because this app has no server-cached components. The Next docs say both features become default in the next major version, so this needs another look at that upgrade.

## 6. ESLint and TypeScript settings

**What changed:** Disabled `react-hooks/immutability`, `refs` and `purity` for `components/three/**` only. Added `noUncheckedIndexedAccess` to `tsconfig.json`.

**Why this approach:** Three.js objects are mutated every frame by design, which those rules forbid. Scoping the override keeps the rules active for all other code.

**Why over alternatives:** Inline disable comments would repeat across every scene file, and turning the rules off globally would weaken checks on normal React code.

## 7. Tombstone geometry, label atlas and `Tombstone` component

**What changed:** Added `components/three/TombstoneGeometries.ts`, `LabelAtlas.ts`, `Tombstone.tsx` and `sceneState.ts`.

**Why this approach:** Twelve shared merged geometries (three per prestige tier) and shared materials keep memory low. Each grave costs about two draw calls plus any stars.

**Why over alternatives:**
- **One canvas atlas for labels** rather than drei `Text` per grave, which would mean about 300 text meshes at the 100-grave cap.
- **Swapping shared materials on hover** rather than cloning a material per grave, which would break draw-state sharing and need per-grave disposal.

**Not yet verified:** None of this has been compiled or rendered.

## 8. Remaining scene components

**What changed:** Added `Sky`, `Terrain`, `Fog`, `Gate`, `Scenery`, `Particles`, `ResurrectionEffect`, `CameraDirector`, `WebGLBoundary` and `GraveyardCanvas`.

**Why this approach:** Repeated objects (trees, rocks, grass, fence bars, grave accessories) are instanced, which keeps the demo at about 120 draw calls. Animated values live in GSAP timelines and refs, so they cause no React rerenders.

**Why over alternatives:**
- **Additive sprites and small shaders** rather than a post-processing dependency, as the plan set out.
- **A single GSAP timeline owned by `CameraDirector`** rather than per-effect camera tweens, because competing tweens fight over the camera.
- **Status accessories on the high quality level only.** Low quality still shows status through stone material and tilt.

## 9. UI, pages and landing design

**What changed:** Added the pages, `components/ui/*` and the moonlit palette. Display type is IM Fell English and UI type is Alegreya Sans.

**Why this approach:** The landing form is carved into a large headstone, so the subject itself is the first thing people see. Fetch state is keyed by request, so a fork toggle keeps the current scene on screen until the new data arrives.

**Why over alternatives:** An SVG landing backdrop rather than WebGL loads immediately. IM Fell has the uneven look of old cut lettering, which a generic serif doesn't.

## 10. Honour a skip requested before the scene loads

**What changed:** `CameraDirector` checks `skipRequested` when it mounts.

**Why this approach:** The skip button appears before the lazy 3D chunk finishes loading, so an early click was being lost. Browser tests caught this.

**Why over alternatives:** Hiding the button until the scene loads would leave slow devices with no visible control during the wait, when it matters most.

## 11. Fixes from screenshot review

**What changed:**
- `@theme inline` became `@theme`, because the inline form emits no CSS variables and the plain `var(--color-*)` references were resolving to nothing.
- The terrain rim is capped at 9 units, and path flattening fades out across the rim.
- Selected and hover glow are much lower, and the focus shot sits further back.
- The gate hides when the camera is above 8 units.
- The filter bar scrolls sideways on mobile.

**Why this approach:** The uncapped rim grew into walls that hid the moon, and the path cut a notch through them. The glow washed out all the stone detail.

**Why over alternatives:** Moving the overview camera inside the gate would have pushed the front rows out of frame, while a cutaway keeps every grave visible. The gate is only ever hidden from high vantage points, and the pop as it disappears is a known trade-off.

## 12. Test setup

**What changed:** Added Vitest and Playwright. The browser tests run a production build on SwiftShader with GitHub responses mocked. `NEXT_PUBLIC_E2E=1` exposes a test-only hook for finding a grave's screen position, and turns off adaptive quality so runs stay repeatable.

**Why over alternatives:** Mocking keeps tests within GitHub's 60 requests an hour and makes them deterministic. Live behaviour is checked separately by hand. SwiftShader says nothing about real GPU frame rates, so those remain unmeasured.

## 13. Instanced stars and merged gate geometry

**What changed:** Added `GraveStars`, one instanced mesh for all star ornaments, and merged the gate's pillars, caps and arch into one geometry and its door rails into another. Added `tests/e2e/budget.spec.ts`, which enforces the draw call budgets with 120 repositories, so the cap of 100 graves applies.

**Why this approach:** Measured at the cap, the scene used 517 draw calls on high against a budget of 450, and 403 on low against 250. After this change it uses 338 and 224.

**Why over alternatives:** The plan's fallback was instancing the stone bodies, but that would complicate per-grave material swaps for hover, selection and dimming. Stars were a cheaper first cut and were enough.

**Known trade-off:** Stars don't follow the 0.09-unit hover lift, and they snap upright when a grave is repaired instead of following the stone's short tween. Stars on graves dimmed by a filter are hidden.

## 14. Graphics pass

**What changed:** Brightened stone, ground and scenery colours and the lights. Lowered ground texture contrast and added anisotropic filtering to remove the rippling pattern. Thinned the fog. Added `GraveGlows`, a CSS vignette, a textured moon and a ground ring for the active grave. Stone tint on hover and selection is now subtle.

**Why this approach:** Ancient and buried graves were reading as black shapes, and the cyan tint hid the stone detail. The ring marks the grave without covering it, and it replaces most of what the tint was doing.

**Why over alternatives:** One point cloud for glows costs a single draw call, where one light per grave would cost shader time on every surface and quickly hurt frame rate. A bloom pass would need a new dependency and more GPU time on every frame, and the plan ruled it out.

## 15. Single-owner mode with private repositories

**What changed:** The app now shows only the token owner's repositories, public and private, from `GET /user/repos`. Removed username search, `/demo` and the public `/api/github/[username]` route. Added `/graveyard`, `/api/graveyard`, a password gate in `proxy.ts`, and private labels in the list and panel.

**Why this approach:** The owner asked for this to be for their account alone. Showing private repositories on an open URL would leak their names and descriptions, so every route requires `GRAVEYARD_PASSWORD`, and production refuses to serve if it is unset. API responses use `private, no-store` so a CDN can't store them, replacing the earlier `s-maxage`.

**Why over alternatives:**
- **HTTP Basic auth** rather than GitHub OAuth, which would need an OAuth app, sessions and callback handling for a single user. Basic auth is only safe over HTTPS, which hosts like Vercel provide.
- **A fine-grained, read-only token** rather than a classic `repo` token, which would also grant write access to code.
- **`affiliation=owner`** so organisation and collaborator repositories stay out.

## 16. Decode Basic auth credentials as UTF-8

**What changed:** `proxy.ts` now decodes the credentials as UTF-8 after `atob`. Added `tests/unit/proxy.test.ts` for the password gate.

**Why this approach:** `atob` returns one character per byte, so a non-ASCII password never matched and locked the owner out.

**Why over alternatives:** `TextDecoder` is available in the proxy runtime and needs no dependency. Documenting an ASCII-only password rule would leave a confusing failure for anyone who missed it.

## 17. UI redesign: epitaph landing and quieter glass controls

**What changed:** Landing page now sets one large italic epitaph ("Here lies everything I meant to finish.") directly on the night sky, left-aligned above the fence, with a single dawn fade-in. The arched stone slab with a form was removed. Fonts changed from IM Fell English and Alegreya Sans to Cormorant Garamond and Hanken Grotesk. Floating UI went from squared slate slabs with a thick top border to rounded dark glass with a hairline, pill controls, and one filled lantern-amber primary button. Cyan focus and hover accent became lantern amber. The repo panel gained a status dot and a ruled epitaph quote. Error and empty states reuse the landing's inscription style.

**Why this approach:** The old landing looked like a form in a box and the HUD was heavy and uniform. The headline now carries the personality, and the controls recede so the 3D scene leads.

**Why over alternatives:** Kept the existing colour token names so the three.js scene and tests need no changes. Used one entrance animation rather than per-section motion. Cormorant is a lighter, more refined serif than IM Fell, which read as costume lettering at large sizes.

**Not yet verified:** Visual check in a browser; only typecheck and lint were run.

## 18. Scene art direction pass and carried lantern

**What changed:** Moon is larger and lower so it shows in the gate shot, with a wider halo and a brighter horizon. Ground colours are cooler and darker so the stones and path stand out, and ground mist is denser. Added `PathLanterns` (instanced iron posts, lamps and an additive glow cloud along the path, with a flicker) and `CursorLantern` (a warm point light and glow that follows the cursor across the ground once the intro ends). The hover and selection ring and light changed from cyan to lantern amber.

**Why this approach:** Reference images of moonlit graveyards share a big haloed moon, low mist and small warm lights against cool blue. The cursor lantern makes the scene respond to every mouse movement, not just to clicks.

**Why over alternatives:** Instanced posts and one points cloud add three draw calls, so the budget tests should still pass. One point light follows the cursor instead of one per lantern, which would cost shader time on every surface. The cursor position comes from intersecting the ray with a flat plane rather than raycasting the terrain, because terrain raycasting is switched off for speed.

**Not yet verified:** The draw call budget tests (`tests/e2e/budget.spec.ts`) were not run. Frame rate on a real GPU is unmeasured.

## 19. Compact explore bar

**What changed:** The explore bar is one row instead of two. Search, status filters, Forks and Show list stay as labelled pills. Reset camera, Home view, Quality and Copy link became 40px icon buttons on the right with tooltips and screen-reader names, set off by a divider. Status dots glow in their status colour, and the search field widens on focus. The Quality icon is amber on high and grey on low, and Copy link shows a check after copying.

**Why this approach:** The labelled bar wrapped to two rows on a 1280px window and crowded the scene. Rarely used controls don't need visible text, while filters do.

**Why over alternatives:** Visible text stays for anything people will use to narrow down repositories. Icon buttons keep the same accessible names as before, so the existing Playwright lookups ("Quality: high") still match. Icon size is pinned with `[&_svg]` classes because the icons rendered at about half size without it.

**Not yet verified:** Phone-width layout (the bar scrolls sideways there) and the Playwright suite were not run.

## 20. Caretaker with a lamp reads out nearby graves

**What changed:** Replaced `CursorLantern` with `Walker`: a low-poly cloaked figure with a lamp that walks toward the cursor across the ground (eased, turning to face its heading, bobbing while moving, kept inside the cemetery). The lamp carries the warm point light and glow. When a grave is within 3.4 units, a card shows its name, status, a one-line story from the status, its epitaph, last push, language and stars.

**Why this approach:** The floating light had no character. A figure gives the cursor a body and makes proximity, not clicking, the way to learn what happened to a repository. The cards reuse existing status data and epitaphs, so no new data is fetched.

**Why over alternatives:** Built from primitives (cylinder, spheres, cone) rather than loading a model, so there is no asset download and about seven extra draw calls. Nearness is a plain distance check over at most 100 graves each frame, and React state only changes when the nearest grave changes. Hover and click on stones still work as before.

**Known trade-off:** The figure ignores stones and walks through them. Draw call budget tests were not run.

## 21. Keyboard-only caretaker with a follow camera

**What changed:** Removed cursor steering from `Walker`. W A S D (and the arrow keys) walk the caretaker relative to where the camera looks, Shift runs. The first step glides the camera from the overview to a close view behind the figure, and from then on the camera moves with the caretaker while orbit and zoom still work around it. The nearby-grave card now sits beside the figure instead of above it, so the header cannot clip it. Keys are read by physical position (`event.code`), so non-QWERTY layouts work, and they are ignored while typing in the search box.

**Why this approach:** Steering with the cursor fought with orbiting and clicking graves, and the cursor had no way to give a close third-person view. Keyboard walking plus a follow camera is the familiar way to explore a 3D space.

**Why over alternatives:** Translating the camera and orbit target by the caretaker's movement keeps OrbitControls in charge, so no second camera system is needed. A key tapped between frames still moves one step, because automated and very quick taps otherwise never registered.

**Not yet verified:** Draw call budget tests, touch devices (no keyboard, so the caretaker cannot move), and the caretaker still walks through stones.

## 22. Optional password, public repositories only without it

**What changed:** `proxy.ts` no longer returns 503 in production when `GRAVEYARD_PASSWORD` is unset; the site is served openly. In that case `lib/github/client.ts` asks GitHub for `visibility=public` instead of `visibility=all`, so private repositories are never fetched. With a password set, behaviour is unchanged.

**Why this approach:** The owner wants to deploy the graveyard publicly on Vercel without a password, while keeping private repository names hidden.

**Why over alternatives:** Tying visibility to whether a password exists keeps one switch: a private gated site shows everything, an open site shows only public work. Filtering at the GitHub request means private data never reaches the server cache or the browser.

## 23. Look up any GitHub user's graveyard

**What changed:** The landing page now has a username box. Submitting goes to `/graveyard?user=<name>`, and `/api/graveyard?user=<name>` fetches that account's public repositories from `/users/{name}/repos?type=owner`. Without `user`, the token owner's graveyard loads as before, through a smaller link. Usernames are checked against GitHub's login rules before any request, unknown users return 404 `user_not_found`, and the page shows a "Try another username" message for both. The cache is now a map keyed by lowercased username, capped at 200 entries, with one in-flight request per user.

**Why this approach:** The site is public, so visitors want to see their own graveyard, not only the owner's. The server token is still used for these lookups, which raises the GitHub rate limit from 60 to 5,000 requests an hour.

**Why over alternatives:** The `/users/{name}/repos` endpoint only returns public repositories, so private data can't leak whatever token is set. Validating the name first stops path injection into the GitHub URL and saves requests for obvious typos. A capped map keeps memory bounded now that anyone can trigger lookups.

**Known trade-off:** Every visitor shares the token's 5,000 requests per hour. Each lookup costs one request plus one per 100 repositories, and the 10-minute cache softens repeats.

## 24. Per-address rate limit on the API

**What changed:** `lib/rateLimit.ts` allows 10 requests per minute per client address (the first `x-forwarded-for` entry) to `/api/graveyard`. Over the limit, the route returns 429 `rate_limited` with `Retry-After`, which the existing rate-limit screen already shows with a countdown. The landing footer now credits Gopinath instead of listing the stack.

**Why this approach:** Anyone can now trigger GitHub lookups, and they all share one token's 5,000 requests per hour. A per-address cap stops one visitor or script from draining it for everyone.

**Why over alternatives:** An in-memory sliding window needs no extra service. It is per server instance, like the repository cache, so on Vercel the real limit can be higher when several instances run. A shared store such as Upstash Redis would make it exact if abuse becomes a problem.
