<!-- aof-generated: bundle -->

# NN · <Item Title> — Outcome

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

<!-- One `### <Capability name>` per capability this item now delivers, each followed by ONE line
     stating what the system now IS (product state) — never why it was wanted. -->

### <Capability name>
<one-line delivered statement — what the system now IS (product state), never why it was wanted>

## Assumptions

<!-- A bullet per condition the NEAREST-PRECEDING `## Delivered` capability's delivery rests on
     (document order) — an assumption qualifies a delivery, it is not independently recallable debt. -->

- **<assumption>** — <the condition the nearest-preceding capability's delivery rests on>

## Gaps

<!-- One `### <declared-but-unfilled surface>` per gap this item declared but did not fill (e.g. a
     record field with no writer). `**Status:**` stays `open` until a producer/discharge exists. -->

### <declared-but-unfilled surface, e.g. "warnings_delivered field">
- **Status:** open            <!-- open | discharged -->
- **Discharge condition:** <what makes this gap stop being true — the criterion for promoting it to scheduled work>
<the gap statement — what is declared and what does not fill it, as product state>
