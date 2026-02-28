# Task: Implement PathwayViewer — JointJS Graph Visualization

**Status:** ACTIVE
**Branch:** main

## Goal

Render the CAM graph model as an interactive JointJS diagram inside PathwayViewer, replicating the Angular site's visual editor. Users should see activities as cards, molecules as circles, and relationships as colored links — with click/hover interactions, auto-layout, and zoom/pan.

## Context

- **Source (Angular):** `C:\work\go\noctua-visual-pathway-editor\src\@noctua.graph\` — JointJS 3.5.5 with custom shapes, Dagre layout, stencil drag-drop
- **Target (React):** `C:\work\go\noctua-form-base-rt\src\app\PathwayViewer.tsx` — currently an empty placeholder that fetches GraphModel via RTK Query
- **Key difference:** Angular uses raw JointJS DOM manipulation; React needs a ref-based approach with useEffect for lifecycle
- **Installed deps:** `jointjs@3.7.7`, `dagre@0.8.5`, `@dagrejs/graphlib@2.2.4`, `reactflow@11.11.4` (reactflow is unused — JointJS is the target)

### Related files (React target)
- `src/app/PathwayViewer.tsx` — Main editor component (empty)
- `src/features/gocam/models/cam.ts` — GraphModel, Activity, GraphNode, Edge interfaces
- `src/features/gocam/services/graphServices.ts` — transformGraphData(), extractActivities(), extractActivityConnections()
- `src/features/gocam/slices/camSlice.ts` — Redux: model, selectedActivity, loading, error
- `src/@noctua.core/models/relations.ts` — Relation IDs (RO:xxxx)
- `src/@noctua.core/data/config.ts` — Aspect maps, color config

### Related files (Angular source)
- `@noctua.graph/models/cam-canvas.ts` — Paper/Graph init, events, zoom, layout
- `@noctua.graph/models/shapes.ts` — NodeCellList (activity card), NodeCellMolecule (circle), NodeLink
- `@noctua.graph/services/shapes.service.ts` — Shape methods (setColor, hover, addEntity)
- `@noctua.graph/data/edge-display.ts` — Edge color by relation type
- `cam-graph/cam-graph.component.ts` — Component hosting the canvas
- `cam-graph/services/cam-graph.service.ts` — addToCanvas(), createActivity(), linking

## Current State

- **What works now:**
  - GraphModel fetched from Barista API and transformed (nodes, edges, activities, activityConnections)
  - Redux state populated with model
  - Activity selection and detail panel (RightDrawer) functional
  - CamToolbar showing model metadata
  - Auth, search, relation decision tree all implemented

- **What's broken/missing:**
  - PathwayViewer returns `<></>` — no visualization at all
  - No JointJS Paper/Graph initialization
  - No custom shape definitions for activities/molecules
  - No Dagre auto-layout integration
  - No zoom/pan
  - No click/hover event handling
  - No activity-to-activity connection rendering

## Prerequisites Check

Before implementing the viewer, verify:
- [x] GraphModel data pipeline works (API → transform → Redux) — YES
- [x] JointJS installed (3.7.7) — YES
- [x] Dagre installed (0.8.5) — YES
- [x] Activity extraction logic exists — YES (graphServices.ts)
- [x] Relation/edge color mapping data exists — YES (edgeDisplayService.ts created)
- [x] JointJS CSS imported — YES (main.tsx)
- [x] JointJS types work with 3.7.7 — YES (removed @types/jointjs, bundled types work)

## Steps

### Phase 0: Foundation & Verification ✅ COMPLETE

**Goal:** Confirm JointJS renders in Vite/React before writing any real features.

#### Step 0.1 — Fix JointJS types
- `@types/jointjs@2.0.0` in devDependencies is outdated vs `jointjs@3.7.7`
- JointJS 3.7 bundles its own `.d.ts` files — check `node_modules/jointjs/types/`
- If bundled types exist: remove `@types/jointjs` from devDependencies
- If not: keep `@types/jointjs` and suppress mismatches with `// @ts-expect-error` or module augmentation

#### Step 0.2 — Import JointJS CSS
- Add `import 'jointjs/dist/joint.css'` to `src/main.tsx` or `src/index.css`
- Verify Vite resolves it (JointJS CSS is plain CSS, should work with Vite's built-in CSS handling)
- Check for any PostCSS/Tailwind conflicts

#### Step 0.3 — Smoke-test render
- Create a minimal test component (or modify PathwayViewer temporarily):
  ```tsx
  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const graph = new joint.dia.Graph({}, { cellNamespace: joint.shapes })
    const paper = new joint.dia.Paper({
      el: containerRef.current!,
      model: graph,
      width: 800,
      height: 600,
      gridSize: 10,
      cellViewNamespace: joint.shapes,
    })
    // Add a test rectangle
    const rect = new joint.shapes.standard.Rectangle()
    rect.position(100, 100)
    rect.resize(200, 80)
    rect.attr({ body: { fill: '#7cd488' }, label: { text: 'Test Activity' } })
    rect.addTo(graph)
    return () => paper.remove()
  }, [])
  ```
- Run `npm run dev`, open browser, confirm green rectangle renders
- Run `npm run type-check` to confirm TypeScript is happy

#### Step 0.4 — Create edge color utility
- Create `src/features/gocam/services/edgeDisplayService.ts`
- Port the color mapping from Angular `@noctua.graph/data/edge-display.ts`:
  - Green: positive regulations (RO:0002213, RO:0002629, etc.)
  - Red: negative regulations (RO:0002212, RO:0002630, etc.)
  - Grey: neutral upstream (RO:0002418, RO:0002264, etc.)
  - Black: default
- Export `getEdgeColor(relationId: string): string` function
- Use hex colors consistent with Angular: green=#2ca02c, red=#d62728, grey=#999999, black=#333333

#### Step 0.5 — Verify Dagre layout works with JointJS
- After smoke test renders, test `joint.layout.DirectedGraph.layout()`:
  ```ts
  joint.layout.DirectedGraph.layout(graph, {
    rankDir: 'TB',
    rankSep: 80,
    marginX: 20,
    marginY: 20,
  })
  ```
- This requires `dagre` to be importable — verify no bundling issues

**Phase 0 is DONE when:** A green rectangle renders in the browser, types compile, and Dagre layout works.

### Phase 1: Basic Canvas — Render Activities as Boxes
- [ ] Create `src/features/gocam/components/PathwayGraph.tsx` — JointJS wrapper component
  - useRef for container div
  - useEffect to init joint.dia.Graph + joint.dia.Paper
  - Cleanup on unmount (paper.remove())
- [ ] Render each Activity as a basic JointJS rectangle element
  - Label: enabledBy label + molecularFunction label
  - Position: auto-layout with Dagre
  - Color: based on activity type (green for MF, tan for BP, purple for CC)
- [ ] Render activityConnections as JointJS links
  - Label: edge relation label
  - Color: based on relation type (green=positive, red=negative, grey=neutral)
- [ ] Apply Dagre auto-layout (TB direction, network-simplex ranker)
- [ ] Wire into PathwayViewer.tsx — replace empty `<></>` with `<PathwayGraph>`

### Phase 2: Interactive Features
- [ ] Click activity → dispatch setSelectedActivity → open RightDrawer
- [ ] Hover activity → highlight border (amber/orange)
- [ ] Hover link → thicken stroke
- [ ] Double-click blank canvas → deselect
- [ ] Zoom with Ctrl+scroll (scale paper)
- [ ] Pan by dragging blank canvas
- [ ] Fit-to-content on initial load (scaleContentToFit)

### Phase 3: Rich Activity Cards (NodeCellList equivalent)
- [ ] Define custom JointJS shape with sections:
  - Header: Gene Product (enabledBy) label + icon
  - Body: Molecular Function, Biological Process, Cellular Component, etc.
  - Ports: child relationships with labels
- [ ] Dynamic height based on content (port count)
- [ ] Edit/delete icon buttons on hover
- [ ] Molecule shape: circle with label (120x120)

### Phase 4: Stencil & Editing (future)
- [ ] Stencil sidebar for drag-drop creation of new activities
- [ ] Link creation by dragging between elements
- [ ] Activity form integration (open form on double-click)
- [ ] Save positions back to API

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** Phase 0 complete — all steps (0.1–0.5) done
- **Next immediate action:** Phase 1 — Create PathwayGraph component, render activities as boxes with Dagre layout
- **Recent commands run:** `npm run type-check` (clean), `eslint` on changed files (clean)
- **Uncommitted changes:** `package.json`, `src/main.tsx`, `src/app/PathwayViewer.tsx`, `src/features/gocam/services/edgeDisplayService.ts`, `.plans/feature/pathway-viewer.md`
- **Environment state:** main branch, needs visual verification in browser then commit

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
| `package.json` | Removed `@types/jointjs` from devDependencies | Done |
| `src/main.tsx` | Added `import 'jointjs/dist/joint.css'` | Done |
| `src/app/PathwayViewer.tsx` | JointJS smoke-test (2 rects + link + dagre), fixed conditional rendering | Done |
| `src/features/gocam/services/edgeDisplayService.ts` | Created edge color utility (getEdgeColor) | Done |

## Blockers
- ~~`@types/jointjs@2.0.0` may not match `jointjs@3.7.7`~~ — RESOLVED: removed, bundled types work
- ~~JointJS CSS may need Vite config for proper import~~ — RESOLVED: plain import works

## Notes
- Angular source uses jQuery for BBOP libraries — React target does NOT use jQuery (good)
- React target has `reactflow` installed but unused — could be removed or kept as fallback
- The Angular shapes use complex SVG markup defined in TypeScript — need to replicate or simplify
- JointJS 3.7 has built-in TypeScript support (`jointjs/types`) — may not need `@types/jointjs` at all
- `joint.layout.DirectedGraph` requires dagre — already installed
- For Phase 1 MVP, simple rectangles + links + Dagre layout gives 80% of the value

## Additional Context

### Data Flow for Visualization
```
Redux state.cam.model (GraphModel)
  ├── .activities[] → JointJS Elements (rectangles/cards)
  │     ├── .rootNode → main label
  │     ├── .enabledBy → header label
  │     ├── .molecularFunction → body section
  │     └── .edges[] → ports/child relationships
  ├── .activityConnections[] → JointJS Links (arrows)
  │     ├── .label → link label text
  │     ├── .id → relation ID → color mapping
  │     └── .sourceId/.targetId → element connections
  └── .nodes[] → (not directly rendered — consumed via activities)
```

### Angular Shape → React Mapping
| Angular Shape | Purpose | React Phase 1 | React Phase 3 |
|---------------|---------|---------------|---------------|
| NodeCellList | Activity card with ports | Simple rect | Custom shape with sections |
| NodeCellMolecule | Molecule circle | Basic circle | Circle with label |
| NodeLink | Relationship arrow | Standard link | Colored link with label |

### Edge Color Mapping (from Angular edge-display.ts)
- Grey: `causallyUpstreamOf`, `causallyUpstreamOfOrWithin`, `directlyRegulates`
- Green: `positivelyRegulates`, `directlyPositivelyRegulates`, `isSmallMoleculeActivator`
- Red: `negativelyRegulates`, `directlyNegativelyRegulates`, `isSmallMoleculeInhibitor`
- Black: default
