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

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-171-03 | Carried from 171 VERIFICATION: after a right-click the drawing skewed until a reload; the saved scene was clean; not reproduced at 171's verify. | defect | minor | in scope — reproduce first | 172/04 | open |
| (172/00 review) | The architect's session ran `mktemp -d`, outside `Bash(aof diagram scene:*)`, without a denial (Claude Code's own allowance for safe commands, presumably), and its `Write` grant is not path-scoped. | observation | minor | to triage at verify | | open |
| F-171-04 | Carried from 171 VERIFICATION: every ask and reply opens or types into a visible terminal dock; the conversation surfaces need a proper design. | design-gap | major | in scope | 172/00, 01, 02, 03 | open |
