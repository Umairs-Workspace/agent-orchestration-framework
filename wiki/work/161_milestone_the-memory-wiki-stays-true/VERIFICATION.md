---
doc: verification
---
# 161 · Verification

## Refine checks

Both example maps passed scoped doctor with zero errors before task authoring.
The first map initially contained un-commented explanatory prose; doctor rejected
those lines and they were corrected before any feature was written. Story 02's
map is not applicable: it documents delivered behavior rather than deciding policy.

No implementation, production test run, manual acceptance execution or human UAT
has occurred in this phase. All build evidence remains owed. The pre-build wiki
inventory in ARCHITECTURE is research evidence only.

At the consolidated refine review, `aof work validate 161` passed and scoped
doctor exited 0 with zero errors and five warnings. The warnings are the pending
control, unconfigured runner/rubric evidence and pre-existing stream-level
numbering/dependency checks. `git diff --check` passed. This settles document
well-formedness only, not the feature scenarios or the control's red probes.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-16101 | `test/arch/command/acd-wiki-citation-resolver.test.mjs` | Pending implementation and registration in `test/arch/command/index.mjs` | Not run at refine. Build must bypass the resolver and disconnect the command call separately, then record the actual observed failing messages here. |

## Acceptance checks still owed

- Story 01: impacted executable cases, registered architecture control, its two
  observed negative probes, and the agent-run shipped-command manual scenario.
- Story 02: the content checklist, exact preserved-section comparison and whole
  wiki citation inventory, with actual sources and results recorded per scenario.
- After both land: run scoped `aof work doctor 161 --json` and unscoped
  `aof work doctor --json`; require zero wiki-source-unresolved and
  wiki-source-unreadable findings across all direct pages. Record unrelated
  stream findings separately. This combined gate belongs to milestone acceptance,
  so it does not serialize the otherwise independent story builds.
- Run the configured milestone regression gate from a clean detached worktree
  with AOF_GLOBAL_HOME isolated. No dependency install is authorized by refine.

No human-only UAT rule or UI surface is introduced. The documentation checks are
agent-runnable manual checks; they must not be reported as human sign-off.
