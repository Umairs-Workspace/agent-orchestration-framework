---
doc: verification
updated: 2026-10-08
---
# 155 · One agent-mode setting governs every session — Verification

## Method

Verified 2026-10-08 by `aof:verify` on `148-memory-corpus-vocabulary` at `eae7c1c4`, with the 155
change set **uncommitted** in the working tree. The suite was scoped to the story: the test files in
`STORY.md` `files:`, plus every test-level importer of `@aof/contracts/loop-bounds` and
`@aof/contracts/agent-mode` (the importer sweep for a seam story), run isolated
(`AOF_GLOBAL_HOME=$(mktemp -d)`) through `node scripts/test.mjs --only <22 files>`. No `@manual` or
`@uat` scenario exists, so no human acceptance step ran. The story has no UI surface, so there was
no design-conformance review. It declares no `FF-NN` of its own (no `ARCHITECTURE.md`); the
single-home, mesh-blind, prompt-bounds and directory-budget controls it touches ran in the same set.

## Automated lanes

| Lane | Result |
|---|---|
| `scripts/test.mjs --only` over the 22 files | exit 0 · 542 cases · 0 `not ok` on either stream |
| task 00 cases (`155/00 …`): 14 | all `ok` — verifies → `tasks/00_the-loop-falls-back-to-the-workspace-mode.feature` |
| task 01 cases (`155/01 …`): 15 | all `ok` — verifies → `tasks/01_every-prompt-defaults-to-solo.feature` |
| task 02 cases (`155/02 …`): 7 | all `ok` — verifies → `tasks/02_the-inert-map-notice-follows-the-default.feature` |
| `aof work validate 155` | PASS |
| `aof work doctor 155` | no `control-unresolved` at either severity; stream-level warns only (`numbering-gap`, `rubric-join-unchecked`, `depends-edges-unchecked`) |

## Verification evidence

### The drive's chain, measured end to end

PLAN.md's end-to-end check, run against this tree's CLI (`packages/core/bin/aof.mjs`) in a scratch
workspace holding one story, with `AOF_GLOBAL_HOME` isolated:

```
work.agents.mode: "orchestrated", no loop key            → "/aof:continue 01 --orchestrated"
nothing set                                              → "/aof:continue 01 --solo"
work.agents.mode: "orchestrated" + loop continue "solo"  → "/aof:continue 01 --solo"
```

verifies → `tasks/00_the-loop-falls-back-to-the-workspace-mode.feature` (E1, E3, E2)

### The inert-map notice, measured end to end

Same scratch workspace, `aof project validate --json`:

- `work.agents.models: { "aof-qa": "opus" }`, no mode → `valid: true`, one `info`
  `model-map-inert-under-solo` at `work.agents.models`: "…has no effect because the default mode is
  solo (work.agents.mode is unset)…".
- The same map with `work.agents.mode: "orchestrated"` → `valid: true`, no inert diagnostic.

verifies → `tasks/02_the-inert-map-notice-follows-the-default.feature` (E9, E10)

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | Task 02's `When` steps (and `STORY.md`, `EXAMPLES.md`) name `aof config inspect --json`. That command was removed before this story: it answers "Removed command \"config\"" and points at `aof project show` / `validate` / `doctor`. The behaviour is right and is reached through `aof project validate --json` (measured above); only the contract's command name is stale | contract | minor | non-blocker; fix in item (reword to `aof project validate --json`) | operator | open — verify's edit of the `.feature` was refused by the session's permission classifier, so the reword is the operator's |

## Accept decision

**Accepted 2026-10-08.** All three tasks are green in the story-scoped lane, and the drive's chain
and the inert notice were re-measured end to end. Validate passes, doctor reports no unresolved
control, and no blocker finding is open. F-01 is open as a non-blocker. The change set is still
uncommitted on `148-memory-corpus-vocabulary` and needs its own branch and PR.
