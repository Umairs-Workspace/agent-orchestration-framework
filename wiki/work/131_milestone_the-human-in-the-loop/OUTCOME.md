
# 131 · The human in the loop — Outcome

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

### A question no longer stops the loop
A driven session that needs a human records its question, waits in place while every other lane keeps building, and resumes the same session with the answer; only an unanswered bound parks it, and a park is announced, not a halt (m131/03, m131/07).

### One question, every face, every answer path
The same question reaches the terminal, the board card and aof's own Discord bot with its phase and cost, and is answered from `aof work answer`, the board's reply box or a Discord reply from an allowlisted user, each recorded verbatim with who and when (m131/01, m131/02, m131/04, m131/05, m131/09, m131/10).

### Discord as an operator console for the whole mesh
One bot on the control node posts every notification with its project, carries a worker's ask, answers `/status`, `/asks`, `/loop stop` and `/loop resume` for allowlisted users, and serves any number of projects from one channel (m131/11, m131/12, m131/14); `aof messaging` sets it up and tests it from the CLI (m131/08, m131/13).

## Assumptions

- **The control node's desktop app is running** — the bot's gateway lives in its serve daemon; posting works without it, answering by reply and slash commands do not.

## Gaps

### A green whole-tree gate row
- **Status:** open
- **Discharge condition:** `aof work regression-gate 131` records a green row, which needs a runner that finishes inside its bound (the sharded runner item).
131 was accepted on `--gate-override`: the serial runner could not finish within 2 h on this shared machine; every suite file ran green through `--only` across 16 shards.

### The findings routed out of 131
- **Status:** open
- **Discharge condition:** each backlog finding in VERIFICATION (F-131-06/08/09/10/12/13/14/15/18/19) is closed or scheduled.
Lane-append merge conflicts, the ask's form under agreement or delegation, two elapsed clocks, presence recording a lane's root, and a supervisor relaunch clearing a stop request stay open outside 131.
