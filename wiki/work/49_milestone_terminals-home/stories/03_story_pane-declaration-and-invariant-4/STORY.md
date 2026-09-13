---
type: story
number: 03
slug: pane-declaration-and-invariant-4
title: "The pane declares itself and the gate says so — the control's FOURTH host, the mount module, the posture derived from the feed axis, and invariant 4 amended in exactly one of its three parts"
parent: 49
status: done
owner: product-owner
created: 2026-08-13
updated: 2026-08-13
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
-->
# 03 · The pane declares itself, and the gate says so

## User story

As the operator about to be handed a screen that can type into agents on other machines,
I want the rule that decides *whether a pane may be typed into* to live in **one declaration**, and the
fitness function that has guarded that rule since milestone 38 to be **rewritten to cover the new
surface rather than quietly stop applying to it**,
so that the moment the fleet origin becomes interactive is a deliberate, reviewed, still-guarded act —
not a gate that went green because the code moved out from under it.

This is the milestone's one genuinely deliberate reversal. SPEC and STATE both insist on it: invariant 4
of `acd-fleet-terminal-input-constrained` currently reads *"THE FLEET PAGE STAYS A MONITOR"*, and it is
true today. This milestone makes the fleet origin an interactive surface, so that invariant **must be
rewritten — never deleted, and never left to fail silently.**

## Tasks

- [ ] `tasks/00_the-fourth-host.feature`
- [ ] `tasks/01_the-mount-declares-the-posture.feature`
- [ ] `tasks/02_invariant-4-amended.feature`

## Notes

**Order.** Depends on **02** (the posture is derived from the feed axis). Story **05** depends on this.

**Governing ADRs: [ADR-007](../../ARCHITECTURE.md) (the fourth host + posture),
[ADR-008](../../ARCHITECTURE.md) (the amendment).**

### Why the amendment and the mount module are ONE story — STATE asked for a boundary, and this is it

STATE says the amendment should *"have its own story boundary at refine"*, and it is right. It is
**wrong if read as its own diff**, and ARCHITECTURE names that as bad cut 2 with the mechanism spelled
out: part 1's new surface→posture-home table **names** `ui/src/home/session-mount.mjs` and the amended
gate **imports** it. Before the module exists, CI is red for a whole story. After the module exists but
before the table is updated, CI is **green and vacuous about the new interactive surface** — which is
the dangerous one, and is *this gate's own recorded history*: milestone 46/ADR-006 diagnosed exactly
that failure when the control moved out of the swept directory, and said in terms that a green gate is
read as a satisfied contract, which is worse than a deleted one.

So the boundary is real and the subject of this story **is** the amendment. The module is what makes the
amendment assertable.

### The amendment, precisely — one part changes, two do not

- **Part 1 (the call site) CHANGES.** It generalises from "the fleet directory declares read-only" to a
  **surface→posture-home table** covering all three surfaces, their three JSX mount sites, and a
  fail-closed behavioural row. The property it has always asserted — *a value that decides a permission
  has exactly one author, and a posture may not be assembled at a render site* — survives verbatim and
  now covers a surface that can genuinely type.
- **Part 2 (the policy) IS UNTOUCHED.** `inputEnabled = source.canInput && !mount.readOnly`, driven over
  the whole frozen source table × both postures × every malformed declaration, is exactly as strong for
  an interactive fleet surface as for a read-only one. Nothing about this milestone weakens it.
- **Part 3 (the sweep) IS UNTOUCHED AND GAINS A DIRECTORY.** It keeps walking `ui/src/fleet/**` and now
  also walks `ui/src/home/**`. This matters because of where ADR-001 puts the home: a new top-level
  directory would otherwise sit **outside** the only sweep that catches a new surface file wiring a
  socket of its own — the same blind spot, one milestone later.

**Nothing is removed and nothing is exempted. The replacement must be strictly stronger, and the story
must show that** — every existing assertion surviving, plus three added.

### The posture, and why the read-only fallback is reachable rather than decorative

Milestone 46 left this as **one literal at one call site** and said so:
*"Milestone 49 changes THIS ONE WORD, at THIS ONE CALL SITE, and the control does not change at all."*
Honour that. The grid pane declares `interactive` — but ADR-007 **narrows it by the feed axis**, failing
closed to a **labelled** read-only.

That narrowing is what makes SPEC's read-only fallback real. SPEC requires that *"a session that cannot
accept input renders as labelled read-only, never as a pane that silently swallows keystrokes"* — and
research measured that a keystroke into a free session is **silently swallowed at one of two hops**.
Without the narrowing there is no producer for that state and the requirement would be satisfied by
nothing; with it, the honest label appears exactly where the keystroke would have died.

**`SET_POSTURE` costs the SESSION, and this story must not discover that the hard way.**
[host-model.mjs:287](../../../../../ui/src/terminal/host-model.mjs#L287) records it for this milestone by
name: *"stdin is fixed at xterm construction — UNREACHABLE in m46, named so m49 does not discover it."*
A pane that is read-only inline and interactive when expanded would rebuild the xterm and reopen the
socket, and because the mirror is ephemeral the pane would come back **empty**. Hence
[DESIGN DG-49-5](../../DESIGN.md): both hosts share one posture, and *taking the keyboard is the expand*.

**The fourth host and its mount land together.** A host with no mount is an unreachable table; a mount
naming an unknown host **fails closed to no affordances**
([host-model.mjs:144-152](../../../../../ui/src/terminal/host-model.mjs#L144)) — a pane with no controls
at all, which reads as a rendering bug rather than as a missing table.

**Declare every affordance, including the absences, with a reason.** `host-model.mjs`'s existing tables
use `notDeclared("…")` so a reviewer can tell a decision from an omission. DESIGN §S2 rules the fourth
host's eight: `watch-hide` and `fullscreen` on; `collapse`, `close`, `drag-resize`, `restart`,
`provider-picker` and `exit-fullscreen` off, each with its stated reason. Note
[DESIGN DG-49-9](../../DESIGN.md) in particular — on this surface `close` could only honestly mean *stop
watching*, and an `✕` that unsubscribes is exactly the form↔cost lie `affordanceFormViolations` already
refuses as a value.

### PO rulings, 2026-08-13 (from QA's contract pass)

**Two shipped suites go RED in this diff and must move WITH it, not after it.** Adding a fourth host
breaks `test/terminal-collapse-is-not-hide.test.mjs:221` (`TERMINAL_HOSTS.length === 3`) and
`test/terminal-one-implementation.test.mjs:245-248`. Both are counts, not invariants — the m46/ADR-006
rule applies verbatim: **update the list, never the invariant**, in the same diff that moves the code.
Neither is a licence to relax what they assert.

<!-- HALF-CORRECTED at build, 2026-08-13 (PO). The FIRST half held exactly as written:
`terminal-collapse-is-not-hide.test.mjs:221` went red and was updated as a LIST
(`TERMINAL_HOSTS.length === 4`), with a comment recording that the rule is over EVERY host and the
count is only its non-vacuity. All four hosts are still driven; 30/30 green.
THE SECOND HALF WAS FALSE. `terminal-one-implementation.test.mjs:245-248` did NOT go red, because
those lines enumerate the FLEET CARD's ON/OFF sets only, and a fourth host does not touch them —
28/28 green, file unedited. The developer flagged it rather than editing an m46 scenario to carry m49
content, which is the right call and the one this ruling would have pushed against: had they "fixed"
it to satisfy my premise, they would have widened an m46 invariant to mention a host it was never
about. The coincidence claim this ruling wanted is asserted instead in task 00's own "the verdicts
coincide" scenario, where it belongs.
SIXTH stale premise in this milestone, and the first one that was MINE. It is the same species as all
the others — a claim about the tree stated confidently in a record doc and checked by nobody until a
builder ran it. See STATE §Feedback. -->


**The JSX floor is the live hazard, and the contract may not leave it whole-clause.** ADR-008 generalises
part 1's bare-call clause to three surfaces but not its **floor**, which today is
`assert.ok(mountProps.length >= 1)`. Generalised as written, one fleet match satisfies it and **the new
interactive home site is policed by nothing while CI reads green** — this gate's own recorded failure
mode, arriving at the exact clause m46 rewrote to prevent it. Per-surface floors plus
discovery-by-sweep, and the architect has been asked to ratify that in ADR-008.

**The two part-1 clauses stay ASYMMETRIC, deliberately.** `INTERACTIVE_DECLARATION` remains
**fleet-scoped** — `ui/src/board/dock-mount.mjs` names the interactive posture today and the home must
too, so generalising that needle makes the amendment unsatisfiable — while the **authorship** clause
(`posture:` has one author per surface) covers all three. And the authorship clause must **not** reach
`ui/src/terminal/**`, where `TerminalControl.tsx` writes `posture: mount.posture` as a read-through; a
sweep that flags the shipped control is a gate nobody can keep green.

**Naming: RULED — `HOST_GRID_PANE = "grid-pane"`.** Name↔value matched, as both m46 hosts are, taking
DESIGN §S2's value. **The directory stays `ui/src/home/`** — a folder and a host are different things
and neither is renamed to match the other. Worth spelling out because an unknown host **fails closed to
no affordances at all**, which reads as a rendering bug rather than a one-character typo and is one of
the few defects here that no gate would name.

**The host table gains a second declaration beyond the eight affordances (ADR-007 amendment A):
whether this host shows a byte-area BOX when nothing is bound.** Today `TerminalControl`'s
`{subscribed ? … : null}` guard conflates *is a socket open* with *does this host show a box* — which is
why the held over-cap tile and the `no live output` pane both have nowhere to render their line. Making
it an unconditional byte area would regress the fleet card's deliberately header-only rest state, so it
becomes a **value in this table**, drawn from the ramp's existing `PANE_*` set plus "no pane". One
condition becomes one table lookup. Story 05 observes it; this story declares it.

**The grid pane's `AFFORDANCE_FULLSCREEN` carries a NEW FORM — pane-activation — not a new prop.**
DG-49-5 needs `Enter` on a tile and a click into the byte area to present the pane; ADR-007 forbids a
prop, and a host may not be handed presentation at all (the request carries the live DOM node the shell
adopts, which m46/ADR-009 keeps away from hosts). So it is one new value in the existing **closed**
`form` vocabulary — `changeForAffordance` already maps the affordance and `affordanceFormViolations`'
cost clause polices the new form on arrival, which is exactly the property that made these tables worth
building. It is per-host for a measured reason: on the **dock**, a byte-area click must focus xterm *to
type*, and converting that into a present would take typing away from the surface m42 deliberately made
typeable.

**Two stale pointers, corrected so they do not rot further.** [SPEC.md](../../SPEC.md) still cites
`ui/src/fleet/terminal-view/FleetTerminalView.tsx:170`, a path m46 deleted — the invariant it describes
is unchanged, only the pointer is dead. And part 3's fleet sweep sees **14** files, not the "20" ADR-008
states: six `.d.mts` are excluded at `acd-fleet-terminal-input-constrained.test.mjs:341`, which is why
the type-only edge belongs to `acd-terminal-control-boundary` instead.

**PO ruling — the amended gate's plants must be fed to the SHIPPED detector.** Milestone 46's mutation
review found a plant being fed to a locally re-implemented copy inside the suite, so the shipped detector
was never once driven to a violation and would have read green if mutated to return `[]`. Every new or
amended clause here proves it can **fire**, against the real module.
