---
type: story
number: 05
slug: dock-shell-host
title: "The dock becomes a shell overlay occupant with a published inset — it costs the content region its height exactly as it does today, covers nothing the operator can still act on, and fullscreen adopts the live node rather than rebuilding it"
parent: 46
status: done
owner: product-owner
created: 2026-08-08
updated: 2026-08-08
depends: [46/04]
schema: 1
aofVersion: 0.1.0
---
<!--
  STORY.md — the story record. Answers ONE question: why this story (the user-facing outcome)?
  Owner: product-owner. The USER STORY lives here, never on the tasks.
  A milestone-bound story inherits the milestone's ADRs / DESIGN / RESEARCH; a standalone story
  (no parent) is self-contained.
-->
# 05 · The dock's home in the shell — and the inset that keeps the buttons reachable

## User story

As the operator with a terminal open on the board,
I want the dock to take its space from the page the way it always has,
so that opening a terminal never puts my work item's action buttons underneath it.

Milestone 45 ruled the dock's region home is the shell's `overlay` — out of flow, a sibling of
`content` ([45/ADR-005 [Build-3]](../../../45_milestone_ui-app-shell-routing/ARCHITECTURE.md)) — and
[Shell.tsx:316-360](../../../../../ui/src/app/Shell.tsx#L316-L360) already renders that row with a
comment naming *"m46's dock"* as its next occupant. But there is **no channel** by which a surface can
put a dock there: the bus offers only `SLOT_SURFACE` and `SLOT_NOTICE`
([shell-bus.mjs:30-31](../../../../../ui/src/app/shell-bus.mjs#L30-L31)) plus the fullscreen door. This
story builds the channel — and the inset that stops the move from costing the operator their buttons.

## Tasks

<!-- The tasks that satisfy this story, each a tasks/NN_<slug>.feature whose scenarios are the
     acceptance criteria. A task is done when its @executable feature is green. Keep tasks
     independent of OTHER stories' tasks; sequential within this story is fine. -->

- [ ] `tasks/00_the-dock-is-contributed-to-the-overlay-region.feature`
- [ ] `tasks/01_the-dock-inset-is-published-and-the-content-box-honours-it.feature`
- [ ] `tasks/02_fullscreen-adopts-the-live-node.feature`
- [ ] `tasks/03_an-open-dock-covers-nothing.feature`

## Notes

**Order.** Depends on **`46/04`** (there must be one control before it gets a home). Nothing depends on
this. The architect keeps it separate **so the shell edit is reviewed as a shell edit** — three files
with high symbolic weight and small diffs (`shell-bus.mjs`, `Shell.tsx`, `Board.tsx`).

**Governing ADR: [ADR-009](../../ARCHITECTURE.md).** Its clauses, in short: a **third slot** on the
existing region-keyed bus, taking `z-30` from the ladder by import and never by retyping; the degraded
no-shell path preserved (a contribution with no shell renders **in place**, so
`test/support/board-app-harness.mjs` keeps working untouched); **no per-surface `fixed inset-0` layer** —
that is ADR-005's named prohibition, and
[FleetTerminalView.tsx:411-412](../../../../../ui/src/fleet/terminal-view/FleetTerminalView.tsx#L411-L412)
is the one live violation, carried by m45 on a shrink-only exemption *because this milestone deletes the
file*. Re-creating that shape under a new name would make the exemption permanent.

**DG-46-1 — this story's reason to exist** ([DESIGN](../../DESIGN.md)). Today the dock is an in-flow flex
child of the board's `h-dvh overflow-hidden` column
([Board.tsx:561-563](../../../../../ui/src/board/Board.tsx#L561-L563)), so opening it **shrinks** the
lanes and the detail panel and everything stays reachable. An overlaying dock at the default 280px covers
the bottom 280px of the detail panel — which is exactly where its action strip lives. **An extraction
that takes the operator's buttons away is not an extraction.** m45 named the escape hatch in advance: a
**published dock inset**, a named custom property of the same species as `--aof-shell-chrome-height`,
which the content region pads its bottom against. Per m45's own clause this **amends 45/ADR-005 and
45/DESIGN DG-45-2 in the same change** — never as a CSS decision taken quietly inside a story.

**The drag clamp moves off the viewport.** [TerminalDock.tsx:120](../../../../../ui/src/board/TerminalDock.tsx#L120)
clamps to `Math.round(window.innerHeight / 2)` — wrong by exactly the chrome height under a shell. It
becomes a pure function of the content box using `CHROME_HEIGHT_PROPERTY` / `CONTENT_HEIGHT_EXPRESSION`
([shell-layout.mjs:274](../../../../../ui/src/app/shell-layout.mjs#L274),
[:278](../../../../../ui/src/app/shell-layout.mjs#L278)), the same primitive
[Board.tsx:420](../../../../../ui/src/board/Board.tsx#L420) already sizes itself with.

**This story owns the behavioural proof m45 deferred to it.**
[test/shell-not-found-and-fullscreen.test.mjs:528-535](../../../../../test/shell-not-found-and-fullscreen.test.mjs#L528-L535)
says so in terms: the adoption half *"needs a real DOM and belongs to m46, where a real xterm and a real
socket exist to survive the transition"*. The pin: present → dismiss, and the **same** xterm instance,
the **same** socket and the **same** scrollback are still there.

**Stated so no task promises it: a session does NOT survive navigation between surfaces, and this
milestone does not make it.** m45's nav is real `<a href>` with no client-side interception
([Shell.tsx:395-398](../../../../../ui/src/app/Shell.tsx#L395-L398)) and the entry evaluates its route
once at module load ([main.tsx:49-61](../../../../../ui/src/main.tsx#L49-L61)) — a surface change is a
**full document load**, so the PTY dies at the browser before React gets a say. [Build-3]'s conclusion
is right; its stated mechanism is not, and ADR-009 corrects it. The reasons to host in `overlay` are
stacking, one home for out-of-flow layers, and a clean adoption boundary — **not** session persistence.
A control whose docs implied otherwise would have operators losing work to a click on "Fleet".

### PO rulings, 2026-08-08 (from QA's contract pass)

**This story writes the gate ADR-005's `fixed inset-0` prohibition never had (QA finding 1).**
`acd-shell-z-ladder-single-home` catches only the `z-50` half of the one live violation, and **its
exemption retires with the FILE, not with the RULE** — so the day after `46/04` deletes
`FleetTerminalView.tsx` there is nothing stopping the extracted control, or milestone 47/49, from
re-creating that shape under a new name. ADR-009 says in terms that doing so would make the exemption
permanent. A rule whose only enforcement was an exemption on a deleted file is not enforced.

**A COLLAPSED dock costs the content region its header, and publishes a measured inset (QA finding 2).**
DG-46-1 and ADR-009 both speak of an *open* dock — but collapsed is a steady state whose header still
paints over the content region, so a collapsed dock publishing a **zero** inset covers the bottom of the
detail panel by exactly the header's height. That is the same defect, smaller and harder to see. Ruling:
the inset is **measured**, exactly as m45 treats the notice rail's height — content-driven, an input to
the model, never a number the model invents. Zero is reserved for a dock that is genuinely absent.

**When the box is smaller than the dock's minimum, the minimum yields to the ceiling (QA finding 3).**
DESIGN §S1 gives `min 48` and `max floor(box/2)` and does not say which wins when `min > max`. The two
compositions give different answers — `min(max(x,48),16) → 16` versus `max(min(x,16),48) → 48` — and
**only the first honours DG-46-1**; the second puts the dock's own drag handle above the content region,
which is the exact failure this milestone's design gap exists to prevent. Ruling: the ceiling wins.

**An unmeasured box does not resize the dock at all (QA finding 4).** Mirrors the geometry helper's
zero-box guard: snapping to 0 or to the minimum on the first frame is a visible jump on every mount that
the next tick undoes.

**The keyboard-resize obligation stays, judged at `@uat` (QA finding 7).** DESIGN §Accessibility 8 has
no precedent in this repo and no executable home — but a `role="separator"` only a pointer can move is a
control a keyboard user cannot reach, which is a defect regardless of where it is proved. QA's scoping
into task 03 is ratified, including its `Then` that **pointer and keyboard must not disagree about the
maximum** — one clamp, two input methods. (The a11y lane is off in this project: `work.tags.domains`
carries no `a11y` tag and there is no `work.ui.a11y` block, so there is no axe-core run to lean on and
human judgement is the whole gate.)

**Two build obligations that are not scenarios and will be missed unless restated at delivery.**
(a) DG-46-1's close condition requires the inset to **amend 45/ADR-005 and 45/DESIGN DG-45-2 in the same
change** — DG-45-2's `dock` row currently states that an open dock *overlays* and does not shrink, and
that sentence becomes **false** the moment this ships. (b) The `Shell.tsx` budget entry, below.

**If this story touches `Shell.tsx` it adds the budget entry at delivery**
([ARCHITECTURE §Codebase health finding 5](../../ARCHITECTURE.md)) — `Shell.tsx` is 842 lines and
unbudgeted, and ADR-009 adds to it. Same rule that budgeted `config/App.tsx` at m45's review.
