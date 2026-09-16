# 109 · Tech Debt Item 49 Still Records The Nextwork Fail Open As Open Though Story 86 Closed It — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by the MAIN-SESSION GOVERN COMMAND THAT ACCEPTS the
  item (ADR-004, reconciled at 85: aof:verify, or aof:assimilate-code, which reaches done in
  its own step) — never at insert, and never by a developer/evidence subagent, which is the threat
  the rule names (they have Write and have been observed to clobber records and fabricate decisions).
  States product STATE ("the system now IS X"), never motive ("we built X because Y" — that reasoning
  belongs in RETROSPECTIVE.md). This is an ADDITIONAL artifact: it carries no identity frontmatter and
  is never this item's record doc.
-->

## Delivered

### TECH_DEBT item 49 prices only the half that is still owed
The entry reads `open — half paid by story 86` at severity **low**, and its "What's wrong" states
that `nextWork`'s `inRange` refuses an unparseable story-grained shape (`invalid-scope`, 400) and
scopes `NN/SS` to that one story — so an operator scheduling from the ledger prices the surviving
duplication, not the fail-open that no longer exists.

### Item 49's cited line numbers resolve at their current homes
The three citations point at the code they name — `src/work.mjs:1237-1273` (`inRange`),
`src/work.mjs:1037-1044` (`validateWork`'s `inScope` copy) and `src/work-doctor.mjs:757-759`
(the leaf-backed `inScope`) — and the entry carries story 86's FF-5301 reach-ceiling reason for why
folding both callers onto `src/work-ref-scope.mjs` was not taken, so the remaining half names the
condition that unblocks it.
