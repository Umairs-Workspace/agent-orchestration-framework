---
doc: verification
updated: 2026-10-06
---
# 152 · Promote shows what to promote next — Verification

## Method

Verified 2026-10-06 by `aof:verify` on `148-memory-corpus-vocabulary` (HEAD `6351dd66`, the 152
build uncommitted in the working tree beside 148's). The story is parentless, so this is its own
record. Every scenario is `@executable`; there is no `@manual` or `@uat` scenario, no UI surface
(so no design-conformance review), and no `ARCHITECTURE.md` (so no `FF-NN` of its own). All runs
were isolated (`AOF_GLOBAL_HOME=$(mktemp -d)`) through `node scripts/test.mjs --only <files>`.

Per 140/R1, verify ran two sets: the story lane (the new suite plus every test that imports a
changed module), then a renderer sweep once F-01's fix touched `packages/core/src/adapters.mjs`.

## Automated lanes

| Lane | Result |
|---|---|
| story lane: 19 files — the new suite, `work-promote-mints-the-number`, the backlog/archive/insert stream suites, the promote parity + one-promotion-engine + cache-read-boundary + application-assembly controls, and every arch test importing `promote.mjs` / `discovery.mjs` | exit 0 · 548 `ok` · 0 `not ok` on either stream |
| task 00 cases (`promote-shows-candidates: 00 …`): 21 | all `ok` — verifies → `tasks/00_promote-lists-the-candidates.feature` |
| task 01 cases (`… 01 …`): 15 | all `ok` — verifies → `tasks/01_promote-next-item-promotes-the-head.feature` |
| task 02 cases (`… 02 …`): 5 | all `ok` — verifies → `tasks/02_the-promote-command-offers-both-flags.feature` |
| renderer sweep: 46 test files that import the adapters, pin a claude command render, the manifest or the lock, plus `packages/core/test` | first run: 1193 `ok`, 1 `not ok` (96/02-00, F-02). After the fix, the red file and the edited suite re-ran: 57 `ok`, 0 `not ok` |
| `aof work validate 152` | PASS |
| `aof work doctor 152` | no `control-unresolved` at either severity (warns only: numbering-gap, rubric-join-unchecked, depends-edges-unchecked, all stream-wide) |

## Verification evidence

### `--show-candidates` on the real backlog writes nothing

Run from the repo root on the source tree (`aof --version` → `0.1.0 (source 6351dd66+dirty)`):

```
Can be promoted now (5), in order:
  1. memory-closes-the-loop (milestone, unblocks 2)
  2. a-halted-lane-is-reaped (story, unblocks 0)
  ...
Waiting (2):
  - episodic-memory-is-recallable (milestone) waits on memory-closes-the-loop (still in the backlog)
  - the-memory-wiki-stays-true (milestone) waits on memory-closes-the-loop (still in the backlog), episodic-memory-is-recallable (still in the backlog)
```

Exit 0. `git status --porcelain -- wiki/work` hashed identically before and after. The head and the
two-entry wait match PLAN.md's expected reading. `--show-candidates --next-item` refused as a
conflict, naming the three call shapes. `--next-item` was not run on the real tree.

verifies → `tasks/00_promote-lists-the-candidates.feature`, `tasks/01_promote-next-item-promotes-the-head.feature` (conflict refusal)

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | Flagged at review: the claude renderer (`adapters.mjs`) dropped `argument-hint` for all 32 commands, though every asset declares one and Claude Code shows it in the picker. Task 02's last scenario says the claude copy carries the hint; its step had been narrowed to check codex only | defect | important | fix in item | verify | fixed — the claude command frontmatter carries `argument-hint` as one JSON-quoted string (valid YAML even when the hint opens with `[`); 32 copies re-rendered, lock and manifest regenerated; the step now asserts the hint in the claude and codex copies. OpenCode's frontmatter has no such field, so its copy rightly carries none |
| F-02 | `story-plan-document` 96/02-00 went red: 152's `PLAN.md` @43 restated `test/work/stream/index.mjs`, a path `files:` declares. The story lane did not reach the stream-wide doc control | blast radius | blocker | fix in item | verify | fixed — the sentence names "the stream lane's index" instead; re-run green |

## Accept decision

**Accepted 2026-10-06.** All three tasks are green in the story lane, and `--show-candidates` was
measured read-only against the real backlog. The renderer sweep found one red outside the lane
(F-02), and the review's flagged gap (F-01) was fixed rather than carried. Both are fixed and re-run
green. Validate passes, doctor reports no unresolved control, and no blocker finding is open.
