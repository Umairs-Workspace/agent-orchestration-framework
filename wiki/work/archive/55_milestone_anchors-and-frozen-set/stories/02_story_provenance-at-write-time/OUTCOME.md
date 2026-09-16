# 55/02 · Provenance at write time — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

## Delivered

### The claim provenance envelope
Every recorded claim carries a four-key stamp — `node`, `run`, `commit`, `at` — compiled by
`src/claim-provenance.mjs`, a leaf module that imports nothing and reads no clock, filesystem,
process, git checkout, transcript, log, mtime or directory listing.

### Refusal in place of back-fill, at the durable write seams
`mintRun` and `recordAnchorReading` validate the stamp before the store is read or written, so a claim
offered without a complete one is refused with `claim-provenance-missing` naming what was absent, and
no writer completes a partial stamp from anything it could have inferred.

### Anchor readings that ride the run record
`recordAnchorReading` appends a reading to the run's brief under the work item's own `runs/`, so
readings accumulate rather than overwrite, no sidecar store exists, and nothing writes a reading into
the bundle-delivered `.aof/loops` registry.

### One impure gathering edge
`gatherClaimProvenance` at the grade command is where the facts are collected; the compiler is handed
them, which is why the same observation always compiles to the same record.

## Assumptions

- **`run` and `commit` are nullable and mean it** — a claim compiled outside a run, or in a checkout
  with no history, is still defensible; `node` and `at` have no honest absent state and are required.
- **A new claim producer gathers at its own command boundary** — the way to stamp something new is a
  gatherer at the impure edge, never a lookup taught to the compiler.

## Gaps

### Claim types other than the grade record and the anchor reading
- **Status:** open
- **Discharge condition:** a third claim type is stamped through a command-edge gatherer rather than
  constructing an envelope inline.
The envelope, its refusal and its purity guard are general; today exactly two claim types route
through them, so the generality is declared rather than exercised.
