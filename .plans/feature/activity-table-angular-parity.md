# Task: Activity Table — Angular Parity Gaps

**Status:** ACTIVE
**Branch:** dev

## Goal
Bring the React ActivityTable row display, evidence cells, inline editor, and menus to feature parity with the Angular activity table. This covers the **table node UI, editor dropdown, and menu structure** — not the ActivityForm edit dialog (which has its own plan).

## Context

### Related Files

**Angular source:**
| File                                                      | Role                       |
| --------------------------------------------------------- | -------------------------- |
| `cam-table/activity-form-table/activity-form-table-node/` | Row node component         |
| `cam-table/activity-form-table/evidence-table/`           | Evidence row display       |
| `@noctua.editor/inline-editor/editor-dropdown/`           | Inline editor popover      |
| `@noctua.editor/inline-reference/reference-dropdown/`     | Reference DB picker        |
| `@noctua.editor/inline-with/with-dropdown/`               | With/From multi-entity     |
| `@noctua/scss/partials/_mdc-form-field-theme.scss`        | Autocomplete panel styling |

**React source:**
| File                                                 | Role                  |
| ---------------------------------------------------- | --------------------- |
| `features/gocam/components/ActivityTableNode.tsx`    | Row node + evidence   |
| `features/gocam/components/forms/EditorDropdown.tsx` | Inline editor popover |
| `features/gocam/components/forms/ReferenceDropdown.tsx` | Reference DB picker |
| `features/gocam/components/forms/WithDropdown.tsx`   | With/From multi-entity |
| `features/search/components/Autocomplete2.tsx`       | Term autocomplete     |

---

## Gap Analysis

### GAP 1: Reference Field Missing Autocomplete

**Angular:** Reference field in the editor dropdown is a `<textarea rows="2">` with `[matAutocomplete]="referenceAuto"` bound to `entity?.predicate?.referenceLookup.results`. Users can type and get suggestions from existing references. Also has the DB picker (plus-square) button as suffix.

**React:** Reference field in EditorDropdown is a plain TextField with only the DB picker button. No autocomplete suggestions for existing references.

**Severity:** High — curators frequently reuse references; autocomplete saves significant time.

---

### GAP 2: With Field Missing Autocomplete

**Angular:** With field in the editor dropdown is a `<textarea rows="2">` with `[matAutocomplete]="withAuto"` bound to `entity?.predicate?.withLookup.results`. Also has the DB picker (plus-square) button as suffix.

**React:** With field in EditorDropdown is a plain TextField with only the DB picker button. No autocomplete suggestions.

**Severity:** High — same reason as GAP 1.

---

### GAP 3: Per-Field Delete on Evidence Cells (Reference, With)

**Angular:** Each evidence cell has its own dedicated delete button:
- Evidence code cell delete → `removeEvidence(evidence)` — deletes entire evidence row
- Reference cell delete → `removeReference(evidence)` — clears just the reference field
- With cell delete → `removeWith(evidence)` — clears just the with/from field

Each trash icon is positioned absolutely top-right, hidden by default, visible on cell hover.

**React:** Delete buttons exist on evidence cells but all call `handleDeleteEvidence` which deletes the entire evidence row. There is no per-field clear for reference or with.

**Severity:** Medium — common workflow to clear a reference or with value without deleting the whole evidence.

---

### GAP 4: Editor Dropdown Menu (Search Annotations, Fill Root Term)

**Angular:** The editor dropdown has an action menu button (ellipsis icon) with:
- "Search Annotations" — opens SearchDatabaseDialog to import evidence from existing annotations
- "Fill with root term" — auto-populates with root term + ND evidence

Only shown when `category === EditorCategory.all || category === EditorCategory.evidenceAll`.

**React:** EditorDropdown only has Cancel and Save buttons. No action menu, no Search Annotations, no Fill Root Term from the inline editor context.

**Severity:** Medium — these are important shortcuts when editing inline.

---

### GAP 5: Evidence Row Action Menu

**Angular:** Each evidence row has its own action cell (50px) at the right end with an ellipsis menu button → "Add Evidence" menu item. This is in addition to the node-level action menu.

**React:** Evidence rows have no per-row action menu. The "Add Evidence" action is only in the node-level menu above all evidence rows.

**Severity:** Low — the node-level "Add Evidence" works, but per-row placement is more discoverable.

---

### GAP 6: Node Menu Structure (Submenus)

**Angular:** Node action menu has structured submenus:
- **Add** (submenu) → lists insertable child nodes with label + range description
- **Evidence** (submenu) → "Add Evidence"
- **Delete** (if canDelete, warn color)

**React:** Node menu is flat:
- "Add Evidence" (flat item)
- "Add" section with child node options (flat items in same menu)
- "Delete" (if canDelete)

**Missing:** "Evidence" submenu grouping, ISS evidence shortcut. Add menu items don't show range description as secondary text.

**Severity:** Low — functional but less organized.

---

### GAP 7: Add Menu Item Descriptions

**Angular:** Each insert menu item shows two lines:
- Primary: `insertMenuItem.label` (e.g., "part of")
- Secondary: `insertMenuItem.rangeLabel` in `noc-terms-description` class (e.g., "Protein Complex")
- Menu panel class: `noc-extensions-menu-panel`

**React:** Add menu items show predicate label and target category label, but the layout/formatting may differ from Angular's two-line display.

**Severity:** Low — cosmetic.

---

### GAP 8: Hover-Only Edit/Delete Buttons

**Angular:** Both edit (pencil) and delete (trash) buttons are `visibility: hidden` by default. They become visible only on parent cell hover via CSS:
```scss
&:hover {
  .noc-edit-button, .noc-delete-button { visibility: visible }
}
```

**React:** Uses `opacity-0` and `group-hover/cell:opacity-100` for edit buttons, and `hidden` / `group-hover/cell:flex` for delete buttons. This is functionally similar but may have minor visual differences.

**Severity:** Low — already mostly implemented, verify visual consistency.

---

### GAP 9: External Database Links in Evidence Rows

**Angular:** Evidence code ID, reference value, and with value are all hyperlinked when a URL exists:
- `<a href="{{evidence.evidence?.url}}" target="_blank">{{evidence.evidence?.id}}</a>`
- `<a href="{{evidence.referenceEntity?.url}}" target="_blank">{{evidence.reference}}</a>`
- `<a href="{{evidence.withEntity?.url}}" target="_blank">{{evidence.with}}</a>`

**React:** Term cell ID links to AmiGO. Evidence code ID links exist. But reference and with values may not be hyperlinked to external databases when URLs are available.

**Severity:** Medium — users need quick access to verify references and with/from sources.

---

### GAP 10: PubMed Article Preview in Reference Dropdown

**Angular:** When the selected DB is PMID and an accession is entered, the reference dropdown fetches and displays:
- Article title (clickable link to PubMed, max-height 60px)
- Author (with user icon)
- Date (with calendar icon)
- Fetched via `NoctuaLookupService.getPubmedInfo(pmid)`

**React:** ReferenceDropdown has DB select + accession field + save/cancel, but does not fetch or display PubMed article info.

**Severity:** Medium — helps curators verify they have the right reference before saving.

---

### GAP 11: Assigned By / Contributor in Evidence Rows

**Angular:** Evidence rows can show Assigned By (groups) and Contributor columns. In the graph view these are visible by default.

**React:** Evidence rows show Evidence Code, Reference, and With columns only. No Assigned By or Contributor display.

Note: React's `SearchAnnotations.tsx` already shows "Assigned By" — the data is available on the Evidence model.

**Severity:** Medium — important for multi-contributor models.

---

## Summary Priority Table

| #  | Gap                                          | Severity | Scope                 |
| -- | -------------------------------------------- | -------- | --------------------- |
| 1  | Reference field missing autocomplete         | High     | EditorDropdown.tsx    |
| 2  | With field missing autocomplete              | High     | EditorDropdown.tsx    |
| 3  | Per-field delete (reference, with)           | Medium   | ActivityTableNode.tsx |
| 4  | Editor dropdown menu (Search, Fill Root)     | Medium   | EditorDropdown.tsx    |
| 5  | Evidence row action menu                     | Low      | ActivityTableNode.tsx |
| 6  | Node menu structure (submenus)               | Low      | ActivityTableNode.tsx |
| 7  | Add menu item descriptions                   | Low      | ActivityTableNode.tsx |
| 8  | Hover-only edit/delete buttons               | Low      | ActivityTableNode.tsx |
| 9  | External DB links in evidence rows           | Medium   | ActivityTableNode.tsx |
| 10 | PubMed article preview in reference dropdown | Medium   | ReferenceDropdown.tsx |
| 11 | Assigned By / Contributor in evidence rows   | Medium   | ActivityTableNode.tsx |

---

## Steps

### Phase 1: Editor Dropdown Enhancements
- [ ] GAP 1 — Add autocomplete to reference field in EditorDropdown (lookup existing references on focus/type)
- [ ] GAP 2 — Add autocomplete to with field in EditorDropdown (lookup existing with values on focus/type)
- [x] GAP 4 — Add action menu to EditorDropdown (ellipsis button → "Search Annotations", "Fill with root term")

### Phase 2: Evidence Row Enhancements
- [x] GAP 3 — Per-field delete: reference cell delete clears reference only, with cell delete clears with only
- [x] GAP 9 — Hyperlink reference and with values to external database URLs when available
- ~~GAP 11~~ — Removed (showGroup/showContributor not used in graph view)

### Phase 3: Reference Dropdown
- [x] GAP 10 — Fetch and display PubMed article info (title, author, date) when DB is PMID and accession is entered

### Phase 4: Menu & Polish
- [ ] GAP 5 — Add per-evidence-row action menu with "Add Evidence" option
- [ ] GAP 6 — Restructure node menu with "Add" and "Evidence" submenus
- [ ] GAP 7 — Show range description as secondary text in add menu items
- [ ] GAP 8 — Verify hover-only button visibility matches Angular behavior

---

## Recovery Checkpoint

> **Last completed action:** Implemented GAPs 3, 4, 9, 10, 11 + multiline fields
> **Next immediate action:** GAPs 1 & 2 (reference/with autocomplete), then Phase 4 menu polish

## Files Modified

| File                                              | Action                                        | Status |
| ------------------------------------------------- | --------------------------------------------- | ------ |
| `features/gocam/services/activityOperations.ts`   | Added `buildClearEvidenceAnnotationOperations` | Done   |
| `features/gocam/components/ActivityTableNode.tsx`  | Per-field delete, with URLs, assigned by       | Done   |
| `features/gocam/components/forms/EditorDropdown.tsx` | Multiline fields, action menu               | Done   |
| `features/gocam/components/forms/ReferenceDropdown.tsx` | PubMed article preview                  | Done   |
| `features/search/slices/lookupApiSlice.ts`        | Added `getPubmedInfo` endpoint                 | Done   |

## Blockers
- None currently

## Notes
- GAPs 1 & 2 (reference/with autocomplete) require lookup service endpoints — need to verify what API the Angular app calls for these
- GAP 8 (hover buttons) is mostly done in React already — just needs visual verification

## Additional Context

### Angular Editor Dropdown Field Layout (left to right)
```
[Term 250px] [Evidence 250px] [Reference 150px] [With 150px] [Menu] [Cancel] [Save]
```
All fields are `<textarea rows="2">` with autocomplete. Reference and With have DB picker suffix buttons.

### Angular Evidence Row Layout
```
[Evidence Code: label + ID link | delete | edit] [Reference: value/link | delete | edit] [With: value/link | delete | edit] [Menu]
```
Each cell: bordered box, floating label, hover-visible delete (top-right) and edit (bottom-right) buttons.
