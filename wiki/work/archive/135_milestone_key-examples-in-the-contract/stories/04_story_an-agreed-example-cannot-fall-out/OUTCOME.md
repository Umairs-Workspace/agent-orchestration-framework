# 04 · An agreed example cannot fall out — Outcome

## Delivered

### Every agreed example is traced to the contract by its id
The examples lane's sixth code, `example-untraced`, is an error naming the story, the example, its line in `EXAMPLES.md`, its provenance and its rule. It fires for each `confirmed` or `stated` example that no scenario titled `E<n> · …` and no Examples row whose `example` cell is `E<n>` carries inside a group naming its rule. It says so when the carrier sits under a different rule. A `proposed` example is never required.

### The continue door refuses a story missing an agreed example
`aof work continue` on such a story is refused with `examples-question-open` (409), its detail listing the same `example-untraced` findings the doctor reports, and nothing moves or dispatches until the example is restored.

## Assumptions

- **The trace fires only on a contract formulated from the map** — the gate is on, the map is applicable, the story has tasks, and at least one task names a rule id; every contract written before 135 lints as it did.
