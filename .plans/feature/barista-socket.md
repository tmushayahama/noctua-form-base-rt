# Task: Add Barista socket.io listener to reload CAM on remote model changes

**Status:** ACTIVE — Phases 1–3 implemented, Phase 4 (manual verification) pending
**Issue:** Port of geneontology/noctua#1077 to React workbench
**Branch:** TBD

## Goal

When another user (or another tab) modifies the currently-open CAM via Minerva, our React workbench should detect it via Barista's socket.io `'relay'` broadcast and offer the user a "Refresh" prompt that re-fetches the model. The user's *own* changes must NOT trigger this prompt.

## Context

- **Reference implementation (Angular, do NOT copy):** `C:\work\go\old-noctua-visual-pathway-editor\src\@noctua.form\services\barista-socket.service.ts`
- **Reference plan:** `C:\work\go\old-noctua-visual-pathway-editor\.plans\feature\barista-socket-service.md`
- **Triggered by:** User request — keep parity with Angular workbench so multi-user editing stays in sync.

### Where this plugs into the React app

| Concern | Location |
| --- | --- |
| App entry that owns the open CAM | `src/app/PathwayViewer.tsx` (reads `model_id` from URL, calls `useGetGraphModelQuery`) |
| API slice that fetches/mutates the model | `src/features/gocam/slices/camApiSlice.ts` (`getGraphModel` query, `updateGraphModel` / `copyGraphModel` mutations) |
| Barista base URL | `src/@noctua.core/data/constants.ts` → `ENVIRONMENT.globalBaristaLocation` |
| Auth token (used for the REST API; socket connection itself is unauthenticated) | `src/features/auth/slices/authSlice.ts` → `selectBaristaToken` |
| Existing dialog primitive | `src/@noctua.core/components/dialog/SimpleDialog.tsx` and `dialogSlice.ts` |
| Existing toast primitive | `src/@noctua.core/components/toast/toastSlice.ts` |

### Critical constraint: socket.io client/server version

Barista server uses **socket.io 1.4.6**. socket.io-client v3+ uses Engine.IO 4 and is **not** wire-compatible. We must install **`socket.io-client@^2.5.0`** (uses Engine.IO 3, talks to socket.io v1.x and v2.x servers). The old Angular project sidesteps this by pinning `^1.4.6`.

### Barista relay protocol (recap from Angular plan)

- Default `/` namespace, no rooms.
- On connect: server emits `'initialization'` → `{socket_id, user_name, user_email, user_color}` (we ignore it).
- On any Minerva model change anywhere in the cluster: server broadcasts `'relay'` → `{class: 'merge'|'rebuild', model_id, packet_id, data}`.
- Client must filter by `model_id` itself.
- The same `packet_id` is shared between the HTTP response that originated the change and the relay broadcast — this is what enables dedup of our own writes.

## Current State

- ✅ Model loads via `useGetGraphModelQuery({ modelId, baristaToken })`.
- ✅ Mutations (`updateGraphModel`, `copyGraphModel`) invalidate the `graph` tag, so RTK Query auto-refetches the model.
- ❌ No socket connection to Barista — remote edits are invisible until the user manually reloads.
- ❌ Mutation responses currently discard `packet_id` (only `result.data.data` is kept via `transformGraphData`). We need to surface it for dedup.

## Design Decisions (please confirm before Phase 1)

1. **Storage for `processedPacketIds`** — option A: a module-level `Set<string>` inside the socket module (simple, reset on page reload, fine because socket lifecycle == page lifecycle). Option B: store on `camSlice` state (visible in Redux DevTools, survives across hook remounts). **Recommend A** — packet IDs are transient, we never read them outside the dedup check, and putting a `Set` in Redux state requires care (non-serializable warnings).
2. **Refresh UX** — option A: blocking modal with "Refresh" button (Angular parity). Option B: non-blocking toast with a "Refresh" action (less interruptive). **Recommend A** — matches the Angular workbench, makes it impossible to keep editing stale data.
3. **Refetch mechanism** — call `refetch()` returned by `useGetGraphModelQuery` (preferred over invalidating the tag, because we want to bypass any cached data and force a network round-trip).
4. **Where the socket connection lives** — singleton module (`baristaSocketService.ts`), not a React component, because it must outlive route changes. The React side is just a hook (`useBaristaModelWatch`) that registers/unregisters listeners for the current `modelId`.
5. **Capturing `packet_id` from our own mutations** — extend the queryFn for `updateGraphModel` (and `copyGraphModel`) to call into the socket module: `baristaSocket.recordOwnPacket(result.data.packet_id)`. This avoids touching every mutation call site. Alternative: a Redux middleware that snoops on `*/fulfilled` actions, but that's heavier and brittle.
6. **`copyGraphModel` semantics** — copying creates a *new* model id. The relay event for that model fires under the new id, which we are not yet watching. Capturing its `packet_id` is harmless (just wasted memory) but probably unnecessary. **Recommend skipping `copyGraphModel` packet capture** for now.

## Steps

### Phase 1: Install dependency and scaffold the service

- [x] `npm install socket.io-client@^2.5.0` (verified `socket.io-client@2.5.0`)
- [x] `npm install --save-dev @types/socket.io-client@^1` (`@types/socket.io-client@1.4.36`)
- [x] Create `src/features/gocam/services/baristaSocketService.ts` exporting a singleton with this surface:
  ```ts
  connect(baseUrl: string): void
  disconnect(): void
  watchModel(modelId: string, handlers: { onExternalChange: () => void }): () => void  // returns unsubscribe
  recordOwnPacket(packetId: string | undefined): void
  ```
  Internals: a module-level `Set<string>` for `processedPacketIds`, a `Map<string, Set<Handler>>` keyed by `modelId` for active watchers (to handle React strict-mode double-mounts gracefully), and a 500 ms `setTimeout` dedup window matching the Angular logic.
- [ ] Service must be framework-free — no React, no Redux imports. Pure TS module.

### Phase 2: Surface `packet_id` from mutation responses

- [x] In `src/features/gocam/slices/camApiSlice.ts`, after a successful `updateGraphModel` queryFn, call `baristaSocketService.recordOwnPacket(...)`. Implemented via a small `extractPacketId` helper that checks both `packet-id` and `packet_id`. **Action item:** confirm the actual field name during Phase 4 testing.
- [x] `transformGraphData` shape is unchanged — `packet_id` stays out of `GraphModel`.

### Phase 3: Wire it into PathwayViewer

- [x] Created `src/app/hooks/useBaristaModelWatch.ts`. Final signature returns `{ externalChangePending, acknowledge }` (boolean state instead of a refresh callback) so the dialog can live in `PathwayViewer.tsx` next to its peers and reuse the project's Mantine `Modal` style.
- [x] `PathwayViewer.tsx`: pulled `refetch` out of `useGetGraphModelQuery`; wired the hook + a non-dismissable `Modal` with copy `"Model Updated" / "This model has been modified. Please refresh to get the latest version."` and a single `Refresh` button that calls `acknowledge() + refetch()`.
- [ ] Skipped: top-level socket disconnect. Browser tab close terminates the websocket; not worth wiring an explicit teardown.

### Phase 4: Verify

- [ ] `npm run type-check` clean.
- [ ] `npm run dev`, open a model, confirm in DevTools → Network → WS that a websocket handshake to `globalBaristaLocation` is established.
- [ ] In a second browser/tab, edit the same model. Confirm the first tab shows the "Model Updated" prompt; clicking Refresh re-fetches and re-renders.
- [ ] In the *same* tab, perform an edit (e.g. update an activity). Confirm the prompt does NOT fire (own-change dedup works).
- [ ] Confirm the actual `packet_id` field name on the relay payload and on mutation responses — log both and adjust if needed.
- [ ] Switch between models in a single session (open a new `model_id`); confirm watcher swaps cleanly and old listeners don't leak.

## Failed Approaches (carry-over from Angular plan, do NOT repeat)

| What was tried | Why it failed | Where it was tried |
| --- | --- | --- |
| Wrapping every mutation in a `refreshModelBeforeSave` + UI notifications + a `CamRebuildRule` | Over-engineered; user wanted a simple reload | Angular |
| `cam.localOperationPending` flag set before each mutation, cleared after rebuild | Requires opt-in at every mutation site, fragile if rebuild fails | Angular |
| Deep-equality compare (`isEqual(socketData, lastResponseData)`) | Race: socket can arrive before we store `lastResponseData`. Also expensive on large models. | Angular |

## Notes

- `bbop-client-barista` is intentionally NOT used — same call as Angular. We talk to socket.io directly.
- `socket.io-client@2` adds ~50 KB gzip. Acceptable.
- The 500 ms dedup window is a heuristic from the Angular impl. Both the HTTP response and relay fire from the same Barista handler, so jitter between them is small. If we see false positives in production, the deterministic alternative (mutation-pending counter that flushes a queue after rebuild) is described at the bottom of the Angular reference plan and can be ported as a follow-up.
- Connection lifecycle: connect once when the user first opens a model, keep alive across model navigation, disconnect only on full SPA unload. socket.io reconnects automatically on transient drops.
- Socket connections are unauthenticated in Barista — no token needed on the socket itself. Auth still gates the REST mutations.

## Open Questions

1. Does the Minerva HTTP response expose `packet_id` as `packet-id` (kebab) or `packet_id` (snake) at the top level of `result.data`? The Angular code goes through bbop's `response.packet_id()` accessor which hides this. **→ verify in Phase 4 by logging one response.**
2. Is there a global place to disconnect on SPA unload (a root effect in `App.tsx`)? If not, accept that the browser closes the socket on tab close, which is fine.
3. Should we surface a "connected/disconnected" indicator in the UI? Out of scope for this plan; can add as a follow-up.

## Files To Be Modified

| File | Action |
| --- | --- |
| `package.json` | Add `socket.io-client@^2.5.0` dep |
| `src/features/gocam/services/baristaSocketService.ts` | Create — singleton socket client |
| `src/features/gocam/slices/camApiSlice.ts` | Capture `packet_id` from `updateGraphModel` response |
| `src/app/hooks/useBaristaModelWatch.ts` | Create — React hook bridging service ↔ component |
| `src/app/PathwayViewer.tsx` | Use the hook, wire `refetch`, render the refresh dialog |
