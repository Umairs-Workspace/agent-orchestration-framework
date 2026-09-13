# 119/00 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

Three guards, three different shapes, one predicate change each. Nothing here moves a file.

**Purity.** The carriers test a *token* against a file's text — `doesNotMatch(source, /^\s*import\s/mu)`
and its variants. The change is a change of **unit**, not of strictness: resolve the subject as a
family (the directory if it exists, else the single file), strip comments through the one home that
already does that, extract each static and dynamic specifier, and classify. Intra-family is admitted;
a bare specifier, a node builtin, or a relative path leaving the family is a violation. Every other
purity leg — no filesystem, no clock, no `fetch`, no outward dynamic import — is asserted unchanged
over the whole family. Nine files carry this shape, not the three the ADR names; five of the six
unnamed ones use the identical regex, so a narrowed sweep will not hold.

**Census.** The carriers compare against a literal that somebody retyped. The change is to compute
the set from the tree and keep a floor, so a move reds the control instead of emptying it. The
distinction that does the work: a **decision** may be stored (a declared ceiling, a policy allowlist a
reader cannot compute), a **fact** may not. Sort every carrier you touch into loud / silent /
unfixable before changing it — only the last two are defects, and the ratchet constants are decisions
that stay.

**Citation.** The doctor's control probe `stat`s at HEAD and reports `control-unresolved` on a miss.
The change is a fall-through: on a miss, consult a rename map derived from git's own history. Two
constraints shape where the code goes. The spine may not name a spawn door — a delivered control
asserts that — so the git read belongs at the impure command edge that already hands in the project
root, and the spine takes the resolver as an injected dependency. And the spine's sibling imports are
checked against a closed roster, so a `work-doctor-*` name for the new module reds it; a name outside
that prefix does not.

## The verification step

The end-to-end check is a fixture register that cites a control path which no longer exists at HEAD
but which git records as renamed. `aof work doctor` over it must resolve the citation and stay silent,
while a citation to a path that never existed must still report. Alongside it: an intra-family import
planted into each purity carrier's subject is accepted, a bare specifier into the same subject is
still rejected, and each census carrier reds — rather than passing over an empty set — when its
subject set changes.

Two things will bite if you assume rather than measure them. The rename map is **nearly empty today**
(twenty rename records in the whole reachable history, two under `src/`), so it resolves almost
nothing on landing day and a resolver that answers "no renames, ever" would pass every leg silently —
assert the map's own non-vacuity. And an extractor for the citation sweep needs a left anchor, or it
clips a prefix off neighbouring paths and prices the ceiling wrong on the day it is pinned.

## Deliberately out of scope

No file moves — this story makes the four behind it legal and ships none of them. `SINK_CEILING` is
not touched here beyond its purity leg; the split story lowers it later. The modules whose guards are
being re-expressed are not themselves split. And the ADR's citation counts do not reproduce against
the live tree — measure your own and carry the command, rather than inheriting a number.
