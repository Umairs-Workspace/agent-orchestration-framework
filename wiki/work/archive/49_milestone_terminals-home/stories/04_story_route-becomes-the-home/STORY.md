---
type: story
number: 04
slug: route-becomes-the-home
title: "`/` becomes the terminals home — a real routed surface inside the shell's crash containment, with its own honest states, and Landing.tsx deleted rather than kept beside it"
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
# 04 · `/` becomes the terminals home

## User story

As the operator opening this product,
I want `/` to be **the terminals home itself** — a real surface that fetches, that can be empty, that
can fail, and that says which of those is true —
so that the first thing I see is my fleet rather than a placeholder pointing at the pages where the
real work is.

Milestone 45 shipped `/` as a deliberate placeholder and predicted this story in a comment:
*"Milestone 49 replaces what this route RENDERS; it does not rename the route."* The route id survives.
What changes is that `/` stops being a card the shell draws itself and becomes a surface the shell
**hosts** — which matters for a reason m45 could not have known it would matter: the shell-rendered path
sits **outside `SurfaceSlot`'s crash containment**. A landing that renders one static card is safe
there. A live grid holding N terminals is not.

This story lands the route, the page's own chrome and its states. It renders **no session rows** — those
arrive with their sockets in story 05, together, for the reason named below.

## Tasks

- [ ] `tasks/00_the-route-is-the-home.feature`
- [ ] `tasks/01_the-page-states.feature`

## Notes

**Order.** Depends on **02** (the page's states read the index shape). Story **05** depends on this.
Reviewable as a **shell edit**, which is why it is its own story — milestone 46 reviewed its dock-host
story the same way, and for the same reason: three files of high symbolic weight and small diffs.

**Governing ADR: [ADR-001](../../ARCHITECTURE.md).** Four things move and they move **together**:
`main.tsx`'s `SURFACES` map gains `/`; `entry.mjs`'s `SHELL_RENDERED_ROUTES` shrinks to
`["not-found"]`; `Shell.tsx`'s inline landing branch goes; and `ui/src/app/Landing.tsx` — measured at
**one** importer — is **deleted**.

**Half-landing this is the specific danger.** ARCHITECTURE names it: `/` renders a placeholder while
`SURFACES` claims a home, or two components both claim `/`. `surfaceMountFor`'s `shellRenders`/`known`
pair makes that intermediate state *look deliberate*, which is exactly what makes it dangerous — nothing
is red, and the wrong thing renders.

**`Landing.tsx` is deleted, not kept "until the grid is ready".** A retained placeholder beside a real
home is a second component claiming one route, and the next author cannot tell which is live. Its
content is not lost: the destinations it linked are the shell's nav, which already carries them.

**Why the rows are NOT in this story, and why that is not the bad cut.** ARCHITECTURE bad cut 3 forbids
splitting *"the grid renders rows"* from *"panes open sockets"* — that split re-creates TECH_DEBT 29,
where milestone 46 shipped its headline connecting to nothing past 537 green tests and five reviews
because every harness stubbed the terminal. This story does not make that cut: it renders **no rows at
all**. Rows and sockets arrive together in 05. What lands here is the route and the page's own states,
which have no panes in them by definition.

**The empty state is the ORDINARY state, and it must not lie by omission**
([DESIGN DG-49-1](../../DESIGN.md)). Research measured the live fleet: every node reports
`sessions: []`, because the shipped bundle wires session hooks for **Codex only**. So the first thing
most operators see is an empty grid, and *"no live sessions"* alone would be true and useless. DESIGN
rules **two** empty states — one for a fleet that genuinely has nothing running, one that names the
cause when the mesh has nodes but no workspace is reporting sessions — with one route out and, in
DESIGN's own words, **no command this document cannot vouch for**. Do not invent a fix-it command.

**Loading is not `.aof-pending`.** DESIGN §S1 rules the page's loading state explicitly and it is not a
shimmer skeleton; story 06's finding is why that matters — the shimmer's reduced-motion escape is the
*only* one that exists, and the grid adds no motion of its own.

**Headroom, watched deliberately — re-measured TWICE, because the first re-measurement used the wrong
method.** The gate counts `source.split(/\r?\n/).length`
([acd-ui-surface-file-budget.test.mjs:175](../../../../../../test/arch/acd-ui-surface-file-budget.test.mjs#L175)),
which is **`wc -l` plus one** for any file ending in a newline. A `wc -l` reading is off by one on every
row and understates the pressure. **Use the gate's arithmetic, not a shell count.** Measured
2026-08-13 with the gate's own rule, against a tree carrying milestone 47's uncommitted work:

| file | ceiling | gate count | headroom |
|---|---|---|---|
| `ui/src/board/DetailPanel.tsx` | 1000 | **1000** | **ZERO** |
| `ui/src/config/App.tsx` | 1300 | 1298 | 2 |
| `ui/src/app/Shell.tsx` | 940 | 931 | **9** |
| `ui/src/fleet/Fleet.tsx` | 1560 | 1540 | 20 |
| `ui/src/terminal/TerminalControl.tsx` | 840 | 819 | 21 |
| `ui/src/app/shell-layout.mjs` | 1060 | 1016 | 44 |

`Shell.tsx` has **9** lines, not the 23 ARCHITECTURE's table originally claimed and not the 10 an earlier
`wc -l` pass here reported. **`DetailPanel.tsx` is at its ceiling exactly** — the gate passes on `<=`, so
it is green today and **any line added to that file fails CI**. This milestone does not touch it; the
point is that the tree has no slack left to absorb a surprise.

Net-negative is still achievable here — this story **removes** a branch — but the margin is about a
third of what was written down, so it is a real constraint rather than a comfortable one. If this story
does not come out net-negative on `Shell.tsx`, that is the signal ARCHITECTURE names: the shell is
absorbing grid logic that belongs in `ui/src/home/`. And `shell-layout.mjs` must gain **zero** lines —
a grid layout vocabulary appended there instead of owned by the home is the exact failure TECH_DEBT
item 33 predicts for milestone 49 **by name**.

**Re-measure before building rather than trusting any figure in these docs**, including this one:
`AOF_GLOBAL_HOME=$(mktemp -d) node --test test/arch/acd-ui-surface-file-budget.test.mjs` reports the
gate's own arithmetic, and the ceiling may not be met by deleting rationale (ADR-014/E3).

**The grid uses the house's existing responsive vocabulary, not a new one.** DESIGN §S1 keeps
`repeat(auto-fill, minmax(320px, 1fr))` with `gap-4` — the same track the fleet's milestone cards
already use — so this milestone introduces no second breakpoint system.
