# 126/02 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

Four pieces, and they are best built in this order because each is the next one's input.

**The ninth key.** Append `supervised` last on the declaration envelope, default `false`, set from a
`--supervised` launch flag that lands in the same three places `--quiet` did. The detail that makes
it real is the recovery projection: the recoverable declaration projects five keys today, so a ninth
key added anywhere else never survives a read. Project it as a sixth, defaulting `false`, and leave
the five-key usability requirement alone — extend that and every declaration already on disk becomes
unreadable. Resume inherits it through the same explicit-wins, absent-inherits rule level and cap
already use; no new grammar.

**The predicate.** A pure decider in the engine: workspaces with items with run records in, rows
out. It must not test a single failure reason or state string itself. Compose the store's own
verdicts — the staleness predicate for a live run, the retry-readiness answer for a failed one — with
the recovered declaration and `126/00`'s attempt clock. The clock leg is the one thing you must
*decide* rather than read: nothing persists a `deadline-exhausted` halt, so a lineage whose compute
budget is spent looks resumable to the store and must still be left off the list, or the reconciler
downstream relaunches it every tick. Unsupervised declarations yield no row.

**The argv leaf.** The composer that spells `["work","loop",…]` lives inside a registered command
module today, and importing that from the status producer closes the registry ring. Move it to a
zero-import leaf beside `loop-bounds`, add the resume flag spelled once, and make the trigger command
import it. The two `63` controls that pin the composer and the trigger suite follow it.

**The door.** An additive `declarations` key on `mesh status`, emitted only under a `--declarations`
flag so the flagless document — and every caller that reads it — is byte-identical. Enumerate this
node's workspaces through the resolver presence already uses, carry its `skipped` list through
verbatim, read run records from disk through the one reader, and put each descriptor's own
`projectRoot` on the row as `cwd`. That `cwd` is the whole of TECH_DEBT item 4's fix at the spawn.

## The verification step

A literal fixture with one run of every class — live-fresh, live-stale, reclaimed under cap, parked
before and after its reset instant, needs-input, agent error, attempt at cap, exhausted lineage, and
a scope whose last run is done — through the predicate, asserting exactly which are listed; then flip
only the ceiling and watch the exhausted row appear. Run `mesh status --json` with and without the
flag over a two-workspace fixture whose roots differ from the process cwd, and diff the two documents
to exactly one key. Read the `cwd` off each row and confirm it is the descriptor's, not `process.cwd()`.

## Deliberately out of scope

The Rust side is `126/03`'s. `mesh serve` and `mesh ui` do not come from this answer, and the reason
is a base case, not a preference: `mesh status` is itself one of the supervisor's spawns. Nothing
here re-dispatches a reclaimed assignment to another node.
