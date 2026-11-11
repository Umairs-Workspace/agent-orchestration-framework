# 143/00 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios, and nothing here binds.
The read and write sets live in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

One new step in the loop shell's `resolveInvocation`, ahead of `decideLoopScope`. When
`matchLoopScope` admits neither form, call `resolveItemExact(ctx, scope)`, which the shell already
has from its `items` service. Do not use `work:find`: it is a query and would guess. The exact
resolver is what the `continue.mjs` door already trusts. A row with `number === null` (strict equality, for the reason `continue.mjs`
spells out) is a backlog item. Anything else falls through to the existing refusal.

The four non-launch doors are checked first: `--dry-run` returns the probe with `wouldPromote` and
stops, and `--stop` / `--hand-off` / `--resume` refuse `loop-backlog-ref-not-running`. These all
branch in `run` and in the `launch` selector, so the check belongs where the scope is first read
on each path. Use one helper; do not copy it four times.

On launch, `invokeRegistered("work:promote", { slug })`, with no `at` (it appends; check whether
`yes` is needed for an append and pass it only if it is). A thrown `commandError` propagates
unchanged, so the promotion's own code and message are the loop's. Then replace the scope with
`created.ref`, keep the slug, and continue the existing path. Stash the slug where the declaration is
built (`declarationFor`). Narrate `Promoted <slug> → <ref>.` through the existing narrate seam,
before the `Thinking:` line.

In the engine, append `promotedFrom` to `buildLoopDeclaration` after `thinking`, with a comment in
the house style (the eleventh key, additive supersession). Also append it to
`recoverableDeclaration`, with a `null` default. The usability set stays at five keys. Story 01 and
story 03 also append keys, so do not pin the position number in a test; pin the key's presence and
its `null` default.

## The verification step

With `AOF_GLOBAL_HOME` set to a fresh temp directory, run through `scripts/test.mjs --only`: the
new backlog-scope suite, `work-loop-declaration`, `loop-command-refusals`, `loop-command-probe`, the
scope-guard suite and arch test, the declaration join suites, the new FF-14301 arch test, and
the application assembly suite (the inventory fixture). Then red-probe FF-14301.
Last, in a throwaway workspace with a backlog milestone, run `aof work loop <slug> --dry-run --json`
and check that nothing moved.

## Out of scope

Placing the promotion (`--at`). Promoting a backlog story or chore: the same path handles any backlog
row, but the scenarios exercise a milestone.
