---
type: story
number: 05
slug: the-event-a-ruling-raises
title: "The event a ruling raises — the why travels with the change, and an undeclared name is finally refused"
parent: 61
status: done
owner: product-owner
created: 2026-08-30
updated: 2026-08-31
depends: [61/04]
schema: 1
aofVersion: 0.1.0
reads: [wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-006, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-007, wiki/work/61_milestone_disciplined-acceptor/ARCHITECTURE.md#ADR-012, src/effects/item-transitions.mjs, src/effects/run-transitions.mjs, src/effects/journal.mjs, src/config-editor.mjs, src/aof-gitignore.mjs, wiki/work/61_milestone_disciplined-acceptor/stories/04_story_the-rule-and-the-ledger/STORY.md, wiki/work/60_spike_acceptor-discipline/SPIKE.md]
files: [src/effects/table.mjs, src/effects/harness-transitions.mjs, src/work-acceptor/store.mjs, test/arch/acd-effects-ledger.test.mjs, test/arch/acd-harness-ruling-ledgered.test.mjs, test/harness-ruling-seam.test.mjs, scripts/test.mjs]
---
# 05 · The event a ruling raises

## User story

As the operator reading a harness change six months after it was made,
I want the ruling that justified it recorded beside the configuration it changed — the key, the value
before and after, the epoch, the evidence in the order it arrived, the counter-metric reading and who
rendered it,
so that reverting is a decision I can make from the record rather than an archaeology exercise, and
so that "reversible" means something more than "the file is in git".

Half of reversibility is already free: the configuration, the frozen set and every loop record are
git-tracked, so a revert is one command. What is missing is the *why*, attached. Spike 60 found no
event in the whole vocabulary that fits, and the one writer seam that touches editable resources
records no prior value, no evidence and no provenance at all.

The event is named for what actually happens. Report-only is the permanent steady state, so an event
called "changed" would fire almost never and the overwhelming majority of the acceptor's work — every
honest refusal — would leave no trace. What is recorded is the **ruling**, whether or not anything
moved.

There is one more thing to close while the vocabulary is open. The ledger's own comment claims it
refuses an undeclared event name; it does not — a misspelled name appends silently and resolves to
zero reactors, which is a consequence quietly owed to nobody. A milestone whose subject is the
discipline of its own machinery does not get to leave that standing.

## Tasks

- [ ] `tasks/00_a-ruling-raises-a-declared-event.feature` — a ruling raises exactly one declared event whose consequence appends the record beside the configuration it concerns
- [ ] `tasks/01_the-why-travels-with-the-change.feature` — the record carries the key, both values, the epoch, the evidence in order, the attained level, the counter-metric reading, the dwell expiry and who rendered it, and an incomplete one is refused
- [ ] `tasks/02_an-undeclared-event-name-is-refused.feature` — a name the vocabulary does not declare is refused at the seam rather than appended to reach no reactor
- [ ] `tasks/03_redelivery-changes-nothing.feature` — the same ruling delivered twice leaves one record, so at-least-once delivery cannot inflate the evidence count

## Notes

- **The event is `harness.ruled`, not `harness.changed`** — `ARCHITECTURE.md#ADR-007` §1. The reason
  is the milestone's own: report-only is permanent, so the fact worth recording is the ruling.
- **The undeclared-name refusal is closed in the vocabulary's home**, not in this milestone's seam
  (`ARCHITECTURE.md#ADR-007` §4) — one door for the act, per the ledger's own rule three.
- **This story is the only writer of `src/effects/table.mjs`** in this milestone, and it adds exactly
  one name. The existing eight are untouched.
- **The ledger file is git-tracked and append-only** (`ARCHITECTURE.md#ADR-006` §2) — check
  `src/aof-gitignore.mjs` does not exclude it, and make sure it is not left to be discovered later.
