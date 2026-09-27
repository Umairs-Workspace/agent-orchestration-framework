---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: what was checked, by whom, with what evidence?
  Owner: the verify session (the PO/orchestrator). Evidence agents REPORT; they do not author here.
  Findings are triaged into STATE.md `## Feedback (for retro)` and TECH_DEBT.md, not restated.
-->
# 48 · Routable session identity — Verification

## Method

`aof:verify 48` on 2026-08-11, run in the orchestrator session against the working tree (nothing
committed yet). Every count below was **re-measured here**, not read off `STATE.md`: a focused driver
imported each m48 test array directly and ran it with a per-test hermetic `AOF_GLOBAL_HOME`, exactly as
`scripts/test.mjs` does. The full suite is never run on this machine — `global-work-propagation` binds
`:4182`, which the live control daemon holds.

The lane inventory was measured too, not assumed: **zero `@manual` and zero `@uat` scenarios exist in
this milestone.** All eight task features across the four stories are tagged
`@executable @cli|@ui @work @distribution`, with no per-scenario tag anywhere — so there is nothing for a
human to sign off in Gherkin, no `UAT.md` is owed, and no `aof-qa` acceptance broker was spawned.

**Design conformance: not applicable, by scope.** The milestone has no `DESIGN.md` and declares "any UI
surface" out of scope; its only `ui/` touch is two type declarations in `ui/src/fleet/api.ts`. There is no
route to render, so there is no `CONFORMS`/`GAPS`/`INCONCLUSIVE` verdict to reach — the grid that consumes
this wire is milestone 49.

## Verification evidence

### `@executable` suite + fitness functions — 189 pass / 1 fail

28 suites, run together in one process (`verifies →` every task feature of stories 00–03, plus the pins
m48 must not break).

| lane | suites | result |
|---|---|---|
| m48 fitness functions (new) | `acd-session-id-never-fabricated` 4 · `acd-session-leaf-per-session` 6 · `acd-session-orphan-reaped` 8 · `acd-session-entry-frozen-wire` 5 · `acd-session-index-derived-not-stored` 8 · `acd-session-attribution-single-authority` 4 | **35/35** |
| m48 fitness functions (amended in place) | `acd-session-record-frozen` 5 · `acd-session-run-reconciliation` 6 | **11/11** |
| m48 `@executable` task suites | `mesh-session-id-ladder` 7 · `mesh-session-per-session-record` 8 · `mesh-session-orphan-reaper` 9 · `mesh-presence-session-entry` 6 · `mesh-presence-session-wire` 5 · `mesh-launcher-session-wire-complete` 5 · `mesh-fleet-session-subsumption-render` 5 · `mesh-session-index-projection` 35 · `mesh-session-index-attribution` 15 | **95/95** |
| adjacent suites m48 touched | `mesh-presence-additive-sessions` 4 · `mesh-presence-aggregate-workspaces` 6 · `mesh-session-cli-record` 6 · `mesh-workspace-workdir-absolute` 9 · `mesh-session-ttl-liveness` 3 | **28/28** |
| pins that must stay green untouched | `acd-active-runs-frozen-string-array` 4 · `acd-session-presence-additive` 3 · `acd-session-ttl-reuses-isstale` 3 · `acd-session-ttl-self-expires` 4 · `acd-presence-aggregates-node-workspaces` 3 | **17/17** |
| **the human gate** | `acd-captured-producer-fixture` | **3 pass / 1 fail** on the first run; **4/4** after the re-capture — see F-48-1 |

The first run's single failure was the declared operator gate, not a defect: 5 drift violations, all of
the same shape — the three `REAL_CAPTURED_*` payloads carried the m38 four-key session entry
(`["workspaceId","repo","assistant","lastPingAt"]`) while the producer yardstick now emits ADR-005's
ordered six (`["sessionId","workspaceId","repo","assistant","lastPingAt","workspaceHasRun"]`). The
detector was working as designed; the fixture was stale. **Re-measured after the discharge below:
190 pass / 0 fail across the same 28 suites.**

### The operator gate, discharged (F-48-1)

The deploy the gate names was run and confirmed at the source, not assumed:
`node scripts/install-local.mjs` → `~/.aof/bin/aof.exe --version` reports
`0.1.0 (payload 7400664+dirty.20260811T211128)`, and after the operator restarted the desktop
supervisor both daemons came up on it. The effect was directly provable rather than inferred: **before**
the restart the live presence record carried `sessions: []` for `win-host-a` even though a session record
existed on disk — the pre-m48 payload cannot read the new 4-part leaf — and **after** it carried
ADR-005's ordered six with a real routable id.

Four payloads now pin the cross-language surface, all producer-fed:

| fixture | how it was taken | what it pins |
|---|---|---|
| `REAL_CAPTURED_LIVE_SESSION_STATUS` | re-captured 2026-08-11 | one session, repo `aof`, empty `activeRuns` → `working · aof (session)` |
| `REAL_CAPTURED_TWO_SESSIONS_STATUS` | re-captured 2026-08-11 | two sessions, repos `aof` + `beta` → the comma-joined line |
| `REAL_CAPTURED_TWO_SESSIONS_NON_ALPHA_STATUS` | re-captured 2026-08-11 | DG-2: a genuinely non-alphabetical wire order, sorted at the render |
| `REAL_CAPTURED_SESSION_WITH_RUN_STATUS` (**new**) | **live**, from the deployed fleet | `workspaceHasRun: **true**` — the branch nothing pinned before |

**The three re-captures went through the real producer, never a hand edit.** Each was taken from
`startLauncher`'s first publish — the ONE production caller of `assembleCurrentPresenceRecord` — over a
hermetic repo in its own `AOF_GLOBAL_HOME`, with sessions written by the real `startSession` and no run
records, which is the method fixture 3's original provenance already documents. Two disciplines make the
result reviewable:

- **The clock was injected at each fixture's own original capture instants**, so every re-captured
  presence object reproduces its original byte-for-byte *except* where m48 changed the producer:
  `sessionId` (`null` — those sessions were genuinely started with no id on any channel, exactly as the
  originals were), `workspaceHasRun: false` (no run in their workspaces), and `buildId`, which the
  producer now stamps with the build.
- **The re-serialisation was proven lossless before any splice** — each payload was parsed and re-emitted
  byte-for-byte and compared against the original text, so a reformat could not hide the real diff. Only
  the local node's `presence` object changed in each document; every peer node is the untouched original.

The fourth fixture is the one the milestone actually asked for and is worth stating plainly: it is a real
`aof mesh status --json` document from a deployed three-node fleet, carrying a live claude-code session
**in a workspace that also has a running run** — the exact record the pre-m48 producer deleted from the
wire. Its Rust test (`m48_a_session_stamped_workspace_has_run_still_renders_the_run_line`) is the
cross-language half of story 02's byte-identical claim: the desktop renders `running 1 run` and adds no
second `(session)` line, measured against a real payload rather than a hand-built one.

**`cargo test -p mesh-desktop-core` → 80 passed / 0 failed**, including the new test. Those payloads are
what its role, health and rendered-line assertions read, so this is the check that proves the re-capture
did not quietly change what the desktop asserts.

### Independent re-derivations run at verify

- **`shapeGlobalStatus`'s real top-level key list, read off the producer** — `scope`, `workspaceId`,
  `stalenessSeconds`, `workspaces`, `items`, `nodes`, `sessions`, `diagnostics` (8). This confirms F-48-2
  at source: the 48/03/01 contract enumerated six and omitted `stalenessSeconds`.
  *verifies →* `48/03/01_attribution-and-the-free-session.feature:114`.
- **`acd-no-new-silent-catch` is red at HEAD and is not m48's** — re-run in isolation: 1 pass / 1 fail,
  the sole violation `board-worker-stream.mjs: 1 silent catch site(s), baseline 0`. `git diff HEAD` on
  that file is empty and its last commit is `eacbd57` (m43, 2026-08-06). Already carried by `TECH_DEBT.md`
  item 27 row 1; m48 correctly did not re-baseline it.
- **The live presence store was read directly** (`~/.aof/mesh/presence/*.json`): all three published
  records — `win-host-a`, `win-host-a-wsl`, `umamis-mac-mini` — currently carry `sessions: []`. This is
  the measured reason F-48-1 cannot be discharged from this session: the re-capture needs a *deployed*
  build publishing a *live* session, and neither condition holds right now.
- **`aof work validate 48`** → `PASS — 48 is well-formed.`

## Findings

| id | observed | type | severity | triage | routed to | status |
|---|---|---|---|---|---|---|
| **F-48-1** | `acd-captured-producer-fixture` failed with 5 drift violations: the three `REAL_CAPTURED_*` payloads in `app/desktop/crates/core/src/view_model.rs` carried the m38 four-key session entry; the producer now emits ADR-005's ordered six. | scheduled gate (not a defect) | **blocker** — a red fitness function is a red trunk | **discharged at verify** — payload deployed, operator restarted the supervisor, three payloads re-captured from the real producer and a fourth captured live from the deployed fleet. No payload was hand-edited and no detector was weakened, exactly as ADR-008 requires. `acd-captured-producer-fixture` 4/4; `cargo test -p mesh-desktop-core` 80/0. | operator + verify session | **CLOSED** |
| **F-48-2** | `48/03/01_attribution-and-the-free-session.feature:114` enumerated the payload's other top-level keys as "exactly" six, omitting `stalenessSeconds` — which `shapeGlobalStatus` has carried since m43/story 04. The six match `GlobalMeshStatus`'s TypeScript declaration, which lags the wire. The developer asserted the seven the shaper really produces and named the departure rather than editing the contract mid-build. | contract error | non-blocker | **fixed at verify** — the feature's list corrected to seven (`stalenessSeconds` inserted); the test already asserted the true shape, so no code and no test changed. The retro lesson (read an "exactly" enumeration off the PRODUCER, never off its typed mirror) is already in `STATE.md` `## Feedback (for retro)`. | verify session | **CLOSED** |

Not findings, recorded so a later reader does not re-raise them:

- **`acd-no-new-silent-catch`** — red at HEAD, pre-existing, `TECH_DEBT.md` item 27 row 1. Not m48's, and
  m48 was right not to silently re-baseline it.
- **ADR-011 / the 200-character id row** — discharged in-build, routed to `TECH_DEBT.md` item 34
  (confirmed present at `wiki/work/TECH_DEBT.md:1692`, correctly numbered 34 despite the ADR's paste-ready
  block citing 29).

## User sign-off

No `@uat` scenarios exist in this milestone, so no Gherkin sign-off is owed and none was solicited.

**The one human act this milestone needed was operational, not a judgement:** the operator restarted the
desktop supervisor onto the deployed payload (2026-08-11), which is what let the gate above be discharged
against a real fleet. Confirmed at the source rather than reported: both daemons came up on
`payload 7400664+dirty.20260811T211128`, and the wire changed from `sessions: []` to ADR-005's ordered six
across that restart.

## Accept decision

**ACCEPTED — 2026-08-11.**

- **`@executable` + fitness functions:** 190 pass / 0 fail across all 28 m48 suites and its untouched
  pins, re-measured at verify. All ten m48 gates green, including the two amended in place and the
  cross-language one that was red on arrival.
- **Cross-language surface:** `cargo test -p mesh-desktop-core` 80 passed / 0 failed.
- **`aof work validate 48`:** PASS, re-run after every edit made here.
- **Lanes owed:** zero `@manual`, zero `@uat` scenarios; design conformance out of scope (no `DESIGN.md`,
  no UI surface — the grid is m49).
- **Findings:** two raised, both closed. No blocker open.

All four stories are `done`, so `SPEC.md` moves to `done`. What the milestone set out to do is true of the
system now: any live session on any node is addressable as `(nodeId, sessionId)` without an assignment —
and that is measured on the real fleet, not only in fixtures.

One thing is deliberately left as it was: `acd-no-new-silent-catch` stays red at HEAD on
`src/board-worker-stream.mjs`. It is m43's, it is carried by `TECH_DEBT.md` item 27 row 1, and m48
correctly refused to re-baseline it to make its own run look clean.
