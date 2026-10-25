---
doc: state
---
# 171 · Excalidraw phase 2 — State

## Progress

- [x] Stories broken down and every story contracted (`aof:refine 171 --autonomous`, 2026-10-24):
  00–05, each with its example map, task features and build plan.
- [ ] Mocks committed: `mocks/ask-architect.png`, `mocks/note-thread.png`, `mocks/library-find.png`
  (the operator supplies them; until then each surface's binding checklist in DESIGN.md rules).

## Notes & decisions in flight

- Framed on 2026-10-24 from 170's UAT deferrals (VERIFICATION F-170-11, F-170-12, F-170-13), the
  operator's request for coloured drafts, and PRD phase 2.
- **Refine, 2026-10-24.** Six ADRs: one on-canvas overlay placed through one anchor module (ADR-001),
  library search as an own sidebar tab inserting through the SDK's drop (ADR-002), a "look now"
  event stream per open diagram (ADR-003, diagrammed), the house style read from the style guide and
  filled in at propose (ADR-004), a note delivered by typing into the open session (ADR-005), a note
  as a thread on its record (ADR-006). Two controls declared pending: FF-17101 (story 02), FF-17102
  (story 00).
- **Operator rulings at refine.** Shapes drawn by hand start in the house style. The canvas offers
  only Ask architect at a selection; notes are added through the editor's bar (171/00 Q1 — story 00
  was "Add a note on the canvas" and became "Ask the architect from the canvas"; ADR-001, SPEC and
  DESIGN follow). A session started from the editor also takes the waiting notes (171/04 Q1). The
  operator supplies mocks for the three new surfaces.
- **Assumption to confirm at review.** Story 05 keeps a reply field in a note's thread beside its
  shape (PRD phase 2: "read and answered beside the shape"). A reply continues an existing note, so
  it was read as outside "adding notes should be through the editor"; if the operator meant replies
  too, the reply moves to the review panel and 05's R1/E1–E3 and its DESIGN surface change.
- **Recalls.** Architect `7f16ede5-82e1-40bc-bab0-de5e4f3af603` (R5 honoured: threads on one record,
  palette from one source); PO `3ffcb785-e500-4256-baf8-5155a74cc576` returned nothing.
- **Graph.** `aof graph build .` at 2026-10-24T19:44Z (20,528 nodes, no egress); `graph impact` on the
  editor, the scene command, the board face, TerminalControl, the surface and `layout.mjs` grounded
  the cuts. No CLI renders `story-contract-derive`, so the sets were derived by hand from those
  answers, the ADR citations and each module's owning suite.
- **Write-set overlap.** Every story but 03's server half touches `ExcalidrawEditor.tsx`, so the loop
  will serialise most waves; the overlap is declared rather than hidden.
- **Continue, 2026-10-25 (solo, branch `milestone/171-excalidraw-phase-2`).** 171/00 built:
  `canvas-anchor.mjs` (anchor, hide rule, question-field reducer), `CanvasOverlay.tsx` as a child of
  `<Excalidraw>` subscribing through `api.onChange`/`onScrollChange` (a pan re-renders the overlay, not
  the editor), and the bar and overlay both asking through `askArchitect` in `editor-state.mjs`, which
  names the selection AFTER the save so a just-drawn shape is named by the id the save gives it.
  Near-miss recall `6f1c2a9e-…-171000000001`: 170 R1 honoured (screenshots read — it caught the open
  field drawn under the SDK's properties panel, which every check had passed).
- **171/01 built.** Find is a `Sidebar.Tab` in the SDK's `DefaultSidebar` (its trigger through
  `DefaultSidebar.TabTriggers`); a click DISPATCHES the SDK's own library drop at the canvas centre —
  the point its panel inserts a clicked item at — so drag and click share the SDK's one insertion
  (0.18 exports no insertion helper, and FF-17102 rules out converting coordinates here). Previews are
  exported per tile as they scroll in, appended as nodes (never re-parsed markup) and inert.
- **171/02 built.** `diagram:scene --action stamp` answers stat identities and the watch folders (no
  parse); `/api/diagram/events` watches them, re-stamps 150 ms after a change and every 30 s, ticks
  every 2 s when no watch starts, and closes on the RESPONSE's close (a GET request's own close fires
  once its empty body is read). The editor's reducer (`review-stream.mjs`) defers a draft event that
  lands during an own write, so its own save never reads as "changed elsewhere". Measured in the
  smoke: an answer and a proposal reach the open panel in ~210 ms each.
- **171/03 built.** `house-style.mjs` reads the guide's semantic-roles table (light column, hex or
  rgba; none without `paper` and `ink`). `read` and `context` carry `palette`; `propose` fills
  `style <id> fill:paper,stroke:ink,color:ink` into every ADDED node with no style and no library
  item, before the diff, so the record and Preview say it; the editor seeds the SDK's `currentItem*`
  from it. The scene command loads the reader lazily, so `aof work find`'s module ceiling (FF-16004)
  is unchanged rather than raised.
- **171/04 built.** `TerminalControl` takes `laterInputs`/`onLaterInput`/`onSessionReady`; what a live
  session is TYPED — the mount's command once, then later input — is one record in `input-policy.mjs`
  (`laterInputDecision`, `sessionOpened`/`typeCommand`/`flushLaterInputs`/`sessionClosed`). The surface's one
  `deliver` (pure `deliveryPlan` in `dock-mount.mjs`) types into a ready session, starts a keyed new one
  (so a second Ask architect is no longer a silent miss), or lets a note wait; the editor composes the
  invocations (`reviewInvocations`) and says which happened.
- **171/05 built.** A request record carries `thread`; one `withThread` normalises an older record
  at both read paths; `reply` appends an operator turn and reopens the note (a proposed one too, the
  proposal untouched); `respond` appends the architect's and keeps `answer`. Pins and the thread
  popover are components of the one overlay, placed by `cornerAnchor`/`besideAnchor` in
  `canvas-anchor.mjs` (FF-17102 holds); a reply is delivered through 04's surface function.

## Feedback (for retro)

- **171/00 declared write set was incomplete.** The one ask path the bar and overlay share needed a
  headless home; `editor-state.mjs` (+ `.d.mts`) is the editor's pure state, so it went there, and
  `files:` now names both (and the package README, which documents each export). Story 02 also
  writes `editor-state.mjs`; the waves are serial anyway.
- **171/00: the overlay layer cannot be one z-index.** At the SDK's canvas-button layer the action is
  correctly under the SDK's menus, but the 320 px question field slid under the properties panel and
  was typed into half-hidden. The open field now rises above the layer UI; the smoke asserts nothing
  is drawn over it. Story 05's thread popover is the same shape and needs the same rule.
- **171/00 review close (solo, one round).** Fixed in the round: choosing other shapes while the
  field is open now closes it (it had moved to the new selection while still asking about the old);
  the overlay's watched flags are now read from the hide rule's own list (`MID_GESTURE`). Recorded,
  not fixed (Nits): the question field grows on line breaks, not on soft wraps; E5's "the bar's ask is
  the same" is held by the shared `askArchitect` plus source-shape assertions on the two call sites,
  and in the browser only for the canvas path.
- **171/01 review close (solo, one round, no Blocker).** Fixed at the close: the field showed two
  clear buttons (Chrome's native one and the labelled Clear); the native one is hidden. Found by the
  smoke: the field was not focused on open (the SDK's tab trigger keeps focus), now focused on the next
  frame. Recorded (Nit): item names truncate in the 3-column grid of the 302 px sidebar; the tile's
  title carries the full name.
- **171/02: two write-set misses and one smoke trap.** `acd-run-status-renders-the-record` measures
  each board-ui re-pin's distance to its entry, so stacking a reason widened its windows (+500, the
  170 precedent) — it was in `reads:`, not `files:`; and the package README documents exports. Both
  are now in `files:`. The smoke's `waitUntil: "networkidle"` can never settle on the editor any more
  (the open event stream is a connection), so editor pages wait for `load`.
- **171/02 review close (solo, one round, no Blocker).** Recorded (Nit): E3's "a quiet minute makes
  no request" is held by the poll rule over the stream state; the browser run does not count requests.
  The near-miss recall ran AFTER the build (`…171020000001`), not before it — a process slip.
- **171/03: the Codex prompt is a second copy.** The review prompt's body lives in the asset AND,
  verbatim, in `packages/core/assets/variants/codex/workflow.md` — editing only the asset left the
  Codex render unchanged, and `aof work update` refused the hand-edited render. Edited both, then let
  the update re-render and re-lock; `files:` now names the variant, the lock and the journal.
- **171/03 review close (solo, one round, no Blocker).** Recorded (Nit): E10 (a stored shape keeps its
  own colours under the defaults) is held by the defaults being `currentItem*` only plus a source
  assertion; in the browser only the library icon keeping its blue shows it.
- **171/04: the control had no room for its seam.** `TerminalControl.tsx` sat at its 840-line ratchet
  with zero headroom (`acd-ui-surface-file-budget`; `terminals-home-route` pins the count). Refine named
  only the FF-5307 freeze. Paid for by EXTRACTION, the ratchet's own remedy: the command's
  once-per-session typing moved to `input-policy.mjs` beside the later-input rule, account and all —
  839 lines. The grid suite's socket-suite lane count (13 → 20) and the home-route row (840 → 839)
  re-aimed with reasons; `files:` now names both, and `editor-state.mjs` (the invocation list).
- **171/04: a 170 defect the story exposed.** The diagram surface was `h-full`, not the shell's
  `CONTENT_FIXED_HEIGHT_CLASS`, so an open dock covered the editor's bar — exactly where a note to the
  open session is added. Now sized as the board is; the editor column scrolls with a sticky header.
- **171/04 review close (solo, one round, no Blocker).** Recorded (Nit): with the dock open, the
  status line under the bar can sit below the fold of the scrolling column.
- **171/05: the SDK shadows two console tokens.** Inside `.excalidraw`, Excalidraw defines
  `--color-primary` (its purple) and `--color-muted`, so the pin's `bg-primary` drew purple, and
  171/00's hover and 171/01's tiles used the SDK's grey — found only by reading screenshot 14. aof's
  chrome roots now re-declare both from the document root (`consoleTokens`), the console theme staying
  their one home; the smoke asserts the pin's computed colour (`rgb(19, 118, 109)`). `files:` grew by
  `canvas-anchor.mjs` (the two placements FF-17102 homes there), `LibrarySearch.tsx` and the Codex variant.
- **171/05 review close (solo, one round, no Blocker).** Recorded (Nits): a thread's header shows its
  latest note's status and the pin's colour reads "some note has the architect's last word" — per-viewer
  read state is out of scope; the `proposals` listing caps decided notes at 50, so a very old answered
  note loses its pin.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green (FF-17101, FF-17102, each with its red probe)
- [ ] `@manual` signed off
- [ ] `@uat` (04, 05) run by the operator with a live architect session
