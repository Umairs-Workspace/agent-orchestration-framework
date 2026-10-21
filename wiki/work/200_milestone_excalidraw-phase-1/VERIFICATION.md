---
doc: verification
---
# 200 · Excalidraw phase 1 — Verification

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

## Acceptance — open

- [ ] Operator acceptance of the served editor: a live first draft and a live batch review.
- [ ] Operator check with a real library set (for example Azure's icons) in `.aof/diagrams/libraries/`.
- [ ] Maintainer sign-off on the supply-chain audit's d3-shape admission (reviewed on PR #13).
