# 152 · Promote shows what to promote next — build plan

Advisory, for the builder. The contract is the task `.feature` scenarios. The read and write sets
are in `STORY.md`'s frontmatter and are not repeated here.

## Mechanism

**One gate, asked of every row.** `classifyDepends(entries, items)` is a pure function inside
`createPromoteCommand`'s closure. Move it into a new leaf, `promote/candidates.mjs`, beside
`promotion.mjs`. `promote.mjs` imports it from there and keeps returning it from the factory, so
the core binding's destructure does not change. The same leaf exports
`promotionCandidates(items, readDoc)`. For every `number == null` row it reads the record doc's
frontmatter, the way `promoteRow` step (1) does, and calls `classifyDepends`. Rows with no
offenders are candidates. The rest are `waiting`, with the offenders as `waitsOn`. The leaf gets
`items` from its caller and never calls `listItems` itself, so the cache-read boundary pin
(`acd-cache-read-surface-boundary`) does not move.

**Unblocks.** Build the backlog edge map by slug: a backlog row's `depends:` entries that equal
another backlog row's slug, counted only when that slug is unique in the backlog, the same bound
`resolveBacklogEdges` uses. For each candidate, count the backlog rows reachable from it along the
reversed edges (a BFS with a visited set, so a cycle terminates). Sort by unblocks descending,
then `created` ascending (missing last), then `byGroupThenSlug`. Code-point `<` throughout, never
`localeCompare`, so the order is byte-stable.

**The verb.** `runPromote` gains `showCandidates` and `nextItem`. Validate the argument
combination first, before `listItems`. Show returns `{ candidates, waiting }`. Next takes
`candidates[0]`, refuses `promote-no-candidates` (409) when it is absent, and otherwise returns
`promoteRow(ctx, row, { at, atGiven, yes })` unchanged. The face adds a `Next candidate:` line
above the delivered render. The input schema drops `required: ["slug"]`, and the missing-slug
refusal keeps its code. Flags are camelCase keys (`showCandidates`, `nextItem`), as `next.mjs`'s
`throughReview` is. Spread `INSERT_FLAGS` into the spec; do not edit it.

**Render.** `--show-candidates` has its own human render, chosen by `faceCtx.options`. The JSON
face forward-slashes every `dir`, as the delivered face does.

**Bundle.** Edit `assets/commands/promote.md`, then run `aof work update` to render the three
runtime copies and the lock. Regenerate the manifest hash. The parity test bans `max` and `+ 1` in
that prompt, so describe the order in words ("unblocks the most" is fine).

## Verification step

With `AOF_GLOBAL_HOME` in a fresh temp dir, run `node scripts/test.mjs --only` over the new suite
(through the stream lane's index), `work-promote-mints-the-number`, the promote parity arch
test, `acd-one-promotion-engine`, `acd-cache-read-surface-boundary` and
`application-assembly`. Then install the payload (`--skip-ui`) and run `aof work promote
--show-candidates` from the repo root against the real backlog. Today's expected head is
`memory-closes-the-loop` (unblocks 2), and `the-memory-wiki-stays-true` should be waiting on two
entries. Check that `git status --porcelain` is unchanged afterwards. Do NOT run `--next-item` on
the real tree.

## Out of scope

- Ranking stream items: `aof work next` already answers "what to build next".
- Changing the depends gate, the mint, or the edge rewiring.
- A board/UI surface for candidates.
