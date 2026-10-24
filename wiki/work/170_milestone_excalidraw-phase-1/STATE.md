---
doc: state
---
# 170 · Excalidraw phase 1 — State

Migrated from a source folder on 2026-10-24 (status: in-review).
The source was the hand-numbered temporary folder `200_milestone_excalidraw-phase-1` on
`feat/excalidraw-collaborative-refinement`. It was moved out of `wiki/work/` first so the mint gave
it the stream's next number (RETROSPECTIVE R4). Its SPEC, ARCHITECTURE, VERIFICATION and
RETROSPECTIVE are carried verbatim, renumbered 200 → 170, because the CLI's recovery re-sequenced the
ADRs and flattened the SPEC. The inference lane wrote the ten story folders from SPEC's story list,
the ADRs and VERIFICATION, and renumbered the code's `milestone 200` / `200/NN` citations to 170.

## Progress

- [x] 00–09 built on the branch (PR #13 and after). VERIFICATION.md holds the evidence.
- [ ] Acceptance through `aof:verify 170`. Three items are still open in VERIFICATION: a live first
  draft and batch review, a real library set, and the d3-shape supply-chain sign-off.

## Findings

Developer-actionable items from reconciling the delivered work (pick up at `aof:continue 170`):

- [ ] Delivered work is present, but no aof tasks or feature scenarios exist. The stories carry
  their acceptance in VERIFICATION.md, not in `.feature` contracts. `aof:verify 170` decides whether
  the browser smoke and the suites it lists are enough, or whether contracts are owed first.

From the import-time review of the delivered code (2026-10-24, static). The first four were
re-checked by hand against the code and fixed the same day. Each fix has a test that fails on the
earlier code (`diagram-scene-review`, `diagram-scene-api`, `mermaid-profile.suite`). The
`readJsonBody` fix re-pins `board-ui.mjs` under FF-5307 with its reason. FF-13304 was already red at
the branch head, after the merge of main gave `@aof/diagrams` a `@aof/foundation` dependency, and its
expectation now lists that dependency.

- [x] **An edge to a node in a subgraph can never be accepted** (08). `compile.mjs` step 8 re-fits
  every frame with a touched member, even when the fit has not changed. `touchedElements`
  (`scene.mjs`) adds frames for node, style and layout changes, but not for an edge's two ends, so
  accept refuses the frame update as "outside what this proposal touches", and refuses it on every
  retry. Fix: add the end nodes' frames for `edge:`, skip a re-fit that changes nothing, and add a
  compile-plus-accept test through a frame.
- [x] **A large non-ASCII save can be silently corrupted** (00, 08). `readJsonBody`
  (`packages/server/src/board-ui.mjs`) appends each Buffer chunk to a string, so a multi-byte
  character split across chunks becomes U+FFFD. The new 16 MB diagram limit makes this routine.
  `byteLength` over the whole body on every chunk is also quadratic. Fix: collect Buffers, decode
  once, and count bytes as they arrive.
- [x] **Withdrawn or answered notes can be revived** (05, 06). `respond` and `propose` never check
  the request's status. A respond after Withdraw flips the note to `answered`, and a second respond
  overwrites the first answer.
- [x] **A library file name with a space breaks the architect's view** (09). The `aof:lib` grammar
  (`mermaid-profile.mjs`) allows only `[A-Za-z0-9._-]` in a library name, but the name comes from
  the file name. `Azure Icons.excalidrawlib` produces a view that the profile's own parser rejects.
- [ ] **A long label breaks the review loop** (08). `serializeProfile` throws on a label over 500
  characters, which the editor allows. An imported `customData.aof.id` is likely not checked against
  reserved words or the length limit either (not traced end to end).
- [ ] **The review listing drops records older than the newest 50** (05). An old open note or
  pending proposal vanishes from the panel, and every 5-second poll re-parses every record file.
- [ ] **Accept does not check `add` operations against the proposal** (08, likely). Library items
  dragged from the panel get no anchor box, so an edge proposed to one never resolves.
- [ ] **The opt-out is enforced only in the UI** (02, low). `/api/diagram/scene` writes with
  `work.diagrams` unset, and `/diagram?…` loads the editor chunk when opened directly.
- [ ] **Replacing a review record fails with EPERM on Windows under load** (00, 05, 06). Measured
  2026-10-24 on the control node. `writeRecord`'s `rename` over an existing record intermittently
  fails, in different `diagram-scene-review` cases on each run, with HEAD's `scene.mjs` too. A retry
  (foundation's `renameWithRetry`, about 0.5 s) did not clear it, so the hold is long. The suspect
  is a record first placed by `link()` from its temp file, which a scanner then holds through the
  shared file. Not fixed: the cause needs measuring first.
- Accepted trade-off, not owed: a crashed writer leaves the `.lock` and every write returns 409
  until it is deleted by hand (ADR-004 records this). With host sleep and tree-kills on this
  machine, it is worth revisiting.
