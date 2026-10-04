# 135/02 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios. The read and write sets
are in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

All of it is in `parseFeature`'s one walk, alongside the existing `BEGIN/END ADR-005 examples`
blocks. Keep those markers, and add a matching pair for this milestone.

- **A current rule.** The `Rule:` branch already resets the scenario and returns to description
  state. It now also opens `currentRule = { name, line, tags: pending }`, pushes it to `rules`, and
  clears `pending`. A `Feature:` line clears `currentRule`.
- **Effective tags** for a scenario become `[...featureTags, ...(currentRule?.tags ?? []),
  ...pending]`. This one line changes `verification` and `lane` for scenarios under a tagged rule,
  and for nothing else. `tags` (every token, in file order) is untouched, so validate's vocabulary
  check still sees each tag once.
- **`scenario.rule`** is `currentRule ? { name, line } : null`. Copy the two fields so the
  scenario's `rule` does not alias the `rules` entry with its tags.
- **`Example:`** joins `SCENARIO_RE` as the bare-scenario synonym. `outline` stays false for it.
  Add a fifth entry to the header's "admissions beyond the contract" list, measured at 0 files.
- **Cells.** The table-row branch already counts rows. Split the trimmed line on `|`, drop the
  empty first and last pieces and trim each cell. The first row becomes `columns` and each later
  row is pushed to `cells`. `rows` stays the count.

**FF-5704 and its stripper.** `withoutExamples` in the support file removes `examples` from each
scenario before comparing against the frozen pre-Examples parser. Widen it to remove every
additive key: `rule` on scenarios, and the top-level `rules`. The FF's name and assertion stay; its
comment gains a sentence naming 135/ADR-003. Rule-scoped tags change `verification` only where a
rule carries a tag, and the corpus has none, so the deep-equality still holds over all 1,291 files. **Plan for the future corpus, though.** Once 05
lands, contracts will carry tagged rules, and the frozen parser leaks those tags. Have the FF
compare `verification` and `lane` only for scenarios with `rule === null` or whose rule carries no
tag, and say why in the FF's comment. Otherwise the first tagged rule anyone writes turns a
whole-tree control red.

## The verification step

With `AOF_GLOBAL_HOME` set to a fresh temp directory, run through `--only`: the two parser suites,
the strict-parse suite, FF-5704, `test/work/gate/work-validate-contract-parses.test.mjs` and the
`read.test.mjs` tasks projection. Then run `aof work validate` over the whole stream from the
repository root, which must give the same verdict as before.

## Out of scope

The board, the trace, and any reader learning the new keys (03, 04).
