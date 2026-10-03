# 01 · A whole-item refine in one drive — Outcome

## Delivered

### The refine scope is a loop setting with a per-run flag
`work.loop.refine` (`per-story` by default, or `whole-item`) lives in the loop's bounds leaf as one frozen member list (FF-14302). `aof work loop --refine` overrides it per run. The resolved value is the declaration's `refine` key, a resume inherits it, and every LoopState answer carries it.

### Under `whole-item` the break-down drive is the whole cascade
For a milestone with no stories, the loop's refine drive composes `/aof:refine <ref> --solo --autonomous`. `--autonomous` reaches the session through both drive seams (in-process and the child's argv). A re-entered break-down refine keeps it, because the decision and the re-entry share the engine's `isWholeItemCascade`. `aof work drive refine <ref> --autonomous` is the same drive from the CLI.

### `per-story` is today's loop
Under the default, every decision and every composed prompt is byte-identical to the pre-143 loop.

## Assumptions

- **A part-finished cascade is finished per story** — when a whole-item refine stops before every story has its contract, the loop's ordinary per-story refine drives author the rest (ADR-002 §4).
