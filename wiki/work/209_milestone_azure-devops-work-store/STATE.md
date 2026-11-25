---
doc: state
---
# 209 · A project can keep its work-item tracking in Azure DevOps, and the aof work verbs behave as they do over files — State

## Progress

- The milestone breakdown covers six stories. Story 00 supplies the definition used by 01, 02 and 04. Story 03 extends publication with conflict recovery. Story 05 exercises the assembled workflow and owns the live Azure evidence.
- Stories 00–02 have task contracts, example maps and build plans. Stories 03–05 await contract refinement.
- Stories 00 and 01 completed their build and review runs. The work store selects a validated project adapter, and the Azure sample passed the offline adapter fixtures.
- Story 02 completed its build and review. Successful refinement publishes through the selected board, and retries recover verified board IDs while keeping local documents available. Archiving remains a local file mode operation.

## Notes & decisions in flight

- AOF drives board updates. The local milestone folder survives publication and stays in place
  while the milestone is in flight. External edits stop the workflow. The recovery direction
  is an explicit resync from AOF to the board.
- Archiving applies only in local file mode. Board-backed milestones keep their document home and board link through completion and any pending final update (209/02 Q2).
- Also open: which board changes count as external edits (for example a comment or a change to
  an unmapped field), and whether the stop extends to independent workflows on the same board.
- Completing refinement triggers the first publication of a local draft to the selected board (209/02 Q1).
- ADR-003 diagram not drawn: diagram-generator-missing. The diagram brief is in ARCHITECTURE.md.

## Verification

FF-20901 passed its runtime scan. Its red probe identified a provider import and an `az` call on lines 1 and 2 of a synthetic shared work command. The same source passed when located in the project adapter. The verification pass can enter this evidence in the register.

- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` signed off — see `UAT.md`

## Feedback (for retro)

- The structural, behavioural and code quality review of 209/02 cleared round one with zero blockers. The provider boundary and workspace lock checks passed. All 13 story cases passed in the repository run and on their own. Validation was clean and doctor reported zero errors.
- The 209/02 impacted selection widened to 1,314 suites. The repo run timed out in existing subprocess capture and dispatch cases. Their two complete suites passed all 62 cases in a one-worker run, with the dispatch case passing on isolated retry.
