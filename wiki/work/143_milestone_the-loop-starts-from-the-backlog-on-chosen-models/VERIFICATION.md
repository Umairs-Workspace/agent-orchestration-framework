---
doc: verification
---
# 143 · Verification

## Fitness functions

Each probe is run at the source when its control lands: mutate one file, run the control, read the
failure, restore the file, then run the control green again.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-14301 | `test/arch/loop/acd-loop-scope-guard.test.mjs` (the FF-14301 case) | green, 2026-10-02 | planted `import * as _probe from "@aof/work/commands/promote";` at the head of `packages/work-loop/src/commands/loop.mjs` → `not ok` naming `packages/work-loop/src/commands/loop.mjs imports @aof/work/commands/promote`; restored byte-identical (`cmp`), green again |
| FF-14302 | `test/arch/loop/acd-loop-concurrency-single-home.test.mjs` (the FF-14302 case, beside FF-12901) | green, 2026-10-03 | appended `export const _probe = "whole-item";` to `packages/work-loop/src/cycle.mjs` → `not ok` naming `packages/work-loop/src/cycle.mjs, packages/work-loop/src/engine.mjs` as the spellings outside the bounds home; restored byte-identical (`cmp`), green again |
| FF-14303 | `test/arch/session/acd-agent-model-source-map.test.mjs` (the FF-14303 case, beside FF-7006) | green, 2026-10-03 | clause 1: appended `export function resolveSessionLaunch() {}` to `packages/work-loop/src/commands/drive.mjs` → `not ok` listing `packages/work-loop/src/commands/drive.mjs:resolveSessionLaunch` beside the leaf's two; clause 2: appended `export const _probe = (config) => config?.work?.agents?.session;` to the same file → `not ok` listing `packages/work-loop/src/commands/drive.mjs`; restored byte-identical (`cmp`) after each, green again |
