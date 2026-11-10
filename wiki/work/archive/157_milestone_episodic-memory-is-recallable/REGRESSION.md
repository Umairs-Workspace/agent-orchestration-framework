<!-- The regression gate's evidence (96/ADR-008). Appended by the gate command; never hand-written. -->
# Regression gate

## Gate runs

One row per gate run, appended by `aof work regression-gate <ref>`. A rerun APPENDS: the newest row is the one
the accept door reads, and the earlier rows are the milestone's history. A row whose commit,
instant, scope or result is missing makes this document UNREADABLE rather than green — repair it
by hand rather than deleting the row, because a row nobody can read and a gate nobody ran are the
same fact. A `override` row is a recorded reason for accepting WITHOUT a green gate
(ADR-008 §4), never a gate result.

| commit | instant | scope | result | detail |
|---|---|---|---|---|
| b8ee89d9f5e91e33d1d8927c65c810d30155cf61 | 2026-10-12T08:17:56.680Z | all | red | the runner exited with no verdict and enumerated no failure · sharded · 429.8 min · over budget (15 min) |
| a439359fbf03e0c81308f6297c1df27f6fd79ee7 | 2026-10-12T08:55:46.365Z | all | green | not isolated: 53/00 task03 — a parent that finished over a still-writing subagent is never quiet: it settles only after the WHOLE tree stops moving, mesh-ui-global-scope/00 `aof mesh ui` starts the global mesh view by default (no workspace required, scope=global in the announced URL), 131/01 ask-request/02 the poll reads the file on its unref'd interval, arms only for a positive finite pollMs, and a corrupt file answers null without rejecting · sharded · 26.2 min · over budget (15 min) |
