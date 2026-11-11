<!-- Build brief — advisory, the builder's alone. The task features are the contract. -->
# 190/03 · The doors stop prescribing repeat runs — build plan

## Mechanism

Prose only, edited at the bundle's sources. The seam is the marked regions the suites already cut:
- `<build_terminator>` and `<review_lanes>` in `continue.md`;
- the UAT paragraph near the head of `verify.md`, and the regression-gate bullets under its
  `<progress_tracking>`;
- step 2 of `review.md`'s process.

Each door keeps its one `aof test --scope impacted --story <ref>` line exactly as it is. The suites
match that spelling, and so do agents. What changes is the sentence after it, which says what an
answer from the record is: the evidence, not a cache to be distrusted. In `<review_lanes>`, delete
the paragraph that justifies the lane's test time with the 58.6% / 54.3% / 45.6% measurements and
replace it. Those numbers describe the cost this milestone removes.

Mirror each edit into the matching `<!-- variant:… -->` section of
`packages/core/assets/variants/codex/workflow.md`. Then run `aof work update` to render. Never edit
`.claude/` by hand.

## Verification step

After `aof work update`:
- `grep -n -- "--fresh" .claude/commands/aof/*.md` finds only the flake sentence;
- `grep -n "across the accepted milestones" .aof/templates/work/uat/SESSION.md` finds nothing;
- the declared-test suite and `acd-prompt-gate-ladder-parity` are green.

A wrong result looks like the Codex variant still carrying the old review-lane paragraph. That
means the mirror was missed, and `bundle-runtime-variants.suite.mjs` will say so.

## Out of scope

- Any wording about tiers. ADR-004 declares none, so the prose names none.
- `manual.md` and `teach.md` — each already runs `aof test` once per run.
