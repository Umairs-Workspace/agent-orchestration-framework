# aof work stream — roadmap (deferred / future work)

Consciously-deferred work for the aof work stream: things punted with a reason, recorded so the
rationale and the intended approach aren't lost. Not ACD record docs — this is a backlog, not a
contract. Promote an item into a milestone/story (via `aof:add-milestone` / `aof:add-story`) when it's
time to build it.

---

## 0. Execution order — the optimization arc (2026-08-16)

**Not deferred work.** This one section is a *sequencing* note for work that is scheduled and ready,
recorded here because there is nowhere else an operator looks for "what next, and why". Evidence and
the numbers behind every claim: [`RESEARCH-agent-loop-economics.md`](../planning/RESEARCH-agent-loop-economics.md).

**Read this as priority, not dependency.** `depends:` frontmatter is the only order the machinery
obeys, and by that graph **68, 74, 75, 76, 77 and 79 are all ready right now** — `aof work next` will
offer the whole set and take the head. aof has no priority field, so the ordering below is a human
judgement over an already-ready set. Pick in this order; do not encode it as false `depends` edges.

### Wave 0 — hours each, no dependencies, do before the next milestone runs

| # | Item | Why first |
|---|---|---|
| 1 | **76** `chore` reviewer-edit-grant | Two frontmatter words. `aof-qa` is told to `Edit` and has no `Edit`, so it re-emits whole `.feature` files: **661.6k tokens, 41.8% of milestone 52**, the largest single line item measured. Story 73 just made `aof-product-owner` sole writer of the findings register while it *also* lacks `Edit`, so the cost grows until this lands. |
| 2 | **75** `chore` lifecycle-prompt-corrections | Prompt-only. Must land **before 71**, which makes the review lanes genuinely concurrent — at which point "each lane writes the milestone's status in its own worktree" becomes an N-branch conflict on a two-line frontmatter hunk. |
| 3 | **74** `story` status-refusal-as-data | Small code change. `aof work status` throws a 409 where the phase door returns the same refusal as data, and the refusal is the *common* case on the board-driven path — a spurious failure in every unattended run. |

### Wave 1 — the two that move the cost curve

| # | Item | Why |
|---|---|---|
| 4 | **68** `milestone` loop-telemetry | The foundation: cost, phase and progress recorded rather than inferred by a regex miner that double-counts, overwrites its own history and cannot classify this repo's test commands. Everything after it is a measured before/after. **The baseline already exists** — the six committed `observability/agents.json` snapshots carry correct token counts even though their derived summaries do not, so shipping wave 0 first does not cost the comparison. |
| 5 | **70** `milestone` warm-start | The **927k cache-creation tokens per agent spawn** — ~3.6 MB re-ingested at the write rate, a 315.9:1 input-to-output ratio. **Recommend refine pulls the spawn-flag story first**: `--exclude-dynamic-system-prompt-sections`, the 1-hour TTL, and `--model`/`--effort` per role are config-level, independently shippable, and worth roughly a 12.6× price delta on the same tokens — ahead of the build brief and the `ARCHITECTURE.md` split, which are the milestone's larger half. |

### Wave 2 — stop the burn, unblock the arc

| # | Item | Why |
|---|---|---|
| 6 | **69** `milestone` loop-bounds | Four timeouts, a wired heartbeat, real concurrency slots. Two runs burned **11h07m each before failing and then succeeded in 15.9 minutes on retry** — 22 hours that produced nothing, for want of a deadline. Also **picks the cap's value**, which unblocks **54** and, behind it, 53 / 62 / 65. |
| 7 | **71** `milestone` loop-discipline | Needs 69's number. Caps review rounds at one by default, makes findings become work items, runs the review lanes concurrently, and gates the render lane on renderability. Review — not build — is the uncapped loop. |

### Wave 3 — the grind, and the ratchet

| # | Item | Why |
|---|---|---|
| 8 | **72** `milestone` inner-loop | Targeted test execution, tool-output filtering, worktree dependency reuse, the write-thrash guard. Sequenced last of the five deliberately: the toolchain is **~6%** of active time in this repo, not the 46% the PRD assumed from a different one — model generation is 84.1%. |
| 9 | **77** `milestone` harness-audit | No dependencies and **parallel-safe at any point** — pull it forward if there is capacity. It is the ratchet: the `agent-capability-gap` rule alone would have caught item 1 above. Placed last only because a lint written against a harness you are about to change substantially has to be rewritten. |

### Not in this arc

**79** (`committed-loop-graph`) → **78** (`loop-execution-record`) are the loop-graph work: reviewable
governance, not cost reduction. 79 is ready now and independent of everything above; 78 waits on 53.
Interleave them when the optimization waves are between milestones rather than competing for the same
files — 75 and 71 both edit `continue.md`, and 79 and 78 both touch the loop command family.

---

## 1. Open in terminal — attach to a running agent session (shared PTY)

**Status:** deferred (2026-06-20). **Origin:** milestone 03 (Work Board UI), operator request.

**Want.** Continue a *running* web-terminal session in the host terminal (e.g. Windows Terminal) —
**without re-running it**: two windows (browser + native terminal) on the *same* live agent.

**Why it's not trivial (the constraint).** When Run agent starts a session, the board server
(`node-pty`) opens a pseudo-terminal (PTY) and spawns the agent (`claude`) as its child. The pid we
persist in `.aof/terminal-sessions.json` is that **agent process** — real, but its PTY *master* is held
by the Node server and piped over the WebSocket to the browser xterm. There is no native terminal
attached, and Windows has no supported way to re-attach a *different* terminal to a *running* process's
PTY (no `reptyr` / `screen -x`). So you cannot "grab" the session by pid; a fresh `wt.exe`/`cd … && claude`
is a *re-run*, which is explicitly not wanted.

**Approach (the real fix — multiplex the one PTY to N clients, like `tmux`/`ttyd`).**
- **Server:** keep an in-memory **live-session map** keyed by a session id (alongside the `.aof`
  registry). A `/ws/terminal` connection can either **spawn** (today's behaviour) or **attach** to an
  existing session — the server **broadcasts** PTY output to every attached client and accepts input
  from any. Last-client-leaves policy: keep the PTY alive (it's still the running agent); only an
  explicit kill ends it.
- **CLI:** `aof terminal attach <ref|id>` — resolve the session via the `.aof` registry, open the
  attach socket, put the host terminal into raw mode, and bridge `process.stdin`/`stdout` ⇄ the session.
  Run it in Windows Terminal → the same running agent, no re-run.
- **Contract:** an ADR for the attach protocol (spawn-vs-attach on the WS; the broadcast/fan-in; the
  session id). The existing wire envelope (ADR-003) likely extends additively (an `attach` query +
  the session id); confirm it stays within the frozen frame shapes.
- **Tests:** two clients attached to one stubbed PTY both receive output + can send input; attach to an
  unknown id degrades honestly; the PTY survives a client disconnect.

**Foundation already in place:** `.aof/terminal-sessions.json` (pid · ref · provider · cwd · startedAt,
self-pruning) is the lookup `aof terminal attach` needs. See ARCHITECTURE ADR-003 (terminal transport)
and STATE (2026-06-20 terminal-lifecycle notes).

---

## 2. Multiple concurrent terminal sessions (tabbed dock)

**Status:** deferred (2026-06-20). **Origin:** milestone 03, operator question ("run Verify on another
task while one is already running?").

**Current (interim) behaviour:** the dock is **one session at a time**. Re-selecting the running item
shows **View terminal** (no-op re-reveal); launching on a *different* item **silently replaces** the
session — the old WebSocket closes, the server kills the old PTY (and unregisters it from `.aof`), and a
fresh session spawns. A mid-run `/aof:verify` on the old item is interrupted. Acceptable only if the
dock is treated as a single scratch terminal.

**Want.** Run several agents at once — e.g. verify 03/01 while 03/02 continues — without one killing the
other.

**Approach.** A **session per item**, surfaced as **tabs** (or a session list) in the dock: keep N live
PTYs in the server's live-session map (the same map item 1 introduces), each keyed by id; the dock
renders a tab strip (ref + connection-state dot) and mounts the selected session's xterm. Launching on a
busy item opens/*focuses* its tab instead of replacing. Ties directly to item 1 (shared live-session
registry + the `.aof` records); decide them together. Until then, consider the cheap interim guard
(confirm-before-replace or disable-while-busy) if the silent replace bites.

---

## Other deferred items (backlog)

- **`aof mesh logs --follow`** — a live tail mode on the log reader (m42 descoped it by decision:
  polling `--tail` covers the operator need; follow is a CLI nicety, not debt). (Milestone 42.)

- **Daemons self-restart on a new build stamp** — the m42 item-1 optional leg: daemons poll the
  installed `BUILD_ID.json` and exit cleanly on change so the desktop supervisor respawns them —
  `install-local` becomes the whole deploy, no manual restart. Deferred: the supervisor's respawn
  semantics need verifying first. (Milestone 42.)

- **Re-enable codex / gemini providers.** The dock picker is claude-only for now (operator request);
  the provider seam (`terminal-providers.mjs` / `provider-picker.mjs` / server) still supports all three
  — re-enabling is widening `VISIBLE_PROVIDERS` in `TerminalDock.tsx`. (Milestone 03.)

- **Extend the `work list --json` contract for board fidelity (finding F-2).** A *superseding* ADR-002
  to carry the data the card/lanes design wants but the frozen 7-field contract doesn't: per-milestone
  **task roll-up counts**, the gate **`depends`/`waitingOn`**, and the **findings count**. Architect's
  lane; then the board renders them instead of omitting/softening. Subsumes **DG-1** (the Findings-tab
  count is static `0/none` until the milestone `VERIFICATION.md` `## Findings` is parsed).

- **DG-3 — `Next` vs `Validate` emphasis.** Minor design-conformance: the action strip's `Next` shares
  `Validate`'s variant; pick the canonical treatment so doc and build agree. (`aof-designer`.)

- **Pixel-exact design conformance.** The future automated track noted at `aof:verify`: render each
  surface with Playwright and assert `toHaveScreenshot` against an approved render (vs today's
  designer-judgment-against-the-mock lane).
