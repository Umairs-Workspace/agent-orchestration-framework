# 125 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

The seam is `loopDocumentPath`. `src/loop-document.mjs` already owns the graph document's path and
the string that regenerates it, and story 79 built the check that holds the committed bytes current.
This story adds a reader of that seam and a deploy that runs behind that check — it adds no
composer, no second path derivation and no second comparison.

Where the reader may live is decided for you, and by a delivered control rather than by preference.
Story 79's drift check walks `src/` and asserts the document's reader set is exactly its own two
modules. The walk stops at `src/`, so a builder under `scripts/` — beside the release scripts, which
is where this repository already keeps build steps — imports the seam freely and reddens nothing. A
builder inside `src/` reds a delivered control the moment it lands.

The build itself is a staging step, not a renderer. It copies each manifest entry into a staged site
tree, prefixing front matter and a provenance line; Jekyll does the rendering, in CI, through
`actions/jekyll-build-pages`. Nothing generated is committed, which is what removes the whole class
of defect a committed copy would reintroduce — and why the `docs/` tree holds only the site's shell.

Two mechanism details that will cost you an afternoon otherwise. **Kramdown does not emit what
Mermaid looks for**: a fenced ```mermaid block arrives as `<pre><code class="language-mermaid">`, so
the layout has to promote those nodes before running Mermaid over them, and pin the version while it
is there. And **the workflow lint must normalise line endings at the read boundary** — the header of
the workflow lint suite records what happens when it does not: on a CRLF
checkout the per-line comment strip matches nothing, the lint reads the workflow's own prose as
configuration, and the result is red on Windows and green on Linux for a fact about the checkout.

The README control is the smallest piece and the one most likely to be over-built. It asks
`deriveRouteTable` for the route set and keeps no names of its own; its whole difficulty is the
extractor's bound, and the false-positive population is already measured in the task's own prose.

## The verification step

The claim this story lives or dies on is that **the published graph page cannot outlive the registry
it describes**. Prove it end to end rather than by inspection: change a loop record without
regenerating, run the workflow's gate the way the workflow runs it, and confirm the gate fails naming
the document and the regeneration command, and that the deploy job does not run. Then regenerate,
re-run, and confirm the deploy proceeds and the published page carries the new record.

Prove the placement claim the same way — by consequence, not by reading. Run story 79's control
unedited at the tip and confirm its reader-set assertion still reports exactly two members. If the
builder ever moves into `src/`, that control is the thing that says so.

The live site is the one thing no test can assert: the repository's Pages source must be switched to
GitHub Actions by the owner before any deploy lands anywhere. That is the `@uat` scenario in task 00,
and it gates nothing else — the gate job, the staging and both controls are green without it.

## Deliberately out of scope

No new design documentation is written and no ADR is re-litigated; this story publishes what is
already true. `AGENTS.md` is not touched — its silence about the loop machinery is real, but the
README is where the story scoped the repair. The site gains no search, no theme work and no
navigation beyond the landing page's links. And the graph document's own composition is untouched:
if the published page reads badly, that is a defect in the loop graph document itself and belongs to the
command that renders it, not here.
