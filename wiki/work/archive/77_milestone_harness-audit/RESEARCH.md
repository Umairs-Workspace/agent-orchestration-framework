---
doc: research
---
<!--
  Milestone RESEARCH.md — answers ONE question: what did we learn that constrains the choices?
  Owner: researcher. Conditional (only if there was a real unknown to resolve). Shared by the
  milestone's stories.
  Does NOT contain: the decision the findings led to (→ ARCHITECTURE.md). Report facts; the
  architect decides what to do about them.
-->
# 77 · Harness audit — doctor for the machine, not the record — Research

## Method

`work.agents.delegation` is absent from `.aof/aof.config.json` (`grep -n "delegation" .aof/aof.config.json`
→ no match, exit 1) → **off**. Every fact below was gathered directly on this model; no `codex exec`
delegation was used. Reading only — no test suite was run; the one `aof` CLI invocation used
(`aof graph impact`) is read-only and was run under `AOF_GLOBAL_HOME=$(mktemp -d)`.

**Headline correction to the SPEC (2026-08-16).** The SPEC's premise — "not one [doctor code] is about
the machine that produces the record" and the implied "nothing here exists yet" — is stale. Milestone
59 shipped `aof work audit` as a real, registered, three-lane command with doctor's exact finding shape
plus two addressing keys, and milestones 68–71 + chores 75/76 closed **five of the eight** examples the
SPEC's own cost table cites as 77's justification. What is actually left is narrower than the SPEC
describes, and it is enumerated per rule in Q2.

## Q1 — What does `aof work audit` cover today?

**It is delivered.** `src/commands/audit.mjs:116-288` registers `work:audit` on the CLI spine
(`route: ["work", "audit"]`, `src/commands/audit.mjs:177`) with `--json`/`--strict`, and its finding
envelope is doctor's four keys (`code, severity, path, message`) plus two addressing keys
(`about, to`) — `AUDIT_ENVELOPE_KEYS`, `src/work-audit/report.mjs:77`. **77's scope line "a registered
command on the CLI spine, with doctor's finding shape" is already delivered**, not a gap 77 needs to
fill.

**Three lanes**, one registry (`REPORT_LANES`, `src/work-audit/report.mjs:396-431`):

| lane id | subject | scoped | finding codes |
|---|---|---|---|
| `instrument-census` | which suites CI actually assembles (membership, not text) | no (repo-wide) | `AUDIT_FINDING_CODES` — 6 codes, `src/work-audit/census.mjs:76-83` |
| `evidence-re-run` | re-executes every fitness-register row's cited control | yes (item) | `EVIDENCE_FINDING_CODES` — 12 codes, `src/work-audit/evidence.mjs:101-114` |
| `registry-checks` | anchor freshness / instrument silence / metric movement / loop consultation over the loop registry | no (repo-wide) | `AUDIT_LANE_FINDING_CODES` — 6 codes, `src/work-loops-checks.mjs:914-921` |

Plus the face's own two codes (`AUDIT_FACE_CODES`, `src/work-audit/report.mjs:85-88`:
`audit-escalation-undeclared`, `audit-auditor-not-unique`) — 26 finding codes total today, all disjoint
from doctor's `CONTROL_FINDING_CODES` by construction (FF-5905).

**Scope semantics** — `matchesScope`/`runAudit`, `src/work-audit/report.mjs:530-576`: an item scope
resolves against **every** item on disk (`population`), not only the register-bearing subset
(`items`) — a real item with no `ARCHITECTURE.md` register renders "declares no register" rather than
byte-identical to "matched nothing" (this exact conflation was a measured review finding, cited in the
module's own header, `census.mjs`/`report.mjs` comments).

**`--strict` exit rule** — `src/commands/audit.mjs:280-286`: `run()` always returns the full finding
set; `--strict` changes only the exit code (1 iff an `error`-severity finding exists). Without
`--strict` the command always exits 0, even carrying errors — deliberately off the frozen five-row cost
ladder (ADR-007 §1, cited in the file header) so a command that reddened every build by merely running
would be a sixth ladder rung by the back door.

**The extension seam, and its freezes.** A new rule family is a new entry in `REPORT_LANES`
(`src/work-audit/report.mjs:396`), each with its own `run` function returning `{findings, reads,
limits}`. Two structural freezes constrain it:

1. **FF-5904** (`test/arch/acd-audit-never-imports-project-code.test.mjs`) — no module under
   `src/work-audit/` may hold a dynamic `import()`, a `require`, or a static import of a path outside
   `src/`. Every child process the family starts must go through the one seam,
   `src/work-audit/spawn.mjs:137` (`runBounded`) — argument vector only, never a shell string
   (`SHELL_SHAPED`, `spawn.mjs:82`), always a deadline (`DEFAULT_DEADLINE_MS = 60_000`, `spawn.mjs:43`).
   **TECH_DEBT item 70** (`wiki/work/TECH_DEBT.md:3625-3658`, status open, medium) records that the
   freeze's family sweep is a directory walk plus "any import resolving under `src/`" — so a family
   module can statically import a sibling *outside* `src/work-audit/` that itself holds a dynamic
   import, defeating the freeze one directory level out; the closure half of the fix landed at 59/01,
   the enumeration half (a `.mjs` path the closure names but that resolves outside `src/`) has "a hole
   one directory wide" per the 59/02 status note.
2. **The `work-audit-probe.mjs` spawn seam** (`src/work-audit-probe.mjs`, whole file) — the one place
   that actually evaluates a runner's module graph (`await import(pathToFileURL(runner).href)`,
   `:62`), deliberately living *beside* `src/work-audit/` rather than inside it, because its whole job
   (a dynamic import of a path outside `src/`) is exactly what FF-5904 forbids for the family. A new
   rule that needs to evaluate a project module follows this precedent (a named, enumerated, spawned
   PROGRAM) rather than adding a second loader inside the family.

A fourth lane must supply its own `run`, `reads` (with a declared floor, `assertLaneRead`,
`report.mjs:453-469`) and any `limits` (`assertLaneLimits`, `report.mjs:444-451`) — a lane that returns
no read record is a programming error the registry refuses rather than degrades into a silent clean
pass (ADR-004 §1).

## Q2 — For each of 77's eight proposed rules, does its subject still exist?

### `agent-capability-gap` — SUBJECT-CHANGED

Every agent's `tools:` line (`grep -n "^tools:" src/bundle/agents/*.md`):

| agent | tools | notes |
|---|---|---|
| `aof-architect` | Read, Grep, Glob, Bash, Write, Edit | |
| `aof-compliance` | Read, Grep, Glob, WebSearch, WebFetch, Write | no Bash/Edit — prose says "you NEVER edit implementation or tests" (`aof-compliance.md:20`) |
| `aof-designer` | Read, Grep, Glob, Write, Edit, WebSearch, WebFetch | no Bash — prose says so explicitly, see below |
| `aof-developer` | Read, Grep, Glob, Bash, Edit, Write | |
| `aof-product-owner` | Read, Grep, Glob, Write, Edit, AskUserQuestion | **no Bash** |
| `aof-qa` | Read, Grep, Glob, Bash, Write, Edit | |
| `aof-researcher` | Read, Grep, Glob, Bash, WebSearch, WebFetch, Write | |
| `aof-security` | Read, Grep, Glob, Bash, WebSearch, WebFetch, Write, Edit | |

**Two of the SPEC's three named examples are CLOSED:**

1. **QA-told-to-Edit — closed by chore 76** (`wiki/work/76_chore_reviewer-edit-grant/CHORE.md`, done
   2026-08-17). `aof-qa.md:5` and `aof-product-owner.md:5` now both grant `Edit`; `aof-designer` was
   also granted `Edit` at execution (decided, not swept in — `CHORE.md:99-106`) for its authoring
   lane (`DESIGN.md`, 90–176 KB in five recent milestones), with its structural read-only guard
   (`Bash` absence) untouched. `aof-compliance` was explicitly **declined** (zero measured cost — no
   `COMPLIANCE.md` exists anywhere in the corpus; `CHORE.md:108-112`), a recorded decision rather than
   an oversight.
2. **"The designer told to judge a render it cannot produce" — was never actually true, and is now
   explicitly documented as false.** `aof-designer.md:16,20`: *"you `Read` the screenshot… You are
   **read-only**… (Your `tools` list has no `Bash`; you are structurally read-only — you cannot run
   them.)"* `src/bundle/commands/verify.md:94-106` fully wires the hand-off milestone 71 built: a
   **renderability precondition** (base URL + renderer resolution, evaluated before any spawn), an
   orchestrator-driven render step, then "Hand off to the designer… Do NOT instruct the designer to run
   the browser itself" (`verify.md:104`). This closes the RESEARCH-agent-loop-economics.md finding that
   `continue.md`/`verify.md` "both mandate `npx playwright screenshot`" with no renderability
   precondition (§ "The design lane cannot succeed on this machine").

**One example is STILL LIVE.** `RESEARCH-agent-loop-economics.md:255-256` (77's own cited origin):
*"The PO is told to run a shell command it has no shell for. `refine.md:106-108` orders the PO to run
`aof work memory recall … --block`; `aof-product-owner.md:6` grants no `Bash`."* Re-measured today:
`src/bundle/commands/refine.md:102-109` still reads *"the **PO**, before the break-down, runs a recall
keyed to the milestone's domain — `aof work memory recall "<milestone objective keywords>" --item <ref>
--block`"* and `aof-product-owner.md:5`'s tool list still has no `Bash`. Neither chore 75
(`lifecycle-prompt-corrections` — a `continue.md` status-ordering fix, unrelated) nor chore 76 (the
`Edit` grant) touched this. Note: this repo's own config plays the PO role **inline**
(`.aof/aof.config.json:7`: `"work.agents.productOwner": "inline"`), which routes the recall through the
main session's own `Bash` — the gap is live only when a project sets `productOwner: "agent"` and the
PO is a real spawned subagent, which the agent's own description (`aof-product-owner.md:4`) names as a
supported configuration.

### `spawn-uncapped` — SUBJECT-CHANGED, SPEC claim now FALSE

The actual argv reaching the runtime, `resolveInteractiveDriverLaunch`,
`src/agent-session-driver.mjs:742-807`:

```
[...provider.buildArgs(), "--permission-mode", "auto", "--exclude-dynamic-system-prompt-sections",
 "--append-system-prompt", WORKER_SESSION_INSTRUCTION]
```
+ conditionally `--model <session.model>` (`:800`), `--effort <session.effort>` (`:801`),
`--resume <resumeSessionId>` (`:806`).

**The SPEC's claim — "today the argv is `--permission-mode auto --append-system-prompt <…>` and
nothing else" — is false as of milestone 70.** `--exclude-dynamic-system-prompt-sections` (cache
stability), `--model` and `--effort` (milestone 70 / story 01, ADR-005 — "CHOSEN, not inherited… so
the cache key is a decision rather than whatever the session happened to default to",
`:793-798`) are all present. `ENABLE_PROMPT_CACHING_1H = "1"` is also set on the spawned env
(`:844`, milestone 70/ADR-005 — offsets the 5-minute cache TTL usage-credit accounts get by default).

**What is NOT present, and why — measured by milestone 69, not assumed.** 69's own SPEC line
("`--max-turns` and `--max-budget-usd` where the spawn path supports them") did not survive its own
refine: `wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md:49-62` records *"the spawn path supports
neither"*, measured against `claude 2.1.233`: `--max-turns` doesn't appear in `claude --help` at all;
`--max-budget-usd` "only works with `--print`", and `-p`/`--print`/`--output-format` are themselves
forbidden in the worker launch by a shipped fitness function (it "cannot pause for a human"). ADR-004
(`ARCHITECTURE.md:234-241`) makes enforcement **out-of-process** instead (the four deadlines / progress
ledger / heartbeat of 69's own scope) and this negative space is itself now gated:

- **FF-6905** (`wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md:607`, test
  `test/arch/acd-worker-driver-no-headless-print.test.mjs`, extended): *"No `--max-turns`,
  `--max-budget-usd`, `-p`, `--print` or `--output-format` argv is constructed for the `claude` driver
  anywhere in `src/**`."*

So `spawn-uncapped`'s literal subject ("what flags reach the spawned runtime") is **already a green
CI gate**, not an open finding — 77 would be re-deriving FF-6905 under a new name.

### `cache-prefix-unstable` — SUBJECT-CHANGED, SPEC claim now FALSE

**Worktree-per-story is still in force** — `src/work-dispatch.mjs:10,19,184` (branch-per-item,
`git worktree add`), and `src/agent-session-driver.mjs:779-782` still reasons from it: *"a dispatch
that mints one worktree per story is cold against every other story by construction."* **But the
SPEC's premise ("no `--exclude-dynamic-system-prompt-sections`") is false**: the flag is passed on
every attended launch (`agent-session-driver.mjs:792`, quoted above), landed by milestone 70 / story 01
(ADR-004). It is gated: **FF-7004** (`wiki/work/70_milestone_warm-start/VERIFICATION.md:135,142,158`,
`test/arch/acd-worker-driver-no-headless-print.test.mjs`, the 70-series extension) asserts the pairing
rule directly — the flag is *"silently inert under `--system-prompt`"* and must travel with
`--append-system-prompt`, which it does. So the specific mechanism the rule's message names
("worktree-per-story AND no exclude-flag") no longer both hold — only the first half is still true, and
the second half is now a green gate rather than an absence.

### `prompt-config-unsatisfiable` — SUBJECT-GONE (flagship example); general check found nothing else live

**`work.ui.baseUrl` is now a declared schema key.** `schemas/aof.schema.json:403-419` declares
`work.ui` (`baseUrl`, `renderer`, `a11y.level`) with `additionalProperties: false` inside the object —
`baseUrl`'s description even cross-references the design-conformance renderer path milestone 71 added
(`renderer`, ADR-005). The prompt handles absence explicitly: `verify.md:12,15` — *"`work.ui.baseUrl`
(may be absent — ACD never boots the app; the project serves it)"* — and the renderability precondition
(`verify.md:100`) turns a missing base URL into a stated `INCONCLUSIVE`, never a guaranteed one. This
repo's own `.aof/aof.config.json` genuinely has no `work.ui` block (`grep -n '"ui"' .aof/aof.config.json`
→ no match) and that is now handled, not fatal.

**A bounded re-check for other instances found none live.** Extracted every `work\.<key>` reference
from `src/bundle/commands/*.md` + `src/bundle/agents/*.md` (`grep -rhoE 'work\.[a-zA-Z][a-zA-Z0-9_.]*'`)
and cross-checked each against `schemas/aof.schema.json` and a `src/` resolver:
`work.loop.buildNoProgressRounds`/`reviewRounds` (resolved in `src/loop-bounds.mjs`, `src/work-loop.mjs`),
`work.observability.enabled` (`src/work-observe.mjs`, `src/commands/observe.mjs`) and
`work.codeReview.autoComplete` (no `src/` resolver — read directly by the prompt via `Read`, but
genuinely **set** in this repo's own config, `.aof/aof.config.json:10-12`: `"codeReview": {"autoComplete":
false}`, and the prompt states its own default — `code-review.md:13`, `"(default …"`) are all
satisfiable. The schema itself is not exhaustively closed at every level (`additionalProperties: true`
recurs through `schemas/aof.schema.json`), so "absent from the schema" is not by itself equivalent to
"unsatisfiable" — a stricter rule (referenced by a prompt with no absence-handling AND no default
anywhere in `src/`) found zero live instances in this bounded sweep.

### `seam-unwired` — SUBJECT-CHANGED (both original examples fixed); a general census finds at least one live case, cheaply

**Both of the SPEC's two named examples are fixed, by milestone 69:**
- `run-store.heartbeat()` (`src/run-store.mjs:1002`) now has two production callers:
  `src/mesh-park-resume.mjs:77` and `src/run-heartbeat-consumption.mjs:54` (69/story 01,
  "heartbeat by consumption" — FF-6903, `wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md:605`:
  *"Liveness is consumed, never pinged."*).
- `dispatchReadySet` (`src/work-dispatch.mjs`) now has a production caller:
  `src/commands/dispatch.mjs:110` (69/story 04, "slots before work" — the CLI door for
  `aof work dispatch`).

**A cheap, repeatable method for "how many are still uncalled" — file-level, via the built graph, not
an exhaustive symbol census.** `AOF_GLOBAL_HOME=$(mktemp -d) aof work graph impact <all 148
src/*.mjs files> --json`, then filtered for `present && dependents.length === 0`: **3 of 148** top-level
`src/` files. One is a false positive of the graph's own static-import scope — `src/work-audit-probe.mjs`
is *deliberately* import-free (spawned only, per its own header, `src/work-audit-probe.mjs:12-20`,
enforced by FF-5904). One is a graph blind spot, not a real gap — `src/scaffold.mjs` IS called, via a
dynamic `await import("../scaffold.mjs")` at `src/commands/assets-add.mjs:33`, which the static-import
graph does not trace. **One is a genuine, currently-uncalled export**: `src/sync.mjs:8`
(`export async function createSyncPlan`) — `grep -rn "createSyncPlan("` across the repo finds only its
own declaration; no `src/` caller, no dynamic-import reference, and the graph independently reports
zero dependents. This is the method 77 would generalise (file-level `graph impact` zero-dependents,
narrowed by a spawn/dynamic-import allowlist for the two known false-positive shapes), not a claim that
`sync.mjs` is the only live instance — a full symbol-level census (every export, not every file) was
out of this research's bounded budget.

### `loop-ceiling-uncapped` — SUBJECT-LIVE at the code level; PARTIALLY GATED since milestone 69

**Confirmed to exist**, but not at `:299` any more — the SPEC's line citation is stale.
`"loop-ceiling-uncapped"` is declared in the checks leaf's frozen code list at
`src/work-loops.mjs:245` and emitted at `src/work-loops.mjs:696`:
```js
if (key === "ceiling" && entries[0]?.kind === "uncapped") {
  return [finding("loop-ceiling-uncapped", "warn", recordPath, "ceiling is declared uncapped", { key })];
}
```
Severity is `warn`; the emitter is `fieldHonestyFindings`, driven by `aof work loops validate` — it
still gates nothing by itself, matching STATE.md's note.

**But milestone 69 shipped a separate, hard-coded gate over the same fact for the framework's own
registry**: **FF-6902** (`test/arch/acd-no-uncapped-framework-loop.test.mjs`), which loads
`src/bundle`'s loop model and asserts (`:14-21`) no `loop`-kind node's `ceiling` field is `uncapped` or
`unknown`, plus that every `config:`-scheme ceiling pointer resolves to a real callable resolver
(`LOOP_BOUND_CONFIG_RESOLVERS`, `src/loop-bounds.mjs`). This closes the STATE.md thesis ("the framework
has been telling itself the build loop is uncapped… into a channel nobody reads") **for this repo's own
`.aof/loops/*.md` registry specifically** — but it is a bespoke arch test asserting over `model.nodes`
directly, not a wiring of the `loop-ceiling-uncapped` finding itself into any `--strict` gate, and it
says nothing about a downstream **project's** loop registry (a different repo's `wiki/work/loops/*.md`)
running `aof work loops validate` today. 77's "bring it under audit and give it teeth" is therefore
still meaningful for the general case, narrower than STATE.md describes.

### `instruction-duplicated` — SUBJECT-LIVE

Four logical copies of the graph-grounding instruction block, confirmed at current line ranges (bytes
measured on the block content only, UTF-8):

| file | lines | bytes |
|---|---|---:|
| `src/bundle/commands/refine.md` | 123-144 | 2,217 |
| `src/bundle/commands/code-review.md` | 38-49 | 1,204 |
| `src/bundle/agents/aof-architect.md` | 57-94 (`<codebase-graph-grounding>`…`</codebase-graph-grounding>`) | 3,472 |
| `src/bundle/agents/aof-developer.md` | 28-46 (`<orientation>`…) | 1,509 |
| **total** | | **8,402** |

(`RESEARCH-agent-loop-economics.md:257-259` measured 10,031 B at an earlier point in these files' life
— the content has since shifted with graph-related edits; the duplication itself has not been reduced.)
Each of these four is also rendered **1:1 into `.claude/`, `.codex/` and `.opencode/`**
(`grep -rl` for a line from each block across the three render trees: `.claude/agents/aof-architect.md`,
`.claude/agents/aof-developer.md`, `.claude/commands/aof/code-review.md`, `.claude/commands/aof/refine.md`,
and the matching `.codex/agents/*`, `.codex/skills/aof-{code-review,refine}/SKILL.md`,
`.opencode/agents/*`, `.opencode/commands/aof/*`) — 4 logical sources × 3 render targets = 12 physical
on-disk copies, none of which any existing test deduplicates:
`test/arch/acd-codebase-grounding-via-commands.test.mjs` (currently modified on this branch, per `git
status`) asserts the graph is reached **only** through the registered `aof graph` commands (a spawn-site
freeze, `SEAMS`/`GRAPH_REACHING_ALLOWLIST`, `:32-59`) — it says nothing about the prose being repeated.
No arch test asserts these four blocks are byte-identical to one canonical source, or that they exist
in only one place.

### `hook-duplicated` — SUBJECT-LIVE, and measured live in this repo's own `.claude/settings.json`

Three genuine, identical-matcher duplicate pairs exist in `.claude/settings.json` today
(`.claude/settings.json:3-23,24-44,45-65`): `SessionStart`, `UserPromptSubmit` and `SessionEnd` each
carry **two** groups with `matcher: ""` running the **same** command (`"aof session start"` /
`"aof session ping"` / `"aof session end"` respectively) — one entry with no `aofManaged` key
(`:4-11`, `:25-32`, `:46-53`) and one with `"aofManaged": "claude-session-start"` /
`"claude-session-prompt-ping"` / `"claude-session-end"` (`:13-22`, `:34-43`, `:55-64`). `.claude/settings.local.json`
carries no hooks (only `permissions.allow`/`enabledPlugins`), so this is not an override artifact.

**Root cause, and why it is self-perpetuating rather than a one-off.** The bundle's canonical
declaration (`src/bundle/hooks/claude-session-start.json`) carries no `aofManaged` key — it is stamped
on at write time by `markedEntry()` (`src/claude-settings.mjs:125-139`). The merge
(`spliceSettings`, `src/claude-settings.mjs:254-319`) recognises **only** entries carrying the marker
key as its own (`isAofEntry`, `:172-174`); a hook group whose entries lack the marker is treated as an
**operator's**, "untouched, by reference — position preserved" (`:285`). So a legacy, pre-marker copy of
`aof session start` written before this scheme existed is now permanently indistinguishable from a
hand-authored operator hook, and `aof work update`/`work init` will keep adding its own freshly-marked
copy alongside it forever rather than either recognising or retracting the stale one — this is not
transient drift, it is a structural blind spot in the merge's own recognition rule. Effect: three real
processes (`aof session start`, `aof session ping`, `aof session end`) each spawn **twice** per event —
`ping` on every `UserPromptSubmit`, i.e. every turn.

## Q3 — the baselines corpus

`wiki/reference/` does not exist. **The existing precedent is `wiki/planning/`** (11 files:
`PRD-*.md`, `RESEARCH-agent-loop-economics.md`, `FINDING-acd-executable-gate.md`) — plain markdown, no
`type:`/lifecycle frontmatter, sitting as a sibling of `wiki/work/`. `wiki/templates/` is a second
sibling (record-doc templates, also outside the work stream).

**The work-stream index scan is bounded to `work.dir`, not `wiki/` at large.** `.aof/aof.config.json:5`:
`"work.dir": "./wiki/work"`. `listItems(workDir)` (`src/work.mjs:321-352`) reads only the immediate
children of `workDir` (`readDirSafe(workDir)`, one level, plus one level of `stories/` under a
milestone) and matches folder names against `ITEM_RE` (`NN_type_slug`); every consumer this research
found (`aof work list`, `aof work audit`'s `registerItems`, `aof work validate`) resolves its population
through this same `listItems`/`work.dir` root. `wiki/reference/` would sit as a **sibling** of
`wiki/work`, exactly like `wiki/planning/` and `wiki/templates/` already do — outside the walk entirely,
never a candidate folder name to match `ITEM_RE` even if it were inside. **Nothing breaks**: no index
scan, no `aof work list`, no `aof work validate` reaches it, by the same mechanism that already keeps
`wiki/planning/`'s eleven free-form documents invisible to the work stream today.

## Q4 — overlap with what's already shipped

**Doctor.** `CONTROL_FINDING_CODES` (`src/work-doctor-controls.mjs:64-73`, 8 of the ~34) and every other
doctor code family are disjoint from audit's by construction — FF-5905 (cited in `census.mjs:74`,
`evidence.mjs:99`) refuses a shared code between the two commands. None of the doctor codes sampled
overlap 77's 8 proposed names. (The exact "34" was not independently re-counted in this pass — doctor's
codes are spread across several files rather than one array, and re-deriving the count was not load-
bearing for this milestone's scope question.)

**`aof work loops validate` / loop registry.** Direct overlap on **`loop-ceiling-uncapped`**, detailed
in Q2 above — the code exists there today (`src/work-loops.mjs:696`) and FF-6902 already gates the
framework's own registry.

**Milestone 62 (`aof work tune`) is a different corpus, not an overlap.** `src/work-tune/corpus.mjs:1-36`
joins three **internal** lanes — retrospective lessons, run lineage, observation readings
(`CORPUS_LANES`, `:32-36`) — i.e. this project's own history. It has no notion of an external vendor
baseline with a source URL and a `checked:` date, which is 77's `harness-baselines.md` proposal. Adjacent
territory (both are "tune the harness from evidence"), zero code/subject overlap.

**`test/arch/` — direct, already-shipped overlaps found for two of the eight rules:**
- `spawn-uncapped` ↔ **FF-6905**, `test/arch/acd-worker-driver-no-headless-print.test.mjs` (extended by
  69/02) — asserts no `--max-turns`/`--max-budget-usd`/`-p`/`--print`/`--output-format` argv anywhere in
  `src/**`.
- `cache-prefix-unstable`'s exclude-flag half ↔ **FF-7004**, the same test file (extended again by 70/01)
  — asserts the flag/`--append-system-prompt` pairing rule.
- `loop-ceiling-uncapped` ↔ **FF-6902**, `test/arch/acd-no-uncapped-framework-loop.test.mjs` — as above,
  scoped to `src/bundle`'s own registry.

**No existing arch test found for:** `agent-capability-gap` (general form — the two closed instances
were fixed by hand via chore 76's checklist, not by a gate that would catch a *new* one), `seam-unwired`
(general form — several **narrow, one-off** instances of the same shape exist, e.g.
`test/arch/acd-assignment-state-has-producer.test.mjs` — "every value in a state enum maps to exactly
one named producer" — and `test/arch/acd-session-spawn-ack-has-reader.test.mjs`, but no general
exported-symbol-liveness sweep), `prompt-config-unsatisfiable`, `instruction-duplicated`, or
`hook-duplicated`. These five (plus the residual, general form of `agent-capability-gap` and
`seam-unwired`) are where 77 would add net-new coverage rather than re-deriving something already green.
