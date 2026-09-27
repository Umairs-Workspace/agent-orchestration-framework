---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 138 · The session driver sees claude's screen — State

## Progress

- [x] Framed 2026-09-25 on the backlog (un-numbered); promoted to 138.
- [x] Refined 2026-09-27 (solo, at the operator's choice): RESEARCH (two zero-token PTY probes of
  `claude 2.1.283`), ARCHITECTURE (ADR-001–006, FF-13801/13802, one diagram), and three stories.
  Next: `aof:refine 138/00` (its contract), after the operator approves the dependency.
- [x] Contracts authored 2026-09-27 (`aof:refine 138/00-02 --solo`): 00 has seven tasks, 01 five
  and 02 three, each with a `PLAN.md`. All three validate. The dependency approval is still
  00's first task, not this refine's.
- [x] Built 2026-09-27: 00 and 01 in-review (see Notes). 02's live legs passed on both nodes after
  two fixes, `d8d2230`. Next: `aof:verify 138`.

## Notes & decisions in flight

- **Why now.** Two mitigations landed on 2026-09-24 read raw PTY bytes: lanes inherit
  `.claude/settings.local.json` (`6c4d81a`), and the driver waits for `CSI ?2004h` and fails fast
  after submit with the byte tail (`cf10030`). Both treat symptoms the driver cannot see; this
  milestone gives it the screen.
- **Library choice, as discussed with the operator.** `@xterm/headless` (the VT emulator with no DOM,
  used server-side the way VS Code's pty host does). Considered and not taken: terminal-kit (builds a
  TUI in the current terminal; does not emulate a child's screen), the expect family
  (pexpect/wexpect, expectrl, nexpect: byte-stream regex, brittle against a repainting TUI), a
  multiplexer (WezTerm `cli send-text/get-text`: heavier, external). `@microsoft/tui-test` is the
  reference design (node-pty + headless xterm) but a test runner, not a runtime.
- **Answered at refine** (was open): input box = ADR-002; consent vs failure = ADR-003; fleet
  reuse = ADR-005 (no); memory bound = ADR-001 §3.
- **Default decisions taken at refine** (DEFAULT DECISION in ARCHITECTURE):
  - No ready frame at the cap fails as a retryable `timeout`, and nothing is typed (ADR-002 §5).
  - MCP approval is a named failure, not a consent (ADR-003 §4).
  - Screen evidence goes to `degrade.log`, not loop-diag, because every drive is a child process
    (ADR-004 §4).
- **Near-miss found at refine.** claude's select menus use the same `❯` glyph as the prompt
  (RESEARCH Q2), so a "prompt visible" test by glyph would type into dialogs. ADR-002 §1 is
  structural for that reason.
- **Found by reading, not measured.** The driver's raw output buffer is never trimmed, and the
  sentinel scan re-splits all of it on every chunk. 00 bounds both (ADR-001 §3).
- **Decided while authoring the contracts** (each is ratified in the task that states it):
  - The driver reaches the door through `options.openSessionScreen`, and tests force the byte
    path by injecting a `load` that throws. The load outcome is remembered per loader function
    (00/02, 00/03).
  - A synthetic fixture says so in its `claude` field (`synthetic: <source>`) and keeps the
    `<id>.json` name. This settles ADR-003 §7's name-versus-file wording (00/02).
  - A consent "returns" only after a frame on which its entry did not recognise. A repaint before
    claude takes the Enter is not a return (00/04).
  - The degrade event gains a `screen` field. `key` only throttles and is not written. The message
    no longer embeds the byte tail (00/05).
  - FF-13802's "no other entry" is scoped to the frame-deciding entries. `usage-limit` is drawn on
    a REPL frame, so `ready` also claims it (01/01).
  - 01 also writes `test/loop/loop-command-stops.test.mjs`, which holds `childDriveOutcome`'s
    cases and the sequential halt line (01/03).
  - 02 restarts nothing, because every leg is a CLI verb or a script and loads the payload on each
    call. Its WSL leg drives the distro's deployed tree from a scratch script (02/00, 02/01).
  - RESEARCH Q2's banner row is scrubbed for the private-terms guard, and recordings are scrubbed
    with same-length substitutions (00/02).
- **Dependency approved by the operator, 2026-09-27** (`aof:continue 138 --solo`, before
  `package.json` changed). Asked: "Do you approve adding `@xterm/headless@6.0.0` as an
  exact-pinned RUNTIME dependency? Per RESEARCH Q1: MIT licence, 1,957,834 bytes unpacked, no
  dependencies of its own, same 6.0.0 as the board's `@xterm/xterm`." The operator answered:
  **"Approve"**.
- **The base is committed, 2026-09-27.** At the operator's word ("create a new branch now, and
  commit everything (in batches)"), the 2026-09-27 driver fix and the 138 records were committed
  on branch `138-terminal-emulator` (`bbb6046`, `0f69623`, `229f391`) before the build began.
- **00 was built in a worktree, 2026-09-27.** Two `aof work loop` runs (02 and 03, other
  workspaces) were live on the main checkout through the npm-linked `aof`. Every drive child they
  spawn loads that checkout's `src/`, so a half-rewired driver there would have reached their next
  drive, and `npm ci` there would have pulled `node_modules` from under them. The build ran in
  `C:\Source\umami\aof-138` on branch `138-terminal-emulator-00`, cut from `4831f38`.
- **01's trust contract, decided by the operator, 2026-09-27.**
  - The finding, at 01/00's capture: claude 2.1.283 opens the trust dialog on `❯ No, exit`, with
    `Yes, I trust this folder` as the second, unnumbered option. So ADR-003 §4's one-Enter consent
    could never answer it, and its Enter would EXIT claude.
  - Also found: the MCP dialog's default is `❯ Continue without using this MCP server`.
  - Asked to choose between failing trust, allowing Down then Enter, or leaving it always
    `blocked_screen`, the operator answered: **"Allow down then enter. And make it robust enough
    where we can detect the order."**
  - ADR-003 §4 is amended in place: the door navigates by the screen, one confirmed key at a time,
    and never blind. RESEARCH Q5 records the live arrow probe: Down highlights Yes, Up returns, in
    order, and nothing is written without an Enter.
  - `aof:refine 138/01 --solo` re-authored 01's tasks 00, 01, 02 and 04, its STORY and its PLAN to
    match.
- **Open, for the operator:**
  - **Installed, restart pending (operator).** This node's payload is
    `d8d2230+dirty.20260927T173721` and the WSL node's tree is `f75fa75` (the same code). Both
    daemons keep the build they started on until the desktop app is restarted. The WSL worker
    daemon is the same: restart it to pick up the tree.
  - **`npm ci` on the Mac worker after it pulls.** Until then it logs `screen-model-unavailable`
    once and runs the byte gate, which is ADR-001 §4 working.
  - **The classic-renderer finding needs the operator's ruling** (VERIFICATION, 138/02). claude's
    classic renderer draws the REPL on the normal buffer, and ADR-002 §1 requires the alternate
    one. Routed `story (operator)`: accepting the box on either buffer amends ADR-002 §1.
- **02 was built 2026-09-27 (`aof:continue 138 --solo`).**
  - The operator's `aof:continue 138` came after the merge. The phase reclaimed the stranded
    milestone run (`20260927T160008202Z-0002`, retry of `…-0001`).
  - All three legs ran without a desktop restart: each is a CLI verb or a script, and each call
    loads the payload.
  - The test-bed gained fixture milestones `06` (`screen-proof`, five stories) and `07`
    (`loop-proof`, one story) on its branch. Their failed and cancelled runs stay as evidence.
- **02's token cost, recorded before its one real leg (2026-09-27, ruling 1 of 02/02).** One small
  real turn: the operator's configured claude receives `/aof:continue` on the test-bed's fixture
  story and is cancelled 45 s after launch. Every other leg of 02 is zero-token.
  - The first attempt (`06/02`) ran on a build without the fix and typed nothing.
  - The counted leg (`06/04`) cost $0.40, as measured: 8 turns and 5 tool calls.

## Feedback (for retro)

- **The snapshot carries `cols` (00/02, 00/03).** ADR-001 §1 lists `{ buffer, cursor, rows }`.
  ADR-002 §1's "rules across all cols" cannot be read from right-trimmed rows, so the snapshot also
  carries the width it was drawn at. The change is additive and the ruled keys are unchanged.
- **`@xterm/headless` 6.0.0 gates `terminal.buffer` behind `allowProposedApi`.** Without it the
  first snapshot throws. `screen.mjs` sets it, and says why.
- **The door opens synchronously (00/03).** It is opened just before the spawn, as PLAN says, but it
  does not await the model: chunks that arrive while the package loads wait in order. Awaiting the
  load before the spawn would have moved the spawn for every one of the driver's 27 test dependents
  on a process's first drive.
- **00's declared write set was one file short.** `test/session/agent-session-driver-door.test.mjs`
  holds ADR-015 §2's closed allowlist of test files that name the driver, and the two driver-driving
  terminal suites and FF-13801 had to join it with a reason. The file was added to `files:` at
  build. Two other controls outside the set caught design points and were answered in `src/`, not
  by editing them:
  - FF-6306 anchors on `containsNeedsInputSentinel`, so the bounded scan keeps that name.
  - 129/02's abort row wants the stop's kill synchronous, so the door FREEZES the frame at the
    decision instead of delaying the kill.
- **Review close for 00 (solo, one round, no Blocker).** Two findings were fixed at the close:
  - the door's open continuation now degrades to the byte gate rather than rejecting unhandled;
  - the evidence suite asserts ruling 7's shared evidence object.

  Two Nits are recorded:
  - The terminal suites' driven-PTY double (`screenPty`) repeats the drives suite's local
    `emittingPty`. Both belong in `test/support/mesh-worker-terminal-fixture.mjs`.
  - The driver grew about 90 lines (1,682 to 1,775) although its byte readers left. The verdict
    switch and the evidence record are what came in.
- **Review close for 01 (solo, one round, no Blocker).**
  - The driver is untouched (ADR-006). The consent's navigation is the door's, and the cursor-key
    mode is the model's snapshot.
  - The live check named the theme picker `first-run` 655 ms after the spawn. Under 00 alone it
    stopped at the 60 s cap.
  - Nothing was fixed at the close, and nothing is routed. The test-double Nit recorded at 00 holds
    for 01's suite too, which reuses 00's helpers.
- **A transcript flake, not caused here.** `agent-session-driver-transcript`'s "any movement …
  restarts the quiet stretch" is a real-fs mtime case. A poll tick already in flight reads the old
  mtime while the case advances its virtual clock (129's F-77 race). Over the build it failed in 3
  of 15 runs. The BASE, `4831f38` without 00, reproduces it: it failed in 1 of 12 runs, one of them
  a combined run that the build passed. It reads `defaultWatchTranscriptCompletion`, which 00 does
  not touch. Routed as a recorded finding: the case needs its tick to be quiescent before the bump.
- **02: every recording came from a shell that declared a Unicode terminal (fixed in `d8d2230`).**
  - 01's captures removed `WT_SESSION` but ran under Git Bash's `TERM=xterm-256color`. The driver
    scrubs `TERM_PROGRAM` too.
  - So from a PowerShell with neither, claude 2.1.283 drew `>` for `❯` and `√` for `✔`. The first
    live drive then ran to the 60 s cap on a screen the registry knows.
  - Lesson: a recording names the environment it was drawn in, and the launch declares the
    terminal it emulates rather than inheriting the operator's.
- **02: the WSL deploy stamped a failed install (fixed in `d8d2230`).** `deploy-wsl.sh` copied
  `package.json` without `package-lock.json`, so `npm ci` refused. The script never checked the
  failure and wrote the new lock's sha anyway, and `install-local` exited 0. Lesson: the first
  dependency this deploy path ever carried was the first test of its reinstall branch.
- **02: the contract's literal checks against what held.** These are for the PO at `aof:verify`.
  - Background: 00 and 01 were `in-review`, not `done`.
  - Task 01, ruling 3's `~/.claude.json` mtime: every live claude rewrites the file, so the check
    is confounded rather than passed. The drive did not write it: the trust pre-write returns on an
    already-trusted cwd.
  - Task 01: `aof work loop` admits no story ref, so the loop leg drove fixture milestone 07.
  - Task 02: the first user record opens with claude's `<pasted_content>` wrapper, with
    `/aof:continue 06/04` as its first line inside.
- **02: a concurrent session reinstalled the payload 4 s before the real leg.** It deployed from
  the shared main checkout, which did not yet hold the fix. That voided task 02's first attempt,
  which typed nothing. The re-run read the build stamp before and after. Recorded finding: live
  legs on a shared checkout need their build pinned, or read at both ends.
- **02: recorded, not fixed.**
  - Under the SEA launcher, node-pty's console-list `fork()` re-enters the aof CLI, prints its
    usage to stderr on every PTY kill, and waits out a 5 s fallback. This predates 138.
  - `ensureWorktreeTrusted` ignores `CLAUDE_CONFIG_DIR`.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`
