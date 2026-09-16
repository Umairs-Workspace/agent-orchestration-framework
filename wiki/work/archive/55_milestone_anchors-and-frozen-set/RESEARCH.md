---
doc: research
---
<!--
  Milestone RESEARCH.md — answers ONE question: what did we find out that we did not know?
  Owner: researcher. Measured facts with sources, never design decisions (→ ARCHITECTURE.md).
-->
# 55 · Anchors & the frozen set — Research

> **Method.** Every number and line reference below was read off this tree on **2026-08-26**, at
> commit `5038d5c`, with the code open. Graph facts come from `aof graph build .` →
> **12504 nodes / 30557 edges**, `builtAt 2026-08-26T12:53:44.452Z`, egress **none**, followed by
> `aof graph impact` on each candidate boundary. Nothing here is inferred from a document that
> describes the code; where a SPEC and the code disagree, the code is recorded.

---

## Q1 — What enforcement points does aof actually own today, and what shape does a rule take at each?

Four, and they are not equally ready.

**(a) `.claude/settings.json` hook entries — READY, and the only one with a merge discipline.**
`mergeClaudeSettings` (`src/claude-settings.mjs:161`) is a surgical, marker-based splice into a
co-authored document. aof's entries carry the marker KEY `aofManaged` (`:54`); an unmarked entry is
the operator's and is neither adopted, edited nor retracted (`isAofEntry`, `:151-153`). Retraction
reaches every event that currently holds an aof entry, not only the events the patch names
(`:216-219`), so removing a rule from the declaration removes exactly its entry. A torn file
REFUSES rather than defaulting to `{}` (`:167-180`).

**(b) `.claude/settings.json` `permissions.deny` — NOT ready, and the gap is one line.** The splice
merges the settings patch at the TOP LEVEL by spread: `const merged = { ...current, ...settingsPatch }`
(`src/claude-settings.mjs:211`), where `settingsPatch` is `config.settings.claude`
(`claudeSettingsPatch`, `:97-101`). `permissions` is a top-level key. So a frozen rule compiled into
`settings.claude.permissions` would **replace the operator's entire `permissions` object**, not merge
into it. This tree's live file carries a hand-authored `permissions.deny` of two entries and a
`sandbox.filesystem.denyRead` of two more (`.claude/settings.json:107-124`) — all four would be lost.
The hook path has a per-entry marker; the permissions path has no marker discipline at all.

**(c) Agent tool scope — READY, and already aof-owned outright.** Each bundled agent declares
`tools:` in its frontmatter (e.g. `src/bundle/agents/aof-developer.md:6` — `Read, Grep, Glob, Bash,
Edit, Write`), parsed into `resource.tools` at `src/work-bundle.mjs:110-111`. The agent files are
whole-file bundle members aof owns exclusively, so no merge is needed — the ADR-002 rule
(`src/claude-settings.mjs:10-13`) puts them squarely on the whole-file-render side.

**(d) The mesh worker envelope — READY as an argv seam.** The worker session's launch argv is built
at `src/agent-session-driver.mjs:689`:
`[...provider.buildArgs(), "--permission-mode", "auto", "--exclude-dynamic-system-prompt-sections",
"--append-system-prompt", WORKER_SESSION_INSTRUCTION]`. Deliberately `auto`, **not**
`bypassPermissions`, so a genuine tool pause still surfaces (`:669`). A compiled rule can ride this
vector; nothing today puts one there.

## Q2 — How does a compiled rule actually BLOCK, and what does the one hand-written proof look like?

**Exit 2 + stderr.** `.claude/hooks/aof/guard-test-isolation.mjs` is the repo's single hand-wired
proof that the mechanism works. Its contract, stated in its own header: *"Exit 2 => the tool call is
BLOCKED and this stderr is shown to Claude… Any other exit (0) => allowed."* Every failure path
inside it — no payload, unparseable payload, empty command — exits 0 rather than interfering
(`:15-30`). It is wired into `.claude/settings.json` `PreToolUse` on matcher `Bash|PowerShell`
(`:81-90`) **without** the `aofManaged` marker, i.e. as an operator entry that aof does not own,
derived from no declaration.

**A fresh measurement, taken while researching this milestone — twice.** The guard's `isTestRun`
predicate is three regexes over the raw command string (`guard-test-isolation.mjs:33-36`), the first
being a path match on the harness script. It matches that PATH **anywhere in the command**, with no
notion of whether the command *runs* the file or merely *mentions* it. On 2026-08-26, during this
research pass, the guard BLOCKED (a) a read-only `grep` whose argument named the harness script, and
then (b) the heredoc that was writing **this very document**, because the document quotes the
script's path in prose. Neither could execute a test; both were refused.

That is the milestone's thesis in miniature, and it cuts both ways. A rule hand-wired from no
declaration cannot state what it protects, so its only expressible form is a substring — and a
substring rule cannot distinguish running from reading from *writing about*. A rule compiled from a
declaration that names its subject can. The guard is simultaneously the proof the mechanism works
and the proof that hand-wiring it is not enough.

**Marker duplication is already visible.** The live `.claude/settings.json` carries each of the three
session hooks TWICE — once unmarked (the operator's hand-authored copy) and once carrying
`aofManaged` (`.claude/settings.json:3-68`). The merge is behaving exactly as designed; the operator
simply also hand-wrote what aof installs. It is evidence that the marker boundary holds under a real
co-authored file, not a defect.

## Q3 — Is the material for `{producing node, run, commit, timestamp}` available, and at what cost?

All four exist. None is currently stamped on a claim.

| Provenance key | Authority that exists today | Cost |
|---|---|---|
| producing node | `deriveNodeId` / `persistNodeId` (`src/node-identity.mjs:169`, `:216`), persisted in the identity sidecar | a sidecar read |
| run | `runsDir(item)` → `path.join(item.dir, "runs")` (`src/run-store.mjs:233-235`); the record is now SIXTEEN keys, the sixteenth added additively by 68/ADR-001 (`src/run-store.mjs:519-522`) | already in hand at every write site |
| commit | `headCommit(projectRoot)` (`src/mesh-worktree.mjs:345-350`) — returns `null` when unavailable rather than throwing | one `git rev-parse` |
| timestamp | injected, never read in-module — the discipline `compileGrade` already keeps (`src/work-grade.mjs:391`: *"gradedAt an INJECTED timestamp; this module reads no clock"*) | free |

**The gap, precisely.** The grade record — the arc's most claim-shaped artifact — carries `gradedAt`
and **nothing else** of the four (`src/work-grade.mjs:341-348`). It knows *when* it was compiled and
not *who* compiled it, *on what commit*, or *under which run*. `src/build-info.mjs` supplies the
deployed build stamp (`readBuildInfo`, `:89`; `buildInfoString`, `:112`) and no claim record reads it.

**Where a reading may NOT live.** The loop registry moved to `.aof/loops/` as an INSTALLED bundle
artifact in 53/ADR-012 — `src/bundle/loops/` is the single source, and a consumer's edit is
drift-warned. Nine records are delivered that way today (`src/bundle/loops/` and `.aof/loops/` hold
the same nine names). A per-workspace anchor READING written into that directory would be clobbered
or drift-warned by the next `aof work update`. Run records, by contrast, live under
`<item.dir>/runs/` — inside the work item, committed with the work, reviewed in the PR.

## Q4 — What does 52 actually leave for 55, and what has already been taken?

**Left, by name.** 52/ADR-003's tier table assigns pointer **resolution** and pointer **staleness**
to 55 explicitly, and states that they arrive additively — *"55 adds a resolver and a provenance
stamp; it does not change the pointer grammar, does not invalidate a single 52-era record, and does
not need this ADR superseded."* 52/ADR-005 §4 pre-authorises the widening: 55 widens the `ground:`
value enum, *"widens the `kind:` enum if it wants anchor nodes, and adds provenance keys"*, with
every 52-era record staying valid verbatim.

**Already taken, and this qualifies a plain reading of 52/ADR-003.** Milestone 69 shipped
**ceiling-only** pointer resolution into the loader: `ceilingAuthorityResolves` (`src/work-loops.mjs:337`)
resolves `config:` pointers against a known-key set plus the loop-bounds resolver
(`ceilingPointerResolves`, `:293-298`) and `module:` pointers by reading the file and scanning for the
export (`moduleCeilingPointerResolves`, `:326`; `sourceExports`, `:311`). So the loader is **already
impure for one field**, and 55 does not introduce resolution to a registry that has none — it
generalises a resolver that exists, to the fields that carry anchors, with the provenance 69's
narrow version never needed. Note what 69 did *not* need and 55 does: 69's resolution answers a
yes/no at validate time and is never recorded, so it required no stamp.

**The seed set 55 must widen.** `checkGrounding` (`src/work-loops-checks.mjs:163`) seeds its forward
reachability from exactly one predicate — `node.kind === "actor" && ground.kind === "enum" &&
ground.value === "exogenous"` (`:169-172`) — then floods forward over the five edge keys and
classifies each SCC as `loop-graph-grounded-exogenous-only` or `loop-graph-ungrounded-component`
(`:186-201`). The traversal is generic; **only the seed predicate is exogenous-specific.** An anchor
expressed as a NODE bearing `ground:` therefore needs no change to the flood or the SCC
decomposition (`decomposeLoopGraph`, `:118-161`, Tarjan over the same adjacency).

**Today's closed sets, verbatim.** `NODE_KINDS = frozenSet("loop", "actor")` (`src/work-loops.mjs:84`);
`GROUND_VALUES = frozenSet("exogenous")` (`:91`); `ground:` is admitted only through `scalarField`'s
`key === "ground"` branch (`:272-274`) and appears only in `ACTOR_KEYS` (`:78`), never `LOOP_KEYS`
(`:77`).

## Q5 — What exactly does the L3 unlock cost?

Three edits and one deletion, all named in advance by 53/ADR-006 §Consequences (*"widen
`LOOP_LEVELS`, empty `LOCKED_LOOP_LEVELS`, and delete FF-5305's third leg"*).

- `LOOP_LEVELS = Object.freeze(["L1", "L2"])` — `src/work-loop.mjs:20`.
- `LOCKED_LOOP_LEVELS` — `:22`, carrying `L3: { unlockedBy: 55, reason: … }`.
- The admission branch reads both: `LOOP_LEVELS.includes(level)` (`:399`), then the locked lookup
  yielding `loop-level-locked` with `unlockedBy` (`:400-405`), then `loop-level-unknown` listing
  `known` and `locked` (`:409-412`).
- The third leg of the L3-lock arch-test asserts **no `src/` module carries an executing branch keyed
  on `L3`** — a comment-stripped, token-scoped grep. Unlocking L3 necessarily makes that leg false;
  it is deleted, not weakened.

**The gate's two halves already compute.** The Loop-Ready score is a pure projection over facts
gathered at `work:doctor`'s command boundary (`src/work-doctor-loop-ready.mjs:1-3`), composing 52's
five checks by id — `COMPOSED_CHECK_IDS = ["grounding", "pairing", "reference-ownership",
"actuator-arbitration", "timescale"]` (`:14-20`) — beside four base checks (`:6-12`). A registry that
cannot be read yields `not-applicable`, not a false pass (`:73-80`).

## Q6 — Where could classification creep in ahead of raw capture?

`aof:feedback` already does the right thing **by prompt instinct, with nothing structural behind it**.
`src/bundle/commands/feedback.md:6-8` states the rule in prose — *"capture now, classify never"*,
*"must **never** stop to ask the user how or where to file it"* — and `:16-25` routes by the target's
TYPE rather than by asking. The word "never" appears three times in thirty lines, which is what a
rule looks like when the only thing holding it up is emphasis.

The CLI half exists and is thinner: `aof work feedback 04/02 --note "…" --actor qa` takes free text
and an actor, with no classification argument at all. That is the shape the rule wants; nothing
currently stops a later command from adding a `--severity` or a `--type` flag to it, and no test
would fail if one did.

## Q7 — What does the graph say about the boundaries?

`aof graph impact`, on the 2026-08-26 build:

| Module | dependents | imports | production dependents |
|---|---|---|---|
| `src/work-loops.mjs` | 18 | 3 | exactly the three `loops-*` commands |
| `src/work-loops-checks.mjs` | 8 | **0** | `src/commands/loops-validate.mjs` alone |
| `src/work-loop.mjs` | 22 | 1 | `src/commands/loop.mjs` alone |
| `src/claude-settings.mjs` | 9 | 3 | `assets-apply`, `init-update`, `work-init`, `work-update` |
| `src/work-doctor-loop-ready.mjs` | 5 | 1 | `src/commands/doctor.mjs` alone |
| `src/work-grade.mjs` | 15 | **0** | `commands/grade.mjs`, `commands/loop.mjs`, `work-doctor-rubric.mjs` |
| `src/work-bundle.mjs` | 34 | 4 | a hub — additive membership only |

Every dependent count above is dominated by **tests**, not production code: `work-loops-checks.mjs`
has eight dependents of which exactly one is production. These are four almost-disjoint module
clusters, each with a single production door — which is what makes a by-cluster partition give
genuine parallelism rather than the appearance of it.

`src/work.mjs`, the stream's god-node, is **not touched by any candidate boundary here**, exactly as
in 52.

## Sources

- `src/work-loops.mjs`, `src/work-loops-checks.mjs`, `src/work-loop.mjs`, `src/claude-settings.mjs`,
  `src/work-doctor-loop-ready.mjs`, `src/work-doctor-controls.mjs`, `src/work-grade.mjs`,
  `src/run-store.mjs`, `src/node-identity.mjs`, `src/mesh-worktree.mjs`, `src/build-info.mjs`,
  `src/agent-session-driver.mjs`, `src/work-bundle.mjs` — read 2026-08-26 at `5038d5c`.
- `.claude/settings.json`, `.claude/hooks/aof/guard-test-isolation.mjs`, `src/bundle/loops/*.md`,
  `src/bundle/agents/aof-developer.md`, `src/bundle/commands/feedback.md`.
- `52_milestone_loop-registry-and-graph/ARCHITECTURE.md` ADR-001 §3, ADR-002, ADR-003, ADR-005;
  `53_milestone_loop-artifact/ARCHITECTURE.md` ADR-004, ADR-006, ADR-007, ADR-011, ADR-012;
  `66_milestone_controls-that-run/SPEC.md`; `78_milestone_loop-execution-record/SPEC.md`.
- `aof graph build .` + `aof graph impact` — 2026-08-26T12:53:44.452Z, egress none.
