---
doc: verification
---
# 170 · Excalidraw phase 1 — Verification

Built on `feat/excalidraw-collaborative-refinement`: stories 00–03 at `68116cc` and before; 04–09 in
the commit that carries this record, on the scene store with Mermaid as the interface (ADR-010–ADR-013).
Measured on macOS with Node 24.14. The checkout's own pre-existing environmental reds are listed at
the end and fail the same way at HEAD.

## Verification evidence

### The converter, measured before the format was chosen

A browser probe ran `@excalidraw/mermaid-to-excalidraw` 1.1.2 (Mermaid 10.9.3) in Chrome over the
canonical form, shapes, styles, subgraphs, entities, parallel edges, an empty diagram and a syntax
error. Node ids and per-node `style` survive; `%%` lines are ignored; parse errors name the line;
positions, chosen sizes, bends and parallel-edge identity do not survive. The converter now draws
only a first draft (ADR-012); the scene keeps everything after that.

### The served path, in a real browser — `test/smoke/diagram-editor.smoke.mjs`

Run: `node test/smoke/diagram-editor.smoke.mjs --playwright <dir> --channel chrome` against two
throwaway projects (diagrams on with SVG and PNG owed and an `azure.excalidrawlib` holding a
"Function App" item; diagrams off), each served by the real `aof work ui`, driven through the
installed Google Chrome by playwright-core 1.49.1. The architect is stood in for by the real CLI calls
`/aof:diagram-review` makes (`context`, `respond`, `propose`), so no paid session runs unattended.
**24/24 checks passed.**

| Area | What the browser proved |
|---|---|
| Board | Edit draft is a link to `/diagram?…`; no SDK chunk loads before it |
| Empty diagram | the editor offers a first draft; Save writes an Excalidraw scene |
| Libraries | `context` offers the project's items by name, `azure/"Function App"` |
| First draft | a Mermaid proposal previews as "only adds"; Accept draws it with Excalidraw's converter and the scene reads back, as Mermaid, as the proposal |
| A person's own drawing | an item clicked in from the SDK's Library panel saves and reads as `%% aof:lib n1 azure/"Function App"`; a freehand stroke saves, is not refused, and reads as `%% aof:sketch s1 "freedraw"` |
| Notes | Add note starts no terminal; Withdraw works; two notes offer one review |
| Batch review | an answer and one proposal close both notes; the proposal's changes are the rename, a new library node and its edge; the answer appears by itself |
| Accept | the rename, the library item and the edge compile into element edits, the scene reads back as the proposal, and the person's own library item and stroke are untouched |
| Publish | the SVG the ADR links is the editor's export and the owed PNG is written; the status says "Saved and published"; the block is shown to paste |
| Route | a reload reopens the diagram; Close returns to the board, whose figure is now the published export; a hostile member opens no editor |
| Off | no Edit draft, and no scene or SDK fetched |

Screenshots were read, not only taken, and caught three defects every check passed over
(RETROSPECTIVE R8):

- **A relabel crowded its own arrow.** After the rename, "Gateway" sat off-centre and the box had
  grown over its "writes" arrow. A relabelled box now grows about its centre with the converter's
  padding, its text is centred, and its arrows are re-routed with their labels at the midpoint. The
  relabel's touch set now covers those arrows.
- **A library node's caption sat left-aligned.** It is now centred under the item.
- **The status line said "Saved — not published" right after Publish.** It now says "Saved and
  published" for the revision this session published, and only "Saved" after a reload, because an
  earlier session's publish is not known.

The smoke's own freehand step first drew on the editor's floating properties panel and never reached
the canvas. It now draws on open canvas.

### Registered suites and controls

Every run used an isolated `AOF_GLOBAL_HOME`; `global-work-propagation` (which binds `:4182`) was
not run.

| Scope | Result |
|---|---|
| `@aof/diagrams`: the profile, the scene's projection (aliases, selection, libraries, sketches), the contribution and lane | 35 cases, 0 failures |
| `@aof/diagrams-ui`: compile (the round-trip property, relabel growth and arrow re-routing, library clones, frames, the first draft, operations) and editor state | 20 cases, 0 failures |
| `@aof/ui` · `@aof/work` | 793 · 394 + 114 native, 0 failures |
| `aof` core | 546 cases; the 2 reds are the pre-existing codex-ownership lane cases |
| `test/diagrams`, `test/surfaces`, `test/bundle`, `test/command` | 1170 cases; the 13 reds are all pre-existing (listed below) |
| every architecture control under `test/arch` | 2269 cases; the 1 red is FF-5301's pre-existing realpath case |
| boundary check · supply-chain audit · UI type-check (`tsconfig.app.json`, which reaches the editor package) and build | 0 findings · passed, 0 warnings · clean · green |

The controls this rework moved, each with its reason recorded beside it:

- **FF-16004, the CLI module ceiling.** Raised 719 → 720 for `scene-view.mjs`, which `diagram:scene`
  loads.
- **FF-13302, the layout's one home.** The libraries folder path moved into `layout.mjs`
  (`diagramLibrariesDir`) instead of being raised.
- **FF-11904, the source directory budget.** `packages/diagrams/src` outgrew its exemption and owes a
  row, ceiling 9. The exemptions for `diagrams-ui/src`, `diagrams-ui/test` and `diagrams/test` now
  name `compile` and `scene-view`.
- **FF-5307, the UI freeze.** `apps/ui/src` re-pinned for one measured diff (+2 −1): the pasted block's
  Source link may name a `.excalidraw` scene.
- **FF-12603 leg 6 and FF-13108.** Both were already red at `68116cc`, caused by this branch's earlier
  commit: three re-pin reasons stacked under the board-ui entry outgrew their windows, and the diagram
  surface's lazy editor import was a second outside specifier. The windows widen by the stacked
  reasons, and the import is admitted beside the form's, each with its reason.
- **FF-7003, the brief ceiling literal.** The editor's base64 chunk size was spelled `0x8000`, which
  matched the brief ceiling's literal. It is now a named decimal constant.
- **The command inventory fixture** is regenerated; only `diagram:file` and `diagram:scene` change.
  The yarn-installation port table lists `scene-view.mjs` as import-free.

### Not verified, and why

- **A live `/aof:diagram-review` session.** The prose, rendered for Claude, Codex and OpenCode,
  teaches the Mermaid view and is exercised through the CLI. A real model reading a real ADR's
  diagram and proposing an edit has not been run here, because it starts a paid session.
- **A real-world library.** The smoke's library is a hand-made, one-item `.excalidrawlib`. A large
  public set, such as Azure's icons, has not been loaded; the 8 MB cap is a size bound, not a
  measured limit.
- **Crowding after a relabel.** A relabelled box grows about its centre and can still crowd a close
  neighbour; nothing pushes shapes apart (ADR-012).

### Pre-existing on this checkout, identical at HEAD (not this milestone's)

Each of these was run against `68116cc` in a separate worktree and failed the same way:

- **`/private/var` versus `/var` realpaths** on macOS: three `yarn-installation` production cases,
  `core-workspace` and two `distribution-workspaces` cases, the `workspace-boundaries` planted-walker
  case, `board-api` `diagram:file`, `work-ui-fleet-origin`, and FF-5301's two-hop laundering case.
- **`release-fingerprint-pin`, three cases.** gpg waits on a stale `pubring.db.lock` in the
  operator's own keyring, held by a process that no longer exists. It is the operator's keyring, so it
  was left alone.
- **The two codex-ownership lane cases.** Apple git 2.39 refuses the fixture's worktree step.
- **Node 24's spec reporter.** `command-core/workspace packages pass their package-local suites`, the
  `@aof/work` native count the workspace runner cannot parse (the 114 native tests themselves pass),
  and the `work-memory/00` goldens.
- **The autonomous shell-out black-box case.**

### At `aof:verify 170`, on the Windows control node (2026-10-24)

Node 24, isolated `AOF_GLOBAL_HOME`, focused `node scripts/test.mjs --only` runs.

- **The review loop was red on Windows.** `diagram-scene-review` failed 3 of 17. Two cases hit
  EPERM replacing a record (F-170-02), and the symlink case could not create its link (F-170-03).
  After both fixes, that file plus `diagram-scene-command`, `diagram-scene-api` and FF-17001 pass
  40 of 40, and `diagram-scene-review` alone passes 17 of 17 on three consecutive runs.
- **The EPERM cause, measured** (a scratch probe that loops create, then replace, 400 times per
  round over three interleaved rounds): a record created with `link()` refused its later `rename()`
  14 times in 1,200. A record created with `rename()` or an exclusive open refused 0 times in 1,200.
  It is the hard link, not the load. `writeRecord` now creates a record by `rename()`, after
  checking under the diagram's exclusive `.lock` that the id is absent.
- `aof work validate 170`: PASS. `aof work doctor 170`: no `control-unresolved`. Its warnings are
  `started-story-no-tasks` for all ten stories and the unwitnessed `depends:` edges, both expected
  for an imported milestone.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-17001 | `test/arch/diagrams/acd-diagrams-package-one-way.test.mjs` | green, 4/4 | planted `packages/work/src/zz-red-probe.mjs` holding `import "@aof/diagrams";` → `not ok - arch/170 FF-17001: no @aof/work source imports @aof/diagrams…`, actual `['packages/work/src/zz-red-probe.mjs: imports @aof/diagrams']`; plant removed |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-170-01 | ADR-001's package-direction control was numbered FF-13304, the id 133 already gives "the console renders a diagram only as an image" (`test/arch/ui/acd-diagram-rendered-as-image.test.mjs`). Two controls answered to one id. | defect | medium | blocker | verify (fixed inline) | fixed: renumbered FF-17001 in the control, its index, the directory-budget row, ADR-001, story 01, STATE and the PRD |
| F-170-02 | `writeRecord` placed a new review record with `link()`. On Windows, replacing it later (`markProposed`, accept, respond) intermittently failed with EPERM, so the review loop broke on the control node. | defect | high | blocker | verify (fixed inline) | fixed: create is check-then-`rename()` under the `.lock`, with a coded `diagram-review-id-taken` 409 |
| F-170-03 | Two scene tests created a directory symlink, which Windows refuses without privilege, so `review storage refuses symlinks` could not run on the control node. | defect | low | blocker | verify (fixed inline) | fixed: `symlink(…, "junction")`, the repo's idiom; `lstat` reports a junction as a symlink, so the refusal is still exercised |
| F-170-04 | A box label over 500 characters, which the editor allows, made the Mermaid view unserializable, so context, propose and accept all failed on that diagram. A claimed `customData.aof.id` was kept if it matched the id pattern, even when it was a Mermaid keyword or over 64 characters, which the parser then rejected. | defect | medium | blocker | verify (fixed inline) | fixed: save refuses a scene whose view the profile could not read back (`diagram-scene-unviewable`, naming the node), and a claimed id is kept only if `isProfileId` passes (the parser's whole rule, now shared) |
| F-170-05 | The review listing kept only the newest 50 records, so an old open note or pending proposal dropped out of the panel. Every five-second poll re-parsed every record file. | defect | medium | blocker | verify (fixed inline) | fixed: every open note and pending proposal is listed; only decided records are capped at 50; a record is re-parsed only when its identity, size or mtime changes |
| F-170-06 | Accept applied `add` operations without checking them against the proposal. A library item dragged in from the panel had no anchor box, so a proposed edge to it never bound. | defect | medium | blocker | verify (fixed inline) | fixed: each added element must belong, in the accepted scene, to a node, frame or edge the proposal adds or changes; compile gives an anchorless library item a transparent anchor in its group, which the touched set covers |
| F-170-07 | The opt-out was enforced only in the board. `diagram:scene` wrote with `work.diagrams` off, and a directly opened `/diagram?…` loaded the editor chunk. | defect | low | blocker | verify (fixed inline) | fixed: every write action refuses with `diagram-disabled` (409, the code `diagram:export` already uses); the surface asks `/api/diagram/capability` before it imports the editor (FF-5307 re-pinned, +22 −1) |

| F-170-08 | The first regression gate (`b2dbfad6`, 26.8 min, REGRESSION.md) was red on six units. Four were this branch's own, never run whole-tree before: `recovery.mjs`'s audited `spawnSync` had a stale source digest after `e9d6523c`; the diagrams kernel's ports and dependency list did not admit `@aof/foundation/markdown` (from the merge of main); stories 00 and 06 declared `diagram-review.md` without its manifest and five tracked renders (FF-7106); 49/03's posture-home sweep did not know 170's `/diagram` surface. The other two (an EPERM renaming a temp folder in the m41 reindex control, and 154/06's "another owner is writing this ask") passed when re-run alone. | defect | high | blocker | verify (fixed inline) | fixed: audit digest re-pinned, kernel allowlist widened with its reason, both stories' `files:` completed, and 49/03's assertion keeps 49's three surfaces and names 170's fourth (the delivered `.feature` is unchanged); all six files pass alone (128 cases) |

| F-170-09 | At the UAT, a first draft's labels were clipped by their own boxes ("odes · edges · aof:sketc", "Architec / t"). Excalidraw fetches a font only once the scene draws text in it, so on an empty canvas the converter measured and wrapped every label in the fallback font. Stored: 295 px for a 36-character Excalifont line that needs about 400 px. | defect | high | blocker | verify (fixed inline) | fixed: accept loads `20px Excalifont` for the proposal's characters before anything is measured; the operator's second draft fit |
| F-170-10 | Opened on the fleet origin (`:4181`), `/diagram` said "Diagrams are off in this project". The fleet serves no `/api/diagram/*`, and the 404 was read as off. | defect | low | blocker | verify (fixed inline) | fixed: a 404 says this server does not serve the editor and points to the project's own board; FF-5307 re-pinned (+11 −7) |
| F-170-14 | At the UAT, the operator placed a 3.9 MB public icon set in the project's `.aof/diagrams/libraries/`, where it would be committed with the repository. The operator ruled that large shared libraries belong in the global store, and the project folder holds a project's own. | gap | medium | blocker (operator's call) | verify (built inline) | fixed: ADR-011 amended; libraries are read from the global home's `diagrams/libraries/` and the project's, the project shadowing a global file of the same name, each root with its own 8 MB cap; `diagram-scene-command` covers both roots, shadowing and core's `AOF_GLOBAL_HOME` wiring |
| F-170-11 | A note is added only from the bar below the canvas. There is no contextual entry on a selected shape, such as the right-click menu or the selection toolbar. | gap | medium | non-blocker | backlog — a later milestone (operator's call at the UAT) | open |
| F-170-12 | The Library panel has no search. With a real set (249 AWS icons) an item can only be found by scrolling. Excalidraw 0.18's only search box searches the canvas. | gap | medium | non-blocker | backlog — a later milestone (operator's call at the UAT) | open |
| F-170-13 | When the architect finishes, the editor does not update by itself; the operator refreshed. Whether the five-second poll updated the review panel, as opposed to the canvas, was not measured. | gap | low | non-blocker | backlog — phase 2's push channel (SPEC, out of scope), a later milestone (operator's call) | open |

The recall at triage (`aof work memory recall … --kind finding`) returned no candidate with the
same cause for any of the fourteen. Each is recorded as a distinct incident.

Each of F-170-04 to F-170-07 has a test that fails on HEAD's source and passes on the fix. Against
HEAD with the new tests: 5 of 32 cases failed in `diagram-scene-command` and `diagram-scene-review`.
With the fix: those two files plus `diagram-scene-api` pass 41 of 41; `@aof/diagrams` 38/38;
`@aof/diagrams-ui` 20/20; FF-5307, FF-17001 and `acd-loop-ask-reaches-every-face` 29/29;
`acd-no-new-silent-catch` 2/2; the UI type-check (`tsconfig.app.json`) is clean.

## User sign-off

The operator ran the UAT on 2026-10-24, on the control node, against payload `f43d5121` (then
`f43d5121+dirty` with F-170-09's fix). The diagram was 170's own ADR-010, opened from the aof board
(Fleet → Open board) at `/diagram?ref=170&file=ADR-010-scene-is-the-store.svg`. Read back at the
source (the scene file and the review records under `diagrams/`):

| Procedure | Result |
|---|---|
| First draft: requested from the empty editor; the architect's dock session proposed it; previewed and accepted | pass. The first draft's labels were clipped (F-170-09); after the fix, a second draft fit |
| Recolour by note, per `.aof/diagrams/style.md` | pass: `style` lines for every node (paper fill, teal on `context` and `propose`, the one crimson accent on the view) |
| A real library: AWS Architecture Icons in `.aof/diagrams/libraries/` | pass: `context` offers 249 items, inside the 8 MB cap. Finding an item is hard (F-170-12) |
| A hand-placed library item, then an edge to it by note | pass: `%% aof:lib n1 aws-architecture-icons/"Kinesis"`; compile anchored it in its own group, and `n1 --> editor` is bound to that anchor (F-170-06's fix, live) |
| Publish | pass: the editor's SVG (4280×705, `svg-source:excalidraw`) and the owed PNG are written; the block is pasted under ADR-010 |
| A freehand stroke kept across an accept; a two-note batch with a question answered | not run live. Covered by the browser smoke with a stand-in architect; the operator accepted on that evidence |

**Sign-off:** the operator accepts milestone 170 ("as for this milestone yes I'm happy with it").
F-170-11, F-170-12 and F-170-13 are deferred to a later milestone by the operator's call.

## Acceptance

- [x] Operator acceptance of the served editor: a live first draft and a live review (see User sign-off).
- [x] Operator check with a real library set: AWS Architecture Icons, 249 items (see User sign-off).
- [x] Maintainer sign-off on the supply-chain audit's d3-shape admission (reviewed on PR #13).
  Approved by the operator at `aof:verify 170`, 2026-10-24. The admission exempts exactly
  `d3-shape/src/curve/bundle.js`, at the one reviewed sha256 that both copies (v1.3.7, v3.2.0)
  hash to; any other path, package or byte still fails the audit.

## Accept decision

2026-10-24, `aof:verify 170`. Stories 00–09 are accepted (`done`). Each carries an OUTCOME.md, and
seven carry a RETROSPECTIVE.md (03, 05 and 06 surfaced no lesson of their own). No blocker finding is
open: F-170-01..10 and F-170-14 are fixed, and F-170-11..13 are non-blockers the operator deferred. Validate is
PASS; doctor reports no `control-unresolved` and no dangling citation, with FF-17001 now declared in
ARCHITECTURE's register. The whole-tree regression gate is green at `396f34da` (13,506 of 13,506 cases, 13.7 min; REGRESSION.md).
The first gate (`b2dbfad6`) was red, and its repairs are F-170-08. The second (`396f34da`) was red on one
unit, the native package suites' 90-second budget, because `%TEMP%` held 66,000 entries and milestone
167's `discovery.test.mjs` took 297 s to build and delete its trees there. With the stale test leftovers
cleared (the operator's go), it took 50 s and the third run was green. That budget fails on a slow disk
alone, which is a fragility in 167's test, not in this milestone. The milestone is accepted: `done`.
