# Task: Codebase structure cleanup — constants, types, component organization

**Status:** DONE
**Branch:** dev

## Goal
Clean up structural anti-patterns: extract hardcoded constants into proper models/data files, consolidate scattered type definitions, add barrel exports, fix naming issues. The codebase should follow consistent React/TS conventions where constants live in data files, types live in model files, and components are importable via barrel exports.

## Context
- **Triggered by:** User audit — loose magic strings, missing barrel exports, scattered types, inconsistent component organization
- **Scope:** Refactor only — no feature changes, no new functionality

## Current State
- What works now: All features function correctly
- What's broken/missing:
  - Magic strings/constants defined inside component files
  - Type interfaces scattered across component files instead of model files
  - Zero barrel exports in feature directories (only 2 index.ts in entire src/)
  - Duplicate color constants across relation components
  - Filename typo (`GlobalDIalog.tsx`)
  - Types defined inside data files (`activityTemplates.ts`)

---

## Steps

### Phase 1: Extract constants from components into data/model files

- [x] **1.1** `MODEL_STATES` in `CamMetadataForm.tsx:16` → move to `src/features/gocam/data/camConstants.ts` as a typed const (also used in `CamToolbar.tsx` switch)
- [x] **1.2** Color constants (`PRIMARY`, `PRIMARY_BORDER`, `SECTION_BG`) duplicated in `RelationForm.tsx:56-58` and `ChemicalConnectorForm.tsx:26` → move to `src/@noctua.core/data/colors.ts` (file already exists, consolidate there)
- [x] **1.3** Layout options (`layoutDetailOptions`, `spacingOptions`) in `GraphToolbar.tsx:22-31` → move to `src/features/pathway/data/toolbarOptions.ts`
- [x] **1.4** `DB_NONE` constant in `WithDropdown.tsx:31` → move to `src/features/gocam/data/allowedDatabases.ts` (file already exists)

### Phase 2: Consolidate scattered type definitions

- [x] **2.1** Move types from `activityTemplates.ts` (`NodeCategory`, `TermDescriptor`, `RelationDescriptor`) into `src/features/gocam/models/formModels.ts` (model file already exists)
- [x] **2.2** Move shared/reused interfaces from component files to model files:
  - `FlatRow` from `ActivityForm.tsx` → `formModels.ts`
  - `DisplayTreeNode` from `ActivityTableNode.tsx` → `cam.ts` or a new `displayModels.ts`
  - `WithEntity`, `WithGroup` from `WithDropdown.tsx` → `formModels.ts`
- [ ] **2.3** Keep component-specific `Props` interfaces (e.g., `ActivityFormProps`, `EntityRowProps`) in their component files — this is standard React convention. Do NOT move these.

### Phase 3: Fix naming and minor issues

- [x] **4.1** Rename `GlobalDIalog.tsx` → `GlobalDialog.tsx` (typo fix) + update all imports

### Phase 5: Replace hardcoded hex colors with nearest Tailwind utilities

Replace all `[#hex]` arbitrary values in Tailwind classes with the nearest default Tailwind color class.
Also replace inline style color constants (`const PRIMARY = '#3b5998'`) with Tailwind classes where possible, or centralize in `@noctua.core/data/colors.ts` where inline styles are required (e.g., JointJS shapes).

#### Tailwind class replacements (components)

| File | Current | Tailwind replacement | Context |
|------|---------|---------------------|---------|
| `ActivityForm.tsx:71` | `border-l-[#7cd488]` | `border-l-green-400` | Default activity border |
| `ActivityForm.tsx:73` | `border-l-[#f4c89c]` | `border-l-orange-300` | Molecule activity border |
| `ActivityForm.tsx:75` | `border-l-[#d3b5f5]` | `border-l-purple-300` | Protein Complex activity border |
| `CamToolbar.tsx:64` | `bg-[#f4c89c]`, `border-[#e0a96a]` | `bg-orange-300`, `border-orange-400` | Warning status |
| `CamToolbar.tsx:66` | `bg-[#b6f1cc]`, `border-[#7dd8a0]` | `bg-green-200`, `border-green-400` | Success status |
| `CamToolbar.tsx:68` | `bg-[#d8f6a3]`, `border-[#b8d87a]` | `bg-lime-200`, `border-lime-400` | Info status |

#### Inline style color replacements → centralize in `@noctua.core/data/colors.ts`

These are used in `style={{}}` or JS constants and can't be plain Tailwind classes. Centralize as named exports.

| Color value | Nearest Tailwind equiv | Semantic name | Used in |
|-------------|----------------------|---------------|---------|
| `#3b5998` / `rgba(59,89,152,*)` | `blue-700` | `PRIMARY` | RelationForm, ConnectorForm, ActivityTableNode, Autocomplete2 |
| `rgba(121,143,184,0.3)` | `slate-400/30` | `SECTION_BG` | RelationForm, ChemicalConnectorForm, ActivityForm, ActivityTable |
| `#1976d2` | `blue-600` | semantic: info/link | CamErrors |
| `#ff4081` | `pink-500` | semantic: error accent | CamErrors |
| `#ff9800` | `amber-500` | semantic: warning | CamErrors |
| `#4caf50` | `green-500` | semantic: success | CamErrors |
| `#f44336` | `red-500` | semantic: error | CamErrors |
| `#676767` | `neutral-500` | semantic: muted text | RelationForm |
| `#337d33` / `#2a6629` | `green-700` / `green-800` | green button | RelationForm |
| `#fbf9de` | `yellow-50` | dropdown bg | EditorDropdown, ReferenceDropdown, WithDropdown, Autocomplete2 |
| `#e8f5e8` | `green-100` | success badge bg | CamErrors |
| `#f9f9f9` | `neutral-50` | container bg | CamErrors |
| `#fafafa` | `neutral-50` | main bg | CamErrors |
| `#d2e8f8` | `blue-100` | selected cell bg | ActivityTableNode |
| `#7ec8d6` / `#aee9f5` / `#8dd4e2` | `sky-400` / `sky-200` / `sky-300` | status indicator | CamToolbar |
| `#a0b3b8` / `#bbc9cc` | `slate-400` / `slate-300` | contributor/badge | CamToolbar |

#### JointJS graph colors (keep as hex in `pathway/graph/colors.ts`)

These colors are passed to JointJS/SVG APIs that require hex/rgba strings. Keep them as constants but centralize:

| Color value | Nearest Tailwind equiv | Used in |
|-------------|----------------------|---------|
| `#DDDDDD` | `neutral-300` | camCanvas.ts grid |
| `rgba(0,0,255,0.3)` | `blue-500/30` | shapes.ts wrapper stroke |
| `#333333` | `neutral-700` | shapes.ts label text |
| `#7c68fc` | `violet-500` | shapes.ts link label |
| `#005580` | `sky-800` | shapes.ts line stroke |
| `#002255` | `blue-950` | StencilPalette border |

#### Steps

- [x] **5.1** Replace Tailwind arbitrary hex classes with nearest Tailwind color classes (table above)
- [x] **5.2** For `CamErrors.tsx` — replace inline style hex colors with Tailwind classes (this component uses many `style={{}}` that could be Tailwind)
- [x] **5.3** Centralize shared inline style colors (`PRIMARY`, `SECTION_BG`, `#fbf9de` dropdown bg) as named exports in `@noctua.core/data/colors.ts`
- [x] **5.4** For `CamToolbar.tsx` inline style hex colors → convert to Tailwind classes where possible
- [x] **5.5** JointJS colors in `pathway/graph/` — leave as hex strings but move magic values into named constants at top of file or in `pathway/graph/colors.ts`
- [x] **5.6** Visual regression check — compare before/after (colors will shift slightly to nearest Tailwind value)

---

## Decision Log

| Decision | Rationale |
|----------|-----------|
| Keep `Props` interfaces in component files | Standard React convention — co-located props only used by one component don't need a separate file |
| Don't create component folders (e.g., `CamToolbar/index.tsx`) | Overkill for this codebase size — flat files in `components/` with barrel exports is sufficient |
| Don't refactor large files yet (activityOperations 757 lines, camCanvas 547 lines) | Separate concern — file size refactoring is a different task, this plan is about constants/types/structure |
| Replace hardcoded hex with nearest Tailwind color | Use standard palette instead of arbitrary values — slight color shift is acceptable for consistency |
| JointJS colors stay as hex strings | SVG/JointJS APIs need string values, not Tailwind classes — but centralize them as named constants |

## Blockers
- None currently

## Notes
- Phase 3.9 (updating imports to use barrels) is the highest-risk step — needs `type-check` run after
- Each phase should end with `npm run type-check` passing
- Phases are independent — can be done in any order, though Phase 1 and 2 are quickest wins
