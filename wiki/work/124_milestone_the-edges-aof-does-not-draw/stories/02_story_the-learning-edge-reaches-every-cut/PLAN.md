# 124/02 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

The smallest story in the milestone, and the one most likely to be done wrong quickly, because the
obvious move — copy the recall block out of the refine command and paste it into the shatter command
— produces something that cannot run.

Two reasons, both readable in the target document itself. The refine block's product-owner form
passes an item reference, and at the moment shatter would need to recall there is no item to
reference: shatter *mints* drivers from a planning document, and nothing exists to point at until
several steps later. And the refine block is two-role, written for an architect and a product owner
with a different recall shape each, while shatter spawns only the product owner — so half the pasted
text would address a role that command's process never brings into being.

The decided form is therefore its own thing: **one recall per planning document**, keyed to the seam
the product owner has already read, placed **before** the step that identifies drivers. The placement
is the whole design. A recall that runs once per driver runs *after* the cut has been made, and a
lesson that arrives after the cut cannot change it — which is exactly the failure this story exists
to remove one level up.

Verify the invocation against the CLI as it actually ships, read from the registry rather than from
neighbouring prose. An invented flag in a bundle command is invisible until an agent runs it live,
which is the worst place to discover it; asserting the form against the real command surface moves
that discovery into CI. Check the flags yourself even where this brief and the architecture document
agree — they were written from the same reading, so they would be wrong together.

Then make the roster bidirectional. It is tempting to assert only that each known cut-making command
carries a recall; the leg that earns its keep is the other one, which fails when a *new* cut-making
command arrives without one. A one-directional roster passes forever and guards nothing.

Last, the mechanical half: this edits a bundle source, so the three generated mirrors must
re-render and the manifest hashes must match. That is an existing, well-guarded seam — run the
generator rather than hand-editing any mirror, and let the parity controls tell you it landed. The
refine command is read here, never written; its block is asserted unchanged.

## The verification step

The check that proves this story is running the recall the way the edited document instructs — the
literal command, with the literal flags, against this repo — and seeing it return without error.
Memory may legitimately be off and return nothing; an empty block is a pass, an unknown-flag error
is not. That single run is what separates a documented intention from a working edge.

Then confirm the mirrors and the manifest agree with the source after regeneration, and that the
roster's reverse leg really fails when a cut-making command is removed from it.

## Deliberately out of scope

The refine command's own block is not refactored, harmonised, or shared with the new one — two
carriers with different shapes is the correct outcome here, not duplication to be resolved. No
memory is authored or seeded as part of this story. And the acknowledgement the recall asks for
lands in the affected driver's own record; no new document is introduced to hold it.
