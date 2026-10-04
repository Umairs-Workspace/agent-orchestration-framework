# 04 · The readiness gate — Outcome

## Delivered

### The examples doctor lane
With `work.examples.enabled` on, `aof work doctor` reports a story's map through five codes: `example-question-open`, `example-provenance-unanchored` and `example-map-malformed` (errors while the story is open, warnings once done), and `example-rule-no-example` and `example-map-too-many-rules` (warnings).

### The map's budget row
`EXAMPLES.md` has its own `examples` budget kind, 50 lines by default, governed by the doc-budget lane like `PLAN.md`.

### The continue door
`aof work continue` on a story refuses with `examples-question-open` while any error-severity example finding stands, naming the findings, before the build starts.

### Off is today
With the gate off, the doctor reports no example finding, no snapshot row carries a map, and the door refuses nothing (FF-13403).
