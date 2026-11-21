# 01 · Every init scenario renders to its baseline — Outcome

## Delivered

### `aof work init` held to committed baselines in eight scenarios

The `work-init` lane (`test/golden/work-init.lane.mjs`) holds `default` (three runtimes, stored whole), `claude`, `codex` and `opencode` alone, the `all-practices`, `notion` and `hyperagent` profiles, and `customised` (a project holding the user's own files), each but `default` as a delta over `default`. The global home stays empty in every scenario.

### A render that is the same bytes on every run

`default`, run twice in two temp roots, is byte-identical once only `eol`, `temp-paths` and `instants` are normalised, so no hash rule can hide an ordering change.

### Every edit to generated output shows as a reviewable diff

One reworded sentence in `packages/core/assets/commands/refine.md` fails the lane as one hunk in each render of refine, and accepting it rewrites only those `.golden` files (203/01 task 04 evidence).

### Today's first-time `init` over a user's own files, on record

The `customised` baseline holds that the user's own files and merged settings and hooks survive `init`, and that a user file at an aof path is replaced and reported as `update` (m203/F-01).

## Assumptions

- **Eight scenarios stand for the cross product** — the three single-runtime inits together hold exactly the three-runtime tree (203/ADR-005).

## Gaps

### Codex's refine skill
- **Status:** open
- **Discharge condition:** the Codex variant renders from the same command source, or a decision records that it stays a separate copy (m203/F-02).
An edit to `commands/refine.md` does not reach Codex, whose refine skill renders from `packages/core/assets/variants/codex/workflow.md`; the lane shows it but does not prevent it.
