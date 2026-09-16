# 124/01 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

Start by believing the surprising half of the research, because the obvious reading of this story is
wrong. The loop **already knows how to dispatch refine**, live, today — the pure decider returns
that phase for a milestone with no stories and for a story with no tasks, and refine is a fully
driven phase end to end, not a stub. Nothing needs teaching. What is missing is that the cap which
actually stops the range is a *second* counter the shell keeps privately, consulted after the act
has already been chosen; when it trips it returns without ever asking the decider again, so it never
reaches a branch sitting one function away in the module it just called.

So the change is subtraction, not addition. The shell stops minting a halt of its own and asks the
decider, handing it the cycle and cap it was already holding. The decider answers with the
**existing** drive-refine shape. Resist every temptation to add vocabulary: no new stop name, no new
counter, no new persisted key, no new transport field. If you find yourself adding one, the design
has drifted — the whole point is that both bounds already exist and only need to be asked.

Two bounds, and they are different bounds, which is the part that is easy to get half-right. A unit
that exhausts is offered back to its plan **at most once per invocation** and then set aside — skip
the set-aside and the next scheduling pass simply re-offers the same ready item forever, so the
first bound is what stops a livelock rather than what stops a recursion. The second is that a plan
which keeps collecting exhausted units is itself re-entered no more than the cap allows, counted
under its own key in the map that already exists. Derive the plan reference rather than reading it:
a story's plan is its parent, a driver's plan is itself.

The trap worth naming: the engine's own cap guard **never fires in the live path** — the decider is
never told the cycle at any call site, so several of its branches are unreachable. That is real, it
is ledgered, and this story deliberately does not fix it. Do not "helpfully" pass the missing key on
the way past; making one branch live while three stay dead is worse than four plainly dead, because
the next reader can no longer tell which is which. Pass the shell's own cycle and cap into the
decider as an argument and leave the rest alone.

## The verification step

The check that proves this story is a loop run over a range where one unit exhausts: the range must
**keep going**, the exhausted unit's plan must be driven for refine exactly once, and the unit must
not be offered again. Then run the same scenario with a plan that exhausts repeatedly and confirm it
stops at the cap rather than cycling — that second run is the one that would expose an escalation
with no ceiling, and it is the run most likely to be skipped.

Confirm separately that the other eleven stops still terminate the range exactly as before. This
story changes the behaviour of one stop; a diff that changes two has changed one too many.

## Deliberately out of scope

The engine's dead cap is not repaired here — it is a ruling about which module owns the loop's state
machine, across two files with dozens of dependents each, and it belongs to whoever makes that
ruling. The ledger entry recording it is written out verbatim in this milestone's architecture
document and only needs appending. The stop vocabulary does not grow. And nothing here starts
observing loop cycles: that is the milestone's own deferred neighbour, and reaching for it is how
this story turns into three.
