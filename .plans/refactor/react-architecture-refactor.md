# Task: Make this codebase professional, idiomatic React

**Status:** ACTIVE
**Branch:** dev

## Goal
Refactor the codebase so it reads like it was built by someone who knows React well. Clean component boundaries, proper state ownership, no redundancy, no leaky abstractions. No new features, no behavior changes.

---

## What I Found

After reading every major file, here are the real problems — grouped by what hurts the most.

---

### 1. Components are doing too much

These are the worst offenders:

| Component | Lines | Problem |
|-----------|-------|---------|
| ActivityForm.tsx | 512 | Flattens tree, renders GP/FD sections, manages 4 dialogs, handles save/cancel, runs validation in useEffect, has a free-floating `renderNestedNodeGroups` function outside the component that takes 4 params |
| PathwayViewer.tsx | 362 | 7 useState, 13 useCallback. Loads data, manages canvas, handles 3 dialogs, builds delete API requests inline (30 lines), has two identical handlers (`handleActivityClick` === `handleEditClick`) |
| EntityRow.tsx | 394 | Renders term field + evidence rows + 3 menus. 10 handler functions that each do `dispatch(...)` then `closeAllMenus()`. The `closeAllMenus` pattern (line 108) is a sign of too many menus in one component |
| ActivityTableNode.tsx | 322 | 5 useState for menu anchors, renders term cell + evidence + action cell + editor dropdown + 2 menus + recursive children |
| RelationForm.tsx | 413 | Decision tree UI + evidence section + save/delete + chemical intermediate. Has an eslint-disable for exhaustive-deps (line 127) |
| CamToolbar.tsx | 310 | Title + errors + comments + clone + state + date + contributors + 2 dropdown menus. This is a toolbar rendering a full dashboard |
| EditorDropdown.tsx | 249 | Reinitializes all fields in a useEffect when `open` changes (line 109). Five useState for form fields inside a Popover |

**What "too much" actually means:** When a component has 5+ useState hooks, 5+ callbacks, and renders 3+ distinct sections with their own state — it should be multiple components.

---

### 2. Redux is managing form-local state

`activityFormSlice.ts` (394 lines, 18 actions) manages the state of a single modal form. Yet every keystroke dispatches to the global store and triggers tree traversal:

```
User types in autocomplete
  → dispatch(updateTerm({ uid, term }))
    → findTermNode() walks the entire tree to find the node
      → mutates it
        → triggers re-render of everything subscribed to activityForm
```

This should be `useReducer` + Context scoped to the dialog. The reducer logic stays the same, but:
- State is created when dialog opens, destroyed when it closes
- No stale form state lingering in the store
- Tree traversal only runs within the form scope

**Important caveat:** `selectFormErrors` and `selectFormIsValid` are currently exported and could be read outside the dialog. The Context boundary must account for this — either move those consumers inside the dialog, or expose errors/validity via a callback prop on the dialog (e.g. `onValidityChange`). This needs careful auditing before implementing.

---

### 3. Selections are synced, not derived

`camSlice.ts` stores full copies of `selectedActivity` and `selectedConnection`. Every time the model updates, `setModel` runs 20 lines of sync logic to find the fresh versions:

```typescript
// camSlice.ts lines 35-67
if (state.selectedActivity) {
  const freshActivity = action.payload.activities.find(...)
  state.selectedActivity = freshActivity ?? null
}
if (state.selectedConnection) {
  // 15 more lines finding fresh source, target, and edge
}
```

**Fix:** Store IDs only (`selectedActivityId`, `selectedConnectionId`). Create memoized selectors that look up the object from the model. The sync logic disappears entirely. This is the most fragile code in the codebase.

---

### 4. Side effects in reducers

`authSlice.ts` writes to localStorage inside the reducer (both `setBaristaToken` and `logout`):

```typescript
setBaristaToken: (state, action) => {
  state.baristaToken = action.payload
  if (action.payload) {
    localStorage.setItem('barista_token', action.payload)  // side effect
  } else {
    localStorage.removeItem('barista_token')               // side effect
  }
}
```

Reducers must be pure. Move this to an RTK listener middleware.

---

### 5. Core depends on features (circular)

`@noctua.core/components/dialog/GlobalDialog.tsx` imports 4 components from features:

```typescript
import SearchAnnotations from '@/features/gocam/components/forms/SearchAnnotations'
import CamMetadataForm from '@/features/gocam/components/CamMetadataForm'
import CopyModelDialog from '@/features/gocam/components/CopyModelDialog'
import ChemicalConnectorForm from '@/features/relations/components/ChemicalConnectorForm'
```

Core is supposed to be the foundation. Features import from core, not the other way around.

**Fix:** Pass the component map as a prop or use a registry. The app shell (Layout) provides the map, GlobalDialog just renders whatever it's given.

---

### 6. Menu anchor state explosion

The pattern `useState<HTMLElement | null>(null)` for popover anchors appears **15+ times** across components. In most components, only one menu can be open at a time, yet each gets its own state var:

```typescript
// ActivityTableNode.tsx — 5 menu states
const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null)
const [editorAnchor, setEditorAnchor] = useState<HTMLElement | null>(null)
const [editorCategory, setEditorCategory] = useState<EditorCategory>(...)
const [pendingInsert, setPendingInsert] = useState<InsertMenuItem | null>(null)
```

**Fix:** One hook, one state. `usePopover()` returns `{ open, anchor, data, show, hide }`. Only one popover open at a time. `useNestedMenu` already exists but only covers one case.

---

### 7. Prop drilling through the form tree

`modelId`, `userContext`, callbacks like `onSearchAnnotations`, `onCloneEvidence` — all drilled from ActivityForm through EntityRow into sub-components. Every intermediate component must declare and forward these.

`userContext` is also computed identically in two places (ActivityForm:95 and RelationForm:76):

```typescript
const userContext = useMemo(() => {
  if (!authUser?.uri || !authUser?.group?.id) return undefined
  return { orcid: authUser.uri, groupUrl: authUser.group.id }
}, [authUser])
```

**Fix:**
- `userContext` → custom hook (`useUserContext()`) used wherever needed
- Form-scoped values (`modelId`, callbacks) → Context from Phase 5

---

### 8. Duplicate and dead code

- `handleActivityClick` and `handleEditClick` in PathwayViewer (lines 82-104) are **identical** — same body, same dependencies
- `renderNestedNodeGroups` (ActivityForm:462-510) is a 48-line free function that duplicates the EntityRow rendering pattern from the FD section above it
- `closeAllMenus()` pattern repeated in EntityRow (10 handlers each calling it)
- `getModelTerms` and `getModelEvidence` in camSlice are called from components via `useMemo` — they scan all activities/edges on every call. Should be memoized selectors.

---

### 9. RTK Query issues

**Cache tags are too broad:**
```typescript
providesTags: ['graph']           // every model shares one tag
invalidatesTags: ['graph']        // copying model A invalidates model B's cache
```

Should be `[{ type: 'graph', id: modelId }]`.

**Token dependency is invisible to RTK Query:**
The token is read from Redux state inside `queryFn`. RTK Query doesn't know the query depends on it — if the token changes, the cache isn't invalidated. Note: the Barista API expects the token as a URL query param, not a header, so `prepareHeaders` alone won't solve this. The fix is to include the token in the query cache key (pass it as part of the endpoint arg) or manually invalidate on token change.

**`updateGraphModel` accepts `any`:**
```typescript
updateGraphModel: builder.mutation<GraphModelApiResponse | null, any>({
```

No type safety on the most critical mutation in the app. The `Operation` type already exists — use it.

---

### 10. Validation runs as a side effect

ActivityForm runs validation in a `useEffect` that dispatches to Redux:

```typescript
useEffect(() => {
  if (!formState.root) return
  const validationErrors = validateActivityForm(formState)
  dispatch(setErrors(validationErrors))
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [formState.root, formState.mode, formState.isDirty, dispatch])
```

The eslint-disable is a red flag. Since errors are stored in Redux and consumed elsewhere, the useEffect+dispatch pattern isn't wrong per se — but it runs on every keystroke with no debounce. Once form state moves to local context (Phase 5), validation becomes a `useMemo` on local state naturally. Until then, debouncing the effect is the pragmatic fix.

---

### 11. Full model re-parse on every mutation (known cost)

After any mutation (even changing one term), `camApiSlice` refetches the model and `graphServices.transformGraphData` rebuilds the entire graph from scratch. This works for current model sizes but scales linearly. Worth noting as a known cost for when models get larger — not a refactoring target now, but something to watch.

---

## Refactoring Plan

**Execution order: safe/mechanical first, highest-blast-radius last.**

### Phase 1: Quick wins (low risk, high visibility) ✅ DONE

- [x] **1.1** Merge duplicate `handleActivityClick`/`handleEditClick` → single `handleSelectActivity` in PathwayViewer
- [x] **1.2** Extract `useUserContext()` hook → `src/app/hooks/useUserContext.ts`. Replaced in ActivityForm, RelationForm, ChemicalConnectorForm, ActivityTable. Deleted unused `useNestedMenu` hook.
- [x] **1.3** Create `usePopover()` hook → `src/@noctua.core/hooks/usePopover.ts`. Applied to: Toolbar (2), CamToolbar (3), ActivityTable (1), EntityRow (3), EditorDropdown (1), ActivityTableNode (3 — with typed metadata for editor state). Eliminated 15 `useState<HTMLElement|null>` declarations.
- [x] **1.4** Type `updateGraphModel` mutation input — `any` → `Operation[]` in camApiSlice.ts
- [x] **1.5** Type-check + lint pass — 0 errors

### Phase 2: Selections as derived state ✅ DONE

- [x] **2.1** camSlice stores `selectedActivityId: string | null` and `selectedConnectionKey: { sourceActivityUid, targetActivityUid } | null`
- [x] **2.2** Memoized selectors via `createSelector`: `selectSelectedActivity`, `selectSelectedConnection` derive full objects from model + ID
- [x] **2.3** Deleted the 20-line sync block from `setModel` — now a single line assignment
- [x] **2.4** `getModelTerms` → `makeSelectModelTerms()` factory. `getModelEvidence` → `selectModelEvidence`. Updated EntityRow + EditorDropdown.
- [x] **2.5** Updated: PathwayViewer, RightDrawer, ConnectorTable, EntityRow, EditorDropdown
- [x] **2.6** Type-check + lint pass — 0 errors

### Phase 3: Fix GlobalDialog circular dependency ✅ DONE

- [x] **3.1** GlobalDialog now accepts `componentMap` prop — no context needed, simple prop injection
- [x] **3.2** `DIALOG_COMPONENTS` map defined in `App.tsx` (app shell) and passed to `<GlobalDialog>`
- [x] **3.3** Removed all 4 feature imports from `@noctua.core/components/dialog/GlobalDialog.tsx` — core no longer depends on features
- [x] **3.4** Type-check + lint pass — 0 errors

### Phase 4: RTK Query and auth cleanup

- [ ] **4.1** Token handling: include barista token in query cache key so RTK Query invalidates on token change. Keep token-in-URL construction in queryFn (Barista API requires it as a URL param, not a header).
- [ ] **4.2** Granular cache tags: `providesTags: (result, error, modelId) => [{ type: 'graph', id: modelId }]`
- [ ] **4.3** Move localStorage side effect from authSlice reducers (`setBaristaToken`, `logout`) to RTK listener middleware
- [ ] **4.4** Type-check pass

### Phase 5: Form state ownership (highest impact, highest risk — do last)

**Pre-requisite:** Audit every consumer of `selectFormErrors`, `selectFormIsValid`, `selectFormRoot`, `selectFormMode`, and all other activityFormSlice selectors. Map which are inside vs outside the dialog boundary.

- [ ] **5.1** Extract tree traversal utils to `services/formTreeUtils.ts` (shared between reducer and validation)
- [ ] **5.2** Move `activityFormSlice` state to `useReducer` + `ActivityFormContext` scoped to ActivityFormDialog
- [ ] **5.3** For any consumer of form state outside the dialog: either move it inside the dialog boundary, or expose the value via callback prop (e.g. `onValidityChange`)
- [ ] **5.4** Validation becomes `useMemo` on local state within the context provider
- [ ] **5.5** Provide `modelId`, action callbacks via the same context — kill prop drilling in EntityRow
- [ ] **5.6** Delete `activityFormSlice.ts`, remove from store
- [ ] **5.7** Type-check pass
- [ ] **5.8** Full manual test of create activity + edit activity + all form interactions

### Phase 6: Component decomposition (after Phases 1 and 5 reduce noise)

- [ ] **6.1** PathwayViewer — extract `usePathwayCanvas()` (canvas ref, layout, spacing, zoom callbacks) and `useDeleteConfirmation()`. Merge connector state into single object `{ open, source, target }`.
- [ ] **6.2** CamToolbar — extract `ContributorChips` component, extract `ToolbarDropdownMenu` (reusable for View In / Export As), move `totalErrors` to a memoized selector in camSlice
- [ ] **6.3** ActivityForm — convert `renderNestedNodeGroups` into a `<NestedNodeGroups>` component that receives the root node and owns its own slice of the form tree (computes its own `fdRows` from root.relations). Not just a wrapper around the same logic.
- [ ] **6.4** EntityRow — after Phase 1.3 (usePopover) and Phase 5 (context), should be under ~200 lines. If not, extract evidence columns into `<EvidenceColumns>`.
- [ ] **6.5** Type-check pass

---

## Execution Order

```
Phase 1 (quick wins)       → do first, no dependencies
Phase 2 (derived state)    → independent, safe, mechanical
Phase 3 (GlobalDialog)     → independent, small scope
Phase 4 (RTK Query/auth)   → independent, small scope
Phase 5 (form state)       → do after 1-4 are stable. Highest blast radius.
Phase 6 (decomposition)    → do last, benefits from all prior phases reducing noise
```

Phases 1-4 are safe and can overlap. Phase 5 is the big structural change — do it only when the codebase is otherwise clean. Phase 6 is the payoff.

---

## What NOT to do

| Temptation | Why not |
|------------|---------|
| React Hook Form for activity form | The form is a recursive tree, not flat fields. useReducer models it correctly. |
| Normalize activities as `Record<string, Activity>` | The array is small (10-50 items). findIndex is fine. Normalization adds complexity for no real gain here. |
| Add React Context everywhere | Context is right for the form dialog (Phase 5). Don't wrap the whole app in providers for things Redux already handles well. |
| Reorganize directory structure | Git churn with no behavior change. The feature-based structure is already good. |
| Add error handling/toasts to all mutations | That's a feature (changes user-visible behavior), not a refactoring. Do it in a separate pass after the refactor is stable. |
| Add error boundaries | Nice to have but not a refactoring target. Address after mutation error handling is in place. |

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Phase 5 breaks form editing | Full manual test after implementation. The 18 reducer actions all need to work. Keep the old slice in a branch until stable. |
| Form state consumers outside dialog | Audit first (Phase 5 pre-req). Don't delete the slice until every external consumer is accounted for. |
| Token handling change causes auth failures | Test login → fetch model → edit model → logout flow end-to-end after Phase 4. |
| Full model re-parse on every mutation | Not addressed in this plan. Known cost. Monitor for performance issues as models grow. |

---

## Blockers
- None

## Notes
- Every phase is independently shippable and testable
- No phase changes external behavior (explicitly: no new toasts, no new error messages, no UI changes)
- Phase 5 is the highest-impact change but also the riskiest. Everything else should be done first to reduce the surface area.
- Phase 6 is where the components finally get small. It depends on Phases 1 and 5 doing the heavy lifting first.
