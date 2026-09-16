# 03 · Staleness, silence and the prune — Outcome

## Delivered

### An anchor that has not been refreshed is not an anchor
`src/work-loops-checks.mjs` judges every `kind: anchor` node against a window handed in on the call
and answers in three states, not two: fresh, stale, and undated. An anchor exactly at the window
boundary is not yet stale. Undated is its own answer, so the sixteen anchors shipped before 59 are not
red on arrival.

### A stale anchor degrades a grounding verdict rather than deleting one
A loop grounded only through stale anchors is not reported `unanchored` — the edge is declared and the
authority resolves. The report distinguishes *never grounded* from *grounded a while ago*, which is
the distinction an operator acts on.

### Silence is one rule across every channel
An instrument that has produced no reading inside its own declared `cadence:` window is named, and the
window comes from the record rather than from a per-channel table — so a new channel needs no new
check. A declared cadence with no occurrence count supplied is `unjudgeable` with reason
`no-occurrence-count`, never reported silent: a verdict about a question nobody asked is the shape
ADR-004 §1 forbids.

### A metric that has not moved is named, and the threshold has one home
A counter unchanged across the declared number of cycles is reported, and that number appears exactly
once in the module — at its declaration. No check states it as a literal of its own.

### A loop nobody consults is a prune candidate, reported and never removed
A declared `kind: loop` node with no inbound consumer and no observed execution is reported by name.
Nothing is deleted: the auditor kind admits no actuator, and removing a node is an edit to a governed
declaration.

### Every audit lane declares what it read, against a floor, in one shape
`AUDIT_LANES` declares an id, a population description, a basis and a floor for each of the four
lanes; a clean lane result is not representable without a read count, and a count below the floor
emits `audit-ran-on-nothing` naming the sweep, the root walked and the floor missed — byte-identical
to the census lane's finding for the same read. The registry is closed and in bijection with the
exported assessments, so a lane cannot arrive without a floor.

### The checks leaf is still a pure leaf
The module imports nothing, names `Date` nowhere, reaches no monotonic clock, and holds no date
literal and no numeric literal large enough to be a duration in milliseconds — including in
exponential, hex, BigInt and product-of-literals notation. Every freshness and silence comparison
rides on a `now` and a window supplied by the caller, and no kind admits a key by which a node could
assert its own liveness, freshness, consultation or audit status.

## Assumptions

- **Every clock reading and every window arrives on the call** — the leaf's determinism, and its
  byte-stability in-process and in a fresh process, rest on the caller owning all I/O and all time.
- **Both boundaries are inclusive** — a reading exactly one window old is DUE, not overdue, and one
  completed occurrence with no reading IS a missed reading. Decided at build against the behaviour and
  matching task 00's own boundary rule; the contract states neither.
- **The floors are tripwires for a moved or truncated root, not targets** — they need raising as the
  registry grows rather than being left to drift below what they guard.

## Gaps

### Two boundary rules are the developer's, not the contract's
- **Status:** open
- **Discharge condition:** boundary scenarios for the periodic window and the event-branch occurrence
  count, plus an Examples table over the occurrence count, authored in the accepting item's contract.
`01_an-instrument-that-has-said-nothing.feature` pins neither threshold: measured at build, `>` → `>=`
survived on the periodic window and so did `> cadence.ms * 2` — the window could drift threefold with
CI green. Both are pinned in the suite; a delivered `.feature` is immutable, so the rule cannot be
moved into 59/03's own contract.

### An auditor's declared subject and bypass are checked for scheme, never for resolution
- **Status:** open
- **Discharge condition:** the check lane resolves `audits:` endpoint ids against the registry and
  reports a dangling one, and requires an `escalation:` actor to be a declared node whose `ground:` is
  exogenous.
Measured on this registry, 2026-08-30: `audits: [watcher:no-such-watcher-typo]` and
`escalation: actor:nobody-declares-me` each parse with **zero findings** against a loader that
produces 18 findings overall — so an auditor's declared subject can be nothing, permanently, and its
bypass can terminate at an actor no record declares. Routed here from 59/00's review; the checks leaf
mentions neither key. FF-5910 covers the day-one record under `src/bundle/loops/` and nothing covers a
project-authored auditor.
