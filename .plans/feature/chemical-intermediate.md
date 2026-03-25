# Task: Chemical Intermediate & Connect via Chemical Intermediate

**Status:** ACTIVE
**Branch:** dev

## Goal
Add two missing features to the connector/relation system:
1. **Chemical Intermediate** — a step in the activity connector form that appears when "Provides Input For" is selected, showing chemical participants from both activities and letting the user select which chemicals connect them
2. **Connect via Chemical Intermediate** — the button/trigger in the connector form that opens the chemical participant selection UI

When done, users can select "Provides Input For" between two activities, click "Connect via Chemical Intermediate", pick shared/unique chemical participants, provide evidence, and save — creating `has_output` + `has_input` edges through chemical nodes.

## Context
- **Angular chemical-connector source:** `C:\work\go\noctua-visual-pathway-editor\src\app\main\apps\noctua-form\cam\activity\chemical-connector-form\`
- **Angular activity-connector source:** `C:\work\go\noctua-visual-pathway-editor\src\app\main\apps\noctua-form\cam\activity\activity-connector-form\`
- **Angular connector service:** `C:\work\go\noctua-visual-pathway-editor\src\@noctua.form\services\activity-connector.service.ts`
- **Angular data-utils:** `C:\work\go\noctua-visual-pathway-editor\src\@noctua.form\data\config\data-utils.ts`
- **React RelationForm:** `src/features/relations/components/RelationForm.tsx`
- **React decision tree:** `src/features/relations/models/decisionTree.ts`
- **React connector services:** `src/features/relations/services/connectorServices.ts`
- **React Relations constants:** `src/@noctua.core/models/relations.ts` (HAS_INPUT=RO:0002233, HAS_OUTPUT=RO:0002234 already defined)

## Current State

### What works now:
- `RelationForm.tsx` — full connector form with relationship/effect/directness radio selectors, evidence, save/delete
- Decision tree resolves "Provides Input For" → `RO:0002413` (directly_provides_input_for)
- `ConnectorTable.tsx` — drawer wrapper for RelationForm
- Relations constants include `HAS_INPUT` and `HAS_OUTPUT`
- Molecule activities exist in the system (ActivityType.MOLECULE, CHEBI:24431)
- `connectorServices.ts` builds Barista operations for connectors

### What's missing:
1. **No chemical participant fetching** — when an MF term is set on an activity, its chemical participants (from GOlr `neighborhoodGraphJson`, filtered by RO:0000057 has_participant) are never fetched or stored
2. **No "Connect via Chemical Intermediate" button** — the RelationForm doesn't show this option when "Provides Input For" is selected
3. **No ChemicalConnectorForm** — the UI for selecting chemicals from both activities, categorized as common/upstream-only/downstream-only, with evidence entry
4. **No `saveChemicalParticipants` operation** — the Barista operations to create `has_output`/`has_input` edges through chemical nodes

## How It Works in Angular

### Flow
1. User connects two activities (Activity A → Activity B) and selects "Provides Input For"
2. The connector form's `ConnectorRule` sets `displaySection.chemicalIntermediate = true`
3. A "Connect via Chemical Intermediate" button appears if either activity has `chemicalParticipants` on its MF node
4. Clicking the button opens the `ChemicalConnectorForm`
5. The form shows three groups of chemicals:
   - **Common** — participants found in BOTH activities' MF terms
   - **Upstream only** — participants only in the source activity's MF term
   - **Downstream only** — participants only in the target activity's MF term
6. Each chemical is a checkbox row: `[✓] CHEBI:12345 — chemical name`
7. User selects chemicals and optionally provides evidence
8. Save creates for each selected chemical:
   - `sourceActivity.mfNode --[has_output]--> ChemicalNode`
   - `targetActivity.mfNode <--[has_input]-- ChemicalNode`

### Where Chemical Participants Come From
- When an MF term is set, the system calls GOlr `getTermDetail(mfTermId)`
- The response includes `neighborhoodGraphJson` — a JSON graph with nodes and edges
- Filter edges by predicate `RO:0000057` (has_participant)
- Extract the objects → those are the chemical participant IDs and labels
- Store them as `chemicalParticipants: Array<{id: string, label: string}>` on the MF node

### Data Model (Angular)
```
ConnectorActivity.rule.displaySection.chemicalIntermediate: boolean
ActivityNode.chemicalParticipants: Array<{id: string, label: string}>

// Chemical items categorized:
commonItems = intersection(subject.chemicalParticipants, object.chemicalParticipants)
subjectItems = difference(subject.chemicalParticipants, object.chemicalParticipants)
objectItems = difference(object.chemicalParticipants, subject.chemicalParticipants)
```

### Barista Operations
For each selected chemical, two triples are created:
```
Triple(subjectMfNode, chemicalNode, has_output)  // upstream produces chemical
Triple(objectMfNode, chemicalNode, has_input)     // downstream consumes chemical
```
Plus the activity-to-activity edge remains (`directly_provides_input_for`).

---

## Steps

### Phase 1: Chemical Participant Fetching & Storage

Add the ability to fetch and store chemical participants for activities.

**Files:**
- `src/features/gocam/models/cam.ts` — add `chemicalParticipants` to `GraphNode`
- `src/features/gocam/services/graphServices.ts` — parse `neighborhoodGraphJson` to extract participants
- `src/features/search/services/searchService.ts` or new lookup service — GOlr term detail endpoint
- `src/features/gocam/slices/camSlice.ts` or RTK Query — store/cache participants per MF term

**1.1 — Extend GraphNode model:**
- Add `chemicalParticipants?: Array<{id: string, label: string}>` to GraphNode
- This is populated after fetching term details from GOlr

**1.2 — GOlr term detail lookup:**
- Need an endpoint/query that fetches term detail including `neighborhoodGraphJson`
- Angular uses `noctuaLookupService.getTermDetail(termId)` → parses `neighborhoodGraphJson`
- React: add RTK Query endpoint or utility that calls GOlr for term detail
- Extract participants: filter edges by `pred === "RO:0000057"`, map to `{id: obj, label: nodeMap.get(obj)}`

**1.3 — Trigger participant fetch:**
- When CAM model is loaded and activities are extracted, for each activity with an MF term, fetch chemical participants
- OR: fetch participants lazily when the connector form opens and "Provides Input For" is selected
- Decision: **lazy fetch** is simpler — only fetch when the chemical connector UI is about to be shown

**Verify:** Given an activity with MF term GO:0004674 (kinase), fetching participants returns CHEBI chemical entities.

---

### Phase 2: Chemical Connector Form UI

Build the chemical participant selection form.

**Files:**
- `src/features/relations/components/ChemicalConnectorForm.tsx` — NEW
- `src/features/relations/services/chemicalConnectorUtils.ts` — NEW (participant categorization + set operations)

**2.1 — Participant categorization utility:**
```ts
function categorizeParticipants(
  subjectParticipants: Array<{id: string, label: string}>,
  objectParticipants: Array<{id: string, label: string}>
): {
  common: Array<{id: string, label: string}>
  subjectOnly: Array<{id: string, label: string}>
  objectOnly: Array<{id: string, label: string}>
}
```
- Common = items in both arrays (match by `id`)
- SubjectOnly = items in subject but not object
- ObjectOnly = items in object but not subject

**2.2 — ChemicalConnectorForm component:**

Layout (matching Angular `chemical-connector-form.component.html`):
```
┌──────────────────────────────────────────────┐
│ Participants common to upstream & downstream │
│ [✓] CHEBI:12345 — water                     │
│ [✓] CHEBI:67890 — ATP                       │
├──────────────────────────────────────────────┤
│ Participants in upstream activity only       │
│ [ ] CHEBI:11111 — glucose                   │
├──────────────────────────────────────────────┤
│ Participants in downstream activity only     │
│ [ ] CHEBI:22222 — ADP                       │
├──────────────────────────────────────────────┤
│ Evidence (optional)                          │
│ [Evidence Code] [Reference] [With/From]      │
│ + Add Evidence                               │
├──────────────────────────────────────────────┤
│                        [Cancel] [Save]       │
└──────────────────────────────────────────────┘
```

- Each chemical row: checkbox + CHEBI ID + label
- Common participants are pre-checked by default (matching Angular)
- Evidence section with same pattern as RelationForm evidence rows
- Save dispatches the chemical participant operations

**2.3 — State management:**
- Local component state for checkbox selections and evidence (no Redux needed — this is a transient form)
- `selectedChemicals: Set<string>` (chemical IDs)
- `evidence: EvidenceForm[]`

**Verify:** Form displays categorized chemicals, checkboxes toggle, evidence can be added.

---

### Phase 3: Integration into RelationForm

Add the "Connect via Chemical Intermediate" button to the existing RelationForm.

**Files:**
- `src/features/relations/components/RelationForm.tsx` — add chemical intermediate section
- `src/features/relations/models/decisionTree.ts` — add display rule for chemical intermediate

**3.1 — Display rule:**
- When relationship is `PROVIDES_INPUT_FOR` AND connector type is `ACTIVITY_ACTIVITY`:
  - Show the "Connect via Chemical Intermediate" button
  - Button is enabled only if at least one activity has chemical participants (fetched or available)

**3.2 — RelationForm integration:**
- Add state: `showChemicalConnector: boolean`
- After the "Suggested Causal Relation" section, conditionally render:
  - If `shouldShowChemicalIntermediate`:
    - A button: "Connect via Chemical Intermediate"
    - On click: set `showChemicalConnector = true`
    - Renders `ChemicalConnectorForm` inline (or in a dialog — check Angular for preference)
- Angular opens it as a separate form panel within the same drawer space

**3.3 — Props passing:**
- ChemicalConnectorForm needs: `sourceActivity`, `targetActivity`, `modelId`, `userContext`
- It handles its own save independently from the main connector save

**Verify:** Select "Provides Input For" between two activities → "Connect via Chemical Intermediate" button appears → clicking opens chemical form → can select chemicals and save.

---

### Phase 4: Barista Operations for Chemical Participants

Build the save operations that create chemical intermediate edges.

**Files:**
- `src/features/relations/services/connectorServices.ts` — add `buildChemicalParticipantOperations`

**4.1 — Build operations:**
```ts
function buildChemicalParticipantOperations(
  subjectMfNode: GraphNode,    // source activity's MF node
  objectMfNode: GraphNode,     // target activity's MF node
  chemicals: Array<{id: string, label: string}>,
  evidence: EvidenceForm[],
  modelId: string,
  userContext?: UserContext
): Operation[]
```

For each selected chemical:
1. Create a new individual (the chemical node) with type = chemical.id
2. Create edge: `subjectMfNode --[has_output (RO:0002234)]--> chemicalNode`
3. Create edge: `objectMfNode --[has_input (RO:0002233)]--> chemicalNode`
4. Attach evidence to the edges (if provided)

This follows the same Barista operation patterns used in `activityOperations.ts`.

**4.2 — Wire save in ChemicalConnectorForm:**
- On save: call `buildChemicalParticipantOperations(...)` then `updateGraphModel(ops)`
- Show success toast
- Close the chemical form (but keep the connector form open)

**Verify:** Save chemical intermediate → Barista receives correct triples → CAM model refreshes with new chemical nodes and has_input/has_output edges.

---

### Phase 5: Polish & Edge Cases

**Files:**
- Various — cleanup and edge cases

**5.1 — Loading states:**
- While fetching chemical participants from GOlr: show spinner on the button
- If no participants found: show informational message "No chemical participants found for these molecular functions"

**5.2 — Empty states:**
- If neither activity has an MF term with participants: hide the button entirely
- If all participant lists are empty after fetch: show message, no checkboxes

**5.3 — Already-connected chemicals:**
- If chemical intermediate edges already exist between these activities, pre-check those chemicals
- Detect by looking at existing has_input/has_output edges in the CAM model

**5.4 — Type-check and lint:**
- `npm run type-check`
- `npm run lint:fix`

**Verify:** Full workflow end-to-end: create two activities with MF terms → connect them → select "Provides Input For" → click "Connect via Chemical Intermediate" → select chemicals → save → verify edges in model.

---

## Recovery Checkpoint

> **Last completed action:** All phases implemented — type-check and lint pass
> **Next immediate action:** Manual testing / user review

## Failed Approaches

| What was tried | Why it failed | Date |
|----------------|---------------|------|
| | | |

## Files Modified

| File | Action | Status |
|------|--------|--------|
| `features/gocam/models/cam.ts` | Update (add chemicalParticipants to GraphNode) | Phase 1 |
| GOlr lookup service | NEW or update (term detail + neighborhoodGraph) | Phase 1 |
| `features/relations/components/ChemicalConnectorForm.tsx` | NEW | Phase 2 |
| `features/relations/services/chemicalConnectorUtils.ts` | NEW (categorize participants) | Phase 2 |
| `features/relations/components/RelationForm.tsx` | Update (add chemical intermediate section) | Phase 3 |
| `features/relations/services/connectorServices.ts` | Update (add buildChemicalParticipantOperations) | Phase 4 |

## Blockers
- Need to verify that GOlr term detail endpoint returns `neighborhoodGraphJson` — this is the source of chemical participant data. If the endpoint structure has changed, Phase 1 needs adjustment.

## Notes
- **Chemical Intermediate ≠ Molecule Activity** — A molecule activity is a standalone activity with root type CHEBI:24431. A chemical intermediate is an implicit chemical node created between two regular activities to represent a shared substrate/product. Different concepts, different creation paths.
- **The main connector edge (directly_provides_input_for) is saved separately** — The chemical intermediate edges (has_input/has_output) are additional edges saved alongside the main connector. The RelationForm save and ChemicalConnectorForm save are independent operations.
- **Lazy fetch is preferred** — Don't fetch chemical participants for all activities on model load. Only fetch when the user opens the chemical connector form. This avoids unnecessary API calls.
- **Angular pre-checks common participants** — In the Angular UI, chemicals that appear in both activities are pre-selected. This is a good UX default to preserve.

## Additional Context

### Angular's ConnectorRule.displaySection
The Angular connector form uses a `ConnectorRule` object with `displaySection` flags:
```ts
displaySection = {
  directness: true,
  effectDirection: true,
  chemicalIntermediate: false,  // toggled by relationship selection
}
```
When "Provides Input For" is selected, `chemicalIntermediate` is set to `true`. We don't need this exact pattern in React — a simple derived boolean (`selected.relationshipId === PROVIDES_INPUT_FOR && connectorType === ACTIVITY_ACTIVITY`) suffices.

### Angular's canConnectViaChemicals()
```ts
private canConnectViaChemicals(): boolean {
  return this.connectorActivity.connectorType === ConnectorType.ACTIVITY_ACTIVITY &&
    (this.connectorActivity.subjectNode.chemicalParticipants?.length > 0 ||
      this.connectorActivity.objectNode.chemicalParticipants?.length > 0);
}
```
This gates the button visibility. In React, this translates to checking if fetched participants are non-empty for either activity.

### RDF Pattern Created
```
subjectActivity.mfNode --[RO:0002234 has_output]--> CHEBI:xxxxx (chemical)
objectActivity.mfNode  --[RO:0002233 has_input]-->  CHEBI:xxxxx (chemical)
subjectActivity.mfNode --[RO:0002413 directly_provides_input_for]--> objectActivity.mfNode
```
The first two edges are created by the chemical connector form. The third edge is created by the normal RelationForm save.
