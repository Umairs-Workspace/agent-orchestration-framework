---
type: story
number: 10
slug: runtime-config-editor
title: "The config editor explains effective assistant settings"
parent: 154
status: done
owner: product-owner
created: 2026-10-06
updated: 2026-10-08
schema: 1
aofVersion: 0.1.0
depends: [05, 09]
reads: ["apps/ui/src/config/App.tsx","apps/ui/src/config/config-load.d.mts","apps/ui/src/config/config-load.mjs","apps/ui/src/index.css","packages/core/src/adapter-warnings.mjs","packages/core/src/application/bindings/config-editor.mjs","packages/core/src/application/bindings/config-inspect.mjs","packages/core/src/asset-references.mjs","packages/core/src/diagrams/generators.mjs","packages/core/src/lock.mjs","packages/core/src/model.mjs","packages/core/src/packages.mjs","packages/core/src/render-plan.mjs","packages/core/src/tool-store.mjs","packages/core/src/work/bundle.mjs","packages/core/test/config-editor.suite.mjs","packages/core/test/support/assets-services.mjs","packages/execution/src/runtime-selection.mjs","schemas/aof.schema.json","test/command/config-inspect.test.mjs","test/surfaces/setup-ui.test.mjs","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-002-resolve-runtime-and-model-once-retain-provenance","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/ARCHITECTURE.md#adr-008-explicit-memory-choice-and-configuration-only-ui","wiki/work/154_milestone_codex-drives-the-loop-alongside-claude/DESIGN.md","test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs","apps/ui/test/terminals-home-route.suite.mjs"]
files: ["apps/ui/src/config/App.tsx","apps/ui/src/config/config-load.d.mts","apps/ui/src/config/config-load.mjs","packages/core/src/application/bindings/config-editor.mjs","packages/core/src/application/bindings/config-inspect.mjs","packages/core/test/config-editor.suite.mjs","test/command/config-inspect.test.mjs","test/surfaces/setup-ui.test.mjs","apps/ui/src/config/RuntimeSettings.tsx","test/arch/testing/acd-ui-directory-budget.test.mjs","scripts/workspace-runtime-audit.json","test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs","apps/ui/test/terminals-home-route.suite.mjs"]
---
# 154/10 · The config editor explains effective assistant settings

## User story

As an operator, I want to edit and inspect runtime and scoped model settings in the existing configuration page, so that I can predict the next run without accidentally starting one.

## Tasks

- [x] `tasks/00_config-roundtrip.feature` — config roundtrip
- [x] `tasks/01_accessible-runtime-form.feature` — accessible runtime form

## Notes

- Decisions: ADR-002, ADR-008 in the milestone architecture.
- Boundary derived with the shipped story-contract deriver, then narrowed to this outcome.
  Fresh graph refresh timed out; graph coupling is unavailable, not empty. Direct source imports,
  cited subjects and owning suites supply the fallback; conventional root test guesses were replaced
  with the workspace's actual suite and registration paths. No stale graph was used.
- Shared registries/configuration appear in write sets deliberately; the wave planner must serialize
  overlaps. Dependencies express delivered interfaces, not an assertion that all stories can run together.
- Examples are proposed from the agreed milestone scope; there are no unanswered business questions.
  Build must implement executable traceability and register each new suite before reporting green.


- Build ownership extension before editing: RuntimeSettings.tsx owns the new execution region rather than growing the near-ceiling App. The UI directory row admits exactly this fifth config member with zero allowance; its existing rationale and negative probes remain. Additional read gaps: apps/ui/package.json and existing mounted-app harness contracts/React substitution; these reuse pinned dependencies without installing.

- Audit ownership extension before editing: preserve the inspector platform-locator runtime call kind, expression digest and count; refresh only its source fingerprint for the new pure editor inspection seam. Additional test read gaps: the existing React harness request/hold/mount contracts, mini-react host-node shape, UI primitives and workspace-boundary source fingerprint mechanism. No dependency or native capability probe is introduced.

- Build-round repair ownership before edit: the actual full gate reports the intentional config-only UI change against FF-5307. ADR-008 authorizes the execution configuration region, not a run/board face. The freeze owner will retain every store/board pin, every prior rationale and all per-file mutation probes; append the measured two-file config-only UI amendment and pin its exact tree. Its Git census must include new nonignored UI source before staging so RuntimeSettings is protected in the root tree as well as a detached snapshot. Read gap: only the failing fleet-scope.test.mjs pin-consumer section was inspected; it requires no edit.

- Final round-1 report adds the existing home-route accounting case: it pins App at 1,298 although its unchanged ceiling is 1,300. Full owner read and write declaration precede repair. As its existing fleet/board amendment convention permits, retain all other exact counts, all rationale and the unchanged 1,300 ceiling; document only the two-line 154/10 import/mount addition and pin the delivered 1,300. No explanation is deleted to fit and no ceiling is raised.

- Build diagnostic: a complete older asset-only API payload with resources/diagnostics reproduced a render crash at draft.runtime. The checked execution payload now fails before form state changes and exposes retry; the registered mounted regression retries against the real API. No new route, process launch or dependency. The incomplete gate attempt was cancelled, never reported green, and the completed-round baseline is retained for its restart.

- The full gate exposed a registration name-shape violation in the new freeze case. It now retains arch/53 FF-5307 (subject): and cites 154/10 after the colon; all 12 owning registration controls pass unchanged. Only the failing name-validator/shape/case sections were read as a diagnostic read-set gap. Completed gate rounds improve from four failing cases to one; the final snapshot gates the repaired name without relaxing any control.

## Accept decision

2026-10-08 — **ACCEPTED** by the main governing session after scoped verification. Execution-config parsing and editor/API tests pass. Eighteen real browser checks and the binding design checklist pass at 390/768/1280; production UI build passes. D-02 is closed. Evidence and limitations are recorded in the parent `VERIFICATION.md` and its dated artifacts. Scoped validate is clean and doctor reports no errors or unresolved controls. Required build review is already recorded above.
