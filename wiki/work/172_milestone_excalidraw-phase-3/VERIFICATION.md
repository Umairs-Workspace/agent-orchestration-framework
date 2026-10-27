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

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-171-03 | Carried from 171 VERIFICATION: after a right-click the drawing skewed until a reload; the saved scene was clean; not reproduced at 171's verify. | defect | minor | in scope — reproduce first | 172/04 | open |
| (172/00 review) | The architect's session ran `mktemp -d`, outside `Bash(aof diagram scene:*)`, without a denial (Claude Code's own allowance for safe commands, presumably), and its `Write` grant is not path-scoped. | observation | minor | to triage at verify | | open |
| F-171-04 | Carried from 171 VERIFICATION: every ask and reply opens or types into a visible terminal dock; the conversation surfaces need a proper design. | design-gap | major | in scope | 172/00, 01, 02, 03 | open |
