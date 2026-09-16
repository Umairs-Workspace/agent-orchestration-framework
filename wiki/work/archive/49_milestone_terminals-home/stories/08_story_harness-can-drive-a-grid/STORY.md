---
type: story
number: 08
slug: harness-can-drive-a-grid
title: "The harness can drive a grid — N controls, a real shell, a real focus model and real keystrokes, so the terminals home can be proven rather than stubbed"
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
# 08 · The harness can drive a grid

## User story

As the engineer who has to believe this screen works,
I want the test harness to mount **many** terminal controls, inside a **real** shell, with a **real**
focus model and **real** keystrokes,
so that "the terminals home works" is something the suite can prove, rather than something five green
reviews said about a surface every harness had stubbed out.

## Tasks

- [ ] `tasks/00_the-harness-mounts-a-grid.feature`
- [ ] `tasks/01_the-harness-has-a-shell-a-focus-model-and-a-keyboard.feature`

## Notes

**Order.** Depends on nothing. **Story 05 depends on this** — that is the whole reason it exists.
Parallel-eligible with 00, 01, 02, 06 and 07's build.

### Why this is a story and not a paragraph inside story 05

It was a paragraph inside story 05 until the developer's feasibility pass measured what that paragraph
actually contained. The verdict was **"story 05 is not buildable as written — the harness is the story"**,
sized XL with **low** confidence, larger than the other seven stories combined. Six of the eight blockers
were harness capability, not grid logic:

- `withTerminalControl` mounts exactly **one** control and hard-codes its entry
  ([terminal-control-harness.mjs:48](../../../../../../test/support/terminal-control-harness.mjs#L48)), so
  every grid, focus and live-region scenario needs a harness that does not exist.
- `hasShellHost()` reads **false** in the harness bundle
  ([shell-bus.mjs:56](../../../../../../ui/src/app/shell-bus.mjs#L56)), so `offersFullscreen`
  ([TerminalControl.tsx:739](../../../../../../ui/src/terminal/TerminalControl.tsx#L739)) is false and
  **every expand scenario in the milestone is unreachable**.
- The DOM stand-in's `focus()` is a **no-op** with no `activeElement` and no key dispatch — so the whole
  focus model, `Enter`-to-present, `Escape`-claiming and roving-tabstop contract cannot be observed.
- `withMountedApp` builds its runtime with no `hostNode`
  ([react-app-harness.mjs:144](../../../../../../test/support/react-app-harness.mjs#L144) — cited at `:143`
  in FEASIBILITY, already drifted by one), so refs never bind; and all three surface harnesses stub
  `TerminalControl` **by module path**.

**Two of the feasibility pass's framings were refuted at the contract stage, and both make this story
SMALLER — take the smaller reading.** (1) `terminal-control-harness.mjs` **already passes `hostNode`**,
so the no-refs blocker is `withMountedApp`'s renderer alone, not both. (2) **mini-react already supports
N** — host refs are keyed by tree path and detached on departure — so the arity ceiling is the harness's
single `renderer.mount(...)` call, **not the renderer**. What looked like a rendering-engine limitation
is one line.

**And one blocker the feasibility pass missed, found by contracting it (F-49-08-QA-1):** there is **no
event propagation at all**. `click(node)` invokes one prop on one node directly and hands in a
`stopPropagation()` that nothing consults. Story 05's *"clicking the header's own controls does NOT
present the pane"* and *"a click into the byte area DOES"* are both claims about which handlers one
gesture reaches — unwritable against a direct prop call. That is scope this story must carry.

**Leaving that inside story 05 is the mistake this milestone is otherwise built to avoid.** The
milestone's own architecture names TECH_DEBT 29 as its cautionary tale — milestone 46 shipped its
headline control **opening no socket at all**, past 537 green tests, a 71-mutant battery and five
reviews, because every harness stubbed the thing under test. Story 05 would have been that story again,
with the harness work discovered mid-build under time pressure, which is precisely when the cheap answer
(stub it, assert the model instead) is the one that gets taken.

### This is TECH_DEBT 29's remedy, finished

The harness exists *because* of that lesson and was built with opt-in host refs for exactly this
purpose. It was built to the size of the problem m46 had — **one** control — and this milestone is the
first to need many. So this is not new infrastructure; it is finishing the thing that was started, and
its value outlives m49: every future UI story that renders more than one of anything needs it.

### Scope — capability only, no product behaviour

This story adds **no product code and no scenario about the terminals home.** It is done when the
harness can express what stories 03 and 05 need to assert:

1. **Mount N controls** with a caller-supplied entry, each addressable independently.
2. **A shell that is really there** — the bundled `shell-bus` present so `hasShellHost()` is true and
   the fullscreen door is genuinely open, since a harness that reports "no shell" makes the affordance
   *not offered rather than offered and dead*, which is correct behaviour and useless for testing it.
3. **A focus model that is real** — a live `activeElement`, `focus()` that moves it, and key dispatch
   that reaches handlers, so `Enter`, `Escape` and arrow-key roving are observable.
4. **Refs that bind**, so the opt-in host refs the harness already advertises actually populate.

**It must not weaken what the harness already guarantees.** The module-path stub filters exist so the
`*-app-harness.mjs` suites can render surfaces without a real xterm; this story makes stubbing
**opt-out for the terminal control** where a test asks for the real one, and changes nothing for the
suites that rely on the stub. `TerminalControl` entering the stub set is the specific regression to
guard against — story 05's socket proof dies silently if it does.

**PO ruling — prove the harness against a KNOWN answer, not against the grid.** The obvious trap is
writing the harness and the grid together and letting each excuse the other's failures. Drive the new
capability against something already true and already asserted elsewhere: the shipping board dock and
fleet card, whose behaviour m46 pinned exhaustively. If the harness cannot reproduce m46's own passing
assertions with N=1, it is not ready to be believed at N=12.

**Where this leaves story 05.** Still the milestone's heart and still large — but its remaining unknowns
are grid logic and shared-core edits, which the contracts already pin. The developer's own
recommendation was to spike the harness and the `ui/src/terminal/` blast radius **before scheduling**
story 05; this story is that work, made a deliverable with a contract instead of a spike, because the
outcome is a capability the repo keeps rather than a finding.
