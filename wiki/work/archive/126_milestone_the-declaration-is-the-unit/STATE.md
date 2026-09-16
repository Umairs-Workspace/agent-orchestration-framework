---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 126 · The declaration is the unit — State

## Progress

- [x] Framed 2026-09-08 (`aof:add-milestone`). Spine only — SPEC + STATE.
- [x] Refined 2026-09-08 (`aof:refine 126 --autonomous`) — eight ADRs recorded, eight controls
      declared `pending`, **six** stories drawn (the architect proposed seven; two merged at the
      break-down), every story's contract authored. Next: `aof:continue 126` — story `00` waits on
      `124/01` (`in-review`); `04` and `05` are ready now.
- [x] Built and reviewed 2026-09-09 — all six stories `in-review`, every declared control landed.
- [x] Accepted 2026-09-10 (`aof:verify 126`) — seven stories done. `126/06` was ADDED at verify,
      from a measured 8h34m bill the live `@manual` lane produced, rather than deferred to a
      backlog; `F-33` was fixed inline in `126/03` for the same reason.

## Notes & decisions in flight

### Refine session, 2026-09-08 — the defaults taken under `--autonomous`, and why

**The break-down merged the architect's stories 00 and 01.** The proposal drew the clock and the
narration as two stories so the clock — the smallest change, and the one that blocks every resume —
could ship alone. Measured against the write sets, shipping it alone unblocked nothing: the
predicate story collides with the narration on both `src/commands/loop.mjs` and
`test/arch/loop/index.mjs`, so it could never wave before narration landed. Merging strictly
shortens the critical path on the god-node — `124/01 → 00 → 02 → 03` — with no loss. `FF-12601` and
`FF-12602` both land with `00`.

**`01` depends on `00`, for a derivation and not for a file.** ADR-003 §2 rules that `run-status`'s
elapsed and heartbeat-age figures reuse ADR-001's per-attempt arithmetic rather than re-derive it.
That arithmetic is a pure export in `src/work/loop.mjs`, and the engine imports nothing, so there is
nowhere `01` could reach it first. The cost is one small story leaving the day-one wave; the
alternative was a second copy of the one rule this milestone exists to keep single.

**The `124/01` edge is carried by the milestone, not by story `00`.** `aof work validate` refuses a
story `depends:` that names anything but a sibling (m65/00's rule), so `00 → 124/01` was not an
admissible edge. The constraint is real — two writers on the loop pair — and it is spelled the way
the stream spells every cross-milestone edge: `126 depends: [124]`. The cost is honest and small:
`04` and `05` also wait for `aof:verify 124`, whose three stories are all `in-review` today, so the
block clears at 124's next step rather than at some later one.

**Two write-set collisions are left to the ready-wave partition and deliberately NOT drawn as
`depends:` edges.** `01` and `02` both edit `test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs`
(one re-pins a hash, the other moves an eight-key assertion to nine); `02` and `04` both append to
`test/arch/mesh/index.mjs`. Neither pair needs the other's capability. The architect's amendment
suggested `04 depends: [02]` as the cheapest resolution; refused, because `04` is ready today and `02`
sits three stories deep — an edge would hold an independent story behind the whole chain to order
two appends the wave already orders. 124's own thesis: an edge with no crossing is the unwitnessed kind.

**Defaults ratified from `ARCHITECTURE.md`, each reversible by an ADR and none silently:**

- `--quiet`, not `--verbose` — silence is what is asked for; it silences every in-flight line
  (including the four that exist today) and nothing in `53/ADR-016`'s terminal account.
- The clock's subject is the `retryOf` lineage, not the declaration. Inter-attempt latency is no
  longer charged; measured cost on 124/00's own three-attempt lineage, 3.2 seconds.
- Supervision is a **ninth `brief.loop` key**, `supervised`, default `false` — not a config
  allow-list, not a registry file (`53/ADR-004` refuses a sibling store for a durable loop fact).
  The eight declarations on disk read as unsupervised retroactively and for free.
- The declarations answer rides `mesh status --json` **behind a `--declarations` flag**, asked every
  tenth 3 s tick; measured 167 ms over 410 items and 105 records, paid only by the one caller that
  reads it.
- `mesh serve` / `mesh ui` do **not** come from the answer — `mesh status` is itself one of the
  supervisor's spawns, so a supplied set containing it has no base case. The role latch stays.
- The spawn roster becomes an allow-list by **extending** `36/acd-desktop-read-only-fleet`, never a
  sibling control; `work loop` admitted in writing as local process supervision.
- No `RESEARCH.md` — no blocking unknown survived measurement (the warning filter, the Run key,
  `claude auth status` and the graph were each measured at refine). No `DESIGN.md` — the only UI
  change is a fourth named clean exit and an exit-0 line through a tray field `36/DESIGN.md` already
  specifies.
- **A named clean exit HOLDS a declaration** the way an operator Stop does, released when its row
  disappears or lifted by an operator Start (raised by QA on `126/03`, decided at that contract's
  own authoring beat). Without it, `duplicate-run` — a live run already exists on that scope, which
  the predicate rightly keeps listing — would be re-attempted every 30 s for as long as an
  operator's own terminal loop ran. The daemons already behave this way for their three named
  clean exits; declarations inherit it. An exit-0 child whose row persists is still started again.
  Two smaller code-grounded corrections landed in the same beat: `duplicate-run` is classified on
  the store's message (the code token never reaches a non-`--json` child's output), and the notice
  is cleared per child rather than on any child's start.
- **The stale `running` record IS the died loop** (raised as a Blocker by QA on `126/02`, ruled at
  that beat, amended into ADR-001 §2 and ADR-004 §2). Between the lid closing and the next reclaim
  sweep, the record a died loop leaves is `running` with a stale heartbeat — and nothing reclaims it
  at login. As written, ADR-004 §2 never listed it and ADR-001 §2 charged it `now − createdAt`,
  the 11.5-hour bill again. Ruled: an attempt ends at its close if it settled, at its last observed
  liveness if reclaimed **or stale-running**, and at `now` only while demonstrably alive (the summer
  takes `stalenessMs` as data); the predicate lists fresh-running, stale-running and resumable
  declarations, the clock leg applying to the last two.
- **`isRunning` is an additive export on the run store, and the `retryOf` walk moves into the
  engine** (both raised by `126/02`'s feasibility pass). The predicate may spell no run-state
  literal and `retryReadiness` answers `not-retryable` for a running record, so the store — which
  owns that vocabulary — exports the one predicate that was missing; `53/FF-5307` leg 2's byte-pin
  of `src/run-store.mjs` is re-pinned in `02`'s diff with its reason, as `01` does for the renderer.
  The engine imports nothing, so the shell's lineage walk cannot be reached from the predicate: it
  becomes one pure engine function that the shell adopts, and `01`'s one digest row that named
  `src/run-store.mjs`'s literal was reworded at the same beat so a later re-pin cannot falsify it.
- **The render asks a different question from the budget clock, through the same arithmetic.**
  The per-attempt term and the lineage summer take `stalenessMs` optionally: supplied (the shell
  passes `heartbeatFromConfig`), a stale `running` attempt ends at its last liveness — that is the
  budget; absent, a `running` attempt is alive and ends at `now` — that is what `run-status` shows
  as "running for", beside the heartbeat age that tells the operator whether to believe it. One
  home, two callers, no config read in a render. (Ruled at `126/00`'s and `126/01`'s beats.)
- **The live `now` for `run-status` comes from the face** (raised by QA on `126/01`, amended into
  ADR-003 §2): `cli.render(result, faceCtx)` carried no clock, so a render forbidden a wall clock
  and a document forbidden a new key left the operator's own path with nothing. `src/spine/face.mjs`
  supplies one additive `now` on every render's `faceCtx`; tests inject it; the input schema and
  the document do not change. `01`'s write set gains the face.
- **`declarations` is `{ ok, rows, skipped }`** (raised on `126/02`, amended into ADR-005 §6):
  `resolveNodeWorkspaces` has a fourth outcome, `ok: false`, and an unreadable store must never read
  as an empty node; the standalone fallback applies only to `ok: true` with no membership rows.
- **`install --dry-run` covers the whole verb** (the artifact refusals survive it, so the bijection
  probe's behaviour is unchanged), `--autostart --no-autostart` together is the coded refusal
  `autostart-flags-conflict`, the value name is `aof-mesh-desktop`, `--no-autostart` off Windows
  refuses like `--autostart`, and the injected runner's answer gains a `stderr` field (`reg`
  reports there) — all ruled on `126/04`'s contract at its beat. The preflight's `claude` probe is
  its own injected seam, never the registry runner, or "no registry runner was invoked" could not be
  asserted on `install`. One pre-existing defect is to be fixed inside `04` at build: a running app
  makes `installDesktopApp`'s rename fail and the verb misreports it as `install-dir-not-writable`.
- **ADR-002's line classification is by ROLE, not by call site** (raised on `126/00`): the L1 row
  lines and `Nothing to resume …` are ACCOUNT lines and stay loud under `--quiet`; three existing
  in-flight lines move to `narrate`, not four. `--level L1 --quiet` prints exactly what L1 prints.
- No new TECH_DEBT entry. The ledger sits at 3,614 lines against a 3,634 ceiling; everything found
  is fixed in its item. Two findings for the ledger's single writer, reported not fixed: 28 of 74
  entries carry no `**Status:**` line (items 19, 20, 22 among them), and items 20 and 91 carry stale
  path/line citations.

**Two corrections to this milestone's own SPEC, recorded in `ARCHITECTURE.md` and not re-argued
here:** the clock's origin was never the declaration's `startedAt` (both call sites pass a run
instant), and `"reclaimed"` occurring once in `src/` is the assignment vocabulary — the run-side
edge is `transitionRunReclaimed`, which the predicate consumes as a record, not a string.

**Memory recall.** The PO recall keyed to this milestone (`--item 126 --block`) returned an empty
block — nothing to surface. A broader recall surfaced `47/R20` (*the wall-clock was 644 hours; the
work was ten*), which is ADR-001's thesis stated by a retrospective a year earlier and is honoured
by it. The architect's recall and its six acknowledgements are at the head of `ARCHITECTURE.md`.

**Findings raised while the contracts were being authored, routed to triage at the review close
rather than re-opening any contract** (the amendment rule):

- `invoke` performs no input-schema validation (`src/command-core.mjs:316-322`): every "closed
  schema" in this tree is a declaration policed by arch controls, never a runtime refusal. Tree-wide;
  worth a ledger entry when the ledger has room (it is 20 lines from its ceiling).
- The suite's CLI harnesses hide the very warning `05` removes — `--no-warnings` on argv in 3 files,
  `NODE_NO_WARNINGS=1` in ~60 files under `test/` — so a regression of the sqlite leaf is invisible
  to every CLI integration test; `05`'s one raw-spawn stderr scenario carries the whole weight.
- `~/.aof/bin/launch-desktop.cmd` is a hand-made cwd-pinning shim nothing in the repository writes;
  the Run value names the exe (ADR-007 §1) and `03` pins the daemons' cwd instead.
- `126/02` appends the ninth declaration key and will red `126/00`'s eight-key pin and the golden
  fixture; both are declared in `02`'s write set as an expected succession, not a regression.
- The ledger: 28 of 74 entries carry no `**Status:**` line; items 20 and 91 carry stale citations.
- Contract-beat process lesson: every QA pass produced wrapped step lines that the feature parser
  refuses; `aof work validate <story>` after each authoring pass would have caught them before the
  feasibility seat did.

**`aof work doctor 126` also reports `depends-blocked-in-progress` at error, and that is the
sequencing working as declared.** This refine ran ahead of 124's acceptance on the operator's
instruction — a docs-only phase that touches none of the contended files — and the run mint moved
126 to `in-progress` while `depends: [124]` now says the BUILD must wait. The finding is a
coherence-lane advisory, not a gate code, and it clears the moment `aof:verify 124` closes 124's
door (its three stories are accepted; the milestone owes two repairs, a commit and a green
regression gate). Until then `aof work next 126` answers `blocked, waitingOn 124` — which is exactly
the collision on the loop pair this milestone's `SPEC.md` names as the one it must not cause.

**`aof work doctor 126` reports `verification-register-missing` at error.** That is the normal
state of an open milestone with a declared register and no `VERIFICATION.md` yet — `aof work doctor
124` reports the same today — and the register's red probes are owed at `aof:verify`, when each
control has landed.

### The framing is a post-mortem, not a proposal

Every row of the SPEC's two tables was measured during the failure that produced this milestone,
not inferred. The operator ran `aof work loop 124` for the first time; it built ~940 lines of
124/00, went dark, died with the laptop, and then refused to resume. The four defects were found by
reading the tree while the loop was still notionally live.

### The naming decision, and the two it beat

The supervised unit is the **`Declaration`**. Considered and rejected in conversation:

- **`Task`** — already means a `.feature` inside a story (`aof:add-task`). A second meaning at the
  supervisor boundary would collide with the work vocabulary.
- **`Process`** — collides with the OS child handle the Rust supervisor spawns; `Process` and
  `Child` sitting adjacent in the same module is a blur waiting to happen.
- **`Job`** / **`Service`** — each smuggles a lifetime in: `job` implies batch-finite, `service`
  implies never-ending, and the set contains both kinds.

`Declaration` won because it is **already in the code** with the right semantics
(`buildLoopDeclaration` / `readLoopDeclaration` / `resolveLoopResume`) — this generalises an
existing concept rather than minting a sibling for it — and because "declared vs actual" is the
native language of the level-triggered model the supervisor adopts.

### Level-triggered dissolved the lifetime problem

An earlier framing gave each supervised entry a `kind` (service ⇒ restart on exit, job ⇒ do not).
That field is **dropped**. If aof re-answers *"which declarations should be running now"* on every
tick, a finished loop simply stops appearing and nothing relaunches it. No completion semantics
cross into Rust, and the supervisor's whole contract collapses to *make actual match declared*.

The consequence to get right is the predicate behind that answer: it must distinguish **died** from
**stopped for cause**, or the reconciler becomes a crash-loop. The inputs already exist and were
observed on this very failure — `failed / runtime_offline` (restart-worthy) against
`deadline-exhausted` (a bound was hit; a human should look).

### Sequencing against 124/01 is a hard constraint

`124/01` declares `src/work/loop.mjs` and `src/commands/loop.mjs`. The narration and the clock both
land in those two files. Three separate improvements were identified during framing and all three
queue behind that story — refine must sequence, not assume.

### The clock fix blocks everything else

Any supervisor built before it would restart into an instant `deadline-exhausted`, burn a run record
per attempt, and be read by the backoff machinery as a flapping child rather than a bug. It is also
the smallest of the changes, which makes the ordering easy.

## Feedback (for retro) — ARCHIVED at accept, 2026-09-10

The blow-by-blow of six build+review passes lived here and has GRADUATED. Every lesson it carried is
now an `R<n>` in a retrospective — one per story under `stories/*/RETROSPECTIVE.md`, plus this
milestone`s own `RETROSPECTIVE.md` for the five lessons no single story states — and every finding it
raised is a numbered row in `VERIFICATION.md`, which is the register a check can read. Nothing is
lost by the compaction; what is removed is the second copy.

The durable decisions above it did not graduate to a retrospective but to `ARCHITECTURE.md`: the
eight ADRs and their amendments are where the rulings live, and the section above records only how
they were arrived at.

## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` suite green — per-story lanes, and the whole tree at `aof work regression-gate 126`.
- [x] Fitness functions green — all eight, each with a red probe recorded in `VERIFICATION.md`.
- [x] `@manual` run — `126/04 tasks/04` scenario 1 and `126/03 tasks/04` scenarios 1-2 live on the
      control node; the two that need a Windows logon and a GUI act are `F-30` and `F-32`, open.

Evidence, findings and the accept decisions: `VERIFICATION.md`. Lessons: `RETROSPECTIVE.md` here and
one per story. Delivered state: `OUTCOME.md`.
