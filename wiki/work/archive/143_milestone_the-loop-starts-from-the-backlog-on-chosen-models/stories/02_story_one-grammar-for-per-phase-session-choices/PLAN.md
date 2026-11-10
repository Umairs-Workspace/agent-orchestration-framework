# 143/02 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

**The grammar** is one pure function beside `normalizeEffort`. Export the phase list once
(`SESSION_PHASES = ["refine", "continue", "verify"]`). The loop shell has its own `LOOP_PHASES`
copy today; story 03 replaces it with this one. Parse each value into
`{ phase | null, model?, effort?, flag }`:

1. Split on the first `=`. A prefix that is not a phase is `session-choice-unknown-phase`.
2. For `--model`, find the last `:`. If the suffix normalises as an effort, split there. Otherwise,
   if the rest starts with `:`, refuse `thinking-unknown-level`; else the whole rest is the model.
3. An empty model with no effort is `session-choice-empty`.

Then layer the parsed values into two tiers, unphased and phased. Within a tier, check each
(phase, part) slot for a second writer across both flags; a second writer is
`session-choice-conflict`, naming both raw values. Fold each phase as its phased tier over the
unphased tier, keeping the flag that set each part. Reuse `THINKING_UNKNOWN_LEVEL` and its message
builder; add the three new codes as exported constants beside it.

**The resolver.** Add `{ choice }` beside `{ thinking }`. Fold an unphased `thinking` into an
effort choice with `effortFlag: "--thinking"` when `choice` sets no effort. Then resolve each part:
the choice, then config, then the default. Keep the existing output keys and their order. Add
`modelSource` only when a model resolves. 141's outline rows must still match byte for byte.

**The parser.** In `parseSpecArgv`, take the key as everything before the first `=` and the value as
everything after it (`indexOf`, not `split("=", 2)`). For a flag with `repeatable: true`, push onto
`options[key] ??= []`. Nothing else changes.

**The control.** FF-14303 is a source scan in the house style of the session arch tests (strip
comments, then match definitions). It is registered in `test/arch/session/index.mjs`.

## The verification step

With `AOF_GLOBAL_HOME` set to a fresh temp directory, run through the test runner's `--only`: the
execution package's session-model suite (through its index), `domain-services`, the new face test,
the command-route and application-assembly suites, FF-7006 and the new FF-14303. Red-probe both
FF-14303 clauses. Every `aof` command parses through the changed face, so also run
`aof work loop 143 --dry-run --json` and `aof work find 143 --json` by hand. Both should answer
exactly as before.

## Out of scope

Calling the grammar from the loop or the drive (story 03). Any change to `work.agents.models`.
