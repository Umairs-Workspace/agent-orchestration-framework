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
# 119 · The tree gets an interior — Architecture

## Every number here carries the command that produced it

This is item 83's closing rule (item 81's, generalised) applied to this document rather than quoted
in it: **a number in an ADR is a measurement claim, and a claim without its command is prose.** Three
prose-census errors in milestone 63 are the evidence base — ADR-005 §4 said two, ADR-010 §5 corrected
it to three, the truth was five; and 63's own `STORY.md` carried a "~1,700-line god-node" that was
2,377 lines when the sentence was written. Every figure below was measured at HEAD on 2026-09-06.

| claim | measured | command |
|---|---|---|
| `src/` flat root modules | **159** | `ls src/*.mjs \| wc -l` |
| — of which `mesh-*` / `work-*` | **31** / **40** | `ls src/mesh-*.mjs \| wc -l`; `ls src/work-*.mjs \| wc -l` |
| existing `src/` interior directories | **13** | `ls -d src/*/` |
| — of which already `work-*` named | **5** (`work-acceptor` 6 files, `work-audit` 10, `work-promote` 2, `work-trigger` 3, `work-tune` 5) | `ls -d src/work-*/`; `ls src/<d>/*.mjs \| wc -l` |
| `src/commands/*.mjs` | **99** | `ls src/commands/*.mjs \| wc -l` |
| — `mesh-*` / `assets-*` / `graph-*` | **17** / **9** / **6** | `ls src/commands/mesh-*.mjs \| wc -l` (etc.) |
| `src/command-core.mjs` import lines into those families | **14** / **9** / **5** = **28** | `grep -c '"\./commands/mesh-' src/command-core.mjs` (etc.) |
| — the other 4 of the 32 are intra-directory shared leaves | `graph-shared`, `mesh-face-shared`, `mesh-gate`, `mesh-session` | per-file `grep -q '"./commands/<f>"' src/command-core.mjs` |
| `src/command-core.mjs` prose ratio | **352** comment / **222** code = **61%** | `awk '{if($0~/^\s*\/\//)c++;else if($0~/^\s*$/)b++;else s++}END{print c,b,s}' src/command-core.mjs` |
| `test/*.test.mjs` / `test/arch/*.test.mjs` | **589** / **433** | `ls test/*.test.mjs \| wc -l`; `ls test/arch/*.test.mjs \| wc -l` |
| `scripts/test.mjs` | **5,142** lines, **1,023** imports, **1,025** spreads | `wc -l`; `grep -c "^import"`; `grep -cE "^\s*\.\.\.[A-Za-z]"` |
| module line counts | `mesh-worker-execution` **2,482** · `phase-brief` **1,651** · `agent-session-driver` **1,463** · `work-loops-checks` **1,284** · `command-core` **581** | `wc -l <file>` |

**The graph.** Built at this decision point with `aof graph build .` (no `--backend`; the code-only
build): **15,663 nodes / 38,293 edges, egress none, `builtAt 2026-09-06T00:48:13.342Z`**. Every
fan-in/fan-out figure below is `aof graph impact <file>` against that build, and each is *actual*
structure rather than inferred coupling.

| module | dependents ← | imports → |
|---|---|---|
| `src/work.mjs` | **293** (281 non-`wiki/`) | 7 |
| `src/command-core.mjs` | **167** | **93** (92 of them `src/commands/*.mjs`, plus `src/work.mjs`) |
| `src/mesh-worker-execution.mjs` | **56** (4 source/scripts, 50 suites, 2 fixtures) | **30** |
| `src/board-worker-stream.mjs` | **11** | 7 |
| `src/phase-brief.mjs` | 15 | 0 |
| `src/work-loops-checks.mjs` | 20 | 0 |

**One inherited number is corrected here.** Item 84 calls `src/command-core.mjs` "the highest fan-in
module in the tree" (measured 145, then 167). It is not: `src/work.mjs` is, at **293** dependents —
`aof graph impact src/work.mjs`, and `| grep "imported/called by" | tr ',' '\n' | grep -vc "wiki/"`
gives 281 outside `wiki/`. Item 84's finding (the file is 61% prose) is unaffected; its superlative
is wrong, and ADR-005 §3 turns the correction into a constraint rather than a footnote.

**Wiki citation prices**, which ADR-004 turns on. `grep -ro '<pattern>' wiki/ | wc -l`, and
`grep -rlo … | wc -l` for the document count:

| pattern | citations | documents |
|---|---|---|
| `src/mesh-[a-z0-9-]*\.mjs` | **1,500** | 293 |
| `src/work-[a-z0-9-]*\.mjs` | **1,605** | 358 |
| `src/work-{acceptor,audit,promote,trigger,tune}/` | **536** total (100 / 262 / 31 / 71 / 72) | — |
| `src/commands/mesh-…` / `assets-…` / `graph-…` | **225** / **21** / **59** | — |
| `test/arch/[a-z0-9-]*\.test\.mjs` | **2,103** | 399 |
| `test/[a-z0-9-]*\.test\.mjs` | **1,558** | — |

**Cited control paths** (ADR-004's live gate): importing `citedControlPathsIn` from
`src/work-doctor-controls.mjs` and running it over every `wiki/work/*/ARCHITECTURE.md` yields **157
distinct control paths**, all under `test/arch/`, declared across **175 register rows** in **20**
documents, with **0** already unresolvable at HEAD.

---

## ADR-001 — "No behaviour change" binds PRODUCT surfaces; a guard that forbids the fix is in scope to change

**Context.** The SPEC's out-of-scope list says "any behaviour change, ratchet raise, or new
capability", and its Objective simultaneously puts two *guards* in scope to be re-ruled (items 61 and
81). Read naively these contradict each other: item 61's fix IS a change to a control's behaviour.
Every subsequent ADR needs the line drawn once, or five stories will each draw it differently.

**Decision.** "No behaviour change" binds the **product**: the registered command set and its routes,
each command's argv and output, the shipped bundle's contents, every suite's assertions and every
`.feature`'s observable outcome. It does **not** bind a **control's own resolution rule** where that
rule is the thing forbidding the fix. The milestone's title says so — *"the guard that forbids the
fix"* — and its Objective names blockers as in scope ahead of the moves.

Concretely, three control-side changes are admitted and nothing else is:

1. **A purity predicate's subject widens from a file to a module family** (ADR-002).
2. **A control's assertion changes from a stored literal to a derivation** (ADR-003), with the
   assertion's *meaning* preserved — a derivation that asserts less is a weakening, not a fix.
3. **A cited path resolves through recorded renames as well as at HEAD** (ADR-004).

**Alternatives.** (a) *Read the SPEC strictly and change no control.* Then item 61's four instances
stand unfixed, `test/arch/**` cannot move at all (ADR-004), and the milestone reduces to a rename of
`src/commands/`. Refused: it contradicts the SPEC's own Objective. (b) *Treat "no behaviour change"
as advisory.* Refused: it is the milestone's whole verifiable outcome — the same suites pass.

**Consequences.** Each of the three changes owes a **red probe over the OLD predicate as well as the
new one**: a control that has been widened must be shown to still fail on the defect it was written
for. ADR-002's and ADR-003's registers say which mutation. Anything not on the list of three is a
finding at structural review, not a judgement call.

---

## ADR-002 — A purity guard constrains a module's EXTERNAL dependencies, not its file count; a `src/<name>/` directory is ONE module

**Context (item 61, four measured instances).** Three landed controls read purity as a **text ban on
the token `import`**, which makes the only decomposition that would fix a module's size illegal:

| control | file | the leg | subject |
|---|---|---|---|
| `70/FF-7002` | `test/arch/session/acd-session-driver-single-home.test.mjs:114` | `assert.doesNotMatch(leafSource, /\bimport\b/u, "the phase-brief leaf imports nothing from src/ (pure)")` | `src/phase-brief.mjs` |
| `70/FF-7010` | `test/arch/work/acd-phase-brief-single-bag.test.mjs:233` | `assert.doesNotMatch(compiler, /\bimport\b/u, "the compiler that owns addressing pulls in nothing — not even a node builtin")` | `src/phase-brief.mjs` |
| `58/FF-5804` | `test/arch/loop/acd-loop-checks-pure.test.mjs:150,198,257` | `assert.doesNotMatch(checksSource, /^\s*import\b/mu, "the checks leaf still has zero imports")` | `src/work-loops-checks.mjs` |

The cost is measured, not projected: `src/phase-brief.mjs` is **1,651** lines (432 when 70/ADR-002
was written), `src/work-loops-checks.mjs` **1,284** (380 when 52/ADR-007 was). The fourth instance is
worse than size — the checks leaf may not import `src/work-audit/`'s sweep declarers, so it holds a
**byte-copy** of them and `59/FF-5908` exists to bind two of the three copies while the third
diverges unwatched. A guard whose enforcement produces a duplicated home has stopped protecting the
property it names.

**Decision.** A purity guard constrains a module's **external** dependency set. A module is a
**family**: `src/<name>.mjs` when only the file exists, or **every `.mjs` under `src/<name>/`** when
the directory exists. An import whose specifier resolves **inside the family** is not an import
**out of** it. Nothing else about the guards weakens.

**The predicate, exactly.** Every purity control replaces its token ban with:

1. **Resolve the family.** `src/<name>/` if it is a directory, else `src/<name>.mjs`. Assert the
   family is non-empty and that at least one file was read (non-vacuity: a rename must not empty it).
2. **Strip comments through the one home** — `stripComments` from `test/support/source-slice.mjs`,
   never a hand-rolled stripper. That is TECH_DEBT item 24's ratchet
   (`test/arch/audit/acd-comment-stripper-order.test.mjs`) and it is why the old token ban was
   over-broad: `/\bimport\b/` also matches the word in a comment, in a string and in `import.meta`.
3. **Extract each static and dynamic import specifier** per family file.
4. **Classify.** A specifier resolving to a path inside the family → **admitted**. Anything else — a
   bare specifier, a node builtin, a relative path leaving the family → **violation**, with the
   offending file and specifier in the message.
5. **Leave every other leg untouched, per file, over the whole family**: no `node:fs`, no `readFile`
   / `readdir` / `stat` / `access`, no `process.cwd`, no `Date` / `performance` / `hrtime`, no
   `fetch`, no dynamic `import()` reaching outside. Node builtins stay banned. **The guard is not
   relaxed; only its unit changes.**

**Alternatives.** (a) *Hold the current reading and record that both files grow without bound* —
item 61's own second option. Refused on the fourth instance: it now produces duplicated homes, not
just large files. (b) *Exempt the two named files.* Refused: item 61 says explicitly that three
instances is past the point where a fourth is ruled ad hoc; a named exemption is a fifth instance
waiting. (c) *Allow node builtins too, since they are deterministic.* Refused as out of scope under
ADR-001 — it weakens a delivered contract, and no measured problem asks for it.

**Consequences.** The decompositions become legal; **this milestone does not perform them.** The SPEC
scopes five in-scope bullets and neither `src/phase-brief/` nor `src/work-loops-checks/` is among
them. Story 1 changes the predicate and proves the change; the splits are separate work, now
unblocked. The red probe has two halves and both are owed: an intra-family import must now be
**green** where the old predicate was red, and a `node:fs` import in any family file must still be
**red**. FF-11901 asserts the class rather than the three instances, so a fourth purity guard written
next year cannot re-introduce the token ban.

---

## ADR-003 — A control may STORE a decision; it must DERIVE a fact. Carriers are loud, silent, or unfixable — and only the last two are defects

**Context (item 81).** Item 81 names a species — a control asserting against a stored fact about the
tree transfers an editing obligation to a stranger — and offers two remedies. It has forced **four
consecutive stories** of one milestone outside their declared write sets. This milestone moves
several hundred files, so the ruling is load-bearing for stories 2–5 rather than decoration.

**The distinction item 81 does not draw, and everything turns on it.** Not every stored literal is
the same defect. Sort carriers by **what happens when the tree moves under them**:

- **LOUD** — the control opens a path that no longer exists, or imports a specifier that no longer
  resolves. It fails immediately, names the file, and the moving story fixes it in the same diff.
  *This is not a defect.* A control must name its subject; naming it is what makes it a control.
- **SILENT** — the control's assertion goes **vacuous**. The subject set empties and the assertion
  passes over nothing. Nothing anywhere says the invariant stopped being enforced.
- **UNFIXABLE** — the control is loud, but its subject is an **immutable delivered document**. It
  reports forever and no legal edit clears it. ADR-004 is one whole instance of this class.

Measured specimens, one per moving story:

- **SILENT — `test/arch/mesh/acd-mesh-ui-single-data-command.test.mjs:70-86`.** It reads
  `(await readdir(COMMANDS_DIR)).filter((n) => n.startsWith("mesh-") && n.endsWith(".mjs"))` inside a
  `try/catch` that sets `files = []`, and its own comment says it is *"absence-tolerant … joiners is
  [] today (vacuously ≤ 1)"*. Failure mode, concretely: **input** — story 3 moves
  `src/commands/mesh-*.mjs` into `src/commands/mesh/`; **state** — the readdir returns no `mesh-*`
  name, so `joiners` is `[]`; **outcome** — `joiners.length <= 1` passes and `25/ADR-002`'s "at most
  one fleet-data path" is asserted over the empty set, permanently, with no message anywhere.
- **LOUD, with a stored census — `test/arch/loop/acd-loop-finding-envelope.test.mjs:484-499`.** A closed
  9-member `expectedFiles` list plus `files.length >= expectedFiles.length` over a non-recursive
  `readdir("test/arch")`. Story 4's interior fails it loudly *and* the census must be re-typed.
- **LOUD, and correctly so — `test/arch/audit/acd-controls-never-execute.test.mjs:652-663`.** The
  `leaf.startsWith("work-doctor")` filter is backed by `assert.ok(edges >= 1, …)`, so story 2's move
  reds it rather than emptying it. This is the shape the ruling wants; it is cited as the model.

`grep -rlE 'startsWith\("(mesh|work|assets|graph|loop|acd)-' test/arch/*.test.mjs | wc -l` returns
**4** candidates; three are carriers and the fourth filters finding *codes*, not filenames. The
candidate set is not the answer — the control below is.

**Decision.**

1. **A control may STORE a DECISION. It must DERIVE a FACT.** A ceiling, a floor, an allow-list that
   encodes a *policy* ("only these two modules may open the store") are decisions — a reader cannot
   compute them from the tree, and pinning them is the point. A count of files, an exact member
   census, a list of suites that import X, a `<path>:<line>` — these are facts *about* the tree,
   derivable from it, and a control that retypes one asserts the past.
2. **Ratchet constants are DECISIONS and stay.** Item 81 classes them as carriers; that is a
   misclassification. `SINK_CEILING` in `test/arch/session/acd-session-driver-single-home.test.mjs:39`
   declares a bound nobody can derive. Item 83 is right that it must not be softened or deleted. What
   *is* ruled: a ratchet is **shrink-only**, so lowering it never needs an ADR, and this document is
   the ADR its failure message demands for any move story 5 makes.
3. **An exact equality over a derivable set becomes a derivation plus a floor.**
   `assert.equal(suites.length, 48, …)` in `test/agent-session-driver-door.test.mjs:598` (and `54` at
   `:601`, `48` at `:660`, `53` at `:715`) states a fact; its *purpose* is non-vacuity. The derived
   form asserts the real property over **each** member and keeps a **floor** for non-vacuity. The
   floor is a decision and may stay stored; the equality goes.
4. **A silent carrier is a defect at any size; a loud one is not.** Every sweep asserts its own
   non-vacuity — the subject set is non-empty and was really read — so a move can never make a
   control pass by emptying it.

**The remedy, chosen.** Item 81 offers two. **We take (a), the census control over the censuses, and
refuse (b), the refine-time "which controls does this write set trip?" answer** — on the merits:

- **(b) is structurally blind to the class that matters.** Running the suites a write set's files are
  named in finds carriers that FAIL. A silent carrier does not fail: it passes over nothing. The
  `acd-mesh-ui-single-data-command` specimen above would be reported **green** to the story that
  broke it. A remedy that reports green on the defect is not a remedy.
- **(b)'s output is itself a stored fact.** The answer is written into a story's `files:` at refine
  and is stale the moment another lane lands. That is species 1, one level up.
- **(b)'s useful half is already free.** Loud carriers announce themselves the first time the story
  runs the suite, in the same seconds, with the file named. That *is* the discovery mechanism, and it
  costs nothing to build.

**Alternatives.** (c) *Repeat item 80's per-file remedy — name each carrier in each story's write
set.* Refused with item 81's own measurement: it means enumerating every closed literal in 589 `test/`
and 433 `test/arch/` files per story, which is not a thing an author can do by reading. (d) *Delete
the censuses.* Refused: `61/FF-6105` cross-reads two of them, so they are load-bearing.

**Consequences.** FF-11902 is this milestone's ratchet and lands in story 1, before any file moves.
It must be **non-vacuous over this tree on the day it lands** — it names the carriers it finds and
each is derived or given its floor, which is how the number in it is produced rather than claimed.
Stories 2–5 then inherit a tree in which a move cannot silently disarm a control.

---

## ADR-004 — The THIRD blocker, measured at this refine: a cited control path resolves only at HEAD, so ANY control move makes 175 rows in 20 immutable registers `control-unresolved`. One resolver, one home, three readers

**Context.** The SPEC names two blockers. There is a third, and it was found by measuring rather than
by reading. `src/work-doctor.mjs:513-529` resolves every control path cited in every item's
`## Fitness functions` register with a bare `stat(path.join(projectRoot, control))`. Measured:
**157 distinct control paths, 175 register rows, 20 `ARCHITECTURE.md` documents, 0 currently
unresolvable** (`citedControlPathsIn` from `src/work-doctor-controls.mjs`, run over every
`wiki/work/*/ARCHITECTURE.md`).

Story 4 moves `test/arch/**`. **All 157 stop resolving.** Those 20 registers belong to **done** items,
where a `pending` marker is not admitted and cannot be re-added, and where delivered records are
immutable — this repo's own rule, restated in TECH_DEBT item 10's chore-106 amendment, which refused
a family fold precisely because it would strand citations no legal edit could clear. So the move as
scoped would leave `aof work doctor` reporting 175 permanent `control-unresolved` findings, and there
is no edit that clears them.

The same gap, one universe over and worse: **no gate in this tree resolves a `src/` path citation at
all.** That is chore 106's second limb, and it is why folding `src/mesh-*` (1,500 citations / 293
docs) and `src/work-*` (1,605 / 358) would decay silently and permanently.

**Decision.** **A path cited in a delivered document resolves if it exists at HEAD OR if the
repository's own history records a rename from it.** One resolver, in `src/`, with two readers:

1. `src/work-doctor.mjs`'s control probe — replacing the bare `stat`, so `control-unresolved` keeps
   its exact meaning ("this register declares a control that does not exist") and stops meaning
   "somebody moved a file".
2. FF-11903's sweep over `src/**.mjs` path citations in `wiki/work/**`, which is the universe no gate
   has ever covered.
3. **A suite path cited in a delivered `.feature` — AMENDED AT 119/03, and the amendment is the
   condition on which that story is admitted at all.** Measured at the tip of 119/03's move: **489
   citations across 156 immutable task features** name an evidence suite by path
   (`test/work-loops-record.test.mjs`, `test/arch/loop/acd-loop-records-parse.test.mjs`, …). A `.feature`
   is a delivered acceptance criterion — not annotable, not taggable — so there is no legal edit
   that repairs them, and readers 1 and 2 do not reach them: one resolves paths cited in
   `## Fitness functions` REGISTERS, the other sweeps **`src/`** citations. A `test/…test.mjs`
   citation in a `.feature` BODY is neither. This is precisely the pair of conditions chore 106
   refused a fold for — the repair forbidden and the decay unreported — and it is the pair this ADR
   already broke once, for the `src/` axis, by resolving rather than rewriting. The reader lives at
   `test/support/cited-suite-path.mjs`; it imports `resolveCitedPath` and spells no rename rule of
   its own, adding only the impure `git log` edge the resolver deliberately does not carry, memoized
   per process. Its callers owe a non-vacuity leg (`renameMapProblems`), because an EMPTY map
   answers "unresolved" for every moved path and is indistinguishable from the strand it clears.

**Why this was not seen at refine.** The story priced the `test/arch/**` CONTROL-path citations it
would strand — 163 distinct paths across 183 register rows in 21 documents — and was admitted on that
arithmetic. The `.feature` evidence axis was never measured, and task 00's own "what would quietly
undo this" list contemplates re-pointing an immutable register by hand but not a citation class with
no resolver at all. The lesson is the ADR's own: an axis nobody measures is an axis nobody prices.

The rename map is **derived, not stored** (ADR-003): it comes from git's own rename records
(`git log --diff-filter=R -M --name-status`), which are history and therefore cannot go stale. No
`MOVES.md`, no hand-kept redirect table — that would be species 1 at the scale of 3,105 citations.

**This is what admits the `src/` fold.** TECH_DEBT item 10's chore-106 amendment sets the test: price
the fold in stranded citations, and refuse it when the price exceeds the root count it buys. Re-run
here rather than inherited, the per-module price is *worse* than the fold that was refused —
1,500/31 = 48 and 1,605/40 = 40 citations per root module removed, against the doctor family's
214/8 = 27. Taken on that arithmetic alone, **every** fold is refused and the milestone is empty.
But that arithmetic is only half of chore 106's argument. Its other half is *"and nothing would
notice — the decay would be silent and permanent."* With a resolver, the decay is neither: a stranded
citation resolves, and one that cannot is reported. The fold is admitted **because and only because**
the resolver lands with it. Item 10's amendment already reserved this: *"the partition is taken once,
deliberately, with the citation cost priced across the whole root."* This is the price, and this is
how it is paid.

**Alternatives.** (a) *Rewrite the citations.* Refused — 3,661 of them are in immutable delivered
registers; the rewrite is forbidden, not merely large. (b) *Leave `test/arch/` flat and give only
`test/` an interior.* Refused: `test/arch/` at 433 siblings is the larger half of item 63 and the
faster-growing one. (c) *Downgrade `control-unresolved` to warn tree-wide.* Refused — it blinds the
gate for every future item to buy this one milestone's move, which is the trade this ledger exists to
refuse. (d) *Have the sweep carry a baseline of known-dangling paths.* Refused as species 1 under
ADR-003.

**Consequences.** The resolver is story 1's, with the other two blockers, and stories 2–5 all depend
on it. FF-11903 carries a **shrink-only ceiling on the count of unresolvable `src/` citations**,
pinned to the count measured on the day it lands with that command in the constant's comment
(`SINK_CEILING`'s idiom, and a decision rather than a fact under ADR-003 §2) — because that count is
not zero today and a control that must be green before it can land is a control that never lands. The
red probe is a planted citation to a `src/` path that never existed. **The moves in stories 2–4 are
not admitted until this lands** — that is the ordering constraint, and it is not negotiable by a
story that finds it inconvenient.

---

## ADR-005 — The `src/` interior is `src/mesh/` + `src/work/` + one subject-named home; the five existing `src/work-*/` directories are NOT nested, and `src/work.mjs` does not move

**Context.** Item 10 has owed the `src/mesh/` + `src/work/` partition since 43/04. 159 flat root
modules; `mesh-*` (31) and `work-*` (40) are **44.7%** of them.

**Decision.**

1. **`src/mesh/`** takes all 31 `src/mesh-*.mjs`, stripping the prefix
   (`src/mesh-worktree.mjs` → `src/mesh/worktree.mjs`). No name collides:
   `ls src/mesh-*.mjs | sed 's|src/mesh-||' | sort | uniq -d` is empty.
2. **`src/work/`** takes all 40 `src/work-*.mjs`, same rule, same emptiness check.
3. **The five existing `src/work-*/` directories are NOT nested inside `src/work/`.** Priced as item
   10's amendment requires, re-run rather than inherited: **536 wiki citations** (`work-audit` 262,
   `work-acceptor` 100, `work-tune` 72, `work-trigger` 71, `work-promote` 31) to buy **zero**
   reduction in root **modules** — item 10's metric counts root-level `.mjs`, and a directory is not
   one. Price exceeds buy; refused. The coexistence is ruled coherent rather than tolerated: **`src/work/` is the
   home for work-family modules, and `src/work-<subject>/` is the established home for a work-family
   SUB-family, born at its first module** (chore 106's rule 1). The next sub-family is born
   `src/work-<subject>/`.
4. **`src/work.mjs` does not move**, and this is graph-grounded rather than aesthetic. It has **293**
   dependents (281 outside `wiki/`) — the highest fan-in in the tree — and it is the **one non-command
   module `src/command-core.mjs` imports**. Leaving it at the root is what keeps
   `src/command-core.mjs` **entirely out of story 2's write set**, which ADR-006 then needs. Its name
   is `work.mjs`, not `work-*`, so it is outside the family by the rule as written.
5. **`src/board-worker-stream.mjs` gets its subject name** — `src/cache-read.mjs`. Item 10 set the
   trigger at *"the tenth dependent, or the `src/mesh/` partition, whichever comes first."* Both have
   fired: `aof graph impact src/board-worker-stream.mjs` reports **11** dependents (9 when the
   trigger was written), and the partition is this milestone. The module contains no render and no
   HTTP; its name asserts a layer its eleven dependents contradict, which is the shape 43/ADR-016
   named. It goes to the root as `src/cache-read.mjs`, not into `src/mesh/` — its readers span the
   spine (`work-read`, `commands/doctor`) as well as the mesh, so a mesh home would repeat the
   error one directory in.

**Alternatives.** (a) *Fold `mesh-*` only and defer `work-*`.* Refused: SPEC scopes both, the
citation price is paid once by ADR-004's resolver either way, and a half-taken partition leaves the
next architect re-deciding it. (b) *Fold by sub-subject (`src/work-doctor/`, `src/work-loops/`, …).*
Refused — chore 106 priced and refused exactly that for the doctor family, and item 10's rule 3 says
per-family folds taken one at a time strand citations repeatedly for a handful of modules each.
(c) *Move `src/work.mjs` into `src/work/` as `index.mjs`.* Refused on §4's coupling.

**Consequences.** Root-level `.mjs` goes **159 → 88** (`159 - 31 - 40`, `src/cache-read.mjs` being a
rename rather than a removal), a **44.7%** reduction, and FF-11904's row is re-pinned to the measured
result. Every dependent's import line rewrites — that is the whole of the diff, and ADR-008 is how it
is proven to be the whole of it. `src/mesh-worker-execution.mjs` moves to
`src/mesh/worker-execution.mjs` **as a pure move, body unchanged**, which is what makes ADR-007's
split an intra-family act.

---

## ADR-006 — `src/commands/` gets `mesh/`, `assets/`, `graph/`; `src/command-core.mjs` has exactly ONE writing story, so items 78 and 84 are ONE story

**Context.** `src/commands/` is 99 flat siblings and the fastest-growing flat directory in the tree
(item 78: 18 → 91 in two months; 99 six days later). Item 84 is a prose sweep over
`src/command-core.mjs`, which is **61%** comment (352 / 222) and gains ~16 prose lines per command
arrival written in two places.

**The graph fact that decides the partition, and item 78 states its converse.** Item 78 says the move
is safe because *"the route table in `src/command-core.mjs` is unaffected — a command's route is
declared in the command, not derived from its path."* True of the **route**. Not true of the
**import block**: `aof graph impact src/command-core.mjs` reports 93 outbound edges, 92 of them
`src/commands/*.mjs` imported **by path**. `grep -c '"\./commands/mesh-' src/command-core.mjs` = 14,
`assets-` = 9, `graph-` = 5 — **28 import specifiers inside `src/command-core.mjs` rewrite** when the
three families move. Item 84's sweep rewrites the comment block sitting immediately above each of
those same import lines. **Two stories, one file, the same lines.**

**Decision.**

1. **`src/commands/mesh/` (17), `src/commands/assets/` (9), `src/commands/graph/` (6)**, prefix
   stripped. The four family members `src/command-core.mjs` does not import — `graph-shared.mjs`,
   `mesh-face-shared.mjs`, `mesh-gate.mjs`, `mesh-session.mjs` — move with their families and become
   intra-directory leaves, which is the shape the directory was always describing.
2. **`src/command-core.mjs` has exactly ONE writing story in this milestone.** 63/ADR-009 §2 already
   had to name it a sole-writer file, and 63 pushed its append onto a terminal story explicitly to
   stop five stage-1 stories colliding here. It is the second-highest fan-in module in the tree
   (167 dependents). **Therefore items 78 and 84 are one story** — not because they share a species,
   but because they share the same lines of the most contended file in the repository.
3. **The prose sweep is item 84's own prescription, unmodified.** Each registry entry keeps a
   **one-line citation** (`// mesh:assign — 35/ADR-001 §3 (dedicated writer), 63/ADR-008 §7`); the
   paragraph moves to the command module's own header, where a fuller version usually already exists.
   The **deferred-import comments explaining the TDZ ring (item 26) are exempt and stay** — item 84
   names them as the one class of comment here that earns its place.
4. **No comment-density ratchet.** Item 84 says so and item 78 declines the same trap: a density cap
   lands on the next milestone to register a command for a reason that has nothing to do with it,
   which is item 61's measured failure. FF-11908 asserts the **shape** (no entry carries a paragraph)
   over the file that exists, not a number over a file that will.

**Alternatives.** (a) *78 and 84 as two stories, sequenced.* Refused: a merge conflict on 28 adjacent
line-pairs in the tree's most contended file, for no gain — the two edits are literally the same
lines. (b) *Pair 84 with 83 as "the god-node story".* Refused in ADR-007 §2. (c) *Move `work-*` and
`loops-*` command families too.* Out of scope: SPEC names `mesh/`, `assets/`, `graph/` "in the order
their size justifies", and FF-11904's row makes the next one a visible decision rather than a drift.

**Consequences.** `src/commands/*.mjs` goes **99 → 67**. The 28 rewritten specifiers and the 93
rewritten comment blocks are one diff with one reviewer.
`test/arch/mesh/acd-mesh-ui-single-data-command.test.mjs:73`'s prefix filter is this story's named silent
carrier (ADR-003) and must be derived before the move, not after.

---

## ADR-007 — The two god-nodes do NOT pair with each other. Each pairs with the layer that owns its directory: item 84 with 78, item 83 alone and last

**Context.** The milestone's STATE asks whether items 83 and 84 are one story or two. They share a
species — an additive field per milestone under a ratchet that measures rather than resists — and the
question is whether the species is enough.

**Decision — two stories, but not the two the question assumes.** The species is not a write set, and
the graph says the pairing by species is the wrong cut.

1. **There is no edge between them.** `aof graph impact` on both: `src/command-core.mjs`'s 93 imports
   contain no `mesh-worker-execution`, and `src/mesh-worker-execution.mjs`'s 30 imports contain no
   `command-core`. Neither appears in the other's dependent list. Their write sets are **disjoint**;
   the only thing they share is a paragraph in the ledger.
2. **Item 84's write set is a strict subset of item 78's** (ADR-006): the same 28 import lines of
   `src/command-core.mjs`, with 84 rewriting the comments above them and 78 rewriting the specifiers
   on them. Pairing 83+84 would put **two** stories into `src/command-core.mjs` in one milestone,
   which is exactly what 63/ADR-009 §2 had to engineer around.
3. **Item 83's subject is a body, not a move, and its blast radius is measured**:
   `src/mesh-worker-execution.mjs`, 2,482 lines, **56 dependents** (4 source/scripts, 50 suites, 2
   fixtures) and **30** imports — a hub with high fan-in *and* high fan-out, so no side of it is
   cheap to change. That is a different act, with a different risk profile and a different red probe,
   from moving files between directories.
4. **Item 83 goes LAST, after ADR-005's move.** Story 2 moves the file to
   `src/mesh/worker-execution.mjs` as a pure move with an unchanged body; story 5 then splits it into
   siblings **inside `src/mesh/`**, which under ADR-002 is an intra-family act rather than a new
   family. Reversing the order would split the file at the root and then move four modules instead of
   one, multiplying the citation price ADR-004 is paying.

**The seams, from item 83, unchanged and not re-derived.** (2) **launch composition** — the
directive's `command`/`launch` reads and `composeDirectiveLaunchOptions`, already a self-contained
near-pure unit, the cheapest first cut. (1) **repo admission** — `workerHasRepo`, clone-on-miss, the
clone-credential/clone-url pulls, the scoped-checkout repoint; the largest single block, with its own
delivered control (`acd-assignment-repo-availability-loud`). (3) **worktree lifecycle** and (4) **run
bracketing and reporting** are named but are not required of this story: the milestone's success
condition is that the split is real and the seam holds, not that the file reaches a number.
**`createMeshWorkerExecutionHandler`'s exported surface does not change**, so the 56 dependents are
untouched by construction — that is what makes this a refactor rather than a rewrite, and FF-11907
asserts it rather than trusting it.

**Consequences.** `SINK_CEILING` (`test/arch/session/acd-session-driver-single-home.test.mjs:39`, currently
**2,482**, pinned with no headroom) is **lowered** to the post-split measured count, with the command
in its comment. Lowering is always admitted by a shrink-only ratchet, so no further ADR is owed.
`test/agent-session-driver-door.test.mjs`'s suite-fan-in equalities are derived by story 1 under
ADR-003 §3, so story 5 does not have to re-type them — which is the whole point of putting the
blockers first. Story 1 and story 5 both write
`test/arch/session/acd-session-driver-single-home.test.mjs`; because story 5 is last, that is a **sequential
handoff, never a concurrent write**, and it is declared here so the partition can hold it.

---

## ADR-008 — Every move is a move plus an import rewrite, and NO path in this tree is load-bearing for behaviour

**Context.** The SPEC's verifiable outcome is that the same suites pass and the counts fall. That is
checkable at the end. What is not checkable at the end is *why* it held — and item 78's claim ("a
command's route is declared in the command, not derived from its path") is true today and asserted by
nothing.

**Decision.** A move story's diff contains exactly two kinds of change: **a file at a new path**, and
**an import specifier pointing at it**. Anything else in a move story's diff is a finding at
structural review. And the property that makes this safe is stated positively and enforced:
**no route, no command name, no lane membership, no bundle target and no registry ordering is derived
from a filename or a directory name.** `COMMANDS` order is read by the route table and is preserved
as an array order, which is a declaration; it is not derived from a path.

**Alternatives.** (a) *Assert the outcome only — same suites green.* Refused: a green suite after a
move proves the move did not break what the suites cover; it does not prove no behaviour was derived
from a path, and the derivation would be found later by whoever moved the next file. (b) *Freeze the
registered command set by a stored census.* Refused under ADR-003 §1 — the set is derivable from the
registry, so it is derived.

**Consequences.** FF-11905 lands with the first move (story 2) and guards the three that follow. Its
red probe is a planted route derived from `path.basename(...)` in the face or the registry.

---

## ADR-009 — ONE directory-budget control with a row per flat layer, ceiling equal to the measured count, shrink-only — and it lands only because the decomposition is now admitted

**Context.** Item 10 asks for a root-level file-count ratchet and says it is *"only honest after the
grouping"*. Item 63 asks for a sibling-count ratchet. Item 78 says **do not** ratchet the count on its
own, because a cap with no admitted decomposition is item 61's measured failure. All three are right,
and the condition they all name — an admitted decomposition — is what ADR-002 and ADR-005 supply.

Item 78 also names the blind spot precisely: item 10's measurements walk `src/` root and stop, item
63's walk `test/arch/`, **and the fastest-growing flat directory in the tree is the one neither entry
can see.** Three separate ratchets would rebuild that blind spot with three separate blind spots.

**Decision.** **One** control, one **named table**, one row per flat layer:

| directory | ceiling |
|---|---|
| `src/` (root-level `.mjs`) | the measured count |
| `src/commands/` (direct children) | the measured count |
| `test/` (direct children) | the measured count |
| `test/arch/` (direct children) | the measured count |

with four legs, on `test/arch/testing/acd-ui-directory-budget.test.mjs`'s model (49/ADR-001, which is the
tree's own precedent for exactly this instrument, one toolchain over):

1. **The ceiling equals the measured count** — no headroom, `SINK_CEILING`'s rule — so the next
   sibling fails CI and arrives as a table edit with a reason, and a story that *reduces* a layer
   must lower its row or go red.
2. **Both directions** — a table naming three of four layers passes silently on the fourth. Every
   flat directory under `src/` and `test/` is either a row or a declared exemption.
3. **Non-vacuity** — each row's sweep really swept; a rename must red the row, not empty it
   (ADR-003 §4).
4. **A budgeted subject that no longer exists is a failure**, not a skip.

**Alternatives.** (a) *Three controls, one per ledger item.* Refused — it re-creates the measured
blind spot, and it is three files in the directory this milestone is shrinking. (b) *Land it in the
last story, once every count is final.* Refused: 49's own bad-cut 4 — *a ratchet authored after the
growth it was meant to question ratifies it.* It lands with the first cut (story 2) carrying all four
rows at that day's counts; stories 3 and 4 lower their own rows, which leg 1 forces.

**Consequences.** A sequential handoff on one control file across stories 2 → 3 → 4, declared here so
the partition holds it. The milestone adds **6** new arch controls to a tree whose problem is that
`test/arch/` has 433 flat siblings; that is recorded rather than counted as neutral, and after story
4 they land in their subject directories rather than flat.

---

## ADR-010 — The test tree's interior is a per-directory index the registry spreads; `registrationDecision` stays the single decider

**Context.** `test/` 589 flat siblings, `test/arch/` 433, and `scripts/test.mjs` at **5,142** lines
assembling **1,023** imports through **1,025** spreads into one exported array
(`scripts/test.mjs:3521`). Every story edits it. The measured rate is not holding, it is doubling:
+48 arch siblings and +580 registry lines in the three days before the last re-measure.

**Decision.**

1. **Group by subject, with a per-directory `index.mjs` that the registry spreads.** `scripts/test.mjs`
   imports and spreads **one index per directory** instead of one entry per suite, so a new suite is
   registered in its own directory's index and the registry stops growing a line per suite.
2. **The assembled array stays the single decider, and this is why the restructure is safe.**
   `59/FF-5903` moved registration authority from *reading the runner's source text* to *the
   assembled array*, at the cost of twenty-six suites that were imported and never spread; and
   `72/FF-7203` makes `registrationDecision` (`src/work-audit/census.mjs:276`) the **one** decider of
   which file contributed which entries. Both read the assembled array, so **a per-directory index is
   invisible to them by construction** — the array is identical. This is not a claim; it is why the
   two controls survive the change untouched, and FF-11906 extends the second rather than minting a
   sibling.
3. **No second membership derivation is authored.** An index that decides its own membership by
   `readdir` would be a second answer to the question `registrationDecision` already answers, and the
   two would agree until the day somebody changed the assembly.
4. **`scripts/test-unit.mjs` is not touched and does not become a second index.** It is TECH_DEBT
   item 71, whose fixes were re-measured and **refused** at HEAD; this milestone neither pays nor
   worsens it, and FF-11906's leg holds it to that.
5. **`test/arch/**` moves only after ADR-004's resolver lands.** 157 cited control paths in 20
   immutable registers depend on it.

**Alternatives.** (a) *A glob-driven registry — the runner discovers suites by `readdir`.* Refused:
it deletes the explicit-registration property that `59/FF-5903` bought with twenty-six dead suites,
and it makes "is this suite registered?" a fact derived at runtime with no diff to review. (b) *Group
`test/` and leave `test/arch/` flat.* Refused in ADR-004 §alternatives(b). (c) *Also split the three
oversized `work-loops-*` suites (items 64–66).* Out of scope by SPEC, and correctly so: split them
before the tree has an interior and they land back in a flat directory.

**Consequences.** `test/arch/loop/acd-loop-finding-envelope.test.mjs:484-499`'s stored 9-member
`expectedFiles` census is this story's named carrier (loud, and a species-1 census); story 1 derives
it. Two ledger entries this milestone does **not** discharge live in this write set and must not be
silently paid or worsened: **item 86** (`scripts/test.mjs` is strictly serial and bounds nothing) and
**item 27** (ten red suites). The story records what it did to each; neither is in scope.

---

## The god-node question, answered

**Two stories, and the pairing in the question is the wrong one.** Items 83 and 84 share a species and
nothing else: the graph reports no edge between `src/command-core.mjs` and
`src/mesh-worker-execution.mjs` in either direction, and their write sets are disjoint. Item 84's
write set is instead a strict subset of item **78**'s — the same 28 import lines of the same file —
so **84 goes with 78** (ADR-006), and **83 stands alone and last** (ADR-007). Pairing the god-nodes
would put two stories into `src/command-core.mjs`, the file 63/ADR-009 §2 already had to make a
sole-writer, and leave item 78's directory move stranded from the import block it actually rewrites.

---

## Proposed partition

Advisory. The product owner draws the final partition; this is what the measurements support.

| # | subject | discharges | rough write set | ordering |
|---|---|---|---|---|
| **1** | **Rule the guards that forbid the fix** — purity is external (ADR-002), a control derives facts and stores only decisions (ADR-003), and a cited path resolves through recorded renames (ADR-004). | items **61**, **81** (+ the third blocker ADR-004 names) | `test/arch/acd-{session-driver-single-home,phase-brief-single-bag,loop-checks-pure}.test.mjs`; the named silent/loud carriers; `test/agent-session-driver-door.test.mjs`; the new resolver module in `src/` + `src/work-doctor.mjs`'s control probe; 3 new controls | **FIRST. Nothing moves before it merges.** |
| **2** | **`src/` gets an interior** — `src/mesh/` (31), `src/work/` (40), `src/board-worker-stream.mjs` → `src/cache-read.mjs`. | item **10** | `src/mesh-*.mjs` → `src/mesh/`, `src/work-*.mjs` → `src/work/`, one rename, and the import line of every dependent tree-wide; 2 new controls (FF-11904, FF-11905) | after 1 |
| **3** | **`src/commands/` gets an interior, and the registry stops explaining itself twice** — `mesh/` (17), `assets/` (9), `graph/` (6), plus item 84's prose sweep over the same lines. | items **78**, **84** | `src/commands/{mesh,assets,graph}-*.mjs` → their directories; **28 import specifiers + 93 comment blocks in `src/command-core.mjs`** — the milestone's ONE writing story for that file; 1 new control | after 1; **sole writer of `src/command-core.mjs`** |
| **4** | **The test tree gets an interior** — subject directories under `test/` and `test/arch/`, a per-directory index the registry spreads. | item **63** | `test/**`, `test/arch/**`, `scripts/test.mjs` (5,142 lines → the index spreads); extends `test/arch/testing/acd-suite-registration-single-decider.test.mjs`; lowers FF-11904's rows | after 1 (**hard**: ADR-004); after 2 and 3, so the controls those stories land are moved once |
| **5** | **The mesh god-node is split on the seam its own prior extraction proved** — launch composition first, then repo admission. | item **83** | `src/mesh/worker-execution.mjs` + its new siblings inside `src/mesh/`; `SINK_CEILING` lowered; extends `test/arch/session/acd-session-driver-single-home.test.mjs` | **LAST.** after 2 (the file must already be in `src/mesh/`); sequential handoff with story 1 on that control file |

**On the ordering of 4.** Placing story 4 second — cutting the test tree's interior before the source
moves, so every control this milestone writes lands in its home directly — is defensible and was
weighed. It is not recommended: story 4 moves 1,022 files and rewrites the registry, and running it
concurrently with, or ahead of, three source-move stories makes every one of their diffs a merge
against a moving test tree. The cost of the recommended order is that the six controls this milestone
lands are declared at flat `test/arch/` paths and story 4 moves them, which is one register amendment
at story 4's structural review — a known, bounded, one-time cost against an unbounded merge risk.

**On the cap.** Five stories, five rows. There is no sixth candidate hiding here: items 64–66, 71, 79
and 86 all live in these write sets and all are explicitly out of scope.

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.

     `pending` is the TOKEN, not a position: it reports at warn while 119 is open and is NOT admitted
     at accept. `aof work doctor 119` reports each unresolved control as `control-unresolved`; what
     clears a row is landing the file or dropping the declaration, never re-marking it `pending`.
     A control's marker flips when its story MERGES, never when its story is reviewed.

     Each declared control owes a RED PROBE in VERIFICATION.md once it lands: what was changed to
     make it fail, and the message observed. Where a control is EXTENDED, the probe must red the
     control's ORIGINAL claim as well as the new leg (ADR-001's consequence).

     HARNESS SHAPE: every arch-test here exports an array of `{ name, run }` — never `{ name, fn }` —
     and is imported AND spread in `scripts/test.mjs`'s suite registry inside its own labelled story
     block. A suite imported and not spread is not registered (59/FF-5903). From story 4, that
     registration is through the suite's per-directory index (ADR-010 §1), and story 4's structural
     review amends the paths below for any control it moves.

     ONE ROW, ONE CONTROL FILE, ONE RED PROBE. Eight rows, eight distinct paths — six new files and
     two extensions of controls already in service, because a sibling control asserting what an
     existing one already guards is the duplication this milestone exists to remove.

     DELIBERATELY NOT RESTATED, because a control already in service asserts it and restating it here
     would be that same duplication:
       · "which suite file contributed which entries has ONE decider" — 72/FF-7203 already holds it;
         FF-11906 EXTENDS that control rather than joining it with a sibling.
       · "the doctor family's growth is governed by its named roster" — 59/FF-5905 holds it, and its
         `startsWith("work-doctor")` sweep is backed by a non-vacuity leg, so ADR-005's move reds it
         loudly and story 2 re-points it. No new row is owed.
       · "a control never executes what it reads" — test/arch/audit/acd-controls-never-execute.test.mjs
         already sweeps the whole tree and covers this milestone's six new controls on arrival. -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-11901 | **Purity is about external dependencies, and no purity guard in this tree asserts it by banning a token.** No control under `test/arch/` asserts a module's purity with a bare `doesNotMatch(source, /\bimport\b/)`-shaped token ban; every purity guard resolves its subject as a **family** (`src/<name>/` if the directory exists, else `src/<name>.mjs`), strips comments through the one home (`test/support/source-slice.mjs`, TECH_DEBT item 24's ratchet), extracts each static and dynamic import specifier, and classifies **intra-family as admitted / everything else — bare specifier, node builtin, or a relative path leaving the family — as a violation naming the file and the specifier**. Asserted over the three carriers by reading their sources (`test/arch/session/acd-session-driver-single-home.test.mjs`, `test/arch/work/acd-phase-brief-single-bag.test.mjs`, `test/arch/loop/acd-loop-checks-pure.test.mjs`) and as a **class** over `test/arch/**`, so a fourth purity guard cannot re-introduce the token ban. Every other purity leg is asserted unweakened over the whole family: no `node:fs`, no `readFile`/`readdir`/`stat`/`access`, no `process.cwd`, no `Date`/`performance`/`hrtime`, no `fetch`, no outward dynamic `import()`. Non-vacuous: the family resolves to at least one file and at least one specifier was classified. | `test/arch/audit/acd-purity-is-external.test.mjs` *(pending — 119/00)* | ADR-002 |
| FF-11902 | **A control stores a DECISION and derives a FACT.** No control asserts an exact equality against a set derivable from the tree — a file count, a member census, a list of suites importing a module, an import allowlist — and no sweep can pass by going vacuous. Every sweep asserts its own non-vacuity (the subject set is non-empty and was really read), so a directory move reds the control instead of emptying it. A stored literal is admitted **only** as a declared bound (a ceiling or floor) or a policy allowlist a reader cannot compute, and each admitted literal carries the reason in its own comment. Non-vacuous over this tree on the day it lands: it names the carriers it finds, including `test/agent-session-driver-door.test.mjs`'s suite-fan-in equalities (derived, with the non-vacuity floor kept) and `test/arch/loop/acd-loop-finding-envelope.test.mjs`'s closed `expectedFiles` census. The red probe plants a `readdir(...).filter(prefix)` sweep with no non-vacuity leg. | `test/arch/audit/acd-control-derives-its-census.test.mjs` *(pending — 119/00)* | ADR-003 |
| FF-11903 | **A path cited in a delivered document resolves at HEAD or through a recorded rename.** Every `src/**.mjs` path token appearing under `wiki/work/**` resolves either to a file at HEAD or through the repository's own git rename records, via the single resolver `src/work-doctor.mjs`'s control probe also uses — one home, two readers, and no hand-kept redirect table (the map is derived from history, so it cannot go stale). Unresolvable citations are reported by name under a **shrink-only ceiling** pinned to the count measured on the day the control lands, with that command in the constant's own comment; the ceiling may fall and may never rise. The doctor's `control-unresolved` finding keeps its exact meaning — *this register declares a control that does not exist* — and stops meaning *somebody moved a file*, asserted over a fixture register citing a renamed control. Red probe: a planted citation to a `src/` path that never existed. | `test/arch/command/acd-cited-path-resolves.test.mjs` *(pending — 119/00)* | ADR-004 |
| FF-11904 | **Every flat layer is a row in ONE table, and the next sibling is a decision.** A single named table carries a per-directory sibling ceiling for `src/` (root-level `.mjs`), `src/commands/`, `test/` and `test/arch/`. Four legs: the ceiling **equals** the measured count (no headroom, so a new sibling fails CI and a story that shrinks a layer must lower its row); **both directions**, so every flat directory under `src/` and `test/` is either a row or a declared exemption and a table naming three of four layers cannot pass on the fourth; **non-vacuity**, so a rename reds a row rather than emptying it; and **a budgeted subject that no longer exists is a failure**, never a skip. Shrink-only across commits. Red probe: add a file to a budgeted directory without touching the table. | `test/arch/testing/acd-source-directory-budget.test.mjs` *(pending — 119/01)* | ADR-009 |
| FF-11905 | **No path in this tree is load-bearing for behaviour.** No route, command name, lane membership, bundle target or registry ordering is derived from a filename or a directory name: `src/command-core.mjs` and `src/spine/face.mjs` spell no `path.basename`/`path.dirname`/`path.parse`-derived identifier that reaches a route, a command id or a registry key, and the registered command set with its routes and declared flags is read **from the registry** rather than from any path. `COMMANDS` order is asserted to be a declared array order, which the route table reads, and not a directory listing. Red probe: derive one route from `path.basename(...)` in the face. | `test/arch/command/acd-path-is-not-behaviour.test.mjs` *(pending — 119/01)* | ADR-008 |
| FF-11906 | **One decider for suite registration, and the per-directory index does not become a second.** `registrationDecision` (`src/work-audit/census.mjs`) stays the sole answer to which file contributed which entries; the per-directory indexes are asserted to reach the registry by **import and spread** into the assembled array, with no index deciding its own membership by `readdir` and no second derivation of registration authored anywhere. The assembled array is asserted **unchanged in membership** across the restructure, which is why 59/FF-5903 and 72/FF-7203 survive it. `scripts/test-unit.mjs` is asserted not to have become a second index (TECH_DEBT item 71 is neither paid nor worsened). The existing single-decider control is **EXTENDED**, never joined by a sibling. Red probe: give one index a `readdir`-derived membership. | `test/arch/testing/acd-suite-registration-single-decider.test.mjs` *(extended; delivered — 119/03)* | ADR-010 |
| FF-11907 | **The mesh worker split subtracts; the seam does not grow back and the exported surface does not move.** `createMeshWorkerExecutionHandler`'s exported surface is asserted **identical** across the split (a set equality against the frozen export names, so the 56 dependents are untouched by construction); each extracted module is asserted **not** to import its parent back, and each extracted symbol is asserted **absent** from the parent, so the split is a subtraction rather than a copy. `SINK_CEILING` is lowered to the post-split measured count with the command in its comment and stays shrink-only with no headroom. The existing sink guard is **EXTENDED**, never joined by a sibling; story 1 and story 5 write this file in sequence, never concurrently. Red probe: copy one extracted function back into the parent. | `test/arch/session/acd-session-driver-single-home.test.mjs` *(extended; pending — 119/04)* | ADR-007 |
| FF-11908 | **The registry cites; it does not explain.** No entry in `src/command-core.mjs` carries a rationale paragraph: each command's registry comment is a **single line** whose content is a citation (`m?<itemRef>/<ID>` form), and the prose lives in the command module's own header. The deferred-import comments explaining the TDZ ring (TECH_DEBT item 26) are the one **exempt** class and are asserted still present, because deleting them is the failure this row must not cause. No comment-density number is asserted — a cap with no admitted decomposition is item 61's measured failure and item 78 declines the same trap — so the claim is over shape, over the file that exists. Red probe: restore one multi-line rationale block above a registry entry. | `test/arch/command/acd-registry-cites-never-explains.test.mjs` *(delivered — 119/02)* | ADR-006 |
