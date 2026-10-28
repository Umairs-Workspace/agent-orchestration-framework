---
doc: verification
---
# 172 · Excalidraw phase 3 — Verification

Opened at refine (2026-10-27) to carry the fitness register for the two controls ARCHITECTURE.md
declares. Both land with story 00, and each records its red probe here when it does.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-17201 | `test/arch/diagrams/acd-architect-session-never-bypasses-permissions.test.mjs` | green (172/00, 2026-10-27) | fires on a planted `--dangerously-skip-permissions`, `--permission-mode bypassPermissions` in place of `--permission-prompts none`, a dropped `--allowedTools`, and `shell: true` |
| FF-17202 | `test/arch/diagrams/acd-diagram-review-session-one-home.test.mjs` | green (172/00, 2026-10-27) | fires on a planted invocation in `packages/diagrams-ui/src` and a planted tool list in an `apps/ui` `.tsx`; a comment naming both is not a spelling |

## Agent-run `@manual` evidence

### 172/00 task 03 — a real claude answers a diagram note through the headless session (2026-10-27)

Run by the developer on the Mac (darwin-x64) through `createConversations` with the VS Code
extension's bundled `claude` 2.1.304 (no `claude` on PATH there), launched `--model haiku --effort
low` to keep the paid run small, in the repo root, with `REVIEW_SESSION_TOOLS`. Test bed: a scratch
`172/ADR-002-conversation-stream.excalidraw` holding one box, `Events`, labelled "Events route", and
one open note `34fbc19537bcaa40` asking "What does this box do?". Both were removed after the run.

**Turn 1: the review invocation as a slash command.** Delivered as
`/aof:diagram-review 172 ADR-002-conversation-stream.excalidraw 34fbc19537bcaa40` (outcome `started`):

```
   5ms  session started · turn 34fbc19537bcaa40
4363ms  activity Bash  "d=$(mktemp -d) && … --action context"      (denied, see the turn-end)
6656ms  activity Bash  "mktemp -d"
8987ms  activity Write "/tmp/aof-diagram-review/ctx.json"
9274ms  activity Bash  "aof diagram scene … --action context"
16423ms activity Write "/tmp/aof-diagram-review/respond.json"
16764ms activity Bash  "aof diagram scene … --action respond"
20168ms first text delta, text streams to the end of the turn
22060ms turn-end done, denials: [Bash "d=$(mktemp -d) && printf … && aof diagram scene … --action context …"]
```

- The slash command works as a stream-json user message: the session ran the command's process.
- The scene command's `context` and `respond` actions ran in the turn. Afterwards the note read
  `answered`, and its thread held the architect's turn ("The selected box, **Events route**, is the
  board face's events endpoint for this diagram …").
- First-text latency: **20.2 s** from delivery (cold start). The text arrived only after the tool
  calls, at the end of the turn: the model answered with `respond` first and then wrote a summary
  that differed from the recorded answer. The `diagram-review` paragraph was conditional on "in a
  conversation", which the model cannot detect, so it was rewritten as an unconditional rule: write
  the answer as the reply first, then record exactly that text.

**Turn 2: a tool outside the list is denied in the turn, not prompted.** Delivered "Please run
`git status` with the Bash tool and tell me the current branch." (outcome `sent`, same session):

```
25197ms activity Bash "git -C … …"
27905ms turn-end done, denials: [Bash "git -C <repo> status && git -C <repo> branch --show-current"]
```

- The turn ended 5.8 s after delivery with no prompt to wait on. The architect answered without the
  tool ("The Bash call was denied because it needs approval, and this session has no way to grant
  that.").
- **The denial's shape on the stream:** the `result` line's `permission_denials` is an array of
  `{ tool_name, tool_use_id, tool_input }`; `tool_input` carries the tool's own input (Bash:
  `{ command, description }`). The `assistant` line still carries the `tool_use`, so a denied call
  shows as an activity first and is named again on the turn-end.
- Not denied: a bare `mktemp -d`, outside `Bash(aof diagram scene:*)`, ran in turn 1 with no denial,
  presumably Claude Code's own allowance for read-only or safe commands. `Write` is not path-scoped,
  so the architect wrote its input files under `/tmp`. Both are recorded as a finding (below).

### 172/01 task 01 — the panel is the one place a thread is read, in a real browser (2026-10-27)

`test/smoke/diagram-editor.smoke.mjs` (re-aimed at the panel in this story), run on the Mac against
the built UI with the installed Chrome: **68/68 checks passed**. The architect is stood in for by the
real CLI calls the review command makes. The dock's socket is answered by the smoke, which now says
it is ready the way claude's TUI does: paste mode on, then a drawn banner. Every 171 check that drove
the bar, the review list or the popover now drives the panel and passes. The story's own checks:

- **E5:** the n2 pin opened n2's thread at the top of the panel and collapsed the open "Whole
  diagram" thread. Nothing opened over the canvas (no dialog, no `[data-aof-note-thread]`).
- **E6:** with the panel collapsed, only the edge tab remained; the pin opened the panel on n2's
  thread.
- **E7:** after scrolling n2 out of view, "Show on canvas" selected it (the canvas offered its Ask
  action) and brought its pin back inside the visible canvas.
- **Asking at the selection:** the new thread opened at the top of the panel holding the question,
  and the dock was handed the ask's invocation.
- **E8 / E9:** the composer read "Ask the architect · about n2" with the box selected, and "· about
  the whole diagram" with nothing selected.
- **E10:** Save as note recorded the note and started no session (no terminal). Its thread opened
  and read "Waiting for the architect".
- **Gone from under the canvas:** no review list, no Add note bar, no thread popover.
- **E11 / E12:** the pending "Orders store" proposal was decided in the thread that asked for it,
  its card's left edge in the console's accent (resolved from the page). Decided proposals show
  "Accepted HH:MM" in place of their actions.
- **E13:** with the item set to `done`, the threads and proposals listed with no composer, no reply
  field and no Preview, Accept or Reject. The status was restored afterwards.
- **Console colours:** the answered pin and the open thread's border both computed to the console's
  teal, `rgb(19, 118, 109)`, not the SDK's purple.

### 172/01 task 02 — the panel, the canvas ask and a proposal read against the committed mocks (2026-10-27)

Screenshots from the same run, read against each surface's mock and DESIGN's binding checklist.

| surface | width | mock | reading |
|---|---|---|---|
| the panel with an answered thread open | 1280 | `mocks/conversation-ask.png` | **CONFORMS.** Regions in order: editor header; canvas, then the 380 px panel. Panel header "Architect", chip, collapse; tabs Conversations 2 · Proposals 1; open card first, with a `primary` border and ring, "Answered · 2 notes" and Show on canvas; "You" turns on `muted` bubbles, the architect's plain; reply field; collapsed card with subject, state and last turn on one line; composer at the foot with its label, field, Ask (primary), Save as note and the waiting line. The chip reads "Not started" (story 02 gives it a session). |
| the panel as a drawer | 768 | `mocks/conversation-streaming-768.png` | **CONFORMS** for the drawer: 340 px over the canvas's right edge (measured by the smoke), shadowed, under the editor header; the open thread and the composer as at 1280. The live turn (activity list, caret, "Answering" chip) is story 02's and not shown. |
| the canvas ask open on a box | 1280 | `mocks/conversation-ask.png` | **CONFORMS.** The field is just above the selection, with Ask and Cancel to its right and the one-line hint "Enter asks · Shift+Enter new line · Esc closes" under it; its border and ring are `primary` while focused; the panel beside it names the same selection. |
| a pending proposal in its thread | 1280 | `mocks/conversation-proposal.png` | **CONFORMS, one minor gap.** The architect's "Proposed: …" turn carries the card: `accent` left edge, summary at 600, changes line in `muted-foreground`, Preview, Accept (primary) and Reject; the thread reads "A proposal answers this"; decided proposals show their outcome. **Gap:** the changes line reads the counts ("1 changed") where the mock reads the change ("1 edge relabelled · nothing else changes"). |
| console colours inside the SDK's container | — | — | **CONFORMS:** the answered pin and the open thread's border compute to teal `rgb(19, 118, 109)`. |

### 172/02 task 02 — an answer is seen streaming into its thread, in a real browser (2026-10-27)

The same smoke, now served with the stand-in architect: `test/smoke/stand-in-architect.mjs`, launched
by the real `aof work ui` through `AOF_ARCHITECT_EXECUTABLE`. It speaks stream-json, streams its answer
in deltas and records it with the real `aof diagram scene --action respond`. No paid session ran.
**73/73 checks passed.** The dock checks are gone with the dock; what reached the server's session is
read from the stand-in's log.

- **E1:** the canvas ask posted its note, and the server's session received
  `/aof:diagram-review 07 ADR-002-scene.excalidraw <id>`. The new thread opened reading "Starting the
  architect…" with the chip at "Starting…". The live text read longer in a second screenshot taken
  500 ms after the first, and the chip read "Answering". No `.xterm` exists anywhere on the page.
- **E8:** once the stand-in recorded its answer, the live turn left: no caret, no activity list. The
  thread showed the recorded answer, and the pin read "the architect answered".
- **E4:** a reply in the same thread appeared as the operator's turn. The stand-in's second answer grew
  under it, at 768 with the panel as a drawer, then was replaced by its recorded turn.
- **E6:** Save as note recorded the note and handed the session nothing (its log is unchanged 1.5 s
  later).
- **E5:** a reply posted with no session running reached a freshly started session.

Readings against `mocks/conversation-streaming.png` (1280) and `mocks/conversation-streaming-768.png`
(768):

| surface | width | reading |
|---|---|---|
| the panel while the architect answers | 1280 | **CONFORMS, one minor gap.** The chip reads "Answering" on a `primary` tint; the open thread's state reads "Architect is answering… · 3 notes" in `primary`; the live turn reads "Architect · now", then its activity list (a tick per finished step), then the answer growing with a `primary` caret at its end; the thread's pin carries the 3 px `primary` halo. **Gap:** an activity step reads as the command it ran ("aof diagram scene … --action context") where the mock reads what it did ("Read the diagram as Mermaid"). |
| the drawer while the architect answers | 768 | **CONFORMS.** As at 1280, in the 340 px drawer. The thread follows the growing answer to its caret: the first run did not, because the window resize read as the operator scrolling up, and it was fixed (only an upward wheel, touch or key stops the follow). |

### 172/04 tasks 00 and 01 — F-171-03 measured in a real browser, and ruled out (2026-10-27)

`test/smoke/diagram-editor.smoke.mjs`'s new `right-click:` section, run on the Mac at `08e9f0a` plus
this story's diff, against the built UI in the installed Chrome. The device pixel ratio is 2, as the
operator's display drew it. The smoke serves a copy of 171's `ADR-003-push-stream.excalidraw` (36
elements: 3 frames, 7 boxes, 10 arrows, 16 labels), with its figure and its review records, so the
overlay draws the same pins it drew at 171's `@uat`. **80/80 checks passed.** Story 01's panel had
landed before this build, so every gesture was measured on the overhauled editor (E6). The 171 tree
the skew was seen on was not re-run.

Each gesture opens the diagram fresh and is measured on two levels:

- **The drawing.** The static canvas, which holds the drawing alone, is compared pixel by pixel
  before the gesture and after the menu closes. The selection outline and the menu paint elsewhere.
- **The scene.** Every arrow's position and points, and every label's container and position, are
  read from the SDK's live scene and compared with the saved file. At load all 26 already matched.

| gesture | drawing changed | off the saved scene after | screenshots |
|---|---|---|---|
| E1 · right-click on empty canvas, then Escape | 0.000% | none | `172-04-E1-empty-canvas-{before,after}.png` |
| E2 · right-click on the architect-session → review-store edge's label, then Escape | 0.000% | none; the label stays on `aof-jn8y5bq1t9qu` | `172-04-E2-edge-label-{before,after}.png` |
| E3 · right-click on "Review store", Copy, then a click on empty canvas | 0.000% | none | `172-04-E3-copy-{before,after}.png` |
| right-click on that edge's body, then Escape | 0.000% | none | `172-04-arrow-body-{before,after}.png` |
| right-click on a frame's name, then Escape | 0.000% | none | `172-04-frame-name-{before,after}.png` |
| E4 · right-click and Escape, then a 100 px pan and one zoom step (100% → 110%) | 0.000% against the same pan and zoom with no right-click; the view is identical | none | `172-04-E4-pan-zoom-{alone,after-right-click}-{before,after}.png` |

The shape gestures (E2, E3, the edge's body, the frame) were run with the whole drawing in view (the
SDK's Shift+1, 30%), so each lands on its shape rather than under the panel.

**The measures are not vacuous.** This is a check of its own in the smoke:

- each of the four shape gestures opened that element's own menu (it offers Delete);
- the pan alone changed 4.7% of the drawing's pixels;
- the drift measure names a label moved by 5 px.

Every screenshot pair was read: arrows whole and joined to their boxes, each label on its own edge,
and at 110% the drawing moved as one.

- **E5 does not apply:** no gesture reproduced the skew, so there was no layer to bisect.
- **Outcome: F-171-03 is ruled out** on the editor as it now stands. The `right-click:` checks stay in
  the smoke as the standing guard, so a skew that returns turns them red.
- **Not tried:** 171's editor itself, which also rendered a terminal dock under the canvas. 172/02
  retired the dock. Any cause tied to the dock left with it, and nothing here shows whether there was
  one.
- **Observation:** a right-click on a shape enables Undo. The SDK (0.18.0) records the selection it
  makes in its history. The scene does not change.

### `aof:verify 172` — the controls the story lanes never selected (2026-10-27)

Run on the Mac at `46b6be2`, each suite through `scripts/test-shard.mjs` with `AOF_GLOBAL_HOME`
isolated. The suites were the controls 172/03's widened run had attributed, plus the two that
m174/F-01 named (`application-assembly` and the execution kernel check).

- **Before:** 15 reds over 11 suites. F-172-02 to F-172-08 are 172's. F-172-11 is the macOS tmpdir.
- **After the fixes:** every 172 red is green. FF-17201's red probe still fires on each plant after
  its slice was replaced. FF-16004's +2 was attributed with the control's own load hook: of the
  branch's new modules on `aof work find 160`, two are 172/00's and seven are 174's, and 174 had
  already counted its own.
- **F-172-11 is environmental:** `core-workspace` and `yarn-installation` ran 25/25 green with
  `TMPDIR` set to its realpath (`/private/var/folders/…/T`). The whole-tree gate runs that way on
  this Mac.
- **Design render at verify: INCONCLUSIVE.** `work.ui.baseUrl` is not declared and no `--url` was
  given, so no render was attempted and no designer or QA session was spawned. The surfaces were
  judged against the committed mocks in each story's agent-run readings above (172/01 task 02,
  172/02 task 02), and those readings stand as the conformance evidence.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-171-03 | Carried from 171 VERIFICATION: after a right-click the drawing skewed until a reload; the saved scene was clean; not reproduced at 171's verify. | defect | minor | in scope — reproduce first | 172/04 | ruled out (172/04, 2026-10-27): six gestures over 171's scene drew exactly as before, and the smoke keeps them as checks |
| F-172-01 | The architect's session ran `mktemp -d`, outside `Bash(aof diagram scene:*)`, without a denial (Claude Code's own allowance for safe commands, presumably), and its `Write` grant is not path-scoped. | observation | minor | non-blocker: `--permission-prompts none` still denies every tool outside the list (FF-17201), and the session runs only from the operator's own board. Scoping `Write` to a scratch directory is backlog work. Recall: no prior occurrence (all five candidates irrelevant). | backlog | open |
| F-171-04 | Carried from 171 VERIFICATION: every ask and reply opens or types into a visible terminal dock; the conversation surfaces need a proper design. | design-gap | major | in scope | 172/00, 01, 02, 03 | addressed by 172/00–03, with agent-run readings CONFORMS (two minor gaps: F-172-09, F-172-10); closes on 172/02 task 03's `@uat` |
| F-172-02 | FF-6306 (`acd-assignment-resolves-to-a-loop-call`) is red: `packages/diagrams/src/review-session.mjs` (172/00) is a second module that spells an assignment phase's slash command, beside `packages/mesh/src/assignment-directive.mjs`. FF-17202 makes the same module the one home of `/aof:diagram-review`, so the two controls must be reconciled, not one silenced. | defect | major | **blocker** (milestone gate). Same class as m57/F-57-M-1 and m57/F-57-M-4, a new module opening a second home, fixed in place. | 172/00 (architect: reconcile FF-6306 with FF-17202) | fixed at verify (operator's call, the m53/F-17 precedent): FF-6306's detector counts only the closed set's commands (`/aof:` + `ASSIGNMENT_PHASES`), so `review-session.mjs` stays FF-17202's one home; the census still finds `assignment-directive.mjs` exactly |
| F-172-03 | `packages/execution/src/conversation-session.mjs` (172/00) imports `node:child_process`, outside the execution kernel's allowed platform APIs (`yarn-installation/extracted kernels …`), and its `execFile("taskkill.exe", …)` is unaudited (`workspace-boundaries/all actual owners …`). | defect | major | **blocker** (milestone gate). Prior occurrence: m174/F-01 named both against 172/00 and routed them here. Same class as m165/F-02 and m161/F-05 (audit the child process). The tree-kill hoist already routed at 172/00's close (STATE, Q3) is the natural fix. | 172/00 | fixed at verify: `conversation-session.mjs` is admitted to the execution kernel's table for `node:child_process`, and its `taskkill` is audited in `scripts/workspace-runtime-audit.json` with its reason. The tree-kill hoist stays the routed story (STATE, 172/00 Q3) |
| F-172-04 | FF-16004 is red: `aof work find 160` evaluates 739 modules against a ceiling of 737. The +2 are 172/00's `review-session.mjs` and `conversation-session.mjs`, loaded eagerly on a verb that uses neither (measured with the control's own load hook). | defect | medium | **blocker** (milestone gate). Prior occurrence: m174/F-01. Defer the imports, or raise the ceiling with its reason, as m165/F-01 and m160/F-10 did. | 172/00 | fixed at verify: the ceiling is 739, with its reason. Both modules are static dependencies of code already on the path (`scene.mjs`'s `session` action; the board binding's synchronous assembly), so deferring either means rebuilding the port |
| F-172-05 | `application/registration preserves every descriptor` and `core-workspace/copied core runs …` are red: their descriptor goldens predate 172/00's `diagram:scene` `session` action ("…, or stamp" against "…, stamp, or session"). | defect | medium | **blocker** (milestone gate). Prior occurrence: m174/F-01 (the inventory fixture); same class as m147/F-147-01. | 172/00 | fixed at verify: `test/fixtures/application/command-inventory.json` carries `session` in the action enum, usage and description |
| F-172-06 | F-47-04-ARCH-2 (`acd-test-suite-registration`) is red: FF-17201's own control cuts source with an `indexOf(");")` sentinel slice (`acd-architect-session-never-bypasses-permissions.test.mjs`). | defect | medium | **blocker** (milestone gate). Same class as m55/F-55-M-4, m53/F-17 and m70/F-13: replace the slice with `test/support/source-slice.mjs`'s `enclosingParenGroup`; do not ledger it. | 172/00 | fixed at verify: the spawn's arguments are read with `matchedParenSpan`; nothing is ledgered |
| F-172-07 | FF-9603 is red: 172/02's `PLAN.md:26` restates the declared path `test/smoke/stand-in-architect.mjs`. | defect | low | **blocker** (milestone gate). Same cause as m144/F-02 and m124/F-04: name the file by its role. | 172/02 | fixed at verify: the line names the stand-in by its role |
| F-172-08 | FF-12603 leg 6 is red: 172/02's re-pin comment in `acd-loop-state-rides-the-run-record` widened the `RE-PINNED by 127/04` window to 4,161 characters, over the leg's ceiling of 3,900. | defect | low | **blocker** (milestone gate). Prior occurrence: m133/F-133-04, the same leg reddened by a board-ui re-pin comment. | 172/02 | fixed at verify: the four board-ui windows widen by 600 with the reason stacked under 171/02's. All four were over their limits, measured at 4,161 / 3,771 / 3,169 / 2,342; the assert stopped at the first |
| F-172-09 | A proposal card's changes line reads the counts ("1 changed") where `mocks/conversation-proposal.png` reads the change ("1 edge relabelled · nothing else changes"). The proposal record does not carry the change's kind. | design-gap | minor | non-blocker: the designer sets the `DESIGN.md` rule for what the line may say without a kind; the record change is backlog work. | aof-designer → backlog | rule set (DESIGN.md `### A proposal in its thread`, 2026-10-28): the line reads the counts it has until the record carries a change kind; the record change is backlog |
| F-172-10 | Activity steps read as the command run ("aof diagram scene … --action context") where `mocks/conversation-streaming.png` reads what the step did ("Read the diagram as Mermaid"). | design-gap | minor | non-blocker: the designer sets the `DESIGN.md` rule (a vocabulary of the review command's steps, or the command as an accepted fallback); the vocabulary is backlog work. | aof-designer → backlog | rule set (DESIGN.md `### The conversation panel`, 2026-10-28): a step reads as its command until a step vocabulary exists; the vocabulary is backlog |
| F-172-11 | On macOS, seven cases compare a `/var/folders/…` tmpdir with its `/private/var/…` realpath and go red (`distribution-workspaces` ×2, the `workspace-boundaries` plant probe, `yarn-installation` production packaging ×3), measured at verify. 172/00's close attributes FF-5301's two-hop probe and 171/02's stamp-via-CLI case to the same cause, which was not re-measured here. None of the files involved is touched by 172. | environment | medium | non-blocker for 172's code, but it reds the whole-tree gate on this Mac: the gate runs where they pass, or takes an environment `--gate-override` naming this finding. Recall: no prior occurrence. Realpath the tmpdir in those suites as backlog work. | backlog | open |
| F-172-12 | The first whole-tree gate (`8a810a8`, REGRESSION row 1, red) found two more 172 reds that no story lane selected. `131/04 task01` counts six `admitWriteRequest(` call sites, not five, because 172/00 added the conversation route. `the-card-renders/04` (`fleet-scope`) reads the 133/04 board-ui window at 3,771 characters against 3,400, because of 172/02's stacked comment. | defect | medium | **blocker** (milestone gate). Same class as m53/F-14 and m135/F-135-01: a frozen census that a new board route owes. | 172/00, 172/02 | fixed at verify: the census is six, with a new check that `deliverConversation` admits before it reads its body; the fleet-scope window widens by 600, as FF-12603 leg 6 did (F-172-08) |
| F-172-13 | Eight of 172/00 task 01's cases (E2 to E8 and two unlabelled rows) went red in the gate's pool and green alone. `conversation-session.suite.mjs`'s `until` gave a real stand-in child 5 s to start and end its turn, and under eight workers it took longer. | test-gap | low | non-blocker: the gate logged the cases "not isolated", not as failures. Same class as m96/F-96-H and m54/F-54-01-1, a bound that races process creation under load. | 172/00 | fixed at verify: the wait is a 20 s hang guard; 28/28 alone |
| F-172-14 | Five more gate reds on this Mac, none in code 172 changed, each reproduced alone. **release-fingerprint-pin** ×3: the gpg keyring lock times out. **command-core/workspace packages**: Node 24's runner prints `ℹ tests 335` (all 335 pass) where `scripts/test-workspace.mjs` reads the TAP `# tests N` line; red at 170's and 171's first gates too. **autonomous-shell-out/black-box**: the fixture's 1 ms `scheduleToCloseMs` halts the drive at 939 ms, before the PTY launch types to the shim; 172/00's only driver change is a behaviour-identical move of `isSessionAttachmentKey`. **81/00** (`grade-waits-without-blocking`) and **69/04 / lane-is-local-slot**: process-liveness and dispatch timeouts, in code 172 did not touch. 172/03's widened run saw the same set. | environment | medium | non-blocker for 172's code. Same class as m53/F-21 and m127/F-09, an environmental residue recorded rather than chased. With F-172-11 it is why the gate cannot go green on this Mac; it goes green where these pass, or through `--gate-override` naming both findings. | backlog | open |
| F-172-15 | The Windows gate (`0a4fb09`, REGRESSION row 2, red) had one unit red alone: `work/this-tree-holds-what-is-live: 00` (the backlog add on the shape copy). Its `runCli` set no `maxBuffer`, and `aof work doctor --json` over the copied stream writes 1,052,110 bytes, past spawnSync's 1,048,576 default: ENOBUFS, then SIGTERM, then `status: null` with empty stderr. The real tree writes 878,346 bytes (copied mtimes add findings). It was green at `8a810a8`, and the stream's own records grew it past the ceiling. The other 17 reds were not isolated (red in the pool, green alone). | test-gap | medium | **blocker** (milestone gate). A distinct incident: recall `c798989c` returned m81/F-81-B (a grader classifying its own ENOBUFS kill), a different cause in production code (departed). Fixed in the test: `runCli` takes the repo's `maxBuffer: 64 * 1024 * 1024`, and the file is 14/14 green alone on Windows. | 172 verify | fixed |
