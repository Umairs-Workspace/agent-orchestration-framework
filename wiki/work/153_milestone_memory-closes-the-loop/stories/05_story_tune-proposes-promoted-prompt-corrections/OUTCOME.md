# 153/05 · Tune proposes promoted prompt corrections — Outcome

## Delivered

### Memory evidence in the tune corpus
`aof work tune` reads each selected item's recall observations and the retrospectives' `Recurs` stamps. Each candidate shows surfaced, honoured, departed and recurred counts, with citations to its ledger rows and source lessons. Observations from one document do not count as a second source document.

### Computable prompt patches
When a recurring lesson has a `prompt:<repo-path>` destination, the `prompt-or-brief-revision` proposal carries a concrete `from`/`to` patch. It appends a deterministic `<!-- aof:lesson <ref> -->` block that quotes the lesson. The proposal stays advisory with no applier. A block already in force is reported as `already-in-force`. Targets outside the repository, symlinked out of it, or unreadable are reported as findings before any content is read, and the run writes no byte (FF-6207).

## Gaps

### Sibling lessons promoted to one prompt
- **Status:** open
- **Discharge condition:** a contract amendment to E3/E4 that proposes one block per promoted lesson.
A candidate of several lessons promoted to one prompt quotes only its canonical lesson. Once that block is in force, the other lessons' corrections are never proposed.
