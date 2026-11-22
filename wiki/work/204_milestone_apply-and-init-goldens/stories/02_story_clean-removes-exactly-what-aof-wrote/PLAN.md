# 204/02 · Clean removes exactly what aof wrote — build plan

Advisory and the builder's own. The task features are the contract.

## Mechanism

**Clean.** `createCleanPlan` walks the lock and deletes on a whole-file hash match. Split it on
the entry: an entry with no `ownership` keeps today's three outcomes. An entry with `ownership`
goes through the retraction apply already performs when a co-authored output leaves the plan.
That retraction is an empty desired output merged against the prior entry. Lift it out of
`planApplyActions` into one exported function, and have apply's stale-output path and clean both
call it.

Its result decides the action:
- the merge refuses because aof's fragment was edited → `drift-warning`, and the file and its lock
  entry are left as they are;
- the remainder holds nothing once empty containers are dropped → `delete`;
- otherwise → `retract`, which writes the remainder.

Keep "nothing left" as one small predicate per ownership kind, beside the merges in the Codex
settings module. Executing writes the remainder for `retract`, deletes for `delete`, then writes
the next lock as today.

**The step script.** The harness runs `lane.command ?? [aof]` for every step. Let a step carry
its own `command` that takes precedence, and record that script's repository-relative path in the
step record. The fixture script parses `<path> --append|--prepend <text>`, edits that one project
file, prints a one-line JSON envelope, and exits 1 naming the path when the file is absent. Prove
it in the harness self-test before any lane uses it.

**The lane.** `plain`, `customised` and `drifted`, as ADR-001's table gives them. `customised`
imports `USER_FILES` from story 01's lane. E9 (an edit inside aof's block) is a clean-suite case,
not a lane scenario, because an edit inside a block is not an append or a prepend.

## Verification step

Seam first: clean-suite cases for E4, E5, E8 and E9, then the FF-20402 case beside FF-15404's.
Then `node scripts/golden.mjs --lane assets-clean --update` and read each baseline. `customised`
must hold the user's Markdown files byte for byte. Its JSON and TOML files must parse to the
user's values (E5), which the suite asserts by parsing rather than by bytes. Re-run
`--lane assets-apply` and `--lane assets-merge`. Neither may move, because apply's stale path now
calls the lifted function and must behave the same.

## Out of scope

- Retracting aof's entries from `.claude/settings.json`, and pruning the journal (ADR-006 §1).
  Hold them.
- A `--force` for clean. It has none today.

## Known traps

- The merges may reformat JSON and leave blank lines in TOML. Byte equality holds only for the
  Markdown files. Assert parse-equality for the rest, and do not tune the merge to chase bytes.
- A hooks file aof created alone retracts to empty event arrays. That is "nothing left", so delete.
- The lock entry must go for `retract` too, or a second clean retracts again and refuses.
- Two new golden suite files and one new fixture script move two budget rows.
