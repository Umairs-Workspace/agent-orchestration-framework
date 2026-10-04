# 135/04 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios. The read and write sets
are in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

**The readers, in `map.mjs`.** Three pure exports beside `mapToken`. `readExampleRef(scenarioName)`
returns `E<n>` when the name starts with `E<n> · `, using the map's own separator. `readRuleRef(title)`
does the same for `R<n> · `. `EXAMPLE_COLUMN = "example"`. Every id pattern stays in this file
(FF-13402). The parser only reports names, rules and cells (02).

**The trace, in the lane.** `examplesFindings` gains a `featureTexts` input (a `{ file: text }`
map, the shape the snapshot row already carries). It parses each text with `parseFeature`, then:

1. Builds the carriers. For each scenario, its group is `scenario.rule?.name ?? parsed.feature`,
   with `groupRule = readRuleRef(group)`. The scenario carries `readExampleRef(scenario.name)`, and
   each Examples block whose `columns` include `EXAMPLE_COLUMN` carries that column's cell from
   every row. Collect `{ id, groupRule, file, line }`.
2. Applies the scope (ADR-004 §4). If the map is not applicable, there are no texts, or no carrier
   group has a `groupRule`, add nothing.
3. For each `confirmed` or `stated` example, in map order: resolved if some carrier has its `id`
   and `groupRule === rule.id`. Otherwise push `example-untraced` at `severityFor(status)`. If the
   id was found under another group, name that rule (or "outside rule R<n>") in the message.

`examplesGroup` passes `item.featureTexts`. No snapshot change is needed.

**The door** (`build-door.mjs`, 01's move of `refuseOpenExamples`) reads `tasks/*.feature` from the
story's directory into the same map and passes it in. It still refuses on *any* error, so the
operator's ruling (Q1) needs no new branch, only the input. The refusal code stays
`examples-question-open`. Its message lists each finding's code, which already says "untraced".

**FF-13502** (`acd-example-trace-declared.test.mjs`): comment-strip the package's sources. Assert
that the lane reaches example ids only through `readExampleRef`, `readRuleRef` and `EXAMPLE_COLUMN`,
and that nothing compares an example's `text` to a scenario's name or steps (no `.text` of a map
example flowing into an `includes`, `===` or regex). Run a red probe: add
`scenario.name.includes(example.text)` to the lane and read the failure.

## The verification step

With `AOF_GLOBAL_HOME` and `CLAUDE_CONFIG_DIR` set to fresh temp directories, run through `--only`:
the package's index, `test/examples/doctor-examples-lane.test.mjs`, `continue-door-examples.test.mjs`,
every examples arch control and FF-12402. Then, from the repository root on a freshly
installed payload, `aof work doctor --json` must report no `example-untraced`. On a scratch copy of
03, delete its `E1 · …` scenario: `aof work doctor 135/03` names it only if 03's map holds an agreed
E1. It holds only proposed examples, so expect silence, which is itself a check of R2.

## Out of scope

Wording fidelity between a map row and its scenario (review's job), and dangling ids (map Q2).
