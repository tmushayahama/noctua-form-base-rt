# Task: Fix Activity Form & Connector Form — Full Angular Parity

**Status:** COMPLETE
**Branch:** main

## Goal

Make the Activity Form (create + edit) and Connector Form work exactly like the Angular app: multiple evidence per edge, search annotations integration, connector save/edit to API, activity type switching, NOT qualifier, form validation, and inline editing from ActivityDetails. Every form interaction the Angular app supports should work in React.

## Context

- **Angular source:** `C:\work\go\noctua-visual-pathway-editor\src\@noctua.form\` + `src\app\main\apps\noctua-form\`
- **React target:** `C:\work\go\noctua-form-base-rt\src\features\gocam\` + `src\features\relations\`
- **Triggered by:** Forms are ~60% complete; evidence, connector save, edit mode, activity types are broken or missing

### Related Files

**React (modify):**
| File | Role |
|------|------|
| `src/features/gocam/models/cam.ts` | Data models (TreeNode, EvidenceForm, Activity) |
| `src/features/gocam/slices/activityFormSlice.ts` | Form tree state (reducers for nodes, evidence) |
| `src/features/gocam/components/forms/ActivityForm.tsx` | Activity creation/editing form shell |
| `src/features/gocam/components/forms/NodeForm.tsx` | Per-node row: term, evidence, menus |
| `src/features/gocam/components/ActivityDetails.tsx` | Read-only activity table in right drawer |
| `src/features/gocam/services/addActivityServices.ts` | Tree → Barista API operations |
| `src/features/gocam/slices/camApiSlice.ts` | RTK Query endpoints |
| `src/features/gocam/slices/camSlice.ts` | CAM state, selected activity |
| `src/features/relations/components/RelationForm.tsx` | Connector decision tree UI |
| `src/features/relations/components/ConnectorForm.tsx` | Connector wrapper (subject/object labels) |
| `src/features/search/components/Autocomplete2.tsx` | GOlr term autocomplete |
| `src/@noctua.core/components/dialog/dialogSlice.ts` | Global dialog state |
| `src/app/layout/RightDrawer.tsx` | Right drawer with tabs |

**Angular (reference):**
| File | What to learn |
|------|---------------|
| `@noctua.form/services/activity-form.service.ts` | Form init, activity-to-form, form-to-activity, save logic |
| `@noctua.form/services/activity-connector.service.ts` | Connector init, save, edit, evidence |
| `@noctua.form/models/activity/activity.ts` | Activity types, createSave(), createEdit(), presentation |
| `@noctua.form/models/activity/connector-activity.ts` | ConnectorActivity, triple creation, state machine |
| `@noctua.form/models/activity/predicate.ts` | Evidence[] array, addEvidence, removeEvidence |
| `noctua-form/components/activity-form/activity-form.component.ts` | Form template structure |
| `noctua-form/components/entity-form/entity-form.component.ts` | Per-node form with evidence rows |
| `noctua-form/components/activity-connector-form/` | Connector form + evidence |

## Current State

### What works now:
- Basic activity creation (default type: MF + enabledBy + BP + CC)
- GOlr term autocomplete (terms + evidence codes)
- Relations decision tree UI (radio pills resolve to RO ID)
- Tree → API operations for new activities (addActivityServices.ts)
- ActivityDetails read-only view of existing activities
- Graph model parsing from Barista API
- ShEx-based "Add Extension" menu

### What's broken/missing:

| # | Issue | Angular behavior | React status |
|---|-------|-----------------|--------------|
| 1 | **Single evidence per node** | Each edge has `Evidence[]` array; user can add/remove/clone multiple evidence rows | React TreeNode has single `evidence?: EvidenceForm` — only 1 evidence per node |
| 2 | **Evidence menu items are stubs** | Add Evidence, Remove Evidence, Clone Evidence all functional | Menu items exist but `onClick` just closes menu |
| 3 | **Search Annotations doesn't save back** | Dialog returns selected annotations → populates term + evidence on node | Dialog opens but has no callback to write results back to form tree |
| 4 | **Connector form doesn't save to API** | Generates triples, calls `addActivity` or `editConnection` on Barista API | Save button exists but `onSave` prop is undefined/no-op |
| 5 | **Connector evidence missing** | Connector has evidence fields (code + reference + with) | Placeholder text "Evidence editing coming soon" |
| 6 | **No edit mode for existing activities** | Populates form from existing activity, generates diff (createEdit) | Only creation mode; no way to load existing activity into form |
| 7 | **No activity type switching** | Tabs/buttons to switch: default, bpOnly, ccOnly, molecule, proteinComplex | Hardcoded to default (MF root) |
| 8 | **NOT qualifier stub** | Toggles `isComplement` on node → affects save payload and display | Menu item exists but does nothing |
| 9 | **No form validation** | Checks all nodes have terms, evidence codes valid, references valid | Save button always enabled (only checks tree.length > 0) |
| 10 | **ActivityDetails edit/delete buttons are stubs** | Edit opens form pre-filled; delete removes individual node/edge via API | Buttons render but have no click handlers |
| 11 | **Autocomplete doesn't show selected value** | After selecting a term, the field shows the term label | Field shows typed text, not the selected term label |
| 12 | **Clear Values menu item stub** | Clears term + evidence from a node | Menu item does nothing |
| 13 | **Connector delete not implemented** | Removes the causal relation edge via API | Delete button in ConnectorForm exists but no handler |

---

## Steps

### Phase 1: Multiple Evidence Support (Data Model + Slice)

**Goal:** Change TreeNode from single `evidence?` to `evidences: EvidenceForm[]` array. Update slice reducers. This is the foundation everything else builds on.

#### Angular reference:
- `Predicate` class holds `evidence: Evidence[]` array
- `addEvidence(src?)` clones and pushes; `removeEvidence(index)` splices or clears
- Each evidence has: uuid, evidenceCode (Entity), reference (string), with (string)

#### Steps:

- [ ] **1.1 — Update `EvidenceForm` model** (`cam.ts`)
  - Keep existing `EvidenceForm` interface (uuid, evidenceCode, reference, withFrom)
  - Add a factory function `createEmptyEvidence(): EvidenceForm` that returns `{ uuid: uuidv4(), evidenceCode: { id: '', label: '' }, reference: '', withFrom: '' }`

- [ ] **1.2 — Change `TreeNode.evidence` to `TreeNode.evidences`** (`cam.ts`)
  - Replace `evidence?: EvidenceForm` with `evidences: EvidenceForm[]`
  - Default to `[createEmptyEvidence()]` (always at least one row, matching Angular)

- [ ] **1.3 — Update `activityFormSlice` reducers** (`activityFormSlice.ts`)
  - `addRootNode` and `addChildNode`: initialize `evidences: [createEmptyEvidence()]` on each new node
  - Replace `updateNode`'s single evidence handling with:
    - `updateEvidence(uid, evidenceIndex, field, value)` — updates one field of one evidence row
  - Add new reducers:
    - `addEvidence(uid)` — pushes `createEmptyEvidence()` to node's evidences array
    - `removeEvidence(uid, evidenceIndex)` — splices from array; if last one, clear values instead of removing
    - `cloneEvidence(uid, sourceEvidenceIndex)` — deep-clones evidence at index, pushes copy
    - `clearNodeValues(uid)` — resets term to undefined, resets all evidences to empty
    - `toggleNotQualifier(uid)` — toggles `isComplement` boolean on node

- [ ] **1.4 — Add `isComplement` to TreeNode** (`cam.ts`)
  - Add `isComplement?: boolean` field to TreeNode interface
  - Display as "NOT" prefix in NodeForm when true

- [ ] **1.5 — Update `addActivityServices.ts`**
  - Change `addEvidenceForNode` to iterate over `node.evidences[]` instead of single `node.evidence`
  - Generate one evidence individual + annotation per evidence entry
  - Track multiple evidence variable IDs per node: `${nodeId}_evidence_${index}`
  - Update `processRelationships` to attach all evidence variables to edge annotations
  - Handle `isComplement`: when true, wrap the node's class expression in a complement expression (`{ type: "complement", id: termId }`)

---

### Phase 2: NodeForm — Multiple Evidence Rows UI

**Goal:** Render evidence as a repeatable row group. Wire Add/Remove/Clone Evidence menu items.

#### Angular reference:
- `entity-form.component.html` renders `@for (evidence of evidenceFormArrayControls)` — each row has evidence code, reference, with fields
- Menu: Add Evidence, Remove Evidence (per row), Clone Evidence
- Evidence rows are visually stacked under the term field

#### Steps:

- [ ] **2.1 — Refactor NodeForm layout** (`NodeForm.tsx`)
  - Current: single row with [Term] [Evidence] [Reference] [With] [+menu]
  - New layout (matching Angular):
    ```
    [Term field]                                          [+menu]
      Evidence row 1: [Evidence Code] [Reference] [With] [x]
      Evidence row 2: [Evidence Code] [Reference] [With] [x]
      ... (repeating)
    ```
  - Term occupies full width of its column
  - Evidence rows are indented below the term
  - Each evidence row has a small remove button (x) on the right

- [ ] **2.2 — Wire evidence menu items** (`NodeForm.tsx`)
  - "Add Evidence" → `dispatch(addEvidence(node.uid))`
  - "Remove Evidence" → show evidence index submenu or remove last; `dispatch(removeEvidence(node.uid, index))`
  - "Clone Evidence" → `dispatch(cloneEvidence(node.uid, 0))` (clone first evidence by default, or open a picker if multiple)
  - Each evidence row's [x] button → `dispatch(removeEvidence(node.uid, index))`

- [ ] **2.3 — Wire remaining menu items** (`NodeForm.tsx`)
  - "NOT Qualifier" → `dispatch(toggleNotQualifier(node.uid))`; show visual indicator (strikethrough or "NOT" badge) on the term when active
  - "Clear Values" → `dispatch(clearNodeValues(node.uid))`

- [ ] **2.4 — Update evidence change handlers** (`NodeForm.tsx`)
  - Replace `handleEvidenceCodeChange`, `handleReferenceChange`, `handleWithFromChange` with a single parameterized handler:
    ```ts
    handleEvidenceFieldChange(evidenceIndex: number, field: 'evidenceCode' | 'reference' | 'withFrom', value)
    ```
  - Each evidence row passes its index to the handler
  - Dispatches `updateEvidence({ uid, evidenceIndex, field, value })`

- [ ] **2.5 — Fix Autocomplete2 selected value display** (`Autocomplete2.tsx`)
  - Bug: after selecting a GOlr term, the input shows the typed search text, not the selected label
  - Fix: sync `inputValue` with `value` prop — when `value` changes externally (e.g., from Redux), update `inputValue` to `value.label`
  - Add `useEffect` watching `value` prop to set `inputValue = typeof value === 'object' ? value.label : value`

---

### Phase 3: Search Annotations Integration

**Goal:** When user selects annotations from the SearchAnnotations dialog, populate the node's term and evidence in the form tree.

#### Angular reference:
- `SelectEvidenceDialogComponent` shows evidence grouped by term
- User selects one or more evidence items
- Selected evidence is applied to the current node via `entity.predicate.evidence = selectedEvidence`
- The node's term is optionally updated if the user selected a different term

#### Steps:

- [ ] **3.1 — Add callback mechanism to dialog system** (`dialogSlice.ts`)
  - Current: `openDialog({ component, title, customProps })` — fire-and-forget
  - Add: `customProps.targetNodeUid: string` to identify which node opened the dialog
  - The dialog component will dispatch actions directly to the activityForm slice

- [ ] **3.2 — Update SearchAnnotations component**
  - Current: displays annotation results but has no "select" action
  - Add: a "Use This Evidence" button on each evidence row
  - On click: dispatch `updateNode({ uid: targetNodeUid, term: selectedTerm })` and dispatch `setNodeEvidences({ uid: targetNodeUid, evidences: selectedEvidences })` (new reducer)
  - Close dialog after selection

- [ ] **3.3 — Add `setNodeEvidences` reducer** (`activityFormSlice.ts`)
  - New reducer that replaces the entire evidences array for a node
  - Used by SearchAnnotations to bulk-set evidence from annotations
  - Payload: `{ uid: string, evidences: EvidenceForm[] }`

- [ ] **3.4 — Pass `targetNodeUid` from NodeForm to dialog** (`ActivityForm.tsx` / `NodeForm.tsx`)
  - When "Search Annotations" menu item clicked, include `targetNodeUid: node.uid` in dialog customProps
  - SearchAnnotations reads this from props

---

### Phase 4: Connector Form — Save & Evidence

**Goal:** Make the connector form actually save causal relations to the Barista API, with evidence support.

#### Angular reference:
- `ConnectorActivity.createSave()` generates a triple: `{ subject: subjectMfNodeId, object: objectMfNodeId, predicate: selectedRelationId }`
- For creation: `noctuaGraphService.addActivity(cam, [], triples, '', CamOperation.ADD_CAUSAL_RELATION)`
- For editing: `noctuaGraphService.editConnection(cam, removeTriples, addTriples)`
- Evidence is attached to the causal relation edge

#### Steps:

- [ ] **4.1 — Add connector state to Redux** (`relationSlice.ts` or new `connectorFormSlice.ts`)
  - Add: `connectorEvidences: EvidenceForm[]` — evidence for the causal relation
  - Add reducers: `addConnectorEvidence`, `removeConnectorEvidence`, `updateConnectorEvidence`, `resetConnectorEvidences`
  - Initialize with one empty evidence row when connector form opens

- [ ] **4.2 — Add evidence fields to RelationForm** (`RelationForm.tsx`)
  - Replace "Evidence editing coming soon" placeholder with actual evidence rows
  - Reuse the same evidence row pattern from NodeForm (evidence code autocomplete + reference text + with text)
  - Each row has add/remove buttons
  - Wire to connector evidence Redux state

- [ ] **4.3 — Implement connector save service** (new: `connectorServices.ts`)
  - `buildConnectorOperations(sourceActivity, targetActivity, relationId, evidences, modelId)`:
    - Generate edge-add operation: `{ entity: 'edge', operation: 'add', arguments: { subject: sourceActivity.rootNode.uid, object: targetActivity.rootNode.uid, predicate: relationId, 'model-id': modelId } }`
    - For each evidence: generate evidence individual + annotation on the edge
    - Append `{ entity: 'model', operation: 'store', arguments: { 'model-id': modelId } }`
  - Return Operation[] array compatible with `updateGraphModel` mutation

- [ ] **4.4 — Wire save button in ConnectorForm** (`ConnectorForm.tsx` / `RelationForm.tsx`)
  - On save: call `buildConnectorOperations()` → `updateGraphModel(operations)`
  - On success: close connector panel, show success toast
  - On error: show error message
  - Disable save button when: no valid relation selected, or API call in progress

- [ ] **4.5 — Implement connector delete** (`ConnectorForm.tsx`)
  - Build remove operations: `{ entity: 'edge', operation: 'remove', arguments: { subject, object, predicate, 'model-id' } }` + store
  - Wire delete button to call `updateGraphModel(removeOps)`
  - Confirm before deleting (use SimpleDialog or inline confirm)

- [ ] **4.6 — Handle editing existing connectors**
  - When ConnectorForm opens for an existing link (double-click), look up the existing `activityConnection` edge from `model.activityConnections`
  - Pre-populate: relationship selection (via `reverseLookup(existingEdge.id)`), evidence from edge
  - On save: generate remove-old-edge + add-new-edge operations (edit = delete + recreate)

---

### Phase 5: Edit Existing Activities

**Goal:** Load an existing activity into ActivityForm for editing, generate diff operations.

#### Angular reference:
- `activity-form.service.ts:initializeForm()` with state = `ActivityState.editing`
- `activity.presentation` generates a structured view of nodes/edges for form binding
- `createEdit()` compares original activity with modified form → generates add/remove operations
- After save: `reinitializeForm()` to reflect API response

#### Steps:

- [ ] **5.1 — Add `loadActivityIntoForm` reducer** (`activityFormSlice.ts`)
  - New reducer: `loadActivity(activity: Activity)`
  - Converts an existing `Activity` (from `model.activities[]`) into a `TreeNode[]` tree:
    - Root node = activity's molecularFunction node (term = { id, label }, rootTypes = [MF])
    - enabledBy child = GP node (relation = ENABLED_BY)
    - Other edges become children with appropriate relations and rootTypes
    - Each edge's evidence[] maps to node's `evidences: EvidenceForm[]`
  - Sets a new state field: `editingActivityUid: string | null`

- [ ] **5.2 — Add `editingActivityUid` to form state** (`activityFormSlice.ts`)
  - When non-null, form is in edit mode (shows "Update" instead of "Save")
  - `resetForm()` clears this back to null

- [ ] **5.3 — Build edit operations service** (`addActivityServices.ts`)
  - New function: `buildEditOperations(originalActivity, modifiedTree, modelId)`:
    - Compare original nodes vs modified tree nodes
    - For changed terms: generate remove-old-individual + add-new-individual + update-edges
    - For changed evidence: generate remove-old-evidence + add-new-evidence
    - For added nodes: generate add-individual + add-edge
    - For removed nodes: generate remove-edge + remove-individual
  - This is the most complex part — Angular's `createEdit()` diffs old vs new triples

- [ ] **5.4 — Wire edit button in ActivityDetails** (`ActivityDetails.tsx`)
  - Edit button on activity header → dispatches `loadActivity(activity)` → opens ActivityForm in dialog/drawer
  - Form shows pre-filled values from existing activity
  - Submit button says "Update" and calls `buildEditOperations()`

- [ ] **5.5 — Wire delete buttons in ActivityDetails** (`ActivityDetails.tsx`)
  - Delete on individual node/edge row → confirm → generate remove operations for that specific node
  - Delete on evidence row → confirm → generate remove-evidence operations
  - These are granular edits, not whole-activity deletes

---

### Phase 6: Activity Type Switching

**Goal:** Support all 5 activity types from Angular: default, bpOnly, ccOnly, molecule, proteinComplex.

#### Angular reference:
- `createActivityModel(activityType)` creates different node structures per type
- `setActivityType()` reinitializes the form with new structure
- ccOnly creates multiple separate activities (one per CC)
- molecule has a CHEMICAL_ENTITY root instead of MF

#### Steps:

- [ ] **6.1 — Add `activityType` to form state** (`activityFormSlice.ts`)
  - New field: `activityType: ActivityType` (default = 'activity')
  - New reducer: `setActivityType(type)` — clears tree and reinitializes with type-appropriate structure:
    - **default (activity):** MF root → [ENABLED_BY → MOLECULAR_ENTITY, PART_OF → BP, OCCURS_IN → CC]
    - **bpOnly:** MF root → [ENABLED_BY → MOLECULAR_ENTITY, PART_OF → BP] (no CC)
    - **ccOnly:** MOLECULAR_ENTITY root → [LOCATED_IN → CC] (no MF)
    - **molecule:** CHEMICAL_ENTITY root → [] (just the chemical entity, no children)
    - **proteinComplex:** MF root → [ENABLED_BY → PROTEIN_CONTAINING_COMPLEX, PART_OF → BP, OCCURS_IN → CC]

- [ ] **6.2 — Add type selector to ActivityForm** (`ActivityForm.tsx`)
  - Row of toggle buttons or tabs above the form: Activity | BP Only | CC Only | Molecule | Protein Complex
  - Switching type dispatches `setActivityType()` which rebuilds the tree
  - Warn user if form has unsaved data before switching

- [ ] **6.3 — Handle ccOnly special save** (`addActivityServices.ts`)
  - ccOnly creates N separate activities (one per CC edge) — each is an independent GP→CC annotation
  - Modify `convertTreeToJson` to detect ccOnly mode and generate separate activity operations per CC node

- [ ] **6.4 — Handle molecule type** (`addActivityServices.ts`)
  - Molecule type just creates a single individual with CHEMICAL_ENTITY type
  - No edges needed (it's a standalone node)

---

### Phase 7: Form Validation

**Goal:** Prevent saving invalid forms. Show errors inline.

#### Angular reference:
- `getActivityFormErrors()` checks every node in form
- Errors: missing GP term, missing MF term, invalid evidence codes, missing references for certain evidence types
- `enableSubmit` checks all errors before enabling save

#### Steps:

- [ ] **7.1 — Create validation utility** (new: `formValidation.ts`)
  - `validateActivityForm(tree, activityType): ValidationError[]`
  - Checks:
    - Root node has a term selected
    - enabledBy node has a term (for default, bpOnly, proteinComplex types)
    - At least one evidence row per node has a valid evidence code
    - Evidence reference is not empty when evidence code is set
  - Returns array of `{ nodeUid, field, message }` objects

- [ ] **7.2 — Show validation errors in form** (`ActivityForm.tsx` / `NodeForm.tsx`)
  - Run validation on every tree change (via `useMemo`)
  - Pass errors to NodeForm components
  - Highlight fields with errors (red border, error text below field)
  - Disable Save button when errors exist
  - Show error summary above Save button

- [ ] **7.3 — Validate connector form** (`RelationForm.tsx`)
  - Require: relation is resolved (not null)
  - Require: at least one evidence with evidence code
  - Disable Save when invalid

---

### Phase 8: Polish & Edge Cases

**Goal:** Small fixes and UX improvements for full parity.

- [ ] **8.1 — Loading/disabled states during API calls**
  - Show spinner on Save button while `updateGraphModel` is pending
  - Disable form inputs during save
  - Show success/error toast (replace `console.log` calls)

- [ ] **8.2 — Form reset after successful save**
  - After successful creation: reset form, close dialog
  - After successful edit: close form, refresh activity in right drawer

- [ ] **8.3 — Autocomplete edge cases** (`Autocomplete2.tsx`)
  - Handle obsolete terms: show warning icon, prevent selection (Angular checks `isObsolete`)
  - Handle `notAnnotatable` flag correctly (currently inverted — `!option.notAnnotatable` disables, should be the opposite)
  - Clear input on backspace/delete when a term is selected (reset to search mode)

- [ ] **8.4 — Reference/With field behavior**
  - Reference field: accept free text (PMID:xxx, DOI:xxx) — currently works as plain text
  - With field: accept free text (UniProtKB:xxx) — currently works as plain text
  - Both should trim whitespace on blur

- [ ] **8.5 — Connector form: pre-select from existing connection**
  - When opening connector for an existing edge, auto-populate the relation selection
  - Use `reverseLookup()` from decisionTree service to map existing RO ID → radio selections

---

## Recovery Checkpoint

> **Update this after every change**

- **Last completed action:** All 8 phases complete. Lint + type-check clean.
- **Next immediate action:** None — plan is complete
- **Recent commands run:** `npx eslint`, `npx tsc --noEmit`, `npx prettier --write`
- **Uncommitted changes:** All form fixes across 15+ files
- **Environment state:** Working tree has uncommitted changes on main branch

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
| (none yet) | | |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
| `src/features/gocam/models/cam.ts` | Added `createEmptyEvidence()`, changed `evidence?` → `evidences[]`, added `isComplement`, added `BP_ONLY`/`CC_ONLY` types | Done |
| `src/features/gocam/slices/activityFormSlice.ts` | Full rewrite: multiple evidence reducers, `loadActivity`, `setActivityType`, `activityToTree()` | Done |
| `src/features/gocam/services/addActivityServices.ts` | Multi-evidence iteration, `isComplement` support | Done |
| `src/features/gocam/services/formValidation.ts` | New: `validateActivityForm()` | Done |
| `src/features/gocam/components/forms/NodeForm.tsx` | Full rewrite: evidence rows, menu wiring | Done |
| `src/features/gocam/components/forms/ActivityForm.tsx` | Activity type selector, edit mode, validation display | Done |
| `src/features/gocam/components/forms/SearchAnnotations.tsx` | Redux dispatch integration, close-on-select | Done |
| `src/features/gocam/components/ActivityDetails.tsx` | Edit button, delete handlers, edit dialog | Done |
| `src/features/relations/slices/relationSlice.ts` | Connector evidence state + reducers | Done |
| `src/features/relations/services/connectorServices.ts` | New: `buildConnectorOperations()`, `buildConnectorDeleteOperations()` | Done |
| `src/features/relations/components/RelationForm.tsx` | Evidence fields, save/delete handlers, pre-populate | Done |
| `src/features/relations/components/ConnectorForm.tsx` | Pass-through props (existingEdge, onSaved) | Done |
| `src/features/search/components/Autocomplete2.tsx` | Value sync useEffect, obsolete fix, trim on blur | Done |
| `src/@noctua.core/components/dialog/GlobalDIalog.tsx` | Simplified type map | Done |
| `src/app/PathwayViewer.tsx` | existingEdge state, pass edge info to ConnectorForm | Done |

## Blockers
- None currently

## Notes

### Key Architecture Decisions

1. **Multiple evidence as array, not FormArray:** Angular uses reactive FormArrays for evidence. React equivalent: store `evidences: EvidenceForm[]` in Redux, render with `.map()`. No React form library needed — Redux is the form state.

2. **Edit mode via diff:** Angular compares original activity with modified form to generate minimal API operations (add/remove triples). This is the hardest part — Phase 5.3 is the most complex step. Consider a simpler approach first: delete-and-recreate the entire activity instead of diffing, then optimize later.

3. **Evidence per edge, not per node:** In the Angular model, evidence belongs to the `Predicate` (the edge between nodes). In our tree model, evidence is stored on the child node (which implicitly represents the parent→child edge). This is semantically equivalent since each child has exactly one parent edge.

4. **ccOnly special case:** ccOnly mode creates N separate activities from one form submission. This is a multi-activity batch operation that needs careful handling in `addActivityServices.ts`.

5. **Connector operations use raw node UIDs:** Unlike activity creation (which uses assign-to-variable), connector operations reference existing node UIDs from the loaded graph model. The source/target are `activity.rootNode.uid` (the MF node's server-assigned ID).

### Phase Priority

Phases 1-4 are **critical** — they fix the most visible broken functionality. Phase 5 (edit mode) is important but more complex. Phases 6-8 are enhancements that round out parity. Recommend implementing in order.

### Angular Patterns → React Mapping

| Angular Pattern | React Equivalent |
|----------------|-----------------|
| `BehaviorSubject<FormGroup>` | Redux slice + `useAppSelector` |
| `FormArray` | `evidences: EvidenceForm[]` in Redux + `.map()` render |
| `FormBuilder.group()` | Redux `createSlice` with typed state |
| `valueChanges.pipe(debounceTime)` | `useEffect` + `setTimeout` debounce (already in Autocomplete2) |
| `MatAutocomplete` | Custom `Autocomplete2` component (already built) |
| `MatRadioGroup` | Custom `RadioPillGroup` component (already built) |
| `Observable.subscribe()` | RTK Query hooks (`useQuery`, `useMutation`) |
| `cloneDeep(evidence)` | `structuredClone()` or spread + map |

## Lessons Learned
<!-- Fill during and after task -->
