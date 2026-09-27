---
doc: architecture
---
<!--
  Milestone ARCHITECTURE.md — answers ONE question: what did we decide, and why?
  Owner: architect. ADRs are append-only; a superseded decision is marked, never deleted.
  Structural invariants belong here as FITNESS FUNCTIONS (the register at the foot), not in a
  task .feature — a .feature states observable behaviour over a seam, a fitness function states a
  property of the tree.
-->
# 72 · The inner loop — Architecture

## Context this milestone inherits

Every figure below was measured at HEAD on 2026-09-02. The codebase graph was rebuilt at this
decision point over the project root with no `--backend`: **14,551 nodes / 35,577 edges, egress
`none`, `builtAt 2026-09-02T18:25:21.807Z`, `unchanged: true`** — graphify rewrites only on a
topology change, so an untouched artifact means the graph is current. All coupling below is
`aof graph impact`, deterministic from the graph's edges, and is stated as ACTUAL rather than
inferred; where it is inferred, it says so.

### Three corrections to 72/SPEC, each verified at source

The objective was written 2026-08-16. Three of its six levers have moved, and each is recorded here
so it is not re-litigated from the old number.

**1 — The QA `Edit` grant SHIPPED.** Chore 76 (`76_chore_reviewer-edit-grant`) is `status: done`, and
`src/bundle/agents/aof-qa.md:5` now reads `tools: Read, Grep, Glob, Bash, Write, Edit`. 72/SPEC
§Objective's headline — *"the single largest token line item in the corpus"*, 661.6k tokens / 41.8% of
milestone 52 — is CLOSED and is not this milestone's. 72 owns only what the grant does not fix.

**2 — The observability classifier is FIXED.** 68/ADR-006 landed `classifyToolCallResult`
(`src/work-observe.mjs:65-93`) with the reclassification pass at `src/work-observe.mjs:218-229`: a
Bash call is classified as a test run by what its RESULT says, not by the command string, so the
isolated `AOF_GLOBAL_HOME=$(mktemp -d) node …` form this repo actually uses is scored as toolchain.
72/SPEC's *"reports **zero** toolchain grind"* defect no longer exists. The write-thrash measurement
also already exists and is not re-derived here: `editCounts` per file
(`src/work-observe.mjs:134,175`), `hotEdited` ranked (`:274`), and a thrash reason fired at
`count >= 8` (`:299`).

**3 — The doc-line budget already BINDS, and it binds at the only door that can honestly refuse.**
`src/work-doctor-budget.mjs:57-69`: `severity: accepting ? "error" : "warn"`, where `accepting` is
`ctx.acceptingRef === item.ref`. The ref is injected by the status door and nowhere else —
`src/commands/item-status.mjs:95-112` runs the SAME group over the SAME snapshot when
`toStatus === "done"`, filters `severity === "error"`, and throws `artifact-budget-exceeded` (409).
That is `70/ADR-007`. 72/SPEC's *"a `warn` nothing enforces"* is stale. **The honest residue of the
write-thrash lever is therefore smaller than the SPEC thought, and ADR-006 says how much smaller.**

### The boot cost is ONE static import, not the two the SPEC names

Measured at HEAD, three runs each, wall-clock `import()` of the module in a cold process:

| module | import cost | graph coupling |
| --- | --- | --- |
| `src/cli.mjs` (whole) | **363 / 362 / 384 ms** | 5 dependents / 7 imports, 36,661 B |
| `src/command-core.mjs` | **351 / 324 ms** | **147 dependents / 88 imports** — the registry god-node |
| `src/work.mjs` | **16 / 16 ms** | 80,329 B |
| `src/commands/mesh-session.mjs` | **50 / 41 / 41 ms** | the whole session verb |

Whole-process wall time: `node -e 'import("./src/cli.mjs")'` **0.609 s**; `node -e
'import("./src/commands/mesh-session.mjs")'` **0.150 s**. So **~90% of the boot is `src/cli.mjs:3`,
the static `import { getCommand, listCommands } from "./command-core.mjs"`**, which fans out to 88
command modules — and `src/work.mjs` at `src/cli.mjs:2`, which 72/SPEC names as *"64 KB"*, is 16 ms
and is not the cost. `src/spine/face.mjs` costs 332–370 ms because it reaches the registry too.
The session branch (`src/cli.mjs:117-120`) is a plain ladder arm that needs neither.

### Hooks: the duplication is a repo-local fact, and the FRAMEWORK RULE that produced it is correct

`.claude/settings.json` carries two blocks each for `SessionStart` (`:3-23`), `UserPromptSubmit`
(`:24-44`) and `SessionEnd` (`:45-65`) — one hand-authored and unmarked, one carrying `aofManaged`.
72/SPEC attributes this to the merge; that attribution is half right and the cited line is the wrong
one. `src/claude-settings.mjs:346` is the **permissions** splice. The hook behaviour is
`spliceSettings` (`src/claude-settings.mjs:254-317`), and it turns on `isAofEntry`
(`src/claude-settings.mjs:169-174`), whose own comment states the rule deliberately:

> *"aof recognises its own, and ONLY its own. An entry an operator hand-copied without the marker is
> the operator's: aof neither adopts, edits nor retracts it."*

`operatorGroups.push(group)` at `src/claude-settings.mjs:285` carries the unmarked entry through **by reference**. That is
the ownership escape hatch `55/ADR-004` preserved, it is what makes this repo's own
`guard-test-isolation.mjs` survive every `aof work update`, and it is why the fourth `PreToolUse`
matcher (`Bash|PowerShell`, `.claude/settings.json:94-104`) is unmarked and must stay that way.
**The framework merge is not changed by this milestone** (ADR-005).

### The three hook shapes this project has proven, and the one it retired

`.claude/hooks/aof/` holds three files. Two are bundle assets (`src/bundle/bundle.json:18,20`); the
third is repo-local by an explicit, measured decision.

- **PostToolUse, derivation-free enqueue, exit 0 on every path** — `run-heartbeat-enqueue.mjs`
  (18 lines; *"derives no workspace identity, opens no aof store, imports no framework module"*) and
  `artifact-sync-enqueue.mjs`. `43/ADR-001`: the hook does no work, it enqueues; a daemon drains.
  The measured **`http` hook type was REJECTED as primary and recorded**.
- **PreToolUse, pure predicate, exit 2 to BLOCK, exit 0 on every undecidable path** —
  `guard-test-isolation.mjs`. Its closure is exactly two files: `aof graph impact` reports **1
  dependent** (`test/repo-test-isolation-guard.test.mjs`) and **0 dependencies**.
- **RETIRED: a repo-specific predicate that ships.** Story 87 (`87_story_test-isolation-stops-shipping`)
  withdrew that guard from the bundle because *"the predicate travelled anyway and refused their own
  build command"*. This is the most load-bearing precedent in the milestone and ADR-003 turns on it.

### The aof process NEVER imports project test code — and this is the constraint `aof test` is built around

`66/ADR-004 §2` refuses it (*"importing executes its module scope"*), `59/FF-5904`
(`test/arch/acd-audit-never-imports-project-code.test.mjs`) makes it structural over an **import
closure** rather than a directory, and `src/work-audit-probe.mjs` exists solely because the census
needs the runner's assembled array and *"obtaining it means evaluating the runner's module graph,
which for this repository is 880 test modules"* — so it is done in a child, through one bounded seam,
never by import. `src/work-audit/spawn.mjs`'s `runBounded({ command, args, cwd, env, deadlineMs })` is
that seam: an **argument vector, never a shell string**; a deadline, always; a metacharacter in the
executable position refused at the door.

### The suite, measured rather than quoted

`scripts/test.mjs` is **349,485 B / 4,613 lines with 948 graph-reported dependencies** — 72/SPEC's
*"275,100 B, 728 static imports"* is stale in the wrong direction: **the suite grew.** 950
`*.test.mjs` files on disk, **392** of them under `test/arch/`. Strictly serial (`Promise.all` 0,
`.only` 0, argv filters 0). It **exports `tests`** at `:3204` and runs only when it is the entry point
(`:4607-4613`), which is what makes a selective runner possible at all.

**Its 0 graph dependents are a DYNAMIC-IMPORT BLIND SPOT, not isolation.** `aof graph impact
scripts/test.mjs` reports `present: true, dependents: 0` — and `src/work-audit-probe.mjs` imports it
by `pathToFileURL` at run time while `assembledSuite` spawns it. Recording that zero as "nothing
depends on the runner" would be exactly the mistake the graph-grounding step exists to prevent.

**The file→suite mapping already has ONE HOME.** `src/work-audit/census.mjs` (7 dependents,
3 imports) holds `runnerImportedSuites` (`:348`), `runnerBindings` (`:360`), `runnerSpreadNames`
(`:380`), `assembledSuite` (`:394`) and `registrationDecision` (`:223`). `59/ADR-003 §4` already
settles which authority wins. No second derivation of "which suite file contributed which entries"
may be authored (FF-7203).

### The graph covers the tests, and a build is never free

Of the graph's **1,495 distinct source files, 1,031 are under `test/`** and **392 under `test/arch/`**,
so test→src edges are present and `aof graph impact src/work-doctor-budget.mjs` already returns its
five test dependents by name. That is test selection, working today, deterministically, with no LLM.

And the rebuild at this decision point, which changed nothing, still reported
`AST extraction: 1577/1577 files (100%) [22 workers]` before concluding *"No code-graph topology
changes detected"*. **A graph build is minutes even on the fully-cached path.** ADR-002 turns on this.

### Recall, acknowledged

- **`43/ADR-001`** (a hook is a derivation-free enqueue; the `http` type was rejected and recorded) —
  **honoured and extended**: ADR-003 refuses a REWRITING hook on the same argument, one step further.
- **`38/ADR-008`** (where we do not own the producer, feed the contract test a REAL CAPTURED payload)
  — **honoured where it applies, and it applies to nothing here**: 72 adds no hook (ADR-003, ADR-005),
  so no new vendor payload is consumed. The obligation is recorded for the first story that adds one.
- **`49/ADR-005`** (bundled CLAUDE session hooks land LAST) — **untouched**: 72 changes no hook order.
- **`62/ADR-005`** (`aof work tune` WRITES NOTHING; auto-apply is L3) — **honoured, and consciously
  extended in the same direction**: ADR-006 declines the pre-apply edit gate, so no aof surface
  rewrites an agent's proposed content. Had it landed, the gate would have been on the right side of
  62/ADR-005's line — a refusal is not a rewrite — but ADR-006 declines it on evidence, not on that.
- **`09/ADR-004`** (the graph is ADVISORY; no graph output feeds a gate, merge, status-write or
  work-mutation) — **honoured, and ADR-002 §4 is the load-bearing clause that keeps it true.**

---

## ADR-001: `aof test` is a SELECTOR and a BOUNDED SPAWN of a PROJECT-DECLARED runner — aof never becomes a test harness, and never imports a test module

**Status:** Accepted
**Date:** 2026-09-02

**Context.** 72/SPEC §Scope asks for *"targeted test execution as a first-class command… over the
existing test-array registry"*. Two facts constrain every shape it could take. First, `66/ADR-004 §2`
and `59/FF-5904`: the aof process must not import project test code, because importing executes it —
880 modules, this repo, measured. Second, aof is a framework INSTALLED into other repositories
(two private downstream projects, `aof-test-repo`, the mesh test-bed); `scripts/test.mjs` is this repo's
script and exists in none of them. A command that hard-codes it is a command that works in one repo
and lies in every other. Story 87 is what that failure looks like when it ships.

**Decision.**

**1 — Three responsibilities, split at the ownership line.** *aof owns* the SELECTION (which suite
files), the LAUNCH (one bounded spawn), and the REPORT (failures-only). *The project owns* the RUNNER.
Neither reaches into the other.

**2 — The runner is DECLARED, in config, and the declaration is the only speller of the program.**
`work.test` in `.aof/aof.config.json`, resolved by ONE module (`src/work-toolchain.mjs`), which is the
one home for these keys the way `src/loop-bounds.mjs` is for `work.loop.*` (`61/62/66`'s idiom):

```
work.test = {
  command:     "<executable>",      // argv[0]; resolved before the seam's door (see §5)
  args:        [...],               // the invariant prefix
  selectArgs:  [...],               // an argv TEMPLATE; see §3
  roots:       ["test"],            // where suite files live
  deadlineMs:  900000,              // the bound; see §6
  report:      { format: "tap" }    // how to READ the output; see §2b
}
```

**2b — The declaration says how to READ the runner's output, because ADR-003's face must not hard-code a
format.** A failures-only report has to know which lines are failures. Hard-coding TAP would be the
"works in one repo and lies in every other" shape this ADR opens by refusing — and the tree already
settles the question: `work.rubric` (`.aof/aof.config.json:13-18`) declares
`command: ["node", "scripts/test-rubric.mjs"]` **and** `report.format`, read at
`src/work-doctor.mjs:488`. `work.test` takes the same shape from the same reason, so the two
sibling declarations do not disagree about what a declared runner is. Default `tap`; an unknown
format is `test-runner-declaration-invalid`, never a silent fall-through to raw text.

No default runner is guessed. **An absent or invalid declaration is a coded refusal naming the key**
(`test-runner-undeclared`), never a fallback to `npm test` — a guessed program is a program nobody
declared, and 63/ADR-005's rule (*the declaration is the sole speller*) is the same rule here.

**2a — `deadlineMs` is REQUIRED, and an absent, zero or negative one is a refusal.** RATIFIED
2026-09-02 at QA's pass, and it is a conscious DEPARTURE from `src/loop-bounds.mjs`'s
`positiveInteger(value, fallback)` silent-default idiom. A guessed bound is the same species as a
guessed program, and here the gap is measured rather than theoretical: `runBounded`'s
`DEFAULT_DEADLINE_MS` is **60,000 ms** (`src/work-audit/spawn.mjs:43`) and this repo's own suite needs
**900,000**. A silent fallback would kill aof's own test run at 60 s and report it as
`deadline-expired` — a bound nobody chose, failing a run nobody could see the cause of. The
loop-bounds idiom is right where a fallback is a POLICY default; it is wrong where the correct value
is a property of the project's toolchain and only the project knows it.

**3 — Selection reaches the runner through ONE expansion rule, not a grammar of styles.**
`selectArgs` is an argv template in which the token `{file}` is expanded **once per selected file**.
Positional runners fall out as `["{file}"]`; a flag runner is `["--only", "{file}"]`. One rule; no
`style` enum to grow a third member. **The token expands IN PLACE, and the template is not repeated**
(RATIFIED 2026-09-02): three files against `["--only", "{file}"]` compose
`["--only", "a", "b", "c"]`, never `["--only","a","--only","b","--only","c"]`. Only the in-place
reading composes with §2's single declaration — a repeated template would make the invariant prefix
(`args`) and the selection indistinguishable in the composed argv.

**4 — aof imports no test module, in any face, on any path.** Every execution is `runBounded`. There
is no in-process fallback "for the small case" — that is how the boundary is lost (`59/FF-5904`'s
review measured two independent escapes from a weaker version of the same rule).

**5 — ONE bounded spawn seam, reused, never re-authored.** `runBounded` from
`src/work-audit/spawn.mjs` — argument vector, no shell, deadline armed, kill on expiry, observed exit
code handed back. This milestone authors NO second bounded spawn.

**CORRECTED 2026-09-02** — this clause first said the door *"refuses a `command` that is not an
existing file"*. **It does not**, and both the 72/00 and 72/04 feasibility passes found it
independently. `argumentVectorProblem` (`src/work-audit/spawn.mjs:98-113`) CONJOINS the two
conditions at `:102` — `SHELL_SHAPED.test(command) && !exists(command)` — and the module documents
the intent at `:79-81`: *"a bare `node` resolved through PATH carries no control character and never
reaches condition 2"*. Driven: bare `node` → `exited`/0; bare `npm` → `not-started`,
`spawn npm ENOENT`. **The decision is unaffected; the reason was wrong.** The door refuses a shell
STRING and lets a bare NAME through to the OS, where a missing program surfaces as `not-started` far
from its cause and blaming the seam. So **PATH resolution goes in FRONT of the seam, in
`src/work-toolchain.mjs`**, turning that into a coded refusal naming the declaration — and the door
is left **exactly as strict as it was**, neither relaxed nor re-implemented.

**5a — The three refusal codes are DISTINCT and are named here.** `test-runner-undeclared` (no
`work.test` at all), `test-runner-declaration-invalid` (present and does not compile — a missing
`command`, a non-array `args`, a `deadlineMs` that is absent, zero or negative), and
`test-runner-unresolvable` (compiles, and `command` resolves through no PATH entry). Three
different repairs, so three codes; rendering them identically is 63/ADR-010 §7's defect.

**5b — The PATH resolver is a FOURTH derivation, knowingly.** Three exist and **all three are
module-private**: `src/terminal-providers.mjs:33` (the only one that handles `PATHEXT` correctly),
`src/tool-store.mjs:143`, `src/config-inspect.mjs:567`. Reuse is impossible without writing outside
72/00's set, and extraction would touch three modules this milestone does not own — so ~18 lines are
re-derived here and the one-home debt is ledgered (`TECH_DEBT.md` item 89) rather than paid by an
unscoped refactor. It must handle `PATHEXT`, for the reason in the Consequences below.

**6 — A deadline expiry is NEVER green.** `runBounded` distinguishes `exited` /
`deadline-expired` / `not-started`. A timed-out or unstarted run is reported as its own outcome and
exits non-zero. A run that produced a verdict exits on that verdict; a run that produced NO verdict is
a failure — 63/ADR-010 §6's rule, stated as a cause rather than a list.

**Consequences.** The command works in any repo that declares a runner and in none that does not,
which is the honest boundary — **with one platform caveat that is measured, not theoretical.** On
Windows, `npm`, `npx`, `yarn`, `pnpm` and `vitest` all ship as `.cmd` shims, and Node 22 throws
`EINVAL` on a batch file spawned without a shell; `runBounded` catches it and reports
`not-started`. Since ADR-003 and the no-shell rule both forbid handing the argv to an interpreter,
**four of the five program names FF-7201 freezes are undeclarable on Windows as bare names.** That is
the correct outcome and not a bug — a `.cmd` shim is a shell script — but it must be SAYABLE: the
`test-runner-unresolvable` message names the remedy (declare `node` plus the script the shim would
have run, not the shim), and §5b's resolver handles `PATHEXT` so the diagnosis is accurate rather
than a bare ENOENT. This repo must therefore declare its own (`work.test` in
`.aof/aof.config.json`) and teach `scripts/test.mjs` a selection argv (ADR-004 §3). Reusing
`runBounded` means the bounded-spawn seam is now shared by two families while living under one
family's directory name — a naming-vs-ownership debt, routed to `TECH_DEBT.md` item 85 rather than
either duplicated here or fixed by an unscoped re-home that would touch `59/FF-5904`'s frozen closure.

---

## ADR-002: `--scope impacted` READS the code graph and never builds it; an UNKNOWN widens the selection and never narrows it; and the result is a report, never a verdict

**Status:** Accepted
**Date:** 2026-09-02

**Context.** 72/STATE names this the milestone's open question: the existing graphify code graph, or a
changed-files heuristic. The facts: `aof graph impact` exists (`src/commands/graph-impact.mjs`, 2
dependents), it computes from edges with no LLM and no spawn, and the graph already covers 1,031
`test/` files — so `dependents(changed file) ∩ suite files` IS the affected-test set, available today.
Against that: a build is minutes even when nothing changed (1,577 files re-extracted at 22 workers on
the `unchanged: true` path), and `09/ADR-004` holds that **no graph output feeds a gate, merge,
status-write or work-mutation.**

**Decision. The graph, and it does not cross 09/ADR-004 — because selection is not a verdict.**

**1 — Read, never build — and `computeImpact` MOVES DOWN so the reuse is legal.** AMENDED
2026-09-02 at the developer pass, which measured that this clause as written reds **three shipped,
registered, currently-green controls on arrival**. `computeImpact` lives at
`src/commands/graph-impact.mjs:38`, and a `src/`-level selector importing it is:

- the edge `test/arch/acd-command-layer-imports-downward.test.mjs:63-80` forbids verbatim — no
  `src/*.mjs` may statically import `./commands/*`, exempt set `cli.mjs` + `command-core.mjs` only
  (`:39`). Its sanctioned escape hatch is `await import()` (`:27-29`), and **that door is shut**,
  because FF-7204 forbids a dynamic `import()` anywhere in 72's families;
- a module naming `normalizeGraph`/`readGraph`/`graphJsonPath` outside `GRAPH_READER_ALLOWLIST`
  (`acd-codebase-grounding-no-parse.test.mjs:47-59, 206-238`);
- a module reaching the graph by import specifier outside `GRAPH_REACHING_ALLOWLIST`
  (`acd-codebase-grounding-via-commands.test.mjs:44-55, 168-181`).

**The remedy is the one the layer gate's own failure message prescribes** (`:78-80`): *"Move the
shared thing below commands/ — the command keeps its verb, the core moves down"*, the m42 wave (d)
shape it names. `computeImpact` moves to **`src/graph-impact.mjs`** — a `src/`-level sibling of its
face, which is the tree's existing convention (`src/mesh-session.mjs` ↔ `src/commands/mesh-session.mjs`
and three more pairs) — and `src/commands/graph-impact.mjs` **re-exports it**, so
`test/graph-impact.test.mjs:7` and every other consumer is byte-unchanged. Measured blast radius:
`computeImpact` has exactly **two** importers, the command and that one suite. `matchFile`
(`src/commands/graph-impact.mjs:45`) is declared and never used and is **not carried through**.

Only `src/work-test-select.mjs` needs the two allowlists — it is the module that READS the artifact.
`src/graph-impact.mjs` needs neither: `computeImpact` takes an already-normalized graph and names no
reader symbol. `--scope impacted` therefore reads `graphify-out/graph.json` through the SAME
`normalizeGraph` + `computeImpact` the shipped command uses, authors no second graph reader, and never
invokes a build.

**1a — `suites` is a PATH PREDICATE, and registration is a REPORT.** The `∩ suites` in §2a and §3 is
*"a `*.test.mjs` file under a declared test root"* — a pure path test. It is **not** the census's
REGISTERED set, and the difference is not a performance detail. Registered membership comes from
`assembledSuite()` (`src/work-audit/census.mjs:394-430`), a child that imports 948 test modules —
measured **3.5 s** — and when that child fails the census answers
`audit-runtime-membership-unavailable` (`:478-486`, returning `registered: []`). That answer is **not
one of §3's four widening reasons**, so *"this file's dependents contain no registered suite"* and
*"I could not learn what is registered"* would render identically. **That is precisely the lie this
story exists to prevent, wearing the story's own vocabulary.** Registration stays a per-selected-file
REPORT (ADR-004 §4), never an input to selection. Selection drops from ~3.6 s to ~100 ms.

**1b — `roots` is a PARAMETER, never a config read.** FF-7201 makes `src/work-toolchain.mjs` the only
module in `src/` that may read `work.test.*`, so a selector reaching for the config would red 72/00's
control from a parallel lane. The declared roots are handed in.

**1c — The decider's inputs are INJECTED; 72/01 produces neither.** `registrationDecision` requires
`suiteNames`, a `Map<file, exported names>`, and the **only** shipped producer is an `await import()`
of each suite inside the runner's own process (`test/arch/acd-test-suite-registration.test.mjs:206-217`)
— which ADR-001 §4 and FF-7204 forbid this module from doing. `assembledSuite`'s probe returns
assembled names with **no file provenance** (ADR-004's opening says so), and `runCensus` sidesteps the
decider entirely, re-deriving text-level at `census.mjs:493-518` — the second derivation FF-7203
forbids 72 from authoring. So `src/work-test-select.mjs` **accepts `assembled` and `suiteNames` as
injected inputs and produces neither.** Provenance is 72/02's, where a spawn is available. `aof test` is an inner-loop tool; a tool that might cost minutes before
it costs seconds is not one.

**2 — Freshness is REPORTED on every run, never assumed.** Every result carries the artifact's
`builtAt`. A silently stale graph is the failure this whole step exists to prevent, and the only
defence that survives contact is making the age visible in the answer.

**2a — The selected set is `({changed file} ∪ dependents) ∩ suites` — the changed file is IN ITS OWN
selection.** AMENDED 2026-09-02 at QA's pass, which measured that the first reading defeated the
story's own value. `aof graph impact test/doctor-context-budget.test.mjs` returns
`imported/called by ← (1) scripts/test.mjs` — the RUNNER, which is not a registered suite file. So
under `dependents ∩ suites` a changed test file has an EMPTY intersection, §3's third reason
(`no-registered-dependent`) fires, and **editing one test file — the single most common inner-loop
action there is — widens to all 950 suites.** The invariant would have survived
(correct-but-slow) and the tool would not have. A changed file that is itself a registered suite is
therefore selected because it changed, not because something imports it; the union is taken FIRST and
the intersection with the registered set LAST, so a changed non-suite file still contributes only its
dependents. This is a clause about VALUE, and it narrows nothing §3 protects: a changed suite file's
own coupling is still resolved through the graph, and an unresolved one still widens.

**PRESENCE OUTRANKS THE UNION, and the order is stated because both orders pass every other row.**
A file that IS a suite by §1a's predicate but is `present: false` in the graph — **a test file created
this turn, the second-most-common inner-loop action there is** — must widen under §3, not be quietly
selected by the union. So the presence check runs FIRST and its verdict stands: union-membership never
rescues a file the graph does not cover. An implementation that tests the suite predicate before the
presence check satisfies §2a and §3 as written and is wrong, which is why the precedence is an
invariant here rather than an implementation note.

**3 — An UNKNOWN WIDENS. This is the whole invariant.** A changed file the graph reports
`present: false` — a new file, a rename, a coverage gap — has **UNKNOWN** coupling. Recording that as
"no affected tests" is precisely the mistake the grounding protocol names. So every unknown widens the
selection to `all`, and the widening is NAMED in the output (`widened: [{ file, reason }]`). The four
widening reasons, exhaustively: no graph artifact (`no-graph`); a changed file absent from the graph;
a changed file whose dependents include no registered suite; the graph unreadable. There is no flag
that suppresses a widening — a switch that lets an agent silence this is the defect, not the fix.

**4 — The result is a REPORT, and no door consumes it.** `09/ADR-004` is not crossed, and the
distinction is exact: a gate DECIDES A TRANSITION (accept, merge, status write). `aof test` decides
nothing — it runs a subset and says which. To keep that structural rather than conventional: every
result carries `gate: false` unless `scope === "all"` **and** nothing widened; no status, accept,
merge, loop or audit door invokes it (FF-7204); and the full suite at the gate is unchanged.

**5 — The changed set is the WORKING TREE by default.** `--scope impacted` defaults to uncommitted
changes (index + working tree), read through the same `runBounded` seam as everything else, with
`--since <rev>` widening the base explicitly. No default-branch inference: a worktree on a story
branch has no reliable answer, and a wrong base silently narrows — which §3 forbids.

**A `--since <rev>` that does not resolve is a REFUSAL, not a widening.** AMENDED 2026-09-02 at QA's
pass. It cannot be a fifth widening reason without contradicting §3's *"four, exhaustively"*, and it
must not read as an empty changed set — an empty changed set selects nothing, which is the maximal
silent narrowing §3 exists to forbid. It is refused because it differs in kind from the four: those
are aof failing to KNOW something about the tree, and this is the operator naming something that does
not exist. A revision the repository cannot resolve is a coded refusal (`since-rev-unresolvable`)
naming the revision — **raised before the RUNNER is launched**, which is the honest ordering: only git
can say a revision does not resolve, so the check is itself a `rev-parse --verify` child and cannot
precede "any spawn" as this clause first claimed.

**An EMPTY changed set is also a refusal** (`changed-set-empty`). A clean tree just after a commit is
one of the commonest states an agent is in, and an empty changed set selects NOTHING — the maximal
silent narrowing §3 exists to forbid — while matching none of the four widening reasons. It takes the
same treatment as an unresolvable `--since` for the same reason: it is not aof failing to know
something, it is there being nothing to select, and the honest answer names that rather than reporting
a green run over zero tests.

**The changed-set reader is NEW CODE, and this ADR prices it.** No reusable changed-files reader exists
in `src/`: `src/build-info.mjs:53,60` uses `execFileSync` directly, `src/commands/ratchet.mjs` is in
the command layer and unimportable upward (§1's gate), and `src/mesh-worktree.mjs` carries its own
private `exec`. So 72/01 authors a bounded git reader over ADR-001 §5's seam —
`status --porcelain` plus `diff --name-only` plus `rev-parse --verify`, with untracked and rename
handling — and it needs a real two-commit git fixture to prove. This is the story's second deliverable,
not a helper, and ADR-008 §3 is corrected to say so.

**Consequences.** A fresh clone with no graph runs the whole suite and says why: correct-but-slow,
never wrong-and-fast. `graphify-missing` / a build failure is the same situation as no artifact —
widen and say so — and never a fallback onto a surviving artifact from an earlier state. Test
selection becomes the first consumer of the graph in an agent's inner loop rather than only at review
time, which is a real change in the graph's role and is stated here so it is visible: **its OUTPUT
role is unchanged (advisory, never a verdict); its READ FREQUENCY rises.**

**Purity has a measured ceiling, and it is accepted.** `computeImpact` is O(paths × (nodes + edges)) —
it re-walks all 35,577 edges once per changed path. Measured against the live 17 MB artifact:
**~80 ms for one changed file, ~400 ms for fifty.** The obvious optimisation — hoist the walk, cache
the normalised graph across calls — is exactly what §2's no-cache purity clause and FF-7202's
same-process two-answers leg forbid. That is the right trade for an inner-loop tool at this size, and
the ceiling is stated so the first agent to see 400 ms knows it was priced rather than missed.

---

## ADR-003: The failures-only filter is a property of the COMMAND aof owns — aof ships NO hook that rewrites another command

**Status:** Accepted
**Date:** 2026-09-02
**Departs from:** 72/SPEC §Scope, *"Tool-output filtering at the boundary. A `PreToolUse` hook that
rewrites test/build commands to failures-only output."*

**Context.** The saving is real and worth having — Anthropic's own figure is *"reducing context from
tens of thousands of tokens to hundreds"*. The question is only where the filter lives.

**Decision. In the command, not in a rewriter.** `aof test` prints failures only by default: each
`not ok` with its assertion output, then one summary line (`selected/total`, `builtAt`, `scope`, and
each widening). `--verbose` restores the full stream. Aof ships no hook that edits another command's
argv, on any event, for any tool.

**1 — THE FILTER READS BOTH STREAMS, AND THIS IS THE CORRECTNESS TRAP, NOT AN OPTIMISATION.** Added
2026-09-02 at the 72/02 pass. This repo's runner writes `ok - <name>` to **stdout**
(`scripts/test.mjs:4539`) and `not ok - <name>` plus the stack to **stderr**
(`:4542-4543`). **A failures-only filter that reads stdout confidently prints “no failures” over a
red run.** That is not hypothetical: `src/work-grade.mjs:459-465` already carries the finding and a
captured fixture of exactly this shape — *“a stdout-only capture of a failing run is an all-green text
beside a non-zero exit”*. So the report is derived from **both streams and the exit code**, and a
green-reading report beside a non-zero exit is a CONTRADICTION reported as such, never as a pass.

**2 — The TAP reader is the one already shipped.** `normaliseTap` (`src/work-grade.mjs:137`)
and `normaliseReport` (`:262`) already parse `ok - name` / `not ok - name` and attach a
failure's diagnostic text **verbatim** to `failures[].message` — which is this ADR's “each `not ok`
with its assertion output”, already written. `src/commands/test.mjs` imports them. A second parser one
file over is the duplication species FF-7203 indicts, and §2b's declared `format` is what selects
which `normaliseReport` lane runs.

**3 — There is NO streaming, and the consequence is stated rather than discovered.** `runBounded` uses
`stdio: ["ignore", "pipe", "pipe"]`, accumulates into strings and resolves only on `close`
(`src/work-audit/spawn.mjs:166, 180-231`). So `aof test --scope all` prints nothing for the
whole run and then prints everything, and `--verbose` replays a buffer rather than restoring a live
stream. That is the honest cost of ADR-001 §5's one bounded seam, and it is accepted: an inner-loop
tool that reports at the end is worth more than a second spawn seam that streams.

**Three reasons, in order of weight.**

1. **`43/ADR-001` runs the other way.** This project's hook precedent is that the hook does the LEAST
   possible work — a derivation-free append-only enqueue; a daemon drains. A rewriting hook does the
   MOST: it changes what the operator asked for, before they see it. The measured `http` hook type was
   rejected as primary and recorded; a rewriter is a bigger departure than the one already refused.
2. **Story 87 measured what happens when a repo-specific predicate travels.** A guard whose subject
   was this repository's suite *"travelled anyway and refused their own build command, so the framework
   stopped shipping it."* A rewriter's predicate ("is this a test/build command?") is the same species
   with a wider blast radius: it would fire on every command in every installed repo, and a wrong
   rewrite is worse than a wrong refusal because the agent never learns it happened.
3. **The two proven shapes do not transform.** Exit-0 enqueue (PostToolUse) and exit-2 refuse
   (PreToolUse) are the only shapes with landed evidence here. Silent transformation has none, and a
   filter that drops output an agent needed fails INVISIBLY — the worst failure mode available.

**Consequences.** An agent that runs the raw runner by hand still gets the raw output. That is the
right trade: `aof test` is the tool that replaces the hand-written invocation, and it earns its use by
being better, not by making the alternative unusable. 72/SPEC's tool-output-filtering lever is
therefore delivered as part of the `aof test` output contract, and is not a separate deliverable.

---

## ADR-004: The runner is EXTENDED with a selection argv, ADDITIVELY — the assembled array, its terminal row and its registration digest are not touched

**Status:** Accepted
**Date:** 2026-09-02

**Context.** `scripts/test.mjs`'s exported `tests` array (`:3204`) is a FLAT list of `{ name, run }`.
Nothing in an entry records which file produced it, so selection cannot be done by filtering that
array. It sits under a control that pins the runner's SHAPE, and that control is the subject of §5.

**A correction recorded rather than fixed (QA finding, 2026-09-02).** `scripts/test.mjs:4495-4504`
still warns that appending below the array's terminal row *"BREAKS CI"* because `REG-MUT-11` drops a
spread from its residue *"only via `/^s*...[A-Za-z_$][w$]*,$/` — a TRAILING COMMA is
required"*. **That rationale is stale.** The live pattern is
`acd-loop-suite-registration.test.mjs:271`, `REGISTRATION_SPREAD = /^s*...[A-Za-z_$][w$]*,?$/u`
— the comma is **optional** — and appending above or below the terminal row was measured to leave the
residue and all four region pins unchanged. F-54-00-4 looks landed and its record was not updated.
**The RULE outlives its rationale and is unchanged: no story appends to, reorders or restructures the
assembled array.** What is corrected is only why — the hazard is §5's pins, not a comma.

**Decision.**

**1 — Selection is a SEPARATE PATH, not a filter over the static array.** `--only <file>[ <file>…]`
dynamically imports each named suite file, takes its exported `{ name, run }[]` — the same SHAPE as
`src/work-audit-probe.mjs:36-50`, **RE-IMPLEMENTED and not reused**, because that module exports
nothing and ends in `await main()` (`:78`), so importing it RUNS the probe. And the shape is
**tightened in the re-implementation**: `:38-40` tests only `typeof entry.name === "string"`, so it
admits an entry with no callable `run` — here `run` must be a function, or the file is reported
unusable rather than silently contributing zero tests — and runs it. The static array
is not read, not reordered, not restructured, and not appended to by this change.

**2 — ONE execution loop.** The per-test `AOF_GLOBAL_HOME` isolation, the `ok -` / `not ok -` printing
and the failure count (`scripts/test.mjs:4533-4549`) are extracted into one function that BOTH the
full path and `--only` call. A second copy of that loop is the duplication this milestone exists to
indict; it is also how per-test isolation quietly stops applying to the selected path.

**3 — This repo declares its own runner.** `work.test` in `.aof/aof.config.json` names
`process.execPath` + `["scripts/test.mjs"]` with `selectArgs: ["--only", "{file}"]`. aof's own
declaration is an ordinary consumer of ADR-001's declaration, not a special case.

**4 — A selected file that is NOT REGISTERED is reported, not silently run.** Green on an unregistered
suite says nothing about CI — that is `59/FF-5903`'s entire finding, at the cost of twenty-six suites.
The decider is `registrationDecision()` in `src/work-audit/census.mjs`; the report is
`aof test`'s. Neither authors a second answer (FF-7203).

**5 — `REG-MUT-11`'s pins are RE-DERIVED by 72/02, and the control joins its `files:`. No leg is
weakened.** AMENDED 2026-09-02 at QA's pass, which measured what §1 and §2 actually cost. There is
**no conforming implementation of §1 or §2 that leaves `REG-MUT-11` green**, and this ADR shipped
without saying so:

- `runnerPins` (`test/arch/acd-loop-suite-registration.test.mjs:286-307`) computes a **residue
  digest over every runner line that is not a registration import, not a spread inside the array, and
  not a comment or blank** (`:302-305`, pinned `RUNNER_RESIDUE` at `:269`). §1's argv reader is
  runner LOGIC by that definition, so **the argv reader alone moves the residue.** The control's own
  header says as much: *"Appending a labelled block changes none of them; editing the loop, the
  global-home handling, the integration lane or the cargo lane changes the digest."*
- The four `RUNNER_REGIONS` (`:263-268`) are cut from `functionBody(text, "async function runSuite(")`
  and the loop region is anchored at `suite.indexOf(RUNNER_LOOP_HEADER)` (`:291-294`). §2's
  extraction moves the loop OUT of `runSuite`, so that `indexOf` misses and the cut fails with
  `NOT FOUND — the suite loop … owns no braced body`. **A parameterised `runSuite` that keeps the
  loop header byte-identical still moves the residue**, because the extracted function's own lines are
  residue too. There is no arrangement that satisfies both.

**The sanctioned arrangement is PARAMETERISATION IN PLACE, and it is named because the alternative fails
SILENTLY.** Measured at the 72/02 pass: extracting the loop and RE-ANCHORING the cuts at the extracted
function cuts three regions correctly and **mis-cuts the fourth in silence** — the extracted body holds
no `if (previousInProcess === undefined)`, so `indexOf` returns `-1`, `-1 + 36` lands
mid-line, and `blockOrStatementAfter` hands back 30 characters of an unrelated import. A developer
who “re-derives that pin” ships a green control whose integration-lane leg measures **nothing**, and the
diff looks identical to a correct one. So the arrangement is fixed here:

> `async function runSuite(tests, { lanes = true } = {})` — parameterised **in place**, the parameter
> *named* `tests` so the loop header stays byte-identical; `--only` calls
> `runSuite(selected, { lanes: false })`; the lane gate is an early `if (!lanes) return failures;`
> **before** `console.log("# integration")`, so no lane block is re-indented.

Measured result: **all four region pins IDENTICAL** (`87795a79…`, `e000259f…`, `0de5a294…`,
`4726fd6d…`), integration-lane count 1 → 1, `../test/` specifiers 948 → 948, and `RUNNER_RESIDUE`
the **single** value that changes (70 → 113 lines).

So the control is **72/02's to re-derive**: recompute `RUNNER_RESIDUE` and nothing else, from the
runner as 72/02 leaves it. **Weaken no leg** — not the region set, not the
`residueFloor = 40` (`:309`), not the integration-lane count, not `REGISTRATION_IMPORT`/
`REGISTRATION_SPREAD`, not (11c)'s resolve-on-disk check. A pin re-derived is the control doing its
job; a leg removed to make a pin unnecessary is the control being disarmed, and this milestone would
be the fourth story to do that to a registration guard. `ADR-008 §2` names 72/02 its sole writer.

**THE REVIEW'S DISCRIMINATOR, because a re-derived pin over a mis-cut region and a deleted leg produce
the same green.** The diff of `test/arch/acd-loop-suite-registration.test.mjs` must be **exactly ONE
changed line: `:269`**. A diff that also touches a `from:` closure (`:264-267`),
`RUNNER_LOOP_HEADER` (`:261`), the plants (`:843-892`) or `syntheticSuite()`
(`:469-501`) has left the “re-derive a pin” lane for the “re-aim the instrument” lane — which is
permitted only with a **printed cut-body census**: each region's cut text, before and after, shown to
contain its named subject. Confirmed alongside: 72/02's own labelled block (2 imports, 2 spreads, below
the terminal comma-less row, commaing it) leaves the residue **byte-identical at 70 lines /
`8cd5945f…`**, so this ADR's Context correction is right at HEAD.

**6 — THE RULING ON THE `--only` BOOT COST: the fixed cost is REAL, it is this repository's runner
and not the framework, and it is priced against the right denominator rather than ruled away.**

Measured independently at the 72/02 pass and re-measured here. Importing `scripts/test.mjs` WITHOUT
running it assembles **8,401 entries** (both measurements agree exactly) and costs **3,376 ms warm /
6,520 ms cold**, resolving 8,920 specifiers — because §1 forbids restructuring the static imports at
`:1-3203`. Importing ONE suite costs **18 ms warm / 139 ms cold**
(`test/doctor-context-budget.test.mjs`, 10 entries). So `aof test --scope file <one suite>` pays
~0.6 s of aof boot and spawn **plus 3.4–6.5 s before the first assertion** — a two-orders-of-magnitude
fixed-cost regression against the hand-written script, in the narrowest and commonest case.

**Both proposed fixes are refused, and the refusals are the same refusal.** Making the runner's imports
dynamic destroys the registration model outright: `runnerImportedSuites` and `REGISTRATION_IMPORT`
(`census.mjs:348`, `acd-loop-suite-registration.test.mjs:270`) both key on the STATIC
`import { … } from "../test/…"` form, so 59/FF-5903's whole authority evaporates. A thin second entry
that dynamically imports a shared loop needs the loop to live outside `scripts/test.mjs` — which is
§5's measured mis-cut, or a second copy of the per-test isolation loop, which is exactly what §2 exists
to forbid. **Neither is worth a registration guard or an isolation guarantee.**

**And the 47× is measured against the wrong denominator.** The chore this story replaces does not cost
139 ms; it costs 139 ms **plus a model turn that writes the throwaway** — which is why the corpus holds
805 of 4,950 write events as scratchpad files and the same command re-run 33×, 31×, 30×. This
milestone's own research measures model generation at **84.1% of agent-active time** and all-tool wait
at 15.9% (72/SPEC §Objective's “one honest correction”). Trading ~5 s of wall-clock on the 15.9% side to
remove a turn from the 84.1% side is the trade this milestone was scheduled to make. **The tool does not
lose to the chore at the chore's own job, because the chore's job includes writing the chore.**

**What the ruling does NOT do is pretend the 5 s is free.** Two things follow, and both are cheap.
(a) The cost is **this repository's runner**, not `aof test` — it is TECH_DEBT item 86 (349,485 B,
948 static imports, +27% in three weeks) presenting its bill at a new counter, and the entry is extended
with this measurement rather than a new one being opened. (b) **ADR-001 §2 is already the escape hatch:**
the runner is PROJECT-DECLARED, so a repository whose runner is expensive to load may declare a cheaper
selection entry in `work.test` without any framework change at all. Doing that for aof's own tree is
not 72's work and is not blocked by 72; it is item 86's, where the restructuring belongs.

**Consequences.** `scripts/test.mjs` gains an argv reader and an extracted loop, in a region ONLY
72/02 may write, while every other story appends its own labelled block below — the sub-file
sole-writer rule 63/ADR-009 §2b already used on this file. The dynamic-import path means an
unregistered or unparseable suite fails at `aof test`, not at CI; §4 is what keeps that legible. §5
means 72/02's diff necessarily touches a control it does not otherwise own, and the re-derivation is
reviewable precisely because the instruction is "re-derive the pins, weaken no leg" rather than
"make it pass".

---

## ADR-005: The session verbs stop loading the registry, the duplicate settings blocks go, and the MERGE RULE THAT PRODUCED THEM IS NOT CHANGED

**Status:** Accepted
**Date:** 2026-09-02

**Context.** Measured above: `src/command-core.mjs` alone is 324–351 ms of `src/cli.mjs`'s 363–384 ms,
and the whole process is 0.609 s against 0.150 s for the session module alone. `aof session ping`
fires on every user turn and `aof session start`/`end` per session, and each pays the full 88-module
registry fan-out for a code path (`src/cli.mjs:117-120`) that touches none of it.

**Decision.**

**1 — `src/command-core.mjs` and `src/spine/face.mjs` leave `src/cli.mjs`'s STATIC import closure.**
Both become dynamic imports, awaited only on the paths that need the registry. `src/work.mjs` stays
static: it is 16 ms and moving it would be churn dressed as a fix. **Measured: dropping the two
imports takes `src/cli.mjs`'s static closure from 277 modules to 31.**

**There are THREE registry consumers in `src/cli.mjs`, not two.** AMENDED 2026-09-02 at the developer
pass. `helpText()` (`:584`) is REGISTRY-DERIVED and is called at `:53` and `:149` — so it becomes
`async` and both call sites await it. And the session arm hoists to the **first statement of `run()`**,
not merely above `resolveRoute`: `helpText()` at `:53` is itself a transitive registry use and sits
ABOVE the arm today (`:117`), so "above every registry use" and "above the route resolver" are
different positions and only the first is correct.

**2 — The invariant is asserted over the STATIC IMPORT CLOSURE, not over a timing.** `engines` is
`node >=20`, and `module.registerHooks` — the only exact runtime probe — landed in 22.15, so a
behavioural leg would be guard-if-present, and TECH_DEBT 36(c) already measured what a guard-if-present
gate calls green. The primary leg is a closure walk from `src/cli.mjs` and from
`src/commands/mesh-session.mjs`, following static relative imports, asserting `command-core.mjs` is
in neither — the technique `59/FF-5904` established (FF-7205). A wall-clock assertion is explicitly
NOT an invariant: it would red on a slow machine and say nothing about structure.

**3 — The three unmanaged duplicate blocks are deleted from `.claude/settings.json`, and the merge is
untouched.** They are `SessionStart` `:4-12`, `UserPromptSubmit` `:25-33`, `SessionEnd` `:46-54` —
each command-EQUIVALENT to the marked block beside it. This is **repo-local hygiene**, not a framework
change: `isAofEntry` (`src/claude-settings.mjs:169-174`) is CORRECT, and the counter-pressure is real
and decisive — *the framework must never silently delete a user's hand-authored hook.* An operator who
hand-copies an entry has expressed an intent aof cannot read, and the escape hatch `55/ADR-004`
preserved is the same mechanism keeping this repo's own unmarked `guard-test-isolation` entry alive
across every `aof work update`. **A collapse rule in the merge would delete that too.**

**4 — The ratchet is over THIS repo's file, and it is why the N+1th duplicate fails in CI rather than
needing eyes.** `.claude/settings.json` is tracked (`git ls-files` confirms). FF-7206 asserts that no
unmanaged entry in it is command-equivalent to a managed entry — a rule that is true of an operator's
DELIBERATE hook (the `Bash|PowerShell` guard at `:94-104`, which duplicates nothing) and false only of
an accidental copy. It is a repo control, and it does not travel.

**5 — Deleting the unmarked blocks SUPERSEDES a delivered criterion's PREMISE, and the supersession is
recorded here rather than discovered in CI.** RECORDED 2026-09-02; the PO took the call and this ADR
carries the reasoning. `49/07/00`'s delivered feature asserts a session recorded *"using the bare
`aof session start` invocation this repo's hand-authored settings file declares"* (`:241-246`), and
`test/bundle-claude-session-hooks.test.mjs:655-660` builds its drift reference by filtering exactly
the entries where `entry[AOF_HOOK_MARKER] == null`, then asserts `typeof handWired === "string"`.
Measured: after §3's deletion that value is `undefined` and the suite reds. **A delivered `.feature`
is immutable**, so the criterion is not edited; the TEST is code and is repaired by **pinning the
literal** `"aof session start"` as the drift reference. The two alternatives were both refused on the
record: pointing it at the MARKED entry is the bundled-vs-bundled tautology that test's own comment
forbids at `:648-652` (*"a lane that silently became bundled-vs-bundled would assert a string against
itself and detect nothing"*), and guard-if-present is indicted by ADR-005 §2 and TECH_DEBT 36(c). The
same comment already names this as *"ADR-005's expected double entry, deferred to a chore"* — 72/03 is
where that deferral is paid, which is why the supersession belongs here and not in a footnote.
53/ADR-014 is the precedent for recording a supersession rather than editing the shipped contract.

**Consequences.** `src/cli.mjs` (5 dependents) is the only `src/` module edited; nothing else in the
boot path changes. Whether the Claude Code harness de-duplicates identical blocks is not observable from
inside aof, so §3 is justified on the registration being wrong regardless of what the harness does
with it — not on a doubling this milestone cannot measure.

---

## ADR-006: What this milestone deliberately does NOT do, and where each lever went

**Status:** Accepted
**Date:** 2026-09-02

**1 — No pre-apply edit gate. Routed to `TECH_DEBT.md` item 87(a).** 72/SPEC cites SWE-agent's measured +3
SWE-bench points. Three reasons it does not transfer here yet, and the third is the decisive one.
(a) For `Edit`, the proposed content is not in the payload — it is `{ old_string, new_string }`, so
the gate must RE-DERIVE the harness's own patch application, and a derivation that disagrees blocks a
valid edit mid-turn. (b) For `Write` the content IS in the payload and `node --check` is exact and
cheap — but that is a syntax gate, and syntax errors are not the measured failure mode. (c) The
measured mode is *write-first 112, batched 10, tight fix-test loop 3, at 18.0 edits per verified run*
— an agent editing without CHECKING. The transferable lever against that is making the check cheap,
which is `aof test`. A gate that refuses bad content does not make an agent run tests.

**2 — No write-thrash blocking hook. Routed to `TECH_DEBT.md` item 87(b).** The doc half already binds at accept
(`70/ADR-007`, verified above) and the measurement already exists (`src/work-observe.mjs:274,299`,
thrash at `>= 8`). What is left is a blocking PreToolUse refusal of the Nth write to one path — and a
warn-only PreToolUse hook is invisible, so "flag" is not available; the choice is block or nothing. A
blocked legitimate 9th edit strands the agent, and the count cannot tell a thrash from a large
refactor. This is the milestone's most honest subtraction: **the SPEC's write-thrash lever is mostly
already delivered, and the residue does not justify a new class of refusal.**

**3 — The suite is not parallelised or restructured.** 72/SPEC already scopes this out; the numbers
have since grown (349,485 B, 950 suite files, 392 arch controls) and it stays out — routed to `TECH_DEBT.md` item 86, which carries the growth RATE because the rate is the finding. ADR-004 §1 is
deliberately additive so this milestone does not become that one by accident.

**4 — The framework hook-merge rule is not changed** (ADR-005 §3).

**4a — NO `/aof:test` BUNDLE WRAPPER SHIPS, and the suspension is deliberate.** This project's
standing rule is that a work command is not done until its `/aof:*` wrapper lands in
`src/bundle/commands`. FF-7204 censuses `src/bundle/**` for any invocation of this command, so a
wrapper would red the control that keeps `aof test` out of every gate — the two requirements are
in direct conflict and the control wins, because `aof test` is a developer tool an agent runs
directly, not a phase door a prompt drives. Discovery comes from `aof --help`, which a one-word
route joins automatically. **A later reviewer must not read the absence as an omission**, which is the
whole reason this clause exists.

**5 — Nothing in `src/mesh-worker-execution.mjs` is edited.** It is the tree's largest module —
**2,482 lines, 56 graph dependents, 30 imports**, and TECH_DEBT item 83 already indicts it for
exactly the one-additive-field-at-a-time accretion this milestone would otherwise continue. ADR-007's
work lands in `src/mesh-worktree.mjs` (39 dependents, **2 imports** — a high-fan-in near-leaf) or it
does not land.

---

## ADR-007: A worktree is PREPARED once through the declared program — and aof never creates a link into one, nor deletes one by filesystem call

**Status:** Accepted
**Date:** 2026-09-02

**Context.** A `git worktree` is materialised with no `node_modules`, nothing in the worker runtime
installs dependencies, and `removeWorktree(…, { force: true })`
(`src/mesh-worker-execution.mjs:1962`) discards the tree on completion — so the agent pays the install
on its own tokens, every assignment, forever. The obvious fix is the forbidden one. **TECH_DEBT item
36** records it happening TWICE in four hours: a reviewing agent junctioned `node_modules` into a
scratch worktree, `git worktree remove --force` followed the junction, emptied the real
`node_modules`, and the `node_modules/@aof/ui` workspace junction carried the delete on into `ui/` —
113 tracked files gone, plus uncommitted work across five stories, two of them already `done`. The
item's own generalised rule: *"the hazard is not `npm ci`. It is any recursive delete whose path
crosses a junction into a git-managed directory."* `package.json` declares `workspaces: ["ui"]`, so
the junction that carried it is still there.

**Decision.**

**1 — Dependencies arrive by INSTALL, never by LINK — at EVERY door, and there are FOUR.** AMENDED
2026-09-02 at QA's pass. This clause first read *"after `addWorktree` succeeds"*, which names one door
and **not the common one**. Measured at source: `src/mesh-worker-execution.mjs:1615-1617` branches
`reuseDoor ? reuseWorktreeOnBranch(…) : addWorktree(…)`, and `reuseDoor` is
`baseBranch != null || branchExists` (`:1592`) — so a **CONTINUING item takes the reuse door**, which
is the dominant dispatch. That door is not a no-op: `reuseWorktreeOnBranch`
(`src/mesh-worktree.mjs:552-588`) resolves `meshWorktreePath(projectRoot, assignmentId)`, and a
continue carries a NEW `assignmentId`, so it `git worktree add`s a **fresh, empty tree at a new
path**. Under the original wording no prepare would run on it and the agent would pay the install on
every dispatch after the first — the story's own requirement failing on the path it exists for.

So the prepare step is hung on **each of the four materialisation doors**, all of which live in
`src/mesh-worktree.mjs` and therefore inside 72/04's write set:

| door | site | lane |
| --- | --- | --- |
| `addWorktree` | `src/mesh-worktree.mjs:490` | assignment, fresh |
| `reuseWorktreeOnBranch` | `:552` | assignment, continuing — **the dominant path** |
| `addSessionWorktree` | `:528` | session |
| `addDispatchWorktree` | `:263` | dispatch |

The step runs on the tree each door RETURNS, so the rule is stated once over the returned path rather
than four times over four call sites, and a fifth door added later inherits it or fails FF-7207.
**One choke point is achievable, measured:** three of the four already funnel through the private
`runWorktreeAdd` (`src/mesh-worktree.mjs:501`), and the fourth is **argv-identical** to it —
`reuseWorktreeOnBranch`'s two forms at `:581-583` are byte-for-byte the checkout and branch forms
`runWorktreeAdd` builds at `:510-514`, the only delta being a thrown code that nothing in `src/`,
`test/` or `ui/` references. So the prepare hangs on that ONE function, not on four. aof
runs the project's declared `work.worktree.prepare` (`{ command, args, deadlineMs }`) through
ADR-001 §5's one seam, in that worktree, bounded. No declaration ⇒ no step, silently — an absent
optional declaration is not an error (but see §5).

**2 — Sharing happens OUTSIDE the tree or not at all.** A package manager's content-addressable cache
lives outside every worktree by construction, so it is declared in the prepare argv
(`npm ci --cache <shared>`) and nothing is linked in. **aof creates no symlink or junction whose path
lies inside a worktree, ever** (FF-7207).

**3 — Removal stays git-managed.** `removeWorktree` shells `git worktree remove` and is explicitly
*"NEVER a bare rm"*. No aof code path recursively deletes a worktree by filesystem call. FF-7207
carries both halves, because they are one hazard: a link nobody makes cannot be followed, and a delete
that does not recurse cannot follow one.

**4 — Failure of the prepare step is LOUD, and the half-installed tree is REMOVED rather than left to
read as ready.** A non-zero prepare exit or a deadline expiry is reported as its own coded outcome. An
agent handed a half-installed tree that reads as ready is the guard-if-present-green species
(TECH_DEBT 36c) in a new place — **and two shipped callers make that outcome the DEFAULT unless this
clause prevents it.** Measured: `src/mesh-session-spawn-handler.mjs:149` and `src/work-dispatch.mjs:212`
both key on `existsSync(<path>)` — the deliberate lost-the-race reader — so a prepare that throws
AFTER `git worktree add` created the directory leaves those callers reading a half-installed tree as
ready. Neither file is in 72/04's write set, and the fix does not need them to be: **on prepare
failure the module `git worktree remove --force`s the tree it just created, then throws.** It already
owns that verb (`src/mesh-worktree.mjs:719-728`). This trades away the retain-for-inspection artifact,
so **the prepare's stdout and stderr must ride the thrown message** — the diagnosis has to survive the
tree that carried it.

**4a — "The result reports" is an INJECTED OBSERVER, never a return-type change.** All four doors
return a bare path string and three callers outside 72/04's `files:` consume it as one, so widening the
return type would break them. The prepare's outcome is surfaced through an observer on `options` — the
module's own existing `options.exec` / `options.onLog` idiom — and every door's return value stays
byte-compatible.

**5 — A declaration that is PRESENT but MALFORMED is a REFUSAL, never a silent no-op.** §1 covers
absent (silent, no step) and §4 covers failed (loud, coded); *present and naming no `command`* was
neither, which is the gap where a typo becomes an invisible non-install. A `work.worktree.prepare`
that exists and does not compile — no `command`, a non-array `args`, a `command` that resolves
nowhere — is ADR-001 §2's coded refusal, raised at COMPILE time in `src/work-toolchain.mjs` and not
at the door. Absent and malformed are different answers and must not render identically; that is
63/ADR-010 §7's rule, and the same distinction §4 draws between supplied-and-failed and never-run.

**Consequences.** The worker's wall-clock rises by one install per worktree — **and in a milestone
about loop cost the real frequency has to be stated, not the flattering one.**
`reuseWorktreeOnBranch` FORCE-REMOVES any worktree still holding the branch before it adds
(`src/mesh-worktree.mjs:576-577`), so the previous assignment's prepared tree is destroyed to make the
new empty one. The door named "reuse" reuses the **branch**, never the install. So this is **one
install per ASSIGNMENT, on the dominant path, forever** — not one per worktree. The agent's token cost
for that install still falls to zero, and that is still worth the wall-clock; but the honest ceiling on
this lever is a constant per dispatch, and anyone reading it as amortised would be reading it wrong.
Making the install itself survive a continue is a different change, in a door this milestone is
deliberately not redesigning. FF-7207 is GREEN ON ARRIVAL over the current tree
— it is a **ratchet**, not a fix, and it owes a non-vacuity red probe (plant a link-creating call,
observe the message) exactly as `63/ADR-015 §2`'s ratchets do.

---

## ADR-008: The partition — five stories, one sole writer per module and per contended file, two stages

**Status:** Accepted
**Date:** 2026-09-02

**1 — The stories.**

| story | subject | module it owns |
| --- | --- | --- |
| 72/00 | the declared toolchain | `src/work-toolchain.mjs` (new) |
| 72/01 | the selection | `src/work-test-select.mjs` (new) |
| 72/02 | the test command's face | `src/commands/test.mjs` (new), `src/command-core.mjs`, `scripts/test.mjs`'s runner region |
| 72/03 | the cold boot | `src/cli.mjs`, `.claude/settings.json` |
| 72/04 | the prepared worktree | `src/mesh-worktree.mjs` |

**2 — Sole writers, including the contended files.**

| module / contended file | sole writer |
| --- | --- |
| `src/work-toolchain.mjs` — compiles `work.test.*` **AND `work.worktree.prepare`** — and `.aof/aof.config.json` | 72/00 |
| `src/work-test-select.mjs`, `src/graph-impact.mjs` (`computeImpact` moved down), `src/commands/graph-impact.mjs` (re-export only) | 72/01 |
| `test/arch/acd-codebase-grounding-no-parse.test.mjs`, `test/arch/acd-codebase-grounding-via-commands.test.mjs` — **allowlists += `src/work-test-select.mjs`, nothing else** (ADR-002 §1) | 72/01 |
| `src/commands/test.mjs`, `src/command-core.mjs`, `test/command-core-contract.test.mjs` | 72/02 |
| `scripts/test.mjs` — the ARGV + EXECUTION-LOOP region | 72/02 |
| `test/arch/acd-loop-suite-registration.test.mjs` — **pins RE-DERIVED, no leg weakened** (ADR-004 §5) | 72/02 |
| `scripts/test.mjs` — its own labelled suite block | every story, its own block only |
| `src/cli.mjs`, `.claude/settings.json` | 72/03 — **and 72/02 does NOT contend**: `resolveRoute` runs before every ladder branch and walks route lengths down to 1 (`migrate` and `init` are the one-word precedents), so a registered `test` needs no ladder edit |
| `src/mesh-worktree.mjs` | 72/04 |

**3 — Two stages, and stage 1 is edge-free.** `{72/00 ‖ 72/01 ‖ 72/03} → {72/02 ‖ 72/04}`. 72/00 and
72/01 share no module and no control: one compiles a declaration, the other resolves a selection.
**72/01 is NOT "a pure function over a graph and a changed-file list"** — that description was wrong
about what ADR-002 §5 requires. It has two halves: a pure selection core, and a bounded git reader it
must author from scratch because none exists to reuse (§5). Both are 72/01's, and the story is the
larger of the two.

**72/00 compiles BOTH declarations.** ADR-007 §5 puts the `work.worktree.prepare` compiler in
`src/work-toolchain.mjs`, whose sole writer is 72/00 — so 72/00's contract covers `work.test.*` **and**
`work.worktree.prepare`, or 72/04 tests a compiler nobody is contracted to build. §2's table says so. 72/03 touches neither. 72/02 composes 00 and 01; 72/04 consumes 00's
declaration and seam.

**4 — Stage 1 is edge-free at the CONTROL level too.** Every claim about the COMPOSED command lives
in FF-7204, which 72/02 owns, so no stage-1 story declares a control it cannot clear (62/ADR-013 §7's
lesson). FF-7203's subject is the selection module's reuse of the census decider, which 72/01 owns
outright.

**5 — `src/commands/` is at 94 siblings and TECH_DEBT item 78 already indicts it.** 72 adds exactly
ONE (`src/commands/test.mjs`, the 95th) and puts every line of logic in named modules outside it —
the family shape 63 used for `src/work-trigger/**`. A story that grows `src/commands/` by more than
its one face has broken this partition.

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 72 is open and is NOT admitted at accept — `aof work doctor 72`
     reports each unresolved control as `control-unresolved`, and what clears it is landing the file
     or dropping the declaration, never re-marking it `pending`.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was changed
     to make it fail, and the message observed. FF-7207 is GREEN ON ARRIVAL (a ratchet, ADR-007), so
     its probe is a planted link-creating call, not a repaired defect.

     TWO CONSTRAINTS EVERY ONE OF THESE SEVEN FILES INHERITS ON ARRIVAL, neither of them optional:
       · ZERO POSITIONAL SLICES. An unledgered file is allowed `max: 0`
         (`acd-test-suite-registration.test.mjs:370`, `POSITIONAL_SLICE_LEDGER.get(name)?.max ?? 0`),
         so every cut is structural. Gaining a ledger entry is NOT the remedy —
         `acd-loop-suite-registration.test.mjs:1050` refuses that door for exactly this class of file.
       · NO SECOND SPELLING OF THE TEST ROOTS. A control that needs them imports
         `TEST_ROOTS` (`src/work-audit/census.mjs:159`); a literal `["test", "test/arch", …]`
         is the FF-7203 species one directory over.

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in `scripts/test.mjs`'s suite registry inside its own labelled story
     block. A suite imported and not spread is not registered; that is 59/FF-5903's finding.

     DELIBERATELY NOT RESTATED, because a guard already in service walks the whole subject and would
     already fail on the breach:
       · "a suite imported and never spread is not registered" — 59/FF-5903
         (`acd-test-suite-registration`) decides by membership in the assembled array, over the whole
         tree. ADR-004 §4 names it and is discharged there.
       · "nothing in the work-audit closure imports project code, spawns outside one seam, or uses a
         shell" — 59/FF-5904 walks that family's import closure. 72's modules are NOT in it (they
         import the seam, they are not reached by it), so FF-7201 and FF-7204 carry the same species
         over THIS family; that is a new subject, not a second copy.
       · "no eighth core command declares --strict" — 59/FF-5911 asserts a CLOSED set over the
         registry, so `test` declaring one fails there rather than here.
       · "an over-budget artifact refuses acceptance" — 70/ADR-007's controls already walk it, and
         this milestone changes nothing about it (Context, correction 3).
       · "every served /api/work route is in bijection with a registered work:* command" — the
         route-coverage control is scoped to the `work:` prefix; a top-level `test:*` command is
         outside it by the same construction that excludes `graph:*`.

     ONE ROW, ONE CONTROL FILE. Seven rows name seven distinct paths, and ADR-008 §1's story set
     creates exactly those seven — a row no story creates is a declaration nobody can honour. Two
     rows land on 72/01 and two on 72/03; neither pair was merged, because they fail for different
     reasons and their red probes mutate different things, and a shared file would make one probe's
     red indistinguishable from the other's. -->

| id | invariant | enforced by (arch-test) | from |
| --- | --- | --- | --- |
| FF-7201 | **A project-declared program has ONE speller, ONE seam, and no shell.** `src/work-toolchain.mjs` is the only module in `src/` that reads `work.test.*` or `work.worktree.*`, asserted as a census of those key literals over the whole of `src/`. No program name the declaration can supply is spelled anywhere in `src/` — no `"npm"`, `"vitest"`, `"pytest"`, `"yarn"`, `"pnpm"` literal in an executable position — so a guessed default cannot exist as text; an absent declaration produces a coded refusal naming the key and NO spawn, driven over an empty config, a config missing `command`, and a `command` that resolves nowhere, each refusal carrying a distinct code. **The census SCOPE is ADR-008 §1's declared module set** — every module the partition declares, restricted to those that exist on disk when the control runs, with a non-vacuity floor of **at least one**, so a walk that resolves nothing cannot pass. That reading is fixed here because the row and 72/00's feature stated it two ways ("no module 72 adds", three modules across three stories, against "the modules this story adds", one), and under the narrow reading 72/01 and 72/02 would each have to write into 72/00's control file — which ADR-008 §2 forbids. Every child process this milestone starts comes from `runBounded`: `node:child_process` is imported by no module in that set, no module 72 adds names `exec`/`execFile`/`execSync`/`spawnSync`/`fork`, and `shell:` appears in no spawn option — the clauses `59/FF-5904` makes over the audit family, asserted here over 72's own family, which that control does not reach. The template expansion is asserted to be the ONE rule ADR-001 §3 states: `{file}` expands once per selected file and no other placeholder is honoured, driven over zero, one and three files. A `deadline-expired` or `not-started` outcome is asserted to be reported as its own outcome and to exit non-zero — never folded into a pass, driven against a stub seam returning each. `pending` | `test/arch/acd-declared-program-single-speller.test.mjs` | ADR-001 |
| FF-7202 | **An unknown WIDENS the selection and never narrows it, and the selector never builds a graph.** `src/work-test-select.mjs` spells no graphify invocation of any form — no `graph:build`, no `graphify` token, no spawn — **asserted as a TEXT CENSUS over the story's own files, in FF-7201's exact vocabulary, and NOT as a closure walk.** A closure walk reds on arrival and would be wrong twice over: `src/work-audit/census.mjs:49` imports `runBounded` from `./spawn.mjs`, which imports `node:child_process` at `spawn.mjs:34`, so the selector's static closure holds a spawn the moment it imports the decider — and ADR-002 §5 REQUIRES a real git child through that same seam anyway. The claim is that this module authors no spawn of its own, never that none is reachable from it. It reaches the artifact only through the shipped `normalizeGraph`/`computeImpact`, asserted by import and by the absence of any second `graph.json` reader or `JSON.parse` of a graph path in the family. Each of ADR-002 §3's four widening reasons is driven POSITIVELY against a planted graph: an absent artifact, a changed file the graph reports `present: false`, a changed file whose dependents include no registered suite, and an unreadable artifact — each must yield `scope: "all"` **and** a named entry in `widened[]`, and the assertion is two-sided (a widened result that selected a proper subset fails, and a non-widened result carrying an unresolved file fails). **No option suppresses a widening**, asserted over the SELECTION FUNCTION'S OWN accepted option keys — 72/01 ships a module and no command, so this row cannot reach a flag declaration and ADR-008 §4 exists precisely so no stage-1 story declares a control it cannot clear: the resolver admits no option key that suppresses, narrows or overrides a widening, driven by passing an unknown suppressing key and requiring the widening to stand. *The FLAG half of the same claim — that no `--no-widen` or `--strict-scope` is DECLARED on the command — rides FF-7204, where a command exists to declare one.* **`builtAt` is the ARTIFACT'S instant or it is `null`, and it is never a clock.** **The value is the artifact's FILE MTIME, via `graphArtifactBuiltAt` (`src/graph-normalize.mjs:44-50`, a `statSync(...).mtime`) — the artifact carries NO build-time field**: its top-level keys are `directed`, `multigraph`, `graph`, `nodes`, `links`, `hyperedges` and `built_at_commit`, and the last is a commit SHA, not an instant. Stated so nobody hunts a JSON field that does not exist. On the two widening paths where an artifact was read (a file absent from the graph, a file with no registered dependent) it is asserted present and equal to that mtime. On `no-graph` there is no file and no instant to take. On `graph-unreadable` the file EXISTS and has a perfectly good mtime, and that instant is **deliberately DISCARDED — because nothing the artifact claims is trustworthy once it does not parse**, and reporting a build time for a graph nobody could read is the confident-wrong-answer species. In both cases it is asserted **exactly `null`** and the matching `widened[]` entry is asserted to carry the reason: *no build time, and the widening says why*. The alternative is the one this row forbids in the same breath — a `new Date()` anywhere in the family fails **with comments stripped before the census** — `src/commands/graph-impact.mjs:32` holds that token inside prose explaining why it must not be used, and a control that reds on it is reading characters rather than code — which is what makes `null` the only honest value rather than a gap somebody will later fill. Selection is asserted PURE: the same changed set against two planted graphs yields two different answers in one process, so nothing is cached across calls. `pending` | `test/arch/acd-test-selection-widens-never-narrows.test.mjs` | ADR-002 |
| FF-7203 | **Which suite file contributed which entries has ONE decider, and 72 does not author a second.** `registrationDecision` and `runnerImportedSuites` are reached from the selection family by IMPORT from `src/work-audit/census.mjs`, and no module 72 adds contains a re-derivation of them: no regex over `import { … } from "….test.mjs"`, no `^\s*\.\.\.` spread matcher, no second baseline of unregistered suites. **The helper named is `runnerImportedSuites` (`census.mjs:348-355`), corrected 2026-09-02**: it produces `importedBy`, which is `registrationDecision`'s own classification input (`:218`, `:269`). `runnerBindings` and `runnerSpreadNames` (`:360-385`) belong to `runCensus`'s never-spread derivation — a different composition, and naming them here pointed the story at the wrong seam. **The reuse claim is "imports the decider and calls it with what it was given"** (ADR-002 §1c): `assembled` and `suiteNames` are asserted to be INJECTED parameters and the module is asserted to produce neither, so the claim is clearable by a module that cannot honestly produce provenance. Asserted by import AND by the absence of the equivalent literals, so a re-home that reaches only one half is caught. The unregistered-suite report is asserted to carry the decider's OWN verdict vocabulary rather than a re-phrasing, driven by planting a suite that is on disk and absent from the assembled array and requiring the reported reason to be the census's. `pending` | `test/arch/testing/acd-suite-registration-single-decider.test.mjs` | ADR-004 §4 |
| FF-7204 | **The test command REPORTS and never decides, and no test module enters the aof process.** No module under 72's families and not `src/commands/test.mjs` holds a dynamic `import()` or `require` of a path under any declared test root, and `src/commands/test.mjs` holds none either — asserted with a fresh `node -e 'import("<module>")'` process PER MODULE, which is the only probe that sees this class because every suite reaches these modules through a warmed cache. `gate: false` is asserted on every result whose scope is not `"all"` and on every `"all"` result that widened; `gate: true` is admitted only for an unwidened `all`. **No door consumes it**, and the census matches **INVOCATION SHAPES, never a raw substring** — `invoke("<id>")`, `invokeRegistered("<id>")`, a `route: ["<id>"…]` declaration, and a ladder `command === "<id>"` — built as a PURE function over supplied sources so the planted-invocation row drives without editing a real door. A raw-token census reds on arrival and the row would have been wrong on the day it landed: `test:` appears at `src/work-audit/census.mjs:104` inside prose (`npm run test:smoke:cli` in `UNREGISTERED_BASELINE`) and the bare `test` literal at `:119`, `:159`, `:326` and `:458` as the suite ROOT path — all five legitimate. **The id is `test`, not `test:` and not `work:test`**: the row's own token was corrected 2026-09-02 to match the registered id, and a `work:` id is separately excluded because both work-command controls filter on `c.id.startsWith("work:")` and would then demand a served `/api/work/test` route. The census runs over `src/commands/item-status.mjs`, `src/work-doctor.mjs`, `src/work-loop.mjs`, `src/work-audit/**` and `src/bundle/**`, so an accept, status, merge, loop or audit path cannot read a selection as a verdict — `09/ADR-004` held structurally rather than by convention. The failures-only contract is asserted over ONE object: the human face and `--json` render from the same result, `--verbose` adds passing rows and removes nothing, and a failing run's assertion text is present in both. The command declares **no `cli.launch`**, asserted from the registered command object rather than from source text. `pending` | `test/arch/acd-test-command-reports-not-decides.test.mjs` | ADR-001 §4, ADR-002 §4, ADR-003 |
| FF-7205 | **A session verb boots no registry.** `src/command-core.mjs` is absent from the STATIC import closure of `src/cli.mjs` and from that of `src/commands/mesh-session.mjs` — each closure walked recursively by following static relative imports, wherever the modules live, which is `59/FF-5904`'s technique and not a directory sweep. `src/spine/face.mjs` is absent from both for the same reason (it reaches the registry: measured 332–370 ms against `command-core`'s 324–351 ms). The session ladder arm is asserted to be positioned above every registry use in `src/cli.mjs`, and the session module's own closure is asserted to hold no dynamic `import()` of the registry either — a lazy path that awaits the registry on the hot path is the same cost with a different spelling. **No wall-clock assertion appears in this control**: a timing leg reds on a slow machine and proves nothing structural (ADR-005 §2), and its absence is asserted so the next author does not add one. **The walk is proven NON-VACUOUS, two-sided**: an absence over an empty set is free, and a closure walker with a broken resolver — a wrong path join, an unhandled `export … from`, a Windows separator — returns `∅` and passes every absence row silently. So each closure is additionally asserted to CONTAIN a module known to be in it (`src/commands/mesh-session.mjs` for `src/cli.mjs`, imported at `src/cli.mjs:30`; `src/mesh-session-store.mjs`-class members for the session module) and to exceed a size floor, and the walker is driven against a planted fixture whose expected closure is known exactly. **The SESSION half of this row is a RATCHET, green on arrival, and it is declared one** (ADR-007's own precedent): measured 2026-09-02, `src/commands/mesh-session.mjs`'s static closure is **27 modules** and already contains neither `command-core.mjs` nor `spine/face.mjs`, while `src/cli.mjs`'s is **277** and contains both. Two of the four closure rows therefore pass with no change to the tree, and they owe a PLANTED red probe — add the registry import to the session module, observe the message — not a repaired defect. `pending` | `test/arch/acd-session-verb-boots-no-registry.test.mjs` | ADR-005 §1, §2 |
| FF-7206 | **No unmanaged settings entry duplicates a managed one.** Over `.claude/settings.json`: for every entry carrying `aofManaged`, no entry **in the same event AND under the same matcher** lacking that key is command-equivalent to it — the matcher is part of the pairing, not context around it. Event-only pairing is wrong in a way this repo cannot feel and an installed one can: where aof manages an entry whose command matches an operator's hand-authored one under a DIFFERENT matcher, the two are different rules that happen to run the same program, and reddening on the operator's is exactly what ADR-005 §3 refuses. All three of this repo's pairs share `matcher: ""`, so the two spellings are indistinguishable here — which is why the rule is written from the installed case rather than from the local one — equivalence taken over the resolved invocation (`command` plus `args`, `${CLAUDE_PROJECT_DIR}` unexpanded), not over object identity, so a reformatted copy is still a copy. The control asserts the CONVERSE explicitly and drives it: a genuinely distinct unmanaged entry is ADMITTED — the `Bash\|PowerShell` guard at `.claude/settings.json:94-104` is planted-and-required-green, because an operator's own hook is the thing `55/ADR-004`'s escape hatch exists to protect and a control that reds on it would be arguing for the framework change ADR-005 §3 refuses. This is a REPO control over a tracked file, and it is asserted NOT to reach `src/claude-settings.mjs`'s merge behaviour at all. `pending` | `test/arch/acd-managed-hook-not-duplicated.test.mjs` | ADR-005 §3, §4 |
| FF-7207 | **aof creates no link into a worktree, and deletes no worktree by filesystem call.** No module in `src/` calls `symlink`, `symlinkSync`, `link`, `linkSync`, `junction`, `mklink` or `New-Item -ItemType Junction` with a target or path that resolves under a worktree root, asserted over **all THREE worktree roots** — `meshWorktreesRoot` (`src/mesh-worktree.mjs:56`), `meshSessionWorktreesRoot` (`:149`) and `meshDispatchWorktreesRoot` (`:228`) — through a **DERIVED classifier composed over** the exported `isUnderMeshWorktreesRoot` (`:439`), `isUnderMeshSessionWorktreesRoot` (`:183`) and `isUnderMeshDispatchWorktreesRoot` (`:246`) predicates rather than over a path literal — **composed, because the three shipped predicates cannot express "the root itself is not a worktree", and it was measured that they return `true` for the root**: `src/mesh-worktree.mjs:440-442` compares `resolve(root) + sep` against `resolve(candidate) + sep`, and for `candidate === root` the two strings are equal. 72/04 exports `under(root, p) && resolve(p) !== resolve(root)` and leaves all three shipped predicates **byte-unchanged** — they carry 8 `src/` callers plus an arch control pinning their import shape (`test/arch/acd-observation-census-filtered.test.mjs:113`). **The DELETE census classifies by derivation from the keyed seam, never by resolving a path**: `src/mesh-worker-execution.mjs:635` recursively deletes a path strictly under the worktrees root, in a file 72/04 may not edit, so a path-resolving census reds on shipped correct code. Asserted so a renamed root cannot evade it and the census cannot be narrower than the hazard. The session and dispatch roots hold real worktrees and carry the IDENTICAL TECH_DEBT-36 hazard; the original incident was in a scratch worktree under NONE of the three, which is the argument for deriving the predicate rather than enumerating paths. **The roots themselves are NOT inside a worktree** and the census is cut at a WORKTREE, never at a ROOT (TECH_DEBT item 88). **Both censuses are green on arrival and are therefore RATCHETS**: measured 2026-09-02, `src/` holds 10 recursive deletes of which only `:635` sits under a root, and zero link-creating calls anywhere. No worktree removal path reaches `rm`/`rmSync`/`rimraf` with `recursive: true` over a worktree path: removal is `git worktree remove`, asserted at `src/mesh-worktree.mjs:719-728` as the shape rather than as its arithmetic. The prepare step is asserted to run INSIDE the worktree, through `runBounded`, with a non-zero exit or a `deadline-expired` producing a coded loud outcome and never a silent continue — driven against a stub seam returning each, and against an absent declaration, which must produce NO spawn and NO error. **A ratchet, green on arrival** (ADR-007's consequence): its red probe plants a junction-creating call under `src/` and observes the message. `pending` | `test/arch/acd-worktree-never-linked.test.mjs` | ADR-007, TECH_DEBT 36 |

## Story partition

The landing order is **{72/00 ‖ 72/01 ‖ 72/03} → {72/02 ‖ 72/04}** — two stages, three stage-1 stories
with no edge between them, and two stage-2 stories that are parallel with each other.

- **72/00** — the declared toolchain: `src/work-toolchain.mjs` (stage 1) — FF-7201
- **72/01** — the selection: `src/work-test-select.mjs` (stage 1) — FF-7202, FF-7203
- **72/03** — the cold boot: `src/cli.mjs`, `.claude/settings.json` (stage 1) — FF-7205, FF-7206
- **72/02** — the test command's face: `src/commands/test.mjs`, `src/command-core.mjs`,
  `scripts/test.mjs`'s runner region (stage 2, needs 00 + 01) — FF-7204
- **72/04** — the prepared worktree: `src/mesh-worktree.mjs` (stage 2, needs 00) — FF-7207
