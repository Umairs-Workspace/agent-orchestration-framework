---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: how did we decide to build it, and why that way?
  Owner: architect. A log of ADRs: numbered, IMMUTABLE, superseded-not-edited.
  Does NOT contain observable behaviour (→ task .feature files) — only the structure behind it.
-->
# 53 · The loop as a CLI artifact — Architecture Decisions

> **Inputs.** This milestone's `SPEC.md` (Objective + Scope + Out of scope — `aof work loop`, the atomic
> per-phase drivers, `--level L1|L2` with L3 declared and locked, `--resume`, the registry-optional
> Loop-Ready score, standalone operation, and `autonomous.md` reduced to a shell-out) and `RESEARCH.md`
> (measured, source-cited; every factual claim below cites it as `RESEARCH §Q…` rather than re-deriving
> it). Upstream: `wiki/planning/PRD-acd-loop-engineering.md` §Objective lever 1, §Constraints ("**the CLI
> owns the loop SHELL only**"; "**Do not duplicate loop-performance**"), §Scope. Neighbours whose
> boundaries these ADRs must not cross: `54_milestone_verification-loop/SPEC.md` (the bounded grader — 53
> supplies the declared gate order + stop conditions, 54 supplies the rubric feedback),
> `55_milestone_anchors-and-frozen-set/SPEC.md` (unlocks L3, owns the frozen set and the capability
> grant), `62_milestone_self-improvement-loop/SPEC.md` (`aof work tune`, gated on the shell's declared
> level), `63_milestone_event-driven-triggers/SPEC.md` (a trigger just calls `aof work loop`).
> `52_milestone_loop-registry-and-graph/ARCHITECTURE.md` is not a dependency but IS a pre-commitment:
> its ADR-007 §5 and ADR-008 both name 53 explicitly, and ADR-007 is honoured verbatim in ADR-007 below.
>
> **Graph grounding (measured, not inferred).** `aof graph build .` → **10,481 nodes / 25,365 edges /
> 434 communities**, `builtAt 2026-08-15T00:52:42.569Z`, egress none. `aof graph impact`:
> `src/work.mjs` — **241 dependents**, imports 4 (**the god-node**: m37 measured 35, m52 measured 240);
> `src/mesh-worker-execution.mjs` — **49 dependents** (5 in `src/`, 44 test files) and **imports 21**,
> including `run-store.mjs`, `effects/run-transitions.mjs`, `effects/assignment-transitions.mjs`,
> `mesh-worktree.mjs`, `mesh-assignment.mjs`, `mesh-presence.mjs`, `mesh-repo-marker.mjs`,
> `global-work-store.mjs`, `workspace-identity.mjs`, `terminal-providers.mjs`, `terminal-ws.mjs`,
> `work-observe.mjs`, `claude-trust.mjs`, `work.mjs`, `degrade.mjs`, `fs.mjs`;
> `src/command-core.mjs` — 102 dependents, imports 75 command modules (registration is purely additive);
> `src/run-store.mjs` — 35 dependents, imports only `degrade.mjs` + `fs.mjs`;
> `src/terminal-providers.mjs` — **4 dependents**, imports only `degrade.mjs` (a clean leaf);
> `src/terminal-ws.mjs` — 6 dependents, imports 7 (`asset-base`, `claude-trust`, `degrade`, `headroom`,
> `terminal-providers`, `terminal-sessions`, **`work.mjs`**);
> `src/work-observe.mjs` — 6 dependents, imports **nothing** (a leaf);
> `src/claude-trust.mjs` — 5 dependents, imports `degrade.mjs`;
> `src/work-doctor.mjs` — 10 dependents, imports its 4 lane modules + `work.mjs`;
> `src/work-loops-checks.mjs` — 5 dependents, imports **nothing** (a pure leaf);
> `src/spine/face.mjs` — 9 dependents; `deriveRouteTable` builds the route table FROM the registry
> (`:87-99`), `resolveRoute` longest-prefix-matches (`:104-120`), `cli.launch` is the long-lived-process
> seam (`:144-161`). These are actual edges, cited as such throughout; where a claim is inference it
> says so.
>
> **Memory recall (role-scoped, two passes, run before any ADR was written).**
> `aof work memory recall "the loop as a code-owned CLI shell, promoting a PTY session driver out of the
> mesh path, autonomy ladder, durable loop state" --area architecture --block` and a second pass on
> durable loop state / doctor scoring. Eight hits; each honoured **in writing**:
> - **ADR-013 (m38)** — "the worker's execution seam replaces `claude -p` with an INTERACTIVE claude PTY
>   session … over the EXISTING terminal-providers/node-pty seam; terminal state is an explicit
>   NEEDS_INPUT sentinel, not a one-shot JSON `terminal_reason`; the session_id is captured; a
>   needs-input session RETAINS its worktree." → **Honoured** by ADR-001: the driver is **moved, not
>   rewritten**, every exported name preserved verbatim, and the worktree-retention rule stays with the
>   assignment handler because it is an assignment fact, not a driver fact.
> - **ADR-006 (m03)** — "the board's primary action is STATE-AWARE; launching auto-runs the matching aof
>   command by TYPING it as ordinary PTY input into the spawned agent." → **Honoured** by ADR-002: the
>   new drivers type `/aof:<phase> <ref>` into a PTY exactly as m03/m38 established; nothing about how a
>   command reaches an agent changes.
> - **ADR-002 (m21)** — "the board server adds NO new write and NO command-CLI shell-out … milestone 21
>   ships ZERO new board mutation." → **Honoured** by ADR-004: loop state reaches the board with **zero
>   board change at all**, because it rides the run record `work:run-status` already returns whole.
> - **ADR-006 (m20)** — "dedup ('no duplicate non-terminal run per item') … anti-loop is split — a guard
>   the run records ENABLE in the store + skill-layer guidance in `autonomous.md`." → **Honoured, and
>   this one shaped a decision.** ADR-004 rejects a loop-owned run record precisely because it would
>   collide with that dedup guard; and ADR-008 moves the anti-loop *guidance* out of `autonomous.md`
>   into the shell without touching the *guard*, which stays exactly where m20 put it.
> - **ADR-007 (m52)** — "the five checks … land ONLY in `work:loops validate` — `validateWork` and
>   `work:doctor` are not edited", with the explicit pre-commitment that 53 composes them through
>   `invoke("work:loops-validate", …)` and **never by importing the loop modules**. → **Honoured
>   verbatim** by ADR-007, including the deferred-import mechanics that keep the composition off
>   TECH_DEBT item 26's registry ring.
> - **ADR-012 (m52)** — the CLI bijection gate's latent "a `work:` command's id-suffix IS its route
>   words" assumption, fixed generally in 52/02. → **Honoured and consumed**: measured at
>   `test/arch/acd-work-command-cli-bijection.test.mjs:290`, leg (b) now derives its probe from
>   `command.cli.route.join(" ")`, so this milestone's 3-word `["work","drive",<phase>]` routes are free
>   on that leg. Only `argsFor`'s `default: throw` (`:252`) still needs a case per command (ADR-005).
> - **ADR-007 (m26)** — "mesh-aware next binds only the STORY walk; the uat and zero-story-milestone
>   ready-returns are lease-BLIND … apply the injected view at EVERY ready-return." → **Honoured** by
>   ADR-003: the loop never re-implements or bypasses `nextWork`'s walk; it consumes `work:next`'s
>   result whole, so every candidacy guard m26/m27 added applies to the loop for free, at every return.
> - **ADR-009 (m46)** — "ONE xterm / ONE socket / ONE PTY … session survival ACROSS surfaces is
>   explicitly NOT promised." → **Consciously departed from in scope, not in substance**: 53 spawns no
>   UI terminal at all (ADR-001's driver is a headless-of-the-board child of the `aof` process), so
>   m46's surface-survival contract is untouched. The related promise 53 *does* make — that a loop
>   survives a machine-off — is deliberately **not** session survival: ADR-004 rules that the sessions
>   are settled and re-driven, never re-attached.

---

## ADR-001: The PTY driver is promoted by EXTRACTION into `src/agent-session-driver.mjs` — a SUBTRACTION from the 49-dependent sink, with a verbatim re-export so all 49 dependents are byte-unchanged; not a third sibling, not an import-as-is

**Status:** Accepted
**Date:** 2026-08-15

**Context.** This is the milestone's central move and the SPEC says so: *"The hard part is already built, in
the wrong place."* RESEARCH §Q1 measured the anatomy precisely. The session-driving layer —
`driveInteractiveClaudeSession` (`src/mesh-worker-execution.mjs:1463-1813`),
`resolveInteractiveDriverLaunch` (`:1397-1436`), `defaultWatchTranscriptSessionId` (`:975-1033`),
`defaultWatchTranscriptCompletion` (`:1258-1364`), `defaultPtySpawn` (`:1373`), the timing constants
(`:1093`, `:1097`, `:1383`), `HUMAN_INPUT_TOOL_NAMES` (`:1108`) and the sentinel/instruction quintet
(`:914`, `:924-930`, `:944`, `:946-952`, `:956-958`) — is **genuinely mesh-blind**: not one of those
signatures takes an `assignmentId`, a `workspaceId`, a lease or a worktree-registry handle. Its `brief` is
`{itemRef, worktreeCwd, task, command}` and its `options` is a plain injection bag.

But there is no module boundary saying so. Those functions sit in a **3,286-line** file (measured
2026-08-15; RESEARCH §Q1's `wc -l`) whose 21 top-of-file imports (`:111-154`) pull `run-store.mjs`,
`effects/run-transitions.mjs`, `effects/assignment-transitions.mjs`, `mesh-worktree.mjs`,
`mesh-presence.mjs`, `mesh-repo-marker.mjs`, `global-work-store.mjs` and `workspace-identity.mjs` in as a
**load-time side effect of importing anything at all**. A local `aof work loop` that wants only
`driveInteractiveClaudeSession` would, on every invocation, load the assignment lifecycle, the effects
ledger and a SQLite opener (`global-work-store.mjs` — one of the nineteen counted in TECH_DEBT item 12).

The decisive precedent is that **milestone 50 hit this exact wall and declined to reuse the file.**
`src/mesh-session-spawn-handler.mjs:1-9` says so in its own header — *"A SIBLING to
mesh-worker-execution.mjs, NEVER an extension of it… the widest hub in `src/`… entangled with the
ASSIGNMENT lifecycle."* RESEARCH §Q1 also measured why that precedent does **not** authorise a third
sibling here: 50's module spawns a bare operator shell (`resolveDefaultShell`), deliberately does not
import `terminal-providers.mjs`, appends no system prompt, scans no sentinel, watches no transcript, and
**has no `{outcome}`-resolving promise at all** (`mesh-session-spawn-handler.mjs:19-20, 25-26, 44-56`).
Its problem is disjoint; 53's problem is identical to m38's. A sibling here would be a **third copy of
session-driving**, which is TECH_DEBT item 0's headline failure ("the same fact derived independently,
everywhere") committed knowingly.

One further measured fact bounds the price. Of the 49 dependents, **44 are test files** and 5 are source
(`global-node-registry.mjs`, `mesh-clone-credential-provider.mjs`, `mesh-launcher.mjs`,
`scripts/pin-checkout-id.mjs`, plus the module itself in the graph's accounting). Roughly ten of those
tests import the driver symbols directly, and exactly one arch test — `acd-worker-driver-no-headless-print`
— **source-greps the file**, at six sites (`:170, :183, :217, :256, :306, :331` against `DRIVER_SOURCE`,
`:51`) and imports `driveInteractiveClaudeSession` + `NEEDS_INPUT_SENTINEL` from it (`:47`).
`src/mesh-launcher.mjs:62` imports `INTERACTIVE_COMMAND_READY_DELAY_MS` from it.

**Decision.**

**1 — The driver moves to a new module, `src/agent-session-driver.mjs`.** The moved set is **frozen** and
is exactly RESEARCH §Q1's "generic session-driving layer", plus the two runtime-dispatch members that have
no other caller:

```
MOVED (16 exported names, verbatim — no rename, no signature change, no behaviour change):
  NEEDS_INPUT_SENTINEL · NEEDS_INPUT_INSTRUCTION · DIRECTIVE_COMPLETE_SENTINEL ·
  DIRECTIVE_COMPLETE_INSTRUCTION · WORKER_SESSION_INSTRUCTION ·
  COMPLETION_IDLE_MS · DECLARED_COMPLETION_IDLE_MS · HUMAN_INPUT_TOOL_NAMES ·
  INTERACTIVE_COMMAND_READY_DELAY_MS ·
  defaultWatchTranscriptSessionId · defaultWatchTranscriptCompletion · defaultPtySpawn ·
  resolveInteractiveDriverLaunch · driveInteractiveClaudeSession ·
  buildDriverCommand · defaultSpawnRuntime
  (plus the `ensureWorktreeTrusted` re-export, which already only re-exports claude-trust.mjs
   at src/mesh-worker-execution.mjs:1442 — the house precedent for decision 2 below.)

STAYS with the assignment handler (mesh-coupled, RESEARCH §Q1's second table):
  createMeshWorkerExecutionHandler · settleStrandedRunRecords · createMeshWorkerWithdrawHandler ·
  createMeshWorkerTerminalInputHandler · createMeshWorkerTerminalResumeHandler ·
  createMeshRecoveryPushHandler · the clone/checkout/push family · registerActiveWorktree /
  clearActiveWorktree and the four module-scope assignment registries (:175, :1922-1938).
```

**2 — `src/mesh-worker-execution.mjs` re-exports the moved set verbatim.** This is the whole reason the
move is affordable: `export { … } from "./agent-session-driver.mjs";` means **every one of the 49
dependents — all 44 test files and `mesh-launcher.mjs:62` — is byte-unchanged**. The precedent is in the
file already, for the same reason, one function over: `ensureWorktreeTrusted` moved to `claude-trust.mjs`
in 2026-07-26 and is re-exported at `:1442` with the comment *"so every existing importer is untouched."*

**3 — The new module's import set is FROZEN and mesh-free.** `src/agent-session-driver.mjs` imports
`terminal-providers.mjs`, `terminal-ws.mjs`, `work-observe.mjs`, `claude-trust.mjs`, `degrade.mjs` and
node builtins — **five source modules, against the sink's twenty-one**. It imports **no** `run-store`,
**no** `effects/*`, **no** `mesh-*`, **no** `global-work-store`, **no** `workspace-identity`, **no**
`workspace`, **no** `board-*`, **no** `commands/*`.

**The honest caveat, stated rather than hidden:** `terminal-ws.mjs` itself imports `work.mjs` (graph,
2026-08-15), so the driver is not transitively free of the god-node. That is accepted and **not** worked
around: the loop command loads a workspace through `work.mjs` regardless, so the edge costs nothing new,
and severing it would mean a second node-pty spawn factory — the duplication this ADR exists to avoid.
The claim FF-5301 enforces is the precise one — **zero mesh-lifecycle imports, transitively** — not a
fictional zero-import claim.

**4 — The move is a SUBTRACTION and is measured as one.** `src/mesh-worker-execution.mjs` is 3,286 lines
today; the moved block spans roughly `:847-1851` and leaves the file near **2,400**. FF-5302 pins the
post-move count as a **shrink-only ceiling**, so the file can never grow back through this seam. This is
TECH_DEBT item 10's own prescription — *"Split `mesh-worker-execution.mjs` along its own seams… the
PTY/agent driver [is] a module"* — executed rather than deferred, and item 10's requested *"file-size
ratchet on the top-N files"* armed on the one file that most needs it.

**Alternatives considered.**

- *Import `driveInteractiveClaudeSession` from `mesh-worker-execution.mjs` as-is* — **rejected on the
  measured load cost.** Every `aof work loop` invocation would load the assignment lifecycle, the effects
  ledger and a SQLite opener; the loop command would become the 50th dependent of the widest sink in
  `src/`; and the `graph impact` blast radius of any future loop change would include all 44 mesh tests.
  It also leaves TECH_DEBT item 10's named split undone while adding a new consumer that makes it harder.
- *A third sibling module (milestone 50's precedent)* — **rejected, and 50's own reasoning is why.** 50's
  problems were disjoint from m38's (RESEARCH §Q1: no provider resolution, no system prompt, no sentinel,
  no transcript watch, no `{outcome}`). 53's problem is m38's, exactly. A sibling would be a third
  implementation of "drive an agent session to a terminal outcome" in one repo — item 0's headline
  disease, and it would immediately fork on the next tuning of `COMPLETION_IDLE_MS`.
- *Have the local loop shell out to the mesh (`aof mesh assign … --to <self>`)* — **rejected:** it
  requires a configured mesh for a local loop, contradicts `SPEC §Scope`'s "standalone operation", and
  buries a foreground operator loop inside a daemon's assignment lifecycle.
- *Move the driver AND rename `WORKER_SESSION_INSTRUCTION` to something surface-neutral* — **rejected for
  this milestone.** A rename riding a move is a second change in one diff; the identifier is pinned by
  `acd-worker-driver-no-headless-print`'s plant regex (`:318`) and by every importer's named binding. The
  cost is named: the constant now reads slightly wrong in a module both the mesh worker and the local
  loop use. That is one identifier of TECH_DEBT item 10's third shape (NAME drift), too small for its own
  entry and covered by that item's class.
- *Split further — a separate transcript-watch module, a separate sentinel module* — **rejected:** three
  modules where one suffices, with no second consumer for any of them. 52's ratchet applies in spirit:
  the third lane is what earns a directory, not the first.

**Consequences.** Exactly **one pre-existing source file** is edited by this story, and the edit is a
deletion plus a re-export line. Exactly **one pre-existing test file** is edited —
`test/arch/acd-worker-driver-no-headless-print.test.mjs` — and the edit is precisely scoped: its single
`DRIVER_SOURCE` constant becomes **two** (`DRIVER_SOURCE` → the new module, `HANDLER_SOURCE` →
`mesh-worker-execution.mjs`), with invariants 1, 2, 3, 4-producer and 6 reading the driver source and
invariant 4-surfacing and invariant 5 (the `needs-input`/`removeWorktree` branch, which is handler code)
reading the handler source. Its behavioural legs are unaffected because the import at `:47` still
resolves through the re-export. No other test file changes. `src/work.mjs` is not touched. The 44 mesh
test files keep passing byte-identically, which is the property that makes this a promotion rather than a
rewrite.

**Invariant.** `src/agent-session-driver.mjs` exports exactly the frozen 16-name set and imports no
mesh-lifecycle module (transitively, with `terminal-ws.mjs → work.mjs` the single admitted edge); it
names no `assignmentId`/`workspaceId`/`leaseId` token anywhere in its body;
`src/mesh-worker-execution.mjs` defines none of the moved symbols, re-exports all of them, and never
again exceeds its post-move line count. (Enforced by `acd-session-driver-mesh-blind`,
`acd-session-driver-single-home`.)

---

## ADR-002: The atomic per-phase drivers are a NEW `work:drive-<phase>` family on a three-word route — the shipped `work:refine|continue|verify` doors keep their contract and gain no execution path, and `resolveDirectivePhase` is untouched

**Status:** Accepted
**Date:** 2026-08-15

**Context.** `SPEC §Scope` names the atomic drivers `aof work refine|continue|verify <ref>` — and all
three ids and routes are **already taken**. RESEARCH §Q2 measured it: `createPhaseDoorCommand("continue"
| "refine" | "verify")` (`src/commands/continue.mjs:135-253`) registers `work:continue`, `work:refine`
and `work:verify` with routes `["work",<phase>]`, and they answer a **different question** — *where*
should this run. Their own header is explicit (`continue.mjs:24-26`): *"It does NOT spawn anything
itself. A local continue returns the command for the caller's own terminal to run."* The local answer is
`{where:"local", command:"/aof:<phase> <ref>"}` (`continue.mjs:183-192`); the remote answer mints a mesh
assignment (`:199-206`). Every face goes through that one door — the board's Continue button, the fleet's
assign picker, the CLI — which is m42 wave (b)'s "one door per act", bought at real cost after three
rival doors were measured diverging (`continue.mjs:3-26`).

So the fork is: grow the existing door an execution path, rename the new drivers, or find a third shape.
Growing it changes a shared contract across three commands and every caller of them. The board's Continue
button today means *"decide where, then hand me a string or a dispatch"*; if `work:continue` started
spawning, that button would start a foreground PTY on the board server's machine — the exact defect
`continue.mjs:3-8` records as the reason the door exists.

**Decision.**

**1 — A new, additive command family.** `createPhaseDriverCommand(phase)` — one factory, three registered
commands, mirroring `createPhaseDoorCommand` exactly one level over:

```
src/commands/drive.mjs
  id "work:drive-refine"    route ["work","drive","refine"]
  id "work:drive-continue"  route ["work","drive","continue"]
  id "work:drive-verify"    route ["work","drive","verify"]
```

`aof work drive continue 53/02` spawns one session running `/aof:continue 53/02` through ADR-001's
driver, watches the transcript to a terminal outcome, and returns it. `<namespace>:<hyphenated-verb>` for
a multi-word route is the house id form (52/ADR-008; `work:delegation-model` at
`src/commands/orchestrator-delegation.mjs:249`). *drive* is the PRD's own word for these
(`PRD-acd-loop-engineering.md:132` — "the *atomic* per-phase drivers `loop` composes").

**This is a recorded departure from the SPEC's spelling.** The SPEC names three verbs whose author did
not know they were taken; the *intent* — an atomic, composable, per-phase session driver — is honoured
exactly. Renaming the shipped doors instead was considered and rejected below.

**2 — The two families are complementary, and the boundary is one sentence each.**

| | answers | spawns? | who calls it |
|---|---|---|---|
| `work:<phase>` (shipped) | **WHERE** should this run — here / on `<node>` / already running | never | board button, fleet, CLI, an operator |
| `work:drive-<phase>` (new) | **RUN IT HERE**, to a terminal outcome | always | `work:loop`, a trigger (63), an operator |

`work:drive-<phase>` never decides where; `work:<phase>` never spawns. A caller that wants both composes
them — which is precisely what `work:loop` does not need to do, because the loop is by definition local
(`SPEC §Objective`: "the local loop spine").

**3 — `src/commands/continue.mjs` is NOT edited by this milestone.** No new field, no new branch, no new
return shape. Its three commands, their routes, their `{where, command}` contract and every face reading
them are untouched.

**4 — `resolveDirectivePhase` is untouched, and its meaning changes underneath it rather than in it.**
`resolveDirectivePhase(workspace, "continue", milestoneRef, …)` returns `"autonomous"`
(`continue.mjs:114-133`), so a milestone continue — local or dispatched — resolves to `/aof:autonomous
<ref>`. ADR-008 reduces `autonomous.md` to a shell-out to `aof work loop`. **Therefore a milestone
continue becomes a loop, with zero code change in `continue.mjs`.** That is the whole answer to "what
happens to `resolveDirectivePhase` when `aof work loop` exists": nothing, and that is the point — the
composition happens at the prompt, where m42 put the seam.

The consequence is named so it is not rediscovered: when `autonomous.md` is eventually **deleted**
(ADR-008's discharge, a later chore), `resolveDirectivePhase`'s `"autonomous"` return becomes a dangling
directive and must be superseded in the same diff. That is a two-line change in a file this milestone
deliberately does not open, and it is recorded here as the deletion's precondition.

**Alternatives considered.**

- *Fold execution into the existing `work:<phase>` doors (e.g. a `--here` / `--run` flag)* —
  **rejected on the shared-contract blast radius.** Three commands, and every face that calls them,
  would gain a mode that starts a PTY. The board's Continue button would need a new decision about
  whether it means "tell me" or "do it"; the fleet's picker likewise. `continue.mjs:3-26` is a record of
  what happens when one act has several behaviours behind one affordance. The doors' value is that they
  are a *decision*, and a decision that sometimes executes is two concepts.
- *Rename the shipped doors (e.g. to `work:where-<phase>`) and take the SPEC's three names* —
  **rejected:** it breaks three registered ids, three routes, the board, the fleet and the bijection
  test's `argsFor` cases, to win a naming argument — and it would make m42's most-cited door the one
  command in the repo whose name changed for a downstream milestone's convenience.
- *One command, `work:drive`, with the phase as a positional (`aof work drive <phase> <ref>`)* —
  **rejected, narrowly.** It reads well and the three drivers genuinely share one input and one output
  shape (unlike 52's three verbs, which is why 52/ADR-008 ruled the other way). But the phase would then
  be a *value* the route table cannot see, so `deriveRouteTable` could not distinguish them, the
  bijection gate would probe one command for three behaviours, and 63's triggers would have to encode a
  phase string rather than name a command id. `createPhaseDoorCommand` is the same-repo precedent for
  exactly this shape at exactly these three phases; following it costs three array entries.
- *Name them `work:loop-<phase>`* — **rejected:** they are not loop-only. 63 calls a driver directly; an
  operator may drive one phase by hand. Naming them for their first caller is TECH_DEBT item 10's third
  shape (a module named for a face) committed at the command layer.

**Consequences.** The milestone adds four registered commands and edits `src/command-core.mjs` once (four
imports, four array entries) — its 102 dependents are unaffected, because nothing reads that array
structurally except registry-derived arch-tests. `src/cli.mjs` gains no branch: `deriveRouteTable` is
registry-derived (`src/spine/face.mjs:87-99`) and 52/ADR-012 §1 already generalised the bijection gate's
route leg to `command.cli.route.join(" ")` (measured at
`test/arch/acd-work-command-cli-bijection.test.mjs:290`), so the three-word routes are free there. The
one bijection leg that is **not** free is `argsFor`'s deliberate `default: throw` (`:252`, in-file note
`:197-199`, 19/R1) — four cases, owned by the same story that registers the commands (ADR-005).

**Invariant.** `src/commands/continue.mjs` contains no PTY spawn, no import of
`agent-session-driver.mjs`/`mesh-worker-execution.mjs` and no `driveInteractiveClaudeSession` call; the
three driver commands carry ids `work:drive-<phase>` and routes `["work","drive",<phase>]`, resolve
through `deriveRouteTable`/`resolveRoute`, and contain no `where`/`node`/assignment decision; no route
collision exists. (Enforced by `acd-phase-door-not-a-driver`, plus the registry-derived
`acd-work-command-cli-bijection`.)

---

## ADR-003: `aof work loop` scopes to a driver number or an `NN-MM` range ONLY — a story-shaped scope is a coded refusal, never a silent whole-stream walk; and the three scope parsers are ledgered, not merged, in this milestone

**Status:** Accepted
**Date:** 2026-08-15

**Context.** RESEARCH §Q3 measured a real defect on the exact function this milestone's sequencer depends
on. `nextWork`'s scope parser `inRange` (`src/work.mjs:847-860`) accepts `^\d+$` (that driver) or
`^(\d+)-(\d+)$` (that range) and **falls through to `() => true` for everything else** — no error, no
warning. Passing `18/02` therefore means *no scope at all*: the walk offers the first ready item anywhere
in the stream. Two independently-written richer copies in the same repo do handle `NN/SS`:
`validateWork`'s `inScope` (`src/work.mjs:723-730`) and `work-doctor.mjs`'s `inScope` (`:455-463`).

That is a silent-green class defect, and it is materially worse inside a loop than inside a read: a loop
handed `53/02` would cheerfully start driving milestone 12.

**Decision.**

**1 — `work:loop` admits exactly two scope forms**, declared as a frozen exported constant in the loop
engine:

```js
// src/work-loop.mjs
export const LOOP_SCOPE_FORMS = Object.freeze([
  { id: "driver", pattern: /^\d+$/ },        // one driver: `aof work loop 53`
  { id: "range",  pattern: /^\d+-\d+$/ },    // an inclusive range: `aof work loop 50-53`
]);
```

Anything else — a story ref, a slug, an empty string — is the coded refusal
**`loop-scope-unsupported`**, carrying the two admitted forms and the reason, before anything is spawned,
minted or read. The refusal names the alternative: *drive one story with `aof work drive <phase>
<ref>`* (ADR-002), which needs no `nextWork` and therefore has no scope problem.

**2 — The loop never re-implements `nextWork`'s walk.** It calls the registered `work:next` with the
admitted scope and consumes its result **whole** — `{state: "ready"|"blocked"|"done"|"held", ref, type,
slug, status, path, waitingOn?, skipped?}` (`src/work.mjs:862-869, 1011`; `src/commands/next.mjs:70-86`).
Every candidacy/lease guard m26/m27 added at every ready-return, and m43's item-lock skip-and-report, are
inherited for free and must stay that way. This is m26/ADR-007's recall hit honoured: the loop cannot
create a new ready-return to forget a guard at, because it creates none.

**3 — `src/work.mjs` is NOT edited by this milestone.** Widening `inRange` would be an edit to a
**241-dependent** god-node (graph, 2026-08-15) to serve one new caller, on a function whose two other
in-repo cousins already disagree with it — i.e. it would make the drift *worse* by producing a third
distinct behaviour rather than one. m37's rule is "at most one story may edit `work.mjs`"; 52 achieved
zero; **53 achieves zero.**

**4 — The three-copies fact is ROUTED, not waved through.** It does not fit this milestone (fixing it
means editing `work.mjs` *and* `work-doctor.mjs`, i.e. the god-node plus the health engine, for a defect
no story here needs fixed), so it is ledgered — see the codebase-health note below for the full entry
text, which takes **`wiki/work/TECH_DEBT.md` item 49**.

**Alternatives considered.**

- *Widen `nextWork`'s `inRange` to accept `NN/SS`* — **rejected on blast radius and on correctness.**
  241 dependents; and "scope a story" changes what the *driver walk* means (the walk is over drivers,
  then drills into stories), so the fix is not a regex — it is a semantic decision about `nextWork` that
  belongs to whoever pays down item 49, not to the loop's first caller.
- *Single-source the three parsers into a leaf `src/work-scope.mjs` now* — **rejected for this
  milestone, and it is the right eventual fix.** It edits `src/work.mjs` (two call sites) and
  `src/work-doctor.mjs`, i.e. two of the three highest-coupling modules in the stream, inside a milestone
  whose partition otherwise touches neither. It would also serialise three of five stories behind it.
  Recorded as item 49 with this shape as the named fix.
- *Pre-filter inside the loop command — accept `NN/SS`, resolve it, and scope by hand* — **rejected:** it
  is a fourth scope parser, in the milestone that just measured three, and it would have to re-derive
  "which driver does this story belong to" — a fact `nextWork` already owns.
- *Declare story-level looping out of scope silently* — **rejected:** silence is what the defect already
  does. A refusal that names both admitted forms and points at `work drive` is the same scope decision,
  made out loud.

**Consequences.** `aof work loop 53/02` is a loud, coded, zero-side-effect refusal from day one, which is
strictly better than today's silent whole-stream walk — so this milestone *improves* the defect's blast
radius without touching the defect. The gate the loop runs is `work:validate`, which carries TECH_DEBT
item 11's own silent-green (`aof work validate <ref>` reports PASS for a ref that does not exist,
`src/work.mjs:687-694`); the loop is **not** exposed to it because every ref it gates comes from
`work:next` and therefore exists. That exposure boundary is recorded here rather than opened as a new
debt entry, because item 11 already owns the defect.

**Invariant.** `src/work-loop.mjs` exports `LOOP_SCOPE_FORMS` as exactly the two frozen forms; every
non-admitted scope yields `loop-scope-unsupported` with nothing spawned, minted or written; no module in
this milestone re-implements a driver walk or a scope filter; `src/work.mjs` is unchanged. (Enforced by
`acd-loop-scope-guard`.)

---

## ADR-004: The loop is RESUMED, not RESTORED — durable loop state is the frozen `brief.loop` envelope on the run records the loop already mints; no new record type, no new store, no new directory, no change to the 15-key record or the 5-edge machine, and ZERO board change

**Status:** Accepted
**Date:** 2026-08-15

**Context.** `SPEC §Scope` asks for *"`--resume` — durable loop state in the run store, so a loop survives
a machine-off and resumes rather than stranding sessions"*, and `SPEC §Dependencies` pins two constraints
that most candidate designs violate: **20** — *"`--resume`, the attempt ceiling and the
retryable/non-retryable classification are the run store's, not this shell's; the loop **declares over**
them"* — and **21** — *"loop state is a run-store observable and reaches the board through the same face,
never a side channel."*

RESEARCH §Q4 measured the store. The record is a frozen 15-key shape (`src/run-store.mjs:344-362`,
normalised forward-compatibly at `:370-388`) whose `brief` is *"persisted OPAQUE/verbatim (never
reshaped)"* (`:337`, `:352`). The state machine is a **closed 5-edge table** (`:96-102`) with a pure
predicate (`:106-108`). The attempt ceiling is `shouldRetry(record, maxAttempts)` (`:141-143`), the
classification `isRetryable` (`:126-130`), the park gate `retryReadiness`. Two tests pin all of it and
neither is loop-aware: `test/run-store-state-machine.test.mjs`'s 25-cell closed-table assertion
(`:17-19, 62-77`) and `test/arch/acd-run-retry-classification.test.mjs`'s body-purity grep (`:64-76`).
The board face is exactly one: `work:run-status` (`src/commands/run-status.mjs:19-101`, returning
`{ref, runs: RunRecord[]}`) invoked by both the CLI route and `GET /api/work/run-status`
(`src/board-ui.mjs:110-119` — a thin `invoke`, zero logic), and its `json` adapter passes the result
through unchanged (`run-status.mjs:99`).

The load-bearing observation is one RESEARCH did not have to make and the design turns on: **the loop's
position is not state.** `aof work next <scope>` re-derives "where am I" from the stream's own statuses on
every tick — that is the whole reason `SPEC §Objective` says the loop "sequences via `aof work next`".
Persisting a position would create a second answer to a question the stream already answers, which is
TECH_DEBT item 0's second shape ("the same fact derived independently, everywhere"), and the two would
disagree the moment a human touched a status between a crash and a resume.

**Decision.**

**1 — The loop persists a DECLARATION, never a POSITION.** Everything the loop needs across a machine-off
is either (a) re-derivable from the stream (`work:next`), (b) already the run store's (stranded runs,
attempt counts, retryable classification, the park gate), or (c) the loop's own declared parameters. Only
(c) is new, and it is three scalars.

**2 — The declaration rides the `brief` bag of every run the loop mints.** The frozen envelope:

```js
// The ONE key this milestone adds to any persisted shape, and it is a key on an
// OPAQUE bag the store already persists verbatim (src/run-store.mjs:337, :352).
// Nothing in run-store.mjs is edited. The 15 keys, their order, their meaning and
// the 5-edge table are untouched — the two pinning tests stay byte-identical.
brief.loop = {
  loopRunId,          // mints once per `aof work loop` invocation; carried by every run it drives
  scope,              // the admitted scope verbatim ("53" | "50-53") — ADR-003
  level,              // "L1" | "L2" — ADR-006. (L1 mints no runs at all, so this is "L2" in practice)
  cap,                // the RESOLVED gate-retry ceiling — read, never chosen (ADR-009)
  phase,              // "refine" | "continue" | "verify" — which phase THIS run is
  cycle,              // 1-based gate-retry cycle index for this (ref, phase)
  startedAt,          // the LOOP's start instant (not the run's) — ISO-8601 Z
}
```

**3 — `--resume` is three existing acts, in order, and no new one.**
  (a) **Settle what is stranded** — for each item in scope, the run store's own reclaim path
      (`transitionStaleRunsReclaimed`, the shape `src/commands/resume.mjs:137` already uses) force-fails
      stale `running` records as `runtime_offline`, keeping them retryable, exactly as `autonomous.md:41-47`
      already describes and `work:run-start` already implements.
  (b) **Recover the declaration** — read the most recent `brief.loop` among the scope's runs; an explicit
      `--level`/`--cap` on the resume invocation **wins**, an absent one inherits.
  (c) **Re-ask** — `work:next <scope>` and continue.
  A loop that had minted no runs has nothing to recover, which is correct: there is nothing to resume.

**4 — Sessions are settled and re-driven, never re-attached.** `claude --resume` re-attachment exists
(`createMeshWorkerTerminalResumeHandler`, `src/mesh-worker-execution.mjs:2999`) and is deliberately **not**
used here. A machine-off killed the PTY; the transcript is on disk; re-driving the phase is the honest
recovery and it is the one `autonomous.md:107-109` already prescribes ("NEVER redo a killed agent's work
by hand" — the store decides resume-vs-fresh, and it decides from `isRetryable`). This is also the
conscious departure from m46/ADR-009's recall hit, stated in the preamble: 53 promises loop survival, not
session survival.

**5 — The board reaches loop state through `work:run-status`, with ZERO change to any face.** The record
is returned whole; `brief` rides inside it; `board-ui.mjs:110-119` serialises it unchanged. The
worker-streamed path preserves it too — the projection stores the whole record as `record_json`
(`src/global-work-store.mjs:314`, read at `:1143`), so a loop driven on a worker is visible on the
control node's board through the same face. **`src/board-ui.mjs`, `src/commands/run-status.mjs` and
`ui/` are not edited by this milestone**, which is m21/ADR-002's recall hit ("ZERO new board mutation")
honoured in its strongest form.

**Alternatives considered.**

- *A new sibling record type + store module (`src/loop-store.mjs`), reusing run-store's path/atomic-write
  idioms* — **rejected on three measured counts.** (a) It needs a home: `<item.dir>/runs/loops/` would be
  read by `readRuns` as a **node partition** (`runNodeRecordPath`, `src/run-store.mjs:84-86`) — a real
  corruption, not a style objection; `<work.dir>/loop-runs/` would be the second non-item directory in
  `work.dir`, against 52/ADR-001 §3's explicit ratchet, and one letter from 52's `loops/` in a flat
  listing. (b) A **range** loop has no owning item, so no item-anchored path exists for `50-53` at all.
  (c) It would make the SPEC's "reaches the board through the same face" false — a second store needs a
  second read, i.e. the side channel dependency 21 forbids.
- *Mint one run record FOR THE LOOP ITSELF on the scope's anchor item* — **rejected, and m20/ADR-006 is
  why.** The store's dedup guard refuses a second non-terminal run per item (`src/run-store.mjs:405-408`,
  `duplicate-run`). A loop scoped to milestone 53 that then drives `/aof:refine 53` or `/aof:verify 53`
  would collide with its own loop record. The guard is correct and is one of m20's deliverables; the
  design must not need it weakened.
- *Add a 16th key (`loopRunId`) to the run record* — **rejected:** it reopens a shape frozen through three
  additive supersessions (`src/run-store.mjs:330-343`) and makes two loop-blind pinning tests loop-aware,
  which RESEARCH §Q4 explicitly says neither should become. `brief` exists for exactly this and is
  documented as opaque.
- *Keep loop state in `.aof/` (a workspace runtime dir, like `terminal-sessions.json`)* —
  **rejected:** it is invisible to `work:run-status`, so dependency 21's "same face" clause would be
  unmet; and it splits one loop's facts across two stores when the run records already carry them.
- *Persist the position (current ref + phase) so a resume continues exactly where it stopped* —
  **rejected as the ADR's central point.** It is a second answer to a question the stream answers, and it
  is the answer that goes stale: a human who fixes a status between the crash and the resume would be
  overruled by a stale pointer. "Resumed, not restored" costs one extra `work:next` call and can never
  disagree with the stream.

**Consequences.** This milestone writes **no new persistence code at all** — no store module, no path
builder, no atomic-write seam, no state machine. The cost is named: a loop that halts before minting any
run leaves no trace of having run, and a loop's *aggregate* history (which items it drove, in what order)
is a query over run records rather than a single document. Both are acceptable because both are
re-derivable — `work:next` reports `blocked` deterministically at any time, and `brief.loop.loopRunId`
makes the aggregate a one-key filter — and because the alternative is a second store that can disagree
with the first. 54 (which needs the retry lineage) and 62 (which needs run provenance for its proposals)
both read the run store they already read; neither inherits a new shape.

**Invariant.** `src/run-store.mjs` is unchanged (import `buildRecord`'s key list and `LEGAL_TRANSITIONS`
and assert exact equality against the frozen 15 and 5); no module in this milestone writes a file outside
the run store's own seam and no `*loop*store*` module exists in `src/`; every durable loop fact is a key
of the frozen `brief.loop` envelope; `src/commands/run-status.mjs`, `src/board-ui.mjs` and `ui/` are not
edited. (Enforced by `acd-loop-state-rides-the-run-record`.)

---

## ADR-005: `aof work loop` is ONE launcher-seam command whose registered `run()` is a promptly-returning PROBE, with a frozen `--json` state contract and a frozen, PRODUCER-BACKED stop-condition set that 54, 62 and 63 consume

**Status:** Accepted
**Date:** 2026-08-15

**Context.** RESEARCH §Q2 measured the two mechanics that decide this command's shape. A long-lived
foreground command declares `cli.launch(options)`: `null` ⇒ fall through to the ordinary probe/invoke
path, a function ⇒ the daemon body, awaited until the process ends (`src/spine/face.mjs:144-161`). And
**`--json` NEVER launches** — face policy, checked *before* the seam is consulted (`face.mjs:154`) — so a
launcher command's registered `run()` must always be a non-blocking probe. `meshServeCommand` is the
precedent: `run` calls `launcherProbe` (`src/commands/mesh-serve.mjs:120-125`), and `cli.launch` selects
the daemon body off a declared flag (`:153`). The bijection gate spawns `aof work <sub> --json` per
registry-derived subcommand and requires one clean parseable document
(`test/arch/acd-work-command-cli-bijection.test.mjs:9-18`), with `argsFor`'s `default: throw` at `:252`
the one leg that needs an edit per new command (52/ADR-012 §1 having already generalised the route leg,
measured at `:290`).

The second half of the context is a constraint, not a mechanic. `PRD §Constraints`: *"`aof work loop`
owns sequencing, gate order, caps, budget, session lifecycle, retry and stop-conditions — deterministic
control. It NEVER encodes product judgment."* A stop condition the shell **decides** would be product
judgment; a stop condition the shell **reports** because a store or a driver returned a code is
deterministic control. Every id below has a named producer for exactly this reason.

**Decision.**

**1 — One command, `work:loop`, route `["work","loop"]`, on the launcher seam.**

```js
cli.launch: (options) => (options.dryRun === true ? null : runLoopBody)
// --json never launches (face policy, face.mjs:154) ⇒ the registered run() is the machine probe.
// --dry-run is the HUMAN probe: it falls through to invoke → render, same document, rendered.
// Everything else launches. (`--dry-run` is declared camelCase in cli.spec.flags and typed
//  `--dry-run` on the command line — the normalisation at src/spine/face.mjs:57.)
```

**2 — The registered `run()` is a PROBE and is defined by what it must not do:** it resolves the scope,
asks `work:next` once, asks the pure engine what it *would* do, and returns. It spawns no PTY, mints no
run, writes no status, and reads no clock beyond the timestamp it reports.

**3 — The frozen `--json` state contract (frozen 2026-08-15 — 54, 62 and 63 consume this, so it is a
contract, not a render):**

```js
work:loop  input { scope: string, level?: "L1"|"L2", resume?: boolean, cap?: number, dryRun?: boolean }

  → LoopState = {
      scope,              // the admitted scope verbatim ("53" | "50-53") — ADR-003
      level,              // "L1" | "L2" — the RESOLVED level (default "L2"); "L3" never appears (ADR-006)
      cap,                // the RESOLVED gate-retry ceiling. 53 READS this value; it never chooses one
                          //   (config work.autonomous.maxAttempts, default 3 — ADR-009)
      loopRunId,          // the id this invocation carries (drive) or would carry (probe) — ADR-004
      state,              // "ready" | "blocked" | "done" | "halted" | "refused"
      next,               // work:next's answer, PASSED THROUGH VERBATIM — never re-derived (ADR-003).
                          //   { state, ref?, type?, slug?, status?, path?, waitingOn?, skipped? } | null
      act: {              // the PURE engine's decision about `next` (src/work-loop.mjs)
        act,              //   "drive" | "gate" | "halt" | "done"
        ref?, phase?,     //   phase ∈ "refine" | "continue" | "verify"
        stop?,            //   a member of LOOP_STOPS when act === "halt"
        producer?,        //   the code/fact that produced the stop — never a message match
      },
      stops: [...LOOP_STOPS],           // the CLOSED set this shell enforces (below), always in full
      resumable: {                      // ADR-004 — resumed, not restored
        stranded: [ { ref, runId, node } ],          // non-terminal runs in scope, from the run store
        lastDeclaration: { loopRunId, scope, level, cap, startedAt } | null,   // read from brief.loop
      },
      driven: [ { ref, phase, runId, outcome, attempt, cycle } ],   // [] on the probe
    }
```

**4 — The stop-condition set is CLOSED, and every member names its producer.** This is the set 54's
grader loop stops into and 63's triggers report on:

| stop id | produced by | source |
|---|---|---|
| `uat-gate` | `work:next` returns `type: "uat"`, **or** `work:tasks <ref>` reports any task with `counts.uat > 0` | `src/work.mjs:941-957`; `src/commands/tasks.mjs:44-49` |
| `dependency-blocked` | `work:next` returns `state: "blocked"` with `waitingOn` | `src/work.mjs:936-939` |
| `cap-exhausted` | the gate cycle reached the resolved `cap`, **or** the store returned `attempts-exhausted` | `src/run-store.mjs:141-143` |
| `session-needs-input` | the driver resolved `{outcome: "needs-input"}` | `agent-session-driver.mjs` (ADR-001) |
| `run-not-retryable` | the store returned `not-retryable` (an `agent_error`) | `src/run-store.mjs:126-130` |
| `retry-parked` | the store returned `retry-parked` with a `readyAt` (a `session_limit`) | `src/commands/resume.mjs:25, 80` |
| `unmapped-item-type` | `work:next` returned a ready item of a type the frozen phase map does not cover | ADR-005 §5 |
| `operator-interrupt` | SIGINT/SIGTERM in the launcher body | `src/commands/mesh-serve.mjs:97-104` idiom |

**Not** a stop id, deliberately: *"a wrong or infeasible scenario/fitness function"* and *"an open
decision that cannot be safely defaulted"* (`autonomous.md:132-133`). Those are **model judgments** and
the shell must not pretend to compute them; they reach the shell as `session-needs-input`, which is
exactly what the NEEDS_INPUT producer exists for (`mesh-worker-execution.mjs:924-930`, moving to the
driver module). This is `PRD §Constraints`' "never encodes product judgment" made structural.

**5 — The phase map is FROZEN, and it is DISPATCH, not phase logic.** `SPEC §Out of scope` forbids moving
phase logic into code; the mapping from *item type + status* to *which existing prompt to run* is the
dispatcher the PRD explicitly moves into code (`PRD-acd-loop-engineering.md:72-83`). RESEARCH §Q3 found it
exists today only as prose (`autonomous.md:60-81`) and that **no function in `src/` computes it**. Frozen,
transcribed from that prose without addition:

| ready item | condition | `act` |
|---|---|---|
| milestone | no stories | `drive refine` |
| story | `work:tasks` returns `tasks: []` | `drive refine` |
| story | has tasks, status ≠ done | `drive continue` → `gate` → (retry ≤ cap) → `drive verify` |
| milestone | all stories done | `drive verify` |
| uat | ready | `halt uat-gate` |
| story | after `verify`, any task with `counts.uat > 0` | `halt uat-gate` |
| spike / chore | ready | `halt unmapped-item-type` |

Two facts about that table are decisions, not transcription. **The `hasTasks` and `@uat` predicates come
from ONE registered command** — `work:tasks`, which returns per-task `counts: {executable, manual, uat}`
(`src/commands/tasks.mjs:44-49`) — never from `work-doctor.mjs`'s `hasTaskFiles`
(`work-doctor.mjs:138-144`, a check-engine internal) and never from a hand-rolled feature parse. One door,
one answer. And **`spike`/`chore` halt rather than guess**: m37 added those types after `autonomous.md`
was written, the prose mapper does not cover them, and a shell that guesses a phase for an item class
nobody mapped is the shell encoding judgment. Halting names the gap; a one-line mapping fixes it later.

**6 — The gate order is declared here, because 54 depends on it.** `GATE_ORDER` is a frozen constant:
`drive continue` → `work:validate <ref>` (deterministic, no model) → on findings, re-`drive continue` with
the findings, up to `cap` → `drive verify`. **Deterministic before model** is 54's headline and it is
already true here by construction: `validate` is the only gate 53 runs and it is deterministic. 54 adds
the structured rubric feedback that rides the retry; the ORDER and the BOUND are this shell's.

**Alternatives considered.**

- *Make the loop a background daemon (`aof work loop --serve`)* — **rejected:** `SPEC §Scope` and the PRD
  both describe an operator-facing foreground shell, and a daemon needs a supervisor, a log sink
  (TECH_DEBT item 2) and a liveness story that 53 has no budget for. 63 supplies waking; a trigger calls
  the foreground command.
- *No probe — let `run()` drive the loop, and let `--json` stream events* — **rejected:** it breaks the
  bijection gate's spawn-and-parse leg by construction (the spawn would never return), and face policy
  already forbids it (`face.mjs:154`). A launcher's machine face is its probe; that is the house rule.
- *An open stop-condition set, extended by whichever caller needs one* — **rejected:** 54 and 63 both read
  this set. An open set means each of them pattern-matches strings, which is m37/R2's measured failure
  (a downstream contract pinning a message verbatim).
- *Compute `@uat` by parsing the story's `.feature` files inside the loop* — **rejected:** a second
  feature parser beside `src/feature-parse.mjs`, reached through a second door beside `work:tasks`. The
  registered command already returns the count.
- *Map `spike`/`chore` to `continue` as a documented default* — **rejected, narrowly.** It is probably
  right, and it is exactly the kind of "probably" that ships a silently-wrong dispatch. `halt
  unmapped-item-type` surfaces the same question to the operator at zero risk, and the fix — one row in a
  frozen table — is cheaper than the recovery from a mis-driven chore. Recorded as an OPEN item.

**Consequences.** `src/cli.mjs` is not edited. `src/command-core.mjs` gains four imports and four entries
(with ADR-002's three drivers) — one story, one file. The bijection test gains four `argsFor` cases —
`["work","loop","03","--json"]` and `["work","drive",<phase>,"03/01","--json"]` against the existing
fixture — and nothing else, because 52/02 already fixed the route leg generally. The frozen `--json`
document and the closed stop set become consumed contracts the moment the command lands; 54, 62 and 63
read them without renegotiation.

**Invariant.** `work:loop`'s registered `run()` spawns no PTY and mints no run record (behavioural, over
an injected spawn seam and a fixture stream); `cli.launch` returns null under `--json`; the command
carries `cli.route`/`argv`/`render`/`json`; the `--json` document's key set equals the frozen contract
exactly; `LOOP_STOPS` is a frozen exported set and every emitted stop carries a `producer` drawn from a
code, never from a message match. (Enforced by `acd-loop-probe-contract`.)

---

## ADR-006: The ladder ships L1 and L2, with L3 LOCKED structurally — a frozen two-member level vocabulary, a coded refusal naming milestone 55, and no `L3` branch anywhere in `src/`; and L1 is defined as byte-level read-only, proven that way

**Status:** Accepted
**Date:** 2026-08-15

**Context.** `SPEC §Objective` is unusually direct about why: *"an unattended self-driving loop without
anchored measurements and an enforced frozen set is the configuration the self-evolving-agent literature
has repeatedly measured failing. 55 unlocks it."* `55 SPEC §Scope` claims the unlock by name (*"L3
unlocked on 53's ladder, gated on the Loop-Ready score and a green groundedness report"*), and `63 SPEC`
depends on 55 for the same reason. So L3 must be **declared** (so 55 has something to unlock and 62/63
have a level to name) and **locked** (so nothing can reach it before the anchors exist).

The failure mode this ADR guards against is specific and this repo has measured it: a prose promise that
a level is unavailable is exactly the class of guarantee `SPEC §Objective` opens by calling
unenforceable — *"the build-loop cap is unenforceable: it is an instruction a model may skip."* A lock
that is a sentence in a document is the same defect one layer up.

**Decision.**

**1 — The level vocabulary is two frozen exported sets, and `L3` lives in the locked one.**

```js
// src/work-loop.mjs
export const LOOP_LEVELS        = Object.freeze(["L1", "L2"]);   // executable
export const LOCKED_LOOP_LEVELS = Object.freeze({
  L3: { unlockedBy: 55, reason: "L3 requires 55's anchored measurements and enforced frozen set." },
});
```

`--level L3` is the coded refusal **`loop-level-locked`**, carrying `unlockedBy: 55` and the reason. It
refuses before the scope is resolved, spawns nothing and mints nothing. An unrecognised level is
`loop-level-unknown`.

**2 — The lock is STRUCTURAL, not prose.** FF-5305 asserts three things: the two constants equal the
frozen literals exactly; the real command with `--level L3` produces the coded refusal with zero spawns
and zero run files; and **no module under `src/` contains an executing branch keyed on `L3`** —
comment-stripped, token-scoped grep for `"L3"`/`'L3'` outside the two frozen literals and the refusal
message. So unlocking L3 is necessarily a visible diff in 55, never a config value someone sets.

**3 — L1 means byte-level read-only, and that is a decision procedure.** `PRD §Scope` says *"L1
report-only (observe + validate, no writes)"*. Operationally: an L1 loop walks the scope to terminal,
running only reads — `work:next`, `work:tasks`, `work:validate`, `work:doctor` — and reports, per item,
the `act` an L2 loop would take. It **spawns no session, mints no run, writes no status, and touches no
file.** FF-5306 proves it the only honest way: snapshot the fixture tree's file list *and* every byte,
run a full L1 loop over it, assert both identical (52/FF-5201 leg (b)'s dynamic byte-unchanged idiom, and
the reason that leg exists — a static grep sees `writeFile(x, …)` and cannot see where `x` resolves).

**4 — L2 is today's `--autonomous` default, with the caps now enforced.** Sequence, dispatch, gate,
bounded retry, drive to terminal or halt at a stop condition — the same behaviour `autonomous.md`
describes, with the control flow in code. The review-stops are the ADR-005 §4 stop set. L2 is the
default when `--level` is absent, because it is what `/aof:autonomous` means today and a silent
downgrade to L1 would surprise every existing caller.

**5 — The level is recorded in loop state as `brief.loop.level` (ADR-004).** So "what level was this run
driven at" is answerable from the run record, on the board, through the existing face — which is what 62
needs to gate auto-apply and what 63 needs to declare a trigger's level against.

**Alternatives considered.**

- *Ship L3 behind a config flag (`work.loop.allowL3`)* — **rejected outright:** it makes the most
  dangerous rung reachable by editing a JSON file, with no diff a reviewer sees, in a milestone whose own
  SPEC names unattended-without-anchors as the measured-failing configuration.
- *Do not declare L3 at all until 55* — **rejected:** 62 and 63 both name the level in their SPECs, and
  an undeclared rung means each of them invents its own spelling. Declaring-and-locking gives 55 a
  single, visible thing to change, and gives 62/63 a name to depend on today.
- *Make L1 "no writes to the work stream" rather than "no writes at all"* — **rejected:** the weaker
  reading is undecidable by a fitness function (which writes are "to the work stream"?), and a
  report-only mode that writes anything is one refactor away from writing something that matters. The
  strong reading costs nothing: an L1 loop has no reason to write.
- *Let L3 be an alias for L2 until 55 fills it in* — **rejected:** it makes `--level L3` succeed while
  doing something else, which is worse than a refusal in every direction.

**Consequences.** `SPEC §Scope`'s "L3 is declared and locked" is a CI-enforced fact from the day story
53/01 lands, and 55's unlock is a bounded, reviewable diff: widen `LOOP_LEVELS`, empty
`LOCKED_LOOP_LEVELS`, and delete FF-5305's third leg. The cost accepted: an operator who wants unattended
operation before 55 has no escape hatch, which is the intended answer.

**Invariant.** `LOOP_LEVELS` and `LOCKED_LOOP_LEVELS` equal their frozen literals exactly; `--level L3`
yields `loop-level-locked` naming milestone 55, with zero spawns and zero run records; no `src/` module
carries an executing `L3` branch; an L1 loop over a fixture leaves every file and every byte unchanged.
(Enforced by `acd-loop-level-l3-locked`, `acd-loop-l1-read-only`. **The `acd-loop-level-l3-locked` half is DISCHARGED as of 2026-08-27** — milestone 55 executed the unlock this ADR's own Consequences pre-authorised, and the file is deleted; its ground is held by 55's `acd-loop-level-l3-gated`. The L1 read-only half stands unchanged.)

---

## ADR-007: The Loop-Ready score is a PURE fraction over equally-weighted checks, computed at the COMMAND boundary, composing 52's checks through a DEFERRED `invoke("work:loops-validate")` — it never imports a loop module, never re-derives a check, and never gates a loop below L3

**Status:** Accepted
**Date:** 2026-08-15

**Context.** Four measured constraints converge on one design, and one of them is a trap.

*Doctor's shape.* RESEARCH §Q5: a check is a pure `(snapshot, ctx) => Finding[]`
(`src/work-doctor.mjs:11-16`); `CHECK_GROUPS` is the registry (`:398-413`); `doctorWork` returns a **bare
`Finding[]`** (`:508-533`). `healthy`/`strict`/`errors`/`warnings` are computed at the **command
boundary** (`src/commands/doctor.mjs:232-246`), never in the engine. **There is no numeric score concept
anywhere today.** Adding one to the engine's return would change a shape every caller reads, including
the determinism test's own `JSON.stringify(doctorWork(...))`.

*The determinism sweep.* `test/arch/acd-doctor-engine-determinism.test.mjs` globs
`/^work-doctor.*\.mjs$/` over `src/` (`:27-32`) and asserts no member calls `Date.now(`/`new Date(`. Any
new `work-doctor-*.mjs` module is swept in **with no test edit** — free discipline, if the name is right.

*52's pre-commitment.* 52/ADR-007's alternatives section rules, in writing, that folding the loop checks
into doctor is *"rejected, and deliberately left for 53… When 53 opens it, it composes through
`invoke("work:loops-validate", …)` — never by importing the loop modules"*, honouring m25/ADR-003.
RESEARCH §Q6 confirms the mechanism exists and works: `loadLoops` returns `present: false` for a missing
directory (`src/work-loops.mjs:503`) and `work:loops-validate` is the existence proof of the
conditional-checks pattern (`src/commands/loops-validate.mjs:29-48` — `model.present ? CHECKS[id](model)
: []`, with `{ran:false, findings:0}` for all five when absent).

*The trap.* Composing through `invoke` means `src/commands/doctor.mjs` importing `src/command-core.mjs`
— and `command-core.mjs` imports all 75 command modules including `doctor.mjs`. That closes the registry
ring TECH_DEBT item **26** measured: *"A registered command that imports a server re-enters
`command-core`, which reads that command's own export at module scope; entering the ring at the command
rather than at `cli.mjs` hits the temporal dead zone."* Measured today: **no command module in
`src/commands/` statically imports `command-core.mjs`.** 53 must not be the first.

**Decision.**

**1 — The score lives in a new pure module, `src/work-doctor-loop-ready.mjs`, and is NOT a check group.**
It exports one pure function over injected plain data. It is **deliberately not** added to `CHECK_GROUPS`,
so `doctorWork`'s bare-array return is byte-unchanged and the determinism test's serialisation assertion
is untouched. The `work-doctor-` name is chosen precisely so the determinism glob sweeps it for free; the
name is honest because the module *is* in doctor's lane (pure, `ctx`-injected, wall-clock-free) — it just
emits a **score**, not findings. FF-5309 asserts **both** facts — that the module is in the glob's set,
and that it is not in `CHECK_GROUPS` — so neither can drift silently.

**2 — Composition happens at the command boundary, through a DEFERRED import.**
`src/commands/doctor.mjs` already performs every impure read at its `run()` boundary and hands the
results in as plain data — `Date.now()` (`:144`), the raw committed config (`:100-106`), the legacy
sidecar probe (`:110-117`), the cache overlay (`:136-142`), the fabric probe (`:162-172`). The loop
registry read joins that list, and it is reached exactly as `src/commands/assets-ui.mjs:42` reaches its
server:

```js
// INSIDE run(), never at module scope — the assets-ui precedent, and the medicine
// TECH_DEBT item 26 names. A static import here would make doctor.mjs the first
// command module on the registry ring.
const { invoke } = await import("../command-core.mjs");
const loops = await invoke("work:loops-validate", {}, ctx);
```

52/ADR-007's pre-commitment is honoured **verbatim**: composition is through `invoke`, and no loop module
(`src/work-loops*.mjs`) is imported by anything in this milestone.

**3 — The score never re-derives a loop check.** When a registry is present, the composed rows read
`loops.summary.checks[<id>].findings` for the five frozen ids — `grounding` · `pairing` ·
`reference-ownership` · `actuator-arbitration` · `timescale` (52/ADR-011 §12) — **verbatim**. No count is
recomputed, no finding is re-classified, no severity is re-decided. That is the mechanical meaning of
`SPEC §Scope`'s *"never a second checklist that can disagree with the graph"*: it cannot disagree because
it does not compute.

**4 — The frozen `LoopReady` shape (frozen 2026-08-15; 55 widens the check set additively):**

```js
LoopReady = {
  score,        // integer percent = round(100 * passed / applicable). Equal weights — see below.
  passed, applicable,
  clears,       // "none" | "L1" | "L2"  — the highest level this repo currently clears.
                //   L3 NEVER appears here in 53 (ADR-006); 55 adds it with its own bar.
  registry: { present, composed, error, warn },   // present:false ⇒ composed:false, and the five
                                                  //   loop rows are "not-applicable"
  checks: [ { id, state: "pass"|"fail"|"not-applicable", evidence } ],
  blocking: [ <check id>, … ],                    // the failing checks holding `clears` down
}
```

**5 — The base checks (registry-absent) are four, with frozen ids**, each answerable from data the
command already has:

| id | passes when | source |
|---|---|---|
| `stream-coherent` | zero `error`-severity doctor findings in scope | doctor's own findings, `src/commands/doctor.mjs:242` |
| `cap-declared` | `work.autonomous.maxAttempts` resolves | the same key `src/commands/run-retry.mjs:62` reads |
| `memory-on` | `memory.backend` is declared in config | workspace config |
| `tasks-authored` | every in-scope story has at least one task feature | `work:tasks`, `src/commands/tasks.mjs` |

The five composed rows (registry-present) reuse 52's frozen check ids unchanged, so the id space is
`{four base} ∪ {five 52 ids}` and 55 adds its groundedness/frozen-set rows to the same list.

**6 — Equal weights, stated as a decision.** There is no evidence in this repo for any other weighting,
and a weighted score would be a fabricated number — 52/ADR-006's whole discipline (*"encoding an estimate
as a comparable number would make a fabricated value the input to a finding"*). So `score = passed /
applicable`, `not-applicable` rows excluded from the denominator. A repo with no loop graph therefore
scores on four checks out of four and is **not punished for a graph it has no reason to have** — which is
`SPEC §Scope`'s "never a reason a plain loop cannot run", expressed in the arithmetic rather than
promised in prose.

**7 — The score is ADVISORY in 53 and gates nothing.** No `src/` module reads `loopReady` on any path
that can refuse a loop. It becomes a gate at L3, in 55, which is the milestone that also supplies the
anchors that make a readiness claim defensible.

**Alternatives considered.**

- *Register the score as a `CHECK_GROUP` emitting findings* — **rejected:** it changes what
  `aof work doctor` prints for every repo, converts a score into a stream of warnings, and makes
  `doctorWork`'s output depend on an async registry read the pure engine must never perform.
- *Change `doctorWork` to return `{findings, loopReady}`* — **rejected:** it touches every caller
  including the determinism test's serialisation, for a value the command boundary can compute — and
  `healthy`/`strict` are already computed there, so this is the house pattern, not a workaround.
- *A separate `work:loop-ready` command* — **rejected:** `SPEC §Scope` says *"Loop-Ready score on `aof
  work doctor`"*, and a second readiness surface is the second-checklist failure the SPEC names, arriving
  as a whole extra door.
- *A static `import { invoke } from "../command-core.mjs"` in `doctor.mjs`* — **rejected on TECH_DEBT
  item 26's measurement.** It would make `doctor.mjs` the first command module on the registry ring, and
  the failure mode ("fails at import, far from its cause, in whichever process happens to enter the graph
  the wrong way") is masked by the module cache in every existing suite. The deferred form costs one
  line and is already in the tree.
- *Import `loopsValidateCommand` from `src/commands/loops-validate.mjs` and call `.run()` directly* —
  **rejected:** it is a commands→commands import that bypasses the registry door m25/ADR-003 and
  52/ADR-007 both name, and it would make doctor depend on a command *object* rather than a command *id*
  — the one thing 63's triggers will also need to depend on.
- *Weight the checks (e.g. gates 40%, memory 20%…)* — **rejected** as above: invented numbers feeding a
  reported score, in the arc whose PRD makes measurement honesty its subject.

**Consequences.** `src/work-doctor.mjs` and its four lane modules are **not edited**, so 52/ADR-007 §5's
"`validateWork` and `work:doctor` are not extended" survives in the milestone that was always going to
test it. `aof work doctor --json` gains exactly one additive key, `loopReady`; the human render gains one
line. A repo with no loop registry gets a complete, honest score with five rows marked
`not-applicable` — the "report absence explicitly" discipline 52/ADR-011 §11/D2 applied one milestone
later. The cost named: the four base checks are the smallest defensible set, not a complete readiness
bar; 55 widens them, and the shape is built to be widened.

**Invariant.** `src/work-doctor-loop-ready.mjs` is a member of the determinism glob's module set, is
**not** a member of `CHECK_GROUPS`, imports no `work-loops*.mjs` (transitively) and reads no clock/fs;
`src/commands/doctor.mjs` reaches the loop registry only through a deferred `invoke("work:loops-validate")`
and holds no static import of `command-core.mjs`; with no registry the five loop rows are
`not-applicable` and excluded from the denominator; with a registry the composed counts equal
`work:loops-validate`'s own `summary.checks` exactly; no `src/` module reads `loopReady` on a refusal
path. (Enforced by `acd-loop-ready-registry-optional`.)

---

## ADR-008: `autonomous.md` is reduced to a shell-out in THIS milestone and keeps only what is NOT loop shell; "proven" is a named `@manual` soak lane; the deletion is a later chore; and no new `/aof:*` wrapper ships, because `/aof:autonomous` IS the wrapper

**Status:** Accepted
**Date:** 2026-08-15

**Context.** RESEARCH §Q7 read the prompt in full and confirmed the SPEC's claim at the source. Its
`<process>` block (`autonomous.md:40-124`) is the loop: reclaim orphaned runs (`:41-47`), loop until
`aof work next <range> --json` returns done (`:52`), branch on the result (`:54-58`), the prose phase
mapper (`:60-81`), the run-tracking and failure-classification guidance (`:82-120`), and "go back to step
1" (`:122-124`). Its `<stop_conditions>` block (`:126-143`) is the stop set. Its only cap is
`work.autonomous.maxAttempts` (`:14`). **None of it is enforced by anything other than the model choosing
to follow it** — there is no code path that stops a model mid-turn. That is the milestone's opening
sentence, verified.

Two things in the document are **not** loop shell: the `--solo` execution-mode resolution (`:24-37`) —
whether the roles are played inline or spawned, a prompt concern the shell has no view of — and the
`--ship` post-accept `aof:code-review <NN>` step (`:19-20`, `:77`), which is a PR act, not a loop act.

RESEARCH §Q2 also settles the wrapper question mechanically: the only registry-enforced bundle-parity
gate is scoped to `work:insert-*` (`test/arch/acd-work-insert-command-bundle-parity.test.mjs:23-27`), so
nothing forces a wrapper; whether one ships is a house-rule judgment, and 52/ADR-008 set the precedent
for recording that judgment in writing with a named discharge trigger.

**Decision.**

**1 — What ships in this milestone.** `src/bundle/commands/autonomous.md`'s `<process>` and
`<stop_conditions>` blocks are **deleted** and replaced by a shell-out:

> Run `aof work loop <range> --level L2 --json`. Report what it returns: the items it drove, and — if it
> halted — the stop id, the ref, and the exact command to resume (`aof work loop <range> --resume`). Do
> not re-implement the loop, the phase mapping, the gate, the retry or the stop conditions; they are the
> shell's.

What **stays**: the `<config>` block's `--solo` mode resolution and the `--ship` step, both re-anchored on
the shell's output rather than on a loop the prompt runs. What **goes**: every cap, every stop condition,
the phase mapper, the run-tracking prose and the anti-loop policy paragraph (`:112-120`) — the last
because m20/ADR-006's *guard* lives in the store (`src/run-store.mjs:405-408`) and only the *guidance*
lived here; the shell now applies the policy the guard already enables.

**Two homes for one rule is the disease this milestone exists to cure.** Leaving the prose loop beside
the code loop would mean a model could follow either, and they could disagree — which is strictly worse
than today, where at least there is only one (wrong) home.

**2 — "The two coexist" means the DOOR coexists, not the implementation.** `/aof:autonomous <range>`
keeps working, keeps its name, keeps its `--ship`/`--solo`/`--max-attempts` argument hints, and keeps
every caller — including `resolveDirectivePhase`'s milestone→`autonomous` resolution
(`src/commands/continue.mjs:114-133`, ADR-002 §4) and the mesh's directive vocabulary. Only its body
changes.

**3 — "Proven" is defined, not gestured at.** The discharge condition for *deleting* the prompt is a
named `@manual` UAT lane in this milestone: **`aof work loop <NN> --level L2` drives one real milestone
on this repo's own stream from `not-started` to `done`, or halts at exactly one genuine gate, observed by
the operator, with the halt's stop id matching the operator's own reading of why it stopped.** Until that
lane is signed off, the prompt stays. The deletion itself is **not this milestone's** — it is a chore,
carrying the `resolveDirectivePhase` supersession ADR-002 §4 names as its precondition.

**4 — No new `/aof:*` bundle wrapper ships, and the reason is stronger than 52's.** `SPEC §Scope` names
the reduction of `autonomous.md`, which means **the wrapper already exists and is already named**:
`/aof:autonomous` IS `aof work loop`'s prompt-side door. Shipping a second `/aof:loop` beside it would be
two doors to one act — `continue.mjs:3-8`'s measured defect, reintroduced in the milestone that cites it.
And the three `work:drive-<phase>` commands get no wrapper for a sharper reason: a `/aof:drive-continue`
would be a prompt that spawns a session to run `/aof:continue` — **circular by construction**, from
inside a session. The operator's standing rule ("a `work:*` command isn't done until its `/aof:*` wrapper
ships") is therefore satisfied for `work:loop` and consciously departed from for the three drivers, with
the discharge trigger named: **if a phase prompt ever needs to invoke a driver, the wrapper ships with
the caller that justifies it.**

**Alternatives considered.**

- *Leave `autonomous.md` untouched and let the two run side by side* — **rejected:** two homes for the
  cap, the stop set and the phase map, in the milestone whose thesis is that the prose home is
  unenforceable. `PRD §Constraints`' *"Loops nobody consults… are removed"* discipline applies to prose
  loops first.
- *Delete `autonomous.md` in this milestone* — **rejected:** it strands `resolveDirectivePhase`'s
  `"autonomous"` return (`continue.mjs:132`) and every mesh directive that carries it, and it removes the
  operator's most-used door before the replacement has been soaked. `SPEC §Scope` says coexist-then-remove
  and it is right.
- *Keep the stop conditions in the prompt "for the model's benefit"* — **rejected:** the shell reports
  the stop id and the resume command; a model reading a second, prose copy of the stop set is a model
  that can decide the shell was wrong.
- *Ship an `/aof:loop` wrapper anyway to honour the memory literally* — **considered and rejected** on
  the two-doors argument above. The memory's purpose is that a CLI verb should be reachable from a
  session; it is, through the door it already has.

**Consequences.** One markdown file changes, and it is the highest-leverage prose change in the
milestone: the caps and stop conditions stop being instructions a model may skip. The bundle mechanics
are unchanged — content changes the manifest hash automatically (RESEARCH §Q7: `hashContent` via
`src/work-bundle.mjs:181, 215`), so shipping it is `node scripts/install-local.mjs` plus a restart, per
`.claude/rules/build-deploy-restart.md`. `src/work-bundle.mjs` (28 dependents) is not edited.

**Invariant.** `src/bundle/commands/autonomous.md`, comment-stripped, contains none of the loop-shell
tokens it owns today (`Loop until`, `aof work next`, `aof work run-start`, `run-retry`, `maxAttempts`,
the stop-condition list) and names `aof work loop` as its body; no `/aof:loop` or `/aof:drive-*` member
is added to `src/bundle/bundle.json`. (Enforced by `acd-loop-cap-single-home`.)

---

## ADR-009: The lines this milestone does not cross — 53 enforces the bound and never chooses its value; the rubric, the anchors, the tuner, the triggers and the phase logic all stay outside

**Status:** Accepted
**Date:** 2026-08-15

**Context.** `SPEC §Out of scope` and `PRD §Constraints` draw five boundaries, and every ADR above brushes
at least one of them. Recording where each line falls is cheaper than re-litigating it at five Three
Amigos sessions.

**Decision.**

**1 — 53 ENFORCES a bound; it does not CHOOSE one.** The gate-retry ceiling is
`work.autonomous.maxAttempts`, resolved from config with the existing default of 3, from the same key
`src/commands/run-retry.mjs:62` and `src/commands/resume.mjs:119` already read and this repo's own
`.aof/aof.config.json` already sets. **This milestone adds no new cap, no new key, no new default and no
new resolution site.** The *value* — and the build-loop cap on the inner agent turn, and the token
budget, the model map, the telemetry and headless-driver hardening — are `PRD-acd-loop-performance.md`'s;
53 consumes them (`PRD §Constraints`: *"Do not duplicate loop-performance"*). Concretely: the shell bounds
the **gate-retry cycle** (validate-red → re-drive continue), which is the cap `autonomous.md:14` already
names. It does **not** bound what happens inside one agent turn.

**2 — The rubric is 54's; the gate ORDER and the stop SET are 53's.** 53 declares `GATE_ORDER`
(deterministic `validate` before any model turn) and the closed `LOOP_STOPS` (ADR-005 §4/§6). 54 supplies
the structured feedback that rides the retry — which scenario, which fitness function, the delta — and
consumes 53's order and stops unchanged. 53 ships no rubric, no feedback record and no grader.

**3 — The anchors, the frozen set and L3 are 55's.** ADR-006 declares and locks; 55 unlocks. 53 ships no
anchor, no provenance stamp, no capability grant, no path allow/denylist. The Loop-Ready score is
advisory here and becomes a gate there (ADR-007 §7).

**4 — Tuning is 62's, triggers are 63's.** 53 ships no `aof work tune`, no proposal, no auto-apply, and
no cron/webhook/PR/assignment trigger. What 53 owes them is exactly what their SPECs ask for: a CLI
entrypoint with a declared level and a frozen `--json` state contract (ADR-005 §3). `63 SPEC`'s "a
trigger just calls `aof work loop <ref>`" is satisfied by the launcher-seam command as designed.

**5 — The SHELL becomes code; each phase's WHAT-TO-DO stays its prompt.** `SPEC §Out of scope` forbids
"moving phase logic into code… no DAG engine". The line: 53 encodes **which prompt to run next**
(dispatch — the frozen table at ADR-005 §5, transcribed from `autonomous.md:60-81` without addition) and
**nothing about what that prompt does**. `/aof:refine`, `/aof:continue` and `/aof:verify` are unchanged
byte-for-byte. There is no task graph, no dependency engine beyond `nextWork`'s existing `depends` walk,
and no re-implementation of any ACD stage.

**6 — Product judgment stays in the spawned turn.** ADR-005 §4 makes this structural: every stop id names
a producing code, and the two `autonomous.md` stop conditions that are judgments ("a wrong or infeasible
scenario", "an open decision that cannot be safely defaulted") are deliberately absent from the set,
reaching the shell as `session-needs-input`.

**Consequences.** Four downstream milestones can be contracted against this document without reading
53's code. The cost named: 53's loop is *less* clever than `autonomous.md`'s prose loop in two places —
it halts on a `spike`/`chore` (ADR-005 §5) and it cannot itself judge an infeasible scenario. Both are
deliberate, both surface rather than guess, and both are one frozen-table row away from being fixed by
whoever measures that the fix is right.

**Invariant.** `work.autonomous.maxAttempts` gains no new default and no new resolution site beyond
`src/commands/loop.mjs`; `src/bundle/commands/{refine,continue,verify}.md` are unchanged; no module in
this milestone contains a rubric, an anchor, a proposal or a trigger. (Enforced by
`acd-loop-cap-single-home`, and by the partition's Must-NOT-touch columns.)

---

## ADR-010: The closure round — the rulings six Three Amigos sessions forced out of ADRs 001–009, each measured at source before it was decided

**Status:** Accepted
**Date:** 2026-08-15

**Context.** ADRs 001–009 were written before any task contract existed. Six Three Amigos sessions
then read them against the real source and returned defects: one place where two contracts
**contradict each other**, three seams the ADRs assume but never declare, several rows in the fitness
table that are measurably wrong, and a dozen decisions the contracts had to pin because no ADR ruled
on them. Milestone 52 hit exactly this and answered it with closure ADRs (52/ADR-011 §1–§13, ADR-012,
ADR-013); this is 53's, on the same discipline: **numbered sections, each naming what it closes, each
carrying a `file:line` verified in this round rather than inherited.**

Every measurement below was re-taken on 2026-08-15 against HEAD by the architect, not accepted from
the session that reported it. Where the re-measurement **disagreed with the session** it says so —
three of them did.

**Graph re-grounding.** `aof graph build .` → `unchanged: true`, **10,481 nodes / 25,365 edges**,
`builtAt 2026-08-15T00:52:42.569Z`, egress none. Graphify rewrites only on a topology change, so an
untouched artifact means the graph is current; it is used as such. `aof graph impact` on the files
this round rules over: `src/mesh-worker-execution.mjs` — **49 dependents**;
`src/commands/doctor.mjs` — **1** (`src/command-core.mjs`); `src/commands/continue.mjs` — **3**;
`src/run-store.mjs` — **35**; `src/work-doctor.mjs` — **10**; **`scripts/test.mjs` — 0 dependents and
694 outbound edges** (the fact ADR-011 turns on). These are actual edges.

**Decision.**

---

**§1 — An inverted range (`53-52`) is REFUSED. Closes A1 — the round's only contract-vs-contract
contradiction.** 53/01 refuses it (`loop-scope-unsupported`); 53/02 admits it and reports `done`.
**53/01 wins.** Verified at source: `inRange` (`src/work.mjs:847-860`) matches `^(\d+)-(\d+)$` at
`:849` and returns `(num) => num >= lo && num <= hi` at `:853`, so `"53-52"` builds a predicate that
matches **nothing**; `nextWork` then falls through its whole driver walk and returns
`{ state: "done" }` at `src/work.mjs:1011`. That is `done` over a stream the walk never had a
candidate in — the *same silent-green class* ADR-003 exists to close, and materially worse inside a
loop than inside a read, which is ADR-003's own opening argument. 53/02's reading (the guard refuses
FORMS, not arithmetic) is coherent but concedes the exact failure the guard was built for.

`LOOP_SCOPE_FORMS` therefore stays a two-member pattern list **and** the `range` form carries an
admission predicate: a range is admitted iff `lo <= hi`. `53-53` is admitted (one driver is a
legitimate range); `53-52` and `100-1` are `loop-scope-unsupported` with the reason *"the range admits
no driver — `lo` is greater than `hi`"*. This is not a third scope parser and not a widening of
`inRange`: it is the same shape guard deciding one more thing about the same string, still
`(plain data) => decision`, still reading no stream.

**OVERRULED: 53/02.** `tasks/07_refusals-and-inert-levels.feature` must change — the Examples row
`| 53-52 | yes | (none) | an inverted range is a FORM the guard admits … reports done |` becomes
`| 53-52 | no | loop-scope-unsupported | inverted — matches no driver, so `work:next` would answer done over a stream it never walked |`.

---

**§2 — The injected spawn seam is DECLARED, and it is a requirement on `src/commands/loop.mjs` and
`src/commands/drive.mjs`, not an afterthought. Closes B2.** FF-5304 and FF-5306 both say "over an
injected spawn seam" and neither ADR says where that seam is. Verified: `driveInteractiveClaudeSession`
already takes `options.ptySpawn` (`src/mesh-worker-execution.mjs:1464` —
`const ptySpawn = options.ptySpawn ?? defaultPtySpawn;`), and the house idiom for carrying an
injection bag from a test into a registered command's `run()` is a **`ctx` key** —
`ctx.globalWorkStoreOptions` (`src/global-work-publisher.mjs:91`, `src/item-lock.mjs:173`,
`src/mesh-assignment.mjs:62`, `src/commands/list.mjs:35`) and `journalOptions`
(`src/mesh-assignment-reclaim.mjs:202`).

Ruling: **`work:loop` and each `work:drive-<phase>` read `ctx.agentSessionDriverOptions ?? {}` and
pass it verbatim into `driveInteractiveClaudeSession`.** One key, one name, both commands, following
`globalWorkStoreOptions` exactly. It carries `{ptySpawn, which}` (the pair
`test/support/mesh-worker-terminal-fixture.mjs` already produces — `createFakeWhich` `:14`,
`createFakePtySpawn` `:83`) and nothing else. Without it neither zero-spawn leg of FF-5304/FF-5306 is
drivable and **none of 53/02's nine features is mechanisable** — TECH_DEBT item 48's failure shape
designed in. It is added to 53/02's Owns in the amended partition.

---

**§3 — `work:drive-<phase>` gains `--dry-run`, and the bijection probe uses it. Closes B3.**
ADR-005's Consequences names `["work","drive",<phase>,"03/01","--json"]` as the `argsFor` case. A
driver **always** spawns; the bijection gate spawns a real subprocess
(`test/arch/acd-work-command-cli-bijection.test.mjs:256-263`) into which no fake seam can reach; and
the accepted-exit list is `[0]` for every subcommand outside `["validate","doctor","update"]`
(`:314`). So on a machine where `claude` resolves — this control node — that probe **starts a real
interactive agent against a temp fixture and hangs the suite**, and where it does not resolve it exits
`failed` and the gate becomes environment-dependent. Neither is acceptable in a gate.

Ruling: **`--dry-run` is a declared boolean flag on all three drivers** — resolve the ref, report
`{ref, phase, command}` (the exact `/aof:<phase> <ref>` line it would type), spawn nothing, exit 0.
The probe form is `["work","drive",<phase>,"03/01","--dry-run","--json"]`, which keeps the accepted-exit
list at `[0]` unwidened. The precedent is in the same file for the same reason:
`case "upgrade": return ["work","upgrade","--dry-run","--json"];` (`:236`, with its own note
*"so the probe never mutates the fixture"*). This is a real addition to ADR-002 §1's command shape and
is recorded as one. 53/02's contract already pinned it; **confirmed, not overruled.**

---

**§4 — `work:next` answering `state: "held"` maps onto `dependency-blocked`. Closes D1.** Verified:
m43's item lock makes `held` first-class and distinct — `src/commands/next.mjs:79` returns
`{ state: "held", skipped }` when a ready ref is held, and `:85` converts a `done` result to `held`
when anything actionable is held elsewhere, with the in-file note *"'everything actionable is held
elsewhere' is NOT 'done' … a held item and a blocked item are different answers."* ADR-003 §2 admits
`held` into the verbatim passthrough; ADR-005 §4's stop table names no producer for it.

Ruling: **no ninth stop.** `held` halts with **`dependency-blocked`**, producer `work:next` returning
`state: "held"`, carrying the `skipped` holder rows verbatim so the operator can see who holds it.
Reason: the stop set is a **closed contract 54, 62 and 63 read** (ADR-005 §4), and a ninth member is a
renegotiation for a case that is, from the shell's side, the same act — *this scope cannot advance
here, and the reason is another actor*. The distinction `next.mjs:81-84` protects is preserved where
it belongs: in the **producer field and the `skipped` payload**, which is exactly why ADR-005 §4
requires a producer per stop rather than a stop per producer. **53/01's pinned default is
confirmed; 53/02's refusal to invent one was right.**

---

**§5 — `state: "refused"` is STRUCK from the frozen document, and refusals ride the face's one error
envelope under a second frozen set, `LOOP_REFUSALS`. Closes D2 and D7(a).** Verified: a coded refusal
raised out of a command's `run()` reaches `--json` through `emitJsonErrorEnvelope`
(`src/spine/face.mjs:186-194`) as `{ok:false, error, code, ...structuredDetail(error)}` — a document
carrying **none** of ADR-005 §3's ten keys. And `structuredDetail` (`:203-207`) is explicitly *"the ONE
structured-refusal channel"*, with the in-file warning at `:196-202`: *"a per-key special case here is
how a face grows a second vocabulary."* Adding a `code` key to the frozen LoopState would be that
second vocabulary.

Ruling, in three parts:
- **`state` is `"ready" | "blocked" | "done" | "halted"`** — four members. A refused invocation
  produces **no LoopState at all**.
- **A refusal is the face's error envelope**, `code` = the refusal id, structure on `error.detail`
  (the m43 item-lock precedent, `face.mjs:196-202`), exit non-zero.
- **The refusal vocabulary is its own frozen exported set**, declared beside `LOOP_STOPS` in
  `src/work-loop.mjs` so 54/62/63 read it rather than invent it:
  ```js
  export const LOOP_REFUSALS = Object.freeze([
    "loop-scope-unsupported",   // ADR-003 §1 + §1 above
    "loop-level-locked",        // ADR-006 §1
    "loop-level-unknown",       // ADR-006 §1
    "loop-bound-unresolved",    // §10 below — an absent/0/2.5/"3" cap
  ]);
  ```
  It is deliberately **not** a member of `LOOP_STOPS`: a stop is a loop that ran and stopped; a refusal
  is a loop that never started. 53/01 reached the same conclusion for `loop-bound-unresolved` and named
  it "the invocation-refusal family" — this gives that family a name, an export and a contract.

**OVERRULED: 53/02.** `tasks/01_loop-probe-and-json-contract.feature` must change at `:55` and the
Examples row at `:143` — `state` is one of **ready, blocked, done or halted**, and nothing else.
(53/01's engine-level word `refused` is untouched: the pure engine's decision may carry
`{refusal: {code, …}}`; the command translates it into the envelope. Two layers, one vocabulary.)

---

**§6 — The phase map's milestone rows are answered by `work:list`, and they key on `stories.total`
alone. Closes D3.** ADR-005 §5 pins `work:tasks` for `hasTasks`/`counts.uat` and names no door for
"milestone with no stories" / "milestone with all stories done". Both sessions pinned `work:list`
under the one-door rule. **Confirmed** — `work:list` returns the whole stream unwrapped with each row
carrying `type`, `parent` and `status` (`src/commands/list.mjs:34-38`, `src/work.mjs:630-637`), it is a
registered command, and it is the only registered read that enumerates.

And **confirmed, with the source re-read**: the map keys milestone rows on `stories.total` alone and
never re-checks a ready story's `status`. `nextWork` offers a **milestone** in exactly two places —
`src/work.mjs:963-973` (zero stories → "needs break-down") and `src/work.mjs:1008` (the
all-stories-done accept fallthrough, guarded at `:1005` so a candidacy-skipped story never counts as
done). A ready **story** is only ever returned from `:979-999`, i.e. `status !== "done"`. So
`{total: 3, done: 1}` → `drive verify` is **unreachable by construction**, and re-deriving what the one
door guarantees is the second-answer disease ADR-003 §2 forbids. The table's milestone rows read
`total === 0 ⇒ drive refine`, `total > 0 ⇒ drive verify`.

---

**§7 — No-progress is bounded by the SAME `(ref, phase)` cycle cap; no ninth stop. Closes D4.** A phase
can settle `done` without advancing the stream, after which `work:next` answers the same ref forever.
Both sessions pinned "the same `(ref, phase)` is driven at most `cap` times, then `cap-exhausted`".
**Confirmed as the reading of ADR-005 §6**, and §6 is hereby amended to say so out loud: the bound is
not "gate retries" but **"drives of one `(ref, phase)` pair"** — one rule, which happens to cover the
gate retry, the findings-driven re-drive and the no-progress spin with the same arithmetic. It invents
no id, no counter and no persisted position: `cycle` is already a key of `brief.loop` (ADR-004 §2).
The comparison is `cycle >= cap`, the fail-closed shape `shouldRetry` uses
(`src/run-store.mjs:141-142` — `record.attempt < maxAttempts`), so `cap: 1` means one attempt in both
homes.

---

**§8 — An L1 loop WALKS BY ENUMERATION through `work:list`, never by re-asking `work:next`. Closes
D5.** ADR-006 §3 says an L1 loop "walks the scope to terminal" using only reads — but under a
read-only level nothing changes, so `work:next` is a **fixed point** and the walk never terminates.
That is a real defect in ADR-006 §3 and it is corrected here rather than papered over.

Ruling: **an L1 loop asks `work:list` once, filters to the in-scope actionable items with the same
`LOOP_SCOPE_FORMS` scope it was given, and reports one row per item — the `act` an L2 loop would take
— then ends.** It may ask `work:tasks` and `work:validate` per reported row (both reads). It asks
`work:next` at most once, for the "what would be offered first" row, and never in a loop. Termination
is asserted, not assumed. 53/02's contract already pinned this mechanism
(`tasks/07…:92-103, 163-173`); **confirmed**, and ADR-006 §3's "walks the scope to terminal" is
superseded by this sentence.

---

**§9 — The `uat` row IS a subtraction from `autonomous.md`'s prose, and it is recorded as a
departure. Closes D6.** Verified at source: `autonomous.md:78-80` says a ready uat session means
*"Run `aof:verify NN` to drive the automated lanes … then **stop** for the human `@uat` sign-off"* —
two acts. ADR-005 §5's frozen table says `halt uat-gate` — one act. So the table is **not** a
transcription "without addition"; it is a transcription with a **subtraction**, and ADR-005 §5's own
claim to the contrary is wrong.

Ruling: **the table stands, and the departure is recorded as one.** Reason: driving a uat session's
automated lanes is a *model turn the shell would have to decide to run without a human present*,
against an item whose entire definition is "a human signs this off". Halting at the door and naming
the by-hand command keeps the shell out of that judgment. The lost step is made **visible, not
silent**: the `uat-gate` halt for a ready `uat` item names **`aof work drive verify <ref>`** as the way
to drive the session's automated lanes by hand. 53/01 pinned exactly this
(`tasks/02_phase-map.feature:104-110`); **confirmed.**

---

**§10 — `loop-bound-unresolved`, and the store-refusal map's `null`. Closes D7.**
*(a)* An absent / `0` / `-1` / `2.5` / `"3"` / `Infinity` / `NaN` cap decides
**`loop-bound-unresolved`**, naming the offending field and `work.autonomous.maxAttempts` as the
caller's resolution site. It is a member of `LOOP_REFUSALS` (§5), **not** of `LOOP_STOPS`, so
FF-5304's frozen eight is untouched. 53/01's pinned default is **confirmed** and given its home.
ADR-009 §1 forbids an engine-side default; a refusal is the only remaining honest answer, and a quiet
`3` in the engine would be the second home for the number this milestone exists to give one home.

*(b)* The store's five coded refusals (`duplicate-run` `src/run-store.mjs:407`, `not-retryable`,
`attempts-exhausted` `:611`, `no-retryable-run`, `retry-parked`) map onto three stops. 53/01 ruled
`duplicate-run` and `no-retryable-run` map to **no stop** (in-loop recovery — `autonomous.md:110-120`
says exactly that), and an unrecognised/absent answer **fails closed** to `run-not-retryable`
(mirroring `src/run-store.mjs:118`'s own *"anything else, or null → non-retryable (FAIL CLOSED)"*).
**Confirmed** — and the ADR line it wants is this: **"no stop" is not an `act`.** The mapping is a
separate pure function whose codomain is `LOOP_STOPS ∪ {null}`; `null` means the caller re-asks
`work:next`. `act` stays closed at exactly `drive | gate | halt | done` with no re-ask member, because
re-asking is what the loop does when it is *not* halting — it is the absence of a decision, not a
fifth one.

---

**§11 — `work:drive-<phase>` mints NO run record. Closes D8.** **Confirmed**, and ADR-004's own
reasoning is why: `mintRun`'s dedup guard refuses a second non-terminal run per item
(`src/run-store.mjs:405-408`, `duplicate-run`), so a driver minting its own would collide with its
caller's on the first composed phase — the exact collision ADR-004's alternatives section rejects a
loop-owned run record for. The run ledger is the loop's; a bare hand-driven phase is as ledger-free as
today's local `work:continue` answer, deliberately.

---

**§12 — `cap-declared` means DECLARED, and the fallback's existence is part of the fail evidence.
Closes E1.** ADR-007 §5 says the check passes when `work.autonomous.maxAttempts` *"resolves"* —
verified unfalsifiable: `src/commands/run-retry.mjs:62` is
`input.maxAttempts ?? ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 3`, so it **always**
resolves, and a check that cannot fail measures nothing. **Ruling: the id's own word governs.**
`cap-declared` passes iff the config **declares** an integer `>= 0` at that key; an absent key, an
absent block, a `null`, a string `"3"`, a `2.5`, a `-1` or a `true` all **fail**, and the failing
evidence names both the key and the value the retry path would otherwise fall back to. 53/03's pinned
default is **confirmed**; ADR-007 §5's "resolves" is superseded by "is declared".

---

**§13 — `tasks-authored` is answered from doctor's OWN snapshot, not from an N-invoke `work:tasks`
fan-out; and `inScope` is EXPORTED rather than copied a fourth time. Closes E2, and this is the one
place the closure round overrules a contract on substance.**

Three facts, all measured on this repo on 2026-08-15:
- `work:tasks` takes **one** ref (`src/commands/tasks.mjs`), so the row needs an enumeration.
  `findWork(workDir, "53")` cannot supply it: the bare-number branch filters
  `item.parent == null && sameNum(item.number, ref)` (`src/work.mjs:557-560`) — the milestone row
  only.
- `work-doctor.mjs`'s `inScope` (`:455-463`) is **not exported** (verified: `grep '^export ' src/work-doctor.mjs`
  lists nine names and `inScope` is not among them).
- **The fan-out costs 3,214 ms.** Measured by driving `invoke("work:tasks", {ref}, {workspace})` for
  all **185** stories in this repo's stream: `185 stories, 178 with tasks, in 3214 ms`. The baseline
  `aof work doctor --json` on the same tree is **1,157 ms**. That is a **~3.8× regression on the health
  command** for one advisory row, on every unscoped run. (For scale: reading and parsing all 643
  `.feature` files with `parseFeature` alone is 306 ms; `buildSnapshot("wiki/work")` — doctor's
  dominant cost — is 560 ms, so a second snapshot build is also refused.)

Ruling, in three parts:

1. **The predicate is `buildSnapshot`'s own per-story `hasTasks`.** `buildSnapshot` is already exported
   (`src/work-doctor.mjs:232`) and already enriches every story item with
   `hasTasks: item.type === "story" ? await hasTaskFiles(item.dir) : false` (`:281`). It is doctor's
   one door for "does this story have an authored contract", built **once** per doctor run.
2. **The snapshot is HOISTED to the impure edge, so it is built once, not twice.** `doctorWork` gains
   `const snapshot = options.snapshot ?? await buildSnapshot(...)` at `src/work-doctor.mjs:514`, and
   `src/commands/doctor.mjs`'s `run()` builds it beside `Date.now()`, the raw committed config, the
   sidecar probe, the cache overlay and the fabric probe — which is precisely what that engine's own
   header already claims happens (`work-doctor.mjs:500-507`: *"commands/doctor.mjs reads … and hands it
   in here as plain data, exactly like `now`/`staleWindow` — the engine itself performs no extra disk
   read"*). Today the engine performs **the** disk read; this makes the header true.
3. **`inScope` gains the `export` keyword** (`src/work-doctor.mjs:455`). A fourth copy is **refused by
   name**: this milestone ledgered TECH_DEBT item 49 for three independently-written scope parsers, and
   writing the fourth inside `src/work-doctor-loop-ready.mjs` would be that item's own disease
   committed by the milestone that reported it. Item 49's fix list gains
   `src/work-doctor-loop-ready.mjs` as a consumer of the one home.

**This supersedes ADR-007's "src/work-doctor.mjs and its four lane modules are not edited."** The
permitted diff to that file in this milestone is **exactly two lines**, both additive and both
optional-by-default: the `export` keyword at `:455`, and `options.snapshot ??` at `:514`. `CHECK_GROUPS`
is not extended, `doctorWork`'s return is unchanged, the four lane modules are untouched, and all ten
dependents (graph, 2026-08-15) are byte-unchanged — so 52/ADR-007 §5's actual pre-commitment (the five
loop checks land only in `work:loops-validate`) survives in substance, which is what it was for.
FF-5309 gains a leg pinning that two-line ceiling.

**The named cost, routed rather than hidden:** `hasTaskFiles` (`:138-144`) returns true for **any**
regular file under `tasks/`, while `work:tasks` counts `.feature` members only. So a `tasks/` holding
only `notes.md` passes `tasks-authored` where `work:tasks` would fail it. That is a genuine
two-answers-to-one-question divergence, it is **doctor's existing semantics** for
`started-story-no-tasks` (`src/work-doctor-coherence.mjs:322-330`), and this milestone does not change
a shipped doctor check's meaning in flight. It becomes **TECH_DEBT item 51** (ADR-011 §5).

**OVERRULED: 53/03.** `tasks/03_base-checks.feature` must change — the scenario *"`tasks-authored` is
answered by `work:tasks`, one door"* (`:125-129`) and the Examples row
`| 1 | 0 — `tasks/` holds no `.feature` member | fail |` (`:197`) invert under the snapshot fact; the
header's source sentence (`:15-18`) and the `inScope` citation (`:19-20`) need re-aiming at
`buildSnapshot`'s `hasTasks` and the now-exported `inScope`. Everything else in that file — the
scope-invariance table, the 0-of-0 vacuous pass, the stories-only rule, the evidence discipline —
stands unchanged.

---

**§14 — Reading verbatim leaves the unparseable-record hole open, and `registry.error` is the whole
answer to it. Closes E3 and E4.** Verified at source, all three legs:
- 52's five checks emit `severity: "warn"` **unconditionally** —
  `src/work-loops-checks.mjs:89-91` is `finding(code, path, message) => ({code, severity: "warn", …})`.
- The loader's `loop-record-unparseable` is `severity: "error"` (`src/work-loops.mjs:517-522`) and
  lands in `model.findings`, which `loops-validate.mjs:31` folds into the flat `findings` array — so it
  reaches `summary.error` (`:43`) but touches **no** `summary.checks[<id>].findings` (`:35`).
- Therefore a registry with an unparseable record scores **9/9 with `registry.error` non-zero**.

**Confirmed as the correct reading.** Inventing a tenth row would be the second checklist ADR-007 §3
forbids and 52/ADR-007 pre-committed against. `registry: {present, composed, error, warn}` is in
ADR-007 §4's frozen shape **for exactly this reason**, and that is now stated rather than implied: the
`error`/`warn` counters are the composition's honest channel for everything 52's five checks
structurally cannot see.

And the fault ADR-007 never ruled on: **a registry that cannot be READ.** `loadLoops` returns
`{present:false}` only for ENOENT and **rethrows everything else** (`src/work-loops.mjs:502-504`).
Measured 2026-08-15: `wiki/work/loops` as a regular *file* raises
`ENOTDIR: not a directory, scandir …` and propagates. Ruling: **doctor degrades** —
`present:false`, `composed:false`, the five rows `not-applicable` with the fault **named in their
evidence**, `applicable: 4`, and doctor's own `findings`, `errors`, `warnings`, `healthy`, `strict`
and exit code **byte-identical to the no-registry run**. A broken loop registry must never be able to
break the health command; the score reports, it never adds a check group. 53/03's pinning is
**confirmed**.

Related boundary, **confirmed and recorded** because it is one line from being got wrong: an **empty**
`loops/` directory is **PRESENT**, not absent — `readdir` succeeds, `recordEntries` is empty, all five
checks run over an empty model and report `{ran: true, findings: 0}`, `applicable` is **9**, all five
**pass**. It is the *directory* that decides registry-optionality, not the records.

---

**§15 — `loopReady` is computed in `run()`, forwarded by `json()`, and absent from both ledger modes.
Closes E5.** Verified: `json(result, faceCtx = {})` (`src/commands/doctor.mjs:232`) takes **no `ctx`
and no workspace** and cannot `invoke`; and it does not spread `result` — it returns a fixed
`{healthy, strict, errors, warnings, findings}` (`:245`). And `run()` already returns an **object**,
`{ findings: [...] }` (`src/commands/doctor.mjs:175-181`) — not a bare array. So:
- the composition happens in `run()`, which returns `{findings, loopReady}` — a one-key addition to a
  shape that is already an object;
- `json()` forwards it as a sixth key;
- **ADR-007 §1's guarantee is about the ENGINE** (`doctorWork`'s bare-`Finding[]` return, which the
  determinism test serialises), **not about the command's `run()`**, so nothing breaks. That
  distinction is stated here because it is exactly the kind of thing a builder reads the wrong way.
- `exit()` (`:247`) keys on `Array.isArray(result.findings)` and is unaffected.

**The ledger modes carry none of it.** `--explain` and `--converge` return early at
`src/commands/doctor.mjs:96-97` and pass through verbatim at `:234`: **no `loopReady` key, no render
line, and no loop-registry read on either.** 53/03's pinning is **confirmed**.

And **`memory-on` is confirmed as pinned**: `selectBackendName` (`src/work-memory.mjs:64-66`) is
`config?.memory?.backend ?? "none"`, so an absent `memory` block, an absent `backend` key and an
explicit `"none"` are one fact spelled three ways and all three **fail**; an **unregistered** backend
name **passes**, because the score reads config and does not adjudicate `BACKEND_REGISTRY` — a second
checklist beside the memory seam's own registry is the thing ADR-007 §3 forbids.

---

**§16 — `reportDegrade`'s first argument STAYS `"mesh-worker-execution"` in the moved block. Closes
F5 — the one thing 53/00 deliberately left unruled, and it was right to.** Measured: the moved block
`:847-1851` contains **20** `reportDegrade(…)` calls (not ~15), and **all 20** pass the literal
`"mesh-worker-execution"`. That first argument **is** the emitted event's `code`
(`src/degrade.mjs:30-42`) and is observable through `setDegradeSinkForTest` (`src/degrade.mjs:19`).

Ruling: **it stays, verbatim.** Three reasons, in order of weight:
1. ADR-001 §1 says "moved verbatim — no rename, no signature change, **no behaviour change**". The
   emitted `code` is behaviour; changing it is the change that clause forbids, whatever it is changed
   to.
2. It is not merely a label. `reportDegrade` throttles **per code** (`degrade.mjs:32-34`,
   `lastByCode`), so splitting the driver's degrades onto a second code would make driver and handler
   degrades throttle **independently** — an observable timing change in the one path that exists to be
   quiet under failure.
3. The cost is the same class ADR-001 already accepted and named for `WORKER_SESSION_INSTRUCTION`: a
   module-name string that reads slightly wrong in a module the local loop also uses. It is TECH_DEBT
   item 10's third shape (NAME drift), one token, covered by that item's class, and it is fixed by
   whoever renames the code deliberately with a degrade-consumer sweep — never by a builder mid-move.

53/00 was correct to write **no scenario** pinning either side: a `.feature` must not freeze a decision
no ADR made. It may now pin this one.

---

**§17 — Three corrections to ADR-001's own numbers. Closes F1, F2, C8 and C6(a).**

*(a) The re-export alone is insufficient — the sink must also IMPORT three of the moved names* (F1).
Three members are consumed **inward** by code that stays: `defaultSpawnRuntime` at
`src/mesh-worker-execution.mjs:2070` (`createMeshWorkerExecutionHandler`'s `spawnRuntime = defaultSpawnRuntime`
default) and `defaultPtySpawn` at `:3091`
(`createMeshWorkerTerminalResumeHandler`'s `const probeSpawn = options.ptySpawn ?? defaultPtySpawn`),
plus `driveInteractiveClaudeSession` at its remaining handler call site.
ADR-001 §2 says only `export { … } from "./agent-session-driver.mjs";`, which creates a re-export but
**binds no local name** — those sites would be `ReferenceError` at runtime. The sink therefore carries
an import of all three inward-consumed names from `agent-session-driver.mjs` and
the verbatim `export … from` line. Verified 2026-08-15.

*(b) The dependent census, corrected and re-derived* (F2). `graph impact src/mesh-worker-execution.mjs`
→ **49 dependents**, which decompose as **43 `*.test.mjs` suites + 2 `test/support/*.mjs` fixture
modules (`artifact-sync-fixture.mjs`, `gate-propagation-fixture.mjs`) + 3 `src/` modules
(`global-node-registry.mjs`, `mesh-clone-credential-provider.mjs`, `mesh-launcher.mjs`) + 1
`scripts/pin-checkout-id.mjs`**. ADR-001's "44 test files and 5 source" is wrong in both cells. The
two `test/support` fixture modules were never named by ADR-001 and remain part of the link census.
**A trap for whoever re-measures this:** a naive
`grep 'from "…mesh-worker-execution.mjs"'` returns **50** files — the extra is
`test/arch/acd-session-worktree-lane-scoped.test.mjs`, which names the sink only inside **string
literals** (`:191` a planted import inside a template literal, `:265` a fixture path). It is not an
importer; the graph is right and the grep is not. Reopened 53/00 later narrows the byte-identity claim:
of the 43 suites, 42 stay byte-unchanged and one named gate is re-aimed; the two fixtures remain in the
fresh-linkable census, with the separate status-recorder fixture correction governed by 53/00.

*(c) The post-move line count* (C8). The sink is **3,286** lines; the moved block `:847-1851` is
**1,005**; so the sink lands at **2,281** plus the import + re-export block — call it **~2,300**, not
ADR-001 §4's "roughly 2,400". FF-5302 arms at the **measured** post-move count so nothing breaks
either way, but the codebase-health note's number is corrected below: this milestone takes the file
from 3,286 to ~2,300, below every measurement TECH_DEBT item 10 has recorded since 2026-08-01.

*(d)* And `defaultPtySpawn` is **module-private today** (`:1373`, a bare `const`, verified), so
ADR-001 §1's "16 **exported** names" is inaccurate for that one member: the move necessarily creates a
**new public export**, on the driver and on the sink's re-export. That is admitted rather than
finessed — it is one name, it has no alternative (the sink's own `:3091` needs it and the driver owns
it now), and FF-5302's set equality pins it so it cannot quietly grow companions.

---

**§18 — `ensureWorktreeTrusted` is the SEVENTEENTH name, admitted by name. Closes C6(b).** ADR-001 §1
carries it along in a parenthetical while FF-5302 demands "**exactly** the frozen 16-name set (an extra
export is as much a defect as a missing one)" — a contradiction a builder cannot resolve. Ruling:
**it comes with the move and is named as the seventeenth.** Reason: it is already a pure re-export
(`src/mesh-worker-execution.mjs:1442`, `export { ensureWorktreeTrusted } from "./claude-trust.mjs";`
with the comment *"so every existing importer is untouched"*), the driver's own body needs it (trusting
a worktree is a precondition of driving a session in one), and leaving it only in the sink would make
the sink's re-export line the single reason the driver's importers still need the sink. The frozen set
is therefore **17 names**: the 16 of ADR-001 §1 plus `ensureWorktreeTrusted`, with an **eighteenth**
export a defect. 53/05's contract pinned exactly this; **confirmed.**

---

**§19 — The split arch gate's aim: the vacuous-green trap, the seventh read, and the coverage boundary
that must not be faked. Closes F3, F4 and F6 — F3 is the highest-value finding of the round.**

*(a) Invariant 1 goes VACUOUSLY GREEN if left aimed at the sink, and its own self-check does not
catch it.* Verified: `test/arch/acd-worker-driver-no-headless-print.test.mjs:170-177` reads
`DRIVER_SOURCE`, asserts `hasClaudeHeadlessPrintShape(stripped) === false` (an **absence**), and then
plants an appended headless shape and asserts the detector trips. After the move the sink contains no
claude launch shape **at all**, so a mis-aimed invariant 1 passes while checking nothing — **and the
plant still trips**, because the plant is appended to whatever source the test was handed. Green
primary, green self-check, zero information: TECH_DEBT item 5's species landing inside this
milestone's own gate.

Ruling: **invariant 1 carries a positive control.** It must first prove the source it read contains a
driver launch shape at all — post-move that is `buildDriverCommand`'s `bin: "codex"` argv form
(`src/mesh-worker-execution.mjs:847-856`, moving to the driver) — a control the post-move sink cannot
satisfy. An absence is only evidence when it is measured over a source that has presences in it.
53/00's contract closed this; **confirmed, and recorded here as the trap it is.**

*(b) Six read sites become SEVEN reads.* Verified: the file has six `readFile(DRIVER_SOURCE, …)` sites
(`:170, :183, :217, :256, :306, :331`) plus one `readFile(TEST_SUITE, …)` (`:364`). Invariant 4's
single test at `:253-301` carries the **producer** half (driver code) and the **surfacing** half
(handler code) over **one** `raw`/`stripped` pair at `:256-257` — so that one site must read **both**
files. ADR-001's Consequences said "across its six `readFile` sites" and undercounted the work by one
read.

*(c) The codex branch's coverage boundary is NAMED, not faked.* Verified: `defaultSpawnRuntime`
(`:1827-1850`) owns its `execFile` outright — `execFile(bin, args, {cwd, windowsHide, timeout}, cb)`
with **no injected exec seam**, and its own header says so (`:1824-1826`: *"Never exercised against a
REAL binary by `@executable` coverage"*). Adding a seam is the signature change ADR-001 §1 forbids. So
the codex stdout→outcome mapping (`terminal_reason`/`stop_reason` → `done`/`failed`) is **unobservable
at any fixture** after the move, exactly as before it. 53/00 recorded it with the deciding lane
(53/04's `@manual` soak) rather than pretending; **confirmed** — an honest coverage gap with a named
owner beats a fake seam.

*(d)* And the two green results that keep "exactly one pre-existing test file is edited" true, both
re-measured: the moved block's only `assignmentId`/`assignment` occurrences are **in comments**
(relative lines 30, 32, 258, 739, 804, 863 of the block — all `//`), so FF-5301's comment-stripped
token leg passes; and `test/arch/acd-session-worktree-lane-scoped.test.mjs`'s third detector, which
sweeps all of `src/` for `meshWorktreePath`/`meshWorktreesRoot`/`isUnderMeshWorktreesRoot`
(allowlist at `:93-101`), is unaffected because the moved block names **zero** of those three tokens
(measured). `src/agent-session-driver.mjs` is not swept in.

---

**§20 — `--solo`'s reach narrows and the prompt must say so; `--max-attempts N` forwards. Closes G1
and G2.**

*(a)* `work:loop`'s frozen input (ADR-005 §3) carries **no execution mode**, so `/aof:autonomous 53
--solo` cannot reach the sessions the shell drives — they read `work.agents.mode` themselves.
`autonomous.md:26-28` today instructs appending `--solo` to *"every `/aof:refine`, `/aof:continue` and
`/aof:verify` this loop delegates to"*, and after 53/04 this prompt **delegates to none of them**.
ADR-008 §1's "`--solo` … stays" reads as unchanged meaning and is hereby narrowed:

> **`--solo` governs the roles THIS SESSION plays. It does not reach the sessions the shell drives.**

The `<config>` block keeps `work.agents.mode` resolution and the `--solo` override for this session,
and **drops the append-to-every-delegated-command instruction**, because there is nothing left to
append it to. A prompt promising what the shell cannot keep is the unenforceable-instruction disease
this milestone exists to cure — reintroduced, at one remove, by the milestone that cures it.
**`work:loop` does NOT gain a mode input**: an execution mode is a prompt-side concern the shell has
no view of (ADR-008's own words), and adding it would put a second home for "how are roles played"
inside the shell's frozen contract on the day it is frozen.

*(b)* `--max-attempts N` is **forwarded to the shell's `cap` input; the prompt counts nothing.** That
is the only coherent reading of ADR-008 §2 (the hint stays) + ADR-009 §1 (one home) + ADR-005 §3 (a
`cap` input exists), and 53/04 contracted it. **Confirmed.**

---

**§21 — `autonomous.md`'s deletion list is WIDER than ADR-008 §1 named, and FF-5310's "exactly once"
is wrong. Closes C4 and C5.** Re-measured at source, and the session's count was **low**:

`aof work next` appears at **eleven** sites. Seven are inside `<process>` (`:46, :49, :52, :54, :123`)
and `<stop_conditions>` (`:131, :136`) and leave with those blocks. **Four are outside them** — not
two: the frontmatter `description` (`:2`), `<objective>` (`:8`), the `<config>` range bullet (`:18`)
and `<progress_tracking>` (`:146`). Likewise `maxAttempts` survives at `:14` (the `<config>` read) and
`heartbeatStaleMs` at `:15`, both in a block ADR-008 §1 says **stays**.

Ruling — the discharge list for 53/04 is:
1. Delete `<process>` (`:40-124`) and `<stop_conditions>` (`:126-143`), replaced by the shell-out.
2. **Rewrite the frontmatter `description` (`:2`)** — it advertises the prompt as *"driven by `aof work
   next`: refine → build → verify each item in dependency order, gating on `aof work validate`"*, which
   is the loop, in the one line every surface renders.
3. **Rewrite `<objective>`'s second sentence (`:8`)** for the same reason.
4. **Rewrite the `<config>` range bullet (`:18`)** — the range is the shell's scope, not a `work next`
   argument — and **drop `work.autonomous.maxAttempts` and `work.autonomous.heartbeatStaleMs` from
   `:14-15`**: the cap and the staleness threshold are the shell's, and leaving the read here is the
   second home FF-5310 exists to forbid.
5. **Rewrite `<progress_tracking>`'s first bullet (`:146`)** — "the resume index (it's what `aof work
   next` reads)" is loop-position prose, and ADR-004 §1 rules the loop persists no position.
6. `<output>` (`:154-157`) stays; it already says "the exact command to resume".

And **FF-5310's "exactly once" is struck.** ADR-008 §1's own prescribed replacement text names
`aof work loop` **twice** — the invocation and the resume hint `aof work loop <range> --resume` — and
53/04's acceptance separately *requires* the resume command be reported. A developer implementing
ADR-008 §1 verbatim would ship a change FF-5310 fails. The leg becomes: **names `aof work loop` at
least once as its body, and names no other command for driving the range.**

---

**§22 — Registering `work:loop` changes what `aof work loop show` RESOLVES TO; 52/02's contract
survives while its Examples row goes stale. Closes H2.** Verified: `resolveRoute`
(`src/spine/face.mjs:104-120`) matches **longest prefix** — it collects the leading non-`--` tokens and
walks down from the longest key. `["work","loop"]` and `["work","loops",<verb>]` are different keys and
cannot collide; but once `work:loop` is registered, `aof work loop show` resolves to **`work:loop` with
`show` as its scope**, where before it resolved to nothing.

52/02's `03_registration-and-routing.feature` is touched in two different ways and they must not be
conflated. Its **scenario body** (*"no envelope from any of the three verbs is printed"*, *"the process
exits non-zero"*, `:92-96`) stays **true** — `show` is not an admitted scope form, so it is
`loop-scope-unsupported`: still non-zero, still no loops envelope. Its **Examples row**
(`| work loop show | (none) | non-zero |`, `:150`) asserts a resolved command id of `(none)`, and that
cell becomes **false**.

Ruling: **52's accepted contract is NOT edited.** 52/02 is `status: done`; its features are the record
of what was true when it was accepted, and rewriting an accepted milestone's contract to keep a cell
true is how a work stream loses its history. The supersession is recorded **here**, and 53/02's own
contract pins the new fact in its own route-arithmetic Examples — which is where a successor's facts
belong. Measured harmless in practice: **no test in the tree mechanises that row** (grep over `test/`
and `scripts/` for `work loop show` → zero hits, 2026-08-15), which is itself TECH_DEBT item 48's
complaint about 52's evidence and the reason this is a prose supersession rather than a red suite.

---

**Alternatives considered.**

- *Let the two scope-guard contracts both ship and reconcile at build time* — **rejected outright.**
  `53-52` is a single string with two specified answers; a builder would pick one and a reviewer would
  not know which was intended. A contradiction between two frozen contracts is the one defect a
  closure round exists to remove.
- *Add `state: "held"` a ninth stop (`work-held-elsewhere`)* — **rejected (§4).** The stop set is read
  by three downstream milestones; growing it costs each of them a renegotiation, and the fact that
  matters to an operator (*who* holds it) is already carried by `skipped` and the producer. A stop per
  producer instead of a producer per stop inverts ADR-005 §4's whole design.
- *Give the frozen `--json` document a `code` key so refusals can ride it* (§5) — **rejected on
  `face.mjs:196-202`'s own warning.** The face already has exactly one structured-refusal channel and
  the file says in writing that a per-key special case is how a face grows a second vocabulary. Two
  documents with two shapes, told apart by `ok`, is the house contract; one document that is sometimes
  a refusal is not.
- *Keep `tasks-authored` on `work:tasks` and accept the cost* (§13) — **rejected on the measurement,
  not on taste.** 3,214 ms against a 1,157 ms baseline is a 3.8× regression on the command CI, the
  board and every operator runs most often, for one advisory row in a score ADR-007 §7 says gates
  nothing. A readiness score that makes the health command slow is a readiness score people turn off.
- *Write a fourth `inScope` inside `src/work-doctor-loop-ready.mjs` to avoid editing `work-doctor.mjs`*
  (§13) — **rejected as the worst available option.** It buys a partition line and pays with the exact
  defect this milestone ledgered as item 49, one copy further along, in the milestone that ledgered it.
  The two-line export/injection is smaller *and* moves the codebase toward one home rather than away.
- *Tighten `hasTaskFiles` to `.feature`-only so `tasks-authored` keeps `work:tasks`' semantics* (§13) —
  **rejected for this milestone.** It is a shipped doctor check's meaning changed in flight, by a story
  forbidden from touching doctor's checks. Measured 2026-08-15, the two answers **agree on every story
  in this repo** — `buildSnapshot`'s `hasTasks` reports 178 of 185 and the `work:tasks` fan-out reports
  178 of 185 — so the divergence here is entirely latent, which makes it exactly the kind of change that
  wants its own measured decision on a repo where it is not. Routed to TECH_DEBT item 51.
- *Rename `reportDegrade`'s code to `"agent-session-driver"` so the module's degrades name their home*
  (§16) — **rejected.** It is a behaviour change under a clause that forbids behaviour changes, and it
  silently re-partitions the per-code throttle. The right diff exists; it is not this one.
- *Give `work:loop` an execution-mode input so `--solo` keeps its old reach* (§20) — **rejected.** The
  shell owns deterministic control and never product judgment; "play the roles inline or spawn them" is
  a prompt-side concern with a config home already. Adding it would freeze a second answer into
  ADR-005 §3 on the day that contract is frozen, for a flag whose honest scope is one sentence of prose.

**Consequences.** Four contracts change and one story's substance changes: 53/01 wins the scope
contradiction (53/02 edits its Examples row, §1); 53/02 drops `refused` from the document's `state`
(§5); 53/03 re-aims `tasks-authored` at doctor's snapshot and gains a two-line `work-doctor.mjs` edit
(§13); 53/04's deletion list grows by four prose sites and two config keys (§21). A fifth change is a
supersession rather than an overrule: 52/02's Examples row for `aof work loop show` goes stale and is
recorded here rather than edited in an accepted milestone (§22). Two frozen exported
sets exist where there was one — `LOOP_STOPS` (eight, unchanged) and `LOOP_REFUSALS` (four, new) — so
54, 62 and 63 read a complete vocabulary instead of inferring half of it. Five fitness-function rows
are corrected in place below, and one is added. The milestone's edit surface grows by exactly three
files' worth of lines: two in `src/work-doctor.mjs`, one `import` line in
`src/mesh-worker-execution.mjs`, and the `--dry-run` flag on `src/commands/drive.mjs` (its own new
file). Nothing in ADRs 001–009 is edited; every departure above is a numbered supersession.

**Invariant.** `src/work-loop.mjs` exports `LOOP_SCOPE_FORMS`, `LOOP_LEVELS`, `LOCKED_LOOP_LEVELS`,
`LOOP_STOPS`, `LOOP_REFUSALS` and `GATE_ORDER` as frozen literals; an inverted range yields
`loop-scope-unsupported`; the `--json` document's `state` is one of exactly four values and every
refusal rides `face.mjs`'s single error envelope with a `LOOP_REFUSALS` code; `work:loop` and
`work:drive-<phase>` read their spawn seam from `ctx.agentSessionDriverOptions` and each driver
carries `--dry-run`; `src/work-doctor.mjs`'s diff in this milestone is exactly the `export` at `:455`
and `options.snapshot ??` at `:514`, with `CHECK_GROUPS` and `doctorWork`'s return byte-unchanged;
`src/agent-session-driver.mjs` exports exactly seventeen names; the moved block's twenty
`reportDegrade` calls all still pass `"mesh-worker-execution"`. (Enforced by the corrected FF-5301…
FF-5310 rows below.)

---

## ADR-011: Every story lands its own evidence — the partition gives each story its behavioural suites AND their registration, and `scripts/test.mjs` is declared an append-only registration hub rather than a contended file

**Status:** Accepted
**Date:** 2026-08-15

**Context.** Four of the six Three Amigos sessions independently raised the same blocking objection,
and it is correct. The `## Story partition` gives `scripts/test.mjs` to 53/05 ("registration only")
and puts `test/*` in the **Must-NOT-touch** column of 53/00, 53/01 and 53/03. Behavioural suites in
this repo are **explicit imports and explicit spreads** in `scripts/test.mjs` — there is no glob
(measured: the m52 block at `scripts/test.mjs:2446-2456` is nine hand-written imports, spread at
`:2459-2468`). So as originally partitioned, **53/00 ships ~1,000 moved lines, 53/01 a whole decision
engine, 53/02 four commands and 53/03 a scorer, each with no registered, re-runnable suite** — which
is TECH_DEBT item **48**'s exact failure (*"Milestone 52's behavioural evidence never landed — three
stories accepted on fixtures that are not on disk"*), reproduced in the milestone that cites it as its
own cautionary tale.

Two measurements decide the shape of the fix.

*The graph says `scripts/test.mjs` is not a coupling risk.* `aof graph impact scripts/test.mjs` →
**0 dependents, 694 outbound edges**. Nothing imports it; it imports everything. An edit to it can
break no consumer, cannot change any module's blast radius, and cannot fail at anything but a merge.
The partition's headline property — *"no two stories edit the same file"* — is a proxy for **blast
radius and merge friction**, and on this one file the blast radius is provably zero.

*The contracts already named most of their suites, and two named none.* Measured across the six
stories' `.feature` files: 53/00 names five (`test/agent-session-driver-{door,drives,transcript,runtime-dispatch,gate-aim}.test.mjs`),
53/01 names seven (`test/work-loop-{scope-guard,level-ladder,phase-map,stop-set,gate-order,declaration,determinism}.test.mjs`),
53/05 names its ten arch files — and **53/02 and 53/03 name no new suite file at all**, while 53/04's
`@executable` `00_the-prompt-hands-over.feature` names none either. That gap is wider than the
sessions reported and is closed here rather than left to a builder.

**Decision.**

**1 — Each story OWNS its own behavioural suites and its own labelled registration block.** The
prefixes are frozen and disjoint by name, so two stories can never author the same file:

| story | owns these new suites | its `scripts/test.mjs` block |
|---|---|---|
| 53/00 | `test/agent-session-driver-*.test.mjs` (the five its features name) | `// milestone 53 / story 00` |
| 53/01 | `test/work-loop-*.test.mjs` (the seven its features name) | `// milestone 53 / story 01` |
| 53/02 | `test/loop-command-*.test.mjs` and `test/drive-command-*.test.mjs` | `// milestone 53 / story 02` |
| 53/03 | `test/loop-ready-*.test.mjs` | `// milestone 53 / story 03` |
| 53/04 | `test/autonomous-shell-out-*.test.mjs` (the `@manual` soak has no file, by design) | `// milestone 53 / story 04` |
| 53/05 | `test/arch/acd-*.test.mjs` (the ten fitness functions) | `// milestone 53 / story 05` |

53/05's ownership of `scripts/test.mjs` narrows from "registration only" to **the m53 arch block
only**. A story may add imports and spreads inside **its own labelled block** and may touch nothing
else in the file — not the suite loop, not the per-test global-home handling, not the integration lane,
not another story's block.

**2 — The "no two stories edit the same file" property is RESTATED, not abandoned, and the restatement
is what makes it true rather than aspirational.** The property was always about blast radius; on
`scripts/test.mjs` the blast radius is zero (0 dependents, measured). So:

> **No two stories edit the same file, with exactly one declared exception:
> `scripts/test.mjs`, which is an append-only registration hub. Each story appends one labelled
> block of imports and one labelled block of spreads and edits nothing else. The cost is merge
> friction on two contiguous regions; the blast radius is nil.**

> **AMENDED 2026-08-17 by ADR-016:** “no two stories” means no two stories that can build
> concurrently. The exact shared-file set is `{scripts/test.mjs, src/commands/loop.mjs}`:
> `scripts/test.mjs` remains the one parallel append-only hub; `src/commands/loop.mjs` is a sequential
> hand-off from 53/02 to its declared dependent 53/04, whose grant is report projection/rendering only.

That is stronger than the original claim, because the original claim was **false the moment any story
needed a test** — and a partition property that is false is worse than one that is qualified.

**3 — 53/03 authors a NEW suite; it does not edit `test/doctor-command-core.test.mjs`.** 53/03's
features say "mechanised over the `test/doctor-command-core.test.mjs` harness", which is ambiguous.
Ruling: that file is **pre-existing and must stay byte-unchanged**; 53/03 reuses its *harness shape*
(a `mkdtemp` fixture repo driven through `loadWorkspace` + `invoke("work:doctor", …)` plus a spawned
CLI leg) in new `test/loop-ready-*.test.mjs` files.
> **AMENDED IN PLACE 2026-08-16 — source: ADR-014 §3.** "Byte-unchanged" is narrowed to a **one-line
> ceiling**: 53/03 authors the new suite exactly as ruled above **and** widens the single `doctor/00`
> envelope assertion at `test/doctor-command-core.test.mjs:168` — the file's only `Object.keys(` line —
> from `["findings"]` to `["findings", "loopReady"]` with `.sort()` on the actual side (key SET pinned,
> insertion ORDER not — ADR-014 §3.1 as amended 2026-08-17), because ADR-010 §15 makes `run()`'s two-key
> envelope forced and that assertion mechanises milestone 15's delivered criterion
> (`15/…/00_doctor-command.feature:36`), which is narrowed here rather than edited there. Every other
> byte of the file is unchanged: 683 lines, **EOL-normalised** residue digest
> `a74a8c422a6d71f25cf012005903b9241f10d705380babfa6244f9460dad659f` (ADR-014 §3's arithmetic — `\r\n` →
> `\n` first, because the committed bytes are LF and no `.gitattributes` rule covers
> `test/**/*.test.mjs`), exported `name` set unchanged. The harness-shape ruling itself is untouched.

**4 — The registration ratchet: name-set membership, and the general fix is routed, not taken.**
Verified: `acd-test-suite-registration` keys registration on
`runners.includes(path.basename(rel))` (`test/arch/acd-test-suite-registration.test.mjs:151`), so a
file the runner **imports and never spreads** is not an orphan by that check and is run by nobody —
item 5's exact shape, in the gate that exists to prevent item 5. `acd-roundtrip-registration` closes it
by name-set membership but only for `acd-roundtrip-*`. This milestone closes it **for its own
suites** — FF-5311 below asserts name-set membership for every m53 suite — and **routes the general
fix**, because generalising the name-set check to all of `test/arch/` is a real follow-on that would
have to reconcile whatever it finds across ~250 gates, and that is not 53/05's to take.

**5 — Two entries for `wiki/work/TECH_DEBT.md` (items run 0–49 today; these take 50 and 51),
recorded here verbatim for the operator to append.**

> ## 50. `acd-test-suite-registration` cannot see an imported-but-never-spread suite — the orphan check keys on the runner's TEXT, not on the assembled suite
>
> **Status:** open (raised 2026-08-15 by the architect in milestone 53's closure round; measured at
> `test/arch/acd-test-suite-registration.test.mjs:151`). **Severity:** medium — it is item 5's own
> failure shape ("the gate reads green-ish while not running") inside the gate that exists to prevent
> item 5.
>
> **What's wrong.** The orphan detector is
> `files.filter((rel) => !runners.includes(path.basename(rel)))` — a substring search over the
> concatenated text of `scripts/test.mjs` and `scripts/test-unit.mjs`. A suite the runner **imports**
> and never **spreads** into the exported `tests` array therefore passes as "registered" while being
> invoked by nobody. So does one spread under an alias that resolves to a different module, and one
> spread inside a block that is itself unreachable. `acd-roundtrip-registration` already closes exactly
> this hole by asserting NAME-SET membership against the assembled suite — but only for the
> `acd-roundtrip-*` family.
>
> **How it bites.** Silently, and at the worst moment: the suite that would have caught a regression is
> the one nobody notices is not running, and the two gates that should disagree both read green.
> TECH_DEBT item 27 measured nine suites RED at HEAD with nothing saying so; this is the adjacent
> failure where a suite is neither red nor green because it never executed. Milestone 53 closes it for
> its own suites (FF-5311, name-set membership over every m53 file) and leaves the general case open.
>
> **The fix.** Generalise `acd-roundtrip-registration`'s name-set form to the whole tree: import
> `scripts/test.mjs`'s exported `tests`, import every suite file on disk, and assert every exported
> test `name` is a member of the assembled suite's name set — replacing the `runners.includes(basename)`
> substring check rather than sitting beside it. It wants a story of its own because the first run will
> find whatever is currently unspread across ~250 arch gates plus the unit lane, and each finding needs
> a decision (register, or retire to a milestone `reference/` directory) rather than a bulk edit.

> ## 51. "Does this story have an authored task contract?" has TWO answers — doctor counts any file, `work:tasks` counts `.feature` files
>
> **Status:** open (raised 2026-08-15 by the architect in milestone 53's closure round; measured at
> source). **Severity:** low — it is item 0's shape ("the same fact derived independently") on a
> low-stakes predicate, but it now has two consumers instead of one.
>
> **What's wrong.** `work-doctor.mjs`'s `hasTaskFiles` (`:138-144`) returns true if the story's `tasks/`
> directory holds **any regular file** — `notes.md` and `README.txt` count. `work:tasks`
> (`src/commands/tasks.mjs`) returns tasks parsed from `<dir>/tasks/*.feature` only, so the same story
> answers "has tasks" one way to doctor's `started-story-no-tasks` check
> (`src/work-doctor-coherence.mjs:322-330`) and the other way to the board, the loop's phase map and the
> Loop-Ready score.
>
> **How it bites.** A story whose `tasks/` holds notes but no contract is invisible to
> `started-story-no-tasks` and — since 53/ADR-010 §13 — reads `pass` on the Loop-Ready
> `tasks-authored` row, while `aof work tasks <ref>` correctly reports zero tasks and `aof work loop`
> correctly dispatches `drive refine`. Two readiness surfaces disagree about the same story. Measured
> on this repo: 178 of 185 stories carry a task feature, so the divergence is currently latent rather
> than live.
>
> **The fix.** One predicate. Either `hasTaskFiles` filters to `.feature` (the meaning both other
> consumers already use), or it is replaced by a shared leaf both doctor and `work:tasks` import.
> Tightening it changes what `started-story-no-tasks` reports for the 7 stories on this repo that
> currently have a non-`.feature` `tasks/` payload, so it wants a measured decision and a green sweep on
> a repo where the two answers actually differ — which is why milestone 53 named it here instead of
> changing a shipped check's meaning in flight. (Measured 2026-08-15: on THIS repo they do not differ —
> `buildSnapshot`'s `hasTasks` and a full `work:tasks` sweep both report **178 of 185** stories with
> tasks. The divergence is real in the code and latent in the data, which is the most expensive kind to
> discover later.)

**Alternatives considered.**

- *Centralise registration differently — a glob in `scripts/test.mjs`* — **rejected, and the repo's own
  history is why.** Explicit registration is a deliberate house choice (`scripts/test.mjs:2447`: *"
  Registration is explicit so no authored gate is dead"*), and `acd-test-suite-registration` exists to
  enforce it. A glob would make "is this suite running?" unanswerable by reading the runner, and would
  silently pick up half-written files during a build.
- *Let 53/05 register every story's suites at the end* — **rejected: it is item 48 with extra steps.**
  A story would land, be reviewed and be accepted with its evidence unregistered, and the registration
  would arrive in a diff nobody reviews for coverage. Evidence that lands with the contract is the
  entire discipline item 48 asks for.
- *Give each story its own runner file (`scripts/test-m53.mjs`)* — **rejected:** it is a second runner
  per milestone, so `acd-test-suite-registration`'s `RUNNERS` list becomes a growing surface, and CI has
  to learn a new entry point per milestone. One append-only hub with labelled blocks is the same
  isolation at none of the cost.
- *Keep `test/*` in every Must-NOT-touch column and accept the milestone shipping unevidenced* —
  **rejected, obviously, and recorded so the rejection is on file:** it is the single failure this
  milestone's own TECH_DEBT citation says must not recur.

**Consequences.** Every story from 53/00 to 53/04 gains a named suite family and one labelled block in
`scripts/test.mjs`; 53/05's ownership of that file narrows to the m53 arch block. The partition's
headline property is restated with its one declared exception and is now true. `scripts/test.mjs`
grows by roughly six labelled blocks — measured merge friction on two contiguous regions, zero blast
radius. Two TECH_DEBT entries are written for the operator to route. And the milestone that names
item 48 as its cautionary tale becomes the first one that cannot repeat it, because FF-5311 fails CI
if any story's named suite is authored and unreachable.

**Invariant.** Every `test/*.test.mjs` file this milestone authors is imported **and** spread in
`scripts/test.mjs`, inside its own story's labelled block, and every test `name` it exports is a member
of the assembled `tests` array's name set; no story edits another story's block or any other region of
`scripts/test.mjs`; `scripts/test-unit.mjs` is byte-unchanged **and `test/doctor-command-core.test.mjs`
differs from its pre-53 bytes by exactly one line — its sole `Object.keys(` line, byte-equal to
ADR-014 §3's pinned `.sort()`ed replacement, at 683 lines with EOL-normalised residue digest
`a74a8c422a6d…0dad659f` (`\r\n` → `\n` first — ADR-014 §3's EOL rule) and its
exported `name` set unchanged (AMENDED IN PLACE 2026-08-16, values and recipe corrected 2026-08-17 —
source: ADR-014 §3/§5; the original clause
read "`scripts/test-unit.mjs` and `test/doctor-command-core.test.mjs` are byte-unchanged")**;
`acd-test-suite-registration`'s `UNREGISTERED_BASELINE` gains no entry. (Enforced by FF-5311.)

---

## ADR-012: The loop registry's home is `.aof/loops/`, delivered by the bundle as verbatim ASSET members — superseding 52/ADR-001 decision 4 while keeping its decision 3 intact; `src/bundle/loops/` is the single source and this repo's `.aof/loops/` is an INSTALLED artifact aof dogfoods, so the registry a consumer runs is the registry aof ships

**Status:** Accepted
**Date:** 2026-08-15

**Context.** Milestone 52 shipped nine loop records at `<work.dir>/loops/` — here `wiki/work/loops/` —
resolved by `loopsDirectory` (`src/work-loops.mjs:491-494`, `path.resolve(value, "loops")`). Three facts,
each re-measured at source on 2026-08-15, say that home is wrong, and they compound.

*Nothing delivers them.* `find src/bundle -iname "*loop*"` returns **zero files**, and the bundle
descriptor's 50 members decompose as 25 command · 8 agent · 7 hook · 6 template · 3 skill · 1 asset —
no loop member of any kind. So `aof work init` / `work update` install **no** loop record, a consumer
repo's `loadLoops` takes the ENOENT branch (`src/work-loops.mjs:502-504`) and returns
`{source, present: false, nodes: [], findings: []}`, and `aof work loops show` reports an empty registry
— while `build-to-green`, `verify-triage-accept` and the autonomous cascade are running in that repo the
moment it uses aof. Milestone 53 makes that worse, not better: `aof work loop` is about to become the
executable form of the loop `autonomous-cascade.md` describes, in a repo whose registry does not mention
it.

*The records are framework self-description filed as project work.* Read in full: across the seven
`kind: loop` nodes, **every** `controlled`/`reference`/`measurement`/`actuator` endpoint names
`src/…` or `src/bundle/…` — `module:src/run-store.mjs#readRuns`, `command:work:next`,
`prose:src/bundle/agents/aof-developer.md`, `module:src/mesh-assignment-reclaim.mjs#dualStalenessDecision`.
There is not one endpoint in the registry that a consumer's repo could make true or false. `<work.dir>`
is the operator's work stream — milestones, stories, chores, UAT sessions — so aof's own internals are
filed under the user's inventory.

*The referent already lives in `.aof/`.* `wiki/work/loops/autonomous-cascade.md` declares
`ceiling: [config:work.autonomous.maxAttempts]` — a `config:` pointer (`POINTER_SCHEMES`,
`src/work-loops.mjs:83`) into `.aof/aof.config.json`. The record that points at `.aof/` does not live
there.

**The PRD constraint, verified at source, and the story's argument CORRECTED.** 52/ADR-001 rejected
`.aof/` citing `wiki/planning/PRD-graph-engineering.md:185-187`, whose full text is: *"**Loops, edges and
anchors live in the work stream, under git.** If a loop, its watcher, its reference-owner and its auditor
cannot be reviewed in a PR, they are not governed. No sidecar config, no service."* 53/07's Notes argue
that constraint "was never the discriminator". **That is half right and the half that is wrong matters:**
the bullet's first clause *does* name a location — "the work stream" — so the PRD is not silent about
where, and this ADR departs from it in letter rather than discovering it never applied.

What the story gets right is the load-bearing half, and it is verifiable in 52's own words. The bullet's
**operative test** is PR-reviewability, and 52 applied it to a *format*: its Context says *"That rules out
`.aof/loops.json` before the design starts"* (52/ADR-001), and its alternatives list carries exactly one
`.aof/` entry — *"A sidecar `.aof/loops.json` (or a service) — rejected by PRD §Constraints verbatim. Not
reviewable as a diff ⇒ not governed."* A **markdown directory** under `.aof/` was never weighed; a
machine-generated JSON blob was, and rejected on a test the directory passes.

Measured, so the operative test is settled rather than argued: `.aof/.gitignore` ignores exactly `/work/`,
`aof.memory.index.json`, `aof.memory.graphify.index.json`, `notion.work-map.json`,
`artifact-sync-queue.ndjson` and `artifact-sync-queue.ndjson.batch` — runtime state, nothing else;
`git check-ignore .aof/loops/x.md` reports **not ignored**; and `git ls-files .aof` returns
`aof.config.json`, `aof.lock.json`, `.gitignore` and **all 15 files** of `templates/`. Markdown in
`.aof/loops/` lands in a PR diff byte-for-byte as it does in `wiki/work/loops/`. The PRD's governing
sentence is met in substance; its "work stream" clause is departed from in letter, and this paragraph is
that departure recorded as one.

**The delivery pipeline, measured before it was chosen.** `.aof/templates/` is the precedent 53/07's
Notes name, and measuring it disqualifies it as a *mechanism* on two independent counts:

1. **A template cannot land at `.aof/loops/`.** `templateOutputPath` (`src/work-bundle.mjs:194-196`) is a
   hard-coded `[".aof", "templates", "work", member.id, file].join("/")`. A `kind: "template"` member has
   no target of its own; nine records would install to `.aof/templates/work/loops/*.md`, which is not the
   home this ADR is choosing.
2. **A template's stamp makes every record unparseable.** `renderBundleTemplateOutputs`
   (`src/work-bundle.mjs:198-220`) emits `` `${TEMPLATE_STAMP}\n\n${rawBody}` `` at `:207`, where
   `TEMPLATE_STAMP` is `<!-- aof-generated: bundle -->` (`:28`) — verified on disk at
   `.aof/templates/work/story/STORY.md:1`. The loop loader's `rawFrontmatter`
   (`src/work-loops.mjs:154-157`) matches `/^---\r?\n([\s\S]*?)\r?\n---/` with **no `m` flag**, i.e.
   anchored at start-of-string. A stamped record returns `null`, so `loadLoops` emits
   `loop-record-unparseable` at `severity: "error"` (`:514-522`) for **all nine**. The operator's own
   standing note records this exact trap for hand-authored record docs; shipping it would be that trap
   delivered by the installer.

The `asset` kind is the shape these records want, and its own header says so — `src/work-bundle.mjs:140-146`:
*"an aof-EXCLUSIVE file installed VERBATIM at a declared target path… the existing content-hashed,
drift-protected bundle mechanism, which is correct exactly because aof owns the file outright."*
`renderBundleAssetOutputs` (`:168-185`) emits one output per member at its declared `target` with
`content: member.body` — **no stamp, bytes unchanged** — and `renderBundleOutputs` already folds asset
outputs into the canonical render (`:235`), so init/update/manifest all carry them with no new plumbing.

**Dogfooding is already the house pattern, and its hazard is already live.** `src/bundle/hooks/artifact-sync-enqueue.mjs:3-4`
states the rule — *"Edit it in aof's own bundle, not here; a local edit is reported as drift exactly like
any other bundled file"* — and `.claude/hooks/aof/artifact-sync-enqueue.mjs` is git-tracked in this repo
as its installed copy, as are all 15 `.aof/templates/` files. But **hashing all 86 `src/bundle/manifest.json`
entries against this repo's own tree on 2026-08-15 gives 58 matching, 24 DRIFTED and 4 MISSING** (the
missing pair is `init`/`observe`, bundle members this checkout never installed), **and nothing fails.**
So "the suites read the install" is only honest if something pins the install.

**The reader census, CORRECTED.** 53/07's Notes claim "seven test suites load the **real** registry".
Measured: **two do.** `test/work-loops-registry-census.test.mjs` (`:60` `const workDir = path.join(root,
"wiki", "work")`, consumed at `:184`) and `test/arch/acd-loop-records-parse.test.mjs` (`:29`, `:80`,
`loadLoops(path.join(root, "wiki/work"))`). The other five are fixture-based and path-agnostic:
`work-loops-checks.test.mjs:58` aims at `path.join(FS_ROOT, "aof-loop-fixture-not-on-disk", "loops")` — a
path deliberately not on disk; `work-loops-record.test.mjs` and `work-loops-value.test.mjs` say so in
their own headers (`:4`; `:4`, `:21`) and drive `test/support/loop-registry-fixture.mjs`;
`work-loops-commands.test.mjs` spawns the CLI over fixtures; and `work-loops-coverage-ledger.test.mjs`
**never calls `loadLoops` at all** — it reads milestone documents. The Notes' companion claim that the
eight fixture-based arch tests are "unaffected" is likewise too strong: `acd-loop-finding-envelope`
(`:209, :297, :311-312, :326`), `acd-loop-registry-not-an-item-type` (`:88`) and `acd-loop-vocabulary-closed`
(`:108`) all **call `loadLoops` over a temp directory**. Their *assertions* are unaffected; whether their
*call form* is depends on decision 3 below, which is chosen partly to keep them byte-unchanged.

**The signature, measured.** `loopsDirectory` is **module-private** — a bare `function` at
`src/work-loops.mjs:491`, not in the export list — with exactly one caller, `loadLoops` at `:498`. (53/07's
"its 5 dependents" counts something else; the graph's answer for the *module* is 12 dependents — three
`src/commands/loops-{validate,show,graph}.mjs` plus nine test files — from the 2026-08-15T13:51:17Z build.)
All three `src/` call sites pass a string: `ctx.workspace.workDir` (`loops-validate.mjs:30`,
`loops-show.mjs:18`, `loops-graph.mjs:88`). `loopsDirectory`'s object branch (`:492`, `workDir?.workDir`)
is therefore **dead code today**. And the target already exists: `loadWorkspace` returns
`{ configPath, config, projectRoot, workDir, aofDir, identityPath, globalMeshRoot }` (`src/work.mjs:249`),
where `aofDir` is the `.aof` config home (`:174`).

**Graph grounding (actual edges, build 2026-08-15T13:51:17.308Z — 10,715 nodes / 25,793 edges / 464
communities, egress none).** `aof graph impact`: `src/work-loops.mjs` — **12 dependents** (3 `src/commands/`,
9 test files), imports `src/work.mjs`; `src/work-loops-checks.mjs` — **8 dependents, imports NOTHING** (a
pure leaf, unchanged since 52 measured it at 5); `src/commands/loops-validate.mjs` — 3 dependents;
`src/work-bundle.mjs` — **28 dependents**, imports 4 (`adapters`, `asset-base`, `lock`, `work-bundle-runtime`);
`src/work-bundle-manifest.mjs` — 6 dependents. This story edits **no** `src/work-bundle*.mjs` file: the
descriptor gains members, the renderer does not change.

**Decision.**

**1 — The home is `.aof/loops/`, and 52/ADR-001 decision 4 is SUPERSEDED.** Superseded verbatim, so the
diff is legible:

> **52/ADR-001 decision 4 (superseded).** *"**No config key.** The directory is
> `path.join(ctx.workspace.workDir, "loops")`, resolved from the 08/ADR-002 `ctx.workspace`. It is not
> configurable; one home, no second door."*

> **53/ADR-012 decision 1 (replacing it).** The directory is `path.resolve(ctx.workspace.aofDir, "loops")`,
> resolved from the same 08/ADR-002 `ctx.workspace`. It is **still not configurable; still one home, no
> second door.** Only the anchor moves — from the operator's work stream to aof's own config home, because
> the records describe aof and not the operator's work.

The half of decision 4 that was load-bearing — *no config key, one home* — is carried over unchanged; the
half that is superseded is the anchor.

**2 — 52/ADR-001 decision 3 is KEPT, and carries to the new home verbatim.**

> *"**One directory, extended by `kind:`, never by a sibling.** `loops/` is the loop **graph's** node
> directory. It holds `kind: loop` and `kind: actor` nodes today (ADR-002/ADR-005). A later milestone that
> needs a new node class (55's anchors) adds a `kind:`, or supersedes this ADR — it does **not** add a
> second non-item directory."*

`.aof/loops/` is that one directory. 55's anchors add a `kind:`. Nothing in this milestone adds a sibling
directory beside it, and ADR-013 rules that a framework/workspace distinction is **not** a candidate `kind:`
either.

**3 — The `.aof` resolution lives in exactly ONE expression, inside the loader, and the loader's parameter
contract is unchanged in shape.** `loopsDirectory` continues to mean *"the directory that contains
`loops/`"*, and this ADR settles which directory that is for a real workspace:

```js
// src/work-loops.mjs — the whole change to the loader
function loopsDirectory(workspace) {
  const value = typeof workspace === "string" ? workspace : workspace?.aofDir;   // was: ?.workDir
  if (!value) throw new TypeError("loadLoops requires an .aof directory path or a workspace");
  return path.resolve(value, "loops");
}
```

The three `src/` call sites become `loadLoops(ctx.workspace)` — the **object** form, so `.aof/loops` is
computed in one place in the whole tree and no command module joins a path. The string overload survives
for the fixture suites, which pass a temp base and keep getting `<temp>/loops`: **all ~25 `loadLoops(`
call sites across the six fixture suites stay byte-unchanged**, which is ADR-011's evidence-discipline
applied to 52's evidence rather than churned.

**Amended at the Three Amigos, on a measurement this ADR's first draft did not make.** The claim that
`test/support/loop-registry-fixture.mjs` itself stays byte-unchanged is **false**, and the reason is the
spawned-CLI leg. The builder roots its registry at `<temp>/work/loops` (`:147-149`) while
`work-loops-commands.test.mjs`'s `dressWorkspace` (`:177-185`) writes `<temp>/.aof/aof.config.json` — so
after the move the real CLI resolves `<temp>/.aof/loops` while the builder writes `<temp>/work/loops`, and
no config placement reconciles them (`aofDir` is the config's own dir when its basename is `.aof`, else
`<projectRoot>/.aof` — `src/work.mjs:168,174`). That breaks **19 `runCli` sites** and **6 path
assertions** in that suite. The minimum fix is **one optional parameter** on the builder — a `parent`
defaulting to `"work"`, passed `".aof"` only by `work-loops-commands` — which leaves every other caller
behaviourally byte-identical. **So the pin is narrowed: no `loadLoops(` call site is rewritten to the
object form, and the shared builder gains exactly one defaulted parameter.** A directory junction and a
copy-at-dress-time were both considered and rejected (the copy desyncs `fixture.write()`).

Cost of the signature change: **three one-token edits in `src/`, two path expressions plus two comments
in the two real-registry suites, one word in `loopsDirectory`, one defaulted parameter on the shared
builder, and `aofDir` added to five synthetic test workspaces.**

**4 — The nine records are bundle `asset` members, one per record, at declared `.aof/loops/` targets.**

```jsonc
// src/bundle/bundle.json — nine new members, the existing asset shape
{ "id": "loop-autonomous-cascade", "kind": "asset",
  "file": "loops/autonomous-cascade.md",
  "target": ".aof/loops/autonomous-cascade.md",
  "runtimes": ["claude", "codex"] }
```

`runtimes` declares **both**, deliberately: `renderBundleAssetOutputs` (`:172-174`) defaults an
undeclared/empty list to `["claude"]` and `continue`s when the selected runtimes do not intersect, so a
`["claude"]`-only declaration would leave a **codex-only install with no registry at all**. The renderer
emits exactly one output per member regardless (it picks a single runtime), so declaring both cannot
produce a `groupDesiredOutputs` conflict (`src/render-plan.mjs:195-211`). The manifest is **derived, never
hand-written** (`scripts/generate-bundle-manifest.mjs`, `generateBundleManifest` at
`src/work-bundle-manifest.mjs:44-53`, `MANIFEST_RUNTIMES` at `:20`) and `acd-bundle-manifest-hashes`
already fails CI on a stale manifest, so `manifest.json` goes 86 → **95 entries** by regeneration, not by
authorship. `acd-bundle-membership` is a declared-set == on-disk-set assertion and absorbs nine new
members with **no test edit**.

**5 — `src/bundle/loops/` is the SINGLE source of truth; this repo's `.aof/loops/` is an INSTALLED
artifact.** The nine files are `git mv`'d from `wiki/work/loops/` into `src/bundle/loops/`, and
`wiki/work/loops/` ceases to exist. aof then installs its own bundle like any consumer: `.aof/loops/*.md`
is git-tracked, regenerated by `aof work update`, and edited **only** in `src/bundle/loops/`. The
alternative — hand-maintaining `.aof/loops/` and copying it into the bundle — is TECH_DEBT item 0's
headline disease ("the same fact derived independently, everywhere") committed on purpose, and is refused
by name.

**6 — The two real-registry suites read the INSTALL, and a gate makes that honest.**
`test/work-loops-registry-census.test.mjs:60` and `test/arch/acd-loop-records-parse.test.mjs:29,80` swap
`path.join(root, "wiki", "work")` for `path.join(root, ".aof")` — one expression each — so their subject
stays *the real registry a consumer gets*, which is the whole point of the census. Because the install is
now a derived artifact, FF-5312 pins **this repo's `.aof/loops/*.md` byte-equal to
`src/bundle/manifest.json`'s entries for those nine paths**, so a stale install fails CI instead of turning
the census stale-green. Without that leg, the 24-drifted/4-missing measurement above is what these suites
would inherit.

**7 — Nothing else moves.** `src/work.mjs` is not edited (this milestone still achieves **zero** god-node
edits, ADR-003 §3). The registry is still not an item type (52/ADR-001 §1 stands; `.aof/` was never scanned
by `listItems` in the first place, so the claim gets *stronger*, not weaker). `src/work-bundle.mjs`,
`src/work-bundle-manifest.mjs` and `src/render-plan.mjs` are **not edited** — the descriptor gains data,
the machinery does not gain a branch. No `work.dir` key, no `loops.dir` key, no config key of any kind.

**Alternatives considered.**

- *Leave the registry at `<work.dir>/loops/` and ship nothing* — **rejected on the measured defect.** A
  consumer's `loadLoops` returns `present: false` while three of the declared loops run in their repo, and
  53/03's Loop-Ready score would report five `not-applicable` rows forever for every install that is not
  this one. A registry that exists in exactly one checkout is a description of aof's checkout, not of aof.
- *Ship the records as `kind: "template"` members, reusing the existing template pipeline* —
  **rejected on two structural impossibilities, both measured, not on taste.** `templateOutputPath`
  (`src/work-bundle.mjs:194-196`) cannot address `.aof/loops/`, and `TEMPLATE_STAMP` (`:28`, applied at
  `:207`) makes `rawFrontmatter` (`src/work-loops.mjs:154-157`) return `null`, producing nine
  `loop-record-unparseable` errors on first read. Either one alone disqualifies it. A template is also the
  wrong *concept*: a template is a document a consumer is meant to fill in; a loop record is a document aof
  owns outright — which is precisely the distinction `src/work-bundle.mjs:140-146` invented the `asset`
  kind to draw.
- *Invent a new bundle member kind (`kind: "loop"`)* — **rejected: the third lane earns the directory, not
  the first.** It would need a loader branch (`loadBundle`'s `:95-158` chain), a renderer, a manifest
  resource kind and a test for each — to reproduce `asset`'s behaviour exactly. `asset` already means
  "aof-exclusive file, verbatim bytes, declared target". Nine members of an existing kind cost nine JSON
  objects and zero code.
- *One asset member for the whole directory (a `dir`-shaped asset)* — **rejected:** it is a renderer change
  (`renderBundleAssetOutputs` is `file`→`target`, singular) to save eight JSON objects, and it would give
  the nine records one shared manifest hash — losing exactly the per-file drift resolution that makes
  decision 6's gate and the consumer-edit rule (ADR-013) work.
- *Keep `wiki/work/loops/` as the source and copy it into `src/bundle/loops/` at build time* —
  **rejected:** a second home for nine files plus a copy step nothing enforces. `git mv` costs the same and
  leaves one home.
- *Move the home but do not ship the records (delivery deferred to a later milestone)* — **rejected:** the
  ownership defect and the delivery defect are the *same* defect seen from two ends, and a `.aof/loops/`
  that only aof has is `wiki/work/loops/` with a better address.
- *Point the two real-registry suites at `src/bundle/loops/` (the source) instead of the install* —
  **rejected, narrowly.** It removes the stale-install hazard by removing the dogfood: the suites would
  stop exercising the path a consumer actually gets, and 52's census claim ("the roster is the named nine",
  over the registry `loadLoops` really reads) would quietly become a claim about a directory no loader ever
  resolves. FF-5312 buys the same safety and keeps the claim true.
- *Change `loadLoops` to take a workspace ONLY, dropping the string overload* — **rejected on evidence
  churn.** Measured: ~25 `loadLoops(` call sites across six suites plus
  `test/support/loop-registry-fixture.mjs`'s `loadLoopsInFreshProcess` (`:198-202`) would each need
  rewriting, in a milestone whose ADR-011 exists because 52's evidence is already fragile (TECH_DEBT item
  48). The overload is a test affordance with a named guard: FF-5312 asserts **no `src/` module passes a
  string**, so the one-home property is enforced where it matters and the fixtures are left alone.

**Consequences.** `wiki/work/loops/` disappears, which takes `work.dir` back to **zero** non-item
directories — 52/ADR-001's Consequences called `loops/` *"the first non-item directory in `work.dir`"* and
armed decision 3 as the ratchet against a second; this milestone retires the first instead of adding to it.
`.aof/` gains its **second** git-tracked content directory beside `templates/` (measured: `.aof/` holds
`.gitignore`, `aof.config.json`, `aof.lock.json`, `templates/` tracked, plus untracked runtime). `aof work
loops show|graph|validate` change one user-visible string — the `source` field all three envelopes carry
(`loops-validate.mjs:39,65`, `loops-show.mjs:22,40`, `loops-graph.mjs:91,108`) now displays `.aof/loops`;
the fixture suites that pin it pin a temp path and are unaffected. `src/bundle/` gains a seventh child
(`loops/`, beside `agents/`, `commands/`, `hooks/`, `skills/`, `templates/` and the two machinery files) —
by subject, not by sprawl. The cost named: a developer who edits `src/bundle/loops/` and does not run
`aof work update` leaves this repo's `.aof/loops/` stale, and FF-5312 is what turns that from a silent
divergence into a build failure. Story **53/07** owns every line of this ADR's implementation and authors
its own arch-tests, per ADR-011 §1 — it does **not** wait for 53/05, whose eleven files are frozen at
FF-5301…FF-5311.

**Invariant.** `src/work-loops.mjs` computes the registry path in exactly one expression,
`path.resolve(<.aof dir>, "loops")`, and no other `src/` module joins a `loops` path segment; all three
`src/commands/loops-*.mjs` call `loadLoops(ctx.workspace)` with the object form and no `src/` module passes
a string; `wiki/work/loops/` does not exist and no `src/`, `test/` or `scripts/` file names it;
`src/bundle/bundle.json` declares exactly nine `kind: "asset"` members whose `file` is `loops/<slug>.md`,
whose `target` is `.aof/loops/<slug>.md` and whose `runtimes` is `["claude","codex"]`; the rendered bytes
of each carry **no** `aof-generated` stamp and parse to a frontmatter block; this repo's `.aof/loops/*.md`
hash byte-equal to `src/bundle/manifest.json`'s entries for those paths; `src/work.mjs`,
`src/work-bundle.mjs`, `src/work-bundle-manifest.mjs` and `src/render-plan.mjs` are unchanged.
(Enforced by `acd-registry-single-home`.)

**A note on the gate's NAME, because it looks wrong and is not.** These two gates are `acd-registry-*`
rather than the family-consistent `acd-loop-*` because two **accepted** milestone-52 gates pin the
`acd-loop-*` namespace to a literal roster of exactly nine files:
`test/arch/acd-loop-finding-envelope.test.mjs:358-359` sweeps `test/arch` for
`name.startsWith("acd-loop-") && name.endsWith(".test.mjs")` and `deepEqual`s the result against a
nine-name array, and `test/work-loops-coverage-ledger.test.mjs:149-155,702-703` repeats that roster,
with `:675-677` forbidding by name any new suite whose basename begins `acd-loop-` or whose alias
begins `acdLoop`. A tenth `acd-loop-*` file reddens both. Renaming this milestone's gates costs
nothing; editing two accepted gates to win a naming argument is what ADR-002 declined to do for three
shipped commands, and the same answer applies here. **This constrains 53/05 too** — ADR-011's fitness
table assigns it eight `acd-loop-*` files, which as planned would redden both m52 gates; 53/05 must
either rename or widen those rosters deliberately, and that choice is still open.

---

## ADR-013: The framework-vs-workspace split is DEFERRED with a named discharge trigger, not ledgered — a delivered record is IMMUTABLE framework self-description, per-project values ride the `config:` pointer whose referent is not lock-managed, and a consumer's edit is drift-warned and LEFT, never clobbered

**Status:** Accepted
**Date:** 2026-08-15

**Context.** 53/07's Notes leave one question explicitly open for refine: does this story deliver the move
only, or the move **plus** a framework-vs-workspace split — framework loops (aof's, identical in every
install, shipped) versus workspace loops (a consumer's own CI/deploy/on-call loops, theirs to declare)?
The move is required either way. The split is the thing that either makes a shipped registry legible to
someone who is not aof, or is the speculative half. Four measurements decide it, and the fourth is the one
the story's own reasoning depends on.

*(a) Nothing reads a workspace-declared loop. Anywhere.* A tree-wide search for `workspace loop` /
`framework loop` / `framework-vs-workspace` / `workspace-declared` over every `.md` and `.mjs` outside
`node_modules` returns **five hits: three unrelated code comments about a per-workspace `for` loop in
`src/mesh-launcher.mjs:354,394` and `wiki/work/38_.../VERIFICATION.md:35`, and two lines of 53/07's own
STORY.md.** Zero readers in 52, zero in 53, and none of 54/55/62/63 names one in its SPEC. A distinction
no consumer can be told about and no code can act on is a vocabulary, not a design.

*(b) The demand for per-project values is ONE field, on TWO records, naming ONE key.* All nine records read
in full. Of ~70 field instances, the per-project candidates are:

| field | across the nine | verdict |
|---|---|---|
| `ceiling` | `[config:work.autonomous.maxAttempts]` (autonomous-cascade) · `[config:work.autonomous.maxAttempts, module:src/run-store.mjs#shouldRetry]` (run-resilience) · `uncapped` ×2 · `none` ×3 | **the only real demand — and both instances already use the `config:` pointer, at the same key** |
| `owner` | `unknown` ×6 · `actor:product-owner` ×1 | not a value: `owner` takes an `actor:` **endpoint** (`ENDPOINT_SCHEMES`, `src/work-loops.mjs:84`), so "set my own owner" means adding an actor **node** — a graph edit, not a tune. `unknown` is a measured absence in aof's source (52/RESEARCH §Q1), not a blank to fill in |
| `cadence` | `event:` ×6 · `periodic:15s` ×1 | the one periodic value is aof's own `DEFAULT_SYNC_CADENCE_SECONDS = 15` (`src/mesh-sync-cadence.mjs:25`), already config-reversible through `resolveSyncCadenceSeconds` — so if it ever wanted a per-project value it wants a `config:` pointer, which is the mechanism that already exists |
| `controlled`, `reference`, `measurement`, `actuator` | every endpoint cites `src/…` or `src/bundle/…` | zero demand: a consumer cannot make `module:src/run-store.mjs#readRuns` mean something else without changing aof |
| `id`, `kind`, `title`, `ground`, `optimizing`, `target-setting` | identity + graph structure | zero demand |

*(c) The `config:` pointer is a CITATION, and its referent is the one file the installer never touches.*
Verified: `config` is a member of `POINTER_SCHEMES` (`:83`) **and** `ENDPOINT_SCHEMES` (`:84`); the loader
validates only the key's **shape** (`:207`, a dotted `[A-Za-z0-9_-]` path) and **never resolves the value**;
and `src/work-loops-checks.mjs` reads no config, no clock and no fs at all (graph: **8 dependents, imports
NOTHING**). So a record naming `config:work.autonomous.maxAttempts` ships **immutable** and the tunable
number lives in `.aof/aof.config.json` — which is measured **not** a bundle output and **not** a lock entry:
the shipped manifest's 86 entries and this repo's `lock.work.files`' 82 entries contain no `aof.config.json`
row. The tuning surface and the delivery surface do not intersect, so a consumer's tune can never be
drift-warned, clobbered or reverted by `aof work update`. **The per-project-value problem is already
solved, by a mechanism that shipped in 52 and is used by exactly one field.**

*(d) The consumer-edit drift problem is NOT unavoidable — it is already answered generically, and the
answer is "leave it".* `planApplyActions` (`src/render-plan.mjs:13-79`), the one path `work init`/`work
update` plan through: a file the consumer edited has `currentHash !== prior.hash`, so without `--force` the
action is **`drift-warning`** — *"previously generated file was modified; use --force to overwrite"* (`:38-41`)
— and the file is **not written** (`executeApplyActions:81-96` writes only on `create`/`update`).
`createLockManifest` then **preserves the drifted path's prior lock entry** (`:99-103`, `:126`) so the
warning recurs on every update rather than being forgotten. `--force` is the consumer's explicit,
one-flag clobber (`:43-46`). Nothing needs inventing, and the answer to *"does `work update` clobber their
edit?"* is a measured **no**.

**Decision.**

**1 — 53/07 delivers the MOVE ONLY. The framework-vs-workspace split is deferred.** No `origin:` key, no
second registry directory, no merge, no precedence rule, no provenance field. The registry remains
single-source: `loadLoops` reads one directory and returns one `{source, present, nodes, findings}`.

**2 — A delivered loop record is IMMUTABLE framework self-description, and that is stated in the records
themselves.** Each of the nine gains one line in its prose body, above the existing citations:

> *Shipped by aof (`src/bundle/loops/<slug>.md`) and installed here by `aof work update`. Edit it in aof,
> not here; per-project values belong in `.aof/aof.config.json` behind a `config:` pointer.*

That is prose, so it is not the enforcement — FF-5312's byte-equality (ADR-012 §6) and the drift machinery
are. It exists so the first consumer to open one of these files learns the rule from the file.

**3 — The supported way to tune a framework loop is the `config:` pointer, and it is the ONLY one.** The
record names the authority; `.aof/aof.config.json` holds the value; the loader never resolves it, so the
two can never disagree. This is what `wiki/work/loops/autonomous-cascade.md` already does, and what
`run-resilience.md` already does, and it generalises without a single new mechanism: any future field that
wants a per-project value becomes `[config:<key>]`, and the key's home is the consumer's config file, which
the installer does not manage.

**4 — A consumer who edits a delivered record is DRIFT-WARNED and LEFT — never clobbered, never
silently reverted.** This is not a new rule; it is `src/render-plan.mjs:38-41` applied to nine more paths.
Named consequences, so nobody rediscovers them: the edited record **forks** — aof's later changes to that
loop stop arriving until the consumer reverts or passes `--force` — and the fork is **visible on every
`work update`**, because the drift warning recurs. That is the correct trade: a fork the operator chose and
is reminded of, versus a silent overwrite of a file they edited.

**5 — The deferral carries NOTHING: no TECH_DEBT entry, no placeholder key, no named later milestone.** It
carries a **discharge trigger** instead, in the ADR-008 §4 house form:

> **The split ships with the first READER of a consumer-declared loop.** Concretely: when 54's grader, 62's
> tuner or 63's triggers needs to name a loop that is not one of aof's nine — or when a consumer asks for
> one — the milestone that needs it designs the merge, because that milestone will know the precedence rule
> it needs. Until then there is nothing to precede.

A TECH_DEBT entry would be wrong here and the distinction is worth stating: debt is *a defect the codebase
carries*. There is no defect — the registry describes aof's loops correctly, ships them correctly, and has a
working per-project-value mechanism. What is absent is a **feature nobody has asked for and nothing can
consume**. Writing it down as debt would put a permanent "unpaid" row against a decision that is currently
right.

**Alternatives considered.**

- *Deliver the split now as a new `kind:` (`kind: workspace-loop`)* — **rejected: it is not a node class.**
  52/ADR-001 §3 (kept by ADR-012 §2) extends the registry by `kind:`, and `kind:` selects a **schema** —
  `ADMITTED_KEYS.loop` (11 keys) versus `ADMITTED_KEYS.actor` (5), with `REQUIRED_BY_KIND` per kind
  (`src/work-loops.mjs:75-81, 128-131`). A consumer's loop is a `kind: loop` with the *same* eight control
  keys; framework-vs-workspace is a **provenance** axis crossing every kind, so encoding it as a kind would
  make `NODE_KINDS` (`:82`) mean two different things at once and would fork `REQUIRED_BY_KIND` for no
  schema difference.
- *Deliver the split as a new admitted key (`origin: framework|workspace`)* — **rejected on the frozen
  vocabulary, measured.** `ADMITTED_KEYS` is built from three frozen sets (`:63-81`) and pinned by
  `acd-loop-vocabulary-closed`; `KEY_ORDER`/`KEY_RANK` (`:132-138`) order every finding by it. Widening it
  costs the vocabulary gate, the ordering rank, the per-kind required-key list and 52's render determinism
  — to add a field whose only two values would be "the nine aof ships" and "everything else", derivable
  from the id set with no field at all.
- *Deliver the split as a second directory (`.aof/loops/` + `<work.dir>/loops/`), merged at load* —
  **rejected twice over, and the merge is priced.** 52/ADR-001 §3 forbids the sibling and ADR-004 forbids a
  new directory in this milestone independently. And the merge is not a `readdir` twice: `loadLoops`
  (`:497-570`) is single-source throughout — one `source` string in a return shape read by three commands
  and nine suites; one `present` boolean; one `declaredIds` **Set** built across all nodes (`:533`) that a
  cross-source id collision would silently dedupe rather than report, so `LOADER_FINDING_CODES` (a frozen
  **16**-member list, `:104-121`, pinned by `acd-loop-finding-envelope`) would need a new member; one
  dangling-endpoint pass (`:535-553`) that would have to decide whether a workspace loop may name a
  framework loop; a provenance field on every node, which every `work:loops show|graph` render and
  `test/work-loops-value.test.mjs` pin; and a precedence rule for same-id records. Then each of the five
  checks in `src/work-loops-checks.mjs` — a 0-import pure leaf with 8 dependents — inherits the question
  "is a cross-source edge legal?", which is five separate answers. That is a milestone, not a story, and it
  would be designed with **no reader** to design against.
- *Ship an empty `<work.dir>/loops/` as a declared extension point, merged later* — **rejected:** it is the
  second directory with none of the merge, i.e. the cost of the ratchet violation with none of the benefit,
  and an empty directory that changes nothing is exactly the "loops nobody consults" the PRD says to
  remove.
- *Let `work update` clobber a consumer's edited record (`--force` semantics by default) so framework
  records stay canonical* — **rejected:** it would make these nine paths the only bundle outputs in the
  system that overwrite an operator's edit without asking, contradicting `acd-no-clobber-without-force`,
  and it would do so on files whose whole claim is that they are *reviewable in a PR*.
- *Add a `provenance:`/`source:` field to every node now, so a later merge is additive* — **rejected as
  speculative generality with a measured price:** it widens the same frozen vocabulary as the `origin:`
  option and appears in every rendered node, for a distinction that is today computable as "is this id one
  of the nine" and that nothing consumes.

**Consequences.** 53/07 is a *move plus a delivery*, not a redesign: `src/work-loops.mjs` gains one word,
`src/work-loops-checks.mjs` is untouched (still a 0-import pure leaf), `LOADER_FINDING_CODES` stays at 16,
`ADMITTED_KEYS`/`NODE_KINDS`/`POINTER_SCHEMES`/`ENDPOINT_SCHEMES` are unchanged, and the five checks and
their census keep their exact 52 semantics — so 53/03's Loop-Ready composition (ADR-007 §3, "the composed
counts equal `work:loops-validate`'s own `summary.checks` exactly") is unaffected by this story landing in
either order. The cost accepted and named: a consumer with genuine loops of their own has **no** way to
declare them in aof today, and this ADR says that is correct until something can read them. If that
consumer arrives before the reader does, they are the trigger — and the merge they need will be designed
against their actual precedence question rather than an imagined one.

**Invariant.** `src/work-loops.mjs`'s `ADMITTED_KEYS`, `NODE_KINDS`, `POINTER_SCHEMES`, `ENDPOINT_SCHEMES`
and the 16-member `LOADER_FINDING_CODES` are unchanged by this milestone (imported and asserted equal to
their 52 literals); `loadLoops` reads exactly one directory and returns exactly one `source`, with no
merge, precedence, provenance or origin token anywhere in `src/work-loops*.mjs`; exactly **two** `loops`
directories exist in the tree — the bundle source `src/bundle/loops/` and its single install target
`.aof/loops/` — and no third, in `src/`, `.aof/` or `<work.dir>`; every delivered record carries the
edit-it-in-aof line and its rendered bytes equal `src/bundle/loops/<slug>.md`'s bytes exactly; a consumer
edit to a delivered record yields `drift-warning` and leaves the file unwritten (driven end-to-end through
`work update` over a fixture install, asserting the on-disk bytes are the consumer's), and `--force`
overwrites it. (Enforced by `acd-registry-framework-owned`.)

---

## ADR-014: The doctor envelope's delivered "no other top-level field" guarantee is NARROWED, not abandoned — milestone 15's `.feature` is untouched, 53 is the accepting item that records the supersession, and the legacy suite's pin widens by EXACTLY ONE LINE, owned by 53/03

**Status:** Accepted
**Date:** 2026-08-16

**Context.** Two contracts inside this milestone cannot both be green, and the collision is not a
drafting slip — it is a delivered guarantee meeting a forced design.

- **53/03's contract** — `stories/03_story_loop-ready-score/tasks/00_additive-json-key.feature`, its
  `run()`-envelope Scenario (`:150-157` after this round's own edit to that file) —
  requires `invoke("work:doctor", {}, ctx)` to return `findings` **and** `loopReady` and *"no third
  key"*.
- **ADR-011 §3** (`:1791-1795`) rules `test/doctor-command-core.test.mjs` *"pre-existing and must stay
  byte-unchanged"* — and that suite's `doctor/00` envelope case asserts
  `assert.deepEqual(Object.keys(result), ["findings"], "the result carries no other top-level field")`
  (`test/doctor-command-core.test.mjs:168`).

**The direction is FORCED, not chosen.** ADR-010 §15 measured that `json(result, faceCtx = {})` takes
no `ctx` and no workspace and therefore cannot `invoke`, so the composition must happen in `run()`.
Re-measured at HEAD on 2026-08-16 — the file has moved since §15 read it, at 53/03's checkpoint commit
`88a91cd` — `json` is now at `src/commands/doctor.mjs:275` and still takes `(result, faceCtx = {})`;
`run()` returns `{findings, loopReady}` at `:213-221`; `json()` forwards it as a sixth key at `:288`;
`exit()` (`:291`) keys on the findings alone. There is no design in which `run()`'s envelope stays
single-key. **The only question this ADR answers is how the legacy pin is retired, not whether.**

**And the pin is red right now, not hypothetically.** Measured 2026-08-16 by importing
`doctorCommandCoreTests` and driving only that one case: it **FAILS** with `+ 'loopReady'` against the
expected `['findings']`.

**What the pin mechanises.** A **delivered acceptance criterion** —
`wiki/work/15_milestone_work-doctor-core/stories/00_story_doctor-command-core/tasks/00_doctor-command.feature:36`,
*"And the result carries no other top-level field"* — in a milestone whose `SPEC.md:6` reads
`status: done`. Under the standing rule, a delivered criterion is **immutable**: the shipped `.feature`
is never edited, never annotated, never tagged `@superseded`. **Tests are code and may change.**

**And nothing mechanically enforces the byte-unchanged claim today.** No gate in `test/arch/` hashes or
pins that file; `scripts/test.mjs:889` merely imports it; and `src/work-doctor-controls.mjs:170-186`
records in writing that `test/doctor-command-core.test.mjs` appears in FF-5311's **INVARIANT** column
rather than its enforced-by column, so the control extractor already does not treat it as a control
path. The claim lives in prose — ADR-011 §3, ADR-011's Invariant, FF-5311's invariant text and the
53/03 partition row — which is exactly why it is this document's to amend, and why amending it in all
four places is the whole job.

**Graph grounding (actual, re-built at this ruling).** `aof graph build .` over the project root,
`builtAt 2026-08-16T22:48:03.660Z` — **11,181 nodes / 26,932 edges / 469 communities**, egress none.
(Recorded because the next reader will hit it: the default 120 s graphify timeout **fails** on this
tree; the build needs `AOF_GRAPHIFY_TIMEOUT_MS` raised, and a timed-out build is an absent graph, never
a licence to read the stale artifact.) `aof graph impact` on the three files this ADR rules over:
- **`test/doctor-command-core.test.mjs` — 1 dependent (`scripts/test.mjs`)**, 5 dependencies. The blast
  radius of editing it is the registration hub and nothing else; no suite, no source module and no gate
  reads it.
- `src/commands/doctor.mjs` — **2 dependents**: `src/command-core.mjs` and
  `test/acceptance-horizon.test.mjs`.
- `src/work-doctor-loop-ready.mjs` — **1 dependent** (`src/commands/doctor.mjs`).

These are actual edges, and they make the blast-radius question answerable rather than argued. The one
non-registry dependent worth checking was checked: `test/acceptance-horizon.test.mjs` reads
`doctorCommand.cli.exit(...)` (`:206`) and `doctorCommand.cli.json(...).findings` (`:211-212`) and
asserts **no key set**, so the sixth `json()` key passes through it untouched.

**The envelope's key set is pinned in exactly ONE place in the tree.** Swept 2026-08-16 across `test/`
and `scripts/` for `Object.keys(result)`/`Object.keys(parsed)` and for the clause text: the only hit is
`test/doctor-command-core.test.mjs:168`. `test/arch/acd-doctor-finding-envelope.test.mjs:71-73` pins
the **finding's** four keys, not the envelope's, and is unaffected; the legacy `--json` face case
(`test/doctor-command-core.test.mjs:310-330`) type-checks `healthy`/`strict`/`errors`/`warnings`
individually and asserts no key set, so it survives the sixth key unedited. **One line in one file is
the entire mechanical cost of this milestone's envelope change** — which is what makes a countable
ceiling possible rather than aspirational.

**Decision.**

---

**§1 — The contract that MOVES is the test, and it moves because the alternative does not exist.**
`run()` returns `{findings, loopReady}`; `test/doctor-command-core.test.mjs`'s single envelope
assertion widens to match. The design freedom ADR-010 §15 measured away is not re-litigated here: with
`json()` unable to `invoke`, the only shapes that keep `run()` single-key are (a) computing the score
inside `doctorWork` — which extends `CHECK_GROUPS` or changes `doctorWork`'s bare-`Finding[]` return,
both forbidden by ADR-010 §13's two-line ceiling and by 52/ADR-007 §5's substance — or (b) a second
command answering "is this workspace healthy", which is the second-home defect this milestone exists to
refuse. Both are worse than widening one assertion.

---

**§2 — Milestone 15's `.feature` is NOT edited. 53 is the ACCEPTING item, and it records a NARROWING.**

`wiki/work/15_milestone_work-doctor-core/stories/00_story_doctor-command-core/tasks/00_doctor-command.feature`
is **byte-unchanged** — no edit, no annotation, no `@superseded` tag, no comment. It is the record of
what was true when milestone 15 was accepted, and a successor that rewrites it to keep a cell true is a
work stream losing its history. The precedent is this milestone's own, one ADR back: ADR-010 §22
refused to edit 52/02's `03_registration-and-routing.feature` Examples row for exactly this reason and
recorded the supersession here instead. This is the same act on a delivered criterion instead of a
delivered Examples cell.

**What m15's clause MEANT when it was written.** Its own comment two lines above it says so
(`00_doctor-command.feature:30-31`): *"invoke runs the command's run over the workspace and returns the
run's result verbatim — the health envelope is a single `{ findings }` field, mirroring validate."* The
criterion was drawn to keep the **face's** concerns out of the **engine's** answer: `healthy`, `strict`,
`errors`, `warnings` and the exit gate are computed at `cli.json` / `cli.exit`
(`src/commands/doctor.mjs:275`, `:291`) and must never leak backwards into `run()`. *"No other
top-level field"* was the **mechanism**; *"`run()` carries the facts, the face carries the verdict"* was
the **guarantee**, and at m15 the facts were one field, so closure at one key expressed it exactly.

**What it MEANS from milestone 53 onward.** The envelope is closed at **exactly `findings` +
`loopReady`**. A third key is **still a defect** — 53/03's own contract mechanises that at
`tasks/00_additive-json-key.feature`'s `run()`-envelope Scenario (*"it carries no third key"*), which is where a successor's
facts belong. `findings` itself is unchanged in shape and content: the same four keys
(`code`, `severity`, `path`, `message`) and the same raw absolute OS-native `path`
(`src/commands/doctor.mjs:214-220`), still pinned by
`test/arch/acd-doctor-finding-envelope.test.mjs:71-73` and by 53/03's own `:148-149`.

**This is a NARROWING, and the word is precise.** The delivered guarantee had two halves, and only one
of them moves:
1. *No face-owned field in `run()`'s result* — **untouched, in full.** `loopReady` is not a face
   concern; it is a computed fact about the workspace, of exactly the same kind as `findings`. `healthy`,
   `strict`, `errors`, `warnings` and the exit gate remain the face's alone.
2. *The envelope is CLOSED* — **preserved, at a new arity.** One key becomes two, enumerated, and the
   set is closed again immediately.

What is **not** granted is a licence. The envelope does not become open by having been widened once: a
third key requires its own ADR in its own accepting item, and the same one-line arithmetic §3 pins
here. A key added without one is a defect against this ADR, not an extension of it.

---

**§3 — The permitted diff to `test/doctor-command-core.test.mjs` is EXACTLY ONE LINE, and the ceiling
is countable the way ADR-010 §13's two-line `src/work-doctor.mjs` ceiling is countable.**

**EOL NORMALISATION IS STEP 0 OF EVERY BYTE MEASUREMENT BELOW, AND IT IS THE INVARIANT'S OWN
REQUIREMENT, NOT A CONVENIENCE** (AMENDED IN PLACE 2026-08-17 at the PO's correction, measured at
source). `git ls-files --eol test/doctor-command-core.test.mjs` → `i/lf w/crlf attr/` and
`git config core.autocrlf` → `true`, with **no `.gitattributes` pin covering `test/**/*.test.mjs`** (the
file pins `test/fixtures/**` and `test/integration/**/*.feature` only). So the committed bytes are LF
and a Windows working tree's are CRLF: a digest taken over the working tree would pass here and **fail
on the WSL worker, the Mac worker, CI and every Linux clone**, for a reason that has nothing to do with
the invariant. That is a platform gate wearing an invariant's clothes, and this repo has already paid
for the lesson twice — its own `.gitattributes` pins `UPGRADE-CHANGELOG.md text eol=lf` (the 22/R5 and
01/R2 carry-forwards: *a byte-identity guard must pin line endings*) and `src/bundle/** text eol=lf`
precisely because `acd-bundle-manifest-hashes` re-hashes rendered bytes. Fixing it in the **recipe**
rather than in `.gitattributes` is deliberate: a `test/**` pin would renormalise ~250 files, which is a
chore of its own and not a refine round's to take. **A gate that drops the normalisation to "simplify"
the recipe reintroduces the defect** — that is the clause the next author needs, so it is written here.

The pre-state, measured 2026-08-16/17 on a clean tree (`git status --porcelain` on the path: empty),
**683 newline-terminated lines** either way — only the digests move:

| | sha-256 of the file | residue digest (below) |
|---|---|---|
| **normalised (LF) — WHAT THE GATE READS** | `a1c9f370af99d68c95ca8b91160a6cdc04977ea35b47545562fd8843eb2b66e9` | `a74a8c422a6d71f25cf012005903b9241f10d705380babfa6244f9460dad659f` |
| this machine's CRLF working tree, 34,080 bytes — recorded as the measured pre-state, **never as a gate leg** | `0149c66e6fcfa7b33f87fb8142398b2fbc64abd3a17ccbd893289af03d76d851` | `317f535a8d133421ff51df20b960f1404e3eca4109b892c9aaa365e04fc1ff66` |

The file contains **exactly one** occurrence of the token `Object.keys(`, at `:168`.

The permitted diff is that one physical line, and it is pinned **verbatim**, indentation included and
compared after EOL normalisation (the eight leading spaces are part of the pin):

```js
        assert.deepEqual(Object.keys(result).sort(), ["findings", "loopReady"], "the result carries no third top-level field (53/ADR-014)");
```

Four things are ruled by that pin, each because leaving it to taste would cost a review argument later:

1. **The assertion stays ONE physical line** — the one-line ceiling and the drop-one-element residue
   recipe both depend on it — and the actual side is **`.sort()`ed** (AMENDED IN PLACE 2026-08-17 at the
   PO's correction, with QA and the developer; the first draft pinned the unsorted
   `Object.keys(result)`). The unsorted form passes today, because `run()` returns the literal
   `{findings, loopReady}` (`src/commands/doctor.mjs:213-221`) — but it would pin **key insertion order**
   on a command envelope, a constraint milestone 15 never made and milestone 53 has no reason to invent.
   `["findings", "loopReady"]` is already alphabetical, so `.sort()` **weakens nothing**: a missing key
   still fails, a third key still fails, and only a harmless reorder stops failing. A **subset** form is
   still refused in Alternatives — sorting the actual side keeps the envelope closed; asserting
   membership would open it.
2. **The message names this ADR.** The next reader of that line learns where the narrowing was decided
   without a `git blame`, and a gate can assert the line byte-for-byte.
3. **The test's exported `name` is UNCHANGED** — `"doctor/00 invoke over the workspace returns the
   { findings } envelope (no other field)"` stays exactly as it is. It is not cosmetic: FF-5311 asserts
   **name-set membership** against the assembled `tests` array, so a legacy case's `name` is a key with
   a mechanical consumer, and renaming it here would be a second change hiding inside a one-line ceiling.
   **The staleness is accepted DELIBERATELY, and it is worth the sentence** (added 2026-08-17; the
   developer and QA both asked for the rename and the PO ruled against it): that `name` quotes milestone
   15's delivered scenario title verbatim, so it is **traceability wiring to an immutable criterion** —
   the string is how a reader gets from the assertion back to
   `15/…/00_doctor-command.feature:32-36` — and the criterion it names is exactly the one this ADR
   narrows rather than replaces. A name that reads slightly behind its assertion is the honest cost of a
   record that still points at what it came from; a second changed line is not.
4. **Every other byte of the file is unchanged** — no case added, deleted, renamed or reordered, no
   import, no helper, no comment. The line count stays **683**.

**The ceiling is a measurement, not a claim**, and this is the arithmetic that makes it one. Decode the
file as UTF-8, **replace every `\r\n` with `\n` (step 0 — see the EOL rule above; without it this leg is
a platform gate)**, split on `"\n"`, drop every element containing the token `Object.keys(` (there is
exactly one, before and after — the pinned replacement line carries the token too, which is why
changing that line cannot move this digest), rejoin with `"\n"`, sha-256 the UTF-8 bytes. At HEAD that
**residue digest** is:

```
a74a8c422a6d71f25cf012005903b9241f10d705380babfa6244f9460dad659f
```

After 53/03 it must be **identical**. Any other edited byte anywhere in the file changes it. So
"exactly one line differs" is decidable from the bytes by anyone, in one command, with no `git`.

**And no other pre-existing test file is edited by 53/03** — measured, not assumed: the tree-wide sweep
in Context found exactly one envelope key-set pin, and `test/acceptance-horizon.test.mjs`, the only
other non-registry reader of `src/commands/doctor.mjs` (graph, 2026-08-16), asserts no key set.
53/03's Must-NOT-touch column keeps every other pre-existing test file, unchanged in force.

---

**§4 — 53/03 OWNS the edit, and this is NOT a second exception to the partition property. It is
narrower than an exception: it is the third instance of a fence form the table already uses twice.**

*Which story.* **53/03.** It is the story whose envelope change forces the assertion red; no other
story touches doctor's envelope (`src/commands/doctor.mjs` sits in 53/02's Must-NOT-touch column and in
no other story's Owns). The reasoning is ADR-011's own, applied verbatim: the partition's
*Why each boundary sits where it does* bullet on 53/02 (cited by NAME, not by line — an in-place-amended
document's line numbers go stale the moment it is amended, which this ADR's own first draft demonstrated
within the hour) gave 53/02 the bijection test's four `argsFor` cases *"in the same diff as the
registration, because they are a consequence of registering… splitting them into 53/05 would leave a
green test red between two stories."* This is the identical shape — a consequence of the change, not a
gate on it — and parking it in 53/05 would additionally break ADR-011's headline discipline that
evidence lands with the contract (TECH_DEBT item 48).

*How it squares with the partition property.* **It does not touch it.** ADR-011 §2's property is *"no
two stories edit the same file"*; `test/doctor-command-core.test.mjs` is edited by **exactly one**
story. The count of declared exceptions to that property stays at **ONE** — `scripts/test.mjs`, the
append-only registration hub — and the partition's **Parallelism check** paragraph stays true as written.

What narrows is 53/03's own **Must-NOT-touch fence**, which is a per-story blast-radius fence, not the
partition property. That fence already carries this exact form in two other rows:
- **53/00**: *"every pre-existing test file **except the one arch test named**"*;
- **53/02**: *"every pre-existing test **except the one bijection test named, and within it only the
  four `argsFor` cases**"*.

53/03 becomes the third, **at the smallest grain in the table**: one file, one line, with a digest
pinning the rest. A milestone in which three of six stories each edit one named pre-existing test file,
each with a named ceiling, is the fence working — not the fence eroding. The ratchet, recorded so it is
not rediscovered: **a fourth story wanting this form is the trigger to stop granting it row by row and
rule on pre-existing-test edits as a class**, in the accepting milestone's ADRs.

---

**§5 — What FF-5311's gate asserts INSTEAD of "byte-unchanged", so the control is narrowed rather than
deleted.**

*`scripts/test-unit.mjs`: **unchanged, and still asserted byte-unchanged.*** Only the doctor suite's
claim narrows. No story in this milestone has any reason to touch the unit runner, the clause costs
nothing, and it catches a real class of drift (a suite quietly re-homed into the unit lane to dodge the
registration gate). Hash-pin it, the FF-5312 idiom.

*`test/doctor-command-core.test.mjs`: "byte-unchanged" becomes a **ONE-LINE CEILING**, four legs, all
decidable from the file's bytes plus one import — and all four read the file **EOL-normalised**
(`\r\n` → `\n`) as step 0, per §3's rule: the committed bytes are LF, this machine's working tree is
CRLF, and a leg taken over un-normalised bytes fails on every Linux clone for a reason that is not the
invariant:*

1. the file contains **exactly one** occurrence of the token `Object.keys(`;
2. the line carrying it is **byte-equal to §3's pinned replacement line** — the `.sort()`ed form —
   indentation included, compared after normalisation;
3. the **residue digest** — decode UTF-8, replace `\r\n` with `\n`, split `"\n"`, drop the
   `Object.keys(` element, rejoin `"\n"`, sha-256 — equals
   `a74a8c422a6d71f25cf012005903b9241f10d705380babfa6244f9460dad659f`, and the file is
   **683** newline-terminated lines. This is the leg that makes the ceiling a measurement;
4. the exported `doctorCommandCoreTests` array's **`name` set is unchanged** (import it, compare to the
   assembled set), so the ceiling cannot be evaded by deleting, renaming or reordering a case — the one
   evasion legs 1–3 alone would not see, because a deleted case changes the residue *and* would be
   argued as "the ceiling moved".

This is **strictly stronger than what it replaces**: "byte-unchanged" was prose no gate enforced (no
`test/arch/` file hashes it — measured), and the replacement is a digest. Deleting the clause instead
was refused in Alternatives: an unenforced permission is how the next milestone edits the legacy suite
for a reason nobody rules on.

*Honest gap, stated rather than discovered.* FF-5311's gate is 53/05's and 53/05 lands **last**, so
between 53/03 landing and 53/05 landing nothing mechanises the ceiling. That is acceptable here and
only here, because the ceiling is **one line in a review diff** — the cheapest possible thing for a
human to check — and because the pre-state digest above lets any reviewer verify it in one command
before the gate exists.

---

**§6 — The consequential amendments, APPLIED IN PLACE in this document, each citing this ADR.** Four
clauses carry the superseded wording and all four are corrected where they stand — two above this ADR,
two below it — in the register's own in-place-correction style, and each is cited by NAME rather than by
line: **ADR-011 §3**, **ADR-011's Invariant**, **FF-5311's invariant text** and the **53/03 partition
row** (the last two in the `## Fitness functions` and `## Story partition` blocks below). Two smaller
surfaces move with them: the register's own amendment note gains an `AMENDED 2026-08-16 by ADR-014`
paragraph in the style its 2026-08-15 corrections already use, and the partition prose's *"**Seven**
pre-existing files are edited across the whole milestone"* becomes **eight** — a count made false by a
ruling is the surface a later reader trusts most. **Re-pinned 2026-08-17 at the PO's correction:** every
site that quotes a digest or the pinned line carries the **EOL-normalised** values and the `.sort()`ed
form (§3), so no surface holds the superseded CRLF digest as a gate value. Nothing else is reflowed,
renumbered or reordered.

---

**Alternatives considered.**

- *Edit m15's delivered `.feature` — annotate the clause, or tag the scenario `@superseded`* —
  **rejected on the standing rule, and on this milestone's own precedent.** A delivered acceptance
  criterion is immutable; ADR-010 §22 already refused the identical act against 52/02 and recorded the
  supersession here instead. An accepted item's contract is the record of what was true when it was
  accepted; a successor that edits it to stay green destroys the only evidence of what changed.
- *Keep the legacy assertion green by moving `loopReady` off `run()`* — **rejected: measured
  unavailable.** ADR-010 §15 established that `json()` has no `ctx` and cannot `invoke`, re-verified at
  `src/commands/doctor.mjs:275` on 2026-08-16. The two shapes that would preserve a single-key `run()`
  are computing inside `doctorWork` (breaks ADR-010 §13's two-line ceiling and 52/ADR-007 §5's
  substance) or a second health command (a second door to one answer). Both trade one widened assertion
  for a structural defect.
- *Put `loopReady` behind a flag so the default envelope stays single-key* — **rejected.** It makes the
  score invisible by default, which defeats ADR-007's reason for putting it on the health command at
  all, and it leaves one command with **two** envelope shapes told apart by a flag — a document whose
  key set you must know an argument to predict. The `--explain`/`--converge` modes are not a
  counter-example: they are separate ledger documents that carry no `loopReady` at all (ADR-010 §15).
- *Widen the assertion to a SUBSET form (`assert.ok(!("third" in result))`, or an allowance list)* —
  **rejected: that abandons the guarantee instead of narrowing it.** A closed envelope means an
  unexpected key **fails**. Anything looser deletes precisely what m15 bought and would make the next
  additive key silent — which is the failure this ADR exists to prevent recurring. **Sorting the ACTUAL
  side is a different thing and is ADOPTED** (§3.1, amended 2026-08-17 at the PO's correction with QA and
  the developer): `Object.keys(result).sort()` against an already-alphabetical two-member literal still
  fails on a missing key and still fails on a third key — it only stops failing on a harmless reorder,
  and so pins the key SET the delivered criterion was about instead of an insertion ORDER m15 never
  asserted. The first draft of this ADR pinned the unsorted form and was wrong on exactly that point.
- *Give the file to 53/05 along with the gate, keeping every pre-existing test out of 53/03* —
  **rejected on ADR-011's own argument** for 53/02's four `argsFor` cases (the partition's *Why each
  boundary sits where it does* bullet on 53/02): it leaves a
  green test red between two stories and lands the evidence in a diff nobody reviews for coverage —
  TECH_DEBT item 48's exact shape, in the milestone that cites item 48 as its cautionary tale.
- *Drop `test/doctor-command-core.test.mjs` from FF-5311 entirely, since 53/03 now legitimately edits
  it* — **rejected (§5).** A control that becomes inconvenient and is deleted rather than narrowed is
  how the file becomes editable by whoever next finds it in the way. The narrowed leg costs one digest
  and buys a countable ceiling where there was unenforced prose.
- *Widen the pin and also fix the now-slightly-wrong test `name`* — **rejected (§3.3), and re-rejected
  2026-08-17** when the developer and QA both asked for the rename and the PO ruled with this ADR. The
  `name` is a key FF-5311 asserts membership on; it quotes milestone 15's delivered scenario title
  verbatim, so it is traceability wiring to an immutable criterion; and changing it is a second edit
  smuggled inside a one-line ceiling. The name's mild staleness is cheaper than an unmeasurable diff and
  cheaper than a record that no longer points at what it came from.

**Consequences.** 53/03's contract is **confirmed as written** — `tasks/00_additive-json-key.feature`'s
`run()`-envelope Scenario (`:150-157` after this round's own edit to that file)
needs no change, and its *"carries no third key"* line is exactly the narrowed guarantee this ADR
records; the REFINEMENT INPUT comment at `:141-144` is **discharged** by this ruling and may be struck
by the story's own refinement pass. Milestone 15's `.feature` is untouched and milestone 15 stays
`done`. The milestone's pre-existing edit surface grows by one file to **eight**, and by exactly one
line. 53/03's Must-NOT-touch fence gains the "except the one file named, and within it only the one
assertion named" form that 53/00 and 53/02 already carry — the third and last grant of that form before
it becomes a class ruling (§4). ADR-011 §3's ruling survives in substance: 53/03 still authors its own
`test/loop-ready-*.test.mjs` suites and still reuses the legacy harness's *shape* rather than extending
it; what it no longer claims is that the legacy file is untouchable. FF-5311 keeps two byte-unchanged
subjects where it had two — one still byte-exact (`scripts/test-unit.mjs`), one now ceilinged — and
becomes, on that leg, enforceable for the first time. And a future third envelope key is now a
declared, priced act: one ADR in its own accepting item, one line here, one digest re-pinned.

**Invariant.** `invoke("work:doctor", {}, ctx)` returns an envelope whose key **set** is exactly
`{findings, loopReady}` — a third key is a defect, and key ORDER is deliberately not pinned — and no
face-owned field (`healthy`, `strict`, `errors`, `warnings`, exit or gate) ever appears in it;
`findings` keeps its four-key member shape and raw absolute OS-native paths;
`wiki/work/15_milestone_work-doctor-core/stories/00_story_doctor-command-core/tasks/00_doctor-command.feature`
is byte-unchanged; `test/doctor-command-core.test.mjs` differs from its pre-53 bytes by **exactly one
line** — its sole `Object.keys(` line, byte-equal to §3's pinned `.sort()`ed replacement — at 683
newline-terminated lines, **EOL-normalised** residue digest
`a74a8c422a6d71f25cf012005903b9241f10d705380babfa6244f9460dad659f` (`\r\n` → `\n` first, always: the
committed bytes are LF and no `.gitattributes` rule covers `test/**/*.test.mjs`), with its exported
`name` set unchanged; `scripts/test-unit.mjs` is byte-unchanged; no other pre-existing test file is
edited by 53/03. (Enforced by the amended FF-5311 row below.)

---

## ADR-015: The seven build-time contradictions, ruled — SIX are instruments wrong about the TREE and ONE is a lossy settle in delivered code; 53/00's original superseded-in-record ruling is itself superseded by the operator's explicit reopen, and pre-existing-test edits are ruled as a CLASS because ADR-014 §4's ratchet fired

**Status:** Accepted
**Date:** 2026-08-17

**Context.** Seven contradictions were raised at build time on 2026-08-17 and handed back to refinement
to rule (`STATE.md:258-345`), plus two older flags left open at earlier rounds (`STATE.md:66`,
`STATE.md:347`). Nothing here re-partitions the milestone and nothing here creates a story. Every
section below states what was **run or read** and the value **observed at HEAD** before it decides,
because the STATE narrative is a build-time report and several of its numbers are already stale — one of
its own entries is a stale-baseline finding.

**m47/R7 IS ACKNOWLEDGED BY NAME, AND HONOURED.**
`wiki/work/47_milestone_fleet-repo-filter/RETROSPECTIVE.md:116` — *"Eight instruments were found wrong
about the TREE rather than about the rule"* — whose lesson is *"run each new gate against the current
tree and state the verdict in its own header, one line, unconditional, because the run IS the check."*
Every one of this milestone's **thirteen** declared controls was run against the current tree while this
ADR was written, and every verdict is written into that control's own `State now` cell below, replacing
the refine-time *"RED until X lands"* prose. The measured result: **10 of 13 fully green, 3 red**, and
all three reds are exactly R7's class — the gate is wrong about the tree, not about the rule. That is the
finding of this round, and it is why six of seven sections rule *instrument wrong* rather than moving a
contract: **an ADR whose substance survives every measurement should not be amended to accommodate a gate
that mis-encoded it.**

**Graph grounding (actual, re-run at this ruling).** `aof graph build .` over the project root reports
`unchanged: true` — *"No code-graph topology changes detected; outputs left untouched"* — at **11,446
nodes / 27,699 edges**, `builtAt 2026-08-17T00:45:52.799Z`, egress **none**. Graphify rewrites only on a
topology change, so an untouched artifact means the graph is current; it is used, not worked around.
(The default 120 s timeout still fails on this tree — `AOF_GRAPHIFY_TIMEOUT_MS` was raised, as ADR-014's
Context records.) `aof graph impact` on every file this ADR rules over:

- `src/agent-session-driver.mjs` — **18 dependents, of which exactly TWO are production**
  (`src/commands/drive.mjs`, `src/mesh-worker-execution.mjs`); the other 16 are test suites. Imports 6.
  This decides §7: widening its settle is a two-production-caller act, so the objection is one of
  **ownership**, not of coupling.
- `src/work-doctor-loop-ready.mjs` — 5 dependents (`src/commands/doctor.mjs` + 4 suites), imports
  **exactly 1** (`src/work-doctor.mjs`). A leaf, which is why §6's question is containable.
- `src/commands/loop.mjs` — 12 dependents (`src/command-core.mjs` + 11 suites), imports 9.
- `src/work-bundle-runtime.mjs` — 3 dependents, imports 1 (`src/model.mjs`). §4's dual-render mapping
  lives here, and its blast radius is why 53/04 is right to be forbidden from touching it.
- `test/arch/acd-loop-finding-envelope.test.mjs` and `test/work-loops-coverage-ledger.test.mjs` — **1
  dependent each (`scripts/test.mjs`)**. §8's edit can break no consumer; this is ADR-014 §4's
  blast-radius argument, applying verbatim to two accepted milestone-52 suites.

**Decision.**

---

**§1 — 53/05 FF-5306 vs ADR-005: THE INSTRUMENT IS WRONG. The L1 account is observed at the REPORT
CHANNEL, which is where this milestone's own mechanising contract already put it; `LoopState` stays
frozen at ten keys and `driven` stays reserved for actual L2 run rows.**

*Measured at source, 2026-08-17.* `loopState()` (`src/commands/loop.mjs:76-89`) builds exactly ADR-005
§3's ten keys. `drivenRow()` (`:312-321`) reads `entry.record.runId` and `entry.record.attempt` off a
**minted run record**, so an L1 walk — which mints nothing — cannot populate a `driven` row without
either minting or lying about two of its six fields. The contradiction is therefore real, and the
developer's two attempts at it are both on record: `cf33394` pushed hypothetical acts into `driven`,
`56b41ba` took them back out. Driving the real body confirms both halves at once —
`runLoopBody({scope:"03", level:"L1"})` over the `loopFixture()` stream returns a document whose key set
is exactly `act,cap,driven,level,loopRunId,next,resumable,scope,state,stops` with `driven: []`, **and**
emits through `report` exactly `["03 — drive verify", "03/01 — drive continue"]` — one row per in-scope
actionable item, carrying the act an L2 loop would take, with `spawnCalls` 0.

*And the mechanising contract already says so.* 53/02 task 07 — the story that OWNS the L1 walk —
contracts it as a report and nothing else: *"Then the **report** names each item an L2 loop would act on,
with the act it would take"* (`02/tasks/07_refusals-and-inert-levels.feature:110-113`), and its
`--level L1 --json` scenario at `:137` requires *"`driven` is empty"*. FF-5306's own row uses the same
verb — *"**reports** one row per item with the `act` an L2 loop would take"*. There is no contract
anywhere in this milestone that asks the returned document to carry the account; there is one gate that
asserts it, and that gate is `test/arch/acd-loop-l1-read-only.test.mjs:34-36`, which passes
`report: () => {}` — **discarding the exact evidence it then fails for not finding.** That is R7's class
precisely.

*A second measurement closes the last escape.* `--json` **never launches** (`src/spine/face.mjs:154`),
so `aof work loop <scope> --level L1 --json` runs the registered probe, not the L1 walk. The frozen
ten-key `--json` document and the L1 walk's return value are **not the same document**; the launcher
body's return value has no face consumer at all (`face.mjs:158` awaits it and discards it). Putting the
account in the returned state would pin a shape only a test reads, while the operator's actual account —
the report lines — stayed unasserted.

**Ruling.** ADR-005 §3's ten keys and `driven`'s row type are **CONFIRMED, unchanged**. The L1 account
is the **report channel**, asserted by collecting the injected `report` sink. `driven` is `[]` at L1, and
that is a positive assertion, not an omission. FF-5306's row is corrected in place below.

**Follow-on:** **53/05** (open). (a) *test-code:* `test/arch/acd-loop-l1-read-only.test.mjs:34` passes
`report: (line) => lines.push(line)` and `:36`'s `assert.ok(state.driven.length > 0, …)` becomes two
assertions — the collected lines are non-empty **and** `state.driven` is `[]`. (b) *`.feature`
amendment, needs `aof:refine 53/05`:* `05/tasks/02_drives-that-prove-nothing-happened.feature:156`
*"the returned document reports a non-empty per-item account"* → *"the loop's report channel emits a
non-empty per-item account … and the returned document's `driven` is empty"*; the Examples row at `:193`
follows; the REFINEMENT INPUT comment at `:4-7` is discharged and struck.

---

**§2 — 53/00 task 01 ↔ 53/05: THE INSTRUMENT IS WRONG. The exact-six naming allowlist gains the four
named fitness gates. AMENDED 2026-08-17 after the operator explicitly REOPENED 53/00: the reopened
story owns its corrected executable contract and evidence; 53/05 no longer edits story 00's door
suite.**

*Initially measured at source, 2026-08-17.* `grep -rl agent-session-driver test/` returned **ten** files: this
story's five suites, `test/arch/acd-worker-driver-no-headless-print.test.mjs`, and 53/05's
`acd-session-driver-mesh-blind`, `acd-session-driver-single-home`, `acd-phase-door-not-a-driver`,
`acd-loop-suite-registration`. Before the ten-name correction, the census suite was **17/18**, red only
on the naming set equality. On the reopened branch the literal is already ten and the suite is
**18/18**; the refinement below governs the implementation that keeps it truthful.

*The four are structurally forced to name the token, and none can avoid it honestly.* Each names it as
its **subject**: `acd-session-driver-mesh-blind.test.mjs:9` (the walk root), `acd-session-driver-single-home.test.mjs:8,33,48`
(the module whose exports are compared by reference identity, and the sink's re-export clause),
`acd-phase-door-not-a-driver.test.mjs:23` (the **forbidden import** FF-5303 asserts the absence of — an
absence assertion that cannot name what it forbids is not an assertion), and
`acd-loop-suite-registration.test.mjs:23` (53/00's frozen suite-name family, which FF-5311 must match to
prove those suites registered). Splitting or obfuscating the strings would satisfy the count while
destroying four gates — the STATE feedback is right to forbid it by name.

*And the census's real property is untouched.* None of the four statically imports
`src/mesh-worker-execution.mjs` (parsed: their import clauses are node builtins,
`test/support/source-slice.mjs`, `src/command-core.mjs`, `src/spine/face.mjs`,
`test/loop-command-probe.test.mjs`). So the **43 + 2 + 4 = 49** static-import census is unchanged and
green. The current door suite truthfully special-cases the named re-aimed gate and asserts that the
other **42** importers name the driver zero times. That is the leg which detects an unplanned importer
re-point; the old prose saying all 43 name it zero times is the defect corrected below.

*Delivered or open?* 53/00 was accepted on 2026-08-16, then the operator explicitly reopened it on
2026-08-17 after the accepted importer and green-suite claims proved mutually false. That state change
supersedes this section's earlier immutability assignment. It does not erase the accepting record:
`VERIFICATION.md` remains the historical evidence, while the reopened `STORY.md` and task features are
the authoritative contract for the next build. Applying the old "accepted, therefore immutable"
sentence after the reopen would itself create the contradiction it was meant to avoid.

**Ruling.** The guarantee is **42 untouched sink-importing suites plus one named, deliberately re-aimed
sink importer**, `test/arch/acd-worker-driver-no-headless-print.test.mjs`. The former "all 43 name the
new module zero times" statement was false: the gate must name the producer it structurally reads.
The closed naming allowlist is **TEN, enumerated and closed** — story 00's five suites, that re-aimed
gate, and the four fitness controls above. An eleventh file naming the token is still a defect.

53/00 owns `test/agent-session-driver-door.test.mjs`, including the ten-name literal and these honest
link doors: 48 import-safe census members are imported in one fresh child; the 49th,
`scripts/pin-checkout-id.mjs`, is never evaluated, and its parsed static sink binding is checked on the
freshly linked sink namespace. 53/05 owns only its four new controls and must not edit the door suite.

The reopened story also owns the narrow `test/support/mesh-worker-exec-fixture.mjs`
`createStatusRecorder.sendEffectStep` correction: preserve an own `sessionId` key as the production
string or `null`, while retaining sparse legacy projection for `runId`, `branch` and `code`. Production
already normalises empty/no transcript ids to `null` before reporting; no driver or handler semantic
change is authorised. The executable count is the **combined eight-suite behavioural lane, 33 cases**:
`interactive-pty` 4 + `directive-command` 3 + `needs-input` 4 + `session-id` 8 + `output-chunk` 1 +
`completion-detection` 7 + `liveness` 4 + `command-timing` 2. It is 31/33 before the fixture correction
because the session-id module is 6/8; after the correction the required result is 33/33 overall and 8/8
for that unchanged module. Calling the session-id module itself "33 cases" is a counting defect.

**Ownership ceiling.** Across the whole story, four pre-existing test-tree files are authorised:
`test/arch/acd-worker-driver-no-headless-print.test.mjs`, the two already delivered re-export-following
gates `test/arch/acd-terminal-mirror-geometry-pinned.test.mjs` and
`test/arch/acd-terminal-view-live-observable.test.mjs`, and the one newly authorised status-recorder
fixture above. Only the first is one of the 43 sink-importing suites and therefore the sole 42+1 census
exception. The reopened implementation delta is limited to the fixture plus story-owned
`test/agent-session-driver-door.test.mjs`; the other three pre-existing gate edits remain delivered.

---

**§3 — 53/03 tasks 00-02 after 53/07: THE INSTRUMENT IS WRONG (the contract's path language). Re-aim
the three task contracts to `.aof/loops`, and DECLARE the shared fixture.**

*Measured at source, 2026-08-17, and the STATE number is stale.* `wiki/work/loops` occurs **30** times
in 53/03's task contracts — `00_additive-json-key.feature` ×2, `01_registry-absent.feature` ×17,
`02_composed-verbatim.feature` ×11 — plus once in `STORY.md`, for **31** in the story. `STATE.md:281`
says *"Twenty-six task references"*; the earlier round's note at `STATE.md:74-77` says twenty-seven.
Both are behind: each of the three files gained one occurrence when its REFINEMENT INPUT comment landed.
Production resolves the registry at `src/work-loops.mjs:491-494` — `loopsDirectory(workspace)` reading
`workspace.aofDir` — and the landed shared helper follows it (`test/support/loop-ready-fixture.mjs:30-39`,
`path.join(aofDir, "loops")`). Driving 53/03's five suites in isolation: **33/33 green** (7 + 5 + 7 + 7 +
7), against the new home. And FF-5312's *"no file under `src/`, `test/` or `scripts/` names
`wiki/work/loops`"* leg is green — the retired path survives **only** inside 53's own wiki documents.

*So the executable record and the green evidence disagree about the subject,* and the evidence is right:
ADR-012 moved the home, 53/07 landed it, and 53/03's suites were written against the landed home. A
contract that names a directory production no longer resolves cannot be cited as accepted for the
scenarios it states — the tests pass, but not the contract.

*The helper is genuinely undeclared.* `test/support/loop-ready-fixture.mjs` (6,412 bytes, five importers)
appears in no story's Owns column. It is not a suite, so `acd-test-suite-registration` never sweeps it,
and `acd-loop-suite-registration`'s families are `*.test.mjs` — nothing owns it and nothing sees it.
The milestone-52 precedent is explicit that a shared fixture helper is *"shared support, not a suite"*
and is correctly outside the registration sweep (`test/work-loops-coverage-ledger.test.mjs:702-706`), so
the answer is to **declare it**, not to hide it.

**Ruling.** ADR-012 stands, unamended. 53/03's three task contracts are **re-aimed** to
`<workspace.aofDir>/loops` (`.aof/loops` in this repo), which is a correction of the subject, not a
weakening of any scenario — every Given/Then keeps its shape and only the path text moves.
`test/support/loop-ready-fixture.mjs` is **declared in 53/03's Owns**, as story-owned shared support
authored with the story (ADR-011 §1's discipline: evidence, including its fixtures, lands with the
contract). Localising it into five copies is refused — that is item 0's headline disease bought for a
declaration line. The partition row is corrected in place below.

**Follow-on:** **53/03** (open). *`.feature` amendment, needs `aof:refine 53/03`:* replace all **30**
occurrences of `wiki/work/loops` across `03/tasks/{00_additive-json-key,01_registry-absent,02_composed-verbatim}.feature`
with `.aof/loops`, and strike the three REFINEMENT INPUT comments (`01_registry-absent.feature:4-5` and
its two siblings). *Record:* `03/STORY.md`'s Scope/Owns gains `test/support/loop-ready-fixture.mjs` and
its one remaining `wiki/work/loops` mention is corrected. *No test-code and no `src/` change* — the
implementation is already right.

---

**§4 — 53/04 task 00: THE INSTRUMENT IS WRONG (the contract's count). ONE authored source renders to
TWO addresses by a generic, ADR-006-mandated mapping; the locked "exactly one" is unreachable and was
never a property of this repo's bundle.**

*Measured at source, 2026-08-17 — every hash in the STATE entry verified.* The authored source
`src/bundle/commands/autonomous.md` is 2,397 bytes with sha-256
`3676dce8c1c8d8de33d7e18779f2260cb292e54df8b4ac9dc1f11179faec305c` (identical raw and LF-normalised —
the file has no CRLF, as `.gitattributes`' `src/bundle/** text eol=lf` pin requires). The **base**
manifest at `9e0f910` carries 87 entries including
`.claude/commands/aof/autonomous.md sha256:7e54cc89…40c8316b` and
`.codex/skills/aof-autonomous/SKILL.md sha256:63ed9dc4…4b8e51e0fd`; the **current** manifest carries 96
entries with `…5274d68f…48958cc1` and `…688e5c98…18cbccf4040`. Both addresses have already moved, from
one edited source, through untouched machinery.

*And the two-output rule is structural, not incidental.* `src/work-bundle-runtime.mjs:3-9` promotes
`command`→`codex` to `CAPABILITY_STATUS.mapped`; `:13-23` declares `RESOURCE_MAPPINGS.command.codex =
{kind: "skill", idPrefix: "aof-", …}`; and `partitionByCapability` at `:55-59` pushes the **mapped**
resource and `continue`s **before** the `declaredRuntimes.includes(runtime)` filter at `:61`. So the
`autonomous` member's own `runtimes: ["claude"]` does **not** suppress the Codex skill — the mapping
bypasses that filter by construction. The module's own header states the reason: *"cross-runtime mapping
is delegated to the CAPABILITIES matrix… there is NO `runtime === "codex"`/`"claude"` branch here"*
(`src/work-bundle-synthesis.mjs:11-13`). Making one address hold still would require deleting a
supported render or branching the matrix — the first breaks the derived-manifest gate, the second is in
53/04's Must-NOT-touch column, and both are worse than counting correctly.

**Ruling.** The count in the contract is wrong and the render is right. `04/tasks/00`'s shipped-manifest
scenario asserts that **exactly two** rendered paths' content-addresses move — `.claude/commands/aof/autonomous.md`
and its mapped `.codex/skills/aof-autonomous/SKILL.md` — **both derived from the one authored source**,
and **no third**. Closing at two keeps everything the clause was for: a manual hash bump still fails, an
unrelated render moving still fails, and a deleted runtime output still fails. The Background's
Claude-only reader observation (`:31`) is correct as written and stays; only the manifest scenario is
runtime-complete. ADR-008 is unamended.

**Follow-on:** **53/04** (open). *`.feature` amendment, needs `aof:refine 53/04`:*
`04/tasks/00_the-prompt-hands-over.feature:172` — *"And exactly one rendered path's content-address moves
in this story's diff"* becomes *"And exactly TWO rendered paths' content-addresses move — `.claude/commands/aof/autonomous.md`
and the mapped `.codex/skills/aof-autonomous/SKILL.md`, both derived from the one authored source
(`src/work-bundle-runtime.mjs:13-23`, `:55-59`) — and no third"*; `:169-170`'s manifest leg names both
paths; the REFINEMENT INPUT comment at `:162-165` is struck. *No test-code, `src/` or bundle-machinery
change.*

---

**§5 — 53/05 FF-5301: THE INSTRUMENT IS WRONG, and it contradicts ITSELF. The transitive denylist is
narrowed to mesh LIFECYCLE; `workspace.mjs` comes off the transitive list because FF-5301's own admitted
edge already implies it, and `mesh-log.mjs` is admitted transitively because ADR-001 §3 admits its only
importer by name.**

*Measured at source, 2026-08-17, by re-running the gate's own walk.* The gate is **2/3**, red with
exactly two denied nodes:

- `src/mesh-log.mjs`, reached `agent-session-driver.mjs → terminal-providers.mjs → degrade.mjs → mesh-log.mjs`
- `src/workspace.mjs`, reached one hop further, `… → mesh-log.mjs → workspace.mjs`

`src/degrade.mjs` is **44 lines** and imports **exactly one** module — `createMeshLogSink` from
`mesh-log.mjs` (`degrade.mjs:11`) — and its own header records that it and `mesh-log.mjs` are *"the ONLY
sanctioned silent-catch homes left"*. `mesh-log.mjs` imports `globalMeshPaths` from `workspace.mjs`
(`:16`) to compute `<meshRoot>/logs/<proc>.log`. Neither module carries an assignment, a lease, a
worktree registry or a workspace identity: `mesh-log.mjs` is a **JSONL log sink**, `globalMeshPaths` is a
**path resolver**.

**The row is self-contradictory, and this is the decisive measurement.** FF-5301 admits
`terminal-ws.mjs → work.mjs` as its single transitive exception — and `src/work.mjs:17` is
`import { findProjectConfig, globalMeshPaths, globalWorkspacePaths } from "./workspace.mjs"`. So the
admitted edge **already reaches `workspace.mjs`**, unconditionally. The gate reports the `mesh-log`
route only because its depth-first walk visits `terminal-providers.mjs` (driver import order, `:52`)
before `terminal-ws.mjs` (`:53`); `deniedPaths` denies `workspace.mjs` on identity regardless of chain
(`acd-session-driver-mesh-blind.test.mjs:43-49`). **A denylist that denies what its own allowlist grants
is red by construction, on any tree.** ADR-001 §3 also admits `degrade.mjs` by name among the frozen
five direct imports, so denying `degrade.mjs`'s only import is the same contradiction one hop down.

*What the invariant is actually for, and it is preserved with a number.* ADR-001's Context measures the
cost this gate exists to prevent: importing the sink pulls *"the assignment lifecycle, the effects ledger
and a SQLite opener"* as a load-time side effect. Re-measured today by the same walk:
**`src/mesh-worker-execution.mjs` reaches 55 modules transitively; `src/agent-session-driver.mjs` reaches
21.** That is the guarantee, and it is now a number rather than an argument.

**Ruling.** ADR-001 §3 is **CONFIRMED as written** — its own words are *"zero mesh-**lifecycle**
imports, transitively"*, and it never said "no module whose basename begins `mesh-`". FF-5301's row
mis-encoded a concept as a filename glob. The row is corrected below to carry **two lists, not one**:

1. **The DIRECT import set is FROZEN at exactly five** source modules — `claude-trust.mjs`,
   `degrade.mjs`, `terminal-providers.mjs`, `terminal-ws.mjs`, `work-observe.mjs` — plus node builtins,
   asserted as exact set equality both ways. This is ADR-001 §3's own list, and it is strictly the
   strongest and most decidable leg. A direct `workspace.mjs` or `mesh-*.mjs` import still fails.
2. **The TRANSITIVE denylist is the LIFECYCLE set** — `run-store.mjs`, `effects/*`,
   `global-work-store.mjs`, `workspace-identity.mjs`, `item-lock.mjs`, `board-*.mjs`, `src/commands/*`,
   and the mesh lifecycle modules by name (`mesh-worker-execution.mjs`, `mesh-worktree.mjs`,
   `mesh-presence.mjs`, `mesh-repo-marker.mjs`, `mesh-launcher.mjs`, `mesh-session-spawn-handler.mjs`,
   `mesh-clone-credential-provider.mjs`, `mesh-assignment-reclaim.mjs`) — with **`mesh-log.mjs` and
   `workspace.mjs` STRUCK from it and admitted, each by its named reason**: the log sink because
   `degrade.mjs` is an admitted direct import and the sink is its only import; the path helper because
   the admitted `terminal-ws.mjs → work.mjs` edge reaches it at `work.mjs:17`. A **self-check** fails if
   either admitted reason loses its subject — if `degrade.mjs` stops importing `mesh-log.mjs`, or
   `work.mjs` stops importing `workspace.mjs`, the permission is stale and must be deleted (the idiom
   `05/tasks/01…:70-74` already contracts for the admitted edge).
3. **A reached-module CEILING at 21**, the house `acd-ui-surface-file-budget` ceiling-and-floor idiom:
   the walk from `src/agent-session-driver.mjs` reaches at most 21 modules, and a floor so a walk that
   resolved nothing fails as "not actually walked". This is what now holds the load-cost guarantee the
   glob was standing in for, and a genuine later subtraction still passes.

**Follow-on:** **53/05** (open). *test-code:* `test/arch/acd-session-driver-mesh-blind.test.mjs:10-13` —
`DENIED` splits into `DENIED_DIRECT` (ADR-001 §3's list, unchanged) and `DENIED_TRANSITIVE` (the
lifecycle set above), `deniedPaths` at `:42-50` applies the transitive list to non-root nodes and the
direct list to the root's own specifiers, plus the two admitted-reason self-checks and the 21-module
ceiling. *`.feature` amendment, needs `aof:refine 53/05`:*
`05/tasks/01_import-graph-and-export-set.feature:86` — *"it equals ADR-001's frozen list exactly"* names
**which** list (direct vs transitive), and the REFINEMENT INPUT at `:4-7` is struck. `:81`'s
not-flagged row is already correct.

---

**§6 — 53/05 FF-5310 vs FF-5309/ADR-007: THE INSTRUMENT IS WRONG. A cap RESOLUTION site and a cap
DECLARATION inspection are different acts, the gate already knows how to tell them apart, and it simply
does not use that knowledge in its sweep predicate.**

*Measured at source, 2026-08-17.* The gate is **3/4**, red only on the reader-set `deepEqual`. The sweep
predicate is `/autonomous\?\.maxAttempts/u` over comment-stripped `src/**/*.mjs`
(`acd-loop-cap-single-home.test.mjs:39`) — a **property-access** match. Five modules match:
`run-retry.mjs:62`, `resume.mjs:119`, `run-start.mjs:200`, `loop.mjs:150`, and
`work-doctor-loop-ready.mjs:32`.

*The fifth is not the same kind of site as the other four, and the difference is visible in one
character.* The four resolvers all end `?? 3` and feed the value into a retry decision. The scorer reads
`const declaredCap = config?.work?.autonomous?.maxAttempts;` (`:32`) with **no fallback at all**, and
uses it for exactly two things: the predicate `Number.isInteger(declaredCap) && declaredCap >= 0`
(`:33`) and the evidence string (`:56-57`). Its `FALLBACK_MAX_ATTEMPTS = 3` (`:21`) is never a
resolution — it appears **only inside the failing evidence text**, which is what ADR-010 §12 explicitly
ruled: *"`cap-declared` passes iff the config DECLARES an integer >= 0 at that key… and the failing
evidence names both the key and the value the retry path would otherwise fall back to."* The scorer is
the *inspector of the declaration*; it is structurally incapable of being a second home for the number,
because it never yields a number.

**And the gate already contains the discriminator.** Its second half at `:43-46` asserts every recorded
reader matches `/autonomous\?\.maxAttempts[^\n;]*\?\?\s*3\b/u` — the **resolution form**. The gate knows
what a resolver looks like; it just defines its population by property access instead. Adding the scorer
to `EXPECTED_READERS` would immediately fail that second leg, which is the tree telling us the same
thing twice.

*Containment, from the graph.* `src/work-doctor-loop-ready.mjs` has 5 dependents and imports exactly one
module. Nothing about this ruling can leak.

**Ruling.** ADR-007 §5 / ADR-010 §12 and FF-5309 are **CONFIRMED, unchanged** — the scorer must read the
declaration, and there is no other honest way to answer `cap-declared`. FF-5310's invariant is
**narrowed to what it always meant**: the **RESOLUTION** set — modules that read the key **and supply a
default for it** — is exactly the measured four, exact set equality both ways, every fallback literal
`3`. **Declaration inspection** is a distinct, admitted act with exactly **one** admitted member,
`src/work-doctor-loop-ready.mjs`, admitted **by name and with a leg that pins it as an inspector**: its
read carries **no `??`**, and a `??` appearing on that line makes it a fifth resolution site and fails
the gate. So the closed-set property survives at full strength on both sides, and a genuine second home
still fails on the day it is written. `ADR-009 §1` — *53 enforces the bound and never chooses its value*
— is untouched: the scorer chooses nothing.

**Follow-on:** **53/05** (open). *test-code:* `test/arch/acd-loop-cap-single-home.test.mjs:8-13` gains
`DECLARATION_INSPECTORS = ["src/work-doctor-loop-ready.mjs"]`; the sweep at `:36-42` partitions matches
by whether the matching line supplies a `??` default, `deepEqual`s the resolver partition against
`EXPECTED_READERS` and the inspector partition against `DECLARATION_INSPECTORS`, and adds the
inspector-has-no-fallback leg. *`.feature` amendment, needs `aof:refine 53/05`:*
`05/tasks/05_the-cap-single-home.feature:50-55` — *"swept for the `work.autonomous.maxAttempts` access
form"* becomes *"swept for the `work.autonomous.maxAttempts` RESOLUTION form (the read plus its `??`
default)"*, with a new scenario for the single admitted declaration inspector; the Examples rows at
`:138`/`:141` keep their meaning; the REFINEMENT INPUT at `:4-6` is struck. Note that `:61`'s own words
already say *"a new **resolution site** is a second home"* — the contract was written to this ruling and
its sweep scenario simply did not match its own prose.

---

**§7 — 53/02 task 04: THE INSTRUMENT IS WRONG, and the instrument is DELIVERED CODE. The driver's settle
contradicts its own documented resolution contract by projecting the completion watch's result to
`{outcome}`; the one-line fix is a PRODUCTION NO-OP, and 53/02 owns it.**

*Measured at source, 2026-08-17.* `src/agent-session-driver.mjs:682` documents the function's
resolution as `{ outcome: "done"|"failed"|"needs-input", sessionId, failureReason? }`. `finish()`
(`:851-893`) resolves `{...result, sessionId: endedSessionId}` — it forwards **every** key of whatever it
is handed. Exactly one call site narrows: `:1000`, `finish({ outcome: result.outcome })`, discarding the
transcript-completion result's other fields. The PTY exit path at `:925-927` independently hard-codes
`failureReason: "agent_error"`. Driving the story's own suite: `test/loop-command-stops.test.mjs` is
**3/4**, red with `+ 'run-not-retryable' / - 'retry-parked'`, exactly as reported — the fixture injects
`watchTranscriptCompletion: async () => ({outcome:"failed", failureReason:"session_limit"})`
(`test/loop-command-stops.test.mjs:148`) and the reason never arrives.

**The fix is a production no-op, and that is a measurement, not a hope.** `defaultWatchTranscriptCompletion`
resolves only the objects built at `agent-session-driver.mjs:408`, `:423` and `:425` —
`{outcome:"needs-input", declared, pending}` and `{outcome:"done", declared}`. **It never sets a
`failureReason`.** So forwarding `failureReason` when present changes nothing any production caller can
observe; it only stops the seam being lossy for an injected watch. The onward path already carries the
field: `work:drive-<phase>` spreads `...result` (`src/commands/drive.mjs:63`) and the loop reads
`outcome.failureReason` at `src/commands/loop.mjs:296` and `:304`.

*Why the scenarios are right and must not be weakened.* The three reasons are the **run store's**
vocabulary, not the driver's: `RETRYABLE_REASONS` is `{runtime_offline, timeout, session_limit}`
(`src/run-store.mjs:126`), and swept across `src/`, **no module produces `timeout` at all**,
`session_limit` is supplied by a caller at `work:run-complete` (`run-complete.mjs:88`) and
`runtime_offline` only by the reclaim path (`mesh-assignment-reclaim.mjs:181`, `run-store.mjs:726`,
`mesh-worker-execution.mjs:1858`). The loop's job is to **report the store's coded answer**, and
`mapStoreRefusal` plus the same-lineage retry are real logic that must be exercised. Scripting the
producing condition at its own producer is the feature's own declared method
(`02/tasks/04_stop-conditions.feature:26-34`). That the live driver cannot yet *detect* a session limit
is a **coverage boundary**, named — not a reason to make the seam drop data its own header promises.

*Ownership, decided on the graph rather than on the fence.* `src/agent-session-driver.mjs` has **18
dependents, two of them production**. 53/00 is **accepted and closed**; its module is now simply
pre-existing source, exactly as `src/commands/doctor.mjs` was pre-existing source for 53/03. ADR-011 §2's
"no two stories edit the same file" property is about **concurrent** stories contending for a file, and
53/02 `depends: 53/00` — they are sequential by declaration, so the property's purpose is untouched and
the count of declared exceptions stays at **ONE** (`scripts/test.mjs`). What narrows is 53/02's own
Must-NOT-touch fence, which today reads *"`src/agent-session-driver.mjs`/`src/work-loop.mjs` (consumes,
never edits)"* — the third grant of ADR-014 §4's "except the one file named" form applied to a **source**
file, at the smallest grain in the table.

**Ruling.** ADR-005 §4's producer discipline and ADR-001's frozen moved set are **CONFIRMED, unchanged**
— no export is added, no signature moves, no second seam is declared. `src/agent-session-driver.mjs:1000`
becomes `finish({ outcome: result.outcome, ...(result.failureReason == null ? {} : { failureReason: result.failureReason }) })`
— **exactly one physical line**, forwarding a field the module's own `:682` contract already declares.
`:925-927` stays as it is: a non-zero PTY exit **is** an agent error, and the scenarios script through the
completion watch, not through `onExit`. Reopening accepted story 53/00 is refused (Alternatives).

**Follow-on:** **53/02** (open). *`src/` change owned by 53/02:*
`src/agent-session-driver.mjs:1000` — the one line above, with a comment naming ADR-015 §7. *test-code:*
53/02 adds the no-op proof to its own suite — drive with the **default** watch and assert no
`failureReason` appears, so "production is unchanged" is asserted rather than asserted-about. The
proof must use a real temp transcript while the fake PTY remains live: a temp `CLAUDE_CONFIG_DIR`, an
injected known session id, a declared-complete JSONL aged past the idle window, and **no** injected
completion watcher. An immediate PTY exit is not this proof.

*Developer-feasibility amendment, 2026-08-17.* The driver line is sufficient for classification, but
not by itself for the `session_limit` park. The buildable existing path is exact: the loop command calls
`parseResumeAfter(null, { now })` (the run-store-owned pure policy; absent reset means its existing
`DEFAULT_PARK_MINUTES = 60`), forwards the returned `resumeAfter` through `transitionRunComplete`, then
asks `transitionRunStart({mode:"retry"})`. `retryRun`/`retryReadiness` returns the coded
`retry-parked` error with `error.readyAt`; the loop copies that fact only into its existing human
`report` callback. The other report facts are already present at their producing call sites:
`next.waitingOn`/`next.skipped`, gate findings and cap, `outcome.sessionId`, completed-record
`failureReason`, current attempt, `next.type`, and the received signal. None requires an eleventh
`LoopState` key, an `act` field, a new config key, a second driver seam, or an edit to `src/run-store.mjs`.
The current `settleDriven` reads `outcome.resumeAfter/reset/resetAt`; those reads are removed rather than
made contractual. `02/tasks/04_stop-conditions.feature` is amended to pin these two observable channels
and its stale REFINEMENT INPUT residue is struck, as is `02/STORY.md`'s corresponding block.

---

**§8 — `STATE.md:66` (53/05's `acd-loop-*` gate names vs two ACCEPTED milestone-52 rosters): THE
INSTRUMENT OVER-REACHES. Milestone 52 pinned a NAMESPACE it does not own; the three assertions are
narrowed to what milestone 52 actually guarantees, and 53/05's eight gates keep their names.**

*Measured at source, 2026-08-17 — the flag has materialised.* Running both accepted suites against the
current tree: `test/arch/acd-loop-finding-envelope.test.mjs` is **2/3** and
`test/work-loops-coverage-ledger.test.mjs` is **7/9**, all three reds the same `deepEqual` against a
literal nine, first extra member `acd-loop-cap-single-home.test.mjs`. The three sites are
`acd-loop-finding-envelope.test.mjs:358-359`, `work-loops-coverage-ledger.test.mjs:702-703` and its
sibling `:677`. 53/05 shipped **eight** `test/arch/acd-loop-*.test.mjs` files, so the roster reads
seventeen where it pins nine. This is a **hard, live gate on milestone 53's accept**, unresolved since it
was flagged at 53/07's refine.

*What those legs actually guarantee, separated from what they assert.* Milestone 52's real property is
that **its own nine gates** are on disk under their pinned names, imported exactly once, spread exactly
once, and sitting in their own labelled block — and every part of that is carried by other legs which are
**green today**: the per-file existence and single import/spread checks, and the positional block-shape
checks (`work-loops-coverage-ledger.test.mjs:687-700`, which assert the story-04 import block terminates
immediately after its ninth import and that no `...acdLoop` spread follows the ninth). The extra
`deepEqual` adds exactly one thing: **no other milestone may use the `acd-loop-` prefix under
`test/arch/`.** That is a namespace reservation with no correctness content for milestone 52's registry,
and milestone 52 built the loop **registry** while milestone 53 builds the **loop**.

*The cost asymmetry decides the direction, and it is large.* Renaming 53/05's eight gates would touch
eight files, sixteen lines of `scripts/test.mjs`, eight test `name` strings, eight rows of the register
below, the partition table, `acd-loop-suite-registration.test.mjs`'s own alias/filename pins, and roughly
sixty gate-name references across 53/05's six task contracts and their Examples tables. Narrowing touches
**three assertions in two files whose only dependent is `scripts/test.mjs`** (graph, above). Renaming also
leaves the fence standing for 54, 55, 62 and 63, each of which will collide with it in turn.

**Ruling.** **Narrow, do not rename.** Milestone 52's `.feature` files are **byte-unchanged** — no edit,
no annotation, no `@superseded` tag — and **53 is the accepting item that records the supersession**,
ADR-014 §2's pattern for the third time in this milestone. The three assertions change from *"the
`acd-loop-*` set equals exactly these nine"* to *"these nine are all present, each imported once, each
spread once, and the milestone-52 story-04 block still holds exactly nine"* — a **superset** membership
check plus the positional block legs that already exist. Milestone 52's guarantee survives in full: a
tenth gate added to **milestone 52's own block**, or one of the nine deleted or renamed, still fails. What
stops failing is a **different milestone** naming a file in the same namespace. The clause
`work-loops-coverage-ledger.test.mjs:677` — *"a tenth `acd-loop-*` file would red FF-5209's roster leg"* —
is superseded by this ruling and its message is corrected to name ADR-015 §8, so the next reader learns
why rather than rediscovering it.

**Follow-on:** **53/05** (open), which is the story whose files turn them red — covered by §10's class
grant. *test-code, three assertions in two accepted milestone-52 suites:*
`test/arch/acd-loop-finding-envelope.test.mjs:358-359` (`deepEqual(files, expectedFiles)` → superset
membership over `expectedFiles`, with the file-count floor retained);
`test/work-loops-coverage-ledger.test.mjs:702-703` (same); `:677` (the per-file
`basename.startsWith("acd-loop-") === false` clause becomes *"is not one of milestone 52's own nine"*).
*No milestone-52 `.feature` is edited, and no 53/05 gate is renamed.*

---

**§9 — `STATE.md:347` (53/07's stale bundle-file and manifest baselines): THE INSTRUMENT IS WRONG (the
contract's literals). Rule the rows at the measured truth; the contracted +9 is untouched.**

*Measured at source, 2026-08-17.* `src/bundle/bundle.json` carries **59** members at HEAD and **50** at
the milestone base `9e0f910` — the contracted **+9**, exactly as `07/tasks/01_delivered-as-assets.feature:40`
states for its member row. `src/bundle/manifest.json` carries **96** entries at HEAD and **87** at the
base — also +9, but the contract's row reads `86 → 95`, stale by one on both sides.
`test/bundle-asset-manifest-complete.test.mjs:53` now pins `direct.length === 71`, and its own comment
decomposes it as *"2 root descriptors + 8 agents + 25 commands + 8 hooks + 3 skills + 16 templates + 9
loops"* with the base recorded as **62** after a UAT state template landed at chore 51 — where
`07/tasks/05_the-gates.feature:116,150` still reads `61 → 70`. Both literals are behind by exactly one
intervening shipped template, on both sides, and the promised delta is intact in both cases.

*Why the implementation's disposal was half right.* Moving the test literals with the tree is correct and
is what `bundle-asset-manifest-complete.test.mjs:50-52` itself instructs. **Leaving the contract
unchanged as "the historical contract" is not**, because 53/07 is **OPEN**: an unaccepted story's
contract is amendable, and accepting a story against a record carrying a literal known to be false is how
a stale number survives into the next milestone's research — this milestone's own recorded process lesson
(`STATE.md:232-240`).

**Ruling.** ADR-012's delivery decision is unamended and the contracted **+9** stands. Both rows are
corrected to the measured truth — **62 → 71** bundle files and **87 → 96** manifest entries — and the
"nine new entries, not ten changed entries" correction the implementation already made is confirmed:
deleting an unrelated shipped template to satisfy a historical literal would violate the story boundary
and is refused.

**Follow-on:** **53/07** (open). *`.feature` amendment, needs `aof:refine 53/07`:*
`07/tasks/05_the-gates.feature:116` and its Examples row `:150` — `61` → **62**, `70` → **71**;
`07/tasks/01_delivered-as-assets.feature:40` — `86 → 95` becomes **`87 → 96`**; the narrative at
`05_the-gates.feature:35-36` follows; both REFINEMENT INPUT comments (`05:112-113`, `01:37-39`) are
struck. *No test-code and no `src/` change* — the implementation is already at the measured truth.

---

**§10 — THE CLASS RULING ADR-014 §4's RATCHET DEMANDED. A story may edit a named pre-existing test file
when a change it owns turns that file red, under three standing conditions — and the row-by-row grants
stop here.**

ADR-014 §4 recorded the trigger in terms: *"a fourth story wanting this form is the trigger to stop
granting it row by row and rule on pre-existing-test edits as a class."* §2 and §8 make **53/05** the
fourth story (three files: `test/agent-session-driver-door.test.mjs`,
`test/arch/acd-loop-finding-envelope.test.mjs`, `test/work-loops-coverage-ledger.test.mjs`), so the
ratchet has fired and this is the class ruling rather than a fourth row.

**The rule.** A story MAY edit a pre-existing test file when **all three** hold, and MUST NOT otherwise:

1. **Consequence, not convenience.** A change the story owns is what turns the assertion red. The edit
   lands in the diff that causes it (ADR-011's reasoning for 53/02's four `argsFor` cases; TECH_DEBT item
   48's failure is evidence arriving in a diff nobody reviews for coverage).
2. **Named and ceilinged, in the story's own Must-NOT-touch cell.** The file is named, the permitted
   assertions are named, and everything else in the file is out of bounds. Where the ceiling is worth a
   measurement it takes ADR-014 §3's digest form; where it is a handful of assertions, naming them is the
   ceiling. **A delivered `.feature` is never edited under this rule** — the accepting item records the
   supersession, and only the test moves.
3. **The guarantee is narrowed, never deleted.** The assertion that moves must still fail for the reason
   it was written. A clause removed because it became inconvenient is refused; a clause re-scoped to what
   its milestone actually guarantees is the permitted act (§8 is the worked example).

**And the property that mattered is restated, unchanged.** ADR-011 §2's *"no two stories edit the same
file"* is about **concurrent** contention, and it holds: every grant above is a **sequential** successor
editing a file whose author's story is closed or whose `depends` edge orders them. The count of declared
exceptions to that property stays at **ONE** — `scripts/test.mjs`, the 0-dependent append-only
registration hub. §7 is the first application of this class rule to a **source** file, and it is admitted
on the same three conditions plus the graph (2 production dependents, a measured production no-op).

---

**§11 — WHAT THIS ROUND MEASURED THAT THE RECORD GETS WRONG, and what it routes.**

*(a) `VERIFICATION.md`'s fitness register is STALE, and F-04 and F-08 with it.* All **thirteen** rows read
*"NOT LANDED — file absent; routed to 53/05"* (`VERIFICATION.md:120-132`) and F-04 (`:144`) records both
53/00 controls as `control-unresolved` at error, a *"hard gate on milestone 53's accept"*. Measured
2026-08-17: **all thirteen files are on disk**, all thirteen are imported **and** spread in
`scripts/test.mjs` (`:2603-2613`, `:2679-2689`, `:2618-2619`), and `aof work doctor 53 --json` reports
**0 errors and ZERO `control-unresolved` findings**. The register's rule is satisfied by landing the
file, which has happened. **What is now owed instead is the red probe:** every landed control owes
*what was changed to make it fail, and the message observed*, recorded in `VERIFICATION.md`. Thirteen are
outstanding. That file is the product owner's single writer and is not touched by this round.
**F-08 is stale too, and this ADR's own first draft repeated it from the record instead of measuring —
recorded because it is exactly the failure this round exists to prevent.** F-08 (`:148`) states
`aof work validate 53` fails on `53/01`'s `04_gate-order-and-cap.feature:20` and calls it *"a hard gate
on milestone 53's accept"*. Measured 2026-08-17: `aof work validate 53` → **PASS**, and
`aof work validate 53/01` → **PASS**; the narrative wrap was fixed at commit `084bd1b`
("docs(m53): keep cap narrative parseable"). A finding whose subject has been fixed is a gate the accept
will stop at for nothing.

*(b) A new, unreported control finding.* `aof work doctor 53` reports
`control-runner-unchecked` at **warn** — *"13 declared control(s) here, and no `work.controls.runners` is
configured — leg B (does a runner name this file?) did not run"*. All thirteen **are** registered (read
at `scripts/test.mjs`), but nothing mechanical says so, because `work.controls.runners`
(`src/work-doctor-controls.mjs:93`) is unset in this repo's own config. A register whose registration leg
never runs is TECH_DEBT item 5's shape one layer up, in the instrument this milestone leans on hardest.

*(c) Stale numbers corrected, for the record.* 53/03's retired-home references are **30** in task
contracts (31 with `STORY.md`), not 26 (§3). The manifest baseline is **87 → 96**, not 86 → 95, and the
bundle tree **62 → 71**, not 61 → 70 (§9). `src/` root `.mjs` is **121**, not the 114 → 117 the partition
prose records, and `src/commands/` is **85**, not 81 → 83 — but the milestone's **own** additions are
exactly the declared three (`agent-session-driver.mjs`, `work-loop.mjs`, `work-doctor-loop-ready.mjs`)
and two (`commands/{drive,loop}.mjs`), measured by diffing against `9e0f910`; the drift is another
milestone's `commands/item-status.mjs` plus a baseline written before 52 landed. The delta is honoured;
the absolutes were stale.

*(d) The `src/loop/` ratchet is NOT yet triggered, and the count is written down so the next reader does
not have to guess.* The partition's codebase-health note (`:2984-2986`) arms *"the fourth `work-loop*` /
session-driver-family module"*. Measured: the loop-**shell** family in `src/` root is **three** —
`work-loop.mjs`, `work-doctor-loop-ready.mjs`, `agent-session-driver.mjs`, exactly this milestone's three
ADR-mandated leaves. A literal `work-loop*` glob would also sweep milestone 52's `work-loops.mjs` and
`work-loops-checks.mjs` and read four, but those are the loop **registry** — a different subject with its
own home ruling (ADR-012), its own gates (FF-5312/FF-5313) and its own `acd-registry-*` naming family.
**The ratchet counts the loop-shell family only**, and its trigger is the **fourth** such module — most
likely 54, 62 or 63, exactly as the note predicts.

*(e) Codebase health, routed rather than waved through.* `aof work doctor 53` reports this document at
**3,109 lines against a 700-line budget** (4.4×), and ADR-015 makes it longer. The ADR form forbids the
obvious fix — ADRs are immutable and supersession is append-only — so this is real, structural, and
**does not fit inside this round**: it is routed as a proposed **`wiki/work/TECH_DEBT.md` item 55**
(next free number; items run 0-54 today), *"A milestone's ARCHITECTURE.md has no compaction path — an
append-only immutable-ADR record crosses its own doc budget by 4× and nothing routes it"*, with the shape
of the fix being a per-milestone ADR index plus a superseded-ADR archive at Accept, mirroring
`STATE.md`'s own compaction rule. **The TECH_DEBT write is DEFERRED to the product owner/operator** — this
round is doc-producing on `ARCHITECTURE.md` only, by explicit boundary — and it is named here in full so
it can be landed verbatim rather than rediscovered.

---

**Alternatives considered.**

- *§1: add an eleventh `reports` key to `LoopState`, or widen `driven`'s row type* — **rejected on two
  measurements.** 54, 62 and 63 consume the frozen document (ADR-005 §3); an eleventh key or a union row
  type is a renegotiation with three downstream milestones, bought to satisfy a gate that is looking at
  the wrong channel. And the account is already fully observable where 53/02's own contract puts it.
- *§2: rename 53/00's five suites, or split the token in the four gates so the census reads six* —
  **rejected, and the STATE feedback is right to name it.** Obfuscating a subject to satisfy a count
  leaves four gates unable to say what they measure, and leaves the census asserting a number that no
  longer means anything. Editing 53/00's delivered `.feature` is refused on the standing rule.
- *§3: localise the shared fixture into the five suites, keeping 53/03's declared file set as it is* —
  **rejected.** Five copies of one fixture is TECH_DEBT item 0's headline disease bought for one
  declaration line, in a milestone that cites item 0 twice.
- *§4: qualify the manifest scenario to the Claude runtime so "exactly one" stays literally true* —
  **rejected.** The shipped manifest is not runtime-qualified and the derived-manifest gate reads all 96
  entries; a scenario that observes half the artifact would pass while the other half drifted. Counting
  correctly costs one clause and asserts more.
- *§5: sever `degrade.mjs` from the driver so the chain never forms* — **rejected on ADR-001's own
  reasoning and on m42's.** `reportDegrade` is the sanctioned floor for every former silent catch
  (TECH_DEBT item 3); a driver that cannot report a degrade is a driver whose faults are silent, which is
  the defect `degrade.mjs` exists to close. *Or: keep the glob and add `mesh-log.mjs` as a one-off
  exception* — **rejected**: it leaves `workspace.mjs` denied while the admitted `work.mjs` edge reaches
  it, i.e. leaves the row contradicting itself.
- *§6: move `cap-declared` off the scorer — pass a pre-computed boolean in from `doctor.mjs`* —
  **rejected.** It relocates the same read one module up, adds a parameter to the scorer's frozen input
  shape, and makes `doctor.mjs` the fifth reader instead — the same gate, red at a different line. *Or:
  drop `cap-declared` from the four base checks* — **rejected**: ADR-007 §4's four checks are a declared
  contract that 55 widens additively, and deleting a check to satisfy a mis-scoped gate is exactly the
  inversion §10.3 forbids.
- *§7: reopen accepted story 53/00 to carry the one-line driver fix* — **rejected.** An accepted story is
  a record of what was true at acceptance; reopening it so a successor's scenario becomes mechanisable
  makes acceptance provisional. The graph makes the alternative safe: two production dependents, a
  measured production no-op, and a named one-line ceiling under §10. *Or: declare a second, loop-only
  invocation seam* — **rejected, and 53/02's own STORY.md asks for it to be** (`:142-144`): a second seam
  to one act is the second-home defect this milestone exists to cure. *Or: weaken the three scenarios to
  what the current seam can express* — **rejected**: it would delete coverage of `mapStoreRefusal` and
  the same-lineage retry, which are the loop's own logic, to accommodate a lossy projection that
  contradicts its module's documented contract.
- *§8: rename 53/05's eight gates to `acd-loopshell-*` or `acd-work-loop-*`, as 53/07 did with
  `acd-registry-*`* — **rejected on cost and on substance.** Cost: ~90 references across eight files, the
  runner, this register, the partition table and six task contracts, against three assertions in two
  files with one dependent each. Substance: it leaves a generic prefix reserved by first arrival, so 54,
  55, 62 and 63 each hit the same fence and each invents a worse name. *Or: widen the two rosters to
  seventeen* — **rejected**: that pins milestone 53's file list inside milestone 52's gate, so every
  future 53-family gate reddens two accepted suites. The superset form is scoped to what each milestone
  owns.
- *§9: leave 53/07's rows as the historical contract and let the tests carry the truth* — **rejected.**
  53/07 is open; accepting a story against a record carrying a knowingly false literal is how the stale
  number reaches the next milestone's research, which is this milestone's own recorded process lesson.
- *§10: grant 53/05 three more row-by-row exceptions* — **rejected by ADR-014 §4's own ratchet**, which
  named the fourth story as the trigger to rule as a class. Honouring a predecessor ADR's ratchet is not
  optional.

**Consequences.** **No ADR's substance moves.** ADR-001 §3, ADR-005 §3/§4, ADR-006 §3, ADR-007 §4/§5,
ADR-008, ADR-009 §1, ADR-010 §12 and ADR-012 are all **confirmed as written**; what moves is four
fitness-function rows (FF-5301, FF-5306, FF-5310, FF-5311), corrected in place below, and the `State now`
cell of **all thirteen** rows, which now carries a measured verdict rather than a refine-time prediction
(m47/R7). The affected open or reopened stories carry their own story-scoped feature amendments; the
accepted milestone-52 feature files remain immutable. Reopened 53/00 owns its driver-door contract
corrections, 53/02 owns the one source-line consequence and its stop/report contract, and 53/05 owns
only the two milestone-52 accepted-test assertion regions admitted by §8/§10. The exact edit ceilings
and dependency order are normative in the amended partition below; historical counts in this ADR are
superseded by that partition rather than used as independent permissions.
53/05 remains the story that closes the milestone, and it is now the story with the most cross-story
corrections to make — which is the honest shape of a fitness-function story written before its subjects
existed. Of the two hard gates `VERIFICATION.md` records against milestone 53's accept, **F-04 and F-08
are both measurably CLEARED** (all thirteen controls resolve, `aof work validate 53` is PASS) and only
their RECORD is outstanding; what is genuinely still owed is the **thirteen unrecorded red probes**
(§11a) — the one obligation this round could not discharge, because `VERIFICATION.md` has a single
writer and it is not the architect.

**Invariant.** `LoopState`'s key set is exactly ADR-005 §3's ten and `driven` carries only rows minted
from real run records — an L1 walk's per-item account is emitted through the loop's report channel and
`driven` is `[]`. Exactly **ten** files under `test/` name `agent-session-driver`: 53/00's five suites,
`acd-worker-driver-no-headless-print`, and the four fitness gates whose subject it is; the **42
untouched** static-import census members name it **zero** times, while the one named re-aimed gate may
name the producer it now inspects. `src/agent-session-driver.mjs` imports exactly
five source modules directly, reaches at most **21** modules transitively, and reaches **no** mesh
lifecycle module — with `mesh-log.mjs` admitted through the named `degrade.mjs` import and
`workspace.mjs` admitted through the named `terminal-ws.mjs → work.mjs` edge, each carrying a self-check
that fails when its reason loses its subject; and its settle forwards `failureReason` whenever the
completion watch supplies one, while the default watch supplies none. `work.autonomous.maxAttempts` has
exactly **four** resolution sites, every fallback literal `3`, and exactly **one** admitted declaration
inspector (`src/work-doctor-loop-ready.mjs`) whose read carries no `??`. The loop registry resolves at
`<workspace.aofDir>/loops` in every contract as well as in every test. One authored bundle command
renders to exactly **two** addresses. Milestone 52's nine `acd-loop-*` gates are all present, each
imported and spread exactly once, in their own labelled block — and no milestone's gate names are pinned
inside another milestone's roster. (Enforced by the amended FF-5301, FF-5306, FF-5310 and FF-5311 rows
below, plus `acd-loop-l1-read-only`, `acd-session-driver-mesh-blind`, `acd-loop-cap-single-home` and
`test/agent-session-driver-door.test.mjs`'s census case.)

---

## ADR-016: The autonomous door enters the HUMAN launcher without `--json`; the machine face remains the frozen probe, and the launcher's report is the one authoritative driven/halt/resume account

**Status:** Accepted; PO, QA and developer-feasibility passes complete on 2026-08-17.
**Supersedes:** ADR-008 §1 only where its illustrative command included
`--json`; confirms ADR-005 §2 and every frozen probe invariant unchanged.

**Context.** Black-box QA executed the exact command the 53/04 prompt named,
`aof work loop 03 --level L2 --json`, against a ready fixture. It exited zero with
`state: "ready"`, `act: {act:"drive", ref:"03/01", phase:"refine"}`, `driven: []`, and no run
directory. That is correct story-53/02 behaviour: `src/spine/face.mjs:144-166` checks `--json` before
the launcher seam and invokes the registered `run()`, while `src/commands/loop.mjs` registers
`probeLoop` as that run. The prompt's test asserted the command as text but never executed it, so all
42 affected checks were green over a door that described the next act without performing it.

**Decision.** The autonomous prompt's exact launch command is
`aof work loop <range> --level L2`, adding `--cap N` when `--max-attempts N` is supplied. It carries
**no `--json`**. `aof work loop <scope> --json` remains the frozen, promptly-returning, zero-write
machine probe; neither face policy nor the ten-key `LoopState` probe envelope changes.

The human launch report is the sole account the wrapper quotes. It must name every driven ref and
phase from the runs the launcher actually minted, and accepted milestone refs on completion; on halt it must name the stop id, halted ref and
exact `aof work loop <range> --resume` command. The wrapper computes none of them. Story 53/04 is
therefore granted a narrow sequential edit to `src/commands/loop.mjs` at the launcher report
projection/rendering seam only. Engine decisions, phase mapping, retry/cap resolution, stop producers,
the JSON projection and probe behaviour remain outside its boundary. This story explicitly depends on
53/02, whose status is currently `in-progress`; implementation cannot begin until that dependency's
contract is built and reviewed.

Task 00's evidence must spawn the exact no-`--json` command as a child process. The child's temp `PATH`
holds a source-local `aof` launcher shim pointing at this checkout's `bin/aof.mjs` and a hermetic Claude
executable; the provider leaf records the typed phase command
and exits cleanly while the real face, provider resolution, PTY, driver, registry and run store execute.
That fixture proves at least one run is minted, work is driven, and the human report names it. A deterministic halt fixture
proves stdout carries stop id, ref and exact resume command. The paired `--json` control proves zero
runs, zero provider calls, `driven: []` and a byte-identical fixture. Merely matching the command string
is not evidence. The existing cap mapping,
`--solo`, `--ship`, no-duplicate-policy rule, autonomous door identity, and exactly two runtime renders
remain unchanged. Task 01 remains the human `aof:verify` soak and already uses the no-`--json` launch.

**Developer feasibility, measured 2026-08-17.** `face.mjs:154-159` enters `cli.launch` only without
`--json`; `loop.mjs:312-320` already retains every minted run's ref, phase and outcome in `driven`, and
every terminal return passes the complete state through `reportLine` (`:381-390`, with the sibling halt
sites using the same seam). The report-only edit can therefore project one human line per driven row,
derive milestones accepted by this invocation from top-level `verify` rows whose outcome is `done`, and
render halt stop/ref/resume from `act`, without changing `probeLoop`, `loopState`, the JSON adapter or a
decision producer. The child fixture is cross-platform: POSIX executable scripts and Windows `.cmd`
shims occupy its temp `PATH`; on Windows the `.cmd` Claude leaf was driven through the real
`resolveProvider → defaultPtySpawn` ConPTY path, received `/aof:refine 03/01`, and settled `done`.
The source-local `aof` shim is required: invoking ambient `aof` would not prove the checkout under test.
An accepted-milestone child row starts with an in-progress milestone whose stories are done, records
the offered `/aof:verify <NN>`, and lets the hermetic leaf complete the fixture transition to `done`.

The ownership partition also needs its exact reading stated here. `53/04 depends: [53/02]`, so the
launcher report edit is a sequential hand-off after 53/02's command implementation, never a concurrent
collision. The milestone's exact shared-file set is now three files with distinct disciplines:
`scripts/test.mjs` is the append-only multi-story registration hub; `src/commands/loop.mjs` is the
sequential hand-off `53/02 → 53/04`, where 53/04 may touch only report projection/rendering; and
`src/agent-session-driver.mjs` is the sequential `53/00 → 53/02 → 53/04` hand-off described below.

**Implementation amendment, measured 2026-08-17.** The required b01 child-process case exposed a
real Windows ConPTY lifecycle defect that the feasibility probe did not: the provider and run store
completed, but the source-local `aof work loop` process stayed alive and kept its fixture cwd locked
after `onExit`. The driver disposed its JS subscriptions but did not close the already-exited native
PTY handle. Story 53/04 therefore owns one additional, tightly bounded cleanup at the driver's single
`cleanupSubs` settle point: call `term.kill()` under the existing already-exited guard. It changes no
driver result, export, launch, watch, decision, JSON, or retry contract. The pre-fix b01 child times out
and cleanup fails `EBUSY`; with the close it exits zero, the directory is removable, and the existing
driver suites remain green. This is a consequence of the exact black-box launcher evidence ADR-016
requires, so it lands with the story that introduced that evidence rather than being deferred.

**Alternatives.** Making `--json` launch was rejected because it would break ADR-005's face-wide safety
policy and the consumers of the probe. Keeping `--json` and asking the prompt to infer execution from
the probe was rejected because it mints no run. Dropping `--json` without strengthening the human
report was rejected because the present terminal summary cannot supply the driven-items account the
wrapper promises.

**Consequences.** Story 53/04 task 00 is reopened. Its PO scenarios now distinguish launch from probe
and require black-box execution/report evidence. QA reconciled the stale Examples rows; developer
feasibility confirmed the narrow report seam and deterministic cross-platform child-process fixture.
No implementation, prompt source, generated runtime file, manifest or test file changes in this
refinement pass.

---

## ADR-017: `LOOP_SCOPE_FORMS` stays the frozen `driver` + `range` pair — item 49's payment removed the one reason that was CONTINGENT, and what remains are the vocabulary's four unattended launch surfaces, not the god-node's parser

**Status:** Accepted
**Date:** 2026-09-05
**Raised by:** chore `111`, discharging the follow-on FF-5308's necessity leg named when it fired.
**Relationship to ADR-003:** **confirms, supersedes nothing.** ADR-003 §1's decision is unchanged. What
this ADR changes is the GROUND it stands on: ADR-003 argued from a defect that has since been paid, so
the freeze was left resting on a fact that is no longer true. It is re-ratified here on the reasons that
survive, and given a named discharge trigger it did not have.

**Context — the premise ADR-003 argued from is paid.** ADR-003 §1 froze the loop's scope vocabulary to
`driver` (`^\d+$`) and `range` (`^\d+-\d+$`) and refused everything else with the coded
`loop-scope-unsupported`. Its opening argument was `nextWork`'s `inRange` (`src/work.mjs`) falling
through to `() => true` for any shape it did not recognise — TECH_DEBT item 49 — so that a story-shaped
scope meant *no scope at all* and a loop handed `53/02` would cheerfully drive milestone 12.

Item 84 taught `inRange` the story span and story 86 closed the fall-through. Measured at HEAD
(2026-09-05), `inRange` recognises **three** forms — the driver, the range, and `parseStorySpan`'s
`NN/SS` + `NN/MM-PP` — and a story-grained shape it *cannot* parse now throws `invalid-scope` naming the
admitted forms, rather than walking the whole stream. FF-5308's SCOPE-NEC-01 necessity leg, built to red
on exactly this day, fired at milestone 96's gate and was inverted there to guard the fix. Its
`GOOD_NEWS` message deferred one question to whoever discharged it, and this ADR is that answer: now
that the parser CAN admit a story-grained scope, should the LOOP?

**Decision. No. `LOOP_SCOPE_FORMS` stays exactly `["driver", "range"]`, frozen, and a story-shaped scope
stays the coded `loop-scope-unsupported` refusal naming `aof work drive <phase> <ref>`.**

**1 — Only ONE of ADR-003's two grounds was contingent on the fall-through.** The other was semantic and
is untouched: *"'scope a story' changes what the driver walk MEANS (the walk is over drivers, then
drills into stories), so the fix is not a regex — it is a semantic decision about `nextWork`"*. The loop
sequences DRIVERS: it asks `work:next <scope>` for the next ready item, drives it through phases, and
terminates when the scope has no ready item left. A story-grained scope hands that sequencer a set whose
exhaustion closes no driver, so the stops it reports (`uat-gate`, `dependency-blocked`) and the
acceptance hand-off it makes have no driver to terminate on.

**2 — The vocabulary is no longer the loop's alone. It is the admission grammar of FOUR unattended
launch surfaces**, measured at HEAD:

| surface | call site | what a widening would newly admit |
|---|---|---|
| the loop command | `src/commands/loop.mjs:814` | `aof work loop 53/02` |
| a fired trigger's argv | `src/commands/trigger.mjs:310` | a cron-fired, unattended story-scoped loop |
| a compiled trigger member | `src/work-trigger/declaration.mjs:211` | a story-scoped member in `.aof/` declaration data |
| a mesh loop directive | `src/mesh-assignment-directive.mjs:128` | a story-scoped loop **dispatched to a remote worker** |

…plus the engine's own three internal doors — `decideLoopInvocation`, `buildLoopDeclaration` and
`resolveLoopResume` (`src/work-loop.mjs:952, 998, 1064`) — so invocation, persisted declaration and
resume widen together. ADR-007 §2 and `src/work-trigger/declaration.mjs:208` are explicit that none of
these authors a scope grammar of its own; that discipline is exactly what makes the constant a
four-surface decision rather than a one-command one. Widening on the strength of "the loop's parser
question" would silently answer three questions nobody asked, one of them across a machine boundary.

**3 — `loopScopeIncludes` would need SPAN semantics, and that is predicate work, not a regex.**
`src/work-loop.mjs:649` derives a driver number from a ref and compares it against the scope; it is the
predicate L1's local walk and the resumable sweep select by (`src/commands/loop.mjs:773, 953`). A story
span must narrow STORIES, not drivers — so admitting the form without teaching this predicate would have
an `NN/MM-PP` scope select every item of driver `NN`, silently, which is precisely the silent-widening
class ADR-003 exists to refuse. `matchLoopScope` returning `null` for the form today is what makes that
impossible rather than merely unlikely.

**4 — No caller needs it, and both alternatives already exist and are named.** ADR-002's `aof work drive
<phase> <ref>` drives one story and needs no `nextWork`, and it is what the refusal already points at.
The span vocabulary's real caller is the PROMPT lane — `/aof:continue NN/MM-PP`, served by
`aof work next <NN/MM-PP>` and `findWork`, which is what item 84 and story 86 built it for. Story 86
said so in the god node itself: *"A span is an EXECUTION scope; `work loop`'s own frozen guard
(`LOOP_SCOPE_FORMS`) refuses story refs outright for the matching reason"* (`src/work.mjs:97-98`) — the
item that paid item 49 deliberately left this guard alone and recorded why.

**5 — Three delivered suites assert the closed pair.** 63/03's
`test/mesh-assignment-loop-directive.test.mjs:958` (*"no declared scope form admits a story-shaped
ref"*), FF-5308's frozen-vocabulary rows in `test/arch/acd-loop-scope-guard.test.mjs:159-164`, and
`test/work-loop-scope-guard.test.mjs:22-23`. Reddening three suites to admit a form no caller has asked
for is cost with nothing purchased.

**Alternatives considered.**

- *Widen to both story-grained forms `parseStorySpan` admits* — **rejected** on §2, §3 and §4: it is
  four surfaces, one new predicate and no caller.
- *Widen to the span `NN/MM-PP` only, keeping the single-story `NN/SS` refused* — **rejected.** It is the
  same predicate work as §3 wearing a narrower vocabulary, and it would leave `decideLoopScope`'s
  refusal detail (`admits: [driver, range]`, `src/work-loop.mjs:640-643`) naming two forms while three
  exist — a refusal that lies about its own grammar.
- *Delete the freeze and let `decideLoopScope` delegate to `inRange`* — **rejected, and it is the one
  that would look tidiest.** `src/work-loop.mjs` imports NOTHING by contract — 53/01's partition row declares it *"a PURE leaf
  with **no** `node:fs`/`node:child_process`/clock"*, FF-5307 is the row that arms it, and
  `test/work-loop-determinism.test.mjs` measures it (*"the module copied alone decides with every source
  dependency absent"*, quoted in the module's own head comment) — so
  delegating would make the pure engine depend on the 241-dependent god node — the exact coupling
  53/ADR-003 §3 bought by refusing the widening in the first place.
- *Leave the question unanswered and let FF-5308's inverted leg stand as the record* — **rejected.** An
  inverted leg records that the defect was paid; it records nothing about whether the vocabulary should
  move, and an undecided follow-on is what makes the next reader re-derive this whole argument.

**Consequences.** `aof work loop 53/02` remains a loud, coded, zero-side-effect refusal naming
`aof work drive`, and the four surfaces above keep the grammar they were built against. FF-5308's
frozen-vocabulary rows stay green and stay the enforcement; its necessity leg is INVERTED rather than
deleted (see the FF-5308 row's 2026-09-05 amendment below), so the fix that paid item 49 is guarded by
the fixture that used to measure the defect. **Discharge trigger:** a caller that genuinely needs an
unattended loop over a story span. At that point the widening is §2's four-surface decision plus §3's
predicate, taken in the item that needs it — and this ADR, not ADR-003, is what that item supersedes.

**Invariant.** Unchanged from ADR-003, and re-armed on its own terms: `src/work-loop.mjs` exports
`LOOP_SCOPE_FORMS` as exactly the two frozen forms, in that order, and every non-admitted scope — a
story ref, a story span, a slug, an empty string — yields `loop-scope-unsupported` carrying both
admitted forms, with nothing spawned, minted or written. (Enforced by `acd-loop-scope-guard`, whose
frozen-vocabulary rows and refuses-before-byte-movement leg are exactly these two claims.)

**The §2 half is a SEPARATE gate, and is named separately rather than folded into the sentence above** —
that no surface reached through `decideLoopScope` spells a scope grammar of its own is enforced by
`acd-trigger-never-classifies` (`test/arch/acd-trigger-never-classifies.test.mjs:300-320`: the family
imports exactly the decision, no member reads `LOOP_SCOPE_FORMS` directly, and no member authors a
digit pattern), not by `acd-loop-scope-guard`, which never reads the trigger family at all. Attributing
it to the scope guard would be m06/R3's near-miss — an invariant claiming an assertion scope its named
gate does not have — and it would leave the clause enforced in fact but unowned in the record.


## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     These replace "invariant-as-scenario" — they belong here, never in a task feature.

     RED-until-built is the correct and expected state now: src/agent-session-driver.mjs,
     src/work-loop.mjs, src/commands/drive.mjs, src/commands/loop.mjs and
     src/work-doctor-loop-ready.mjs do not exist yet; the tests reference them and fail
     cleanly until the stories land. Story 53/05 authors them LAST, for TECH_DEBT item 5's
     reason (a long RED window makes "red because unbuilt" indistinguishable from "red
     because broken").

     AMENDED 2026-08-15 by ADR-010 and ADR-011. Five rows below were measurably WRONG and are
     CORRECTED IN PLACE, each carrying the correction and its source: FF-5302 (17 names, not 16;
     defaultPtySpawn is private today; ceiling AND floor, not shrink-only; ~2,300, not 2,400),
     FF-5304 (the cli.launch leg contradicted ADR-005 §1's own snippet — replaced by two legs),
     FF-5307 (buildRecord/LEGAL_TRANSITIONS are module-private — replaced by the behavioural
     form), FF-5309 (the work-doctor.mjs two-line ceiling + the unreadable-registry degrade),
     FF-5310 (the reader set is FOUR, the sweep is src/**/*.mjs, "exactly once" is struck).
     FF-5303, FF-5306 and FF-5308 gained a leg each. FF-5311 is NEW (ADR-011 §4) and takes the
     count to ELEVEN arch files, all still 53/05's. What is NOT 53/05's, and is the round's
     biggest partition change: each story's BEHAVIOURAL suites and their registration land WITH
     that story (ADR-011 §1) — the ten-arch-files-and-nothing-else reading was TECH_DEBT item
     48 designed in.

     AMENDED 2026-08-16 by ADR-014. ONE row below is CORRECTED IN PLACE, carrying the correction
     and its source: FF-5311 (the "test/doctor-command-core.test.mjs is byte-unchanged" clause is
     narrowed to a ONE-LINE CEILING with a pinned replacement line and a residue digest, because
     ADR-010 §15 makes doctor's two-key run() envelope forced and that file holds the tree's only
     envelope key-set pin; scripts/test-unit.mjs's byte-unchanged clause is UNTOUCHED). The row
     also gains the `pending` token, since its enforced-by file is 53/05's and has not landed —
     the same is true of every other row here and each will take the token as it is next amended.

     CORRECTED 2026-08-17 (same row, PO's review of ADR-014): the ceiling's digests are the
     EOL-NORMALISED ones and the recipe replaces \r\n with \n as step 0 — measured
     `git ls-files --eol` = `i/lf w/crlf` with no `.gitattributes` rule over `test/**/*.test.mjs`,
     so the first draft's CRLF digests were a platform gate that would fail on the WSL/Mac/CI
     clones. The pinned replacement line also gained `.sort()` on the actual side: key SET pinned,
     insertion ORDER not. Same lesson as `.gitattributes`' own UPGRADE-CHANGELOG.md and
     src/bundle/** pins — a byte-identity guard must pin line endings.

     NOT here (they are task .feature material): "the loop halts at a @uat gate and names
     the ref", "a needs-input session stops the loop and reports the session id", "the
     score reads 3/4 on a repo with no memory backend". Those are observable behaviour over
     the real seam.

     HARNESS SHAPE: every arch-test in this milestone exports an array of `{ name, run }` —
     NEVER `{ name, fn }`. (52 measured 797 `run:` entry keys and zero `fn:` across
     test/arch/*.test.mjs. A test exported under the wrong key is never invoked, which is
     TECH_DEBT item 5's failure shape reproduced on this milestone's own gate.)

     GREP DISCIPLINE: every source-grep row below is token-scoped and comment-stripped.
     A bare `loop`/`drive` grep is RED on day one — `src/work.mjs:904` says "the story-loop
     returns", 52's ui/src prose comments carry "loops", and `mesh-*` modules narrate
     "driver" throughout. The tokens are: `agent-session-driver`, `work-loop`,
     `work-doctor-loop-ready`, `work:loop`, `work:drive-`, `loops-validate`, `loopReady`,
     and `"loop"`/`"drive"` in a route/argv position.

     SORT DISCIPLINE: every string comparison asserted below is code-unit lexicographic
     (`<`/`>` on strings), never Intl/locale collation (52/ADR-013 §1, one rule, whole class).

     PROXY HONESTY: FF-5301's signature leg and FF-5305's third leg are named PROXIES, not
     decision procedures, and their false-negative surface is stated in the row. Everything
     else is a decision procedure or a behavioural drive.

     AMENDED 2026-08-17 by ADR-015. FOUR rows below are CORRECTED IN PLACE, each carrying the
     correction and its source: FF-5301 (the transitive denylist was a filename GLOB standing in
     for the concept "mesh lifecycle", and it denied `workspace.mjs`, which the row's own admitted
     `terminal-ws.mjs -> work.mjs` edge already reaches at `src/work.mjs:17` — self-contradictory
     on any tree; split into a frozen five-member DIRECT set, a narrowed transitive LIFECYCLE set
     with `mesh-log.mjs`/`workspace.mjs` admitted by named reason, and a 21-module reach ceiling —
     ADR-015 §5), FF-5306 (the L1 per-item account is observed at the REPORT CHANNEL, where 53/02
     task 07's own contract puts it; `driven` stays `[]` at L1 and the ten keys are untouched —
     ADR-015 §1), FF-5310 (a cap RESOLUTION site and a cap DECLARATION inspection are different
     acts; the resolver set stays the measured four and `src/work-doctor-loop-ready.mjs` is the one
     admitted inspector, pinned by having no `??` — ADR-015 §6), FF-5311 (53/05 also carries the
     three-assertion narrowing of two ACCEPTED milestone-52 rosters and the four-member widening of
     53/00's naming allowlist, all under ADR-015 §10's class rule — ADR-015 §2/§8/§10).

     AND EVERY `State now` CELL WAS RE-MEASURED 2026-08-17 by running each control against the
     current tree, one verdict per row (m47/R7: "run each new gate against the current tree and
     state the verdict in its own header"). Result: 10 of 13 fully green, 3 red, and all three reds
     are gates wrong about the TREE rather than about the rule. The refine-time "RED until X lands"
     predictions are replaced by what was observed; a prediction left standing after its subject
     landed is a register nobody trusts. ALL THIRTEEN enforced-by files are ON DISK and imported AND
     spread in `scripts/test.mjs`

     AMENDED AGAIN 2026-08-27 by MILESTONE 55, one row: **FF-5305 is DISCHARGED**, the condition its own row
     named. 55/05 deleted `test/arch/acd-loop-level-l3-locked.test.mjs`, which left THIS register — an ACCEPTED
     item's — citing a control that no longer resolves, and `arch/FF-6607b` (ADR-011/E, the accept-transition
     refusal) red naming `53/FF-5305`. Milestone 56's spike reached the same verdict independently: *“Neither gate
     is wrong — the stale artifact is 53's register row.”* The cell is RE-POINTED at the successor control rather
     than the row being deleted, because deleting it would erase a real decision and its discharge; a discharged
     obligation that moved is not the same as an obligation that never existed. Thirteen enforced-by files are on
     disk again, one of them under its successor's name. — `aof work doctor 53` reports ZERO `control-unresolved` findings
     — so NO row carries a `pending` token, and none may be added while the files resolve. What is
     owed instead is the RED PROBE for each landed control, in `VERIFICATION.md`, whose thirteen
     rows still read "NOT LANDED — file absent" and are stale (ADR-015 §11a). -->

| Invariant | Enforced by (arch-test) | State now | From |
|---|---|---|---|
| **FF-5301 · The session driver is mesh-blind by construction.** **AMENDED IN PLACE 2026-08-17 — source: ADR-015 §5** (the original row asserted ONE denylist — `run-store.mjs`, `effects/*`, any `mesh-*.mjs`, `global-work-store.mjs`, `workspace-identity.mjs`, `workspace.mjs`, `item-lock.mjs`, `board-*.mjs`, `src/commands/*` — **transitively**, and it was self-contradictory: its own single admitted edge `terminal-ws.mjs → work.mjs` reaches `workspace.mjs` at `src/work.mjs:17`, so the row denied what it granted and was RED on any tree; and it denied `mesh-log.mjs`, which is the ONLY import of `degrade.mjs`, a module ADR-001 §3 admits BY NAME. A filename glob was standing in for the concept "mesh **lifecycle**", which is what ADR-001 §3's own words say). **Three legs now, and the first is the strongest:** (1) the **DIRECT** source-import set of `src/agent-session-driver.mjs` is FROZEN at exactly five — `claude-trust.mjs`, `degrade.mjs`, `terminal-providers.mjs`, `terminal-ws.mjs`, `work-observe.mjs` — plus node builtins, exact set equality both ways (ADR-001 §3's own list), so a direct `workspace.mjs`/`mesh-*.mjs`/`run-store.mjs` import still fails; (2) the **TRANSITIVE denylist is the LIFECYCLE set** — `run-store.mjs`, `effects/*`, `global-work-store.mjs`, `workspace-identity.mjs`, `item-lock.mjs`, `board-*.mjs`, `src/commands/*`, and the mesh lifecycle modules by NAME (`mesh-worker-execution`, `mesh-worktree`, `mesh-presence`, `mesh-repo-marker`, `mesh-launcher`, `mesh-session-spawn-handler`, `mesh-clone-credential-provider`, `mesh-assignment-reclaim`) — asserted **transitively** (52/ADR-012 §7/G3's rule: walk the import graph, so a one-hop laundering module cannot satisfy it), with **exactly two admitted reasons, each carrying a self-check that fails when its reason loses its subject**: `terminal-ws.mjs → work.mjs` (ADR-001 §3's named caveat) which is also why `workspace.mjs` is off this list, and `degrade.mjs → mesh-log.mjs` (the sanctioned degrade sink's only import; `mesh-log.mjs` is a JSONL log sink and `globalMeshPaths` a path resolver — neither carries an assignment, a lease or a workspace identity); (3) a **reached-module CEILING of 21** with a floor, the house `acd-ui-surface-file-budget` idiom — this is what now holds ADR-001's actual load-cost guarantee as a NUMBER rather than as a glob (measured 2026-08-17: the driver reaches **21** modules transitively, the sink **55**). The module names no `assignmentId`/`workspaceId`/`leaseId`/`assignment` token anywhere in its comment-stripped body. | `test/arch/acd-session-driver-mesh-blind.test.mjs` (parse each module's static imports — the `acd-command-layer-imports-downward` idiom, `:47-55` — assert the direct five, walk transitively from `src/agent-session-driver.mjs`, assert the lifecycle set is unreached except through the two admitted reasons, assert the 21-module ceiling and its floor; comment-stripped token grep for the four mesh-identity tokens → none). **The token leg is a named PROXY** for "this module knows nothing about assignments": a driver that took an assignment id under a different name would pass. The real guarantee is the direct-set leg plus the transitive lifecycle leg plus the frozen export set of FF-5302; the grep is the tripwire. | **MEASURED 2026-08-17: 2/3 — RED on the transitive leg, and the gate is wrong about the TREE, not the rule** (it reports `mesh-log.mjs` via `agent-session-driver → terminal-providers → degrade → mesh-log`, and `workspace.mjs` one hop further; both admitted by ADR-015 §5). GREEN when the three legs above land; 53/05 owns the edit | ADR-001, ADR-015 §5 |
| **FF-5302 · The move is a SUBTRACTION, not a copy, and the sink can never grow back through this seam.** `src/agent-session-driver.mjs` exports exactly the frozen SEVENTEEN-name set — ADR-001 §1's sixteen plus `ensureWorktreeTrusted` — asserted both ways. `src/mesh-worker-execution.mjs` defines none of those names, re-exports all by reference identity, and imports exactly the three bindings its remaining code consumes: `defaultSpawnRuntime`, `defaultPtySpawn`, and `driveInteractiveClaudeSession`. The fresh-linkable census is **48 members**: 43 test suites, two support fixtures, and three source modules; `scripts/pin-checkout-id.mjs` is checked separately as static/link-only. Of the 43 suites, **42 are byte-unchanged and name the driver zero times**; `test/arch/acd-worker-driver-no-headless-print.test.mjs` is the one named re-aimed importer owned by reopened 53/00. The explicit-null status-recorder fixture correction is the other narrowly authorised 53/00 test-tree change and is outside this importer byte-identity claim. The sink line count carries a ceiling and a floor, so growth, a rename, a moved file, or a truncated read fails while a genuine later shrink passes. | `test/arch/session/acd-session-driver-single-home.test.mjs` | **MEASURED 2026-08-17: 4/4 GREEN** (53/00 landed; the sink is 2,313 lines and the ceiling/floor ratchet is armed and holding) | ADR-001, ADR-010 §17/§18 |
| **FF-5303 · The shipped phase doors are DECIDERS, the new drivers are EXECUTORS, and neither becomes the other.** `src/commands/continue.mjs`, comment-stripped, contains no `ptySpawn`/`term.write`/`driveInteractiveClaudeSession` token and imports neither `agent-session-driver.mjs` nor `mesh-worker-execution.mjs`; its three commands still carry routes `["work",<phase>]` and a `run` returning the `{where, command}` shape. `src/commands/drive.mjs`'s three commands carry ids `work:drive-<phase>` and routes `["work","drive",<phase>]`, contain no `where`/`node`/`assignWork` decision, and `deriveRouteTable(listCommands())` derives with no collision. **Each driver declares a `--dry-run` boolean flag whose document names `{ref, phase, command}` and whose drive records ZERO spawn calls at the injected `ctx.agentSessionDriverOptions` seam** (ADR-010 §3) — this is the form the bijection gate probes with (`["work","drive",<phase>,"03/01","--dry-run","--json"]`, the `work upgrade --dry-run` precedent at `acd-work-command-cli-bijection.test.mjs:236`), because a driver ALWAYS spawns and the gate spawns a real subprocess (`:256-263`) into which no fake seam can reach; the accepted-exit list stays `[0]` (`:314`) unwidened. | `test/arch/acd-phase-door-not-a-driver.test.mjs` (registry import + comment-stripped grep both ways; re-derive the route table rather than grepping it — 52/ADR-012 §1's lesson) | **MEASURED 2026-08-17: 3/3 GREEN** — both halves; the driver family landed with 53/02 | ADR-002, ADR-010 §3 |
| **FF-5304 · `aof work loop`'s machine face is a PROBE, and its `--json` document is the frozen contract.** Driving the registered `work:loop.run()` over a fixture stream with a spawn seam injected through **`ctx.agentSessionDriverOptions`** (the declared seam, ADR-010 §2 — without it this leg is not drivable at all) produces **zero spawn calls and zero new run files**. **The launcher leg is TWO legs, and neither restates the other** (ADR-010 §5 / C2, correcting this row's original wording, which contradicted ADR-005 §1's own snippet): (a) the seam's own behaviour at the command — `cli.launch(options)` returns `null` when `options.dryRun === true` and a function otherwise; (b) the face's policy, driven through the real face — **`--json` never launches**, checked before the seam is consulted (`src/spine/face.mjs:154`), so the registered `run()` is what answers. The command carries `cli.route === ["work","loop"]` plus `argv`/`render`/`json`; the `--json` document's **key set equals ADR-005 §3's frozen ten exactly**, including the nested `act` and `resumable` shapes, and its `state` is one of exactly **four** values — `ready`/`blocked`/`done`/`halted`, with `refused` struck (ADR-010 §5). **Two frozen exported sets, both asserted:** `LOOP_STOPS` equal to ADR-005 §4's eight ids, and `LOOP_REFUSALS` equal to the four of ADR-010 §5; a refusal emits the face's error envelope (`face.mjs:186-194`) carrying a `LOOP_REFUSALS` code and **never** a LoopState. **Every emitted stop carries a `producer`** — driven per producing condition, populated from a code, never from a message match. | `test/arch/acd-loop-probe-contract.test.mjs` | **MEASURED 2026-08-17: 3/3 GREEN** | ADR-005, ADR-010 §2/§5 |
| **FF-5305 · L3 is structurally locked, and unlocking it is necessarily a visible diff.** **DISCHARGED 2026-08-27 by milestone 55 — source: 55/ADR-006, and the row's own stated discharge condition.** WHILE IN FORCE it asserted three things: `src/work-loop.mjs` exports `LOOP_LEVELS` equal to exactly `["L1","L2"]` and `LOCKED_LOOP_LEVELS` whose key set is exactly `["L3"]` with `unlockedBy: 55`; driving the real `work:loop` with `--level L3` yields the coded refusal `loop-level-locked` naming milestone 55, with **zero spawns and zero run records written**; and no module under `src/` contains an executing branch keyed on `L3` — the third leg a named PROXY, never a decision procedure. **All three are now necessarily FALSE, by design**: 55/05 widened `LOOP_LEVELS` to `["L1","L2","L3"]`, emptied `LOCKED_LOOP_LEVELS`, and L3 executes. The obligation did not lapse — it MOVED: what the lock stood for is now held by **55/FF-5508**, *“L3 is earned, never configured”*, which asserts the new frozen literals, that no config key, env var or flag in `src/**` admits L3, that admission is computed from the Loop-Ready score and a clean groundedness report, and — at `:89` — that `test/arch/acd-loop-level-l3-locked.test.mjs` is **absent from disk**, so the successor control proves this very discharge. The deleted file is therefore not a gap; re-pointing this cell is what stops a `done` register citing it. | `test/arch/acd-loop-level-l3-gated.test.mjs` *(succeeds `acd-loop-level-l3-locked.test.mjs`, deleted at 55/05)* | **DISCHARGED 2026-08-27 — successor MEASURED 5/5 GREEN** | ADR-006 → 55/ADR-006 |
| **FF-5306 · L1 writes nothing — byte-proven, not promised — and it TERMINATES.** A full `--level L1` loop over a fixture stream leaves the fixture tree's **file list AND every byte identical** (snapshot before, run to terminal, snapshot after), mints no run record, writes no status frontmatter, and makes zero spawn calls through the seam injected at `ctx.agentSessionDriverOptions` (ADR-010 §2). **And the walk terminates, which under a read-only level it cannot do by re-asking `work:next`** (ADR-010 §8, correcting ADR-006 §3): nothing changes, so `work:next` is a fixed point. An L1 loop **enumerates through `work:list` once**, filters to the in-scope actionable items with the same admitted scope, reports one row per item with the `act` an L2 loop would take, and ends — asserted by bounding the number of `work:next` invocations at one and asserting the process returns. **AMENDED IN PLACE 2026-08-17 — source: ADR-015 §1: THE ACCOUNT IS OBSERVED AT THE REPORT CHANNEL, NOT IN THE RETURNED DOCUMENT.** "An empty loop is not a read-only loop" is proven by collecting the injected `report` sink and asserting it emits one row per in-scope actionable item (measured: `["03 — drive verify", "03/01 — drive continue"]` over the shared fixture), **and by asserting the returned `driven` is `[]`** — because ADR-005 §3 freezes `LoopState` at ten keys and `drivenRow` (`src/commands/loop.mjs:312-321`) reads `record.runId`/`record.attempt` off a MINTED record, which a zero-mint level has none of. This is where 53/02's own contract already put it (`02/tasks/07…:110-113`, `:137`). A gate that drives with `report: () => {}` and then fails for finding no account is discarding its own evidence. | `test/arch/acd-loop-l1-read-only.test.mjs` (52/FF-5201 leg (b)'s dynamic byte-unchanged idiom, and for its reason: a static grep sees `writeFile(x, …)` and cannot see where `x` resolves) | **MEASURED 2026-08-17: 1/2 — RED on the account leg (`:36`, `state.driven.length > 0`), and the gate is wrong about the TREE, not the rule**: it passes `report: () => {}` at `:34` and the account it demands is in exactly that sink. GREEN when the leg reads the report channel; 53/05 owns the edit. The byte/file-list/zero-mint/zero-spawn legs are GREEN | ADR-006, ADR-010 §8, ADR-015 §1 |
| **FF-5307 · The loop declares over the run store and opens no second one.** `src/work-loop.mjs` imports no `node:fs`/`node:child_process`/`node:process`/`node:os`, calls no `Date.now()`/`new Date()`, performs no dynamic `import()`, and every export is a pure `(plain data) => decision` function (the 52/FF-5205 idiom — and what makes 53/01 parallel to 53/00); `src/run-store.mjs` is **unchanged, proven BEHAVIOURALLY through its existing exports** (ADR-010, closing C1 — the row's original wording said "import `buildRecord`'s produced key list and `LEGAL_TRANSITIONS`", and both are module-PRIVATE today: `buildRecord` is a bare `function` at `:344` and `LEGAL_TRANSITIONS` a bare `const` at `:96-102`, so importing them would require **exporting** them — an edit to the one file ADR-004's invariant says is unchanged. The buildable form is strictly stronger because it reads what is **persisted** rather than what a constructor intends: the **15 keys, in order** come from calling the exported `startRun` and reading the record back with the exported `readRuns`; the **5 edges** come from driving the exported pure predicate `isLegalTransition` (`:106`) over the whole 25-cell cross product of the closed state vocabulary. Neither needs a new export); no `src/**/*loop*store*.mjs` module exists; and `src/commands/loop.mjs`'s own body contains no `writeFile`/`mkdir`/`rename` call form — every durable loop fact is a key of the frozen `brief.loop` envelope, driven end-to-end and read back through `work:run-status`. | `test/arch/acd-loop-state-rides-the-run-record.test.mjs` | **MEASURED 2026-08-17: 4/4 GREEN** | ADR-004 |
| **FF-5308 · The loop's scope is admitted or loudly refused — never silently unscoped.** `src/work-loop.mjs` exports `LOOP_SCOPE_FORMS` equal to the two frozen forms; every non-admitted scope (`NN/SS`, a slug, empty) yields `loop-scope-unsupported` naming both admitted forms, with nothing spawned, minted, or written. Inverted ranges are refused; `53-53` remains admitted. **The necessity leg is AMENDED IN PLACE 2026-09-05 — source: ADR-017 / chore `111`.** It originally read: *the leg uses two active milestones with ready `02/01` in the admitted range and earlier ready `01/00` outside it — `nextWork(workDir, "02")` returns `02/01`, while the non-admitted story scope `nextWork(workDir, "02/01")` LEAKS to `01/00`*. That was a control over a LIVE DEFECT (TECH_DEBT item 49), built to red the day the defect was paid. Item 84 and story 86 paid it; the leg fired at milestone 96’s gate carrying its own GOOD-NEWS message; and 96 INVERTED it rather than deleting it, which is what kept a discriminating fixture that took four mutation plants to make honest. The same fixture, the same shipped `nextWork` and the same SCOPE-MUT-01/02 discrimination preamble now assert the PAID behaviour: `nextWork(workDir, "02/01")` resolves to `02/01`, reaching no earlier milestone’s competitor. The paired control still proves the guard measures the real walk instead of restating the parser — it now guards the fix rather than the defect, and a red is a REGRESSION. | `test/arch/acd-loop-scope-guard.test.mjs` (drives the real `nextWork` for both legs) | **MEASURED 2026-09-05: 6/6 GREEN** (4/4 at 2026-08-17; 96’s gate and its inversion added legs). The original note — *the necessity leg goes red when TECH_DEBT item 49 removes the leak, which is the signal to revisit the guard* — is **DISCHARGED**: it went red, it was read as designed, and the guard was revisited. **ADR-017 re-ratifies the frozen two-form vocabulary** on the reasons that survive the payment, so the frozen-vocabulary rows are unchanged and remain this row’s enforcement. | ADR-003, ADR-017 |
| **FF-5309 · The Loop-Ready score is registry-optional, never re-derives the graph, and never gates a loop.** `src/work-doctor-loop-ready.mjs` **is** a member of `acd-doctor-engine-determinism`'s glob set (re-derive the glob and assert membership, so a rename cannot silently escape the sweep) and is **not** a member of `CHECK_GROUPS` (import both and assert non-membership, so `doctorWork`'s bare-array return is unchanged); it imports no `work-loops*.mjs` transitively and reads no clock/fs. `src/commands/doctor.mjs` holds **no static import of `command-core.mjs`** (TECH_DEBT item 26's ring) and reaches the registry only through a deferred `await import`. With no registry the result carries `registry.present:false`, `composed:false` and the five 52 check ids as `not-applicable`, excluded from `applicable`; **an UNREADABLE registry degrades to that same result** (a file-shaped `wiki/work/loops` raises `ENOTDIR` out of `loadLoops`'s rethrow at `src/work-loops.mjs:502-504` — measured), with the fault named in the five rows' evidence and doctor's own `findings`/`errors`/`warnings`/`healthy`/`strict`/exit code byte-identical to the no-registry run (ADR-010 §14); an **EMPTY** `loops/` directory is PRESENT, not absent — all five run and pass, `applicable` is 9. With a registry present, the composed counts **equal `work:loops-validate`'s own `summary.checks`** byte-for-byte (driven end to end, both commands invoked), and `registry.error`/`registry.warn` equal `summary.error`/`summary.warn` verbatim — which is how a `loop-record-unparseable` (`severity:"error"`, `work-loops.mjs:517`, in `model.findings` and in **no** `summary.checks[<id>]`) stays visible while all five rows read `pass` (ADR-010 §14: that is what reading verbatim produces, and inventing a tenth row is the second checklist ADR-007 §3 forbids). **`src/work-doctor.mjs`'s diff in this milestone is EXACTLY TWO LINES** and the gate pins the ceiling (ADR-010 §13): the `export` keyword on `inScope` (`:455`) and `options.snapshot ??` on the snapshot build (`:514`) — `CHECK_GROUPS`'s length and member ids unchanged, `doctorWork`'s return still a bare `Finding[]`, the four lane modules byte-unchanged, all 10 dependents unaffected; and `tasks-authored` reads `buildSnapshot`'s per-story `hasTasks` (`:281`) off the **one** snapshot, never an N-invoke `work:tasks` fan-out (measured 3,214 ms for 185 stories against a 1,157 ms doctor baseline). No `src/` module references `loopReady` on any path that can refuse a loop (token-scoped grep of `src/work-loop.mjs` + `src/commands/loop.mjs` → none), and neither `--explain` nor `--converge` carries a `loopReady` key, a render line or a registry read (`doctor.mjs:96-97`, `:234`). | `test/arch/acd-loop-ready-registry-optional.test.mjs` | **MEASURED 2026-08-17: 3/3 GREEN**; 53/03's own five behavioural suites are **33/33 GREEN** against the `.aof/loops` home (ADR-012), which is what ADR-015 §3 rules the three task contracts must now state | ADR-007, ADR-010 §13/§14/§15 |
| **FF-5310 · The cap has ONE home, and `autonomous.md` is no longer one of them.** **The reader set is FOUR, re-measured at HEAD 2026-08-15** (this row originally named two and was wrong — a gate armed at two is RED at HEAD for a reason that has nothing to do with milestone 53): the set of `src/**/*.mjs` modules naming `work.autonomous.maxAttempts` is exactly `src/commands/run-retry.mjs:62`, `src/commands/resume.mjs:119`, **`src/commands/run-start.mjs:200`** (`config.work?.autonomous?.maxAttempts ?? 3`, feeding `shouldRetry` on the reclaimed-prior edge) **∪ `{src/commands/loop.mjs}`**, exact set equality both ways, with a self-check that fails if a recorded reader no longer exists. **AMENDED IN PLACE 2026-08-17 — source: ADR-015 §6: THE SET IS OF RESOLUTION SITES, NOT OF PROPERTY MENTIONS, AND DECLARATION INSPECTION IS A SEPARATE ADMITTED ACT WITH EXACTLY ONE MEMBER.** The sweep predicate was a bare property-access match (`/autonomous\?\.maxAttempts/u`, `acd-loop-cap-single-home.test.mjs:39`), which is red at HEAD on `src/work-doctor-loop-ready.mjs:32` — the scorer ADR-007 §4 and ADR-010 §12 *require* to read the declaration for `cap-declared`. A resolver **supplies a default** and yields a number; the scorer reads `const declaredCap = config?.work?.autonomous?.maxAttempts;` with **no `??` at all** and yields only a boolean (`:33`) and an evidence string (`:56-57`), its `FALLBACK_MAX_ATTEMPTS` (`:21`) appearing solely inside the failing evidence text, exactly as ADR-010 §12 ruled. **The gate already contains the discriminator** — its second leg at `:43-46` matches `…maxAttempts[^\n;]*\?\?\s*3` — it simply did not use it to define the population. So: the **RESOLUTION** set is the measured four above, exact set equality both ways, every fallback literal `3`; the **DECLARATION-INSPECTOR** set is exactly `{src/work-doctor-loop-ready.mjs}`, admitted by name **with a leg pinning that its read carries no `??`**, so a `??` appearing there makes it a fifth resolution site and fails the gate. Both sets stay closed, and ADR-009 §1 is untouched — the inspector chooses no value. Every reader's fallback literal is `3` — this milestone adds **no new default, no new key and no new resolution site**. **The sweep is scoped to `src/**/*.mjs`, and the reason is an interlock rather than a preference:** `src/bundle/commands/autonomous.md` is itself under `src/` and names `maxAttempts` today (`:14`, `:90`), so an unscoped `src/**` sweep would report the prompt as a fifth reader and put this gate's two legs in contradiction with each other. Two subjects, two instruments. `src/bundle/commands/autonomous.md`, HTML-comment-stripped, contains none of the loop-shell tokens it owns today (`Loop until`, `aof work next` — **at all eleven sites, including the four OUTSIDE `<process>`/`<stop_conditions>`: the frontmatter `description` `:2`, `<objective>` `:8`, the `<config>` range bullet `:18`, `<progress_tracking>` `:146`; ADR-010 §21** — `aof work run-start`, `run-retry`, `maxAttempts`, `heartbeatStaleMs`, `stop_conditions`) and **names `aof work loop` AT LEAST ONCE as its body and no other command for driving the range** (the original "exactly once" is struck: ADR-008 §1's own replacement text names it twice — the invocation and the `--resume` hint 53/04's acceptance separately requires — so a verbatim implementation would have failed this row; ADR-010 §21). `src/bundle/bundle.json` gains no `loop`/`drive-*` command member. | `test/arch/acd-loop-cap-single-home.test.mjs` | **MEASURED 2026-08-17: 3/4 — RED on the reader-set leg, and the gate is wrong about the TREE, not the rule** (it reports `src/work-doctor-loop-ready.mjs` as a fifth reader; that module is a declaration INSPECTOR, admitted by ADR-015 §6, and adding it to the resolver list would immediately fail the gate's own `?? 3` leg — the tree saying the same thing twice). GREEN when the sweep partitions by resolution form; 53/05 owns the edit. The `autonomous.md` prose leg, the no-second-key leg and the bundle-member leg are GREEN | ADR-008, ADR-009, ADR-010 §21, ADR-015 §6 |
| **FF-5311 · Every suite this milestone authors is REACHABLE — registration is name-set membership, not filename presence.** For each of 53/00…53/05: every `test/**/*.test.mjs` file the story authors is **imported AND spread** in `scripts/test.mjs` inside that story's own labelled block, each alias spread exactly once and resolving to the module its name claims; and — the leg that filename presence cannot give — **every test `name` those files export is a member of the assembled `tests` array's name set** (import `scripts/test.mjs`'s exported `tests`, import each authored file, compare sets). The sweep is non-vacuous: it reports the file count it read and fails below its floor. Every member is `{ name, run }` — never `{ name, fn }`, proven by driving the runner's own destructuring form (`scripts/test.mjs:3362-3376`) over a planted two-member array, not asserted as a style rule. No story edits another story's block or any other region of `scripts/test.mjs`; `scripts/test-unit.mjs` is byte-unchanged. **AMENDED IN PLACE 2026-08-16 — source: ADR-014 §5** (the original clause read "`scripts/test-unit.mjs` and `test/doctor-command-core.test.mjs` are byte-unchanged", and 53/03's forced two-key doctor envelope — ADR-010 §15, re-measured at `src/commands/doctor.mjs:213-221`/`:275` — makes the second half unbuildable): **`test/doctor-command-core.test.mjs` carries a ONE-LINE CEILING instead of a byte-unchanged claim**, four legs — (a) the file contains **exactly one** occurrence of the token `Object.keys(`; (b) the line carrying it is byte-equal to ADR-014 §3's pinned replacement, indentation included (`assert.deepEqual(Object.keys(result).sort(), ["findings", "loopReady"], "the result carries no third top-level field (53/ADR-014)");` — the actual side is **`.sort()`ed** so the envelope's key SET is pinned and its insertion ORDER is not, per ADR-014 §3.1 as amended 2026-08-17); (c) the **residue digest** — decode UTF-8, **replace `\r\n` with `\n` (step 0, non-negotiable: `git ls-files --eol` reports `i/lf w/crlf` and no `.gitattributes` rule covers `test/**/*.test.mjs`, so an un-normalised digest is a platform gate that fails on every Linux clone — ADR-014 §3's EOL rule)**, split on `"\n"`, drop the `Object.keys(` element, rejoin with `"\n"`, sha-256 — equals `a74a8c422a6d71f25cf012005903b9241f10d705380babfa6244f9460dad659f` and the file is **683** newline-terminated lines (normalised whole-file digest, for reproduction: `a1c9f370af99…eb2b66e9`; the CRLF working-tree pair `0149c66e…`/`317f535a…` is the measured pre-state on the authoring machine and is NEVER a gate leg), which is what makes "exactly one line differs" a measurement rather than a claim; (d) the exported `doctorCommandCoreTests` array's **`name` set is unchanged**, so the ceiling cannot be evaded by deleting, renaming or reordering a case. This leg is enforceable for the first time: nothing in `test/arch/` ever hashed that file (measured 2026-08-16). `acd-test-suite-registration`'s `UNREGISTERED_BASELINE` gains no entry. **This exists because the gate that should catch it cannot:** `acd-test-suite-registration:151` keys on `runners.includes(path.basename(rel))`, so a file imported and never spread is not an orphan by its reckoning and is run by nobody — TECH_DEBT item **50**, routed by ADR-011 §4 and closed here for this milestone's own suites only. **AMENDED IN PLACE 2026-08-17 — source: ADR-015 §2/§8/§10.** 53/05's Must-NOT-touch fence narrows to *"every pre-existing test **except the three files named, and within them only the assertions named**"*, under ADR-015 §10's **class rule** for pre-existing-test edits (ADR-014 §4's ratchet fired: 53/05 is the fourth story to want the form, so it is ruled as a class rather than granted as a fourth row). The three, each a consequence of a file 53/05 itself authors: **(a)** `test/agent-session-driver-door.test.mjs:145` — `NAMES_THE_NEW_MODULE` widens from six to **ten**, admitting `acd-session-driver-mesh-blind`, `acd-session-driver-single-home`, `acd-phase-door-not-a-driver` and `acd-loop-suite-registration` by name, each of which is structurally forced to name `agent-session-driver` as its subject or suite family; 53/00's delivered criterion is SUPERSEDED IN THIS RECORD and its `.feature` is byte-unchanged (ADR-015 §2). **(b)** `test/arch/acd-loop-finding-envelope.test.mjs:358-359` and **(c)** `test/work-loops-coverage-ledger.test.mjs:677`, `:702-703` — three assertions in two ACCEPTED milestone-52 suites whose `deepEqual` against a literal nine pinned the `acd-loop-*` NAMESPACE rather than milestone 52's own nine gates; narrowed to superset membership plus the existing positional block legs, so a tenth gate in milestone 52's own block still fails while another milestone's naming does not (ADR-015 §8). Milestone 52's `.feature` files are byte-unchanged. The declared exceptions to ADR-011 §2's partition property stay at **ONE** (`scripts/test.mjs`): every grant here is a sequential successor, not a concurrent contender. | `test/arch/acd-loop-suite-registration.test.mjs` | **MEASURED 2026-08-17: 6/6 GREEN** — the gate landed and all six story families are registered. **All thirteen enforced-by files in this register are on disk and imported AND spread in `scripts/test.mjs`; `aof work doctor 53` reports ZERO `control-unresolved`**, so no row carries a deferral token and none may be added. `VERIFICATION.md`'s thirteen "NOT LANDED — file absent" rows and its F-04 are STALE (ADR-015 §11a); what is owed now is the RED PROBE per control, in that file, which is the product owner's to write. (A deferral marker was added to this cell at 53/03's refine and **reverted the same day** — it downgraded this ONE row while the other twelve stayed at error. Marking the register is an all-thirteen decision for the operator, not a byproduct of amending one row. The marker's own token is deliberately not written here: the extractor reads it anywhere in an entry, so naming it in prose re-declares it.) Doctor also reports `control-runner-unchecked` at warn — no `work.controls.runners` is configured, so the "is it registered?" leg never runs against these thirteen | ADR-011, ADR-014 §5, ADR-015 §2/§8/§10 |
| **FF-5312 · The loop registry has ONE home, it is `.aof/loops/`, and the install a consumer gets is the source aof ships.** `src/work-loops.mjs` computes the registry path in **exactly one expression** — a `path.resolve(<.aof dir>, "loops")` inside the module-private `loopsDirectory` (`:491-494`) — and no other module under `src/` joins a `loops` path segment (comment-stripped, token-scoped). All **three** `src/commands/loops-{validate,show,graph}.mjs` call `loadLoops(ctx.workspace)` in the OBJECT form (`:30`, `:18`, `:88` today, each passing `ctx.workspace.workDir`), and **no `src/` module passes a string** — the string overload survives only so all ~25 `loadLoops(` call sites across 52's six fixture suites stay byte-unchanged, and this leg is what keeps it a test affordance rather than a second door. The `loops`-segment leg is scoped to `path.join`/`path.resolve` ARGUMENTS, not to the bare token — the three shipped `route: ["work","loops",<verb>]` declarations (`loops-{show,graph,validate}.mjs:26,101,51`) are route words, not path segments, and a token grep would be red by construction. `wiki/work/loops/` **does not exist** and no file under `src/`, `test/` or `scripts/` names it — including the two comments at `test/work-loops-registry-census.test.mjs:4` and `test/arch/acd-loop-records-parse.test.mjs:69`. `src/bundle/bundle.json` declares **exactly nine** `kind: "asset"` members with `file: "loops/<slug>.md"`, `target: ".aof/loops/<slug>.md"` and `runtimes: ["claude","codex"]` (both, or a codex-only install renders none — `renderBundleAssetOutputs:172-174` `continue`s on an empty intersection); each rendered output's bytes carry **no** `aof-generated` stamp and its first three characters are `---`, driven through `rawFrontmatter` so the template-stamp trap (`TEMPLATE_STAMP`, `src/work-bundle.mjs:28`, applied at `:207` → `loop-record-unparseable`, `src/work-loops.mjs:514-522`) is proven absent rather than assumed. **And the dogfood is pinned — against the SOURCE FILES, not the manifest:** this repo's `.aof/loops/*.md` are **byte-equal to `src/bundle/loops/*.md`**. Amended at the Three Amigos: comparing against `src/bundle/manifest.json`'s hashes (this row's first draft) is equivalent only while the manifest is current, and it measurably is not — `acd-bundle-manifest-hashes` case 1 has been RED since commit `d38e720`, so a manifest-referenced leg would go GREEN over a record corrected in the bundle and never re-installed. The manifest comparison is kept as a SECOND, independent leg. The leg exists because hashing all 86 manifest entries against this tree on 2026-08-15 measured **75 ok / 11 drifted / 0 missing** with nothing failing, and because two suites now read the install as their subject. `src/work.mjs`, `src/work-bundle.mjs`, `src/work-bundle-manifest.mjs`, `src/work-bundle-synthesis.mjs` and `src/render-plan.mjs` are unchanged (hash-pinned). | `test/arch/acd-registry-single-home.test.mjs` | **MEASURED 2026-08-17: 3/3 GREEN** (53/07 landed; `wiki/work/loops` survives nowhere under `src/`, `test/` or `scripts/` — it survives only inside 53/03's three task contracts, which ADR-015 §3 re-aims) | ADR-012 |
| **FF-5313 · A delivered loop record is aof's, immutably — tuned through config, never forked silently.** `src/work-loops.mjs`'s `ADMITTED_KEYS`, `NODE_KINDS`, `POINTER_SCHEMES`, `ENDPOINT_SCHEMES` and the **16**-member `LOADER_FINDING_CODES` (`:63-121`) are imported and asserted equal to their milestone-52 literals — no `origin`, no `provenance`, no `source` key is added; `loadLoops` reads **exactly one** directory and returns **exactly one** `source` (no merge, no precedence, no cross-source collision rule — comment-stripped token grep of `src/work-loops*.mjs` for `origin`/`provenance`/`framework`/`workspace-loop` → none); and the tree holds exactly **two** `loops` directories — the bundle source `src/bundle/loops/` and its single install target `.aof/loops/`, never a third under `src/`, `.aof/` or `<work.dir>` (a filesystem sweep, not a grep). Every one of the nine delivered records carries the **edit-it-in-aof** line (ADR-013 §2) and its rendered bytes equal `src/bundle/loops/<slug>.md`'s bytes exactly. **The consumer-edit rule is DRIVEN, not asserted:** over a fixture install, edit one delivered record, run the real `work update`, and assert the action is `drift-warning` (`src/render-plan.mjs:38-41`), the on-disk bytes are **the consumer's**, and the drifted path's prior lock entry is preserved (`:99-103`, `:126`) so the warning recurs; then run with `--force` and assert the overwrite (`:43-46`). And the tuning surface is proven disjoint from the delivery surface: `.aof/aof.config.json` appears in **neither** `src/bundle/manifest.json`'s entries **nor** the install lock's `work.files` (measured: 86 and 82 entries, zero rows). | `test/arch/acd-registry-framework-owned.test.mjs` | **MEASURED 2026-08-17: 3/3 GREEN** (the bundle carries 59 members and the manifest 96 entries — the contracted +9 over the base's 50/87, which is the measured truth ADR-015 §9 rules 53/07's two stale rows to) | ADR-013 |

**FF-5311 ownership amendment (2026-08-17, reopened 53/00).** The older text in that row assigning
`test/agent-session-driver-door.test.mjs` to 53/05 is historical and **superseded by ADR-015 §2's
reopen ruling**. The normative exception count for 53/05 is two: only the two accepted milestone-52
roster assertions. Story 00 owns its door suite and ten-name literal. This amendment changes ownership,
not FF-5311's registration/name-membership behaviour.

---

## Story partition (proposed)

**Graph grounding (actual, from the 2026-08-15 build — 10,481 nodes / 25,365 edges / 434 communities).**
Five measured coupling facts drive the partition, not topic:

1. **`src/work.mjs` — 241 dependents, imports 4.** The god-node. m37 was forced into a by-layer cut with
   the rule *only one story may edit it* at 35 dependents; 52 achieved zero at 240. **53 achieves zero at
   241** — ADR-003 is the decision that buys it, by refusing the `inRange` widening and routing the
   three-copies fact to TECH_DEBT instead. The milestone's only relationship with the file is read-only
   imports that change nothing inside it.
2. **`src/mesh-worker-execution.mjs` — 49 dependents (44 of them tests), imports 21.** The widest sink in
   `src/`, and the one file this milestone edits *destructively*. That edit is a **subtraction** made safe
   by the re-export (ADR-001 §2), which is why 44 test files stay byte-unchanged and only one arch test
   changes. It is fenced into a single story, 53/00, with a shrink-only ratchet armed behind it.
3. **`src/command-core.mjs` — 102 dependents, imports 75 command modules.** Registration is purely
   additive (four imports, four array entries) but it is a **shared edit point**, so exactly one story
   owns it (53/02) — 52's rule, applied unchanged. Blast radius nil: nothing reads the array structurally
   except the registry-derived arch-tests.
4. **`src/spine/face.mjs` — the route table IS the registry** (`deriveRouteTable`, `:87-99`;
   `resolveRoute`, `:104-120`), and 52/ADR-012 §1 already generalised the bijection gate's route leg to
   `command.cli.route.join(" ")` (measured at `test/arch/acd-work-command-cli-bijection.test.mjs:290`).
   **This keeps `src/cli.mjs` out of the milestone entirely**, and it means the only bijection edit this
   milestone owes is four `argsFor` cases against `:252`'s deliberate `default: throw`.
5. **`src/run-store.mjs` (35 dependents) and `src/work-loops-checks.mjs` (5 dependents, a pure leaf).**
   ADR-004 and ADR-007 make both **declared-over, never imported**: the loop rides `brief` through the
   store's existing verbs, and the Loop-Ready score reaches 52's checks only through
   `invoke("work:loops-validate")`. Neither file is read, imported or edited by any story; both dependent
   counts are unchanged by this milestone.

**The resulting property (AMENDED by ADR-010 §13, ADR-011 §1–§2 and ADR-016 — the original claim was false the
moment any story needed a test, and ADR-016 adds one dependency-ordered source hand-off).**

> **No two concurrently buildable stories edit the same file. The exact shared-file set is THREE:
> `scripts/test.mjs`, the append-only registration hub where each story owns one labelled import and
> spread block; and `src/commands/loop.mjs`, the dependency-ordered `53/02 → 53/04` hand-off where
> 53/04 owns only human report projection/rendering. The first costs merge friction on two contiguous
> regions but has nil blast radius (`aof graph impact scripts/test.mjs` measured 0 dependents and 694
> outbound edges on 2026-08-15); the second cannot overlap because the dependency gate must be done;
> and `src/agent-session-driver.mjs`, the sequential `53/00 → 53/02 → 53/04` hand-off whose 53/04
> edit is only ADR-016's already-exited ConPTY handle close at the single settle point.**

**Zero stories edit `src/work.mjs`, `src/cli.mjs`, `src/run-store.mjs`,
`src/commands/continue.mjs`, `src/board-ui.mjs`, `src/commands/run-status.mjs` or anything under
`ui/`.** **AMENDED 2026-08-17 after 53/00 reopened:** the partition rows below are the exact ownership
ceiling. In particular, story 00's base-pre-existing test-tree set is four, not one: its three delivered
source gates plus the newly authorised status-recorder fixture. `test/agent-session-driver-door.test.mjs`
is story 00's own new evidence and is not a 53/05 pre-existing-file exception. 53/05's accepted-test
exceptions are therefore only the two milestone-52 namespace rosters ruled by ADR-015 §8/§10. Other
shared edits remain as already ceilinged: 53/02's command registration/bijection and one-line driver
settle projection; 53/03's doctor edge, two-line work-doctor seam and one-line legacy envelope; 53/04's
autonomous source prompt; and each story's labelled append-only `scripts/test.mjs` block.

| # | Story | Owns | Must NOT touch | `depends` |
|---|---|---|---|---|
| **53/00** | **`session-driver-extraction`** — the central move | `src/agent-session-driver.mjs` (**new**): the frozen seventeen-name moved set and frozen five-module import set. `src/mesh-worker-execution.mjs`: destructive moved-block subtraction, verbatim re-export, and inward imports of exactly `defaultSpawnRuntime`, `defaultPtySpawn`, `driveInteractiveClaudeSession`. **Four named pre-existing test-tree edits across the whole story:** the split source gate `test/arch/acd-worker-driver-no-headless-print.test.mjs`; the already delivered re-export-following gates `test/arch/acd-terminal-mirror-geometry-pinned.test.mjs` and `test/arch/acd-terminal-view-live-observable.test.mjs`; and, on reopen, only `test/support/mesh-worker-exec-fixture.mjs`'s `createStatusRecorder.sendEffectStep` explicit-`sessionId` projection. **Its own evidence:** the five `test/agent-session-driver-*.test.mjs` suites, including ownership of the closed ten-name allowlist and 48+pin link proof, plus its labelled `scripts/test.mjs` blocks | `src/work.mjs`, `src/work-loop.mjs`, `src/commands/*`, `src/command-core.mjs`, `src/mesh-launcher.mjs`; every pre-existing test-tree file except the four named boundaries. Of the 43 sink-importing suites, 42 stay untouched and name the driver zero times; `acd-worker-driver-no-headless-print` is the sole named re-aimed importer. The two sink-importing support fixtures remain untouched; the newly authorised status-recorder fixture is not in that importer census. Every other story's suites/blocks, all other `scripts/test.mjs` regions, `src/bundle/*`, `ui/*` | — |
| **53/01** | **`loop-engine`** — the shell's decisions, pure | `src/work-loop.mjs` (**new**), a PURE leaf with **no** `node:fs`/`node:child_process`/clock: the `LOOP_SCOPE_FORMS` guard + `loop-scope-unsupported` (ADR-003), the frozen phase map (ADR-005 §5), `GATE_ORDER` + the bounded-retry rule (ADR-005 §6), the closed `LOOP_STOPS` with producer attribution (ADR-005 §4), **the new frozen `LOOP_REFUSALS` four-member set (ADR-010 §5/§10)**, `LOOP_LEVELS`/`LOCKED_LOOP_LEVELS` + `loop-level-locked` (ADR-006), the `brief.loop` envelope shape and the resume-declaration reader (ADR-004), the inverted-range admission predicate (ADR-010 §1), the `(ref, phase)` cycle bound that also closes no-progress (ADR-010 §7), and the store-refusal→`LOOP_STOPS ∪ {null}` map (ADR-010 §10b). Every export is `(plain data) => decision` — it decides, it never executes. **Its own evidence (ADR-011 §1):** `test/work-loop-*.test.mjs` — `scope-guard`, `level-ladder`, `phase-map`, `stop-set`, `gate-order`, `declaration`, `determinism` — plus its labelled `// milestone 53 / story 01` blocks in `scripts/test.mjs` | `src/work.mjs`, `src/agent-session-driver.mjs` (**no import** — the engine decides, the command executes; this is what keeps 53/00 ∥ 53/01), `src/run-store.mjs`, `src/command-core.mjs`, `src/commands/*`, `src/work-doctor*.mjs`, `src/work-loops*.mjs`, **every pre-existing test file**, every other story's suites and blocks, all other regions of `scripts/test.mjs`, `ui/*` | — |
| **53/02** | **`command-surface`** — the four commands + registration | `src/commands/drive.mjs` (**new**): `createPhaseDriverCommand` × 3, ids `work:drive-<phase>`, routes `["work","drive",<phase>]`, **each with a `--dry-run` report-only flag (ADR-010 §3)** (ADR-002). `src/commands/loop.mjs` (**new**): `work:loop`, the launcher seam (`cli.launch` keyed on `dryRun`, with `--json` never launching by face policy — the two legs of ADR-010 §5), the promptly-returning registered probe, the frozen `--json` contract at ADR-005 §3 **with `state` narrowed to four members and refusals riding the face's error envelope under a `LOOP_REFUSALS` code (ADR-010 §5)**, the impure edge — `work:next`/`work:tasks`/`work:list` (ADR-010 §6/§8) / `work:validate` composition, the `brief.loop` write through `transitionRunStart`, the stranded-run reclaim, the cap read — **and the declared spawn seam `ctx.agentSessionDriverOptions`, without which none of this story is mechanisable (ADR-010 §2)**. **The milestone's two additive shared edits, both here**: `src/command-core.mjs` (4 imports + 4 `COMMANDS` entries) and `test/arch/acd-work-command-cli-bijection.test.mjs` (4 `argsFor` cases against `:252` — `["work","loop","03","--json"]` and `["work","drive",<phase>,"03/01","--dry-run","--json"]`; the route leg is already general — 52/ADR-012 §1). **Its own evidence (ADR-011 §1):** `test/loop-command-*.test.mjs` and `test/drive-command-*.test.mjs`, plus its labelled `// milestone 53 / story 02` blocks in `scripts/test.mjs` | `src/cli.mjs` (no ladder branch), `src/work.mjs`, `src/commands/continue.mjs` (**the shipped doors are untouched — ADR-002 §3**), `src/mesh-worker-execution.mjs`, `src/run-store.mjs`, `src/work-loop.mjs` (consumes, never edits); **`src/agent-session-driver.mjs` — AMENDED IN PLACE 2026-08-17, source: ADR-015 §7: consumes, never edits, EXCEPT the ONE line named — `:1000`'s `finish({ outcome: result.outcome })` becomes `finish({ outcome: result.outcome, ...(result.failureReason == null ? {} : { failureReason: result.failureReason }) })`, forwarding a field the module's own `:682` contract already declares and which `defaultWatchTranscriptCompletion` never sets (`:408`, `:423`, `:425`), so the change is a measured production no-op. No export is added, no signature moves, no second seam is declared, and `:925-927`'s `agent_error` is untouched. This is ADR-015 §10's class rule applied to a source file: a consequence of 53/02's own stop-condition contract, named and ceilinged at one line, with the guarantee narrowed rather than deleted**; `src/commands/doctor.mjs`, `src/work-doctor.mjs`, `src/commands/run-status.mjs`, `src/board-ui.mjs`, `src/bundle/*`, `ui/*`, **every pre-existing test except the one bijection test named, and within it only the four `argsFor` cases**, every other story's suites and blocks, all other regions of `scripts/test.mjs` | `53/00`, `53/01` |
| **53/03** | **`loop-ready-score`** — the readiness bar | `src/work-doctor-loop-ready.mjs` (**new**): the pure scorer, the frozen `LoopReady` shape, the four base check ids, the equal-weight fraction, the `not-applicable` exclusion rule (ADR-007), the unreadable-registry degrade (ADR-010 §14), and `cap-declared` meaning **declared** (ADR-010 §12). `src/commands/doctor.mjs`: the deferred `await import("../command-core.mjs")` → `invoke("work:loops-validate")` at the existing impure edge, **the `buildSnapshot` hoist to that same edge**, `run()` returning `{findings, loopReady}` and `json()` forwarding the key (**computed in `run()` — `json(result, faceCtx)` has no `ctx` and cannot invoke, `doctor.mjs:232`; ADR-010 §15**), one render line, and **nothing on `--explain`/`--converge`** (`:96-97`, `:234`). **`src/work-doctor.mjs`: EXACTLY TWO additive lines** — `export` on `inScope` (`:455`) and `options.snapshot ??` on the snapshot build (`:514`) — the ADR-010 §13 ruling that refuses both a fourth scope parser and a 3,214 ms `work:tasks` fan-out. **Its own evidence (ADR-011 §1/§3):** new `test/loop-ready-*.test.mjs` files reusing `test/doctor-command-core.test.mjs`'s harness SHAPE, plus its labelled `// milestone 53 / story 03` blocks in `scripts/test.mjs`, **plus `test/support/loop-ready-fixture.mjs` — the story-owned shared fixture helper, DECLARED here rather than left ownerless (AMENDED IN PLACE 2026-08-17 — source: ADR-015 §3). It is support, not a suite, so no registration sweep sees it (the milestone-52 precedent, `test/work-loops-coverage-ledger.test.mjs:702-706`), and localising it into five copies was refused. It builds the registry at `<workspace.aofDir>/loops` (`:30-39`), which is ADR-012's home and which this story's three task contracts must now state — 30 occurrences of the retired `wiki/work/loops` across `tasks/{00,01,02}` are re-aimed, and the story's five suites are already 33/33 green against the new home.** **AMENDED IN PLACE 2026-08-16 — source: ADR-014 §3/§4** (this cell read "(that file stays byte-unchanged)"): **it also owns the milestone's one-line legacy-test edit — `test/doctor-command-core.test.mjs`'s sole `Object.keys(` envelope assertion (`:168`) widens from `["findings"]` to `Object.keys(result).sort()` against `["findings", "loopReady"]`, byte-equal to ADR-014 §3's pinned line, with every other byte of that 683-line file unchanged (EOL-normalised residue digest `a74a8c422a6d…0dad659f` — `\r\n` → `\n` first) and its exported `name` set untouched.** It is 53/03's because 53/03's forced two-key envelope (ADR-010 §15) is what turns that assertion red, and a consequence lands in the diff that causes it (ADR-011's own reasoning for 53/02's four `argsFor` cases) | `src/work-doctor.mjs` **beyond those two lines** (**`CHECK_GROUPS` is NOT extended and `doctorWork`'s return is unchanged — 52/ADR-007 §5's substance**) and its four lane modules, `src/work-loops*.mjs` (**never imported**), `src/commands/loops-*.mjs`, `src/command-core.mjs` (no static import — TECH_DEBT item 26), `src/work-loop.mjs`, `src/commands/loop.mjs`, `src/commands/drive.mjs`, **every pre-existing test file except the one legacy suite named, and within it only the one envelope assertion named** (AMENDED IN PLACE 2026-08-16 — source: ADR-014 §4; this cell read "**every pre-existing test file**", and the "except the one file named" form is 53/00's and 53/02's own — this is its third and narrowest instance, NOT a second exception to the partition property, which is about two stories sharing a file and is untouched), every other story's suites and blocks, all other regions of `scripts/test.mjs`, `ui/*` | — |
| **53/04** | **`autonomous-shell-out`** — the prose loop hands over | `src/bundle/commands/autonomous.md`: `<process>` and `<stop_conditions>` deleted and replaced by the no-`--json` human shell-out; `--solo` mode resolution and the `--ship` step retained and re-anchored on the shell's output (ADR-008 §1, ADR-016) — **`--solo` narrowed in wording to "the roles THIS SESSION plays", with the append-to-every-delegated-command instruction (`:26-28`) dropped, and `--max-attempts N` forwarded to the shell's `cap` input (ADR-010 §20)**. `src/commands/loop.mjs`: **only** the human launcher-report projection/rendering seam that exposes driven refs/phases and halt stop/ref/resume; no probe, JSON, engine, cap, phase or producer change. **The deletion list is WIDER than ADR-008 §1 named and is enumerated at ADR-010 §21**: the two blocks, plus the frontmatter `description` (`:2`), `<objective>` (`:8`), the `<config>` range bullet (`:18`), the `maxAttempts` + `heartbeatStaleMs` reads (`:14-15`) and `<progress_tracking>`'s first bullet (`:146`). **Carries the milestone's `@manual` soak lane** — the named "proven" condition (ADR-008 §3), which is why this story owns the prose change rather than 53/02. **Its own evidence (ADR-011 §1):** `test/autonomous-shell-out-*.test.mjs` for the `@executable` reader/bundle/door/black-box-launch legs (the `@manual` soak deliberately has no file), plus its labelled `// milestone 53 / story 04` blocks in `scripts/test.mjs` | every `src/*.mjs` and `src/commands/*` file **except the one narrow `src/commands/loop.mjs` reporting seam just granted**, `src/bundle/commands/{refine,continue,verify}.md`, `src/bundle/bundle.json` (no new member — ADR-008 §4), `src/work-bundle.mjs`, **every pre-existing test file**, every other story's suites and blocks, all other regions of `scripts/test.mjs` | `53/02` |
| **53/05** | **`the-fitness-functions`** — the gate | Eleven new `test/arch/*.test.mjs` files, FF-5301…FF-5311, each exporting `{ name, run }`, plus its own labelled `scripts/test.mjs` import + spread blocks | every `src/` and `src/bundle/` file; `test/agent-session-driver-door.test.mjs` (the reopened 53/00 owns its ten-name correction); every pre-existing test except the two accepted milestone-52 roster files and only their named namespace assertion regions plus directly adjacent explanatory labels/messages/comments (`test/arch/acd-loop-finding-envelope.test.mjs`, `test/work-loops-coverage-ledger.test.mjs`, ADR-015 §8/§10); every other story's suites and labelled blocks; `scripts/test-unit.mjs`; all other `scripts/test.mjs` content | `53/00`, `53/01`, `53/02`, `53/03`, `53/04` |

**53/02 partition clarification (developer-feasibility amendment, 2026-08-17).** Inside the
`src/commands/loop.mjs` ownership already declared in its row, 53/02 owns the existing-policy call
`parseResumeAfter(null, { now })` before `transitionRunComplete` and the stop-detail writes to the
existing human `report` callback. `src/run-store.mjs` remains consume-only: its policy export,
transition refusal and `error.readyAt` are read, never edited. The one-line
`src/agent-session-driver.mjs` exception remains the row's only newly admitted source-file edit;
neither frozen `LoopState`/`act` nor the face's `--json` probe is widened.

**53/04 partition clarification (implementation amendment, 2026-08-17).** ADR-016's measured
child-process cleanup amendment supersedes the 53/04 row's generic `src/*.mjs` Must-NOT-touch phrase
for exactly one site: the guarded `term.kill()` inside `src/agent-session-driver.mjs`'s existing
`cleanupSubs` settle point. No other byte of that module is granted to 53/04, and the row's
`src/commands/loop.mjs` report-only ceiling remains unchanged.

**Why each boundary sits where it does.**

- **53/00 ∥ 53/01 ∥ 53/03 are genuinely independent, and two ADRs are what keep that true.** The
  extraction (53/00) is a pure code move with a re-export; the engine (53/01) is pure decision functions
  over plain data. The obvious threat was the engine needing the driver's outcome vocabulary — closed by
  ADR-005 §4, which makes `{outcome: done|failed|needs-input}` a *frozen* input to the engine rather than
  an import: **53/01 declares no import of `src/agent-session-driver.mjs` in either direction**, and
  tests against literal fixture decisions. The second threat was 53/03 needing the loop to exist — closed
  by ADR-007 §7: the score is about readiness, not about a running loop, so it composes only through
  `work:loops-validate`, which **already shipped in 52**. Three stories, zero shared **source** files
  (53/03's two-line `src/work-doctor.mjs` edit, ADR-010 §13, is touched by no other story), zero
  source-side imports between them, and — under ADR-011 — three disjoint suite-name families plus three
  disjoint labelled blocks in the one append-only registration hub.
- **53/00 is fenced alone because its edit is the only destructive one in the milestone.** Deleting ~900
  lines from a 49-dependent module is exactly the diff that wants a review pass of its own, and its
  correctness criterion is unusually crisp and unusually mechanical: *44 test files must remain
  byte-unchanged and green*. Bundling it with the command surface would hide that criterion inside a
  larger diff.
- **53/02 is the single editor of both shared points.** Registration is additive but concurrent edits to
  one array region are pure merge friction, and a command cannot be CLI-reachable until it is registered
  — so the four commands and their registration are one story. The bijection test's four `argsFor` cases
  land in the **same diff as the registration**, because they are a consequence of registering (the
  `default: throw` at `:252` fires on the registration diff), not a gate; splitting them into 53/05 would
  leave a green test red between two stories. Because `deriveRouteTable` is registry-derived and 52
  already generalised the route leg, this story still adds **no `cli.mjs` branch** and its edit surface
  outside its own new files is roughly a dozen lines across two files.
- **53/03 is separated from 53/02 despite both being "the command layer".** They share no file, no
  import and no contract: the score reads 52's already-shipped command; the loop reads `work:next` and
  the run store. Merging them would couple the milestone's only *fully independent* story to the critical
  path 53/00→53/02, for no gain.
- **53/04 is its own story because deleting the prose caps is a decision, not a chore.** It removes the
  stop conditions, the phase mapper and the retry policy from the document a model reads — safe **only**
  once the code owns them, which is why `depends: 53/02` is a real dependency and not a verification-time
  one. It also carries the `@manual` soak that defines "proven" (ADR-008 §3), so the story whose
  acceptance turns on the loop actually working is the story that observes it working.
- **53/05 is last, on purpose, and this repo has the scar.** Authoring arch-tests before their surfaces
  exist gives a long RED window in which "red because unbuilt" is indistinguishable from "red because
  broken" — `TECH_DEBT.md` **item 5** ("Part of the fitness gate is dead… the gate reads green-ish while
  not running"), and TECH_DEBT item **27** measured nine suites RED at HEAD with nothing saying so. The
  invariants themselves are already written and reviewable **in this document**; 53/05 mechanises them
  and lands them green. **AMENDED by ADR-011 §1:** what 53/05 lands last is the **structural** gate —
  the eleven `test/arch/acd-*` files. Each story's **behavioural** suites land *with that story*, in its
  own diff, registered in its own labelled block, because evidence that arrives after acceptance is
  TECH_DEBT item 48's exact failure and this milestone cites item 48 as its cautionary tale.
- **Every story owns its evidence, and `scripts/test.mjs` is the one declared shared file (ADR-011).**
  The graph settles it: `aof graph impact scripts/test.mjs` → **0 dependents, 694 outbound edges**. An
  edit to it can break no consumer and change no module's blast radius; the only cost is merge friction
  on two contiguous, labelled regions. The partition property that mattered — blast radius — is intact,
  and the property as originally written was simply false, because behavioural suites in this repo are
  explicit imports and spreads with no glob.

**Parallelism check.** **53/00, 53/01 and 53/03 all start immediately and concurrently** — disjoint file
sets, disjoint source-side imports, and each contractable at its own Three Amigos against the frozen
blocks in ADR-001 §1, ADR-005 §3/§4/§5 and ADR-007 §4/§5 respectively. 53/02 joins when 00+01 land.
53/04 joins when 02 lands. 53/05 closes. Three of six stories are on the critical path; the widest
concurrent front is three. **No story edits a file another story edits, with the one declared exception
of `scripts/test.mjs` — append-only, one labelled block each, 0 dependents (ADR-011 §2).** Zero stories
edit `src/work.mjs`; `src/work-doctor.mjs` is edited by exactly one story (53/03) by exactly two
additive lines (ADR-010 §13).

**Codebase-health note (measured, routed — nothing waved through).**

*What this milestone IMPROVES, with numbers.* `src/mesh-worker-execution.mjs` is **3,286 lines** today —
TECH_DEBT item 10 measured it at 2,163 (2026-07-26), 3,174 (2026-08-01) and 3,187 (43/04), calling it
*"the single clearest instance of the accretion item 0 describes"* and naming the fix: *"Split
`mesh-worker-execution.mjs` along its own seams… the PTY/agent driver [is] a module."* ADR-001 executes
that split. **The arithmetic, corrected (ADR-010 §17c — ADR-001 §4 said "roughly 2,400" and was
high):** the moved block `:847-1851` is **1,005** lines, so the sink lands at **2,281** plus its import
+ re-export block — **~2,300**, below every measurement item 10 has recorded since 2026-08-01. FF-5302
arms the **file-size ratchet item 10 explicitly asks for** ("a measured ceiling per file, raised only
deliberately, so 'it grew 47%' is a build failure rather than a retrospective observation") on the one
file that most needs it — **as a ceiling AND a floor**, the house `acd-ui-surface-file-budget` idiom, so
a rename or a truncated read fails as "the file was not actually read" rather than passing as headroom,
and a legitimate later subtraction is never a build failure (ADR-010 §17, closing C7). This is the first
milestone to move that number the right way.

*What this milestone COSTS, with numbers.* `src/` holds **223** `.mjs` files, **114** of them at the flat
root (item 10 measured 99 → 106 → 109; 52 took it to 112). This milestone adds **three** root modules
(`agent-session-driver.mjs`, `work-loop.mjs`, `work-doctor-loop-ready.mjs`) → **117**, and **two** under
`src/commands/` (81 → 83). Each of the three is ADR-mandated and leaf-shaped — the driver is a
five-import leaf extracted from a sink, the engine is a **zero-import** pure leaf, the scorer is a
zero-import pure leaf in doctor's existing `work-doctor-*` family (whose multi-lane precedent is
`work-doctor.mjs` + its four lane modules). So this is sprawl by *directory*, not by *subject*, exactly
as item 10 characterises the previous four waves. The flat root is item 10's open debt, this milestone
neither worsens its shape nor is the right place to pay it, and **no new entry is warranted for it**.
**The ratchet, recorded so it is not rediscovered: the fourth `work-loop*` / session-driver-family module
is the trigger to fold the family into `src/loop/`** — the third, not a vibe, and 54/62/63 are the likely
candidates.

**RE-MEASURED AND DISAMBIGUATED 2026-08-17 — source: ADR-015 §11c/§11d.** The absolutes above were
already stale when written: `src/` root is **121** `.mjs` at HEAD and `src/commands/` is **85**, not
114 → 117 and 81 → 83. **The milestone's own delta is exactly as declared**, measured by diffing against
the base `9e0f910` (118 root, 82 commands): the three ADR-mandated root leaves
(`agent-session-driver.mjs`, `work-loop.mjs`, `work-doctor-loop-ready.mjs`) and two under `src/commands/`
(`drive.mjs`, `loop.mjs`); the third new commands file, `item-status.mjs`, belongs to another milestone
on this branch. And **the `src/loop/` ratchet is NOT yet triggered**: the loop-**shell** family in the
root is **three** — those three leaves. A literal `work-loop*` glob would also sweep milestone 52's
`work-loops.mjs` and `work-loops-checks.mjs` and read four, but those are the loop **REGISTRY**, a
different subject with its own home ruling (ADR-012), its own gates (FF-5312/FF-5313) and its own
`acd-registry-*` naming family. **The ratchet counts the loop-shell family only, and the trigger is its
fourth module** — 54, 62 or 63, exactly as this note predicts. Written down so the next reader measures
rather than guesses.

*What this milestone ROUTES to TECH_DEBT.* **Three entries — items 49, 50 and 51.** Item 49 is below;
items **50** (`acd-test-suite-registration`'s imported-but-never-spread hole) and **51** (two answers to
"does this story have an authored task contract") are written verbatim in **ADR-011 §5** and are routed
by the same closure round. Items run 0–49 on disk today (49 having landed since this section was first
written); 50 and 51 are the next free numbers. The entry for 49, as appended:

> ## 49. The work stream has THREE independently-written scope parsers, and the one the loop depends on fails OPEN
>
> **Status:** open (raised 2026-08-15 by the architect during milestone 53's Decide stage; measured by
> milestone 53's RESEARCH §Q3 and confirmed at source). **Severity:** medium — it is a silent-green on a
> sequencer, the same class as item 11's silent-green on a gate, and the loop artifact is its first
> caller that can act on the wrong answer.
>
> **What's wrong.** Three functions in two modules answer "is this item in scope", and they disagree.
> `nextWork`'s `inRange` (`src/work.mjs:847-860`) accepts `^\d+$` and `^(\d+)-(\d+)$` and **falls through
> to `() => true` for everything else** — so `aof work next 18/02` is silently *unscoped* and offers the
> first ready item anywhere in the stream. `validateWork`'s `inScope` (`src/work.mjs:723-730`) — a
> separate parser in the SAME file — handles `NN/SS` pairs and slug substrings. `work-doctor.mjs`'s
> `inScope` (`:455-463`) is a third, independently-written copy that also handles `NN/SS`, with its own
> `Number.parseInt` comparison where validate uses `sameNum`. One concept, three answers, one of which
> fails open.
>
> **How it bites.** It has not bitten yet, which is why it is an item rather than a bug: every current
> caller of `nextWork` passes a milestone number or a range. Milestone 53's `aof work loop` is the first
> caller for which a wrong answer *acts* — an unscoped walk would start driving sessions against a
> milestone the operator did not name. 53/ADR-003 closes that door with a refusal
> (`loop-scope-unsupported`) rather than a widening, precisely so the fix is not forced into a
> 241-dependent god-node by whichever milestone happens to need it first.
>
> **The fix.** One home: a leaf `src/work-scope.mjs` exporting one `inScope(item, scopeRef)` predicate
> and one `admittedForms()` vocabulary, imported by `validateWork`, `work-doctor.mjs` and `nextWork`,
> with `nextWork`'s fail-open branch replaced by an explicit "unscoped" decision the caller can see. It
> touches `src/work.mjs` (two call sites, 241 dependents) and `src/work-doctor.mjs`, so it wants a story
> of its own rather than a ride-along. When it lands, 53's `LOOP_SCOPE_FORMS` guard (FF-5308) can widen
> to whatever the single parser admits — and FF-5308's necessity leg going RED is the signal that it did.
> **Consumer added 2026-08-15 (53/ADR-010 §13):** `src/work-doctor-loop-ready.mjs` scopes its
> `tasks-authored` row through `work-doctor.mjs`'s `inScope`, which milestone 53 **exports** rather than
> copying — a fourth copy inside the milestone that raised this item was refused by name. The fix's
> import list therefore gains one module, and the one-home target is unchanged.
> **Follow-on RULED 2026-09-05 (chore `111` / ADR-017).** *“When it lands, 53’s `LOOP_SCOPE_FORMS` guard
> (FF-5308) can widen to whatever the single parser admits”* was the entry’s own note, and its signal
> fired: item 84 taught `inRange` the story span, story 86 replaced the fail-open branch with an
> explicit refusal, and FF-5308’s necessity leg went red. **The widening was considered and REFUSED.**
> `LOOP_SCOPE_FORMS` stays the frozen `driver` + `range` pair — it is now the admission grammar of four
> unattended launch surfaces, not one command’s parser, and a story span would need `loopScopeIncludes`
> taught story-grained semantics rather than a regex. ADR-017 carries the full argument and a named
> discharge trigger. The item’s remaining half — the ONE-HOME leaf `src/work-scope.mjs` — is untouched
> by that ruling and still wants a story of its own.

*One further exposure, routed to an EXISTING item rather than a new one.* The loop's gate is
`aof work validate <ref>`, which carries TECH_DEBT item **11**'s silent-green (an unresolved scope
renders PASS, `src/work.mjs:687-694`). The loop is **not** exposed, because every ref it gates comes from
`work:next` and therefore resolves. That boundary is recorded here so a later reader does not mistake the
loop for a second instance; item 11 already owns the defect and its fix is unchanged by this milestone.

---

**Codebase-health addendum, 2026-08-15 (ADR-012 / ADR-013 — story 53/07's round).** The partition table
above predates 53/07 and is **not** amended here; the story exists, its file set is disjoint from every
other story's (`src/work-loops.mjs`, `src/bundle/bundle.json`, `src/bundle/loops/*`,
`src/bundle/manifest.json`, `test/work-loops-registry-census.test.mjs`,
`test/arch/acd-loop-records-parse.test.mjs`, its own two arch files, and its own labelled block in
`scripts/test.mjs`), and it depends on nothing in 53/00…53/05. `53/03` is the only near-neighbour and
ADR-013's Consequences settles it: the five checks and their `summary.checks` semantics are unchanged, so
the two stories may land in either order.

*What this round IMPROVES, with numbers.* `wiki/work/loops/` ceases to exist, taking `work.dir` back to
**zero** non-item directories — 52/ADR-001's Consequences called it *"the first non-item directory in
`work.dir`"* and armed decision 3 as the ratchet against a second; this is the first milestone to retire
the first rather than add to it. `src/work-loops.mjs` gains **one word** and `src/work-loops-checks.mjs`
stays a 0-import pure leaf (graph, 2026-08-15T13:51:17Z: 8 dependents, imports nothing). And a registry
that existed in exactly one checkout becomes one every install carries.

*What this round COSTS, with numbers.* `.aof/` gains its **second** git-tracked content directory beside
`templates/` (measured: `git ls-files .aof` returns `aof.config.json`, `aof.lock.json`, `.gitignore` and
all 15 `templates/` files — everything else under `.aof/` is untracked runtime). `src/bundle/` gains a
**seventh** child (`loops/`, beside `agents/`, `commands/`, `hooks/`, `skills/`, `templates/` and the two
machinery files); `bundle.json` goes 50 → **59** members and `manifest.json` 86 → **95** entries, both by
regeneration rather than authorship. **The ratchet, recorded so it is not rediscovered: the THIRD
git-tracked content directory under `.aof/` is the trigger to declare `.aof/`'s content layout** — the
third, not a vibe, mirroring this milestone's own `src/loop/` trigger. Nine new `asset` members is also
the point at which the asset kind stops being a one-off (it had exactly one member before this story);
if a tenth family arrives wanting a directory rather than a file, that is when `renderBundleAssetOutputs`
earns a `dir`-shaped member, not before.

*What this round ROUTES to TECH_DEBT.* **One entry — item 54** (items run 0–53 on disk today; 54 is the
next free number). It is a general defect this round measured while pricing the dogfood, and it does not
fit 53/07: closing it means reconciling 28 files across `.claude/`, `.codex/` and the bundle, each a
decision (reinstall, or the bundle member was removed), which is a story of its own. FF-5312 closes it for
the nine loop records **only**, which is exactly why the general case must be written down.

> ## 54. aof's own installed bundle has silently drifted from its own manifest — 11 files changed, and nothing fails
>
> **Status:** open (raised 2026-08-15 by the architect while ruling milestone 53's story 07; measured at
> HEAD). **Severity:** medium — it is item 5's shape ("the gate reads green-ish while not running") applied
> to the artifacts that *are* the running system, and it becomes a correctness risk the moment a test reads
> an installed artifact as its subject.
>
> **What's wrong.** Hashing all **86** entries of `src/bundle/manifest.json` against this repo's own tree
> gives **75 matching, 11 drifted, 0 missing** (re-measured 2026-08-15 at the Three Amigos; an earlier
> reading of 58/24/4 predated a reinstall). The eleven are `.aof/templates/work/task/example.feature`,
> `.claude/agents/aof-{developer,qa}.md`, `.claude/commands/aof/{continue,refine,verify}.md` and the
> mirrored `.codex/` set (`agents/aof-{developer,qa}.md`, `skills/aof-{continue,refine,verify}/SKILL.md`).
>
> **And the chain is stale at BOTH links, which is the part that makes it a real gap rather than an
> untidiness.** Two existing gates each cover half and neither covers the other:
> `acd-bundle-manifest-hashes` is supposed to prove `src/bundle/` → `manifest.json` is current — and it is
> **RED on HEAD**, because commit `d38e720` edited `src/bundle/templates/task/example.feature` without
> regenerating the manifest, and has stayed red for two commits with nothing surfacing it. `work update`'s
> `drift-warning` (`src/render-plan.mjs:38-41`) reports the other half **only to whoever runs the
> command**. Nothing in CI compares `manifest.json` → the installed tree, so a repo that simply never
> re-runs `aof work update` reads green forever. Milestone 53's story 07 closes this for the nine loop
> records only — and does so by comparing installed bytes to the SOURCE files rather than to the manifest,
> precisely because the manifest is the link that has been demonstrated to go stale.
>
> **How it bites.** Two ways, one of them new. (a) The agents and commands actually driving work in this
> repo are up to 24 files behind the bundle they are supposedly defined by — the "green tests ≠ running
> system" failure the deploy rule already warns about, one layer up from the binary. (b) From milestone 53
> story 07, aof's loop registry is a *delivered* artifact and two test suites read the install as their
> subject (`test/work-loops-registry-census.test.mjs`, `test/arch/acd-loop-records-parse.test.mjs`), so a
> stale install would make those suites assert against records the bundle no longer ships — green, and
> measuring the wrong thing. 53/07 closes that for its own nine files (FF-5312) and leaves the other 86
> paths open.
>
> **The fix.** One gate, generalising FF-5312's leg: import `readShippedManifest`
> (`src/work-bundle-manifest.mjs:65`), hash every entry's path in the repo, and assert byte-equality —
> replacing nothing, sitting beside `acd-bundle-manifest-hashes` as its downstream half. It wants a story
> rather than a ride-along because the first run has **28 findings** and each needs a decision: reinstall
> (the common case), or the entry names a member that has since been removed, or the file is legitimately
> co-authored and belongs in a declared allowlist. A bulk `aof work update --force` would resolve the
> counts and hide whichever of the 28 is the third case.
