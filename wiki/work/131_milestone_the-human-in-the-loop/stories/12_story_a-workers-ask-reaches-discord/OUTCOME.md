
# 12 · A worker's ask reaches Discord — Outcome

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

### A worker's park carries its question
A mesh worker's running + `needs-input` park fact (`assignment.reported`) carries `ask: { question, phase, askedAt }`, read by `readWorkerAsk` over the worker's own transcript through ADR-002's one reader and clipped at 8,000 code points; every other report is byte-identical, and the journal-unavailable fallback carries no `ask`.

### The ask kept on the control's assignment row
`global_assignments` has a nullable `ask` column (store version 10, added by the idempotent `ALTER`); a park writes it, an absent `ask` never clears it, and the execution projection carries it only while the row awaits an answer.

### A worker's ask posted once, by the control
The `settle-assignment` reactor posts `session-needs-input` with the WORKER's node only on the edge into `needs-input` (FF-13114), so a redelivered park posts nothing; with no control-side checkout it degrades `worker-ask-unannounced`.

### The board and a reply read the worker's question
`applyAskOverlay` shows a worker ask's question, phase and `askedAt` from the row, and a Discord reply to the posted ask answers it through `work:answer`'s mesh leg (`mesh:terminal-resume`), which now also posts one `session-answered` carrying the worker's phase.

## Assumptions

- **The control has a checkout of the worker's workspace** — the post resolves the workspace's control-side project root; without one the ask is kept on the row and shown on the board, but not posted.

## Gaps

### A loop run by a worker node
- **Status:** open
- **Discharge condition:** an item carries a worker-run loop's notifications to the control (ADR-010 §7).
A loop run on a worker node (not an assignment) posts from the worker, which holds no token, so its sends degrade `notify-channel-unconfigured`.

### A live worker ask
- **Status:** open
- **Discharge condition:** a live run records a worker's ask posted to Discord and answered by reply.
The carriage, the edge post and the reply are proven through the real reactor and a fake Discord, never across two live nodes.
