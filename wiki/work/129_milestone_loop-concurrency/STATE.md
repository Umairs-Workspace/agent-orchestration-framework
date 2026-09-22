---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 129 · Loop concurrency — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. -->

- [x] `01_story_the-mode-and-the-engine-decide` — done (built + reviewed 2026-09-13; accepted 2026-09-13 by `aof:verify 129/01` — `VERIFICATION.md` `129/01`, `F-01`–`F-12`; `F-07`/`F-08` routed to 04, `F-09` waits on the milestone door)
- [x] `02_story_the-drive-is-a-child` — done (built + reviewed 2026-09-13 under the cascade; accepted 2026-09-13 by `aof:verify 129/02` — `VERIFICATION.md` `129/02`, `F-13`–`F-27`; `F-15`/`F-16` routed to 04, `F-17`/`F-23` to 05, `F-24`/`F-25` face + runner items)
- [x] `03_story_the-lane-commits-and-merges-home` — done (built + reviewed 2026-09-13 under the cascade; three lenses + one delta round, 1 Blocker → 0; accepted 2026-09-13 by `aof:verify 129/03` — `VERIFICATION.md` `129/03`, `F-28`–`F-47`; `F-39`/`F-44` routed to 04, `F-47` an `aof test` item, `F-09` corrected)
- [x] `04_story_the-wave-tick` — done (built + reviewed 2026-09-14, solo, resumed run `20260914T123830334Z-0001`; three lenses, one round, 0 Blockers; accepted 2026-09-14 by `aof:verify 129/04` — `VERIFICATION.md` `129/04`, `F-48`–`F-50`; `F-07`/`F-08`/`F-16`/`F-18`/`F-44` closed, `F-15` re-routed to 06, `F-39` to 05, `F-08`'s operational rule LIFTED, 03's composed-verbs gap discharged)
- [x] `05_story_the-account-and-the-register` — done (built + reviewed 2026-09-14, solo, run `20260914T183538595Z-0000`; three lenses inline, 0 Blockers; accepted 2026-09-14 by `aof:verify 129/05` — `VERIFICATION.md` `129/05`, `F-51`–`F-54`; the seven register rows green with every probe re-observed; `F-17`/`F-23`/`F-39` closed, `F-51` fixed, `F-53` an operator item)
- [x] `07_story_the-loop-settings-are-self-contained` — done (scoped 2026-09-15 from the operator's sign-off finding `F-55`; built + reviewed solo, three lenses inline, 0 Blockers; accepted 2026-09-15 by `aof:verify` — `VERIFICATION.md` `129/07`, `F-55`–`F-57`; four standing controls re-pointed and red-probed)
- [x] `06_story_the-second-live-run` — done (built 2026-09-14; three live runs on 127 (2026-09-15/16) and 130 (2026-09-21), every reading at the source in `VERIFICATION.md` `129/06`, `F-58`–`F-68`; accepted 2026-09-22 on the operator's ruling with the unperformed conflict drill and three other live-measurement gaps recorded in its `OUTCOME.md`)

## Notes & decisions in flight

<!-- COMPACTED at the accept (2026-09-22). The decisions this section carried have graduated:
     the durable ones into ARCHITECTURE.md's ADRs, the delivered state into OUTCOME.md, the
     lessons into RETROSPECTIVE.md, the defects into VERIFICATION.md's register, and the
     blow-by-blow (seven story builds, three live runs, seven gate runs) into git history. What
     stays here is the index a later reader needs. -->

- **The decision that shaped everything else:** the loop ALWAYS owns the fan-out into lanes;
  `work.agents.mode` governs only what a lane's session spawns. Proposed otherwise by the SPEC,
  departed by the architect at ADR-001 §5, ratified by the PO on three measured reasons, and
  reversible as an additive mode value — `ARCHITECTURE.md` ADR-001 §5, `RETROSPECTIVE.md` R4.
- **The configuration surface** was specified by the operator at the 05 accept (they held the
  milestone door for it), scoped as story 07, and delivered self-contained under `work.loop` —
  `m129/07/OUTCOME.md`. Two things were flagged and deliberately NOT taken: a warning on a
  mis-spelled mode value (the silent fallback is ADR-001 §1's design) and operator-facing
  documentation of `work.loop.*` / `work.dispatch.*`, which README, `docs/` and the schema still
  lack — the agent-facing prose in `autonomous.md` and the ADRs is all there is.
- **Refine-time defaults, each now an ADR:** interleaved concurrency deferred (ADR-001 §6),
  `src/loop/` born as a budget exemption (ADR-008 §2), touched-paths for the loop and strict for
  the mesh (ADR-002 §1), `STATE.md` alone `merge=union` (ADR-002 §5), a dead child is
  `runtime_offline` (ADR-004 §4).
- **The contract beat rulings of 2026-09-13** are in each story's `.feature` prose under a RULINGS
  paragraph, where they were raised; no ADR was edited to match them.
- **Live-run readings** are in `VERIFICATION.md` `129/06` (three attempts, per scenario, with run
  ids, lane paths, base shas and halt details), and the four gaps they left are in
  `m129/06/OUTCOME.md` with discharge conditions.
- **The gate's seven runs** and what each red belonged to are in `VERIFICATION.md` `F-69`–`F-77`
  and the gate paragraph beneath them; `REGRESSION.md` carries the rows.

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — the story lanes in `VERIFICATION.md` per story; the whole tree at
      `aof work regression-gate 129` (`REGRESSION.md`, seven rows; every red attributed and repaired
      at its owner — `F-69`–`F-77`).
- [x] Fitness functions green — the seven `FF-129xx` of `ARCHITECTURE.md`'s register, each observed
      red on its declared leg and restored (`VERIFICATION.md` § Fitness functions).
- [x] `@manual` signed off — task 00's six scenarios read at the source over three live runs
      (`VERIFICATION.md` `129/06`); no `UAT.md` and no `@uat` scenario exists in this milestone.
- [x] Accept decision recorded — `VERIFICATION.md` § Accept decision (per story, and the milestone).
