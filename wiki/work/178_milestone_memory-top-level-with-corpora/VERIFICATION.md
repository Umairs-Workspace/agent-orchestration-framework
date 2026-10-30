---
doc: verification
---
# 178 · Memory is its own command — Verification

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-17801 | `test/arch/command/acd-memory-alias-one-implementation.test.mjs` | green (178/01, 2026-10-29) | in-file: a planted registry whose `work:memory` render wraps `memory`'s fails with one failure, `"work:memory"'s render is not "memory"'s own render — the alias must share it, not wrap or copy it` |
| FF-17802 | `test/arch/memory/acd-assets-spell-aof-memory.test.mjs` (moved from `test/arch/bundle/`: FF-12405 leg 10) | green (178/02, 2026-10-29) | in-file: a planted `packages/core/assets/commands/planted.md` holding `aof work\n  memory recall`, `aof work memory ingest` or `` `aof  work  memory status` `` on line 4 answers exactly `{ rel: "packages/core/assets/commands/planted.md", line: 4 }` |
| FF-17803 | `test/arch/memory/acd-record-origin-resolves.test.mjs` | green (178/03, 2026-10-29): 6 unresolved, equal to the independent count | in-file: a record planted with origin `wiki/planning/RESEARCH-agent-loop-economics.md` fails with `<item>/<id>: wiki/planning/RESEARCH-agent-loop-economics.md names no existing file`; `../outside.md` fails too |

Re-run at verify (2026-10-29, this MacBook, `AOF_GLOBAL_HOME` isolated):
`node scripts/test-shard.mjs` over the three files → `# executed 15 cases; failures 0`, the three
in-file red probes among them.

## Verification evidence

No story declares an `@manual` or `@uat` scenario, and 178 has no UI surface, so there is no
human step and no design-conformance review.

- **Story lanes (`aof test --scope impacted --story 178/0{1,2,3}`).** Each lane widened to the whole
  tree (`scope: all`, 1,254 suites, 8,278 cases): files with no registered dependent, or none in
  the graph of 2026-10-29T11:18Z. All three runs failed, with 23 cases in common and 6 more seen in
  only one or two runs (`arch/46 ADR-004`, `audit-spawn/03` ×2, `59/02` 01.5, 01.6 and 02.5), which
  are load flakes: `audit-spawn-bounded` is 27/27 green run alone. → verifies the `@executable`
  scenarios of 01, 02 and 03 (all in the passing set).
- **Baseline.** The failing files were re-run alone, in this tree and in a detached HEAD worktree
  (`0d32938d`, none of 178's changes, a copy of this tree's `node_modules`). The sets differ in one
  case 178 causes, `yarn-installation/extracted kernels…` (F-01), and in
  `core-workspace/copied core…`, which is red at HEAD and green here (not a 178 regression). Every
  other case is red in both trees, for the same reason (F-02). For example, `work-memory/00`'s
  reindex golden expects `"store": "<STORE>"` and gets `"/private<STORE>"` at version 3 and at
  version 4 alike. → verifies that 178 introduces no red beyond F-01.
- **SPEC's outsider check, both doors.** After `aof memory ingest` (5,309 records, index version 4,
  graphify backend), `aof memory recall "memory top-level command alias" --block` and the same
  through `aof work memory` are `cmp`-identical (1,221 bytes), and so is `--json`. → verifies
  ADR-001 and 01/task 00.
- **SPEC's outsider check, origin.** `aof memory recall "aof memory is the canonical route alias"`
  returns ADR-001 and ADR-003 (m178) with `· origin wiki/planning/PRD-memory-engine.md` in
  `--block`, and `↳ origin wiki/planning/PRD-memory-engine.md` after the source line in the text
  view. A feedback record from m153 carries `origin wiki/planning/research/RESEARCH-agent-memory-procedure.md`.
  `aof memory status --json` reports `origin: { unresolved: 6 }`. → verifies ADR-002 and
  03/task 01.
- **Doctor and validate.** `aof work doctor 178`: no `control-unresolved` at either severity, no
  `register-duplicate-id`, 6 advisory warns. `aof work validate 178`: PASS.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `yarn-installation/extracted kernels cannot import core, legacy source, providers or sibling internals` went red. 178/03 added `@aof/work/records` (`parseFrontmatter`) and `@aof/work/identity` (`RECORD_DOC_BY_TYPE`, `ARCHIVE_ROOT`) to `packages/knowledge/src/memory/local-indexing.mjs`, and the knowledge row for that module in `test/bundle/yarn-installation.test.mjs:95` did not name them. Green at HEAD, red in this tree, every run. The build missed it because three Mac-environmental reds already sit in the same file (F-02), so a fourth read as the known residue. The recall names the same cause three times before: m161/F-01, m175/F-01 and m172/F-172-03, each a new import into a kernel module that its allow-list row did not name. This is a distinct incident of that recurring class (a different module and specifier), not a duplicate. | defect | high | blocker. Fixed at verify, as m175/F-01 and m172/F-172-03 were. Both specifiers are admitted on the row, with a `178/ADR-002 (178/F-01)` comment: they are work's own homes for the frontmatter grammar and the record-doc identity, the 148/ADR-001 pattern the row already follows. The existing boundary case is the regression guard: it was red before the edit and is green after (`yarn-installation` 14 cases, 3 failures, all F-02). | product-owner (verify) / 178/03 | closed |
| F-02 | The whole tree carries reds on this MacBook that are red at HEAD too, in files 178 does not touch or for reasons 178 does not change. The `os.tmpdir()`-vs-realpath goldens (`work-memory/00`, `distribution-workspaces` ×2, `workspace-boundaries` ×2), `release-fingerprint-pin` ×3, `yarn-installation` production ×3, `command-core/workspace packages`, `autonomous-shell-out/black-box`, `81/00`, `69/04 / lane-is-local-slot`, `loops-commands` 00 and 03, `171/02` stamp-via-CLI, `arch/53 FF-5301`, and `156` retained-lane ×2. This is the same cause and evidence as m172/F-172-11 and m172/F-172-14 (still open), cited as the prior occurrence. The whole-tree gate at `30b763b4` (REGRESSION.md, 2026-10-30T00:40Z, sharded, 13,866 cases, 57.1 min) was red on 33 cases. Twelve were not in the set above, so their ten files were re-run alone, in this tree and in a detached worktree at `ae6c8030`, 178's parent, which has none of 178's changes. Every one is red at the parent too (11 failures here, 16 there). The twelve are `migrate-core/170`, `chore 103`, `worktree-materialize/00` ×2, `mesh-ui-cli-face/02` ×2 (the live daemon holds `:4181`), `archive-is-a-move`, `this-tree-holds-what-is-live`, `promote-mints-the-number` ×2, `133/04 diagram:file`, `session-spawn-handler/00` and `work-ui-fleet-origin/01`. All but four are the tmpdir-realpath class. | environment | medium | non-blocker for 178's code. It means the whole-tree gate cannot go green on this Mac. It goes green where these pass, or through an environment `--gate-override` naming this finding and m172/F-172-11 and m172/F-172-14. | backlog (m172/F-172-11, m172/F-172-14) | open |

## Accept decision

**Accepted 2026-10-30** (product-owner, `aof:verify 178`).

- Stories 01, 02 and 03 accepted, each with its `OUTCOME.md` and `RETROSPECTIVE.md`.
- FF-17801..17803 are green, each with its red probe.
- `aof work validate 178`: PASS. `aof work doctor 178`: no `control-unresolved`.
- No blocker is open. F-01 was fixed at verify. F-02 is an environment non-blocker.
- Regression gate: run at `30b763b4` and red. Every red case is also red at 178's parent
  (F-02). Accepted through an environment `--gate-override`, as the operator chose before the run.
  The reason is recorded in `REGRESSION.md`. The gate goes green where F-02's cases pass.
- Operator hand-over (ADR-003). Re-upload the Hyperagent planner skills from
  `aof work integrations hyperagent package`. Re-upload the Cowork `.plugin` after
  `aof planning init --runtime cowork --force`.
