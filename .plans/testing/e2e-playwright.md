# Task: Set up Playwright E2E with mocked Barista backend

**Status:** ACTIVE (Phases 1–3 complete)
**Branch:** dev

## Goal
Install Playwright, wire it to the dev server, and ship a first E2E test that loads a CAM with a mocked Barista response — proving the route → splash → model-rendered chain works without depending on a real backend or auth token.

## Context
- Unit foundation is solid: 47 tests passing across slice + fixture + test-utils suites.
- Existing testing plan (`.plans/testing/testing-workflow.md`) had a thin Phase 5 sketch for Playwright; this plan supersedes that section with concrete steps.
- **User decisions (already made):**
  - **API/auth strategy:** mock Barista via `page.route()` using `tests/fixtures/raw/*.json` (DRY with unit fixtures, offline, reproducible).
  - **First test target:** skip a separate smoke test — go straight to loading a model end-to-end.
  - **Browser scope:** chromium only.

### Key Files Involved
| Category | File / Path |
|----------|-------------|
| **API entry** | `src/features/gocam/slices/camApiSlice.ts` — `getGraphModel` query |
| **URL builder** | `src/@noctua.core/services/linksService.ts` — `getBaristaApiUrl` |
| **Environment** | `src/@noctua.core/data/constants.ts` — `ENVIRONMENT.globalBaristaLocation`, `globalMinervaDefinitionName` |
| **Router** | `src/App.tsx` — single route `/` → `PathwayEditor` |
| **Auth boundary** | `src/features/auth/authProvider.tsx`, `src/features/users/components/SplashScreen.tsx` |
| **Editor entry** | `src/app/PathwayViewer.tsx` — reads `modelId`/`baristaToken` from URL (needs verification in Phase 2) |
| **Existing fixtures** | `tests/fixtures/raw/{swiss-1,another-model,large-val}.json` — reuse for `page.route` |
| **New infra** | `playwright.config.ts`, `e2e/`, `e2e/mocks/`, `e2e/fixtures/` |

---

## Current State
- **What works now:** Vite dev server on port 4208 (`npm run start`), unit + integration test infra in `tests/`.
- **What's missing:** Playwright not installed, no `e2e/` directory, no mocking layer, no E2E scripts.

---

## Decisions
| Question | Decision | Rationale |
|----------|----------|-----------|
| Mocking vs real backend | **Mock with `page.route()`** | Offline, reproducible, no token rotation; reuses unit fixtures. |
| Browser scope | **Chromium only** | Fastest CI, sufficient for SPA coverage; can broaden later. |
| Fixture management | **Re-import from `tests/fixtures/raw/`** (not copy) | Single source of truth — refreshing one place updates both unit + E2E tests. |
| First test scope | **Model loading happy path** | Validates routing + Splash + Auth + RTK Query + transform + render in one sweep. |
| Dev server in CI | **Playwright's `webServer`** with `npm run start` | Standard pattern; `reuseExistingServer: !process.env.CI` allows fast local iteration. |
| Auth handling | **Inject `barista_token` via URL query** + mock the privileged endpoint | The app already supports `?barista_token=…`; mocking sidesteps real ORCID auth. |

---

## Steps

### Phase 1: Install + minimal config — DONE
Goal: `npx playwright test` runs (with zero tests) without error.

- [x] Install: `npm install -D @playwright/test` (v1.59.1)
- [x] Download chromium binary: `npx playwright install chromium`
- [x] Create `playwright.config.ts` (chromium-only, `npm run dev` webServer on port 4208, traces on retry, screenshots/video on failure, GitHub reporter in CI)
- [x] Add npm scripts to `package.json`: `test:e2e`, `test:e2e:ui`, `test:e2e:headed`
- [x] Add `.gitignore` entries: `playwright-report/`, `test-results/`, `playwright/.cache/`
- [x] Create `e2e/.gitkeep` placeholder
- [x] Verified: `npx playwright test --list` reports 0 tests in 0 files (config parses, no errors)

### Phase 2: Mock-Barista infrastructure — DONE
Goal: a single helper function that intercepts the Barista endpoints and returns one of our existing fixtures.

- [x] Read `src/app/PathwayViewer.tsx` — model ID via `searchParams.get('model_id')`.
- [x] Read `src/features/auth/authProvider.tsx` + `useAuthSetup.ts` — token via `?barista_token=`, stored to Redux + localStorage, then stripped from URL. No-token path = read-only (m3Batch, not m3BatchPrivileged).
- [x] Read `SplashScreen.tsx` — gates on `useGetAllDataQuery` which calls `${barista}/users` and `${barista}/groups` in parallel; then 500 ms delay before render children.
- [x] Read `src/@noctua.core/data/constants.ts` — default `globalBaristaLocation: 'http://localhost:3400'`, `globalMinervaDefinitionName: 'minerva_local'`.
- [x] Create `e2e/mocks/barista.ts`:
  - `loadRaw(name)` — reads JSON from `tests/fixtures/raw/<name>.json` at runtime (avoids JSON-import config quirks under Playwright's runner).
  - `mockBaristaMetadata(page)` — fulfills `**/users` + `**/groups` with minimal fake arrays.
  - `mockBaristaModel(page, fixture)` — fulfills `**/m3Batch*` with `{ data: <raw> }`. Accepts a fixture name or raw object.
  - `getModelIdFromRaw(raw)` — typed helper to pull `id` from the raw fixture.
- [x] Create `e2e/fixtures/test-urls.ts` — `buildModelUrl(modelId, { baristaToken? })`.
- [x] Decision recorded: no-token path is the default for E2E (simpler, no auth surface area). Token-mode helpers can be added when a test needs them.

### Phase 3: First E2E test — DONE
Goal: full app boots, splash clears, model loads end-to-end with mocked Barista.

- [x] `e2e/model-loading.spec.ts` — 2 tests, both passing in 20.7s:
  - **Load model (no token, read-only):** mocks `/users`, `/groups`, `/m3Batch*` with `another-model`. Navigates to `/?model_id=<id>`. Asserts splash logo hidden, "Loading..." gone, no error, "Not Logged In:" banner visible.
  - **No model_id case:** navigates to `/` with no params, asserts "No model ID provided" friendly message.
- [x] **`data-testid` audit deferred** — used existing selectors (alt text, exact text, banner copy). Stable enough for the first round. Will revisit when tests need to target activity rows / toolbar title / model state. See Phase 5.

### Phase 4: Auth-less / no-token path
Goal: prove the splash screen is reachable and meaningful in the unauth'd state.

- [ ] `e2e/splash.spec.ts`:
  - Navigate to `/` with no token, no model id.
  - Assert splash/login UI visible (locator TBD after Phase 2 audit).
  - Assert no editor surface (`activity-table`) is rendered.

### Phase 5: Interaction flows
One test file per flow. Each mocks the model + any mutation endpoints involved.

- [ ] `e2e/activity-table.spec.ts` — click row → row gets selected styling + Redux state updated (assert via `data-selected` attribute or class).
- [ ] `e2e/activity-form.spec.ts` — open form for an existing activity, assert pre-populated fields. (Submission deferred to Phase 6 when mutation mocking lands.)
- [ ] `e2e/connector-form.spec.ts` — open connector form, walk decision tree (regulation → direction → directness), assert relation resolves.
- [ ] `e2e/model-metadata.spec.ts` — open metadata dialog, assert title/state/taxon editable, cancel preserves original.

### Phase 6: Mutation mocking
Goal: extend mock helpers to handle POST `m3BatchPrivileged` and verify operations payloads.

- [ ] `mockBaristaMutation(page, { onRequest })` — intercept POST, parse `requests` form param, expose to test for assertion.
- [ ] Re-enable submission steps from Phase 5 tests.

### Phase 7: CI integration
- [ ] Add `npm run test:e2e` to CI pipeline.
- [ ] Cache `playwright/.cache/` between CI runs.
- [ ] Upload `playwright-report/` as artifact on failure.

---

## Recovery Checkpoint

> **Last completed action:** First real interaction test live. CamToolbar got 2 testids (`model-title`, `edit-model-title`). New mock helper `getTitleFromRaw`. Test asserts (a) toolbar reflects loaded model title and (b) clicking the edit pen opens the "Edit Model" dialog. **3/3 E2E green in 12.2s; 47/47 unit green; tsc clean.**
> **Next immediate action:** Build out Phase 5 — pattern is established. Each new flow is: add minimal testid(s) on the target surface, write a `.click()`-and-assert test. Highest-value next targets: copy-model dialog flow, errors-chip → CamErrors panel flow, then activity-table interaction (which requires either canvas click handling or adding a dedicated entry point).

## Failed Approaches
| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
|                |               |      |

## Files Modified
| File | Action | Status |
| ---- | ------ | ------ |
| `.plans/testing/e2e-playwright.md` | Created | Done |
| `playwright.config.ts` | Created — chromium-only, webServer `npm run dev`, port 4208 | Done |
| `package.json` | Added `test:e2e`, `test:e2e:ui`, `test:e2e:headed` scripts; `@playwright/test@1.59.1` in devDeps | Done |
| `.gitignore` | Added Playwright entries | Done |
| `e2e/.gitkeep` | Created placeholder | Done |
| `e2e/mocks/barista.ts` | Created — `loadRaw`, `mockBaristaMetadata`, `mockBaristaModel`, `getModelIdFromRaw` | Done |
| `e2e/fixtures/test-urls.ts` | Created — `buildModelUrl(modelId, { baristaToken? })` | Done |
| `e2e/model-loading.spec.ts` | 3 tests: load+title, click-edit-pen-opens-dialog, no-model_id-snapshot | Done |
| `e2e/model-loading.spec.ts-snapshots/no-model-id-chromium-win32.png` | Baseline screenshot (Windows-Chromium) | Done |
| `src/features/gocam/components/CamToolbar.tsx` | Added `data-testid="model-title"` + `data-testid="edit-model-title"` (plus `aria-label`); no behavior change | Done |
| `e2e/mocks/barista.ts` | Added `getTitleFromRaw` helper | Done |

## Blockers
- ~~Need to verify how PathwayViewer reads `modelId` from URL~~ — resolved: `?model_id=...`.
- ~~SplashScreen unblock condition~~ — resolved: `/users` + `/groups` parallel fetches, then 500 ms delay.
- **Still open:** `data-testid` coverage for activity rows, toolbar title, model state badges. Required before Phase 5 interaction tests can reliably target elements. Recommend a small one-shot PR adding minimal stable testids when Phase 5 starts.
- **Vite `server.open: true`** spawns a system browser window when Playwright starts the dev server — cosmetic noise, not blocking. Could override with `server.open: false` for test runs (e.g., conditional in vite.config.ts or a `dev:test` script).

## Notes
- Reusing `tests/fixtures/raw/*.json` keeps fixtures in one place — when we refresh from a new Barista export, both unit and E2E tests pick up the new data.
- `webServer.reuseExistingServer: !process.env.CI` means locally Playwright will use your already-running `npm run dev` if it's up — fast iteration. CI always spins up a fresh server.
- Mocked tests are great for happy paths and edge cases we can construct; they can't catch Barista contract drift. Worth pairing with a periodic real-backend smoke test later (Phase 8+).
- Coverage instrumentation for E2E is out of scope; unit coverage is the right tool for that.

### Working with traces + reports
- **HTML report:** `npx playwright show-report` — opens a browser with every test, status, attached screenshots/traces.
- **Single trace:** `npx playwright show-trace test-results/<test-dir>/trace.zip` — opens the time-travel debugger. Shows every action with a DOM snapshot, network log, console, and source location.
- **Force traces on every run:** `npx playwright test --trace=on` (default is `on-first-retry`, which only saves traces when a test flakes).
- **Update visual baselines:** `npx playwright test -u` (or `--update-snapshots`). Necessary when the UI legitimately changes.

### Visual regression cross-platform caveat
- Baselines are platform-specific. Our current `no-model-id-chromium-win32.png` is Windows only. If CI runs on Linux, it will fail visual regression until a Linux baseline is generated.
- Options when we get to CI: (a) generate baselines on the same platform that CI uses (Linux container locally), (b) make CI the source of truth and locally accept platform mismatch, (c) loosen with `maxDiffPixelRatio` to tolerate small AA differences.

## Lessons Learned
<!-- Fill during and after task. -->

## Additional Context (Claude)
- Two reasonable departures from this plan if you want to redirect:
  - **Skip Phase 4 (auth-less splash) for now** — happy-path mocking already exercises the splash dismissal, so Phase 4 may be redundant unless we expect the splash UI itself to change often.
  - **Defer `data-testid` audit until needed** — Playwright can target by accessible name / role, which often survives refactors better than testids. Worth a brief preference check before writing locators.
- **Open question on real-backend testing:** the plan deliberately punts on this. If you want a periodic smoke test against the real Barista (independent from PR-blocking E2E), it could live in a separate `e2e:real/` directory with an opt-in script, gated on an env var carrying a real test token. Happy to add as Phase 8 if useful.
