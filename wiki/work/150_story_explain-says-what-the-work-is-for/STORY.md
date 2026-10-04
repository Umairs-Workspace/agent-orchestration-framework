---
type: story
number: 150
slug: explain-says-what-the-work-is-for
title: "aof:explain says what a work item is for, without writing anything"
status: in-review
owner: product-owner
created: 2026-10-04
updated: 2026-10-04
schema: 1
aofVersion: 0.1.0
reads:
  - packages/work/src/read.mjs
  - packages/work/src/commands/doc.mjs
  - packages/work/src/commands/tasks.mjs
  - packages/core/assets/commands/recent.md
  - packages/core/assets/commands/observe.md
  - packages/core/assets/templates/story/STORY.md
  - packages/core/assets/templates/milestone/SPEC.md
  - packages/core/assets/templates/spike/SPIKE.md
  - packages/core/assets/templates/chore/CHORE.md
  - packages/core/assets/templates/uat/SESSION.md
  - test/arch/work/work-content-free-discovery.test.mjs
  - test/work/stream/work-backlog-archive-enumerate.test.mjs
files:
  - packages/work/src/discovery.mjs
  - packages/work/src/commands/find.mjs
  - packages/work/test/work-resolve.suite.mjs
  - packages/work/test/index.mjs
  - test/fixtures/application/command-inventory.json
  - wiki/work/archive/142_milestone_yarn-workspace-modularization/plans/09-test-ledger.json
  - packages/core/assets/commands/explain.md
  - packages/core/assets/bundle.json
  - packages/core/assets/manifest.json
  - packages/core/test/bundle.suite.mjs
  - test/bundle/explain-command.test.mjs
  - test/bundle/index.mjs
  - test/loop/autonomous-shell-out-prompt.test.mjs
  - test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs
  - README.md
  - .aof/aof.lock.json
  - .claude/commands/aof/explain.md
  - .opencode/commands/aof/explain.md
  - .codex/skills/aof-explain/SKILL.md
---
# 150 · aof:explain says what a work item is for, without writing anything

## User story

As **an operator looking at a stream number or a backlog folder I don't remember the reason for**,
I want **`aof:explain <ref…>` to take one or more work item numbers or backlog folder paths and
print, for each, the purpose of the work — what it delivers, who it is for and why it exists —
briefly by default and in depth with `--verbose`**,
so that **I can decide what to schedule, refine or drop from a plain answer in the terminal,
without opening every record doc, and without the act of asking leaving files, notes or status
changes behind in the work tree**.

## Tasks

- [x] `tasks/00_find-resolves-a-work-tree-folder-path.feature` — `aof work find` (and every
  reader on `findWork`) resolves a folder path; today's forms answer byte-identically
- [x] `tasks/01_the-bundle-ships-aof-explain-read-only.feature` — `/aof:explain` ships in every
  runtime, offers no writing tool, and names no writing verb except to forbid it
- [x] `tasks/02_aof-explain-says-what-each-item-is-for.feature` — one answer per ref, in order:
  unresolved and ambiguous refs, backlog and archived marks, short vs `--verbose`, nothing invented

## Notes

- **The operator's words (2026-10-04):** "A new command aof:explain. Which receives numbers of work
  items or folder paths for backlog and explains/outputs the purpose of the work. The output should
  not be stored, and should accept a '--verbose' parameter for in-depth explanations."
- **Read-only is the contract.** Nothing is written: no record doc, no STATE note, no run folder,
  no status or `updated:` stamp. The output goes to the terminal only.
- **Inputs.** Several refs in one call; each is a stream number (`147`, nested `147/01`) or a
  backlog folder path (`wiki/work/backlog/story_…`). Resolution goes through `aof work find`, never
  a hand glob. An unresolvable ref is reported by name and does not stop the others.
- **Default vs `--verbose`.** Default: a short purpose per item (the user story / objective in
  plain words). `--verbose`: the in-depth version — scope, the stories or tasks it groups, its
  depends edges, and what is still open.
- **Settled at refine (2026-10-04, EXAMPLES Q1–Q5).** Archived work is explained, marked
  archived (Q1). A milestone's short answer counts its stories and names none; `--verbose` lists
  each (Q2). Defaults taken: no `aof work explain` CLI verb, because the answer is synthesis only
  a session writes, composed from `find`/`doc`/`list`/`tasks` (Q3); a backlog folder path resolves
  through a path branch in `findWork`, not by the prompt stripping it (Q4); `find`'s refresh of
  the machine-wide work cache is outside the work tree and does not break read-only (Q5).
