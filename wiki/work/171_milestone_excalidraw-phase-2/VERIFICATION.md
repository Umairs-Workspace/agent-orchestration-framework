---
doc: verification
---
# 171 · Excalidraw phase 2 — Verification

Opened at refine (2026-10-24) to carry the fitness register for the two controls ARCHITECTURE.md
declares. Both land with their stories (FF-17101 with 02, FF-17102 with 00), and each records its red
probe here when it does.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-17101 | `test/arch/diagrams/acd-diagram-face-imports-nothing.test.mjs` | green (171/02, 2026-10-25; 3 cases) | in-suite: three planted reaches into the package (a static and a dynamic `@aof/diagrams/layout` import, a relative path into `diagrams/src`) each fire the import detector, a comment does not; in a route body a `work:list` invocation, a computed id, a spelled `.review` folder and a spelled `.excalidraw` file each fire, the stream's own `diagram:scene` stamp call does not; non-vacuity holds both routes invoke `diagram:scene` and the stream learns its folders from `stamp`. Two detector defects were caught on the first run (a backtracking lookahead, and a cross-token match) and fixed |
| FF-17102 | `test/arch/diagrams/acd-diagram-canvas-anchor-one-home.test.mjs` | green (171/00, 2026-10-25; 3 cases) | in-suite: five planted conversions (both SDK converters by name; the transform spelled with `appState.`, a bare, an indexed and an optional-chained operand) each fire the shipped detector, a comment and plain field reads do not; non-vacuity holds that `canvas-anchor.mjs` itself spells the transform. The indexed plant (`bounds[1] + scrollY`) was red on the first run and widened the detector |

## Agent-run `@manual` evidence

### 171/00 · Ask architect at the selection, in a real browser — `test/smoke/diagram-editor.smoke.mjs`

2026-10-25, playwright-core 1.49.1 (installed outside the repo) driving the installed Chrome against
the real `aof work ui`; **37/37 checks passed**. The dock's `/ws/terminal` socket is answered by the
smoke, so the invocation is read as typed and no session starts. The 13 new `canvas:` checks: no
action with nothing selected while the bar offers both; a box drawn at a known place gets one action
centred 8 px above it, clear of the SDK's panels; the action follows a 60 px pan and a zoom about the
box's top-centre (100% → 110%); at 768 px it still sits above the box; choosing elsewhere and Escape
each close the field and ask nothing; Ask is disabled while empty; nothing is drawn over the open
field; asking saved the unsaved box first and recorded a request naming its new id (`n2`); the panel
lists it and the dock was typed `/aof:diagram-review 07 ADR-002-scene.excalidraw <id>`.
Screenshots read (06, 07, 07b, 08, 09) against DESIGN's "Ask architect at the selection" checklist —
no mock is committed, so the checklist rules: **CONFORMS**. Reading 08 is what found the field drawn
under the properties panel on the first run; it was fixed and the uncovered check added.

### 171/01 · Find in libraries, in a real browser — the same smoke

Same run conditions, **43/43 checks passed**. A 30-item `aws-architecture-icons.excalidrawlib` is
written to the smoke's global home and loaded by a reload. The 6 `find:` checks: the Find tab sits
beside the SDK's search and Library tabs with its field focused; "kin" leaves exactly the four Kinesis
items, each with a rendered preview, its name and its library, and "4 items"; a clicked item lands at
the centre of the visible canvas and saves as `%% aof:lib n3 aws-architecture-icons/"Kinesis"`; a
dragged item lands at the drop point (lower-left quarter) and saves as
`%% aof:lib n4 aws-architecture-icons/"Kinesis Data Streams"`. Screenshots read (10a, 10, 11) against
DESIGN's "Find in libraries" checklist (no mock committed): **CONFORMS** — after the double clear
button was removed.

### 171/02 · Pushed review records, in a real browser — the same smoke

Same run conditions, **47/47 checks passed**. With a mark set on the window (never cleared, so no
reload happened), the stand-in architect's `respond` reached the open panel in 211 ms and its
`propose` (Preview, Accept and Reject shown) in 218 ms. A second window on the same diagram drew a
shape and saved: the first, clean window's header read "Updated from the saved draft" and its Mermaid
view named the new node (`n5`). The first window then drew an unsaved shape and the second saved
again: the first kept "Unsaved changes" and showed the changed-elsewhere line with Reload; Reload took
the saved draft and closed the line. Screenshots read (12, 13) against DESIGN's "The draft changed
elsewhere" checklist: **CONFORMS**.

### 171/03 · The house style, in a real browser — the same smoke

Same run conditions; the diagrams-on project names a copy of this repository's `.aof/diagrams/style.md`
as `work.diagrams.style`. **49/49 checks passed.** The stand-in architect's first draft carried no
style line; once accepted, the stored scene's `API` box is filled `#f3f5f7` and stroked `#1b1f27`
with an ink label, and the view reads `style API fill:#f3f5f7,stroke:#1b1f27,color:#1b1f27`. The
rectangle drawn by hand (171/00's box, `n2`) was saved with stroke `#1b1f27`, background `#f3f5f7`
and a solid fill. Screenshot 01 read: paper boxes, ink strokes, labels inside their boxes; the library
icon kept its own blue.

### 171/04 · A note reaches the open session — the same smoke, and the operator's `@uat`

Same run conditions, **50/50 checks passed**. With 171/00's session open in the dock (its socket
answered by the smoke), a note added from the bar was typed into it exactly once, as its own review
(`/aof:diagram-review 07 ADR-002-scene.excalidraw <id>\r`), and the editor said it was sent.
Screenshot 09b read: the bar sits above the dock and the header stays in view. The real session —
`claude` taking a note typed mid-answer, next — is task 02's `@uat`, **pending the operator at
`aof:verify`**: it starts a paid session (170 RETROSPECTIVE R3).

### 171/05 · A note is a thread beside its shape — the same smoke, and the operator's `@uat`

Same run conditions, **55/55 checks passed**. The drawn box `n2` holds two notes, so one pin counts
2, drawn in the console's primary (computed `rgb(19, 118, 109)`). Choosing it opened the thread
beside the box and clear of the pin, oldest turn first; a reply with no session running was recorded
as the note's next turn, reopening it ("it waits for a review session"); the stand-in architect's
`respond` then appeared in the open thread, pushed, with no reload. The pin moved by exactly a 40 px
pan, and after a zoom about another point (100% → 110%) sat within 0.01 px of where the corner's
transform puts it. Screenshot 14 read against DESIGN's "Note pins and their thread" checklist (no mock
committed): **CONFORMS** — after the colour fix above. The live architect answering in the thread is
task 03's `@uat`, **pending the operator at `aof:verify`**.

## Verification evidence (aof:verify, 2026-10-25)

- **`@executable` + fitness, scoped to the milestone.** `node scripts/test.mjs --only` over every
  test file the milestone touched (both package indexes, `test/arch/diagrams/index.mjs`, the three
  `diagram-scene-*` suites, the three re-aimed arch tests, the five apps/ui suites), isolated
  `AOF_GLOBAL_HOME`: **350 cases, 0 failures, exit 0** (96 s). verifies → every `@executable` task
  of 00–05, FF-17101, FF-17102.
- **`@manual` (00/01, 01/01, 02/02, 03/03, 05/02).** The smoke runs above stand: no file under the
  touched source trees or `test/smoke` is newer than the last run (55/55). verifies → each story's
  `seen-in-the-browser` task.
- **Design conformance — INCONCLUSIVE, all four DESIGN surfaces.** Renderability precondition
  unresolved: no `--url` was given and `work.ui.baseUrl` is not set (the board serves on an
  ephemeral port), so no render was attempted and no designer or QA session was spawned. The
  baselines are the binding checklists (no `mocks/` committed). The checklist readings recorded
  per story above are the builder's, not this gate's.
- **`aof:validate 171`** PASS. **`aof work doctor 171`**: no `control-unresolved` at either
  severity; FF-17101's stale `pending` marker dropped from ARCHITECTURE.md (the control is landed).

## User sign-off

- **171/05 task 03 — a live architect answers a reply in the thread: PASS** (operator, 2026-10-25, build
  `c32bbab8+dirty.20261025T154537`). On 171's ADR-003 diagram, the operator replied in a note's thread
  beside its shape; the live architect session took the reply and answered it in the same thread.
  Operator: "Reply worked. Architect checked and replied to my reply."

- **171/04 task 02 — a live session takes later input as it is written: PASS** (operator, 2026-10-25, build
  `c32bbab8+dirty.20261025T161550`). With the architect answering a first question in the dock, the operator
  asked a second from the canvas; it was typed into the SAME session and run after the first, as its own
  command. Operator: "I asked two questions and they're both answered in one console session via two separate
  commands (run one after the other)." The bar's Add note delivers through the same `deliver` (04 E1/E4).

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-171-01 | Live `@uat`, 2026-10-25 (claude 2.1.310): "Request a first draft" opened the dock and typed `/aof:diagram-review 171 ADR-003-push-stream.excalidraw <id>`, but it was never submitted; the operator had to press Enter. `TerminalControl` types the mount's command on the session's FIRST painted bytes (`paint` → `sendCommand`), which arrive before claude's REPL mounts, so the `\r` is lost. The loop's driver already gates on the TUI's readiness (`session-screen.mjs`, 2026-09-27: paste mode ON + something drawn since); the board's terminal never adopted it. A later input is marked ready by the same premature typing. Distinct incident (recall `936148f1…`: no prior with this cause; m138/F-03 is the loop driver's renderer, not this path). | defect | major | blocker — fix in 171/04 (it owns what a live session is typed) | 171/04 | fixed in the tree, live re-check pending: the byte gate moved to its one home `@aof/contracts/tui-ready` (FF-13801 re-homed; the session screen reads it), and the dock types the command once the gate holds or at `COMMAND_READY_CAP_MS` (30 s). `@bug @finding-F-171-01` outline on 04/00 — 3 control lanes + 2 record cases; 244 + 25-file importer sweep green (it also caught 171/02's undeclared `node:fs` in `board-ui.mjs`, now allowed). Re-check 1 FAILED live: typed once the REPL was up, the `\r` landed as a new line. Second cause: the dock wrote `text\r` as one raw input, which 70/06 had already measured as unsubmittable. Now every input goes through one serial outbox — one bracketed paste, then its Enter as a separate write after `PASTE_SUBMIT_SETTLE_MS` (900 ms), the next input only after — with the framing and the settle homed in `@aof/contracts/tui-ready` and the driver reading them from there. 780 cases green across the fix's suites and importers. Redeployed `c32bbab8+dirty.20261025T154537`. **Fixed** — live re-check 2 passed (operator, 2026-10-25): "Request a first draft" submits by itself, no Enter pressed |
| F-171-02 | Live `@uat`, 2026-10-25: typing a space in the canvas Ask architect field closed it. Excalidraw 0.18 registers `onKeyUp` on `document` and, on a space with the active tool not `selection`, clears `selectedElementIds` without checking the key's target (its keydown is guarded by `isInputLike`; its keyup is not). The overlay closes its field when the selection changes (171/00 review close), so it closed. The thread's reply field and the Find field had the same exposure. Distinct incident (recall: no prior with this cause). | defect | major | blocker — fix in 171/00 (the overlay owns the field) | 171/00 | fixed in the tree: the three fields stop keyup from reaching the SDK, as their keydown already did. 107 cases green (diagrams-ui, arch/diagrams, the directory budget). Deployed `c32bbab8+dirty.20261025T161550`. **Fixed** — live: the operator typed two questions into the canvas field without it closing (04 task 02 run above) |
| F-171-03 | Live `@uat`, 2026-10-25: after a right-click on the canvas the drawing skewed — arrow segments missing, labels stacked on the architect-session → review-store edge — until a reload. The saved scene was clean (36 elements, no duplicate or orphaned labels); not reproduced by the verifier (a right-click on empty canvas and Escape drew correctly). Distinct incident (recall `78e03714…`; m170/F-170-09, labels clipped by their boxes, is a different cause). | defect | minor | non-blocker — render-only, a reload restores it, not reproduced | backlog `milestone_excalidraw-phase-3` | open — reproduce first, there |
| F-171-04 | Live `@uat`, 2026-10-25: the conversation works end to end, but every ask and reply opens or types into a visible terminal dock, and the operator judged the editor's conversation surfaces unfit ("needs a proper design"); streaming the answers into the editor plus a designed UI is the next milestone. Distinct incident (recall `29063c62…`; m170/F-170-13, no push channel, was 171/02's and is fixed). | design-gap | major | non-blocker — the behaviour is accepted; the surface is redesigned next | backlog `milestone_excalidraw-phase-3` | open |

## Accept decision

**Accepted, 2026-10-25.** Every story's `@executable` lane and the milestone's fitness functions are
green, the whole-tree regression gate is green at `ae88965e` (`REGRESSION.md`; the two earlier red
rows were repaired in `d1b0e4e8` and `ae88965e`), the agent-run `@manual` evidence stands, and both
`@uat` scenarios passed live with the operator. `aof:validate 171` PASS; `aof work doctor 171`
reports no `control-unresolved`. Blockers F-171-01 and F-171-02 are fixed; F-171-03 and F-171-04
are non-blockers routed to `backlog/milestone_excalidraw-phase-3`. Design conformance is
INCONCLUSIVE (no base URL, no committed mocks) and is carried there with the mocks.
