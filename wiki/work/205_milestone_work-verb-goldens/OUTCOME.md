# 205 · What the aof work verbs print and change in a work stream is held to baselines over a fixture stream — Outcome

## Delivered

### The aof work verbs have a conformance suite that any store can run

Four registered golden lanes hold the read verbs' output and the write verbs' full stream change and refusals over one seed: 86 cases as 150 scenarios (m205/00, m205/01, m205/02, m205/03). Every case calls a public `aof work` verb, and only the file adapter knows the folder layout, so a store that supplies its own seed and export can run the same cases against the same baselines (FF-20501).

### Every whole-tree run compares the work verbs with their baselines

The golden index runs the four work-stream lanes beside 203's and 204's, so a change to a work verb's output or stream effect fails the regression gate. An intended change is updated through `scripts/golden.mjs` and reviewed as a baseline diff.

### Three of the stream's inherited reds are fixed

On this MacBook the bundle descriptor suite accepts the `template-variant` kind, `codex-ownership`'s retained-lane cases use the canonical temp path that Git reports, and the source-directory budget states the measured counts for `test/loop` (66) and `packages/foundation/src` (9). All three were red at 204's gate.

## Assumptions

- **A later store exports today's folder tree** — the baselines compare that tree byte for byte. A store that cannot produce it needs a reviewed decision on what the compatibility view is (ADR-001).

## Gaps

### The verbs run against a store other than files
- **Status:** open
- **Discharge condition:** a second adapter (the 208 store interface) materialises the seed and exports the stream, and the four lanes pass through it.
The suite is written to be reused, but only the file adapter exists, so nothing yet proves it runs against another store.
