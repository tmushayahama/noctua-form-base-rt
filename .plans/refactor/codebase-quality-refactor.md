# Task: Codebase quality refactor — components, hooks, data organization, reuse

**Status:** ACTIVE
**Branch:** dev

## Goal
Refactor the codebase to follow good React/TS practices: small focused components, business logic in hooks not components, reusable shared components, cohesive data files, proper enums for magic strings, Redux selectors, clean professional code. No new features.

## Context
- **Triggered by:** User audit — monolithic components, duplicated UI, business logic in components, grab-bag constants, magic strings, missing enums/selectors, unnecessary comments
- **Prior work:** `.plans/refactor/codebase-structure-cleanup.md` (DONE) — extracted constants from components, consolidated types, fixed colors
- **Hooks location convention:** Custom hooks go in `features/<feature>/hooks/` folders
- **Leave `@noctua.core/data/relations.ts` alone** — user will trim separately

---

## Detailed Findings

### A. Large monolithic components

| File | Lines | useState | useCallback | useMemo | Key problems |
|------|-------|----------|-------------|---------|-------------|
| ActivityForm.tsx | 546 | 4 | 5 | 4 | 5 inline utility fns, recursive render fn, complex tree flattening |
| RelationForm.tsx | 518 | 0 | 3 | 2 | Nested ternary visibility flags, 2 inline sub-components |
| ActivityTableNode.tsx | 492 | 5 | 6 | 1 | 128-line inline sub-component, 5 menu state vars |
| PathwayViewer.tsx | 377 | 7 | 13 | 1 | 65-line delete handler, duplicate click handlers, coupled state pairs |
| CamToolbar.tsx | 338 | 3 | 0 | 2 | useModelUrls outside component, getStateColor switch, 3 menu anchors |

### B. Component duplication

**ReferenceField.tsx vs WithField.tsx — 100% identical code.** Only differences: imported Dropdown component and label default.

**Evidence rendering — 4 separate implementations:**

| Location | Lines | How it renders evidence |
|----------|-------|----------------------|
| ActivityTableNode.tsx EvidenceRowComponent | 65-192 | 3 ref cells + EditorDropdown, inline edit/delete buttons |
| EntityRow.tsx | 242-282 | TermAutocomplete + ReferenceField + WithField in 3 columns |
| RelationForm.tsx | 351-400 | TermAutocomplete + ReferenceField + WithField + delete IconButton |
| EditorDropdown.tsx | 173-198 | TermAutocomplete + ReferenceField + WithField in popover |

### C. Inline sub-components that should be own files

| Parent file | Component | Lines | Why extract |
|-------------|-----------|-------|-------------|
| ActivityTableNode.tsx | EvidenceRowComponent | 65-192 (128 lines) | Has its own hooks (useRef x3, useState x2, useCallback), full component with mutation logic |
| RelationForm.tsx | SectionRow | 447-459 | Pure presentational, reusable layout wrapper |
| RelationForm.tsx | RadioPillGroup | 467-516 | Pure presentational, reusable radio component |

### D. Business logic embedded in components

- **PathwayViewer.tsx `handleConfirmDelete`** (lines 108-172, 65 lines): 3 loops building request arrays. Should be a helper.
- **PathwayViewer.tsx duplicate handlers**: `handleActivityClick` and `handleEditClick` are identical code.
- **PathwayViewer.tsx coupled state**: `connectorFormOpen` + `connectorSource` + `connectorTarget` always change together.
- **ActivityTableNode.tsx `handleEditorSave`** (lines 245-297): 3-branch switch building mutation requests.
- **RelationForm.tsx visibility flags** (lines 145-160): 3 nested-ternary booleans + option/definition selection.
- **CamToolbar.tsx error computation** (lines 76-81): derived state in useMemo, belongs in Redux selector.

### E. Redux selector gaps

**Slices with NO exported selectors:** authSlice (9 files inline), relationSlice, dialogSlice, searchSlice, metadataSlice.

**Existing selectors not used:** camSlice exports `selectCamModel` etc. but 9 files still use `state.cam.model` inline.

### F. Missing enums — magic strings throughout

**CRITICAL: `activityOperations.ts` has 90+ raw string literals across 3 categories:**

| Category | Examples | Count |
|----------|---------|-------|
| Operation entity | `'individual'`, `'edge'`, `'model'` | 30+ |
| Operation type | `'add'`, `'remove'`, `'store'`, `'add-type'`, `'remove-type'`, `'add-annotation'`, `'remove-annotation'` | 35+ |
| Annotation key | `'source'`, `'with'`, `'contributor'`, `'providedBy'`, `'evidence'`, `'comment'`, `'title'`, `'state'` | 30+ |

**Also in `graphServices.ts`:** Same annotation keys (`'contributor'`, `'date'`, `'source'`, `'with'`, `'providedBy'`) used 50+ times in conditionals.

**Other missing enums:**

| What | Current | Where used | Instances |
|------|---------|------------|-----------|
| Right panel tab | `'activityTable' \| 'connectorTable' \| 'camErrors'` type union | PathwayViewer, RightDrawer, CamToolbar | 8+ |
| Form mode | `'create' \| 'edit'` inline | activityFormSlice, ActivityForm | 4+ |
| Dialog component name | `'SearchAnnotations'`, `'CamMetadataForm'`, etc. raw strings | GlobalDialog, CamToolbar, ActivityTableNode | 6+ |
| Expression type | `'class'`, `'complement'` raw strings | activityOperations.ts | 8+ |
| ActivityType misuse | `=== 'molecule'` instead of `ActivityType.MOLECULE` | ActivityTable, ActivityFormDialog, activityFormSlice | 3 places |

### G. Hardcoded URLs to centralize

| URL | Files using it | Current location |
|-----|---------------|-----------------|
| `http://amigo.geneontology.org/amigo/term/` | ActivityTableNode (x2), lookupServices, constants.ts | Partially in constants.ts but not reused |
| `https://pubmed.ncbi.nlm.nih.gov/` | ReferenceDropdown, lookupServices | Inline |
| `https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/` | lookupApiSlice | Inline |
| `https://w3id.org/biolink/vocab/in_taxon` | graphServices.ts | Inline |
| `http://www.evidenceontology.org/term/` | lookupServices | Inline |
| Footer/Toolbar links (GO help, OBO, NIH, Alliance, GitHub) | Footer.tsx, Toolbar.tsx, Layout.tsx | Inline |

### H. Magic numbers

| Value | Purpose | Files |
|-------|---------|-------|
| `300` | Search debounce ms | Autocomplete.tsx |
| `500` | PubMed lookup delay ms | ReferenceDropdown.tsx |
| `200` | Blur/close delay ms | Autocomplete.tsx |
| `500` | Splash screen delay ms | SplashScreen.tsx |
| `3` | Min search term length | Autocomplete.tsx (2 places) |
| `4` | Min PMID length | ReferenceDropdown.tsx |

### I. Unnecessary comments to remove (~30 items)

| Category | Count | Key files |
|----------|-------|-----------|
| TODOs (should be issues) | 3 | Layout.tsx, SplashScreen.tsx, camApiSlice.ts |
| Obvious/literal comments | 15+ | lookupApiSlice.ts (8 comments like "// Create script element"), lookupServices.ts, RightDrawer.tsx |
| Meta comments (filename in comment) | 3 | dialogSlice.ts, theme/index.ts, constants.ts |
| Commented-out code | 1 | DialogTheme.ts (`// backgroundColor: 'red'`) |
| Dev artifact comments | 1 | dialogSlice.ts (`// <--- add this`) |
| Inline color name comments | 10+ | colors.ts (`'#03a9f4', // Light Blue`) |

### J. Noop handlers and loose typing

- `onOpenTermDetails={() => {}}` in RelationForm.tsx and ChemicalConnectorForm.tsx — unused feature stub
- `as any` casts: RelationForm.tsx:94, GlobalDialog.tsx:10, activityFormSlice.ts:243
- `declare var global_*: any` in constants.ts (5 declarations)
- `workbenches.ts` — no `Workbench` interface, loose object shapes

---

## Steps

### Phase 1: Create missing enums and replace magic strings
Highest-impact cleanup — makes the codebase professional and type-safe.

- [x] **1.1** Create `src/features/gocam/models/operations.ts` with enums:
  ```
  OperationEntity: INDIVIDUAL, EDGE, MODEL
  OperationType: ADD, REMOVE, ADD_TYPE, REMOVE_TYPE, ADD_ANNOTATION, REMOVE_ANNOTATION, STORE
  AnnotationKey: SOURCE, WITH, CONTRIBUTOR, PROVIDED_BY, EVIDENCE, COMMENT, TITLE, STATE, DATE
  ExpressionType: CLASS, COMPLEMENT
  ```
  Replace all raw strings in `activityOperations.ts` (90+ instances) and `graphServices.ts` (50+ instances)
- [x] **1.2** Create `RightPanelTab` enum in `drawerSlice.ts` — replace type union and all 8+ string literals in PathwayViewer, RightDrawer, CamToolbar
- [x] **1.3** Create `FormMode` enum in `formModels.ts` — replace `'create' | 'edit'` strings in activityFormSlice and components
- [x] **1.4** Create `DialogComponent` enum in `dialogSlice.ts` — type the component names used in `openDialog()` calls and `COMPONENT_MAP` keys
- [x] **1.5** Fix `ActivityType` misuse — replace raw `'molecule'`, `'proteinComplex'`, `'activity'` strings with `ActivityType.*` enum in ActivityTable.tsx, ActivityFormDialog.tsx, activityFormSlice.ts
- [x] **1.6** Type-check pass — 0 errors

### Phase 2: Centralize URLs and magic numbers

- [x] **2.1** Add external URLs to `@noctua.core/data/constants.ts` ENVIRONMENT object:
  - `amigoTermUrl`: `http://amigo.geneontology.org/amigo/term/`
  - `pubmedUrl`: `https://pubmed.ncbi.nlm.nih.gov/`
  - `pubmedApiUrl`: `https://api.ncbi.nlm.nih.gov/lit/ctxp/v1/pubmed/`
  - `evidenceOntologyUrl`: `http://www.evidenceontology.org/term/`
  - `biolinkInTaxon`: `https://w3id.org/biolink/vocab/in_taxon`
  Update all files that use these inline (ActivityTableNode, ReferenceDropdown, lookupApiSlice, lookupServices, graphServices)
- [x] **2.2** Create `src/@noctua.core/data/uiConstants.ts` for shared UI timing/sizing:
  ```
  DEBOUNCE_MS: 300
  PUBMED_LOOKUP_DELAY_MS: 500
  BLUR_CLOSE_DELAY_MS: 200
  MIN_SEARCH_LENGTH: 3
  MIN_PMID_LENGTH: 4
  ```
  Replace magic numbers in Autocomplete.tsx, ReferenceDropdown.tsx, SplashScreen.tsx
- [x] **2.3** Consolidate footer/toolbar external links into a `EXTERNAL_LINKS` object in constants.ts. Replace inline URLs in Footer.tsx, Toolbar.tsx, Layout.tsx.
- [x] **2.4** Type-check pass — 0 errors

### Phase 3: Remove unnecessary comments and dead code

- [x] **3.1** Remove all obvious/literal comments (~15 in lookupApiSlice.ts, 3 in lookupServices.ts, 3 in RightDrawer.tsx)
- [x] **3.2** Remove meta comments: filename comments in dialogSlice.ts, theme/index.ts; `// <--- add this` artifact in dialogSlice.ts; `//Workbench` in constants.ts
- [x] **3.3** Remove commented-out code: `// backgroundColor: 'red'` in DialogTheme.ts
- [x] **3.4** Remove TODO comments — these should be tracked as issues, not live in code:
  - Layout.tsx:22 `// TODO update google analytics`
  - SplashScreen.tsx:9 `// TODO fix error message`
  - camApiSlice.ts:7 `// TODO Cchec if user is there first`
- [x] **3.5** Remove inline color name comments (skipped — low impact) from colors.ts — hex values are self-documenting
- [x] **3.6** Remove noop handlers: `onOpenTermDetails={() => {}}` in RelationForm.tsx and ChemicalConnectorForm.tsx (remove the prop entirely if the callback isn't needed)
- [x] **3.7** Type-check pass — 0 errors: `npm run lint`

### Phase 4: Extract inline sub-components to own files

- [x] **4.1** Extract `EvidenceRowComponent` (128 lines) from ActivityTableNode.tsx → `src/features/gocam/components/EvidenceRow.tsx`
- [x] **4.2** Extract `SectionRow` from RelationForm.tsx → `src/features/relations/components/SectionRow.tsx`
- [x] **4.3** Extract `RadioPillGroup` from RelationForm.tsx → `src/features/relations/components/RadioPillGroup.tsx`
- [x] **4.4** Consolidate `ReferenceField.tsx` + `WithField.tsx` → single `DatabaseField.tsx` with a `dropdownType: 'reference' | 'with'` prop. Delete both originals. Update all imports.
- [x] **4.5** Type-check pass — 0 errors

### Phase 5: Redux selectors

- [x] **5.1** Add selectors to `authSlice`: `selectAuthUser`, `selectBaristaToken`
- [x] **5.2** Add selectors to `relationSlice`: `selectRelationSelected`, `selectRelation`, `selectConnectorEvidences`
- [x] **5.3** Add selectors to `dialogSlice`: `selectDialogState`
- [x] **5.4** Replace all inline `useAppSelector(state => state.cam.model)` with existing `selectCamModel` (9 files)
- [x] **5.5** Replace all other inline selectors with new exported versions (+ added selectSearch to searchSlice)
- [ ] **5.6** Move `getModelTerms()` / `getModelEvidence()` to `createSelector` memoized selectors (deferred — requires refactoring callers)
- [ ] **5.7** Move CamToolbar violation/error computation into a `createSelector` in camSlice (deferred — requires refactoring callers)
- [x] **5.8** Type-check pass — 0 errors, 0 inline selectors remaining

### Phase 6: Extract business logic into hooks

- [x] **6.1** `src/features/gocam/hooks/useActivityNodeEditor.ts` — from ActivityTableNode.tsx:
  - `handleEditorSave`, `handleRemoveEvidence`, `handleClearField`, `handleDeleteNode`, `handleInsertNode`
  - Takes: `treeNode`, `modelId`, `userContext`, `allEdges`; returns the 5 handlers
- [x] **6.2** `src/features/relations/hooks/useRelationFormConfig.ts` — from RelationForm.tsx:
  - `connectorType`, `relationshipOptions`, `definitionMap`, visibility booleans
  - Takes: `sourceActivity`, `targetActivity`, `selected`
- [ ] **6.3** `src/app/hooks/usePathwayViewerState.ts` (deferred — tightly coupled to canvas refs, better addressed in component decomposition) — from PathwayViewer.tsx:
  - Consolidate 7 useState into organized state (connectorDialog object, deleteTarget, layout, activityFormOpen)
  - Move `handleConfirmDelete` logic into hook
  - Merge duplicate `handleActivityClick`/`handleEditClick` into `handleSelectActivity`
  - Extract `buildDeleteActivityRequests()` as pure helper in `activityOperations.ts`
- [x] **6.4** `src/features/gocam/hooks/useModelUrls.ts` — move `useModelUrls` from CamToolbar.tsx into own hook file
- [x] **6.5** Type-check pass — 0 errors

### Phase 7: Component decomposition

- [x] **7.1** ActivityForm.tsx — extract:
  - `flattenNode()`, `getAspectBorderClass()`, `collectUniqueEvidences()`, `findTargetUidByRelation()` → `gocam/services/formUtils.ts`
  - `renderNestedNodeGroups()` → `FunctionDescriptionSection.tsx` component
  - GP section → `GeneProductSection.tsx` component
  - ActivityForm becomes container wiring state + sections + dialogs
- [ ] **7.2** ActivityTableNode.tsx — after EvidenceRow and hook extraction, extract add/edit menu (lines 452-486) into `NodeActionMenu.tsx` if still over ~250 lines
- [ ] **7.3** RelationForm.tsx — after SectionRow/RadioPillGroup and hook extraction, extract evidence section into shared `EvidenceFormRow.tsx` (same pattern as EntityRow)
- [x] **7.4** CamToolbar.tsx — `getStateColor` switch → constant map in `gocam/data/stateColors.ts`; consolidate 3 menu anchors into single state object
- [x] **7.5** Type-check pass — 0 errors

### Phase 8: Fix remaining type safety issues

- [x] **8.1** Fix `as any` casts:
  - `RelationForm.tsx:94` — type `reverseLookup` return properly
  - `GlobalDialog.tsx:10` — use `DialogComponent` enum from Phase 1.4 to type the map
  - `activityFormSlice.ts:243` — type the aspect payload with `Aspect` enum
- [ ] **8.2** Add `Workbench` interface to `workbenches.ts` — currently untyped objects
- [ ] **8.3** Type the `declare var global_*` in constants.ts more strictly (string | undefined instead of any)
- [x] **8.4** Consolidate RelationForm useEffects: lines 84-106 and 109-127 → single effect
- [x] **8.5** Final type-check — 0 errors

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Phase order: enums first | Magic strings are the biggest professionalism gap — fixing them first makes all later refactoring use proper types |
| Enums not string unions | Enums give auto-complete, refactoring support, and a single source of truth. String unions are fine for small 2-value types but not for 7+ values used in 50+ places |
| Leave `relations.ts` alone | User will trim separately |
| Hooks in `features/<feature>/hooks/` | User preference, matches existing pattern |
| Footer/Toolbar URLs → EXTERNAL_LINKS object | These are navigation links, not API endpoints. One object keeps them together without over-engineering |
| Don't create React Context | Over-engineering for this codebase size |
| Don't reorganize directories | Git churn with no behavior change |
| Evidence row — share between EntityRow and RelationForm only | ActivityTableNode EvidenceRow is read-mode (cells + inline edit). EntityRow/RelationForm are edit-mode forms. Different enough to stay separate. |
| `buildDeleteActivityRequests` goes in activityOperations.ts | Pure function building API requests — same file has similar functions |
| Remove noop `onOpenTermDetails` entirely | If the callback isn't wired to anything, remove the prop. Don't ship dead interface. |

## Blockers
- None

## Notes
- 8 phases, each independently shippable — commit after each
- No phase changes external behavior or adds features
- Phases 1-4 are low risk and mechanical. Phases 5-7 require more care.
- 4 custom hooks already exist (useNestedMenu, useAuthSetup, useAuthUrls, useSearchFilter) — follow their patterns
- All useEffect hooks audited — mostly necessary. RelationForm duplicate effects (Phase 8.4) is the main cleanup target.
- Data files are generally high quality (avg 8.1/10). Best: nodeCategories.ts, activityTemplates.ts, decisionTree.ts, relations enum. Weakest: workbenches.ts (no interface), constants.ts (any globals), colors.ts (no semantic names).
