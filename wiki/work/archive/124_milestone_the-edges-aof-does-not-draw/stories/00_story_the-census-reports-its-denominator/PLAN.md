# 124/00 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

Three changes that arrive in one order, because each is the next one's foundation.

**The predicate goes in the leaf.** The contract-set module is already a pure leaf — zero imports,
no filesystem, five dependents — and that purity is load-bearing, not incidental: a control asserts
it, and the moment this predicate reaches for `stat` to ask whether a declared entry is a directory,
the leg goes red. So directory intent is **authored**, never probed. An entry covers another when
the two are equal, or when the first was written with a trailing slash and the second sits beneath
it. That reads like a shortcut and is not one — it was measured before it was decided: eight of the
stream's thousand-odd declared entries carry a trailing slash, and none of the rest resolve to a
real directory anyway, so the lexical rule reproduces the generous reading exactly, on this stream,
with no disk access at all.

**The wave adopts it, and that is a bug fix wearing a refactor's clothes.** The collision check is
exact-string today, so a story declaring a directory and a sibling declaring a file inside it are
currently waved into the *same* parallel wave — the precise failure the wave exists to prevent.
Collapsing the private helper onto the shared predicate fixes it. The trap is direction: this must
be a **strict tightening**. Every pair that collided before must still collide. Prove that as a
superset over generated sets rather than by inspection, because the failure mode — a wave that
silently gets *wider* — is invisible until two builders write the same file.

**The lane is the fourth of its kind, and the kind is the point.** A doctor lane is a module
appended to the registry with its own frozen code array, and the array being a *different* one from
the controls' is what makes the codes structurally unable to reach the gate — the gate's admitted
set is derived from that other array by filter. Two lanes already do this. Copy their shape rather
than inventing one, and resolve the contract sets at the engine's single impure edge so the lane
itself stays pure.

The thing most likely to go wrong is the honest part. The denominator is not a summary line bolted
on at the end; it is an **identity** over the edge set, and the four counts have to add up on every
input including the degenerate ones. Emit exactly one coverage finding per run — one, not one per
excluded edge — and keep the two exclusion reasons apart, because one of them time will fix and the
other never will.

## The verification step

The check that proves this story is `aof work doctor` run over **this stream**, not over a fixture:
the lane should name the unwitnessed edges the census found at refine, report a non-zero unchecked
count alongside them, and satisfy the identity against the real edge set. A fixture can only show
the arithmetic closes on data you chose; the stream is what shows the domain was drawn correctly.

Then confirm the two things that make it advisory rather than merely intended to be: no finding it
can emit carries `error`, and none of its codes appears in the controls' array. Both are assertions
about the tree, and both should fail loudly if someone later adds a fifth lane carelessly.

## Deliberately out of scope

The check does not become a gate, and does not learn to tell a false edge from deliberate capability
ordering — it cannot, which is why its finding says *unwitnessed* rather than *phantom*. Contract
fields are not extended to milestones, sessions, spikes or chores; that would shrink the permanent
half of the blind spot and is a larger decision than this story. And no existing story's declaration
is rewritten to make the census look better — the 182 unevaluable edges are the finding, not a mess
to tidy before reporting.
