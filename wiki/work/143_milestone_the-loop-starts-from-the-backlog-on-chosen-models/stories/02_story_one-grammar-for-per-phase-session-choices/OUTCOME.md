# 02 · One grammar for per-phase session choices — Outcome

## Delivered

### One grammar for `--model` and `--thinking`
`parseSessionChoices` in `packages/execution/src/session-model.mjs` reads `--model [<phase>=][<model>][:<effort>]` and `--thinking [<phase>=]<effort>`. It splits a model from its effort on the last `:` only when an effort spelling follows, so a Bedrock-style `…-v1:0` id stays a model. An unknown phase, an unknown effort, an empty choice or two values for the same part of the same phase are refused (`session-choice-unknown-phase`, `thinking-unknown-level`, `session-choice-empty`, `session-choice-conflict`). A phased value beats an unphased one.

### Each part of a phase's session resolves on its own, and says where it came from
`resolveSessionLaunch` resolves the model and the effort separately: the flag, then `work.agents.session`, then the default (`high`, and no model). It reports `modelSource` beside `effortSource`. `parseSessionChoices` and `resolveSessionLaunch` are defined only in the session leaf (FF-14303).

### A string flag can be given more than once
A CLI flag declared `repeatable: true` collects every occurrence into an array. An inline `--flag=a=b` value keeps everything after the first `=`, including in the two hand-rolled parsers in `knowledge/src/memory.mjs` and `mesh/src/commands/session.mjs`.

## Gaps

### Two hand-rolled argv parsers beside the one spec parser
- **Status:** open
- **Discharge condition:** `knowledge/src/memory.mjs` and `mesh/src/commands/session.mjs` parse through `parseSpecArgv`.
Both parsers carry the inline-value fix, but they still parse argv by hand rather than through the CLI's spec parser (F-143-04).
