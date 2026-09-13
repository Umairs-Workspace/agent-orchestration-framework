---
# aof-generated: true — framework loop record; installed by `aof work update`, edit it in aof, not here.
id: arbiter:speed-thoroughness-autonomy
kind: arbiter
title: Speed versus thoroughness versus autonomy
resolves: how much of the same agent's effort each loop may spend
priority: [loop:verify-triage-accept, loop:review-fix-rereview, loop:build-to-green, loop:autonomous-cascade]
dwell: cycles:2
veto: [loop:autonomous-cascade, loop:build-to-green, loop:review-fix-rereview, loop:verify-triage-accept]
parameter-tuning: [config:work.loop.reviewRounds, config:work.loop.buildNoProgressRounds, config:work.autonomous.maxAttempts]
---
# Speed versus thoroughness versus autonomy

Framework record source: `src/bundle/loops/speed-thoroughness-autonomy.md`; installed by `aof work update` — edit it in aof, not here, and put per-project values in `.aof/aof.config.json` behind a `config:` pointer.

**The conflict this node resolves.** Four loops reach for the same three agent definitions —
`src/bundle/agents/aof-developer.md`, `src/bundle/agents/aof-product-owner.md` and
`src/bundle/agents/aof-qa.md` — and each wants a different amount of the same agent's effort:
`loop:build-to-green` wants the developer to keep iterating on one task until it is green,
`loop:review-fix-rereview` wants that same developer to apply confirmed findings and be re-reviewed,
`loop:verify-triage-accept` wants deliberated triage and a genuine human stop for `@uat`
(`src/bundle/commands/verify.md:106-107`), and `loop:autonomous-cascade` wants all three folded into
an unattended pass over a whole range. That is the standing speed-versus-thoroughness-versus-autonomy
trade-off, and until this record existed the way it got decided was whichever of the three the
operator had front of mind that evening. `resolves:` states it in one phrase a reader can disagree
with without opening another file.

**The order, and why it is this order (ADR-003 §8).** Most important first:

1. `loop:verify-triage-accept` — the acceptance gate wins. Its human-acceptance lane structurally
   cannot be waived: `src/bundle/commands/verify.md:106-107` requires it to *stop and prompt the
   user*, so no amount of autonomy reach can convert it into a pass that nobody attended.
2. `loop:review-fix-rereview` — confirmed findings are applied before anything reclaims the agent.
   A finding that is known and unapplied is thoroughness already spent and then thrown away.
3. `loop:build-to-green` — the build keeps iterating inside its own no-progress tolerance, and that
   tolerance, not another loop's deadline, is what stops it.
4. `loop:autonomous-cascade` — autonomy yields last, because an unattended pass that skips a gate is
   the failure the rest of this system exists to prevent.

`priority:` is a permutation of this record's own `veto:` set — the same four loops, no omission and
no extra — so the ordering and the edge the checks read can never disagree. It is **not** the layer
order: ADR-002 ranks how fast a cycle turns, this ranks whose demand wins when two cycles want the
same agent. Two axes, stated apart.

**The knobs it owns, and what "owns" is allowed to mean.** A knob claimed here must be cited as a
`ceiling:` pointer by one of the loops this record vetoes — that is the registry's computable test
for *bounds*, and it is what stops an arbiter claiming authority over numbers nothing it arbitrates
runs within (ADR-003 §7). Three qualify:

- `config:work.loop.reviewRounds` — **thoroughness**, and it bounds `loop:review-fix-rereview`,
  which cites it as its own ceiling.
- `config:work.loop.buildNoProgressRounds` — **thoroughness**, and it bounds `loop:build-to-green`,
  which cites it as its own ceiling.
- `config:work.autonomous.maxAttempts` — **autonomy**, and it bounds `loop:autonomous-cascade`,
  which cites it as its own ceiling.

Speed is not a knob; speed is what every one of those three is spent against. `loop:verify-triage-accept`
wins first and owns none of them: it declares `ceiling: none`, because the thoroughness of an
acceptance gate is not a number. `config:work.loop.progressMaxResets` is deliberately **not** claimed
— it is a real bound in `src/loop-progress.mjs`, but no loop record cites it as a `ceiling:` pointer,
so on this record's own criterion it is not a knob any vetoed loop is declared to run within, and the
criterion is not widened to rescue it. `work.rubric.report.floor` and `mesh.presence.stalenessSeconds`
are not claimed for the same reason.

**The dwell is counted in cycles of the loop that receives the adjustment.** `dwell: cycles:2` means:
when a change to one of the knobs above is committed, that change must stand for **two cycles of the
loop that received it** before a reversion is considered. The unit is cycles and not wall-clock
because six of this registry's seven loops have no clock at all, and converting a per-item or
per-phase trigger into a duration is the fabrication ADR-002 exists to refuse. Two is not arbitrary:
`DEFAULT_BUILD_NO_PROGRESS_ROUNDS` and `DEFAULT_PROGRESS_MAX_RESETS` are both `2`
(`src/loop-bounds.mjs:12-13`), so the dwell matches the no-change tolerance this system already
applies before it acts.

**Nothing executes this record today, and that is stated rather than implied.** No code path reads
`priority:` or `dwell:`; the loops named above run in the same order and within the same bounds they
ran in before this record existed, and the only ordering in this system that actually executes
remains the gate ladder's rungs. The proposer that would adjust a knob and the acceptor that would
commit the adjustment are out of this milestone's scope. The policy is declared now, where it can be
read and argued with, so that it is not authored later inside a proposer — which is precisely where
policy stops being reviewable.

**A node that resolves a conflict is not party to it.** This record declares no `actuator:`, nothing
it measures, no `cadence:` and no `ground:` of its own, and the kind admits none of them: an arbiter
that could declare an actuator could declare that it acts on what it arbitrates, and an arbiter that
could declare a ground could issue itself the authority that grounds the graph. It is none of the
four loops it vetoes. It declares **no `target-setting:` edge** — an arbiter that sets a target has
stopped arbitrating and become a supervisor. What sets *this* record's own reference is
`actor:operator`, which declares the inbound edge on its own record: the human owns what is worth
controlling at all, and an arbiter whose priority nobody is recorded as setting would be the
evening's mood again, one level up.
