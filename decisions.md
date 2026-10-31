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

