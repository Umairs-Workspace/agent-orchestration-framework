# Fix 3 · The round cap, and stall detection

**Surface:** `src/bundle/commands/continue.md` (the story lane's Review step), the automated craft
pass, and the reviewer agents' report shape.
**Size:** ~15 lines of prompt plus a counted round marker. No schema change, no dependency.
**Ships:** immediately, alongside Fix 1.

---

## The defect

**There is no round bound anywhere in the system.** Grep every command and every agent file in the
bundle for a review-round cap, an iteration limit, or a convergence test, and nothing returns. The
story lane says *"Review — `aof-architect` + `aof-qa` + `aof-designer` + an automated craft pass;
apply confirmed fixes"* and then stops. What happens if the fixes produce new findings is
unspecified, so it recurses until a model decides it is finished.

Round two is where this stops being free. Intrinsic self-correction without an external oracle is
**net-negative**: GPT-4 on GSM8K falls **95.5% → 91.5% → 89.0%** across successive self-correction
rounds, and recovers to 97.5% only when handed oracle labels. The multi-agent failure taxonomy puts
**step repetition at 17.14%** of observed failures and **"unaware of stopping conditions" at 9.82%**
— together a quarter of all failures, and both are the absence of this fix.

We have no oracle at review time. The `@executable` suite is the closest thing, and it is green
before the review lane starts — so every round after the first is exactly the unbounded-intrinsic
case the literature says degrades.

## The evidence

Five consecutive commits from one milestone run, 15:52 → 17:38, each declaring itself final:

```
15:52  test: harden final structural controls
16:22  test: close final architecture bypasses
16:45  test: reject remaining structural evasions
17:13  test: enforce concrete architecture gates
17:32  test: harden final structural paths
```

None is. And in the last hour of that same run, two commits eighteen minutes apart assert opposite
things about the same fitness register.

- **Milestone 66: 91 findings against 59 verification rows, across five closure rounds.** Round
  five's own record states the milestone *"was refused by the gate milestone 66 shipped"* — the
  instrument raised the round, not an operator.
- **77 commits for 7 features**: 19 `fix` and 18 `test` against 7 `feat`.
- **One `aof:continue` ran 1h55m and delivered nothing.** The lane had no deadline and no round
  count, so there was no moment at which anything was obliged to notice.

## The change

**1 — One round by default. A second requires a named blocker.**

```markdown
<review_rounds>
Review runs **once**. Apply the confirmed fixes from that round and proceed to the Review gate.

A **second** round runs only when round one produced at least one **Blocker** — a finding that
breaks correctness or violates the locked contract. Important findings and Nits do not earn a round;
they become work items (see below).

**Three rounds is the hard cap.** On reaching it, stop and hand back to the operator with the
outstanding findings named. Do not start a fourth under any justification.
</review_rounds>
```

**2 — Stall detection, which is the part the cap alone does not cover.**

```markdown
<stall_detection>
Count the Blockers at the end of every round. If the count is **not strictly decreasing** —
equal, or higher — stop immediately, regardless of the round number, and report:

  Round N: <count> Blockers, unchanged from round N-1. Stopping.
  Outstanding: <the findings, each as file:line + failure mode>
  Choose: force-proceed to the gate · provide guidance · abandon and re-refine.

A round that produces the same count is a round that produced no progress, and the next one will
not either.
</stall_detection>
```

**3 — Findings that do not earn a round become work items.** An Important finding at round one's
close is recorded — as a finding on the milestone, or promoted to a chore — not fixed in a round.
This is the pressure valve that makes a one-round default survivable: nothing is dropped, it is
scheduled.

**4 — A precondition on round two: the Blockers must be verified first.** Before a second round
starts, the outstanding Blockers are checked against actual code behaviour and deduplicated. A
finding that cannot be reproduced against the code does not earn a round. This is one prompt
paragraph, not an engine — mature review pipelines spend a whole stage on it, and the cheap version
is simply refusing to spend a round on an unverified claim.

## Why this shape

**The cap and the stall detector do different jobs and neither substitutes for the other.** A cap of
three stops the infinite case. It does nothing about the *converged-but-still-running* case, which is
the one in the commit log above: five rounds each producing a new "final" hardening, none of which
reduced the count. The monotone-decrease test catches that at round two.

**One round, not three, as the default** because the evidence is that our first round is where the
value is — real defects, including a live production 500 and three fitness functions guarding
nothing — and rounds two onward are where the 19 `fix` and 18 `test` commits come from. Three is the
ceiling, not the target.

**Blockers-only as the escalation currency** because severity is the only lever that separates "this
is wrong" from "this could be better", and Fix 1 is what makes the severity trustworthy. These two
fixes are worth shipping together: a round cap gated on Blocker count, with no discipline about what
counts as a Blocker, is an invitation to inflate severity.

**Offering the operator three options rather than failing** because a hard failure at a stall throws
away a lane's work. Force-proceed is a legitimate choice when the outstanding findings are known and
acceptable, and it is the operator's to make.

## Risk

**A genuine defect survives to the gate because only one round ran.** The mitigation is that it
survives *named* — as a finding or a work item — rather than silently. The number to watch is
escapes to `aof:verify`, and if it rises, the default moves to two rounds rather than the cap moving.

**Severity inflation to buy rounds.** Real, and the reason Fix 1 ships alongside. Watch the
Blocker share of findings before and after; a jump is the symptom.

**Stall detection misfires on a legitimately hard fix.** A round that fixes one Blocker and uncovers
a genuinely new one shows an unchanged count and stops. That is the correct stop — the lane has
discovered the story's contract is wrong, and re-refining is cheaper than a third round against it.

## How we would know it worked

- **Rounds per story** — the direct measure. Currently unbounded and unrecorded; recording it is
  itself part of the fix.
- **`fix` and `test` commits as a share of the total** — currently 37 of 77.
- **Findings per verification row** — currently 91 against 59 on one milestone.
- **Wall-clock per story** — currently 109 minutes for 43 minutes of feature work per milestone.
- **Escapes to `aof:verify`** — the guard number. It must not rise.

The prediction: rounds converge on one, `fix`/`test` share falls sharply, wall-clock falls with it,
and escapes hold flat. If escapes rise while findings fall, the cap is too tight and the default —
not the ceiling — is what moves.
