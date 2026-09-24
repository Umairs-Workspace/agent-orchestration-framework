---
type: story
doc: retrospective
number: 02
parent: 129
slug: the-drive-is-a-child
title: "Retrospective — the drive is a child"
created: 2026-09-13
updated: 2026-09-13
---
# 129/02 · Retrospective

Lessons from delivering and accepting the story. One `R<n>` per lesson, each carryable. Findings are
**referenced**, never restated: they live in the milestone's `VERIFICATION.md`. The run was not clean
— one Blocker at review round 1, fixed in item; two rounds; one real grind
(`observability/snapshots/2026-09-13T03-13-26-740Z/report.md`: 4 agents, 1h13m real active time,
the developer 33% on the toolchain with `drive.mjs` edited ten times) — and the accept itself made
one mistake worth its own entry (`R5`).

## R1 — An aof self-spawn branches on what `process.execPath` IS, never on what is on disk

- **Kind:** mistake · **Area:** architecture · **Stage:** refine → build · **Owner:** architect / developer · **Raised by:** all three review lenses

**What happened.** ADR-005 §1 and the STORY's feasibility note both wrote the child's argument vector
for a Node runtime — `[<cli.mjs>, "work", "drive", …]` — and the build discriminated on `cli.mjs`
existing on disk. Under the payload-first `aof.exe` the file exists AND the exe is the interpreter, so
`aof.exe <cli.mjs> work drive …` answers `Unknown command`, exit 1, zero stdout bytes: every lane drive
from the installed binary would have `died` at t=0. Reproduced at the source by three reviewers; fixed
in item on `isPackaged()`, the entry resolved lazily so the embedded bundle's `import.meta = {}` cannot
throw at load; ADR amended, dated.

**Why.** The tree has been a payload-first launcher since 2026-07-26 (`build-deploy-restart.md`) and
every design document still reasons about `node src/cli.mjs`. "Is there a `cli.mjs`?" was the question
the developer could answer from the repo; "what is the interpreter?" needs the install to be in the
room. The same latent shape sits at `src/work-audit/census.mjs:516` and `evidence.mjs:528`.

**Lesson.** Any module that spawns aof itself keys its argv on the one SEA-detection home
(`isPackaged()`, `src/asset-base.mjs`) and its refine names the packaged branch as an Examples row —
the SEA sentinel exists for exactly this. A feasibility note that says "process.execPath" says which
of its two identities it means. Refs: `F-13`, ADR-005 §1 (amended 2026-09-13), `F-17` (the control's
argv leg takes the same branch).

## R2 — A cancel gated on a state must say what happens to the event in the window BEFORE the state

- **Kind:** near-miss · **Area:** contract · **Stage:** refine · **Owner:** Three Amigos · **Raised by:** craft, QA and architect (one finding, three lenses)

**What happened.** Task 01's RULINGS gate the stdin cancel on liveness — "an `end` seen before
`onPtyLive` fired is recorded and ignored" — and lock the row "was ended before the command started →
done". A parent cancel that lands in the child's startup window (150 ms–1.2 s measured) is therefore
dropped: the session spawns anyway and the parent's grace SIGKILLs the child outside the driver's
bracket. The review saw it, the contract forbids the fix here, and it moved to 04's contract as a
proposed rule (arm only on a pipe; on a pipe every `end` is the cancel).

**Why.** The ruling answered the case in front of it — a `/dev/null` stdin whose `end` is immediate
must not read as a cancel — and the window between "armed" and "live" was treated as an
implementation detail rather than a state with its own row. The `setImmediate` yield that made the
locked row pass is a latency guarantee, not a structural one, and the build spent its grind there.

**Lesson.** When a ruling gates an action on a state transition, the contract beat asks "and the
event that arrives between arming and that state?" and carries the answer as a row of the desired
behaviour — distinguished by the CHANNEL (a pipe is a cancel channel; a TTY/file/NUL is not), not by
timing. A rule keyed on timing is a rule the load will break. Refs: `F-15`, task 01 RULINGS,
ADR-005 §2, `STATE.md` "Amendment routed to 04's contract".

## R3 — A bounded child's timing defaults are derived from a measured path, and the caller's story wires what the ADR names

- **Kind:** near-miss · **Area:** code · **Stage:** build → verify · **Owner:** developer / architect · **Raised by:** QA (grace), craft (deadline)

**What happened.** `DEFAULT_GRACE_MS` shipped at 10 s from a guess; QA measured the real stdin-end →
exit path at 7.08–7.15 s (the driver's bracket plus node-pty's 5 s console-list fallback) and the
default left under 3 s of margin for exactly the load this milestone creates — raised to 20 s with
the measurement in the comment. Separately, a lane drive with no `deadlineMs` inherits the seam's
60 s default, so every real lane would be `timeout` until 04 derives `startToCloseMs +
startupGraceMs` (ADR-005 §4) and passes it.

**Why.** The grace was sized before anything measured the path it bounds; the deadline was named by
the ADR on the caller's side, and this story built the callee. Neither is wrong to defer, but an
interim that would `timeout` every lane deserves to be written down, not discovered by 06's live run.

**Lesson.** A named timing constant carries the measurement that sized it in its own comment (as the
grace now does), and a story that lands the callee of an ADR-named bound records "the caller passes
X" as an open Gap in its outcome, so the successor's first task is to wire it. Refs: `F-14`, `F-16`,
`OUTCOME.md` § Gaps.

## R4 — A story that widens a closed schema owes every pin of that schema, and a census floor that must be retyped is a bill sent to the wrong story

- **Kind:** mistake · **Area:** contract / process · **Stage:** refine → build · **Owner:** product-owner (the declaration) / architect (the control) · **Raised by:** developer (declaration), the grade (floors)

**What happened.** `files:` missed `loop-fix-transport-shape.test.mjs`, whose input-schema pin had to
change when `run`/`fix` joined the closed schema, and `reads:` missed eight documents the driver
change needed. Then the grade flagged FF-11902's no-headroom probe: the story added one sink importer
(the driver-level `signal` rows) and had to retype four floor literals across two control files it
had never read — the door's own doctrine says exactly that should not happen.

**Why.** The declaration was authored from the ADR's file list, not from a search for every test
that pins the schema being widened; and the no-headroom probe holds a DECISION (the floor) as a
retyped literal in two places, so any growth in the census is a four-site edit.

**Lesson.** At refine, a story that changes a closed schema greps for the schema's pins and lists
every hit in `files:` (the same rule as `LOOP_STOPS`'s six literal pins in 01). For the control: derive
the floor from the live census (or drop the no-headroom leg) so a story adding an importer edits no
control — carried for the next control-family pass. Refs: `F-19`, `F-26`.

## R5 — A verifier probes a session-starting command only in a form that cannot start one

- **Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner (this accept) · **Raised by:** self

**What happened.** To read the CLI face at the source, this accept ran three real child processes.
Two were right (`--dry-run`, and an unreadable `--fix` that refuses before any mint). The third,
`--run --json`, meant to observe `missing-flag-value` — but the face binds `--json` as `--run`'s value
(nit k, "face-general, pre-existing"), leaving no `--json` and a lent id of `"--json"`: a REAL
`/aof:continue 129/02` session started in the primary checkout and ran ~2 minutes before it was
killed. It only read (no Write/Edit, no file changed); its ten heartbeat rows under a bogus run id were
removed by hand.

**Why.** "Pre-existing, face-general" read as "harmless" in the review's nit list, and the probe was
composed to exercise the refusal without asking what the command does when the refusal does NOT fire.
For most commands that is a wrong answer; for `work drive` it is a burned session.

**Lesson.** A probe of `aof work drive` (or any command whose success is a spawned session) carries
`--dry-run` or is not run; a verifier reads the failure mode of the probe itself before typing it. For
the face: a string flag whose value begins with `--` is `missing-flag-value`, the code the bare flag
already gets — routed. Refs: `F-24`.

## R6 — A test runner that exits 0 with no summary is a false green, and the build met it twice

- **Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer / runner · **Raised by:** developer

**What happened.** `scripts/test.mjs --only` exited 0 with NO summary line when a suite drained the
event loop mid-await (a pending promise with nothing keeping the loop alive). The developer met the
shape twice while building the stdin rows and had to learn to read the summary's presence rather
than the exit code.

**Why.** The selection path awaits each suite's `run()`; a suite whose awaited promise is never
settled lets Node exit naturally, and a natural exit is code 0. The runner has no "did every selected
case report?" leg.

**Lesson.** The runner treats an unsettled selection as a failure (a count of reported cases against
selected cases, or a `beforeExit` guard) — routed as a runner item; until it lands, a green build
claim quotes the summary line, never the exit code alone. Refs: `F-25`.

## R7 — When a directory at ceiling must host three new subjects, refine states the row raise; the build parks instead

- **Kind:** near-miss · **Area:** process · **Stage:** refine · **Owner:** product-owner / architect · **Raised by:** architect

**What happened.** `test/loop/` is at 72/72, so tasks 00, 01 and 03 all landed in
`drive-command-phase-drivers.test.mjs`, which grew 506 → 1,540 lines and now holds three subjects
(the drive command, the driver's `signal`, the child-drive module). 04/05 bring `wave.mjs` and
`cycle.mjs` suites into the same directory.

**Why.** The STATE's refine decisions said "01 extends existing suites and 04 raises the row for
its two" and left 02's three subjects unplaced; a build at ceiling can only park. 01's `R2` answered
"which existing suite hosts a scenario"; this is the prior question — whether a suite should exist.

**Lesson.** When refine can count the new subjects a story brings to a budgeted directory, the
STORY Notes state the row raise (with the reason the table demands) as part of the contract, and the
build adds the file rather than the parking. A raise decided at refine is a decision; one taken at
build is a diff. Refs: `F-18`, ADR-008 § Consequences, `STATE.md` "Default decisions taken at refine".

## R8 — The observability's stall heuristic reads a review hand-off as a stall; the real signal was the grind

- **Kind:** misunderstanding · **Area:** process · **Stage:** build · **Owner:** orchestrator · **Raised by:** `aof work observe`

**What happened.** The report flags one stall — the developer idle 25m20s at 02:00Z. The transcript
shows the freeze after its build report and the resume on "Review round 1" from the coordinator: the
developer was WAITING for the three review lenses, which is the orchestrated flow working. The
diagnostic that mattered was the grind — 24 toolchain runs, worst 231 s, `drive.mjs` edited ten times
— on the stdin-arming semantics `R2` names.

**Why.** The stall detector is an idle-gap threshold with no notion of a hand-off; a developer held
open across a review round is idle by construction. The grind detector was right and quieter.

**Lesson.** Read a flagged stall against the resume line before treating it as a dropped connection;
an idle that resumes on a coordinator message is a hand-off, and the cost to record is the review
round's own duration. The stall heuristic should exempt (or label) a gap whose resume is a
coordinator message — carried to the observe command's backlog. Refs:
`observability/snapshots/2026-09-13T03-13-26-740Z/report.md` § Stalls, § Why slow.
