# 126 · The declaration is the unit — Outcome

What is true at the MILESTONE level. Where a story states a capability whole, it is cited rather than
repeated — `aof work memory ingest` unions every item's records into one recall surface, so a
milestone that restates its stories writes one fact twice.

## Delivered

### A declaration survives the machine it was declared on
The four seams the SPEC measured as knowing-but-not-acting are now one chain that closes. A loop
declared `--supervised` and killed with its runtime is listed by the predicate (`m126/02`), reaches
the desktop supervisor through `mesh status --json --declarations` (`m126/02`), is reconciled into a
running child within one 30 s tick (`m126/03`), and resumes against a compute budget that charges
attempt time rather than calendar (`m126/00`). Observed end to end on 2026-09-10: a declaration
minted 2026-08-23 — eighteen days before — resumed rather than refusing `deadline-exhausted`, and its
next attempt was started by the supervisor with no operator command.

### The `Declaration` is the supervised unit, and the supervisor knows nothing else
The noun the loop already persisted is now what a supervisor keeps alive. `app/desktop` holds no
loop, scope, phase or run vocabulary; it receives `{id, argv, cwd, label}` and reconciles desired
against actual. A completed loop stops appearing in the answer, so nothing relaunches it —
reconciliation replaced restart-on-exit, and no completion semantics crossed the boundary
(`m126/03`). The next thing that declares — a graph build, a soak — is supervised by the same
mechanism without the supervisor learning what it is.

### A supervisor-spawned loop can drive a Claude session with no console
Measured rather than assumed, on the real supervisor: an `aof.exe work loop … --resume` child spawned
under `CREATE_NO_WINDOW` with piped stdio allocates a headless ConPTY (`conhost.exe --headless
--width 80 --height 24`) and runs `claude.EXE` under it. Every `aof.exe` child of the supervisor
reports `MainWindowHandle = 0`. This was `126/03`'s one named risk and no fixture could have
answered it.

### An operator can see what a loop is doing while it does it
`aof work loop` narrates in flight through its one printer (`m126/00`) and `aof work run-status`
renders the record's own facts rather than two of its sixteen keys (`m126/01`). The eleven-hour
silence the milestone was framed from is not reachable from this tree: the first line of a
supervised run is now `Driving <ref> — <phase>, cycle N of M, <level>.`

### The control node's daemon environment is stated, not guessed
`aof mesh desktop install --autostart` registers login autostart idempotently through one injected
runner, and both `install` and `run` report a three-check preflight that repairs nothing
(`m126/04`). A Windows service was refused on the measured basis rather than deferred: session 0 has
no login session, so `claude` there is unauthenticated and every supervised loop would start and die
on auth.

### One warning stopped being an eleven-hour session's only output
`m126/05`.

## Assumptions

- **Supervision is opt-in and stays opt-in** — the eight declarations already on disk when this
  milestone landed read back as unsupervised, and the door lists nothing an operator did not ask to
  have kept alive. The milestone's own risk — that autostart silently spends tokens re-entering
  whatever was open when the lid closed — is answered by that default rather than by a registry.
- **The reclaim that lists a dead local loop is the STALE-RUNNING path, not a reclaim** — both
  producers of `runtime_offline` in `src/` are mesh paths, so a purely local run is never reclaimed
  until its own resume settles it. ADR-004's amendment (*running-stale ⇒ listed*) is what makes a
  died local loop visible at all; without it the measured relaunch would not have happened.
- **A cap still bounds the whole thing** — a supervised declaration is relaunched every tick while it
  is listed, and what stops an unhealthy loop being restarted forever is `maxAttempts` and the
  attempt clock, not the supervisor, which has no idea what it is running.

## Gaps

### "Power on, log in, work resumes" is unproven on real hardware
- **Status:** open
- **Discharge condition:** the operator signs out of Windows and back in, and
  `tasklist /v /FI "IMAGENAME eq aof-mesh-desktop.exe"` lists the supervisor with `Session Name:
  Console` and a non-zero `Session#` with no operator command.
Every link in the chain is proven — the Run key is written and read back through the OS (`m126/04`),
and the supervisor relaunches a declared loop within one tick (`m126/03`) — but the logon that joins
them has not been performed. It is the one claim that closes the milestone's framing complaint.
Recorded as `F-30`.

### The attempt clock still charges the interval between a runtime dying and the reclaim noticing
- **Status:** open
- **Discharge condition:** a drive writes `heartbeatAt` while it runs, so a killed attempt ends at
  its last observed liveness rather than at the stamp its reclaim wrote.
`heartbeatAt` is null on 108 of this repository's 112 run records. `FF-12601`'s reclaimed-attempt leg
therefore falls through to `updatedAt`, and when the reclaim is what stamped `updatedAt` the two are
the same instant. Measured: 90.7 s of drive billed as 202.4 s. ADR-001's fix is large and real — the
same record under the old rule bills eighteen days — but its reach ends where the heartbeat is
missing. Recorded as `F-31`.

### The two seeded daemons inherit the supervisor's launch directory under autostart
- **Status:** open
- **Discharge condition:** ADR-006 §4 and `126/03` task 02's Examples table are ratified into one
  answer, and the daemons' `current_dir` follows it.
Recorded as `F-24`, and as an open gap on both `126/03`'s and `126/04`'s outcomes. Every DECLARATION
spawn carries its own `cwd`, so the residue is the two seeded daemons alone.

### Mesh re-dispatch of a reclaimed assignment to another node
- **Status:** open
- **Discharge condition:** an item takes on worker selection, admission and credentials for a
  reclaimed assignment.
Declared out of scope at framing and unchanged: a reclaimed assignment returning to the LOCAL
declaration set is delivered; choosing a different node for it is not.
