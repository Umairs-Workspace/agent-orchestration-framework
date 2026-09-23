---
doc: research
---
# 134 · Discovery before formulation — Research

The one blocking unknown (STATE, "No spike"): **can a person's answer be anchored to a record the
agent did not write?** SPEC's near-miss R6 (m62) says the ADR that names the reader owes a measured
check that the reader returns the answer and its giver. This document is that measurement, taken at
refine on 2026-09-23. Every count is a command over this machine's real transcript store,
`~/.claude/projects/<project-slug>/`. The same directory name comes from
`claudeProjectsDir` (`src/work/observe.mjs:65`).

## R1 · The harness writes the answer, keyed by the question, in a record the agent never writes

An `AskUserQuestion` call leaves two lines in the session's `.jsonl`:

- an `assistant` line with a `tool_use` block (`name: "AskUserQuestion"`, `id: "toolu_…"`,
  `input.questions[]`), which the agent composed;
- a `user` line with a `tool_result` block (`tool_use_id` = that id) **and a top-level
  `toolUseResult` object `{ questions, answers }`**, which the harness wrote.
  `answers` maps each question's full text to the answer string: an option label, or the person's
  own text when they chose "Other". The line also carries `sourceToolAssistantUUID` (the asking
  line), `timestamp`, `sessionId`, `userType: "external"` and `entrypoint`
  (`claude-vscode`, `cli`, …).

Sample (session `002c890f…`, 2026-09-06): the question "…How should I build it?" was answered in
free text, "No wortrees, in this branch please…", and the answer is in `toolUseResult.answers` under
the question's exact text.

## R2 · Census: every call has a result, and a refusal is distinguishable from an answer

Over all 88 top-level transcripts that contain the tool:

| Fact | Count |
|---|---|
| `AskUserQuestion` `tool_use` blocks | 54 |
| … with a matching `tool_result` | 54 |
| … answered (`toolUseResult.answers` present) | 46 |
| … refused (`is_error: true`, `toolUseResult: "User rejected tool use"`) | 8 |
| `toolUseResult` keys seen on an answered result | `questions`, `answers` (46/46) |
| calls on a sidechain (`isSidechain: true`) | 0 |
| calls in any `<session>/subagents/*.jsonl` | 0 |

**A subagent has never asked.** Subagent transcripts name the tool in their briefs and never call
it. So the discovery beat's asking happens in the main session in both modes. That is the session
the phase's run record names (below).

## R3 · The giver: the transcript names the channel, not the person

The answering line says a human answered through the harness (`userType: "external"`) at a named
entrypoint, in a named session, at a timestamp. **It does not name which person.** On a local
session there is one person at the harness, the operator, so "the person at session X's harness" is
the most the record supports. The ADR records exactly that and claims no more.

## R4 · The join from a story to a transcript already exists: the run record's `sessionId`

A refine phase mints its run first (`aof work run-start`), and the mint writes the live session id
onto the run record. This refine's own run, `20260923T164457365Z-0000`, carries
`sessionId: bbe58357-…`, `sessionSource: "live-store"`. So a story's (or its parent milestone's) run
records name every session that refined it. No new attribution vocabulary is needed.

## R5 · The settle seam that would stamp an answer does not reach the transcript store today

`completeRun` (`src/run-store.mjs:809`) already reads a session's transcript at settle, through
`settleSpendFromTranscript` (`src/run-spend-ingest.mjs:220`), to stamp spend. Its only caller,
`transitionRunComplete` (`src/effects/run-transitions.mjs:113`), passes
`projectsDir ?? workspace?.projectRoot`. That is the **repository root**, where no transcript lives.
Measured: the three newest settled runs on 133 all carry a `sessionId` and **`spend: null`**. A
hand-run `aof work run-complete` never stamps. An answer harvest hung on this seam as it stands would
stamp nothing and report nothing wrong. That is R6's failure mode exactly, and it is why ADR-003
resolves the directory itself and owes a measured check.

## R6 · What stays outside the anchor (stated, not hidden)

- **Forgery.** An agent with a shell can append a line to a `.jsonl`. The anchor stops the failure
  aof actually has, an agent filling a gap with a plausible answer and labelling it agreed. It does
  not stop an adversary. The same trust boundary already holds for spend and `aof work observe`.
- **Retention.** Claude Code prunes old transcripts. So an answer must be copied onto the committed
  run record once, at settle. It cannot be re-read from the transcript on every check.
- **Semantics.** The record proves a person was asked about a named example and answered. It cannot
  prove the map's wording reflects the answer. That is the reviewer's job, and 135's lint.

## Commands (2026-09-23)

```sh
cd ~/.claude/projects/<project-slug>
grep -l '"name":"AskUserQuestion"' *.jsonl | wc -l                  # 88
# census: node over every *.jsonl — count tool_use AskUserQuestion, match tool_result by
# tool_use_id, read toolUseResult (answers / "User rejected tool use"), isSidechain
grep -h '"name":"AskUserQuestion"' */subagents/*.jsonl | wc -l      # 0
# spend never stamped by a hand-run settle:
node -e 'r=require("./wiki/work/133_milestone_architecture-diagrams/runs/<node>/<run>.json"); console.log(r.sessionId, r.spend)'
```
