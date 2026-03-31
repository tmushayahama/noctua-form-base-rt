# Task: Connector Form — Angular Parity Gaps

**Status:** ACTIVE
**Branch:** dev

## Goal
Bring the React RelationForm + ChemicalConnectorForm to exact feature parity with the Angular activity-connector-form and chemical-connector-form. Every label, button color, layout rule, hint text, section header style, and behavioral detail must match.

## Context
- **Angular connector form:** `C:\work\go\noctua-visual-pathway-editor\src\app\main\apps\noctua-form\cam\activity\activity-connector-form\`
- **Angular chemical connector form:** `C:\work\go\noctua-visual-pathway-editor\src\app\main\apps\noctua-form\cam\activity\chemical-connector-form\`
- **Angular shared SCSS:** `C:\work\go\noctua-visual-pathway-editor\src\@noctua.common\scss\noctua.common.scss`
- **Angular connector SCSS:** `activity-connector-form.component.scss`
- **Angular autocomplete theme:** `C:\work\go\noctua-visual-pathway-editor\src\@noctua\scss\partials\_mdc-form-field-theme.scss`
- **React RelationForm:** `src/features/relations/components/RelationForm.tsx`
- **React ChemicalConnectorForm:** `src/features/relations/components/ChemicalConnectorForm.tsx`
- **React ConnectorForm wrapper:** `src/features/relations/components/ConnectorForm.tsx`
- **React Autocomplete2:** `src/features/search/components/Autocomplete2.tsx`
- **React PathwayViewer (dialog):** `src/app/PathwayViewer.tsx` (lines 334-364)

---

## Thorough Gap Analysis

### GAP 1: Section Label — "Effect Direction" vs "Effect/Direction"
**Angular (line 42):** `<p>Effect Direction</p>`
**React (line 281):** `<SectionRow label="Effect/Direction">`
**Fix:** Change label to `"Effect Direction"`

---

### GAP 2: Section Headers — Wrong Color & Wrong Casing

Angular's `noc-section-heading` style (from `noctua.common.scss:170-174`):
```scss
.noc-section-heading {
  padding-left: 12px;
  font-size: 12px;
  line-height: 30px;
  color: #555;      // ← gray, NOT blue
}
```
Background is `$noc-primary-color-light = rgba(#798fb8, 0.3)` — matches our `SECTION_BG` ✓
Text is **NOT uppercase** in the Angular base styles.

**React (lines 314-319, 362-367):** Uses `uppercase tracking-wide` and `color: PRIMARY (#3b5998)`:
```
className="mt-2 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
style={{ backgroundColor: SECTION_BG, color: PRIMARY }}
```

**Fix:** Remove `uppercase tracking-wide`, change color from `PRIMARY` to `#555`, add `leading-[30px]` for 30px line-height. Both "Suggested Causal Relation" and "Evidence" headers need this.

---

### GAP 3: "Suggested Causal Relation" — Layout Difference

**Angular (lines 102-111):**
- Section header has `border-t border-[#BBB]`
- Below header: a `noc-note mb-4` div with just `{{connectorActivity?.predicate.edge?.label}}`
- Styled: `padding: 20px 0`, `.noc-description { padding-left: 10px; font-size: 12px; }`
- NO "Relation" label on the left — just the edge label text directly

**React (lines 313-330):**
- Section header (uppercase, PRIMARY)
- Below: A row with "Relation" label (100px left) + resolved label in `text-sm font-medium text-blue-700`
- Bottom border instead of top border on header

**Fix:**
- Add `border-t border-[#BBB]` to the section header
- Remove the "Relation" left label
- Show just the edge label text with `pl-[10px] text-xs` (12px, no bold, no blue)
- Change padding to `py-5` (20px) with `mb-4`
- Remove bottom border from value row

---

### GAP 4: "Connect via Chemical Intermediate" Button — Wrong Color

**Angular SCSS (connector-form.component.scss:13-16):**
```scss
.noc-connect-button {
  background-color: #337d33;  // dark green
  color: #fff;
}
```
Button is `mat-raised-button` (elevated, not small).

**React (lines 341-348):** MUI `Button variant="contained" size="small"` — uses default MUI blue.

**Fix:** Add explicit `sx={{ backgroundColor: '#337d33', '&:hover': { backgroundColor: '#2a6629' } }}` or use inline style. Remove `size="small"` to match Angular's normal-sized button.

---

### GAP 5: Effect Direction Hint — Text & Placement

**Angular (lines 56-61):**
- Text: `"The mechanism regulation should be known, so it should be possible to pick the direction of the regulation."`
- Position: To the **RIGHT** of the radio buttons, in a `grow` div on the same row
- Class: `noc-hint noc-sm` → `margin-left: 12px; font-size: 12px; max-width: 260px; color: #676767; font-style: italic`

**React (lines 291-293):**
- Text: `"The mechanism of regulation should be known to determine the direction."`
- Position: **BELOW** the radio buttons
- Classes: `mt-1 max-w-[300px] px-1 text-xs italic text-gray-500`

**Fix:**
- Change text to match Angular exactly
- Move hint to be beside (right of) the radio group, not below
- Change max-width to 260px
- Change color to `#676767`

---

### GAP 6: Radio Row Borders

**Angular SCSS (connector-form.component.scss:36-41):**
```scss
.noc-radio-row {
  width: 100%;
  padding: 5px;
  &:not(:last-child) {
    border-bottom: rgba(primary, 0.6) solid 1px;
  }
}
```
Each radio row has a bottom border (except the last), using the primary color at 60% opacity.

**React:** No borders between radio rows.

**Fix:** Add `border-bottom: 1px solid rgba(59,89,152,0.6)` between radio rows (except last).

---

### GAP 7: Radio Description Placement

**Angular (lines 29-33):** Description appears **INLINE to the RIGHT** of the radio button, on the same row, in a `grow noc-hint` div.

**React (RadioPillGroup lines 499-503):** Description appears **BELOW** the radio pill, as a separate element.

**Fix:** Change layout so description is in the same flex row, to the right of the radio+label, with `grow`, matching `noc-hint` styles (margin-left: 12px, font-size: 12px, max-width: 300px, color: #676767, italic).

---

### GAP 8: Evidence Field Labels

**Angular (line 124):** `<mat-label>Evidence</mat-label>`
**React (line 373):** `label="Evidence Code"`

**Angular (line 154):** `<mat-label>With</mat-label>`
**React:** Uses `WithField` component — need to verify its label.

**Fix:** Change evidence autocomplete label from "Evidence Code" to "Evidence". Verify WithField label matches "With".

---

### GAP 9: Evidence Field Widths — Percentage vs Fixed

**Angular (lines 122-156):**
- Evidence: `w-[55%]` with `p-4`
- Reference: `w-1/4` (25%) with `p-4`
- With: `w-[20%]` with `p-4`

**React (lines 371-401):**
- Evidence: `w-[220px]`
- Reference: `w-[140px]`
- With: `w-[140px]`

**Fix:** Change to percentage-based widths: `w-[55%]`, `w-1/4`, `w-[20%]` with `p-4` padding.

---

### GAP 10: Evidence Fields — Textarea vs Input

**Angular:** All three fields are `<textarea rows="2">` elements inside `mat-form-field appearance="outline"`.

**React:** Uses TermAutocomplete (custom), ReferenceField, WithField components — need to verify they render as textareas.

**Fix:** Ensure evidence fields render as multi-row textareas (rows=2) with outline appearance, not single-line inputs.

---

### GAP 11: Missing "Why is the Save button disabled?" Warning

**Angular footer (lines 168-172):**
```html
@if (!connectorFormGroup.valid) {
  <button mat-button color="warn" class="noc-rounded-button noc-sm">
    Why is the "Save" button disabled?
  </button>
}
```
When form is invalid, a warning-colored button appears in the footer.

**React:** No equivalent.

**Fix:** Add a warning button in the footer (left side) when `!relation`, showing "Why is the 'Save' button disabled?"

---

### GAP 12: Footer Box-Shadow

**Angular SCSS (noctua.common.scss:88-95):**
```scss
.noc-drawer-footer {
  background-color: #f2f2f2;
  border-top: 1px solid #ccc;
  box-shadow: 2px -5px 2px 0px rgba(0, 0, 0, 0.26);
}
```

**React (line 414):** `bg-gray-100` (≈ #f3f4f6), `border-t border-gray-200`, no box-shadow.

**Fix:** Add `box-shadow: 2px -5px 2px 0px rgba(0, 0, 0, 0.26)` to footer.

---

### GAP 13: Missing Toast Messages on Save

**Angular save():** Shows `'Causal relation successfully created.'` toast.
**Angular chemical save():** Shows `'Chemical Reactions created.'` toast.

**React:** No toast messages after save/delete.

**Fix:** Add toast/snackbar notifications on successful save for both forms.

---

### GAP 14: Chemical Connector Header Style

**Angular (chemical-connector-form.component.html:2-9):**
- Proper drawer header: `noc-drawer-header` (40px, white bg, elevation shadow)
- Title: `noc-drawer-header-title` (14px bold)
- Close button: `mat-stroked-button` with X icon + "Close" text

**React (ChemicalConnectorForm.tsx:221-234):**
- Uses `SECTION_BG` background (translucent blue-gray, not white)
- Title: `text-sm font-semibold` in PRIMARY color
- Close button: MUI `Button variant="outlined"` without X icon

**Fix:** Change header to white background, add the X icon before "Close" text, use bold 14px title.

---

### GAP 15: Chemical Connector Section Headers

Same issue as GAP 2. The chemical connector section headers ("Participants common to...") use Angular's `noc-section-heading` style (color: #555, not uppercase, 30px height).

React uses uppercase + PRIMARY color.

**Fix:** Same as GAP 2 — remove uppercase, change color to #555.

---

### GAP 16: Chemical Connector Empty State Style

**Angular `noc-no-info` class (noctua.common.scss:214-220):**
```scss
.noc-no-info {
  padding: 30px 10px;
  font-size: 30px;
  font-style: italic;
  text-align: center;
  color: #aaa;
}
```
Very prominent 30px font.

**React:** `text-xs italic text-gray-400` — tiny 12px text.

**Fix:** Match Angular's prominent empty state: `text-[30px] italic text-center text-[#aaa] px-[10px] py-[30px]`.

---

### GAP 17: Dialog Title Text

**Angular header (line 4):** `"Causal Relation Form"`
**React PathwayViewer (line 343):** `"Causal Relation"` (missing "Form")

**Fix:** Change dialog title to `"Causal Relation Form"`.

---

### GAP 18: Autocomplete Suggestion Panel — Clamping & Styling

The autocomplete dropdown panel has several differences between Angular and React.

**Angular (from `_mdc-form-field-theme.scss`):**
- Panel class: `noc-term-autocomplete`
- Background: `#fbf9de` (light cream/beige)
- Min-width: `400px`, Max-width: `600px`
- Option padding: `8px 16px`
- Option min-height: `40px`, height: `auto`
- Option border-bottom: `rgba($noc-primary, 0.3) solid 1px` (separator between items)
- **NO text clamping** — uses `white-space: normal !important` to allow natural wrapping
- Label: `font-size: 12px; flex-shrink: 1; min-width: 0` (shrinks but does NOT clamp)
- ID: `font-size: 10px; color: rgba(0,0,0,0.6); flex-shrink: 0` (never truncates)
- Layout: label left → `<span class="grow">` spacer → ID right

**React Autocomplete2 (lines ~196-234):**
- Panel background: `!bg-amber-100` (Tailwind amber — close but not exact)
- Panel width: `Math.max(anchorRef.current?.clientWidth || 0, 400)` — min 400px ✓, but **no max-width cap**
- Option padding: `p-3` (12px all sides)
- **Label uses `line-clamp-2`** — forces 2-line clamp with hidden overflow. This is the CLAMPING issue.
- ID: `shrink-0 text-gray-500`
- No border-bottom between options
- Evidence items get a bold badge (`mr-2 font-bold`) that Angular doesn't have

**Specific differences:**

| Property | Angular | React | Match? |
|----------|---------|-------|--------|
| Panel background | `#fbf9de` (cream) | `bg-amber-100` (~#fef3c7) | Close but different shade |
| Panel max-width | `600px` | None | Missing |
| Label clamping | None (`white-space: normal`, wraps freely) | `line-clamp-2` (clamps at 2 lines) | WRONG |
| Label flex | `flex-shrink: 1; min-width: 0` | `flex-grow; line-clamp-2` | Different approach |
| ID font-size | `10px` | Inherits `text-xs` (12px) | Different |
| ID color | `rgba(0,0,0,0.6)` | `text-gray-500` (#6b7280) | Close |
| Option separator | `border-bottom: 1px rgba(primary, 0.3)` | None | Missing |
| Option padding | `8px 16px` | `12px` all sides (p-3) | Different |
| Option min-height | `40px` | Not set | Missing |
| Evidence badge | None | Bold badge before label | Extra in React |

**Fix:**
- Remove `line-clamp-2` from label — replace with `flex-shrink min-w-0` to allow natural flex wrapping (no clamping)
- Change panel background to `#fbf9de`
- Add `max-w-[600px]` to panel
- Add border-bottom between options: `border-b border-[rgba(59,89,152,0.3)]`
- Change option padding to `px-4 py-2` (16px horizontal, 8px vertical)
- Add `min-h-[40px]` to options
- Change ID to `text-[10px] text-black/60 shrink-0`
- Remove bold evidence badge (Angular doesn't have it)

---

## Summary Priority Table

| # | Gap | Severity | Files Affected |
|---|-----|----------|----------------|
| 1 | "Effect/Direction" → "Effect Direction" | Low | RelationForm.tsx |
| 2 | Section headers: wrong color (#3b5998 → #555) + remove uppercase | Medium | RelationForm.tsx, ChemicalConnectorForm.tsx |
| 3 | "Suggested Causal Relation" layout (remove "Relation" label, fix styling) | Medium | RelationForm.tsx |
| 4 | Chemical button color (blue → green #337d33) | Low | RelationForm.tsx |
| 5 | Effect Direction hint text & position (below → right) | Medium | RelationForm.tsx |
| 6 | Radio row borders (missing between rows) | Low | RelationForm.tsx |
| 7 | Radio description placement (below → inline right) | Medium | RelationForm.tsx |
| 8 | Evidence label "Evidence Code" → "Evidence" | Low | RelationForm.tsx, ChemicalConnectorForm.tsx |
| 9 | Evidence widths: fixed px → percentage | Medium | RelationForm.tsx, ChemicalConnectorForm.tsx |
| 10 | Evidence fields: verify textarea rendering | Low | Check ReferenceField, WithField, TermAutocomplete |
| 11 | "Why is Save disabled?" warning button | Medium | RelationForm.tsx |
| 12 | Footer box-shadow | Low | RelationForm.tsx |
| 13 | Toast messages on save | Medium | RelationForm.tsx, ChemicalConnectorForm.tsx |
| 14 | Chemical connector header style | Low | ChemicalConnectorForm.tsx |
| 15 | Chemical connector section headers (same as #2) | Medium | ChemicalConnectorForm.tsx |
| 16 | Chemical connector empty state (12px → 30px) | Low | ChemicalConnectorForm.tsx |
| 17 | Dialog title "Causal Relation" → "Causal Relation Form" | Low | PathwayViewer.tsx |
| 18 | Autocomplete panel: clamping, background, separators, sizing | High | Autocomplete2.tsx |

---

## Steps

### Phase 1: Labels, Text, & Colors (Quick Fixes)
- [ ] GAP 1 — Fix "Effect/Direction" → "Effect Direction"
- [ ] GAP 4 — Chemical Intermediate button: green (#337d33)
- [ ] GAP 8 — Evidence label: "Evidence Code" → "Evidence"
- [ ] GAP 17 — Dialog title: "Causal Relation" → "Causal Relation Form"

### Phase 2: Section Headers & Suggested Relation
- [ ] GAP 2 — Section headers: color → #555, remove uppercase, 30px line-height
- [ ] GAP 3 — Suggested Causal Relation: remove "Relation" label, fix styling, add border-t
- [ ] GAP 15 — Chemical connector section headers (same fix as GAP 2)

### Phase 3: Radio Rows & Descriptions
- [ ] GAP 6 — Add border-bottom between radio rows
- [ ] GAP 7 — Move descriptions inline-right of radio buttons

### Phase 4: Effect Direction Hint & Evidence Layout
- [ ] GAP 5 — Fix hint text content, move to right of radio group
- [ ] GAP 9 — Evidence widths: percentage-based (55%, 25%, 20%)
- [ ] GAP 10 — Verify textarea rendering for evidence fields

### Phase 5: Footer & Feedback
- [ ] GAP 11 — Add "Why is Save disabled?" warning button
- [ ] GAP 12 — Add footer box-shadow
- [ ] GAP 13 — Add toast messages on save

### Phase 6: Chemical Connector Polish
- [ ] GAP 14 — Fix header styling (white bg, icon, bold title)
- [ ] GAP 16 — Fix empty state styling (30px, prominent)

### Phase 7: Autocomplete Panel Parity
- [ ] GAP 18 — Remove line-clamp-2, allow natural flex wrapping
- [ ] GAP 18 — Change panel background to #fbf9de
- [ ] GAP 18 — Add max-w-[600px] to panel
- [ ] GAP 18 — Add border-bottom separators between options
- [ ] GAP 18 — Fix option padding (px-4 py-2), min-height (40px)
- [ ] GAP 18 — Fix ID styling (10px, rgba(0,0,0,0.6), shrink-0)
- [ ] GAP 18 — Remove bold evidence badge

---

## Recovery Checkpoint

> **Last completed action:** Gap analysis updated — removed GAP 6 (radio pill style OK per user), GAP 15 (already fixed), GAP 20 (React way is fine). Added GAP 18 (autocomplete panel clamping & styling). Renumbered to 18 gaps.
> **Next immediate action:** User review of updated plan, then Phase 1 implementation

## Failed Approaches

| What was tried | Why it failed | Date |
|----------------|---------------|------|
| | | |

## Files Modified

| File | Action | Status |
|------|--------|--------|
| `.plans/feature/connector-form-angular-parity.md` | Updated plan | Done |

## Blockers
- None — all decisions resolved

## Notes
- GAP 6 (old — radio pill vs circle style) removed per user direction — current pill style is acceptable
- GAP 15 (old — inline vs separate dialog) already fixed
- GAP 20 (old — form re-init after save) not needed — React close-on-save is preferred
- Some React additions (Delete button, Cancel button, Add Evidence button) are improvements over Angular — keep them
- The Angular evidence section uses Angular FormArray with RxJS subscriptions for autocomplete debouncing. React uses RTK Query hooks instead — the approach is different but functionally equivalent
- The ConnectorForm wrapper (showing Subject/Object labels) is a React addition not in Angular — provides useful context

## Additional Context

### Angular Style Variables Reference
```
$noc-primary-color-light: rgba(#798fb8, 0.3)  →  React SECTION_BG ✓
$noc-primary-color-lighter: #dfe3ee
$primary (theme): ~#3b5998
noc-section-heading color: #555
noc-hint color: #676767
noc-connect-button bg: #337d33
noc-drawer-footer bg: #f2f2f2
noc-drawer-footer border: #ccc
noc-no-info: 30px italic center #aaa
autocomplete panel bg: #fbf9de
autocomplete option separator: rgba(primary, 0.3)
autocomplete label: 12px, flex-shrink:1, min-width:0
autocomplete ID: 10px, rgba(0,0,0,0.6), flex-shrink:0
```
