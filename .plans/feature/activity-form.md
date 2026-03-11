# Task: Simplify Activity Form System

**Status:** ACTIVE
**Branch:** dev

## Goal
Rewrite the activity form from over-engineered flat-map architecture to a simple recursive tree. Eliminate unnecessary abstractions (flat maps, UID cross-references, tree selectors, tree builders, factory functions). The form has 4-8 nodes — keep it simple.

## Context
- **Target:** `src/features/gocam/`
- **Angular reference (domain behavior only):** `C:\work\go\noctua-visual-pathway-editor\.plans\docs\form-system-for-react-rewrite.md`
- **Triggered by:** Current implementation is Angular-style config hell — flat normalized maps, factory functions, type guards, tree selectors, tree builders. Not React.

## What's Wrong Now
1. **Flat maps + UID cross-references** — `Record<string, TermForm>`, `Record<string, RelationForm>`, `relationUids[]` arrays requiring factories to wire UIDs, selectors to rebuild trees
2. **formTreeBuilder.ts** — exists solely to convert between flat maps and trees (shouldn't need to exist)
3. **Factory functions** — `createTermForm()`, `createRelationForm()`, `createEvidenceForm()` with 8+ params each
4. **`selectFormTree` selector** — rebuilds recursive tree from flat maps on every render
5. **Templates are imperative** — 30 lines of UID wiring to describe "MF → enabled_by → GP"
6. **`formModels.ts`** has both flat types AND tree types — two representations of the same thing

## New Architecture: Simple Recursive Tree

### Data Model (direct in Redux, Immer handles mutations)
```
ActivityFormState
  activityType: 'activity' | 'molecule' | 'proteinComplex' | null
  mode: 'create' | 'edit'
  existingActivityUid: string | null
  root: TermNode | null
  isDirty: boolean
  errors: ValidationError[]

TermNode
  uid: string
  category: string            ← RootTypes ID (e.g. 'GO:0003674')
  label: string               ← display name from nodeCategories
  term: GOlrResponse | null   ← selected ontology term
  aspect: Aspect | null
  rootTypes: string[]         ← for GOlr filtering
  isComplement: boolean
  canDelete: boolean
  required: boolean
  relations: RelationNode[]

RelationNode
  uid: string
  predicate: Entity           ← { id, label } from Relations enum + shapeTerms
  target: TermNode
  evidence: EvidenceForm[]

EvidenceForm                  ← unchanged
  uid: string
  evidenceCode: Entity
  reference: string
  withFrom: string
```

### Why Tree
- **4-8 nodes max** — O(n) traversal is trivial, no need for O(1) flat maps
- **Immer** handles nested mutations natively — `state.root.relations[0].target.term = x` just works
- **No selectors needed** — the state IS the tree, components read it directly
- **Templates are declarative** — describe the shape, one function hydrates with UIDs
- **Operations builder** walks the tree directly — no map iteration
- **One representation** — no flat-vs-tree duality

### Templates: Declarative Descriptors
```ts
// A template is just a shape description — no UIDs, no factories
interface TermDescriptor {
  category: NodeCategory
  required?: boolean
  canDelete?: boolean
  relations?: RelationDescriptor[]
}

interface RelationDescriptor {
  predicateId: string          // Relations enum value
  target: TermDescriptor
}

const defaultActivity: TermDescriptor = {
  category: molecularFunction,
  required: true,
  relations: [
    { predicateId: Relations.ENABLED_BY, target: { category: molecularEntity, required: true } },
    { predicateId: Relations.PART_OF, target: { category: biologicalProcess } },
    { predicateId: Relations.OCCURS_IN, target: { category: cellularComponent } },
  ],
}
```

One `hydrateTemplate(descriptor)` function recursively creates live `TermNode` tree with UIDs + empty evidence.

## What to Keep (no changes)
| File | Why |
|------|-----|
| `data/nodeCategories.ts` | Clean data definitions with named relation properties. Already correct. |
| `data/shapeTerms.ts` | Label lookup table + `predicate()` helper. Already correct. |
| `@noctua.core/models/relations.ts` | Relations enum. Already correct. |
| `services/activityOperations.ts` | Needs update to walk tree instead of flat maps, but logic stays. |
| `services/formValidation.ts` | Needs update to walk tree instead of flat maps, but logic stays. |
| `components/forms/EvidenceRow.tsx` | UI component, needs minor prop changes. |
| `components/forms/AddNodeMenu.tsx` | ShEx-driven menu, minor prop changes. |
| `components/forms/SearchAnnotations.tsx` | Term+evidence picker, minor import changes. |
| `components/dialogs/ActivityFormDialog.tsx` | Simple dialog wrapper. Fine as-is. |

## What to Delete
| File | Why |
|------|-----|
| `services/formTreeBuilder.ts` | Converts flat→tree. No flat maps = no need. Edit mode converts Activity→TermNode directly in the slice or a small helper. |

## What to Rewrite
| File | What changes |
|------|-------------|
| `models/formModels.ts` | Remove flat types (`TermForm`, `RelationForm` with `parentTermUid`/`targetTermUid`/`relationUids`). Replace with `TermNode`, `RelationNode`. Remove tree types (`TermFormTree`, `RelationFormTree`). Remove factory functions. |
| `data/activityTemplates.ts` | Replace imperative factories with declarative `TermDescriptor` objects + one `hydrateTemplate()` function. |
| `slices/activityFormSlice.ts` | State is `{ root: TermNode \| null, ... }`. Reducers use Immer to find+mutate nodes via `findTermNode(root, uid)`. Remove `selectFormTree`. Remove flat map logic. |
| `services/formValidation.ts` | Walk tree recursively instead of iterating flat maps. Same rules. |
| `services/activityOperations.ts` | Walk tree recursively instead of iterating flat maps. Same Barista ops. |
| `components/forms/ActivityForm.tsx` | Read `state.root` directly instead of `selectFormTree`. Minor changes. |
| `components/forms/TermNode.tsx` | Props change from `TermFormTree` to `TermNode`. Minor. |
| `components/forms/RelationRow.tsx` | Props change from `RelationFormTree` to `RelationNode`. Minor. |
| `components/ActivityDetails.tsx` | Import changes for new slice actions. |
| `app/PathwayViewer.tsx` | Import changes only (if any). |

---

## Steps

### Phase 1: Models & Templates
Rewrite data model and templates. No Redux yet — just types and pure data.

**Files:**
- `models/formModels.ts` — rewrite
- `data/activityTemplates.ts` — rewrite

**1.1 — formModels.ts:**
- Define `TermNode`, `RelationNode`, `EvidenceForm` interfaces as shown above
- Define `ActivityFormState` with `root: TermNode | null`
- Define `ValidationError` (unchanged)
- Define `ActivityFormType` (unchanged)
- Small helper: `createEvidenceForm()` — only factory we need (uuid + empty fields)
- No `createTermForm`, no `createRelationForm`, no flat types, no tree types

**1.2 — activityTemplates.ts:**
- Define `TermDescriptor` and `RelationDescriptor` interfaces
- Define 3 template constants: `defaultActivityDescriptor`, `moleculeDescriptor`, `proteinComplexDescriptor`
- `hydrateTemplate(descriptor: TermDescriptor): TermNode` — recursively creates live nodes with UIDs, empty evidence
- `createActivityTemplate(type: ActivityFormType): TermNode` — dispatches to right descriptor + hydrates
- `activityToFormTree(activity: Activity): TermNode` — converts existing Activity into TermNode tree for edit mode (replaces `formTreeBuilder.ts`)

**Verify:** `createActivityTemplate('activity')` returns a TermNode tree: root=MF with 3 relations, each targeting correct node type. `activityToFormTree(existingActivity)` returns TermNode tree with pre-filled terms.

---

### Phase 2: Redux Slice
Rewrite slice for tree state.

**Files:**
- `slices/activityFormSlice.ts` — rewrite

**2.1 — Tree traversal helper:**
```ts
function findTermNode(root: TermNode, uid: string): TermNode | null
function findRelationNode(root: TermNode, uid: string): RelationNode | null
```
Simple recursive search. 4-8 nodes, negligible cost inside Immer.

**2.2 — Reducers:**
- `initCreateForm(type)` — `state.root = createActivityTemplate(type)`
- `loadActivity(activity)` — `state.root = activityToFormTree(activity); state.mode = 'edit'`
- `updateTerm({ uid, term })` — `findTermNode(root, uid).term = term`
- `toggleComplement({ uid })` — `findTermNode(root, uid).isComplement = !...`
- `addEvidence({ relationUid })` — `findRelationNode(root, uid).evidence.push(createEvidenceForm())`
- `removeEvidence({ relationUid, evidenceUid })` — filter evidence array
- `updateEvidence({ relationUid, evidenceUid, field, value })` — find evidence, update field
- `addRelation({ parentUid, predicate, targetCategory })` — push new RelationNode to parent's relations
- `removeRelation({ parentUid, relationUid })` — filter parent's relations array
- `setErrors(errors)` / `resetForm()`

**2.3 — Selectors:**
- `selectFormRoot` — `state.activityForm.root`
- `selectFormMode`, `selectFormErrors`, `selectFormType`, `selectFormIsValid`
- NO `selectFormTree` — the state IS the tree

**Verify:** Dispatch `initCreateForm('activity')`, inspect `state.root` in DevTools — it's a TermNode tree. Dispatch `updateTerm` — node updates in place.

---

### Phase 3: Services
Update validation and operations to walk tree.

**Files:**
- `services/formValidation.ts` — rewrite
- `services/activityOperations.ts` — rewrite
- `services/formTreeBuilder.ts` — delete

**3.1 — formValidation.ts:**
- `validateActivityForm(state: ActivityFormState): ValidationError[]`
- Walk `state.root` recursively: check required terms, evidence on filled relations, reference format
- Same rules as before, just tree traversal instead of flat map iteration

**3.2 — activityOperations.ts:**
- `buildCreateActivityOperations(root: TermNode, modelId): Operation[]`
- Walk tree: for each node with a term → create individual. For each relation → create edge + evidence ops.
- `buildEditActivityOperations(root: TermNode, existingActivity, modelId): Operation[]` — delete existing + recreate
- `buildDeleteActivityOperations(activity, modelId): Operation[]` — unchanged

**3.3 — Delete formTreeBuilder.ts** — no longer needed. `activityToFormTree` lives in `activityTemplates.ts`.

**Verify:** Fill form, call `buildCreateActivityOperations(root, modelId)` — same Barista operations as before.

---

### Phase 4: Components
Update components to use tree directly. Mostly prop type changes.

**Files:**
- `components/forms/ActivityForm.tsx` — minor changes
- `components/forms/TermNode.tsx` — prop type: `TermNode` instead of `TermFormTree`
- `components/forms/RelationRow.tsx` — prop type: `RelationNode` instead of `RelationFormTree`
- `components/forms/EvidenceRow.tsx` — minimal changes (EvidenceForm unchanged)
- `components/forms/AddNodeMenu.tsx` — prop type change
- `components/forms/SearchAnnotations.tsx` — import changes
- `components/ActivityDetails.tsx` — import changes for new slice actions
- `app/PathwayViewer.tsx` — import changes only (if any)

**4.1 — ActivityForm.tsx:**
- Read `selectFormRoot` instead of `selectFormTree`
- Pass `root` to `TermNode` directly (no selector transformation)
- Validation: `validateActivityForm(formState)` — pass full state
- Operations: `buildCreateActivityOperations(root, modelId)` — pass root directly

**4.2 — TermNode.tsx:**
- Change prop type from `TermFormTree` to `TermNode`
- Everything else stays the same (dispatches to slice actions)

**4.3 — RelationRow.tsx:**
- Change prop type from `RelationFormTree` to `RelationNode`
- Everything else stays the same

**4.4 — Other components:**
- `AddNodeMenu.tsx` — prop type: `TermNode` instead of `TermFormTree`
- `SearchAnnotations.tsx` — import `EvidenceForm` from new location
- `ActivityDetails.tsx` — action imports match new slice
- `PathwayViewer.tsx` — verify imports still work

**Verify:** Full workflow: drag stencil → form opens → fill terms → add evidence → save. Edit mode: click activity → edit → modify → save. Both should produce correct Barista operations.

---

## Recovery Checkpoint

> **Last completed action:** All 4 phases implemented + type-check + build pass
> **Next immediate action:** Manual testing / user review

## Failed Approaches

| What was tried | Why it failed | Date |
|----------------|---------------|------|
| Flat maps + UID cross-references + tree selector | Over-engineered. 4-8 nodes don't need normalized storage. Created factory functions, tree builders, dual type representations, imperative template wiring. Looks like Angular, not React. | 2026-03-04 |
| Separate shapeConstraints.ts + shapeUtils.ts | User rejected — shape constraints belong as named properties on nodeCategories, not a separate utility layer. | 2026-03-04 |

## Files Modified

| File | Action | Status |
|------|--------|--------|
| `models/formModels.ts` | Rewrite (simplify) | Phase 1 |
| `data/activityTemplates.ts` | Rewrite (declarative) | Phase 1 |
| `slices/activityFormSlice.ts` | Rewrite (tree state) | Phase 2 |
| `services/formValidation.ts` | Rewrite (walk tree) | Phase 3 |
| `services/activityOperations.ts` | Rewrite (walk tree) | Phase 3 |
| `services/formTreeBuilder.ts` | Delete | Phase 3 |
| `components/forms/ActivityForm.tsx` | Update (minor) | Phase 4 |
| `components/forms/TermNode.tsx` | Update (prop types) | Phase 4 |
| `components/forms/RelationRow.tsx` | Update (prop types) | Phase 4 |
| `components/forms/EvidenceRow.tsx` | Update (minimal) | Phase 4 |
| `components/forms/AddNodeMenu.tsx` | Update (prop types) | Phase 4 |
| `components/forms/SearchAnnotations.tsx` | Update (imports) | Phase 4 |
| `components/ActivityDetails.tsx` | Update (imports) | Phase 4 |

## Blockers
- None

## Notes
- `nodeCategories.ts` and `shapeTerms.ts` stay as-is — they're clean data definitions
- `store.ts` already imports `activityFormSlice` — the export name stays the same
- The key insight: Immer makes nested tree mutations as easy as flat map mutations. `findTermNode(root, uid).term = newTerm` vs `state.terms[uid].term = newTerm` — same complexity, but no UID wiring overhead.
- Templates become pure data (3 const objects) + 1 hydration function, instead of 3 factory functions each with 30 lines of UID wiring
- The `findTermNode` helper is max 10 lines. For 4-8 nodes, performance is irrelevant.

## Lessons Learned
- Don't copy Angular's flat-map-with-tree-selector pattern into React. Angular needed it because of RxJS observables and OnPush change detection. React+Immer handles nested state natively.
- Templates should be declarative data, not imperative construction code.
- When state is small (4-8 nodes), normalization adds complexity without benefit.
