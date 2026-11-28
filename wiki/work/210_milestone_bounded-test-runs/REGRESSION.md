<!-- The regression gate's evidence (96/ADR-008). Appended by the gate command; never hand-written. -->
# Regression gate

## Gate runs

One row per gate run, appended by `aof work regression-gate <ref>`. A rerun APPENDS: the newest row is the one
the accept door reads, and the earlier rows are the milestone's history. A row whose commit,
instant, scope or result is missing makes this document UNREADABLE rather than green — repair it
by hand rather than deleting the row, because a row nobody can read and a gate nobody ran are the
same fact. A `override` row is a recorded reason for accepting WITHOUT a green gate
(ADR-008 §4), never a gate result.

| commit | instant | scope | result | detail |
|---|---|---|---|---|
| f42f9a9e576666c0ebc54116efc725624139aef8 | 2026-11-28T13:42:38.842Z | all | red | 154/05 01 high-risk row: continue, 154/05 01 full shipped prompt audit covers every descriptor role/procedure/skill honestly, command-core/workspace packages pass their package-local suites, 169/01 E2 · a packaged binary reads them from the sidecar · not isolated: 172/00 task01 E5 · deliveries queued during one turn are answered in the order they came, 172/00 task01 E8 · a process that exits mid-turn ends the turn as failed and the session as ended, mesh-ui-global-scope/00 `aof mesh ui` starts the global mesh view by default (no workspace required, scope=global in the announced URL), mesh-ui-cli-face/02 aof mesh ui --port binds the chosen free port on 127.0.0.1, 69/04 task 02: independent dispatch processes observe inspect-plan-materialise atomically, test/loop/lane-is-local-slot.test.mjs: executed -1 of 35 assigned cases, mesh-session-verbs/02 E5 · a session-spawn-ack with ok false and code session-repo-unavailable answers outcome refused with that code, and exits 1, 191/03 task02 — the CLI face carries the verb: `aof mesh session end aof-0b9e6c1e --json` pushes the session-end envelope onto the real relay, and answers ended: true (exit 0) once node-6eb3's presence no longer carries the session, 201/03 task 00 E1 + outline (seed 177 / seed 178 / no arguments) · a seeded sample is the same sample every time: two runs of --sample 40 --seed 177 replay the same 40 in the same order, seed 178 replays a different 40, and no arguments replays 40 with the seed 177 · sharded · 51.7 min |
