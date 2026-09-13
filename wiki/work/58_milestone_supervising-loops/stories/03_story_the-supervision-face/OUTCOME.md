# 03 · The supervision face — Outcome

## Delivered

### Reading a loop names the layer it runs at and the node that sets its reference
`aof work loops show --id <loop>` renders the declared `layer` and the node holding the inbound
`target-setting` edge on the same line as the node itself — measured live over this repository's
installed registry: `loop:build-to-green · loop · Build executable work to green · layer operational ·
reference set by loop:autonomous-cascade`.

### An absence is stated in words where it is a defect, and nowhere else
A loop nobody supervises and a loop that declares no layer each say so; a kind that has no layer axis
renders no layer at all and is named only when something sets its reference. The face does not print
an empty field to keep its columns even.

### `owner:` and the reference-setter stay two different facts
The face never conflates who is accountable for a loop with who sets its target, a loop pointing a
`target-setting` edge at itself is not reported as its own supervisor, and a setter declared by a
kind that may not set one is still named rather than quietly dropped — the face reports what the
registry declares, including where the registry is wrong.

### Two setters are both named, in id order, and the two faces agree
Where more than one node sets a reference the face lists every one of them deterministically; the
machine face is a shape a caller can depend on; the human and machine faces carry the same answer node
by node; and reading one node agrees with reading the whole registry.

### Every declared kind renders as its own shape
`renderLoopGraph` draws five distinct glyphs for five declared kinds — `["…"]` for a loop, `(["…"])`
for an actor, `(("…"))` for an anchor, `{{"…"}}` for a watcher, `{"…"}` for an arbiter — where before
this story an anchor, a watcher and an arbiter were the same picture as each other and the same
picture as a dangling reference. The glyph table lives inside the exported pure renderer, so the glyph
set can be asserted without standing up a workspace.

### The fallback for an endpoint nobody declared is untouched
`[/"…"/]` still renders `command:`, `config:`, `module:` and dangling `loop:` endpoints, and it is
also what a record whose `kind:` the vocabulary does not admit falls to — so an unadmitted kind
borrows no declared kind's glyph. No declared kind's shape equals it.

### The sixth kind fails CI until somebody gives it a shape
`FF-5808` asserts glyph-to-kind parity in both directions, and its second leg is the one that makes
the guard real: a sixth kind handed the fallback shape would still yield six distinct shapes across
six kinds, so cardinality alone is satisfied by the exact collision this control repairs. The two legs
together mean the next kind cannot be added without a glyph of its own.

### The picture is deterministic
The same registry renders byte-identically twice over, in a second process, and whatever order the
records were discovered in. Node keys and edge lines are unchanged by the new shapes.

## Assumptions

- **The face reads records, not a model it can inject** — every scenario in both tasks drives the CLI
  over records on disk, because neither command has an injection seam and one was refused rather than
  added. That is why this story lands after 58/00 and 58/01: before the schema and the records,
  `layer:` is an unknown key, `kind: arbiter` leaves the kind null and the node falls into the very
  fallback shape this story's own Examples row forbids.
- **The undeclared-endpoint fallback is pinned elsewhere and must not move** —
  `test/arch/acd-loop-render-deterministic.test.mjs` fixes it, which is why that suite is in this
  story's `reads:` and not its `files:`. The new shapes are for declared kinds only, and that is what
  keeps the repair additive.

## Gaps

### The face shows the reference hierarchy, not the arbitration it resolves
- **Status:** open
- **Discharge condition:** a face that renders an arbiter's `resolves`, `priority` and `dwell` beside
  the contenders it vetoes — most naturally alongside whatever milestone 62's proposer needs to show
  when it acts on them.
- `show` names a loop's layer and its reference-setter, and `graph` draws the arbiter as its own
  shape with its `veto` and `parameter-tuning` edges. Neither renders the trade-off's content: an
  operator reading the face learns that one node owns the speed-versus-thoroughness-versus-autonomy
  conflict, and must open the record to learn which demand wins.
