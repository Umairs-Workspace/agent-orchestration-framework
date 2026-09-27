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
# 77 · Harness audit — doctor for the machine, not the record — Architecture

## Context this milestone inherits

Every figure below was measured at HEAD on 2026-09-03. The codebase graph was rebuilt at this
decision point over the project root with no `--backend`: **14,732 nodes / 35,911 edges, egress
`none`, `builtAt 2026-09-03T02:46:14.389Z`**. All coupling below is `aof graph impact`,
deterministic from the graph's edges, and is stated as ACTUAL rather than inferred; where it is
inferred, it says so.

`RESEARCH.md` (2026-09-03) is this milestone's ground truth and supersedes several SPEC claims. Four
further corrections were measured at this pass and are recorded here because two of them change a
decision.

**1 — `aof work audit` EXISTS.** Milestone 59 shipped it: `work:audit` on the CLI spine
(`src/commands/audit.mjs:116-288`), doctor's finding envelope plus two addressing keys
(`AUDIT_ENVELOPE_KEYS`, `src/work-audit/report.mjs:77`), three lanes and 26 finding codes. 77's SPEC
line *"a registered command on the CLI spine, with doctor's finding shape"* is DELIVERED. 77 is a
**rule-family addition to an existing lane registry** and nothing else — and `report.mjs:384-388`
already says so in a comment addressed to this milestone by name.

**2 — The SPEC's loop-registry path is WRONG and is corrected here.** Loop records live in
`.aof/loops/*.md`, installed from `src/bundle/loops/`, carrying `controlled:` / `measurement:` /
`actuator:` / `ceiling:` frontmatter, with `ceiling:` `config:` pointers resolved through
`LOOP_BOUND_CONFIG_RESOLVERS` (`src/loop-bounds.mjs`). The SPEC's `wiki/work/loops/*.md` names
nothing. This correction is load-bearing: `wiki/work/loops/` would be inside `work.dir`
(`.aof/aof.config.json:5` → `./wiki/work`) and `.aof/loops/` is not.

**3 — THE HOOK DUPLICATES ARE ALREADY GONE, and this is a NEW fact since `RESEARCH.md`.** Measured
at HEAD by enumerating `.claude/settings.json`'s hook groups: **six entries, five carrying
`aofManaged`, one unmanaged — the operator's `guard-test-isolation` PreToolUse guard under matcher
`Bash|PowerShell`. Zero duplicate pairs.** `RESEARCH.md`'s three live pairs were deleted by 72/03,
exactly as `72/ADR-005 §3` said they would be. The repair-inside-77 decision was taken against a
population of three; the population is now zero. ADR-005 is where that leads.

**4 — `scripts/` DOES NOT TRAVEL, and `src/` does.** `scripts/install-local.mjs:243` copies
`src/` recursively into the payload and nothing else of the source tree; the live payload at
`~/.aof/bin/` holds `src/`, `bundle`, `ui`, `node_modules`, `package.json` and **no `scripts/`
directory**. So `src/work-audit-probe.mjs` travels and `scripts/drive-control.mjs` does not. This
falsifies half of TECH_DEBT item 72's own prescribed fix and ADR-002 carries the consequence.

### The extension seam, and the three freezes that constrain it

A new rule family is a new entry in `REPORT_LANES` (`src/work-audit/report.mjs:396-431`), each
supplying `run` and returning `{findings, reads, limits}`. Measured constraints:

- **`assertLaneRead` (`report.mjs:453-469`) + `sweepDeclarationProblems` (`reads.mjs:44-77`)** — a
  lane returning no read record is REFUSED, not degraded; every sweep declares `id`, `root`, `what`,
  `basis` ∈ {`disk`,`text`,`runtime`} and a **`floor > 0`** (a default floor is explicitly refused).
  A below-floor read is `audit-ran-on-nothing` at **error** (`reads.mjs:152-159`).
- **`assertLaneLimits` (`report.mjs:444-451`)** — a `text`-basis sweep must state its own limit, and
  an unrenderable limit is refused rather than blanked.
- **`59/FF-5904`** (`test/arch/acd-audit-never-imports-project-code.test.mjs`) — no module under
  `src/work-audit/` holds a dynamic `import()`, a `require`, or a static import outside `src/`;
  every child goes through `runBounded` (`src/work-audit/spawn.mjs:137`), argv only, deadline always.
  **77's new modules are INSIDE that family, so FF-5904 covers them automatically** — which is why
  77 declares no copy of it (contrast 72, whose modules were outside).

The lane `ctx` is a fixed key set built at `report.mjs:646-660`:
`{repoRoot, model, matched, population, requested, now, anchorWindowMs, executions, registration,
bound, census, evidence, checks}`. A lane needing a new input needs a new ctx key, which is an edit
to `report.mjs`. **That is what makes `report.mjs` contended by construction** (ADR-010 §2).

### Coupling, from the graph, at the decision point

| module | dependents ← | dependencies → |
| --- | --- | --- |
| `src/work-audit/report.mjs` | `commands/audit.mjs` + 2 test | `census`, `evidence`, `reads`, `work-loops-checks` |
| `src/work-audit/census.mjs` | `report.mjs`, `src/work-test-select.mjs` (+7 test) | 3 |
| `src/work-audit/evidence.mjs` | `report.mjs` only (+5 test) | 3 |
| `src/work-audit/reads.mjs` | 6 `src/` + 5 test | **0** |
| `src/work-audit/spawn.mjs` | `census`, `evidence`, `work-test-changed`, `work-toolchain` (+2) | **0** |
| `src/model.mjs` | 12 `src/` + 3 test | **0** — pure leaf |
| `src/graph-normalize.mjs` | 7 `src/` + 5 test | **0** — pure leaf |
| `src/graph-impact.mjs` | `commands/graph-impact`, `work-test-select` (+1 test) | **0** — pure leaf |
| `src/loop-bounds.mjs` | 11 `src/` + 16 test | **0** — pure leaf |
| `src/claude-settings.mjs` | 4 `src/` + 8 test | `frozen-set`, `fs`, `work-bundle` |
| `src/work-bundle.mjs` | 8 `src/` + 33 test | `adapters`, `asset-base`, `frozen-set`, `lock`, … |
| `src/work-loops.mjs` | **54** — a god-node | `loop-bounds`, `work.mjs` |
| `src/work-audit-probe.mjs` | **0** — spawn-only, zero exports | 0 |
| `scripts/drive-control.mjs` | **0** — spawn-only | 0 |

**The rule this table writes into every ADR below: the audit family imports PURE LEAVES ONLY.**
`report.mjs` already obeys it (`work-loops-checks.mjs` has zero imports). `src/work-loops.mjs`
(54 dependents, reaching `src/work.mjs`) and `src/claude-settings.mjs` (reaching `work-bundle` →
`adapters` → six more) are **never imported by a 77 lane**; what they know arrives INJECTED through
the face, which is the family's own stated idiom (*"The lanes are INJECTABLE… Injection is the seam,
never a second implementation"*, `report.mjs:538-541`).

One graph caveat, observed and recorded rather than smoothed over:
`test/arch/acd-migrate-command-cli-bijection.test.mjs` is reported as a **dependency** of
`src/frozen-set.mjs`, `src/work-loops.mjs`, `src/claude-settings.mjs` and `src/commands/audit.mjs`,
which is implausible in that direction. The graph's edge orientation carries noise for test files.
ADR-006 §3 is written so the seam rule cannot be fooled by it.

### Recall, acknowledged

`aof work memory recall "audit rule family lane extension harness soundness static lint"
--area architecture --block` returned five near-misses. Each is honoured or consciously departed
from:

- **`62/ADR-007`** (the corpus is THREE declared lanes with floors; *a lane that read nothing is a
  finding*) — **honoured, and it is the spine of this milestone.** Every 77 lane declares its sweeps
  with a floor, and ADR-006 §4 is where the one lane whose corpus may legitimately be absent is
  handled without weakening the rule.
- **`62/ADR-005`** (`aof work tune` WRITES NOTHING; auto-apply is L3 and L3 is locked) —
  **honoured, and it is the decisive precedent for ADR-005.** 77 reports; it does not repair a
  user's `.claude/settings.json`.
- **`45/ADR-004`** (two byte-identical definitions move into ONE pure leaf; the discriminator is
  named; rejected alternatives are recorded with reasons) — **honoured twice**: ADR-004's
  duplication rule is the generalisation of that move, and ADR-002 puts the toolkit-root derivation
  in one leaf rather than at three call sites.
- **`61/ADR-013`** (TWO refusal vocabularies; the ruling lane is a FROZEN set) — **honoured**:
  ADR-007 freezes 77's seven codes and ADR-008 fixes each one's severity, so no construction site
  invents either.
- **`07/ADR-004`** (an OPTIONAL lane, opt-in by config, absent ≡ off, in a CLOSED additive block) —
  **consciously DEPARTED FROM.** 77 adds no config key and no opt-in: a lint the operator must
  enable is a lint nobody runs (77/STATE's own words). The severity ladder (ADR-008 §3) does the
  work an opt-in would have done, and it is derived from the audited repo's existing config rather
  than from a new key.

---

## ADR-001: 77 is a RULE-FAMILY ADDITION whose thesis is that the rules TRAVEL — bespoke local gates become rules that run wherever the bundle is installed

**Status:** Accepted
**Date:** 2026-09-03

**Context.** `RESEARCH.md` Q2 re-measured all eight SPEC rules and found five of eight subjects
changed or closed. Read one at a time that looks like attrition. Read together, the survivors share
a shape:

| rule | this repo | anywhere else |
| --- | --- | --- |
| `loop-ceiling-uncapped` | `69/FF-6902` hard-gates `src/bundle`'s registry | a project's `.aof/loops/*.md` is gated by nothing |
| `hook-duplicated` | `72/FF-7206` gates `.claude/settings.json` and *"does not travel"* | ungated |
| `agent-capability-gap` | two instances fixed by hand via chore 76's checklist | nothing catches a new one, here or there |
| `instruction-duplicated` | TECH_DEBT 79 names it; no control | ungated |
| `seam-unwired` | narrow one-offs (`acd-assignment-state-has-producer`) | no general sweep |

**Decision. The milestone's subject is the general, TRAVELLING form of each rule, and the
repo-local instance is deliberately left to the control that already holds it.**

**1 — A rule enters 77 only if its general form is ungated.** That is the admission test, and it is
what justifies ADR-009's three subtractions without appeal to taste: `spawn-uncapped` and
`cache-prefix-unstable` are green CI gates in the only repository whose spawn path aof owns, so
their general form does not exist.

**2 — "Travels" is a structural claim with two halves, and both are load-bearing.** (a) The rule's
CORPUS must be resolvable in any audited repo — the installed prompt layer, the audited
`.claude/settings.json`, the audited `.aof/loops/*.md`, the audited source tree. (b) The COMMAND the
rule rides must run there. Half (b) is false today; ADR-002 is where 77 pays for it.

**3 — No rule in 77 reads `src/bundle/**` as its subject.** The bundle source exists only in this
checkout. Where the framework's own knowledge is needed (the reference corpus), it is a MODULE 77
imports, so it resolves by module resolution and needs no root at all (ADR-007 §2).

**4 — The boundary against doctor is unchanged and is not re-litigated.** 77/STATE asked refine to
test *"separate command vs eight more doctor codes"*. Milestone 59 answered it by shipping, and
`59/FF-5905` makes the answer structural (the two code spaces are disjoint; doctor reaches no
`node:child_process`, the audit does). 77 adds no doctor code and touches no doctor module.

**Consequences.** The milestone gets smaller and sharper: five rules, four lanes, one command fix.
It also acquires an obligation it would not otherwise have — every lane must be exercised against a
repo that is NOT this one, because "travels" is the claim. Each stage-1 story's unit tests therefore
drive their lane over a synthetic corpus with no aof checkout behind it.

---

## ADR-002: TWO ROOTS, named apart — the SUBJECT root and the TOOLKIT root — and every program the audit spawns lives in the payload

**Status:** Accepted
**Date:** 2026-09-03
**Departs from:** 77/SPEC §Scope *"Out of scope: acting on the findings"* — this is a fix to the
command, not to a finding, and ADR-001 §2(b) is why it is in scope.

**Context.** TECH_DEBT item 72: both family members resolve their child PROGRAM against the AUDITED
root — `census.mjs:413` (`path.join(repoRoot, "src", "work-audit-probe.mjs")`) and
`evidence.mjs:431` (`path.resolve(repoRoot ?? ".", DRIVE_PROGRAM)`, `DRIVE_PROGRAM =
"scripts/drive-control.mjs"`, `:143`). In this repository the audited workspace IS the aof checkout,
so both resolve. Anywhere else neither exists, every register row reports `evidence-unrunnable`
naming a path that was never going to be there, and the sweep closes with `evidence-none-reproduced`
at **error** — so `aof work audit --strict` fails in every governed project, on aof's own file
layout, drowning whatever 77's rules found.

**And TECH_DEBT 72's own prescribed fix is HALF WRONG, measured at this pass.** It says derive the
toolkit root from `import.meta.url` *"so a payload install finds its driver wherever it was
installed"*. The payload does not contain the driver: `scripts/install-local.mjs:243` copies `src/`
and the live `~/.aof/bin/` has no `scripts/` directory. Deriving a root cannot find a file that was
never shipped.

**Decision.**

**1 — Two named roots, one derivation each, one home.** `src/work-audit/toolkit.mjs` — a new pure
leaf in the family — exports `toolkitRoot()`, derived once from `import.meta.url`. `repoRoot` keeps
its meaning and is renamed nowhere: it is the SUBJECT root (controls, registers, the runner, the
audited settings file, the audited loop registry). The toolkit root is where aof's own programs
live. Two words, two meanings, neither borrowed.

**2 — Every program the family spawns moves under `src/`, because that is what travels.**
`scripts/drive-control.mjs` → **`src/work-audit-drive.mjs`**, beside `src/work-audit-probe.mjs`,
which is its exact precedent and is already in the payload. `DRIVE_PROGRAM` becomes a toolkit-root
join. Measured blast radius, from the graph and from grep: `evidence.mjs` (3 sites: `:57`, `:141`,
`:143`), `test/arch/acd-evidence-oracle-is-a-message.test.mjs` (`:138`, `:482-483`),
`test/support/evidence-control-fixture.mjs:15`, `test/evidence-re-run.test.mjs:15`. The program has
**0 graph dependents**, by construction.

**2a — The fixture stops copying the driver into the subject repo, and that is the proof.**
`test/support/evidence-control-fixture.mjs` today plants a real copy of the driver at
`DRIVE_PROGRAM`'s path inside the fixture repository *"never a stand-in"*. Under §1 the driver comes
from the toolkit, so a fixture repo with NO driver in it is the honest test of the change. The
fixture's purpose is preserved (a real driver runs) and its location moves.

**3 — This closes TECH_DEBT item 70's remaining hole as a side effect, and the closure is claimed
rather than hoped.** Item 70's status note (59/02): clause (E) of FF-5904 *"skips a `.mjs` path the
closure names unless it resolves under `src/`"*, so `scripts/drive-control.mjs` is enumerated by
nobody. A program under `src/` is inside clause (E)'s discovery and belongs in `SPAWNED_PROGRAMS`.
77/04 adds it there and asserts the family's spawned-program enumeration has ONE home again.

**4 — What 77 does NOT do here.** It does not re-home `src/work-audit/spawn.mjs` (TECH_DEBT item 85
— the seam is shared by two families under one family's directory name). That move requires
re-anchoring `FF-5904` clause (B) in the same commit and is a story of its own; 77 adds no new
caller of the seam, so it does not make item 85 worse. Stated so the omission is read as a decision.

**Consequences.** `aof work audit` becomes runnable in a governed project — which is the
precondition ADR-001 §2(b) names, and without it 77's four lanes ship into a command nobody outside
this repo can run. The evidence lane's behaviour in this repository is unchanged (both roots resolve
to the same directory here), so the change is invisible locally and is exactly the class of change
that needs a control rather than a local green (FF-7706).

---

## ADR-003: How a rule cites its seam — `agent-capability-gap` reads a CODE SPAN through a CLOSED declared map, attributes by a single role word in one clause, and UNDER-REPORTS by construction

**Status:** Accepted
**Date:** 2026-09-03
**Settles:** 77/STATE §"Open question for refine: how a rule cites its seam".

**Context.** 77/STATE: *"A literal token match over the prompt against the frontmatter's tool list
catches the real cases and will also produce false positives. Prefer a small explicit map over
cleverness, and let the rule under-report rather than cry wolf."* One instance is live
(`RESEARCH.md` Q2): `src/bundle/commands/refine.md:102-109` orders the PO to run
`aof work memory recall … --block`; `src/bundle/agents/aof-product-owner.md:5` grants no `Bash`.

**This ADR was written against MEASUREMENT, not intuition.** The naive detector — any code span
whose first token is a program name, attributed to any role word in the sentence — was run over the
whole prompt corpus at this decision point: **17 findings, of which zero were the live one and
sixteen-plus were false** (`aof-product-owner` matches `^aof`; `aof:verify` is a slash command, not a
program; *"spawn `aof-designer`"* is an instruction to the orchestrator, not to the designer). A
lint with that precision is the lint 77/STATE forbids.

**Decision. Five clauses, each one measured to be load-bearing.**

**1 — The evidence is a CODE SPAN, never prose.** A rule that reads English will read
`aof-designer.md:16,20`'s *"(Your `tools` list has no `Bash`; you are structurally read-only)"* as an
instruction. Only backticked spans are evidence.

**2 — The required capability comes from a CLOSED, DECLARED, ONE-ROW map.** The span's first token
must be in `{aof, npm, npx, node, git, bash, pwsh, sh}` **and be followed by a space and an
argument** → the instruction requires `Bash`. The space is not a detail: it is what excludes
`aof-designer` (an agent id) and `aof:verify` (a slash command) by construction rather than by an
exception list. There is no second row and no tool-name-token row; a bare `` `Edit` `` in prose is
NOT evidence, and the QA-told-to-`Edit` case (closed by chore 76) is deliberately outside this rule.

**3 — The clause must instruct the reader to RUN it.** The clause carries a form of *run*. A
document that MENTIONS a command is not a document that orders one.

**4 — Attribution is by exactly one BOLDED role word in the clause, through a declared 8-row role
map.** Zero role words or two or more → **not attributed, no finding**. An agent's own document
attributes to itself. Two normalisations are required and both were measured:
- **Paragraph normalisation before splitting.** A markdown code span WRAPS ACROSS LINES —
  `refine.md`'s live instance is `` `aof work memory\n     recall "…"` `` — and a line-oriented
  reader misses the only true positive in the corpus. Whitespace is collapsed per paragraph first.
- **CLAUSE granularity, splitting at `. ! ? ;`.** The live instance shares ONE SENTENCE with the
  architect's instruction (*"the **architect** … runs `…`; the **PO** … runs `…`"*), so at sentence
  granularity two role words appear, §4's ambiguity rule fires and the finding is dropped.

**5 — The grant is read from the agent document's `tools:` frontmatter and from nowhere else.**
One home; no mirrored list.

**Measured, over this repository's prompt corpus at the decision point:** 33 documents, **165**
program-shaped spans, **5** attributed, **1 finding** —
`src/bundle/commands/refine.md` → `aof-product-owner` — and **zero false positives.** That number is
the argument for the design: 165 → 1 is what "under-report rather than cry wolf" looks like when it
is measured instead of asserted.

**Consequences.** The rule will miss real gaps: an instruction in prose, an instruction attributed to
a role named without bold, a capability that is not `Bash`. That is chosen, and the LIMIT record the
lane emits on every run (ADR-004 §3) states it in the output rather than in this document only. The
role map is the one hand-maintained artifact in 77; it lives in the lane module and nowhere else, and
FF-7701 asserts it is a closed exported constant so a reviewer sees it change.

---

## ADR-004: `instruction-duplicated` is EXACT at sentence granularity, aggregated per file pair, and STATES ITS OWN BLINDNESS on every run

**Status:** Accepted
**Date:** 2026-09-03

**Context.** `RESEARCH.md` measures four logical copies of the graph-grounding block totalling
8,402 B across three render targets. The obvious detector — exact duplicate BLOCKS — finds **zero**
of them: the four copies are 2,217 / 1,204 / 3,472 / 1,509 bytes and are paraphrases, not copies. A
near-duplicate detector with a similarity threshold is a model in a command that is specified to have
none, and its threshold is un-reviewable.

**Decision.**

**1 — The unit is a normalised SENTENCE at or above a declared byte floor, matched EXACTLY.**
Paraphrases share long verbatim sentences even when their blocks differ — measured:
*"Graphify extraction replaces the single project graph; never target a package or `src` subtree,
because doing so evicts every file outside that subtree."* appears byte-identical in
`refine.md:136-137` and `code-review.md:47-49`. Exact matching is deterministic, has no threshold
that decides truth, and is reviewable.

**2 — Findings are aggregated per FILE PAIR, not per sentence.** Measured at the decision point over
33 prompt documents with a 120-character floor: **21 duplicated sentence groups, 5,242 redundant
bytes, 18 file pairs** — top pair `continue.md ↔ verify.md` at 2,131 B, then
`aof-architect.md ↔ aof-qa.md` at 787 B. Twenty-one findings is a lint nobody reads; eighteen pairs
ranked by bytes is a list somebody acts on.

**3 — The floor is a DECLARED constant, and the lane states what the floor hides.** Measured
sensitivity: 21 groups at 120 chars, 12 at 200, **0 at 300**. A number with that gradient must not be
a literal buried at a comparison site. It is an exported constant, and the lane emits a
`limitRecord` on every run — the `text`-basis sweep's obligation (`reads.mjs:56-59`) — saying: this
detector sees only verbatim sentences at or above the floor; a paraphrase is invisible to it; of the
graph-grounding block's 8,402 B it sees roughly 1.2 KB. **Understating is the chosen direction and
the output says so**, rather than this document saying so where no operator reads it.

**4 — The corpus is the prompt layer AS INSTALLED in the audited repo**, discovered through
`RUNTIMES[*].localRoot` and `RESOURCE_KINDS[*].plural` from `src/model.mjs` (a pure leaf, 0 imports,
12 `src/` dependents) — never a second spelling of `.claude/agents`. What runs is what is installed;
TECH_DEBT item 54 records that this repo's installed copies already drift from `src/bundle/`.

**Consequences.** The rule reports at `warn` and never reddens `--strict` (ADR-008 §3): duplication
is a health signal, and a rule that fails eighteen builds on arrival would be turned off. Its value
is the trend — the 19th pair is the finding, and the aggregate byte count is the number a
retrospective can plot. TECH_DEBT item 79 already indicts this shape; 77 does not re-raise it, it
instruments it.

---

## ADR-005: `hook-duplicated` DETECTS and does not repair — the merge rule is NOT changed, and the reason is measured rather than inherited

**Status:** Accepted
**Date:** 2026-09-03
**Departs from:** the operator's standing instruction that the merge bug be fixed inside 77.
**Constrained by:** `72/ADR-005 §3`, which this ADR does NOT supersede.

**Context.** `RESEARCH.md`'s root cause is correct and is not disputed here: `isAofEntry`
(`src/claude-settings.mjs:172-174`) recognises only entries carrying the `aofManaged` marker, so a
pre-marker copy of an aof hook is treated as an operator's forever, and `spliceSettings`
(`:254-319`) keeps adding a freshly-marked duplicate beside it. `72/ADR-005 §3` reached the opposite
conclusion about what to DO with it, on a counter-pressure that is still true: *"the framework must
never silently delete a user's hand-authored hook… the escape hatch `55/ADR-004` preserved is the
same mechanism keeping this repo's own unmarked `guard-test-isolation` entry alive across every
`aof work update`. A collapse rule in the merge would delete that too."*

**Reversing a landed ADR needs a NEW FACT, not a re-weighting of the same evidence. There is one,
and it points the other way.**

**Measured at HEAD, 2026-09-03:** `.claude/settings.json` carries six hook entries — five marked
(`claude-session-start`, `claude-session-prompt-ping`, `claude-session-end`,
`claude-artifact-sync`, `claude-run-heartbeat`) and one unmarked, the operator's
`guard-test-isolation` under `PreToolUse` / `Bash|PowerShell`. **Zero duplicate pairs.** 72/03
deleted all three. So the merge repair's evidence base is not the three live pairs `RESEARCH.md`
measured — it is **n = 0 observed instances**, in the only repository anyone has measured. The
population in installed projects is UNKNOWN and nobody has looked.

**Decision.**

**1 — 77 DETECTS `hook-duplicated` in any audited repository and REPAIRS nothing. No module 77 adds
writes a settings file, and none imports `src/claude-settings.mjs`'s merge.** A write path that
touches every user's `.claude/settings.json` is not changed on n = 0. `62/ADR-005`'s line is the
governing precedent — the analysis surface writes nothing; acting is a separate, later decision.

**2 — The predicate is ENTRY-versus-ENTRY inside one settings file, and it therefore needs no
canonical declaration and no toolkit root.** For every entry carrying the marker, no entry **in the
same event AND under the same matcher** lacking the marker is command-equivalent to it. Equivalence
is over the RESOLVED INVOCATION — `command` plus `args`, `${CLAUDE_PROJECT_DIR}` unexpanded, the
`portableArg` normalisation (`src/claude-settings.mjs:163-166`) applied — never object identity, so
a reformatted copy is still a copy. The marker key arrives INJECTED from
`AOF_HOOK_MARKER` (`src/claude-settings.mjs:62` → `FROZEN_OWNERSHIP_MARKER`,
`src/frozen-set.mjs:29`) rather than imported, because importing `frozen-set.mjs` would drag
`asset-base.mjs` and its `createRequire` into the family closure FF-5904 polices.

**3 — What the rule must REFUSE to touch, stated as the design requirement the operator asked for.**
Three classes, and the first is the one that matters:
- **An unmanaged entry that pairs with no managed entry is invisible to the rule.** The operator's
  `guard-test-isolation` guard is exactly that, and it is the hook that blocks unisolated test runs
  from corrupting the real `~/.aof`. FF-7703 plants it and requires the lane GREEN on it.
- **An unmanaged entry under a DIFFERENT event or matcher from the managed one it resembles.** Two
  rules that happen to run the same program are two rules. `72/FF-7206` already settled that the
  matcher is part of the pairing and not context around it; 77 takes the same reading, for the same
  reason, in a rule that travels.
- **Any managed entry.** Marked entries are aof's own and duplication among them is a merge defect,
  not an operator fact; no marked/marked pair is reported.

**4 — What the eventual repair would have to be, recorded now so the option is not re-derived from
scratch.** If the detector's travelling population turns out to be non-zero, the ONLY admissible
repair is **non-destructive suppression**: aof declines to ADD its own copy when an unmanaged entry
under the same event and matcher is byte-equal in resolved invocation to the canonical declaration it
is about to write (`src/bundle/hooks/*.json`, e.g. `claude-session-start.json`'s
`{event, matcher, type, command}`). It deletes nothing, mutates no operator entry, and adopts
nothing — so `72/ADR-005 §3`'s counter-pressure is not crossed. Deletion and adoption are both
refused: adoption makes aof the owner of an entry the operator wrote, which is deletion with a delay.

**5 — 77 does NOT re-derive `72/FF-7206`.** That control asserts this repository's tracked
`.claude/settings.json` holds no such pair, and it *"does not travel"*. 77's rule is the run-time
sweep over ANY audited repo. The two are the same species over different subjects, and the register
names the overlap rather than restating it.

**Consequences.** The milestone deliberately leaves a known self-perpetuating defect unfixed, and
that must not be lost. **A `TECH_DEBT.md` entry is OWED and is not written by this document** (the
architect's write scope for this pass is this file alone): the merge's recognition rule is blind to a
pre-marker copy of its own hook; the effect is one extra process spawn per event, per install
carrying one; the shape of the fix is §4's non-destructive suppression; the evidence threshold that
should trigger it is `audit-hook-duplicated` firing in any repository other than this one. Cite
`72/ADR-005 §3` and this ADR in the entry, because the point of it is that two milestones reached
opposite conclusions on the same code and the second one had a new number.

---

## ADR-006: `seam-unwired` READS the graph and never builds it; an UNKNOWN is a stated LIMIT, never a clean seam; and every false-positive shape is DERIVED, not ledgered

**Status:** Accepted
**Date:** 2026-09-03
**Follows:** `72/ADR-002` (read, never build; an unknown widens and never narrows), `09/ADR-004`
(the graph is advisory; no graph output feeds a gate, merge, status-write or work-mutation).

**Context.** `RESEARCH.md`'s method: file-level `graph impact` filtered to
`present && dependents.length === 0` returned 3 of 148 `src/*.mjs` — one genuine
(`src/sync.mjs:8 createSyncPlan`, 0 dependents, confirmed again at this pass) and two false positives
(`src/work-audit-probe.mjs`, spawn-only; `src/scaffold.mjs`, reached by
`await import("../scaffold.mjs")` at `src/commands/assets-add.mjs:33`). `RESEARCH.md` proposes an
allowlist for those two shapes. **This ADR refuses the allowlist**: a control that STORES a fact
about the tree sends its next bill to a stranger (TECH_DEBT item 81, six carriers in three families).

**Decision.**

**1 — READS the artifact, never builds it — and the precedent is not departed from.**
`72/ADR-002 §1` settled the analogous question for test selection and its reasons transfer intact: a
build is minutes even on the `unchanged: true` path, and a command that might cost minutes before it
costs seconds is not one an agent runs. The lane reads `graphify-out/graph.json` through the SHIPPED
`normalizeGraph` (`src/graph-normalize.mjs`, 0 imports) and `computeImpact`
(`src/graph-impact.mjs`, 0 imports) — no second graph reader, no second `JSON.parse` of a graph path,
no `aof graph build` invocation in any form. Both allowlists
(`GRAPH_READER_ALLOWLIST` / `GRAPH_REACHING_ALLOWLIST`) gain this ONE module and nothing else.

**1a — The dependents index is built ONCE per run, not per file.** `computeImpact` is
O(paths × (nodes + edges)) — ~80 ms for one path, ~400 ms for fifty against the live 17 MB artifact
(`72/ADR-002`'s measured ceiling). A per-file call over ~150 candidates would be ~12 s in a command
that must stay cheap. One inverted pass over the same normalised graph answers every candidate. This
is a different composition of the same shipped readers, not a second reader.

**2 — Both false-positive shapes are DERIVED, and each derivation was verified to fire.**
- **A file with ZERO exports is never a candidate.** `src/work-audit-probe.mjs` declares no `export`
  and ends in `await main()` — it is a PROGRAM, and a program cannot be an unwired seam. Verified:
  the probe drops out with no ledger entry.
- **A file named by a RESOLVABLE dynamic-import literal is referenced.** `await import("<relative>")`
  is resolved against the containing file and the edge is added. Verified: `src/scaffold.mjs` drops
  out. **The sweep is `src/**`, not one directory level** — measured, because a top-level-only sweep
  fails to see `src/commands/assets-add.mjs:33` and `src/commands/assets-clean.mjs:22` and reports
  both `scaffold.mjs` and `clean.mjs` falsely.
- **Resolution is relative, never by basename.** Measured: `src/notion/sync-work.mjs:26` imports
  `"./sync.mjs"`, which resolves to `src/notion/sync.mjs`. A basename match would suppress
  `src/sync.mjs` — the only genuine finding in the repo — and leave the rule vacuous while looking
  clean.

**3 — A dependent that is a TEST file does not wire a seam, and the graph's noise makes this
explicit.** The SPEC's own words are *"an exported function with no non-test caller"*. Dependents
under a declared test root are excluded — which also immunises the rule against the observed edge
noise (`test/arch/acd-migrate-command-cli-bijection.test.mjs` reported as a dependency of four `src/`
modules). **Measured at the decision point:** 148 top-level `src/*.mjs`, **0 absent from the graph**,
**2 with no dependents at all** (`src/sync.mjs`, `src/scaffold.mjs` — the latter suppressed once the
sweep is `src/**`) and **6 with only test dependents** (`catalog`, `clean`, `graph-faces`,
`mesh-presence-loop`, `planning-prd`, `work-test-changed`; `clean` also suppressed under a full
sweep). A population of roughly five, at `warn`. Small enough to read, real enough to act on.

**4 — GRAPH ABSENCE IS A STATED LIMIT, NOT A FLOOR BREACH AND NOT A CLEAN RESULT.** This is the
clause that makes the rule honest and it is the one an implementation will get wrong. graphify is an
OPTIONAL integration — *"a silent no-op when graphify is absent"* is the framework's own rule in
every prompt — so a lane whose floor breach reds `--strict` in every project without a graph is a
rule that punishes projects for not installing an optional tool. And `audit-ran-on-nothing` is
`error` (`reads.mjs:155`). Therefore:
- the lane's SWEEP is **source modules on disk** (floor > 0, always satisfiable where there is
  source), never "graph-covered modules";
- a missing, unreadable or failed-build artifact yields **zero `audit-seam-unwired` findings and a
  `limitRecord`**: no code graph was available, no module's coupling could be resolved, and nothing
  in this result is a claim that a seam is wired;
- a module the graph reports `present: false` is **excluded from the candidate set and counted in the
  same limit** — never rendered as "no dependents". That is the exact mistake the grounding protocol
  exists to prevent, and it is `72/ADR-002 §3`'s invariant translated into the audit's vocabulary:
  the audit cannot widen a selection, so it states the gap instead.

**5 — No graph output feeds a gate.** `09/ADR-004` holds: the finding is `warn`, `--strict` is
unaffected by it, and no status, accept, merge or loop door reads this lane.

**Consequences.** Between stage 1 and stage 2 of this milestone, 77's own lane modules have zero
dependents and this rule would name them. That is correct behaviour and it resolves when 77/05
registers them; it is recorded so a mid-milestone run is not read as a defect.

---

## ADR-007: The vocabulary — `baseline` keeps ONE meaning, 77's corpus is the REFERENCE corpus, it lives under `src/` because that is what travels, and the refresh is a hand-run program reachable from no CLI door

**Status:** Accepted
**Date:** 2026-09-03
**Departs from:** 77/SPEC §Scope, `wiki/reference/harness-baselines.md` and *"a
`--refresh-baselines` path"*.

**Context — the collision is inside the family being extended.** `baseline` already means something
exact at `src/work-audit/census.mjs:96`: `UNREGISTERED_BASELINE`, a **shrink-only exemption ledger**
of suites that cannot be registered, each entry naming its reason and origin, with its own two
finding codes `audit-baseline-stale` and `audit-baseline-unreasoned`. 77's proposed "baselines
corpus" — a table of what OTHER systems cap at, with source URLs and `checked:` dates — shares
nothing with it but the word.

**Decision.**

**1 — `baseline` is not extended. 77's corpus is the REFERENCE corpus.** Module
`src/harness-reference.mjs`; rows are reference rows; codes are `audit-bound-*` and
`audit-reference-stale`. No module 77 adds spells `baseline`, and no 77 finding code contains it
(FF-7706). `bound` is used in its EXISTING sense throughout — a declared cap, the sense
`src/loop-bounds.mjs` and `runBounded` already carry — so 77 adds a second USE of a word and not a
second MEANING, which is the distinction this ADR is about.

**2 — The corpus is a MODULE under `src/`, because `src/` is what travels.** Measured (Context §4):
the payload carries `src/` and not `wiki/`. A corpus at `wiki/reference/harness-baselines.md` is
unreachable in every governed project, which makes the bounds rule the one rule in 77 that cannot
travel — contradicting ADR-001. `src/harness-reference.mjs` exports a frozen array of rows, each
`{ id, bound, value, system, source, checked }`; it imports nothing; the audit reaches it by MODULE
RESOLUTION, so it needs neither root. 77/SPEC's requirements are met literally: versioned, on disk,
diffable, reviewable in a PR, each row carrying its source URL and `checked:` date.

**2a — RESEARCH Q3 is honoured and was answered against the wrong question.** Q3 established that
`wiki/reference/` is invisible to the work-stream index scan (`work.dir` = `./wiki/work`;
`listItems`, `src/work.mjs:321-352`). True, and insufficient: "does not break the work stream" is not
"reaches an installed project".

**2b — `wiki/reference/harness-baselines.md` IS produced, as a GENERATED view with a generated
stamp, and nothing reads it.** The SPEC's human-readable artifact exists; the corpus keeps one home;
the file is written only by §3's refresh program and is never hand-edited and never parsed. A second
hand-authored home would be `45/ADR-004`'s species, which the recall block surfaced.

**3 — The refresh is a SEPARATE PROGRAM, not a flag — `scripts/refresh-harness-reference.mjs`.**
77/STATE is emphatic: *"a rule that silently fetches is a rule whose result depends on the day it
ran."* A `--refresh-baselines` flag on `aof work audit` makes that guarantee a promise; a program
that no registered command names and that the audit family's import closure cannot reach makes it
structural and assertable (FF-7705). It is run by hand, it is the only thing in 77 that touches the
network, and it lives under `scripts/` deliberately — it is aof-maintainer tooling that must NOT
travel, and it is spawned by nobody, so it is outside TECH_DEBT item 70's enumeration hazard.

**Consequences.** A downstream project's audit joins against aof's reference corpus as shipped with
its payload — so the corpus's freshness is a property of the aof version installed, and
`audit-reference-stale` (a row whose `checked:` exceeds the declared window) is how an old install
says so out loud rather than quietly comparing against 2026 numbers in 2028.

---

## ADR-008: `loop-ceiling-uncapped` is NOT a new rule — it is one row of the bounds join; and the severity ladder is fixed per code so no construction site invents one

**Status:** Accepted
**Date:** 2026-09-03

**Context.** `RESEARCH.md` Q2: the code exists, declared at `src/work-loops.mjs:245` and emitted at
`:696` at `warn` by `fieldHonestyFindings`, driven by `aof work loops validate`, gating nothing.
`69/FF-6902` (`test/arch/acd-no-uncapped-framework-loop.test.mjs`) hard-gates THIS repo's own
`src/bundle` registry. What is open is a governed project's own `.aof/loops/*.md`.

**Decision.**

**1 — No fourth home for the fact, and no second emitter of the code.** `loop-ceiling-uncapped`
stays exactly where it is, at `warn`, in `loops validate`. 77 does not move it, re-emit it, or give
it a second severity. Two commands emitting one code with two severities is the confusion
`59/FF-5905` exists to prevent one directory over.

**2 — An uncapped ceiling is ONE ROW of the bounds join, under the audit's own code
`audit-bound-undeclared`.** The bounds lane asks one question — *does this project declare a bound
where a bound is expected?* — and an `uncapped` or `unknown` `ceiling:` is that question's answer for
the loop registry. The reference corpus supplies the other rows. One lane, one subject, two sources.

**3 — The lane READS THE INJECTED MODEL and parses nothing.** `runAudit` already receives the parsed
loop model (`report.mjs:617`, `ctx.model`, produced by `loadLoops` in `src/commands/audit.mjs:138`)
and the `registry-checks` lane already consumes it that way. The bounds lane does the same, and
resolves `config:`-scheme ceiling pointers through `src/loop-bounds.mjs` (0 imports, 27 dependents) —
the SAME home `69/FF-6902` uses. **`src/work-loops.mjs` is never imported by the family**: 54
dependents, and it reaches `src/work.mjs`. A second reading of one parse is not a second derivation;
a second parser would be.

**4 — The severity ladder, fixed here, per code.** The audit's `--strict` exit rule is unchanged
(`src/commands/audit.mjs:280-286`): `run()` always returns the full set and `--strict` changes only
the exit code. 77 must not redden a build merely by arriving (54/FF-5409's frozen five-row cost
ladder is not joined by the back door), so:

| code | severity | why, and what it measures here today |
| --- | --- | --- |
| `audit-agent-capability-gap` | `error` where the audited config would SPAWN that role; `warn` where it routes inline | this repo is `productOwner: "inline"` (`.aof/aof.config.json:7`) → the one live finding lands at `warn` |
| `audit-instruction-duplicated` | `warn` | 18 pairs on arrival; a rule that fails 18 builds is a rule that gets disabled (ADR-004) |
| `audit-hook-duplicated` | `error` | a real double spawn per event; **0 in this repo** since 72/03 |
| `audit-seam-unwired` | `warn` | ~5 on arrival; dead code is not a correctness break |
| `audit-bound-undeclared` | `error` for an `uncapped`/`unknown` ceiling; `warn` for a reference row this project declares nowhere | `69/FF-6902` keeps the error leg at 0 here |
| `audit-bound-off-reference` | `warn` | a declared bound outside the reference's range is an argument, not a defect |
| `audit-reference-stale` | `warn` | an old payload says so; it is not the audited project's fault |

**Measured consequence: `aof work audit --strict` stays GREEN in this repository on arrival.** Every
error-severity leg is at zero here, by another control's doing in two cases out of three. That is the
milestone's own proof that the ladder was set from evidence.

**5 — The role-routing input is INJECTED, not read.** The lane needs to know whether the audited
config would spawn a role. `work.agents.*` is read today by `src/work-delegation.mjs`; the family
gets the resolved answer from the face (`src/commands/audit.mjs` already holds
`ctx.workspace.config`), so 77 adds no second reader of that key.

---

## ADR-009: What this milestone deliberately does NOT do, and where each lever went

**Status:** Accepted
**Date:** 2026-09-03

77/SPEC's Scope list stands as written; this ADR is the amendment. Per dropped rule: the SPEC's
claim, the measured fact that falsifies it, and the gate or item that discharges it.

**1 — `spawn-uncapped` is DROPPED. Discharged by `69/FF-6905`.** SPEC: *"what flags actually reach
the spawned runtime. Today the argv is `--permission-mode auto --append-system-prompt <…>` and
nothing else."* Measured (`RESEARCH.md` Q2, `src/agent-session-driver.mjs:742-807`): the argv also
carries `--exclude-dynamic-system-prompt-sections`, and conditionally `--model` and `--effort`, with
`ENABLE_PROMPT_CACHING_1H=1` on the spawned env. `--max-turns` and `--max-budget-usd` are absent
because milestone 69 measured that the spawn path supports neither against `claude 2.1.233`, made
enforcement out-of-process (`69/ADR-004`), and froze the negative space:
**`69/FF-6905`** (`test/arch/acd-worker-driver-no-headless-print.test.mjs`) asserts no
`--max-turns` / `--max-budget-usd` / `-p` / `--print` / `--output-format` argv is constructed
anywhere in `src/**`. A 77 rule here re-derives a green gate under a new name.

**2 — `cache-prefix-unstable` is DROPPED. Discharged by `70/FF-7004`.** SPEC: *"worktree-per-story
AND no `--exclude-dynamic-system-prompt-sections` cannot share a prompt-cache prefix."* The first
half holds (`src/work-dispatch.mjs:10,19,184`); the second is false since milestone 70 / story 01,
and **`70/FF-7004`** asserts the flag's pairing rule with `--append-system-prompt` directly. A
conjunction with a false conjunct is not a finding.

**3 — `prompt-config-unsatisfiable` is DROPPED. Flagship subject closed by milestone 71; a bounded
re-sweep found no replacement.** SPEC: *"the design lane targets `work.ui.baseUrl`; config has no
`work.ui`."* `schemas/aof.schema.json:403-419` now declares `work.ui` (`baseUrl`, `renderer`,
`a11y.level`) and `src/bundle/commands/verify.md:12,15,100` handles absence explicitly through the
renderability precondition — a missing base URL is a stated `INCONCLUSIVE`, never a guaranteed one.
`RESEARCH.md`'s bounded sweep of every `work.<key>` referenced by the prompt layer against the schema
and a `src/` resolver found **zero** live instances. A rule with no subject and a known false-positive
mode (`additionalProperties: true` recurs through the schema, so "absent from the schema" ≠
"unsatisfiable") is a rule that would only ever cry wolf.

**4 — The merge repair is NOT performed. See ADR-005 §1, and the TECH_DEBT entry ADR-005 §5 owes.**
This is the one subtraction the operator did not ask for, and it is argued from a fact that post-dates
the instruction: the population went from three to zero between `RESEARCH.md` and this pass.

**5 — `aof work doctor` is not touched, `src/work-loops.mjs` is not edited, and no `/aof:*` bundle
wrapper ships.** 77 adds no command (ADR-007 §3 makes the refresh a script), so this project's
standing "a work command is not done until its wrapper ships" rule has nothing to bind.

**6 — TECH_DEBT item 85 (the spawn seam's name) is not paid.** ADR-002 §4 states why, and 77 adds no
new caller of the seam.

---

## ADR-010: The partition — six stories, one sole writer per module and per contended file, two stages

**Status:** Accepted
**Date:** 2026-09-03

Grounded in the graph rebuilt at this decision point: **14,732 nodes / 35,911 edges, egress `none`,
`builtAt 2026-09-03T02:46:14.389Z`**. Every boundary below follows a measured `aof graph impact`
answer, cited in Context; the graph informed the partition and did not write it.

**1 — The stories.**

| story | subject | module it owns |
| --- | --- | --- |
| 77/00 | the prompt layer | `src/work-audit/prompt-layer.mjs` (new) |
| 77/01 | the hook wiring | `src/work-audit/hook-wiring.mjs` (new) |
| 77/02 | the seam liveness | `src/work-audit/seam-liveness.mjs` (new) |
| 77/03 | the reference corpus and the declared bounds | `src/harness-reference.mjs`, `src/work-audit/declared-bounds.mjs` (new) |
| 77/04 | the two roots | `src/work-audit/toolkit.mjs` (new), `census.mjs`, `evidence.mjs`, the moved program |
| 77/05 | the lanes are registered | `src/work-audit/report.mjs`, `src/commands/audit.mjs` |

**2 — `src/work-audit/report.mjs` is CONTENDED BY CONSTRUCTION, and it is resolved by INVERSION
rather than by an exception.** Every lane needs a `REPORT_LANES` entry and a ctx key, both in that
file. The available shapes were: a stage-1 story that opens the registration point (which would
register lanes whose modules do not exist yet — red on arrival), or a declared shared-write exception
(four writers on one 703-line file). Neither is taken. **Stage 1 authors PURE LANE MODULES that
register nothing; stage 2 registers all four.** That is `72/ADR-008 §3`'s shape — the composing story
is stage 2 and owns the contended file — and it makes the sole-writer rule hold with no exception:

| module / contended file | sole writer |
| --- | --- |
| `src/work-audit/prompt-layer.mjs` | 77/00 |
| `src/work-audit/hook-wiring.mjs` | 77/01 |
| `src/work-audit/seam-liveness.mjs`; `test/arch/acd-codebase-grounding-{no-parse,via-commands}.test.mjs` — **allowlists += `src/work-audit/seam-liveness.mjs`, nothing else** (ADR-006 §1) | 77/02 |
| `src/harness-reference.mjs`, `src/work-audit/declared-bounds.mjs`, `scripts/refresh-harness-reference.mjs`, `wiki/reference/harness-baselines.md` (generated) | 77/03 |
| `src/work-audit/toolkit.mjs`, `src/work-audit-drive.mjs`, `src/work-audit/census.mjs`, `src/work-audit/evidence.mjs`, `test/arch/acd-audit-never-imports-project-code.test.mjs`, `test/arch/acd-evidence-oracle-is-a-message.test.mjs`, `test/support/evidence-control-fixture.mjs` | 77/04 |
| `src/work-audit/report.mjs`, `src/commands/audit.mjs`, `test/arch/acd-controls-never-execute.test.mjs`, `test/audit-command.test.mjs` | 77/05 |
| `scripts/test.mjs` — its own labelled suite block | every story, its own block only |

**3 — Two stages, and stage 1 is edge-free — including the one edge that nearly existed.** The order
is **{77/00 ‖ 77/01 ‖ 77/02 ‖ 77/03 ‖ 77/04} → {77/05}**. Five stage-1 stories share no module and no
control. The near-miss: 77/01's first design resolved the canonical hook declarations from 77/04's
toolkit root, which would have been a stage-1 → stage-1 edge. ADR-005 §2's entry-versus-entry
predicate removes the need for them entirely, so the edge does not exist rather than being scheduled
around. Every stage-1 lane module is a PURE FUNCTION over injected inputs and a subject root, unit
-testable against a synthetic corpus with no aof checkout behind it — which is also ADR-001 §2's
travelling obligation discharged per story.

**4 — Stage 1 is edge-free at the CONTROL level too** (`62/ADR-013 §7`'s lesson, `72/ADR-008 §4`'s
form). Every claim about the COMPOSED command — a lane is registered and executes as itself, its
codes are disjoint, its floors and limits are asserted from the registry — lives in FF-7707 and
FF-7708, which 77/05 owns. **No stage-1 story declares a control it cannot clear**: each stage-1 row
is about its own module's shape and is decidable without a registered lane.

**5 — 77/04 is stage 1 deliberately, though 77/05 depends on nothing it produces.** It is a bug fix
with its own value (the command becomes runnable elsewhere) and its write set — `census.mjs`,
`evidence.mjs`, two arch tests, two fixtures — intersects no other story's. Putting it on the
critical path would serialise a fix that has no reason to wait.

**6 — Codebase health, and where this milestone leaves the tree.** `src/commands/` is at **95**
siblings and TECH_DEBT item 78 indicts it as the fastest-growing flat layer; **77 adds ZERO** —
the refresh is a script (ADR-007 §3) and the rules ride a registered command that already exists.
`src/work-audit/` goes 5 → 10 modules, which is the named-family shape item 78 prescribes rather than
the flat-root shape it indicts. `report.mjs` grows by roughly 60 lines (four lane entries plus ctx
keys) from 703; `census.mjs` and `evidence.mjs` change by one program-resolution line each.
`scripts/test.mjs` gains six labelled blocks — TECH_DEBT item 86 already carries that growth rate and
77 does not re-raise it. **Two open debts are CLOSED by this milestone** (item 72 in full, item 70's
remaining enumeration hole) and **one is OWED and unwritten** (ADR-005 §5).

**7 — The story `reads:` and `files:` declarations.** Project-root-relative, forward slashes, so
sibling write sets compare exactly. An architecture decision is named by its anchor, never as the
whole document.

### 77/00 — the prompt layer
*Delivers:* a pure lane that reads the installed prompt layer and emits `audit-agent-capability-gap`
and `audit-instruction-duplicated`, with its sweeps, floors and a `text`-basis limit record.
```
reads:  [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-003,
         wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-004,
         wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010,
         src/work-audit/reads.mjs, src/work-audit/census.mjs, src/model.mjs,
         src/bundle/agents/aof-product-owner.md, src/bundle/agents/aof-designer.md,
         src/bundle/commands/refine.md, test/support/source-slice.mjs]
files:  [src/work-audit/prompt-layer.mjs, test/work-audit-prompt-layer.test.mjs,
         test/arch/acd-capability-gap-cites-a-code-span.test.mjs,
         test/arch/acd-duplication-rule-states-its-blindness.test.mjs, scripts/test.mjs]
```

### 77/01 — the hook wiring
*Delivers:* a pure lane over an injected settings object and marker key, emitting
`audit-hook-duplicated`; it writes nothing and reaches no merge.
```
reads:  [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-005,
         wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010,
         wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-005,
         src/work-audit/reads.mjs, src/claude-settings.mjs, src/frozen-set.mjs, src/model.mjs,
         src/bundle/hooks/claude-session-start.json, .claude/settings.json,
         test/support/source-slice.mjs]
files:  [src/work-audit/hook-wiring.mjs, test/work-audit-hook-wiring.test.mjs,
         test/arch/acd-hook-rule-detects-never-writes.test.mjs, scripts/test.mjs]
```

### 77/02 — the seam liveness
*Delivers:* a pure lane that reads the graph artifact through the shipped readers, emits
`audit-seam-unwired`, and turns every unknown into a stated limit.
```
reads:  [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-006,
         wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010,
         wiki/work/72_milestone_inner-loop/ARCHITECTURE.md#ADR-002,
         src/graph-normalize.mjs, src/graph-impact.mjs, src/work-audit/reads.mjs,
         src/work-audit/census.mjs, src/work-audit-probe.mjs, src/commands/assets-add.mjs,
         test/support/source-slice.mjs]
files:  [src/work-audit/seam-liveness.mjs, test/work-audit-seam-liveness.test.mjs,
         test/arch/acd-seam-liveness-unknown-is-a-limit.test.mjs,
         test/arch/acd-codebase-grounding-no-parse.test.mjs,
         test/arch/acd-codebase-grounding-via-commands.test.mjs, scripts/test.mjs]
```

### 77/03 — the reference corpus and the declared bounds
*Delivers:* the reference corpus module, the bounds join lane (`audit-bound-undeclared`,
`audit-bound-off-reference`, `audit-reference-stale`), the hand-run refresh program and its generated
markdown view.
```
reads:  [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-007,
         wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-008,
         wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010,
         wiki/work/69_milestone_loop-bounds/ARCHITECTURE.md#ADR-004,
         src/loop-bounds.mjs, src/work-loops.mjs, src/work-audit/reads.mjs,
         src/work-audit/census.mjs, src/commands/audit.mjs, .aof/aof.config.json,
         test/support/source-slice.mjs]
files:  [src/harness-reference.mjs, src/work-audit/declared-bounds.mjs,
         scripts/refresh-harness-reference.mjs, wiki/reference/harness-baselines.md,
         test/harness-reference.test.mjs, test/work-audit-declared-bounds.test.mjs,
         test/arch/acd-reference-corpus-offline-and-sourced.test.mjs, scripts/test.mjs]
```

### 77/04 — the two roots
*Delivers:* `toolkitRoot()` in one home; both child programs resolved against it; the driver moved
under `src/` so it ships in the payload; TECH_DEBT 72 closed and item 70's enumeration hole with it.
```
reads:  [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-002,
         wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010,
         wiki/work/TECH_DEBT.md, src/work-audit/spawn.mjs, src/work-audit-probe.mjs,
         scripts/drive-control.mjs, scripts/install-local.mjs, src/work-audit/report.mjs,
         test/evidence-re-run.test.mjs, test/support/source-slice.mjs]
files:  [src/work-audit/toolkit.mjs, src/work-audit-drive.mjs, scripts/drive-control.mjs,
         src/work-audit/census.mjs, src/work-audit/evidence.mjs,
         test/arch/acd-audit-never-imports-project-code.test.mjs,
         test/arch/acd-evidence-oracle-is-a-message.test.mjs,
         test/arch/acd-audit-travels-two-roots.test.mjs,
         test/support/evidence-control-fixture.mjs, test/evidence-re-run.test.mjs,
         scripts/test.mjs]
```

### 77/05 — the lanes are registered, and the face injects what the family may not import
*Delivers:* four `REPORT_LANES` entries with their injectable runners and ctx keys; the face supplies
the marker key, the resolved role routing and the subject root; the audit's code space becomes
derived rather than enumerated.
```
reads:  [wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-001,
         wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-008,
         wiki/work/77_milestone_harness-audit/ARCHITECTURE.md#ADR-010,
         src/work-audit/prompt-layer.mjs, src/work-audit/hook-wiring.mjs,
         src/work-audit/seam-liveness.mjs, src/work-audit/declared-bounds.mjs,
         src/work-audit/toolkit.mjs, src/work-audit/reads.mjs, src/work-doctor-controls.mjs,
         src/claude-settings.mjs, src/work-delegation.mjs, test/support/source-slice.mjs]
files:  [src/work-audit/report.mjs, src/commands/audit.mjs, test/audit-command.test.mjs,
         test/arch/acd-controls-never-execute.test.mjs,
         test/arch/acd-audit-lane-registry-complete.test.mjs, scripts/test.mjs]
```

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.
     `pending` reports at warn while 77 is open and is NOT admitted at accept — `aof work doctor 77`
     reports each unresolved control as `control-unresolved`, and what clears it is landing the file
     or dropping the declaration, never re-marking it `pending`.

     Each declared control also owes a RED PROBE in VERIFICATION.md once it lands: what was changed
     to make it fail, and the message observed. TWO ROWS ARE GREEN ON ARRIVAL and are declared as
     RATCHETS, so their probes are understood as PLANTED BREACHES rather than repaired defects:
     FF-7703 (this repo has zero duplicate hook pairs since 72/03 — the probe plants an unmarked twin
     of a managed entry) and FF-7706 (the family spells `baseline` in one place only today — the
     probe plants a second meaning and a subject-root program join).

     FF-7707 names an EXISTING file that already resolves, so it carries NO `pending` token: the
     path is live and the extension is evidenced by its red probe, which is 59's own idiom for
     extending a guard already in service rather than adding a sibling.

     TWO CONSTRAINTS EVERY NEW CONTROL FILE INHERITS ON ARRIVAL:
       · ZERO POSITIONAL SLICES. An unledgered file is allowed `max: 0`, so every cut is structural;
         gaining a ledger entry is not the remedy.
       · NO SECOND SPELLING OF THE TEST ROOTS. A control needing them imports `TEST_ROOTS`
         (`src/work-audit/census.mjs:159`).

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in `scripts/test.mjs`'s registry inside its own labelled story block.
     A suite imported and not spread is not registered; that is 59/FF-5903's finding.

     DELIBERATELY NOT RESTATED, because a control already in service walks the whole subject:
       · "no `--max-turns` / `--max-budget-usd` / `-p` / `--print` / `--output-format` argv is
         constructed for the claude driver anywhere in `src/**`" — 69/FF-6905. ADR-009 §1.
       · "`--exclude-dynamic-system-prompt-sections` travels with `--append-system-prompt`" —
         70/FF-7004. ADR-009 §2.
       · "no loop in THIS repo's `src/bundle` registry declares an uncapped or unknown ceiling, and
         every `config:` ceiling pointer resolves" — 69/FF-6902. ADR-008 §2 covers the general case
         over an AUDITED repo's registry, which that control does not reach.
       · "no unmanaged entry in THIS repo's tracked `.claude/settings.json` is command-equivalent to
         a managed one" — 72/FF-7206, which explicitly does not travel. ADR-005 §5.
       · "no module under `src/work-audit/` holds a dynamic `import()`, a `require`, or a static
         import outside `src/`, and every child comes from one seam" — 59/FF-5904 walks that
         family's import closure and 77's four lane modules are INSIDE it, so they are covered on
         arrival. 77 declares no copy. (Contrast 72, whose modules were outside the closure and
         therefore needed FF-7201/FF-7204 to carry the same species.)
       · "the audit's finding codes are disjoint from doctor's `CONTROL_FINDING_CODES`" — 59/FF-5905.
         FF-7707 does not restate that claim; it repairs the control's DERIVATION so 77's codes are
         inside it, because the control enumerates two code sets by name
         (`acd-controls-never-execute.test.mjs:76-77`) and would otherwise not see a fourth lane.
       · "a suite imported and never spread is not registered" — 59/FF-5903.
       · "an over-budget artifact refuses acceptance" — 70/ADR-007's controls; 77 changes nothing.

     ONE ROW, ONE CONTROL FILE. Eight rows name eight distinct paths, and ADR-010 §1's six stories
     create exactly those eight — every row's file appears in exactly one story's `files:`, and every
     story creates at least one. Two rows land on 77/00 and two on 77/05; neither pair was merged,
     because they fail for different reasons and their red probes mutate different things. -->

| id | invariant | enforced by (arch-test) | from |
| --- | --- | --- | --- |
| FF-7701 | **A capability finding cites a CODE SPAN through a closed declared map, and under-reports rather than guesses.** The role map and the program set are CLOSED EXPORTED CONSTANTS of `src/work-audit/prompt-layer.mjs`, asserted as such rather than as literals at a comparison site. Attribution is driven POSITIVELY and NEGATIVELY: a clause with exactly one bolded role word and a program span yields a finding; a clause with ZERO role words and one with TWO yield NONE. Three shapes are planted and required to yield NO finding — an agent id in a code span (`aof-designer`), a slash-command span (`aof:verify`), and a bare tool-name span in a NEGATIVE prose construction (`aof-designer.md:16,20`'s *"has no `Bash`"*) — because the naive detector produced 17 findings over this corpus of which none was the true one. A code span WRAPPED ACROSS LINES is asserted to be SEEN (paragraph normalisation before splitting), driven with the exact `refine.md:102-109` shape, because a line-oriented reader misses the only live instance. Clause splitting at `. ! ? ;` is asserted by driving two role-scoped instructions in ONE sentence and requiring the second to be attributed. The grant is asserted to be read from the agent document's `tools:` frontmatter and from no mirrored list. `pending` | `test/arch/acd-capability-gap-cites-a-code-span.test.mjs` | ADR-003 |
| FF-7702 | **The duplication rule matches EXACTLY and states its own blindness in its output.** The sentence floor is an exported constant, not a literal at a comparison site, and no similarity, distance or threshold-over-overlap computation exists in the module — asserted with comments stripped before the census, so prose explaining the rejected design cannot red it. A PARAPHRASE is asserted to yield NO finding (two blocks stating one rule in different words) and a byte-identical sentence at or above the floor across two documents IS a finding; a sentence repeated twice within ONE document is not. Findings are asserted to be aggregated per FILE PAIR with a byte total, never one per sentence group. The lane is asserted to emit a `limitRecord` on EVERY run — clean or not — naming the floor and the paraphrase blindness, and the lane's sweep is asserted to declare `basis: "text"`, which is what makes that limit obligatory (`reads.mjs:56-59`) rather than a courtesy. The corpus is asserted to be discovered through `RUNTIMES`/`RESOURCE_KINDS` from `src/model.mjs` and NOT through a `.claude/agents` path literal. `pending` | `test/arch/acd-duplication-rule-states-its-blindness.test.mjs` | ADR-004 |
| FF-7703 | **The hook rule DETECTS and never writes, and it cannot claim an operator's hook.** No module 77 adds writes a settings file — no `writeFile`/`writeFileSync` naming a settings path anywhere in the 77 module set — and none imports `src/claude-settings.mjs`, `spliceSettings` or `mergeClaudeSettings`, asserted by import shape and by literal. The marker key is asserted to be an INJECTED parameter, not an import, so the family closure stays free of `src/frozen-set.mjs` → `src/asset-base.mjs`. Equivalence is asserted over the RESOLVED INVOCATION (`command` + `args`, `${CLAUDE_PROJECT_DIR}` unexpanded, `portableArg`-normalised): a reformatted copy IS reported, and a differing `args` is NOT. Three refusals are planted and required GREEN: the operator's unmanaged `guard-test-isolation` entry (`PreToolUse`/`Bash\|PowerShell`, which pairs with no managed entry), an unmanaged entry equivalent to a managed one under a DIFFERENT matcher, and the same under a different EVENT — the escape hatch `55/ADR-004` preserved and `72/ADR-005 §3` refused to close. **A RATCHET, green on arrival** (zero pairs in this repo since 72/03): its red probe PLANTS an unmarked twin of a managed entry into a fixture settings object and observes the message. `pending` | `test/arch/acd-hook-rule-detects-never-writes.test.mjs` | ADR-005 |
| FF-7704 | **An UNKNOWN is a stated LIMIT, never a clean seam — and the seam lane never builds a graph.** `src/work-audit/seam-liveness.mjs` spells no graphify invocation of any form — no `graph:build`, no `graphify` token, no spawn — asserted as a TEXT CENSUS over the module's own source with comments stripped, NOT as a closure walk (a closure walk reds on arrival: the family's own `census.mjs:49` imports `runBounded`, which imports `node:child_process`). It reaches the artifact only through the shipped `normalizeGraph`/`computeImpact`, asserted by import and by the absence of any second graph reader or `JSON.parse` of a graph path. Three absence paths are driven POSITIVELY and each must yield ZERO `audit-seam-unwired` findings plus a `limitRecord`: no artifact, an unreadable artifact, and a candidate the graph reports `present: false` — the last asserted NOT to be reported as unwired, which is the mistake the rule exists to prevent. The lane's SWEEP is asserted to be source modules ON DISK with a floor > 0, never graph-covered modules, so a graphless repo cannot trip `audit-ran-on-nothing` at error. Both suppressions are asserted DERIVED, not ledgered: a zero-export module is never a candidate (driven with a program-shaped fixture), and a module named by a resolvable `await import("<relative>")` anywhere under `src/**` is suppressed — driven with the literal in a SUBDIRECTORY, because a one-level sweep falsely reports `src/scaffold.mjs` and `src/clean.mjs`, and with a same-basename-different-directory case (`./sync.mjs` from `src/notion/`), which must NOT suppress `src/sync.mjs`. A dependent under a declared test root is asserted not to wire a seam. `pending` | `test/arch/acd-seam-liveness-unknown-is-a-limit.test.mjs` | ADR-006 |
| FF-7705 | **The reference corpus is OFFLINE on the audit path, sourced and dated, and the refresh is reachable from no CLI door.** No module in the audit family's import closure names a network capability — no `fetch`, `node:https`, `node:http`, `undici`, `WebFetch` or an `http(s)://` literal in a request position — asserted over the closure, with the corpus module asserted to import NOTHING. Every row of `src/harness-reference.mjs` is asserted to carry a non-empty `source` URL and a parseable `checked` date, with a non-vacuity floor of at least one row, so a corpus that emptied could not pass. `scripts/refresh-harness-reference.mjs` is asserted to be imported by no module in `src/`, named by no registered command's `route`/`cli` declaration, and named by no module in the audit family — the structural form of 77/STATE's *"never on the audit path"*, which a flag could only promise. `wiki/reference/harness-baselines.md` is asserted to carry a generated stamp, to be read by no module in `src/`, and to be a rendering of the module's rows rather than a second declaration. `pending` | `test/arch/acd-reference-corpus-offline-and-sourced.test.mjs` | ADR-007 |
| FF-7706 | **ONE word, ONE meaning; and the toolkit is never joined onto the subject.** `baseline` keeps its `src/work-audit/census.mjs` meaning: no module 77 adds spells `baseline` (comments stripped first), and no finding code 77 adds contains it — asserted against the frozen code set rather than against source text, so a rename cannot evade it. `toolkitRoot()` has ONE home (`src/work-audit/toolkit.mjs`) and no other module in `src/` derives a root from `import.meta.url` for the same purpose. **No module in the family joins a PROGRAM path onto the subject root**: `census.mjs` and `evidence.mjs` are asserted to resolve `work-audit-probe.mjs` and the drive program against the toolkit root, with the subject root asserted to still resolve the runner, the cited controls and the register — the two roots proven APART by driving a case where they differ, which is the only shape this repository cannot produce on its own. Every program the family spawns is asserted to resolve under `src/` (so it is in the payload — `scripts/install-local.mjs:243` copies `src/` and no `scripts/`) and to be named in `SPAWNED_PROGRAMS`, closing TECH_DEBT item 70's enumeration hole rather than moving it. **A RATCHET on its vocabulary leg, green on arrival**: the probe plants a second `baseline` meaning and a subject-root program join and observes both messages. `pending` | `test/arch/acd-audit-travels-two-roots.test.mjs` | ADR-002, TECH_DEBT 70, 72 |
| FF-7707 | **The audit's code space is DERIVED from the lanes, so a fourth lane cannot arrive outside the disjointness check.** `test/arch/acd-controls-never-execute.test.mjs` reads `AUDITABLE_CODES` (`src/work-audit/report.mjs:92-97`, itself derived from every lane's own frozen set) instead of enumerating `AUDIT_FINDING_CODES` and `EVIDENCE_FINDING_CODES` by name at `:76-77` — the stored-fact species TECH_DEBT item 81 names, measured here as a control that would have been silently blind to all seven of 77's codes. Disjointness from doctor's `CONTROL_FINDING_CODES` is re-asserted over the derived set with its existing non-vacuity floors intact and no leg weakened, and PAIRWISE disjointness among the audit's own lane vocabularies is added — which `59/FF-5905` never claimed. 66's never-executes guard and 59's extension are both unweakened. **EXTENDS a guard already in service; the file resolves today, so this row carries no `pending`** and its red probe is the only evidence the change is armed: plant a 77 code equal to a doctor code and observe the failure. | `test/arch/acd-controls-never-execute.test.mjs` *(extended)* | ADR-008 §4, 59/FF-5905 |
| FF-7708 | **Every registered lane executes as ITSELF, declares a floor and a limit, and starts no child.** `REPORT_LANES` is asserted to carry one distinct `run` per entry with no two entries sharing a runner and no entry lacking one — the fall-through `report.mjs:384-388` names as the defect a fourth lane would have caused. Every lane the audit assembles is asserted to return a read record that passes `assertLaneRead` with a floor > 0, and every `text`-basis sweep to return a limit that passes `assertLaneLimits`, driven FROM THE REGISTRY over each lane so a fifth cannot arrive without them. No module 77 adds starts a child process — `node:child_process` is imported by none of them and none names `exec`/`execFile`/`execSync`/`spawnSync`/`fork` — which STRENGTHENS `59/FF-5904`'s "every child comes from one seam" to "these lanes start none", and is what makes 77's rules immune to TECH_DEBT item 72's class by construction. The face is asserted to INJECT the marker key and the resolved role routing rather than the family importing `src/claude-settings.mjs` or reading `work.agents.*`, and `--strict`'s exit rule is asserted UNCHANGED: `run()` returns the full set at both settings and only the exit code differs. `pending` | `test/arch/acd-audit-lane-registry-complete.test.mjs` | ADR-001, ADR-008 §3, §5 |

## Story partition

The landing order is **{77/00 ‖ 77/01 ‖ 77/02 ‖ 77/03 ‖ 77/04} → {77/05}** — two stages, five
stage-1 stories with no edge between them, and one stage-2 story that composes them.

- **77/00** — the prompt layer: `src/work-audit/prompt-layer.mjs` (stage 1) — FF-7701, FF-7702
- **77/01** — the hook wiring: `src/work-audit/hook-wiring.mjs` (stage 1) — FF-7703
- **77/02** — the seam liveness: `src/work-audit/seam-liveness.mjs` (stage 1) — FF-7704
- **77/03** — the reference corpus and the declared bounds: `src/harness-reference.mjs`,
  `src/work-audit/declared-bounds.mjs`, `scripts/refresh-harness-reference.mjs` (stage 1) — FF-7705
- **77/04** — the two roots: `src/work-audit/toolkit.mjs`, `src/work-audit-drive.mjs`,
  `census.mjs`, `evidence.mjs` (stage 1) — FF-7706
- **77/05** — the lanes are registered: `src/work-audit/report.mjs`, `src/commands/audit.mjs`
  (stage 2, needs 00–03; independent of 04) — FF-7707, FF-7708
