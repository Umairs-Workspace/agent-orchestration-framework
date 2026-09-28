
# 07 · The live run — Outcome

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

### The human in the loop, measured on a running system
A real `refine_first` loop on this machine asked the operator build-time questions that reached T1 and the Discord bot within the minute, kept its other lanes building while they stood, took answers from a Discord reply, the CLI and the board, each resuming the session that asked, resumed a parked session with its answer, and accepted its milestone; a supervised loop was stopped and handed back from Discord with `/loop stop` and `/loop resume`, the supervisor relaunching it.

## Assumptions

- **The operator answers from the channel's allow list** — every Discord answer in the run was from the one allowlisted user.

## Gaps

### The instant an ask reaches Discord
- **Status:** open
- **Discharge condition:** a live run pastes the bot message ids and derives each instant against T1's row.
The run shows each ask arriving within the minute (screenshots). The contract's "within 10 s by message id" was not measured.

### A worker's ask, live
- **Status:** open
- **Discharge condition:** a live run across two nodes records a worker's ask posted by the control's bot and answered by reply (131/12).
07 ran on one machine, so 12's carriage is proven only in its suites.
