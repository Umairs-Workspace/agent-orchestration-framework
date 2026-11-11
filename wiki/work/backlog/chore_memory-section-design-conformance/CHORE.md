---
type: chore
number:
slug: memory-section-design-conformance
title: "The config editor's Memory section is rendered and judged against 180's DESIGN Surface 1"
status: not-started
owner: designer
created: 2026-10-31
updated: 2026-10-31
depends: []
schema: 1
aofVersion: 0.1.0
---
# The config editor's Memory section is rendered and judged against 180's DESIGN Surface 1

## Intent

Milestone 180 shipped the config editor's Memory section, but its look was never judged. DESIGN
Surface 1 declares no `Route`, and `work.ui.baseUrl` is unset, so `aof:verify 180` attempted no
render and returned INCONCLUSIVE (m180/F-01). This chore gives the surface a route, renders it, and
gets the designer's verdict. That discharges F-01 and story 03's open outcome gap.

## Definition of Done

- [ ] `wiki/work/180_milestone_memory-config-node/DESIGN.md` Surface 1 names its `Route` (the config editor is `/config` in `apps/ui/src/app/routes.mjs`, with the Memory section selected).
- [ ] The section is rendered from a served editor (`--url`, or `work.ui.baseUrl`) in the six DESIGN states: empty, populated new shape, populated legacy, conflict, error on save and saved. Each is rendered above and below the 1050 px breakpoint.
- [ ] `aof-designer` judges the screenshots against Surface 1's binding checklist and returns CONFORMS. Any GAPS verdict becomes a DESIGN rule or a fix before this box is ticked.
- [ ] m180/F-01's row in `VERIFICATION.md` reads `closed`, with this chore cited. 180/03's `OUTCOME.md` gap "Visual fidelity of the Memory section" reads `**Status:** discharged`.
- [ ] `aof work validate` is green (no regression).

## Notes

- 180 is accepted, so this chore edits its records by hand, bumping `updated:`. Accepted items
  have done that before. If 180 is archived first, the paths move under `archive/`.
- The same cause is still open on the board's task-card surface (m135/F-135-03). The lesson is
  180/R3 (recurs 135/03/R2).
