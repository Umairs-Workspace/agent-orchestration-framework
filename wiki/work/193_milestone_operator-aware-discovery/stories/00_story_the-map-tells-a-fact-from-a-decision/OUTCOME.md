# 193/00 · The map tells a fact from a decision — Outcome

## Delivered

### The map tells a fact from a decision
A question in an example map is classed `domain`, `policy`, `technical` or `business`. A `business` question still parses and reads as `policy`, and an unknown class is still reported as `bad-class`.

### A fact can be closed by a cited finding
The map admits the question state `researched F<n>` and the example provenance `[researched F<n>]`. `researchClaims` lists every claim that cites a finding, and `openQuestions` lists every question still open, whatever its class.

### The research document has one reader
`readFindings` reads a research document's `## F<n> · <question>` headings, each marked sourced only when a non-empty `- **Source:**` line follows. An id used twice is reported in `duplicates` and resolves to nothing. `findingNamed` answers one finding by its id. The finding id and the document's name (`RESEARCH.md`) are spelt only in `map.mjs` (FF-19201).

### Every map already written reads as it did
Every `EXAMPLES.md` in the tree, the default template included, parses to its earlier value plus `finding: null` on each entry.

## Assumptions

- **A finding's specimen sits in a comment, not a fence** — `readFindings` skips `<!-- -->` blocks but reads a `## F<n> ·` heading inside a fenced code block as a real finding. The template variant 04 ships keeps its specimen in a comment.
