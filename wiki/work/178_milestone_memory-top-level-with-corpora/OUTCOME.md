# 178 · Memory is its own command — Outcome

## Delivered

### Memory is a top-level concern end to end
Memory's config (`memory`, 05/ADR-002), its command (`aof memory`, m178/01/the-aof-memory-route) and every bundle prompt's recall step (m178/02/bundle-assets-spell-aof-memory) now name the same top-level concern, and `aof work memory` stays a byte-identical alias (m178/01/the-work-memory-alias).

### A prompt-driven recall leads to the PRD behind a record
A recall made by any bundle prompt (refine, continue, verify, retrospective, shatter, in Claude Code, Codex, opencode or Cowork) returns work records that name the planning document their item was framed from (m178/03/records-carry-a-resolved-origin), while recall still searches only the work stream and `wiki/planning` is not indexed.

## Assumptions

- **A planning document is reached only through an `origin:` link** — a document under `wiki/planning` that no work item names stays unreached by recall (two today).

## Gaps

### Planning documents no item links to
- **Status:** open-by-decision
- **Discharge condition:** a later item indexes `wiki/planning` as a corpus of its own, or every planning document gains an item that names it.
Recall cannot surface a planning document that no work item's `origin:` names, because only the work stream is indexed.
