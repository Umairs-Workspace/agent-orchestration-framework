# 192/04 · Discovery researches before it asks — build plan

## Mechanism

This story is prose, shipped the way milestone 193 makes possible: as members of the
specification-by-example practice's own bundle fragment, each naming the slot it fills and the two
keys that turn it on, `work.examples.enabled` and `work.examples.operatorAware`. Read 193's
ARCHITECTURE before anything else; it decides where a fragment's body lives and how a variant
replaces another. This plan says what goes in them.

The operator-aware beat is a variant of the discovery beat 193 moved out of core, for the same
slot, and it replaces it. Start from a copy of that fragment and keep its order: the PO drafts,
the architect reviews, strike, the main session asks, the driven paragraph, the doctor. Then:

- The drafting and architect sentences change their vocabulary: three labels, and `domain` as the
  default for a question the PO cannot place.
- One new step after "Strike before asking" reads the profile and the item's domains, gives the
  level table, and sends the domain questions below `expert` to one researcher pass. It says what
  a finding does to its question: settle it, or turn it into a `policy` question.
- The asking sentence gains the question's shape: `I would pick:` always, `Background:` below
  `expert`. The driven paragraph gains where `Background:` goes and that it counts toward the
  length it already names.
- One new paragraph after it is the batch.
- The fragments for the `--autonomous` and output slots each gain a sentence: the batch joins the
  one end review, and the hand-back lists what research settled and names an undeclared profile.

Two things need a slot core does not have yet: the role sentence, where refine says who plays the
roles, and the researcher brief, which has no gated prose today. Add the slot to the core source
and its Codex body, and nothing else.

Teach by pointing. The map's forms live in the template variant and the finding's form in the
research variant; the beat names them and restates neither. Each brief fragment gets its half and
no more. Write each Codex body by hand, in that runtime's voice (the native question tool).

## Verification step

Render three scratch projects: switch on, discovery on with the switch off, and discovery off.
Diff the second against a render taken before this story: it must be empty. Read the first: the
beat is there, once, with no sentence of the classic beat beside it. Then do the one check a
render cannot: in the first project, with a profile that lists one domain as `new`, run
`/aof:refine` on a story with one real fact and one real decision in it. The fact must come back
as a researched example in a batch, with a source; the decision as a question with `Background:`
and `I would pick:`. That run is also the milestone's `@manual` check, so record what was asked.

A wrong build shows as a non-empty diff in the second project, as both beats in the first, or as
a batch that opens with a `Q<n>` token and so anchors an answer it should not.

## Out of scope

- The slot and fragment mechanism, and moving the classic beat out of core — milestone 193.
- A glossary, a "not mine to decide" answer, quality lints, and learning the profile from answers
  — all deferred by the SPEC.
- The loop's general ask instruction in `session-driver.mjs` — it already carries the pick.
- Turning the switch on in this repository — the operator's call, not a build step.

## Known traps

- The fragment paths in `files:` are a guess made before 193 was refined. If 193 puts them
  elsewhere, stop and settle the write set with `aof:refine 192/04` rather than writing outside it.
- `acd-prompt-bounds-name-their-home` holds every number a prompt states to a home in code. Add no
  new number to the prose.
- A variant that replaces a fragment must carry everything the original did that still applies
  (the token, the doctor stop, one question per driven ask). Diff the two before deleting a line.
- FF-19204 compares renders byte for byte. A slot added to a core source must render to nothing
  when empty, trailing newline included.
