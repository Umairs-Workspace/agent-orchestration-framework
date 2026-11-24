---
doc: verification
---
# 208 · Verification

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-20801 | `test/arch/work/acd-work-item-store-boundary.test.mjs` | 3/3 registered cases passed on 2026-11-24 in the ordinary runner, at verify and in every story's full-tree build gate. | At verify, a throwaway production module `packages/mesh/src/zz-ff20801-red-probe.mjs` imported `workTreeStatDigest` from `@aof/work/discovery` and called it. The production-scan case failed with `packages/mesh/src/zz-ff20801-red-probe.mjs:2: packages/work/src/discovery.mjs#workTreeStatDigest bypasses the selected work-item store`. With the module removed, all three cases passed. The suite's own fixtures fail on a launcher namespace alias of the digest, a command reading `readItemMeta` through a renaming re-export, a `parseFrontmatter` status read, a raw status regex, an `ITEM_RE` directory scan and a hand-written `status:` edit, and admit a SPEC body read and a selected `findWork` query. |

## Compatibility

`test/golden/work-stream.test.mjs` runs each of the 150 accepted 205 captures twice: with `work.store` omitted (`205 …` cases) and with `AOF_WORK_STREAM_STORE=files` (`208/05 explicit files …` cases). Per lane, under each selection: fixture 10, read 76, placement 26, lifecycle 38. Both selections matched every capture at verify. `git status` lists nothing under `test/golden/baselines`, so the baseline diff is empty. The harness changes are the explicit-files replay and two fixture-adapter lines.

Injected-store routing is proven through the assembled production entry points, not through matching file output alone:

- **Reads:** `next`, `doctor`, `validate` and diagram planning over an injected store and an empty tracking tree (208/01, `test/store/cache-read-seam.test.mjs`).
- **Lifecycle:** direct `status` and run-driven transitions reach an injected writer with no tracking files (208/02).
- **Placement:** each placement command reaches the selected operation with no tracking directory (208/03).
- **Observation:** a polling provider's token change reaches the normal launcher's publication with no file event (208/04).

All four are in `packages/work/test/work-item-store.suite.mjs`, `packages/work/test/transitions.test.mjs` and `test/mesh/launcher/mesh-launcher-syncs-every-workspace.test.mjs`.

## Verification evidence

Every 208 scenario is `@executable`. There is no `@manual` or `@uat` scenario and no UI surface, so no design review or human sign-off applies.

- **Suites naming a 208 case.** At verify, `aof test --scope file` ran the 14 registered suites that name a 208 case: the store suite, the launcher sync suite, the golden work-stream suite, the cache-read seam and ten architecture controls (FF-20801 among them). Its record is green: `20261124T200239853Z-0c777c429d22-61329`. A direct `scripts/test-shard.mjs` run of the same files executed 470 cases with 0 failures.
- **Every test file the stories declare.** The six stories' `reads:` and `files:` name 60 test files. The 18 that use `node:test` passed 105/105 under `node --test`, because the registered runner cannot load them. The other 42, with FF-20801, ran under `aof test --scope file`, and the record is green: `20261124T201334131Z-83cca0a5ba6d-68515`. The two cache-authority suites cited below also passed, 15/15. verifies → every scenario in 208/00 to 208/05, through the traceability table.
- **Gate.** `aof work validate 208`: PASS. `aof work loops validate`: 0 errors and 33 warnings, all stream-wide loop-registry grounding. `aof work doctor 208`: exit 0, with no `control-unresolved` at either severity. Its warnings are the stream-wide numbering gap, `control-runner-unchecked` (no `work.controls.runners` configured), `rubric-join-unchecked` per story, and `depends-edges-unchecked`.

### Scenario traceability

Every `@executable` scenario and outline row maps to a passing case in the lanes above.

| Story | Scenarios → cases |
|---|---|
| 208/00 | E1 to E4, both outlines → `208/00 E1` to `E4` in the store suite. The E2 case refuses `typo`, `{}`, `true`, `""`, `"FILES"` and `null`. The E3 case holds the queued, 30, 14 and 16 rows. The CLI selection case covers the same refusal through `aof work list --json`. |
| 208/01 | E1, E2 and the read-face rows → golden `work-stream-read`: `list-live`, `list-all`, `find-archive`, `blocked-story`, `find-miss`, `spec`, `strict` and `unknown-scope`. E3 and E4 → `164/02 E4` (a local edit outranks a worker's report) and `164/02 E8` (an item with no local folder is listed), now read through the store. Injected rows → the cache-read seam's `work-store/208-01` next, doctor, validate and diagram-planning cases. |
| 208/02 | E1, E2 and the refusal rows → `208/02 lifecycle …` and `208/02 refused or skipped …`, plus golden `work-stream-life` `governed`, `prototype`, `skip-edge`, `prototype-edge`, `invalid-status` and `guarded`. E3 → `208/02 E3`. E4 and the run rows → `208/02 real run from …`, four rows. The injected-writer case covers direct and run-driven moves. |
| 208/03 | E1, E2 and the placement rows → golden `work-stream-place`: `tail`, `insert-uat`, `insert-story`, `archived-slot`, `staged-leaf` and `backlog-edge`. E3, E4 and the move rows → golden `work-stream-life`: `archive-one`, `renumber-parent`, `archive-done`, `renumber-story`, `occupied` and `preview`. E5 → `168/01 start mints through the one mint, past an archived number, and renumbers nothing` and `168/01 E1`. E6 → the four `work-upgrade/idempotent` cases. Other-writer rows → `208/03 … reaches the selected operation without a tracking directory`, seven commands. |
| 208/04 | E1 and E4 → `208/04 E1` and `208/04 E4` (projections). E2 → `167/07 E1 · ten idle ticks walk nothing`. The authority rows → `cache-authority/07 the own-disk read answers from DISK even when the cache disagrees` (the two cache-authority suites, 15/15 at verify) and `167/03 E1`, plus `208/04 R1 · an opaque token change releases permanent-fault backoff`. E3 → `208/04 E3`. The observer rows → discovery's `167/07 E6`, the safety-walk edge rows, the launcher's `167/07 E8`, `the daemon's stop closes every watch` and `208/04 · shutdown waits for an observation still opening`. |
| 208/05 | E1 → the 150 `205 …` golden cases. E2 and the family rows → the 150 `208/05 explicit files […]` cases: fixture 10, read 76, place 26, life 38. |

Two `Then` steps are worded as implementation observations: 208/00 E4 (no tracking directory is opened) and 208/04 E2 (no additional full item walk). This is advisory. They are kept, because this milestone's subject is the tracking boundary itself and its idle-cost contract.

## Story build and review

Each story was reviewed inline in solo mode, one round. These were self-reviews, not independent reviews. Every story's impacted gate widened to all suites because its new modules had no registered dependent in the graph, so each story's build evidence is a full-tree run.

| Story | Gate evidence | Review |
|---|---|---|
| 208/00 | 15,485/15,485 cases, tree `3bcb312`, after a first round that found two import-census pins. | Structural, behavioural and craft PASS. Zero blockers. |
| 208/01 | 15,490/15,490 cases, tree `1f2214a3`, after two rounds that found five controls and two syntax pins. | PASS on all three. Zero blockers. Doctor opens each record once. |
| 208/02 | 15,503/15,503 cases, tree `8931ade2`, after a round that found one reclaim-control argument pin. | PASS on all three. Zero blockers. |
| 208/03 | 15,510/15,510 cases, tree `49187a91`, after a round that found five persistent failures in four units. | PASS on all three. Zero blockers. |
| 208/04 | 15,512/15,512 cases, tree `dc4621eb`, after a round that found the projection module's line ceiling. A further audit found and fixed a missing-document-home crash. | PASS on all three. Zero blockers. |
| 208/05 | 15,665/15,665 cases, tree `b14093a7`, after a round that found three assertions in two units. | PASS on all three. Zero blockers. 798 baseline files hash-identical before and after. |

Every green round also had timing failures under the pooled load (memory-judge, Windows pipe capture, autonomous shell-out, UI launch) that passed the runner's isolated retry. The runner reports them as not isolated and does not suppress them. None is in a 208 suite.

## Accept decision

**2026-11-24 · product owner (inline) · `aof:verify 208`.**

No finding was raised at verify. Each story is accepted on its own lanes above, with no open blocker:

- **208/00 · accepted.** E1 to E4 green, and duplicate refs and CLI selection green.
- **208/01 · accepted.** E1 to E4 green through the cache-read seam, and the injected-store reads green.
- **208/02 · accepted.** E1 to E4 green, with stale-guard, refusal-byte and replay-isolation cases.
- **208/03 · accepted.** E1 to E6 green, with lock-refusal and preview cases.
- **208/04 · accepted.** E1 to E4 green, with no-home and pending-open shutdown cases.
- **208/05 · accepted.** E1 and E2 green. FF-20801 green, with the red probe recorded above.
