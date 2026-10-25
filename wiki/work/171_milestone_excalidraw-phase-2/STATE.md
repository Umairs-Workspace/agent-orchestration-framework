---
doc: state
---
# 171 · Excalidraw phase 2 — State

## Progress

- [x] Stories broken down and every story contracted (`aof:refine 171 --autonomous`, 2026-10-24):
  00–05, each with its example map, task features and build plan.
- [x] Stories 00–05 built, reviewed and accepted (aof:verify, 2026-10-25).
- [ ] Mocks committed — not supplied; carried to `backlog/milestone_excalidraw-phase-3` (OUTCOME gap).

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
- **Assumption to confirm at review — carried to phase 3.** Story 05 keeps a reply field in a note's thread beside its
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

Archived at accept (2026-10-25): the notes graduated into `RETROSPECTIVE.md` (R1–R4) and the stories'
own retrospectives (00, 02, 03, 04, 05); the full notes are in git history at `ae88965e`.

## Verification

- [x] `@executable` suite green — whole tree green at `ae88965e` (`REGRESSION.md`)
- [x] Fitness functions green (FF-17101, FF-17102, each with its red probe)
- [x] `@manual` signed off
- [x] `@uat` (04, 05) run by the operator with a live architect session — PASS
