---
doc: verification
updated: 2026-09-27
---
<!--
  Story VERIFICATION.md for 140. Parentless story (parent: null), so this is the story's own
  verification record. At build time it holds ONLY task 02's @manual evidence, recorded by the
  builder as the task's contract requires. aof:verify authors the rest of this record (method,
  the @executable lanes, findings, the accept decision) and may re-measure every row below at its
  source: each repository's .aof/aof.config.json and its `aof work update --dry-run --json`.
-->
# 140 · Refine runs solo unless told otherwise — Verification

## Method

Verified 2026-09-27 by `aof:verify` on `138-terminal-emulator` at `225dbb8`, which carries the
140 merge. The suite was scoped to the story: the test set in `STORY.md` `files:`, run isolated
(`AOF_GLOBAL_HOME=$(mktemp -d)`) through `node scripts/test.mjs --only <21 files>`. That set holds
every `140/00` and `140/01` case. No `@uat` scenario exists, so no human acceptance step ran. The
story has no UI surface, so there was no design-conformance review. It declares no `FF-NN` of its
own (no `ARCHITECTURE.md`); the single-home and phase-door controls it re-pointed ran in the same set.

## Automated lanes

| Lane | Result |
|---|---|
| `scripts/test.mjs --only` over the 21 declared test files | exit 0 · 502 `ok` · 0 `not ok` on either stream |
| task 00 cases (`140/00 …`): 7 | all `ok` — verifies → `tasks/00_each-prompt-states-its-own-default.feature` |
| task 01 cases (`140/01 …`): 13 | all `ok` — verifies → `tasks/01_the-loop-drives-both-phases-solo.feature` |
| `aof work validate 140` | PASS |
| `aof work doctor 140` | no `control-unresolved` at either severity; stream-level warns only |

## Verification evidence

### Task 02 — every repository the operator names runs the new defaults (`@manual`)

Recorded 2026-09-27 by the builder, in the build session.

**Approval before writing.** The builder scanned every `.aof/aof.config.json` under the operator's
source folder (read-only) and showed the operator the per-repository values of the three mode
keys, with this repository first. The operator chose **all 11** before anything was written.

**Labels, not paths.** This repository is public, and the other repositories' paths and names hit
the private-terms guard. Each row therefore carries an opaque label (`R02`–`R11`). The
label→path map is kept in the operator's local session evidence, not in this record.

**How the removal was made.** Each file was edited in place by a span-recording parse that deletes
exactly the named members, so every file keeps its own layout (three were hand-formatted, four use
CRLF). Each edit was checked before it was written: the leaf-level diff against the prior content
equals the removed keys exactly (nothing added, nothing changed), no mode key remains, no
`work.loop.agents` is left as `{}`, and the line endings are unchanged. `work.agents` keeps
`productOwner` in all 11, so it never empties.

**How the prompts were re-rendered.** `aof work update --json` ran in each repository through the
CLI of this story's tree, because the `aof` on PATH renders from the main checkout, which does not
yet carry 140. A dry run followed each write.

| Repo | Keys removed (prior value) | `work.loop.agents` pruned | `aof work update` | Following dry run |
|---|---|---|---|---|
| R01 · this repository | `work.agents.mode` (`orchestrated`), `work.loop.agents.refine.mode` (`orchestrated`), `work.loop.agents.continue.mode` (`solo`) | yes | created 0, updated 0, drift-warning 0 (rendered earlier in the build) | updated 0, drift-warning 0 |
| R02 | the same three, same values | yes | created 0, updated 10, drift-warning 0 | updated 0, drift-warning 0 |
| R03 | the same three, same values | yes | created 0, updated 10, drift-warning 37; then `--force` (operator-approved): updated 37, drift-warning 0 | updated 0, drift-warning 0 |
| R04 | the same three, same values | yes | created 0, updated 13, drift-warning 0 | updated 0, drift-warning 0 |
| R05 | `work.agents.mode` (`orchestrated`) | n/a | created 17, updated 35, deleted 1, drift-warning 0 | updated 0, drift-warning 0 |
| R06 | `work.agents.mode` (`orchestrated`) | n/a | created 28, updated 0, drift-warning 51; then `--force` (operator-approved): updated 50, drift-warning 1 | updated 0, **drift-warning 1** |
| R07 | `work.agents.mode` (`orchestrated`) | n/a | created 44, updated 26, drift-warning 0 | updated 0, drift-warning 0 |
| R08 | `work.agents.mode` (`orchestrated`) | n/a | created 7, updated 57, drift-warning 0 | updated 0, drift-warning 0 |
| R09 | `work.agents.mode` (`orchestrated`) | n/a | created 32, updated 54, deleted 1, drift-warning 0 | updated 0, drift-warning 0 |
| R10 | `work.agents.mode` (`inline`, outside the schema's enum) | n/a | created 32, updated 40, deleted 1, drift-warning 24; then `--force` (operator-approved): updated 24, drift-warning 0 | updated 0, drift-warning 0 |
| R11 | `work.agents.mode` (`inline`, outside the schema's enum) | n/a | created 32, updated 38, deleted 1, drift-warning 26; then `--force` (operator-approved): updated 26, drift-warning 0 | updated 0, drift-warning 0 |

- **`aof project validate --json`** answered `valid: true` with 0 errors in all 11, after the
  removal.
- **The rendered `.claude/commands/aof/refine.md`** states "An unset `work.agents.mode` resolves to
  solo" in all 11, read with its line wrapping collapsed.
- **Re-measured at verify.** R01: a fresh `aof work update --dry-run --json` reads created 0,
  updated 0, deleted 0, drift-warning 0; no mode key remains in `.aof/aof.config.json`;
  `aof project validate --json` reads `valid: true`, 0 errors; the rendered `refine.md` states the
  unset-solo sentence; both drives answer `--solo`, as below. R06: once its stale template was
  deleted (F-04), the dry run reads created 0, updated 0, deleted 0, **drift-warning 0**.
  verifies → `tasks/02_every-repo-runs-the-new-defaults.feature`
- **R06's one remaining drift-warning (at build) was not 140's.** It is `.aof/templates/work/milestone/OUTCOME.md`,
  the template's old location. The bundle still ships the template, but it now renders to
  `.aof/templates/work/shared/OUTCOME.md`, and R06 carries that copy current. The lock still records it, and the file was
  modified after it was rendered, so the engine refuses to delete it even under `--force`
  ("stale generated file was modified; not deleting"). Clearing it means deleting that one tracked
  file by hand. That delete was not approved at build; the operator approved it at verify (F-04).
- **The large create/update counts** in R05–R11 are those repositories catching up with every
  bundle change since they were last rendered, not 140's three prompts alone. None of the
  repositories was committed; each one's changes are left in its working tree for its owner.

**This repository's live drive composes solo for both phases.** At this story tree's root, after
the removal:

```
aof work drive refine 140 --dry-run --json   → "command": "/aof:refine 140 --solo"
aof work drive continue 140 --dry-run --json → "command": "/aof:continue 140 --solo"
```

The "before" answer was not measured in this session. With `work.loop.agents.refine.mode:
"orchestrated"` pinned, the drive composes `--orchestrated` verbatim (129/07's set-key row, still
covered by its test). That pin is what this removal takes away.

## Review close (build session, for the findings register)

The story ran `--solo`, so the three review lenses (structural, behavioural and craft) were played
inline by the builder, in one round with 0 Blockers. No finding id is allocated here, because the
register is aof:verify's.

- **Fixed at the close (Important, structural).** `LOOP_AGENT_MODE_DEFAULTS` and
  `LOOP_AGENT_MODE_RESOLVERS` each enumerate the phases, and nothing held them equal. The 140/01
  bounds case now asserts that their key sets are equal and that every default is a member of
  `LOOP_AGENT_MODES`.
- **Recorded (process).** The blast radius measured at refine ("only the `test/loop/` drive
  assertions break") was incomplete. FF-5303's `acd-phase-door-not-a-driver` pins a flagless
  dry-run drive and broke too; it is now in `files:`. FF-9603's stream-wide PLAN.md ban also
  refused this story's own PLAN.md, which restated two paths, and that was reworded.
- **Recorded (inherited).** FF-9603 was already red at `main`'s HEAD on 139's PLAN.md. Its two
  restated paths were reworded in this story rather than left for the next gate.
- **Handed to the operator.** R06's stale `OUTCOME.md` template (task 02 above).

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `LOOP_AGENT_MODE_DEFAULTS` and `LOOP_AGENT_MODE_RESOLVERS` each list the phases, and nothing held the two lists equal | structural | important | fix in item | build close | fixed — the 140/01 bounds case asserts equal key sets and that every default is in `LOOP_AGENT_MODES` |
| F-02 | The blast radius measured at refine missed FF-5303's `acd-phase-door-not-a-driver`, which pins a flagless dry-run drive | process | minor | fix in item | build | fixed — test re-pointed and added to `files:` |
| F-03 | FF-9603 was already red at `main`'s HEAD, on two restated paths in 139's PLAN.md | inherited | minor | fix in item | build | fixed — reworded in this story |
| F-04 | R06 still showed drift-warning 1 after the build, which fails task 02's "`drift-warning` 0" row. The file was `.aof/templates/work/milestone/OUTCOME.md`, the old location of a template that now renders to `.aof/templates/work/shared/OUTCOME.md`. The engine refuses to delete it because it was modified after it was rendered | environmental | minor | fix in item, operator-approved | verify | fixed — the stale file was deleted (left uncommitted in R06's tree); the re-run dry run reads drift-warning 0 |

## Accept decision

**Accepted 2026-09-27.** Tasks 00 and 01 are green in the story-scoped lane. Task 02 was
re-measured in R01 and R06, and all 11 repositories now meet its contract. Validate passes, doctor
reports no unresolved control, and no blocker finding is open.
