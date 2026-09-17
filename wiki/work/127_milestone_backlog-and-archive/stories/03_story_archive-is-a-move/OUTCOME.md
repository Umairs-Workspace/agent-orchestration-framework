# 127/03 · Archive is a move — Outcome

## Delivered

### The verb
`aof work archive <NN> | --done [--yes] [--json]` (`src/commands/archive.mjs`, `/aof:archive`)
moves an accepted driver's folder, name verbatim, from `<work.dir>/` to `<work.dir>/archive/`; it
refuses a ref that is missing, not a driver, in the backlog, already archived, not `done`, or
whose destination exists, and never touches a number. A `done` milestone moves with its stories;
a `done` story under a live milestone stays put.

### `--done` behind one gate
`--done` selects every `done` driver at the root and refuses without `--yes`
(`archive-confirm-required`, the candidate list in `detail`); with it, every candidate moves in
number order in one run and one envelope (`archived`, `rewritten`).

### The engine is the seam's fact-writer
`archiveItems` and `rewriteCrossingLinks` live in `src/work/archive.mjs` (`reindex.mjs`'s twin: fs
only, no effects, no number); the command reaches them only through `transitionStreamArchived` in
`src/effects/stream-transitions.mjs` — lock → move → `stream.archived` appended and drained →
publish — so the fleet cache follows through the existing publish-on-mutate row.

### Every crossing link resolves to what it did before
One rewrite pass over every `.md` under the work dir, syntactic (`](target)` only, fenced blocks
included, frontmatter never), rewrites exactly the relative inline links that cross the archive line
— a root-sibling `../NN_…` gains `archive/`, a link out of the moved folder gains `../` — preserving
each file's EOL and BOM; every link resolves to the same path after the move as before.

### Readers resolve by ref, path-readers by `findWork`
`find`, `doc`, `validate`, `doctor`, `depends` and `memory ingest` answer for an archived item at its
new `dir`; the two runtime readers of a live item path outside `wiki/`
(`acd-tune-carries-no-second-rule`, `acd-declared-program-single-speller`) resolve through
`findWork`, and 03's census suite names every later reader that reads a real item folder.

### Never automatic
`aof:verify` never archives: `verify.md` names `aof work archive <NN>` once, as the operator's next
act after the accept, and no other prompt names the verb.

## Assumptions

- **the fixture stream** — this story proves the verb on a fixture; the move over this
  repository's 125 done drivers is 127/05's act.
- **the `.aof/aof.lock.json` write** — declared here and re-stamped at the accept (127/VERIFICATION
  `F-13`): the loop's lane reconcile drops `.aof/`, so the lane's own stamp never reached the branch.

## Gaps

### `src/commands/archive-flags.mjs`
- **Status:** open
- **Discharge condition:** FF-11903's citation sweep stops reading a hypothetical module named by
  a red-probe scenario as a citation, or the ceiling row absorbs it by name (it does today,
  127/VERIFICATION `F-17`).
Task 05 names a module that exists only so the transitive leg can name a chain through it; it is
never landed, and the sweep counts it.
