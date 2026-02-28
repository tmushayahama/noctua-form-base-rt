# Task: Implement PathwayViewer — Full JointJS Graph Editor

**Status:** ACTIVE
**Branch:** main

## Goal

Replicate the full Angular noctua-graph editor in React: interactive JointJS canvas with stencil drag-drop palette, activity/molecule rendering, hover highlighting (predecessor/successor), edit/delete actions, link creation with connector form, toolbar controls (layout detail, spacing, zoom), right panel tabs (activity table, connector table, CAM errors), and position persistence.

## Context

- **Angular source:** `C:\work\go\noctua-visual-pathway-editor\src\@noctua.graph\` + `src\app\main\apps\noctua-graph\`
- **React target:** `C:\work\go\noctua-form-base-rt\src\features\pathway\` + `src\app\PathwayViewer.tsx`

### What exists (React) — current as of Phase 3 completion

| Component | File | Status |
|-----------|------|--------|
| CamCanvas class | `src/features/pathway/graph/camCanvas.ts` | Full: highlighting, molecules, scale-to-fit, defaultLink, link tracking, reverse links, mouse-centered zoom, position tracking, collapse/expand, layout detail modes |
| NodeCellList shape | `src/features/pathway/graph/shapes.ts` | Done |
| NodeCellMolecule shape | `src/features/pathway/graph/shapes.ts` | Done |
| NodeLink shape | `src/features/pathway/graph/shapes.ts` | Done |
| PathwayGraph component | `src/features/pathway/components/PathwayGraph.tsx` | Done: Ctrl+zoom, drag-drop handlers, all callbacks |
| PathwayViewer page | `src/app/PathwayViewer.tsx` | Done: toolbar, canvas callbacks, layout/spacing state |
| GraphToolbar | `src/features/pathway/components/GraphToolbar.tsx` | Done: Auto Layout, Layout Detail, Spacing, Zoom |
| StencilPalette | `src/features/pathway/components/StencilPalette.tsx` | Done: HTML5 drag API, 3 activity types |
| Stencil data | `src/features/pathway/data/stencilData.ts` | Done |
| Edge colors | `src/features/pathway/graph/edgeDisplayService.ts` | Done |
| Material palettes | `src/features/pathway/graph/colors.ts` | Done |
| Activity form | `src/features/gocam/components/forms/ActivityForm.tsx` | ~60% |
| Relations decision tree | `src/features/relations/` | Done (models, slice, form UI) |
| Drawer slice | `src/@noctua.core/components/drawer/drawerSlice.ts` | Done (left/right open/close) |
| Dialog system | `src/@noctua.core/components/dialog/` | Done (GlobalDialog, SimpleDialog) |
| ActivityDetails | `src/features/gocam/components/ActivityDetails.tsx` | Done (right drawer content) |
| CAM API | `src/features/gocam/slices/camApiSlice.ts` | Done (get + update mutations) |
| App.tsx | `src/App.tsx` | Done: stencil in left drawer |

### What's still missing (must build)

1. **Edit/delete actions on hover** — JointJS ToolsView buttons on nodes; edit opens form, delete with confirmation (Phase 5)
2. **Stencil drop → ActivityForm dialog** — currently a TODO stub in `handleStencilDrop` (Phase 3.3)
3. **Link creation → connector form** — currently a TODO stub in `handleLinkCreated` (Phase 4)
4. **Connector form in right panel** — decision tree + evidence + save/delete (Phase 4)
5. **Right panel tab system** — switch between activity table, connector table, CAM errors (Phase 6)
6. **CamErrors component** — validation errors panel (Phase 6)
7. **Position persistence via API** — `onUpdateLocations` callback fires but doesn't call API yet (Phase 7)
8. **Manual layout support** — use saved positions when they exist (Phase 8)
9. **Not-logged-in banner** — show when no auth (Phase 8)

## Steps

---

### Phase 0: Foundation & Verification ✅ COMPLETE

JointJS renders in Vite/React. Types compile. Dagre layout works. CSS imported. Edge color utility created.

---

### Phase 1: Enhanced Canvas ✅ COMPLETE

Implemented in `camCanvas.ts`:
- [x] Successor/predecessor highlighting on hover (`_highlightSuccessorNodes`, `_unhighlightAllNodes`)
- [x] Molecule rendering via `NodeCellMolecule` for `ActivityType.MOLECULE` (`_createMolecule`)
- [x] Scale-to-fit on initial load (`scaleContentToFit`)
- [x] DefaultLink factory (`defaultLink: () => NodeLink.create()`)
- [x] Link creation tracking (`change:source change:target` → `onLinkCreated`)
- [x] Link double-click → `onLinkClick` callback
- [x] Reverse link support (swaps source/target when `isReverseLink`)
- [x] Mouse-centered zoom (`_offsetToLocalPoint`)
- [x] Position tracking (`change:position` + `element:pointerup` → `_persistPositions`)
- [x] Collapse/expand subgraphs (`toggleActivityVisibility`)
- [x] Layout detail modes: `detailed`, `activity`, `simple`
- [x] 30000x30000 canvas dimensions
- [x] Color key stored on each element prop for highlight restore

---

### Phase 2: Graph Toolbar ✅ COMPLETE

- [x] `GraphToolbar.tsx` — Auto Layout, Layout Detail dropdown, Spacing dropdown, Zoom In/Out/Reset
- [x] Layout detail + spacing as local state in `PathwayViewer`
- [x] Toolbar wired to CamCanvas via `canvasRef`
- [x] Layout detail rendering modes in `_createNode(activity, layoutDetail)`
- [x] Ctrl+scroll zoom on canvas (`onWheel` handler in `PathwayGraph`)

---

### Phase 3: Stencil Palette ✅ PARTIALLY COMPLETE

- [x] Stencil data: `stencilData.ts` with 3 activity types (Activity Unit, Protein Complex, Molecule)
- [x] `StencilPalette.tsx`: draggable cards with HTML5 Drag API, icons, descriptions
- [x] Wired into `App.tsx` as left drawer content
- [x] `PathwayGraph.tsx`: `onDragOver` + `onDrop` handlers with coordinate conversion
- [ ] **Step 3.3 — Drop → open ActivityFormDialog** (TODO stub in `handleStencilDrop`)

#### Step 3.3 — Handle drop on canvas → open ActivityForm dialog
In `PathwayViewer.handleStencilDrop`:
1. Store pending creation position + activity type in state
2. Open `ActivityFormDialog` with the selected activity type pre-set
3. On form submit (after API `updateGraphModel` succeeds):
   - Refetch model (`invalidatesTags` or manual refetch)
   - New activity appears at drop position

**Files:** `src/app/PathwayViewer.tsx`, `src/features/gocam/components/dialogs/ActivityFormDialog.tsx`

---

### Phase 4: Link Creation & Connector Form

**Goal:** Drag between nodes to create connections. Open connector form (decision tree) in right panel.

Canvas-side link tracking is already done (Phase 1). What remains is the UI/form integration.

- [ ] **Step 4.1 — Add right panel tab state to drawerSlice**
  Add `rightPanelTab: 'activityTable' | 'connectorTable' | 'camErrors'` to drawer state.
  Add action `setRightPanelTab`. Default: `'activityTable'`.
  **File:** `src/@noctua.core/components/drawer/drawerSlice.ts`

- [ ] **Step 4.2 — Create ConnectorForm component**
  New file: `src/features/relations/components/ConnectorForm.tsx`
  Wraps existing `RelationForm` with:
  - Header: "Causal Relation Form" + Close button
  - Body: `RelationForm` (decision tree radio groups)
  - Evidence section (placeholder for now)
  - Footer: "Delete" button
  - Props: `sourceActivityId`, `targetActivityId`, `onClose`
  On save: dispatch API mutation to create/update edge.
  **File:** `src/features/relations/components/ConnectorForm.tsx`

- [ ] **Step 4.3 — Wire link creation + link click → connector form**
  In `PathwayViewer`:
  - `handleLinkCreated(sourceId, targetId)`: store IDs in state, set tab to `'connectorTable'`, open right drawer
  - `handleLinkClick(sourceId, targetId)`: same but for existing connections
  **File:** `src/app/PathwayViewer.tsx`

- [ ] **Step 4.4 — Update RightDrawer to switch on tab**
  Replace `RightDrawerContent` with a tab-aware component that renders:
  - `'activityTable'` → `<ActivityDetails />`
  - `'connectorTable'` → `<ConnectorForm />`
  - `'camErrors'` → `<CamErrors />` (Phase 6)
  **File:** `src/app/layout/RightDrawer.tsx`

---

### Phase 5: Edit/Delete Actions on Nodes

**Goal:** Hover a node → show edit/delete icon overlays.

- [ ] **Step 5.1 — Add JointJS ToolsView with edit/delete buttons**
  In `CamCanvas._initEvents()`, on `element:mouseover`:
  - Create `joint.elementTools.Button` for edit (pencil icon) and delete (trash icon)
  - Add `joint.dia.ToolsView` to cellView
  On `element:mouseleave`: remove tools.
  Edit action calls `this.onEditClick?.(activity.uid)`.
  Delete action calls `this.onDeleteClick?.(activity.uid)`.
  **File:** `src/features/pathway/graph/camCanvas.ts`

- [ ] **Step 5.2 — Wire edit click → open activity form**
  `handleEditClick` in `PathwayViewer`: same behavior as `handleActivityClick` (select activity, open right drawer with activity table).
  **File:** `src/app/PathwayViewer.tsx`

- [ ] **Step 5.3 — Wire delete click → confirm → delete**
  `handleDeleteClick` in `PathwayViewer`:
  1. Show MUI confirmation dialog: "Confirm Delete? Deleting this cannot be undone."
  2. If confirmed: call API `updateGraphModel` mutation to delete activity
  3. On success: refetch model, close right drawer if showing that activity, show success toast
  **File:** `src/app/PathwayViewer.tsx`

---

### Phase 6: Right Panel — Tab System & Error Panel

**Goal:** Right drawer shows different content based on what the user clicked.

- [ ] **Step 6.1 — Create RightPanelContainer component**
  New file: `src/features/pathway/components/RightPanelContainer.tsx`
  Reads `rightPanelTab` from Redux, switches between:
  - `'activityTable'` → `<ActivityDetails activity={selectedActivity} />`
  - `'connectorTable'` → `<ConnectorForm sourceId={...} targetId={...} />`
  - `'camErrors'` → `<CamErrors />`
  Header with tab chips + close button.
  **File:** `src/features/pathway/components/RightPanelContainer.tsx`

- [ ] **Step 6.2 — Create CamErrors component**
  New file: `src/features/gocam/components/CamErrors.tsx`
  Shows validation errors: node errors, edge/relation errors, error type badges, summary counts.
  **File:** `src/features/gocam/components/CamErrors.tsx`

- [ ] **Step 6.3 — Replace RightDrawer content in App.tsx**
  Swap `<RightDrawerContent />` with `<RightPanelContainer />`.
  Tab set by: double-click node → `activityTable`, double-click/create link → `connectorTable`.
  **File:** `src/App.tsx`

---

### Phase 7: Position Persistence via API

**Goal:** Save node positions after user drags them.

Canvas-side position tracking is already done (Phase 1). What remains is the API call.

- [ ] **Step 7.1 — Implement `handleUpdateLocations` in PathwayViewer**
  Build API request from position map. Call `updateGraphModel` mutation with position-set operations.
  **File:** `src/app/PathwayViewer.tsx`

- [ ] **Step 7.2 — Use saved positions on load**
  In `CamCanvas.addCanvasGraph()`: if activities have `position.x/y` values, set element positions from them instead of running auto-layout. Only auto-layout when no manual positions exist.
  **File:** `src/features/pathway/graph/camCanvas.ts`

---

### Phase 8: Polish & Parity

- [ ] **Step 8.1 — Not-logged-in banner**
  Show "Not Logged In: You can only view existing annotations" above toolbar when no auth user.
  **File:** `src/app/PathwayViewer.tsx`

- [ ] **Step 8.2 — Disable editing actions when not logged in**
  Stencil drop, link creation, edit/delete buttons should check auth state.
  Redirect to login or show dialog on unauthorized action.
  **Files:** `src/app/PathwayViewer.tsx`, `src/features/pathway/graph/camCanvas.ts`

- [ ] **Step 8.3 — Activity form integration polish**
  Ensure `ActivityForm` tree editor works end-to-end: form fill → submit → API → refetch → canvas update.
  **File:** `src/features/gocam/components/forms/ActivityForm.tsx`

---

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** Phases 0-3 implemented (Phase 3 partial — drop handler is a TODO stub)
  - CamCanvas: highlighting, molecules, scale-to-fit, defaultLink, link tracking, reverse links, mouse-centered zoom, position tracking, toggle visibility, layout detail modes
  - GraphToolbar: Auto Layout, Layout Detail, Spacing, Zoom
  - StencilPalette: HTML5 drag, 3 activity types, wired to left drawer
  - PathwayGraph: Ctrl+zoom, drag-drop, all callbacks
  - PathwayViewer: toolbar + canvas callbacks + layout state
- **Next immediate action:** Phase 4, Step 4.1 — Add `rightPanelTab` to drawerSlice
- **Recent commands run:** `tsc --noEmit` (clean), `eslint` (clean), `prettier --write` (formatted)
- **Uncommitted changes:** `camCanvas.ts`, `PathwayGraph.tsx`, `PathwayViewer.tsx`, `App.tsx`, `GraphToolbar.tsx` (new), `StencilPalette.tsx` (new), `stencilData.ts` (new), `.plans/feature/pathway-viewer.md`
- **Environment state:** main branch, needs visual verification in browser then commit
- **TODO stubs in code:**
  - `PathwayViewer.handleStencilDrop` — Phase 3.3
  - `PathwayViewer.handleLinkCreated` — Phase 4.3
  - `PathwayViewer.handleLinkClick` — Phase 4.3

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
| `@types/jointjs@2.0.0` | Outdated vs `jointjs@3.7.7`, bundled types work | 2026-02 |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
| `package.json` | Removed `@types/jointjs` from devDependencies | Done |
| `src/main.tsx` | Added `import 'jointjs/dist/joint.css'` | Done |
| `src/app/PathwayViewer.tsx` | Full editor: toolbar, canvas callbacks, layout state | Done |
| `src/features/gocam/services/edgeDisplayService.ts` | Created edge color utility | Done |
| `src/features/pathway/graph/camCanvas.ts` | Full CamCanvas: highlighting, molecules, links, zoom, positions | Done |
| `src/features/pathway/graph/shapes.ts` | NodeCellList, NodeCellMolecule, NodeLink | Done |
| `src/features/pathway/components/PathwayGraph.tsx` | React wrapper: Ctrl+zoom, drag-drop, all callbacks | Done |
| `src/features/pathway/components/GraphToolbar.tsx` | NEW: Layout detail, spacing, zoom controls | Done |
| `src/features/pathway/components/StencilPalette.tsx` | NEW: Draggable activity type palette | Done |
| `src/features/pathway/data/stencilData.ts` | NEW: Stencil item definitions | Done |
| `src/App.tsx` | Added StencilPalette as left drawer content | Done |

## Blockers
- None currently

## Notes
- Angular uses jQuery for stencil drag-drop (`$('#noc-flypaper')`) — React version uses HTML5 Drag API instead
- Angular uses RxJS BehaviorSubjects for service coordination — React version uses Redux + callbacks
- Angular `noctuaFormConfig` has layout detail options — React defines these as local types in `camCanvas.ts`
- The `defaultLink` paper option ensures user-drawn links use `NodeLink.create()`
- `scaleContentToFit` is called after layout for initial view
- JointJS `elementTools.Button` is the modern way to add hover action buttons (Phase 5)
- The `onEditClick` and `onDeleteClick` callbacks exist on CamCanvas but aren't wired to ToolsView yet (Phase 5)
- Position persistence callback (`onUpdateLocations`) fires from canvas but the API call isn't implemented yet (Phase 7)

## Additional Context

### Angular → React Event Mapping

| Angular Event | Angular Handler | React Status |
|---------------|----------------|-------------|
| `element:pointerdblclick` | `elementOnClick` → opens table | ✅ `onActivityClick` → Redux dispatch |
| `element:mouseover` | `hover(true)` + `highlightSuccessorNodes` | ✅ Implemented in CamCanvas |
| `element:mouseleave` | `hover(false)` + `unhighlightAllNodes` | ✅ Implemented in CamCanvas |
| `element:.edit:pointerdown` | `editOnClick` → opens form | ⬜ Phase 5 — callback exists, no ToolsView yet |
| `element:.delete:pointerdown` | `deleteOnClick` → confirm dialog | ⬜ Phase 5 — callback exists, no ToolsView yet |
| `element:expand:pointerdown` | `toggleActivityVisibility` | ✅ Method exists, needs UI trigger (Phase 5) |
| `element:pointerup` | `updateLocation` if `layoutChanged` | ✅ `_persistPositions` fires, API call pending (Phase 7) |
| `link:pointerdblclick` | `linkOnClick` → opens connector | ✅ `onLinkClick` fires, connector form pending (Phase 4) |
| `link:mouseenter/leave` | hover effect | ✅ Implemented in CamCanvas |
| `change:source change:target` | `onLinkCreated` → opens connector form | ✅ `onLinkCreated` fires, form pending (Phase 4) |
| `change:position` | sets `layoutChanged = true` | ✅ Implemented in CamCanvas |
| `blank:pointerdblclick` | `unselectAll` | ✅ Implemented in CamCanvas |

### Stencil Drag-Drop Flow (React Version)

```
StencilPalette                    PathwayGraph / Canvas
─────────────                    ──────────────────────
onDragStart(activityType) ────→  onDragOver(preventDefault)
                                 onDrop(event) {
                                   const type = getData()
                                   const {x, y} = canvasCoords(event)
                                   → PathwayViewer.handleStencilDrop(type, x, y)
                                 }
                                       │
                                       ▼  (TODO Phase 3.3)
                              ActivityFormDialog
                              (fill in activity details)
                                       │
                                       ▼
                              API: updateGraphModel
                                       │
                                       ▼
                              Refetch model → canvas re-renders
```

### Right Panel Tab Flow

```
User Action              → Sets Tab              → Panel Content         → Status
─────────────────────    ─────────────────────    ──────────────          ───────
Double-click node        → 'activityTable'        → ActivityDetails       ✅ Works
Click edit on node       → 'activityTable'        → ActivityDetails       ⬜ Phase 5
Double-click link        → 'connectorTable'       → ConnectorForm         ⬜ Phase 4
Create new link (drag)   → 'connectorTable'       → ConnectorForm         ⬜ Phase 4
Click errors button      → 'camErrors'            → CamErrors             ⬜ Phase 6
```
