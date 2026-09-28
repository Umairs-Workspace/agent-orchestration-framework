---
doc: retrospective
updated: 2026-09-23
---
# 04 · The console shows it — Retrospective

## R1 — the figure met its checklist and failed its reader

- **Kind:** mistake · **Area:** design · **Stage:** verify · **Owner:** designer
- **Raised by:** the operator (`F-133-01`, `F-133-02`); the milestone's R1 carries the general lesson

**What happened.** Task 02's render conformed on every checklist line. The operator then found the
diagram unreadable in the ~350 px panel with nothing to click, and the `Source · PNG` links dead.
Task 03 (`@bug`) adds a full-size viewer over the same data-URI image, plus `aof diagram file`
served at `/api/diagram/file` under a sandbox CSP.

**Lesson.** In the render step, take the operator's eye on the real surface as the test of a
content-bearing figure, and click every link it renders. Task 02's DOM measurements proved the frame
and said nothing about whether the picture helped.

## R2 — every re-pin comment moves the pins stacked above it

- **Kind:** near-miss · **Area:** tests · **Stage:** verify · **Owner:** developer
- **Raised by:** FF-12603 leg 6 (`F-133-04`)

**What happened.** 04's re-pin note for `board-ui.mjs` was stacked under 127/04's. That pushed
127/04's reason past the 600-character window another control reads, and the control went red.

**Lesson.** When stacking a re-pin note, re-run every control that reads the pin table
(`acd-loop-state-rides-the-run-record`, `acd-run-status-renders-the-record`). Proximity windows
make those notes load-bearing.
