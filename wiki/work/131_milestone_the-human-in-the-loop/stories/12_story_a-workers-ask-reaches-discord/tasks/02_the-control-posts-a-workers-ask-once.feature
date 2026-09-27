@executable @cli @work @work-stream
Feature: the control posts a worker's ask once, on the edge into needs-input, naming the worker's node

  ADR-010 §4. Before its transition, the `settle-assignment` reactor (`src/effects/table.mjs`)
  reads the row's `code`. Only when that code is not already `needs-input` and the fact parks the
  row does it call `announceWorkerAsk(row, ask, ctx)` in `src/mesh/park-resume.mjs`. That function
  resolves the control's checkout of the row's workspace (`resolveNodeWorkspaces`), builds
  `session-needs-input` with `node` = the row's worker and `question` = the ask's, and awaits
  `notify`. The notifier's index (story 10) records the posted message against that checkout's
  root. `buildNotifyEnvelope` takes `fields.node` over `config.mesh.nodeId`.

  RULINGS (architect, 2026-09-25). (1) This departs from ADR-005 §4's "not an effects reactor".
  The reason given there was a redelivered duplicate post, and the edge makes this post
  at-most-once per park. (2) The reactor's return value is unchanged: the post is not transition
  evidence, and the bridge ACK must not read it. (3) A throw from `announceWorkerAsk` is caught and
  degraded `worker-ask-unannounced`. It never fails the settle.

  RULINGS (PO, 2026-09-25). (1) With no control-side checkout of the workspace, nothing is posted,
  and one `worker-ask-unannounced` degrade names the workspace id. (2) An ask with a null question
  is still posted, with no body line. The headline and the action line are enough to act on.

  RULINGS (QA, 2026-09-25). `notify` is observed through a fake fetch counting POSTs. The
  redelivery is the same event applied twice.

  Scenario: a worker's ask is posted with the worker's node
    Given the control's checkout of the workspace has `discord` enabled, and a `running` row for `131/03` on "node-2976"
    When the park fact with an ask is applied
    Then exactly one POST is made, whose content's line 1 is `**131/03 — waiting on you** (build, <elapsed>) · node-2976`, and whose body is the ask's question

  Scenario Outline: when the control posts
    Given a row whose code is <before>
    When <fact> is applied
    Then <posts> POST is made

    Examples:
      | before          | fact                                          | posts   |
      | `null`          | a park fact with an ask                       | one     |
      | `resumed`       | a park fact with an ask (the session re-asked) | one     |
      | `needs-input`   | the same park fact, redelivered                | no      |
      | `null`          | a `done` fact                                  | no      |

  Scenario: no checkout, no post
    Given the control has no checkout of the row's workspace
    When the park fact is applied
    Then no POST is made, one `worker-ask-unannounced` names the workspace id, and the row reads `needs-input`

  Scenario: a local ask keeps its own node
    Given an envelope built with no `fields.node`
    When `buildNotifyEnvelope` runs with `config.mesh.nodeId` "node-7297"
    Then its `node` is "node-7297"
