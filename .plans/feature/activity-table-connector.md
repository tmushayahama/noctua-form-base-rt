# Task: Implement Activity Table & Activity Connector Table

**Status:** ACTIVE
**Branch:** dev

## Goal
Implement the Angular activity-table and activity-connector-table drawer panels in React with exact behavioral parity. When a user selects an activity on the graph, the right drawer shows a full interactive tree table (GP + FD sections) with evidence, menus, and inline editing. When a user selects a connector, the right drawer shows the relation form with decision tree selectors, evidence, and save/delete.

## Context
- **Angular activity-table source:** `C:\work\go\noctua-visual-pathway-editor\src\app\main\apps\noctua-graph\activity-table\`
- **Angular activity-connector-table source:** `C:\work\go\noctua-visual-pathway-editor\src\app\main\apps\noctua-graph\activity-connector-table\`
- **Angular form-table components:** `activity-form-table`, `activity-form-table-node`, `evidence-table` (shared renderers)
- **React target directory:** `src/features/gocam/components/`
- **Triggered by:** Need to match Angular graph viewer drawer behavior

## Current State

### What works now (React):
- `ActivityDetails.tsx` — Simple read-only view: GP label + MF label + flat edge rows with evidence boxes. Edit opens `ActivityForm.tsx` in dialog.
- `ActivityForm.tsx` — Full create/edit form with GP/FD sections, EntityRow components, validation, save to Barista. Works with `activityFormSlice` (TermNode tree state).
- `RelationForm.tsx` — Complete connector form: relationship/effect/directness selectors, evidence section, save/delete. Standalone component.
- `EntityRow.tsx` — Interactive form row: term autocomplete, evidence columns, ellipsis menu (add node, evidence, NOT qualifier, fill root term, ISS, clear, remove).
- `RightDrawer.tsx` — Right drawer content with tabs: "Activity Details" (default) + "CAM Errors".
- `drawerSlice.ts` — Manages drawer open/close state, right panel tab ('activityTable' | 'camErrors').
- `camSlice.ts` — Tracks `selectedActivity: Activity | null`.
- `relationSlice.ts` — Tracks connector selection state + connector evidences.
- `connectorServices.ts` — `buildConnectorOperations()` and `buildConnectorDeleteOperations()`.

### What's broken/missing:
1. **Activity Table** — `ActivityDetails.tsx` is a flat list of edge rows. Angular shows a **hierarchical tree** with two sections (GP tree + FD tree), each node showing term + full evidence table + action menu. Missing: tree structure display, evidence per node, expand/collapse, inline editing, node CRUD from table view, delete activity.
2. **Activity Connector Table** — `RelationForm.tsx` exists but is not integrated into the drawer. There's no mechanism to select a connector on the graph and open the connector form in the drawer. Missing: drawer integration, selected connector state, "unsupported relation" alert, activity labels in header.
3. **Drawer Infrastructure** — Right drawer only supports "activity table" and "CAM errors" tabs. Needs to also support "connector table" tab when a connector is selected.

## Architecture: Angular vs React Mapping

### Angular Activity-Table Component Hierarchy
```
ActivityTableComponent (drawer wrapper)
  └── ActivityFormTableComponent (tree renderer — GP tree + FD tree)
       └── ActivityFormTableNodeComponent (per-node row: term + evidence + menu)
            └── EvidenceFormTableComponent (evidence table per node)
```

### Angular Activity-Connector-Table
```
ActivityConnectorTableComponent (drawer wrapper)
  ├── Relationship radio selectors
  ├── Effect/Direction selectors (conditional)
  ├── Directness selectors (conditional)
  ├── "Suggested Causal Relation" display
  ├── EvidenceFormTableComponent (connector evidence)
  └── Delete button
```

### React Implementation Plan
```
RightDrawer.tsx (enhanced: 3 tabs)
  ├── ActivityTable.tsx (NEW — replaces ActivityDetails.tsx)
  │     ├── Header: activity label + menu (delete) + close
  │     ├── GP Section: tree of GP nodes
  │     │     └── ActivityTableNode.tsx (NEW — per-node row)
  │     │           ├── Term display (label + ID link + aspect badge)
  │     │           ├── Evidence display (inline evidence rows)
  │     │           ├── Menu: edit term, add child, add/remove evidence, delete
  │     │           └── Inline edit mode (term autocomplete, opens on pencil click)
  │     └── FD Section: tree of FD nodes
  │           └── ActivityTableNode.tsx (reused)
  ├── ConnectorTable.tsx (NEW — wraps RelationForm in drawer context)
  │     ├── Header: "Causal Relation Form" + close
  │     ├── Activity labels (source → target)
  │     ├── "Unsupported relation" alert (if existing edge not in decision tree)
  │     └── RelationForm.tsx (existing — already complete)
  └── CamErrors.tsx (existing)
```

### Key Design Decisions

1. **ActivityTable reads from `cam.selectedActivity` (Activity model), NOT from `activityFormSlice`.**
   The activity table is a display/inline-edit view of the server model. It does not use the form tree. Inline edits build Barista operations directly and send them via `updateGraphModel()`.

2. **Inline editing = targeted Barista operations, not full form round-trip.**
   When user edits a node's term in the table, we send `editIndividualType` operation for just that node. When user adds evidence, we send `addEvidenceToEdge` operation. This matches Angular behavior where each inline edit is a separate API call.

3. **ActivityForm.tsx (dialog) remains for full create/edit.**
   The activity table's "Edit Activity" menu item opens `ActivityForm.tsx` in a dialog (same as now). The table provides quick inline edits; the dialog provides the full form experience.

4. **RelationForm.tsx is already complete — just needs drawer wrapper.**
   The connector table is mostly wiring: add drawer header, selected connector state, and pass props to RelationForm.

5. **Expand/collapse uses local component state, not Redux.**
   Tree expand/collapse is UI-only state. Each ActivityTableNode manages its own `expanded` boolean.

---

## Steps

### Phase 0: Drawer Infrastructure
Add connector table support to the drawer system.

**Files:**
- `src/@noctua.core/components/drawer/drawerSlice.ts` — add 'connectorTable' tab
- `src/features/gocam/slices/camSlice.ts` — add `selectedConnection` state
- `src/app/layout/RightDrawer.tsx` — add connector table tab routing

**0.1 — drawerSlice.ts:**
- Extend `RightPanelTab` type: `'activityTable' | 'connectorTable' | 'camErrors'`
- No other changes needed

**0.2 — camSlice.ts:**
- Add `selectedConnection` to state:
  ```ts
  selectedConnection: {
    sourceActivity: Activity
    targetActivity: Activity
    edge: Edge  // the existing connector edge (id, sourceId, targetId)
  } | null
  ```
- Add `setSelectedConnection` reducer
- Add `selectSelectedConnection` selector

**0.3 — RightDrawer.tsx:**
- Import ConnectorTable (will be created in Phase 3)
- Add conditional rendering: if `activeTab === 'connectorTable'` → render ConnectorTable
- When selectedConnection is set, auto-switch to 'connectorTable' tab
- When selectedActivity is set, auto-switch to 'activityTable' tab

**Verify:** Setting `selectedConnection` in Redux opens right drawer with connector tab.

---

### Phase 1: Activity Table — Display
Build the read-only activity tree table showing nodes and evidence.

**Files:**
- `src/features/gocam/components/ActivityTable.tsx` — NEW (replaces ActivityDetails.tsx)
- `src/features/gocam/components/ActivityTableNode.tsx` — NEW (per-node row renderer)

**1.1 — Data: Build display trees from Activity model**

The Activity model has `nodes: GraphNode[]` and `edges: Edge[]`. We need to build two trees:
- **GP Tree**: Starting from the enabledBy node, show the gene product and its children
- **FD Tree**: Starting from the rootNode (MF), show the function description and its children

Tree building logic (in ActivityTable or a utility):
```ts
interface DisplayTreeNode {
  node: GraphNode
  edge: Edge | null        // the edge connecting this node to its parent
  evidence: Evidence[]     // evidence on the edge (edge.evidence)
  children: DisplayTreeNode[]
  treeLevel: number
  canDelete: boolean
  aspect: string | null    // from node's rootTypes
}

function buildDisplayTree(activity: Activity): {
  gpTree: DisplayTreeNode[]
  fdTree: DisplayTreeNode[]
}
```

- Walk `activity.edges` to build parent→children adjacency
- The rootNode's `enabled_by` edge targets the GP node → GP tree root
- The rootNode itself is the FD tree root
- Other edges from rootNode (part_of, occurs_in, has_input, etc.) → FD children
- Recursive for deeper nodes

**1.2 — ActivityTable.tsx:**

Layout matching Angular:
```
┌──────────────────────────────────────┐
│ Header: [Activity title] [⋮ menu] [✕]│
├──────────────────────────────────────┤
│ Gene Product                         │
│ ├─ [GP node row]                     │
│ │  └─ [child node rows...]           │
├──────────────────────────────────────┤
│ Function Description                 │
│ ├─ [MF node row] (with evidence)     │
│ │  ├─ [BP node row] (with evidence)  │
│ │  ├─ [CC node row] (with evidence)  │
│ │  └─ [extension nodes...]           │
└──────────────────────────────────────┘
```

Header:
- Activity title (GP label or "Activity")
- Menu button (⋮) with "Delete Activity" option
- Close button (✕) — closes drawer, clears selectedActivity
- Edit button — opens ActivityForm in dialog (same as current ActivityDetails)

Sections:
- "Gene Product" section header (or "Chemical" for molecules)
- "Function Description" section header (or custom based on activity type)
- Each section renders its tree nodes using ActivityTableNode

**1.3 — ActivityTableNode.tsx:**

Each node row displays:
```
[▶/▼ caret] [Aspect badge] [Term label + ID] | [Evidence rows] | [⋮ menu]
```

**Term cell** (left ~35%):
- Expand/collapse caret (if node has children)
- Aspect floating label (MF/BP/CC/etc.) with color
- Term label (bold)
- Term ID as link to amigo2 (http://amigo.geneontology.org/amigo/term/{id})
- Indentation based on treeLevel (`paddingLeft: treeLevel * 16px`)

**Evidence cell** (right ~55%):
- If edge has evidence: render evidence rows
  - Each row: [evidence code label] | [reference (as link if URL)] | [with/from]
- If no evidence: show "No evidence" in gray
- Evidence count summary badge (e.g., "3 evidence items")

**Action cell** (right ~10%):
- Menu button (⋮)

**Expand/collapse:**
- Local state: `const [expanded, setExpanded] = useState(true)`
- Caret icon toggles between FaCaretRight / FaCaretDown
- When collapsed, children are hidden
- All nodes expanded by default (matching Angular `onTreeLoad → expandAll`)

**Verify:** Select an activity → right drawer shows full tree with GP and FD sections, all nodes with evidence, expand/collapse works.

---

### Phase 2: Activity Table — Inline Editing & Node Operations
Add inline editing of terms, evidence CRUD, and node management directly from the table.

**Files:**
- `src/features/gocam/components/ActivityTableNode.tsx` — enhance with inline editing
- `src/features/gocam/services/activityOperations.ts` — ensure individual node operations exist

**2.1 — Inline term editing:**

When user clicks the pencil icon on a node:
- The term label switches to a TermAutocomplete input (same component used in EntityRow)
- User selects a new term
- On selection: build and send `editIndividualType` operation to Barista
- On blur/cancel: revert to display mode

State:
```ts
const [editingTerm, setEditingTerm] = useState(false)
```

Operations needed (already exist in `activityOperations.ts`):
- `buildEditIndividualTypeOperations(nodeUid, newTypeId, modelId)` — change node's GO term

**2.2 — Evidence CRUD:**

**Add evidence:**
- Menu item "Add Evidence" on a node
- Creates a new evidence individual + edge annotation via Barista operations
- Operations: `buildAddEvidenceToEdgeOperations(sourceUid, targetUid, predicateId, evidence, modelId, userContext)`

**Remove evidence:**
- Trash icon on each evidence row
- Confirmation dialog: "Remove this evidence?"
- Operations: `buildRemoveEvidenceOperations(evidenceUid, sourceUid, targetUid, predicateId, modelId)`

**Edit evidence:**
- Pencil icon on evidence cells (evidence code, reference, with)
- Switches cell to inline autocomplete/text input
- On change: build and send `editEvidenceAnnotation` operation
- Operations: `buildEditEvidenceAnnotationOperations(evidenceUid, key, oldValue, newValue, modelId)`

**2.3 — Node operations (context menu):**

Menu items matching Angular:
- **Add** (submenu) — Valid child types from shape definitions (uses `getExtensionRelations` from nodeCategories). Adds new node + edge via Barista.
- **Delete** — Deletes node and all descendants. Shows confirmation with descendant count: "This will remove X children. Continue?"
- **Edit** — Opens inline term editor

Operations needed:
- `buildAddNodeOperations(parentUid, predicateId, typeId, modelId, userContext)` — add child node with edge
- `buildDeleteNodeOperations(nodeUid, edges, modelId)` — remove node + its edges

**2.4 — Delete Activity:**

Header menu → "Delete Activity":
- Confirmation dialog: "Are you sure you want to delete this activity?"
- Builds and sends `buildDeleteActivityOperations(activity, modelId)`
- On success: close drawer, clear selectedActivity, show toast

**2.5 — Settings/Options:**

Display settings (can be local state or props):
```ts
interface TableSettings {
  showEvidence: boolean           // show full evidence table (default: true)
  showEvidenceSummary: boolean    // show count badge instead (default: false)
  editableTerms: boolean          // allow inline term editing (default: true)
  editableEvidence: boolean       // allow inline evidence editing (default: true)
}
```

These settings are toggleable from a settings icon in the section header (matching Angular's gear icon).

**Verify:** Can inline-edit a node's term, add/remove evidence, add child nodes, delete nodes, delete activity. All operations persist to server via Barista.

---

### Phase 3: Activity Connector Table — Drawer Integration
Wire the existing RelationForm into the drawer system for connector editing.

**Files:**
- `src/features/gocam/components/ConnectorTable.tsx` — NEW (drawer wrapper for RelationForm)
- `src/app/layout/RightDrawer.tsx` — wire ConnectorTable into tabs

**3.1 — ConnectorTable.tsx:**

Layout matching Angular activity-connector-table:
```
┌──────────────────────────────────────┐
│ Header: "Causal Relation Form"  [✕]  │
├──────────────────────────────────────┤
│ ⚠ Unsupported relation alert         │ (if edge not in decision tree)
├──────────────────────────────────────┤
│ Source: [Activity label]             │
│ Target: [Activity label]             │
├──────────────────────────────────────┤
│ RelationForm (existing component)    │
│  ├─ Relationship selectors           │
│  ├─ Effect/Direction (conditional)   │
│  ├─ Directness (conditional)         │
│  ├─ Suggested Causal Relation        │
│  ├─ Evidence section                 │
│  └─ Save / Delete / Cancel           │
└──────────────────────────────────────┘
```

**Props from drawer:**
- Read `selectedConnection` from `camSlice`
- Pass `sourceActivity`, `targetActivity`, `existingEdgeId`, `existingSourceUid`, `existingTargetUid` to RelationForm
- `onClose` → clears selectedConnection, closes drawer
- `onSaved` → clears selectedConnection, shows toast, closes drawer

**Unsupported relation alert:**
- If `reverseLookup(existingEdgeId)` returns null → show warning banner:
  "This relation is not supported, please choose a new relation below"

**Activity labels:**
- Show source activity: GP label → MF label (or just GP label)
- Show target activity: GP label → MF label

**3.2 — RightDrawer.tsx updates:**

```tsx
{activeTab === 'connectorTable' && selectedConnection ? (
  <ConnectorTable />
) : activeTab === 'camErrors' && model ? (
  <CamErrors model={model} />
) : (
  activity && <ActivityTable activity={activity} />
)}
```

Auto-tab switching:
- When `camSlice.selectedConnection` changes to non-null → `dispatch(setRightPanelTab('connectorTable'))` + open drawer
- When `camSlice.selectedActivity` changes to non-null → `dispatch(setRightPanelTab('activityTable'))` + open drawer

**3.3 — RelationForm.tsx minor enhancements (if needed):**

- Currently already handles create + edit mode
- Currently already handles delete
- May need: toast notifications on save/delete (via snackbar or alert)

**Verify:** Set selectedConnection → drawer opens with connector form. Relationship selectors work. Save creates/updates connector. Delete removes connector. Unsupported relation shows alert.

---

### Phase 4: Polish & Integration
Wire everything together, handle edge cases, clean up.

**Files:**
- Various — cleanup and integration

**4.1 — Graph interaction hooks:**
When PathwayViewer (JointJS) is implemented, clicking an activity cell → `dispatch(setSelectedActivity(activity))` + `dispatch(setRightDrawerOpen(true))`. Clicking a connector link → `dispatch(setSelectedConnection({...}))` + `dispatch(setRightDrawerOpen(true))`.

For now (before PathwayViewer): ensure the existing activity list or any activity selection mechanism correctly opens the drawer.

**4.2 — Toast/Snackbar notifications:**
- "Activity deleted successfully"
- "Causal relation created/updated/deleted successfully"
- "Node updated successfully"
- Use MUI Snackbar or a lightweight toast library

**4.3 — Confirmation dialogs:**
- Delete activity: "Are you sure you want to delete this activity?"
- Delete node: "This will remove N children. Continue?"
- Delete connector: "You are about to remove the causal relation"
- Use existing MUI Dialog pattern

**4.4 — Error handling:**
- Barista API errors → show in snackbar
- Network errors → show retry option
- Validation errors → show inline

**4.5 — Remove old ActivityDetails.tsx:**
- Once ActivityTable is complete, remove ActivityDetails.tsx
- Update all imports

**4.6 — Type-check and lint:**
- `npm run type-check`
- `npm run lint:fix`

**Verify:** Full workflow: select activity → view tree table → inline edit → add evidence → add child node → delete node → delete activity. Select connector → view relation form → edit relation → save → delete. All operations persist and UI updates correctly.

---

## Detailed Behavioral Spec: Activity Table

### Tree Building from Activity Model

The `Activity` model has:
```ts
{
  uid, type, rootNode: GraphNode, molecularFunction: GraphNode | null,
  enabledBy: GraphNode | null, nodes: GraphNode[], edges: Edge[]
}
```

Each `Edge` has:
```ts
{
  uid, id (predicate RO ID), label, sourceId, targetId,
  source: GraphNode, target: GraphNode, evidence: Evidence[]
}
```

**GP Tree** (Gene Product section):
- Find edge where `source === rootNode` and `predicate === enabled_by`
- The target of that edge is the GP node (root of GP tree)
- Find any edges where `source === GP node` → those are GP children (e.g., has_part edges for protein complex)

**FD Tree** (Function Description section):
- Root is the activity's rootNode (MF node)
- Evidence for the MF row comes from the `enabled_by` edge's evidence (this matches Angular behavior where the MF row shows the GP→MF evidence)
- Children: find edges where `source === rootNode` and `predicate !== enabled_by`
  - Each child's evidence comes from its connecting edge
- Recurse for deeper children

### Display Behavior

**Node row layout:**
```
┌─────────────────────────────────────────────────────────┐
│ [▼] [F] molecular_function_term     │ ECO:xxx | PMID:xxx | With │ [⋮]│
│                GO:0003674           │ ECO:yyy | DOI:xxx  |      │    │
│                                     │                           │    │
├─────────────────────────────────────────────────────────┤
│   [▼] [P] biological_process_term   │ ECO:xxx | PMID:xxx |      │ [⋮]│
│                GO:0008150           │                           │    │
├─────────────────────────────────────────────────────────┤
│   [▼] [C] cellular_component_term   │ ECO:xxx | PMID:xxx |      │ [⋮]│
│                GO:0005575           │                           │    │
└─────────────────────────────────────────────────────────┘
```

**Aspect badges:** F=blue, P=green, C=orange (matching existing `getAspectBorderClass` in ActivityForm)

**Term display:**
- Primary: term label (bold)
- Secondary: term ID (gray, smaller, as link to amigo2)
- Floating: aspect abbreviation (small colored badge top-left)

**Evidence display per row:**
- Full mode: table rows with columns [Evidence Code | Reference | With/From]
- Summary mode: count badge "N evidence" (clickable to expand)
- Empty: gray text "No evidence"

### Menu Actions (per node)

Matching Angular `activity-form-table-node`:

| Action | Condition | Behavior |
|--------|-----------|----------|
| Edit term | always | Opens inline term autocomplete |
| Add (submenu) | node has insertable children via shape defs | Shows submenu of valid child types |
| Add Evidence | node has edge (predicate) | Creates empty evidence + opens inline editor |
| Remove Evidence | has evidence | Removes last evidence |
| Clone Evidence | has edge | Opens clone evidence dialog |
| Search Annotations | node has aspect (MF/BP/CC) | Opens SearchAnnotations dialog |
| Fill with root term | node has aspect | Auto-fills with root GO term + ND evidence |
| Add ISS Evidence | node has aspect | Adds ISS (ECO:0000250) evidence |
| Clear Values | always | Clears term + evidence |
| Delete | canDelete=true | Deletes node + descendants, confirmation |

### Inline Edit Mode

When inline editing is active on a node:
1. Term label switches to `TermAutocomplete` component
2. User types/selects a term
3. On selection: immediately send `buildEditIndividualTypeOperations` to Barista
4. On success: model refreshes (RTK Query invalidation), node shows new term
5. On cancel (blur without selection): revert to display mode

For evidence inline editing:
1. Click pencil on evidence code → switches to evidence autocomplete
2. Click pencil on reference → switches to text input
3. Click pencil on with → switches to text input
4. On change: send appropriate edit operation to Barista

---

## Detailed Behavioral Spec: Connector Table

### Initialization

When `selectedConnection` is set in Redux:
1. Read `sourceActivity`, `targetActivity`, `edge` from selectedConnection
2. Check if edge's predicate ID is in the decision tree via `reverseLookup(edge.id)`
3. If found: pre-populate relationship/direction/directness selectors
4. If not found: show "unsupported relation" alert
5. Pre-populate evidence from the existing connection's evidence array

### Decision Tree Navigation

The connector type determines available relationships:
- `ACTIVITY_ACTIVITY`: regulation, providesInputFor, removesInputFor, constitutivelyUpstreamOf, undetermined
- `ACTIVITY_MOLECULE`: product, substrate
- `MOLECULE_ACTIVITY`: regulates, substrate

Conditional sections:
- Effect/Direction shown when: regulation (A→A), regulates (M→A), undetermined (A→A)
- Directness shown when: regulation (A→A) only

### Save/Edit Flow

**Creating new connector:**
1. User selects relationship + optional direction/directness
2. `determineRelation()` → RelationId (RO:xxxx)
3. User adds evidence
4. Save → `buildConnectorOperations(source, target, relationId, evidences, modelId, userContext)`
5. Send to Barista, model refreshes

**Editing existing connector:**
1. Delete old connector: `buildConnectorDeleteOperations(sourceUid, targetUid, oldPredicateId, modelId)`
2. Create new connector: `buildConnectorOperations(source, target, newRelationId, evidences, modelId, userContext)`
3. Both operations sent sequentially

**Deleting connector:**
1. Confirmation dialog
2. `buildConnectorDeleteOperations(sourceUid, targetUid, predicateId, modelId)`
3. Close drawer, clear selectedConnection

---

## Recovery Checkpoint

> **Last completed action:** Plan created
> **Next immediate action:** Phase 0 — Enhance drawer infrastructure (drawerSlice, camSlice, RightDrawer)

## Failed Approaches

| What was tried | Why it failed | Date |
|----------------|---------------|------|
| | | |

## Files Modified

| File | Action | Status |
|------|--------|--------|
| `@noctua.core/components/drawer/drawerSlice.ts` | Update (add 'connectorTable' tab) | Phase 0 |
| `features/gocam/slices/camSlice.ts` | Update (add selectedConnection) | Phase 0 |
| `app/layout/RightDrawer.tsx` | Update (add connector tab routing) | Phase 0 |
| `features/gocam/components/ActivityTable.tsx` | NEW (tree table display) | Phase 1 |
| `features/gocam/components/ActivityTableNode.tsx` | NEW (per-node row renderer) | Phase 1 |
| `features/gocam/components/ActivityTableNode.tsx` | Update (inline editing, menus) | Phase 2 |
| `features/gocam/services/activityOperations.ts` | Update (ensure node-level ops exist) | Phase 2 |
| `features/gocam/components/ConnectorTable.tsx` | NEW (drawer wrapper for RelationForm) | Phase 3 |
| `features/relations/components/RelationForm.tsx` | Minor updates (if needed) | Phase 3 |
| `features/gocam/components/ActivityDetails.tsx` | Delete (replaced by ActivityTable) | Phase 4 |

## Blockers
- None currently

## Notes
- **ActivityTable reads Activity model directly** — it does NOT use activityFormSlice. Inline edits send individual Barista operations. This keeps the table lightweight and avoids form/model state conflicts.
- **ActivityForm.tsx is still the full-edit experience** — the table's "Edit Activity" opens the form dialog. The table provides quick inline tweaks.
- **Tree building is a pure function** — `buildDisplayTree(activity)` returns two trees from the Activity's nodes/edges. No Redux, no side effects.
- **The existing RelationForm is already 95% complete** — ConnectorTable is mostly a drawer wrapper with header, activity labels, and unsupported-relation alert.
- **Evidence inline editing is the most complex part** — each evidence edit needs a targeted Barista operation. Consider batching if performance is an issue.
- **Expand/collapse is local state** — no need to persist in Redux. All nodes start expanded.

## Additional Context

### Angular Services That Map to React

| Angular Service | React Equivalent |
|----------------|------------------|
| `CamService.onSelectedActivityChanged` | `camSlice.selectedActivity` + `useAppSelector` |
| `NoctuaActivityEntityService.deleteActivityNode()` | `buildDeleteNodeOperations()` + `updateGraphModel()` |
| `NoctuaActivityConnectorService.initializeForm()` | `dispatch(resetSelection())` + `dispatch(setConnectorEvidences())` |
| `NoctuaActivityConnectorService.saveActivity()` | `buildConnectorOperations()` + `updateGraphModel()` |
| `NoctuaActivityConnectorService.deleteConnectorEdge()` | `buildConnectorDeleteOperations()` + `updateGraphModel()` |
| `NoctuaFormConfigService.decisionTree` | `decisionTree` constant in `models/decisionTree.ts` |
| `InlineEditorService` | Local `useState(editingTerm)` per node |
| `NoctuaConfirmDialogService` | MUI `Dialog` with confirm/cancel |
| `NoctuaFormDialogService.openToast()` | MUI `Snackbar` (to be added) |

### Existing Barista Operations (activityOperations.ts)

Already available:
- `buildCreateActivityOperations(root, modelId, userContext)` ✓
- `buildEditActivityOperations(root, existingActivity, modelId, userContext)` ✓
- `buildDeleteActivityOperations(activity, modelId)` ✓
- `buildAddEvidenceToEdgeOperations(sourceUid, targetUid, predicateId, evidence, modelId, userContext)` ✓
- `buildRemoveEvidenceOperations(evidenceUid, sourceUid, targetUid, predicateId, modelId)` ✓
- `buildEditIndividualTypeOperations(nodeUid, newTypeId, modelId)` ✓
- `buildEditEvidenceAnnotationOperations(evidenceUid, key, oldValue, newValue, modelId)` ✓

May need to add:
- `buildAddNodeOperations(parentUid, predicateId, typeId, modelId, userContext)` — add a new child node with edge to parent
- Ensure existing operations handle all edge cases
