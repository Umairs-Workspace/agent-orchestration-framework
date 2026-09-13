# 126/03 — build brief

Advisory, and the builder's. Not a contract: the task `.feature` scenarios are. Deviating from this
is not a finding.

## The mechanism

Read the engine before changing anything, because almost all of it stays. The watchdog loop, the
backoff, the crash-versus-clean-exit classification and the Job Object are reused verbatim. Exactly
three things are hard-wired and they are the whole change: the role `match` that picks the set, the
two fixed signal fields on the shared state, and the two controllers the engine constructs by name.

**The shape.** Make the supervised child owned — an id, a label, a string argv, an optional working
directory — so a row from the poll can become one. The two daemons keep their constructors, now
returning owned values with no cwd. Turn the two signals into a map keyed by id, with the daemons
holding reserved ids, and make the existing accessors read the map so the six consumers in the
shell's main file keep asking for what they already ask for.

**The plan.** Put the reconcile decision in the core crate as a pure function — the row set and the
live controller set in, a plan of start/stop/retain out — because the test lane runs `cargo test`
over the core only and merely checks the shell; a test written beside the spawning code would never
run. The properties to get right: a row with no child starts; a child with no row stops; both
retains; a *held* declaration (the operator has started or stopped it by hand) is neither started
nor stopped by a tick; and a child that exited 0 while its row persists is started **again**. That
last one is the level-triggered property. Do not give the reconciler an exit-code rule — the
supervisor never learns what a loop is or why it stopped.

**The poll.** One interval, one spawn. Pass the declarations flag on every tenth tick and apply the
plan from the parsed rows; the role latch for the server stays exactly as it is. Every declaration
spawn resolves the co-located `aof` path, passes a plain argv, sets the row's cwd, and joins the Job
Object like the daemons do.

**The two surfaces.** Add the store's `duplicate-run` refusal as a fourth named clean exit so a loop
launched over a scope someone is already driving in a terminal is surfaced, not restart-stormed. And
on an exit-0 child, surface its last output line through the notice the desktop window's footer
already shows — a halted loop's stop, ref and resume command is the sentence the operator most
needs, and today it vanishes. Clear that notice per child, not on any child's start: with several
declarations churning, a global clear erases a halt before anyone reads it. A named clean exit holds
the declaration the way an operator Stop does, released when its row disappears — otherwise a
`duplicate-run` against a scope someone is driving by hand is re-attempted every tick.
The roster control in the arch tree becomes an allow-list of exactly four verbs; `work loop` is
admitted there, in writing.

## The verification step

`cargo test` over the core crate covering all four plan outcomes and the hold. A Node sweep of the
Rust tree confirming no set is selected by the role, no loop vocabulary leaks in, and a planted
`["work","tune"]` spawn reds the roster. Then the manual one that matters: a supervised declaration
whose last run is reclaimed, a real supervisor, and a real relaunch with no console that drives a
Claude PTY to completion — the same shape the supervised control daemon already runs.

## Deliberately out of scope

The two daemons are not supplied by the answer (`mesh status` is itself one of the spawns — no base
case). No completion semantics, no `kind` field, no scheduler. The answer's shape is `126/02`'s.
