# 03 · No executed consumer, no proposal — Outcome

## Delivered

### A bound whose resolved value reaches no DECISION refuses every proposal on it
The rule is worded on consumers — a resolved value that reaches a decision — never on readers, and
it ships as a second predicate beside `unconsumedCeilings` rather than as a sibling check, so the
existing guard's legs keep their semantics unchanged. At HEAD it refuses all three declared knobs,
which is the correct answer: the same tree that satisfies the reader leg fails the decision-site leg
for every one of them. The reported set is a subset of the registry's declared tunables, so a knob
that gains a decision-site consumer drops out without the gate needing an edit.

### Where consumption cannot be decided, the answer is refusal rather than a guess
The harness switch is evaluated over the declared document. A prompt names no configuration key, so
consumption is not statically decidable for it and every proposal is refused — fail-closed. The
report names which condition it fell back on, and the switch re-opens the moment that document names
a knob.

### What may be proposed at all is the registry's declaration, never the acceptor's
No module under `src/work-acceptor/` holds a `work.loop.*` or `work.autonomous.*` key in code — not
in code, not in a string, not in a comment in the admissibility module. The admitted set is resolved
from `arbiter:speed-thoroughness-autonomy`'s `parameter-tuning:` edge through `loadLoops` and is
identical to it; a key outside that edge is a coded refusal, and an empty declaration admits nothing
rather than falling back on a built-in set.

## Assumptions

- **`src/work-loops.mjs` is not edited by this milestone** — the tunable set is read from the
  registry, so widening what may be tuned is a change to the registry's own declaration and never to
  the machinery that reads it.
- **A key quoted inside a diagnostic message is not a claim of membership** — the code-only reading
  is the same one 69's guard already applies, so a refusal can name the key it refused.

## Gaps

### While the harness is a prompt, the control is a switch rather than a discriminating check
- **Status:** open
- **Discharge condition:** the harness document names a configuration key, at which point the check
  discriminates per knob instead of refusing all of them alike.

The check cannot tell an unconsumed knob from a consumed one for the harness that built every
delivered item so far. It refuses both, and says which condition it fell back on.
