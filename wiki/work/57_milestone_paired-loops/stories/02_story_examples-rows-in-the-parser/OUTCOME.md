# 02 · Examples rows in the parser — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### Every parsed scenario carries its Examples blocks
`parseFeature` returns a sixth key on every scenario — `examples`, an ordered list of `{ header, rows, line }`, one entry per `Examples:`/`Scenarios:` block in the order the file declares them.

### The row count is data rows, never the column header
A block's `rows` is the number of pipe-delimited lines beneath its caption excluding the first, so an Outline is reported with exactly as many cases as a runner would execute — 1,217 blocks and 5,333 data rows across this tree, where the count was previously 0.

### A block's boundaries are the ones a reader sees
Blank lines and `#`-commented rows inside a table contribute nothing and do not close the block; a step, a tag, a docstring, or the next structural keyword does close it; and pipe-delimited lines inside a docstring are data, not a table.

### An absent table is an empty list, never an absence
Every scenario carries an array — an Outline with no `Examples:` block and a plain Scenario both report `[]` — so a consumer counts a zero rather than branching on a missing key.

### The five keys the parser already reported are byte-identical
Over all 803 feature files in the tree, `name`, `outline`, `lane`, `verification` and `line`, the tag resolution behind them, and the `firstViolation`/`freeTextLines` litmus verdict are deep-equal to the pre-story parser's output, with `examples` the only difference; key order is `name, outline, lane, verification, line, examples`.

### The parser's three production consumers are unchanged
`src/work.mjs`, `src/commands/tasks.mjs` and `src/work-doctor-rubric.mjs` are unedited by this milestone and name the new key nowhere; `executableScenariosOf` still defines an executable scenario without reference to rows.

### FF-5704, armed
`test/arch/acd-feature-parse-examples-additive.test.mjs` fails when the widening moves an existing scenario key, when it moves the litmus verdict without touching a key, when `examples` stops being an array on any scenario, and when any of the three consumers reads the new key — each leg observed red and restored.

## Assumptions

- **A table's first pipe-line names the columns** — the count subtracts exactly one line per block, so a malformed table written without a header row is reported one case short rather than being refused.
- **`Examples:` is only a table when it follows a Scenario Outline** — a block under a plain Scenario is parsed as it always was and contributes nothing, so a mis-declared Outline loses its rows silently rather than raising a finding.
- **The additive claim is scoped to the marker blocks the control can see** — `FF-5704` reconstructs its "before" by stripping this story's `ADR-005` markers from the current source, so it proves the widening additive and not the file unchanged; the stronger comparison against the real pre-story bytes was made once, at the accept gate (`F-57-02-1`).

## Gaps

### Nothing reads `examples`
- **Status:** open
- **Discharge condition:** `57/03` lands the contract-integrity ratchet, whose leg (a) counts Examples rows per scenario across a base commit and HEAD.
- The key is populated on every scenario in the tree and consumed by no production code path. No `aof` command's output, no validate finding, no doctor verdict and no rubric join changes because a row count exists.

### An Examples table is counted, never validated
- **Status:** open
- **Discharge condition:** a declared owner for table well-formedness — none is scheduled in this milestone.
- `rows` counts pipe-lines; nothing compares a block's column count against its header, checks that the placeholders in the Outline's steps appear as columns, or reports a table whose rows disagree in width. A malformed table yields a number rather than a finding.

### The additive guarantee has no standing control against a pinned base
- **Status:** open
- **Discharge condition:** a control that compares the parser's output against its bytes at a pinned base commit — the same base-resolution machinery `57/03` must build for the ratchet.
- `FF-5704` compares the current source against itself with the widening stripped. An edit to `src/feature-parse.mjs` outside the `ADR-005` markers moves both sides of that comparison together and is invisible to it; the HEAD-bytes differential that closes the gap today was run by hand at this gate and is not registered anywhere.
