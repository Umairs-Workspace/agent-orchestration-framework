# 119/02 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

Two changes that share one file and are otherwise unrelated.

**The family move** is a directory creation plus a specifier rewrite, and because the registry imports
every command module by path, most of that rewrite lands in one place. The route table is genuinely
unaffected — a command's route is a declared word on the command, and the registry keys on the command
id, never on a filename — which was verified rather than assumed: the face spells no path helper at
all. Two of the modules the ADR calls intra-directory leaves are not: one is reached by seven siblings
that stay flat, the other by the CLI entry point. Moving them is still right; just expect the result
to be a family leaf that outsiders reach into, rather than the tidy shape the directory name suggests.

**The prose sweep** collapses each registry comment to a single citation line and moves the rationale
to the command module's own header. The trap is that the two homes do not currently agree: a
registry block and its module header routinely cite *different* decision ids, so "delete the block,
the header already says it" loses citations. The safe move is to treat the union of citation tokens as
the thing that must survive, and let the prose be rewritten freely underneath it.

Two sweeps read this directory by filename prefix. One is backed by a floor and fails loudly when its
prefix stops matching; the other swallows its own read error and compares a count that is then zero,
so it passes having seen nothing. Re-point both; only one of them will tell you it needs it.

## The verification step

The check that proves this story is the **command surface, read from the registry rather than from the
tree**: every command that was registered before is registered after, with the same route and the same
declared flags, and the CLI bijection holds. Run it against the registry's own output, not against a
directory listing — a listing would agree with itself no matter what the move did. Then confirm no
citation token present before the prose sweep is absent after it, and that the comments documenting
the deferred-import ring are still there.

That last one needs care. The register row names the registry as the subject of the exempt class, and
the registry contains **none** of those comments — they live in the command modules. Scope the exempt
class where the comments actually are, or the leg passes over an empty set and the deletion it exists
to prevent goes unguarded in the only place it can happen.

## Deliberately out of scope

No comment-density number is asserted, here or anywhere: a cap with no admitted decomposition is the
failure this milestone rules out, and repeating it one directory over would be the same mistake in a
new location. The other families in the directory are not moved. And no behaviour changes — if you
find yourself reaching for a path to decide a route, stop, because that is the invariant this story
lands a control to forbid.
