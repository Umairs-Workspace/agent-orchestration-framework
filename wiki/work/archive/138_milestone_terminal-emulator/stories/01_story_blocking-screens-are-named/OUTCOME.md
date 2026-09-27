# 01 · Blocking screens are named — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored at Accept by aof:verify (the main-session govern command that
  accepts the item). States product STATE, never motive. An ADDITIONAL artifact: never the record doc.
-->

## Delivered

### Six recorded screens, each with one action
`src/terminal/claude-screens.mjs` registers `ready` (type), `trust` (consent), `mcp-approval`, `first-run` and `login` (fail), and `usage-limit` (wait). Every entry is proved on every run against a recording committed under `test/fixtures/claude-screens/`, and `ready` claims no dialog (FF-13802).

### Trust is answered by the operator's standing consent, walked on the screen
claude 2.1.283 opens the trust dialog on `❯ No, exit`. The door presses Down one confirmed step at a time until `Yes, I trust this folder` is highlighted, then sends one Enter. An arrow the screen does not show within 2 s gives the consent up by name.

### A blocking screen is named in seconds, and the loop says which
A session on MCP approval, the first-run theme picker or the login menu stops `failed / blocked_screen` on the first settled frame that shows it, and is not retried. The loop's lane narration reads `settle: failed (blocked_screen: <id>)`, and its halt line carries `screen=<id>`.

## Assumptions

- **The trust pre-write normally wins** — `ensureWorktreeTrusted` pre-writes the checkout's trust, so the consent answers only the case where the pre-write lost (ADR-003 §4).

## Gaps

### An update or release-notes screen is not registered
- **Status:** open
- **Discharge condition:** claude draws an update or release-notes screen, it is recorded, and an entry is registered for it (ADR-003 §2).
Nothing was observed to record, so no recogniser was guessed at.
