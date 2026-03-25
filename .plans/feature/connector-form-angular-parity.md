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
- **React RelationForm:** `src/features/relations/components/RelationForm.tsx`
- **React ChemicalConnectorForm:** `src/features/relations/components/ChemicalConnectorForm.tsx`
- **React ConnectorForm wrapper:** `src/features/relations/components/ConnectorForm.tsx`
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

### GAP 6: Radio Button Style — Pills vs Material Radio Circles

**Angular:** Uses `mat-radio-button` with class `noc-radio-button-rounded`. These render as **circular radio buttons** (Material standard radio indicators) with text next to them.

**React:** Uses custom `RadioPillGroup` with **pill-shaped filled buttons** (rounded-full, colored background when selected, white text).

**This is a major visual difference.** Angular users see standard radio buttons; React users see filled pill shapes.

**Fix:** Replace RadioPillGroup with actual radio button styling — show a radio circle indicator next to the label text. The radio row should be a flex row with the radio circle + label at 170px width, then description to the right.

---

### GAP 7: Radio Row Borders

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

### GAP 8: Radio Description Placement

**Angular (lines 29-33):** Description appears **INLINE to the RIGHT** of the radio button, on the same row, in a `grow noc-hint` div.

**React (RadioPillGroup lines 499-503):** Description appears **BELOW** the radio pill, as a separate element.

**Fix:** Change layout so description is in the same flex row, to the right of the radio+label, with `grow`, matching `noc-hint` styles (margin-left: 12px, font-size: 12px, max-width: 300px, color: #676767, italic).

---

### GAP 9: Evidence Field Labels

**Angular (line 124):** `<mat-label>Evidence</mat-label>`
**React (line 373):** `label="Evidence Code"`

**Angular (line 154):** `<mat-label>With</mat-label>`
**React:** Uses `WithField` component — need to verify its label.

**Fix:** Change evidence autocomplete label from "Evidence Code" to "Evidence". Verify WithField label matches "With".

---

### GAP 10: Evidence Field Widths — Percentage vs Fixed

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

### GAP 11: Evidence Fields — Textarea vs Input

**Angular:** All three fields are `<textarea rows="2">` elements inside `mat-form-field appearance="outline"`.

**React:** Uses TermAutocomplete (custom), ReferenceField, WithField components — need to verify they render as textareas.

**Fix:** Ensure evidence fields render as multi-row textareas (rows=2) with outline appearance, not single-line inputs.

---

### GAP 12: Missing "Why is the Save button disabled?" Warning

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

### GAP 13: Footer Box-Shadow

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

### GAP 14: Missing Toast Messages on Save

**Angular save():** Shows `'Causal relation successfully created.'` toast.
**Angular chemical save():** Shows `'Chemical Reactions created.'` toast.

**React:** No toast messages after save/delete.

**Fix:** Add toast/snackbar notifications on successful save for both forms.

---

### GAP 15: Chemical Connector Form — Opens as Separate Dialog

**Angular (component.ts lines 106-111):**
```typescript
openChemicalConnectorForm() {
  if (this.closeDialog) { this.closeDialog(); }
  this.noctuaFormDialogService.openCreateActivityDialog(FormType.CHEMICAL_CONNECTOR);
}
```
Angular **closes the connector dialog** and opens chemical connector as a **separate, standalone dialog/drawer**.

**React:** Shows ChemicalConnectorForm **inline** inside RelationForm (replaces the button area).

**Decision needed:** Is inline acceptable or should we match Angular's separate-dialog behavior? Inline is arguably better UX (no dialog closing/reopening), but it's different from Angular.

---

### GAP 16: Chemical Connector Header Style

**Angular (chemical-connector-form.component.html:2-9):**
- Proper drawer header: `noc-drawer-header` (40px, white bg, elevation shadow)
- Title: `noc-drawer-header-title` (14px bold)
- Close button: `mat-stroked-button` with X icon + "Close" text

**React (ChemicalConnectorForm.tsx:221-234):**
- Uses `SECTION_BG` background (translucent blue-gray, not white)
- Title: `text-sm font-semibold` in PRIMARY color
- Close button: MUI `Button variant="outlined"` without X icon

**Fix:** If keeping inline, change header to white background, add the X icon before "Close" text, use bold 14px title.

---

### GAP 17: Chemical Connector Section Headers

Same issue as GAP 2. The chemical connector section headers ("Participants common to...") use Angular's `noc-section-heading` style (color: #555, not uppercase, 30px height).

React uses uppercase + PRIMARY color.

**Fix:** Same as GAP 2 — remove uppercase, change color to #555.

---

### GAP 18: Chemical Connector Empty State Style

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

### GAP 19: Dialog Title Text

**Angular header (line 4):** `"Causal Relation Form"`
**React PathwayViewer (line 343):** `"Causal Relation"` (missing "Form")

**Fix:** Change dialog title to `"Causal Relation Form"`.

---

### GAP 20: Angular Form Re-initialization After Save

**Angular save() (lines 114-123):**
After saving, Angular calls `initializeForm()` to reset the form for another connection. This allows the user to create multiple connections without re-opening the dialog.

**React:** Closes the dialog/form on save (`onSaved()` → `handleCloseConnectorForm`).

**Decision needed:** Should we re-initialize for another connection or close? Angular's behavior allows batch creation.

---

## Summary Priority Table

| # | Gap | Severity | Files Affected |
|---|-----|----------|----------------|
| 1 | "Effect/Direction" → "Effect Direction" | Low | RelationForm.tsx |
| 2 | Section headers: wrong color (#3b5998 → #555) + remove uppercase | Medium | RelationForm.tsx, ChemicalConnectorForm.tsx |
| 3 | "Suggested Causal Relation" layout (remove "Relation" label, fix styling) | Medium | RelationForm.tsx |
| 4 | Chemical button color (blue → green #337d33) | Low | RelationForm.tsx |
| 5 | Effect Direction hint text & position (below → right) | Medium | RelationForm.tsx |
| 6 | Radio style: pills → circle radios with proper Material look | High | RelationForm.tsx (RadioPillGroup) |
| 7 | Radio row borders (missing between rows) | Low | RelationForm.tsx |
| 8 | Radio description placement (below → inline right) | Medium | RelationForm.tsx |
| 9 | Evidence label "Evidence Code" → "Evidence" | Low | RelationForm.tsx, ChemicalConnectorForm.tsx |
| 10 | Evidence widths: fixed px → percentage | Medium | RelationForm.tsx, ChemicalConnectorForm.tsx |
| 11 | Evidence fields: verify textarea rendering | Low | Check ReferenceField, WithField, TermAutocomplete |
| 12 | "Why is Save disabled?" warning button | Medium | RelationForm.tsx |
| 13 | Footer box-shadow | Low | RelationForm.tsx |
| 14 | Toast messages on save | Medium | RelationForm.tsx, ChemicalConnectorForm.tsx |
| 15 | Chemical connector: inline vs separate dialog | Decision | RelationForm.tsx, ChemicalConnectorForm.tsx |
| 16 | Chemical connector header style | Low | ChemicalConnectorForm.tsx |
| 17 | Chemical connector section headers (same as #2) | Medium | ChemicalConnectorForm.tsx |
| 18 | Chemical connector empty state (12px → 30px) | Low | ChemicalConnectorForm.tsx |
| 19 | Dialog title "Causal Relation" → "Causal Relation Form" | Low | PathwayViewer.tsx |
| 20 | Form re-init after save (vs close) | Decision | RelationForm.tsx, PathwayViewer.tsx |

---

## Steps

### Phase 1: Labels, Text, & Colors (Quick Fixes)
- [ ] GAP 1 — Fix "Effect/Direction" → "Effect Direction"
- [ ] GAP 4 — Chemical Intermediate button: green (#337d33)
- [ ] GAP 9 — Evidence label: "Evidence Code" → "Evidence"
- [ ] GAP 19 — Dialog title: "Causal Relation" → "Causal Relation Form"

### Phase 2: Section Headers & Suggested Relation
- [ ] GAP 2 — Section headers: color → #555, remove uppercase, 30px line-height
- [ ] GAP 3 — Suggested Causal Relation: remove "Relation" label, fix styling, add border-t
- [ ] GAP 17 — Chemical connector section headers (same fix as GAP 2)

### Phase 3: Radio Button Overhaul
- [ ] GAP 6 — Replace pill buttons with Material-style radio circles
- [ ] GAP 7 — Add border-bottom between radio rows
- [ ] GAP 8 — Move descriptions inline-right of radio buttons

### Phase 4: Effect Direction Hint & Evidence Layout
- [ ] GAP 5 — Fix hint text content, move to right of radio group
- [ ] GAP 10 — Evidence widths: percentage-based (55%, 25%, 20%)
- [ ] GAP 11 — Verify textarea rendering for evidence fields

### Phase 5: Footer & Feedback
- [ ] GAP 12 — Add "Why is Save disabled?" warning button
- [ ] GAP 13 — Add footer box-shadow
- [ ] GAP 14 — Add toast messages on save

### Phase 6: Chemical Connector Polish
- [ ] GAP 16 — Fix header styling (white bg, icon, bold title)
- [ ] GAP 18 — Fix empty state styling (30px, prominent)

### Phase 7: Decisions & Behavior
- [ ] GAP 15 — Decide: inline chemical connector or separate dialog
- [ ] GAP 20 — Decide: re-initialize form after save or close

---

## Recovery Checkpoint

> **Last completed action:** Thorough gap analysis — all 20 gaps documented
> **Next immediate action:** Phase 1 — Quick label/text/color fixes

## Failed Approaches

| What was tried | Why it failed | Date |
|----------------|---------------|------|
| | | |

## Files Modified

| File | Action | Status |
|------|--------|--------|
| `.plans/feature/connector-form-angular-parity.md` | NEW (this plan) | Done |

## Blockers
- GAP 15 and GAP 20 need user decisions before implementation

## Notes
- The RadioPillGroup rewrite (GAP 6) is the largest change — it affects the visual appearance of the entire form
- Some React additions (Delete button, Cancel button, Add Evidence button) are actually improvements over Angular — keep them unless user says otherwise
- The Angular evidence section uses Angular FormArray with RxJS subscriptions for autocomplete debouncing. React uses RTK Query hooks instead — the approach is different but functionally equivalent.
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
```

### Key Angular Behavior: Form Re-initialization
After a successful save, Angular calls `initializeForm()` which resets the form but keeps the dialog open. This lets users create multiple connections in sequence. React currently closes the dialog on save. This is a workflow difference that affects user productivity.
