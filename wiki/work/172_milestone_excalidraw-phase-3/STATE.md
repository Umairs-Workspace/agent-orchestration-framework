---
doc: state
---
# 172 · Excalidraw phase 3 — State

## Progress

- [x] Refined 2026-10-27 (`aof:refine 172 --autonomous`, solo): RESEARCH Q1, ADR-001..003, DESIGN with
  committed mocks, five stories
- [ ] 00 · the architect answers in a headless session — built and reviewed (in-review); verify repairs F-172-02..06, F-172-12, F-172-13
- [ ] 01 · every conversation in one panel — built and reviewed (in-review)
- [ ] 02 · the answer streams into its thread — built and reviewed (in-review); task 03 `@uat` open; verify repairs F-172-07, F-172-08
- [ ] 03 · the diagram surface has no terminal — built and reviewed (in-review)
- [ ] 04 · a right-click leaves the drawing true — built and reviewed (in-review); F-171-03 ruled out

## Notes & decisions in flight

- Framed on 2026-10-25 at 171's accept, from the operator's UAT verdict ("next milestone can be
  streaming + UI overhaul", with a proper design first) and 171 VERIFICATION F-171-03 and F-171-04.
- **Blocking unknown resolved by measurement** (RESEARCH Q1): a headless stream-json `claude` holds a
  conversation across turns and streams its answer in deltas on this machine's login. One small
  paid probe (haiku, two turns) was run at refine.
- **Codebase graph unavailable:** `aof graph build .` ended `graphify-timeout` after 600 s
  (2026-10-27). Story boundaries were drawn from the importers of each boundary module (grep), and
  each story's `files:` carries the suites and controls that import or pin what it changes (171
  RETROSPECTIVE R2).
- **Recalls.** Architect recall `3f0c9a6e-2b7d-4f55-9b1e-6c2a8d04e1a7` (five ADRs; verdicts in
  ARCHITECTURE's preamble). PO recall `8b52d7c1-94e3-4a0f-a6d2-1f7e3c9b5a20` returned nothing.
- **Mocks drafted at refine** by the main session as designer (`mocks/conversation.html`, rendered
  with headless Chromium); the operator accepted them on 2026-10-27 (172/01 Q2).

### Default decisions taken (technical; each recorded where it applies)

- The session's model and effort are the refine phase's session launch (ADR-001 §3; 172/00 Q2).
- The architect's tools: Read, Grep, Glob, Write, `Bash(aof diagram scene:*)`; anything else is
  denied in the turn (ADR-002 §2; 172/00 Q3).
- An ended session is not resumed; streamed text is never stored (ADR-001 §4, ADR-002 §4).
- The env scrub is the loop driver's one predicate, hoisted into `session-model.mjs` (ADR-001 §3).
- One test seam, `AOF_ARCHITECT_EXECUTABLE`, for the browser smoke's stand-in (ADR-001 §5).
- The thread open on load, auto-follow while streaming, the stopped-turn line (DESIGN).
- The diagram dock's modules are removed in their own story (03), after the surface stops using them.

## Feedback (for retro)

### 172/00 — build and review close (2026-10-27, solo)

- **The declared write set was incomplete (refine).** FF-7106 named two tracked renders missing from
  `files:` (`.agents/skills/aof-diagram-review/agents/openai.yaml`,
  `.codex/aof/workflows/workflow-contract.md`). The build also wrote four files nobody had declared:
  `packages/core/assets/manifest.json` and `.aof/aof.lock.json` (both derived), plus
  `packages/core/assets/variants/codex/workflow.md`. That last one is a **fourth copy of the
  diagram-review prose**, the source the codex skill renders from; refine named three renders and
  missed it. All five are now declared on the story. Lesson: a command's tracked renders are not
  its only copies — the codex variant is a second source.
- **The conditional prose could not be read by the model (task 03).** The first draft of the
  diagram-review paragraph applied "in a conversation", and a session cannot tell it is in one,
  because the invocation is identical. The real run answered with `respond` first and then wrote a
  different summary. The paragraph is now unconditional. 171 R1, testing against a real session
  before review closes, caught it.
- **Routed at close — `story (operator)` (Q3):** execution now holds three copies of the
  owned-process tree kill (`codex-app-server.mjs` `terminateOwned`, `session-driver.mjs`, and
  `conversation-session.mjs` `terminateTree`). Shape: hoist one `terminateProcessTree(child)` into
  an execution leaf that all three import. It was not fixed at this close because it edits two
  modules outside this story and raises the `execution/src` budget again.
- **Recorded (Q5):** the architect's session ran a bare `mktemp -d`, outside
  `Bash(aof diagram scene:*)`, without a denial, and its `Write` grant is not path-scoped (it wrote
  its input files under `/tmp`). Logged in VERIFICATION's register for triage at verify.
- **Recorded (Q5):** `aof test --scope impacted --story 172/00` widened to most of the tree (the
  story declares 40+ paths, several of them new) and was still running at 89 minutes on the Mac.
  It was stopped, and its scope was covered by focused runs of every declared suite.
- **Recorded (Q5), not caused by 172:** on macOS, `/var` vs `/private/var` reds the 171 stamp-via-CLI
  case (`diagram-scene-review.test.mjs`) and FF-5301's two-hop laundering probe; four opencode
  renders (`aof-architect`, `add-diagram`, `explain`, `review`) differ from a fresh render. The
  shared tree also holds another session's uncommitted graph/knowledge work (174), which reds
  FF-11904 on four layers that are not 172's.
- **Doctor advisory:** 172/00's example map holds six rules, over the limit of four, so the story is
  large. It built in one pass, with no rounds lost to no-progress.

### 172/01 — build and review close (2026-10-27, solo)

- **Process slip: the near-miss recall ran after the build, not before it.** It was run at the
  review close and recorded with that time, not backdated. The lessons it surfaced (read the
  screenshot, not only the green; a fixed-width panel has a width budget) had already shaped the
  build through the smoke run and the mock readings, so it changed nothing. It is still a step
  skipped.
- **The declared write set was incomplete again.** `packages/diagrams-ui/test/canvas-anchor.suite.mjs`
  (two 171/00 cases read the retired bar's source) and the budget table (two rows named the retired
  `note-threads` modules) had to change; both are now declared on the story. Lesson for refine: a
  story that retires a module owes every suite that reads the module's source, and grep finds them.
- **The smoke had a stale fake since 171's verify.** Its dock socket never sent output, so after
  F-171-01's byte gate the dock typed nothing and the two dock checks could not pass. The fake now
  says it is ready the way claude's TUI does (paste mode on, then a drawn banner), and the checks
  read the submitted lines. Story 02 retires the dock and these checks with it.
- **The canvas is narrower beside the panel.** At 1280 it is about 900 px, so the smoke's drawn box
  moved clear of the SDK's left properties panel. Expect any canvas-fraction coordinate written for
  the full-width canvas to need the same.
- **Fixed at close (Q2):** the Preview note lingered at the top of the list after its proposal was
  decided (it now clears on accept, reject or opening a thread); the panel and the model each had an
  `HH:MM` formatter (one `clockOf` now); the reject-reason field let keys reach the SDK's document
  listeners (the panel's root now stops keydown and keyup for every field).
- **Recorded (Q5), design gap, minor:** a proposal card's changes line reads the counts ("1 changed")
  where `mocks/conversation-proposal.png` reads the change ("1 edge relabelled · nothing else
  changes"). Saying what changed needs the change's kind (a relabel and a restyle are both
  `changed`), which the proposal record does not carry.
- **Recorded (Q5):** `test/arch/testing/acd-source-directory-budget.test.mjs`'s
  `packages/diagrams-ui/test` exemption still lists its seven members by name; the names now match
  the tree.

### 172/02 — build and review close (2026-10-27, solo)

- **A red left by 172/00, caught here.** 00 changed `packages/server/src/board-ui.mjs` (+39 −1), which
  FF-5307 (`acd-loop-state-rides-the-run-record`) pins byte for byte. FF-13109
  (`acd-loop-ask-reaches-every-face`) also counts the board's body reads and looks for the admission
  inside the same block as the read. 00's lane ran neither: its `files:` declared neither control,
  and `aof test --scope impacted` never finished on this machine. Both were repaired here. 00's
  conversation route now admits inside the block that reads the body, and the digest is re-pinned with
  the measured diff. Lesson: a story that touches a byte-frozen file owes the control that freezes
  it, and a grep of `test/arch` for the file's path names it.
- **The events 00 emits and the reducer 02 specifies did not quite match.** 00 emits `session: started`
  where 02's examples say "starting", and 00 emits no queued list. The reducer accepts both spellings.
  The queued list comes from the editor's own POST answers, so only the posting editor shows "Queued";
  a second editor on the same diagram would not.
- **Fixed at close (Q2):** a window resize turned the follow off (the scroll it fires read as the
  operator scrolling up). Now only an upward wheel, touch or key does, and reaching the bottom resumes.
- **Recorded (Q5), design gap, minor:** activity steps read as the command run ("aof diagram scene …
  --action context") where `mocks/conversation-streaming.png` reads what the step did ("Read the diagram
  as Mermaid"). A friendly label needs a vocabulary of the review command's steps.
- **Recorded (Q5):** E12 (an unavailable session shows the command to copy) is proven by the reducer, the
  delivery decision and a source check of the editor's 503 branch; the browser smoke never runs a
  board with no architect session to launch.
- **Task 03 is the operator's `@uat`** (a real architect answering in the deployed build). It is left
  for `aof:verify`.

### 172/03 — build and review close (2026-10-27, solo)

- **The declared read set was incomplete by two controls.** The importer sweep (171 R2) found two
  pins outside `files:` that counted what this story removed:
  - `apps/ui/test/terminal-harness-drives-a-grid.suite.mjs` counts the socket suite's lanes (23 → 17);
  - `apps/ui/test/terminals-home-route.suite.mjs` pins `TerminalControl.tsx`'s line count (839 → 834).

  Both were re-measured and updated here. Lesson: a story that removes lanes or lines owes every
  suite that counts them, and a grep of the tests for the removed file's name or the suite's export
  finds them.
- **The surface-table scenario lives in `invariant-4-amended`, not in the gate.** Adding it as an
  eighth lane of `acd-fleet-terminal-input-constrained` broke that file's own seven-lane census, which
  `invariant-4-amended` pins on purpose. It went beside that census instead.
- **The near-miss recall ran after the build, not before** (missed at the lane's start). It surfaced
  132 R4 (a comment moves a digest pin) and 151 R2 (a budget left over). Both were already honoured:
  FF-5307 was re-pinned from the measured diff, and the `diagram/` ceiling was lowered 5 → 3.
- **`aof test --scope impacted --story 172/03` widened to scope all** (1,247 suites, about 35 minutes
  on the Mac). Seven of the story's declared paths had no registered dependent in the graph. It
  reported **30 reds, none of them 03's.** 03's own suites and the importer sweep are green, and no
  failing file touches the terminal, the dock or the budgets. Attributed from their messages, for
  `aof:verify 172`'s regression gate:
  - **Caused by 172's earlier stories:**
    - FF-6306: `packages/diagrams/src/review-session.mjs` (00) is a second module that spells an
      assignment phase's slash command.
    - FF-9603: 02's `PLAN.md` restates the declared path `test/smoke/stand-in-architect.mjs`.
    - FF-12603 leg 6: 02's re-pin comment widened the `RE-PINNED by 127/04` window in
      `acd-loop-state-rides-the-run-record` from 3,618 to 4,161 characters, against a ceiling of
      3,900. This was measured at `1bbdfdc` and is unchanged by 03.
    - F-47-04-ARCH-2: `acd-architect-session-never-bypasses-permissions` (00) cuts source with an
      `indexOf` sentinel slice.
    - workspace-boundaries: `packages/execution/src/conversation-session.mjs` (00) has an
      unaudited `execFile("taskkill.exe", …)`.
  - **Not attributed, and likely 174's commit `08e9f0a`** (new graph verbs):
    - application registration;
    - the command-core and work-memory goldens;
    - FF-16004 (`aof work find` evaluates 739 modules against a ceiling of 737).
  - **Look environmental:**
    - release-fingerprint-pin, yarn-installation, core-workspace and distribution-workspaces;
    - a child process whose cwd was removed (lane-is-local-slot);
    - 81/00, 154/11, 69/04, 156, loops-commands and autonomous-shell-out;
    - FF-5301 (a TypeError in its plant) and 171/02's stamp test.
- **Recorded (Q5):** m171/ARCHITECTURE.md's ADR-005 still reads "Accepted". 172/ADR-003 states that it
  supersedes it, but the old record does not say so. Marking a delivered ADR superseded is the PO's call
  at verify.

### 172/04 — build and review close (2026-10-27, solo)

- **F-171-03 ruled out, not fixed.** Six gestures over 171's own scene (at device pixel ratio 2, on
  the editor with 01's panel) drew exactly as before, and the scene matched the saved file. The smoke
  keeps all six as `right-click:` checks. Details are in VERIFICATION. The 171 tree itself was not
  re-run: 01 had landed first.
- **Contract wording, flagged and not changed:** the scenarios name "the 'propose' edge's label", but
  no label in the scene reads "propose". The architect-session → review-store edge is labelled
  "3 writes a record", and only its source box reads `--action propose`. The checks drive that label.
- **Measuring needed the drawing in view.** At 100% the label sits under the panel, and the first
  right-click opened no menu. The shape gestures now fit the drawing first, and the smoke asserts
  each one opened its own element's menu, so a gesture that misses fails rather than reading green.
- **Fixed at close (Q2):** the smoke read 171's scene from its live folder only. It now finds it under
  `archive/` too, so archiving 171 does not break the smoke.
- **Recorded (Q5):** a right-click on a shape enables Undo, because SDK 0.18.0 records the selection
  it makes in its history. The scene is unchanged, so this is not a defect.
- **The near-miss recall ran after the build** (missed at the lane's start). Four of its five lessons
  were already honoured: the real corpus over a fixture, and the screenshots read and not only the checks.

## Verification

- [x] `@executable` suite: story lanes green at each story's close
- [x] Fitness functions green: FF-17201, FF-17202 (`pending` markers dropped from ARCHITECTURE's register)
- [x] `@manual` signed off (agent-run evidence in VERIFICATION for 00/03, 01/01–02, 02/02, 04/00–01)
- [x] `aof work validate 172`: PASS. `aof work doctor 172`: warnings only, no `control-unresolved`
- [x] Regression gate green on Windows at `4e7d2fe` (REGRESSION row 3; row 2 red at `0a4fb09`, F-172-15 fixed)
- [ ] `@uat` 02 task 03 (a live answer streams into the thread): the operator's run, not yet reported

### `aof:verify 172` in flight — handoff (2026-10-28, from the Mac)

Resume with `aof:verify 172`. Accept the milestone once both open gates above are closed. The verify
so far is recorded in VERIFICATION (`### aof:verify 172 — the controls the story lanes never selected`,
plus findings F-172-01 to F-172-14) and in two commits, `8a810a8` and `1b0f4f5`.

**Done:**
- Every red that 172's own code caused is repaired and committed: F-172-02 to F-172-08 before the
  gate, and F-172-12 and F-172-13 from it. Each finding's triage carries its prior-occurrence
  recall; twelve recall observations are recorded on 172.
- Gate run 1, on the Mac at `8a810a8`, is recorded red in `REGRESSION.md`. Its 172 reds are fixed
  in `1b0f4f5`. What stays red on the Mac is environmental: F-172-11 (`/var` vs `/private/var`
  tmpdir paths) and F-172-14 (the gpg keyring lock, Node 24's spec reporter, three timing-bound
  fixtures). None of them is in code 172 changed.
- The design render at verify was INCONCLUSIVE (no `work.ui.baseUrl`). The stories' readings
  against the committed mocks stand as the conformance evidence.

**Open, in order:**
1. **Regression gate on the Windows control node** (operator's choice, 2026-10-28). Quit the
   desktop app first: its daemon holds `:4182`, which a case binds. Run it on a clean checkout at
   `1b0f4f5` or later:
   `node packages/core/bin/aof.mjs work regression-gate 172`, with `AOF_GLOBAL_HOME` set to a fresh
   temp directory. Commit the `REGRESSION.md` row it writes.
   - If the run is red, attribute each red the way F-172-12 and F-172-14 were: re-run the file
     alone, then read 172's diff for the code the file tests.
   - Do not use `--gate-override` unless the operator says so.
2. **`@uat` 02 task 03.** On the Mac, a worktree at `8a810a8` was set up for it (scratchpad
   `uat-172`; `aof work ui --port 4199 --target <worktree>`, with the VS Code extension's `claude`
   on PATH). On Windows, run it on the desktop app's board, on the ADR-002 diagram of 172 via Edit
   draft. 170 and 171 are `done`, so their diagrams are read-only.
   - R1: ask about a shape, and the answer streams into the thread with no terminal.
   - R2: reply, and the next answer streams the same way.
   - Record the result under VERIFICATION `## User sign-off`. A pass closes F-171-04.
3. **Then accept.**
   - `aof work status 172/00 … 172/04 done`, ticking each in SPEC `## Stories`.
   - Mark m171/ADR-005 `Superseded by m172/ADR-003` (172/03's close, Q5).
   - Spawn `aof-designer` to set the `DESIGN.md` rules for F-172-09 and F-172-10.
   - Write a per-story and a milestone `RETROSPECTIVE.md`, then run `aof work memory ingest`.
   - Write an `OUTCOME.md` for each story and one for the milestone. The milestone's states what no
     single story does: the conversation is an editor surface with no terminal.
   - `aof work status 172 done`, record `## Accept decision`, and compact this STATE.
