# Task: Global loading overlay during CAM API operations

**Status:** ACTIVE — implementation done, manual verification pending
**Issue:** Port of geneontology/noctua#235 to React workbench
**Branch:** TBD (likely paired with `barista-socket`)

## Goal

Block all interaction (clicks, drag, keyboard) with a full-screen semi-transparent overlay while CAM API calls are in flight, so users can't fire duplicate save/delete/copy operations or interact with stale UI during a rebuild. Linger 1 s after the response so the UI has time to settle before re-enabling input. Mirrors the Angular implementation at `C:\work\go\old-noctua-visual-pathway-editor\.plans\feature\global-loading-overlay-debounce.md`.

## Context

- **Reference (Angular, do NOT copy):** `src/@noctua/services/loading-overlay.service.ts` + `src/@noctua/components/loading-overlay/*`
- **Triggered by:** Same problem as the Angular original — duplicate Minerva requests when a user clicks Save twice during a rebuild.
- **Pairs with:** `.plans/feature/barista-socket.md` — the socket-driven `refetch()` also goes through `getGraphModel`, so the overlay covers it for free.

### Design differences from Angular

| Concern | Angular | React |
| --- | --- | --- |
| State | `BehaviorSubject` in a service | Redux slice (`loadingOverlay`) — counter + message |
| Trigger | Manual `show()`/`hide()` calls in `graph.service.ts` for every operation | RTK Query middleware — auto-tracks `getGraphModel` / `updateGraphModel` / `copyGraphModel` |
| Linger | `setTimeout(..., 1000)` in `rebuild()` | `setTimeout(..., 1000)` in middleware on `fulfilled`/`rejected` |
| Component | `<noctua-loading-overlay>` rendered in app shell | `<LoadingOverlay />` rendered once in `Layout.tsx` |
| Spinner | `mat-spinner` | Mantine `Loader` |

The middleware approach means call sites stay clean — adding a new mutation later only needs the endpoint name added to `TRACKED_ENDPOINTS`.

### Why counter-based, not boolean

Two operations can overlap (e.g. mutation fulfilled triggers a refetch that fires before the linger expires). A counter handles the overlap correctly: the overlay stays visible until *every* tracked op has resolved.

## Implementation

### Phase 1: Slice
- [x] Created `src/@noctua.core/components/loading-overlay/loadingOverlaySlice.ts`
  - State: `{ counter: number, message: string }`
  - Reducers: `show(message?)` (increments + sets message), `hide` (decrements, clears message at 0), `forceHide`
  - Selectors: `selectLoadingOverlay`, `selectLoadingOverlayVisible`

### Phase 2: Middleware
- [x] Created `src/@noctua.core/components/loading-overlay/loadingOverlayMiddleware.ts`
  - Tracks endpoints `getGraphModel`, `updateGraphModel`, `copyGraphModel`
  - On `*/pending` for a tracked endpoint → `dispatch(show(messageFor(endpoint, originalArgs)))`
  - On `*/fulfilled` or `*/rejected` → `setTimeout(() => dispatch(hide()), 1000)`
  - Message heuristic for `updateGraphModel`: any `OperationType.REMOVE` op → `"Deleting..."`, else `"Saving..."`. `copyGraphModel` → `"Copying Model..."`. `getGraphModel` → `"Loading Model Activities..."`.

### Phase 3: Component
- [x] Created `src/@noctua.core/components/loading-overlay/LoadingOverlay.tsx`
  - Reads `selectLoadingOverlay`, returns `null` when `counter <= 0`
  - Full-screen `fixed inset-0 z-[99997]` div with semi-transparent gray bg, `cursor: wait`, Mantine `Loader`, optional message
  - `role="status"` + `aria-live="polite"` for screen readers

### Phase 4: Wire-up
- [x] `src/app/store/store.ts` — added slice reducer (`loadingOverlay`) and middleware to the chain
- [x] `src/app/layout/Layout.tsx` — mounted `<LoadingOverlay />` once at the top of the layout tree (rendered above all other content because of `z-[99997]`)

### Phase 5: Verify
- [x] `npm run type-check` clean
- [x] `eslint` clean on touched files
- [ ] `npm run dev`: open a model — overlay flashes on initial load, clears after ~1 s linger
- [ ] Save an activity — overlay shows "Saving...", persists through the auto-refetch (which will swap message to "Loading Model Activities..."), clears 1 s after the refetch
- [ ] Delete an activity — overlay shows "Deleting..."
- [ ] Copy a model via the toolbar — overlay shows "Copying Model..."
- [ ] During a save, try clicking another action — overlay should block the click (cursor: wait, pointer events captured)
- [ ] Confirm overlay never sticks: trigger a network failure, confirm hide still fires (rejected branch)

## Notes

- Counter survives middleware/component remounts because it lives in Redux. Only `forceHide` resets it — safe escape hatch if the counter ever drifts.
- The middleware is endpoint-name driven, not type-checked against `apiService.endpoints`. If an endpoint is renamed and `TRACKED_ENDPOINTS` isn't updated, the overlay just won't show for that endpoint — silent degradation, not a crash.
- z-index `99997` matches the Angular SCSS exactly (one less than common modal portals at 99998+) so existing dialogs render above the overlay if both are visible.
- Pairs naturally with `useBaristaModelWatch`: when the user clicks "Refresh" in the external-update modal, `refetch()` triggers `getGraphModel/pending`, the overlay shows, and the modal sits on top of it.
- For now, no per-operation message customization beyond REMOVE vs everything else. If we want "Saving Activity..." vs "Saving Annotations..." like Angular, we'd inspect `originalArgs[].entity` more granularly — easy follow-up.

## Files Modified

| File | Action |
| --- | --- |
| `src/@noctua.core/components/loading-overlay/loadingOverlaySlice.ts` | Created |
| `src/@noctua.core/components/loading-overlay/loadingOverlayMiddleware.ts` | Created |
| `src/@noctua.core/components/loading-overlay/LoadingOverlay.tsx` | Created |
| `src/app/store/store.ts` | Registered slice + middleware |
| `src/app/layout/Layout.tsx` | Mounted `<LoadingOverlay />` |

## Open Questions

1. Should the spinner be branded (Noctua logo + custom color) or is the default Mantine Loader fine? Currently default.
2. Do we want a maximum visible duration (e.g. force-hide after 30 s) as a safety net against a stuck request? Not implemented; RTK Query's own timeouts will eventually emit `rejected`.
