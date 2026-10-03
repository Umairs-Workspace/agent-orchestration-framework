---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 135 · Key examples in the contract — State

## Progress

- [x] refined 2026-10-03 (solo, `--autonomous`): RESEARCH, ARCHITECTURE (ADR-001 to ADR-007,
  FF-13501 and FF-13502 pending), DESIGN, five stories
- [ ] 01 the practice is its own package. Contract authored.
- [ ] 02 the parser reads `Rule:` as a group. Contract authored.
- [ ] 03 the board groups scenarios by rule. Contract authored.
- [ ] 04 an agreed example cannot fall out. Contract authored after Q1 was answered at the end review.
- [ ] 05 the contract is formulated from the map. Contract authored.

## Notes & decisions in flight

- **Refine 2026-10-03: the operator added the package.** Mid-refine, the operator asked for
  specification by example to be an add-on or a new package. Answered: there is no runtime plugin
  mechanism, and the config gate is already the switch. The operator chose to move the practice
  into its own package and named it `@aof/specification-by-example` (ADR-001, story 01).
- **Business questions asked at the end review (2026-10-03):**
  - 135/04 Q1: if an agreed example is missing from a contract, is the build refused or only
    reported? **Refused.** This became `[stated Q1]` E8 and task 04/02.
  - Designer, mock elicitation for the board: **no mock**, so DESIGN.md's binding checklist is the
    source of truth.
- **Default decisions taken (technical only):**
  - The trace lives in the example-map lane, not the advisory rubric lane. This follows the
    SPEC's intent and departs from its wording (ADR-004 §3).
  - The trace fires only on a contract formulated from the map, so 144 and every pre-135 contract
    lint as today (ADR-004 §4, SPEC out of scope).
  - Rule tags take rule scope, and `Example:` is admitted (ADR-003, RESEARCH R2 and R3).
  - The board puts scenarios outside any rule first, as Gherkin orders them (135/03 Q1).
  - A scenario citing an id missing from the map is not reported (135/04 Q2).
- **Runner check (SPEC scope):** aof's own binding was measured and needs no change. No governed
  project here uses a third-party Gherkin runner. The fallback is one feature per rule (RESEARCH R6,
  ADR-002 §3).
- **Graph:** built 2026-10-03T10:31:53Z, code only, no egress. The first build timed out at 120 s
  and succeeded with `AOF_GRAPHIFY_TIMEOUT_MS=900000`. Impact is cited in ADR-007.
- **Before 03, 04 and 05 build (m134/R2):** re-derive their `files:` from the tree once 01 merges,
  because 01 moves code they reference by forward path.
- **The live run is scheduled before review (m134/R1):** once 04 and 05 are built, and before
  either goes to review, refine one real mapped story end to end, then delete one of its agreed
  example's scenarios and confirm that `example-untraced` names it. That is the `@manual` row below.
- **Dogfooding:** 03 and 05 are formulated in 135's own form (`Rule: R<n> · …`, `E<n> · …`), so
  once 04 lands, their contracts are the trace's first real subjects.

- **Framed 2026-09-23** by `aof:shatter` from
  `wiki/planning/research/RESEARCH-specification-by-example.md`, the second of three drivers.
- **No spike for the runner check.** Whether the governed projects' BDD runners bind `Rule:` is a
  refine-time measurement inside this milestone's own scope (researcher + developer feasibility), not
  a top-level unknown.
- **What the ARCHITECTURE must settle:** (1) `Rule:` blocks versus a feature per rule; (2) how the
  traceability reader matches an example to a scenario or an Examples row, whether by id or by value;
  (3) the fallback for a runner that does not bind `Rule:`.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off: one mapped story formulated and linted end to end

## Feedback (for retro)

- **135/01 build (2026-10-03, solo): the declared write set was incomplete.** The move also had to
  touch `packages/core/src/application/bindings/commands/doctor.mjs` (its gate resolver became
  unused), `test/bundle/yarn-installation.test.mjs` and `test/bundle/core-workspace.test.mjs` (the
  package purity inventory and the owner count), `test/arch/audit/acd-controls-never-execute.test.mjs`
  (FF-5905 pins `createWorkDoctor`'s signature and the lane roster), `scripts/workspace-runtime-audit.json`
  (source digests) and 142's `plans/09-test-ledger.json` (case-name hashes). None was in `files:`.
  Refine for a package move should census every control that pins a moved module's path, signature
  or digest.
- **135/01 build: inherited reds repaired, not caused.** The 143 merge left the Plan 09 ledger's loop
  rows, `loop.mjs`'s runtime-audit digest and three 143 `PLAN.md` path restatements (FF-9603) red;
  135's own refine left FF-9603 red on 01's and 04's `PLAN.md`. All were mechanical and fixed in
  the 135/01 change. FF-11903 (citation rename history) was red before the move and stays a gate
  matter for `aof:verify`.
- **135/01 design note:** the examples gate's resolver no longer flows into `@aof/work` at all — the
  doctor command hands the snapshot `config` and the probe resolves the gate itself. 03, 04 and 05
  should read the map through `row.extensions.examples`, not `examplesMap`.
- **135/02 build:** under the full parser-importer sweep (391 cases) `brief-pinned-to-the-stream`'s
  two 70/05 cases went red on 143/03's refine brief, and passed alone both with and without the
  parser change — a contention flake, named so a later gate does not mistake it for 02.
- **135/03 review (finding, recorded):** design conformance at build was INCONCLUSIVE. A renderer
  resolves (the cached Chromium), but `work.ui.baseUrl` is unset and DESIGN.md's task-card surface
  declares no `Route`, so nothing was rendered and no designer judged it. The binding checklist's
  regions, order and classes are asserted structurally by `board-rule-groups.suite.mjs`; a
  rendered judgement wants a `Route` on the surface (or `--url`) at `aof:verify`.
- **135/04 build (2026-10-03, solo): the declared write set was incomplete.** Beyond `files:`, the
  trace also had to touch `test/arch/examples/acd-examples-off-is-today.test.mjs` (FF-13403's
  non-vacuity control asserts EVERY lane code fires, so its worst fixture gained a rule-titled
  contract), `test/bundle/yarn-installation.test.mjs` (the package's per-file import allowlist gains
  `@aof/work/feature-parse` for the lane), 142's `plans/09-test-ledger.json` (`registryCases`
  11795 -> 11825) and `test/arch/testing/acd-source-directory-budget.test.mjs` (two stale member
  counts). Refine for a lane that gains a code should census the controls that enumerate the codes.
- **135/04 build: an inherited red, not caused.** `acd-ui-surface-file-budget` (ADR-015/F2) is red at
  HEAD: 135/03 (`9ebb0b2b`) took `apps/ui/src/board/DetailPanel.tsx` from 997 to 1031 lines, over its
  1000-line ratchet. Outside the 04-05 span, so not repaired here; 135/03's verify must extract the
  rule-grouped scenario list into a sibling component.
- **135/04 review (finding, recorded):** "the live stream gains no trace finding" runs the real doctor
  over the live work stream, so any later story whose contract drops an agreed example while it is
  open turns this suite red — which is the gate doing its job, but the failure will surface in 135/04's
  suite rather than the story that caused it.
- **135/05 build (2026-10-03, solo):** the render that refreshes the nine copies also rewrites
  `.aof/aof.lock.json` (their hashes), which is not in `files:`; committed with the story. The
  Formulation paragraph names neither the gate's key nor the map's file name, because 134/05 pins
  the discovery passage as their one home in the Contract. The importer sweep (91 suites, 1387
  cases) was green.
