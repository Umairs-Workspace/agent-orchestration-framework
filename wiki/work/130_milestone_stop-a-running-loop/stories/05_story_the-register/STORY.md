---
type: story
number: 05
slug: the-register
title: "The register — the seven controls in three files under test/arch/loop, their registrations and the budget rows in ONE writer's hands, and a red probe per control in VERIFICATION"
parent: 130
depends: [2, 3, 4]
status: done
owner: product-owner
created: 2026-09-13
updated: 2026-09-23
adrs: [ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006]
reads:
  - wiki/work/130_milestone_stop-a-running-loop/SPEC.md
  - wiki/work/130_milestone_stop-a-running-loop/ARCHITECTURE.md
  - wiki/work/119_milestone_the-tree-gets-an-interior/ARCHITECTURE.md#ADR-010
  - src/loop/stop-request.mjs
  - src/loop/stop.mjs
  - src/commands/loop.mjs
  - src/mesh/declarations.mjs
  - src/work/loop.mjs
  - src/mesh/presence.mjs
  - src/mesh/ui-serve.mjs
  - ui/src/fleet/runs.mjs
  - ui/src/fleet/scope.mjs
  - ui/src/fleet/api.ts
  - app/desktop/crates/core/src/supervision.rs
  - test/support/module-family.mjs
  - test/support/read-src-files.mjs
  - test/support/source-slice.mjs
  - test/arch/loop/index.mjs
  - test/arch/loop/acd-loop-probe-contract.test.mjs
  - test/arch/loop/acd-loop-narrates-in-flight.test.mjs
  - test/arch/loop/acd-loop-module-import-boundary.test.mjs
  - test/arch/loop/acd-declaration-predicate-is-composed.test.mjs
  - test/arch/work/acd-number-null-safe.test.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - test/loop/loop-command-probe.test.mjs
  - test/loop/loop-diag.test.mjs
  - test/loop/work-loop-declarations.test.mjs
  - test/support/mesh-ui-assign-fixture.mjs
files:
  - test/arch/loop/acd-loop-stop-request-single-home.test.mjs
  - test/arch/loop/acd-loop-stop-settles-the-run.test.mjs
  - test/arch/loop/acd-loop-stop-reaches-every-face.test.mjs
  - test/arch/loop/index.mjs
  - test/arch/testing/acd-source-directory-budget.test.mjs
  - wiki/work/130_milestone_stop-a-running-loop/VERIFICATION.md
schema: 1
aofVersion: 0.1.0
---
# 05 · The register

## User story

As **the architect who declared seven controls for the stop and will accept this milestone only
when each has been seen red**,
I want **the seven controls (FF-13001–FF-13007) to land in three files under `test/arch/loop/`,
registered by one import + one spread in that directory's `index.mjs`, with the `test/arch/loop`
row raised 55 → 58 and the `src/loop` exemption's `why` naming its new members — all in ONE
story's hands, so no other story writes an `index.mjs` or the budget table — and a red probe per
control recorded in `VERIFICATION.md`'s fitness register**,
so that **the invariants the ADRs state are checked by a runner on every run, and every control's
`pending` marker in `ARCHITECTURE.md` resolves to a file that has been observed failing**.

What lands: `acd-loop-stop-request-single-home.test.mjs` (FF-13001 the one home — resolved
specifiers + the comment-stripped sweep for `loop-stops` / the state words / `path.join(… "loop-stops")`;
FF-13003 the verb is a probe-shaped write — one file under `<home>/mesh/loop-stops/`, the project
tree unchanged, zero spawns, the seven keys); `acd-loop-stop-settles-the-run.test.mjs` (FF-13002
every `drivePhase` binding reaches `settleDriven` before any `return`, every
`haltDecision("operator-interrupt"` producer bound from `source.producer()`, the fixture leg
yielding a `cancelled` record and never a leaked `running` row; FF-13004 a honoured declaration
yields no row, the engine's zero imports); `acd-loop-stop-reaches-every-face.test.mjs` (FF-13005
`loops` additive and read by the same pass, six keys byte-identical without it; FF-13006 the
button is local-only and the one fetch; FF-13007's node leg — the desktop's argv is formed in
core, the shell's spawn form reads it). Each control's red probe — what was changed, the message
observed — in `VERIFICATION.md`.

## Tasks

- [x] `tasks/00_the-seven-controls-land.feature` — each control's structural leg, non-vacuity leg and fixture leg green over the delivered tree, registered by import + spread, the row 55 → 58, the exemption's `why` amended
- [x] `tasks/01_each-control-goes-red-on-contact.feature` — per control, the named mutation reds exactly that control with the message the register names, and the probe is recorded in `VERIFICATION.md`

## Notes

- 119/ADR-010's harness shape: `archTests` exported, never `readdir`-discovered.
- FF-11901: the import-specifier extractor has ONE home, `test/support/module-family.mjs` — every
  resolved-specifier leg reads through it, never a regex of its own.
- FF-13007's cargo half rides story 04 in `supervision.rs`; this story lands the node leg only.
- The register's three files are the milestone's only shared-write surface with the budget table
  and the two `index.mjs` files — which is why they are here and nowhere else.
