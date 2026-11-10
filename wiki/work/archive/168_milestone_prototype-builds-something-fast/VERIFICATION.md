---
doc: verification
---
# 168 · A prototype builds something fast — Verification

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-16801 | `test/arch/work/acd-record-doc-map-one-home.test.mjs` (1 case) | Resolves: `RECORD_DOC_BY_TYPE` in `packages/work/src/identity.mjs` names the six record-doc types, and no other `packages/` source maps a type to a record doc. | Appended `const __PROBE = { story: "STORY.md", spike: "SPIKE.md" };` to `packages/work/src/records.mjs`: observed red — `the type → record-doc map is declared only in packages/work/src/identity.mjs (168/ADR-002) — import RECORD_DOC_BY_TYPE instead: packages/work/src/records.mjs (an object entry mapping a type to a record doc)`. Restored (byte-compared); green. |
| FF-16802 | `test/arch/work/acd-prototype-stays-light.test.mjs` (1 case) | Resolves: `isDriver` and `isDependTarget` answer false for a prototype; `nextWork` over a prototype-only stream offers nothing. | Added `\|\| item.type === "prototype"` to `isDriver` in `packages/work/src/dependencies.mjs`: observed red — `a prototype is not a driver (168/ADR-001 §2)`. Restored (byte-compared); green. |
| FF-16803 | `test/arch/work/acd-prototype-stays-light.test.mjs` (5 cases: one per status word, plus the non-vacuity case) | Resolves: a well-formed prototype validates clean and draws no doctor finding at `active`, `paused`, `done` and `abandoned`. | Added `"Diagrams"` to `PROTOTYPE_SECTIONS` in `packages/work/src/validation.mjs` (the fixture has no `## Diagrams`): observed red on all four status cases — `validate is clean over a "active" prototype` (and `"paused"`, `"done"`, `"abandoned"`). Restored (byte-compared); green. |
| FF-16804 | `test/arch/work/acd-prototype-stays-light.test.mjs` (2 cases) | Resolves: `prototype.md` lists no `Agent` tool; `prototype.mjs` imports no dispatch, worktree, lane or git module; the command names every move. | Added `Agent` to `allowed-tools` in `packages/core/assets/commands/prototype.md`: observed red — `packages/core/assets/commands/prototype.md builds in the session: no Agent tool (got Read, Grep, Glob, Bash, Write, Edit, Agent)`. Restored (byte-compared); green. |

Each probe was one planted change in the checkout, followed by that one control file run through
`node scripts/test.mjs --only` with an isolated `AOF_GLOBAL_HOME`, then a byte-compared restore
from a copy taken before the change. After all four were restored, both files ran green: 9 cases, 0 failures.

## Verification evidence

Run 2026-10-22 by `aof:verify 168` on branch `work/167-168` (uncommitted build tree), each lane
in the foreground with an isolated `AOF_GLOBAL_HOME`.

### Story 00 · a prototype is a work item

`node --test` over `packages/work/test/{records,validation,discovery,readiness,doctor}.test.mjs`:
58 native cases, 0 failures. `node scripts/test.mjs --only` over the two FF files,
`bundle-spike-chore-membership.suite.mjs`, `bundle.suite.mjs`,
`work-backlog-archive-enumerate.test.mjs`, `acd-work-root-one-enumerator.test.mjs`,
`work-item-status-lifecycle.test.mjs` and `acd-source-directory-budget.test.mjs`: 264 cases, 0
failures.
verifies → `stories/00_story_a-prototype-is-a-work-item/tasks/00_a-prototype-resolves-and-moves.feature`, `…/01_validate-holds-a-prototype-to-its-two-files.feature`, FF-16801…16803.

### Story 01 · one verb builds a prototype

`--only` over `work-prototype-four-moves.test.mjs`, `acd-prototype-stays-light.test.mjs`,
`acd-promotion-creates-one-type.test.mjs`, `bundle-spike-chore-membership.suite.mjs`,
`acd-work-command-cli-bijection.test.mjs`, `acd-work-command-route-coverage.test.mjs`,
`work-insert-top-level-places.test.mjs`, `acd-learning-edge-reaches-every-cut.test.mjs` and
`autonomous-shell-out-prompt.test.mjs`: 166 cases, 0 failures.
verifies → `stories/01_story_one-verb-builds-a-prototype/tasks/00_start-creates-a-prototype.feature`, `…/01_continue-stop-and-complete.feature`, `…/02_the-command-builds-inline.feature`, FF-16804.

### Story 02 · a prototype draws its diagrams

`--only` over `diagram-plan-command.test.mjs`, `diagram-export-command.test.mjs`,
`acd-diagram-layout-single-home.test.mjs`, `add-diagram-command.test.mjs` and
`packages/work/test/diagram-layout.suite.mjs`: 58 cases, 0 failures.
verifies → `stories/02_story_a-prototype-draws-its-diagrams/tasks/00_plan-and-export-take-a-diagram-name.feature`, `…/01_add-diagram-takes-a-prototype.feature`.

### Story 03 · the board shows a prototype

`--only` over `board-api.test.mjs`, `board-backlog-and-archive.test.mjs`,
`artifact-sync-manifest.test.mjs` and `acd-work-artifact-set-single-home.test.mjs`: 99 cases, 0
failures. `yarn ui:build` exit 0, and `tsc -b` in `apps/ui` exit 0 (the widened wire `status`
type-checks at every call site).
verifies → `stories/03_story_the-board-shows-a-prototype/tasks/00_a-prototype-card-sits-in-an-existing-lane.feature`, `…/01_the-detail-panel-shows-its-two-documents.feature`.

The nine task features hold 59 scenarios (outlines expanded to their example rows), all
`@executable`. Each maps to a case named `168/NN …` or `arch/FF-168NN …` in the lanes above. There
is no `@manual` or `@uat` scenario, so there is no agent-run procedure and no human sign-off.

### Story 03 · design conformance

INCONCLUSIVE. The milestone has no `DESIGN.md`, so no surface declares a `Route`. ADR-007 adds no
new surface: a prototype card reuses the existing lane card with a `prototype · <status>` tag. With
nothing to render, no designer or QA session was spawned. See F-02.

### Milestone · the whole-tree regression gate

| run | commit | result | what it found |
|---|---|---|---|
| 1 | `d63b05e6` | red (26.5 min, REGRESSION.md row 1) | 23 failing units on the tree 168 shared with 167's in-flight work → F-03 |
| — | `7514acf1` | green in 167's gate (167 REGRESSION.md, 15.3 min) | the tree with every red repaired, 168's included |
| 2 | `25d69b87` | override (REGRESSION.md row 2) | the code is byte-identical to `7514acf1` (`git diff 7514acf1 25d69b87` touches `wiki/` only), so a second whole-tree run would re-prove nothing |

Before the override, the suites `7514acf1` repaired for 168 were run at `25d69b87`, together with
168's two FF files, through `--only` with an isolated home: `core-workspace`,
`bundle-runtime-variants`, `command-core-contract`, `application-assembly`, `notify-messaging`,
`terminals-home-route`, `acd-cli-entry-executes`, `acd-loop-registry-not-an-item-type`,
`acd-loop-state-rides-the-run-record`, `yarn-installation`, `acd-record-doc-map-one-home` and
`acd-prototype-stays-light`. That was 160 cases with 0 failures, plus `packages/core/test/application.test.mjs` (2
native, 0 failures). A second whole-tree run at `25d69b87` was started and then stopped by the
operator, since it would only have repeated 167's green run on the same code. It wrote no row.
verifies → the milestone's accept door (REGRESSION.md).

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | Each of the four stories' declared `files:` missed paths its build had to write. 00 missed `item-status.mjs` plus four pinned suites. 01 missed the registry-derived guards a new `work:*` verb trips: `commands.mjs`, `packages/work/package.json`, `bundle.suite.mjs`, the CLI bijection, route coverage and the insert-face census. 02 caught two more of 01's censuses (`acd-learning-edge-reaches-every-cut`, `autonomous-shell-out-prompt`). 03 missed `status.tsx` and the artifact-count pin. Recorded at build in STATE `## Feedback`. | process | low | Non-blocker. Fixed at verify: each story's `files:` now names what its build wrote, and the lanes above ran over the widened set. Recall: m127/F-14 and m127/F-05 have the same cause (derived pins outside a story's `files:`) and are cited as the prior occurrence. m147/F-147-01 (`bundle.suite.mjs` pinned counts) is the same class. Its recurrence is a retrospective lesson, not a code defect. | product-owner (168) | closed |
| F-02 | No design judgement was possible for 168/03, since there is no `DESIGN.md` and no `Route`. One question is unjudged: whether the longer tag `prototype · abandoned` truncates beside the status ring and ref on a narrow lane card. | design-gap | low | Non-blocker. ADR-007 deliberately adds no surface, and the tag is the existing lane card's tag slot. Recall: m135/F-135-03 has the same cause (no `Route`, so nothing to render) on a different surface, so this is a distinct incident. m127/F-32 (a card cluster wider than its column at 768) is the overflow class this would join if it were measured. Recorded as an OUTCOME gap with its discharge condition. | designer (backlog) | open |
| F-03 | The first whole-tree gate (`d63b05e6`, REGRESSION.md row 1) failed on controls that none of the story lanes selected. These were 168's own: `prototype` missing from FF-5201's closed type vocabulary, the `commands/prototype.mjs` imports missing from `yarn-installation`'s allow-list, FF-16004's module ceiling for `aof work find` (718 → 720), 131/08's command-composition ceiling (63), the regenerated command inventory and command-core's known ids, the prompt-audit row for `command:prototype` (44 → 45), `ratchet.mjs`'s runtime-audit digest, the DetailPanel file budget (913 → 901, from `tabsFor` moving into `model.ts`) and FF-5307's `ui/` hash. The same run's other reds were 167's in-flight work (m167/F-09). | defect | high | Blocker for the door. Fixed in `7514acf1` (167's gate repair, done at the operator's request), and green at that commit in 167's whole-tree gate. The repaired suites were re-run here at `25d69b87`: 160 + 2 cases, 0 failures. Recall: the same class as m164/F-01, m165/F-01 and m161/F-01 (a milestone's own code turning pinned censuses red, caught only by the whole tree). m167/F-09 is the other milestone's view of this same run, so this is not a separate incident. It recurs as RETROSPECTIVE R1. | product-owner (168) | closed |

## Accept decision

**Accepted 2026-10-22.** All four stories are done (00–03). `aof work validate 168` passes, and
`aof work doctor 168` reports no `control-unresolved` at either severity. FF-16801…16804 each
resolve with a recorded red probe. The door is passed by a recorded override, REGRESSION.md row 2.
Its reason is that the code at `25d69b87` is byte-identical to `7514acf1`, which is whole-tree
green in 167's gate (15.3 min). That reason, and the targeted re-run of the repaired suites, are
evidence about this tree, and the override row says that it is an override. F-01 and F-03 are closed. F-02 stays open as a non-blocker
design gap, recorded in 03's OUTCOME with its discharge condition. There is no `@uat` scope, so
no human sign-off applies.
