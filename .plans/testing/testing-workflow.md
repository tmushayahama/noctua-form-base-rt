# Task: Establish Testing Workflow — Unit, Integration, and E2E

**Status:** ACTIVE
**Branch:** dev

## Goal
Set up a thorough testing workflow covering unit tests (Vitest), integration tests (Vitest + RTL), and E2E tests (Playwright). Write foundational tests for all service functions, Redux slices, key components, and critical user flows.

## Context
- **Current state:** Vitest + RTL infrastructure is configured but zero test files exist
- **Unit/integration:** Vitest 3.1.1, @testing-library/react 14.1.2, jsdom, `renderWithProviders` utility ready
- **E2E:** Not configured — need Playwright setup
- **Test command:** `npm run test` → `vitest run`

### Key Files Involved
| Category | Files |
|----------|-------|
| **Pure services** | `graphServices.ts`, `formValidation.ts`, `formUtils.ts`, `violationService.ts`, `activityOperations.ts`, `connectorServices.ts`, `decisionTree.ts`, `lookupServices.ts`, `chemicalConnectorUtils.ts` |
| **Redux slices** | `activityFormSlice.ts`, `camSlice.ts`, `relationSlice.ts`, `authSlice.ts`, `metadataSlice.ts`, `dialogSlice.ts`, `drawerSlice.ts`, `toastSlice.ts` |
| **API slices** | `camApiSlice.ts`, `lookupApiSlice.ts`, `authApiSlice.ts`, `metadataApiSlice.ts` |
| **Hooks** | `useActivityNodeEditor.ts`, `useModelUrls.ts`, `useAuthSetup.ts`, `useRelationFormConfig.ts`, `useDeleteConfirmation.ts`, `usePathwayCanvas.ts`, `useUserContext.ts`, `usePopover.ts` |
| **Components** | `ActivityForm.tsx`, `EntityRow.tsx`, `EvidenceRow.tsx`, `Autocomplete.tsx`, `ConnectorForm.tsx`, `RelationForm.tsx`, `ActivityTable.tsx`, `CamErrors.tsx`, `SplashScreen.tsx` |
| **Test infra** | `tests/setup.ts`, `tests/test-utils.tsx`, `vite.config.ts` (test section), `tsconfig.app.json` (`include`) |

---

## Current State
- **What works now:** Vitest configured, test-utils with `renderWithProviders` ready, jsdom environment, jest-dom matchers imported
- **What's missing:** All test files, Playwright setup, coverage config, test fixtures/factories, CI integration

---

## Steps

### Phase 1: Test Infrastructure & Fixtures
Move test infra into a dedicated `tests/` folder mirroring `src/`, then add fixtures, coverage, and Playwright.

- [x] Move `src/setupTests.ts` → `tests/setup.ts`
- [x] Move `src/utils/test-utils.tsx` → `tests/test-utils.tsx` (use `@/` alias for store imports)
- [x] Update `vite.config.ts` test block: `setupFiles: 'tests/setup.ts'`, `include: ['tests/**/*.test.{ts,tsx}']`
- [x] Add `tests` to `tsconfig.app.json` `include` so `tsc --noEmit` covers tests
- [x] Add `@tests/*` path alias in `vite.config.ts` and `tsconfig.app.json`
- [x] Copy real Barista responses into `tests/fixtures/raw/` (downloads/ is gitignored):
  - [x] `swiss-1.json` — 74 inds / 37 facts / 10 relations (smallest, fastest)
  - [x] `another-model.json` — 160 inds / 72 facts / **14 relations** (most diverse — adds causally-upstream+, indirectly +/-, small_molecule_inhibitor)
  - [x] `large-val.json` — 376 inds / 170 facts / 9 relations (biggest; uniquely covers provides_input_for, constitutively_upstream)
- [x] Create `tests/fixtures/models.ts` — exports `*Raw` and transformed `*Model` for each sample, with relation-coverage doc
- [x] Create `tests/fixtures/builders.ts` — synthetic `buildNode/buildEdgeWithEvidence/buildActivity/buildModel` for controlled slice/component tests
- [x] Smoke test: `tests/fixtures/models.test.ts` confirms `transformGraphData` succeeds on each sample
- [ ] Add coverage config to `vite.config.ts` (`vitest` section): `coverage: { provider: 'v8', reporter: ['text', 'html'], include: ['src/**'], exclude: ['src/**/*.test.*'] }`
- [ ] Install `@vitest/coverage-v8` dev dependency
- [ ] Add fixtures for form + users domains:
  - [ ] `tests/fixtures/form.ts` — sample `TermNode`, `RelationNode`, `EvidenceForm`, `ActivityFormState` objects
  - [ ] `tests/fixtures/users.ts` — sample `Contributor`, `Group`, `UserContext` objects
- [ ] Add `test:watch` and `test:coverage` scripts to `package.json`
- [ ] Install Playwright: `npm init playwright@latest` (chromium only, `e2e/` directory)
- [ ] Configure `playwright.config.ts`: base URL `http://localhost:4208`, webServer command `npm run start`

### Phase 2: Pure Service Unit Tests
These have no React/Redux dependencies — pure input/output, highest ROI.

#### 2A: Graph Services (`graphServices.ts`)
File: `tests/features/gocam/services/graphServices.test.ts`
- [ ] `transformGraphData` — empty/null input returns empty model
- [ ] `transformGraphData` — parses individuals into `GraphNode[]` with correct fields
- [ ] `transformGraphData` — parses complement types correctly (`isComplement: true`)
- [ ] `transformGraphData` — parses facts into `Edge[]` with source/target refs
- [ ] `transformGraphData` — extracts annotations (contributor, date, source, with, providedBy)
- [ ] `transformGraphData` — assembles activities from enabled_by edges
- [ ] `transformGraphData` — extracts molecules (chemical entities not in activities)
- [ ] `transformGraphData` — computes activityConnections across activities
- [ ] `transformGraphData` — parses model-level annotations (title, state, date, taxon, comments)
- [ ] `transformGraphData` — parses ShEx validation-results into violations
- [ ] `extractActivities` — groups nodes/edges into activity subgraphs correctly
- [ ] `extractActivities` — respects activity boundaries (enabledBy sources, chemical entities)
- [ ] `extractMolecules` — finds standalone chemical entity subgraphs
- [ ] `extractMolecules` — excludes chemical nodes already claimed by activities
- [ ] `extractActivityConnections` — finds cross-activity edges, marks HAS_INPUT as reverse
- [ ] `extractEvidence` — builds Evidence from evidence node with sorted sources

**Note:** `graphServices.ts` calls `store.getState()` directly in `getContributor`/`getGroup`. Tests need to mock the store or the functions. Consider refactoring to accept contributors/groups as params instead of reading from store — flag for discussion.

#### 2B: Form Validation (`formValidation.ts`)
File: `tests/features/gocam/services/formValidation.test.ts`
- [ ] Returns root error when `state.root` is null
- [ ] Returns error when required node has no term
- [ ] No error when optional node has no term
- [ ] Returns error when node with term has zero evidence (and `skipEvidenceCheck` is false)
- [ ] No evidence error when `skipEvidenceCheck` is true
- [ ] Returns error when evidence has code but no reference
- [ ] Returns error when reference is not in `DB:accession` format (no colon)
- [ ] Returns error when reference prefix is not in allowed DBs
- [ ] Accepts valid references (PMID:123, DOI:10.xxx, GO_REF:xxx)
- [ ] Returns error when `withFrom` has no colon
- [ ] Walks nested tree — finds errors in deeply nested relations
- [ ] Returns empty array for fully valid form

#### 2C: Form Utilities (`formUtils.ts`)
File: `tests/features/gocam/services/formUtils.test.ts`
- [ ] `flattenNode` — flattens single root with no relations
- [ ] `flattenNode` — flattens 2-level tree into correct order with treeLevel increments
- [ ] `flattenNode` — flattens deep 3+ level tree preserving parent UIDs
- [ ] `findTargetUidByRelation` — finds direct child relation target
- [ ] `findTargetUidByRelation` — finds deeply nested relation target
- [ ] `findTargetUidByRelation` — returns null for non-existent relation UID
- [ ] `getAspectBorderClass` — returns correct Tailwind class for each Aspect enum value
- [ ] `getAspectBorderClass` — returns empty string for undefined/unknown aspect

#### 2D: Violation Service (`violationService.ts`)
File: `tests/features/gocam/services/violationService.test.ts`
- [ ] `processViolations` — returns empty array when no violations
- [ ] `processViolations` — skips violations for nodes not in any activity
- [ ] `processViolations` — creates CardinalityViolation error from cardinality constraint
- [ ] `processViolations` — creates RelationViolation error from object constraint
- [ ] `processViolations` — resolves property CURIEs to labels via `SHAPE_TERM_LABELS`
- [ ] `computeDiffs` — finds orphaned nodes not in any activity (excluding evidence nodes)
- [ ] `computeDiffs` — finds orphaned edges not in any activity or connection
- [ ] `computeDiffs` — returns empty when all nodes/edges belong to activities
- [ ] `computeTotalErrors` — sums violations + diffNodes + diffEdges

#### 2E: Activity Operations (`activityOperations.ts`)
File: `tests/features/gocam/services/activityOperations.test.ts`
- [ ] `buildCreateActivityOperations` — creates individual ADD ops for each term node
- [ ] `buildCreateActivityOperations` — creates edge ADD ops between parent→child
- [ ] `buildCreateActivityOperations` — handles complement expressions
- [ ] `buildCreateActivityOperations` — creates evidence ops with annotations (source, with, contributor, providedBy)
- [ ] `buildCreateActivityOperations` — skips evidence with no evidenceCode.id
- [ ] `buildCreateActivityOperations` — ends with MODEL STORE op
- [ ] `buildEditActivityOperations` — in-place: removes old type + adds new type when term changes
- [ ] `buildEditActivityOperations` — no-op for unchanged nodes
- [ ] `buildEditActivityOperations` — removes old edges not in new form
- [ ] `buildEditActivityOperations` — adds new edges not in old activity
- [ ] `buildEditActivityOperations` — falls back to full replace when no server UIDs match
- [ ] `buildDeleteActivityOperations` — removes all edges then all nodes then stores
- [ ] `buildAddNodeOperations` — adds individual + edge + optional evidence
- [ ] `buildDeleteNodeOperations` — removes edges then individual then stores
- [ ] `buildSaveModelAnnotationsOperations` — removes old title/state/comments, adds new ones
- [ ] `buildAddEvidenceToEdgeOperations` — adds evidence ops to existing edge
- [ ] `buildRemoveEvidenceOperations` — removes individual + stores
- [ ] `buildEditIndividualTypeOperations` — remove-type + add-type + store
- [ ] `buildEditEvidenceAnnotationOperations` — remove old annotation + add new
- [ ] `buildClearEvidenceAnnotationOperations` — removes annotation, no replacement

#### 2F: Connector Services (`connectorServices.ts`)
File: `tests/features/relations/services/connectorServices.test.ts`
- [ ] `buildConnectorOperations` — creates edge ADD between source/target rootNodes
- [ ] `buildConnectorOperations` — creates evidence individuals with annotations
- [ ] `buildConnectorOperations` — attaches evidence to edge via ADD_ANNOTATION
- [ ] `buildConnectorOperations` — skips evidence without evidenceCode.id
- [ ] `buildConnectorOperations` — ends with MODEL STORE
- [ ] `buildChemicalParticipantOperations` — creates chemical individual + HAS_OUTPUT + HAS_INPUT edges
- [ ] `buildChemicalParticipantOperations` — handles multiple chemicals
- [ ] `buildChemicalParticipantOperations` — no STORE op when no chemicals
- [ ] `buildConnectorDeleteOperations` — removes edge + stores

#### 2G: Decision Tree (`decisionTree.ts`)
File: `tests/features/relations/services/decisionTree.test.ts`
- [ ] `determineRelation` — activity→activity regulation/positive/direct returns correct RO ID
- [ ] `determineRelation` — activity→activity regulation/negative/indirect returns correct RO ID
- [ ] `determineRelation` — activity→molecule product returns correct RO ID
- [ ] `determineRelation` — molecule→activity regulation returns correct RO ID
- [ ] `determineRelation` — returns null for invalid combination
- [ ] `getConnectorType` — returns ACTIVITY_ACTIVITY, ACTIVITY_MOLECULE, MOLECULE_ACTIVITY correctly
- [ ] `getDefaultSelection` — returns correct defaults for each connector type
- [ ] `reverseLookup` — finds input from top-level relation
- [ ] `reverseLookup` — finds input from direction-level relation
- [ ] `reverseLookup` — finds input from direction+directness relation
- [ ] `reverseLookup` — returns null for unknown relation

### Phase 3: Redux Slice Tests
Test reducers and selectors in isolation (no components).

#### 3A: Activity Form Slice (`activityFormSlice.ts`)
File: `tests/features/gocam/slices/activityFormSlice.test.ts`
- [ ] `initializeForm` — sets root from template, resets errors
- [ ] `setTerm` — updates term on correct node by UID
- [ ] `addRelation` — adds a new RelationNode to target TermNode
- [ ] `removeRelation` — removes relation by UID from parent
- [ ] `setEvidence` — updates evidence array on relation
- [ ] `addEvidence` — pushes new evidence to relation
- [ ] `removeEvidence` — removes evidence by index
- [ ] `setValidationErrors` — stores errors array
- [ ] Selectors: `selectRoot`, `selectValidationErrors`, etc.

#### 3B: CAM Slice (`camSlice.ts`) — DONE
File: `tests/features/gocam/slices/camSlice.test.ts` (17 tests passing)
- [x] `setModel` — stores graph model on state
- [x] `setSelectedActivity` — stores activity id
- [x] `setSelectedActivity(null)` — clears selection
- [x] `selectCamModel` — returns null when empty, model when loaded
- [x] `selectSelectedActivity` — null when no model/no id; matching activity by uid; null when id misses
- [x] `selectModelEvidence` — empty when no model; dedupes evidence codes across edges; skips edges without evidence
- [x] `makeSelectModelTerms` — empty when no model; dedupes terms by id; filters by `rootTypes` overlap; skips empty id/label

> Note: actual slice has only `setModel` and `setSelectedActivity` (no `setSelectedConnection`). Original plan was based on a stale slice surface.

#### 3C: Relation Slice (`relationSlice.ts`)
File: `tests/features/relations/slices/relationSlice.test.ts`
- [ ] Initial state matches defaults
- [ ] All reducers update state correctly
- [ ] Evidence CRUD within the slice

#### 3D: Simple Slices (auth, metadata, dialog, drawer, toast)
File: `tests/@noctua.core/components/uiSlices.test.ts` (dialog, drawer, toast)
File: `tests/features/auth/slices/authSlice.test.ts`
- [ ] Each slice: initial state, each reducer action, selectors

### Phase 4: Component Integration Tests
Test components with Redux store + user interactions via RTL.

#### 4A: Activity Form Components
File: `tests/features/gocam/components/forms/ActivityForm.test.tsx`
- [ ] Renders form with template data (root node + initial relations)
- [ ] Displays entity rows for each node in the tree
- [ ] Shows validation errors after submit with empty required fields
- [ ] Autocomplete search triggers GOlr lookup (mock API)
- [ ] Adding/removing evidence rows updates form state

#### 4B: Connector/Relation Components
File: `tests/features/relations/components/ConnectorForm.test.tsx`
- [ ] Renders radio pill groups for connector type selection
- [ ] Selecting regulation → shows direction → shows directness
- [ ] Selecting product → no further steps
- [ ] Submit button disabled until relation resolved

File: `tests/features/relations/components/RelationForm.test.tsx`
- [ ] Renders with default selection
- [ ] Radio selection updates relation slice state

#### 4C: Activity Table
File: `tests/features/gocam/components/ActivityTable.test.tsx`
- [ ] Renders list of activities from store
- [ ] Clicking an activity dispatches selection
- [ ] Shows activity type badges (Activity vs Molecule)

#### 4D: CamErrors
File: `tests/features/gocam/components/CamErrors.test.tsx`
- [ ] Renders violation errors with messages
- [ ] Renders orphaned node/edge diffs
- [ ] Shows total error count

#### 4E: Autocomplete
File: `tests/features/search/components/Autocomplete.test.tsx`
- [ ] Renders input field
- [ ] Typing triggers debounced search (mock GOlr)
- [ ] Selecting option calls onChange with term
- [ ] Shows loading state during search

#### 4F: SplashScreen
File: `tests/features/users/components/SplashScreen.test.tsx`
- [ ] Renders when no model is loaded
- [ ] Displays user info when authenticated

#### 4G: Layout Components
File: `tests/app/layout/Toolbar.test.tsx`
- [ ] Renders toolbar with model title
- [ ] Toolbar buttons dispatch correct actions

### Phase 5: E2E Tests (Playwright)
End-to-end tests that run the full app in a real browser.

#### 5A: Playwright Setup
- [ ] Install: `npm init playwright@latest` — select Chromium only, `e2e/` dir
- [ ] Configure `playwright.config.ts`:
  ```
  baseURL: 'http://localhost:4208'
  webServer: { command: 'npm run start', port: 4208, reuseExistingServer: !process.env.CI }
  ```
- [ ] Add scripts to `package.json`:
  ```
  "test:e2e": "playwright test"
  "test:e2e:ui": "playwright test --ui"
  ```
- [ ] Create `e2e/fixtures/` for test helpers (auth token injection, model URL params)

#### 5B: Auth Flow
File: `e2e/auth.spec.ts`
- [ ] App loads without token → shows splash/login prompt
- [ ] App loads with `?barista_token=...` → authenticates and shows editor

#### 5C: Model Loading
File: `e2e/model-loading.spec.ts`
- [ ] Navigate to model URL → graph renders with activities
- [ ] Activity table shows correct number of activities
- [ ] Clicking activity in table highlights it on graph

#### 5D: Activity Form Flow
File: `e2e/activity-form.spec.ts`
- [ ] Open activity form dialog
- [ ] Fill in required fields (MF, enabled by)
- [ ] Add evidence with reference
- [ ] Submit form → API call made (intercept and verify)

#### 5E: Connector Creation Flow
File: `e2e/connector.spec.ts`
- [ ] Select two activities
- [ ] Open connector form
- [ ] Select regulation type → direction → directness
- [ ] Submit → edge appears between activities

#### 5F: Model Metadata
File: `e2e/model-metadata.spec.ts`
- [ ] Edit model title
- [ ] Change model state
- [ ] Add/remove comments

### Phase 6: CI & Coverage
- [ ] Add `npm run test` and `npm run test:e2e` to CI pipeline (when CI exists)
- [ ] Configure coverage thresholds (start with 40%, increase over time)
- [ ] Add `.gitignore` entries: `coverage/`, `playwright-report/`, `test-results/`

---

## Test File Naming Convention

```
tests/features/{feature}/services/{service}.test.ts    # pure service tests
tests/features/{feature}/slices/{slice}.test.ts        # Redux slice tests
tests/features/{feature}/components/{Component}.test.tsx  # component tests
e2e/{flow}.spec.ts                                              # E2E tests
```

## Testing Patterns

### Pure Service Tests
```ts
import { describe, it, expect } from 'vitest'
import { myFunction } from '@/features/foo/services/myService'
// Once @tests/* alias is added (Phase 1), use:
//   import { sampleData } from '@tests/fixtures/graph'

describe('myFunction', () => {
  it('does X when given Y', () => {
    expect(myFunction(sampleData)).toEqual(expected)
  })
})
```

### Redux Slice Tests
```ts
import { describe, it, expect } from 'vitest'
import myReducer, { myAction } from '@/features/foo/slices/mySlice'

describe('mySlice', () => {
  it('handles myAction', () => {
    const initial = myReducer(undefined, { type: '@@INIT' })
    const next = myReducer(initial, myAction(payload))
    expect(next.field).toBe(expected)
  })
})
```

### Component Tests
```ts
import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../../../test-utils' // or '@tests/test-utils' once aliased
import MyComponent from '@/features/foo/components/MyComponent'

describe('MyComponent', () => {
  it('renders correctly', () => {
    const { user } = renderWithProviders(<MyComponent />, {
      preloadedState: { /* slice state */ }
    })
    expect(screen.getByText('...')).toBeInTheDocument()
  })
})
```

### E2E Tests (Playwright)
```ts
import { test, expect } from '@playwright/test'

test('loads model', async ({ page }) => {
  await page.goto('/?id=gomodel:xxx&barista_token=test')
  await expect(page.getByTestId('activity-table')).toBeVisible()
})
```

---

## Priority Order
1. **Phase 1** — Infrastructure (fixtures, coverage, Playwright install) — do this first
2. **Phase 2** — Pure service tests — highest ROI, no mocking needed
3. **Phase 3** — Slice tests — validate state logic
4. **Phase 4** — Component tests — integration with store + DOM
5. **Phase 5** — E2E tests — full flow verification
6. **Phase 6** — CI integration

## Recovery Checkpoint

> **Last completed action:** Phase 1 hardened. Fixture sanity tests now verify rootNode populated, edges resolve source/target, evidence present, all documented relations survive transform, model metadata parses. camSlice tests cover overwrite + loading/error preservation + memoization. `renderWithProviders` smoke test verifies preloadedState injection, store wiring, user-event helpers, store isolation. **47 tests passing, tsc clean, `npm run build` green.**
> **Next immediate action:** Either (a) finish Phase 1 — coverage + Playwright + form/users fixtures, or (b) Phase 2 (graphServices unit tests using real-data fixtures).
>
> **Known data finding (documented in fixture test):** `largeVal` contains `GO:0140378` without a `label` in the raw Barista response — transform propagates `label: undefined` faithfully. UI must handle this case.

## Failed Approaches
| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
|                |               |      |

## Files Modified
| File | Action | Status |
| ---- | ------ | ------ |
| `.plans/testing/testing-workflow.md` | Created, then rewritten for `tests/` mirror layout | Done |
| `tests/setup.ts` | Created (moved from `src/setupTests.ts`) | Done |
| `tests/test-utils.tsx` | Created (moved from `src/utils/test-utils.tsx`, uses `@/` alias) | Done |
| `src/setupTests.ts` | Deleted | Done |
| `src/utils/test-utils.tsx` | Deleted | Done |
| `vite.config.ts` | `setupFiles` → `tests/setup.ts`, added `include: ['tests/**/*.test.{ts,tsx}']` | Done |
| `tsconfig.app.json` | `include` now `['src', 'tests']` | Done |
| `tests/features/gocam/slices/camSlice.test.ts` | Created — 17 tests covering reducers + 4 selectors; refactored to import from `@tests/fixtures/builders` | Done |
| `vite.config.ts` | Added `'@tests'` alias | Done |
| `tsconfig.app.json` | Added `'@tests/*'` paths entry | Done |
| `tests/fixtures/raw/swiss-1.json` | Copied from `downloads/models/` | Done |
| `tests/fixtures/raw/another-model.json` | Copied from `downloads/models/` | Done |
| `tests/fixtures/raw/large-val.json` | Copied from `downloads/models/` | Done |
| `tests/fixtures/models.ts` | Created — raw + transformed exports for all three samples | Done |
| `tests/fixtures/builders.ts` | Created — synthetic builders for controlled tests | Done |
| `tests/fixtures/models.test.ts` | Hardened — 21 tests covering rootNode/edges/evidence/relations/metadata across all three fixtures + specific anchors | Done |
| `tests/test-utils.test.tsx` | Created — 4 smoke tests proving Provider wiring, preloadedState injection, dispatch propagation, store isolation | Done |

## Blockers
- `graphServices.ts` calls `store.getState()` directly — needs discussion on whether to refactor for testability or mock the store
- E2E tests need a running dev server + potentially a test Barista token or mock server

## Notes
- `vitest` globals are enabled — no need to import `describe`, `it`, `expect`
- `renderWithProviders` from `test-utils.tsx` handles Redux Provider wrapping
- `mockReset: true` in vitest config — mocks are auto-reset between tests
- RTK Query API slices need `setupServer` from `msw` for proper mocking (or `fetchMock`)
- Consider adding `msw` (Mock Service Worker) for API mocking in both unit and E2E tests

## Additional Context
- The codebase has ~21 gocam components, 5 relation components, 1 search component, plus layout — total ~35 components
- The heaviest logic is in services: `activityOperations.ts` (815 lines, 12 exported functions), `graphServices.ts` (395 lines), `formValidation.ts` (101 lines)
- `activityFormSlice.ts` manages a recursive tree structure and is the most complex slice
- Decision tree service has clear input/output mapping — excellent for table-driven tests
- Playwright should only target Chromium initially to keep CI fast
