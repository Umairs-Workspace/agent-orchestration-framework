# 203/02 · Update changes nothing it should not — example map
<!--
Drafted 2026-11-20 by the PO at refine's discovery beat. Grounding, measured the same day on
4cac6cd8 (ARCHITECTURE "Measured facts"): update on a fresh init skips all 232 planned files; over
a customised init it skips all 232; the three upgrade mutations update to 1 created, 1 updated,
1 deleted and 230 skipped, ending byte-equal to a fresh init apart from the lock's instants. Every
rule here is the SPEC's. No person was asked, so every example is proposed.
-->

## R1 · Update on a scenario's own output changes nothing
- E1 · `default`, then `work update --json`: the tree equals the `default` baseline, and the summary is 0 created, 0 updated, 232 skipped, 0 deleted, 0 drift-warning [proposed]
- E2 · Each of `claude`, `codex`, `opencode`, `all-practices`, `notion`, `hyperagent` and `customised`, then update: the same, each against its own baseline [proposed]
- E3 · The lock after update differs from the lock after init only in its instants, so it compares equal [proposed]

## R2 · Update keeps what the user changed, and says so
- E4 · Starting from the rebuilt `customised` tree, the user appends a line to `.claude/commands/aof/refine.md`: after update the line is still there, and the step reports `drift-warning` for that path [proposed]
- E5 · The user adds `.claude/commands/release.md`: after update it is byte for byte as written, and the step names no action for it [proposed]
- E6 · The user's settings and hooks entries from `customised` are still there after update [proposed]

## R3 · A tree from an older baseline updates to exactly the expected changes
- E7 · The rebuilt `default` tree, with `.claude/commands/aof/refine.md` holding one line of older text and its lock hash matching: update reports `update` for it, and the file equals the baseline's [proposed]
- E8 · The rebuilt tree holds `.claude/commands/aof/retired.md` with its lock entry: update reports `delete`, and the file is gone [proposed]
- E9 · The rebuilt tree lacks `.claude/agents/aof-qa.md` on disk and in the lock: update reports `create`, and the file equals the baseline's [proposed]
- E10 · All three together: the summary is 1 created, 1 updated, 1 deleted and the rest skipped, and the tree equals the `default` baseline [proposed]
- E11 · A rebuild of `work-update/customised-update`, whose step record reports a drift-warning, is refused, naming the scenario and the drifted path [proposed]

## R4 · The suite holds on any OS by construction
- E12 · Every scenario's files, given CRLF line endings and real instants, hashes and version, and its step records, given Windows temp paths in another case and JSON-escaped, normalise to exactly the committed baselines. Amended at verify, 2026-11-21: was a run on the Windows control node [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-006 · Is idempotence a baseline of its own? (No. It is a property of every init scenario: the tree must equal that scenario's baseline, and the summary must be all skipped.)
- Q2 · technical · defaulted ARCHITECTURE.md#ADR-006 · What is "the previous baseline"? (The committed one, rebuilt into a real tree with real hashes. Not a frozen past release, since every release is 0.1.0, and not git history, which a `git archive` copy lacks.)
- Q3 · technical · defaulted ARCHITECTURE.md#ADR-006 · How does a user edit happen between steps, when the harness runs only verbs? (The lane rebuilds the committed `customised` tree, applies the edit, and hands the result to the harness as starting files.)
- Q4 · technical · defaulted ARCHITECTURE.md#ADR-007 · Who runs the Windows check? (Superseded at verify, 2026-11-21: nobody. The Windows-shaped capture is made on purpose, on any OS.)
