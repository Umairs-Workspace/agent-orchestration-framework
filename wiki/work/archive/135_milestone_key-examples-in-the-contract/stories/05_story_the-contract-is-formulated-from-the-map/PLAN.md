# 135/05 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios. The read and write sets
are in `STORY.md`'s frontmatter and are not repeated here.

## The mechanism

**One paragraph in `refine.md`.** The story Contract's **Formulation** paragraph gains a conditional
sentence block, placed before "PO writes the headline Scenarios", that applies only when discovery
ran and the map is applicable. It says, in order:

- The PO reads the map first.
- One `Rule:` per map rule, titled `R<n> · <the rule>`.
- One headline scenario per key example under its rule, titled `E<n> · <the outcome>`.
- QA's outlines inside the same rule. A row restating a map example carries the id in an `example`
  column, and where a map row and a table row say the same thing the map row is the headline.
- Every agreed example must be carried, because the doctor's `example-untraced` names any that is
  not.
- The fallback: one feature per rule, titled `Feature: R<n> · …`, for a runner that does not bind
  `Rule:`.

The existing sentence stays the default for every other story. Keep the solo/orchestrated
paragraph untouched.

**The briefs.** `aof-product-owner.md` gains the PO half (the `Rule:` blocks and headlines from the
map). `aof-qa.md`'s test-case design line gains the QA half: tables under the rule, the `example`
column, and the edges only where a headline already says it. Keep each to a sentence or two. These
briefs are loaded on every spawn.

**The guide.** `wiki/acceptance-criteria.md`'s "Before the zoom levels" section gains a short
paragraph: key examples are the headline, the matrix covers the edges, a rule lives in a `Rule:`
block, and a short Gherkin specimen (one rule, one headline, one outline with an `example` column).

**Render and pin.** Update `manifest.json`'s hashes for the three sources, then run `aof work update`
so the rendered copies match. Extend `refine-discovery-beat.test.mjs` with this story's cases. They
pin content, not wording, in the same way: section presence, the id forms, the conditional, and the
fallback. Byte-identity of each rendered copy comes from `aof work update --dry-run --json`
answering `skip`.

## The verification step

With `AOF_GLOBAL_HOME` set to a fresh temp directory, run through `--only`: the extended discovery
suite, the bundle manifest suite (`packages/core/test/bundle.suite.mjs`) and the doc-budget lane.
Then run `aof work update --dry-run --json` from the repository root and confirm every copy reports
`skip`.

## Out of scope

The trace's code (04) and the board (03).
