# 55/03 · Raw capture before classification — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### A verbatim feedback ledger, written before anything classifies
Each capture appends the raw `{kind, id, text, actor, refs, at}` record to the item's
`FEEDBACK.ndjson` before the human-readable `STATE.md` bullet is projected, and the ledger's module
holds no `writeFile`, `rename` or `truncate` — a raw record cannot be opened for rewrite because
nothing that owns it can rewrite.

### A capture path with no menu, at both doors
`work:feedback` accepts exactly `ref`, `note`, `actor` and `refs` in its command schema and in its CLI
flags, the bundled `/aof:feedback` command offers no `AskUserQuestion`, and an unknown field is
refused with `feedback-classification-deferred` before the item is resolved or anything is written.

### Classification as a strictly later, separate record
A triage is appended as its own record referencing the raw one by id, so re-triage leaves the verbatim
text byte-identical, an untriaged capture is complete on its own, and a classification cannot exist
without a raw record to point at.

### One production raw writer
Exactly two modules reach `appendRawFeedback` — the capture transition and the ledger itself — so
every capture path in the system, CLI or board, lands the same verbatim record first.

## Assumptions

- **The destination is derived from the target's type** — capture routes by what the ref resolves to,
  never by asking the person to choose, which is what keeps the path free of a menu at all.
- **Capture never pauses for input** — a capture that cannot be triaged yet still succeeds, so the
  ledger is complete even when nothing downstream is ready to read it.
