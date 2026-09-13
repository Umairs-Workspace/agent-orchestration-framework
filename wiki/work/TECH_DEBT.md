# aof work stream — tech debt

**Open** structural debt in the aof codebase: things that are wrong by design (not merely
unfinished). Sibling to [ROADMAP.md](ROADMAP.md) — the roadmap is *deferred want*, this is
*accrued cost*. Promote an item into a milestone/story (`aof:add-milestone` / `aof:add-story`)
when it's time to pay it down.

**This file is a BACKLOG, not an evidence record.** It holds only what an operator schedules
from. The investigation that found a debt — measurements, tables, trend lines, the argument —
belongs in the reviewing item's own `ARCHITECTURE.md` / `VERIFICATION.md`, which is dated and
immutable; an entry here cites that register rather than restating it. A discharged entry is
DELETED, not annotated: git history and the closing item's ref are its record.

**An entry is four things and nothing else — 12 lines, hard.** What's wrong · how it bites ·
the shape of the fix · one `file:line`. Plus a `**Status:**` line, which is not optional:

    ## <n>. <one-line title: the defect, not the topic>

    **Status:** open (raised <date> by <role>, at <ref>). **Severity:** <low|medium|high>.

    **What's wrong.** … **How it bites.** … **The fix.** … (`path/to/file.mjs:123`)

**Numbers are never reused or reassigned.** A pruned entry leaves a hole — items are cited by
number from other entries and by `file:line` from source comments, and renumbering would
invalidate every one of them silently.

Run **`aof work debt`** to measure this file against its budget (worst-first, so compaction has
somewhere to start), and **`aof work debt --prune --write`** to discharge what is already paid.
The budget lives in `src/work/debt.mjs` and is enforced by
`test/arch/testing/acd-debt-ledger-budget.test.mjs` as a shrink-only ratchet: the numbers may fall and
may never rise.

**Item 0 is the umbrella.** Items 1–6 are its symptoms, not six unrelated bugs.

> **Promoted 2026-07-26:** items 0–7 → [`42_milestone_structural-overhaul`](42_milestone_structural-overhaul/SPEC.md).
> The milestone is the payment plan.

---

## 0. The system is flaky because nothing has one home — it needs a top-to-bottom overhaul

**Status:** open (raised 2026-07-26 by the operator, after a two-machine soak in which every layer
failed separately). **Severity:** the reason the other items exist.

**What's wrong.** The codebase has grown by accretion: each defect was fixed *where it surfaced*,
with a comment explaining the scar, rather than by changing the design that produced it. The result is
147 files / 41k lines in which the same fact is derived in many places, the same act has several
doors, and failure is handled by silence. Measured 2026-07-26:

| Signal | Measured | What it means |
|---|---|---|
| `src/` | 147 files, 41,348 lines | 3,163-line `cli.mjs`, 2,163-line `mesh-worker-execution.mjs` |
| Comment lines in `src/` | 12,945 (31%) | history narrated in prose beside the code |
| Scar markers (`FINDING F<n>`, `review fix`, `VERIFICATION (`, `ADR-<n>`) | 1,670 | the code documents its own past failures instead of being reshaped to remove them |
| Empty `catch` blocks | 43 across 22 files | failure isolation implemented as silence |
| `workspaceIdFor(` call sites | 17 | one identity rule, re-derived seventeen times, each with its own fallback |
| Test files / arch tests | 519 / 221 | a large suite, 10 of which fail before any change (item 5) |

The recurring shape, in four forms:

1. **No single seam for an act.** "Continue this item" had three independent doors — the board's local
   PTY, the fleet's assign, and a slash command typed by hand — each with different behaviour. Which
   machine your work ran on depended on which button you pressed. (Being fixed: `work:continue`.)
2. **The same fact derived independently, everywhere.** A workspace's identity is recomputed from a
   path at 17 sites, each with its own `?? workspaceIdFor(...)` fallback. When two of them disagreed
   across machines, the worker→control stream silently discarded 100% of its frames for days.
3. **Failure handled by silence.** 43 empty catches. Every one is a place the system can fail while
   reporting success.
4. **History kept in comments rather than in the design.** A third of `src/` is prose, much of it
   narrating bugs from previous milestones inline. It reads as an audit trail, but it does not stop
   the next instance — the same defect class (silent catch, id mismatch, stale build) recurred *on the
   same day* it was documented.

**How it bites.** The system is unpredictable in a specific way: each layer works in isolation and the
seams between them fail quietly. On 2026-07-26 alone — the worker streamed to an id the control node
refused, the control node discarded the frames without a word, the daemons had nowhere to log it, half
the install was running a stale binary, and 10 arch tests were already red so nothing gated any of it.
No single bug there was hard; finding them required reading SQLite stores by hand on two machines.

**The fix — an overhaul, not more patches.** This is a design job, and it should be scoped as
milestones, not squeezed in beside feature work. The shape:

- **One home per concept.** Workspace identity, "where does work run", "what is this node's state",
  "what build am I" — each gets exactly one module that owns it, and every other caller asks it.
  Delete the re-derivations rather than adding a seventeenth.
- **One door per act,** with the *decision* (where/how) inside it and the faces (CLI, board, fleet)
  reduced to transport. `work:continue` is the pattern; refine/verify/run need the same.
- **Errors are events, not silence.** No empty catch survives; every degrade path emits a coded event
  to a real sink (items 2 and 3).
- **The build is honest about itself** — decoupled from the binary, stamped, and visible at runtime
  (item 1).
- **Green means green.** Fix or delete the dead gate so the suite can hold the line (item 5).
- **Then delete.** Most of the 1,670 scar markers describe defects whose *cause* is gone or should be.
  Comments explaining why a workaround exists are debt; the fix retires them.

**Sequencing note.** Attempted as one rewrite this will fail — the system is a live two-machine soak.
Do it as: (a) stop the bleeding (items 2, 3, 5 — logging, no silent failure, a working gate), because
without them no overhaul can be verified; then (b) consolidate the seams (identity, one-door-per-act);
then (c) the build (item 1). Each step should leave the soak running.

---

## 1. The binary is the whole program, not a wrapper around the CLI

**Status:** largely addressed (2026-07-26). `aof.exe` is now a payload-first LAUNCHER: when
`<exeDir>/src/cli.mjs` exists (the install ships the real `src/` + prod `node_modules` beside the
exe) the CLI loads from disk — a source change deploys as `node scripts/install-local.mjs` (file
copy, no SEA build) + restart. The embedded bundle remains only as the release/single-file fallback
(`AOF_SEA_EMBEDDED=1`); a broken payload fails loudly, never a silent embedded fallback. The build
is stamped (`BUILD_ID.json`; `aof --version` and both daemons' startup lines report
source/payload/embedded + build id) and `.bak` binaries are pruned to the newest 3 on install.
Remaining: `aof mesh status` does not yet surface a REMOTE node's build id, and the deploy is still
per-machine (the Mac's npm-symlink path was already restart-based). **Severity:** high — it taxes every
single change.

**What's wrong.** `aof.exe` is supposed to be a thin wrapper around the CLI. It isn't. It is a Node
SEA (single executable application): the Node runtime *plus every `src/*.mjs` file compiled into one
88 MB binary* (`scripts/build-sea.mjs` → `dist-sea/` → `~/.aof/bin/aof.exe`). The installed tree next
to it holds only `bundle/`, `ui/`, `node_modules/`, `node-pty-sidecar/` — there is no `src/`. The
program's actual source lives *inside* the executable.

**How it bites.**

- **Every source change needs an 88 MB rebuild + reinstall.** Editing one line of
  `src/mesh-launcher.mjs` changes nothing on this machine until the whole SEA is rebuilt and copied
  into `~/.aof/bin`. There is no "just restart the daemon" path.
- **Installs strand the running build, silently.** Windows won't overwrite a running `.exe`, so the
  installer renames the live binary aside (`aof.exe.bak.<ts>`) and writes the new one. The running
  process keeps executing the renamed image — Windows holds it by handle, not by path — so it runs the
  *old* code indefinitely. Measured 2026-07-26: `mesh serve` was on the new build while `mesh ui` was
  still executing `aof.exe.bak.20260726T004025`, serving a stale UI bundle. Nothing anywhere reports
  which build a process is running.
- **Disk cost.** Each install leaves another 88 MB backup. Measured: **15** `.bak` binaries in
  `~/.aof/bin`, ~1.3 GB, none ever reclaimed.
- **The two machines behave differently, so fixes deploy differently.** The Mac worker installs `aof`
  as an npm symlink straight into its repo clone — a `git pull` + restart is the whole deploy. Windows
  needs build + install + restart. The same change therefore ships two different ways, and it is easy
  to update one node and believe you updated both.

**The fix.** Decouple the program from the binary. `aof.exe` becomes what it was meant to be — a
launcher that resolves and runs the CLI from a known location — so a source change is picked up by a
restart, not a rebuild. Sketch:

- ship the JS payload *beside* the exe (`~/.aof/bin/src/`, versioned), the way `bundle/` and `ui/`
  already are, and have the launcher execute it;
- keep the SEA only for the distributable single-file artefact (a release concern), not for the
  development/soak loop;
- record the build id in every daemon's startup line and expose it (`aof mesh status`), so a stale
  process is *visible* rather than inferred;
- prune `.bak` binaries on install (keep the last N).

**Note on the shape of the fix.** This is deliberately not "make install faster". As long as the code
is inside the binary, a running daemon and its source can silently disagree — which is the failure that
actually costs time.

---

## 2. Daemons have nowhere to log

**Status:** largely addressed (2026-07-26, milestone 42 wave (a)): every daemon event lands as JSONL
in `~/.aof/mesh/logs/<proc>.log` (size-rotated, one kept generation) — mesh-serve tees all launcher
warnings + a build-stamped `daemon-started`; mesh-ui records its startup; `aof mesh logs [proc]
[--tail N]` reads it (absent-not-error, torn lines surfaced as `raw`). Remaining: the REMOTE-node
read (`--node <id>`, over the fabric) and `--follow`. **Severity:** high — it is why item-level bugs stay undiagnosed
for days.

**What's wrong.** The long-running processes (`aof mesh serve --serve`, `aof mesh ui`) write
diagnostics with `console.error`, and when supervised by `aof-mesh-desktop.exe` that output goes
nowhere. Newest file in `~/.aof/mesh/logs/` on the control node: **18 July** — eight days stale while
the daemon ran continuously. The Mac worker only had a readable log because it was launched by hand
with `> /tmp/aof-mesh.log 2>&1`.

**How it bites.** The worker→control worktree stream was refusing 100% of its frames
(`unknown-workspace`) on every tick for days. The control node knew, computed the refusal, and had
nowhere to say it. The bug was found by reading the SQLite store directly, not from any log.

**The fix.** A real sink: every long-running process writes JSONL to `~/.aof/mesh/logs/<proc>.log`
(rotating), plus `aof mesh logs [--follow] [--node <id>]` to read it — including on a worker, so
nobody needs to redirect stdout by hand to see what a remote node is doing.

---

## 4. Workspace identity is derived from the local path

**Status:** open (raised 2026-07-26). **Severity:** medium-high — it breaks cross-machine reasoning.

**What's wrong.** A workspaceId is `sha256(absolute project path)` (`workspaceIdFor`). The *same repo*
therefore has a different id on every machine: `lark-guard-portal` is `1f164bd03ea535da` on the control
node and `14d86b2b2196077a` on the Mac's scoped checkout. `config.mesh.workspaceId` can override it,
but the mesh clone path writes `mesh.repo.workspaceId` — which nothing reads as identity.

**How it bites.**

- The worker holds a `global_node_workspaces` membership row for the mesh id with **no descriptor** for
  it, so `resolveNodeWorkspaces` logs `workspace-workdir-unresolvable … (no-descriptor)` every ~5s,
  forever.
- The worker's own stream frames are stamped with its *launch-cwd* workspace id, which the control node
  has no descriptor for, so they are refused (`unknown-workspace`). This is what stopped the worktree
  stream from ever landing a row; fixed for worktree deltas in `f623a6a` by stamping the assignment's
  id, but the underlying identity mismatch is untouched.
- Every CLI mesh verb resolves the workspace from **cwd**: `aof mesh assign 18 --withdraw` run from
  the wrong directory reports "No assignment exists" while the row sits in the store (bit the
  operator-recovery path live, 2026-07-26) — the same one-fact-many-derivations class.
- A daemon launched from a non-workspace directory **published its launch cwd as a fleet
  workspace** (measured 2026-07-26: `C:\WINDOWS\system32` via Task Scheduler's default cwd,
  `~/.aof/bin` via an installer-dir launch) — the machine-wide `mesh.enabled` merges into ANY cwd.
  **Gated 2026-07-26**: `meshGlobalPropagationDecision` now also requires the workspace's own
  config on disk (`mesh-workspace-unconfigured` refusal); `scripts/prune-projection.mjs` is the
  recovery tool for rows that already landed. The underlying cwd-derived identity remains open.

**The fix.** Make the mesh workspace id the checkout's *own* local identity: write `mesh.workspaceId`
into the scoped checkout's `.aof/aof.config.json` at clone time, so publish, descriptor and frames all
agree on one id per repo across machines. Needs a migration story for the duplicate ids already in the
projections.

---

## 6. The board bridges a worker's rows and nothing else

**Status:** partially addressed (2026-07-26). The doc-body and run-record legs are BUILT: projection
schema v5 adds `work_item_docs`/`work_item_runs`, the worker streams its active worktree's record-doc
bodies + run records as a `worktree-content` frame (same connection, same assignment workspaceId,
same descriptor gate), and `work:doc`/`work:run-status` fall back to the projection when the local
checkout cannot answer (marked `fromWorker`/`reportedBy`; local disk wins when present). Unit-verified
(focused suites green); **NOT yet verified on the live two-machine soak** — needs build+install+restart
on both nodes. The CONSOLE leg is still open: the board still has no embedded view of a worker's live
session (the fleet mirror link is the interim). **Severity:** high — the board
states things it cannot then show you.

**What's wrong.** The worker→control stream bridges the *item list* into the projection, so the board
correctly shows a milestone's stories as the worker has them. Every drill-down still reads the CONTROL
node's local disk. Measured 2026-07-26 — the control checkout for item 18 contains exactly `SPEC.md`
and `STATE.md`: no `stories/`, no `runs/`. Yet the board lists seven stories.

**How it bites.** Three separate dead ends, all the same cause:

- clicking a streamed story → `Could not load STORY: No item resolves to ref "18/03"` (`work:doc`
  resolves against the local work dir);
- the RUNS tab reads the local `runs/` directory → "No runs yet", for an item that is running;
- there is no console. The board's terminal dock is a LOCAL pty; a worker's live session is only
  visible in the fleet UI's read-only mirror. The board says "Running on \<node\>" and offers no way to
  watch it.

So the board asserts a state it cannot evidence, which is worse than showing the local truth — the
operator is told work exists and then told it does not.

**The fix.** Finish the bridge, by the same rule as the rows (from the worker, over the fabric, never
from a branch): doc bodies and run records ride the same projection path; the terminal is the fleet's
existing mirror, which the board should embed instead of its local dock. Until then the board should
at least *say* the content lives on \<node\> rather than rendering a resolution error.

---

## 7. A restarted worker does not reclaim its own runs

**Status:** open (carried from the 2026-07-25 handover; hit again 2026-07-26 — **twice**: the
morning stall, and run `39ec5149` in the afternoon, whose agent died ~11 minutes in — subagents
"stopped by user" in the transcript, cause undiagnosable without item 2's log sink — while the
assignment sat `running` and the fleet mirror showed "waiting for output" for a process that no
longer existed; recovered by manual withdraw). The scope is wider than restarts: **any dead run is
indistinguishable from a live one** — no heartbeat-driven liveness on the assignment, no watchdog,
no startup reclaim. This is the single biggest source of perceived flakiness and the top of
milestone 42's wave (a)/(b) work with items 2 and 3. **Severity:** high (upgraded 2026-07-26).

**ADDRESSED in code (2026-07-26, milestone 42 wave (b) — live-drill verification pending):**
(1) the PTY liveness probe — a child that dies without an exit event settles `failed/agent_died`
within ~15s; (2) worker startup reclaim — persisted worktree dirs are reported
`failed/daemon-restarted` before new work, made safe by the new apply-seam invariant *a terminal
assignment never regresses*; (3) the control dual-staleness reclaim read run records LOCAL-ONLY, so
every cross-machine assignment was skipped forever — it now falls back to the streamed v5
`work_item_runs` record, then to the assignment's own frozen `updatedAt`.

**What's wrong.** Killing a worker daemon mid-run strands `runs/<node>/<runId>.json` in `running` and
its control-side assignment in `running`. Nothing clears them: the item is blocked until heartbeat
staleness (~15 min) or a manual `aof work run-complete <ref> --run-id <id> --outcome cancelled` plus
`aof mesh assign <ref> --withdraw`.

**How it bites.** Any worker restart can block an item, and the recovery is two commands on two
different machines that an operator has to know. It cost a manual unblock on 2026-07-26.

**The fix.** On startup a worker knows its own `running` records cannot be alive — reclaim them (and
report the reclaim) before accepting new work.

---

## 8. CRLF jams the bundle drift-guard — `aof work update` was silently dead on Windows

**Status:** open (found 2026-07-27, while propagating the architect codebase-health charter).
**Severity:** medium — the bundle self-update path, the mechanism that keeps agent charters current,
did not work on the control node.

**What's wrong.** The bundle renderer writes generated files (`.claude/agents|commands`,
`.codex/agents|skills`) with LF and records LF-content hashes in `.aof/aof.lock.json`. Those files
are also git-tracked, and git on Windows checks them out CRLF. On-disk hash ≠ lock hash for **every**
generated file, so `aof work update` classified all 59 as `drift-warning: was modified; not
overwriting` — permanently, with no hand edit anywhere. (Cosmetic sibling: the drift message exists
twice — `render-plan.mjs` says "use --force to overwrite", `cli.mjs` drops the hint — same fact, two
homes.)

**How it bites.** Charter updates shipped in the bundle never reach the runtime copies: on 2026-07-27
the developer, researcher and continue charters were all stale on the control node, and the new
architect codebase-health duty needed `--force` to land. Silent — update reports success with
drift-warnings that read as "protecting your edits" when there are none.

**The fix.** One newline rule for generated bundle files: pin them LF in `.gitattributes`
(`.claude/** text eol=lf`, `.codex/** text eol=lf`, plus `.aof` templates) and renormalize once — or
have the drift check hash newline-normalized content. Either way, drift must mean *content* drift.
And one home for the drift message.

---

## 9. `planApplyActions` silently overwrites any CO-AUTHORED file it has no lock entry for

**Status:** open (raised 2026-08-01 by the architect, during milestone 43's Decide stage; verified
from source at `277ada5`). **Severity:** medium-high — it is item 8's sibling and m42 leg d4's
`writeLock` defect a third time, and it is *silent*.

**What's wrong.** `planApplyActions` (`src/render-plan.mjs:13-49`) gates every drift protection on a
**prior lock entry**. For a file that exists on disk with **no** prior entry, each guard is skipped in
turn and the code falls through to line 48:

```js
actions.push(action("update", output, prior ? "generated content changed" : "existing file will be overwritten"));
```

An **ungated `update`** — no `--force` required, no drift warning surfaced, straight through to
`executeApplyActions` → `writeText`. Both `aof work init` (`src/work-init.mjs:30,91` — `previousLock =
null`, so *every* existing unlocked file is treated as safe to overwrite) and `aof work update`
(`src/work-update.mjs:27,100`) route through it. This is **worse than the drift-warning case**, not
equivalent to it: item 8's CRLF bug at least *reported* that it was protecting something.

**How it bites.** The live instance is `.claude/settings.json` — a genuinely hand-maintained file
(hooks for four events, `permissions.deny`, `sandbox.filesystem`, `enabledPlugins`,
`extraKnownMarketplaces`) that the aof lock has never recorded, because the 34-file bundle manifest
carries zero entries for it. `claudeSettingsJson()` (`src/runtime-config.mjs:21-28`) builds the file's
**entire** body from `config.hooks` + `config.settings` alone, so the moment a `claude`-runtime hook is
added to `.aof/aof.config.json`, the next `work init`/`work update`/`assets apply` deletes every one of
those sections without a word. It is **dormant, not absent**: this repo's config has no `hooks` key
today. Milestone 43 adds one.

The class is wider than that one file: *any* file with an author besides aof and no lock entry is
overwritable this way.

**The fix.** Two halves, and the first is not the interesting one.
- **Narrow (milestone 43, `43_story_artifact-sync-on-write`, 43/ADR-002):** `.claude/settings.json`
  stops being whole-file rendered at all — `renderRuntimeConfigOutputs` (`src/adapters.mjs:101-111`) no
  longer emits it, and a merge writer splices only aof's own self-identifying hook entry (the
  `mergeLock` / `writeSidecarPatch` pattern: read, overlay this caller's keys, write the union). Gated
  by `test/arch/acd-claude-settings-co-authored.test.mjs`, which arms the moment a claude hook lands in
  config.
- **Wide (this item):** make the fall-through refuse instead of overwrite. A desired output whose target
  exists on disk with **no prior lock entry** should be a `drift-warning`, not an `update` — i.e. the
  same protection a *previously generated* file gets, since "aof has never written this" is strictly
  stronger evidence of foreign authorship than "aof wrote it and someone changed it". Files aof
  exclusively owns are unaffected because they either don't exist yet (`create`) or already match
  (`skip`). Needs a pass over `work init`'s `previousLock = null` semantics, which currently *rely* on
  the permissive branch.

---

## 12. NINETEEN modules open the global mesh store for themselves — there is no per-invocation handle

**Status:** open (raised 2026-08-02 by the architect, during milestone 43 story 01's structural review;
**count moved 17 → 19 at 43/04's review, 2026-08-03** — the first movement since it was raised, and it
crossed this item's own stated ratchet threshold; **held at 19 through 43/05+06, and took its first
production bite there, 2026-08-04**).
**Severity:** low-medium — nothing is broken today, but the count only ever goes up, and each opener is a
place a store can be opened against the *wrong* home.

**What's wrong.** `openGlobalWorkProjectionStore` has no owner. **19 modules in `src/` import it and open
their own connection** (measured 2026-08-03): `board-mesh-execution`, `board-worker-stream`,
`commands/mesh-logs`, `commands/mesh-recover-push`, `commands/mesh-terminal-resume`,
**`commands/resync`**, `control-stream-server`, `effects/table`, `global-mesh-query`,
`global-work-publisher`, `global-work-store`, `item-lock`, `mesh-assignment-reclaim`, `mesh-assignment`,
`mesh-presence`, `mesh-recovery-push`, **`mesh-resync`**, `mesh-worker-execution`, `spine/face`. Each
follows the same open-read-close shape, and each re-derives its own paths from its own options bag
(`globalWorkStoreOptions`, `storeOptions`, `paths`, `env`, an injectable `openStore` override — five
spellings of one thing).

**The 18th and 19th arrived together, from ONE feature** (m43/04's Resync door, ADR-014/E7): the CLI
half and the transport half each open their own, exactly as the `mesh-recover-push` pair before it
does. That is the measurable cost of the shape item 10 now names — **a feature of this class costs two
openers by construction**, so the count moves in twos and the "18th opener fails CI" ratchet proposed
below would have fired on a diff that was individually reasonable. The ratchet is still right; it just
has to land with the handle, not before it.

**THE FIRST PRODUCTION BITE, measured 2026-08-04** (m43/05+06's review, ADR-016/G7). Until now this
item was a count. 43/06 migrated the control's presence aggregation onto the cache-first seam —
correctly; `mesh-launcher:390` is on ADR-005's must-migrate list, and the launcher going blind to
worker-authored items was a real defect — and the migration turned **one disk scan per workspace per
propagation tick** into **two SQLite opens per workspace per tick**: `listItemsCacheFirst`
(→ `readCachedItemRows`) and then `readCachedActiveRunIds`, each acquiring its own connection
(`mesh-launcher.mjs:411-419, 529-531`). With N = every workspace the control's fleet aggregation
resolves, the tick costs **2N opens**. Measured against `test/mesh-coordination-launcher.test.mjs`
("the healthy launcher refreshes this node's durable presence on each propagation tick"), ONE
workspace, EMPTY store:

```
6b4ab7f (before): presence refreshed at ~27ms   — lane GREEN
working tree:     not refreshed at 31ms; ~136ms — lane RED
```

**The store is ONE file for every workspace** (`withProjectionStore` keys on `globalMeshPaths(options)`),
so every one of those opens after the first is pure ceremony — which is exactly what "the invocation
has a store, but nothing models that" costs when the caller is a loop rather than a command. The
per-tick fix is local and is required by that review; **the general fix is still the handle**, and
this is the evidence that the ceremony has stopped being free.

A single command invocation now opens the store **more than once**: `aof work run-start` on a meshed
workspace opens it for the item-lock guard (`item-lock.mjs`) and again for the publish reactor
(`global-work-publisher.mjs`); `aof work next` opens it for the held-scope read on every call. The
overrides exist because tests must inject a hermetic home — which is the tell: the *invocation* has a
store, but nothing models that, so every seam re-acquires it and every test re-injects it.

**How it bites.** Three ways, none of them yet a failure:
- **Correctness surface.** Every opener is an independent chance to resolve the wrong `AOF_GLOBAL_HOME`
  — the same class as TECH_DEBT item 4 (cwd-derived identity), which silently discarded 100% of the
  worker→control frames for days. A single acquisition point would have one place to get that wrong.
- **Consistency.** Two opens inside one verb are two snapshots; a row can change between them, so a
  command's guard and its publish can disagree about the same workspace.
- **Ceremony.** Every new seam pays a ~10-line open/try/finally/close block plus an injection seam, and
  every test pays the matching plumbing. That cost is why "just read one more fact" is never cheap.

**The fix.** Give the invocation a store. The command `ctx` already threads `globalWorkStoreOptions`
everywhere; make it thread a lazily-opened, once-per-invocation **handle** instead, closed by the spine
when the command returns — the same shape `effectsJournalOptions`/the journal already gestures at. Seams
take the handle rather than the options bag; the injectable `openStore` override collapses into "the test
supplies the handle". Then a ratchet: `openGlobalWorkProjectionStore` may be called from exactly one
module, and the 18th opener fails CI instead of needing a reviewer to notice.

---

## 13. After the authority cut, a foreign-authored cached row for a ref an OPERATOR deletes is unreachable

**Status:** open, NARROWED 2026-08-02 (raised by the architect during milestone 43 story 02's
structural review, routed by ADR-012/B6; the RENUMBER half was then ruled back INTO 43/02 by the PO
at that story's review and is **built** — see "What was fixed" below). **Severity:** low-medium — a
phantom item on the board, reachable only by an operator deleting an item a worker had reported.

**What was fixed in 43/02, and what is left.** The two ways in were the same disease but not the same
door. The renumber half was a live *regression* against HEAD (the wholesale rebuild self-healed a
renumber; author retraction cannot) and turned out to be curable with the mechanism 43/02 had already
built: `publish-projection` is now registered on `stream.reindexed`, carrying `operatorRefs` = BOTH
ends of every remap entry, and the operator door may retract those refs whoever authored them. A
renumber therefore re-derives its own refs and leaves no row on a ref it vacated. **What remains is
the OPERATOR-DELETE half only**, below.

**What's wrong.** `work_items` is now a fact, and ADR-004's deletion rule is author retraction: a node
deletes only rows where `node_id = <itself> AND ref NOT IN <the set it still claims>`. That rule is
correct and is the whole cure — no node may destroy another node's work. Its cost is the case nobody
owns: **a ref whose row was authored by a worker, which then ceases to exist on the control's disk.**
Nothing can remove it. The control cannot (not its row). The worker never will (it no longer carries
that ref, and a frame retracts nothing by design). The only door that reaches it is
`removeWorkspaceFromCache`, which takes the entire workspace.

**The one way in that remains — an operator delete.** ADR-010/D1 named the cure — *"an
operator-initiated delete is an operator door: it may retract the ref regardless of `node_id`, and is
refused while locked. Without this an operator could not delete an item a worker had ever reported."*
43/02 built exactly half of it: the operator door may now retract, but only for refs an event names as
rewritten (a remap's two ends), because that is the only operator act aof currently has that vacates a
ref. **aof has no item-delete verb**, so a deletion performed by an operator removing a folder by hand
is invisible to the ledger and has no door to hang on. Until one exists, a worker-authored row for a
ref the operator deleted from the control's disk survives every tick.

*(Superseded, kept for the record: this item originally also covered the RENUMBER path — `43/03 →
43/04` leaving every worker-authored row on the OLD ref forever, with two `src/effects/table.mjs`
comments claiming a publish reactor that did not exist. Both comments and the defect were fixed in
43/02; `acd-stream-reindex-cascade` now pins the reactor list including the publish step, and
`cache-authority-author-retraction` covers the behaviour end-to-end through the real
`work:insert-story` verb.)*

**How it bites.** The control's cache — which this milestone is making the ONE read surface — keeps
answering for an item that does not exist anywhere. It renders on `/api/mesh/status`, in
`aof work list --mesh` and on the board, with a plausible status and a real `reportedBy`, and no
operator action removes it short of forgetting the whole workspace. It is the same shape as the disease
the milestone cures (a stale row outliving its truth), one deletion path over.

**The fix.** ONE door, and half of it exists. `upsertWorkItems`'s retraction already reaches any
`node_id` for a ref the caller names in `operatorRefs`, and is already refused while the scope is
locked (ADR-003) — the renumber cascade is its first caller. What is left is the SECOND caller: an
item-delete verb, which must name the deleted ref the same way `stream.reindexed` names a remap's two
ends, so the deletion is an operator act carried by an event rather than a folder vanishing behind the
ledger's back. **Natural home: `43/04`**, which already owns Resync — the door that asks an owning node
to re-report — and is the only other story that touches this seam's read side.

## 14. The clone-credential provider is fleet-GLOBAL, so a GitHub-configured mesh cannot dispatch to any other repo

**Measured 2026-08-03**, during the m43 live cross-machine verification, on a two-node fleet (Windows
control `umamis-msi` + WSL worker `umamis-msi-wsl`) against a purpose-built local test repo
(`C:\Source\umami\aof-test-repo`, workspace `52294b307214c27d`, `cloneUrl`
`file:///mnt/c/Source/umami/aof-test-repo`).

`resolveCloneCredentialProvider` (`src/mesh-clone-credential-provider.mjs:412`) reads ONE key —
`config.mesh.repo.credential.provider` — and this control node's `~/.aof/aof.config.json` sets it to
`github-app` (the `aof-mesh-clone` App, id 4317525, Vendorco-ai). That choice is **per control node, not
per workspace**, so every clone-credential request for every workspace is routed to the GitHub App
mint. For a workspace whose repo the App has no installation for — a local `file://` repo, a public
repo, a repo in another org — the provider **throws**, and `applyCloneCredentialRequestFrame`
(`src/control-stream-server.mjs:616-622`) turns any throw into the coded refusal
`clone-credential-mint-failed`. The worker then fails the whole assignment:

```
assignment-repo-unavailable: clone credential request failed for workspace "52294b307214c27d":
clone-credential-request was refused by control (code=clone-credential-mint-failed)
```

**Why it is a real gap rather than a misconfiguration.** The `env-token` default deliberately treats
"no credential" as a legitimate answer — `defaultMintCloneCredential` returns `null` when
`AOF_MESH_CLONE_TOKEN` is absent, and the module doc calls that *"a legitimate 'no credential
configured for this workspace' reply (the public-repo path), never a refusal."* The `github-app`
provider has **no equivalent fall-through**: it cannot express "this workspace needs no credential". So
the moment a fleet is configured for one private forge, every other repo in that fleet becomes
undispatchable — including the local test-bed a developer would reach for to verify mesh behaviour
without touching production repos.

**The fix.** Give the App provider the same "no installation ⇒ `null`, not a throw" path the env-token
provider already has, so a repo the App does not cover degrades to an unauthenticated clone (which is
correct for `file://` and for a public repo) instead of failing the assignment. A per-workspace
provider override would also work but is the larger change; the null-return is the one that restores
the documented semantics.

## 15. There is no path to enrol an EXISTING worker into a NEW workspace — `mesh join` grants a credential, never membership

**Measured 2026-08-03**, same live run. The control node holds the enrollment facts for the new
workspace — all three membership rows are present in its `global_node_workspaces`:

```
[{"node_id":"umamis-mac-mini","workspace_id":"52294b307214c27d"},
 {"node_id":"umamis-msi","workspace_id":"52294b307214c27d"},
 {"node_id":"umamis-msi-wsl","workspace_id":"52294b307214c27d"}]
```

The WORKER's own local projection store has **no row for that workspace at all** — neither the
membership nor the descriptor — while carrying rows for the three workspaces that existed when its
daemon started:

```
node_workspaces: [... e1aa9092f951cedb, 9db1fd84f5895e38 ...]   # no 52294b307214c27d
descriptors:     [... e1aa9092f951cedb, 9db1fd84f5895e38 ...]   # no 52294b307214c27d
```

The worker daemon started at 23:51; the workspace was published at 23:52 and the node joined at 23:55.
**A daemon restart at 00:07 did NOT fix it** — the rows were still absent afterwards, which disproves the
first reading of this item ("stale until restart") and points at the real cause below.

**The root cause, measured.** A node's workspace membership is derived from the workspaces that node can
**see on its own filesystem**, and is published in its own node record. The worker's
`~/.aof/mesh/nodes/umamis-msi-wsl.json` lists exactly one workspace:

```json
"workspaces": [ { "workspaceId": "9db1fd84f5895e38", "name": "aof",
                  "projectRoot": "/home/umami/source/aof" } ]
```

So the three verbs an operator would reach for each do something *other* than enrol:

| verb | what it actually does |
|---|---|
| `aof mesh invite` (control) | mints a short-TTL join code |
| `aof mesh join <code>` (worker) | stores a **relay credential** in the worker's global config — `{"joined": true}` — and adds **no** workspace |
| `aof mesh repo publish` (control) | registers the workspace in the **control's** registry and writes its `clone_url` |
| `aof mesh identity` (either) | republishes that node's own record — including its workspace list, derived from what it can see locally |

Nothing in that set gives an existing worker a workspace it does not already have a checkout of. A
pre-seeded clone under `<meshRoot>/checkouts/<workspaceId>/` does not count either — that directory is
populated **by** dispatch, and is not a source of membership.

**How it bites.** `workerHasRepo` (`src/mesh-worker-execution.mjs:319`) is the AND of two facts — the
local `mesh.repo.published` marker and this node's OWN local `global_node_workspaces` membership row.
With the membership row absent the guard is false, the worker takes the clone-on-miss path, and with no
local `clone_url` either it must ask the control for one — which is how a missing registry row surfaces
as a *credential* failure two hops away from its cause. Every dispatch to that workspace fails until
the worker daemon is restarted, and `aof mesh join` succeeding on the control gives an operator every
reason to believe enrollment is complete.

**Why it matters beyond the test-bed.** Enrolling a new workspace is a routine, expected act on a live
mesh; requiring a daemon restart on every worker to make it usable is the kind of hidden coupling that
reads as "the mesh is flaky". It also compounds item 14: the operator sees a credential error and goes
looking at credentials, when the actual missing fact is a registry row.

**The fix.** `mesh join` should take the workspace it was invited to and make the node a member of it —
the invite already names one, so the code carries the fact; the join simply drops it. Concretely: on
join, record the membership and let the worker acquire the checkout through the clone path it already
has (which is exactly what a dispatch does), rather than requiring an operator to hand-place a checkout
and re-run `mesh identity` on every worker. Failing that, `workerHasRepo`'s miss must name the missing
FACT — "this node has no membership row for this workspace" — instead of letting it surface two hops
downstream as a *clone* or *credential* failure, which is what sent this investigation to the wrong
subsystem twice.

**Measured operator workaround** (what a two-node fleet actually has to do today): give the worker a
real checkout of the workspace somewhere it owns, run `aof mesh identity` there so its node record
republishes with the new workspace in its list, and only then dispatch.

## 16. `aof mesh repo publish` silently discards a malformed `cloneUrl` and reports success

**Measured 2026-08-03**, same live run — and it cost the first full dispatch cycle before the cause was
found. `.aof/aof.config.json` was hand-configured with `"cloneUrl": "/mnt/c/Source/umami/aof-test-repo"`.
`isWellFormedCloneUrl` (`src/mesh-repo-marker.mjs:23`) correctly rejects a bare filesystem path (it
requires `scheme://host/...` or scp-style `user@host:path`), so the value was discarded — but
`writeRepoPublishedMarker` then reported `"cloneUrl": null` inside an envelope whose `"ok": true` and
`"published": true` say the publish succeeded. The module doc states the intent plainly: a detection
failure *"is silent and non-fatal — the publish still succeeds with no `cloneUrl`."* That is right for a
repo with **no** origin; it is wrong when the operator **configured** one and it was thrown away.

**How it bites.** The next signal the operator gets is a worker failing an assignment with
`assignment-repo-unavailable … cloneUrl unresolved`, on a different machine, minutes later. The publish
that caused it reported success.

**The fix.** Distinguish "nothing configured, nothing derived" (silent, correct) from "configured and
rejected" (loud). A configured-but-malformed `cloneUrl` should warn on the publish envelope naming the
value and the shape rule it failed — the same treatment the codebase gives every other coded refusal.

---

## 18. `ui/` has no interior structure either — one surface's folder is the shared library, and the fleet cannot say which machine it is

**Status:** open (measured 2026-08-03 by the architect, during milestone 43 story 04's **second-pass**
structural review — the UI half). **Severity:** medium. This is TECH_DEBT item 10 (`src/` has no
interior structure) seen in the other half of the codebase, plus one concrete consequence that is
already blocking a test someone wants to write.

**What's wrong — two things with one cause, that `ui/` was never given a shared layer.**

**(a) `ui/src/board/` is the de-facto shared UI library, and nothing declares it.** `ui/src/fleet/`
reaches into `ui/src/board/` **seven** times — `runs.mjs` (the one relative-time formatter),
`status.tsx` (the status ramp), `api.ts` (wire types), and milestone 43's `freshness.mjs` ×2 +
`StaleBadge.tsx` — up from four before 43/04. Meanwhile `ui/src/components/` (seven kit primitives)
and `ui/src/lib/` exist and are the nominal shared homes, and neither holds any of it. So the import
graph says "the fleet depends on the board", which is not the relationship: both depend on a shared
ramp/vocabulary layer that has no folder. Each new cross-surface primitive lands in whichever surface
built it first — exactly item 10's shape ("a rule living at whichever call site needed it first is
not a rule"), one directory over.

Line-count trend for the same subtree, measured from this repo's history:

| file | m03 (06-21) | m26 (07-02) | 07-30 | 43/04 |
|---|---|---|---|---|
| `ui/src/board/DetailPanel.tsx` | 434 | 707 | 814 | **1,123** |
| `ui/src/fleet/Fleet.tsx` | — | 508 | 1,463 | **1,521** |
| `ui/src/board/Board.tsx` | 315 | 367 | 437 | **581** |
| `ui/src` files | 29 | 33 | 48 | **53** |

`acd-ui-surface-file-budget` (m43/ADR-015 F2) now ratchets the first two so the *files* stop growing;
it does nothing about the missing *layer*, which is this item.

**(b) The fleet payload cannot say which machine is serving it, so "this node" is unrenderable there.**
Milestone 43/04 gave the board's `/api/work/list` envelope a `nodeId` key, and the board now reads
`from aof-control (this node)` on rows it published itself. The fleet has no equivalent:
`shapeGlobalStatus` (`src/global-mesh-query.mjs`) states `stalenessSeconds` but no serving-node
identity, and `mesh-ui-serve.mjs` already resolves one internally (`controlNodeId()`, used only as the
assign `issuer`). The fleet's `node.local` marker IS produced — by the `mesh:status` command
(`src/commands/mesh-identity.mjs:~343`) — but its only web consumer is `NodeCard`
(`ui/src/fleet/Fleet.tsx:1069`), which **never mounts in the web app**: the codebase records this at
`Fleet.tsx:951-954` (m38 finding F9) — *"mesh-ui-serve.mjs serves BOTH scopes from
queryGlobalMeshStatus, so isGlobalStatus(status) is always true and NodeCard/NodesRegion never mount
there."* The card that does render falls back to the registry's `role` (`control`/`worker`), which
answers a different question.

**How it bites.** (a) compounds silently: the next shared primitive lands in `board/` too, and the
fleet's dependency on the board deepens until neither can be moved. (b) bites now and concretely —
**a lane asserting that the fleet's "this node" tag and the board's new `(this node)` clause agree
about the same machine cannot be written**, because the fleet has no such tag on the wire. Two
surfaces answering "which machine is this?" differently, with no test able to compare them, is the
disagreement class milestone 43 exists to remove. It also leaves a whole local-shape render path
(`NodesRegion`, `NodeCard`, `BoardsRegion`, `BoardDrillIn` — several hundred lines) reachable by no
production request, dead since m38 and never routed.

**The fix.** Two independent, both small.
- **(a)** A shared layer — `ui/src/ramps/` (the five read-only ramps: status, runs, assignment,
  presence, freshness) or an honest `ui/src/shared/` — and move the cross-surface modules into it, so
  `fleet → board` becomes `fleet → shared ← board`. Mechanical, but it touches every importer, which
  is why it is here rather than inside a story.
- **(b)** `shapeGlobalStatus` states the serving node's identity on the payload, the way
  `/api/work/list` now does (`mesh-ui-serve.mjs` already has it memoised). Then `node.local` is
  derivable in `ui/` for the card that actually renders, the two surfaces answer the question from one
  source, and the cross-surface lane becomes writable. While there, decide the fate of the
  never-mounting local-shape components: render them or retire them, but not neither.

---

## 19. A settled run can read `running` forever — three surfaces disagree about one run's outcome

**Measured 2026-08-05**, live on the standing test-bed, while running `43/06`'s `@manual` soak. For run
`20260803T001759834Z-0000` (assignment `428fd15a`, milestone `00`, worker `umamis-msi-wsl`):

| surface | state |
|---|---|
| the WORKER's own run record on disk | `state: done`, `outcome: done`, at `2026-08-03T00:56:11.602Z` |
| the control's `global_assignments` row | `state: failed`, at `2026-08-03T00:56:11.846Z` — **244 ms later** |
| the control's cached run row (`work run-status`) | `state: running`, `outcome: null`, `updatedAt` still the **start** instant |

So `aof work run-status 00` shows an operator a run that has been "running" for two days, for work that
finished. The agent phase genuinely succeeded; what failed 244 ms later was the push (item **14** — the
clone-credential provider is fleet-global and cannot serve this `file://` test-bed), which also left the
worktree undeleted.

**Why it is not `43/06`'s bug, and why it still matters.** That story migrates READERS, and the read
surface here is faithful: it reports exactly what it was told. The defect is upstream — the terminal
transition that should have moved the cached run row was never reported, so the row keeps its opening
state forever. The cache has no TTL eviction by design (this milestone's own ruling), which means a run
row that misses its terminal frame is wrong **permanently** rather than briefly.

**The fix, and the shape to prefer.** The run row needs the same authority discipline the item rows got
in `43/02`: a terminal assignment state should either carry the run row with it or be reconciled against
it. The cheap, honest interim is a *reconciliation* at read time — a run whose assignment is terminal
cannot be `running` — but the durable fix is that whatever writes `global_assignments` terminal also
settles the run row in the same transaction. Worth pairing with item **14**, since a push failure is
exactly the path that produced it.

---

## 20. The desktop supervisor has NO programmatic stop — the documented deploy loop needs a human at a GUI

**Measured 2026-08-05** while deploying this milestone to both nodes. `aof mesh desktop` exposes exactly
two verbs, `install` and `run`. There is **no** `stop`, `quit` or `restart`. And the app is deliberately
close-to-tray: `WM_CLOSE` (and the custom titlebar's `✕`) only hide the window — the source states it
twice, *"Never a full exit — only Quit exits"* — so the ONLY graceful exit is the tray menu's Quit item,
which calls `app.exit(0)`.

The consequence is that `.claude/rules/build-deploy-restart.md`'s restart step is **not automatable**:
an agent, a script, or a CI job cannot restart the control node's daemons, and every deploy stalls on an
operator right-clicking a tray icon.

**What makes this cheap to fix, and safe.** The child daemons are held in a Windows Job Object created
with `JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE`, and the source already names the equivalence:
*"on Quit OR on the supervisor's OWN crash/exit (the OS closes every handle on process termination)"* —
so the child tree is reaped identically either way. Two options, both small:

- **(a) the narrow one, and it already works.** The per-child watchdog restarts a crashed child under
  jittered backoff. Recycling the two supervised daemons therefore reloads a new payload **without
  touching the supervisor at all** — verified this session: both came back on
  `payload 7002ffb+dirty.20260805T112416` at `12:54:52Z`/`12:54:53Z` while the app kept running. This is
  strictly better than the documented loop (no window churn, no relaunch) and deserves to be a verb:
  `aof mesh desktop reload`.
- **(b) the complete one.** `aof mesh desktop stop`, exiting the supervisor the way Quit does.

**PART (b) SHIPPED 2026-08-09** — `aof mesh desktop stop` (`src/commands/mesh-desktop.mjs`,
`test/mesh-desktop-stop.test.mjs`, 9/9). Raised again, and urgently, when the operator could not reach the
tray menu at all during the m46 deploy: with no CLI verb, no in-window control and `WM_CLOSE` wired to
hide-to-tray, there was **no route to a graceful exit from anywhere**.

Three things worth carrying forward from building it:

- **A "graceful" `taskkill` (no `/F`) is a NO-OP here, not a gentler path** — it posts `WM_CLOSE`, which
  this app converts to hide-to-tray by design. What makes terminating safe is the Job Object: `supervisor.rs`
  states the equivalence itself (the child tree is reaped "on Quit OR on the supervisor's OWN crash/exit"),
  so the daemons are reaped identically either way. `/T` is belt-and-braces beside it.
- **The verb needed a `--dry-run` for a non-obvious reason.** Its effect is machine-wide — it finds the
  supervisor by process NAME, so a hermetic `AOF_GLOBAL_HOME` does not contain it — and
  `acd-mesh-command-cli-bijection` spawns **every** registered mesh subcommand with `--json`. Without a
  dry-run the gate would have terminated the operator's running app on every suite run. Same rule as `ui`'s
  non-blocking probe: *a bijection probe must never perform the act it names.* Any future verb with a
  machine-wide effect inherits this constraint.
- **"Already stopped" is a SUCCESS, not a refusal**, so a deploy script can run it unconditionally.

**Part (a) — `aof mesh desktop reload` — is still open**, and is still the better everyday tool: recycling
the two children reloads a payload with no window churn and no relaunch. The watchdog it depends on is
confirmed at source (`supervisor.rs:382-520`): a terminated child is classified by its emitted **message**,
not its exit code, and the only named clean exits are `ui-build-missing`, `EADDRINUSE` and
`launcher already running` — so a killed child falls through to "genuine crash" and is respawned from the
installed path under jittered backoff, onto the new payload.

**Also worth correcting in the rules while this is fixed:** the deploy loop says to verify the restart
landed via `aof --version` and the daemons' `Build:` line. The first of those is **not evidence** — a
node's presence `buildId` is re-read from `BUILD_ID.json` at every heartbeat, so it reports the INSTALLED
payload even when the running daemons still hold the previous module graph. Measured this session: the
roster showed the new build roughly 90 minutes before either daemon had restarted onto it. Only the
`daemon-started` log line proves a restart.

---

## 21. A worker clones into its managed checkout even when one is already there, and fails the assignment

**Measured 2026-08-05**, running `43/05`'s `@manual` two-node soak. With a managed checkout already
present at `~/.aof/mesh/checkouts/<workspaceId>`, a dispatch fails outright:

```
assignment-repo-unavailable: git clone failed for workspace "52294b307214c27d":
fatal: destination path '/home/umami/.aof/mesh/checkouts/52294b307214c27d'
already exists and is not an empty directory.
```

The checkout in question was healthy — a clean clone of the right origin, on `main`, no uncommitted
work — so the correct action was to FETCH into it, not to clone over it. Renaming it aside made the
next dispatch succeed immediately, which is the confirmation.

**It is systematic, not occasional — measured 2026-08-05.** Across six dispatches in one session,
**every** dispatch onto an existing managed checkout failed this way, and the workspace only became
dispatchable again by moving the directory aside by hand each time. In practice **a workspace is
dispatchable exactly ONCE per worker checkout.** The 2026-08-03 history shows the same shape (three of
five assignments to this workspace failed identically), which means this has been the state of things
for at least two days of live use and was misread as unrelated failures.

**Why it matters more than it looks.** The failure mode is "the mesh worked once and then stopped
working", with a message that points at the clone rather than at the stale directory. It also compounds
item **14**: both surface as `assignment-repo-unavailable`, so two unrelated causes wear one code and an
operator cannot tell them apart without reading the detail string.

**The fix.** Reuse an existing checkout whose `origin` matches the workspace's resolved clone URL
(fetch + reset to the required base); clone only when the directory is absent or does not match. If a
mismatched directory is found, say so in its own coded refusal rather than surfacing git's raw
"already exists" text.

---

## 22. A failed assignment carries no code, so the fleet can only ever say "failed"

**Measured 2026-08-05**, running `43/05`'s `@manual` soak. A deliberately conflicting gate edit was
refused exactly as designed — the worker reported
`assignment-gate-propagation-conflict` and settled the assignment with that code — yet the control's
`global_assignments` row reads:

```
state=failed   code=NULL
```

Across the whole live store: **45 of 46 assignment rows carry `code = NULL`, including all 30 in state
`failed`.** The only non-null value anywhere is a single `resumed`. So the coded reason is being dropped
somewhere between the worker's `reportSettled(assignmentId, "failed", { code })` and the row an operator
reads.

**Why it matters.** The fleet is the surface an operator is told to use for "what happened to my
assignment", and it can only ever answer `failed`. Every distinguishing fact — conflict vs missing base
commit vs unavailable repo vs credential refusal — exists, is computed, and is thrown away at the last
hop. The information survives only on the log channel (`aof mesh logs --node <worker>`), which does
carry cause, cure and both hashes; but that is a second place to look, and nothing on the fleet tells
the operator to look there.

It also silently weakens any acceptance criterion phrased as "the fleet shows … with code X" —
`43/05`'s task 04 scenario 4 and task 05's `@uat` scenario 3 both are, and both were written in good
faith against a column that is never populated.

**The fix.** Persist the code the worker already sends on the assignment row, and render it beside the
state on the fleet. Worth doing WITH item **14**, whose two distinct causes currently share the
`assignment-repo-unavailable` code — together they are the difference between an operator diagnosing a
failed dispatch from the fleet and having to open a log.

---

## 23. The static-bundle traversal guard is LEXICAL, so a symlink inside the served root still escapes it

**Measured 2026-08-07**, during the structural review of `45/02`. `safeStaticPath`
(`src/static-serve.mjs:53-64`, moved verbatim from the two byte-identical server copies that m45/ADR-004
de-duplicated) refuses an escape with `path.isAbsolute` plus a resolved-prefix containment check. Both are
**purely lexical** — `path.resolve` does not resolve symlinks — so a symlink that LIVES inside the served
root and POINTS outside it is admitted, and `readFile` follows it. Probed against the real
`serveSetupUi` with a marker file one directory above the bundle:

```
GET /linked.json  ->  200 application/json  { "marker": "OUTSIDE-THE-ROOT" }
```

Every percent-encoded, mixed-separator and double-encoded traversal in `45/02`'s own tables is correctly
refused; this is the one shape none of them covers, and it returns a byte from outside the root.

**How it bites.** Low reachability today and loopback-only: the served roots are the vite build output
(`ui/dist`, which emits no symlinks) and — on the dev `aof assets ui` API port — the `ui/` **source**
directory, where `node_modules` is full of them. It is recorded because m45/ADR-004's whole argument for
the new leaf was *"the guard has ONE definition, so hardening it once hardens both origins"*. This is the
first hardening that argument was bought for, and the milestone deliberately did not spend it: ADR-004
mandates a VERBATIM move with no behavioural delta, so changing the guard inside `45/02` would have
broken its own pin.

**The fix.** Contain on the REAL path, not the lexical one — `fs.realpath` the resolved candidate (and
the root) before the prefix check, refusing on `ENOENT` exactly as the miss path already does. It is a
~4-line change in ONE file now, plus a row in `test/static-serve-fallback.test.mjs`'s traversal table and
the fixture symlink to feed it. Two things to decide with it rather than after: the extra syscall per
static request (cache the resolved root; the candidate still costs one), and whether a deliberately
symlinked deploy layout must keep working — if so the rule is "the real path stays inside the real root",
which a symlinked `ui/dist` itself still satisfies.

---

## 25. The port map has FOUR homes and an inconsistent default — `serveBoard` defaults to another server's port

**Status:** open (raised 2026-08-08 by the architect at `aof:refine 46`; re-confirmed at source
2026-09-05 at `aof:pay-debt` — deferred, the fix is a new leaf plus four launcher edits across two
live servers, which wants its own chore and a deploy to verify). **Severity:** medium — a caller that
omits the port silently gets another server's.

Measured 2026-08-08 at `14ac6e1`, during `aof:refine 46` (recorded in
[46/ARCHITECTURE.md §Codebase health finding 4](46_milestone_terminal-control-unification/ARCHITECTURE.md)).

Five servers, four homes for the numbers, and they do not agree:

| home | says |
|---|---|
| [src/setup-ui.mjs:26](../../src/setup-ui.mjs#L26) | `4177` |
| [src/board-serve.mjs:60](../../src/board-serve.mjs#L60) — `serveBoard` | **`4178`** |
| [src/board-serve.mjs:33](../../src/board-serve.mjs#L33) — `boardUiProbe`, and `src/commands/work-ui.mjs:25` | **`4180`** |
| `src/commands/assets-ui.mjs:22` | `4177`, api port `4178` |
| [src/mesh-ui-serve.mjs:154](../../src/mesh-ui-serve.mjs#L154) | `4181`, with a comment at [:113-115](../../src/mesh-ui-serve.mjs#L113) narrating the whole map from one of its four homes |

Two distinct faults, and the second is the one that will bite:

- **`serveBoard`'s own default is wrong** (re-confirmed 2026-09-05: still `4178` at `:60`; no port-map leaf
  and no `defaultMeshUiOrigin()` exist). It says `4178` while both of the things that describe it to an
  operator — `boardUiProbe` and `aof work ui` — say `4180`, and `4178` is the **assets API** port. It is
  masked today only because every production caller passes an explicit port
  ([mesh-ui-serve.mjs:781-786](../../src/mesh-ui-serve.mjs#L781) passes `port: 0`). A caller that omits it
  silently gets a different server's port.
- **`DEFAULT_MESH_UI_PORT` lives inside the fleet SERVER module.** So any other module that needs to name
  the fleet's origin either imports a server — a cycle, which is exactly why
  [46/ADR-004](46_milestone_terminal-control-unification/ARCHITECTURE.md) resolves the standalone default
  in the command layer instead — or re-types the number. That is how
  `FLEET_PORT = 4181` came to sit in a browser component
  ([ui/src/board/TerminalDock.tsx:78](../../ui/src/board/TerminalDock.tsx#L78)) in the first place.

**Why it is not milestone 46's to fix.** The fix is a pure leaf plus four launcher edits, none of which
that milestone's diff otherwise touches; ADR-004 deliberately routes around it rather than adding a fifth
home. m46 retires the browser-side literal, which is the half that was actively wrong; this item is the
server-side half.

**The fix.** One pure leaf owning the map, imported by the four launchers; delete every re-typed default.
This is item 0.2's shape ("the same fact derived independently, everywhere") landing on the port map. Two
things to do with it rather than after: assert the five ports are pairwise distinct in the leaf's own
test, and keep `test/mesh-ui-serve.test.mjs:156`'s existing "distinct from 4180/4177/4178" assertion
pointed at the leaf rather than at the server that happens to export the constant today.

### THE PREDICTED CYCLE ARRIVED — measured 2026-08-08 during story 46/02's build and structural review

This item forecast that *"any other module that needs to name the fleet's origin either imports a server —
a cycle — or re-types the number."* Milestone 46 took the sanctioned branch and it bit anyway.

`src/commands/work-ui.mjs:25` imports `DEFAULT_MESH_UI_PORT` from `../mesh-ui-serve.mjs` — the fleet
**server** — which is exactly the route [46/ADR-004](46_milestone_terminal-control-unification/ARCHITECTURE.md)
sanctions (the command layer is the layer allowed to know both faces, m08/ADR-001). That import puts the
command module **on a real import ring**, confirmed edge-by-edge on the codebase graph (`aof graph build .`,
no `--backend`; **8,973 nodes / 21,370 edges, `builtAt` 2026-08-08T17:53:28.450Z**):

```
mesh-ui-serve → board-serve → setup-ui → board-ui → command-core → commands/work-ui → mesh-ui-serve
```

Every edge is in `aof graph impact`'s output, and the hub is not exotic: `src/command-core.mjs` has **97
dependents and 72 outward edges — one to every `src/commands/*` module**.

**Reading the constant at MODULE SCOPE closed it.** `import("./src/mesh-ui-serve.mjs")` threw
`ReferenceError: Cannot access 'DEFAULT_MESH_UI_PORT' before initialization`, while
`import("./src/cli.mjs")` stayed **green** — **121 assembled tests passed over a server module that could
not be imported on its own**, because every suite reached it through an already-warmed module cache. The
mask is the cache; the cure is a fresh process. Worked around in-story by making every read **call-time**
(`src/commands/work-ui.mjs:99`, `:104`), and pinned by a fresh-process entry probe in
[`test/arch/acd-board-server-no-fleet-import.test.mjs`](../../test/arch/acd-board-server-no-fleet-import.test.mjs)
(one `node -e import(...)` per server/face module — in-process would be answered from the cache that does
the masking). The general form of the ring is item **26**.

**The sharpening the review found: the leaf must own the ORIGIN, not just the number.** What is exported is
a **port**, so every consumer re-composes `http://127.0.0.1:<port>` for itself. Measured at `d71d508`,
`mesh-ui-serve.mjs` spelled its own address three times — `:156` (the probe's `fleetUrl`), `:746` (the bind
host) and `:767` (the returned `url`). 46/02 collapsed those into ONE spelling inside that module
(`MESH_UI_HOST` `:126` + `meshUiUrlForPort` `:128`), which is the right move and is **not** the fix: the
**cross-module** copy survives, because a number cannot carry a scheme or a host. `src/commands/work-ui.mjs`
composes the same origin string again at `:99` and `:104`. So the leaf should export
**`defaultMeshUiOrigin()`** (and `meshUiOriginForPort(port)`) beside the port map — exporting only the
number *guarantees* the next consumer re-types the scheme and the host, which is how
`FLEET_PORT = 4181` reached a browser component in the first place.

**One distinction to carry into the sweep, so it does not "fix" the wrong lines.** Not every
`http://127.0.0.1` in `mesh-ui-serve.mjs` is a composed origin: the occurrences inside
`new URL(request.url ?? "/", "http://127.0.0.1")` are a **dummy parse base** for a relative request target
and must stay exactly as they are. The sweep's subjects are the strings the product **hands out** (a
returned `url`/`fleetUrl`, an origin handed to a launched board, a default resolved by a command) plus the
bind host they must agree with.

## 26. A registered command module cannot be imported as its own entry point — the command registry closes a TDZ ring, and 617 green suites say nothing about it

Measured 2026-08-08 during `aof:continue 46` (story 46/02's build), on the working tree AND at `d71d508`
with the story's own file swapped back to its HEAD version — so this is **pre-existing and structural**,
not milestone 46's:

```
node -e 'import("./src/commands/work-ui.mjs")'   ->  ReferenceError: Cannot access 'workUiCommand' before initialization
node -e 'import("./src/commands/mesh-ui.mjs")'   ->  ReferenceError: Cannot access 'meshUiCommand' before initialization
node -e 'import("./src/cli.mjs")'                ->  OK
```

`src/commands/mesh-ui.mjs` is byte-untouched by this milestone (`git diff --stat` is empty for it), which
is what makes the diagnosis safe. A registered command that imports a server re-enters `command-core`,
which reads that command's own export at module scope; entering the ring at the command rather than at
`cli.mjs` hits the temporal dead zone.

**Why this is worth an item rather than a shrug.** Nothing in CI can see it. Every suite reaches these
modules through an already-warmed module cache, so **the masking is the module cache itself** — 46/02
found a *different* instance of exactly this fault (a module-scope read of an imported constant, fixed in
that story) only because a second story's arch test happened to import a server module first. The failure
mode is "fails at import, far from its cause, in whichever process happens to enter the graph the wrong
way" — a class this repo has now paid for twice.

**How wide it is, and it is NOT "any registered command" — measured 2026-08-08** at story 46/02's
structural review, one fresh `node -e import(...)` process per module:

```
src/commands/list.mjs         OK      src/commands/work-ui.mjs   FAIL: Cannot access 'workUiCommand' before initialization
src/commands/validate.mjs     OK      src/commands/mesh-ui.mjs   FAIL: Cannot access 'meshUiCommand' before initialization
src/commands/graph-build.mjs  OK
src/commands/assets-ui.mjs    OK
```

So registration ALONE does not close the ring — the fault needs a command that **statically** imports a
module which re-enters `command-core`. The population at risk is nonetheless the whole directory:
`aof graph impact src/command-core.mjs` (**8,973 nodes / 21,370 edges, `builtAt`
2026-08-08T17:53:28.450Z**) reports **97 dependents and 72 outward edges — one to every `src/commands/*`
module**. Seventy-two candidates, two afflicted today, and nothing tells you which the seventy-third
becomes.

**`src/commands/assets-ui.mjs` is the PRECEDENT for the fix, and it is already in the tree.** It needs a
server too, and stays off the ring by deferring it to call time —
`const { serveSetupUi } = await import("../setup-ui.mjs");` inside the handler
([assets-ui.mjs:42](../../src/commands/assets-ui.mjs#L42)) — so the module graph at load time never
contains the edge. That is the same medicine 46/02 applied one level down (make the READ call-time, item
**25**), applied to the import itself, and it is why `assets-ui` imports clean while `work-ui` and
`mesh-ui` do not.

**Partial guard already in place, deliberately scoped.**
[test/arch/acd-board-server-no-fleet-import.test.mjs](../../test/arch/acd-board-server-no-fleet-import.test.mjs)
gained a row asserting that every server/face module on the import ring loads cleanly **as its own entry
point**, one fresh `node -e import(...)` process per module (in-process would be answered from the cache
that does the masking). `src/commands/work-ui.mjs` and `src/commands/mesh-ui.mjs` are excluded from that
list with the measurement recorded at the exclusion — pinning them today would arrive red for a reason
ADR-004 has no claim over.

**The fix.** Break the registry ring so a command module is importable alone — the registry should take
commands by lazy reference (a getter/factory, or registration at call time) rather than reading their
exports at module scope. Then delete the two exclusions from that gate's list, which is the visible edit
that proves it was paid down. **The cheap interim, available today and already demonstrated:** the two
afflicted commands adopt `assets-ui`'s deferred `await import(...)` for their server, which takes the
edge out of the load-time graph without touching the registry — worth taking if the registry change does
not get scheduled, because it converts a structural fault into a two-line one per command. Whichever
lands, extend the gate's entry-point list to every `src/commands/*` module rather than to the two named
here: 72 candidates and a hand-maintained list is how the seventy-third arrives unnoticed.

## 27. TEN suites are RED at HEAD and nothing anywhere says so — including a shrink-only fitness ratchet, one that the focused run reports GREEN, two lanes that a milestone's OWN merge broke, and two that a work item was ACCEPTED over

<!-- Opened as THREE; raised to FIVE on 2026-08-11 when milestone 48's review found two more by the
     same method; raised to SIX on 2026-08-13 at milestone 49's refine; raised to SEVEN the same day at
     story 49/00's structural review; raised to NINE the same evening at `aof:verify 49`'s acceptance
     sweep — the first two this item has collected from a work item that CLOSED GREEN over them, which
     is a different and worse species than a red that was merely carried. The count keeps moving because
     nothing measures it — which is this item's own point, made a THIRD time. Do not "fix" this heading
     by lowering the number; fix it by making the green signal asserted.
     The sixth is a different species and is why the heading now names it: for a suite that exports a
     test ARRAY, `node --test <file>` runs the wrapper and NOT the assertions, so the focused command
     this repo tells everyone to use reports green over a red suite. -->


**Status:** open (raised 2026-08-08; population re-measured 2026-09-05 at `aof:pay-debt`).
**Severity:** medium — the population is gone, the missing signal is not.

**RE-MEASURED 2026-09-05: every one of the nine still-listed rows is GREEN at HEAD** — the six
behavioural suites (`mesh-terminal-input-path`, `mesh-worker-driver-session-id`,
`fleet-terminal-view-producer-fed`, `bundle`, `fleet-terminal-view-surface`, `memory-integration`)
run 85 cases with 0 failures, and the three arch gates (`acd-no-new-silent-catch`,
`acd-memory-backend-selection`, `acd-graphify-backend-selection`) are green in the same pass.
Per this entry's own rule the heading keeps its number: the population is discharged, the DEFECT is
not, because nothing asserted any of that — it took a hand-run sweep to learn it, again. **And the
eleventh arrived in the same session:** `test/bundle-asset-manifest-complete.test.mjs` was RED at
HEAD (`88 !== 87`, item 80's census literal) and nothing anywhere said so. Fixed at that pass; the
asserted green signal this entry asks for still does not exist.

Measured 2026-08-08 during `aof:continue 46`, on `d71d508`. Both were found incidentally by story
developers who were looking for something else, and both were then confirmed against **pristine HEAD**
rather than against the working tree:

| red at HEAD | since | how it was confirmed |
|---|---|---|
| `test/arch/acd-no-new-silent-catch.test.mjs` — *"NEW silent catch site(s) introduced"*, `board-worker-stream.mjs: 1 silent catch site(s), baseline 0* (the catch is at [board-worker-stream.mjs:102](../../src/board-worker-stream.mjs#L102)) | `eacbd57` (m43) | the flagged file, the gate, and its baseline are all unmodified by m46 (`git status` clean for each); the gate run in isolation fails 1 of 2 |
| `test/mesh-terminal-input-path.test.mjs:471` — *"terminal-resume/worker: a resume is a REAL RUN…"*, `TypeError: completionResolve is not a function` | unknown | `git archive HEAD` extracted to a scratch tree containing **none** of m46, `node_modules` junctioned: identical failure, identical line, 3/3 runs |
| ~~`test/arch/acd-bundle-manifest-hashes.test.mjs` clause 1 — *manifest hash for `.claude/commands/aof/autonomous.md`*~~ **DISCHARGED 2026-08-16 at milestone 66/03** | unknown | found 2026-08-08 at m46/05's structural review, verified by `git archive HEAD` into a scratch tree. **Struck with its enumeration, per this item's own rule that a number may never be lowered as a fix.** The gate `assert.equal`s **inside a loop**, so it stops at the first mismatch and names one path — which is why this row recorded `autonomous.md` while **eleven** entries were stale, and why the row outlived the defect it named. The real population at HEAD, measured by enumerating rather than by trusting the message: `.aof/templates/work/task/example.feature`, `.claude/agents/aof-{developer,qa}.md`, `.claude/commands/aof/{continue,refine,verify}.md`, `.codex/agents/aof-{developer,qa}.md`, `.codex/skills/aof-{continue,refine,verify}/SKILL.md` — **and `autonomous.md` is not among them.** 66/03 added the `VERIFICATION.md` template, and since the manifest is **derived, never hand-maintained** (ADR-002), regenerating it to carry the new entry cleared all eleven: **86 → 87 entries, stale 0**, with the committed `manifest.json` byte-identical to a fresh `generateBundleManifest()`. A discharge, not a relaxation |
| `test/mesh-worker-driver-session-id.test.mjs` ×2 — *"the session_id is surfaced as ABSENT (null), not an error"* and the `[no session_id at all]` Outline row; `expected null, got undefined` | m42 wave (d) | found 2026-08-11 at m48's review. `git archive HEAD` into a scratch tree with `node_modules` junctioned: identical failures, identical messages. Root cause read at source and it is one line — [mesh-worker-exec-fixture.mjs:139](../../test/support/mesh-worker-exec-fixture.mjs#L139) records via `Object.entries({ runId, sessionId, … }).filter(([, value]) => value != null)`, so a genuine `sessionId: null` is **stripped to an absent key** and reads back `undefined`. The suite asserts `null`. The fixture and both test files are byte-identical to HEAD |
| `test/fleet-terminal-view-producer-fed.test.mjs` ×1 — *"precondition: the REAL producer reported the session's terminal state"* | m42 wave (d) | found 2026-08-11 at m48's review, same method, same tree. Same root cause as the row above: m42 wave (d) moved the terminal report onto the `effect-step` channel and these m38-era suites still assert on the status-frame channel |

| `test/bundle.test.mjs` — **6 of 18** exported `bundleTests` assertions | `eacbd57` (m43) | found 2026-08-13 at milestone 49's refine, by QA authoring story 07's contract and confirmed independently by the PO. Measured on the unmodified tree: `bundleTests total=18 pass=12 fail=6`. Failing: the source-tree ACD-set count, the descriptor's valid-kind check (`member artifact-sync-enqueue has a valid kind`), three loader clauses (member count vs descriptor, cwd-independence ×2), and one manifest content-address. Root cause read at source: m43 landed `claude-artifact-sync` + `artifact-sync-enqueue` **without moving** `HOOK_IDS`, the `byKind("hook") === 3` count, or the valid-kind list, and `src/bundle/manifest.json`'s hashes have drifted since |

| `test/fleet-terminal-view-surface.test.mjs` ×2 — the `task04/38-06 (V10)` and `(V11)` lanes | `7400664` (m46's OWN merge) | found 2026-08-13 at story 49/00's structural review, by importing the exported array on a tree whose `ui/` is byte-identical to HEAD (`git status` clean for every file the two lanes read). V10 dies on `the header STATE chip renders descriptor.text`; V11 on `exactly ONE bar site … Found 0`. Root cause read at source: **m46 extracted the byte area into [`ui/src/terminal/TerminalByteArea.tsx`](../../ui/src/terminal/TerminalByteArea.tsx) and both lanes still read `TERMINAL_CONTROL`** (`ui/src/terminal/TerminalControl.tsx`), which carries **zero** occurrences of `{descriptor.text}`, `{descriptor.paneLine}`, `role="status"` or `byteArea(` — measured at `7400664`, `0e2688f` and `69d9087` alike (`git show <c>:… \| grep -c`). The tokens now live in `TerminalByteArea.tsx` (`{descriptor.paneLine}` ×3, `role="status"` ×1) |

| `test/arch/acd-memory-backend-selection.test.mjs` **and** `test/arch/acd-graphify-backend-selection.test.mjs` — both assert *"`config.memory?.backend` is read in exactly one code location (the seam)"*; the detector reports **seven** (`src/work-init.mjs` ×5, `src/commands/init-update.mjs`, `src/work-memory.mjs`) | `20b69cb` (**chore 51**) | found 2026-08-13 at `aof:verify 49`'s acceptance sweep, which ran the whole `test/arch/**` set rather than any milestone's subset. Attributed by counting the same reads at `20b69cb^`: **one**, in `src/work-memory.mjs` alone — green before the chore. Chore 51's `initConfig` consults the backend five times in `src/work-init.mjs` and once in `src/commands/init-update.mjs` to decide what a scaffolded config should carry |
| `test/memory-integration.test.mjs:79-82` — *"status (real backend) agrees with the reindex it just built"*, `the lesson/adr split sums to the record count: 600 !== 727` | **m39**, and named by **m40/R3** at the time | found 2026-08-15/16 at milestone 66/01's structural and behavioural reviews, independently and by three methods: a HEAD baseline capture before any edit, a `git stash --include-untracked` re-run, and a detached-HEAD worktree at `24fc181` with its own `node_modules` — identical numbers, identical line, every time. Root cause measured, not inferred: `buildRecords` over the real `wiki/work` returns `{adr:342, lesson:258, capability:76, gap:49, summary:2}` = **727**, while memory's `status` buckets only `lesson`+`adr` = **600**. The missing **127** are exactly m39's `capability`/`gap` and m13/m05's `summary` records |

**The TENTH was named by a retrospective 26 milestones ago and scheduled by nothing.** m40/R3 recorded
the fix — memory's `status` partitions by 2 of 5 record kinds — and its *"Carry: a follow-up (milestone
39 / a memory chore)"* was never discharged, so the gap grew from `363 !== 370` (**7** records) to
`600 !== 727` (**127**) while the suite stayed red. It appears in no ledger until now. This is a
different failure mode from every row above it: not a red nobody ran, but a red somebody diagnosed,
wrote down, and left. **A retrospective's "Carry" is not a tracked artifact anywhere in ACD** — which is
milestone 66's own thesis arriving from the retrospective side: a lesson recorded, cited and never
executed is the same defect class as a control declared and never run. The fix is still R3's own:
add the missing buckets to `status` (`src/work-memory.mjs`) and make the invariant exhaustive.

**The eighth and ninth are a NEW species, and the worst one yet: the work item that introduced them is
`status: done`.** Every red above this point was *carried* — nobody's gate ever ran it. These two were
introduced by an item that ran its gate and passed. A chore's close criteria (ADR-003) are a ticked
checklist plus a green `aof work validate`, and **`aof work validate` validates the work stream —
folder↔frontmatter, tag vocabulary, the depends graph — and has never run a fitness function.** So a
chore can violate an architectural invariant and close green *by construction*, with nothing in its own
criteria able to see it. That is not chore 51's mistake; it is a hole in what "validate" is asked to
mean at a chore's accept, and it will recur on every chore until either the criterion names the fitness
set or fix (b) below makes the green signal an asserted one.

**The seventh is the sharpest instance this item has yet collected, and it is why the heading now names
it: the milestone that broke these two lanes is the milestone whose headline they exist to defend.**
m46 re-pointed them at "the ONE control" in the same diff that moved the thing they assert out of it, so
they have asserted over the wrong file since the moment they were re-pointed — through m46's merge, m47's
and `69d9087`'s. Nobody was careless: the lanes read a *path*, and the path still exists and still
compiles. **And their repair is a CONTRACT judgment, not a re-point** — V11's "exactly ONE bar site"
counts sites *in the file it reads*, so an author must decide whether the invariant is now "one bar site
in `TerminalByteArea.tsx`" or "one across `ui/src/terminal/**`", which is m46/ADR's question and not the
next passing story's.

**A SIXTH red, and this one exposes a NEW blind spot in the method — the focused run reports GREEN.**
Added 2026-08-13. Every row above was found by running something. This one **cannot** be found that way:
`node --test test/bundle.test.mjs` reports **1 pass, 0 fail**, because the file's assertions live in an
exported `bundleTests` array (the m43/ADR-014 E7 test-array pattern, the same shape
`acd-test-suite-registration` exists to police) and `node --test` runs only the file's own wrapper. The
array is imported by [scripts/test.mjs:441](../../scripts/test.mjs#L441) and spread into the runner at
`:2197`, so **the full suite is red and the focused run says it is green** — and on this machine the
full suite cannot be run at all, because it binds `:4182`, which the live control daemon holds.

That combination is worse than any individual red: the repo's own documented workaround for "never run
the full suite here" is *"run focused suites via test-array imports instead"*, and for every
array-exporting suite the obvious focused command is **silently vacuous**. To actually exercise one you
must import the array and drive it yourself:

```
AOF_GLOBAL_HOME=$(mktemp -d) node -e "import('./test/bundle.test.mjs').then(async m => {
  for (const t of m.bundleTests) { try { await t.run() } catch (e) { console.log('FAIL', t.name) } } })"
```

**How many other array-exporting suites read green under `node --test` is unmeasured**, and that is this
item's point arriving for the third time. Fix (c) below is the one that closes it.

**The count itself was wrong for most of a day, which is the item's own point.** This entry was opened saying
TWO; the third was found only because one reviewer ran the **full `test/arch/**` sweep** (854/857) rather
than the focused subset every story ran. Nobody knows how many more there are, and that is the defect —
not any individual red.

**Why this is its own item and not a bug report.** The first one is a **shrink-only ratchet** — the exact
mechanism this repo uses to make degradation visible (item 17's family, `acd-test-suite-registration`'s
family). A ratchet that is itself red has stopped ratcheting: the next silent catch changes the message
from "1 site, baseline 0" to "2 sites, baseline 0" and nobody can tell those apart at a glance. The second
is an ordinary red that has simply been carried. **Neither has an owner, a ticket, or a skip marker**, so
today the honest answer to "is the suite green?" is *no*, and every story that says "suite green" means
"my focused subset is green".

**The contributing cause, worth fixing on its own.** `node scripts/check.mjs` — the name a developer
reaches for when looking for a linter — **shells out to the full suite**. On this machine that is a
several-minute run that binds `:4182`, a port the live control daemon holds, so the honest local
answer is unavailable by the obvious route. (There is no linter in this repo: no eslint/prettier/biome
config. The static gate is `node --check` plus the arch tests.) An agent hit exactly this during m46 and
killed the run at 200 s.

**THE ROOT CAUSE, MEASURED 2026-08-13 AT STORY 49/00's REVIEW AND NOT PREVIOUSLY WRITTEN DOWN HERE:
THIS REPOSITORY HAS NO CI TEST RUN AT ALL.** `.github/workflows/` contains exactly one file —
[`release.yml`](../../.github/workflows/release.yml), a tag-driven build/sign/stage pipeline with no test
job — and there is no other CI config anywhere in the tree (no circle/azure/gitlab/travis/appveyor, no
pre-push hook that runs the suite). So **every "fails CI" sentence in every ADR and every fitness
function in this repo is aspirational**: the only thing that ever runs `scripts/test.mjs` is a human or
an agent choosing to, on a machine where the full suite *cannot* run because it binds `:4182`. That is
the mechanism behind this item's whole history — six reds can be carried across four merges only because
no merge ever ran them. It also re-scopes fix (c): a green signal that is "asserted rather than assumed"
means a **workflow**, not a better local habit, and it must run the array-driven suites (fix (c)) on a
runner that holds no ports — otherwise the first thing CI does is fail on `:4182` and get switched off.

**The fix.** Three things, smallest first: (a) make `scripts/check.mjs` do the *static* pass only
(`node --check` + arch tests) and give the full-suite run its own name, so the obvious command is the
safe one; (b) resolve the two reds — for the silent catch, either emit a coded degrade event as the gate
demands or, if the unhandled-rejection guard at `:102` is genuinely the right shape, raise its baseline
**with the ADR that item's own rules require**, never silently; (c) get a green signal that is asserted
rather than assumed — until one exists, "the suite is green" is a claim nobody in this repo can currently
make, which is the same defect as a gate that reads green about nothing, one level up.

## 28. `ui/src` is growing faster than `src/` ever did — and the milestone chartered to REDUCE terminal code tripled it

Measured 2026-08-08 at milestone 46's last structural review, same method as item 10:

| signal | m44 (`eacbd57`) | m45 (`14ac6e1`) | m46 (now) | trend |
|---|---|---|---|---|
| `ui/src` files | 54 | 71 | **88** | **+63% over two milestones** |
| `ui/src` lines | 10,887 | 14,238 | **17,666** | +62% |
| `ui/src/terminal/` | — | — | **27 files / 4,127 lines** | now the **largest** `ui/src` directory by file count (board: 21) |
| `ui/src/app/shell-layout.mjs` | — | 845 | **1,006** | crossed 1,000 **unbudgeted** |

**The sharp part is the prediction, not the number.**
[46/ADR-001](46_milestone_terminal-control-unification/ARCHITECTURE.md) states as a consequence that the
terminal subtree comes out **net file-negative** — *"two components and six helpers (plus six `.d.mts`)
become one component and one helper set"*, ≈14 files / ≈1,370 lines. It shipped at **31 files / ≈4,430
lines** (including the two call-site mount modules): **~2.2× the files, ~3.2× the lines.** About 35% of
those lines are comment, so this is not merely prose, and much of it is capability the predecessors never
had — the seven-state ramp, the affordance tables, origin refusals, pane identity, the palette. The
extraction itself was reviewed as genuine separation, not shuffling.

**How it bites.** ADR-001 is the document milestone 49 will read, and it promises a shrink that did not
happen — the same class of defect as `geometry.mjs`'s comment naming a test file that never existed: it
stops the next reader from looking. And `acd-ui-surface-file-budget`'s table is **opt-in**, so a large new
file acquires a ceiling only if a human remembers. That is exactly how `shell-layout.mjs` reached 1,006
lines unbudgeted *after being named in m46's own health findings* — the finding named two files and phrased
its conditional route around one of them.

**The fix.** (a) A clause in `acd-ui-surface-file-budget` requiring any `ui/src` file over ~800 lines to
carry a `BUDGETS` entry, so the ratchet stops depending on memory — this is the same shape as item 17's
"a suite no runner imports" and should be gated the same way. (b) A directory-level count for `ui/src/*`,
of the same species as item 10's root-module count. (c) An amendment note on 46/ADR-001 recording the
measured outcome against its prediction, so the next reader is not misled by it.

## 29. The UI test harness silently disabled every ref-guarded effect — so no rendered component's side effects were ever tested

Measured 2026-08-09, fixing the m46 blocker that shipped a terminal control which never opened a socket.

`test/support/mini-react.mjs`'s `useRef` returned a `{ current }` object that **nothing ever assigned**. React
populates a ref when it commits the host node; the mini harness never did. So every effect of this extremely
common shape was **unreachable in every UI suite in the repo**:

```js
const el = ref.current;
if (!el) return;      // ← always taken under the harness
```

That is the guard a component's real work lives behind — mounting a child library, opening a socket,
measuring a box, attaching an observer. Compounding it, all three app harnesses stub the biggest subject
outright: `export const TerminalControl = () => null;` (`board-app-harness.mjs:42`,
`fleet-app-harness.mjs:32`, `shell-app-harness.mjs:124`).

**What it cost, measured.** Milestone 46 shipped its headline — one terminal control at both call sites —
**connecting to nothing**, past 537 green tests, a 71-mutant battery, three structural reviews and two
behavioural reviews. Zero sockets, no xterm, every session stuck on `idle`, at both call sites and for both
sources. Every gate was honest; none of them rendered the component. 46/05's own QA even reported that
`readContentBoxHeight` was unreachable *because the component is stubbed everywhere* — recorded as a
coverage nit rather than read as "the component is untested at every call site".

**Partly paid.** `mini-react.mjs` now supports **opt-in host-node refs** (`createRuntime({ hostNode })`,
default off so the 158 existing mount-harness tests are untouched), and
`test/support/terminal-control-harness.mjs` bundles the real component with only the browser environment
substituted (`@xterm/*`, `createPortal`, a minimal DOM, a drivable `WebSocket`).
`test/terminal-control-opens-its-socket.test.mjs` asserts the observable — *a socket was constructed, to the
composed URL* — and fails 7/13 against the pre-fix code.

**What is still open.** (a) Host refs are **opt-in**, so the same blindness persists for every suite that has
not adopted them — the default is still "ref-guarded effects do not run". (b) The three app harnesses still
stub `TerminalControl`. (c) Nothing prevents the next component from being tested only through a stub: worth
a gate asserting that a `ui/src/**` component with a `useEffect` touching a ref has at least one suite that
renders it for real. **The rule this taught: a harness that cannot express a component's side effect does not
test the component — it tests the model beside it, and will report green while the product is dead.**

---

## 30. The deploy's "lock tolerance" DESTROYED the module it claimed to keep — every terminal on the machine died, and the deploy said it had kept it

**Found on the running system 2026-08-09, reproduced deterministically, fixed the same day.** Filed here
rather than inside milestone 46 because `scripts/install-local.mjs` is not in any of its stories' surfaces —
but it is what stood between that milestone and every one of its outstanding `@manual` and `@uat` lanes, so
the milestone paid for it regardless.

**The symptom, from the operator's chair.** A board dock opened, its socket connected, and the pane read
`error`:

```
claude CLI failed to start: Cannot find module 'node-pty'
Require stack: - C:\Users\Umami\.aof\bin\aof.exe
```

Every `local-pty` session on the machine failed that way, at both call sites. The one terminal control was
healthy throughout — it opened its socket in 9.7s and rendered the far end's refusal exactly as DESIGN says
it should. The refusal was true: the payload's `node_modules/node-pty` had **no `package.json` and no
`lib/`**, so it was not a stale module or a broken binary, it was **not resolvable at all**.

**The cause, at [`scripts/install-local.mjs`](../../scripts/install-local.mjs).** `copyModuleDir` was:

```js
rmSync(destDir, { recursive: true, force: true });   // delete first
cpSync(srcDir, destDir, { recursive: true });        // then copy
// on EBUSY/EPERM:
console.log(`  (kept existing ${…} — locked by a running process)`);
```

A running daemon holds node-pty's `.node` open on Windows. So the delete ran **and partially succeeded**, the
copy then aborted at the first locked file, and the handler reported that the existing copy had been *kept* —
of a module it had just gutted. A second sweep above it deleted **every** `node_modules` entry, including the
ones it was about to re-copy, and reported the same falsehood per entry. Two homes, one lie.

**The trigger is ordinary.** Not a rare race: the FIRST install after any PTY has been spawned. That is every
deploy during a working session — the exact loop `.claude/rules/build-deploy-restart.md` prescribes. Measured
twice within an hour: repaired by a clean install (nothing held the lock, because node-pty had never loaded),
then destroyed again by the very next deploy once a session had loaded it.

**The fix.** The copy is now file-by-file, so a lock costs **that file** and never the module: `package.json`
and `lib/` always land, and the skipped files are counted and **named** (`(node-pty: kept 1 locked file(s) —
conpty.node)`) with a line saying the rest was updated. The pre-delete sweep now only removes entries that are
**no longer in the closure**; an entry being reinstalled is left to the tolerant copy, which prunes when the
delete succeeds and overlays when it does not. Stale files lingering is visible and harmless; live files going
missing is invisible and fatal.

**Verified at the source, not at the log.** `require.resolve('node-pty')` from `~/.aof/bin` →
`…\node_modules\node-pty\lib\index.js`, `typeof pty.spawn === "function"`, and a board dock driven in a real
browser reaching `streaming` with a live `claude` TUI painting into the xterm.

**What is still open.** (a) Nothing asserts the payload is *loadable* after an install — the honest check is a
post-install `require.resolve` of each native dependency against the install dir, which would have failed
loudly at the moment of damage instead of an hour later in a browser. (b) The same delete-then-copy shape
should be audited wherever else this repo copies over a running target. **The rule this taught: a tolerance
that reports what it INTENDED rather than what it DID is worse than no tolerance — it converts a loud failure
into a silent corruption, and spends the next hour of debugging pointing away from itself.**

---

## 31. The primary navigation offers a DEAD tab on the fleet — one route table, two servers, and only one of them can answer

**Found by the operator 2026-08-09**, while being told to "open milestone 46" and quite reasonably asking *which project's* 46. Filed here rather than in milestone 46 because the shared navigation is milestone 45's routing work and the fleet server is not in any of 46's story surfaces — but it is live, it is in the PRIMARY nav, and it is the exact trap the question walked into.

**Reproduce:** open `http://127.0.0.1:4181/fleet` and click **Board** in the top nav.

```
Could not load the work stream: Mesh API route not found.
```

**Why.** m45's [`ui/src/app/routes.mjs`](../../ui/src/app/routes.mjs) declares ONE route table — `/`, `/fleet`, `/board`, `/config` — and the shell renders that nav on every origin. But there are **two kinds of server** behind it and they do not have the same API surface:

- a **board server** is per-workspace, on an EPHEMERAL port (`aof` → `:58633`, `aof-test-repo` → `:51171`, `pilot-app-portal` → `:51173`, `lark-guard-portal` → `:58836` — measured), and it serves exactly one project's work stream;
- the **fleet server** (`mesh-ui-serve`, fixed `:4181`) is the cross-workspace index. It has `/api/mesh/*` and **no board API at all**, because a board is meaningless without a workspace.

The SPA route resolves, the shell paints, and the data fetch 404s. The user sees a nav item that is simply broken.

**This is a real question the product has to answer, not a missing 404 page.** "Which project's board?" is genuine ambiguity — there are two `46`s in the mesh right now (`aof`'s milestone and `pilot-app-portal`'s chore) and there will be more. The fleet already answers it correctly *in its content*: every milestone card is labelled with its workspace and carries `Open board →`, which resolves `GET /api/mesh/board-url?workspaceId=…` and jumps to that project's own port. **The nav bypasses the one place the answer lives.**

**Options, none of them chosen here:** (a) don't offer `/board` on an origin that cannot serve one — the route table becomes per-origin, which is a real change to m45's "one table" premise; (b) make `/board` on the fleet a **workspace picker** that routes on to the right port, which is arguably the honest surface and is close to what the fleet's own cards already do; (c) leave it and render a real empty state naming the reason. (a) or (b); (c) is the one that keeps a broken-looking tab.

**The general form, and it is the same shape as this repo's recurring one:** a shared declaration (one route table) was made an invariant without asking whether every consumer can satisfy it. The nav asserts a capability the origin does not have, and nothing checks that — the same class as TECH_DEBT 29's harness asserting a component it stubbed, and as milestone 46's fullscreen host declaring `notDeclared("no picker")` while the JSX never asked. **A route table shared by two servers needs a gate that every declared route has an API behind it on every origin that renders it.**

---

## 32. The board has no small-window layout, and the dock's contracted half exposes it

**Operator ruling, 2026-08-10: logged, not fixed — milestone 46 is not about board responsiveness.**

At the desktop app's own 760×520 window the shell's content box is 432px. `46/05`'s clamp entitles the
dock to `floor(432/2) = 216px`, which leaves the board 216px for a detail panel that wants **≈362px**.
The panel compresses, and it looks it.

**Measured, because the scope question deserved better than an opinion.** With the pre-fix `shrink-0`
header and **no dock open at all**, the board was shrunk from 900px to 440px of viewport height: the
action strip never escaped its panel and every control stayed reachable at every step. So this is not
pre-existing board debt that milestone 46 exposed — **the dock's claim on half the content box is the
cause**, which is why the reachability half was fixed inside m46 ([`DetailPanel.tsx`](../../ui/src/board/DetailPanel.tsx),
guarded by `shell-dock-inset/DG-46-1`).

**What is fixed and what is not.** DG-46-1's binding claim — *an open dock covers nothing the operator
can still act on* — is now true at both documented widths, hit-tested in five dock conditions. What
remains is quality, not reachability: at that window the panel is cramped, its header scrolls, and the
composition is unattractive.

**And it may not be solvable by making the terminal smaller.** The three options are all poor: the dock
takes its contracted half and the board compresses (today); the dock is sized to what the board needs,
leaving it ~70px — barely more than collapsed, i.e. useless; or the board gains a genuine small-window
layout. Only the third is a real answer, and it is **board work, not terminal work**.

**Do not fix this by editing the clamp.** `max = floor(box/2)` is a locked contract in `46/05`. A rule
producing an unattractive consequence is a contract decision to be raised, never quietly retuned.

---

## 33. The `ui/src` file-budget table is at its ceiling across the board — the ratchet is an alarm, and the whole tree is standing on it

**Measured 2026-08-10 at `d71d508`, at milestone 47's refine** (architect's codebase-health pass,
[47/ARCHITECTURE §Codebase health](47_milestone_fleet-repo-filter/ARCHITECTURE.md) finding 1). Filed here
rather than inside m47 because paying it down means extracting from files m47 does not touch, and a limit
one milestone imposes on another's files fails CI for reasons unrelated to the diff that trips it — the
ruling m43, m45 and m46 have each made in turn.

**What's wrong.** `acd-ui-surface-file-budget` (m43/ADR-015 F2) caps six `ui/src` modules. **Five of the
six now sit within 2% of their ceilings, and three within 15 lines:**

| file | ceiling | now | headroom |
|---|---|---|---|
| `ui/src/board/DetailPanel.tsx` | 1,000 | **999** | **1 line** |
| `ui/src/config/App.tsx` | 1,300 | **1,297** | **3 lines** |
| `ui/src/fleet/Fleet.tsx` | 1,560 | **1,547** | **13 lines** |
| `ui/src/app/shell-layout.mjs` | 1,060 | **1,015** | 45 |
| `ui/src/app/Shell.tsx` | 940 | **917** | 23 |
| `ui/src/terminal/TerminalControl.tsx` | 840 | **818** | 22 |

Against the tree-level trend that produced it (item 28's own table, extended): `ui/src` is **54 → 88 → 90
files** and **10,887 → 17,666 → 17,991 lines** across m45, m46 and m47's refine — **+67% in four days**.

**This is a different signal from any one file being large**, and it is the kind only an aggregate view
sees. Each ceiling was set *just above* its file's delivered size, deliberately and for a good reason each
time: the debt belonged to an earlier story and "must not be made to pay". The aggregate consequence was
never looked at. The ratchet is doing exactly its job — it is an **alarm** — and the tree is now standing
on the alarm line in six places at once.

**How it bites.** The next milestone that touches `ui/` in any breadth meets a ceiling, and
`acd-ui-surface-file-budget`'s own rule (via m43/ADR-014 E3) is that raising one *"needs an ADR, not a
diff"* and may **not** be met by deleting rationale. So the failure mode is not a large file; it is a
**milestone stalling mid-build on a structural decision it did not plan for** — at which point the cheap
answer (trim comments to fit) is the one the rule forbids and the one time pressure argues for. Three
milestones are already queued against these files: m47 against `Fleet.tsx`, m49's terminal grid against
`Shell.tsx` and `shell-layout.mjs`, and anything touching config against `App.tsx`.

It has also already produced one near-miss: m47's own refine found `Fleet.tsx` with 13 lines of headroom
while the milestone needs to add a filter control, a chip and an empty-state branch to it. That milestone
can pay for itself — [47/ADR-006](47_milestone_fleet-repo-filter/ARCHITECTURE.md) deletes ~250 lines of
unreachable local-shape branch — but that was luck of a kind: the dead code happened to be in the same
file. `DetailPanel.tsx`'s next author has one line and no windfall.

**[Measured 2026-08-11, at 47/03's structural review — the "m47 pays for itself" line above is FALSE as
delivered, and the falsification is the useful part.]** With 47/01–47/03 in the working tree (47/04 still
landing), `ui/src` is **95 files / 19,383 lines** against HEAD's **91 / 18,215** — **+4 files, +1,168
lines**, where ARCHITECTURE §Codebase health projected the milestone **net −250**. The per-file ceiling it
was measured against is genuinely relieved (`Fleet.tsx` 1,547 → 1,512, headroom 13 → 48) and the four new
files are the *sanctioned* remedy — `acd-ui-surface-file-budget`'s own failure message instructs the author
to "extract the next region into a sibling component with a prop boundary", and each of the four is small
(134–205 lines) with a real prop boundary, in an existing directory. **That is exactly why this belongs
here rather than in a review verdict:** the correct per-file move and the tree-level degradation are the
same move. Six per-file ceilings cannot see it, which is the argument for fix (b) below — now the **third**
consecutive milestone to grow the tree by adding files (m46 +17, m47 +4/+5) with every per-file gate green
throughout. Fix (b) has stopped being a suggestion; it is the ratchet this item exists to buy.

**The fix.** (a) **Extract, in the files' own milestones** — each budget entry already names its next cut
(`DetailPanel`'s doc tabs and runs view; `App.tsx`'s section editors into `ui/src/config/`;
`shell-layout.mjs`'s fullscreen machine into `shell-fullscreen.mjs`, which its `why` names outright). (b)
**A DIRECTORY-level count for `ui/src/*`**, of the same species as item 10's root-module count and already
asked for by item 28's own fix (b) — six per-file ceilings cannot see a tree that grows by adding files
instead of lines, which is exactly what m46 did (+17 files). (c) **Report headroom, not just breach.** The
budget suite knows every file's distance from its ceiling and prints nothing unless one is crossed; a
one-line "N files within 5% of budget" summary would have surfaced this table a milestone earlier, for
free, and it is the same "REPORTED rather than absorbed" discipline m45's chrome budget and nav budget
already use.

**Not to be fixed by raising the numbers.** Six ceilings raised together is this item, deleted rather than
paid — and it would erase the one measurement that says the tree is under pressure.

---

## 34. `writeText` adds ~62 unbounded characters to every atomic write — a legal filename can be unwritable, and the rule has two homes

**Status:** open (raised 2026-08-11 by milestone 48's story-00 developer, measured through the real
producer; ruled out of m48's scope by [48/ADR-011](48_milestone_fleet-session-identity/ARCHITECTURE.md)).
**Severity:** low likelihood, silent failure mode, repo-wide reach.

<!-- ADR-011's paste-ready block cites this as "item 29". That number was already taken (item 29 is the
     UI test-harness ref-guard item); landed here as item 34, the next free number. Cite it as item 34. -->

**What's wrong.** `writeText` (`src/fs.mjs:22`) composes its atomic temp as
`` `.tmp-${basename}-${pid}-${Date.now()}-${randomUUID()}` `` — a constant 57 characters plus the pid's
digits ahead of the caller's own basename. NTFS, ext4 and APFS all cap a single path COMPONENT at 255
bytes, so `writeText` silently converts "your target name is legal" into "your target name plus ~62
characters must be legal" — a precondition it never states and no caller can see. `src/lock.mjs:55`
carries the SAME composition character for character: one rule, two homes.

**How it bites.** Measured 2026-08-10 through the real `aof session start`: with milestone 48's four-part
session leaf (`<node>~<workspace>~<assistant>~<sessionId>.json`), a 164-character session id writes and a
165-character one fails with `ENOENT` — the id is never truncated (the write is temp+rename and the temp
is reclaimed at `src/fs.mjs:32`), but the failure is a raw filesystem error, not a coded refusal.
`startSession`/`pingSession` are called at `src/commands/mesh-session.mjs:286`/`:291`, outside that
module's coded-refusal `try/catch` at `:249-269`, so a hook receives a stack trace instead of the
`session-*` envelope the module promises at `:30-34`. No measured producer emits an id anywhere near the
limit (every one is a 36-character UUID), which is why this is debt and not a bug — but every writer in
the repo shares the seam, and `src/fs.mjs` has **52 dependents**.

**The second home is worse than a duplicate, verified 2026-08-11.** `writeLock` (`src/lock.mjs:52-58`)
composes the identical temp name but calls `renameWithRetry` with **no** `try`/`catch` — so it has none of
the m42/m38-F26 orphan reclaim `src/fs.mjs:26-34` exists to provide. A lost rename there strands the temp
permanently, and the only thing that ever removes it is `sweepStaleTempFiles`' `.tmp-` prefix match
(`src/fs.mjs:51`). Whoever fixes the length fixes this at the same time or leaves the worse copy behind.

**The fix.** (a) Bound the echo: `` `.tmp-${basename.slice(0, N)}-${pid}-${Date.now()}-${randomUUID()}` ``
for a small fixed `N`, so the temp's length is independent of the target's. Keep the `.tmp-` prefix
(`sweepStaleTempFiles` matches it, `src/fs.mjs:51`; `src/commands/mesh-serve.mjs:88-93` reports it) and
keep `randomUUID()` — it is the only collision-free component; the pid and `Date.now()` are debuggability,
and two writes in one millisecond from one process share both. Nothing anywhere parses a temp name back
into a target, so the echo is free to be bounded. (b) Land it in BOTH homes (`src/fs.mjs:22`,
`src/lock.mjs:55`) or centralise the composition in one exported helper — a fix in one is a second
spelling that drifts. (c) Add the arch-test that states the invariant: **the temp component is never
longer than the target component it stands in for**, for any target that is itself legal. (d) Optionally,
in the same change, give `meshSessionCommand` a coded refusal for a key it cannot store, so the failure
arrives in this module's own envelope rather than as a stack trace.

---

## 35. On a case-insensitive filesystem, `readSessionRecord` can return ANOTHER session's id — a wrong value that still looks valid

**Status:** open (raised 2026-08-11 by milestone 48's QA pass, measured on this machine; the residual is
ACCEPTED and the failure MODE re-stated by
[48/ADR-013 R14](48_milestone_fleet-session-identity/ARCHITECTURE.md), which supersedes ADR-010/R1's
"collision" framing). **Severity:** negligible likelihood (needs caller misuse), silent, and the one
failure mode the whole identity contract is built to exclude.

**What's wrong.** Milestone 48 makes the session id the fourth component of the record's FILENAME
(`<node>~<workspace>~<assistant>~<sessionId>.json`, 48/ADR-002), percent-escaped but **not case-folded**
(48/ADR-010 R1 — deliberately, to keep the leaf legible). Windows and default macOS resolve
`…~sess-ABC.json` and `…~sess-abc.json` to ONE file. Measured: after writing both, reading back key
`sess-ABC` returns a record whose `sessionId` is `"sess-abc"`.

**How it bites.** Not as a merge — as a **wrong value that still looks like a valid one**. The returned id
is well-formed, rides the wire (48/ADR-005), reaches the fleet index (48/ADR-007) and joins
`global_assignments.session_id` (48/ADR-003) — to the wrong row. It surfaces two milestones later as a
terminal pane attached to the wrong session, with nothing anywhere having failed. That is precisely the
class 48/ADR-001's byte-identity rule and 48/ADR-011 R6's no-truncation rule both exist to prevent
(*"a truncated id is the worst available outcome — a wrong value that still looks like a valid one"*),
which is why this is written down rather than shrugged off despite the probability. It needs a caller to
hand two case-only-differing ids for one `(node, workspace, assistant)` triple; every producer milestone
48 measured emits a lowercase UUID (RESEARCH §1/§2), so nothing in this fleet can trigger it today.

**The fix (two lines, one home).** `readSessionRecord` (`src/mesh-session.mjs`) already parses the record
it returns, so one comparison makes the read honest: a record whose `sessionId` is not the id it was
ASKED for is not this key's record, and reads as `null` — the module's own absence-is-benign miss. It MUST
compare `(record.sessionId ?? null)` against `(key.sessionId ?? null)`, so a pre-m48 record read by an
anonymous key still matches: 48/ADR-002's "there is NO migration" claim rests on that exact read, and the
guard must not break the thing it is protecting. Add the arch clause with it — *a read by key K never
returns a record whose id is not K* — which is testable on any filesystem by writing a record and reading
it back under a case-varied key.

**What the fix does NOT do, stated so nobody believes more of it than is true.** It makes the READ honest;
it does not make the WRITE non-destructive. On a case-insensitive filesystem the second session's write
still replaces the first one's file, so one of the two sessions loses its liveness record until its next
ping. That remaining half is a liveness merge, not a wrong address, and 48/ADR-013 R14 accepts it on the
same reasoning 48/ADR-012 R11 accepts the anonymous merge: a merged record is one live session that
renders as one — never a phantom, never a wrong address. Closing it needs case-folding into the escape or
a digest, both of which cost the leaf's legibility that RESEARCH §3's own evidence depends on; neither is
worth buying for a path no measured producer can reach.

---

## 36. ANY recursive delete that crosses the `node_modules/@aof/ui` junction DELETES the entire `ui/` workspace — uncommitted work included — and the "recovery" install then leaves a tree with no UI toolchain that every guard-if-present gate calls GREEN

**Status:** open (raised 2026-08-13 during story 49/00's structural review, which watched it happen to
the story it was reviewing). **Severity:** silent destruction of uncommitted work, followed by a green
test report over a tree that cannot build the UI at all.

> **UPDATE 2026-08-13, ~17:05 — IT HAPPENED A SECOND TIME, four hours later, and `npm` was not
> involved.** The title above originally read *"A root-level `npm ci` can DELETE…"*. That framing is
> **too narrow and it is why the second wipe was not prevented**: every agent in the milestone-49
> cascade was warned "never `npm ci`, never delete `node_modules`", and the second incident obeyed
> both instructions.
>
> **Second occurrence.** A reviewing agent created a detached `git worktree` in the scratchpad (it
> needed the dependencies, and `npm ci` is forbidden here) and **junctioned `node_modules` into it**.
> `git worktree remove --force` then followed the junction into its target, emptied the real
> `node_modules`, and from there the `node_modules/@aof/ui` workspace junction carried the delete on
> into `ui/`. Measured immediately after: `node_modules` **0 entries**, `ui/` **gone entirely** —
> 113 tracked files including `ui/package.json`, `git status -- ui/` showing 113 ` D` entries and
> `ls ui/` returning nothing. `package-lock.json` intact; **no non-`ui` tracked file touched.**
>
> **Cost, and it is the real lesson.** Tracked files came back with `git checkout -- ui/`. What did
> **not** come back was every uncommitted change inside `ui/` — across *five* stories, including two
> already marked `done`: six untracked `ui/src/home/` modules (49/02), three more plus `SessionPane.tsx`
> (49/03), three more plus four `ui/src/app/` edits and a deletion (49/04), all of 49/05's in-flight
> work, and 49/06's two edits. **Everything outside `ui/` survived** — every test suite and every
> fitness gate — so the tree was left in the worst possible shape: *the tests that prove the work, with
> the work gone.* Recovery was possible only because each builder's agent transcript still held its
> files and could re-emit them.
>
> **The generalised rule, which is what the fix must encode:** the hazard is not `npm ci`. It is
> **any recursive delete whose path crosses a junction into a git-managed directory** — `npm ci`,
> `git worktree remove --force`, `rm -rf` on a sandbox, a build script's clean step. On Windows a
> junction is traversed as a directory by nearly every deleter.
>
> **Fix, re-scoped (supersedes the original fix list's framing, not its content):**
> **(a)** never link `node_modules` into a scratch tree — copy the tree *without* it, or install into
> the sandbox;
> **(b)** the guidance in `CLAUDE.md` and in every agent brief must forbid **creating the junction**,
> not merely the commands that follow it — the second incident proves a command-shaped prohibition
> does not generalise;
> **(c)** unchanged and now doubly earned — the under-installed tree reads GREEN everywhere, because
> every `guard-if-present` gate treats "toolchain missing" as "skip, ok" and cannot distinguish that
> from the packaged checkout it was written for;
> **(d)** new — **commit early.** Both incidents destroyed *only* uncommitted state. The committed
> halves (story 00's code, the record docs) came through both wipes untouched.

**What was measured, in the order it happened.**

1. **~13:17 local:** `C:\Source\umami\aof\ui\` was emptied. `git status` reported ` D` for **all 107
   tracked files under `ui/`** and printed `warning: could not open directory 'ui/src/fleet/'`; `ls ui`
   returned zero entries. The repo-root `node_modules/` was emptied in the **same minute** (both
   directory mtimes `13:17`).
2. **13:19:31:** a root-level `npm ci` ran (npm log `2026-08-13T12_19_32_311Z-debug-0.log`:
   `verbose title npm ci`, config loaded from `C:\Source\umami\aof\.npmrc`) and **exited 0**. Because
   `ui/package.json` no longer existed when it built its ideal tree, it silently produced a root
   `node_modules` of **24 entries with no `@aof` workspace link and no `typescript`** — a "successful"
   install of a workspace repo with the workspace missing.
3. **`ui/` was then restored to HEAD content** by a git-shaped restore outside the review. Tracked files
   came back; **the uncommitted diff did not.** Story 49/00's one-line addition to
   `ui/src/fleet/api.ts` (`code?: string`) was gone, and its own scenario-6 lane went red saying so.
4. On that tree, story 49/00's sibling lane — the typed UI build, `tsc -b ui --force` — printed
   `# skip - tsc -b ui (typescript=false, ui/tsconfig.json=true)` and **passed**.

**The cause, named as inference rather than as fact.** No npm log exists for 13:17, so the exact command
is unknown. The strongest candidate is a recursive removal of the repo-root `node_modules` that followed
the **`node_modules/@aof/ui` workspace junction** into its target: npm links a `workspaces: ["ui"]`
member as a Windows junction, and a recursive delete that treats a junction as a directory deletes what
it points AT. Two things support it — the two directories died in the same minute, and
[`scripts/deploy-wsl.sh:77`](../../scripts/deploy-wsl.sh#L77) already runs
`npm ci --omit=dev --workspaces=false`, i.e. somebody has already been bitten enough to opt the
workspace out on the one install path that is written down.

**How it bites.** Three ways, escalating:

- **It destroys uncommitted work with no warning and no recovery.** `git restore` brings back HEAD, not
  the diff. Here it cost one line and a review caught it inside the hour; on a UI-heavy story it is a
  day, and the loss is indistinguishable from "the developer never made the edit".
- **The recovery under-installs silently.** A workspace repo whose workspace directory is momentarily
  absent gets a root-only install that reports success, so the tree *looks* installed while the UI can
  neither build nor be type-checked.
- **And then the gates agree with it.** Every `guard-if-present` skip — the pattern this repo uses so a
  packaged checkout is not failed for a toolchain it never installed — degrades to a **pass** on exactly
  the tree that has just lost its toolchain. `tsc -b ui` is the one leaned on hardest: m45, m46 and m49
  all cite the typed build as the *browser half* of a wire contract, and on this tree that half proves
  nothing while reporting green. That is item 27's disease with a new vector.

**The fix.** (a) Make the install path junction-safe and workspace-explicit: document and script the
install (`npm ci --workspaces=false` for the CLI-only case), and remove `node_modules/@aof/ui` — the
**link**, with `rm`/`unlink`, never a recursive delete — before anything recursively deletes a tree that
contains it. (b) **Ratchet the skip**, because this will recur and the next instance must not be
invisible: ONE arch-test asserting that when `ui/package.json` exists, `node_modules/typescript` and the
`@aof/ui` workspace link exist too — so a toolchain-less tree fails once, loudly, at a gate whose
message says "this tree cannot answer UI questions", instead of being answered `yes` by every
guard-if-present lane in the suite.

---

## 37. The desktop and web "current work" lines are two implementations, and their cross-surface gate compares SOURCE TEXT rather than BEHAVIOUR — so it is green over a branch on which they already disagree

**Status:** open (measured by the architect at milestone 49's refine, routed by
[49/ADR-010](49_milestone_terminals-home/ARCHITECTURE.md) and by
[§Codebase health finding 5](49_milestone_terminals-home/ARCHITECTURE.md); **written to this ledger at
story 49/01's structural review, which is where the routing was found to have stopped at the ADR**).
**Severity:** a satisfied-looking contract over two implementations that are already known to differ.

**What's wrong.** Three things, and the third is the one that keeps costing.

1. **The gate reads source text, not behaviour.** `crossSurfaceDriftViolations`
   (`test/arch/acd-captured-producer-fixture.test.mjs`) re-derives the JS line from each captured
   payload and asserts the **Rust SOURCE contains that literal**. A Rust file that merely *mentions*
   the string passes, whatever its functions return. The literal is satisfied by a test assertion, a
   doc comment, or a dead constant.
2. **And the two genuinely disagree on a branch it cannot reach.** For a node with runs AND free
   sessions, `view_model.rs`'s `current_work` short-circuits to `Running{..}` and never reads
   `session_repos()`, while `fleetCurrentWorkLines` renders BOTH the run line and the `(session)`
   line. The gate is green on that today. Milestone 49/ADR-010 excluded the fix from the dedupe
   story deliberately (a behaviour change inside a dedupe commit is a behaviour change nobody is
   reviewing for) — so the divergence is now *recorded* and still *live*.
3. **The gate's discovery mechanism pins fixture STORAGE to one file, and that file is growing.**
   Fixtures are found by regex over `app/desktop/crates/core/src/view_model.rs` for
   `const REAL_CAPTURED_*: &str = r#"…"#`, so every new cross-language case must add another inline
   JSON payload to that one file. Measured at story 49/01's review: **1,450 lines, of which 256 are
   production code and 1,194 are the test module**, carrying **five** embedded payloads
   (12.4 KB, 19% of the file's bytes). This story alone added +237 lines (+20%) to it, correctly and
   under the ADR. There is no per-file gate on Rust, so nothing sees this trend but a reviewer.

**How it bites.** The desktop tray and the fleet page can report different current work for the same
node from the same payload, and the one gate that exists to prevent exactly that cannot see it —
which is worse than no gate, because it is read as a satisfied contract. It is also read as one by
its own consumers: story 49/01 had to prove the gate's teeth by hand (revert the JS half, run the
HEAD gate, watch it stay GREEN over four fixtures) because *nothing in the suite could tell anyone
whether the gate covered the branch they were changing*. Coverage that has to be re-established by
experiment, once per story, is the cost this item names. And the file that must absorb every future
fixture is the same file the desktop's whole view-model lives in.

**The fix.** (a) **Make the tie behavioural** — build the crate and compare `current_work`'s rendered
output against `fleetCurrentWorkLines` over every captured fixture. If a `cargo` invocation inside
the JS suite is unacceptable (it only builds on some of the fleet's machines), have the Rust side
emit its rendered lines to a checked-in artifact that the JS gate compares, so the comparison is
between two OUTPUTS and never between an output and a source file's spelling. (b) **Decide which of
the two run-plus-session behaviours is right**; they cannot both be, and the ADR that excluded the
question named this entry as where it waits. (c) With (a) in place, fixture storage stops being
regex-discovered inline consts and can move to `app/desktop/crates/core/tests/fixtures/*.json`
(`include_str!`), which is what stops `view_model.rs` growing by one payload per cross-language case
forever. **Do (a) before (c)** — moving the fixtures under the current gate would blind it
completely.

---

## 38. Two shipped, tested RENDERING PATHS have no production producer — `unavailable` and `STATE_MOUNTING` — and each was built on a prediction that the NEXT milestone would supply one

**Status:** open (measured by the architect at milestone 49's refine as
[§Codebase health findings 4 and 6](49_milestone_terminals-home/ARCHITECTURE.md), with finding 6
folded in here deliberately; **written to this ledger at story 49/02's structural review, which is
where the routing was found to have stopped inside an immutable ADR**). Re-verified in the working
tree at that review: both mount producers pass `unavailable: null`
(`ui/src/fleet/terminal-mount.mjs`, `ui/src/board/dock-mount.mjs`), and `surfaceLoaded` is a `Shell`
prop defaulting to `true` that `ui/src/main.tsx` never passes.
**Severity:** the honest-degrade paths an operator most needs are the two that have never run.

**What's wrong.** Two instances of one species, and naming the species is more useful than either
instance alone.

1. **`unavailable` is a shipped connection state with no production producer.** Milestone 46 built
   the state, its three frozen causes, its copy/recovery pairs and its centred-block pane treatment
   (`ui/src/terminal/state-ramp.mjs`) on DESIGN DG-46-3's ruling that **milestone 49 would be its
   producer**. It is not: 49/ADR-002 rules `local-pty` panes out of scope (the session index carries
   nothing that addresses one), and the terminals home is served from the fleet origin, so
   `origins.fleet` always resolves. No surface can enter the state. Measured: the only two callers
   that could declare a cause both hard-code `unavailable: null`.
2. **`STATE_MOUNTING` is unreachable at EVERY route, and not — as it first looked — newly reachable
   at `/`.** `contentStateFor` enters it only when `surfaceLoaded === false`
   (`ui/src/app/shell-layout.mjs`); `surfaceLoaded` defaults to `true` on `Shell` and nothing passes
   it, because every surface is imported eagerly and mounted synchronously — there is no `lazy`, no
   code-split chunk, nothing that can be un-loaded. So `MountPlaceholder` and its two `animate-pulse`
   skeletons are reachable only from a harness. 49/ADR-001 does not change that: adding `landing` to
   `SURFACES` makes the route *eligible* for a state nothing can enter.

**How it bites.** A rendering path with no production producer is the UI's version of m46/ADR-007's
dead code with a live gate — *"a fitness function whose subject has no production caller is not a
weak gate, it is a FALSE one"* — applied to a UI state rather than to a function. Everything about
it is green: it is correct, it is tested, it is reasoned about in three documents. What it is not is
*exercised*, so **its first real run will be its first test**, and it will be a first test taken by
an operator in the middle of a fault — which is exactly when the honest-degrade path is the only
thing on screen. And a second consecutive "the next milestone will produce it" is how a state
becomes permanent scenery: the prediction is what should have been reviewed, and it was made twice.

**The fix.** (a) **`unavailable`'s true producer is milestone 50's "new session"/board-pane work** —
that milestone lands spike 44 sub-question 1's additive `origin` field on `GET /api/mesh/board-url`
and, with it, the first pane that can fail to resolve an origin. Until then, record the state as
*deliberately producerless* on the ramp itself rather than leaving the next reader to infer that it
works. **If milestone 50 also does not produce it, DELETE the state rather than predict it a third
time.** (b) **`STATE_MOUNTING`'s question is conditional, not live:** "should the shell shimmer at
all" becomes a real product question the day a surface is code-split, which is the obvious future
for a 20k-line bundle and is not milestone 49; its *accessibility* half is already answered for free
by `acd-motion-has-an-escape`'s CSS-block mechanism, which covers `MountPlaceholder` without opening
the file. (c) **The species is the durable part.** The cheapest general ratchet, if a third instance
appears: a producer-existence clause on the state, in the shape m46 already uses for
`sendTerminalFrame`'s producer floor — a rendering path whose set of production producers is empty
is a path that must be either produced or deleted, and either answer is better than a fourth
milestone of scenery.

---

## 39. The fitness functions have no fitness function — one arch test is now LARGER than the one m46 split for being too large, and the only thing that has ever noticed an oversized gate is a reviewer

*(Raised 2026-08-13, milestone 49/02's architect pass, while measuring what that story's own two gate
edits cost. Recorded here rather than fixed in m49: the file at the top of the list is m48's subject
and nothing in this milestone touches it.)*

**What's wrong, measured 2026-08-13 over `test/arch/*.test.mjs`:**

| | |
|---|---|
| files | **271** (254 at m46/00 — item 10 records that figure) |
| total lines | 50,754 |
| mean / median | **187 / 139** — the body of the distribution is healthy, and the count is NOT the finding |
| over 600 lines | 8 |
| over 800 | 3 |
| **over 950** | **1 — `acd-session-index-derived-not-stored.test.mjs` at 1,055** |

**Why 950 is the number that matters, and why this is a precedent rather than a taste.** m46/04
*split* `acd-fleet-terminal-input-constrained` for exactly this, and wrote the reason into the file it
extracted — *"the file had grown past 950 lines carrying [two subjects] … The cost of two subjects
under one name is not tidiness, it is READABILITY UNDER FAILURE: a red line reading `arch/42
terminal-input …` about `src/mesh-launcher.mjs`'s output arrow sends the next reviewer to the fleet
page. A gate's name is the first thing anyone reads about it"*
([acd-terminal-output-signal-source.test.mjs:8-19](../../test/arch/acd-terminal-output-signal-source.test.mjs#L8)).
That split was correct and it worked. **What did not happen is anything that would catch the next
one** — and the next one is already here, 105 lines past the threshold, in a different subject area,
unremarked.

**The shape is one this codebase has already diagnosed and already solved, one directory over.**
`acd-ui-surface-file-budget` carries `BUDGET_REQUIRED_ABOVE = 800` plus a sweep that makes **the
table itself** ratcheted, and its own comment says why that second half exists: *every prior entry
had been added by a reviewer happening to notice, and that process demonstrably missed one*
(`shell-layout.mjs`, 845 → 1,006 in a single story). `test/arch/` has **no analogue**, so the
gate directory is governed by precisely the process `ui/src` stopped trusting in m46 — which is the
particular irony worth writing down: **the files that exist to replace reviewer attention are the
ones still governed by it.**

**How it bites.** A 1,000-line gate is carrying more than one subject almost by arithmetic when the
median is 139, and a multi-subject gate fails under the wrong name. That is not hypothetical here —
it is the measured cost m46/04 paid to undo, and item 27's whole finding is that a red line nobody
can attribute is a red line that survives merges. It also compounds with item 24: the longer the
file, the more of it a blinded stripper silently deletes.

**Not to be confused with item 10**, which is about the FLAT ROOT of `test/` (no interior structure,
366 siblings) and cites `test/arch/`'s *count* as evidence that structure is a choice nobody made.
This entry is about per-file SIZE inside a directory whose interior structure is fine. Different
shape, different fix; a second entry for item 10's shape would be the duplication these reviews keep
refusing.

**The fix, and it is small.** (a) Extend `acd-ui-surface-file-budget`'s technique to `test/arch/`
**by reusing its table and its `BUDGET_REQUIRED_ABOVE` sweep rather than authoring a second budget
gate** — the threshold is the one the precedent already set (**950**, or 800 to match the sibling),
the table names the handful over it with a `why` naming the next extraction, and the sweep fails when
an unbudgeted file crosses the line. (b) The first entry is
`acd-session-index-derived-not-stored.test.mjs`, whose owner should decide whether it is one subject
or two — m46/04's split is the worked example of what that decision looks like. (c) **Do NOT budget
the file COUNT.** A ceiling on the number of arch tests would punish new gates, and new gates are the
good outcome; the recurring defect this ledger keeps recording is a gate that says too much under one
name, never too many gates. (The adjacent hazard — a *second* gate authored beside an existing one
over the same subject, which is the opposite failure — is ratcheted separately by prefix; see
49/ARCHITECTURE §Story-boundary guidance's `acd-home-*` named-set note.)

**UPDATE 2026-08-13, at 49/03's structural review — the entry now has TWO instances, and the new
number one is the file that SET the precedent.** Re-measured over `test/arch/*.test.mjs` on the
working tree:

| | at 49/02 (above) | at 49/03 |
|---|---|---|
| files | 271 | **271** |
| total lines | 50,754 | **51,540** |
| mean / median | 187 / 139 | **190 / 139** |
| over 950 | 1 | **2** |
| the largest | `acd-session-index-derived-not-stored` 1,055 | **`acd-fleet-terminal-input-constrained` 1,283**, with `acd-session-index-derived-not-stored` 1,055 second |

**Why this instance is the one that closes the argument.** 49/03's amendment took
`acd-fleet-terminal-input-constrained` from 845 to **1,283** lines — **333 past the 950 threshold**,
and it is *the same file m46/04 split at 950 for exactly this reason*, whose extracted sibling
(`acd-terminal-output-signal-source`) carries the written rationale this entry quotes. So the
precedent's own subject crossed the precedent's own line, in a milestone whose architecture log,
story record and three task features all cite that split by name, and **nothing said a word** —
which is this entry's whole thesis, delivered as a measurement rather than a prediction.

**And the growth was legitimate, which is the point.** ADR-008 rules *"One file changes"* and the
amendment genuinely generalises one clause from one surface to three; every line of it is argued and
none of it is padding. A size ratchet would not have refused this diff — it would have made the
crossing a **conversation at the review that shipped it**, which is the only outcome (a) is asking
for. **The fix is unchanged**; the table's first two entries are now known, and the second one's
`why` writes itself: part 1 (the call-site table) and part 3 (the surface sweeps) are two subjects
under one name, and the seam between them is already the file's own section rule.

---

## 40. `TerminalControl.tsx` is the SECOND file to land at exactly its ceiling — and the milestone that put it there is the one that shipped the ratchet built to see this happening

*(Raised 2026-08-13, milestone 49/05's structural review, against the committed diff `69a8060`.
Recorded here rather than fixed in m49: the extraction it asks for is the whole session lifecycle, and
that is a story's worth of work in the file this milestone has just finished editing.)*

**What's wrong, measured 2026-08-13 by the gate's own arithmetic**
(`source.split(/\r?\n/).length`, which is `wc -l` plus one):

| budgeted file | ceiling | count | headroom |
|---|---|---|---|
| `ui/src/board/DetailPanel.tsx` | 1,000 | **1,000** | **0** |
| `ui/src/terminal/TerminalControl.tsx` | 840 | **840** | **0** |
| `ui/src/config/App.tsx` | 1,300 | 1,298 | 2 |
| `ui/src/app/Shell.tsx` | 940 | 930 | 10 |

m49/ADR-001's table budgeted `TerminalControl.tsx` at **ZERO growth** and rested part of the
milestone's net-negative claim on it. It grew **+21** — roughly 90 lines of ADR-007-amendment
mechanism and grid wiring, less what moved out — and used every one.

**What WAS discharged, because the distinction is the whole entry.** The remedy
`acd-ui-surface-file-budget`'s own refusal prescribes — *"a surface gains CHILD COMPONENTS, not
blocks"* — was honoured, and in its better form: the header region moved into the **existing**
`TerminalIdentity.tsx` as `TerminalHeader`, and the fullscreen door (the adopted node, the request,
the hidden `home`, the portal) into the **existing** `TerminalFullscreenOccupant.tsx` as
`TerminalFullscreenDoor`. Both are genuine seams with real prop boundaries, no explanation was deleted
to fit (ADR-014/E3), and **the tree gained no file** — which is item 28's and item 33 fix (b)'s whole
subject, so this is strictly better than the ADR asked for. The gap is not the method; it is the
headroom.

**How it bites.** The assertion is `lines <= ceiling`, so **the next line added to either file fails
CI**. The next author to touch `TerminalControl.tsx` cannot append a branch, a comment or a prop —
they must first perform an extraction they did not plan, in a file they opened for another reason,
with none of the context of the story that used the last line. That is exactly the position
`DetailPanel.tsx` has been in since m45, and the tree now has two of them: item 33's *"no slack
anywhere to absorb a surprise"* is now true of the ONE control every terminal surface mounts.

**The fix, with the next cut NAMED rather than improvised.** Extract the **SESSION EFFECT** — the
socket lifecycle (construct, paint, resize, tear down) and the state it drives — out of
`TerminalControl.tsx`. It is the largest self-contained region left, and unlike the two regions that
moved in m49 it already has a seam a reader can see: it consumes one computed `binding` value
(`{ source, url }`) and a fixed set of refs, and nothing else in the file reaches into it. Doing that
returns the file to a size at which an ordinary edit is an ordinary edit. **Do NOT raise the ceiling
and do NOT trim comments to fit** — the first ratifies the growth this ratchet exists to question, and
the second is barred by ADR-014/E3 and is what time pressure will argue for.

---

## 41. The per-file budget ratchet reports only BREACH, never HEADROOM — so a file crossing from "comfortable" to "zero" is invisible until the diff after the one that did it

*(Raised 2026-08-13, milestone 49/05's structural review. Item 33's fix (c) was declared REQUIRED of
milestone 49 by that milestone's own ARCHITECTURE §Codebase health finding 1 — "the same story should
take it" — and it did not land.)*

**What's wrong.** `test/arch/acd-ui-surface-file-budget.test.mjs` fails when a file is **over** its
ceiling and is otherwise silent. It has no warning band, no headroom line, no "N files within 5% of
budget" summary. Meanwhile the directory ratchet milestone 49 DID land,
`test/arch/acd-ui-directory-budget.test.mjs`, carries exactly that (`WARNING_BAND`, `nearBudget`) — so
two gates over one tree measure the same class of degradation with different instruments, and the one
covering the files nobody watches is the blind one.

**How it bites, measured the same day.** Two files now sit at **exactly** their ceilings
(`DetailPanel.tsx` 1,000/1,000, `TerminalControl.tsx` 840/840 — item 40) and two more within 1%. Every
run of this gate is GREEN and says nothing. The information a reviewer needs — *this diff took the
last line of a shared component* — exists inside the gate at the moment it runs and is thrown away, so
it reaches a human only when the NEXT story trips over it, which is the one story that had no part in
causing it. A ratchet that can only say "you are over" converts a trend into a surprise.

**The fix.** Report the band the directory gate already reports: after the per-file assertions, emit a
one-line summary naming every budgeted file within 5% of its ceiling, with its count, its headroom and
the extraction its own `why` prescribes. It is a handful of lines, it fails nothing, and it makes the
crossing a conversation at the review that caused it. (Item 33 fix (c), verbatim, still owed.)

### AMENDED 2026-08-14 (milestone 50/04's structural review) — the SAME blind spot exists on the OTHER sweep in the same file, one threshold lower, and it is the one that bites a file nobody has budgeted yet

The entry above is stated over `BUDGETS` — the per-file **ceilings**. The same gate carries a second
sweep, `BUDGET_REQUIRED_ABOVE = 800`
([acd-ui-surface-file-budget.test.mjs:172](../../test/arch/acd-ui-surface-file-budget.test.mjs#L172)),
the *declare-your-intent* line: every `ui/src` file **over** 800 lines must carry a table row. Its
comparison is `lines > BUDGET_REQUIRED_ABOVE`, and it too reports only breach.

**Measured 2026-08-14, by the gate's own arithmetic (`source.split(/\r?\n/).length`).** Milestone
50/04 delivered `ui/src/home/session-launcher.mjs` at **exactly 800** — `800 > 800` is false, so the
sweep is green and silent, and the file carries no entry, no `why` and no named next extraction. Driven:
appending two lines turns the sweep red with `ui/src/home/session-launcher.mjs (802 lines) … carry NO
budget entry`. For context it is **2.2×** the next-largest module in its directory (`page-state.mjs`,
360) and the largest file `ui/src/home/` has ever held.

**Why this band is worse than the ceiling band the entry above describes.** When a *budgeted* file hits
zero headroom the next author at least gets a refusal that names the file, its ceiling and the
extraction its `why` prescribes (item 40's shape). Here they get a refusal for a file that has none of
those, in a diff that added a comment — and the story that authored the file, made every decision about
its shape and knew what the next cut is has already shipped. The budget table's own conditionality
ruling says the entry is "imposed by the milestone that edited the file"; a threshold that only fires
*after* the line is crossed guarantees that milestone is never the one asked.

**The fix, widened.** The band summary the entry above already owes must cover BOTH sweeps: budgeted
files within 5% of their ceiling, AND unbudgeted files within 5% of `BUDGET_REQUIRED_ABOVE`. One
listing, both instruments, at the review that caused the crossing.

---

## 42. DESIGN K10's read-only title never shipped — a pane that is read-only for a NEW reason still explains itself with the fleet card's sentence

*(Raised 2026-08-13, milestone 49/05's structural review. The deferral is RATIFIED: m49/ADR-003 rules
`ui/src/terminal/input-policy.mjs` untouched by this milestone, and the fix is a signature change on a
12-dependent module for one sentence. Recorded so it does not evaporate with the milestone.)*

**What's wrong.** `READ_ONLY_LABEL_TITLE` in `ui/src/terminal/input-policy.mjs` is a single constant,
returned by `headerModel(readOnly)` and rendered as the `read-only` pill's `title` on every host. Its
sentence says this view mirrors the worker's terminal — **true of the fleet card, which is read-only
because it is a monitor, and wrong on the terminals home**, where a pane is read-only because the
fleet has **no input route to that node** and a keystroke would be swallowed at one of two hops with
no error anywhere (m49/ADR-007's measured trace). DESIGN's binding copy table asks for K10:
*"The fleet has no input route to `<nodeId>`: keystrokes would not arrive, so this pane cannot type."*
It is not delivered and the generic title survives.

**How it bites.** The read-only posture on this surface exists precisely to stop *an operator
believing a keystroke reached a worker* — that is the sentence in `input-policy.mjs`'s own header. The
pill is the signal and its explanation currently describes a different reason for a different surface.
An operator who hovers it is told the pane is a mirror, which reads as *"by design, nothing to do
here"*, when the truth is *"this node is not reachable for input"* — a fact with a cause and sometimes
a recovery. Milestone 49 is what made this branch reachable by an ordinary and large class of rows;
before it, the wrong sentence was harmless because the only read-only host was the one it described.

**The fix.** The title becomes per-mount, the same way `reason` and `readOnlyLabel` already travel as
VALUES: `mountModelFor` takes the cause — the home already computes it, `READ_ONLY_CAUSE_REASON` in
`ui/src/home/session-mount.mjs` names it per feed-axis value — and the home's mount authors the
sentence, as it authors every other sentence on this surface. The fleet card and the board dock keep
today's constant as their default, so both are byte-identical. **The condition that forces it:** the
same milestone that gives `roster-gone` its own DESIGN copy (K13 is still owed —
`ROSTER_GONE_REASON` ships as a marked placeholder), because both are one seam and doing them
separately opens a 12-dependent module twice.

## 43. The terminal's helper textarea is an UNCONDITIONAL tab stop on every host — on the fleet card that means a read-only pane captures Tab and relays nothing

**Status:** open (raised 2026-08-13 at milestone 49's `@uat` render pass, which measured the grid's
half of it on the deployed build). **Severity:** a keyboard trap on a shipped read-only surface.

**Measured, white-box, and it is two facts:**

1. `node_modules/@xterm/xterm/lib/xterm.js` — the helper textarea is created inside xterm's own
   `open()` and gets **`this.textarea.tabIndex = 0`** unconditionally. The
   `onSpecificOptionChange("disableStdin", …)` immediately beside it toggles **`readOnly`, not
   `tabIndex`** — so `disableStdin: true` produces a pane that is still a tab stop and still swallows
   the key, it just does not relay it.
2. `ui/src/terminal/TerminalControl.tsx` has **exactly one** `new Terminal(` and **one** `term.open(`,
   with no host branch between them. So whatever xterm creates, **every host gets**.

**What that means per host, measured on the deployed build:**

- **grid pane (m49)** — Tab reached the textarea at the 9th stop, **never left it** (10 further presses,
  and `Shift+Tab` did not escape), and **every press was relayed to the far end as `\t`** (8 received).
  A keyboard user tabbing past the grid types into a remote agent session. **FIXED in m49/05** —
  `if (stance.activatesPane) term.textarea?.setAttribute?.("tabindex", "-1")`, keyed on the host
  declaration, leaving the textarea **programmatically** focusable, which is what presenting and a
  byte-area click use.
- **board dock** — same stop, but the dock's inline terminal is **deliberately typeable** (m42), so its
  stop is arguably correct. Not a defect; recorded so the next reader does not "fix" it.
- **fleet card peek** — **the real inherited defect.** It declares `POSTURE_READ_ONLY`, so the textarea
  is `readOnly` **and still a tab stop**: it captures Tab, holds focus, and relays nothing. A keyboard
  user on `/fleet` who tabs into a peeked terminal is stuck in a control that cannot even accept what
  it is taking. **Not fixed** — m49/05 changed only the host that declares pane-activation, because
  fixing the card is m46's decision on m46's surface and does not belong in this milestone's last hour.

**Why no test saw it, and this is the transferable half.** m49/05's own clause asserts *"exactly one
`tabindex="0"` of twelve"* and is **true** — it measures the **roving stop**, which was always correct.
It structurally cannot see an element **xterm creates at `open()`**, because the harness's stand-in
never modelled the helper textarea at all. **Counting `tabindex` attributes on the rendered tree is not
walking the browser's sequential focus order.** The fix included teaching the stand-in to create the
textarea faithfully, which is what makes the new lane able to fail.

**Fix (fleet card):** the same one-line host-keyed guard, or — better, since it is now the second host
to need it — invert the default: the textarea is `tabindex="-1"` unless the host **declares** it a
keyboard target. One declaration in `host-model.mjs`, and the four hosts each state their own answer.

**Ratchet:** a lane that walks sequential focus order over a mounted control per host, asserting the
set of stops equals what the host declares. The m49 harness now models the textarea, so this is
writable today.

---

## 44. The fleet face's write routes are a COPY, not a shape — and three fitness functions now require the duplication in place

*(Raised 2026-08-14 at milestone 50/02's structural review. Recorded here rather than fixed in 50/02:
the extraction is a four-file change — the face plus three detectors that are written to find the
guards INSIDE each route's own branch body — and story 02's contract is one route.)*

**What's wrong, measured on the working tree at 50/02.** `POST /api/mesh/session`
([src/mesh-ui-serve.mjs:607-746](../../src/mesh-ui-serve.mjs#L607)) is 89 comment-free lines, of which
**63 are verbatim-identical to lines in the `/api/mesh/assign` branch** above it
([:409-570](../../src/mesh-ui-serve.mjs#L409)). Four blocks are copy-paste, in order:

| block | assign | session | lines |
|---|---|---|---|
| method guard → 405 | :410-413 | :608-611 | 4 |
| SECURITY T13 admission (Origin + content-type) | :423-433 | :615-625 | 11 |
| `readJsonBody` → coded 400 | :435-441 | :627-633 | 7 |
| `queryGlobalMeshStatus` → row → 404 → `existsSync` probe → 409 | :498-513 | :651-665 | 15 |
| `controlNodeId()` → 409 `control-identity-unknown` | :545-554 | :681-690 | 10 |

The workspace-resolution block is now its **THIRD** copy (`board-url`, `assign`, `session`); the T13
admission block its second.

**How it bites — and this is the half worth the entry.** The duplication is not merely tolerated, it is
**load-bearing for CI**. Three detectors read the guards out of each route's *own* branch body:

- [acd-fleet-face-single-mutation-route.test.mjs:115-125](../../test/arch/acd-fleet-face-single-mutation-route.test.mjs#L115) —
  brace-cuts each write route and searches its first 200 chars for `request.method !== "POST"`;
- [acd-fleet-board-link-resolved.test.mjs:104-107](../../test/arch/acd-fleet-board-link-resolved.test.mjs#L104) —
  requires the `.workspaces ?? []).find(` binding and its `existsSync` probe inside each route region,
  and pins the resolver list by name;
- [acd-mesh-ui-read-only.test.mjs:93-105](../../test/arch/acd-mesh-ui-read-only.test.mjs#L93) — pins the
  route table by exact name.

So the first author to hoist `admitWriteRequest(request, response)` and `resolveLocalWorkspaceRow(...)`
into one helper each makes three gates go red **for doing the right thing**, and the path of least
resistance is to copy the blocks a fourth time. A ratchet that punishes de-duplication is pointed the
wrong way: m47/ADR-011's gate was written to make the third route *comply*, and it did — it just did so
by making the third route a copy.

**The fix.** Hoist the two blocks to named helpers inside `mesh-ui-serve.mjs` (no new module — the face
is one file's concern) and **re-aim the three detectors at the helper**: assert that every write-route
branch *calls* `admitWriteRequest` before it reads a body, and that every route binding a `workspaces`
row *calls* `resolveLocalWorkspaceRow`. That is a strictly stronger statement than "the text appears in
this branch" — it cannot be satisfied by a copy that drifts — and it removes the incentive that keeps
the copies alive. Do this **before** a fourth write route is added, not after.

---

## 45. SECURITY T2's live revocation re-read is INERT on every lane — no frame builder in the tree sets `issuer`

*(Raised 2026-08-14 at milestone 50/02's structural review, found while checking 50/ADR-006 decision 4's
claim that admission alone carries revocation. It is a pre-existing, mesh-wide gap — story 02 neither
introduced nor worsened it — so it is recorded rather than charged to that story.)*

**What's wrong, read at source.**
[control-stream-server.mjs:959-963](../../src/control-stream-server.mjs#L959) is the composed dispatch
entry point, and its T2 half is:

```js
if (directive?.issuer != null && isRevokedLocal(getMeshRegistry(), directive.issuer)) {
  return { sent: false, code: "assignment-issuer-revoked" };
}
```

`grep -rn issuer src/` finds the field in `assignment-record.mjs`, `global-work-store.mjs`,
`global-mesh-query.mjs`, `mesh-assignment.mjs` and `mesh-ui-serve.mjs` — **the record and the verb**.
It appears in **no frame builder**: not `buildDirectiveFrame`
([control-stream-server.mjs:874](../../src/control-stream-server.mjs#L874), the assignment down-frame),
not the terminal-input/resume frames the router mints
([mesh-terminal-input.mjs:85,155](../../src/mesh-terminal-input.mjs#L85)), not
`buildSessionSpawnFrame`. So `directive.issuer` is `undefined` on **every** directive this control
dispatches, the guard short-circuits, and the branch has never executed in production.

**How it bites.** The comment three lines above it states the control it does not perform — *"a
directive whose `issuer` is revoked never routes, even over an admitted stream"* — and
[:1051-1055](../../src/control-stream-server.mjs#L1051) repeats it as the reason `getMeshRegistry` is
read per-decision. Revocation is therefore enforced **only at admission**
([:1145-1163](../../src/control-stream-server.mjs#L1145), where the enrollment credential is verified
against the roster). Nothing closes an already-open socket when a node is revoked, and
`directiveTargets` is cleared only on that socket's own close
([:1273-1278](../../src/control-stream-server.mjs#L1273)) — so **a peer revoked after it connected keeps
receiving every directive until it disconnects for some unrelated reason**. The dormant guard is what
makes that invisible: three separate texts (the code comment, the per-decision-read rationale, and
50/ADR-006 decision 4's *"a revoked or unadmitted control↔worker pair has no target entry"*) assert a
live control over a dead one.

**The fix — pick one, deliberately, and say which:**
(a) **Make the guard real** — stamp `issuer` (the control's own `config.mesh.nodeId`) onto every
down-frame builder, so T2's live re-read starts working as written; or
(b) **Close the socket on revocation** — the revoking verb evicts the node's `directiveTargets` entry
and terminates its stream, which makes admission genuinely sufficient and lets the dormant guard be
deleted instead of documented.
Either way, **delete or correct the three texts that describe the control that does not exist** — a
security comment that overstates is worse than none, because it is what the next reviewer trusts.

**Ratchet:** an arch test that dispatches a directive from a revoked issuer through
`dispatchDirectiveOverTargets` and asserts the refusal code — the one lane that would have failed on
day one, and that no existing suite has.

---

## 46. "Is workspace X usable on this node, and where?" has SIX derivations and no seam — and `workerHasRepo` answers a different question depending on which rung of the ladder calls it

*(Raised 2026-08-14 at milestone 50/03's structural review. Story 03 is the first consumer OUTSIDE
`mesh-worker-execution.mjs`, which is what made the shape visible; the duplication is pre-existing and
is not charged to that story.)*

**What's wrong, read at source.** Two facts are needed before any worker acts on a workspaceId:
*is the repo available here*, and *which directory is it*. Neither has a seam.

The **repoint** — `if (workspaceId !== resolveWorkspaceId(ws)) ws = await
loadWorkspace(meshCheckoutPath(workspaceId, …))` — is written out longhand at
[mesh-worker-execution.mjs:2363](../../src/mesh-worker-execution.mjs#L2363),
[:2892](../../src/mesh-worker-execution.mjs#L2892), [:3029](../../src/mesh-worker-execution.mjs#L3029),
[:3253](../../src/mesh-worker-execution.mjs#L3253), implied again at
[:713](../../src/mesh-worker-execution.mjs#L713), and now a sixth time — the first outside that module —
at [mesh-session-spawn-handler.mjs:268-281](../../src/mesh-session-spawn-handler.mjs#L268). Each copy
carries its own error code and its own comment explaining the same 2026-07-24 soak defect.

The **availability check** is worse, because it looks shared and is not.
[`workerHasRepo`](../../src/mesh-worker-execution.mjs#L319) joins `localMeshRepoPublished(ws, …)` — a
read of the **launch** workspace's `config.mesh.repo` marker, which records exactly ONE workspaceId
([:268-280](../../src/mesh-worker-execution.mjs#L268)) — with the node-workspace membership row. The
assignment lane therefore never uses it as an answer: it is rung one of a ladder
([:2284-2338](../../src/mesh-worker-execution.mjs#L2284)) that on a miss resolves a clone URL, clones
into `meshCheckoutPath`, **overlays the published marker onto the in-memory `ws`**, and only then
re-asks. Called bare, the same function means "this workspaceId is the one this daemon most recently
cloned or was launched in" — not "this repo is available here".

**How it bites.** A worker that holds a perfectly good scoped checkout for workspace X at
`~/.aof/mesh/checkouts/X` refuses a bare session on X with `session-repo-unavailable` ("workspace X is
not available on node N") as soon as it has cloned any OTHER workspace since — the launch config's
single `mesh.repo.workspaceId` slot has moved on. The failure is honest and safe (no wrong-repo shell,
which is the defect that matters), but it is a **false negative on the milestone's headline
cross-machine case**, and it is unexplainable from the operator's side: the directory is right there.
The six repoint copies are the same hazard held one step later — the next lane that forgets one opens a
shell, or a worktree, in the daemon's own repo off a correct-looking directive.

**The fix.** One exported seam, in a LEAF both sides can import (`workspace-identity.mjs` or a new
`mesh-workspace-locate.mjs` — not `mesh-worker-execution.mjs`, which the sibling lanes are forbidden to
import): `locateWorkspaceCheckout(ws, workspaceId, options) -> { available, projectRoot, ws, code }`,
with availability defined as *the membership row AND a real checkout on disk* rather than a
single-slot marker, and clone-on-miss left as an explicit opt-in the assignment lane passes and the
session lane does not. Then delete the six copies.

**Ratchet:** an arch test asserting `src/` contains at most ONE
`loadWorkspace(meshCheckoutPath(...))` call site — the shape that grew to six before anyone counted.

---

## 47. `.aof/mesh/worktrees/<name>` is an UNDISCRIMINATED keyspace, and the startup reclaim mints an assignment fact from whatever directory name it finds there

*(Raised 2026-08-14 at milestone 50/03's structural review. Measured, not inferred — probe output below.)*

**What's wrong, read at source.**
[`listStrandedWorktreeAssignments`](../../src/mesh-worker-execution.mjs#L209) enumerates every directory
under `<checkoutsRoot>/<workspaceId>/.aof/mesh/worktrees/` and returns `{ assignmentId: entry.name }` —
the directory NAME is trusted as a domain identifier, with no lookup against the assignment store and no
ownership marker in the directory. The launcher's startup reclaim
([mesh-launcher.mjs:1742-1780](../../src/mesh-launcher.mjs#L1742)) then reports each one
`failed/daemon-restarted` **through the durable outbox**, which redelivers until the control acks.

The root has exactly one documented writer — `meshWorktreePath`, whose own contract says *"never called
with anything but a real assignmentId"* ([mesh-worktree.mjs:60-64](../../src/mesh-worktree.mjs#L60)) —
but nothing enforces it. Measured with a `session-50` directory planted under a scoped checkout:

```
stranded entries the launcher would report failed/daemon-restarted: ["session-50"]
```

**How it bites.** Bounded today — `updateAssignmentState` returns `null` for an unknown id
([assignment-record.mjs:174-175](../../src/assignment-record.mjs#L174)), so no phantom row is written,
and the refused step is acked and settled rather than retried forever. What survives is per-restart,
per-directory, forever: a false `startup-reclaim` warning naming an assignment that never existed, a
durable journal step for it, and a full `listItems` + `readRuns` sweep of the checkout looking for its
run record. The real cost is that the invariant is unwritten: the SECOND writer into this root cost a
review to notice, and the F4 source guard that would have caught it
([acd-worktree-path-scoped.test.mjs:34](../../test/arch/acd-worktree-path-scoped.test.mjs#L34)) scans
`mesh-worker-execution.mjs` and nothing else, so it is structurally blind to every new caller.

**The fix.** Two halves, both small: (a) give the root a **discriminator** — either a per-lane subroot
(`.aof/mesh/worktrees/` stays assignments-only; other lanes get their own named seam and their own
`.gitignore` line) or a marker file the scan reads; and (b) make the scan **validate** rather than
infer — an entry with no matching assignment row is skipped and logged, never reported as a settled
assignment.

**Ratchet:** widen `acd-worktree-path-scoped`'s scan set from one hard-coded path to **every `src/`
module that calls `meshWorktreePath`/`meshWorktreesRoot`**, so the next lane to compose a path there
fails CI instead of needing a reviewer.

## 48. `aof:verify` accepts an `@executable` feature on a narrative claim, not on a runnable suite

**Status:** open (raised 2026-08-14 by the architect at 52/04's structural review; re-measured
2026-09-06). **Severity:** medium — it is a gate that reads green over evidence nothing re-runs.

**What's wrong.** 54/04's traceability lane joins an `@executable` scenario name to the emitted
case names that contain it, but reports at `ADVISORY_SEVERITY`
([src/work-doctor-rubric.mjs:161](../../src/work-doctor-rubric.mjs#L161)), so a story whose features cite no runnable suite still reaches `done`.

**How it bites.** 52/00, 52/01 and 52/02 shipped 1,176 `src/` lines and zero test suites, accepted
on *"fixture … green"* prose; the claims were unfalsifiable by the time anyone looked.

**The fix.** Make the join's unattributed result a gate at accept: a suite path that exists on disk
and is assembled by `scripts/test.mjs`, decided by `registrationDecision()`
([src/work-audit/census.mjs](../../src/work-audit/census.mjs)). Advisory is the right severity while
a join is new; it is not the right severity two milestones later.

## 49. "Is this item in scope?" has one home and two callers that cannot reach it

**Status:** open — **half paid by story 86** (2026-09-04; raised 2026-08-15, milestone 53's Decide
stage). **Severity:** low, down from medium — the fail-open it rested on is gone.

**What's wrong.** `nextWork`'s `inRange` (`src/work.mjs:1237-1273`) now REFUSES a story-grained shape it
cannot parse (`invalid-scope`, 400) and scopes `NN/SS` to that one story, so `find` and `next` agree; only
free text still falls through, deliberately. What REMAINS is the duplication: story 80 moved the rule into
the zero-import leaf `src/work-ref-scope.mjs` (read by `work-doctor.mjs`'s `inScope` `:757-759` and memory's
scopes), but `validateWork`'s copy (`src/work.mjs:1037-1044`) and `inRange` cannot import it — story 86
measured `src/work.mjs` AT the ADR-015 §5 reach ceiling of 24, so any leaf import reddens FF-5301. **The
fix:** the story that pays that ADR folds both callers onto the leaf.

## 52. The positional-slice ratchet only watches `test/arch/` — behavioural suites read source too

**Status:** open (raised 2026-08-15 by the architect during 52/05's structural review; **measured** over
the whole test tree). **Severity:** medium — it is the m47 species (*"a silent green over a tree that
does not honour the rule"*) surviving in the half of the tree its own sweep never looks at.

**What's wrong.** `test/arch/acd-test-suite-registration.test.mjs:178` bans the two positional-slice
shapes — a fixed character window (`code.slice(at, at + 400)`) and a slice whose end is a second
`indexOf` sentinel — because both have produced, in this repo, a confident red about a rule on a tree
that honours it and a silent green over one that does not. But its subject is `test/arch/**` only
(`:197` keys on `test/arch/${name}`). Measured 2026-08-15: **10 hits across 489 non-arch test files**,
of which ~6 are genuine source-region cuts — `test/invariant-4-amended.test.mjs:129,735`,
`test/session-spawn-outcome-lane.test.mjs:709` (a `+ 400` fixed window),
`test/work-delegation.test.mjs:161`, and the two milestone 52/05 landed.

**How it bites.** The boundary was drawn where the problem had been *seen* (fitness functions), not
where the shape can *occur*; since m52/05 behavioural suites read source as routinely as gates do, so
the sweep no longer tracks the risk. A ratchet scoped to its first sighting rather than to its species
is item 50's lesson, and it took a reviewer rather than CI to find the next two. (This entry's sharpest
instance — a positional cut over `TECH_DEBT.md` keyed on this ledger's own item numbers — was DELETED
2026-09-06 with the clause that held it: a control must not pin a backlog entry's prose.)

**The fix.** Widen `positionalSlices`'s subject from `test/arch/**` to `test/**`, with a shrink-only
ledger for the ~6 survivors (the same shape as `POSITIONAL_SLICE_LEDGER`, each entry naming its debt),
and add `markedRegion(code, open, close)` to `test/support/source-slice.mjs` so a marker-delimited cut
has a home in the one place instead of being hand-rolled at each call site. Consumers to migrate when
this is paid: the six files listed above.

## 53. Five ruled contract corrections in accepted stories — the wording is wrong, the code is right

**Status:** open (four ruled 2026-08-15 at `aof:verify 52`, a fifth added 2026-08-29 at `aof:verify 58`; raised by milestone 52 story 05's suites, each
**measured** by driving the shipped behaviour). **Severity:** low — nothing is unfalsifiable and nothing
is unguarded; every disagreement below is already driven on disk, in both readings where the readings
differ. This is wording debt in `.feature` text, not behaviour debt.

**Why it is deferred rather than fixed.** All four are corrections to the acceptance criteria of stories
**52/00 and 52/02, which are closed**. Story 52/05's own acceptance forbids "quietly rewriting the
scenario to match the code", and editing a closed story's contract at its successor's accept gate is that
move with a signature on it. The rulings are recorded so the edit is mechanical when it is picked up —
and the milestone that next touches these contracts (55, which adds anchors and enforcement over the same
loader and the same three verbs) is the natural place to pay it.

| finding | the contract text | the ruling | the correction owed |
|---|---|---|---|
| **F-52-05-A** | `52/02 · tasks/01_loops-validate.feature`, the `ran` table row *"3 well-formed records, nothing to report"* → `{ran: true, findings: 0}`, findings 0 | **Unsatisfiable by any non-empty registry.** `checkGrounding` (`src/work-loops-checks.mjs:185-199`) maps EVERY strongly-connected component to a finding — `GROUND_VALUES` admits only `exogenous`, so even a perfectly grounded component reports `loop-graph-grounded-exogenous-only`. Measured on the cleanest registry the vocabulary permits: loader 0, four checks 0, grounding 3. The code is ADR-005 as written; the row is optimistic. | Restate the row as what a clean registry actually produces — every check `ran`, the four pathology checks 0, grounding one verdict per component — or, the alternative worth considering on its merits, stop `loop-graph-grounded-exogenous-only` firing on a component whose only possible ground is the only ground the vocabulary has. `test/work-loops-commands.test.mjs:339` drives the row for everything decidable and records the deviation at the assertion. |
| **F-52-05-B** | `52/00 · tasks/02_field-value-grammar.feature:249,253` — `measurement \| unknown` and `actuator \| unknown` → `loop-bad-value` | **The loader is right.** The same table's preamble (`:225`) fixes *"per key, evaluation stops at the FIRST gate that fails"*, and its own `reference \| module:…#isRetryable` row (`:244`) applies it. A bare scalar on a list-shaped key is `loop-expected-list` and never reaches the value grammar, so no sentinel verdict is possible for it; the stated finding is the verdict for the bracketed `[unknown]` form, which the `reference \| [unknown]` row (`:242`) already carries. | Change the two rows' `finding` cell to `loop-expected-list`. `test/work-loops-value.test.mjs` already drives both readings and annotates the conflict, so the correction reds nothing. |
| **F-52-05-F** | `52/00 · tasks/02_field-value-grammar.feature:255-260` — three boundary classes with no row | **Case-design gap, not a source defect.** Each shipped guard is correct; each was proved unasserted by a surviving mutation. `periodic:0s` (the `amount > 0` guard, `src/work-loops.mjs:241`) would load as a clock with `ms: 0` and divide by zero in `checkTimescale`; the `Number.isSafeInteger(ms)` overflow guard has no row anywhere; `module:abc` with no `#` parses as `{operand:"ab", symbol:"abc"}` (`:199`). | Add the three rows (QA authored them), then the suite's assertions follow. Order matters and is the reason this is deferred rather than done: the ledger's set-equality means an assertion without its row puts the suite ahead of its contract. |
| **F-52-05-G** | `52/00 · tasks/02_field-value-grammar.feature:229-238` and `52/02 · tasks/00_loops-show.feature:151-165` | Same shape. `controlled: module:foo` — a reserved prefix failing its own grammar — falls through to `phrase` instead of `loop-bad-value`, and none of the six `controlled` rows covers it. `--id` exact-vs-substring is stated by neither the feature nor the suite, so `--id loop:a` matching `loop:ab` (`src/commands/loops-show.mjs:21`) would go unnoticed. | Add a `controlled \| module:foo` row and a `loop:a` beside `loop:ab` fixture (both proposed by QA), then assert them. |

| **F-58-02-1** | `58/02 · tasks/04_the-structural-codes-stop-the-run.feature`, the scenario *"a preference and an honest cannot-decide never stop the run"* — a registry producing `loop-layer-skipped` and `loop-timescale-not-comparable` as its **only** new findings, with a Then reading *"the run reports no errors"* | **No satisfying registry exists; the code is right.** `loop-timescale-not-comparable` is emitted only when `!bothPeriodic && !bothLayered` (`src/work-loops-checks.mjs:756-768`), `checkTimescale` walks `kind: loop` nodes alone (`:702`), and `checkReferenceOwnership` emits `loop-layer-undeclared` for **every** loop whose layer rank is not a number (`:568-571`) — a code `GATING_CODES` promotes to `error`. So the two "only new findings" cannot be produced without producing a gating third. QA measured the registry the Given describes at `error 2 / warn 23`, exit 1, against a Then reading *"the run reports no errors"*. The feature contradicts its own Examples table, which lists `loop-layer-undeclared` at `error` eight lines below. | Re-word the Given so it admits the gating third, or state that the pair is jointly reachable only alongside one. The decidable half is already mechanised — both codes resolve to `warn`, neither is in `GATING_CODES`, neither contributes to `summary.error`, and the face-only exit leg is untouched. Owed at the item that next touches this contract. |

**The generalisable half, and the reason this item is worth its space:** all four were found by *writing
the suite the contract implied and driving the shipped behaviour*, not by reading either. Three of them
(A, B, F-58-02-1) are a contract stating a rule in prose and then printing a row that violates it — **an Examples
table that contradicts its own preamble is two contracts, and the implementation follows the prose.**
The fifth instance is why this entry is now cross-milestone: the species is not milestone 52's, and
giving it one home is what stops the sixth being filed as a sibling entry nobody connects to the
other five.

---

## 54. This repo's own INSTALLED bundle copies drift from `src/bundle/`, and nothing measures it — so its agents run prompts older than the ones it ships

**Measured 2026-08-16**, at milestone 66/03's structural review, by comparing every rendered artefact
under `.aof/templates/`, `.claude/` and `.codex/` against its `src/bundle/` source byte for byte:

| | identical | different | absent |
|---|---|---|---|
| at HEAD (`6b7967d`) | **84 of 86** | 2 (`.claude/commands/aof/continue.md`, `.codex/skills/aof-continue/SKILL.md`) | 0 |
| after 66/03 | **69 of 87** | **17** | 1 |

**Nothing in the tree checks this pair.** `acd-bundle-manifest-hashes` compares **manifest ↔ source**,
which is a different question and was green in both states above; `acd-bundle-membership` checks the
descriptor. The installed↔source divergence went 2 → 18 with no gate moving.

**Why it bites here specifically, and harder than in a consuming project.** This repo dogfoods its own
bundle, and bare `aof` on PATH resolves to this working tree (see the aof-npm-link hazard) — so
`.claude/agents/*.md` are the prompts the reviewing agents are **actually executing**. A story that
edits `src/bundle/agents/aof-qa.md` does not change the QA agent reviewing it. During milestone 66 the
reviewers ran prompts that predated the rules the milestone was landing, invisibly, and the only signal
was a reviewer thinking to measure it.

**Why the fix is NOT a gate.** These files are `aof work update` / `scripts/install-local.mjs` output.
A gate creates pressure on an agent to hand-write installer output to clear it — which is the
second-home defect this milestone exists to refuse, and worse than the drift. Refreshing them
*mid-story* is worse still: it rewrites the reviewers underneath a review in progress.

**Shape of the fix:** a **warn-only** report of installed-copy drift (advisory, never gating), or a
named operator step in the deploy loop after an accept that touches `src/bundle/`. The discharge for
66/03 itself is the operator running `node scripts/install-local.mjs`, recorded in the milestone's
record rather than performed by the story.

**Related:** item 27's clause-1 row, discharged at the same review, is the matching lesson from the
other direction — a gate that `assert.equal`s inside a loop reports **one** path and hides the
population, so its ledger row named `autonomous.md` while eleven entries were stale. Fix that gate the
same way: collect the mismatches and `assert.deepEqual(stale, [])`, so the message is the population
rather than its first member.

## 55. A milestone's `ARCHITECTURE.md` has no compaction path — an append-only immutable-ADR record crosses its own doc budget by 4× and nothing routes it

**Measured 2026-08-17**, at milestone 53's ADR-015 ruling round (routed by ADR-015 §11e, landed here by
the product owner because that round was fenced to `ARCHITECTURE.md` only):

| | lines | budget | ratio |
|---|---|---|---|
| `53_milestone_loop-artifact/ARCHITECTURE.md` before ADR-015 | 3,109 | 700 | 4.4× |
| after ADR-015 | **3,857** | 700 | **5.5×** |

`aof work doctor 53` reports it as `doc-over-budget` at **warn**, every round, and has done for three
rounds — a warn that cannot be acted on is a warn that trains readers to skip the line.

**The ADR form forbids the obvious fix.** ADRs are immutable and supersession is append-only, so the
document can only grow: ADR-010 (22 rulings), ADR-014 (6) and ADR-015 (11) are each a closure round
that *had* to append rather than edit. Every one of those rounds was correct under the rule. The
budget and the form are in direct contradiction, and today the form wins silently.

**Why `STATE.md` does not have this problem:** it carries an explicit compaction rule in its own header
— *"Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow
archives."* `ARCHITECTURE.md` has no equivalent sentence and no equivalent step in `aof:verify`.

**Shape of the fix:** a per-milestone **ADR index** (id → title → status → line, at the top, so the
document is navigable without being read) plus a **superseded-ADR archive at Accept** — the ADRs whose
substance has been wholly superseded move to an `ARCHITECTURE-archive.md` sibling with their ids and
supersession pointers retained in the index, mirroring `STATE.md`'s compaction rule. The record stays
complete; the working document stays readable. The budget check then measures the live document.

**Related:** item 48 (a milestone's evidence that never landed) is the same family from the other side —
the record's *size* and the record's *truth* both degrade when nothing routes maintenance of it. ADR-015
§11a is this item's live instance: `53/VERIFICATION.md`'s thirteen-row register was wholly stale, and
two accept-blocking findings with it, in a document nobody was asked to re-read.

### THE BUDGET WAS RE-CALIBRATED TO 1,200 AT `aof:verify 58` (2026-08-29) — a decision, not a bypass

**What happened.** Milestone 58's acceptance was REFUSED by `aof work status 58 done`:
`artifact-budget-exceeded — ARCHITECTURE.md is 1140 lines, over the 700-line budget`. That gate
(`src/commands/item-status.mjs`, 58/ADR-007's "acceptance is the ONE place an artifact budget binds")
had landed **two commits earlier**, in `747c0a8f`. Milestones 52, 53, 55 and 57 were all accepted
before it existed, so 58 is the first item it has ever refused.

**The measurement that decided it.** Across this repository's 56 milestone `ARCHITECTURE.md` files,
**16 exceed 700 lines**:

| lines | milestone | | lines | milestone |
|---|---|---|---|---|
| 3,984 | 53 loop-artifact | | 1,140 | **58 supervising-loops** |
| 2,922 | 43 mesh-artifact-authority | | 1,125 | 46 terminal-control-unification |
| 2,552 | 49 terminals-home | | 1,033 | 45 ui-app-shell-routing |
| 2,232 | 47 fleet-repo-filter | | 865 | 26 distributed-runs-leasing |
| 2,103 | 38 cross-machine-worker-execution | | 766 | 24 group-enrollment |
| 2,016 | 52 loop-registry-and-graph | | 755 | 20 autonomous-run-resilience |
| 1,521 | 48 fleet-session-identity | | 751 | 35 mesh-work-assignment |
| 1,495 | 50 session-launcher | | 725 | 02 planning-init |

**A gate that 29% of the corpus fails is mis-calibrated, and that is a different fault from a corpus
that is too fat.** Both are true here, and they need separate answers. `work.doctor.budgets.architecture`
is now **1,200** in `.aof/aof.config.json` — chosen so the eight genuine outliers (1,495 → 3,984) still
fire while the milestones clustered around the healthy tail clear. The gate stays ON; the line moves to
where the evidence puts it.

**What this explicitly does NOT do, and why the entry stays open.** It does not give
`ARCHITECTURE.md` a compaction path, which is this item's actual subject. 58's own document is seven
ADRs, ten declared controls and six recorded amendments, 213 of its lines being ADR-007's story
partition — a planning artifact whose content is spent the moment the last story lands, and which
nothing routes anywhere. Raising a number is not a compaction path. The three outliers above 2,500 are
unreachable at any defensible budget and stay evidence for the fix this item asks for.

**Recorded as a departure**, in the same spirit 58 recorded its refused dead-band: a budget quietly
raised to clear a gate is the thing 58/ADR-005 §ordering warns about (*"a gate that arrives red for
unfinished work is a gate somebody switches off"*). This one is raised in the open, with the
distribution that justifies it and the limit of what it fixes stated beside it.

---

## 56. A diff-ceiling mechanised as an absolute digest freezes the future and is blind to the past — no base anchor, no update recipe, no expiry

**Status:** open (raised 2026-08-20 by the architect at 53/05's structural review; measured at
`test/arch/acd-loop-suite-registration.test.mjs:170-190`, `:233`, `:442` and
`test/arch/acd-loop-scope-guard.test.mjs:212`). **Severity:** medium.

**What's wrong.** Four ceilings in milestone 53 pin a sha-256 taken at HEAD to enforce a contract
stated as *"the tree before and after this story"*. Three consequences, all measured. **(a) Blind to
the past:** ACCEPT-02's baseline was computed over a tree already carrying an undeclared out-of-grant
edit (`test/arch/acd-loop-finding-envelope.test.mjs:271`, from 53/07's `1655251`), so the gate reports
the ceiling clean while it is breached. **(b) Relocation-blind:** permitted lines are *removed* from
the residue rather than substituted, so `acd-loop-finding-envelope.test.mjs:359` can be moved to line 1
— outside any test body — for zero problems. An assertion that no longer runs is not "narrowed"; it is
deleted. **(c) No recipe, no expiry:** the digest reds on any future legitimate edit to two *accepted
milestone-52* suites, with a message naming two hashes and no line, and nothing in the tree says how to
re-derive it. `scripts/test-unit.mjs` already demonstrates the endgame: ADR-011 asserts it
byte-unchanged, no gate enforces it, and `d5cea70` moved it from outside the milestone entirely.

**How it bites.** The instrument that certifies "nothing unauthorised moved" is the one thing nobody
re-derives, so it converges on certifying whatever was there when it was written. And because it fails
with a hash rather than a line, the cheapest response to a red is to update the constant.

**The fix.** A one home — `test/support/residue-digest.mjs` — exporting `normalizeEol(text)`,
`residueDigest(text, permittedLines)` (substituting a sentinel for permitted lines so **position is
hashed**), and `baseAnchoredDiff(text, pinnedBaseResidue, regions)` where each region carries its
`before` lines, its `after` lines and the ADR § that granted it. That reconstructs the base residue
purely — no git, no spawn — so an ungranted pre-existing edit fails as *"a region present at HEAD is
granted by nothing"*, naming the line. It also gives the failure message a line number instead of a
hash. Nine hand-pinned 64-hex literals across three m53 gates are the current population.

**Related:** item 5 (a gate that reads green-ish while not running) is the same family — an instrument
whose subject quietly stopped being what it claims to measure.

## 57. 123 of 309 arch gates hand-roll their own comment stripper, against 28 that import the one home — and the clones carry the defect the home documents

**Status:** open (raised 2026-08-20 by the architect at 53/05's structural review; measured across
`test/arch/`). **Severity:** medium.

**What's wrong.** `test/support/source-slice.mjs` is the declared one home for source cuts
(m47 / F-47-04-ARCH-2; 34 dependents, 0 dependencies). Its `stripComments` carries a specific,
documented guard: `replace(/(^|[^:])\/\/[^\n]*/g, "$1")` — the `[^:]` keeps `http://` intact,
*"without it a URL in a comment is truncated to `http:` and any slice keyed on text after it moves."*
Measured: **123** files under `test/arch/` define a local
`source.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "")` — the same function **without that
guard** — while 28 import the home. A further 31 hand-roll `\r\n` normalisation.

**How it bites.** Exactly as m47 measured for positional slices: an instrument confidently measuring
the wrong region, reporting a rule violation on a tree that honours it. The ratchet m47 built covers
*positional slices* only, so the stripper — the step that runs **before** every cut — was never swept,
and the divergent copies outnumber the home 4:1.

**The fix.** Two moves. **(1)** Extend `acd-test-suite-registration`'s ledger idiom to comment
strippers: a `LOCAL_STRIPPER_LEDGER` seeded at the measured 123, ratcheting down, so the 124th fails
CI. **(2)** Convert opportunistically — each file that already imports the home is one deleted
function. It wants its own story, because 123 conversions across gates written by a dozen milestones
will surface real behavioural differences — the same reason item 50 was routed rather than taken.

**RE-MEASURED 2026-09-02, at 63/01's structural review — the ledger was never built and the count
grew by 28.** `test/arch/` now holds **151** files defining a local `stripComments` against **52**
that import the home (was 123 against 28). The ratchet the fix names — *"seeded at the measured 123 …
so the 124th fails CI"* — does not exist, so instances 124 through 151 landed unremarked, and 63/01's
new control was on course to be the 152nd. Two things this re-measure makes visible that the original
entry could not:

- **The clones do not diverge from the home in one way, they diverge in two, and the second is worse.**
  The entry measured the missing `[^:]` URL guard. 63/01's clone *carries* that guard and inverts the
  **ordering** instead — `.replace(block).replace(line)`, where the home is line-first. That is the
  defect the home's own header documents from item **24**: a `//` comment containing `/*` opens a
  block run for a block-first stripper, and everything to the next `*/` is deleted. Demonstrated at
  the review: two ordinary line comments mentioning `/*` and `*/` silence an entire ban sweep while
  every one of that leg's non-vacuity guards still passes — the sweep reports green over source it
  never read. A clone that copies one documented guard and drops the other is evidence that the
  guards travel by transcription rather than by import, which is the case for (1) rather than (2).
- **The ratchet is now the cheap half and the conversion is the expensive half.** Seeding the ledger
  at today's 151 costs one control file and stops instance 152; converting 151 gates is still its own
  story. Splitting the fix that way makes the first half schedulable on its own, which the entry as
  written did not.

**THE ORDERING HALF IS PAID AND RATCHETED (2026-09-05, `aof:pay-debt`).** Every one of the 29 live
block-first strippers was corrected and `test/arch/acd-comment-stripper-order.test.mjs` now sweeps
`src/` · `test/` · `scripts/` · `ui/src/` for the order, with the four deliberate `trapOrder` red
probes carried in a named shrink-only baseline. So a clone may still be a clone, but it can no longer
carry THIS defect. What remains here is the duplication itself and the missing `[^:]` URL guard —
the `LOCAL_STRIPPER_LEDGER` this entry's fix (1) asks for was still never built.

**Related:** item 52 (the positional-slice ratchet only watches `test/arch/`) is the adjacent gap in
the same ratchet, and item 73 is the same transcription-not-import species one instrument over.

## 58. The one-home source cutter cannot cut member literals across `test/arch` — 31 of 309 files defeat it, every one for a tree reason

**Status:** open (raised 2026-08-20 by the developer during 53/05's fix round, after building the
source-level form and withdrawing it on measurement). **Severity:** low-medium.

**What's wrong.** `test/support/source-slice.mjs` is the declared one home for source cuts, but its
text-level cutting is not string-literal aware. Measured over all 309 files under `test/arch/`, a
`matchedBraceBody` walk of the member literals of `export const archTests = [` is cuttable for **278**
and returns NOT FOUND for **31**. Both causes are tree facts, not rule violations: **(a)** an unbalanced
`{` inside a *string* literal — e.g. `test/arch/acd-lock-read-merged.test.mjs:99` writes
`"{ not json at all"` — which the brace walk counts as a real brace; and **(b)** `stripComments` eating a
`//` that appears *inside* a string literal, taking the rest of the physical line with it, including the
literal's closing brace. Case (b) is the same root as item 57 seen from the other side: there the clones
lack the home's `http://` guard, here the home's own guard is insufficient because the token is inside a
string rather than a URL.

**How it bites.** A gate built on the source form goes red on other stories' files for a reason
unrelated to the rule it enforces — the "instrument wrong about the tree" species this repo has now ruled
on six times across milestones 45–53 (ADR-015 §§1/3/4/5/6). It bit twice inside one story: a fitness
function that reads its own family's source cannot carry literal comment tokens in fixture strings, and a
neighbouring gate's plant strings silently unbalanced a cut in a *different* gate.

**The fix.** Make the home's scanner string-literal aware: a single pass that tracks `'`/`"`/`` ` ``
(and template `${}` nesting) and skips comment starts and braces found inside a string. That is a
contained change to `stripComments`, `matchedBraceBody`, `matchedParenSpan` and `blockOrStatementAfter`,
and it strictly widens what the home can cut without loosening any predicate — the 31 NOT-FOUND files
become cuttable and nothing that cuts today changes. Until then, prefer a **runtime** read where the
contracted property is observable at runtime: 53/05's FF-5311 reads `Object.keys(entry)` over every
member of every exported runner-shaped array (309 files, 1121 members, 0 NOT FOUND), which is strictly
stronger than the source form for that property because a spread-built member is caught too.

**Related:** item 57 (123 clones of the stripper without the `http://` guard) is the same defect in the
copies; item 52 (the positional-slice ratchet only watches `test/arch/`) is the adjacent gap in the
ratchet that would otherwise have surfaced this.

---

## 59. The run-record reader now has TWO homes — `work-observe.mjs` mirrors `run-store.readRuns` to keep its zero-import leaf

**Status:** open (raised 2026-08-21 by the architect during 68/04's structural review). **Severity:**
low-medium — the two readers already disagree, and this is item 0's "same fact derived in many places"
shape recurring inside the one file the milestone chose to keep a leaf.

**What's wrong.** 68/04 adds `readItemRuns(item)` (`src/work-observe.mjs:1172-1204`), a second reader of
the run-record format that already has a single home, `run-store.readRuns(item)`
(`src/run-store.mjs:579`, the union of flat + one level of node subdirs, torn-file tolerant). The new
copy is not a verbatim mirror — it **skips the `normalizeRecord` step** and the **runId-ascending sort**
the home applies, and it reads node subdirs by raw path instead of through `runNodeRecordPath`. So the
two readers already drift on the exact dimensions (normalization, order, node path resolution) that a
single home exists to keep consistent. The module's own comment admits it: "mirroring run-store's
reader" is the tell — a mirror is a second derivation of one format.

**How it bites.** When 26/ADR-001's partitioning deepens, or a key is added to the frozen record set,
`readRuns` is updated and the mirror silently isn't. The phase rollup then reads a subtly different
"run" than every other consumer of the record. Nothing fails loudly; the numbers just quietly disagree
— the exact silent-drift class item 0 names.

**The tension that makes this a decision, not a tidy-up.** The obvious fix — `import { readRuns } from
"./run-store.mjs"` and delete the mirror — would give `work-observe.mjs` its **first import**, breaking
the measured `→ 0` outbound-edge property in `68_milestone_loop-telemetry/ARCHITECTURE.md` (§ header and
§ Story partition) that is the stated reason the 03/04/05 region cut is safe. Preserving that property
is *why* the developer mirrored instead of importing. So the two structural principles genuinely
collide: **one home per fact** (this item, and item 0's umbrella) vs **work-observe stays a zero-import
leaf** (the partition rationale).

**The fix.** Adjudicate the collision, then act:
- **If one-home wins:** import `readRuns` (and `runsDir`) from `run-store.mjs`, delete `readItemRuns`,
  and update the milestone ARCHITECTURE.md partition note + the `graph impact` header to record that
  `work-observe.mjs` now has `→ 1` (run-store). 68/03/68/05 then inherit the dependency and their
  region cuts are still disjoint-hunk (importing does not couple the *regions*), so the parallel cut
  survives; only the "imports nothing" phrasing changes.
- **If zero-import wins:** keep the mirror, but **ratchet it** — a fitness function that pins
  `readItemRuns`'s semantics to `run-store.readRuns`'s (same normalization, same order, same node-path
  resolution) so the N+1th drift fails CI instead of needing a reviewer. `pending` while the choice is
  open.

---

## 64. `test/work-loops-checks.test.mjs` is 2,563 lines covering six independent checks

**Status:** open (raised 2026-08-28 by the architect at milestone 58's refine; re-measured and
deferred 2026-09-05 at `aof:pay-debt` — the split is its own no-behaviour-change story, and item 61
still forbids the module-side seam). **Severity:** low. **Re-measured 2026-09-05: the suite holds at
2,563 lines while `src/work-loops-checks.mjs` grew 774 -> 1,284, so the ratio fell 3.3x -> 2.0x —
the module caught up with the suite rather than the suite shrinking.**

**Measured 2026-08-28**, at milestone 58's refine. Milestones 55, 57 and 58 have each added to one
file that tests six checks with nothing in common but their module.

**How it bites.** A single suite this size is where a real regression hides in a rename — which is
precisely why 58/02 was told to grow it rather than split it: splitting a 2,100-line suite inside the
story that also changes the module under test is the worst possible moment to do it. So the cost is
paid now and the debt is recorded instead.

**The fix.** Split per check id — one file each — registered in the same labelled block in
`scripts/test.mjs`, so the six subjects stop sharing one blast radius. Best done in a story that
changes no behaviour, immediately after 58 lands.

---

**RE-MEASURED 2026-08-29** at `aof:verify 58`, which is what `F-58-02-6` deferred to the milestone
gate: **2,563 lines**, up from the 2,116 recorded above (+21% in one milestone). The subject under
test, `src/work-loops-checks.mjs`, is 774 lines — so the suite is 3.3× its module and cannot be
split along the module's seams, because item **61**'s third instance says the module has none available
to it. The fix stated above is unchanged and now has a second reason: splitting per check id is the
only seam either side of this pair still has.

---

## 65. The per-kind loop-record builder is written once per suite — 10 anchor copies, 8 watcher copies, 6 arbiter copies

**Measured 2026-08-28**, at 58/00's structural review. `test/support/loop-registry-fixture.mjs` is the
shared record-builder home and exports three bases — `loopRecord()`, `actorRecord()`,
`identityRecord()` — plus `renderRecord()`. It has never gained a base for any kind added after
milestone 52, so every suite that needs one writes its own. Counted over `test/`: an anchor builder in
**4** files, a watcher builder in **6**, an arbiter builder in **3**. 58/00 alone added eight of those
copies (`test/work-loops-record.test.mjs:352-405`, `test/work-loops-value.test.mjs:~205-235`,
`test/arch/acd-arbiter-taxonomy-additive.test.mjs:79-117`), each with its own private
`render`/`renderFields58`/`fieldLine58` frontmatter renderer beside it.

**How it bites.** The copies drift silently, because nothing compares them: a `watcher58` whose
`determinism` line differs from `watcherRecord58`'s makes two suites disagree about what "a clean
watcher" is, and the disagreement surfaces as an unrelated finding count somewhere else. It is the
same species as the defect `FF-5809` was written for in this very story — a hand-maintained fixture
that three milestones each had to remember to extend — one indirection along. The fixture module's own
header states the only rule that constrains it (*the SUBJECT stays in the suite; it does not import
`src/work-loops.mjs`*), and a `kind: anchor` record spec no more violates that than `actorRecord()`
does, so nothing principled is holding the copies apart.

**The fix.** Give `loop-registry-fixture.mjs` an `anchorRecord()` / `watcherRecord()` /
`arbiterRecord()` base alongside its existing three, with `CLEAN_*_FIELDS` blocks in the schema's
authored order as the loop and actor bases already have, and delete the per-suite copies. Then ratchet
it: no test file outside the fixture module authors a `---\nid: <kind>:` frontmatter literal for a
declared node kind. 58/00's own three copies are the in-story half and are called out in its review;
the legacy copies in `anchor-taxonomy`, `watcher-node`, `watcher-independence-gate` and
`acd-watcher-taxonomy-additive` are this entry.

---

**RE-MEASURED 2026-08-29** at `aof:verify 58`, over the completed milestone rather than over 58/00
alone: an anchor record builder in **10** files, a watcher builder in **8**, an arbiter builder in
**6** — up from 4 / 6 / 3. The census grew across the milestone's remaining two stories, and 58/03's
`test/loops-supervision-face.test.mjs` authors all three kinds by itself, because a face that renders
every declared kind needs a fixture for every declared kind.

That is this entry's own prediction arriving on schedule, and it is the argument for the **ratchet**
half of the fix rather than the deletion half: deleting today's copies without the guard leaves the
count free to regrow on the next kind. The ratchet is one line — no test file outside
`test/support/loop-registry-fixture.mjs` authors a `---` / `id: <kind>:` frontmatter literal for a
declared node kind — and it is the same shape as `FF-5809`, which milestone 58 shipped for the
neighbouring instance (hand-maintained subset lists that three milestones each had to remember to
extend). One species, one home, and the precedent for the guard is already in the tree.

---

## 66. Three `work-loops-*` suites grow by a labelled block per milestone with nothing bounding them — `work-loops-value.test.mjs` 1,600 to 2,253, `work-loops-record.test.mjs` 1,373 to 2,540

**Measured 2026-08-28**, at 58/00's structural review: 1,600 lines at HEAD, **2,245** after 58/00 —
a 40% growth in one story, and now larger than the suite item **64** already records. Its sibling
`test/work-loops-record.test.mjs` moved 1,373 → 1,839 in the same diff.

**How it bites.** Exactly as item **64** describes, and the growth mechanism is the thing to name:
each milestone appends its own commented block with its own case tables, its own record builders and
its own traceability ledger, because the alternative — a sibling suite per milestone — is worse
(52/05's ledger is set-equal over 52's twenty features, so a 58 scenario cannot enter it, which is why
58/00 had to author `LEDGER_58` and `TRACED_58_TABLES` as a parallel mechanism inside the same file).
So the file grows by construction and nothing bounds it. Two ledgers and two sets of builders now live
in one file that a reader must scroll to find either.

**Why it was not fixed inside 58/00.** ADR-007 §3 assigns both suites to 58/00 precisely so no two
stories write them, and splitting a 2,245-line suite in the story that also changes the module under
test is item **64**'s own argument against doing it then.

**The fix.** Split by SUBJECT rather than by milestone — the value suite's real seams are the field
grammars (cadence, ceiling, owner, dwell, layer) — and give the traceability ledger one home that
takes a feature set as data instead of one hard-coded per milestone, so the next widening adds rows
rather than a block. Best done alongside item **64**, in a story that changes no behaviour.

---

**RE-MEASURED 2026-08-29** at `aof:verify 58`: `test/work-loops-value.test.mjs` is still **2,245**
lines — exact, because 58/00 owned it and no later story writes it — and its sibling
`test/work-loops-record.test.mjs` is **1,839**. The predicted **third home arrived**: this milestone's
coverage ledger for 58/02 lives in `test/watcher-independence-gate.test.mjs` (257 → **430** lines),
outside the `work-loops-*` family entirely. That is a consequence of 58/ADR-007 §3b assigning the
traceability leg **by file ownership rather than by subject** — the partition rule that keeps two
stories off one file also scatters one concern across three.

So the growth mechanism this entry names now has a second mode: not only *a labelled block per
milestone inside one file*, but *a new file per milestone whose owning story happens to hold the
partition's lock*. The stated fix — give the traceability ledger one home that takes a feature set as
data — addresses both, and is the half worth doing first.

---

### THIRD INSTANCE — `test/work-loops-record.test.mjs`, measured 2026-08-29 at 59/00's structural review

`test/work-loops-record.test.mjs` is **2,540 lines**, up from **1,839** in a single story (+38%) — the
sixth node kind, its ten omissions, its `audits:` grammar and the anchor's `checked:` date all landed
as one more labelled block. It is now within **23 lines** of the suite item **64** records, and the
shape this entry named is confirmed at three instances rather than two:

| suite | lines | ledgered |
|---|---|---|
| `test/work-loops-checks.test.mjs` | 2,563 | item **64** |
| `test/work-loops-record.test.mjs` | **2,540** (was 1,839 before 59/00) | **here** |
| `test/work-loops-value.test.mjs` | 2,253 (was 2,245; 59/00 touched two blocks) | this entry's original subject |

Same mechanism, verbatim: each milestone appends its own case tables, its own record builders and its
own traceability ledger, because a sibling suite per milestone is worse. 59/00 added `LEDGER_59` and
`AUDITOR_OMITS_59_CASES` beside 58's, 57's and 52's — a **fourth** parallel ledger in one file.

**Why it was not fixed inside 59/00.** 59/ADR-008 §2 assigns `test/work-loops-record.test.mjs` and
`test/anchor-taxonomy.test.mjs` to 59/00 precisely so no two stories write them, and splitting a
2,500-line suite in the story that also widens the module under test is item **64**'s own argument
against doing it then. The fix stated above is unchanged and now discharges three files, not two.

### THE RATCHET THIS INSTANCE EARNS — a stale-vocabulary-literal census

A second, sharper cost surfaced at 59/00 and belongs here because it is the same root: **a widening of
a frozen loader vocabulary reds every gate that restates that vocabulary as a literal, and nothing
enumerates them.** 59/00 declared `files:` of **6** and wrote **15**. The nine undeclared files were
each found by running a suite and watching it go red, one at a time:

`test/arch/acd-loop-vocabulary-closed.test.mjs` (FF-5203), `…acd-anchor-taxonomy-additive…` (FF-5501),
`…acd-watcher-taxonomy-additive…` (FF-5701), `…acd-arbiter-taxonomy-additive…` (FF-5801),
`…acd-registry-framework-owned…` (FF-5313), `…acd-anchor-grounding-seed…` (FF-5502),
`…acd-registry-fixture-closed…` (FF-5809), `test/work-loops-value.test.mjs`, and
`src/commands/loops-graph.mjs` (FF-5808's two-directional glyph parity).

**The search is bounded, and that half is already solved.** `aof graph impact src/work-loops.mjs`
(2026-08-29: 13,098 nodes / 31,815 edges, egress none) returns **38 dependents**, and **all nine are
inside that set** — `src/commands/loops-graph.mjs` is a dependent, not an outlier. So the recipe for
the next widening is *bound with `graph impact`, then grep the bounded set for the exported set
names*, never *grep the repository*. What the graph cannot do is **decide** which of the 38 restate a
vocabulary as a literal, because they couple through an exported set's **contents**, not its identity.

**The gate that would decide it.** An arch-test that:

- imports the loader's frozen sets from `src/work-loops.mjs` — `NODE_KINDS`, `EDGE_KEYS`,
  `ENDPOINT_SCHEMES`, `POINTER_SCHEMES`, `GROUND_VALUES`, `FIELD_KINDS`, `SENTINEL_TOKENS` and each
  `ADMITTED_KEYS.<kind>`;
- walks `src/**` and `test/**` and, for each string-array literal it finds, reports any literal that is
  a **proper subset** of one of those sets while containing **≥2** of its members;
- names the file, the set and the **missing members**, so the message is the repair instruction;
- carries a **shrink-only registered-exemption list** for the legitimate historical literals — a
  deliberately-frozen prior set is not a stale one: `PRIOR_KINDS`, `PRE_59_SIGNATURE`,
  `LAYER_KIND_58_CASES` and their siblings — with **every entry naming the milestone it belongs to**,
  the `UNREGISTERED_BASELINE` idiom `FF-5903` already uses.

Run against `e9785817^` it names all nine before a single suite is run; run against `e9785817` it is
green. **Owner: not 59** — no story in this milestone owns a cross-cutting gate over the whole test
tree, and declaring it here would park a control with nobody to land it. It belongs to the next
milestone that widens a loader vocabulary, or to **77** (harness audit) as a gate over the gates.

---

## 67. `aof work update` re-stamps `generatedAt` on EVERY lock entry, so a 2-file change lands as a 900-line diff

**Measured 2026-08-28**, at 58/01's structural review. That story ships **two** new records into
`.aof/loops/` and edits eight. Its `.aof/aof.lock.json` diff is **896 changed lines** over **141**
entries, and every one of those 141 entries now carries the *same* `generatedAt` — a single distinct
value across the whole file. The real content of the change is 33 added entries and ten changed
hashes; everything else is a timestamp rewritten for no reason.

**How it bites, in three ways that have all already happened here.**

- **A reviewer cannot see what the update did.** Finding the ten hash changes in this diff required a
  script. An asset that drifted and was silently overwritten, or an entry that vanished, is
  indistinguishable from the noise — which is precisely the failure item **54** already records from
  the other side (this repo's installed bundle copies drift and nothing measures it).
- **It manufactures merge conflicts on a file four concurrent stories all touch.** Milestone 58
  builds four stories in parallel (58/ADR-007 §2) and any of them that runs `aof work update` rewrites
  all 141 lines. Two such branches conflict on every entry rather than on the two that differ.
- **It hides collateral installs.** This story's update also landed `.aof/frozen-set.jsonc`,
  `.claude/hooks/aof/run-heartbeat-enqueue.mjs`, fourteen `.aof/templates/work/**` entries and four
  further `.aof/loops/*.md` — none of them in 58/01's `files:`, and one of them (the frozen set's
  `Edit(.aof/loops/**)` / `Write(.aof/loops/**)` permission rules, merged into `.claude/settings.json`)
  turned **two cases of `test/claude-settings-merge.test.mjs` red**. That consequence was reported as
  "pre-existing and unrelated" at build, which is exactly what a diff nobody can read produces.

**The fix.** Stamp `generatedAt` only on the entries the run actually wrote — the writer already
knows which ones, because it computes `create` / `update` / `skip` per file to decide whether to touch
the byte. A `skip` must leave its lock entry byte-identical. Then the lock diff is the change, and it
can be reviewed.

---

## 69. `aof work doctor`'s leg B — "does a runner name this control?" — has never run in this repository, because `work.controls.runners` was never set; and the rule it would run is the one milestone 59 just retired

**Status:** open (raised 2026-08-29 by the architect, in milestone 59 / story 01's structural review;
measured with `aof work doctor 59` at `b5bc1071`). **Severity:** medium — it is item 5's shape
("the gate reads green-ish while not running") inside the command that reports on gates, and it has
been silently true for every milestone since 66 shipped the check.

**What's wrong.** `src/work-doctor-controls.mjs:93` exports `RUNNERS_CONFIG_KEY =
"work.controls.runners"` — the project-declared key leg B reads to answer *"does a runner name this
cited control file?"*. `.aof/aof.config.json` in this repo does not set it. So every
`aof work doctor <ref>` run here emits, once per milestone, `control-runner-unchecked`: *"10 declared
control(s) here, and no `work.controls.runners` is configured — leg B (does a runner name this file?)
did not run, so no control here is known to be registered"*.

The honest-no-op is behaving exactly as designed (it says what did not run and what to set, rather than
passing quietly). What is wrong is that nobody ever set it, so **leg A alone has been deciding control
health across every `ARCHITECTURE.md` in the stream**: a control is "resolved" when its FILE EXISTS. A
declared control whose file exists and which no runner assembles is, to doctor, indistinguishable from a
live one — which is precisely the defect milestone 59 / story 01 was built to end (item 50; 26 suites
carrying 117 entries, invisible for a month).

**Why the obvious fix is the wrong one.** Setting `work.controls.runners: ["scripts/test.mjs"]` arms leg
B — and leg B asserts that *a runner NAMES the cited file's basename*. That is `runners.includes(basename)`:
the substring rule 59/01 retired from `acd-test-suite-registration` on the measured grounds that an
import with no spread satisfies it perfectly. Arming it would replace "not checked" with "checked by the
rule we already know is blind", which is worse than the warn.

**The shape of the fix.** 59/01 built the honest decider — `registrationDecision()` in
`src/work-audit/census.mjs`, which decides by runtime membership of the assembled array — and 59/04
ships the command that runs it. So: **leg B's registration question moves to the audit's census lane**,
and doctor either (a) drops leg B and defers the question to `aof work audit`, or (b) keeps leg B as a
pure reader of the census's answer. Doctor must not grow a `node:child_process` reach to obtain it —
66/FF-6605 and 59/FF-5905 both forbid it, and 59/ADR-002 §1's boundary is the whole point. Until that
lands the warn is the correct output, and this entry is the record that the warn is not free.

**How it bites.** A milestone accepts with ten declared controls, each `landed` because its file is on
disk; one of them is imported and never spread. `aof work doctor <ref>` reports clean-with-a-warn, the
milestone accepts, and the control is a file nobody runs — the failure this repository has already paid
for once, this time inside the check that exists to prevent it.

## 71. `scripts/test-unit.mjs` is a SECOND registration home that exports nothing, runs in no pipeline, and cannot be membership-checked

**Status:** open — **attempted and REFUSED 2026-09-06** at `aof:pay-debt`; both stated fixes turn out
to be ADR-level, which this entry did not know. **Severity:** low, down from medium — the dark
population is gone (measured below), leaving only the home.

**What's wrong.** `scripts/test-unit.mjs` declares `const tests = [` and does not export it, executes
that array at module scope, and is reached by no pipeline (`scripts/check.mjs` and both `package.json`
test scripts run `scripts/test.mjs`; `test:unit` is reachable only by being typed). So a suite
registered there and nowhere else is invisible to CI *and* to the census — which cost 122 entries once,
in the six suites 59/01 re-registered.

**Re-measured 2026-09-06, and the population is discharged:** it runs **919** cases, and **all 919** are
assembled by `scripts/test.mjs` (9,139 entries, all names distinct); its 98 suite imports are a strict
subset of that runner's 1,021. Nothing is dark today. What remains is the HOME, and the N+1 case.

**Why both stated fixes are ADR-level — the finding this pass adds.**
- **(a) Retire it.** Three landed controls read the file by path, and TWO of them —
  `acd-loop-finding-envelope` and `work-loops-coverage-ledger` — are DIGEST-FROZEN by 53/FF-5311's
  `ACCEPTED_CEILINGS`, whose permitted edit regions are each granted by a named ADR (ADR-015 §§8/10).
  Deleting the file reddens both, and repairing them means adding a region and re-stamping a residue.
- **(b) Derive it** (`import { tests } from "./test.mjs"` and filter). Importable — the runner exports
  `tests` and guards module-scope execution — but the LANE IS NOT DERIVABLE: its 919-case set is
  defined by the 98 hand-listed imports, i.e. by the second registration home itself. No predicate over
  the assembled array reproduces it (`arch/` splits 1,663 / 7,476), so (b) silently redefines what
  `npm run test:unit` runs, and the import alone costs ~3.9 s.

So the fix is a ruling — grant the ceiling edit, or redefine the lane — not a diff.

## 73. A second import-closure walker landed in `test/arch` one story after the first — 57 and 58's species, one level up

**Status:** open (raised 2026-08-30 by the architect, in milestone 59 / story 02's structural review).
**Severity:** low — both copies are correct today; the cost is that they are two rules about one thing.

**What's wrong.** Two files, landed eight days apart inside one milestone, each hand-roll "walk the
static-import closure of a module set":

- `test/arch/acd-audit-never-imports-project-code.test.mjs:109-140` (59/01) — `staticImportSpecifiers`,
  `resolveSpecifier`, `importClosure(roots, load)`, plus `walkMjs` at `:211`. Exported and INJECTABLE:
  the walk takes a `load(rel)` so it can be driven against a synthetic tree.
- `test/arch/acd-controls-never-execute.test.mjs:105-160` (59/02) — `resolveRelative`,
  `importClosureFrom(roots)`, plus `walkModules` at `:150`. Reads the filesystem directly, so its walk
  can only ever be run over the real tree — the property the first copy's own header calls out as the
  defect it shipped with ("a walk that is only ever run over the real tree is a walk nobody can plant
  against").

They also disagree on a rule: `resolveRelative` appends `.mjs` to an extensionless specifier;
`resolveSpecifier` does not. Nothing holds them equal.

**The shape of the fix.** One home under `test/support/` — the repository already keeps 61 shared
fixtures there, and `source-slice.mjs` is the precedent for a shared STRUCTURAL reader. Export the
injectable version (59/01's shape) and have both gates import it, which also gives the second gate the
plant-against-a-synthetic-tree property it currently lacks.

**How it bites.** This is TECH_DEBT 57 (123 hand-rolled comment strippers) and 58 (31 hand-rolled
source cutters) at the next level up: the second copy is cheap, the fortieth is a census. The moment to
stop is at two.

## 74. A byte-freeze control reads the working tree's LINE ENDINGS, and git normalises the change out of the diff — so an agent that rewrites a whole file flips the verdict invisibly

**Status:** open (raised 2026-08-30 by the architect at 59/03's structural review; measured on
`test/arch/acd-anchor-grounding-seed.test.mjs:49`). **Severity:** medium — it manufactures inherited
red, and the cheapest response to that red is the one move the control exists to prevent.

**What's wrong.** `arch/55 FF-5502` pins `sha256(functionBody(stripComments(source), "export function
decomposeLoopGraph(model)"))` to `14fad85d…`. That constant was taken on a `core.autocrlf=true`
Windows checkout, so it is the hash of the **CRLF** bytes. Measured over identical source:

| bytes on disk | extracted body | digest |
|---|---|---|
| CRLF (what `git checkout` writes here) | 1,227 | `14fad85d…` — the frozen constant |
| LF | 1,184 | `dd33856a…` |

The 43-byte delta is 43 line endings. `stripComments` and `matchedBraceBody` in
`test/support/source-slice.mjs` — the declared one home for cutting source for a structural gate, **55
dependents, 0 imports** (`aof graph impact`, 2026-08-30) — do not normalise, so the digest is a
property of the checkout rather than of the code.

**How it bites, and why it is worse than a flaky test.** The flip is **invisible in the diff**. With
`core.autocrlf=true` git stores LF blobs, so a tool that rewrites a whole file with LF endings produces
a working tree that fails the gate while `git status` is clean, `git diff` is empty and a fresh
`git checkout` of the very same commit passes. Measured at 59/03: `src/work-loops-checks.mjs` was
rewritten LF (every other file in that worktree stayed CRLF), FF-5502 went red, and re-checking the
file out at the same commit turned it green again. That is now the normal authoring path on this
control node — agents rewrite whole files — so this is a standing source of red that no diff explains.

The second-order cost is the real one, and item 56 already names it: *"the cheapest response to a red
is to update the constant."* A re-freeze performed to clear an EOL flip would silently accept whatever
the body had become. 59/03's developer hit exactly this red, refused the re-freeze, and mis-attributed
the cause (they measured with `git show <ref>:file`, which always yields the LF blob, so the constant
looked as though it had never matched at any ref).

**The fix — one home, not a sixth copy.** Five hand-rolled EOL normalisers already exist and the one
home has none: `acd-loop-suite-registration.test.mjs:33` (`normalize`),
`acd-loop-state-rides-the-run-record.test.mjs:40`, `acd-loop-scope-guard.test.mjs:264`,
`bundle-claude-session-hooks.test.mjs:120` (`lf`), and item 56's proposed `residue-digest.mjs`. So:

1. Export `normalizeEol(text)` from `test/support/source-slice.mjs` and call it inside
   `stripComments`, which every source-cutting gate already runs first. Item 56's fix should be
   re-homed here rather than into a new `residue-digest.mjs` sibling — that file would land beside a
   0-import module with 55 dependents that already owns "read source for a gate".
2. Re-freeze `14fad85d…` → `dd33856a…` **once**, as a declared renormalisation with the two hashes and
   the reason recorded. It is the only frozen literal affected: the other thirteen 64-hex pins in
   `test/arch/` are computed over already-normalised text.
3. **The ratchet.** A case in `acd-test-suite-registration.test.mjs` (the one gate that already asserts
   properties of the fitness-function suite itself) asserting that no `test/arch/*.mjs` feeds text read
   from disk into `createHash` without `stripComments`/`normalizeEol` in the path. The fifteenth pin
   then fails CI instead of needing an architect to notice.

**Related:** item 56 (absolute digests with no recipe and no expiry — this is its measured
failure-in-the-wild), item 57 (123 hand-rolled comment strippers against the same one home), item 8
(CRLF jamming the bundle drift-guard — the same mechanism in the product rather than in a gate).

---

## 75. FF-5809's sweep classifies by the PATH a suite spells, so a suite that reaches the shipped registry through `loadLoops` is invisible — and the dangerous lane is evadable the same way

**Status:** open (raised 2026-08-30 by the architect at 59/04's structural review; verified at source
against `src/work-loops.mjs:869-873` and `test/arch/acd-registry-fixture-closed.test.mjs:200`).
**Severity:** medium — a closure gate whose population a new suite can leave by accident, in the exact
direction the gate exists to police.

**What's wrong.** 58/FF-5809 exists to keep every test file that reaches `src/bundle/loops/` classified
into one of four lanes, so that a **hand-written subset fixture** — a registry copy that is not
endpoint-closed — cannot arrive unnoticed. It decides membership by reading each file's source and
matching the *path* the file spells:

```js
if (/bundle\/loops|"bundle",\s*"loops"/u.test(fwd(source))) namesThePath.push(file);
```

`loopsDirectory` (`src/work-loops.mjs:869-873`) does `path.resolve(value, "loops")` — the loader appends
the `loops` segment itself. So `loadLoops(path.join(root, "src", "bundle"))` reads **every shipped
record** while spelling neither pattern, and the sweep matches nothing. Two suites take that route
today and are in none of the four lanes:

| suite | line | what it reads |
|---|---|---|
| `test/arch/acd-no-uncapped-framework-loop.test.mjs` | 57 | the whole shipped registry |
| `test/arch/acd-progress-ledger-consumed.test.mjs` | 217, 251 | the whole shipped registry |

Both are confirmed by the codebase graph as real importers of the loader rather than of the closing
helper (`aof graph build .` 2026-08-30 — 13,390 nodes / 32,646 edges; `aof graph impact` reports each
one's `imports/calls →` as `src/work-loops.mjs`, not `test/support/registry-fixture.mjs`).
`path.join(BUNDLE, "loops")` — a two-line variable hop, and the idiom half of `test/arch/` already uses
for other roots — evades the pattern identically.

**And one file is in the population by PROSE.** `test/arch/acd-day-one-audit-complete.test.mjs` reaches
the registry through `loadLoops(BUNDLE)` and spells no matching path in any expression. It is swept
because line 99 contains the string `src/bundle/loops/` **inside an assertion message**. Reword that
message and a correctly-classified lane-3 file silently leaves the population — the classification of a
real suite currently depends on the wording of a sentence nobody thinks of as load-bearing.

**How it bites.** These two suites are harmless: they read the whole directory and copy nothing. The
bite is that the gate cannot tell that. A suite reaching the registry by this route is not classified
*into* the safe lanes; it is outside the population entirely, so the **dangerous** lane —
`THROUGH_THE_HELPER`, whose whole point is that a subset fixture must go through the endpoint-closing
helper — is evadable by the same accident. FF-5809's `assert.deepEqual(reaches, classified)` then passes
over a population that is missing exactly the file nobody classified. It is 56's finding one level up:
*a source-text lane is satisfied by the text it happens to look for*, which is why milestone 59 retired
the substring registration lane (ADR-003 §2) — and this is the same defect surviving in a sibling gate.

**The fix — widen the sweep to the CALL, not the path.** A file reaches the shipped registry if it
either spells the path **or** calls `loadLoops(...)` on an argument rooted at `src/bundle` (`loadLoops(`
plus a `"bundle"` literal in the same call, or the `BUNDLE` constant these files already declare). Then
**reclassify what that catches**: the two suites above land in `READS_WITHOUT_COPYING`, and any future
`loadLoops`-route suite has to be put in a lane before it can ship. The reclassification is tree-wide
rather than 59-shaped, and this is 58's control — which is why it is ledgered here rather than repaired
inside milestone 59.

Two smaller notes for whoever pays it:

1. The `fwd(source)` normalisation is already there, so the widened pattern must stay
   separator-agnostic.
2. The lane lists are hand-maintained arrays of filenames; widening the sweep without also asserting
   "every classified file is still reached" would let a stale entry sit in a lane forever. Assert both
   directions, as the current `deepEqual` already does.

**Related:** item 50 (a registration lane blinded by a comment — the same class, paid down by 59/01),
item 24 (a line comment containing `/*` blinding a source-reading gate), item 57 (123 hand-rolled
comment strippers), and 59/ADR-003 §2 (the ruling that registration is decided by runtime membership,
never by the runner's source text — the general form of this fix).

---

## 76. One config key, `work.autonomous.maxAttempts`, is read as TWO unrelated bounds — so no range can be declared for it and no proposer can step it

**Status:** open (raised 2026-08-30 at `aof:refine 61`, adopted into `61/ADR-009` §4).
**What's wrong.** It resolves to two quantities in different units: an **attempt ceiling**
(`resolveAttemptCeiling`, `src/commands/run-retry.mjs:33`; also `counters.mjs:19`, raw at
`resume.mjs:119`) and a per-(ref, phase) **drive-cycle ceiling** (`src/commands/loop.mjs:823`,
exhausted at `:1516`, documented at `:2055`).
**How it bites.** `.aof/loops/speed-thoroughness-autonomy.md:10` declares it tunable, so a ±1 step
moves two bounds at once — the compound step `61/ADR-001` §4 forbids, reported as
`step-would-be-compound`: the one refusal no budget increase can lift.
**The fix.** Two keys, each read in one place. Milestone-sized — CAP-MUT-07/08 pin `work.autonomous.*`
closed and `53/FF-5310` partitions the four resolution sites; cost in `61/ADR-009` §4/§4a.
**Related:** 68, 91, `69/FF-6901`.

---

## 77. `trial-unit-undeclared` names TWO subjects in one code — the species the acceptor's own module indicts by name

**Status:** open (raised 2026-08-30 at `aof:refine 61/06`'s feasibility pass, recorded in
`61/ADR-013` §3, and ledgered here at `aof:verify 61` — D-61-5). **Severity:** low and bounded; it
degrades a diagnostic rather than a decision. Ledgered because a debt recorded only inside an ADR is
a debt no backlog sweep will ever find.

**What's wrong.** `src/work-acceptor/rule.mjs` raises `trial-unit-undeclared` for two different
things:

- a **malformed tie rate** — thrown from `rawPairsFor` (`:258`) when the criterion's `tieRate` is not
  a rational `n/d` with integer terms;
- a **knob with no trial unit** — carried on `basket.refusal` (`:308`) when the criterion prices no
  unit beside the knob.

One is a statement about the criterion's rate; the other is a statement about a knob's entry. They
are exhausted by different edits and fixed by different people.

**Why it matters here in particular.** `src/work-acceptor/admissibility.mjs:64-67` indicts exactly
this species by name — *"one code for two subjects is a finding nobody can act on"* — and
`61/ADR-013` §3 states the discipline it breaches: each construction refusal names its own part. A
milestone whose subject is the discipline of its own machinery holding a standing breach of that
discipline is the finding, more than the diagnostic cost is.

**Why it did not block 61/06.** Both subjects are **construction** refusals: neither enters the
ruling lane under either reading, so no ordering and no membership claim depends on the split. The
two messages already differ, so the reporting face renders them apart today — what a reader cannot do
is branch on the *code*.

**The fix.** Mint a second construction code for the tie-rate case (the criterion's part), leave
`trial-unit-undeclared` naming the knob's missing unit, and carry `part:` on both as
`61/ADR-013` §3 requires. It is `rule.mjs`'s owner's work, not the face's: `61/ADR-012` §2's
sole-writer table gives 61/06 exactly one scoped line in that module, and this is not it.

**Related:** `61/ADR-013` §3 (the discipline breached and the measurement), item 76 (the milestone's
other deferred defect, ledgered the same way).

---

## 79. The bundled prompt layer grows flat and repeats itself — `continue.md` doubled in six weeks, and one graph-grounding paragraph is written three times

**Status:** open (raised 2026-09-01 at `aof:refine 71`, by the architect's codebase-health pass over
the milestone's partition, and routed here rather than paid inside 71 — `71/SPEC.md` puts
prompt-layer size reduction explicitly **out of scope**, and this ledger is where an out-of-scope
observation is supposed to land).
**Severity:** medium and compounding — nothing is broken. The cost is paid per spawn, by every agent
that reads a bundled command, and it is invisible in any test.

**What's wrong.** Two shapes, one cause: the bundle has no seam for shared prose, so a rule that
applies in several places is written out in each of them.

- **Flat growth.** `src/bundle/commands/continue.md` is **300 lines / 24,530 bytes** at HEAD.
  `71/SPEC.md`, authored 2026-08-16, measured it at **12.4 KB** — it has roughly doubled in six
  weeks, and it is read in full by every session that continues anything. `verify.md` is 20,208 and
  `refine.md` 16,872; the three commands alone are 61.6 KB of the 148 KB command layer.
- **Duplicated prose with no home.** The graph-grounding instruction — build fresh, `graph impact`
  for exact coupling, advisory-only, `present: false` means unknown, `unchanged: true` means
  current, the `graphify-missing` / `graphify-build-failed` no-op — is written **three times**, in
  `src/bundle/commands/refine.md` (~2,324 B), `src/bundle/commands/code-review.md` (~2,148 B) and
  `src/bundle/agents/aof-architect.md` (~3,116 B): **~7.6 KB of the same rule in three voices**. They
  have already drifted — only `refine.md` states the `unchanged: true` clause, and only
  `code-review.md` names `triage`.

**Why it is worse than ordinary duplication.** A prompt is not read by a compiler. Three copies of a
rule do not fail a build when they disagree; they produce three agents behaving differently, and the
one that drifted is the one nobody re-read. This is item 63's species (flat siblings, no
decomposition) crossed with the copy-drift item 73 indicts — but in the one layer where the drift is
undetectable by any control the repository owns.

**Why 71 routed it here rather than paying it.** 71 is a prompt-layer milestone whose four stories
all edit `continue.md`, so it is exactly the milestone that would be tempted to restructure it — and
`71/ADR-008` already measures the honest wave width at **one** because of that shared file. Adding a
prompt restructure would put a fifth serial beat on the critical path of a milestone whose subject
is loop cost, to fix a problem its own SPEC excluded.

**The fix.**

- **Give the bundle a shared-fragment seam first.** The rendering path (`src/work-bundle.mjs`,
  `renderBundleOutputs`) already composes shipped assets; an include directive resolved at render
  time would let one fragment land in three outputs, with the manifest's content address unchanged
  in shape. Without the seam, every other step here is a re-copy.
- **Then move the graph-grounding paragraph to one fragment** and include it in the three sites. It
  is the best first candidate: identical in intent, already drifted, and read by three different
  roles.
- **Measure the command layer the way item 10 measures `src/`.** One number per command, re-measured
  when item 10 is, so "`continue.md` doubled" is a reported fact rather than something a refine pass
  happens to notice.
- **Do not cap the file size.** A byte ceiling with no admitted decomposition is item 61's measured
  failure — a purity guard forbidding the only fix available — and it would land on whichever
  milestone next needs to state a rule.

**Related:** item 10 (`src/` root, the same species), item 63 (`test/arch/` flat siblings), item 73
(a second copy of a walker landing one story after the first), item 78 (`src/commands/`, the fastest
flat layer), and `71/ADR-008` (the health pass this was routed from).

---

## 82. A transcript-watch test rides a 2.5-iteration margin between a virtual clock and real filesystem mtimes, and settles early when the margin is eaten

**Status:** open (raised 2026-09-02 at 63/02's structural review, from a non-reproducing failure the
63/02 build observed). **Severity:** low-medium — it fails a milestone gate for a reason unrelated to
the diff under test, and this suite has already cost one 148-minute stalled run (its own header says
so).

**What's wrong.** `test/agent-session-driver-transcript.test.mjs:381` (*"a parent that finished over a
still-writing subagent is never quiet"*) drives the real watcher with `idleMs: 5_000` against a
**virtual** clock while a writer coroutine bumps a **real** file's mtime and advances that clock by
`2_000` per iteration. The watcher settles when `now() - stableSince >= idleMs`, and `stableSince`
resets only when `stat().mtimeMs` is observed to **change**. The margin is therefore
`5000 / 2000` = **two and a half** consecutive polls in which a bump is not yet visible to `stat`.
Three stale metadata reads — a write-back stall, an antivirus scan, a loaded build machine — and the
watch settles inside the 300 ms window the test asserts it must not settle in, with the message *"it
does not settle while the subagent keeps writing"*. Not reproduced in 40 isolated runs on this
machine; the mechanism and the margin are measured, the causation is the hypothesis.

**How it bites.** A red that names the thing the suite is *for* (premature completion), on a diff that
did not touch the watcher, sending the reader to look for a real defect that is not there. The
failure is also silent about its cause: the assertion cannot distinguish "the watcher settled early"
from "the filesystem did not report the bump".

**The fix.** Widen the margin rather than the timeout — `clock.advance(200)` per iteration against
`idleMs: 5_000` gives 25 tolerated stale reads at the same real-time cost, since the clock is
virtual and the loop is bounded by the 300 ms probe, not by the advance size. Better still, make the
writer advance the clock **only after observing that its own bump is visible** (`stat` the file it
just touched), which removes the filesystem from the timing argument entirely and makes the test
assert what it means: the tree moved, therefore the watch did not settle.

**CORRECTED 2026-09-02, at 63/02's behavioural review — the observed failure is in a DIFFERENT file,
and it was reproduced.** The structural review attributed the build's non-reproducing red to
`test/agent-session-driver-transcript.test.mjs:381` by mechanism alone. QA located the actual failing
assertion at `test/mesh-worker-completion-detection.test.mjs:273` (*"session-tree: an end_turn parent
over a STILL-WRITING subagent transcript is never quiet"*) and **reproduced it**: 12/12 pass in
isolation, 5 pass 1 fail under 8 busy CPU workers. Its mechanism is different — it races **real**
`setTimeout(60)` sleeps against a `pollMs: 5` poller on a **mocked** clock that jumps `IDLE + 1`
before the subagent write lands; starve the process past 60 ms and the poller observes a quiet
stretch spanning the jump. Proven not to be 63/02's: `defaultWatchTranscriptCompletion` is
byte-identical between base and branch by function-source digest.

Both entries stand. The 2.5-poll margin measured above in `agent-session-driver-transcript` is a real
latent fragility of the same species and keeps its fix; the **reproduced** instance is the
`mesh-worker-completion-detection` one, and its fix is to stop mixing a real sleep with a mocked
clock in one timing argument. The species is what matters: *a test whose verdict depends on real wall
time racing a virtual clock fails on a loaded machine and passes on a quiet one.*

**Lesson, because it cost two reviewers' time:** attributing an intermittent failure by mechanism,
without reproducing it, named the wrong file convincingly. Reproduce under load before ledgering a
flake's location.

**Related:** the same file's `WATCH_CEILING_MS` header (the 148-minute stall that motivated it), and
item 74 (a control whose verdict turns on working-tree state the diff does not show).

---

## 83. `src/mesh/worker-execution.mjs` is the mesh's god-node — HALF SPLIT at 119/04: 1,957 lines, two of four seams extracted, and the two that remain are the ones no extraction has proved

**Status:** open — **PARTIALLY DISCHARGED 2026-09-07 at `aof:verify 119`** (`m119/F-37`). Seams 2 and
1 of the four below landed at `119/04`: launch composition (`src/mesh/worker-launch.mjs`) and repo
admission (`src/mesh/worker-repo-admission.mjs`), taking the file **2,462 -> 1,957 lines**. Seams 3
and 4 — worktree lifecycle and run bracketing — did NOT, so the entry stays open with its remaining
scope narrowed to those two. The measurements below are the pre-split ones and are kept as the
baseline the split is measured against; the file's path also changed at `119/01` (`src/` gained an
interior), which is why the heading now spells it `src/mesh/`.
**2026-09-13 (`129/03` accept, 129/ADR-008 §4):** one verb of seam 3 paid the way seams 1 and 2 were —
`commitWorktreeChanges` moved to `src/mesh/worktree.mjs` (absent definition, present re-export) and
`resolveRefInWorktree` / `worktreeWorkDir` to `src/work/dispatch.mjs`, the two worker call sites
unchanged; `wc -l` **1,957 → 1,914** (−43), `SINK_CEILING` lowered in step. Seam 3's remainder (mint,
base resolution, push-before-remove, retention) and seam 4 are still here; the entry stays open.

**The central argument has been answered once.** This entry argued that the correct process for
growing this file is cheaper than splitting it. `119/04` split it without a behaviour change, holding
the exported surface identical in both directions against the frozen names, and the 56 dependents
were untouched by construction. That is evidence for splitting the remaining two seams, not against.

**Status (original):** open (raised 2026-09-02 at 63/03's structural review; **owed since 63's refine** —
`63/ARCHITECTURE.md#ADR-009` §5 routed the file to "a new `TECH_DEBT.md` entry" and recorded that the
entry was OWED because the architect pass that wrote §5 may write only architecture and story
documents. It has now been owed across two stories. This is that entry). **Severity:** medium — it has
shipped no defect attributable to size alone, and it is the single point through which every mesh
worker behaviour passes, so the blast radius of *any* change to it is the whole fleet.

**What's wrong — measured, with the commands.**

- **Size.** `git show <ref>:src/mesh-worker-execution.mjs | wc -l` — **2,377** before 63/03, **2,462**
  after. `git ls-files "src/*.mjs" | xargs wc -l | sort -rn | head` puts it **first in the tree**, 459
  lines clear of the runner-up (`src/mesh-launcher.mjs`, 1,918) and 999 clear of the module it drives
  (`src/agent-session-driver.mjs`, 1,463).
- **Fan-in.** `aof graph impact src/mesh-worker-execution.mjs` (graph built 2026-09-02T02:31:09Z,
  14,277 nodes / 34,852 edges, egress none) reports **54 dependents**: 4 under `src/`+`scripts/`
  (`src/mesh-launcher.mjs`, `src/global-node-registry.mjs`, `src/mesh-clone-credential-provider.mjs`,
  `scripts/pin-checkout-id.mjs`), **48 test suites** and **2** `test/support` fixtures. Against **29**
  outbound edges. It is the mesh's god-node on both axes at once, which is rarer and worse than being
  merely large: a hub with high fan-in AND high fan-out has no side you can change cheaply.
- **The 48-suite fan-in is itself a control surface.** `test/agent-session-driver-door.test.mjs`
  maintains a hand-written CENSUS of that number (`suites.length === 48`, was 46), so every story that
  adds a suite touching this module must also edit a census literal in a file it does not own — the
  species 119/ADR-003 rules on (item 81, discharged at chore 120; that census is now a floor plus a
  per-member property, so a new suite edits nothing), with this module as its subject.
- **The growth is not monotonic, and that is the useful fact.** Sampled with
  `git log --format="%H %ci" -- src/mesh-worker-execution.mjs`, then `git show <h>:… | wc -l` per
  commit: **2,163** (2026-07-26, first landing) → **3,286** (2026-08-06) → **2,313** (2026-08-20, after
  `mesh-park-resume.mjs` / `run-session-capture.mjs` and friends were extracted) → **2,377**
  (2026-08-28) → **2,462** (2026-09-02). **A split has already been done once and it worked.** The file
  has regrown +149 in the twelve days since, in +12 to +85 line increments, none of which was wrong.

**How it bites.**

- **Every milestone that touches the mesh adds one additive field read here, and nobody ever removes
  one.** 63/03 is the pattern in miniature and it was a well-behaved instance: ADR-006 §3 allowed
  exactly ONE additive read (`Object.hasOwn(directive, "launch")`) and ADR-012 §3 placed one composer
  beside it, +85 lines, correctly fenced and correctly reviewed. Do that six more times and the file is
  at 3,000 again with nothing individually to point at. **The per-diff review cannot see this; only the
  trend line can, and this entry is the trend line.**
- **The size ratchet becomes an ADR toll booth.** `test/arch/acd-session-driver-single-home.test.mjs`
  holds `SINK_CEILING`, whose own failure message says raising it is "an ADR decision, not a diff".
  63/03 raised it 2377 → 2462 and wrote the reason into the constant's comment, which is the right
  behaviour — but it means the correct process for growing this file is now *cheaper than splitting
  it*, and a ratchet that only ever moves up is a ratchet measuring rather than resisting.
- **A 54-dependent hub makes every refactor a fleet-wide event.** The extraction that took it from
  3,286 to 2,313 is proof the work is tractable; the 48 suites and 4 source dependents are proof it is
  not cheap. It gets more expensive per milestone, never less.

**The fix — the shape, not the diff.** The module is not one concern; it is a stack of them held
together by one `assignmentId`. Read at 63/03's review, the seams are visible and they do not cross:

1. **repo admission** — `workerHasRepo`, clone-on-miss, the clone-credential/clone-url pulls, the
   scoped-checkout repoint (roughly `:1400`–`:1510`).
2. **launch composition** — the directive's `command`/`launch` reads and
   `composeDirectiveLaunchOptions` (63/03's own +85; already a self-contained pure-ish unit).
3. **worktree lifecycle** — mint, base-branch/base-commit resolution, push-before-remove, retention.
4. **run bracketing and reporting** — run records, status frames, the live-PTY registries, withdraw,
   park/resume, cleanup.

(2) is the cheapest first cut and is already shaped for it. (1) is the largest single block and has
its own delivered controls (`acd-assignment-repo-availability-loud`). Neither needs the driver to
move, and neither touches `createMeshWorkerExecutionHandler`'s exported surface, so the 54 dependents
are untouched by construction — which is what makes this a real refactor rather than a rewrite.

**What NOT to do.** Do not soften `SINK_CEILING` and do not delete it. Its whole value is that raising
it costs an ADR sentence, and the sentences are the evidence base of this entry. Do not add a fifth
concern to the file "because the pattern is established"; add it and cite this item, so the next
reviewer inherits the count rather than re-deriving it.

**A note on the number this entry replaces.** ADR-009 §5 and 63/03's `STORY.md` `## Notes` both
describe this file as a **"~1,700-line god-node"**. It was **2,377** lines when both sentences were
written — the figure was stale by roughly 40%, was copied from the ADR into a story contract, and was
found by the builder rather than by either reviewer. It is 63's **third** prose-census error (ADR-005
§4 said two stale artifacts, ADR-010 §5 corrected it to three, the truth was five). The measured
figures above carry their commands for exactly this reason. Item 81's closing rule generalises:
**a number in an ADR is a measurement claim and must carry the command that produced it.**

**Related:** 119/ADR-003 (item 81, discharged at chore 120 — the census in
`agent-session-driver-door.test.mjs` that this module's fan-in drives is now derived, with a floor), item 10 (`src/` root-module count — which does **not** cover this file: it counts
siblings, not sizes), item 78 (`src/commands/` flat growth — the same accretion species one directory
over), item 61 (a purity guard that forbade the only decomposition that would fix a module's size —
read it before proposing the split, because it is the failure mode this one will meet).

---

## 85. The bounded spawn seam is now shared by two families while living under one family's directory name — and the name is what a fitness function froze

**Status:** open (raised 2026-09-02 at milestone 72's architecture pass, by the decision that reuses it
rather than duplicating it). **Severity:** low today, and it is recorded because the cheap fix gets
expensive the moment a third caller arrives.
**2026-09-13 (129/02 review):** the third family has arrived — `src/loop/child-drive.mjs` reaches the
seam for every lane drive (129/ADR-005 §1), and the seam itself gained `signal`/`graceMs`/`stdin: "pipe"`
there. The trigger this entry named is now met; the remedy is unchanged (a story that moves the
`59/FF-5904` clause (B) freeze with the re-home, in one commit).

`src/work-audit/spawn.mjs` exports `runBounded({ command, args, cwd, env, deadlineMs, spawnChild })` —
an argument vector never a shell string, a deadline always, a kill inside the timer's callback, the
observed exit code handed back, and an argument-vector door that refuses a `command` carrying a shell
metacharacter or naming no file that exists. Nothing about it is audit-specific. It is simply **the
one bounded spawn in this tree that has been reviewed as one**, and `59/FF-5904` clause (B) is what
keeps it single for the audit family: `node:child_process` is imported by that module and by nothing
else in the closure.

**72/ADR-001 §5 reuses it by import** — for the declared test runner, for the declared worktree
prepare step, and for the git read behind `--scope impacted`. That is the right call: the alternative
is a second bounded spawn, which is this file's most-repeated species (items 65, 79, 81) arriving in
the one place where getting it wrong means an unbounded child process.

**The debt is the NAME, not the code.** A module under `src/work-audit/` is now on the hot path of a
command that has nothing to do with auditing, so the directory no longer describes ownership, and the
next reader looking for "how does aof spawn things" has no reason to look there. The fix is a re-home
to `src/bounded-spawn.mjs` with `src/work-audit/spawn.mjs` retired — but it is NOT free, because
`59/FF-5904`'s closure walk is anchored on the family and clause (B) names the module by position:
the re-home has to move the freeze with it, in the same commit, or the audit family loses its
single-seam guarantee silently. That is a story, not a tidy-up, which is why 72 declined to do it
inline.

**How it bites.** A third caller outside the audit family — and 72 adds three uses in one milestone —
makes "which family owns the spawn bound?" ambiguous, and an ambiguous owner is how a bound acquires
an exemption. The shape of the fix: move the module, re-anchor `FF-5904` clause (B) on the new path,
and assert the audit closure still reaches exactly one `node:child_process` import.

## 86. `scripts/test.mjs` grew 27% in three weeks and is still strictly serial — targeted selection makes it cheap to AVOID, and bounds nothing

**Status:** open (raised 2026-09-02 at milestone 72's architecture pass). **Severity:** the gate's
wall-clock is now the reason agents route around the gate, and 72 gives them a supported way to.

**Measured at HEAD, against the figure milestone 72's own SPEC recorded on 2026-08-16:**

| | 2026-08-16 (72/SPEC) | 2026-09-02 (measured) | change |
| --- | --- | --- | --- |
| `scripts/test.mjs` size | 275,100 B | **349,485 B** | **+27%** |
| static imports / graph dependencies | 728 | **948** | **+30%** |
| `*.test.mjs` files on disk | 734 | **950** | **+29%** |
| `test/arch/` controls | — | **392** | — |
| `Promise.all` / `.only` / argv filters | 0 / 0 / 0 | **0 / 0 / 0** | unchanged |

Three weeks, +74 KB, +220 imports, still one `for` loop over one flat array
(`scripts/test.mjs:4533-4549`). 72/SPEC scoped restructuring out as *"aof's own project debt, not
framework capability. Track in `TECH_DEBT.md`"* — this is that entry, with the growth rate attached
because the rate is the finding. At this slope the runner passes 400 KB before the next milestone
closes.

**How it bites, and it is not the eight minutes.** `.claude/rules/build-deploy-restart.md` already
tells every agent *never run the full suite on this machine*, and the measured consequence was 805 of
4,950 write events being throwaway scratchpad runners, the same one re-run 33×, 31×, 30×. Milestone
72 replaces that chore with `aof test`, which is strictly better — **and it removes the last pressure
on the runner's own cost.** A supported, selective, cheap path is exactly the condition under which a
serial 8-minute gate stops being anybody's problem until CI is the only thing that runs it.

**RE-MEASURED 2026-09-02 at milestone 72's third amendment round, and the bill arrived at a new
counter.** Importing `scripts/test.mjs` **without running it** assembles **8,401 entries** and costs
**3,376 ms warm / 6,520 ms cold**, resolving 8,920 specifiers. Importing ONE suite costs **18 ms warm /
139 ms cold** (`test/doctor-context-budget.test.mjs`, 10 entries). So the selective tool milestone 72
ships — the whole point of which is to make the narrow case cheap — pays a **3.4-6.5 s fixed cost
before its first assertion** in this repository, purely because the imports at `:1-3203` are static and
72/ADR-004 §1 (rightly) forbids restructuring them: `runnerImportedSuites` (`src/work-audit/census.mjs:348`)
and `REGISTRATION_IMPORT` (`test/arch/acd-loop-suite-registration.test.mjs:270`) both key on the STATIC
import form, so making them dynamic would evaporate 59/FF-5903's authority. 72/ADR-004 §6 rules that the
trade is still worth making — ~5 s on the 15.9% all-tool-wait side to remove a model turn from the 84.1%
generation side — and routes the cost **here**, because it is this runner's, not the framework's.
`aof test`'s runner is project-declared, so the fix below is what makes the narrow case fast, and
nothing in the framework blocks it.

**Shape of the fix.** Not parallelisation first: a per-suite `AOF_GLOBAL_HOME` already exists
(`scripts/test.mjs:4535-4547`), so the isolation model is compatible with workers, but the integration
lane, the `:4182` bind and the cargo lanes are not. First move is a BOUND — a declared ceiling on the
runner's own size or its assembly time, in the shape items 66 and 84 describe for their own files, so
the N+1th labelled block has something to fail against. Parallelisation is a separate story and
should be priced after 68 can report what the gate actually costs per merge.

## 87. Two inner-loop levers were declined on evidence rather than shipped — the pre-apply edit gate and the blocking write-thrash guard, both waiting on a number 68 can now produce

**Status:** open, deferred by decision (raised 2026-09-02, milestone 72/ADR-006). **Severity:** none
today; recorded so the two are re-decided from evidence rather than re-proposed from the same PRD
paragraph that first proposed them.

**(a) The pre-apply edit gate.** 72/SPEC cites SWE-agent's measured **+3 SWE-bench points** for a
lint/typecheck gate on edits, and it is real published evidence. It was declined for three reasons,
and only the third is about value. For `Edit`, the proposed content is not in the hook payload — it is
`{ old_string, new_string }` — so a gate must RE-DERIVE the harness's own patch application, and a
derivation that disagrees blocks a valid edit mid-turn with no way for the agent to tell why. For
`Write`, the content IS in the payload and `node --check` is exact and cheap, but that is a syntax
gate, and syntax errors are not this corpus's failure mode. The measured mode is *write-first 112,
batched 10, tight fix-test loop 3, at 18.0 edits per verified run* — editing without CHECKING — and a
gate that refuses bad content does not make an agent run tests. **What would make it decidable:** a
count, from 68's record, of tool calls that failed on the CONTENT of a `Write`/`Edit` rather than on a
subsequent test. If that count is material, the `Write`-only syntax gate is worth its hook.

**(b) The blocking write-thrash guard.** Its two halves have largely landed elsewhere. The doc half
binds at accept (`70/ADR-007`; `src/work-doctor-budget.mjs:57-69` fires `error` when
`ctx.acceptingRef === item.ref`, and `src/commands/item-status.mjs:95-112` throws
`artifact-budget-exceeded`). The measurement half already exists (`src/work-observe.mjs:134,175,274`,
with a thrash reason at `count >= 8`, `:299`). What remains is a PreToolUse refusal of the Nth write
to one path — and there is no third option: a warn-only PreToolUse hook is invisible to the agent, so
the choice is block or nothing. A blocked legitimate 9th edit strands the agent mid-turn, and a count
cannot tell a thrash from a large refactor. **What would make it decidable:** a distribution, not a
threshold — how often a run's per-file edit count exceeds N *and* the run went on to fail. Until the
tail is measured, an 8-write cliff is a guess wearing a guard's clothes.

## 88. The push-path askpass shim leaves a `.askpass` directory INSIDE the worktrees keyspace, and every worker restart reports it as a failed assignment through the durable outbox — item 47's species, after item 47 was closed

**Status:** open (raised 2026-09-02 at milestone 72's architecture pass, by QA's feasibility read of
72/04; **out of 72's scope** — the fix is in `src/mesh-worker-execution.mjs`, which 72/ADR-006 §5
forbids 72/04 from editing). **Severity:** a fabricated assignment fact, re-delivered until acked, on
every worker restart. **This is item 47's species arriving through a producer item 47's fix did not
cover, and item 47 is CLOSED (2026-08-15, milestone 52/05).** That is the finding.

**Read at source, in the order it happens.**

1. `buildAskpassShim(scriptsRoot, token)` ([`:608`](../../src/mesh-worker-execution.mjs#L608)) creates
   `<scriptsRoot>/.askpass/<randomUUID()>` ([`:609`](../../src/mesh-worker-execution.mjs#L609)) and
   returns `{ shimPath, cleanup: () => rm(dir, …) }` ([`:635`](../../src/mesh-worker-execution.mjs#L635))
   — the cleanup removes **only the uuid child**, so `<scriptsRoot>/.askpass/` persists by design.
2. There are two call sites and only one is inside a scanned keyspace.
   [`:894`](../../src/mesh-worker-execution.mjs#L894) (the CLONE path) passes `meshCheckoutsRoot(…)` —
   harmless. [`:696`](../../src/mesh-worker-execution.mjs#L696) (the PUSH path) passes
   **`meshWorktreesRoot(projectRoot)`**, so the residue lands at
   `<checkout>/.aof/mesh/worktrees/.askpass/`.
3. `listStrandedWorktreeAssignments` ([`:317-338`](../../src/mesh-worker-execution.mjs#L317))
   `readdir`s that directory and pushes **every** entry that `isDirectory()` as
   `{ assignmentId: entry.name }`. **There is no dotfile filter.**
4. `src/mesh-launcher.mjs:1833-1852` then emits a `startup-reclaim` log —
   *"reporting stranded worktree assignment .askpass as failed (daemon restarted — its run cannot be
   alive)"* — and calls
   `reportAssignmentSettled({ assignmentId: ".askpass", state: "failed", code: "daemon-restarted" })`
   **through the durable effect-step outbox, which redelivers until acked** (`mesh-launcher.mjs:145`,
   `:1305-1308`, `:1428`).

**How it bites.** A control node accumulates a permanent phantom assignment named `.askpass`, reported
failed on every worker restart, in a channel designed never to drop anything. Item 47's probe planted
a `session-50` directory and measured exactly this shape; 52/05 closed it by scoping the *suites*
(option (a)) rather than by making the keyspace discriminate, so **the first new directory anybody
wrote under the worktrees root re-opened it** — and that write is aof's own, shipped, on the push path.

**Shape of the fix, cheapest first.** (a) Pass a root OUTSIDE the worktrees keyspace at `:696`, as
`:894` already does — one argument, and it makes the keyspace undiscriminated-but-empty again.
(b) Give `listStrandedWorktreeAssignments` the dotfile filter it never had, so the keyspace
discriminates rather than trusting every directory name (this is item 47's option (b), still unpaid).
(c) Both, because (a) alone leaves the next writer to rediscover this and (b) alone leaves a real
directory named `.askpass` sitting where assignments live.

**One consequence already encoded, so it is not lost.** 72/FF-7207's link-and-delete census is cut at
a **worktree**, never at a **worktree ROOT**, precisely because `:635` legitimately recursive-deletes
`<worktreesRoot>/.askpass/<uuid>`. A census drawn at the root would be red on arrival against shipped,
correct code — and would then be "fixed" by weakening the census. Recorded here so the next author of
that control knows the boundary was chosen rather than missed.

## 89. Four PATH resolvers, three of them module-private, and only one handles `PATHEXT`

**Status:** open (raised 2026-09-02 at milestone 72's architecture pass, by the story that had to write
the fourth). **Severity:** low per-instance, and it is the fourth carrier of a species this file already
carries five times (items 65, 79, 81, 84, 87) — recorded because the reason it could not be paid down
in-flight is itself the finding.

**What exists, measured.** Three modules resolve an executable through `PATH`, and **all three are
module-private** — none exports its resolver:

| module | notes |
| --- | --- |
| [`src/terminal-providers.mjs:33`](../../src/terminal-providers.mjs#L33) | the **only** one that handles `PATHEXT` correctly |
| [`src/tool-store.mjs:143`](../../src/tool-store.mjs#L143) | |
| [`src/config-inspect.mjs:567`](../../src/config-inspect.mjs#L567) | |

Milestone 72/ADR-001 §5b adds a fourth in `src/work-toolchain.mjs`, knowingly. It has to: the seam it
guards (`runBounded`) refuses a shell string but passes a bare name through to the OS
(`src/work-audit/spawn.mjs:102`, a conjunction — see item 88's sibling finding in 72/ADR-001 §5), so a
declared-but-missing program surfaces as `not-started`/`ENOENT` far from its cause. The resolver in
front turns that into a coded refusal naming the declaration.

**Why it was not paid down in the story that found it.** Reuse is impossible without writing outside
72/00's declared write set — there is nothing to import. Extraction would touch three modules the
milestone does not own, and one of them (`terminal-providers.mjs`) is the only correct implementation,
so extraction is also the moment the other two would have to be re-proved against `PATHEXT`. ~18 lines
re-derived was the right call for one story; a fourth copy is not the right steady state.

**How it bites.** `PATHEXT` is the load-bearing detail and three of four get it wrong or ignore it. On
Windows `npm`, `npx`, `yarn`, `pnpm` and `vitest` are all `.cmd` shims, and Node 22 throws `EINVAL`
spawning a batch file without a shell — so a resolver that does not consult `PATHEXT` cannot even
produce an accurate *diagnosis*, let alone a resolution (72/ADR-001's Consequences). Each copy will
learn that separately, in a different repo, as a support question.

**Shape of the fix.** Export the `terminal-providers.mjs` implementation to `src/path-resolve.mjs`,
migrate the other three call sites to it, and add a fitness function asserting one `PATHEXT`-aware
resolver in `src/`. One story; the migration is mechanical and the tests already exist per call site.

## 90. The settings merge's recognition rule is blind to a PRE-MARKER copy of its own hook, so `aof work update` adds a marked duplicate beside it forever

**Status:** open (raised 2026-09-03 by the product owner, at milestone 77's refine; the detector that
finds it is 77/01 and the repair is deliberately NOT in 77 — see below). **Severity:** low in this
repository, unmeasured elsewhere — the local instance was cleaned by hand at 72/03 and the blind spot
that produced it is untouched.

**What's wrong.** The bundle's canonical hook declarations (`src/bundle/hooks/*.json`) carry no
`aofManaged` key; it is stamped on at write time by `markedEntry()` (`src/claude-settings.mjs:125-139`).
The merge (`spliceSettings`, `:254-319`) recognises as its own **only** entries carrying that marker
(`isAofEntry`, `:172-174`); a hook group whose entries lack it is treated as an operator's and left
"untouched, by reference — position preserved" (`:285`). So a copy of an aof hook written **before the
marker scheme existed** is now permanently indistinguishable from a hand-authored one, and every
`aof work update` adds its own freshly-marked copy beside it rather than recognising or retracting the
stale one. It is not transient drift; it is a structural blind spot in the recognition rule, and it
converges on two processes per event rather than on one.

**Measured.** Three duplicate pairs existed in this repo at `deb34a58` — `SessionStart`,
`UserPromptSubmit` and `SessionEnd`, each carrying one unmarked and one marked entry invoking the same
command (`aof session start` / `ping` / `end`). `ping` fires on **every user turn**, so the cost was one
extra process per turn, per session, for as long as the file had been in that state. 72/03 deleted the
three unmarked blocks by hand (`72/ADR-005 §3`), which is why the working tree measures zero pairs
today — the repair was to the FILE, never to the RULE.

**Why the obvious fix is refused, and what the admissible one is.** A collapse rule that reclaimed
unmarked entries matching a canonical declaration would also delete this repo's unmarked
`guard-test-isolation` hook (`PreToolUse`, `Bash|PowerShell`) — the guard that blocks unisolated test
runs from writing into the real `~/.aof`. `72/ADR-005 §3` refuses the change on exactly that ground:
*"the framework must never silently delete a user's hand-authored hook."* **The only admissible repair
is non-destructive SUPPRESSION** — on merge, decline to ADD a second copy when an existing entry
already invokes the same command under the same event and matcher; never delete an existing entry,
never adopt one by stamping a marker onto it. That converges on one entry without ever removing
something the operator wrote, and it leaves an operator who genuinely wants a doubled hook able to keep
it (aof simply stops adding its own).

**Two milestones reached opposite conclusions on this code, and both are recorded.** `72/ADR-005 §3`
("the merge rule is NOT changed", with the counter-pressure above) and `77/ADR-005` (detection-only,
plus this entry as the deferred repair). The operator's initial call at 77's refine was to fix the
merge inside 77; it was reversed on the architect's measurement that the repair's evidence base is
**n = 0 observed instances** in the only repository anyone has measured, because 72/03 had just cleaned
it. That is a reason to defer a repair, not a reason to believe the rule is sound.

**The trigger that should re-open this.** `audit-hook-duplicated` (77/01) firing in any repository
other than this one. That is the first evidence that the blind spot bites an install nobody hand-cleaned,
and it is the number this entry is waiting on.

---

## 91. The loop has TWO cap counters and the declared one is dead — `decideLoopPhase` is never told the cycle

**Status:** open (raised 2026-09-07 by architect, at `124/ADR-006`).
**What's wrong.** `nextDecision` passes no `cycle` at any of its 6 call sites, so `input.cycle`,
`lastPhase`, `gate` and `verifyCycle` are always `undefined`; `boundedDrive`'s cap guard never
fires there and three decider branches (`:823`, `:880`, `:923`) are unreachable. `:910` IS
reached, via the direct `decideLoop` call at `src/commands/loop.mjs:1786` — so the cap that
actually bounds this repo is the shell's private `cycles` Map.
**How it bites.** The engine's declared bound is unfalsifiable — its cap tests pass over a branch
the live path never takes — and each new cap site is written against the shell, not the decider.
**The fix.** Hand the shell's history to the engine (`cycle`, `lastPhase`, `gate`, `verifyCycle`)
and delete its duplicates; needs a ruling on module ownership. `src/commands/loop.mjs:860`
