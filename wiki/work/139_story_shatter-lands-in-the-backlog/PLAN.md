# 139 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios; nothing here binds, and a
deviation from it is not a finding. The read and write sets live in `STORY.md`'s frontmatter and are
not repeated here.

## The mechanism

Three code seams and one prompt. All three seams are about what a `depends:` entry IS, and the
order they land in matters.

**First, the vocabulary, in `src/work.mjs`.** Two small exports beside `applyItemFrontmatter`:
the all-digit predicate that says an entry is a number, and the surgical per-entry rewriter that
`reindex.mjs` holds privately today (`replaceFrontmatterBlock` + `rewriteToken` +
`applyDependsRewrite`). Generalise the rewriter to take the caller's mapping from an entry's
unquoted core to its replacement, or `null` for "leave it". It keeps each entry's spacing, quotes
and zero-pad width, and does no arithmetic of its own. `src/work.mjs` must not gain an import.
`reindex.mjs` then calls it with the shift map, filtered through the predicate — that one change is
task 02's whole shift fix.

**Second, promote.** After the stamp (step 9) — never before the seam — list the backlog rows, drop
the promoted one, and only if its slug was unique among the PRE-move backlog rows, rewrite every
entry equal to the slug to `padded`. Use the `items` snapshot promote already takes for
uniqueness. Re-list afterwards for the dependents, because the promoted folder has moved.
Collect `{ ref, dir }` per doc actually changed. Order by the backlog label `backlogLabel` already
computes. Attach `rewired` to the result only when non-empty, and have the `json` face
forward-slash its dirs. `runInsertTopLevel` keeps returning its four keys. `classifyDepends` swaps
its inline regex for the predicate, and `dependsRefusal`'s backlog line changes its words only.

**Third, validate.** Beside the driver graph, build a backlog slug graph in slug order over rows
with `number == null`. It is a separate `Map`, as the per-parent story graphs are, and `findCycle`
takes it unchanged. The dangling check runs inside the scoped loop. The cycle check runs after it,
at `<work>/backlog`, unscoped. The numbered path's graph build and check 3a read entries through
the predicate. The stream-slug hint needs a slug → padded-number lookup over numbered
`isDependTarget` rows.

**Then the prompts.** Rewrite shatter's steps 2, 3, 5 and 6, add step 7 and the output line, and
touch nothing between the `**Recall prior lessons first` lead and step 2. `aof:add-milestone` is
the model for the backlog folder, the bare `number:` and the intake branch. Refresh the renders
with `aof work update`, never by hand.

## The verification step

Focused suites first, always with `AOF_GLOBAL_HOME` set to a fresh temp dir, through
`node scripts/test.mjs --only`: the promote, three-root and reindex-rewrite suites under
`test/work/stream/`, `test/planning/planning-prd.test.mjs`, and the controls this touches —
`acd-one-mint`, `acd-intake-write-side-only`, `acd-number-null-safe`,
`acd-learning-edge-reaches-every-cut`, `acd-declared-writes-include-generated-siblings`. Never
`--scope impacted`: a story touching `src/work.mjs` widens to the whole tree.

Then task 04, which is the story's real proof: shatter the Acme Notify PRD in a scratch project
under each intake with the CLI from this tree, and read the backlog, the envelopes and the refusals
at the source. The `rewired` envelope and the `[01]` lines on disk are the two things to see with
your own eyes.

## Out of scope

- `nextWork`'s readiness walk and the doctor depends lane keep their `Number.parseInt`; validate
  now reports the only state that fools them.
- `list`/`find` showing what a backlog item waits on — promote's refusal names it.
- Slug `depends` on `aof:add-*`, and a scalar `depends: gamma`.
