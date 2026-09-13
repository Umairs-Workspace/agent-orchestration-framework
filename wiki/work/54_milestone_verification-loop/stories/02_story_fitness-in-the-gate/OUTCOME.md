# 02 · Fitness in the gate — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A declared five-row cost ladder
`GATE_ORDER` is a frozen five-row declaration — `drive continue`, `gate work:validate`,
`gate work:doctor`, `gate work:grade`, `drive verify` — in strictly increasing cost, and every `gate`
row names a command the registry resolves.

### The fitness half of the gate, wired
`invokeGateLadder` invokes `work:doctor` after `work:validate`, so an item whose declared controls do
not resolve is stopped by a deterministic check before any model turn is spent.

### Each rung short-circuits every rung after it
A `work:validate` that returns findings returns from the ladder without invoking the doctor, and the
ladder's answer is its own envelope — `{ gate, findings }`, naming the rung that answered — never one
rung's result wearing another rung's findings.

### The doctor rung runs at the driven item's own scope
It is invoked as `{ scope: ref }`, exactly as `work:validate` already was, so an un-authored register
anywhere else in `wiki/work` cannot stop a loop that is not driving it.

### An admitted code set derived, never restated
`DOCTOR_GATE_CODES` is `Object.freeze(CONTROL_FINDING_CODES.filter(…))` over 66's frozen array minus
its two `verification-*` members and `control-runner-unchecked`; no admitted code appears as a
literal, so neither verification code can enter the gate at any severity and a ninth control code
cannot silently join it.

### Severity is taken, never re-derived
The gate admits `severity === "error"` and nothing else; the loop shell neither calls nor
re-implements `severityFor`, does not import the acceptance horizon, and reads `loopReady` nowhere in
the ladder.

### Two armed fitness functions
`acd-doctor-gate-scope-and-severity` (FF-5410) is registered and has been observed failing against a
planted defect, and FF-5409's `GATE_ORDER` clause on `acd-loop-probe-contract` has been observed
failing against two.

## Assumptions

- **The behaviour change ships un-flagged on a measured blast radius** — the doctor rung can halt a
  loop where no doctor gate existed; that it halts nothing today rests on the refine measurement that
  scoped `aof work doctor <ref>` returns zero `error` findings for every open item on this tree.
- **Warns never gate, and that is load-bearing** — the stream carries hundreds of `warn` findings and
  `pending` controls are already `warn`, so the `error`-only admission is what keeps the rung from
  blocking every loop in the repo.
- **`CONTROL_FINDING_CODES` stays the single home of the control vocabulary** — the admitted set is a
  filter over it, so a code added there joins the gate unless the filter's rule excludes it.

## Gaps

### The `work:grade` rung is declared but nothing invokes it
- **Status:** discharged (2026-08-23, at 54's verify) — **but not by the mechanism this condition named**
- **Discharge condition:** 54/03 wires the grade rung into `invokeGateLadder`.
`GATE_ORDER`'s fourth row names `work:grade` and the ladder invokes `work:validate` and `work:doctor`
only — the declaration is five rungs, the wiring is two.
**Discharged in substance, and the difference is recorded rather than smoothed over.** 54/03 does not
wire the rung into `invokeGateLadder`: the grade is invoked once per completed build at
`commands/loop.mjs`, ahead of rung 1, and 54/03 routes on its answer. That call site is 69/06's, and
the ladder's short-circuit therefore does not govern it — a conflict found at 54/03's structural
review and settled by amending **ADR-007 §1** so the short-circuit governs the *decision* order
rather than the cost. The rung answers and decides; it is simply not called from inside the ladder.

### FF-5409 is armed in half
- **Status:** discharged (2026-08-23, at 54's verify)
- **Discharge condition:** 54/03 lands the `grade-indeterminate` clause and its red probe is recorded
  in `VERIFICATION.md`.
The control's `GATE_ORDER` clause is landed and probed; its `grade-indeterminate` clause has never
been observed failing, and `aof work doctor 54` no longer reports the row as missing a probe
(F-54-VERIFY-1).
**Discharged: both halves now landed and probed.** The clause drives a real loop to a
`grade-indeterminate` halt and asserts the stop and producer before the shape it guards, and two
probes are recorded in the register. The gap was worse than stated while it stood — review found the
clause had been taking its state from the read-only `work:loop` probe, which drives nothing and
reaches no stop, so it was guarding a shape that could never carry the stop it names.

### A red doctor rung carries findings, not a structured grade
- **Status:** discharged (2026-08-23, at 54's verify)
- **Discharge condition:** 54/03 makes the gate's record reach the re-drive.
The ladder returns the admitted findings to its caller; nothing turns them into the structured
feedback that re-drives the maker.
