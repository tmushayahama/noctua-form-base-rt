# Task: Upgrade to React 19, Tailwind 4, and migrate MUI → Mantine

**Status:** ACTIVE
**Issue:** —
**Branch:** dev (recommend a dedicated feature branch per phase)

## Goal

Bring the workbench onto current major versions of its UI stack:
- React 18.3 → **React 19**
- Tailwind 3.4 → **Tailwind 4**
- MUI 6 → **Mantine** (latest)

Done = app builds, lints, type-checks; dev/prod servers run; every screen renders and behaves the same as before; no `@mui/*` imports remain; `tailwind.config.js` and `postcss.config.cjs` removed (Tailwind 4 CSS-first config).

## Context

- **Related files:**
  - `package.json`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.cjs`
  - `src/main.tsx`, `src/App.tsx`, `src/index.css`
  - `src/@noctua.core/theme/` — MUI theme + component overrides (will become a Mantine theme)
  - 34 component files importing from `@mui/*` (full list at bottom in **Inventory**)
- **Triggered by:** user request to bring stack current.

## Current State

**Works now:**
- All UI features render via MUI 6 + Tailwind 3.
- Theme defined in `src/@noctua.core/theme/theme.ts` (palette + button/dialog overrides), provided via `@emotion/react` `ThemeProvider` in `App.tsx`.
- `index.css` uses `@tailwind base/components/utilities` directives.
- `tailwind.config.js` extends colors from the same `noctuaColors` JS object the MUI theme uses (single source of truth for palette).

**What changes:**
- Three orthogonal but interacting upgrades. Sequence chosen to minimize blast radius:
  1. **React 19 first** — smallest diff, rebases all deps onto a common foundation.
  2. **Tailwind 4 next** — purely styling/config, no component swaps yet.
  3. **MUI → Mantine last** — largest diff; do it on a Tailwind-4 + React-19 base so we're not chasing three moving targets at once.

## Steps

### Phase 1: React 18 → 19

- [ ] Bump in `package.json`:
  - `react`, `react-dom` → `^19`
  - `@types/react`, `@types/react-dom` → `^19`
  - `@testing-library/react` → `^16` (v14 doesn't support React 19)
  - `@testing-library/dom` → `^10`
- [ ] Verify peer-dep compatibility (no upgrade needed, but confirm warnings are clean):
  - `react-redux@9`, `react-router-dom@7`, `@reduxjs/toolkit@2`, `react-hook-form@7`, `@apollo/client@3.13`, `framer-motion@11`, `reactflow@11`, `react-ga4`, `@use-gesture/react`, `react-icons`
  - MUI 6 supports React 19 — keep it during this phase.
- [ ] Run `npm install` (delete `node_modules` + lockfile if peer-dep solver complains).
- [ ] Fix codemod targets:
  - `forwardRef` calls — no rewrite needed in React 19, but check for any deprecated patterns (`defaultProps` on function components, string refs — grep should come back empty).
  - `ReactDOM.render` (already on `createRoot` in `src/main.tsx`).
  - Implicit `children` in component props — React 19 requires explicit `children?: ReactNode`. TS errors will pinpoint.
- [ ] `npm run type-check`, `npm run lint`, `npm run build`, `npm run dev` — verify app boots.
- [ ] Smoke-test key flows: load CAM, open Activity form, open Right Drawer, search autocomplete, dialogs.
- [ ] Commit: "chore: upgrade to React 19".

### Phase 2: Tailwind 3 → 4

Tailwind 4 is a major rewrite. Options for integration:
- **Option A — `@tailwindcss/vite` plugin (recommended)**: drop PostCSS entirely, faster, official path.
- **Option B — `@tailwindcss/postcss` plugin**: keep `postcss.config.cjs`, lower-risk diff.

Recommend **Option A**. Notes below assume A.

- [ ] Install:
  - `tailwindcss@^4`
  - `@tailwindcss/vite@^4`
  - `prettier-plugin-tailwindcss` → latest (v4-aware)
- [ ] Uninstall: `autoprefixer`, `postcss` (Tailwind 4 includes its own pipeline). Delete `postcss.config.cjs`.
- [ ] Update `vite.config.ts`:
  - `import tailwindcss from '@tailwindcss/vite'`
  - Add `tailwindcss()` to `plugins` array.
- [ ] Replace `src/index.css` directives:
  - `@tailwind base; @tailwind components; @tailwind utilities;` → `@import "tailwindcss";`
- [ ] Move palette into CSS-first `@theme` block in `src/index.css`. Mirror the existing `noctuaColors` keys so Tailwind classes like `bg-primary-500` keep working:
  ```css
  @theme {
    --color-primary-50: #e4e7ec;
    --color-primary-100: #bbc3d0;
    /* ...etc through 900 */
    --color-accent-50: #fdf8e7;
    /* ...etc through 900 */
    --text-2xs: 0.625rem;
    --text-2xs--line-height: 0.875rem;
    --text-3xs: 0.5rem;
    --text-3xs--line-height: 0.625rem;
  }
  ```
  - Decide: keep `noctuaColors` JS object (still consumed by the MUI theme during transition, and later by the Mantine theme) and duplicate values into CSS vars — OR write a tiny build-time generator. Duplication is fine for one palette; revisit if it grows.
- [ ] Delete `tailwind.config.js`. (If a `content` glob is needed, Tailwind 4 auto-detects; only add a `@source` directive in CSS if something is missed.)
- [ ] `@apply` inside `@layer base` already in `index.css` still works in v4, but utilities defined in CSS need `@reference "tailwindcss"` if used in CSS modules. Plain `index.css` does not need it.
- [ ] Run the official Tailwind 4 upgrade codemod for renamed utilities:
  - `npx @tailwindcss/upgrade@latest`
  - Common renames it handles: `shadow-sm` → `shadow-xs`, `rounded-sm` → `rounded-xs`, `outline-none` → `outline-hidden`, `ring` default-width change, `bg-opacity-*` → `bg-{color}/{opacity}` syntax, etc.
  - Review the diff carefully — codemod is conservative but not perfect.
- [ ] `npm run build` and `npm run dev` — visually inspect every screen for regressions (shadows, rings, focus rings, opacity utilities are most likely to drift).
- [ ] Commit: "chore: upgrade to Tailwind 4".

### Phase 3: MUI → Mantine

Largest phase. Strategy: replace **by component family**, not by file. Each family gets its own commit so regressions are easy to bisect.

#### 3a. Bootstrap Mantine alongside MUI

- [ ] Install:
  - `@mantine/core`, `@mantine/hooks`
  - `@mantine/notifications` (Snackbar replacement)
  - `@mantine/modals` (optional — for confirm/alert dialogs)
  - Decide on icons: keep `react-icons` (already installed) or add `@tabler/icons-react` (Mantine ecosystem default). **Recommend `react-icons`** since we already use it — fewer deps.
- [ ] Add Mantine styles to `src/main.tsx`:
  ```ts
  import '@mantine/core/styles.css'
  import '@mantine/notifications/styles.css'
  ```
- [ ] Create `src/@noctua.core/theme/mantineTheme.ts` translating the MUI theme:
  - `primaryColor: 'primary'`
  - `colors.primary` and `colors.accent` as 10-shade tuples (Mantine requires exactly 10 entries, indices 0–9). Map our `50…900` to Mantine's `0…9`.
  - `defaultRadius`, font sizes, button defaults to mirror current `ButtonTheme`/`DialogTheme`.
- [ ] In `App.tsx`, wrap with `<MantineProvider theme={mantineTheme}>` **alongside** the existing MUI `ThemeProvider`. Add `<Notifications />`. Keep both providers running during the migration so we can swap components piecemeal without breaking the app.
- [ ] Verify nothing visually changed (Mantine isn't used yet; just present).

#### 3b. Replace component families

For each, do the swap, run `npm run dev`, smoke-test the affected screens, commit. Component-family mapping:

| MUI                              | Mantine                                  | Notes |
| -------------------------------- | ---------------------------------------- | ----- |
| `Button`                         | `Button`                                 | API close; `variant` differs (`filled`/`light`/`subtle`/`outline`/`default`) |
| `IconButton`                     | `ActionIcon`                             | size is `"sm"`/`"md"` etc., not pixels |
| `Tooltip`                        | `Tooltip`                                | Direct swap |
| `Menu` + `MenuItem`              | `Menu` + `Menu.Item` + `Menu.Target` + `Menu.Dropdown` | Different composition — wrap trigger in `Menu.Target` |
| `Dialog` + `DialogTitle/Content/Actions` | `Modal` (header/body content)    | Or use `@mantine/modals` `modals.open()` for one-shots |
| `Drawer`                         | `Drawer`                                 | Direct swap; `anchor="left"` → `position="left"` |
| `Snackbar` + `Alert`             | `notifications.show({...})`              | Replace `GlobalToast.tsx` entirely |
| `Popover`                        | `Popover` + `Popover.Target` + `Popover.Dropdown` | |
| `Popper`                         | `Popover` (controlled) or `Floating UI` directly | Used in `Autocomplete.tsx` — see 3c |
| `Paper`                          | `Paper`                                  | Or replace with Tailwind div |
| `TextField`                      | `TextInput` (single line) / `Textarea`   | Used in `DatabaseField`, `Autocomplete` |
| `Checkbox` + `FormControlLabel`  | `Checkbox` (with `label` prop)           | |
| `CircularProgress`               | `Loader`                                 | |
| `Box`                            | plain `div` + Tailwind                   | Don't introduce a Mantine wrapper just to replace `Box` |
| `Chip`                           | `Badge` or `Pill`                        | |
| `useMediaQuery`                  | `useMediaQuery` from `@mantine/hooks`    | API: pass a media query string |
| `useTheme()`                     | `useMantineTheme()`                      | |
| `CssBaseline`                    | (built into `@mantine/core/styles.css`)  | Remove the import |
| `@mui/icons-material/*`          | `react-icons/md` (Material Design icons) | `Close` → `MdClose`, `ZoomIn` → `MdZoomIn`, etc. |

Suggested commit-by-commit order (smallest blast radius first):

1. **Snackbar/Alert** → `notifications` — rewrite `GlobalToast.tsx`, replace all `dispatch(showToast(...))` flows to call `notifications.show()` (or keep the slice and have `GlobalToast` listen and forward).
2. **Tooltip** — single-prop swap.
3. **CircularProgress** → `Loader` — small.
4. **Checkbox + FormControlLabel** → `Checkbox`.
5. **IconButton** → `ActionIcon` — touches many files but mechanical.
6. **Button** → `Button` — touches many files.
7. **Icons** (`@mui/icons-material/*` → `react-icons/md` equivalents) — mechanical find/replace.
8. **Menu + MenuItem** → composition rewrite (more involved due to `Menu.Target`/`Menu.Dropdown` structure).
9. **Popover** → composition rewrite.
10. **Dialog + DialogTitle/Content/Actions** → `Modal` — touches `SimpleDialog`, `ActivityFormDialog`, `PathwayViewer` confirm dialogs.
11. **Drawer** → `Drawer` — `Layout.tsx`.
12. **TextField** → `TextInput`.
13. **Paper, Chip, Box** — final cleanup.

#### 3c. Custom-built components that need attention

- `src/features/search/components/Autocomplete.tsx` — uses `TextField`, `Popper`, `Paper`, `CircularProgress`. **Decision point**: keep the custom logic and swap MUI primitives for Mantine ones, OR rewrite on Mantine's `Combobox` primitive (more idiomatic, but larger diff). Recommend keeping the existing logic and swapping primitives first; consider `Combobox` rewrite as a follow-up.
- `src/@noctua.core/components/dialog/SimpleDialog.tsx` — central dialog wrapper consumed everywhere. Migrating this one component cascades through every dialog usage.
- `src/@noctua.core/components/toast/GlobalToast.tsx` — read the toast slice; either rewrite as a thin adapter that calls `notifications.show()`, or remove the slice and call notifications directly from action sites.

#### 3d. Final cleanup

- [ ] Remove the MUI `ThemeProvider` and `CssBaseline` from `App.tsx`.
- [ ] Delete `src/@noctua.core/theme/theme.ts`, `src/@noctua.core/theme/index.ts`, `src/@noctua.core/theme/components/{ButtonTheme,DialogTheme}.ts`.
- [ ] Update `noctuaColors` location: it's currently exported from `theme.ts` and consumed by `tailwind.config.js`. Since Tailwind 4 colors live in CSS, the JS export only needs to survive if the new `mantineTheme.ts` consumes it. Move `noctuaColors` into `mantineTheme.ts` (or a shared `palette.ts`) and delete the rest.
- [ ] Uninstall:
  - `@mui/material`, `@mui/icons-material`, `@mui/system`, `@mui/base`, `@mui/utils`
  - `@emotion/react`, `@emotion/styled` (only if no other dep needs them — `framer-motion` doesn't)
- [ ] Remove `if (id.includes('@mui')) return 'mui'` from `vite.config.ts` `manualChunks`.
- [ ] Final `npm run type-check`, `npm run lint`, `npm run build`, `npm run dev` + full smoke test.
- [ ] Verify `git grep '@mui'` returns nothing.
- [ ] Commit: "refactor: remove MUI, complete Mantine migration".

## Recovery Checkpoint

> **⚠ UPDATE THIS AFTER EVERY CHANGE**

- **Last completed action:** plan written
- **Next immediate action:** confirm phase ordering with user; then start Phase 1 (React 19 deps)
- **Recent commands run:** none
- **Uncommitted changes:** see git status (toolbar/form work in progress, unrelated to this plan)
- **Environment state:** none

## Failed Approaches

| What was tried | Why it failed | Date |
| -------------- | ------------- | ---- |
|                |               |      |

## Files Modified

| File | Action | Status |
| ---- | ------ | ------ |
|      |        |        |

## Blockers
- **Pending unrelated WIP**: `CamToolbar.tsx`, `ContributorChips.tsx`, `ActivityForm.tsx`, `EntityRow.tsx`, `stateColors.ts` are currently modified. Land or stash these before starting Phase 1 — Phase 3 will rewrite imports across most of them and merge conflicts will be painful.

## Notes

- **Why React 19 first, not last?** It's the smallest, most-isolated change. Doing it first means Phases 2 and 3 happen on a stable React-19 base. The reverse risks discovering a React-19-only bug at the end after rewriting 34 files.
- **Why Tailwind before Mantine?** Tailwind 4's CSS-first theme tokens align well with Mantine's CSS-variable-based theming. Doing Tailwind first means we don't re-do CSS adjustments after Mantine swaps.
- **Co-existence is OK during Phase 3.** MUI and Mantine can both render in the same tree; they don't fight. This is what enables family-by-family migration. Bundle size will be temporarily inflated — acceptable on a feature branch.
- **`@emotion/react`/`@emotion/styled`**: Mantine 7+ dropped emotion; it now uses CSS modules + CSS variables. So removing emotion at the end is clean.
- **Theme palette mapping**: MUI uses 10 shades named `50,100,…,900` while Mantine uses 10 shades indexed `0–9`. Map straight 1:1 in array order.
- **No `react-redux` v10 yet** (v9 already supports React 19); no upgrade needed.
- **Bundle chunking**: `vite.config.ts` currently has a manual `mui` chunk. After Phase 3, replace with a `mantine` chunk or remove entirely (Vite's default splitting is usually good enough now).
- **Testing**: there are no test files yet (per CLAUDE.md). Smoke testing is manual. Suggest taking screenshots before each phase for visual diff.

## Lessons Learned
<!-- Fill during and after task. -->
- 

## Inventory: files importing `@mui/*` (34 files, 53 imports)

```
src/App.tsx
src/app/PathwayViewer.tsx
src/app/layout/Layout.tsx
src/app/layout/RightDrawer.tsx
src/app/layout/Toolbar.tsx
src/@noctua.core/theme/index.ts
src/@noctua.core/theme/theme.ts
src/@noctua.core/theme/components/DialogTheme.ts
src/@noctua.core/theme/components/ButtonTheme.ts
src/@noctua.core/components/toast/GlobalToast.tsx
src/@noctua.core/components/dialog/SimpleDialog.tsx
src/features/search/components/Autocomplete.tsx
src/features/relations/components/RelationForm.tsx
src/features/relations/components/ChemicalConnectorForm.tsx
src/features/pathway/components/GraphToolbar.tsx
src/features/gocam/components/CamToolbar.tsx
src/features/gocam/components/CamErrors.tsx
src/features/gocam/components/CamMetadataForm.tsx
src/features/gocam/components/ConnectorTable.tsx
src/features/gocam/components/ContributorChips.tsx
src/features/gocam/components/CopyModelDialog.tsx
src/features/gocam/components/ActivityTable.tsx
src/features/gocam/components/ActivityTableNode.tsx
src/features/gocam/components/ToolbarLinkMenu.tsx
src/features/gocam/components/dialogs/ActivityFormDialog.tsx
src/features/gocam/components/forms/ActivityForm.tsx
src/features/gocam/components/forms/AllowedDatabasesPopover.tsx
src/features/gocam/components/forms/CloneEvidenceDialog.tsx
src/features/gocam/components/forms/DatabaseField.tsx
src/features/gocam/components/forms/EditorDropdown.tsx
src/features/gocam/components/forms/EntityRow.tsx
src/features/gocam/components/forms/ReferenceDropdown.tsx
src/features/gocam/components/forms/SearchAnnotations.tsx
src/features/gocam/components/forms/WithDropdown.tsx
```

## Additional Context (Claude)

- **Risk register**:
  - **Tailwind 4 visual drift**: shadow/ring/opacity renames are the usual suspects. The codemod handles most, but eyeballing each screen is still required.
  - **Mantine theme parity**: Button styling (filled vs. light vs. outline) and Dialog/Modal padding will not match MUI exactly out of the box. Expect a half-day of theme tuning.
  - **Autocomplete behavior**: this is the most behavior-rich custom component. Test thoroughly after Popper → Popover swap (positioning math differs).
  - **Notifications slice**: if the existing toast slice is consumed in many places, it's cheaper to keep the slice and have `GlobalToast` adapt it to `notifications.show()` than to rip it out.
- **Things explicitly out of scope** (suggest separate plans if desired):
  - Migrating `framer-motion@11` → `motion@12` (the package was renamed). Optional, not blocking.
  - Migrating `reactflow@11` → `@xyflow/react@12` (package renamed). Optional; only relevant if reactflow is actively used (current usage looks marginal — verify before bothering).
  - Removing `@mui/base` separately — it's pulled in transitively; removing `@mui/material` removes it.
- **Alternative ordering considered**: React 19 → Mantine → Tailwind 4. Rejected because Tailwind 4 CSS-first theming sets up palette tokens that Mantine consumes via CSS vars; doing Tailwind first means we declare colors once and Mantine inherits.
