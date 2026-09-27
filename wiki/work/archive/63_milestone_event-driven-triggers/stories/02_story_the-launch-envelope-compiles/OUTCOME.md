# 02 · The launch envelope compiles — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The frozen set's fourth enforcement point compiles
`compileFrozenSet(bundledFrozenSet()).deferred` is empty and `installed` carries `gate-order`; `COMPILED_POINTS` equals `FROZEN_ENFORCEMENT_POINTS` in full, so all four declared enforcement points now produce compiled output.

### The unattended launch shape is a declaration, not a convention
`gate-order`'s rule is `{ "program": "aof", "args": ["work", "loop"] }` in both the bundled source and the installed copy, and the compiled artifact's program and argv come from that declaration — changing the declared shape changes the compiled artifact. The declaration is the milestone's one program literal; no other program spelling for this launch exists in `src/`.

### An unattended launch that is not the declared one is a coded refusal carrying nothing spawnable
A mismatched program, mismatched argv, absent program, absent argv, reordered argv or spliced argument each returns a coded refusal naming the envelope member, with no program, no arguments and no environment attached — and it is distinguishable from the answer an unresolvable runtime has always produced.

### Every attended launch is byte-identical to what it resolved before
For a human session, a phase-driver session, all three single-phase mesh directives, a resume and a session carrying `--model`/`--effort`, the resolved `{ bin, args, env }` is identical key-by-key to the same call with the fourth point compiled out. `resolveInteractiveDriverLaunch` keeps its 23 dependents, its NEEDS_INPUT sentinel and its cache/telemetry decisions untouched.

### The fourth point is traced, not merely counted
The compiled unattended-launch artifact carries the id of the member that declared it, and a declared, owned member at that point that reaches no output is a failure — the same trace the other three points already get.

## Assumptions

- **The seam consults the declaration and never imports a compiler** — the launch seam reaches the declared launch only through its injected `declaredLaunch` option, so the declaration stays the sole speller on the admitting side as well as the requesting one.
- **The declaration is read from the worker's own workspace checkout** — never from the dispatched worktree, so a branch cannot widen its own launch envelope in the push that exploits it (63/ADR-013 §4).

## Gaps

### An unattended launch observed driving the gate order end to end
- **Status:** open
- **Discharge condition:** an unattended `aof work loop <ref>` at a driving level is run to completion over live work and observed walking continue, validate, doctor, grade and verify in that order.
The compiled artifact, the refusals and the attended-launch byte-identity are all proven by suite; what no lane here proves is a real driving run of the launch this declaration admits. The `L1` run recorded at 63/VERIFICATION.md is report-only by construction, and the shipped declaration asks for no higher level (63/VERIFICATION.md `F-63-C`).
