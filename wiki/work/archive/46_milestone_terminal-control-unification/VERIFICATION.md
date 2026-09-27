---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: what was checked, by whom, with what evidence?
  Owner: the verify session (the PO/orchestrator). Evidence agents REPORT; they do not author here.
  Findings are triaged into STATE.md `## Feedback (for retro)` and TECH_DEBT.md, not restated.
-->
# 46 · One terminal control — Verification

## Method

Built `aof:continue 46` → `aof:autonomous 46` on 2026-08-08. Four dependency-free stories built in
parallel in one working tree; every story reviewed by an `aof-architect` (structural) and an `aof-qa`
(behavioural) pass before any status moved.

**All counts below were re-run by a party other than the one that produced them** — QA re-ran each
developer's suites from its own uniquely-named driver, and the orchestrator independently re-ran the
gates named in §Fitness functions. Test isolation was `AOF_GLOBAL_HOME="$(mktemp -d)"` throughout, with
focused drivers only: the full suite (`scripts/test.mjs`) binds `:4182`, which the live control daemon
holds on this machine.

**The reviews were evidence-producing, not advisory.** Every finding of substance came from executing a
counterfactual — a mutation battery, a reverted fix, a moved file, a rebuilt-from-`HEAD` fixture — never
from reading code. That pattern, and its cost/benefit, is recorded in `STATE.md` `## Feedback (for retro)`.

## Story evidence

### 46/00 · pre-session-frame-queue — `in-review` (one `@manual` lane outstanding)

| lane | evidence |
|---|---|
| task 00 `@executable` | 26 contract rows, **26/26** |
| task 01 `@executable` | 17 contract rows, **17/17** |
| review-driven cases (labelled *not a contract scenario* in the test name) | 2 — malformed-frame survival; `onClose` immediate-run |
| pre-existing `terminal-ws.test.mjs` | 9/9 (unbroken) |
| all three suites in one process | **54/54** |

**Non-vacuity, measured by QA against the current bytes** (mutants regenerated from live source, anchors
asserted so a missed edit cannot masquerade as a pass):

| mutation | cases failed |
|---|---|
| drain reverted to a post-await `ws.on("message")` | **34 / 44** |
| the close fix reverted | **4** (all of task 01 sc4) |
| byte bound not honoured | 2 · drop-newest instead of drop-oldest | 4 · overflow silent | 4 |
| one shared queue across sockets | 1 |
| `ws.on("error")` listener removed | the process **dies** (uncaught `WS_ERR_INVALID_UTF8`) |

The arrival barrier that makes these tests meaningful was audited empirically rather than trusted:
300 iterations × 40 frames, worst case 40/40 already dispatched, **0 violations** — a pong proves prior
dispatch. The 1 MiB byte bound was confirmed load-bearing by running a 64 KiB mutant end-to-end: 44 pass,
**green and vacuous**, which is exactly the collapse the bound is chosen to prevent.

**Outstanding — `@manual`:** *"on a real machine the drained resize reaches a real node-pty without
wedging the session"* requires a deployed payload, a live board server and a browser session. Deliberately
**not** run against an undeployed tree; it is discharged with the milestone's other browser lanes once
46/04 and 46/05 land and one deploy can serve them all. **This story is not `done` until then.**

### 46/01 · dead-bridge-retired — **done**

| lane | evidence |
|---|---|
| `test/mesh-terminal-signal-source.test.mjs` | **14/14** (3× consecutive; row 8 is new and heavier, flake-checked) |
| `test/mesh-terminal-relay-bridge.test.mjs` | **18/18** |
| `test/arch/acd-fleet-terminal-input-constrained.test.mjs` | **6/6** |
| `test/arch/acd-fleet-terminal-frame-connection-identity.test.mjs` | **3/3** |

`wireTerminalBridge` is deleted; its export surface is exactly the nine live names and no caller was left
degraded. Detector #4 was re-aimed per ADR-007 and then **hardened to discover its subject** rather than
name it: it sweeps `src/**/*.mjs` for `.sendTerminalFrame(` call sites and requires each to sit inside the
sanctioned arrow, so a file move cannot blind it.

**Non-vacuity — eight mutations, each reverted, tree confirmed clean:**

- A secret appended at producer #1 → red. B leak at producer **#2 only** → red (proves every arrow is read).
- C both arrows deleted → red (**zero producers is a trip, not a pass** — the vacuity ADR-007 forbids).
- D/E behavioural leaks at `worker-stream-client` → the exact rows holding those secrets go red.
- F producers moved to another module with a sanctioned-shaped decoy left behind → **the old path-named
  detector reads GREEN; the shipped discovering one goes RED**, naming the moved file.
- G both producers re-spelled as shorthand → trips with the *re-spelled*, not the *deleted*, cause.
- H the `onOutputChunk,` forward at `src/mesh-worker-execution.mjs:3116` deleted → **row 8 red**.

H is the story's sharpest result: QA found that row 8 named the second call site
(`createMeshWorkerTerminalResumeHandler`) but bypassed it, so deleting that one forward would have taken
every **resumed** worker session dark on its fleet card while detector #4, row 8, and the whole
`mesh-terminal-input-path` suite stayed green. Row 8 now drives the real handler and is the only thing in
the tree standing between that forward and the defect.

Re-homed m38 coverage was judged **equal or stronger** on every lane; one old lane's advertised
same-node-discrimination was found to have been *vacuous* (its recording transport was constructed fresh
per row) and is now genuinely asserted.

### 46/02 · terminal-origin-seam — **done**

| lane | evidence |
|---|---|
| task 00 `@executable` | **9/9** (8 contract + 1 seam guard) |
| task 01 `@executable` | **6/6** |
| `test/arch/acd-board-server-no-fleet-import.test.mjs` (new gate) | **6/6** |
| regression, 26 suites | **147/147** |

The board learns the fleet origin as a served fact (`GET /api/fleet-origin` → `{ fleetOrigin, source }`);
standalone resolves its own default in the command layer behind a single `--fleet-origin` carrier. **No
fifth port home** was created — verified across `src/`: no new config key, env var, or re-typed literal,
and the flag's help string names no number either.

ADR-004's cycle prohibition gained the gate it never had, with non-vacuity proved by plants against five
import mechanisms plus a clean-baseline false-positive check, a positive counterweight (the gate cannot
read green because *nobody* resolves an origin), and a stripper canary on every policed file.

**The regression this story caused, and its guard.** A module-scope read of `DEFAULT_MESH_UI_PORT` closed
an import cycle: `import("./src/mesh-ui-serve.mjs")` threw `ReferenceError … before initialization` while
`import("./src/cli.mjs")` stayed green, so load order masked it and **121 assembled tests passed over a
server module that could not be imported on its own**. Found independently by two other stories' developers,
reproduced by the orchestrator, fixed by making every read call-time, and pinned by a **fresh-process
per-module entry probe** (in-process would be answered from the cache that does the masking). Non-vacuity
proved by planting the exact defect and watching that row go red.

### 46/03 · shared-terminal-core — **done**

| lane | evidence |
|---|---|
| `terminal-core-source-table` | 16/16 |
| `terminal-core-state-ramp` | 68/68 |
| `terminal-core-geometry` | 42/42 |
| `terminal-core-socket-url` | 41/41 |
| `terminal-core-input-policy` | 41/41 |
| `terminal-core-pane-identity-and-clamp` | 12/12 |
| `acd-terminal-mirror-geometry-pinned` | 2/2 |
| `acd-terminal-origin-not-port.test.mjs` (registered half) | 3/3 |
| `acd-terminal-control-boundary.test.mjs` (registered half) | 2/2 |
| **total registered by 46/03** | **227/227** |

Traceability was verified row-for-row by QA against the features, not against the code's own comments: the
30-cell transition matrix, the 12-row signal table, the 14-row zero-box table and the 11-row picker table
each exist cell-for-cell and assert the stated outcome. The design values were checked against `DESIGN.md`
§The merged ramp and DG-46-2 — seven states plus the `unknown` fallback, every label/dot/motion/reads token
and all five hex literals matching, none invented, none dropped.

**The suite grew 189 → 227 across review, and every addition came from a mutation that survived:**

| survivor found | consequence had it shipped |
|---|---|
| `headerModel(!policy.inputEnabled)` | a pane whose input is off for a non-posture reason wears the `read-only` pill — DESIGN calls the mirror of this "a GAP of the highest severity in this milestone" |
| a stale `socket-open` returning `state(value.state)` | an `exited (137)` pane silently becomes `stream ended`; an `error` pane loses the cause line |
| non-boolean `readOnly` read as interactive | **a mount that says `readOnly: "yes"` is typeable** — with two call sites about to mount this control |
| absent mount read as interactive | the fail-safe default for a forgotten argument was unguarded |
| the `https:`-only ternary | a `wss://` origin **silently downgraded to plaintext `ws://`** |
| the motion class home emptied | 46/04 hand-maps `"pulse"` — a second home for a DESIGN fact |

All six are now killed. Read-only is fail-safe by construction: only a **boolean** `readOnly` is
authoritative, and a malformed declaration reads read-only rather than interactive.

**The gate-registration correction.** Both whole-tree gates were initially parked whole, withholding five
clauses that pass today. Corrected: each gate is split into a registered `*.test.mjs` (green now) and a
parked `*.mjs` (red until the duplicate dies), sharing **one** detector home
(`test/support/terminal-gate-detectors.mjs`). The registered halves kill all six plants ADR-001/004/005
name — including `import type { RefObject } from "react"` in a `.d.mts`, which dies only because the sweep
was widened to read declaration files. Independently re-run by the orchestrator: registration ratchet
**2/2 with its baseline untouched**, origin-not-port 3/3, control-boundary 2/2, vibeyard attribution 9/9.

### 46/04 · one-control-both-call-sites — `in-review` (`@uat` + `@manual` outstanding)

**The duplicate is deleted.** `ui/src/board/TerminalDock.tsx` (466) and `ui/src/fleet/terminal-view/FleetTerminalView.tsx`
(446) are gone in the same diff that replaces them with one `ui/src/terminal/TerminalControl.tsx`. Verified
at source by the orchestrator: neither path exists. Subtree 1,366 → 1,123 lines.

| lane | evidence |
|---|---|
| task 00 one-control-renders-both-sources | **20/20** |
| task 01 collapse-keeps-the-session | **28/28** |
| task 02 the-duplicate-is-deleted | **27/27** |
| task 03 the-unavailable-pane | **10/10** |
| task 04 the-two-terminals-agree | **`@uat` — human, not signed** |
| whole-story re-run after review fixes | **537 passed / 0 failed across 42 suites** |

**Invariant 4 (the fleet page wires no input source) — the milestone's highest-risk claim, and it took
four plants to make honest.** Plants 1-2 (a new `ui/src/fleet/*.mjs` wiring `onData`+`socket.send`; the
fleet mount declaring `POSTURE_INTERACTIVE`) went red. **Plant 3** —
`mountPosture(assignment?.posture ?? POSTURE_READ_ONLY)`, with no `interactive` literal anywhere — **slipped
the structural sweep entirely**, caught only behaviourally. **Plant 4**, found at structural review, was
worse: at the *call site*, `mount={{ ...fleetTerminalMount(…), posture: { readOnly: !!0 } }}` left **every
gate green** while the fleet card measurably became `inputEnabled: true`, `disableStdin: false`,
`readOnlyLabel: null`, cursor blinking — both remaining posture signals gone. The final gate abandons
spelling-matching for authorship: **`posture:` has exactly one author under `ui/src/fleet/**`, and the JSX
prop must be a bare `fleetTerminalMount(` call.** Plants A, B and B2 (the same spread with *no* posture key)
all red.

**A sixth `fleet → board` edge was added and removed.** `terminal-mount.d.mts` imported the mount type from
`../board/dock-mount.mjs` — the exact alternative ADR-001 rejected in writing (*"A sixth would be added by
the one milestone chartered to reduce coupling"*), and **invisible to `aof graph impact` because it is
type-only**. Now one home at `ui/src/terminal/mount.d.mts`; verified at source that no `../board/dock-mount`
import remains under `ui/src/fleet/`. TECH_DEBT 18(a) gained its first gate in three milestones: a
shrink-only baseline of the five surviving specifiers, `.d.mts` included.

**Behavioural strength: a 71-mutant battery** — 61 killed by the story's suites, 4 by 46/03's core, 1 by an
arch gate, **9 survivors, all fixed.** The two that were live risks rather than missing assertions: Restart
was offered on a dead worker **mirror** (one boolean kept it off, and the button re-dials a tuple-bound
socket it can never re-spawn), and the m35-chip terminal-ness derivation could regress to the
hand-maintained `{done, failed, reclaimed}` set that **leaked `withdrawn` and `stale`** — stranding those
cards on "waiting for output" forever — with all 85 tests still green.

### 46/05 · dock-shell-host — `in-review` (`@uat` + `@manual` outstanding)

| lane | evidence |
|---|---|
| task 00 the-dock-is-contributed-to-the-overlay-region | **6/6** |
| task 01 the-dock-inset-is-published | **27/27** (8 inset rows, 10 clamp rows, 6 default rows) |
| task 02 fullscreen-adopts-the-live-node `@executable` | **9/9** |
| task 02 `@manual` ×4 | **deferred** — need a deployed build and a real PTY |
| task 03 an-open-dock-covers-nothing | **`@uat` — human, not signed** |
| whole-story re-run after review fixes | **471 behavioural assertions / 0 failed** |

**The gate ADR-005's `fixed inset-0` prohibition never had — and the vacuity was measured, not argued.**
m45 carried `FleetTerminalView.tsx` as the one live violation on a shrink-only exemption granted *because
m46 deletes that file*. 46/04 deleted it, so `acd-shell-z-ladder-single-home` went green **while the shape
survived under a new name** in `TerminalControl.tsx`. Proof: planting `fixed inset-0` **without** `z-50`
left that gate **3/3 GREEN** with the prohibited shape sitting in the file.

The first version of the new gate was itself defective, and both defects were found by attacking it:
**nine spellings slipped** (`inset-x-0`+`inset-y-0`, `inset-[0px]`, `[inset:0px]`, a `style` object, four
long-form offsets, `h-screen`+`w-screen`, an aliased portal target, `getElementById`), and its portal clause
**did not fire on the real historical violation** — a 1,593-character span against a 400-character window,
i.e. calibrated to its own synthesized plant rather than to a diff. And the exemption list's "empty,
shrink-only, barred reasoning" was **prose**: a one-line exemption carrying *verbatim the barred reason*
waved a live violation through, 3/3 green. Both closed — extent is now a set over two axes, the window is
gone, `assert.equal(FIXED_OVERLAY_EXEMPTIONS.size, 0)` is mechanical, and **the real deleted violation is
committed as a fixture** (`test/fixtures/fleet-terminal-view-fullscreen-portal.txt`) with `span > 1000`
asserted so a trimmed fixture loses calibration loudly.

**Two live defects found by review, not by the build.** (1) Deleting both `--aof-shell-dock-inset` writes
from `Shell.tsx` left **all 42 tests green** while the content region stopped shrinking — DG-46-1 fully
regressed, the operator's action strip back under the dock. The harness even exposed a `dockInset()`
accessor **no test ever called**. Now asserted before and after the present, with the deletion proved red.
(2) The keyboard nudge started from stored `height` while the pointer started from rendered `dockHeight`, so
after any window resize or notice appearing **the first ArrowDown did nothing**, and `aria-valuenow` was not
the value the next keypress acted on. Fixed structurally — the drag handle reports a delta and one
`resizeBy` is the only place a height is computed, so the two inputs cannot diverge.

**A bug found in flight, and verified in a real browser.** `readContentBoxHeight` read
`--aof-shell-chrome-height` off `document.documentElement` while the shell publishes it on a descendant;
custom properties inherit *downward*, so the read returned `""` and every clamp silently degraded to the
viewport — the precise defect the function is named for. QA reproduced it in headless Chromium
(`rawOnDocumentElement: ""` vs `rawOnDockSection: "48px"`, and inheritance confirmed to survive
`position:fixed`) and measured the composed geometry exactly: **content 377 + dock 280 + chrome 48 = 705 =
viewport**, so nothing is covered and no gap opens.

**A ratchet that fired on its own author:** the new "any `ui/src` file over 800 lines must carry a `BUDGETS`
entry" clause tripped on `TerminalControl.tsx` at 859 lines during the same pass — and the developer
**extracted rather than raised the ceiling** (809 now).

## Fitness functions

Re-run by the orchestrator at the phase gate, isolated and focused:

| gate | result |
|---|---|
| `acd-test-suite-registration` | **2/2**, baseline unchanged (no entry added) |
| `acd-terminal-origin-not-port` (registered half) | **3/3** |
| `acd-terminal-control-boundary` (registered half) | **2/2** |
| `acd-vibeyard-attribution` | **9/9** (the moved MIT-headered file is now guarded) |
| `acd-fleet-terminal-input-constrained` | 6/6 — **invariant 4 intact and non-vacuous** |
| `acd-board-server-no-fleet-import` | 6/6 (new) |
| `acd-terminal-mirror-geometry-pinned` | 2/2 (new — closes a hole where a named test file had never existed) |
| `acd-terminal-server-only` | 3/3 (node-pty never reaches `ui/src/`) |

**Parked and red BY DESIGN — 3 cases:** the whole-tree halves of `acd-terminal-origin-not-port` (1) and
`acd-terminal-control-boundary` (2). Each is red for its stated reason only — every offender is inside
46/04's declared deletion set — and QA confirmed none is red for an unrelated reason, so 46/04 inherits no
trap.

## The whole fitness estate, re-run by the orchestrator at the close

Not a focused subset — **every** `test/arch/**` suite, run independently of any story's report, isolated
(`AOF_GLOBAL_HOME`), on the final tree:

```
arch files=256   assertions=861   pass=859   FAIL=2
  RED acd-bundle-manifest-hashes.test.mjs :: manifest hash for .claude/commands/aof/autonomous.md
  RED acd-no-new-silent-catch.test.mjs    :: NEW silent catch site(s) introduced
```

**Both reproduce on a pristine `git archive HEAD` checkout. This milestone's diff adds no red.**

**This sweep is itself a finding.** No story ran it — every story ran focused suites, which is the correct
local discipline — so a gate broken by story 46/02's `MESH_UI_HOST` constant extraction
(`acd-mesh-ui-single-server`, which matched the `"127.0.0.1"` literal that 46/02 correctly gave a single
home) sat **red in the working tree and green at HEAD** through three subsequent stories, and was found only
at 46/05's structural review. It is fixed — the detector now finds the constant, asserts its value, and
asserts `listen` uses that identifier, so a constant nothing passes to `listen` also fails. **The lesson is
the schedule, not the gate:** a milestone needs one whole-estate sweep before it accepts, because a
refactor in story N breaks a detector belonging to nobody.

## Two — no, THREE — suites are RED at HEAD, and this milestone did not cause them

Stated plainly because "the suite is green" is not currently a claim anyone in this repo can make, and it
would be dishonest for this milestone to imply otherwise. Both were confirmed against **pristine HEAD**,
not against the working tree, and are ledgered as [TECH_DEBT 27](../../TECH_DEBT.md):

- `acd-no-new-silent-catch` — `board-worker-stream.mjs: 1 silent catch site(s), baseline 0`, committed at
  `eacbd57`. Both the flagged file and the gate are unmodified by this milestone. **A shrink-only ratchet
  that is itself red has stopped ratcheting.**
- `test/mesh-terminal-input-path.test.mjs:471` — `TypeError: completionResolve is not a function`,
  reproduced 3/3 in a `git archive HEAD` tree containing none of milestone 46.

## Design conformance — **INCONCLUSIVE**, and that is the honest verdict

The operator's mocks landed mid-milestone and are committed
([`mocks/Terminal Panel Spec.dc.html`](mocks/Terminal%20Panel%20Spec.dc.html)); the designer's
[`mocks/CONFORMANCE.md`](mocks/CONFORMANCE.md) is the binding baseline — 18 confirmations, 11 overrides.

**No render was taken, so no `CONFORMS`/`GAPS` verdict is claimed.** A verdict needs a base URL serving
*this* build. `work.ui.baseUrl` is unset; the live fleet on `:4181` runs the **old payload**, so a render
against it would show code that is not in this tree — worse than no render, because it would read as a
conformance pass. Reading the component source and calling it `CONFORMS` is explicitly forbidden, and was
not done.

**To make it conclusive:** `node scripts/install-local.mjs`, restart the desktop app, then render each
DESIGN surface at 390 / 768 / 1280 and hand the screenshots to `aof-designer` to judge against
`CONFORMANCE.md`. That is one operator action; it also unblocks every `@manual` lane below.

**UNBLOCKED 2026-08-09 (late).** The payload is deployed and a live board dock now reaches `streaming` with
a real `claude` TUI in the pane, so the render set is finally takeable — that was the one thing missing, and
it was missing for two reasons rather than one (the entry-state blocker AND [TECH_DEBT 30](../../TECH_DEBT.md)'s
destroyed `node-pty`). **S1 and S3 are reachable now at every documented width and every state a local PTY
can produce.** **S2 still is not:** the fleet card peek needs a `mirror`, which needs a live assignment on a
worker — a real dispatch, and the operator's call to authorise. The S2 renders and defect 2's live
confirmation travel together.

**Three accessibility findings are already conclusive without a render, because they are measurements:**
`streaming`'s word at 3.29:1 (**fixed**, now 9.06:1); the `unavailable` **recovery line** — the command the
operator must type — at 3.98:1 (**fixed**, now 7.50:1, and this one **deviates from the operator's
committed mock**); and the `provider:` / `item` field labels at 3.72:1 (**not fixed** — decoration, and the
change ripples through the chrome; operator's call).

## The blocker is CLOSED on the running system — 2026-08-09, driven in a real browser

The fix (`terminalEntryState`, [state-ramp.mjs:221](../../../../ui/src/terminal/state-ramp.mjs#L221)) was
green in a suite but had never been seen alive. It has now been driven end-to-end against the deployed
payload, board dock, `local-pty`, at `http://127.0.0.1:58633`:

| observable | before (2026-08-09 blocker) | now |
|---|---|---|
| `Network.webSocketCreated` | **0 over 21s** | **1** — `ws://…/ws/terminal?ref=46%2F01&provider=claude` at t+9.7s |
| `.xterm` node mounted | never | **1** |
| pane copy | `No session. Press Run agent on an item.` — a lie on a bound session | gone |
| state chip | `idle`, forever | `connecting` → **`streaming`** |
| bytes | none | **2,200 received**, 3 frames sent, a live `claude` TUI painting into the pane |

**And the far end was healthy the whole time, which is how the SECOND defect was found.** The first live
run reached `error` rather than `streaming`, rendering the far end's refusal exactly as DESIGN says it
should: `claude CLI failed to start: Cannot find module 'node-pty'`. That is
[TECH_DEBT 30](../../TECH_DEBT.md) — the deploy's lock tolerance had **destroyed** the payload's `node-pty`
(no `package.json`, no `lib/`) while reporting that it had kept it. It is not milestone 46's code, but it
stood between this milestone and every outstanding `@manual` and `@uat` lane, and it is fixed: the copy is
now file-by-file, so a locked `.node` costs that file and never the module. Verified at the source —
`require.resolve('node-pty')` from `~/.aof/bin` resolves and `pty.spawn` is a function.

**The control was never at fault in that run, and saying so is the point:** it opened its socket, reached
the server, and rendered a true refusal. The ramp did its job over a broken machine.

## Three UI defects found live, fixed, and re-measured live

All three lived in the `.tsx` seam [TECH_DEBT 29](../../TECH_DEBT.md) names. Every number is a measurement.

| # | defect, as measured | fix | re-measured |
|---|---|---|---|
| 1 | **the dock could not be closed at 390** — header `scrollWidth 451` vs `clientWidth 390`, putting `✕ Close terminal dock` at `x 423–451` in a 390-wide frame; identity collapsed to **width 0** under `provider:` | C1's yield keyed to the header's own width (`@container`), dropping the `TERMINAL` word and the muted field labels | `scrollWidth 390 = clientWidth 390`, **close inside the frame**, every part disjoint (`27 < 41`, `71 < 85`, `161 < 175`, `238 < 282`), identity **30px** |
| 2 | **S2 yielded the wrong thing first** — the drops were `sm:`/`md:`, i.e. questions about the WINDOW, so a ~395px fleet card inside a 1280 viewport kept the whole `· session <id>` tail and truncated the **ref** instead: CONFORMANCE **C13 exactly inverted** | same container-keying; thresholds ordered tail (`@xl`) → word (`@lg`) → field labels (`@md`) | emitted CSS carries all three (`@container (min-width:28rem/32rem/36rem)`); the 390 dock drops them in order. **Live confirmation on a real fleet card is owed with the S2 renders** — it needs a mirror session |
| 3 | **the fullscreen exit shipped at 17×28** — "then the ONLY exit" by its own component's comment, because an interactive occupant claims `Escape`. `h-7 w-7` is a flex BASIS, the first thing flexbox takes, and the occupant renders its exit as a direct child of a `flex-nowrap` header where the inline header's `shrink-0` wrapper does not reach | `shrink-0` moved into `CONTROL_CLASS` — the one home every control's form comes from | **28×28** at both 1280 and 390, inside the frame |

**A fourth defect was found while fixing the third, by reasoning the fix through rather than by testing it:**
the occupant is **portaled into a node the shell owns**, so it inherits no container from the header it
expanded out of — and a container query with no container ancestor never matches. Without its own
`@container` the biggest box on screen would have rendered the **most yielded** header, permanently. It
carries one now, and the live 1280 fullscreen render shows the full identity (`▣ TERMINAL` 79px, `item 46/01`
60px, `provider: claude` 139px) which is the proof it resolves.

**The ratchet fired on this pass too, and the ceiling was not raised.** `acd-ui-surface-file-budget` tripped
at `TerminalControl.tsx` 863 vs its 840 ceiling — the file was sitting exactly at its limit. Following
46/05's own precedent, the author extracted: C1's identity fragment became
[`TerminalIdentity.tsx`](../../../../ui/src/terminal/TerminalIdentity.tsx) (a real seam — it already had two
consumers, the inline header and the fullscreen occupant, and was already being passed as a value), leaving
the control at **814**. No explanation was deleted to fit under a number (ADR-014/E3).

### Regression coverage, and its own non-vacuity

[`test/terminal-control-header-yield.test.mjs`](../../../../test/terminal-control-header-yield.test.mjs) — 6
lanes, mounting the REAL component through `withTerminalControl`, registered in `scripts/test.mjs`. It
asserts the DECLARATION that decides the layout, and says so in its header: there is no layout engine behind
the harness, so "does it overflow at 390" is not asked there and stays `@manual` browser evidence.

**Five plants, one fresh process each, plus a control run:**

| plant | lanes red |
|---|---|
| A · the word keyed back to the viewport (`@lg:inline` → `md:inline`) | 01, 02 |
| B · the header loses `@container` — every drop goes inert | 00 |
| C · `shrink-0` removed from `CONTROL_CLASS` — the 17×28 door returns | 04 |
| D · the occupant loses its own container | 05 |
| E · the yield ORDER inverted | 02 |
| Z · **control, no plant** | **none — green** |

**The first version of this battery was wrong, and the way it was wrong is the finding.** Run in ONE process,
`palette.mjs` stayed cached with plant A's value, so lanes 01/02 read red for every subsequent plant —
including plant C, which cannot affect them. It "killed" plants it had never actually tested. Same class as
46/02's import-cycle masking: **in-process is answered from the cache that does the masking.** One fresh
process per plant is the fix, and the giveaway was a red pattern that did not match the plant.

## Design conformance — the render set exists, and judging it found a fourth live defect

`aof-designer` judged 12 renders of the deployed build (S1 at 390/768/1280 × waiting/streaming/ended,
S3 at each width) against `mocks/CONFORMANCE.md`. Verdict on the first pass: **GAPS — three, none
blocking.** All three are now actioned, and the two items the designer declined to judge from a raster
were settled by **computed style rather than by squinting**, which is how one of them turned out to be
the most serious finding of the pass.

| # | finding | outcome |
|---|---|---|
| **G1** | the **fullscreen overlay carried the dock's provider picker**, against §2·S3's *"no restart, no chevron, no close, no picker"* | **fixed.** `host-model.mjs` **already** said so — `[HOST_FULLSCREEN][AFFORDANCE_PROVIDER_PICKER] = notDeclared(…)`. The identity fragment was built once against the OPENER's host and handed to the occupant verbatim, so the JSX never asked. **The declaration was right and the seam ignored it — the blocker's exact shape, one seam over.** No new rule was invented; an existing one was made load-bearing |
| **G2** | `streaming` chip over a completely empty pane — *"either the ramp reports `streaming` before the first byte, or xterm had not painted"*, and the first reading would have been a blocker | **not a defect — measured.** chip `connecting…` at 14ms/0 bytes → socket 39ms → **first byte 163ms** → chip `streaming` at **273ms**. The chip never precedes a byte. The agent clears the screen before painting, and my shot fired at 2500ms, inside that window. **A capture-timing artefact that read exactly like a product lie** |
| **G3** | the provider segment rendered `Claude`, title-cased in the sans face; the mock's copy string is `claude`, 11px **mono** | **fixed** — `capitalize` → `mono`. Machine-read at all three widths: the checked segment's text is now exactly `claude` |
| §5·1 | *"is the 8px byte-box gutter present?"* — declined, inside raster reading error | **not a gap.** The framed box measures `x=8, w=1264` in a 1280 frame; the gutter is there. (The first probe read the inner pane host, not the framed wrapper) |
| §5·2 | *"does the fullscreen pane actually RE-FIT its rows, or sit unfitted in a taller box?"* — declined, because unpainted rows and empty background are the same colour | **A REAL DEFECT, and it was in the milestone's headline feature** — see below |

### S3 adopted the live node and never re-fitted it

**Measured before:** the overlay's byte box grew to **1264×739** while the terminal screen stayed
**1246×210 at 15 rows — identical to the dock**. That is **529px of dead black under a `local-pty`**,
which is a *fit* source, and DESIGN §Fit vs scale defines a fit source as the one that has no band.
"Fullscreen is a bigger BOX" delivered a bigger box around the same 15 lines.

**Cause.** The two halves of "a bigger box" live in different effects and only one ran on the
transition: `relayout` stretched the pane **element** to the new box, while `fitAddon.fit()` was driven
by a `ResizeObserver` watching the **inline** host — whose box does not change when the overlay
presents, because the dock is still sitting there at its own size underneath. The relayout effect's own
comment already promised the behaviour — *"a `fit` source re-fits (more rows and columns, glyphs
unchanged)"* — and **nothing called it.** A comment describing an intention the code did not carry out.

**Fixed and measured after: 15 rows → 52, 210px → 728px** in the 739px box, with the resize frame
emitted so the far end repaints into the new rows rather than the operator getting a bigger window onto
the same fifteen lines. Regression lane 07 asserts the FIT branch asks for the re-fit, because the
defect is a **missing call** — the class of absence ADR-001 says no reviewer reliably notices.

**Why no gate caught it, and it is the same lesson twice in one milestone.** `46/05`'s
`terminal-fullscreen-adopts-live-node` suite is 9/9 green and asserts exactly what it says: the node is
**adopted** — one instance, one socket, no re-subscribe. Adoption is not re-fitting. The suite was right
about its own subject and the gap was between two subjects nobody owned.

**The ratchet fired twice more in this pass and the ceiling was never raised.** `TerminalControl.tsx`
hit 863 and then 853 against its 840 limit; C1's identity fragment became
[`TerminalIdentity.tsx`](../../../../ui/src/terminal/TerminalIdentity.tsx) and the control cluster became
[`TerminalControls.tsx`](../../../../ui/src/terminal/TerminalControls.tsx). Both are real seams — the
identity already had two consumers, and the cluster is the one place the host's affordance table is
asked. The control sits at **823**.

**The evidence hole the designer found in my own harness.** All nine S1 rows recorded `"chip": ""` —
the selector matched an empty shell announcer rather than the chip inside the terminal header, so the
machine-readable evidence for the most-checked string in the baseline was blank, and **G2 turned on
exactly that field**. Fixed: the index now records the chip, the bar, the checked provider segment and
a painted-glyph count. *A render set is evidence only for what it actually captured.*

### The re-judge: G1 and G3 closed, and a fifth defect my own verification had missed

`aof-designer` re-judged the re-captured set. **G1 and G3 confirmed closed in the pixels; S3 matches
§2·S3 exactly** (`▣ TERMINAL · item 46/01 · ● streaming · ml-auto` exit — no restart, no chevron, no
close, no picker), and the fullscreen composition reads right now that the pane fills the box. It also
confirmed live what no earlier render could: **`connecting` and `waiting` are visibly distinct** (chip
`connecting…` + filled `bg-secondary` dot vs chip `waiting for output` + muted dot with the pane's own
`connected · waiting for first output`), which DESIGN demands and nothing had yet demonstrated; and
**O5's dimming** (49 dimmed glyphs under an opaque `exited (0)` bar).

**G4 — the owner ref TRUNCATES at 390, and it is my verification that was wrong, not just the code.**
The renders show `46…` on `waiting` and `46/_` on `ended`. After step 3 the header was still ~10px
short, and the identity's `min-w-0 truncate` was the only element left that could give — so **CSS acted
as an unowned step 4 and ate the one element DESIGN's yield order names as never dropped.** I had
measured 390 in `streaming` only and reported the header fixed. `streaming` is the *narrowest* state:
`waiting` carries the ramp's longest word and `ended` gains the `↻` control. **One sample of a state
space, generalised to the space.**

Fixed per the designer's ruling, in two halves that make the rule hold by construction:

- **Step 4 is the header's own chrome, never its content** — gaps `14px → 8px` and side padding
  `16px → 8px` at the narrow container step, recovering ~40px against a ~10px shortfall. Mock-sanctioned
  rather than invented: the committed mock's own 390 sample tightens S2's header to `gap:8px 10px`.
- **The identity is no longer the resolver on S1.** `truncate` now belongs only to the far-end identity
  (`46/02 → aof-wsl · session 7f3a91c`), which is long, variable, and whose TAIL is the authorised
  drop. A local PTY's identity is the bare ref — short, fixed, never-dropped — so truncating it is not
  degradation but corruption of a name. With nothing left to silently shrink, an overflow that survives
  all four steps now surfaces as a visible layout bug instead of a silent lie.

**Re-verified across the whole state space, not one sample.** Every word the ramp can put in the chip,
driven through the live C1 at 390:

```
ok  streaming          overflow=0  ref="46/01" truncated=false
ok  connecting…        overflow=0  ref="46/01" truncated=false
ok  stream ended       overflow=0  ref="46/01" truncated=false
ok  exited (0)         overflow=0  ref="46/01" truncated=false
ok  exited (137)       overflow=0  ref="46/01" truncated=false
ok  disconnected       overflow=0  ref="46/01" truncated=false
ok  waiting for output overflow=0  ref="46/01" truncated=false   ← the state that was broken
ok  no live output     overflow=0  ref="46/01" truncated=false
```

`waiting`'s live window is ~124ms, so it is not reliably screenshot-able; substituting each word into
the live header measures the same layout **deterministically** instead of racing it.

**G5 — `connecting` painted its own chip word into the pane; DESIGN fixes that state as "C2 empty".**
Ruled and fixed: only `waiting` carries a top-left line, because its line says what the chip cannot
(the socket IS open and the far end is silent), while `connecting`'s merely echoed. **The pane
TREATMENT is untouched** — `connecting` stays `PANE_BYTES`, so the host div carrying the ref still
renders; withholding *that* is the whole of the 2026-08-09 blocker. This withholds one line. No locked
`.feature` covers it: 46/03's contract fixes `connecting`'s label, dot, motion and reads and is silent
on the pane, and DESIGN §S1's own words are "C2 empty". A lane in the blocker suite had asserted the
old behaviour incidentally and now asserts the new rule, with `waiting` as its non-vacuity counterpart.

## DG-46-1 failed at 760×520 — an open dock covered all three actions on the operator's own window. Found, diagnosed and FIXED

**This is a blocking finding against `46/05` task 03, found by hit-testing rather than by looking.**
The gate's claim is *"every control the operator can still act on is reachable"*, which is a
reachability question — so each control's centre is put through `document.elementFromPoint` and the
answer compared to the control. A screenshot cannot settle this: a half-covered button still looks like
a button.

| viewport | dock condition | `+ Add feedback` · `✓ Validate` · `→ Next` |
|---|---|---|
| 1280×800 | closed / default 280 / **max 376** / collapsed / after-exit | **all reachable** ✓ |
| 760×520 | closed | reachable ✓ |
| 760×520 | **default (216)** | **all three COVERED** — hit test returns `interactive terminal for 46/01` |
| 760×520 | **max (216)** | **all three COVERED** |
| 760×520 | collapsed (53) | reachable ✓ |
| 760×520 | **after exiting fullscreen** | **all three COVERED** |

**The mechanism, measured — and the inset is NOT the culprit.**

```
--aof-shell-dock-inset : 216px            ← published, correctly
content region         : y88..520, h=432  ← the FULL content box; it never gave up the 216
dock                   : y304..520
→ Next                 : y400..434        ← 96px inside the dock's band
```

The inset machinery works: collapsing the dock to 53px moves the strip up by **exactly 53px**. But at
the default height the strip rises only **70px against a 216px dock** — the board's own layout
compresses to a floor and then stops. And the content region is `overflow: hidden` with
`scrollHeight === clientHeight`, so the operator cannot scroll to what has been pushed under it either.
It is simply unreachable.

**Why 46/05's own suite is green and right.** `shell-dock-inset-and-clamp` (29/29) asserts that the
inset is *published* and that the clamp is `min(280, floor(box/2))` — both true here: 216 is published
and 216 is the clamp. **What nothing asserts is that the board's content actually FITS in the box the
clamp leaves it.** The clamp guarantees the dock takes at most half; nothing guarantees the other half
is enough. At 1280×800 half is 376px and the board fits; at 760×520 half is 216px and it does not.

**Why R-B still passes and both facts are true.** The dock's own geometry is correct at 760×520 — it
opens at the clamped 216, not 280, and its bottom is exactly the viewport. The dock is behaving; the
*composition* is not. Two different claims, and only the second one fails.

**THE DOCK WAS INNOCENT, and finding that out is what made the fix one line.** Walking the ancestor
chain with the dock closed and then open shows every level doing exactly what it promised:

```
  Δ    closed  open   flex        overflow  element
-216     432    216   0 1 auto    hidden    div.flex h-full min-h-0 flex-col bg-card   ← the panel gave up EXACTLY 216
```

The panel consumed the whole inset. The overflow is one level further in — its own children:

```
panel h=216, children total 362 (overflow 146)
  228px  shrink-0 border-b p-4          ← the header block, alone LARGER than the whole panel
   35px  tabs (shrink-0)
   32px  min-h-0 flex-1 overflow-y-auto ← the body had already compressed to 32; it could give no more
   67px  shrink-0 border-t p-4          ← the ACTION STRIP, pushed to y383..450 — outside the panel
```

At 760px wide the item's title wraps to four lines, so a `shrink-0` header consumed 228px of a 216px
panel and shoved everything after it out of the box. The scroll body was already doing its job at 32px.
**Nothing in the terminal, the dock, the inset or the clamp was wrong.**

**Fixed at [`DetailPanel.tsx:191`](../../../../ui/src/board/DetailPanel.tsx#L191):** the header block is no
longer `shrink-0` — it shrinks and scrolls its own overflow, so the item's CONTEXT yields when the
window is small and the ACTIONS survive. That order is not a preference; it is DG-46-1's entire claim.

**Re-verified by hit test at both viewports, in every dock condition** — closed, default, dragged to
max, collapsed, and after exiting fullscreen: **all three controls reachable, 12/12.** The 1280×800 set
is unchanged, so the fix costs the wide case nothing.

**The lesson is where the evidence pointed.** Three green suites, a passing R-B clamp measurement and a
screenshot all agreed the dock was correct — and they were all right. The defect was in the *composition*,
which none of them measured, and it was invisible to the eye at the only viewport anyone had looked at.
It surfaced only because the gate's claim ("every control … is reachable") was tested as a **hit test**
rather than a look: `document.elementFromPoint` at each control's centre, compared to the control. A
half-covered button still looks like a button.

## The `@manual` lanes — 10 run and PASSED, 7 not run with their reason

Run against the deployed payload in a real browser, driven through CDP. Every lane's evidence is the
observable the scenario names, never a screenshot read by eye.

| lane | scenario | evidence |
|---|---|---|
| `46/00` | the drained resize reaches a real node-pty without wedging the session | rows **15 → 22** on a real drag; far end still answering (bytes 2,127 → 24,548); chip `streaming` |
| `04/00·a` | exactly one xterm and one socket per mounted control | xterm nodes **1**, sockets **1** (`ws://…/ws/terminal?ref=46%2F01&provider=claude`) |
| `04/00·b` | a keystroke reaches the far end and the answer paints back | bytes 24,548 → 24,782 and the typed marker is echoed into the pane |
| `04/00·c` | a non-live message never overprints the bytes — an opaque in-flow bar, paid for out of the byte area | bar `exited (0)`, `position: static`, background `#0f1629`, **overlaps the glyph area: false** |
| `04/01·a` | collapsing keeps the session alive | still **1** socket (no new one), **0** closes, scrollback 1,069 → 1,069 glyphs |
| `04/01·b` | closing the dock ends the session and leaves nothing behind | after `✕`: xterm nodes **0**, dock gone, **1** socket close observed |
| `05/02·a` | present and dismiss move the SAME instance, socket and scrollback | presenting opened **no** new socket, one xterm, scrollback intact, rows re-fitted 15 → **52** |
| `05/02·b` | on dismissal focus returns to the control that opened it | `document.activeElement` = **`Expand terminal to full screen`** |
| `05/02·c` | every exit from fullscreen leaves the session untouched | sockets unchanged, no closes, scrollback intact |
| `05/02·d` | a session does NOT survive navigation between surfaces | board → fleet → board leaves no terminal and no dock claiming a session it lost |

**Not run, each with its reason — never counted as a pass:** four lanes need a live worker `mirror`
(blocked by the mesh clone-credential frame bug, [TECH_DEBT 31](../../TECH_DEBT.md)'s neighbour — the frame
arrives with `workspace (none)` although the worker holds both the clone and the descriptor); `04/03`
needs the forced `unavailable` fixture the contract itself names, which m46 has no producer for;
`04/00·e` (an unbound open dock) has **no route in the product** — every door binds a session first,
which is worth recording as a finding about the scenario rather than the build; and `04/00·f` needs an
ended session presented fullscreen, where the exit path tears the pane down first.

### Running them found a third instance of one defect, and it is the sharpest of the three

`04/00·c` failed the first time, and the mechanism was already familiar: **the box changed and the
terminal never re-fitted.**

```
byte-area host shrank by exactly 29px = the bar's height   ← the "paid for out of C2" rule works
row count 15 → 15                                          ← no re-fit
.xterm-rows reached 789 while the bar's top was 763        ← 26px of the last row UNDER an opaque bar
host overflow: visible                                     ← not even clipped; it rendered behind it
```

The cause was one ordering: `if (ws.readyState !== WebSocket.OPEN) return;` sat **above**
`fitAddon.fit()`. Once a stream ends there is nobody to tell — so there was no re-fit either. But the
box keeps changing after a session ends, and **the very first thing that changes it is the session
ending**: the non-live bar appears and is paid for out of the byte area. Fitting the pane and telling
the far end are different acts. Fixed by making the fit unconditional and gating only the frame:
**rows 15 → 13, and the pane now ends 2px above the bar.**

**Three triggers, one rule, and only one of them ever worked.** The rule now lives in one place —
[`geometry.mjs`](../../../../ui/src/terminal/geometry.mjs)'s header, where fit-vs-scale is decided, rather
than in the React file that happens to call it: (1) the dock is dragged — the ResizeObserver, always
worked; (2) fullscreen presents — the box is the *overlay's*, which that observer cannot see; (3) the
bar appears — which *is* the session ending. Lanes 07 and 08 of
[`terminal-control-header-yield`](../../../../test/terminal-control-header-yield.test.mjs) hold (2) and (3).

**Both `@manual` failures were investigated before being believed, and one was mine.** `04/00·b` failed
because the harness searched the last 120 characters of the pane rather than all of it; `04/00·c`'s
first failure was real, but the *aggregate* run then failed it for a different reason — lane `04/00·b`
had left `AOFUATMARKER` in the agent's prompt, so `/exit` became `AOFUATMARKER/exit`, the session never
ended, and the lane judged a bar that was correctly absent. **A lane that fails because the previous
lane left state behind reports on the harness, not the product** — and it would have been trivially
easy to file either as a defect.

## The render set, and exactly which of DESIGN's targets it covers

Named per the gate's own rule — *"absent a render the review degrades to INCONCLUSIVE naming the
missing render — the surface, the origin, the breakpoint and the state"*.

| target | state |
|---|---|
| **R-C** · S1 @ 390, streaming | ✅ |
| **R-G** · S3 from S1 (local PTY, fitted) @ 390/768/1280 | ✅ — and it is where the re-fit defect was found |
| **R-B** · S1 @ 760×520 | ✅ — and its clamp measured: content box 432, max `floor(432/2)=216`, **default opens at 216, not the shipped 280** |
| **R-A** · S1 @ 1280 in nine states | ⚠️ **3 captured** (`waiting`, `streaming`, `exited (0)`), 6 not |
| 46/05 task 03's set (closed · default · max · collapsed · fullscreen, at 1280 and 760×520) | ✅ — hit-tested, 12/12 |
| **R-D**, **R-E**, **R-F** · all S2 | 🚫 every one needs a live worker `mirror` |

**The six R-A states that were not captured, each with its reason — none of them a judgement:**

- **`connecting`** — a **~40ms** window on this machine (chip `connecting…` at 14ms, socket at 39ms,
  first byte at 163ms). Three attempts to photograph it landed on `waiting for output`; a CDP
  screenshot round-trip is longer than the state. **It is evidenced by a sampled timeline instead of a
  frame**, and the two loading sub-cases are demonstrably distinct — different word, different dot
  value, different pane — which is what DESIGN actually asks.
- **`error`** — no non-destructive route. Chrome's offline emulation does not tear down an
  already-established WebSocket, only one provider (`claude`) is offered so a missing-binary spawn
  cannot be forced, and the remaining route is killing the live board server, which is a process this
  session does not touch unbidden. *(It was seen once, incidentally and truthfully, when
  [TECH_DEBT 30](../../TECH_DEBT.md)'s destroyed `node-pty` made every spawn fail — the control rendered
  the far end's refusal exactly as DESIGN says it should.)*
- **`exited (N)`** — the dock spawns an agent, not a shell, so there is no way to ask the far end for a
  non-zero exit from the UI.
- **`stream ended`** (a close with no exit code) — same: every clean exit through the product reports
  a code.
- **`idle`** — **the product has no route to it.** Every door into the dock binds a session first;
  `viewTerminal` only re-reveals a dock that is already bound. The state is correct, reachable in the
  model, and unreachable in the UI — which is a finding about the SCENARIO rather than the build, and
  is why `04/00·e` is recorded as not run.
- **`unavailable`** — the locked scenario itself says it is *"rendered from a forced fixture"* because
  m46 has no producer. The fixture harness does not exist.

**This is what the gate means by naming the missing render rather than inferring one.** No verdict was
claimed for any state that was not photographed, and none was read off the component source.

## `@uat` — SIGNED BY THE OPERATOR, 2026-08-10, and what they actually exercised

Both gates were driven by the operator against the deployed payload (`d71d508+dirty.20260810T134943`)
on the running system, and accepted. **Recorded here with its real scope, because a sign-off is only
worth what it covered:**

- **Exercised and accepted:** the one-control read of the header; the board staying usable with a
  terminal open (DG-46-1's own claim); expand-to-fullscreen and back; the keyboard pass; close. In the
  operator's words, *"everything else looks fine"*.
- **Raised by the operator, and ruled by them:** the board's composition when the dock squeezes it at
  small windows is *"not what this milestone is about"* — logged as [TECH_DEBT 32](../../TECH_DEBT.md)
  rather than fixed here. The reachability half **is** fixed and gated; what remains is quality.
- **NOT exercised, and it is the honest limit of this sign-off:** everything on the fleet card (S2) —
  the peek's regions, its yield order, the `read-only` mark on a read-only host, and the mirror's
  scale. All of it needs a live worker `mirror`, which is blocked outside this milestone. **The
  `read-only` mark is the one DESIGN calls "a GAP of the highest severity in this milestone" if it is
  ever absent; it is asserted by 46/03's core and by the mount models, and it has not been seen by a
  human on a real fleet card.** That is carried, not waved.

## What this milestone ACCEPTS WITH, stated plainly rather than left as a checklist

- [x] **`@uat` — signed by the operator**, 2026-08-10, with the scope recorded above.
- [x] **`@manual` — 10 of 17 run and passed** against the deployed build. The other **7 are not run,
      each with a reason, and none is counted as a pass**: four need a live worker `mirror`, one needs
      the forced `unavailable` fixture the contract itself names, one (`04/00·f`) needs an ended
      session presented fullscreen, and one (`04/00·e`, the unbound dock) asks for a state **the
      product has no route to** — a finding about the scenario, carried to milestone 49 with the S2
      rows.
- [x] **Design conformance — GAPS, all actioned.** G1 and G3 fixed and confirmed in the pixels; G2 was
      disproved by measurement (the chip never precedes a byte); G4 and G5 fixed. The render set covers
      R-B, R-C, R-G and 46/05 task 03 in full, R-A in 3 of 9 states, and **none of R-D/R-E/R-F** — every
      missing render is named above rather than inferred.
- [x] **Accepting over one pre-existing red, and the reasoning is on the record.**
      `acd-bundle-manifest-hashes` is red at **HEAD** (a bundle re-stamp of
      `.claude/commands/aof/autonomous.md`), reproduces on a pristine `git archive HEAD` checkout, is
      outside every story's surface, and is ledgered as [TECH_DEBT 27](../../TECH_DEBT.md). Regenerating a
      bundle stamp inside a terminal milestone is exactly the silent scope creep these reviews spent
      six stories refusing. **This milestone's diff adds no red**, which is the standard it held itself
      to throughout.
- [x] **Whole fitness estate, re-run at the close:** `arch files=256 assertions=861 pass=859 FAIL=2` —
      the two known HEAD reds, unchanged.

**The one thing a reader should not mistake:** this milestone is accepted on the board dock and the
fullscreen overlay, which were exercised end-to-end by machine and by a human. **The fleet card peek
was never seen alive by anyone**, because nothing in the mesh could produce a worker session while it
was being built. Its model is asserted by 227 core rows and its call site by a hardened invariant-4
gate; that is not the same as having watched it work.

## Three measurements a human reviewer must NOT be misled by

Carried here because the contracts are locked and these are instructions to a person:

1. **`46/04` task 04 line 137** says to measure the peek panel's **total** height as a constant `192px`.
   The total is **≈232px**; 192 is the byte-area column. **A reviewer following the line as written will
   fail a correct render.**
2. **`46/04` task 04 line 234** promises a *"roughly 250-300px"* letterbox band. At 1280×800 it is
   **≈93px**. The rule is right; the magnitude is wrong — derive it at review time.
3. **The likeliest false positive:** the mock never draws **S1 hosting a `mirror`**, which leaves a
   **≈916px empty band — 72% of the dock** (measured: 640×408 into a 1264×222 box scales to 0.544 → 348×222).
   It is correct by the min-ratio rule and is asserted as its own lane so the number was on the record
   before anyone met it. **Not a defect.**
4. Also not a defect: the third `unavailable` cause (`no fleet origin` / `aof mesh ui`) has **no fixture
   row** — the locked `@manual` scenario keeps its two Examples and the mock is silent. It is structurally
   impossible on S2. Its absence from any render is expected.
