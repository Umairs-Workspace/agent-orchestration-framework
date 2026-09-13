<!-- aof-generated: `aof work loops document --write` – do not edit by hand -->

# The loop graph

The control loops this repository declares, projected from the loop registry at `.aof/loops`.
Regenerate with `aof work loops document --write` after any change to a loop record.

## Health

- Declared records: 17
- Declared edges: 23
- Findings: 0 error, 33 warning

| check | findings |
| --- | --- |
| grounding | 11 |
| anchor-grounding | 4 |
| pairing | 0 |
| reference-ownership | 0 |
| actuator-arbitration | 0 |
| timescale | 0 |

The diagram below draws every endpoint a record points at, including endpoints no record
declares; the record count above counts declared records only.

## The graph

```mermaid
flowchart LR
  actor_operator(["actor:operator · Human operator"])
  actor_product_owner(["actor:product-owner · Product owner"])
  anchor_rubric_process_exit(("anchor:rubric-process-exit · Rubric process exit"))
  anchor_run_lifecycle_policy(("anchor:run-lifecycle-policy · Run lifecycle policy"))
  anchor_run_liveness(("anchor:run-liveness · Run liveness observation"))
  arbiter_speed_thoroughness_autonomy{"arbiter:speed-thoroughness-autonomy · Speed versus thoroughness versus autonomy"}
  auditor_instrument_audit>"auditor:instrument-audit · The instruments are audited by something none of them supervises"]
  config_work_autonomous_maxAttempts[/"config:work.autonomous.maxAttempts"/]
  config_work_loop_buildNoProgressRounds[/"config:work.loop.buildNoProgressRounds"/]
  config_work_loop_reviewRounds[/"config:work.loop.reviewRounds"/]
  loop_autonomous_cascade["loop:autonomous-cascade · Advance a work range to done"]
  loop_build_to_green["loop:build-to-green · Build executable work to green"]
  loop_mesh_assignment_reclaim["loop:mesh-assignment-reclaim · Reclaim assignments only after dual staleness"]
  loop_retrospective_memory_ingest["loop:retrospective-memory-ingest · Capture milestone lessons into memory"]
  loop_review_fix_rereview["loop:review-fix-rereview · Review, fix, and re-review"]
  loop_run_resilience["loop:run-resilience · Keep runs within their lifecycle policy"]
  loop_verify_triage_accept["loop:verify-triage-accept · Verify, triage, and accept an item"]
  watcher_autonomous_cascade_watcher{{"watcher:autonomous-cascade-watcher · Autonomous cascade watched against intervention rate"}}
  watcher_build_to_green_watcher{{"watcher:build-to-green-watcher · Build-to-green watched against contract shrinking"}}
  watcher_review_fix_rereview_watcher{{"watcher:review-fix-rereview-watcher · Review-fix-rereview watched against finding escape"}}
  actor_operator -->|target-setting| arbiter_speed_thoroughness_autonomy
  actor_operator -->|target-setting| loop_autonomous_cascade
  actor_operator -->|target-setting| loop_mesh_assignment_reclaim
  actor_operator -->|target-setting| loop_retrospective_memory_ingest
  actor_product_owner -->|target-setting| loop_verify_triage_accept
  anchor_rubric_process_exit -->|data-feed| loop_build_to_green
  anchor_run_lifecycle_policy -->|target-setting| loop_run_resilience
  anchor_run_liveness -->|data-feed| loop_mesh_assignment_reclaim
  anchor_run_liveness -->|data-feed| loop_run_resilience
  arbiter_speed_thoroughness_autonomy -->|parameter-tuning| config_work_autonomous_maxAttempts
  arbiter_speed_thoroughness_autonomy -->|parameter-tuning| config_work_loop_buildNoProgressRounds
  arbiter_speed_thoroughness_autonomy -->|parameter-tuning| config_work_loop_reviewRounds
  arbiter_speed_thoroughness_autonomy -->|veto| loop_autonomous_cascade
  arbiter_speed_thoroughness_autonomy -->|veto| loop_build_to_green
  arbiter_speed_thoroughness_autonomy -->|veto| loop_review_fix_rereview
  arbiter_speed_thoroughness_autonomy -->|veto| loop_verify_triage_accept
  auditor_instrument_audit -->|reporting| actor_operator
  auditor_instrument_audit -->|reporting| actor_product_owner
  loop_autonomous_cascade -->|target-setting| loop_build_to_green
  loop_autonomous_cascade -->|target-setting| loop_review_fix_rereview
  watcher_autonomous_cascade_watcher -->|monitoring| loop_autonomous_cascade
  watcher_build_to_green_watcher -->|monitoring| loop_build_to_green
  watcher_review_fix_rereview_watcher -->|monitoring| loop_review_fix_rereview
```

## The records

### `actor:operator` – Human operator

- kind: actor
- ground: exogenous

### `actor:product-owner` – Product owner

- kind: actor

### `anchor:rubric-process-exit` – Rubric process exit

- kind: anchor
- ground: process-exit
- observes: module:src/commands/grade.mjs#reportObservation

### `anchor:run-lifecycle-policy` – Run lifecycle policy

- kind: anchor
- ground: frozen-rule
- observes: module:src/run-store.mjs#isLegalTransition

### `anchor:run-liveness` – Run liveness observation

- kind: anchor
- ground: live-soak
- observes: module:src/run-store.mjs#isStale

### `arbiter:speed-thoroughness-autonomy` – Speed versus thoroughness versus autonomy

- kind: arbiter
- resolves: how much of the same agent's effort each loop may spend
- priority: loop:verify-triage-accept, loop:review-fix-rereview, loop:build-to-green, loop:autonomous-cascade
- dwell: cycles:2

### `auditor:instrument-audit` – The instruments are audited by something none of them supervises

- kind: auditor
- audits: module:scripts/test.mjs#tests, module:src/work-audit/census.mjs#runCensus, module:src/work-audit/evidence.mjs#runEvidence, module:src/work-audit/spawn.mjs#runBounded, module:src/work/doctor-controls.mjs#fitnessDeclarations, module:src/work/loops-checks.mjs#buildGroundednessReport, command:work:loops-validate, watcher:autonomous-cascade-watcher, watcher:build-to-green-watcher, watcher:review-fix-rereview-watcher, anchor:rubric-process-exit, anchor:run-lifecycle-policy, anchor:run-liveness
- measurement: command:work:audit
- cadence: event:per-milestone
- escalation: actor:operator

### `loop:autonomous-cascade` – Advance a work range to done

- kind: loop
- controlled: items reaching done over a work range
- reference: command:work:next
- measurement: command:work:next
- actuator: prose:src/bundle/agents/aof-product-owner.md, prose:src/bundle/agents/aof-developer.md, prose:src/bundle/agents/aof-qa.md
- cadence: event:per-item
- ceiling: config:work.autonomous.maxAttempts
- owner: unknown
- optimizing: true
- layer: management

### `loop:build-to-green` – Build executable work to green

- kind: loop
- controlled: executable scenarios and fitness functions green
- reference: prose:src/bundle/commands/continue.md
- measurement: prose:src/bundle/commands/continue.md
- actuator: prose:src/bundle/agents/aof-developer.md
- cadence: event:per-phase
- ceiling: config:work.loop.buildNoProgressRounds
- owner: unknown
- optimizing: true
- layer: operational

### `loop:mesh-assignment-reclaim` – Reclaim assignments only after dual staleness

- kind: loop
- controlled: module:src/mesh/assignment-reclaim.mjs#reclaimStaleAssignments
- reference: module:src/mesh/assignment-reclaim.mjs#dualStalenessDecision, module:src/mesh/presence.mjs#isNodeStale, module:src/run-store.mjs#isStale
- measurement: module:src/mesh/assignment-reclaim.mjs#dualStalenessDecision, module:src/mesh/presence.mjs#isNodeStale, module:src/run-store.mjs#isStale
- actuator: module:src/effects/assignment-transitions.mjs#transitionAssignmentState, module:src/effects/run-transitions.mjs#transitionRunReclaimed
- cadence: periodic:15s
- ceiling: none
- owner: unknown
- optimizing: false
- layer: operational

### `loop:retrospective-memory-ingest` – Capture milestone lessons into memory

- kind: loop
- controlled: milestone lessons made recallable
- reference: prose:src/bundle/commands/retrospective.md
- measurement: prose:src/bundle/commands/retrospective.md
- actuator: module:src/work/memory.mjs#runMemory
- cadence: event:per-milestone
- ceiling: none
- owner: unknown
- optimizing: false
- layer: governance

### `loop:review-fix-rereview` – Review, fix, and re-review

- kind: loop
- controlled: open review findings
- reference: prose:src/bundle/commands/continue.md
- measurement: prose:src/bundle/commands/continue.md
- actuator: prose:src/bundle/agents/aof-developer.md
- cadence: event:per-phase
- ceiling: config:work.loop.reviewRounds
- owner: unknown
- optimizing: true
- layer: operational

### `loop:run-resilience` – Keep runs within their lifecycle policy

- kind: loop
- controlled: module:src/run-store.mjs#readRuns
- reference: module:src/run-store.mjs#isLegalTransition, module:src/run-store.mjs#isRetryable
- measurement: module:src/run-store.mjs#isStale, module:src/run-store.mjs#retryReadiness
- actuator: command:work:run-start, command:work:run-retry, command:work:run-complete
- cadence: event:per-run-start
- ceiling: config:work.autonomous.maxAttempts, module:src/run-store.mjs#shouldRetry
- owner: unknown
- optimizing: false
- layer: operational

### `loop:verify-triage-accept` – Verify, triage, and accept an item

- kind: loop
- controlled: findings triaged and item accepted
- reference: prose:src/bundle/commands/verify.md
- measurement: prose:src/bundle/commands/verify.md
- actuator: prose:src/bundle/agents/aof-developer.md, prose:src/bundle/agents/aof-qa.md, prose:src/bundle/agents/aof-product-owner.md
- cadence: event:per-item
- ceiling: none
- owner: actor:product-owner
- optimizing: false
- layer: management

### `watcher:autonomous-cascade-watcher` – Autonomous cascade watched against intervention rate

- kind: watcher
- counter: how often a run needed a retry or a hand
- determinism: counter
- measurement: command:work:counters

### `watcher:build-to-green-watcher` – Build-to-green watched against contract shrinking

- kind: watcher
- counter: whether the acceptance criteria got smaller
- determinism: counter
- measurement: command:work:ratchet

### `watcher:review-fix-rereview-watcher` – Review-fix-rereview watched against finding escape

- kind: watcher
- counter: findings raised after the item was accepted
- determinism: counter
- measurement: command:work:counters
