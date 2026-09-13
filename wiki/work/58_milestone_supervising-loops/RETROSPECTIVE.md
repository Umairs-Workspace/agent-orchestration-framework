---
type: milestone
number: 58
slug: supervising-loops
doc: retrospective
created: 2026-08-29
updated: 2026-08-29
schema: 1
aofVersion: 0.1.0
---
# 58 · Retrospective

Four stories, seventeen task features, ten declared controls, thirteen findings. The build was not the
hard part and neither was the design; **every expensive lesson below is about a claim nobody had a
reader for.** Six architecture defects were caught by contract-authoring, five partition defects by the
developer sweep, one false criterion by QA, and two blockers at the verify gate — which is the review
ladder working. What it did not catch, for three milestones running, was a whole class of assertion
that was never read at all.

## R1 — The registry's citations had rotted, and the milestone that exists to make claims honest was the one that shipped them wrong

Twelve of fifteen `` `<symbol>` at `<module>:<line>` `` claims in `src/bundle/loops/**` named a line the
symbol is not defined on — deltas of +1 to +355, because the modules grew underneath the records.
Inside one milestone's diff, `run-resilience.md` put `isLegalTransition` at `run-store.mjs:106` while
the record **this milestone created**, `run-lifecycle-policy.md`, put it correctly at `:281`. The
registry's entire claim is that an authored edge declares itself authored and a discovered one cites
the artifact it was read from; a citation that names the wrong line is a manufactured citation, in the
milestone that wrote *"a citation the repository does not supply is never manufactured"* as its own
integrity trap.

**Why it survived three milestones.** 52/ADR-013 deliberately routed prose-body line citations OUT of
the census as `not-black-box` (`test/work-loops-registry-census.test.mjs:29-31`), on the sound ground
that asserting what a line SAYS would redden the suite on every unrelated source edit. That reasoning
is correct and it silently covered two weaker predicates it never mentioned — **in-range** and
**defining-line** — both computable without reading a line's content, and both of which would have
caught all twelve.

**Carry:** when a check is scoped OUT for a stated reason, the reason bounds a predicate, not a
subject. Write down which weaker predicates over the same subject remain decidable, or the exemption
quietly grows to cover them. `FF-5810` now holds the two that were reachable all along.

## R2 — A declared control that does not exist is invisible to every gate we have

`FF-5810` was declared in `ARCHITECTURE.md` during 58/01's review and implemented nowhere: zero hits
for the id across `test/` and `src/`. It named an existing suite as its host, so the file resolved —
and therefore `aof work doctor 58` reported **no `control-unresolved` at either severity** and
`aof:validate 58` returned PASS. The milestone would have accepted carrying a control that was a
sentence.

This is the extension blind spot `VERIFICATION.md`'s own preamble names for four other controls
(*"their cited files resolve today, so `control-unresolved` will never fire and the red probe is the
ONLY evidence the extension is armed"*) — arriving on a fifth that had no register row, no story owner,
and therefore no probe obligation to compensate.

**Carry:** the register in `VERIFICATION.md` must be **set-equal** to the declarations in
`ARCHITECTURE.md`, and a control added mid-milestone is the case that breaks it — the ownership line
was written at refine and never revisited. A row-count parity check between the two registers is one
line and closes the whole class. `FF-5810` was also missing from ADR-007's story assignment, which is
the same omission seen from the other side.

## R3 — A guard's non-vacuity leg caught the guard, which is the only reason it was not a false green

Writing `FF-5810`, a mangled `\b` in its symbol pattern landed as a literal backspace byte, so the
predicate matched nothing. The control did not report a clean registry — it **refused**, on
`non-vacuous: 0 defining-line claims examined`. Minutes later the same class of corruption was found
**already committed** in `TECH_DEBT` item 61's prose, where `/\bimport\b/` had been stored with two
backspace bytes since before this milestone.

**Carry:** this repository's habit of pairing every census with a non-vacuity assertion is not
ceremony, and 56's finding is the reason for it. A guard whose passing state is "found nothing" is
indistinguishable from a broken one by every signal except a count. Both halves paid for themselves in
one sitting.

## R4 — The partition's defining property was false as written, and four stories relied on it

`ARCHITECTURE.md` ADR-007 claims *"no two stories write the same file, source or test, and each
contended module AND each contended test file has exactly one owning story."* `scripts/test.mjs` is in
the `files:` of **all four** stories, because every story must register its suites in the runner. The
contention is benign — four disjoint labelled blocks, and `work next`'s declared-write overlap
detection correctly held 58/02 and 58/03 out of one wave — but the ARCHITECTURE sentence reads as a
guarantee the partition does not have.

Alongside it, **five write sets were understated**: 58/02 by two files (`F-58-02-2`), 58/01 by one
(`F-58-01-3` — `product-owner.md`, which is exactly why the criterion reaching it was missed), and
58/00's `reads:` in five places. That is five partition defects in one milestone, all of one shape:
**the partition assigned source files and assumed the test tree would follow.**

**Carry:** exempt the runner explicitly or stop claiming disjointness — a claim that is 99% true is
read as 100% true by whoever schedules on it. And the architect's proposed ratchet is the real fix for
the write sets: a control comparing a story's declared `files:` against the paths its diff actually
touches. Five instances is well past the threshold where that stops being optional.

## R5 — The milestone was blocked at accept by a two-commit-old gate whose remedy does not exist

`aof work status 58 done` refused: `ARCHITECTURE.md` at 1,140 lines against a 700-line budget. The
accept-time gate had landed two commits earlier; 52, 53, 55 and 57 were all accepted before it existed.
Measured across the corpus, **16 of 56 milestone `ARCHITECTURE.md` files exceed the budget** — 53 at
3,984 lines, 52 at 2,016 — so the first item the gate ever refused was a mid-sized one, and the fix it
implies (`TECH_DEBT` item 55, a compaction path) had never been built.

Resolved by re-calibrating the budget to 1,200 in the open, with the distribution recorded beside it —
the eight genuine outliers still fire. **Recorded as a departure**, because a budget quietly raised to
clear a gate is precisely what this milestone's own ADR-005 warns about.

**Carry:** a new hard gate needs its existing corpus measured before it lands, not after. Shipping a
threshold that 29% of the corpus fails converts the first honest item to hit it into the one that has
to argue about the threshold. The compaction path is still owed.

## R6 — Three framework surfaces reported something other than what they enforced

Raised during the build and still true:

- **`aof work validate` misdiagnoses a directory** in a story's `reads:` as missing —
  `src/commands/validate.mjs:85-87` resolves the entry then `readFile`s it, so a directory fails EISDIR
  and is reported as *"does not exist"* for a directory that plainly does. 58/01's central corpus IS a
  directory; the entry was narrowed to six records by hand.
- **`aof work status <ref> --if-applicable` reports a stale status** — `item-status.mjs:142-146`
  returns the row `resolveItemExact` answered with, while the refusal came from `transitionItemStatus`
  reading the record doc on disk. At 58's continue it printed *"already not-started; nothing moved
  (asked for in-progress)"* while `SPEC.md` said `in-progress`, which reads as a bug in the flag.
- **`aof work dispatch` opens a silently useless lane** for a ref whose refine output is uncommitted —
  the checkout carried only `SPEC.md` and `STATE.md`, so `aof work status 58/00` inside it answered
  *"No item resolves to ref 58/00"*. Milestone 58 was built in the main checkout instead, which cost
  the fan-out.

**Carry:** all three are the same species as R1 and R2 — a surface whose report and whose behaviour
have drifted apart. Each is routed to feedback and none is fixed here.

## R7 — QA refusing a false acceptance criterion is the cheapest correction in the ladder

The brief said an arbiter's component "contains the loops it names". The decomposition is a directed
SCC walk and `veto` edges are outbound-only, so an arbiter is its own singleton component — which
ADR-001 §5 had already measured. QA contracted the true form instead of the briefed one. **The error
was the PO's, not the architect's.**

Separately, QA found `priority`'s ENTRY grammar frozen in ADR-003 §5 with no driving coverage: three
independent mutations of `src/work-loops.mjs` left the entire tree green. The behaviour is correct and
nothing holds it there, because `tasks/01` enumerates `dwell` and `resolves` exhaustively and has no
Examples table for what a priority entry admits.

**Carry:** an exhaustively-tabled contract sitting beside an un-tabled one in the same feature is the
signature of a gap — the author's attention ran out, and the untabled key is the one to probe. The
replacement table is authored and sits in STATE's feedback for the item that next touches this
contract.

## What went right, and should be repeated

- **The ordering edge was named and it paid.** Promoting the gating codes only after 58/01's records
  landed produced a gate that turns on green: 0 errors over the real registry, where promoting first
  would have delivered fifteen error-severity findings for work that was merely unfinished.
- **The evidence was a named verdict, not a total.** ADR-005 §6b insisted the proof of the arbiter
  entering the traversal be `loop:verify-triage-accept` flipping `self-referential` →
  `exogenous-only`, not the finding count moving 36 → 32. A total is consistent with several wrong
  worlds; a named verdict is not.
- **Red probes on the weakest form.** `FF-5810`'s defining-line probe moved a citation by ONE line
  rather than by the +175 the real defect carried, and `FF-5808`'s probe demonstrated its own defeater
  — leg (a) stayed green while leg (b) went red, which is the argument for the second leg made as a
  measurement instead of as prose.
