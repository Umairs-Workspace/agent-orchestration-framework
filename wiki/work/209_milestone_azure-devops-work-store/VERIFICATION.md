---
doc: verification
---
# 209 · Verification

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-20901 | `test/arch/work/acd-board-provider-boundary.test.mjs` | Pending implementation in 209/00 | |

## Acceptance evidence to collect

- Executable coverage includes all 150 public-verb golden cases over recorded Azure HTTP, a second project-owned adapter, and a workflow stopped and recovered after an external edit. For archive cases, verify the board-mode refusal and use the existing file-mode captures as the local control.
- Manual verification covers a real Azure project and daemon account. Record the run, board revision observations, platform and verified result here.
- Record human acceptance separately when an operator has inspected the board and local work history. All evidence lanes are open.
