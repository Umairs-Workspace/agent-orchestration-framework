---
doc: retrospective
updated: 2026-10-03
---
# 144 · The whole-tree test run signs off in minutes — Retrospective

The story was loop-driven: one refine run and two continue runs, all done at attempt 1. The real
gate it built ran twice at verify, and that is where both lessons surfaced.

## R1 — The write-set census missed the two tree-wide controls that read every new file

- **Kind:** mistake (recurring) · **Area:** process · **Stage:** refine → build → verify · **Owner:** product owner (refine), builder · **Raised by:** builder, verifier
- **What happened:** The build found six files missing from `files:`: the two bindings, the inventory fixture, `status-gate`, and 142's two pins (the test ledger and the runtime audit). Verify's real gate then found two more controls the story lane never ran. One was FF-11904's `test/testing` row, which the new suite pushed to 8 against 7. The other was FF-9603's ban on a PLAN.md restating a declared path, which 144's own `PLAN.md` broke. Both were green in a 205-case focused lane and red in the whole tree (F-01, F-02).
- **Why:** Neither control imports anything 144 changed. Both read the TREE: every flat directory, every `PLAN.md`. So an importer sweep (141/R1's remedy) cannot find them.
- **Lesson:** A story that adds a file under `src/`, `test/` or `packages/`, or that carries a `PLAN.md`, runs `test/arch/testing/acd-source-directory-budget.test.mjs` and `test/arch/planning/acd-plan-restates-no-declared-path.test.mjs` in its own lane, beside the importer sweep. The census the build feedback asked for (the test ledger and the runtime audit for any story touching tests) belongs in the same refine checklist.
- **Refs:** VERIFICATION F-01, F-02 · STORY `## Feedback` · m141/R1

## R2 — A gate that can never be green is an override with extra steps

- **Kind:** risk · **Area:** process · **Stage:** verify · **Owner:** product owner · **Raised by:** verifier
- **What happened:** The sharded gate does what 144 set out to do: 26.6 min instead of a 2 h kill, no case lost, every not-isolated case named. But both runs were red on the same 8 inherited cases (m134/F-134-03, plus 134 held at the root), which were already red at the parent. 134 was accepted on an override for the same 8. Until they are repaired, every milestone's door needs `--gate-override`, and 144's row still lands red.
- **Why:** F-134-03 was triaged as a non-blocker for 134, correctly for that item. Nobody owns it as a blocker for the door it now holds shut.
- **Lesson:** Schedule F-134-03 (and archive 134) before the next milestone reaches its door. An override that cites "the same 8 inherited reds" is the silent override 96/ADR-008 warns about, accumulating one milestone at a time.
- **Refs:** VERIFICATION F-04 · m134/F-134-03
