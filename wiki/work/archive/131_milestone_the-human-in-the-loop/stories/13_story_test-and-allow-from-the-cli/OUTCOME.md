
# 13 · Test and allow from the CLI — Outcome

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

### `aof messaging test <type>`
The fifth `aof messaging` verb posts one test message, `**aof — test message** · <project>`, to each channel of the type in the project, through the notifier's own pre-send checks (`readyChannel`, shared with `deliver`) and sender. It answers each message id, degrades nothing, and fails `messaging-test-failed` naming the fix for a 401, 403 or 404, or `messaging-not-enabled` with no channel of that type.

### `enable <type> --allow <user-id>[,…]`
`aof messaging enable discord --channel <id> --allow` adds user ids to the channel's `allow`, de-duplicated and in order. It never removes one, a repeat changes nothing, and any id that is not 17 to 20 digits is refused `messaging-allow-invalid` before any write. Without `--allow`, `enable` is byte-identical to 09's.

### The project on every Discord message
Line 1 of every Discord message reads `**<headline>** <cost> · <project> · <node>`, where the project is the config's `name`, else the project folder, else absent. It is a render option, so the eleven envelope keys and the headline prefix the terminal and board share are unchanged.

## Assumptions

- **A project's config `name` is how the operator knows it** — where it is unset, the folder's name stands in, and a shared channel then shows folder names.
