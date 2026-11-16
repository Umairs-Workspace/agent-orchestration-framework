# 197 · Narrow impacted test selection and fix three Windows loop defects — Outcome

## Delivered

### Test selection follows no guessed edge
`aof test --scope impacted` selects suites through the graph's extracted edges only: an edge graphify marked `INFERRED` places no suite, directly or through the transitive closure, while `graph impact` and seam liveness still read every edge.

### Lane cleanup sends no `git clean`
A finished lane's cleanup reads its untracked heartbeat queues off `git status`, deletes each by path and then removes the tree, so an ignored `node_modules` is never walked.

### The runner's output tail rides the repair run
A grade halted by a non-zero runner exit carries the tail of the runner's output on the record of the repair run the halt starts, as `brief.halt.runner`.

### A lane starts with the primary's code graph
A dispatch lane is opened holding a copy of the primary checkout's git-ignored `graphify-out/graph.json`, with the graph's own build time, unless the lane already holds one or the primary has none.

## Gaps

### The output tail when repair is off
**Status:** open
**Discharge condition:** a loop halted on a grade with repair off (`--no-repair` or `work.loop.repair: false`) keeps the runner's output tail on a run record, which needs a writer the frozen run store does not have today.

### The code graph in a mesh worker's lane
**Status:** open
**Discharge condition:** a lane opened on a worker node, which has no primary checkout to copy from, starts with a code graph.
