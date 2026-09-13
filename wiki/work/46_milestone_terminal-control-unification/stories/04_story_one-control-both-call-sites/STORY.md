---
type: story
number: 04
slug: one-control-both-call-sites
title: "One control, both call sites, and the duplicate deleted in the same diff — the board dock and the fleet peek become one component, and every gate's file list moves with the code it inspects"
parent: 46
status: done
owner: product-owner
created: 2026-08-08
updated: 2026-08-08
depends: [46/01, 46/02, 46/03]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 04 · The two terminals become one — and the second one is deleted

## User story

As the operator who sees a terminal in two places in this application,
I want both of them to be the same terminal — the same state words, the same chrome, the same
behaviour at the edges,
so that what I learn about one is true of the other, and a fix I ask for lands everywhere rather than
in whichever of the two I happened to be looking at.

This is the milestone's headline story. It renders the control from `46/03`'s core, points
[Board.tsx](../../../../../ui/src/board/Board.tsx) and
[Fleet.tsx:759](../../../../../ui/src/fleet/Fleet.tsx#L759) at it, and **deletes**
`ui/src/board/TerminalDock.tsx`, `ui/src/board/terminal/` and `ui/src/fleet/terminal-view/` in the same
change that replaces them.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_one-control-renders-both-sources.feature`
- [ ] `tasks/01_collapse-keeps-the-session-hide-ends-it.feature`
- [ ] `tasks/02_the-duplicate-is-deleted-and-the-gates-follow.feature`
- [ ] `tasks/03_the-unavailable-pane-names-its-cause.feature`
- [ ] `tasks/04_the-two-terminals-agree.feature`

## Notes

**Order.** Depends on **`46/02`** (the origin it is handed), **`46/03`** (the core it consumes), and
**`46/01`** — the last one added at the developer's feasibility pass and it is a *file* dependency, not
a logical one: **both `46/01` and this story rewrite
[acd-fleet-terminal-input-constrained.test.mjs](../../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs)**.
`46/01` re-aims detector #4 at the real producer; this story re-points five clauses of detector #5 and
re-expresses invariant 4. Two parallel agents rewriting one 620-line arch test — the most delicate file
in the milestone — is a guaranteed conflict in the worst possible place. Serialised deliberately.
**`46/05` depends on this.**

**This story REGISTERS the two whole-tree gate clauses `46/03` cannot make green.** `46/03` authors
`acd-terminal-origin-not-port` and `acd-terminal-control-boundary`, and each has a half that is green on
its own arrival (nothing in `ui/src/terminal/` names a port; the shared set imports no React and nothing
cross-surface) and a half that stays **red until this story lands** (no `ws://` URL *anywhere* in
`ui/src` carries a port literal; `DOCK_STATES`/`TERMINAL_VIEW_STATES` are defined *nowhere* in `ui/src`).
The whole-tree clauses register **here**. The reason is operational and the developer's pass caught it:
with four stories in flight at once, registering a knowingly-red gate in `scripts/test.mjs` at `46/03`
makes *every parallel story's* "@executable suite green" accept criterion unmeetable, and a story cannot
tell its own red from someone else's. Each half lands in the story that turns it green.

**BOTH CALL SITES AND THE DELETION ARE ONE STORY, DELIBERATELY.** The architect names the alternative as
**the tempting bad cut** ([§Story-boundary guidance](../../ARCHITECTURE.md)): re-homing the board first
and leaving the fleet peek "for now" is *the two-implementations state this milestone exists to end,
held on purpose across a story boundary*. It also strands
[acd-shell-z-ladder-single-home's exemption](../../../../../test/arch/acd-shell-z-ladder-single-home.test.mjs)
(which retires **with the file**) and leaves the single-xterm-site gate red with no story owning it.
The graph says the reach is genuinely tiny — each component has exactly **one** importer — so this is a
sequencing decision, not a blast-radius one.

**The second bad cut, also forbidden: separating an arch-test file-list update from the move it
follows.** In between, CI is either red for a whole story or — worse — green and vacuous. **Every list
moves in the diff that moves the code.**

**ADR-006's finding, and it is the sharpest thing in this milestone.** "Update the file list, never the
invariant" is necessary and **not sufficient** for invariant 4. That detector is a *directory sweep* over
`ui/src/fleet/**` ([acd-fleet-terminal-input-constrained.test.mjs:490-502](../../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L490-L502)),
asserting no file under it wires `onData` or sends on a socket. Once the control lives in
`ui/src/terminal/`, the fleet will mount a component that genuinely does both — and **the sweep stays
green while asserting nothing**. Invariant 4 must be **re-expressed at equal strength**: call-site
posture, plus an exhaustively-driven pure policy function, plus the surviving sweep. A vacuous green gate
is the failure this story would otherwise ship, and it would ship it looking like success.

**Invariant 4 must still HOLD at the end of this milestone.** The fleet page wires no input source.
Reversing it is milestone 49's job. This story preserves it exactly as it stands — and the same detector
file also asserts the fleet still *mounts* a mirror consumer and still names `/ws/terminal-view`
(`:500`, `:506-508`), which are assertions about names that are about to change. Their invariant
survives; their spelling does not.

**Governing ADRs: [001](../../ARCHITECTURE.md), [002](../../ARCHITECTURE.md) (interactivity is
`source.canInput && !mount.readOnly` — the same `mirror` is interactive in the dock and read-only on the
card, so one flag cannot express what ships), [003](../../ARCHITECTURE.md), [005](../../ARCHITECTURE.md),
[006](../../ARCHITECTURE.md), [007](../../ARCHITECTURE.md).** DESIGN's
[§Read-only is a posture](../../DESIGN.md) is binding: under one control **neither** posture has an
input row, so the old "absent, not disabled" signal no longer distinguishes anything — the `read-only`
**label** and the non-blinking cursor are the only two signals left, and the label may never yield.

**Three latent bugs the unification forces out** ([DESIGN §What visibly changes](../../DESIGN.md)) —
record them as fixes, not as regressions: the dock's error message **overprints the viewport today**
([TerminalDock.tsx:420-424](../../../../../ui/src/board/TerminalDock.tsx#L420-L424), a straight V11
violation); the fullscreen bar does too; and **a `mirror` in the board dock is cropped today** — resized
to 80×24 (≈640×408px) and painted at natural size into a 280px dock, never scaled.

**DG-46-3 — `unavailable` ships with NO producer in m46** ([DESIGN](../../DESIGN.md)). The state is
built, unit-driven, and rendered from a **fixture**. A conformance reviewer must not log its absence from
a production render as a fresh finding. Its producer is milestone 49; the `@uat` row travels to 49's
gate rather than being deleted. Named in advance precisely so a reviewer can tell "not built" from
"built and never triggered".

**Headroom to watch.** `Fleet.tsx` is 1,541 lines against a 1,560 ratchet — 19 lines of room. Re-homing
the peek should come out **net-negative** there; if it does not, that is a signal the call site is
absorbing logic that belongs in the control. The control itself takes a
[acd-ui-surface-file-budget](../../../../../test/arch/acd-ui-surface-file-budget.test.mjs) entry **at
delivery**, set just above its delivered size — the same rule that budgeted `ui/src/config/App.tsx` at
m45's structural review. A naive union of the two files is ~900 lines, which is how `DetailPanel.tsx`
reached 1,123 one justified block at a time. The ceiling may **not** be met by deleting rationale
(ADR-014/E3): the 80×24 soak and the collapse-must-not-tear-down rule are hard-won and must survive the
move.

### PO rulings, 2026-08-08 (from QA's contract pass)

**Detector #5 asserts two SPELLINGS this milestone is required to change — expect it, do not be
surprised by it.** This is the concrete form of ADR-006's rule, and QA found both clauses at source:

- [`:521`](../../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L521) requires the
  dock's `remote ·` badge to exist. **DESIGN change 8 retires that badge** — the identity line now reads
  `→ <nodeId>`. The invariant ("a remote session SAYS it is remote, never colour alone") survives; the
  needle does not.
- [`:522-525`](../../../../../test/arch/acd-fleet-terminal-input-constrained.test.mjs#L522-L525)
  requires the dock **not** to contain `disableStdin: true`. After unification there is **one control
  file**, and the fleet's read-only mount must construct exactly that. **A needle re-pointed literally at
  the control would forbid the read-only posture this same milestone is required to preserve.** The
  invariant ("the dock does not ship a half-disabled widget that swallows keystrokes silently") is now
  owned by the input policy — `inputEnabled = source.canInput && !mount.readOnly`, driven exhaustively.

Both are the *spelling* moving while the *invariant* holds — exactly what ADR-006 predicts. Flagged in
task 02's header so the build meets them at the door rather than through a confusing red.

**`acd-vibeyard-attribution` holds SEVEN entries, five of them under `ui/` — not the six ADR-006 cites.**
Counted at source: `TerminalDock.tsx`, `terminal/dock-state.mjs`, `terminal/provider-picker.mjs`,
`terminal/resize.mjs`, `terminal-view/FleetTerminalView.tsx` — **all five move or die in this story.** A
`readFile` on a missing path throws, so an under-counted move fails CI loudly rather than silently; the
real risk is a reviewer ticking the list off against the wrong number. Use the file, not the ADR's count.

**This milestone's own seam creates a THIRD `unavailable` cause, and the copy is not yours to invent.**
Spike 44 fixes two — `not checked out on this machine` and `board unreachable`. Neither covers *"the
board holds no fleet origin at all"*, which is precisely what `46/02`'s seam introduces. It is reachable
only from a fixture in m46 (the command layer always resolves a default), so it is not urgent — but if
it cannot be satisfied from DESIGN's fixed wording, **raise it as a design gap against
[DESIGN §The unavailable pane](../../DESIGN.md) and amend there.** Do not write new operator-facing copy
inside a story.

**The input policy FAILS CLOSED.** An unknown source, an absent posture, or a mis-cased posture key
yields no input. This is the only reading consistent with ADR-002's "`canInput` is not a permission": an
unknown input may cost a keystroke, but it must never tell the operator a keystroke landed when it did
not. Ratified as QA read it.

**Attribution travels with the derivation.** Both files carry vibeyard (MIT) provenance headers and
[acd-vibeyard-attribution](../../../../../test/arch/acd-vibeyard-attribution.test.mjs) reads the list.
It fails loudly if the move lands without it, which is correct.
