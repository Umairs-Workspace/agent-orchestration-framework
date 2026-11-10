---
doc: verification
updated: 2026-10-05
---
<!--
  Story VERIFICATION.md — is story 151 truly done, and what is the evidence?
  Parentless story (parent: null): no milestone SPEC box to tick, no milestone regression gate.
  No sibling ARCHITECTURE.md: 151 declares no FF-NN of its own. No UI surface, no DESIGN.md: no
  design-conformance section. No @uat scenario: no user sign-off.
-->
# 151 · aof:add-diagram draws the architecture diagrams a refine left undrawn — Verification

## Method

Lanes in scope: `@executable` (tasks 00–02) and one `@manual` (task 02, the end-to-end run). No
`@uat`. Run inline by the product owner, who is also the single writer allocating the finding ids
below.

151 is uncommitted: its bytes are the working tree on branch `147-loop-hands-halt-to-repair-session`
at `97e73758` plus the staged/unstaged 151 diff. Every suite ran there under a fresh
`AOF_GLOBAL_HOME`, with exit codes and both streams read.

The `@manual` run used the working-tree CLI (`packages/core/bin/aof.mjs`, which the npm-linked `aof`
on PATH also resolves to), not the installed payload. The payload (`0366a4fa.20261002T103106`)
predates 151 and was not reinstalled, because the checkout is shared with other sessions. The bundle
the scratch project received is therefore 151's own. The run was this Claude Code session following
the rendered command's prose step by step.

## Verification evidence

| lane | procedure | result | verifies → |
|---|---|---|---|
| `@executable` (story lane) | `scripts/test.mjs --only` over `test/diagrams/add-diagram-command.test.mjs`, `packages/core/test/bundle.suite.mjs`, the autonomous shell-out census, the learning-edge census, FF-13301 (`acd-diagram-generator-named-once`), the source-directory budget, and the two command suites 151 reads (`loop-diagram-command`, `bundle-architect-draws`) | **119 cases, 0 failures**, exit 0 | tasks 00–02 |
| `@executable` (importer sweep) | `scripts/test.mjs --only` over every test reading `assets/manifest.json`, `assets/bundle.json`, `aof.lock.json` or the 142 test ledger (27 files: `test/arch/{bundle,command,planning,store,work}`, `test/bundle/*`, `test/work/*`, `packages/core/test/*.suite.mjs`) | **522 of 523 ok**. The one red is FF-7106, naming two of 148's stories and not 151 (F-151-01) | task 00 |
| red probe (151/02) | renamed `diagram-item-delivered` → `diagram-item-closed` in `packages/core/assets/commands/add-diagram.md`, ran `test/diagrams/add-diagram-command.test.mjs` | red: `not ok - 151/02 E7-E9: an answer that draws nothing is reported, never a failure (outline, three rows)` with `AssertionError: the prose says: **\`diagram-item-delivered\`**`. Restored from a copy (sha matched); re-run 10 cases, 0 failures | task 02 E9 |
| `@manual`: setup | scratch git repo, `aof work init` → `.claude/commands/aof/add-diagram.md` rendered beside `loop-diagram.md` (84 created). Config `work.diagrams` = `diagram-design`, `svg`+`png`. Milestone `01` (in-progress). `ARCHITECTURE.md`: ADR-001 with a `### Diagram` brief and no diagram, ADR-002 with no brief | baseline `aof work doctor 01 --json`: no `diagram-*` finding | task 02 `@manual` Given |
| `@manual`: run 1 `/aof:add-diagram 01` | step 1 pick → candidates `[ADR-001]` (ADR-002 has no brief, so it is not a candidate). `aof diagram plan 01 ADR-001 --slug orders-flow-through-a-queue --json` → `enabled: true`, `available: true`, instructions naming the installed skill. Drew the architecture view per the instructions (skill `self_check.py`: OK). `aof diagram export 01 ADR-001 --json` → exit 0, `png.ok: true` (rung `playwright-cache`), `written` = `.svg` + `.png`. Pasted `block` under the brief | `diagrams/ADR-001-orders-flow-through-a-queue.{html,svg,png}`. The PNG was inspected and renders the five components and four labelled flows | task 02 `@manual` When (1) |
| `@manual`: run 2 `/aof:add-diagram 01 ADR-002` | no `### Diagram` → `aof work status 01` = `in-progress`, so wrote the brief from ADR-002's own text (state machine view). Plan `--slug an-order-moves-through-four-states` → `available: true`. Drew, self-check OK, export exit 0, `png.ok: true`. Pasted `block` under the new brief | `diagrams/ADR-002-an-order-moves-through-four-states.{html,svg,png}`. PNG inspected: four states, start, two terminals | task 02 `@manual` When (2) |
| `@manual`: doctor | `aof work doctor 01 --json` | **0 `diagram-*` findings**. The first pass showed three `diagram-orphan` warns because the verifier's paste of ADR-001's block missed its anchor. That slip was the verifier's harness, not the command's. Doctor caught it; the block was re-pasted and doctor came back clean | task 02 `@manual` Then |
| `@manual`: run 3 `/aof:add-diagram 01` | step 1 pick over the drawn `ARCHITECTURE.md`; sha1 of every file under `wiki/` taken before and after | "01 has nothing to draw", naming `aof:add-diagram 01 ADR-NNN`. No plan was run, and the hash list was identical (10 files, `diff` empty) | task 02 `@manual` Then (last) |
| gate | `aof work validate 151` | `PASS — 151 is well-formed.` exit 0 | step 4 |
| gate | `aof work doctor 151` | **No `control-unresolved`** at either severity. Warns only: `numbering-gap`, `rubric-join-unchecked`, `depends-edges-unchecked` (stream-wide) | step 4 |

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-151-01 | FF-7106 (`acd-declared-writes-include-generated-siblings`) is red on 148's uncommitted stories: `148/02` declares `templates/shared/OUTCOME.md` and `148/04` declares `commands/retrospective.md`, and neither declares `packages/core/assets/manifest.json`. 151's own declaration carries the manifest and all three renders, and is not named | defect | non-blocker (for 151) | defer to 148's refine. It is 148's `files:` to repair, and 148 is untracked work in this shared checkout | m148 refine; STATE `## Feedback (for retro)` | open |

## Accept decision

**Accepted, 2026-10-05.** Tasks 00–02 are green on the story lane (119 cases). The importer sweep
over every bundle, manifest, lock and ledger reader is green except FF-7106, which names only 148's
stories. The command's refusal wording was seen red. The `@manual` scenario held end to end in a
scratch project: an undrawn brief and a named, unbriefed ADR were both planned, drawn, exported (SVG
and PNG) and pasted. Doctor reports no `diagram-*` finding, and a third run drew nothing and changed
no file. Validate passes and doctor reports no unresolved control. No blocker is open: F-151-01 is
148's.
