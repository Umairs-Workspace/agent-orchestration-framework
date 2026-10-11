---
doc: retrospective
updated: 2026-10-06
---
# 03 · The board groups scenarios by rule — Retrospective

## R1 — the story went to review with three UI controls red

- **Kind:** mistake · **Area:** process (test) · **Stage:** build · **Owner:** developer
- **Raised by:** 04's build (the budget), and `aof:verify 135` (the other two)

**What happened.** The rule grouping took `DetailPanel.tsx` from 997 to 1,031 lines, over its
1,000-line ratchet. It also changed `apps/ui/src` without re-pinning FF-5307's digest, and it broke
the home-route suite's exact accounting for the panel. 03's lane ran its own suites, and none of the
three controls was in them. Verify moved the whole TASKS tab into `TasksTab.tsx` and re-pinned all
three (F-135-01).

**Why.** The panel stood at 997 of 1,000, and the brief put the grouping inside it. The controls
that meter `apps/ui/src` (the file budget, FF-5307 and the home-route accounting) watch the tree.
They do not import the changed module, so an importer sweep never reaches them.

**Lesson.** A story that edits `apps/ui/src` runs the tree-metering controls in its lane:
`acd-ui-surface-file-budget`, `acd-ui-directory-budget`, FF-5307 and the home-route suite. A
surface within 50 lines of its ceiling gets new UI as a child component from the brief onward.

**Refs:** F-135-01; `3eb38e39`.

## R2 — the surface was designed with no route to render it

- **Kind:** near-miss · **Area:** contract (design) · **Stage:** refine · **Owner:** designer
- **Raised by:** 03's review

**What happened.** DESIGN.md's task-card surface declares no `Route`, and `work.ui.baseUrl` is
unset, so the design-conformance review was `INCONCLUSIVE` at build and again at verify (F-135-03).

**Lesson.** A DESIGN surface names the route that shows it when the surface is written, so that a
verify run with `--url` can render it.
