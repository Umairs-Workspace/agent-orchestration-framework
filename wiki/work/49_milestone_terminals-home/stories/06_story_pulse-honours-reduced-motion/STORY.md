---
type: story
number: 06
slug: pulse-honours-reduced-motion
title: "The pulse honours reduced motion — a shipped accessibility defect whose own code comment claims it is already fixed"
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
# 06 · The pulse honours reduced motion

## User story

As an operator who has asked their system for reduced motion — because animation triggers migraine,
nausea or vestibular symptoms —
I want the terminal's pulsing state dots to **stop**,
so that a screen designed to be left open all day, showing a dozen live agents, is one I can actually
leave open.

## Tasks

- [ ] `tasks/00_the-pulse-stops-and-the-states-stay-distinguishable.feature`

## Notes

**Order.** Depends on nothing; nothing depends on it. It touches `ui/src/terminal/` and `ui/src/index.css`
and no file in `ui/src/home/`. **Parallel-eligible** — but it should land **before or with story 05**,
because one pulsing dot on one card is what hid this, and a grid of a dozen is what exposes it.

### This is not a gap. It is a false statement in shipped code

Measured at this refine and re-verified independently at source:

- [palette.mjs:186-188](../../../../../ui/src/terminal/palette.mjs#L186) states, in a comment:
  *"Both pulses honour `prefers-reduced-motion` through the existing scoping convention in
  `ui/src/index.css`, which is why the class is the house's own and not a terminal-local animation."*
- The **only** `prefers-reduced-motion` rule anywhere in `ui/` is
  [index.css:112-116](../../../../../ui/src/index.css#L112), and it names **`.aof-pending` alone.**
- `TERMINAL_MOTION_CLASS.pulse` emits a bare `animate-pulse`, and it is applied **unconditionally** at
  [TerminalIdentity.tsx:119](../../../../../ui/src/terminal/TerminalIdentity.tsx#L119). There is no
  `motion-reduce:` variant and no CSS rule that silences it.

So the escape hatch the comment points at does not cover the class it claims to cover. That combination
— a defect plus a comment asserting it is handled — is worse than an unhandled defect, because it stops
the next reader looking. It is the same species as the dead-code-with-a-live-gate finding that milestone
46 deleted (ADR-007) and the vacuous-sweep finding that produced ADR-006.

### The rule ([DESIGN DG-49-6](../../DESIGN.md))

1. **The pulse must actually honour `prefers-reduced-motion`** — either the reduce block at
   `index.css:112-116` grows to silence this control's dots, or `TERMINAL_MOTION_CLASS.pulse` emits the
   motion-safe variant. **Which one is the architect's call; that it holds is DESIGN's requirement.**
2. **With motion reduced, `connecting` and `streaming` stay distinguishable by their WORD and their dot
   colour** — milestone 46's rule 12, unchanged. The pulse is never the only difference between two
   states, so removing it may never remove a distinction.
3. **Fix the comment in the same diff.** A corrected mechanism beside a comment that was already wrong
   leaves the next author trusting the wrong half.

**PO ruling — the gate must be able to FIRE.** A fitness function that only ever shows the rule is
present is one refactor from asserting nothing. Whatever form the fix takes, the proof must include a
plant — motion emitted without its reduced-motion escape — driven against the **shipped** module, in the
discipline milestone 46's mutation review established after finding a plant being fed to a
locally re-implemented copy.

### The defect is confirmed in a REAL BROWSER, not only by reading

QA drove the cached headless Chromium against the **real built stylesheet** with the real emitted class
strings, reporting `getComputedStyle` back over a loopback port. Measured 2026-08-13:

```
no preference : connecting → pulse/2s | streaming → pulse/2s | waiting → none | .aof-pending → aof-shimmer/0.9s
reduce FORCED : connecting → pulse/2s | streaming → pulse/2s | waiting → none | .aof-pending → none/0s
```

Both terminal dots keep animating under `prefers-reduced-motion: reduce`; only `.aof-pending` stops.
Three harness facts worth carrying into the build: `--force-prefers-reduced-motion` genuinely flips
`matchMedia().matches`; `--dump-dom` **hangs** here, so the result must come back over a loopback POST
on `port: 0`; and the binary must be **discovered**, not hardcoded (`chromium-1234/chrome-win64/` on
newer builds, `chrome-win/` on older). **No dependency is added** —
`test/arch/acd-conformance-verdict-contract.test.mjs:86-87` forbids `playwright` in `package.json`.

**Whether this repo adopts a browser-driven lane at all is the architect's decision**, because it would
be its first. If declined, those scenarios become `@manual` unchanged and the pure-source scenarios stay
the automated guard. The contract is written so either answer works.

### ELEVEN more unescaped `animate-pulse` sites exist — filed, deliberately NOT fixed here

Measured across `ui/` at this refine: `Shell.tsx:458,596,597`, `BoardLanes.tsx:245`,
`DetailPanel.tsx:838`, `AssignmentChip.tsx:136`, `BoardDrillIn.tsx:78`, `PageStates.tsx:44,45`,
`SlotAids.tsx:81`. So the reduced-motion escape is missing across the tree, not only on this control —
twelve sites in total with the terminal's.

**They stay out of this story.** But note the interaction with the mechanism choice above, because it is
the one place scope discipline and the right fix pull in opposite directions: a **CSS-block** mechanism
(widening `index.css`'s reduce rule) would fix all twelve at once, while a **`motion-safe:` variant**
fixes only this control's dots. That is a genuine argument for the CSS mechanism, and the architect
should weigh it — but this story's *contract* is still only the terminal's two dots, and its gate should
be scoped so the other eleven do not turn it red before anyone has agreed to fix them.

**Scope discipline.** This story fixes **this** motion escape and adds the gate that keeps it. It does
not audit every animation in `ui/`, and it does not touch `.aof-pending`, which is genuinely covered
today. Milestone 49's grid separately adds **no motion of its own** — that is story 04's and 05's rule,
not this story's work.
