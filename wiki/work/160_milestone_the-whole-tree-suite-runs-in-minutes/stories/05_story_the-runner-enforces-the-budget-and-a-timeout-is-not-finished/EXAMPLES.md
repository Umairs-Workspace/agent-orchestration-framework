# 160/05 · The runner enforces the budget, and a timeout is not-finished — example map

## R1 · A unit that runs out of time is not finished, never failed
- E1 · The integration lane is killed at its 20-minute unit limit, and nothing else failed: the row is not-finished and names "integration lifecycle", with no failures listed [proposed]
- E2 · One case fails and another unit is killed at its limit: the row is red, lists the failing case, and names the killed unit apart [proposed]
- E3 · A killed unit is not retried alone [proposed]

## R2 · The whole-tree run is held to its 10-minute budget
- E4 · A run whose units are all green finishes in 8.4 minutes: the row is green [proposed]
- E5 · A run reaches 10 minutes with 40 units left: it stops, the 16 in-flight units are not finished, 24 are not started, and the row is not-finished [stated Q1]
- E6 · The program cannot be told the budget, and the gate's own deadline at 12 minutes cuts it off: the row is not-finished, never red [proposed]

## R3 · Only a green row signs a milestone off
- E7 · The newest row is not-finished: the accept door refuses, and its message says to re-run the gate or speed it up, not to fix the code [proposed]
- E8 · A --serial gate takes 104 minutes and every case passes: the row is green and signs the milestone off [stated Q2]

## Questions
- Q1 · business · answered · When a whole-tree run reaches its 10-minute budget, should it stop there, with in-flight units reported not finished and the rest not started, or run to the end and then fail as over budget? Stopping gives the answer at 10 minutes but leaves the unrun units unchecked; running on reports every failure but can take the 48 minutes it takes today. Settles E5. On 2026-10-14 the operator answered "Stop at the budget": in-flight units are not finished, the rest not started, and the row is not-finished.
- Q2 · business · answered · Should a --serial gate run (about 1¾ hours, run when the sharded one cannot be trusted) still be able to sign a milestone off? If yes, the budget binds only the sharded gate. If no, every sign-off must come from a run inside the budget. Settles E8. On 2026-10-14 the operator answered "Serial still signs off": the budget binds the sharded gate only.
- Q3 · technical · defaulted ADR-006 · How does the program learn the budget? A budgetArgs template expanding {minutes}, like jobsArgs, with the gate's own deadline as the backstop.
- Q4 · technical · defaulted ADR-006 · How is the third outcome spelled? "not-finished", once, in GATE_RESULTS, with its own door refusal code.
