---
type: story
number: 00
slug: testing-instructions
title: "A project tells its agents how to test, in its own words"
parent: 210
depends: []
status: done
owner: product-owner
created: 2026-11-26
updated: 2026-11-28
schema: 1
aofVersion: 0.1.0
adrs: [ADR-001, ADR-005, ADR-006, ADR-007]
reads: [wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-001, wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-002, wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-005, wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-006, wiki/work/210_milestone_bounded-test-runs/ARCHITECTURE.md#ADR-007, wiki/work/210_milestone_bounded-test-runs/STATE.md, scripts/test.mjs, scripts/test-shard.mjs, scripts/test-workspace.mjs, scripts/golden.mjs, packages/core/src/application/bindings/work/toolchain.mjs]
files: [scripts/workspace-runtime-audit.json, test/golden/baselines/work-init/default/project/.agents/skills/aof-continue/SKILL.md.golden, test/golden/baselines/work-init/default/project/.agents/skills/aof-manual/SKILL.md.golden, test/golden/baselines/work-init/default/project/.agents/skills/aof-review/SKILL.md.golden, .aof/aof.apply-journal.json, test/work/lifecycle/work-test-declared.test.mjs, .aof/aof.lock.json, test/golden/baselines/work-init/default/project/.agents/skills/aof-repair/procedure.md.golden, test/golden/baselines/work-init/default/project/.claude/commands/aof/repair.md.golden, test/golden/baselines/work-init/default/project/.opencode/commands/aof/repair.md.golden, test/golden/baselines/work-init/all-practices/project/.claude/commands/aof/verify.md.golden, wiki/TESTING.md, packages/acd/assets/manifest.json, .aof/aof.config.json, packages/work/src/testing/toolchain.mjs, packages/work/src/testing/layout.mjs, packages/core/src/application/bindings/config-inspect.mjs, packages/core/src/application/bindings/commands/init-update.mjs, packages/acd/assets/commands/continue.md, packages/acd/assets/commands/review.md, packages/acd/assets/commands/verify.md, packages/acd/assets/commands/manual.md, packages/acd/assets/commands/repair.md, packages/acd/assets/commands/map-tests.md, packages/acd/assets/commands/add-uat.md, packages/acd/assets/references/workflow-contract.md, packages/acd/assets/variants/codex/workflow.md, packages/acd/assets/templates/uat/SESSION.md, packages/acd/assets/templates/uat/STATE.md, packages/learning/assets/commands/teach.md, packages/learning/test/teach-frame.suite.mjs, test/testing/test-layout-check.test.mjs, test/work/lifecycle/work-update-test-layout.test.mjs, test/work/lifecycle/map-tests-command.test.mjs, test/loop/autonomous-shell-out-prompt.test.mjs, .claude/commands/aof/continue.md, .claude/commands/aof/review.md, .claude/commands/aof/verify.md, .claude/commands/aof/manual.md, .claude/commands/aof/repair.md, .claude/commands/aof/map-tests.md, .claude/commands/aof/add-uat.md, .claude/commands/aof/teach.md, .agents/skills/aof-continue/procedure.md, .agents/skills/aof-review/procedure.md, .agents/skills/aof-verify/procedure.md, .agents/skills/aof-manual/procedure.md, .agents/skills/aof-repair/procedure.md, .agents/skills/aof-map-tests/SKILL.md, .agents/skills/aof-add-uat/SKILL.md, .aof/templates/work/uat/SESSION.md, .aof/templates/work/uat/STATE.md, test/golden/baselines/work-init/default/project/.agents/skills/aof-add-uat/SKILL.md.golden, test/golden/baselines/work-init/default/project/.agents/skills/aof-continue/procedure.md.golden, test/golden/baselines/work-init/default/project/.agents/skills/aof-manual/procedure.md.golden, test/golden/baselines/work-init/default/project/.agents/skills/aof-map-tests/SKILL.md.golden, test/golden/baselines/work-init/default/project/.agents/skills/aof-review/procedure.md.golden, test/golden/baselines/work-init/default/project/.agents/skills/aof-verify/procedure.md.golden, test/golden/baselines/work-init/default/project/.aof/templates/work/uat/SESSION.md.golden, test/golden/baselines/work-init/default/project/.aof/templates/work/uat/STATE.md.golden, test/golden/baselines/work-init/default/project/.claude/commands/aof/add-uat.md.golden, test/golden/baselines/work-init/default/project/.claude/commands/aof/continue.md.golden, test/golden/baselines/work-init/default/project/.claude/commands/aof/manual.md.golden, test/golden/baselines/work-init/default/project/.claude/commands/aof/map-tests.md.golden, test/golden/baselines/work-init/default/project/.claude/commands/aof/review.md.golden, test/golden/baselines/work-init/default/project/.claude/commands/aof/teach.md.golden, test/golden/baselines/work-init/default/project/.claude/commands/aof/verify.md.golden, test/golden/baselines/work-init/default/project/.codex/aof/workflows/workflow-contract.md.golden, test/golden/baselines/work-init/default/project/.opencode/commands/aof/add-uat.md.golden, test/golden/baselines/work-init/default/project/.opencode/commands/aof/continue.md.golden, test/golden/baselines/work-init/default/project/.opencode/commands/aof/manual.md.golden, test/golden/baselines/work-init/default/project/.opencode/commands/aof/map-tests.md.golden, test/golden/baselines/work-init/default/project/.opencode/commands/aof/review.md.golden, test/golden/baselines/work-init/default/project/.opencode/commands/aof/verify.md.golden, test/golden/baselines/work-stream-place/insert-uat/project/stream/files/11_uat_trial/SESSION.md.golden, test/golden/baselines/work-stream-place/insert-uat/project/stream/files/11_uat_trial/STATE.md.golden, .agents/skills/aof-add-uat/agents/openai.yaml, .agents/skills/aof-continue/SKILL.md, .agents/skills/aof-continue/agents/openai.yaml, .agents/skills/aof-manual/SKILL.md, .agents/skills/aof-manual/agents/openai.yaml, .agents/skills/aof-map-tests/agents/openai.yaml, .agents/skills/aof-repair/SKILL.md, .agents/skills/aof-repair/agents/openai.yaml, .agents/skills/aof-review/SKILL.md, .agents/skills/aof-review/agents/openai.yaml, .agents/skills/aof-verify/SKILL.md, .agents/skills/aof-verify/agents/openai.yaml, .codex/aof/workflows/workflow-contract.md, .opencode/commands/aof/add-uat.md, .opencode/commands/aof/continue.md, .opencode/commands/aof/manual.md, .opencode/commands/aof/map-tests.md, .opencode/commands/aof/repair.md, .opencode/commands/aof/review.md, .opencode/commands/aof/verify.md]
---
# 00 · A project tells its agents how to test, in its own words

## User story

As an operator whose agents test my project,
I want one plain-words file that says which suites cover which areas, which changes need no run and
what is hazardous on this machine, read by every skill before it tests,
so that an agent chooses a bounded set of suites from what the project knows, instead of proving
the whole tree itself after every fix.

## Tasks

- [x] [instructions key and doctor](tasks/00_instructions-key-and-doctor.feature)
- [x] [skills' test step](tasks/01_skills-test-step.feature)

## Notes

Owns the `work.test.instructions` key, the doctor's `test-instructions` check (with the removal of
the coupling, work-dir and graph-freshness nags from the same family), the `/aof:map-tests`
rewrite, the skills' test-step wording in every bundle source and render, and this repo's
`wiki/TESTING.md`. The skills name the new `aof test` forms (ADR-002) before story 04 builds them.
That is a forward reference in prose, and nothing executes it until 04 lands.
