# 210/03 · A milestone's whole tree runs at most twice, then hands over — Outcome

## Delivered

### Two gate launches per milestone
`aof work regression-gate <NN>` counts its original launches from the milestone's `REGRESSION.md`. Override, resume and not-launched rows consume none. It refuses a third launch unless given `--again` together with the operator's recorded affirmative answer to that launch's own `<ref> G<n>` question, read through the one answer reader.

### Gate failures carry their suite
A sharded gate row records the failing units' suite files. A serial gate's failures stay `file: unknown`.
