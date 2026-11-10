---
doc: examples
---
# 190/03 · The commands' prose asks `aof test` once at each door and stops prescribing whole-tree repeats — example map
<!--
Drafted at refine's discovery beat, 2026-11-09. No business question is left open. Struck because
the record answers them: one sweep per UAT session served by the gate (SPEC Scope, fifth bullet);
reviewers no longer re-run on an unchanged diff (SPEC Scope, second bullet); `--fresh` only for
flakes (SPEC Out of scope, third bullet). Whether to declare tiers is the milestone's ADR-004,
raised with the operator at the refine's close rather than in this map.
-->

## R1 · Each door asks `aof test` once, and an answer from the record is the evidence
- E1 · `continue.md`'s `<review_lanes>` says the lanes start together, the first runs, and the others are answered from its run [proposed]
- E2 · `continue.md`'s `<build_terminator>` says a repeat on unchanged content is answered from the record, and that the answer is the evidence [proposed]
- E3 · `review.md`'s test step runs `aof test --scope impacted --story <ref>` once and never asks for `--fresh` [proposed]

## R2 · `--fresh` is named only as the way to chase a flake
- E4 · The only `--fresh` in the commands' prose sits beside "suspected flake", and asks the result to say so [proposed]

## R3 · A UAT session sweeps once, and a stopped gate resumes
- E5 · `verify.md` tells a UAT session to run one `aof test --scope all`, which is answered from the newest gate run on unchanged content, not one sweep per accepted milestone [proposed]
- E6 · `verify.md`'s `not-finished` repair is `aof work regression-gate <NN> --resume` [proposed]
- E7 · The UAT `SESSION.md` template's sweep line says one whole-tree run for the session [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#ADR-006 · Do the doors call `aof test`, or read the record store themselves?
