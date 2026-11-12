# 192/00 · The map tells a fact from a decision — build plan

## Mechanism

Everything hangs off `map.mjs`'s three frozen vocabularies and the two places that read a label:
the question branch of `parseExampleMap` (class and state, by position) and `readExample` (the
bracket at the end of the line). Add the words to the vocabularies first, then teach each reader
the one new form: `researched F<n>` as a state with a pointer, exactly as `defaulted <pointer>` is
read today, and `[researched F<n>]` as a provenance that fills a new `finding` field, exactly as
`[stated Q<n>]` fills `question`. `EARLIER_LABEL` learns the new word, so two labels are still
never read as one.

The fail-closed readings do not move: an unknown class is still `business`, an unknown state still
`open`. Do not make an unknown class read `domain`. That default is the PO's, in prose (ADR-001 §5).

Who closes a question becomes one predicate over the class, used by the open-questions query. Keep
`openBusinessQuestions` answering what it answers today for a map that only says `business`, and
let the lane's story (01) decide what it calls. The research claims are a new query shaped like
`provenanceClaims`, without a token.

`readFindings` is a second, smaller walk in the same file. Reuse the map parser's line handling
(CRLF, the comment-block skip, the final newline) by lifting those few lines into a shared helper
inside the module, not by copying them. The module keeps zero imports.

No bundle asset changes here. The default template keeps teaching `business`, which the parser
still reads; the variant that teaches the new forms ships with the practice's beat, in 04.

## Verification step

From a scratch script, parse a map that uses every new form (a `domain` and a `policy` question,
a question in state `researched F1`, an example labelled researched F1) and read a research
document with one sourced and one unsourced finding: no malformed line, and the queries answer as
the contract says. Then run `aof work doctor 189/00 --json` and compare with a run from before
the change: a delivered `business` map must produce exactly the findings it produced.

A wrong build shows as a new `example-map-malformed` on a story nobody touched, or as
`aof work update --dry-run` planning a change to a template.

## Out of scope

- The doctor's messages and its new code — 01. This story must leave the lane compiling and its
  suites green, with behaviour unchanged for every map that exists today.
- Every word of prose and both template variants — 04, as fragments of the practice.
- A `domains` field on the question line — the question-quality lints that would read it are a
  later milestone's (SPEC, Out of scope).

## Known traps

- `test/examples/refine-discovery-beat.test.mjs` parses the default template through the real
  parser and counts its ten forms. Those cases must stay green untouched: if one goes red, an
  old form changed its reading.
- 134/FF-13402's sweep matches bracketed provenance labels and literal runs of the vocabularies in
  every runtime module. A test fixture string is fine; a helper in another `src` module is not.
- A delivered map that holds the bracketed word `researched` earlier in an example's text would
  newly report `bad-provenance`. Measured at refine: none of the 133 maps in the work tree does.
  Check again before changing `EARLIER_LABEL`.
