---
doc: retrospective
promotionFrom: 1
---
# 205/03 · Archive, status and renumber preserve mutations and refusals — retrospective

## R1 · A normalised path broke the JSON it had been embedded in

**Kind:** mistake · **Area:** process (test) · **Stage:** build · **Owner:** developer · **Raised by:** developer (build) · **Promoted to:** none

**What happened:** The post-write `list` output was carried inside an escaped JSON string. The normaliser then replaced an absolute path inside that string, and the stored result no longer parsed. The runner now writes stdout and stderr as separate files, so each stored channel keeps the CLI's own bytes and the suite parses the JSON on every replay.

**Why:** The normaliser substitutes text. It does not know when that text sits inside another document's string escaping.

**Lesson:** Store each captured channel as a file of its own and parse it there. Never embed one output inside another document before it is normalised.

**Refs:** ../../STATE.md, "Closure record"; ../../ARCHITECTURE.md ADR-001.
