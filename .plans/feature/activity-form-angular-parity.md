# Task: Activity Form — Angular Parity Gaps (Data Architecture + UI)

**Status:** ACTIVE
**Branch:** dev

## Goal
Bring the React ActivityForm (graph form) to exact feature parity with the Angular activity form. This is the **graph/visual editor form** — only Default, Molecule, and Protein Complex activity types are in scope. BP-Only and CC-Only are the generic/table annotation form and are NOT in scope.

The Angular form is **data-driven** from `model-definition.ts`, `entity-definition.ts`, `shape-definition.ts`, and `noctua-form-config.ts`. Labels, node structure, display sections, insert menus, and validation all flow from these config objects.

## Context — Angular Data Architecture

### How Angular Builds the Form

```
model-definition.ts (ActivityDescription objects)
  ├── Defines nodes per activity type: label, displaySection, displayGroup, weight, aspect, canDelete, termRequired, skipEvidenceCheck, visible
  ├── Defines triples: subject → object → predicate (from noctuaFormConfig.edge.*)
  └── createActivity(description) builds an Activity from the description

entity-definition.ts (GoCategory objects)
  ├── GO/CHEBI root IDs per node type
  ├── GOlr search parameter setup (baseRequestParams)
  └── generateBaseTerm(categories, overrides) creates ActivityNode with lookup config

shape-definition.ts + shapes.json (ShEx constraints)
  ├── Defines what nodes can be inserted under which parent
  ├── Drives the "Add node" menu dynamically
  └── canInsertEntity map → menu items with labels and range descriptions

noctua-form-config.ts (master config)
  ├── displaySection: { gp, fd }
  ├── displayGroup: { gp, mf, bp, cc }
  ├── edge.*: all RO predicate entities with {id, label}
  ├── rootNode: { mf, bp, cc } with root term IDs + labels
  └── Imports vpe-decision.json for connector decision tree
```

### How React Builds the Form

```
activityTemplates.ts (TermDescriptor objects)
  ├── Minimal descriptors: category + required + relations
  ├── createActivityTemplate(type) → hydrateTemplate(descriptor) → TermNode tree
  └── Labels come from nodeCategories.ts per category ID

nodeCategories.ts
  ├── One NodeCategory per ontology type: id, label, aspect, searchClosureIds
  ├── Constraint relations: what can be inserted under each category
  └── Used for add-node menu and label resolution

activityFormSlice.ts
  ├── initCreateForm(type) → createActivityTemplate → sets root TermNode
  ├── initEditForm(activity) → activityToFormTree → sets root from existing
  └── All form mutations via Redux reducers
```

## In-Scope Activity Types

| Type | Angular Description | React Template |
|------|---------------------|----------------|
| Default | `activityUnitDescription` | `defaultActivity` |
| Molecule | `moleculeDescription` | `moleculeActivity` |
| Protein Complex | `proteinComplexDescription` | `proteinComplexActivity` |

**NOT in scope:** BP-Only (`bpOnlyAnnotationDescription`), CC-Only (`ccOnlyAnnotationDescription`) — these are the generic/table form, not the graph form.

---

## Angular Source Files

| File | Role |
|------|------|
| `@noctua.form/data/config/model-definition.ts` | Activity descriptions: nodes + triples per type |
| `@noctua.form/data/config/entity-definition.ts` | GO categories, GOlr params, generateBaseTerm |
| `@noctua.form/data/config/shape-definition.ts` | ShEx-driven insert menu constraints |
| `@noctua.form/noctua-form-config.ts` | Master config: edges, display groups, root nodes |
| `@noctua.form/models/activity/activity-node.ts` | ActivityNode model (label, displaySection, etc.) |
| `app/.../activity-form/activity-form.component.html` | Form template |
| `app/.../entity-form/entity-form.component.html` | Single node row template |

## React Source Files

| File | Role |
|------|------|
| `features/gocam/data/activityTemplates.ts` | Activity template descriptors |
| `features/gocam/data/nodeCategories.ts` | Node categories + constraints |
| `features/gocam/models/formModels.ts` | TermNode, RelationNode, EvidenceForm |
| `features/gocam/slices/activityFormSlice.ts` | Form state management |
| `features/gocam/components/forms/ActivityForm.tsx` | Form container |
| `features/gocam/components/forms/EntityRow.tsx` | Single node row |
| `features/gocam/services/formValidation.ts` | Validation rules |

---

## Thorough Gap Analysis

### GAP A1: Context-Aware Node Labels

**Angular (`model-definition.ts`):** Labels vary by activity type:

| Type | Node | Angular Label |
|------|------|---------------|
| Default | MF | "Molecular Function" |
| Default | GP | "enabled by (GP)" |
| Default | BP | "(MF) part of (BP)" |
| Default | CC | "(MF) occurs in (CC)" |
| Molecule | Chemical | "Chemical" |
| Molecule | CC | "(Chemical) located in (CC)" |
| Protein Complex | PC | "Protein Complex" |
| Protein Complex | MF | "Molecular Function" (hidden) |
| Protein Complex | BP | "(MF) part of (BP)" |
| Protein Complex | CC | "(MF) occurs in (CC)" |

**React (`nodeCategories.ts`):** One label per category — doesn't vary by context. E.g., CC always gets the same label regardless of whether it's in a Default activity or Molecule activity.

**Fix:** When creating templates per activity type, set context-specific labels on each TermNode in `activityTemplates.ts`.

---

### GAP A2: Form Title by Activity Type

**Angular (`activity-form.component.ts`):**

| Type | Form Title |
|------|------------|
| Default | "Activity Unit Form" |
| Molecule | "Chemical Form" |
| Protein Complex | "Protein Complex Form" |

**React:** No form title in ActivityForm.tsx. The dialog wrapper may have a generic title.

**Fix:** Add activity-type-specific title to form or dialog.

---

### GAP A3: Section Titles by Activity Type

**Angular:**

| Type | Annotated Section | Description Section |
|------|-------------------|---------------------|
| Default | "Gene Product" | "Function Description" |
| Molecule | "Chemical" | "Location (optional)" |
| Protein Complex | "Gene Product" | "Function Description" |

**React (`ActivityForm.tsx` lines 299-326):**
- GP section header: always "Gene Product"
- FD section header: always "Function Description"

**Fix:** Make section titles dynamic. Molecule should show "Chemical" / "Location (optional)".

---

### GAP A4: Hidden Nodes (visible: false)

**Angular:** Protein Complex has `GoMolecularFunction` with `visible: false`. The MF node exists in the data model but is NOT rendered in the form UI.

**React:** No concept of hidden nodes. Every node in the tree is rendered.

**Fix:** Add `visible` flag to TermNode. Skip rendering hidden nodes in ActivityForm/EntityRow.

---

### GAP A5: skipEvidenceCheck Flag

**Angular:** Certain nodes have `skipEvidenceCheck: true`:
- GP nodes (enabled_by) — evidence not required
- Chemical nodes — evidence not required
- Protein Complex node — evidence not required
- Root MF in base descriptions — evidence optional

**React:** Has `required` flag but no `skipEvidenceCheck`. Validation in `formValidation.ts` may incorrectly require evidence for GP or Chemical nodes.

**Fix:** Add `skipEvidenceCheck` flag to TermNode. Update formValidation.ts to respect it.

---

### GAP A6: showEvidence Flag for Molecule Type

**Angular:** Molecule activity Chemical node has `showEvidence: false` — evidence UI is completely hidden for that node.

**React:** Always shows evidence for all nodes.

**Fix:** Add `showEvidence` flag. Hide evidence UI in EntityRow when false.

---

### GAP A7: Protein Complex Warning Text

**Angular (`activity-form.component.html`):**
Shows an alert when activity type is Protein Complex:
> "Note that this should be used rarely, and only in the case where the activity cannot be ascribed to a single subunit of a complex"

**React:** No such warning.

**Fix:** Add warning text in ActivityForm when type is Protein Complex.

---

### GAP A8: Insert Menu Completeness

**Angular:** Uses `shapes.json` (ShEx-derived) to dynamically determine insertable nodes. Menu items show predicate label + range description.

**React (`nodeCategories.ts`):** Uses hardcoded TypeScript constraints. This was a deliberate design choice per project memory.

**Assessment:** Need to verify all Angular graph-form insert menu options are represented in the React constraints. Key items to check:
- From MF: enabled by (GP), enabled by (Protein Complex), part of (BP), occurs in (CC), has input, happens during, causal edges
- From BP: part of (BP)
- From CC: part of (CC/Cell/Anatomy/Organism)
- From GP: part of (Protein Complex)

---

### GAP A9: Autocomplete Suggestion Panel (Same as Connector GAP 18)

The activity form uses the same Autocomplete2 component. All autocomplete panel issues (line-clamp-2 clamping, background color, missing separators, sizing) apply here too. See connector plan GAP 18.

---

## Summary Priority Table

| # | Gap | Severity | Scope |
|---|-----|----------|-------|
| A1 | Context-aware node labels per activity type | Medium | activityTemplates.ts |
| A2 | Form title by activity type | Low | ActivityForm.tsx or dialog |
| A3 | Section titles by activity type (Molecule differs) | Medium | ActivityForm.tsx |
| A4 | Hidden nodes for Protein Complex (visible: false) | Medium | formModels.ts, ActivityForm.tsx |
| A5 | skipEvidenceCheck flag | Medium | formModels.ts, formValidation.ts |
| A6 | showEvidence flag for Molecule Chemical node | Medium | EntityRow.tsx |
| A7 | Protein Complex warning text | Low | ActivityForm.tsx |
| A8 | Insert menu completeness audit | Low | nodeCategories.ts |
| A9 | Autocomplete panel (shared with connector GAP 18) | High | Autocomplete2.tsx |

---

## Steps

### Phase 1: Data Model Flags
- [ ] A4 — Add `visible` flag to TermNode
- [ ] A5 — Add `skipEvidenceCheck` flag to TermNode
- [ ] A6 — Add `showEvidence` flag to TermNode

### Phase 2: Template & Label Updates
- [ ] A1 — Set context-specific labels in activityTemplates.ts per type (especially Molecule CC label)
- [ ] A2 — Add form title based on activity type
- [ ] A3 — Make section titles dynamic by activity type
- [ ] A7 — Add Protein Complex warning text

### Phase 3: Validation & Evidence
- [ ] A5 — Update formValidation.ts to respect skipEvidenceCheck
- [ ] A6 — Hide evidence UI for showEvidence: false nodes in EntityRow

### Phase 4: Completeness
- [ ] A8 — Audit insert menu options against Angular shapes for graph form
- [ ] A9 — Fix autocomplete panel (see connector plan GAP 18)

---

## Recovery Checkpoint

> **Last completed action:** Architecture comparison — 9 gaps documented (scoped to graph form only)
> **Next immediate action:** User review of plan

## Files Modified

| File | Action | Status |
|------|--------|--------|
| `.plans/feature/activity-form-angular-parity.md` | Updated plan (removed BP-Only/CC-Only) | Done |

## Blockers
- None

## Notes
- BP-Only and CC-Only are NOT in scope — they are the generic/table annotation form
- The React form architecture is deliberately simpler than Angular's — inference from predicate type works for all 3 in-scope activity types
- Insert menu (GAP A8) was a deliberate design choice to use typed TS instead of shapes.json — just need to verify completeness
- Autocomplete panel (GAP A9) is shared with connector form — fix once in Autocomplete2.tsx

## Additional Context

### Angular Node Labels for In-Scope Types (from model-definition.ts)

**Default Activity (`activityUnitDescription`):**
```
MF: "Molecular Function" (fd/mf, F, weight 1, required, canDelete:false)
GP: "enabled by (GP)" (gp/gp, weight 2, required, skipEvidenceCheck, canDelete:false)
BP: "(MF) part of (BP)" (fd/bp, P, weight 10)
CC: "(MF) occurs in (CC)" (fd/cc, C, weight 20)
Triples: MF→GP (enabledBy), MF→BP (partOf), MF→CC (occursIn)
```

**Molecule (`moleculeDescription`):**
```
Chemical: "Chemical" (gp/gp, weight 1, required, skipEvidenceCheck, showEvidence:false, canDelete:false)
CC: "(Chemical) located in (CC)" (fd/cc, C, weight 20)
Triples: Chemical→CC (locatedIn)
```

**Protein Complex (`proteinComplexDescription`):**
```
PC: "Protein Complex" (gp/gp, weight 2, required, skipEvidenceCheck, canDelete:false)
MF: "Molecular Function" (fd/mf, F, weight 1, required, visible:false, canDelete:false)
BP: "(MF) part of (BP)" (fd/bp, P, weight 10)
CC: "(MF) occurs in (CC)" (fd/cc, C, weight 20)
Triples: MF→PC (enabledBy), MF→BP (partOf), MF→CC (occursIn)
```
