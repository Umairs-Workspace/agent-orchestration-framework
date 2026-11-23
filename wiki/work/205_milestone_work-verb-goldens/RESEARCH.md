---
doc: research
---
# 205 · CLI observations used to design the fixture

On 2026-11-22 the checkout CLI ran in disposable projects with their own configuration, installed work templates and private global homes. The placement and lifecycle probes below each started from a fresh seed. The seed included live refs 10–19, children 10/00 and 10/01, archived 30 and the backlog chores queued and waiting. The latter depends on queued. Read probes used both CLI formats. These are observations for contract design. Build verification will compare committed baselines.

| Probe | Observed result |
|---|---|
| `next 10` and `next 10/01` | The ready wave contains only 10/00. Scoped to 10/01 the state is blocked and waitingOn contains 10/00. |
| `find nonsense` | Text exits 1 with the miss on stdout and a final newline. JSON exits 0 with an empty array. |
| `doc 10/00 OUTCOME` | Text reports absence. JSON reports present false and an empty body. Both exit 0. |
| `validate 11` | The dated chore yields an empty findings array. Omitting its two dates yields two findings and exit 1. |
| `promote queued` | The new ref is 31 even though 19 is the highest live ref. An explicit slot at 11 with confirmation shifts nine live items. Slot 30 refuses because an archived item holds it. |
| `promote waiting` | Exit 1, code promote-depends-backlog, with queued named in the message. |
| `insert-uat trial --at 11 --depends 12 --yes` | New UAT 11 depends on 13, the shifted former spike 12. Inserting a story at 10/00 shifts two siblings and updates the parent's checklist. |
| `archive --done` | Asks for confirmation and lists 17 and 19. With confirmation it archives both, including the done prototype. |
| `status 11 done` | The JSON refusal names status-edge-not-applicable and the current status. The text form exits 1 with the legal moves. Prototype 16 accepts paused to active; asking for blocked refuses. |
| `renumber 10/00 --to 03` | The new story and the parent's checklist are in the rewrite list. The sibling 10/01 keeps its literal bare dependency [00]. The current result is observable and should appear in the baseline. |

The inherited harness parses stdout after trimming it, omits stderr on an expected exit and walks the entire project and home as UTF-8. A real successful work mutation created journal.sqlite and projection.sqlite in its private global home. The renumber success envelope also carries an event id. Whole-home capture would compare binary operational state, and a parsed step alone would lose a one-character change to text output. ADR-001 specifies how the work lanes provide the harness with the observations in scope.

Sources include `test/support/golden/harness.mjs:40`, `test/support/golden/normalise.mjs:118`, `packages/work/src/commands/find.mjs`, `packages/work/src/renumber.mjs:92` and `packages/work/src/insertion/scaffold.mjs:229`.
