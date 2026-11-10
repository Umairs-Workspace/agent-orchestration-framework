# 05 · The discovery beat — Outcome

## Delivered

### The discovery beat at the head of a story's Contract
With `work.examples.enabled` on, `aof:refine` drafts a story's `EXAMPLES.md` from the installed template before any `.feature`. It strikes every question the record answers, asks each remaining business question through `AskUserQuestion` with its `<ref> Q<n>` token and its context, and stops the Contract stage on any error-severity example finding.

### Briefs that propose and never label
The PO brief drafts the map and never writes `confirmed` or `stated` without a recorded answer on that token. The architect brief reviews every `technical` question and relabels one that is policy as `business`.

### `--autonomous` asks at its one stop
A business question never takes a default in the cascade. Every open one is asked at the single end review, and a story whose question goes unanswered stays at its Contract gate.

### The `EXAMPLES.md` template
`.aof/templates/work/story/EXAMPLES.md` is a legal map with no frontmatter (36 lines), carrying the `Not applicable:` line for a story with no rule a person owns.
