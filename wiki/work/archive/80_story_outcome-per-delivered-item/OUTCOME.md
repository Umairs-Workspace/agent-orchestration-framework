# 80 · Every item that delivers says what it delivered — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004). States product
  STATE ("the system now IS X"), never motive. This is an ADDITIONAL artifact: it carries no identity
  frontmatter and is never this item's record doc — STORY.md remains that.
-->

## Delivered

### The OUTCOME template has one home, and it is filed under no type
The template ships once at `src/bundle/templates/shared/OUTCOME.md` and renders to
`.aof/templates/work/shared/OUTCOME.md`; `aof work update` carries a delete action for the
milestone-filed copy, so an existing install ends with one copy of the grammar rather than two. This
supersedes `m39`'s delivered statement that the template ships at
`src/bundle/templates/milestone/OUTCOME.md` and `.aof/templates/work/milestone/OUTCOME.md` — neither
path exists.

### aof:verify authors an outcome for a milestone, a story and a chore
Each of the three carries an `OUTCOME.md` in its own folder authored at Accept, whether a story sits
under a milestone or is parentless; a spike and a uat carry none, and both exclusions are stated in
the verify prompt rather than left as omissions.

### A chore states what its ticking made true, without becoming a story
A chore's deliverable stays its ticked `## Definition of Done`, and its outcome adds `## Delivered`
alone — the accept path for a chore reaches the shared template from its own dispatch branch, not
through the numbered process steps a chore never enters.

### A milestone's outcome is authored, never a concatenation of its stories'
The verify prompt directs a milestone's outcome to state what is true at the milestone level and to
cite a story's whole capability as `m<NN/SS>/<id>`; the aggregation happens in the index, where
`buildRecords` unions every item's records into one recall surface.

### The memory index reads an OUTCOME.md from any item that carries one
The scan is the whole item set rather than `type === "milestone" && parent == null`, so a parentless
story's, a nested story's and a chore's capability and gap records enter the same recall surface a
milestone's do.

### A delivery record cites its item by ref
A record carries its item's full ref in `item` (`"39/02"` for a nested story), so a recall renders the
citation as `m39/02` — the ref the citation grammar already expects — rather than `m02`, which is a
different, real milestone.

### An `--item` or `--only` scope matches the item and its subtree
A milestone-scoped recall or rebuild carries its own stories' delivery records, from one subtree rule
in the zero-import leaf `src/work-ref-scope.mjs` shared by `work doctor`'s `inScope` and both memory
scopes; an unresolved scope returns an empty block at exit 0.

### An OUTCOME.md is unbudgeted, whatever type carries it
`doc-over-budget` covers `SPEC.md`, `ARCHITECTURE.md`, `STORY.md` and `*.feature` and gains no kind
here, so a second Accept-time artifact anchors no finding at itself.

## Assumptions

- **An existing install runs `aof work update`** — the milestone-filed copy is removed by the update
  plan, so an install that never updates keeps a second, un-updated copy of the grammar on disk.
- **One parser reads the grammar** — `parseOutcome` is its only reader and the move kept the
  template's bytes identical, so there is no per-type copy able to drift from it.
- **A top-level item's ref and number are the same string** — every record that existed before this
  story keeps its `item` value, and only a nested item's record changes shape.
- **An empty `--item` is the user's intent to narrow** — the recall filter reads a present-but-empty
  scope as "match nothing", not as "unscoped", which is the opposite of what the `--only` rebuild
  reads it as.

## Gaps

### The parentless story's verification home
- **Status:** open
- **Discharge condition:** a parentless story writes its verification evidence, findings and accept
  block somewhere other than `STORY.md`, or `doc-over-budget` resolves a story's budget from whether
  it carries a parent.
Half (a) of story 74's finding F-74-F is not filled: `OUTCOME.md` gives delivered STATE a home, and the
verification record still has none, so this story's own `STORY.md` is over the 150-line budget.

### The subtree rule has two copies
- **Status:** open
- **Discharge condition:** `validateWork`'s scope closure imports `src/work-ref-scope.mjs`, which
  requires the ADR that FF-5301 demands for raising the session driver's root-inclusive reach from 21
  to 22.
The rule is one leaf with three importers plus one byte-identical private closure in `src/work.mjs`,
which carries a note naming this gap rather than silently duplicating it.

### A superseded delivered capability stays recallable alongside the one that replaced it
- **Status:** open
- **Discharge condition:** the index honours a recorded supersession, so a recall over "where the
  OUTCOME template ships" returns this story's capability and not also `m39`'s.
`m39`'s outcome is a delivered record of a done milestone and was not edited; both statements are in
the index, and the older one names two paths that no longer exist.

### A parentless story's lessons stay out of the index while its delivered state goes in
- **Status:** open
- **Discharge condition:** the `RETROSPECTIVE.md` scan reads any item that carries one, as the
  `OUTCOME.md` scan now does, and a parentless story's `R<n>` lessons appear in recall.
The widening delivered here covers `OUTCOME.md` alone; `RETROSPECTIVE.md`, `ARCHITECTURE.md` and
`AOF.md` are still read from top-level milestones only. Measured at this accept: story 74's five
recorded lessons and this story's five each contribute zero records.
