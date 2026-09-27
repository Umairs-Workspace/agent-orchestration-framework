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
| 2078166c80c5e7881193e81bdcad4c0d97f3df52 | 2026-09-23T16:38:08.462Z | all | red | arch/119 FF-11901 · 121: NO control under test/arch/ spells an import-specifier extractor of its own — the one home is test/support/module-family.mjs, and the remainder is a named, shrink-only baseline, arch/45 ADR-005 [Amigos-5] (acd-shell-z-ladder-single-home): `z-50` appears NOWHERE in ui/src outside the ladder module — it means the shell's fullscreen occupant and nothing else (one named, shrink-only exemption, retiring with m46), arch/96/02 FF-9603 (2) THE BAN IS A PROPERTY OF THE STREAM — every PLAN.md under wiki/work is admitted, not only the template, arch/45 ADR-005 + 46 ADR-009 (acd-no-per-surface-fixed-overlay): no module in ui/src outside the shell paints a full-viewport fixed layer, and nothing anywhere portals into document.body, arch/45 ADR-005 (acd-no-per-surface-fixed-overlay): the exemption list is EMPTY and its emptiness is ASSERTED — growth requires deleting the assertion that says why, and any entry needs a reason that is not a deletion plus an expiry that is not a filename, 53/00 task03 — any movement anywhere in the session tree restarts the quiet stretch, so the outcome does not settle on the original clock, the-card-renders/04 FF-5307 is re-pinned with the measurement — the ui/ hash comment names milestone 130, every fleet file git diff reports, nothing under ui/src/board/ and board-ui.mjs's unchanged digest; the store and board pins are unmoved; the control is green over the delivered tree, home-route/00 the file-budget accounting by acd-ui-surface-file-budget's OWN arithmetic — Shell.tsx is net-negative and the other five have not moved (00 scenario 7, all six rows), 96/02-00 the ban is a property of the stream, not of one file — every PLAN.md in the work tree is admitted, work/archive-is-a-move: 00 the verb is registered with its own flags, and every hand-kept ledger learned it consciously, work/this-tree-holds-what-is-live: 02 the root of wiki/work holds only live items, the archive holds only done drivers, list --all carries every archived row last with archived: true, and 42_structural-overhaul is not an item |
