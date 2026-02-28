# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Noctua Workbench Site — a React + TypeScript SPA for visually editing Gene Ontology (GO) biological annotations and Causal Activity Models (CAMs). Built with Vite,  Tailwind CSS, Redux Toolkit, & some MUI,.

## Commands

- `npm run dev` — Start dev server (default Vite port)
- `npm run start` — Start dev server on port 4208
- `npm run build` — Type-check then build (`tsc && vite build`)
- `npm run build:production` — Production build
- `npm run test` — Run tests with Vitest (`vitest run`)
- `npm run lint` — ESLint check
- `npm run lint:fix` — ESLint autofix
- `npm run format` — Prettier format
- `npm run type-check` — TypeScript check (`tsc --noEmit`)

Environment modes: `development`, `staging`, `production` (via `--mode` flag). Environment files: `.env.development`, `.env.staging`, `.env.production`. Variables are prefixed with `VITE_`.

## Architecture

### Source Layout

- `src/@noctua.core/` — Shared library: reusable components (IconButton, Dialog, Drawer), constants, data config, utility functions
- `src/app/` — App shell: Redux store setup, typed hooks, layout components (Layout, Toolbar, Drawers, Footer), PathwayViewer (main editor)
- `src/features/` — Feature modules, each self-contained with models, components, services, hooks, and Redux slices:
  - `gocam/` — Core feature: CAM graph model, activity editing, activity forms, graph services
  - `relations/` — Decision tree for selecting activity-to-activity relationships (connector type → relationship → effect → directness → RO ID)
  - `search/` — GOlr-based term search and autocomplete
  - `auth/` — Barista token authentication
  - `users/` — User metadata, contributors, groups, splash screen

### State Management

Redux Toolkit with `combineSlices`. RTK Query for API caching (`src/app/store/apiService.ts`).

Key slices: `cam` (graph model, selected activity), `activityForm` (form state for activity editing), `relation` (connector selection), `auth`, `metadata`, `search`, `drawer`, `dialog`.

### Enforced Patterns

- **Typed Redux hooks only**: Import `useAppDispatch` and `useAppSelector` from `src/app/hooks.ts`. Direct imports of `useSelector`/`useDispatch`/`useStore` from `react-redux` are lint errors.
- **Consistent type imports**: Use `import type` for type-only imports (enforced via `@typescript-eslint/consistent-type-imports`).
- **Path alias**: Use `@/*` to reference `src/*` (e.g., `import Foo from '@/features/gocam/...'`).

## Conventions

- **Styling:** Tailwind for utilities/layout; MUI only for complex components (buttons, dialogs, icons)
- **Path alias:** `@/*` maps to `src/*` (configured in tsconfig and vite)
- **Environment variables:** Prefixed with `VITE_` (see `.env.example`)
- **Naming:** PascalCase for components, camelCase for hooks and utilities
- **Unused parameters:** Prefix with `_` to satisfy ESLint
- **Formatting:** Single quotes, no semicolons, trailing commas (ES5), 100-char width
- **Testing:** Vitest + Testing Library, files named `*.test.tsx`

### API Layer

- **Barista/Minerva API** — m3Batch endpoints for reading/updating CAM graph models. Requires Barista token (from `?barista_token=` query param).
- **GOlr API** — Solr-based search for GO terms, evidence codes, references.
- **RTK Query** — API slices: `camApiSlice`, `lookupApiSlice`, `authApiSlice`, `metadataApiSlice`.

### Core Domain Model

`GraphModel` contains `Activity[]` (biological activities with nodes/edges), `GraphNode[]`, `Edge[]`, and `activityConnections` (activity-to-activity relations). Activities have a `rootNode`, optional `molecularFunction`, `enabledBy` (protein), and typed edges with evidence.

### Testing

Vitest + React Testing Library + jsdom. Use `renderWithProviders` from `src/utils/test-utils.tsx` to render components with an isolated Redux store. Test infrastructure is set up but test files are not yet written.

## Code Style

- Prettier: no semicolons, single quotes, 2-space indent, trailing comma es5, 100 char width, arrow parens avoid
- Tailwind CSS classes are auto-sorted by prettier-plugin-tailwindcss
- Unused function args prefixed with `_` are allowed


## Task Management

### Always Create and Maintain Task Plans

See [.plans/template.md](plans/template.md) for detailed examples and formats.