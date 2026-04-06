# Task: Make this codebase professional, idiomatic React

**Status:** COMPLETE
**Branch:** dev

## Goal
Refactor the codebase so it reads like it was built by someone who knows React well. Clean component boundaries, proper state ownership, no redundancy, no leaky abstractions. No new features, no behavior changes.

---

## What Was Done

### Phase 1: Quick wins

- [x] Merge duplicate `handleActivityClick`/`handleEditClick` → single `handleSelectActivity` in PathwayViewer
- [x] Extract `useUserContext()` hook → `src/app/hooks/useUserContext.ts`. Replaced in ActivityForm, RelationForm, ChemicalConnectorForm, ActivityTable. Deleted unused `useNestedMenu` hook.
- [x] Create `usePopover()` hook → `src/@noctua.core/hooks/usePopover.ts`. Applied to: Toolbar (2), CamToolbar (3), ActivityTable (1), EntityRow (3), EditorDropdown (1), ActivityTableNode (3 — with typed metadata for editor state). Eliminated 15 `useState<HTMLElement|null>` declarations.
- [x] Type `updateGraphModel` mutation input — `any` → `Operation[]` in camApiSlice.ts

### Phase 2: Selections as derived state

- [x] camSlice stores `selectedActivityId: string | null` and `selectedConnectionKey: { sourceActivityUid, targetActivityUid } | null`
- [x] Memoized selectors via `createSelector`: `selectSelectedActivity`, `selectSelectedConnection` derive full objects from model + ID
- [x] Deleted the 20-line sync block from `setModel` — now a single line assignment
- [x] `getModelTerms` → `makeSelectModelTerms()` factory. `getModelEvidence` → `selectModelEvidence`. Updated EntityRow + EditorDropdown.
- [x] Updated: PathwayViewer, RightDrawer, ConnectorTable, EntityRow, EditorDropdown

### Phase 3: Fix GlobalDialog circular dependency

- [x] GlobalDialog now accepts `componentMap` prop — simple prop injection
- [x] `DIALOG_COMPONENTS` map defined in `App.tsx` (app shell) and passed to `<GlobalDialog>`
- [x] Removed all 4 feature imports from `@noctua.core/components/dialog/GlobalDialog.tsx` — core no longer depends on features

### Phase 4: RTK Query and auth cleanup

- [x] `getGraphModel` arg changed from `string` to `{ modelId, baristaToken }` — token is now part of the cache key. RTK Query will refetch on token change.
- [x] Granular cache tags: `getGraphModel` provides `[{ type: 'graph', id: modelId }]`, `copyGraphModel` invalidates `[{ type: 'graph', id: modelId }]`. `updateGraphModel` stays broad (`['graph']`) since operations can span models.
- [x] localStorage removed from authSlice reducers (pure reducers now). localStorage writes colocated with dispatches in `useAuthSetup.ts` — the only caller.

### Phase 5: Component decomposition

- [x] PathwayViewer decomposed:
  - `usePathwayCanvas()` — canvas ref, layout, spacing, 6 zoom/layout callbacks → `src/app/hooks/usePathwayCanvas.ts`
  - `useDeleteConfirmation()` — delete target state, confirm/cancel, API call → `src/app/hooks/useDeleteConfirmation.ts` (uses `buildDeleteActivityOperations` instead of inline request building)
  - Connector state consolidated into single `ConnectorDialog` object `{ open, source, target }`
  - PathwayViewer: 337 → ~185 lines, 13 useCallbacks → 5
- [x] CamToolbar decomposed:
  - `ContributorChips` — owns overflow menu, reusable → `src/features/gocam/components/ContributorChips.tsx`
  - `ToolbarLinkMenu` — reusable dropdown for link lists (View In, Export As) → `src/features/gocam/components/ToolbarLinkMenu.tsx`
  - CamToolbar: 310 → ~185 lines, 3 usePopover → 0 (moved to sub-components)
- [x] `renderNestedNodeGroups` → `<NestedNodeGroups>` component that computes its own rows via `useMemo` from `root.relations`. ActivityForm: 505 → ~455 lines.

---

## Files Created

| File | Purpose |
|------|---------|
| `src/app/hooks/useUserContext.ts` | Shared hook replacing 4 duplicate userContext computations |
| `src/app/hooks/usePathwayCanvas.ts` | Canvas ref, layout, spacing, zoom — extracted from PathwayViewer |
| `src/app/hooks/useDeleteConfirmation.ts` | Delete target state + confirm/cancel — extracted from PathwayViewer |
| `src/@noctua.core/hooks/usePopover.ts` | Generic popover state hook with typed metadata support |
| `src/features/gocam/components/ContributorChips.tsx` | Contributor chip list with overflow menu |
| `src/features/gocam/components/ToolbarLinkMenu.tsx` | Reusable dropdown for link lists |
| `src/features/gocam/components/forms/NestedNodeGroups.tsx` | Nested FD rows — extracted from ActivityForm |

## Files Deleted

| File | Reason |
|------|--------|
| `src/features/gocam/hooks/useNestedMenu.ts` | Unused — replaced by usePopover |

## Known Remaining Issues

- **EntityRow** is still ~390 lines. A form-scoped context (providing modelId, callbacks) would reduce it but isn't worth the risk/churn right now.
- **Full model re-parse on every mutation** — `transformGraphData` rebuilds the entire graph after every edit. Works at current scale, watch for larger models.
- **Validation runs as useEffect+dispatch on every keystroke** — works, but could benefit from debouncing.

## Summary

| Metric | Before | After |
|--------|--------|-------|
| PathwayViewer lines | 337 | ~185 |
| PathwayViewer useCallbacks | 13 | 5 |
| CamToolbar lines | 310 | ~185 |
| `useState<HTMLElement\|null>` declarations | 15+ | 0 (all via usePopover) |
| Duplicate userContext computations | 4 | 0 (shared hook) |
| camSlice setModel sync logic | 20 lines | 1 line |
| Core → features imports | 4 | 0 |
| updateGraphModel type | `any` | `Operation[]` |
| RTK Query cache granularity | global `'graph'` | per-modelId |
| localStorage in reducers | 2 actions | 0 (pure reducers) |
