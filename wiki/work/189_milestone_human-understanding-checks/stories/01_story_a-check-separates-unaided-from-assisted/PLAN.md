# 189/01 · Build brief

## Mechanism

Two frozen lists join `vocabulary.mjs`, after teaching's three, with the header comment extended.
`grill-me.md` gets its `<checks>` region (one paragraph per kind, each naming its reference, then
the unaided-first rule, the help ladder and the result words) and its `<summary>` region (the two
halves, the help-during-the-build rule, the limits line and disagreement).

FF-18902 is a second exported check in `acd-teach-vocabulary-one-home.test.mjs`, beside
`missingEntries`. It is pure over text, so the verdict-word probes run over planted text. A rung is
matched as a whole phrase on word boundaries, as FF-17903 does already.

`grill-me-guide.suite.mjs` cuts the two regions and holds each scenario's sentences, in the style of
`teach-guide.suite.mjs`. In `teach.md`, add one line to the `taught:` outcome only, and one row to
`teach-frame.suite.mjs` to pin it.

## Known traps

- `grill-me.md` must not spell `Forming` or `Dislodging`. FF-17903 already fails on any other bundle
  asset that does.
- Write the verdict words out of the `<summary>` region entirely. "No score" still spells `score`,
  so the summary says "no single number" instead, and the ban on grades lives in `<checks>`.
- The status meanings must match what the statuses really mean: `in-review` means review was clean,
  not that it was accepted.

## Verification

The learning package's suites and the vocabulary control are green, and FF-18902's red probe is in
the register. `aof work update` re-renders `.claude/commands/aof/grill-me.md` and `teach.md`.

## Out of scope

A live session (02). Any stored result: the summary is terminal text only (ADR-002).
