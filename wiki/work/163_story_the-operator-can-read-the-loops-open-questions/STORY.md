---
type: story
number: 163
slug: the-operator-can-read-the-loops-open-questions
title: "The operator can read the loop's open questions — `aof work questions`, the read side of `aof work answer`"
status: done
owner: product-owner
created: 2026-10-17
updated: 2026-10-18
schema: 1
aofVersion: 0.1.0
tags: [loop, cli]
reads: [wiki/work/163_story_the-operator-can-read-the-loops-open-questions/EXAMPLES.md, wiki/work/163_story_the-operator-can-read-the-loops-open-questions/PLAN.md, packages/work-loop/src/ask-request.mjs, packages/work/src/commands/list.mjs, packages/mesh/src/execution-overlay.mjs, packages/messaging/src/form.mjs, packages/mesh/src/global-node-registry.mjs, packages/core/src/workspace.mjs, packages/core/src/application/bindings/commands/list.mjs, packages/core/src/application/bindings/board-mesh-execution.mjs, packages/core/assets/commands/recent.md, test/arch/loop/acd-loop-ask-single-home.test.mjs, test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs]
files: [packages/work/src/commands/questions.mjs, packages/work/src/commands/resume.mjs, packages/work/package.json, packages/work-loop/src/ask.mjs, packages/work-loop/src/cycle.mjs, packages/core/src/application/bindings/commands/resume.mjs, packages/core/src/application/bindings/loop/ask.mjs, packages/core/src/application/bindings/loop/cycle.mjs, packages/core/src/application/bindings/command-core.mjs, packages/core/assets/commands/questions.md, .claude/commands/aof/questions.md, .opencode/commands/aof/questions.md, packages/work/test/work-questions.suite.mjs, packages/work/test/index.mjs, packages/work/test/reentry.test.mjs, test/loop/loop-command-questions.test.mjs, test/loop/index.mjs, test/fixtures/application/command-inventory.json, test/arch/work/acd-work-command-cli-bijection.test.mjs, test/arch/work/acd-work-command-route-coverage.test.mjs, test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs, test/arch/testing/acd-source-directory-budget.test.mjs, packages/work/src/commands.mjs, packages/work-loop/src/ask-request.mjs, packages/core/src/application/assemble.mjs, packages/core/assets/bundle.json, packages/core/assets/manifest.json, packages/core/assets/variants/codex/workflow.md, .agents/skills/aof-questions/SKILL.md, .agents/skills/aof-questions/agents/openai.yaml, .codex/aof/workflows/workflow-contract.md, README.md, wiki/prompt-audit.md, packages/core/test/bundle.suite.mjs, packages/core/test/bundle-runtime-variants.suite.mjs, packages/core/test/application.test.mjs, test/command/command-core-contract.test.mjs, test/command/application-assembly.test.mjs, test/run/run-session-limit-resume.test.mjs, test/loop/autonomous-shell-out-prompt.test.mjs, test/bundle/yarn-installation.test.mjs, test/arch/command/acd-cli-entry-executes.test.mjs]
---
# 163 · The operator can read the loop's open questions

## User story

As **the operator whose loop has stopped a lane to ask me something**,
I want **`aof work questions` to print every question waiting on me — the item, phase, runtime,
when it was asked, the full question text, its choices, and the exact `aof work answer` line to
reply with**,
so that **I can read and answer a question from the terminal alone, even when the portal is
stale or down. Today `aof work answer` exists but its read side does not: `aof work resume` names
a waiting ref without its question, `aof work list --json` carries the text only as a buried
`ask.question` field, and on 2026-10-17 the only way to read a acme-core 011 refine question
behind a stale fleet view was to open `~/.aof/mesh/loop-asks/<runId>.json` by hand.**

## Tasks

- [x] [00 · The operator reads every question the loop is waiting on](tasks/00_the-operator-reads-every-open-question.feature)
- [x] [01 · --all lists the open questions of every workspace on this node](tasks/01_all-widens-to-every-workspace.feature)
- [x] [02 · resume sends the operator to the questions, from one waiting-on-a-human rule](tasks/02_resume-points-at-the-questions.feature)
- [x] [03 · aof work questions ships its /aof:questions wrapper](tasks/03_the-verb-ships-its-bundle-wrapper.feature)
- [x] [04 · The deployed verb agrees with the ask files on the control node](tasks/04_the-deployed-verb-agrees-with-disk.feature)

## Notes

- **The verb.** `aof work questions` lists the open asks in the current workspace; `--all` widens
  to every workspace on this node; `--json` emits the rows. Each row: ref, phase, runtime, asked
  instant (and age), workspace name, full question, numbered choices when the ask carries them,
  and `aof work answer <ref> "…"`. A parked ask is listed and marked parked. Nothing waiting is a
  plain one-line "no open questions", exit 0.
- **Source of truth.** It reads the ask files the loop writes (`loop-asks/`, through the existing
  ask-request reader) — no daemon round-trip, so it answers when the mesh UI is stale.
- **One predicate.** "This run is waiting on a human" is written twice today — `standingAsk` in
  `packages/work/src/commands/resume.mjs` and in `packages/work-loop/src/ask.mjs`. The verb takes
  that predicate from ONE home and both existing readers use it; it does not add a third copy.
- **`resume` points here.** `aof work resume` keeps its NEEDS-YOUR-ANSWER rows but sends the
  operator to `aof work questions` for the text, instead of growing its own partial listing.
- **Parity.** A `work:*` verb ships its `/aof:questions` bundle wrapper in `src/bundle/commands`,
  reachable through `aof work update`.
