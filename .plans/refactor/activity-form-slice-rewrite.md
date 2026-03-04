# Task: Rewrite activityFormSlice — simplify, data-driven, match Angular functionality

**Status:** ACTIVE
**Issue:** N/A
**Branch:** main

## Goal

Rewrite `activityFormSlice.ts` and supporting files into clean, simple, idiomatic React/Redux code. Extract duplicated logic into shared utilities. The Angular source is only a **functionality reference** (what activity types exist, what nodes/edges they have, what shape rules apply) — we do NOT copy Angular patterns or architecture. Write clean modern TypeScript with simple data structures.

## Context

- **Angular source:** `@noctua.form/data/config/model-definition.ts` uses declarative `ActivityDescription` objects (nodes + triples) to define each activity type. `createActivityShex()` builds the tree from these descriptions. Shape insertion rules are in `shape-definition.ts`.
- **React current:** `activityFormSlice.ts` has a massive `setActivityType` switch that hand-builds every tree inline. Tree-walking is duplicated 4+ times. Shape data is imported in `NodeForm.tsx`. Types are double-cast. Evidence handling is inconsistent across 3 files.
- **Triggered by:** User request — "it is code everywhere it needs to be thorough re written into simple"

## Current State

- What works now:
  - Five activity types initialize correctly (ACTIVITY, BP_ONLY, CC_ONLY, MOLECULE, PROTEIN_COMPLEX)
  - Form CRUD: add/update/remove nodes, evidence add/remove/clone, NOT qualifier
  - `activityToTree()` converts existing Activity for editing
  - `convertTreeToJson()` converts tree to Barista API operations
  - Validation in `formValidation.ts`
  - Autocomplete integration via `NodeForm.tsx` + `Autocomplete2.tsx`
  - Shape-based "Add" menu in `NodeForm.tsx`

- What's broken/missing:
  - **`setActivityType`** — ~150 lines of hardcoded switch cases (lines 350-498)
  - **Tree-walking duplicated** — `findNodeInTree`, `removeNodeById`, `findAndAddChild`, `findNodeByNodeType` are 4 separate recursive functions with identical patterns
  - **`activityToTree()`** — handles root node separately from children (lines 63-167), duplicating rootTypes/evidence mapping
  - **Double type cast** — `value as GOlrResponse as Entity` (line 282)
  - **Shape data in component** — `NodeForm.tsx` imports `shapes.json` directly and filters inline
  - **Evidence filtering** — done differently in slice, NodeForm, and addActivityServices
  - **`mkChild()` helper** — defined inside a reducer (line 356), uses `as unknown as NodeType` cast

## Steps

### Phase 1: Extract tree utilities — `treeUtils.ts`

Create `src/features/gocam/services/treeUtils.ts` with all tree operations centralized:

- [ ] **1.1** Create `treeUtils.ts` with these pure functions:
  - `findNode(tree: TreeNode[], uid: string): TreeNode | null` — single recursive find
  - `removeNode(tree: TreeNode[], uid: string): TreeNode[]` — filter + recurse
  - `walkTree(tree: TreeNode[], fn: (node: TreeNode) => void): void` — general visitor
  - `findNodeByType(tree: TreeNode[], nodeType: NodeType): TreeNode | null` — replaces `findNodeByNodeType` in addActivityServices
  - `mapTree(tree: TreeNode[], fn: (node: TreeNode) => TreeNode): TreeNode[]` — immutable transform

- [ ] **1.2** Update `activityFormSlice.ts` — replace inline `findNodeInTree` and `removeNodeById` with imports from `treeUtils.ts`

- [ ] **1.3** Update `addActivityServices.ts` — replace `findNodeByNodeType` with import from `treeUtils.ts`

- [ ] **1.4** Verify: `npm run type-check` passes

### Phase 2: Data-driven activity type definitions — `activityDefinitions.ts`

Replace the massive `setActivityType` switch with declarative configs matching Angular's `model-definition.ts` pattern.

- [ ] **2.1** Create `src/features/gocam/data/activityDefinitions.ts`:

  ```typescript
  // Declarative description of what each activity type looks like
  interface NodeDefinition {
    rootTypeId: string       // e.g. RootTypes.BIOLOGICAL_PROCESS
    relationId?: string      // e.g. Relations.PART_OF (undefined for root)
    nodeType?: NodeType
    children?: NodeDefinition[]
  }

  interface ActivityDefinition {
    rootTypeId: string       // Root node's rootType
    nodes: NodeDefinition[]  // Children of root (flat or nested)
  }

  // One object per activity type — replaces 150 lines of switch
  const definitions: Record<ActivityType, ActivityDefinition> = {
    [ActivityType.ACTIVITY]: {
      rootTypeId: RootTypes.MOLECULAR_FUNCTION,
      nodes: [
        { rootTypeId: RootTypes.MOLECULAR_ENTITY, relationId: Relations.ENABLED_BY, nodeType: NodeType.MOLECULAR_ENTITY },
        { rootTypeId: RootTypes.BIOLOGICAL_PROCESS, relationId: Relations.PART_OF },
        { rootTypeId: RootTypes.CELLULAR_COMPONENT, relationId: Relations.OCCURS_IN },
      ],
    },
    [ActivityType.BP_ONLY]: {
      rootTypeId: RootTypes.MOLECULAR_FUNCTION,
      nodes: [
        { rootTypeId: RootTypes.MOLECULAR_ENTITY, relationId: Relations.ENABLED_BY, nodeType: NodeType.MOLECULAR_ENTITY },
        {
          rootTypeId: RootTypes.BIOLOGICAL_PROCESS,
          relationId: Relations.CAUSALLY_UPSTREAM_OF_OR_WITHIN,
          children: [
            { rootTypeId: RootTypes.CELLULAR_COMPONENT, relationId: Relations.OCCURS_IN },
          ],
        },
      ],
    },
    [ActivityType.CC_ONLY]: {
      rootTypeId: RootTypes.MOLECULAR_ENTITY,
      nodes: [],
    },
    [ActivityType.MOLECULE]: {
      rootTypeId: RootTypes.CHEMICAL_ENTITY,
      nodes: [
        { rootTypeId: RootTypes.CELLULAR_COMPONENT, relationId: Relations.LOCATED_IN },
      ],
    },
    [ActivityType.PROTEIN_COMPLEX]: {
      rootTypeId: RootTypes.MOLECULAR_FUNCTION,
      nodes: [
        { rootTypeId: RootTypes.PROTEIN_CONTAINING_COMPLEX, relationId: Relations.ENABLED_BY },
        { rootTypeId: RootTypes.BIOLOGICAL_PROCESS, relationId: Relations.PART_OF },
        { rootTypeId: RootTypes.CELLULAR_COMPONENT, relationId: Relations.OCCURS_IN },
      ],
    },
  }
  ```

- [ ] **2.2** Add `buildTree(definition: ActivityDefinition): { tree: TreeNode[], rootTerm: Entity }` function that constructs the tree from a definition. This single function replaces the entire `setActivityType` switch body.

- [ ] **2.3** Rewrite `setActivityType` reducer to be 3 lines:
  ```typescript
  setActivityType: (state, action) => {
    const def = definitions[action.payload]
    state.activityType = action.payload
    state.editingActivityUid = null
    Object.assign(state, buildTree(def))
  }
  ```

- [ ] **2.4** Verify: `npm run type-check` passes, form initializes correctly for all 5 types

### Phase 3: Clean up `activityToTree()` and fix types

- [ ] **3.1** Refactor `activityToTree()` — use a single recursive `graphNodeToTreeNode()` for both root and children (remove the duplicated root-node-special-case). Move it to `treeUtils.ts` or keep in slice as a private helper.

- [ ] **3.2** Fix the double cast in `updateEvidence` reducer:
  - `GOlrResponse` has `{ id, label, ... }` — `Entity` is `{ id, label }`
  - Create a helper `toEntity(golr: GOlrResponse): Entity` that picks `{ id, label }`
  - Replace `value as GOlrResponse as Entity` with `toEntity(value as GOlrResponse)`

- [ ] **3.3** Type-narrow the `field` parameter in `updateEvidence`:
  - Evidence code → accepts `GOlrResponse`, converts to `Entity`
  - reference/withFrom → accepts `string`
  - Consider splitting into `updateEvidenceCode` and `updateEvidenceText` reducers for clarity

- [ ] **3.4** Verify: `npm run type-check` passes

### Phase 4: Extract shape service — `shapeService.ts`

Move shape lookup logic out of `NodeForm.tsx` into a service.

- [ ] **4.1** Create `src/features/gocam/services/shapeService.ts`:
  ```typescript
  import shapesData from '@/@noctua.core/data/shapes.json'

  interface AvailablePredicate {
    id: string
    label: string
    objects: string[]  // valid range rootType IDs
  }

  // Memoized lookup: given a node's rootTypes, return what predicates can be added
  export function getAvailablePredicates(rootTypes: Entity[]): AvailablePredicate[]
  ```

- [ ] **4.2** Update `NodeForm.tsx` — replace inline `shapesData` import and `useMemo` filter with a call to `getAvailablePredicates(node.rootTypes)`

- [ ] **4.3** Verify: "Add" menu still shows correct predicates for each node type

### Phase 5: Consolidate evidence helpers

- [ ] **5.1** Add to `cam.ts` or a new `evidenceUtils.ts`:
  ```typescript
  export const isValidEvidence = (ev: EvidenceForm): boolean =>
    !!ev.evidenceCode?.id

  export const toEntity = (golr: GOlrResponse): Entity =>
    ({ id: golr.id, label: golr.label })
  ```

- [ ] **5.2** Update `addActivityServices.ts` — use `isValidEvidence` instead of inline `ev => ev.evidenceCode?.id`

- [ ] **5.3** Update `formValidation.ts` — use `isValidEvidence` instead of `ev => ev.evidenceCode?.id`

- [ ] **5.4** Verify: `npm run type-check` and `npm run test` pass

### Phase 6: Final cleanup and verify

- [ ] **6.1** Remove dead code: delete the old inline `findNodeInTree`, `removeNodeById` from slice, `findNodeByNodeType` from addActivityServices

- [ ] **6.2** Ensure all imports are clean — no unused imports, `import type` where appropriate

- [ ] **6.3** Run `npm run lint:fix` and `npm run format`

- [ ] **6.4** Run `npm run build` — full type-check + bundle

- [ ] **6.5** Manual smoke test: open form, switch activity types, add nodes, fill evidence, save

## Recovery Checkpoint

> **Last completed action:** Plan created
> **Next immediate action:** Phase 1, Step 1.1 — create `treeUtils.ts`

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
|                |               |      |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
| `src/features/gocam/services/treeUtils.ts` | Create | Pending |
| `src/features/gocam/data/activityDefinitions.ts` | Create | Pending |
| `src/features/gocam/services/shapeService.ts` | Create | Pending |
| `src/features/gocam/slices/activityFormSlice.ts` | Rewrite | Pending |
| `src/features/gocam/services/addActivityServices.ts` | Update imports | Pending |
| `src/features/gocam/services/formValidation.ts` | Update imports | Pending |
| `src/features/gocam/components/forms/NodeForm.tsx` | Remove inline shapes | Pending |
| `src/features/gocam/models/cam.ts` | Add evidence helpers | Pending |

## Blockers
- None currently

## Notes
- The Angular source uses class-based `SaeGraph<ActivityNode>` with `updateShapeMenuShex()`. We don't need that complexity — our `TreeNode[]` flat structure is simpler. The key insight is: **activity type definitions should be data, not code**.
- `BP_ONLY` is special — it nests CC under BP (not under root). The `NodeDefinition.children` field handles this.
- `addActivityServices.ts` is mostly fine — just needs shared tree utils and evidence filter. No major rewrite needed.
- `formValidation.ts` is also fine — just consolidate the `isValidEvidence` check.
- `ActivityForm.tsx` component layout is good — no changes needed beyond what flows from slice changes.
- `NodeForm.tsx` mainly needs the shape lookup extracted; the rest of the component is clean.

## Additional Context

### Size comparison (estimated)
| File | Before | After |
|------|--------|-------|
| `activityFormSlice.ts` | 588 lines | ~250 lines |
| `treeUtils.ts` | N/A | ~60 lines |
| `activityDefinitions.ts` | N/A | ~80 lines |
| `shapeService.ts` | N/A | ~30 lines |

### What stays the same
- `TreeNode` interface — no changes
- `EvidenceForm` interface — no changes
- All exported action names — no changes (backward compatible)
- `convertTreeToJson()` — same logic, just imports tree utils
- `ActivityForm.tsx` — no changes needed
- `Autocomplete2.tsx` — untouched

### Risk areas
- `activityToTree()` refactor (Phase 3.1) — must preserve cycle detection via `processedNodeIds` set
- `BP_ONLY` nested tree structure — must verify CC is still nested under BP, not root
- Edit mode (`loadActivity`) — must still work after `activityToTree` refactor
