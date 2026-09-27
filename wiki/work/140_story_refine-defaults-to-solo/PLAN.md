# 140 · build brief

Advisory and the builder's. The task features are the contract, and the frontmatter holds the
read and write sets.

## The mechanism

There are two seams, and neither needs a new key.

1. **The loop's seam is `loopAgentModeFromConfig(workspace, phase)`** in the bounds home. The drive
   is its only caller: it passes the answer to `phaseCommand`, which already turns `"solo"` into
   `--solo`. Add a frozen per-phase default beside `LOOP_AGENT_MODES` and apply it inside
   `loopAgentModeFromConfig` when the phase's key resolver answers `null`. Leave the key resolvers
   and both registry maps alone, because the range probe and the tuner step from `null` and FF-12901's
   single-home legs pin it. The drive's code does not change; its header comment does (it still
   says "unset → no flag").
2. **The hand-run seam is prose.** Each prompt's `**Execution mode.**` paragraph gets an explicit
   unset branch (refine → solo, continue → orchestrated) and replaces its "composes nothing when
   it is unset … falls back to `work.agents.mode`" sentence with the loop's composition. Refine's
   story-Contract bullet gains the one-QA-per-story rule. In `autonomous.md`'s `work.loop.concurrency`
   paragraph, the modes stop falling back to their twin while the lane bound keeps its fallback.
   The schema description follows.

## Order that keeps the tree green

- Bounds default first, then the drive-row tests, then sweep the `test/loop/` directive literals.
  The literals are mechanical: a drive-composed `/aof:continue 03/01` becomes `… --solo`. Do NOT
  touch a literal that is a mesh directive or a brief INPUT (`command:` handed into a driver or
  brief builder); nothing composes a flag onto those.
- Rename a re-pointed 129/07 case to `140/01 …` (drive) or `140/00 …` (prompt) so traceability
  names the item that owns the rule. Leave 129/07's override cases and its "ADR-001 §5 records the
  amendment" case alone; 129's ARCHITECTURE is not edited.
- Prose next, then `aof work update` and `node scripts/generate-bundle-manifest.mjs`.
- `.aof/aof.config.json` last, and by hand: the lane reconcile resets `.aof/`.

## Verification

Focused runs only, isolated (`AOF_GLOBAL_HOME=$(mktemp -d)`), through `node scripts/test.mjs
--only <files>` over the declared test set. Never use `--scope impacted` or a full suite; this
machine's live daemon holds `:4182`.

End to end, after the config change: `aof work drive refine 140 --dry-run --json` answers
`--solo`. Today it answers `--orchestrated`, which is the pin task 02 removes. `aof work drive
continue 140 --dry-run --json` answers `--solo` both before and after.

Task 02 needs the operator's repository list. Ask for it once, show the per-repository removals,
and write nothing until they approve.

## Out of scope

The mesh assignment directive and the local answer of `aof work continue|refine` both stay
flagless. `assimilate-code`, `migrate` and the `autonomous` wrapper keep their orchestrated default.
