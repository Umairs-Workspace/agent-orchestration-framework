# 193/04 · Discovery researches before it asks — build plan

## Mechanism

This story is prose, shipped through milestone 192's mechanism (read 192's ADR-001, ADR-002,
ADR-004 and ADR-005 before anything else). In the package's bundle fragment, declare a second
practice, `operator-aware`, beside `discovery`, with both keys, `work.examples.enabled` and
`work.examples.operatorAware`. A fragment names that practice, never a key. Bodies live under
the package's `fragments/operator-aware/`, one file per target and a `.codex` twin, each slot's
body under its `<!-- fragment:<slot> -->` line, as discovery's do.

Every discovery fragment that says `business` gets an operator-aware counterpart that `replaces`
it (ADR-006 §8 lists them): the beat, the formulation, the cascade, the hand-back, the Codex entry
rule, and the PO and architect briefs. Start each from a copy of the one it replaces and keep its
order. Then, in the beat:

- The opening gate sentence reads both keys (192/ADR-005 §5).
- The drafting and architect sentences take three labels, and `domain` as the default for a
  question the PO cannot place.
- One new step after "Strike before asking" reads the profile and the item's domains, gives the
  level table, and sends the domain questions below `expert` to one researcher pass. It says what
  a finding does to its question: settle it, or turn it into a `policy` question.
- The asking sentence gains the question's shape: `I would pick:` always, `Background:` below
  `expert`. The driven paragraph gains where `Background:` goes and that it counts toward the
  length it already names.
- One new paragraph after it is the batch.

The formulation counterpart adds `researched` beside `confirmed` and `stated` as an example that
must be carried; the cascade and hand-back counterparts say `policy`, add the batch to the one end
review, and list what research settled and an undeclared profile.

Two fragments fill slots core does not have yet: the role sentence (`config.roles`, inline, after
"you are the architect, the QA and the developer in turn") and the researcher's half
(`ownership.research`, inline, after its ownership line). Add each marker to the common source and
to its section of the Codex workflow, and nothing else in core.

The template variants are two `template-variant` members: `story`/`EXAMPLES.md` and
`milestone`/`RESEARCH.md`.

Teach by pointing. The map's forms live in the template variant and the finding's form in the
research variant; the beat names them and restates neither. Write each Codex body by hand, in that
runtime's voice (the native question tool, the `needs_input` fallback discovery's Codex beat has).

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

- The slot and fragment mechanism, and moving the classic beat out of core — milestone 192.
- A glossary, a "not mine to decide" answer, quality lints, and learning the profile from answers
  — all deferred by the SPEC.
- The loop's general ask instruction in `session-driver.mjs` — it already carries the pick.
- Turning the switch on in this repository — the operator's call, not a build step.

## Known traps

- `replaces` takes one fragment id, of this package, with the same target and slot. A counterpart
  that also needs to keep some of the original carries that text itself: diff the two before
  deleting a line (the token, the doctor stop, one question per driven ask, Codex's `needs_input`).
- 192's suites that pin the shipped practices as exactly `discovery` and `build-brief` go red the
  moment the practice is declared. Move them in the same change; they are in `files:`.
- `acd-prompt-bounds-name-their-home` holds every number a prompt states to a home in code. Add no
  new number to the prose.
- FF-19204 compares renders byte for byte, and 192/FF-19205 holds that a slot leaves nothing
  behind. A new inline slot must render to nothing when empty, trailing newline included.
- 192/FF-19206 refuses a load where a runtime's texts carry a slot and a fragment has no body
  for it. Both new slots are in the Codex text, so every operator-aware fragment for them has a
  Codex body.
- Keep the practice's one-line summary short: the update's practice list already wraps (192 F-04).
