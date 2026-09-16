# 126/00 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

Two changes to the same file pair, and the order matters: land the clock first, because everything
in this milestone that resumes anything is measured against it.

**The clock.** Start from the run records, not from the declaration. Neither of the shell's two
deadline checks passes the declaration's `startedAt` today — one walks the `retryOf` chain to the
root record's `createdAt`, the other uses the fresh run's own — so the origin is already a run
instant and the fix is to stop subtracting two instants at all. Write one pure summer in the engine
that takes the lineage's records and `now` and returns milliseconds of *attempt*: a reclaimed
attempt ends at its last heartbeat (never the reclaim stamp, which is written hours later by a
sweep), a settled one at `updatedAt`, a running one at `now`. Then make the decider take
`elapsedMs` instead of `startedAt`/`now` and re-point both shell sites at the summer. The shell's
existing lineage walk gives you the records; do not author a second traversal. Nothing is persisted —
every instant the summer needs is already on disk — so resist any temptation to add an accumulator
to the declaration; that is the second derivation the milestone exists to refuse.

The delivered `69/02` test that calls the decider with two instants is code and moves with it; the
delivered `.feature` it came from is not touched. Both of its observable claims survive: 99 ms under
a 100 ms ceiling admits, 100 ms halts as `deadline-exhausted` with `preserved-for-triage`.

**The narration.** The seam exists — the injected `report` — and four in-flight lines already use it.
Derive a second name from it, `narrate`, that is identity by default and the silent no-op under
`--quiet`, then put every in-flight line on `narrate` and leave every `reportLine` site on `report`.
The line that matters most goes immediately before the drive, where the multi-hour wait begins:
which ref, which phase, which cycle of which cap, which level. The retry, resume and reclaim sites
each get their one line in the module's own idiom. The flag has to land in three places (the input
schema is closed, the CLI spec, the argv shaper) or it does not exist. Do not add a `console.log`
and do not touch the PRINTERS roster: the launcher's one printer is the whole mechanism.

## The verification step

Drive the measured failure: feed the summer the real 124/00 record (created 23:32, last beat 00:02,
reclaimed 11:02) and confirm it returns under thirty minutes and the decider admits against the
two-hour ceiling — then confirm the wall-clock reading of the same record is what the code no longer
produces. Run a loop fixture with a collecting `report` and see the act line arrive *before* the
`Driven` row; run it again under `--quiet` and confirm zero in-flight lines and a byte-identical
final account, including a halt's resume command.

## Deliberately out of scope

The ninth declaration key and `--supervised` are `126/02`'s. A per-heartbeat "stage within the
drive" line is deferred with its seam named in ADR-002 §7 — the driver's reach is ADR-governed, and
a narration story should not spend that ceiling. The cap seam `124/01` changed is not touched.
