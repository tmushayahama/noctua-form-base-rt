# Angular VPE → React Rewrite — Gap Analysis (Used Features Only)

Reference Angular site: `C:\work\go\old-noctua-visual-pathway-editor`
React rewrite: `C:\work\go\noctua-form-base-rt`

This list is scoped to **features that are actually wired into the running Angular VPE** — i.e. components rendered from the runtime layout templates, and dialogs opened from `NoctuaFormDialogService`. Everything below is missing or partial in the React rewrite.

Sources of truth used:
- `src/app/main/apps/noctua-graph/noctua-graph.component.html` (runtime layout: toolbar + left drawer + canvas + right drawer)
- `src/app/layout/components/toolbar/toolbar.component.html` (top app chrome)
- `src/app/main/apps/noctua-form/services/dialog.service.ts` (the only dialog opener)
- `src/app/main/apps/noctua-form/cam/cam-form/cam-form.component.html` (metadata drawer body)
- `noctua-form.module.ts` + `noctua-graph.module.ts` (declared/exported components)

---

## 1. Top toolbar (`Toolbar.tsx`)

Wired in Angular `toolbar.component.html`, missing or partial in React:

- **Indeterminate loading bar** at the top of the chrome (`<mat-progress-bar mode="indeterminate">`) — surfaces backend activity site-wide. The global loading-overlay slice exists but isn't surfaced as a thin progress bar in the toolbar.
- **Dev / Beta variant banner** — Angular renders a multi-line "Testing Version. Visit Noctua for production version" block when `isDev || isBeta`. React only adds a `(dev)` suffix.

---

## 2. CAM toolbar (`CamToolbar.tsx`)

Wired in Angular `cam-toolbar.component.html`, mostly at parity. Verify but probably fine:

- Error chip is **always rendered** in Angular (with a `noc-has-errors` modifier when non-zero). React only renders when `totalErrors > 0`. Cosmetic.
- Contributor chips in Angular are clickable and open the metadata form. React renders chips but they aren't interactive (`CamToolbar.tsx:191`).

No missing functionality otherwise — title pen, comments badge with count, clone, state pen, date, View-In menu (Annotation Preview / Pathway Viewer / Graph Editor), Export-As menu (GPAD / OWL) all present.

---

## 3. Left drawer (Angular runtime layout)

Angular's `noctua-graph.component.html` switches the **left drawer** between two panels: `cam-form` (metadata) and `copy-model`. React uses dialogs for both, which is fine — but the metadata form's content is incomplete:

### `CamMetadataForm.tsx` is missing fields the Angular `cam-form` requires

Angular `cam-form.component.html` includes:
- **Group selector (required)** — bound to `noctuaUserService.user.groups`. Drives default group on save. **Missing in React.**
- **Read-only "Open In" external links** — Visual Pathway Editor + Graph Editor URLs inside the form body. Missing.
- **Read-only summary** of Contributors and Groups under the form. Partial — React lists comments and edits, but the read-only summary block isn't there.
- **Logged-out overlay** — Angular shows "Log in to Continue" if not authenticated. Verify.
- **Comment delete buttons** are wired in Angular as a trashcan icon per row. Verify React's per-row remove control.

---

## 4. Right drawer

Angular switches the right drawer between `activity-table` and `cam-errors`. React's right drawer covers the same two tabs (`RightPanelTab.CAM_ERRORS` is wired in `CamToolbar.tsx`). Parity.

---

## 5. Dialogs that the Angular service actually opens

`NoctuaFormDialogService` (the **only** dialog opener in the form module) opens these. React status below is what matters:

| Dialog (called by Angular service) | React status | Notes |
|---|---|---|
| `openCreateActivityDialog(formType)` | Verify | Picks form template (Default / Molecule / Protein-Complex) before opening the activity form. Confirm `ActivityFormDialog.tsx` includes the template-choose step. |
| `openActivityErrorsDialog(errors)` | **Missing** | Per-activity errors popover. React only has CAM-level `CamErrors.tsx`. |
| `openCamErrorsDialog(errors)` | Done | `CamErrors.tsx` |
| `openAddEvidenceDialog(success)` | Partial | `EvidenceRow.tsx` + `CloneEvidenceDialog.tsx` cover row-level edit. Verify a true "add new evidence" dialog at 600px exists. |
| `openBeforeSaveDialog(cam)` | **Missing** | Confirm-before-save with summary of dirty changes. |
| `openConfirmCopyModelDialog(cam)` | Verify | Two-step confirm before m3Batch copy. `CopyModelDialog.tsx` exists — confirm it's actually a confirm step, not just the copy form. |
| `openSelectEvidenceDialog(evidence)` | **Missing** | Pick from **existing** evidence in the CAM when adding to a new triple. Different from search-evidence. |
| `openSearchDatabaseDialog(searchCriteria)` | Partial | GOlr database search with criteria. `SearchAnnotations.tsx` covers some of this. |
| `openSearchEvidenceDialog(searchCriteria)` | Partial | GOlr evidence search. Verify it's a separate flow from database search. |
| `openAllowedWithDatabasesDialog()` | Done | `AllowedDatabasesPopover.tsx` |
| `openAllowedReferenceDatabasesDialog()` | **Missing** | Same component, **second variant** with `referenceAllowedDBs` + title "Allowed Reference Databases". React popover only shows the with-databases variant. |
| `openConfirmDialog(searchCriteria, success)` | Verify | Generic confirm. React likely uses a Mantine confirm modal — confirm there's a single shared helper. |

Plus from `noctua-graph.module.ts`:

| Dialog | React status |
|---|---|
| `EditActivityConnectorDialogComponent` | Partial — `ConnectorForm.tsx` / `ChemicalConnectorForm.tsx` exist; verify they support **edit existing edge** (not just create). |

---

## 6. Components declared and used in templates

### Form module declared components (`noctua-form.module.ts`)

| Angular component | React equivalent | Status |
|---|---|---|
| `ActivityFormComponent` + `EntityFormComponent` | `ActivityForm.tsx` + `EntityRow.tsx` | Partial — verify nested entity tree completeness |
| `CamToolbarComponent` | `CamToolbar.tsx` | Done (see §2) |
| `CamFormComponent` | `CamMetadataForm.tsx` | Partial (see §3) |
| `ActivityConnectorFormComponent` | `ConnectorForm.tsx` | Partial — verify edit mode |
| `ChemicalConnectorFormComponent` | `ChemicalConnectorForm.tsx` | Partial — verify save back to Barista |
| `ActivityFormTableComponent` + `ActivityFormTableNodeComponent` + `EvidenceFormTableComponent` | `ActivityTable.tsx` + `ActivityTableNode.tsx` + `EvidenceRow.tsx` | Partial — verify the nested evidence sub-table is present |
| `ActivityTreeTableComponent` | none | **Missing** — tree-grouped activity view (alternate to flat form-table). Decision needed: keep, drop, or redesign. |
| `NoctuaTermDetailComponent` | none | **Missing** — term definition / synonyms preview popover. Used inline next to terms. |
| `SelectEvidenceComponent` | none | **Missing** — companion to `SelectEvidenceDialog`; lets you pick from existing evidence. |
| `CopyModelComponent` | `CopyModelDialog.tsx` | Done (verify) |

### Graph module declared components (`noctua-graph.module.ts`)

| Angular component | React equivalent | Status |
|---|---|---|
| `CamGraphComponent` | `PathwayGraph.tsx` | Partial — JointJS canvas exists |
| `ActivityTableComponent` (right-drawer panel) | `ActivityTable.tsx` (in drawer) | Verify it's wired into `RightDrawer.tsx` |
| `ActivityConnectorTableComponent` | **deleted** (`ConnectorTable.tsx` is `D` in `git status`) | **Missing** — edge list panel. Was removed; needs intentional re-design or restoration. |
| `CamErrorsComponent` (right-drawer panel) | `CamErrors.tsx` | Done |
| `RelationPreviewComponent` | none | **Missing** — hover/click peek at an edge's relation chain. |

---

## 7. Styling tokens that ship with the running app

The Angular site loads `src/@noctua/scss/core.scss` which compiles `theming.scss` + every partial in `partials/`. Of those, the ones with **runtime visual presence** in the rendered VPE (verified by grepping the live templates above):

| Selector / class | Where it's used | React status |
|---|---|---|
| `.noc-table-chip`, `.noc-validation-chip`, `.noc-state-chip`, `.noc-date-chip`, `.noc-user-chip` | cam-toolbar chips | Re-implemented inline in `CamToolbar.tsx` per chip. Centralise as a Mantine Chip override or Tailwind component class to avoid drift. |
| `.noc-has-errors` modifier | toggles error chip color | Logic baked into the conditional render. Cosmetic. |
| `.noc-development`, `.noc-production`, `.noc-review` | state chip tinting | Replaced by `getStateColor()` in `data/stateColors.ts`. Verify ramp matches. |
| `.noc-rounded-button`, `.noc-icon-action`, `.noc-toolbar-button`, `.noc-edit-button`, `.noc-name-button`, `.noc-login-button`, `.noc-sm`/`.noc-xs` size variants | every toolbar / cam-toolbar / drawer | React mixes Mantine `Button`/`ActionIcon` + raw buttons + ad-hoc Tailwind. Pick a convention. |
| `.noc-drawer-header`, `.noc-drawer-body`, `.noc-drawer-footer`, `.noc-section-heading`, `.noc-form-section`, `.noc-section-header` | cam-form metadata drawer | The shared drawer chrome (header bar with Close, padded body, footer with Save) — React inlines this; consider extracting a `<DrawerShell>` since the metadata, copy-model, and connector forms all share it. |
| `.noc-comments-badge` | comments count badge on the toolbar icon | Re-implemented as a Tailwind `absolute` span in `CamToolbar.tsx:117` with `bg-green-800` (ad-hoc, doesn't reference accent token). Align with palette. |
| `.noc-dev` / `.noc-beta` toolbar modifier | dev/beta variant chrome | **Missing** in React (see §1). |
| `.noc-not-loggedin` banner | shown above canvas when no user | "Not Logged In: You can only view existing annotations" banner above the cam-toolbar. **Missing** in React. |
| Custom scrollbar style on `#scrollbarRef` (right drawer body) | drawer overflow | Verify React drawer has a styled / thin scrollbar; otherwise content looks different. |

The other partials (`_print.scss`, `_angular-material-fix.scss`, `_material.scss`, `_alert.scss`, `_normalize.scss`, `_reset.scss`) are either Angular-Material specific (drop) or Tailwind-preflight covered (drop).

---

## 8. Read-only banner above the canvas

`noctua-graph.component.html:4-8` — when no user is logged in, the layout renders a top banner: *"Not Logged In: You can only view existing annotations"*. **Missing** in React. Worth adding because the alternative (a hidden but disabled UI) is more confusing.

---

## 9. Summary — discrete items missing in React

Concrete items, grouped:

**Top chrome**
- Indeterminate loading bar at top of toolbar
- Dev/beta variant banner (multi-line warning block)
- "Not Logged In" read-only banner above the canvas

**CAM metadata form drawer**
- Group selector (required field)
- "Open In" external links inside the form
- Read-only summary block (Title / State / Contributors / Groups)

**Dialogs**
- `ActivityErrorsDialog` (per-activity error popover)
- `BeforeSaveDialog` (dirty-changes confirm)
- `SelectEvidenceDialog` (pick from existing evidence in the CAM)
- `AllowedReferenceDatabasesDialog` (second variant of allowed-databases)
- `SearchDatabaseDialog` / `SearchEvidenceDialog` — confirm both variants exist

**Components rendered in panels**
- `ActivityConnectorTable` (was deleted from React; needs intentional restore or replacement)
- `ActivityTreeTable` (tree-grouped activity view)
- `RelationPreview` (edge relation peek)
- `NoctuaTermDetail` (term definition / synonyms popover)
- `SelectEvidence` (component variant, used inside flows)

**Behavior to verify (probably partial, not necessarily missing)**
- Activity create dialog includes the **template picker** step
- `EditActivityConnectorDialog`-equivalent supports **editing an existing edge**
- `CopyModelDialog` is a true two-step confirm

**Styling consolidation**
- Drawer chrome shell (header / body / footer) extracted as a single component
- Chip styles centralised (currently inlined per chip in `CamToolbar.tsx`)
- Button/icon-button class convention picked (Mantine vs raw)
- State-chip color ramp parity-checked against `noc-development`/`noc-production`/`noc-review`
- Comments badge color aligned with accent token
