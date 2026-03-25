# Task: CAM Validation Errors — ShEx Violations + Diff Errors

**Status:** COMPLETE
**Branch:** dev

## Goal
Display server-side ShEx validation errors (cardinality + relation violations) and orphaned node/edge diffs in the GraphToolbar as a clickable error chip, opening a detailed error drawer in the right panel — matching the Angular Noctua behavior.

## Context
- **Angular reference:** The Angular app receives `validation-results.shex-validation.violations` from the Barista API response, parses them into `CardinalityViolation` / `RelationViolation` objects, distributes them to activities, then converts to `ActivityError` display objects. It also computes "diff" nodes/edges (raw graph nodes/edges not belonging to any activity). The total error count shows in a toolbar chip; clicking opens a drawer/dialog with detailed visualizations.
- **React current state:** `graphServices.ts` already parses `validation-results` into `ShExViolation[]` on `GraphModel.violations`. An existing `CamErrors.tsx` does basic model-level validation (missing title, missing GP, missing evidence). The right drawer already supports a `camErrors` tab. What's missing is the Angular-style violation processing, diff computation, rich error display with subject/predicate/object visualization, and the toolbar error chip.

## Current State
- **What works now:**
  - `graphServices.ts:parseValidationResults()` → `ShExViolation[]` stored on `GraphModel.violations`
  - `CamErrors.tsx` → basic model-level validation (title, state, missing GP/MF, missing evidence)
  - `RightDrawer.tsx` → `camErrors` tab renders `<CamErrors model={model} />`
  - `drawerSlice.ts` → `RightPanelTab` includes `'camErrors'`
  - `GraphToolbar.tsx` → toolbar with layout/zoom controls (no error chip yet)
- **What's broken/missing:**
  - No violation-to-display-error conversion (ShExViolation → typed error with subject/predicate/object metadata)
  - No diff computation (orphaned nodes/edges not in any activity)
  - No `totalErrors` aggregate
  - No error chip in GraphToolbar
  - No detailed error visualization (relation: subject → predicate → object boxes; cardinality: subject → predicate)
  - No orphaned nodes/edges section in error drawer

## Related Files

| File | Role |
|------|------|
| `src/features/gocam/models/cam.ts` | `GraphModel`, `ShExViolation`, `ShExConstraint` types |
| `src/features/gocam/services/graphServices.ts` | `parseValidationResults()` — already parses raw API violations |
| `src/features/gocam/components/CamErrors.tsx` | Current basic validation component |
| `src/app/layout/RightDrawer.tsx` | Renders CamErrors in right panel |
| `src/features/pathway/components/GraphToolbar.tsx` | Toolbar — needs error chip |
| `src/app/PathwayViewer.tsx` | Main editor — passes model, wires toolbar |
| `src/@noctua.core/components/drawer/drawerSlice.ts` | Drawer state + RightPanelTab type |

### Angular Reference Files
| File | What to learn |
|------|---------------|
| `@noctua.form/models/activity/error/violation-error.ts` | `CardinalityViolation`, `RelationViolation` classes with `getDisplayError()` |
| `@noctua.form/models/activity/parser/activity-error.ts` | `ErrorType`, `ErrorLevel` enums; `ActivityError` class |
| `@noctua.form/models/activity/cam.ts` | `totalErrors`, `setDiffs()`, `setViolations()`, `getViolationDisplayErrors()` |
| `@noctua.form/services/graph.service.ts` | `loadViolations()`, `generateViolation()` — violation parsing pipeline |
| `noctua-graph/cam-errors/` | Graph-mode error drawer with stats + node/edge visualization |
| `noctua-form/dialogs/cam-errors/` | Form-mode error dialog |

## Steps

### Phase 1: Error Types & Violation Processing

Add typed error model and violation-to-display-error conversion.

- [x] **1.1** Add error types to `cam.ts` (or a new `errors.ts` model file):
  - `ErrorType` enum: `general`, `cardinality`, `relation`
  - `ErrorLevel` enum: `warning`, `error`
  - `CamError` interface: `{ category: ErrorLevel, type: ErrorType, message: string, meta?: ErrorMeta }`
  - `ErrorMeta` interface: `{ aspect?: string, subjectNode?: { label: string }, edge?: { label: string }, objectNode?: { label: string } }`
- [x] **1.2** Create violation processing utility (`src/features/gocam/services/violationService.ts`):
  - `processViolations(model: GraphModel): CamError[]` — iterate `model.violations`, for each `ShExViolation` + constraint, resolve node UIDs to `GraphNode` labels, resolve property CURIEs to edge labels, produce `CamError` objects:
    - If constraint has `cardinality` → cardinality error: "Only one {predicate label} is allowed"
    - If constraint has `object` → relation error: "Incorrect relationship between {subject label} and {object label}"
  - Helper: `resolveNodeLabel(model, nodeId)` → find node in `model.nodes` by uid, return label
  - Helper: `resolveEdgeLabel(propertyId)` → look up relation label from `nodeCategories` data or a relation map

### Phase 2: Diff Computation

Compute orphaned nodes/edges not belonging to any activity.

- [x] **2.1** Add `computeDiffs(model: GraphModel): { diffNodes: GraphNode[], diffEdges: Edge[] }` to violation service:
  - Collect all node UIDs across all activities → Set
  - Collect all edge UIDs across all activities + activityConnections → Set
  - `diffNodes` = `model.nodes` not in activity node set
  - `diffEdges` = `model.edges` not in activity edge set or connection set
- [x] **2.2** Add `computeTotalErrors(errors: CamError[], diffNodes: GraphNode[], diffEdges: Edge[]): number` — sum of all three arrays' lengths

### Phase 3: Rewrite CamErrors Component

Replace basic validation with full violation display.

- [x] **3.1** Rewrite `CamErrors.tsx` to accept and display:
  - **Summary stats bar:** Total Errors | Node Errors | Relation Errors (counts)
  - **ShEx violation list:** Each error numbered, showing:
    - Error message with aspect prefix
    - For **relation** errors: subject box → predicate label → object box (visual)
    - For **cardinality** errors: subject box → predicate label (no object)
  - **Orphaned nodes section:** Header "Nodes" with count badge, list of node ID + label
  - **Orphaned edges section:** Header "Edges" with count badge, list of subject → predicate → object
  - Keep existing model-level warnings (missing title, development state, missing GP/MF, missing evidence) as a separate "Warnings" section
- [x] **3.2** Wire in `processViolations()` and `computeDiffs()` — compute on render from model prop (memoized)

### Phase 4: Error Chip in GraphToolbar

Add clickable error indicator to the graph toolbar.

- [x] **4.1** Pass `totalErrors` count + `onErrorClick` callback to `GraphToolbar`
- [x] **4.2** Render error chip (only when `totalErrors > 0`):
  - Warning triangle icon + "{N} Error(s) Found" label
  - Styled as red/amber chip (Tailwind)
  - On click → dispatch `setRightPanelTab('camErrors')` + `setRightDrawerOpen(true)`
- [x] **4.3** Update `PathwayViewer.tsx` to compute total errors from model and pass to toolbar

## Recovery Checkpoint

> TASK COMPLETE

## Failed Approaches

| What was tried | Why it failed | Date |
|----------------|---------------|------|
|                |               |      |

## Files Modified

| File | Action | Status |
|------|--------|--------|
|      |        |        |

## Blockers
- None currently

## Notes

### Angular → React Translation Decisions
- Angular uses OOP classes (`Violation`, `CardinalityViolation`, `RelationViolation`) with `getDisplayError()` methods. React version uses plain interfaces + pure functions — no classes.
- Angular stores `violations[]` on the `Cam` model and mutates it. React version computes errors on render from `GraphModel.violations` (already parsed by `graphServices.ts`). No Redux mutation needed — derive in component with `useMemo`.
- Angular `nodeToActivityNode()` resolves graph node URIs to `ActivityNode` objects. React equivalent: look up node UID in `model.nodes[]` and `model.activities[].nodes[]`.
- Angular resolves edge property CURIEs via `noctuaFormConfigService.findEdge()`. React equivalent: build a static map from `nodeCategories` relation entries, or just use the CURIE as fallback label.
- The `ShExViolation.node` field from the API is a node URI/CURIE — needs mapping to the actual `GraphNode` in the model to get the human-readable label.

### Error Chip Placement
- Angular places it in `cam-toolbar` (the form-mode toolbar). In React, the equivalent is `GraphToolbar` which is always visible above the canvas. This is the right place.

### Existing CamErrors Preservation
- The current `CamErrors.tsx` has useful model-level checks (missing title, missing GP/MF, etc.) that the Angular violation system doesn't cover. Keep these as "warnings" alongside the ShEx violations.
