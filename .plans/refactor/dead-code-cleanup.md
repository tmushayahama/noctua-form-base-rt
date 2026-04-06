# Task: Remove dead code identified by full-codebase scan

**Status:** COMPLETE
**Branch:** dev

## Goal
Remove all verified dead code — unused files, exports, types, actions, imports, and object properties — to reduce noise and bundle size.

## Context
- **Triggered by:** Full dead-code scan on 2026-04-06 using dead-code-finder agent
- **Confidence:** All findings below are HIGH unless marked otherwise
- **Related files:** See per-phase file lists below

## Current State
- What works now: Codebase builds and runs; dead code has no consumers
- What's broken/missing: ~571+ lines of dead code across 14 deletable files and 30+ dead exports in live files

## Steps

### Phase 1: Delete entirely dead files (14 files)

**`src/@noctua.core/` (10 files)**
- [ ] Delete `src/@noctua.core/utils/api.ts`
- [ ] Delete `src/@noctua.core/utils/dataUtil.ts`
- [ ] Delete `src/@noctua.core/models/apiResponse.ts`
- [ ] Delete `src/@noctua.core/components/dialog/dialog.ts`
- [ ] Delete `src/@noctua.core/components/IconButton.tsx`
- [ ] Delete `src/@noctua.core/colors/colors.ts`
- [ ] Delete `src/@noctua.core/colors/skyBlue.ts`
- [ ] Delete `src/@noctua.core/colors/pangoDark.ts`
- [ ] Delete `src/@noctua.core/colors/index.ts`
- [ ] Delete `src/@noctua.core/data/workbenches.ts` — also remove its import from `constants.ts`

**`src/features/search/` (3 files)**
- [ ] Delete `src/features/search/search.ts`
- [ ] Delete `src/features/search/searchSlice.ts` — also remove its registration from `store.ts`
- [ ] Delete `src/features/search/useSearch.ts`

**`src/app/` (1 file)**
- [ ] Delete `src/app/layout/NavButton.tsx`

- [ ] Run `npm run build` to verify no breakage

### Phase 2: Remove dead exports from `src/@noctua.core/`

**`services/linksService.ts` — remove 6 of 7 functions (keep only `getBaristaApiUrl`)**
- [ ] Remove `getLoginUrl`, `getLogoutUrl`, `getNoctuaUrl`, `getHomeUrl`, `getGeneAccession`, `getUniprotLink`

**`components/drawer/drawerSlice.ts` — remove 4 dead actions/selectors**
- [ ] Remove `setLeftDrawerOpen`, `toggleLeftDrawer`, `toggleRightDrawer`, `selectLeftDrawerOpen`

**`components/toast/toastSlice.ts` — remove 2 dead type exports**
- [ ] Remove export on `ToastSeverity`, `ToastState` (keep as local types if used internally)

**`components/dialog/dialogSlice.ts` — remove 1 dead type export**
- [ ] Remove export on `DialogState` (keep as local type)

**`theme/theme.ts` — remove 1 dead export**
- [ ] Remove export on `noctuaColors` (keep as local const)

**`data/constants.ts` — remove 11 dead ENVIRONMENT properties**
- [ ] Remove: `baristaDevUrl`, `baristaUrl`, `globalWorkbenchesModel`, `globalWorkbenchesUniversal`, `globalWorkbenchesModelBetaTest`, `globalWorkbenchesUniversalBetaTest`, `globalKnownRelations`, `searchApi`, `noctuaLandingPageUrl`, `announcementUrl`, `pubMedSummaryApi`

- [ ] Run `npm run build` to verify no breakage

### Phase 3: Remove dead exports from `src/features/`

**`gocam/slices/camSlice.ts` — remove 5 dead actions**
- [ ] Remove `addActivity`, `addEdge`, `updateActivity`, `setLoading`, `setError`

**`gocam/slices/activityFormSlice.ts` — remove 2 dead selectors**
- [ ] Remove `selectFormIsValid`, `selectFormIsDirty`

**`relations/slices/relationSlice.ts` — remove 2 dead actions**
- [ ] Remove `updateRelationFromId`, `resetConnectorEvidences`

**`gocam/models/cam.ts` — remove 1 dead enum**
- [ ] Remove `NodeType` enum

**`relations/models/decisionTree.ts` — remove 3 dead types**
- [ ] Remove `Schema`, `Definitions`, `RelationshipDefinition`

**`gocam/data/nodeCategories.ts` — remove 2 dead functions + 2 dead types**
- [ ] Remove `getRelationEntries`, `getExtensionRelations`, `RelationConstraint`, `RelationEntry`

**`gocam/data/shapeTerms.ts` — remove 1 dead type**
- [ ] Remove export on `ShapeTermEntry` (keep as local type if used internally)

**`gocam/services/graphServices.ts` — remove 1 dead function**
- [ ] Remove `getAspect`

**`auth/authServices.ts` — remove 1 dead function**
- [ ] Remove `createContributorFromResponse`

**`search/services/lookupServices.ts` — remove export on 2 functions**
- [ ] Remove export keyword from `getGroupsFromNames` and `makeEntitiesArray` (keep as local functions)

**`gocam/services/formValidation.ts` — remove export on 1 function (MEDIUM)**
- [ ] Remove export keyword from `isValidReference` (keep as local function)

- [ ] Run `npm run build` to verify no breakage

### Phase 4: Remove dead exports from `src/app/` and `src/`

**`app/store/apiService.ts` — remove 3 dead exports + 2 transitively dead imports**
- [ ] Remove `ApiVersion` enum, `useApiVersion` hook, `createGraphQLRequest`
- [ ] Remove `useSearchParams` and `useCallback` imports

**`app/store/store.ts` — remove 1 dead type + 2 transitively dead imports**
- [ ] Remove `AppThunk` type
- [ ] Remove `Action` and `ThunkAction` from imports

**`src/analytics.ts` — remove 3 dead functions**
- [ ] Remove `trackEvent`, `handleExternalLinkClick`, `handleGOTermLinkClick`

- [ ] Run `npm run build` to verify no breakage

### Phase 5: Fix code smells

- [ ] `features/relations/services/decisionTree.ts:3` — fix duplicate `ConnectorType` import
- [ ] `features/gocam/services/activityOperations.ts:12` — remove dead re-export of `Operation`
- [ ] `features/auth/hooks/useAuthUrls.ts:28` — remove `homeUrl` from return value
- [ ] Remove unnecessary `export` on `addTagTypes` in 4 API slices (authApiSlice, metadataApiSlice, lookupApiSlice, camApiSlice)
- [ ] Remove unnecessary `export` on `EvidenceRowProps`, `EditorDropdownProps`, `PillOption` (local-only types)
- [ ] `users/slices/metadataApiSlice.ts` — remove dead `useGetUserInfoQuery` (duplicate of authApiSlice version)

- [ ] Run `npm run build` to verify no breakage
- [ ] Run `npm run lint` for final check

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** Plan created
- **Next immediate action:** Phase 1 — delete 14 dead files
- **Uncommitted changes:** none
- **Environment state:** clean working tree on `dev` branch

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
|                |               |      |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
|      |        |        |

## Blockers
- None currently

## Notes
- `renderWithProviders` in `test-utils.tsx` is intentionally kept — it's test infrastructure for future tests
- `isValidReference`, `makeEntitiesArray`, `getGroupsFromNames` are used internally — only the `export` keyword is dead, not the functions themselves
- `searchSlice.ts` imports non-existent modules (`genes/models/gene`, `terms/models/term`) — it was never wired up
- After each phase, run `npm run build` before proceeding to catch any missed references
