---
doc: verification
---
# 204 · What aof apply, init and clean write is held to baselines — Verification

## Fitness functions

Declared at refine (2026-11-21). FF-20401 landed with story 01 and FF-20402 with story 02, each as a
case beside FF-15404's, with a self-check case each.

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-20401 | `test/arch/store/acd-codex-output-ownership.test.mjs` | green (the control and its self-check), 2026-11-22, 204/01; green again at verify, the file 6 of 6 | red, 2026-11-22 at verify: apply's merge gated on `output.runtime === "codex"` again (`render-plan.mjs`) → the control's diff names `claude CLAUDE.md` and `claude .mcp.json`, each "refused: unowned target collides …", "records no ownership" and "drops the user's content". The same gate put back in `coAuthoredOutput` itself → the control reds on coverage, and its self-check on "claude AGENTS.md". Both reverted, files byte-identical to the backup. |
| FF-20402 | `test/arch/store/acd-codex-output-ownership.test.mjs` | green (the control and its self-check), 2026-11-22, 204/02; green again at verify | red, 2026-11-22 at verify: clean's ownership branch taken only when the file's hash differs from the lock's (`clean.mjs`), so a whole-file hash match deletes → "guidance src/AGENTS.md is planned delete, not retract or drift-warning", and the same for `.mcp.json` (mcp-servers), `.codex/config.toml` (toml), `.codex/hooks.json` (hooks), `CLAUDE.md` and `AGENTS.md` (guidance). Reverted, file byte-identical to the backup. |

## Verification evidence

Run at verify, 2026-11-22, on the uncommitted branch tree. Each suite ran by file through
`node scripts/test-shard.mjs` with its own `AOF_GLOBAL_HOME=$(mktemp -d)`. Every scenario in 204 is
`@executable`: there is no `@manual` or `@uat` scenario, and no UI surface, so no human step and no
design review applied.

- **The seven golden suites.** `assets-apply` 34/34, `assets-merge` 23/23, `assets-clean` 16/16,
  `project-init` 20/20, and 203's `golden-harness` 56/56, `work-init` 27/27, `work-update` 24/24.
  verifies → every `@executable` scenario and outline row of 204/00 to 204/03 (traceability checked
  at `aof work validate 204`), and 203's lanes unmoved.
- **The suites 204 changed.** `render-plan` 18/18, `clean` 3/3, `graph-rendered-faces` 6/6,
  `codex-ownership` 64/66. Its two reds are "156 — retained ancestor/diverged lane advances before
  native asset preparation" (`fatal: … is a main working tree`), red at HEAD: STATE records them on
  a clean `git archive HEAD` copy, and 203's gate row at `a984ebb0` names both.
- **The controls.** `acd-codex-output-ownership` 6/6 (FF-15404, FF-20401, FF-20402). Every
  `test/arch/testing` control: 13 files green; `acd-source-directory-budget` 7 of 10 red, every one
  naming `test/loop` (66 > 64) or `packages/foundation/src` (9 > 8), red at HEAD (203's gate row).
  No red names `test/golden`, whose row 204 raised 6 → 14.
- **The stream-wide controls a story run never selects** (203/R3): the plan ban
  `acd-plan-restates-no-declared-path` 6/6 and `story-plan-document` 17/17 (FF-9603), and
  `acd-purity-is-external` 12/12 (FF-11901).
- **`aof work validate 204`:** PASS. **`aof work loops validate`:** exit 0, warns only, none 204's.
  **`aof work doctor 204`:** exit 0, warns only, and no `control-unresolved` at either severity.

## Findings

Six measured behaviours, none blocking. Three are what ADR-006 holds in the baselines as today's
behaviour and files here, as the operator decided at refine. Recall at triage: one
`aof memory recall --kind finding --block` per finding, after `aof memory ingest`. No candidate
shared cause and evidence with F-01 to F-05, so each is a distinct incident; F-06 shares m203/F-01's
cause (recalls `e1a81326`, `8ef199d9`, `88f446d0`, `5a4c23e6`, `68898319` and `c16e66ca`, recorded on 204).

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | `aof assets clean` leaves aof's merged entries in `.claude/settings.json`, which the lock does not record, and leaves `.aof/aof.apply-journal.json`. Held by `assets-clean/plain` and `customised` (ADR-006 §1). Nearest recalled: m193/F-07, a deny-rule warning in the same file, a different cause. | product gap | non-blocker | defer: settings ownership in the lock is a story of its own | backlog | open |
| F-02 | A project doc that Codex and opencode both render to `AGENTS.md` refuses with "Generated output conflict", and so does an unscoped Codex rule beside an `AGENTS.md` doc. Held by `assets-merge/doc-conflict` (ADR-006 §2). Nearest recalled: m188/F-13, a `codex-output-conflict` from an absent `.codex/`, a different cause. | product gap | non-blocker | defer: whether two runtimes may co-author one guidance block is a product decision | backlog | open |
| F-03 | A single-runtime apply writes outside its runtime: every apply merges `.claude/settings.json` (`apply.mjs` calls the merge whatever runtimes are asked for), and a claude- or opencode-only apply writes `.codex/config.toml` when the config declares Codex settings (`adapters.mjs:107` gates on the settings, not the runtimes). Held by `assets-apply/claude`, `codex` and `opencode` (ADR-006 §3). | product gap | non-blocker | defer: a small story | backlog | open |
| F-04 | The Codex TOML merge's whitespace: over a user's config with a table, `model = "o3"` lands directly above the user's first table header with no blank line, and a retracted `.codex/config.toml` keeps the blank lines the merge added, ending in two blank lines. Both parse to the right value. Held by `assets-merge/customised` and `assets-clean/customised` (STATE, 204/01 and 204/02). | cosmetic | non-blocker | defer | backlog | open |
| F-05 | `checkCodexTarget`, `codexJournalPath`, `readCodexJournal` and `recordCodexApply` now serve every co-authored output, `CLAUDE.md` and `.mcp.json` included, under Codex's names, and `checkCodexTarget`'s `global` root is Codex's (STATE, 204/01). Correct today only because `assets apply --global` refuses. | naming debt | non-blocker | defer: a rename with no behaviour change | backlog | open |
| F-06 | A user's own file at a whole-file aof path is replaced by `assets apply` without a warning. Measured at verify: over a user's `.claude/agents/review.md` with no lock, the planner plans `update`, "existing file will be overwritten", with and without `--force` (`render-plan.mjs:92`). Named in ADR-006, exercised by no 204 scenario. Same cause as m203/F-01, which records it for `work init`, cited as its prior occurrence; this stays open beside it. | product gap | non-blocker | defer with m203/F-01 | backlog | open |

## Accept decision

**2026-11-22 · product owner (inline) · `aof:verify 204`.**

- **204/00 · accepted.** Every scenario green, the TOML merge fix held by `every-kind` and
  `re-apply` (E11 parses `model` at the top level). Its E9 amended by 204/01 (STATE), ratified there.
  No open blocker.
- **204/01 · accepted.** Every scenario green. FF-20401 green with its recorded red probe. No open
  blocker. F-02, F-04 and F-05 are deferred non-blockers.
- **204/02 · accepted.** Every scenario green. FF-20402 green with its recorded red probe. No open
  blocker. F-01 is a deferred non-blocker.
- **204/03 · accepted.** Every scenario green; init adds `/work/` to `.aof/.gitignore` through the
  additive owner, and `--global` writes only into the temp home. No open blocker.
- **204 (milestone) · held for the regression gate.** `aof work regression-gate 204` runs on the
  committed tree.
