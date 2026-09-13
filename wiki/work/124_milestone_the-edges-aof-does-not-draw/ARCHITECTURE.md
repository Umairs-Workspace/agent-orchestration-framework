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
# 124 · The edges aof does not draw — Architecture

## Memory recall — what was surfaced, and what it changed

`aof work memory recall "advisory doctor lane depends edge verification loop correction scope cap
exhaustion" --area architecture --block`, run before the first ADR was written. Five records
returned; each honoured or departed from in writing, below.

- **`54/ADR-006`** (*a scenario join is DECLARED, never inferred, and an unjoined case is reported
  unjoined*) → **HONOURED, and it decides ADR-001.** The census cannot tell a phantom edge from
  legitimate capability ordering, so its code states what was measured (`unwitnessed`) and never
  renders the verdict, and what it could not evaluate is *reported* rather than omitted.
- **`52/ADR-004`** (*edges are five closed frontmatter keys on the SOURCE node; `depends` is
  untouched*) → **HONOURED.** 124 reads `depends:` and adds no key to it, and adds no authored field
  anywhere — the census's silence over drivers (ADR-001 §2) is the price of honouring this.
- **`53/ADR-003`** (*`aof work loop` scopes to a driver number or an `NN-MM` range ONLY — a
  story-shaped scope is a coded refusal, never a silent whole-stream walk*) → **HONOURED, and it
  supplied the bound ADR-005 §6 needed**: a plan hand-off whose ref falls outside the declared scope
  is a terminal halt naming the plan, never a silent widening of the walk.
- **`62/ADR-003`** (*a proposal's lane is COMPUTED from a declared edge, never authored*) →
  **HONOURED** by ADR-005 §4: the plan ref is derived from the item graph the stream already has.
- **`62/ADR-012`** (*the advisory lane's `from` is read through its target's own accessor*) →
  **HONOURED** by ADR-003: the contract sets are read through `src/story-contract.mjs`, the home that
  owns that grammar, and the census does not become that grammar's second reader.

---

## Every number here carries the command that produced it

Item 83's closing rule applied to this document: **a number in an ADR is a measurement claim, and a
claim without its command is prose.** Every figure below was measured on 2026-09-07 against the
**working tree** at `adca2f80`, which carries item 123's uncommitted diff to `src/work/loop.mjs`
(net +32 lines, entirely within `:180-361`). Line citations into that file are therefore working-tree
positions and sit ~32 lines below their `adca2f80` equivalents; `LOOP_STOPS` and `GATE_ORDER` are
unaffected. Stated because this document's own rule makes a citation a measurement claim. Where a figure is `RESEARCH.md`'s, the row says so and names its method rather than
re-stating it as if this document had measured it.

| claim | measured | command |
|---|---|---|
| `depends:` edges in this stream, all resolving | **230** | `RESEARCH.md` §Measurement 1 (`phantom-edge-census.mjs`, scratchpad throwaway over the real `work.mjs`/`story-contract.mjs` exports) |
| — evaluable (both contract sets present) | **48** = 34 grounded + 14 unwitnessed | same |
| — unevaluable **by type** (the dependent cannot carry `reads:`) | **125** | same, re-run at refine (see the correction note below) |
| — unevaluable, both stories, at least one set absent | **57** | same |
| — story → sibling-story edges (the census's whole domain) | **105** of 230 | same |
| unwitnessed edges surviving a directory-aware reading | **10** of 14 | same, second pass (`phantom-edge-census-2.mjs`) |
| `STORY.md` documents in the stream | **300** | `find wiki/work -name STORY.md \| wc -l` |
| — carrying a `files:`/`reads:` key at all | **68** | `grep -rl --include=STORY.md -E "^(files\|reads):" wiki/work \| wc -l` |
| — carrying a **non-empty** list | **67**, **1,569** entries total (889 `reads:` + 680 `files:`) | scratchpad frontmatter list parse via `storyContractList` over every `STORY.md` |
| contract entries authored as a **directory** (trailing `/`) | **8**, in **4** documents, all 119's | `grep -rn --include=STORY.md -E "^ *- *[A-Za-z0-9_./-]+/$" wiki/work \| wc -l` (and `-l … \| wc -l`) |
| entries that resolve to a real on-disk directory **without** a trailing `/` | **0** of 1,569 | `statSync().isDirectory()` over every resolvable entry |
| run records on disk | **90** | `find wiki/work -path "*/runs/*.json" \| wc -l` |
| — carrying `brief.progress` / `brief.review` | **0** / **0**; the only `brief` key ever present is `initiator` | that list piped through a `JSON.parse` counter over `.brief` |
| `CHECK_GROUPS` entries (doctor lanes) | **12** | `node -e "import('./src/work/doctor.mjs').then(m=>console.log(m.CHECK_GROUPS.length))"` |
| `LOOP_STOPS` members | **12** | `node -e "import('./src/work/loop.mjs').then(m=>console.log(m.LOOP_STOPS.length))"` |
| doctor lane modules declaring their **own** frozen code array | **3** (`doctor-controls`, `doctor-rubric`, `doctor-loop-record`) | `grep -n "FINDING_CODES = Object.freeze" src/work/doctor-*.mjs` |
| — of which name an `"error"` severity | **0** for rubric and loop-record | `grep -c '"error"' src/work/doctor-rubric.mjs src/work/doctor-loop-record.mjs` |
| `nextDecision(` occurrences in the shell | **7** (1 definition + **6** call sites) | `grep -c "nextDecision(" src/commands/loop.mjs` |
| — passing a `cycle` key | **0** | `grep -n "nextDecision(" src/commands/loop.mjs \| grep -c cycle` |
| `LOOP_FIX_TRANSPORT_KEYS` | **9** keys, **no `scope`** | `sed -n '516,526p' src/commands/loop.mjs` |
| module line counts | `commands/loop` **1,975** · `work/loop` **1,120** · `work/doctor` **881** · `commands/drive` **364** · `story-contract` **138** · `ready-wave` **80** | `wc -l <file>` |

**One correction to `RESEARCH.md`, made here rather than left standing.** It reports "no `cycle` key,
at any of its seven call sites". `grep` returns **seven occurrences**, one of which is the function's
own definition — there are **six** call sites. The finding is unaffected (none of the six passes a
`cycle`); the count is corrected because ADR-006 turns on it.

**A second correction, made at the contract beat and folded back here.** This table first reported
**124** type-unevaluable edges, which made the split `48 + 124 + 57 = 229` — one short of the 230 it
claims to partition. The missing edge is `78 → 79` (milestone → parentless story), which `RESEARCH.md`
carries as its own third row and this document collapsed into neither bucket. Under ADR-001's
two-bucket split it is **type** — a milestone dependent can never carry `reads:` — so the count is
**125** and the identity closes. This is load-bearing rather than cosmetic: FF-12401 asserts that
identity over this stream, so a control built to 124 reds on arrival.

**Stream drift, stated rather than silently re-measured.** `STORY.md` documents were **300** (68 with
a contract key) when these ADRs were measured and are **303** (71) after this refine authored 124's
own three story records. The 300/68 figures above are the measurement this document reasoned from;
the delta is this milestone's own three files.

**The graph.** Read at this decision point from `graphify-out/graph.json`, built
`2026-09-07T01:59:00.108Z` at commit `adca2f80` = HEAD (`built_at_commit` read directly from the
artifact; **15,928 nodes / 38,539 links**, egress none). The artifact is current for the tree these
ADRs describe, so it was consulted rather than rebuilt, and its age is surfaced here rather than
assumed. Every figure below is `aof graph impact <file>` against that build — *actual* structure,
not inferred coupling.

| module | dependents ← | imports → |
|---|---|---|
| `src/work/loop.mjs` | **43** | — |
| `src/commands/loop.mjs` | **36** | 17 |
| `src/work/doctor.mjs` | **25** | **13** (12 of them lane modules) |
| `src/work/doctor-controls.mjs` | **23** | 2 |
| `src/story-contract.mjs` | **5** | **0** (a true pure leaf) |
| `src/ready-wave.mjs` | **3** (`src/commands/next.mjs` + 2 suites) | 1 (`story-contract.mjs`) |
| `src/commands/drive.mjs` | 9 | 15 |

---

## ADR-001 — A census reports its DENOMINATOR or it is not a census: the lane names its domain, its two exclusions, and never the verdict "phantom"

**Context.** The census's premise holds — it names 14 edges with no data-flow witness (10 under the
most generous reading) — but **182 of 230 edges are outside its reach**, and the two reasons are not
the same fact. **124** are unevaluable *by type*: `reads:`/`files:` exist only on `STORY.md`, so
every milestone/uat/spike/chore endpoint is permanently outside the domain. **57** are two stories
where at least one has not declared the sets — a coverage debt that shrinks as a two-week-old
convention spreads (68 of 300 stories carry the keys today). Summed into one "unevaluable: 182" they
read as one problem; they are a **design boundary** and a **debt**, and only the second one time can
fix. A report that names 14 and stays silent about 182 describes 21% of the graph in a voice that
sounds like all of it — which is this milestone's own thesis (*a verdict that does not change what
runs next is a report*) pointed at its own first outcome.

**Decision.**

1. **The lane's subject is the `story → sibling-story` edge, and it says so in its own output.** Two
   codes, both `warn`:
   - **`depends-edge-unwitnessed`** — both contract sets present, zero intersection. It names what
     was measured, never the verdict. **"Phantom" is not a code**, because the check cannot separate
     a false edge from legitimate capability ordering (`96/03 → 96/01` is exactly that shape, spot-
     checked in `RESEARCH.md`), and `54/ADR-006` already rules that an inference the instrument
     cannot make is *reported unjoined* rather than asserted.
   - **`depends-edges-unchecked`** — the honest no-op, in this family's existing idiom
     (`rubric-join-unchecked`, `src/work/doctor-rubric.mjs:74-76`, itself quoting
     `roadmap-folder-mismatch` at `src/work/doctor-freshness.mjs:9-11`): *the leg did not run AND
     SAYS SO, naming what would activate it — never silence, and never an alarm.*
2. **The coverage finding is ONE per run, never one per edge, and its counts are split by reason.**
   One message carrying `considered`, `witnessed`, `unwitnessed`, `unchecked:type` and
   `unchecked:undeclared`. 182 per-edge findings is the wall of inherited red `78/ADR-007` refused
   by name ("a gate whose first act is to block the whole stream is not a gate, it is an outage") and
   the noise that made `observability/report.md` unread.
3. **The four counts are an identity, not a summary**: `witnessed + unwitnessed + unchecked(type) +
   unchecked(undeclared) = considered`, over exactly the edge set `validateWork` resolves. A census
   whose parts do not sum to its whole is a census that can quietly drop an edge class, which is the
   failure this ADR exists to prevent.
4. **No new authored field, anywhere.** The lane reads `depends:`, `reads:` and `files:` and nothing
   else; no template gains a key; `depends`'s own grammar is untouched (`52/ADR-004`).

**Alternatives.** (a) *Emit an unevaluable finding per edge.* Refused — 182 warns on day one, see §2.
(b) *Report only the phantoms.* Refused — that is the 21%-sounding-like-100% failure this ADR is
about. (c) *Extend `reads:`/`files:` to drivers so the other 124 edges become evaluable.* Refused: it
is a new authored field on every milestone in the stream, the SPEC forecloses it, and a milestone
edge legitimately encodes capability ordering that no file set can witness. The 124 are declared
out of domain, permanently, and the report says so on every run.

**Consequences.** The census's first run over this stream is itself the milestone's evidence and
belongs in `VERIFICATION.md` as measured output, not as a claim. On this stream today the lane
reports one `depends-edges-unchecked` (182) and 14 or 10 `depends-edge-unwitnessed` depending on
ADR-003 — the directory-aware reading is the one that ships, so **10** is the expected count and any
other number is a finding at structural review.

---

## ADR-002 — The advisory lane is the mechanism; "never gates" is raised from a promise about one lane to a CLASS claim on its third instance

**Context.** The mechanism already exists three times: a lane is a pure `(snapshot) => Finding[]`
appended as ONE entry to `CHECK_GROUPS` (`src/work/doctor.mjs:684-723`), carrying **its own frozen
finding-code array — a different array from `CONTROL_FINDING_CODES`** — which is what makes its codes
structurally incapable of reaching 54/02's doctor gate or the loop's `DOCTOR_GATE_CODES`
(`src/commands/loop.mjs:203-204`, *derived by filter* from that array, pinned by `54/FF-5410`).
`78/FF-7808` asserts the property four ways for the loop-record lane; two of its four legs are about
that lane's own subject (no door names the *signature*; an unsigned *record* blocks nothing).

**Decision.**

1. **The census ships as a fourth `CHECK_GROUPS` entry in that exact shape** — one appended entry,
   one new module `src/work/doctor-depends.mjs`, its own `DEPENDS_FINDING_CODES` frozen array, one
   `ADVISORY_SEVERITY = "warn"` module constant, and no consultation of the acceptance horizon
   (`66/ADR-002`'s `severityFor` answers `error` inside the horizon, which is precisely the
   hardening an advisory lane must not do).
2. **The never-gates property is asserted as a CLASS, not a fourth copy** (FF-12402): *every module
   registered in `CHECK_GROUPS` that exports its own frozen `*_FINDING_CODES` array is disjoint from
   `CONTROL_FINDING_CODES` and names no `"error"` severity literal* — with `doctor-controls.mjs`
   named as the one exemption, because its array **is** the gate's source. Today the class has three
   members (rubric, loop-record, census, all measured at 0 `"error"` literals); the point is the
   fourth, which cannot re-introduce a gateable code without reding CI.
3. **`78/FF-7808` is neither extended nor duplicated.** This is a departure from the
   extend-one-home default, and the reason is that its subject differs: its legs 3 and 4 assert that
   no door reads *the sign-off* and that *an unsigned record* blocks nothing — claims about
   `EXECUTION.md`, not about lanes. Generalising them would make a control named
   `acd-loop-record-never-gates` the home of a claim about a lane it has never heard of. FF-12402 is
   the **class ratchet** the third instance of a pattern earns, not a sibling of FF-7808: a
   lane-specific fourth control is what `119/FF-11906` refused.
4. **The lane is pure; the contract sets arrive as DATA.** Resolution happens at the engine's one
   impure edge — `src/work/doctor.mjs:418-467`, the per-item enrichment that already reads
   `EXECUTION.md` — and each story item gains a resolved `contract: { reads, files, present,
   malformed }`. The lane itself does no `readFile`, no `path.resolve` (it reads `process.cwd()`),
   no clock. **The enrichment lands in exactly one place**: `src/work/doctor-rubric.mjs:83-86`
   already records that two callers build the doctor's snapshot and *"a key read twice is a key that
   can be read two ways"*.

**Alternatives.** (a) *A `work:validate` check.* Refused — validate's findings gate, and the SPEC
requires advisory. (b) *Make it a gate later by moving its codes into `CONTROL_FINDING_CODES`.* Not
foreclosed, but it is an ADR-level act by construction (`66`'s eight codes are a consumed contract),
which is the point of the disjoint array.

---

## ADR-003 — The contract set has ONE home (`src/story-contract.mjs`), directory intent is AUTHORED rather than probed, and `ready-wave` adopts the predicate it has been missing

**Context.** The SPEC says the census "reuses the contract sets `ready-wave` already resolves".
It cannot: `declaredWriteSet` (`src/ready-wave.mjs:12-40`) is **private**, **story-only**, and
resolves `files:` alone. The reusable material is the pure leaf beneath it — `storyContractList` and
`resolveStoryContractPath` (`src/story-contract.mjs:71-114`), 0 imports, 5 dependents. Building the
census against the leaf directly, without changing anything, would put a **second** resolution of
"what does this contract entry mean" into the tree — the species `72/FF-7203` and `119/ADR-010` each
exist to keep at one.

There is also a live defect underneath. Collision detection is **exact-string** (`src/ready-wave.mjs:37`),
and `resolveStoryContractPath` strips the trailing slash before the string reaches a `Set`. So a
story declaring `files: [src/commands/]` and a sibling declaring `files: [src/commands/test.mjs]` are
seen as **disjoint** and waved into the same parallel wave, where they collide on disk. That is not
hypothetical: `119/02` declares `src/commands/` and `119/03` declares paths beneath it, and the
research's second pass found exactly four such edges. The same missing predicate is why the census
would report 14 unwitnessed edges when 10 is the truthful number — **one absent predicate, two
symptoms.**

**Decision.**

1. **Two additive exports on the pure leaf**: a resolver that answers a declared key as a resolved
   set (carrying `present`/`malformed` and `declaredWriteSet`'s untouched-scaffold rule), and
   **`contractSetCovers(set, entry)`**, the coverage predicate. Both stay pure: **`96/FF-9602` leg 1
   keeps this module at zero project imports**, and the predicate takes no filesystem.
2. **Directory intent is AUTHORED, not probed.** An entry covers another when it is equal to it, or
   when it was **authored with a trailing `/`** and the other sits beneath it. Measured, not assumed:
   **8 of 1,024** declared entries are authored with a trailing slash, and **0** resolve to a real
   on-disk directory without one — so the lexical rule reproduces the generous directory-aware
   reading on this stream *exactly*, with no `stat`. A filesystem probe would additionally make the
   census lane impure (ADR-002 §4) and would answer differently for a path that has not been created
   yet, which is precisely when a write-set collision matters most.
3. **`ready-wave`'s private helper collapses onto the shared home** and its collision check becomes
   coverage-aware. This is a **strict tightening** — every pair that collides today still collides —
   and that is asserted rather than argued (FF-12403), because a change to a parallelism gate that
   *widened* waves would be a silent correctness regression.
4. **Fixed in this item, not ledgered.** The whole change is two exports on an 80-line leaf and one
   call site in an 80-line consumer with 3 dependents, and it removes a second derivation instead of
   creating one. Deferring it would mean shipping the census as that second derivation and then
   paying to merge them — the cost of the fix is smaller than the cost of the entry.

**Alternatives.** (a) *Leave `ready-wave` alone and give the census its own predicate.* Refused: two
answers to one question, and the census's answer would be the more correct one, which is the worst
of the two failure modes. (b) *Probe the filesystem for directory-ness.* Refused on §2's measurement
and on purity. (c) *Make the census exact-string to "match the machinery".* Refused: it would report
4 of 14 findings that the tree does not have, and an advisory report with a 29% false-positive rate
is one nobody reads twice.

---

## ADR-004 — The SCOPE line is DROPPED from 124; the SPEC's premise is corrected here, and what would reopen it is stated as a command

**Context.** The SPEC grounds this outcome on a claim that is false: *"the run store records
`changeBaseline` and `progressBaseCommit` per cycle."* Neither value is persisted anywhere — they are
in-process locals threaded between `drivePhase` calls and discarded at exit. Independently:
**0 of 90** run records carry a populated `brief.progress` or `brief.review`. The findings-driven
correction cycle — the machinery a SCOPE line would ride — **has never completed once in this
repository's history**. `n = 0`.

**Decision. The outcome is dropped from this milestone.** Three reasons, and none of them is that it
is a bad idea:

1. **The arc's own rule.** `PRD-graph-engineering.md` requires a harness change to be
   *attempt/trace-evidenced, never speculative*. At `n = 0` **every** change to that machinery is
   speculative — not thinly evidenced, unevidenced.
2. **The SPEC's own bar refuses the cheap half.** *"A scope the agent can ignore is prose, and prose
   is what this milestone exists to replace."* Carrying a `## SCOPE` block without enforcement is the
   prose version; enforcement is a behavioural change on a path that has never executed here, so its
   red probe could only ever be a fixture.
3. **The honest first move on that seam is observation, and the SPEC already defers it** — the
   out-of-scope list defers per-loop observation as "downstream of a milestone not yet written",
   which is exactly what would have to exist for the premise to be measurable at all.

**The factual corrections, recorded so the next reader does not re-derive them:**

- `changeBaseline` is a git **tree** id and `progressBaseCommit` a **commit**; neither is persisted,
  and `progressBaseCommit` is never one side of any diff — it feeds `git rev-list --count` in
  `src/loop-progress.mjs:82-84`.
- The seam a `## SCOPE` block would attach to is **`composeFixInput(command, {findings,
  changeUnderReview})` at `src/commands/drive.mjs:87-93`** — which composes the maker-facing document
  as `## REVIEW FINDINGS` + `## CHANGE UNDER REVIEW` — **not `runBrief`** in `src/commands/loop.mjs`
  as the SPEC states. `runBrief`'s field set is `{loop, grade?, review?, progress?}` and never
  carried either value.
- `LOOP_FIX_TRANSPORT_KEYS` (`src/commands/loop.mjs:516-526`) is a 9-key in-memory bag with no
  `scope` key, and is not persisted either.

**What would reopen it, as a command rather than a feeling.** Both must hold:

```
find wiki/work -path "*/runs/*.json" | node -e '<count records with .brief.review or .brief.progress>'
```
returns a non-zero count — i.e. the correction cycle has completed at least once and left a trace —
**and** at least one such cycle's diff is measured touching files outside the failing unit's declared
`files:`. The first is the existence of the path; the second is the existence of the problem.

**What 124 preserves for it.** ADR-003's `contractSetCovers` is precisely the predicate an
enforcement would need ("is this changed path inside the failing unit's declared set"). It lands in
the one home, so the reopened outcome extends a predicate instead of authoring a third one.

**Consequence — the milestone's own sequencing constraint is discharged.** `SPEC.md` `## Dependencies`
and `STATE.md` both record that *"the two outcomes touching `src/commands/loop.mjs` collide with each
other on the same file and must carry a sibling `depends:` edge"*. With this outcome dropped, **one**
story writes `src/commands/loop.mjs` and the anticipated collision does not exist. That constraint is
superseded by this ADR; the partition below draws three independent stories with no sibling edge.

---

## ADR-005 — Cap exhaustion ASKS THE ENGINE and returns `drive <plan> refine`; the escalation is an attempt in the counter that already exists

**Context, corrected.** `work:loop` **already dispatches `refine`, live, today**: `decideLoopPhase`
returns phase `"refine"` for a milestone with zero stories (`src/work/loop.mjs:892-894`) and for a
story with no `.feature` tasks (`:900-901`), and `PHASES = ["refine", "continue", "verify"]`
(`src/commands/drive.mjs:39`) makes it a fully driven phase. `GATE_ORDER` is a *different, narrower*
declaration — the cost ladder inside one `continue` cycle — and is not this seam. The gap is
narrower and more interesting: the cap that actually halts is a **second, outer counter the shell
keeps for itself** (a local `cycles` Map, `src/commands/loop.mjs:1443-1446`), checked *after* the act
has been decided; when it trips it returns immediately (`:1454-1457`) without ever re-asking the
engine, so it never reaches the refine branch sitting one function away.

Note also what those existing refine branches are bounded by: **a fact, not a counter.** A milestone
with zero stories cannot take that branch twice, because refine gives it stories. That shape is the
model for §5.

**Decision.**

1. **The stop vocabulary is untouched.** `cap-exhausted` remains; there is no thirteenth member of
   `LOOP_STOPS`. What changes is what the decision carries, not what it is called.
2. **The decision is the ENGINE's.** `src/commands/loop.mjs:1454` stops constructing a
   `cap-exhausted` halt of its own and asks a pure decider in `src/work/loop.mjs`, passing the facts
   it holds (`ref`, `type`, `parent`, `phase`, `cycle`, `cap`, `scope`). One home for the decision;
   the shell keeps execution. FF-12404 asserts the shell mints no `cap-exhausted` halt itself —
   without that leg, the next cap site simply grows a third one.
3. **The return is the EXISTING act shape and the EXISTING phase** — `drive <planRef> refine`,
   byte-identical in shape to what `decideLoopPhase` already returns at `:892-894`. No new
   mechanism, no `GATE_ORDER` row, no new agent role, no new command.
4. **The plan ref is DERIVED, never authored** (`62/ADR-003`'s discipline): a story's plan is its
   parent milestone; a driver's plan is itself. It comes from the item graph the stream already has.
5. **The escalation is an attempt in the counter that already exists, and the exhausted unit is set
   aside.** The refine drive is a drive: it increments the shell's existing `cycles` Map under
   `${planRef}\0refine` and is bounded by the **same `resolved.cap`** — the SPEC's *"returning to
   the planner is itself an attempt and cannot recur without limit"*, made literal with **no new
   counter and no new persisted key**. The exhausted unit is then **set aside for the remainder of
   the invocation**, and the walk continues with the next member of the ready set the shell already
   receives (`src/work.mjs:1563` returns `readySet` beside the first offer). Set-aside is not a
   bound, it is the walk's own memory — and it is **required**, because `work:next` would otherwise
   offer the same still-ready item on the next tick forever. Two bounds fall out: **at most one plan
   re-entry per unit per invocation**, and at most `cap` per plan.
6. **No cycle reset, and no scope widening.** A plan re-entry does not reset the unit's build
   cycles: refine's benefit lands on the *next* invocation, and the invocation boundary is the outer
   limit. And if the derived plan ref falls outside the loop's declared scope, the halt stays
   terminal and names the plan in its detail — `53/ADR-003` rules that this command's scope is a
   driver number or a range, and a hand-off that walked outside it would be the silent whole-stream
   walk that ADR refuses.
7. **Only this stop becomes non-terminal for the range.** The other eleven members of `LOOP_STOPS`
   return exactly as they do today, asserted as a leg of FF-12404 — a vocabulary that looks closed
   while one member quietly behaves differently is worse than an open one.
8. **`work.autonomous.maxAttempts` is not read a third time.** TECH_DEBT item 76 records that this
   one key already means two unrelated bounds (an attempt ceiling and a drive-cycle ceiling); it was
   re-measured live at this refine and is still true. §5 reuses the *already-resolved* `resolved.cap`
   inside the counter that already exists, so the entry is neither worsened nor depended upon.

**Alternatives.** (a) *Put the hand-off in the shell's halt branch, where the cap fires.* Refused —
that is how the shell grew its own cap in the first place; §2 moves the decision without moving the
execution. (b) *A thirteenth stop, `plan-re-entry`.* Refused: the SPEC says stay in the vocabulary,
and every consumer of `LOOP_STOPS` (records, reports, the mesh directive) would need to learn a name
for something that is still cap exhaustion. (c) *Reset the unit's cycles after a refine.* Refused —
a cap an agent's action can reset is not a cap.

**Consequences.** The red probe must show the *bound*, not just the hand-off: a fixture in which one
plan gathers repeated exhaustions and the loop refuses to re-enter it beyond `cap`, plus a fixture
whose plan ref is outside the declared scope and gets the terminal halt.

---

## ADR-006 — The engine's cap is DEAD in the live path; 124 does not half-wire it, and the repair is ledgered with its estimate

**Context, measured.** `nextDecision` (`src/commands/loop.mjs:857-870`) passes `scope`, `level`,
`cap`, `next`, the task/story facts and `extra` — and **no `cycle`**, at any of its **6** call sites.
So inside `decideLoopPhase`, `input.cycle`, `input.lastPhase`, `input.gate` and `input.verifyCycle`
are always `undefined`: **`boundedDrive`'s own cap guard (`src/work/loop.mjs:821-829`) never fires
at all on that path**, three of the decider's branches are unreachable in the live path (see the amendment below), and the only thing
bounding this repository is the shell's private counter. One fact — *how many times has this unit
been driven* — with two derivations, and the one the module declares is the dead one.

**AMENDED at the feasibility beat — the count above is wrong, and the correction matters.** There is a
**seventh entry into the decider, and it is not `nextDecision`**: the direct `decideLoop` call at
`src/commands/loop.mjs:1786` passes a real `cycle` **and** a real `gate`. It reaches
`src/work/loop.mjs:910`'s `halt("cap-exhausted", "engine:cycle>=cap", { phase: "continue" … })` in the
**live** path, proven end-to-end by an existing green driven test —
`test/loop/loop-only-fail-redrives.test.mjs:265-266` (producer `engine:cycle>=cap`, three `continue`
rows, cap 3). So the dead branches number **three** (`:823` `boundedDrive`, `:880` uat, `:923` verify),
not four, and `boundedDrive`'s guard is dead only on the `nextDecision` path. The ledger entry below is
corrected to match. This is why 124/01's contract must not assert `:910` unreached and must leave its
behaviour alone: a story built to the original four would red against a suite that is green today.

**Decision. Leave it, and say so; do not wire one key.** Passing `cycle` alone would make one branch
live and leave three dead — a decider that is *half* consulted is worse than one that plainly is
not, because the next reader cannot tell which branches run. The full repair (the shell hands its
history to the engine and stops holding a second state machine) is a decision about **which module
owns the loop's state machine**, across `src/commands/loop.mjs` (36 dependents) and
`src/work/loop.mjs` (43); it re-homes the gate-ladder walk, changes at least one halt's producer
string, and re-baselines the loop suites. That is story-sized or bigger, and it needs a design
ruling this milestone is not scoped to make. **It is ledgered.**

ADR-005 is deliberately shaped so it does not depend on the repair: the shell passes **its own**
`cycle`/`cap` into the pure decider, which is the same call the repair would keep.

**The entry to land in `wiki/work/TECH_DEBT.md`** (this session's only write is this document, so it
is stated here for the ledger's single writer to append verbatim — 12 lines, per that file's budget):

> ## NN. The loop has TWO cap counters and the declared one is dead — `decideLoopPhase` is never told the cycle
>
> **Status:** open (raised 2026-09-07 by architect, at `124/ADR-006`).
>
> **What's wrong.** `nextDecision` passes no `cycle` at any of its 6 call sites, so `input.cycle`,
> `lastPhase`, `gate` and `verifyCycle` are always `undefined`; on that path `boundedDrive`'s cap
> guard never fires and three decider branches (`:823`, `:880`, `:923`) are unreachable. `:910` IS
> reached, via the direct `decideLoop` call at `src/commands/loop.mjs:1786`. The cap that actually bounds this repo is the
> shell's private `cycles` Map.
> **How it bites.** The engine's declared bound is unfalsifiable — its cap tests pass over a branch
> the live path never takes — and each new cap site is written against the shell, not the decider.
> **The fix.** Hand the shell's history to the engine (`cycle`, `lastPhase`, `gate`, `verifyCycle`)
> and delete the shell's duplicate branches; needs a ruling on which module owns the state machine.
> `src/commands/loop.mjs:860`

---

## ADR-007 — The learning edge reaches `shatter` as a ONE-PER-PRD, PO-only recall keyed to the seam — not a port of `refine.md`'s block

**Context.** `refine.md:121-128`'s block is **two-role** (architect and PO, each with its own recall
shape) and the PO's form takes `--item <ref>`. `shatter.md:38` spawns **only** `aof-product-owner`,
and shatter *mints* drivers from a PRD — no ref exists until step 3 (`shatter.md:57-66`). A verbatim
port would call a flag with nothing to point at and would introduce a role the command never spawns.

**Decision.**

1. **One recall per PRD session, not one per driver, and it runs at the seam read** — between
   `shatter.md`'s step 1 (read the seam) and step 2 (identify the drivers). A per-driver recall runs
   *after* the cut has been made and therefore cannot change it; the whole value of this edge is that
   the lesson reaches the coarser cut, where it costs most.
2. **PO only.** The architect clause is not ported. Shatter has no architect in its `<process>`, and
   a block naming a role the command does not spawn is prose that never executes.
3. **Keyed on the PRD's own seam**, in a form that is **runnable**:
   `aof work memory recall "<the PRD's objective/scope keywords>" --block` — **no `--item`** (there
   is nothing to point at) and **no `--area` filter** (a milestone-level cut is cross-cutting, and an
   area filter hides exactly the near-miss that would have moved a boundary). Verified against the
   shipped surface: `aof work memory --help` declares `recall <query>` with every scope flag
   optional — **CORRECTED at the contract beat: that is not what `--help` prints.** `aof work memory
   --help` names the five verbs, `--area --stage --kind --owner --item NN --status`, `--limit N` and
   `--json`; the token `block` appears nowhere in it, and `memoryUsage()` (`src/work/memory.mjs:343-353`)
   has no line for it. `--block` is nonetheless **real and runnable** — it is parsed at
   `parseMemoryArgv` (`src/work/memory.mjs:163`) and a live `recall "<query>" --block` exits 0 and
   returns the compact block. So the decided form stands; the evidence sentence was wrong, and a
   builder implementing this clause against `--help` would have concluded the flag did not exist.
   **A flag that does not exist is the failure mode this clause is most likely to have**, so FF-12405
   asserts the form against the module's own parse surface (below), never against `--help` or prose.
4. **The acknowledgement has a home**, or the block is decoration: the surfaced near-miss is
   acknowledged — honoured, or consciously departed from — **in the record doc of each driver whose
   framing it changed**, in the section it bears on (`## Scope` for a boundary, `## Dependencies` for
   an edge) — **AMENDED at the contract beat: neither named section exists for every type shatter
   frames.** The milestone template declares `## Objective`, `## Scope`, `## Stories` and
   `## Dependencies`; the spike template declares `## Question`, `## Timebox`, `## Investigation`,
   `## Finding` and `## Outcome / Next` — and shatter frames both (`shatter.md:57-66`). The clause is
   therefore **a heading the driver's own template actually declares**, resolved per type, rather than
   two fixed section names. `refine.md`'s two escapes (`ARCHITECTURE.md` / `STATE.md`) do not exist at
   framing time.
5. **The empty case is unchanged**, verbatim from `refine.md`: an empty block means nothing to
   surface (memory may be off) — proceed unchanged.

**Consequences.** The write set is the bundle source **plus its generated siblings** — the three
runtime mirrors, `src/bundle/manifest.json` and `.aof/aof.lock.json` — which
`test/arch/bundle/acd-declared-writes-include-generated-siblings.test.mjs` already governs and
`acd-bundle-manifest-hashes` hash-checks **for two of the three runtimes only**. Measured at the
contract beat: `src/bundle/manifest.json` declares `runtimes: ["claude","codex"]` and holds **0**
`.opencode/` entries (`.aof/aof.lock.json` holds 37), and that control re-renders with
`manifest.runtimes` — so the opencode mirror is hash-checked by nothing, and the control hashes its
own re-render rather than the disk, so a regenerated manifest beside a stale mirror is green. **No
new parity control is owed here** — declaring one would be the sibling this tree keeps refusing, and
124/02 closes the gap for its own three mirrors by asserting all three against a fresh re-render. The
general hole is wider than this story and is raised as a finding for triage, not fixed here.

---

## Codebase health — what these three stories land in

Measured, not vibed. `src/commands/loop.mjs` is **1,975 lines with 36 dependents** and
`src/work/loop.mjs` **1,120 with 43** — the pair is the loop's god-node, and ADR-006 records the
concrete symptom (one fact, two derivations, the declared one dead) rather than a size complaint.
The doctor family is **8 lane modules behind 12 `CHECK_GROUPS` entries**, growing by append, governed
by `59/FF-5905`'s named roster; a fourth advisory lane is that seam working as designed, and ADR-002
turns the pattern's third instance into a ratchet so the fifth cannot regress it.

Three routes, all taken here rather than deferred:

- **Fixed in this item** — the duplicated contract-set resolution and `ready-wave`'s exact-string
  collision check (ADR-003). Small, and it *removes* a derivation.
- **Ratcheted** — the class-level never-gates control (ADR-002 §2, FF-12402), which is worth more
  than three more lane-specific controls would be.
- **Ledgered with its estimate** — the loop's two cap counters (ADR-006), story-sized or bigger.

`aof work debt` over the seven files under review returns **one** entry, **item 76**
(`work.autonomous.maxAttempts` read as two unrelated bounds). Re-measured at HEAD: **still live**,
and its line citations have gone stale (`src/commands/loop.mjs:706` → `:809`, `:1266` → `:1454`,
which is the very halt ADR-005 changes). ADR-005 §8 is written so 124 neither worsens it nor depends
on it. The stale citations are worth correcting in the same pass by that file's single writer; the
entry itself is **48 lines against a 12-line budget**, which is the ledger's own ratchet reporting
the debt of its debt.

---

## Proposed partition

Advisory. The product owner draws the final partition; this is what the measurements support.

**Three stories, no sibling `depends:` edge, all parallel-eligible.** With ADR-004 dropping the SCOPE
outcome, the collision `SPEC.md` and `STATE.md` anticipated does not exist: only story 1 writes
`src/commands/loop.mjs`. The write sets below are disjoint under `ready-wave`'s check — including
under ADR-003's tightened, coverage-aware version, which is the stricter test and the one that will
be running by the time these are waved.

| # | subject | discharges | rough write set | ordering |
|---|---|---|---|---|
| **0** | **The census reports its denominator** — the contract set gets one home and a coverage predicate (ADR-003), `ready-wave` adopts it, and a fourth advisory doctor lane names each unwitnessed `depends:` edge and its own denominator (ADR-001, ADR-002). | the phantom-edge census | `src/story-contract.mjs` (2 additive exports), `src/ready-wave.mjs` (private helper collapses onto them), `src/work/doctor.mjs` (snapshot enrichment + one `CHECK_GROUPS` append), **new** `src/work/doctor-depends.mjs`; `test/arch/work/{acd-census-reports-its-denominator,acd-advisory-lane-never-gates}.test.mjs` + `test/arch/work/index.mjs`; `test/arch/planning/acd-contract-set-has-one-home.test.mjs` + `test/arch/planning/index.mjs`; unit suites under `test/work/` + `test/work/index.mjs` | independent; the largest |
| **1** | **Cap exhaustion returns to the plan** — the shell asks the engine, the engine returns `drive <plan> refine`, the escalation is an attempt in the existing counter and the unit is set aside (ADR-005), with ADR-006's non-repair recorded. | cap exhaustion | `src/work/loop.mjs` (one pure decider), `src/commands/loop.mjs` (`:1443-1457` asks it; set-aside in the walk); `test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs` + `test/arch/loop/index.mjs`; loop suites under `test/loop/` | independent |
| **2** | **The learning edge reaches the outermost splitter** — `shatter.md` gains a one-per-PRD, PO-only recall keyed to the seam (ADR-007). | the learning edge | `src/bundle/commands/shatter.md`, `src/bundle/manifest.json`, `.aof/aof.lock.json`, and the three generated mirrors (`.claude/commands/aof/shatter.md`, `.codex/skills/aof-shatter/SKILL.md`, `.opencode/commands/aof/shatter.md`); `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs` + `test/arch/memory/index.mjs` | independent; smallest |

**Why they are independent, from the graph rather than from reading.** `aof graph impact` over the
three write sets shows no shared node: story 0's subjects are `src/story-contract.mjs` (5 dependents,
0 imports), `src/ready-wave.mjs` (3 dependents, whose only import is that leaf) and
`src/work/doctor.mjs` (25 dependents, 13 imports — 12 of them lane modules, so an appended lane is a
new edge and not an edited one); story 1's are `src/work/loop.mjs` (43) and `src/commands/loop.mjs`
(36); story 2's are bundle assets with no source edges at all. The only *near* miss is that
`src/commands/loop.mjs` imports `src/work/doctor-controls.mjs` — but story 0 edits
`src/work/doctor.mjs`, not that module, and ADR-002's disjoint-array discipline is what keeps the
new codes out of `DOCTOR_GATE_CODES` by construction rather than by luck.

**Two practical notes for the break-down.**

1. **Declare files, not directories, in these three contracts.** Under ADR-003 a directory-shaped
   entry (`test/`, `src/`) genuinely collides with everything beneath it — correct behaviour, and
   newly expensive. All four `test/arch/<dir>/index.mjs` files touched here are distinct paths; a
   coarse `test/` in any one story would hold the other two out of its wave for no reason.
2. **119 is no longer a sequencing constraint for these three.** `SPEC.md` says to sequence after
   119's interior lands. At HEAD, `119/02` (the `src/commands/` interior) and `119/03` (the test-tree
   interior and the per-directory indexes) are both **on disk and committed** (`f17bab1c`,
   `adca2f80`; their record docs still read `in-review`/`not-started`, which is a lane's status write
   in flight, not a code question). The one 119 story not yet started, `119/04`, writes `src/mesh/`
   and `test/arch/session/` — disjoint from all three stories above. Adding a suite is now **one
   import and one spread in its per-directory index**; `scripts/test.mjs` must **not** appear in any
   of these write sets.

---

## Fitness functions

<!-- Each structural invariant from an ADR, paired with the arch-test that enforces it in CI.
     The arch-test lands with its subject story, so `pending` clears story by story.

     `pending` is the TOKEN, not a position: it reports at warn while 124 is open and is NOT admitted
     at accept. `aof work doctor 124` reports each unresolved control as `control-unresolved`; what
     clears a row is landing the file or dropping the declaration, never re-marking it `pending`.

     Each declared control owes a RED PROBE in VERIFICATION.md once it lands: what was changed to
     make it fail, and the message observed. Each row names its intended path in the RUNNABLE test
     tree — `66/FF-6607` forbids a test-shaped file under `wiki/**`, so no control is staged beside
     this document.

     HARNESS SHAPE (119/ADR-010): every arch-test here exports an array of `{ name, run }` and is
     imported AND spread in its own `test/arch/<dir>/index.mjs`. A suite imported and not spread is
     not registered (59/FF-5903). `scripts/test.mjs` is unchanged by a new suite's arrival.

     ONE ROW, ONE CONTROL FILE, ONE RED PROBE. Five rows, five distinct paths, all new files.

     DELIBERATELY NOT RESTATED, because a control already in service asserts it:
       · "the loop-record lane never gates" — 78/FF-7808 holds it; FF-12402 asserts the CLASS the
         lane belongs to, and does not sibling it (ADR-002 §3).
       · "the doctor gate's admitted codes are derived by filter from CONTROL_FINDING_CODES" —
         54/FF-5410 holds it, and FF-12402 depends on it rather than re-asserting it.
       · "a control never executes what it reads" — test/arch/audit/acd-controls-never-execute.test.mjs
         already sweeps the tree and covers these five on arrival.
       · "a declared write set includes the generated siblings" and "every manifest hash equals the
         re-rendered member" — the bundle controls already hold both for ADR-007's write set. -->

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-12401 | **The census reports its denominator, and never renders a verdict it cannot reach.** The lane's finding codes are exactly `{depends-edge-unwitnessed, depends-edges-unchecked}`; the token `phantom` appears in none of **the lane's** codes, messages or exports — scoped to the lane, because the word already stands as prose in two comments in files this story edits (`src/story-contract.mjs:18`, `src/work/doctor.mjs:179`; six occurrences tree-wide), and a tree-wide sweep would red on arrival and invite deleting them to pass. Whenever any resolved `depends:` edge went unevaluated the lane emits **exactly one** `depends-edges-unchecked` finding for the whole run — never one per edge — carrying the two exclusion reasons **separately** (`type` vs `undeclared`), and the four counts satisfy the identity `witnessed + unwitnessed + unchecked(type) + unchecked(undeclared) = considered` over the edge set `validateWork` resolves. Driven over a literal snapshot fixture containing all four classes, and over this stream, where the identity is asserted against a non-zero unchecked count. Non-vacuous: at least one edge of each class was classified. The lane reads only `depends:`/`reads:`/`files:` — asserted by sweeping its source for any other frontmatter key and by asserting no work template gained one. Red probe: make the unchecked finding conditional on there being at least one unwitnessed edge, and observe the identity leg fail on a stream with zero unwitnessed edges. | `test/arch/work/acd-census-reports-its-denominator.test.mjs` *(pending — 124/00)* | ADR-001 |
| FF-12402 | **An advisory doctor lane cannot gate — as a CLASS, so the next one cannot re-introduce a gateable code.** Every module registered in `CHECK_GROUPS` that exports its own frozen `*_FINDING_CODES` array is asserted, by iterating the registry and resolving each lane to its module, to have that array **disjoint from `CONTROL_FINDING_CODES`** (and therefore from `DOCTOR_GATE_CODES`, which is derived from it by filter) and to name **no `"error"` severity literal** anywhere in its source, with its severity a single module constant and no consultation of the acceptance horizon. `src/work/doctor-controls.mjs` is the ONE named exemption, because its array *is* the gate's source — asserted as a named exemption rather than an absence, so a second exemption cannot arrive silently. Non-vacuous: the class has at least three members and the gate ladder really does admit something. Red probe: give the census lane one `"error"` finding, and separately add one of its codes to `CONTROL_FINDING_CODES`. | `test/arch/work/acd-advisory-lane-never-gates.test.mjs` *(pending — 124/00)* | ADR-002 |
| FF-12403 | **One home for the contract set, directory intent is authored, and the wave check only ever tightens.** `src/story-contract.mjs` keeps **zero project imports** and reaches no filesystem (no `node:fs`, no `readFile`/`stat`, no `process.cwd`) — `96/FF-9602` leg 1's claim, re-asserted here because this milestone is what would break it. `src/ready-wave.mjs` holds **no second resolution** of a declared key and no second coverage rule: its collision test is asserted to call the shared predicate, and the module is swept for a re-implemented `Set`-intersection over raw strings. Coverage is **lexical**: an entry covers another only when equal, or when authored with a trailing `/` and the other sits beneath it — asserted over a table of pairs including the four real 119 cases, and asserted **not** to consult the disk. The adoption is a **strict tightening**: over a generated corpus of declared sets, every pair colliding under the old exact-string rule still collides under the new one (a superset, asserted as such), so no wave can widen. Red probe: author a second `covers` helper inside `ready-wave.mjs` and observe the single-home leg fail; and make coverage `startsWith` without the authored slash, and observe the lexical leg fail on `src/commands-old.mjs`. | `test/arch/planning/acd-contract-set-has-one-home.test.mjs` *(pending — 124/00)* | ADR-003 |
| FF-12404 | **The shell mints no `cap-exhausted` halt of its own, the return is the existing refine phase, and the escalation is bounded twice.** `src/commands/loop.mjs` is asserted (structurally, over its comment-stripped source) to construct **no** `cap-exhausted` halt itself — every one comes from the pure decider in `src/work/loop.mjs`, which is asserted to be reached from the shell's cycle-cap branch. The decider's plan hand-off is asserted to be the **existing** `{act:"drive", phase:"refine"}` shape, with `phase` asserted through the **observables the module actually exports** — the registered `work:drive-refine` command id and `createPhaseDriverCommand`'s refusal of an unknown phase — because `PHASES` (`src/commands/drive.mjs:39`) is module-private and cannot be imported; no thirteenth member of `LOOP_STOPS`, and the plan ref **derived** (story → parent, driver → itself) rather than read from any frontmatter key. Bounds, driven: a unit that exhausts is offered back **at most once per invocation** (set aside thereafter, so a still-ready item cannot be re-offered forever), and a plan gathering repeated exhaustions is re-entered at most `cap` times under `${planRef}\0refine`, with **no new counter and no new persisted key** (asserted by set-equality against the shell's existing counter map keys and against `LOOP_FIX_TRANSPORT_KEYS`). A plan ref outside the declared scope yields the **terminal** halt naming the plan (`53/ADR-003`) — asserted **at the decider seam, by direct call**, not through a driven run: `listItems` builds a child's `ref` and `parent` in one walk, so a derived plan ref always shares its unit's driver number and is in scope whenever the unit is. The guard stays right (it makes widening impossible by construction); only a direct call with a disagreeing `parent` can exhibit it. The other eleven stops return immediately, exactly as today. Red probe: return the plan hand-off unconditionally and observe the per-invocation bound fail; and derive the plan ref from a frontmatter key and observe the derivation leg fail. | `test/arch/loop/acd-cap-exhaustion-returns-to-the-plan.test.mjs` *(pending — 124/01)* | ADR-005 |
| FF-12405 | **The learning edge reaches every command that CUTS work, in a form the CLI actually has.** Both cut-making bundle commands — `src/bundle/commands/refine.md` and `src/bundle/commands/shatter.md` — are asserted to carry a `aof work memory recall` invocation, from a **named roster** asserted in both directions (a cut-making command absent from the roster fails, and a roster entry with no recall fails). Each invocation's verb and every flag it spells is asserted against **the memory module's own parse surface** — `MEMORY_VERBS` (`src/work/memory.mjs:28`), `SCOPE_FLAGS` (`:44`) and `parseMemoryArgv` (`:140-205`) — never from prose, and **never from the command registry**: `aof work memory` is a deliberately-unrouted door (`src/cli.mjs:601`, dispatched by string compare at `:241`), so `listCommands()` carries no entry for it and a registry-sourced check would pass vacuously over an empty surface forever. That the door is unrouted is asserted explicitly, so the vacuous pass is closed rather than merely avoided. An invented flag reds here rather than at an agent's runtime — which matters more than usual, because `parseMemoryArgv` (`:190-192`) skips an unknown flag **without consuming its value**, so the value falls through into the query and an invented flag silently rewrites the question instead of erroring. `shatter.md`'s form is asserted to carry **no `--item`** (nothing to point at before step 3 mints a driver) and to sit **before** the driver-identification step, and `shatter.md` is asserted to spawn no role its `<process>` does not declare. `refine.md`'s block is asserted **unchanged**. Red probe: spell `--scope` (a flag the recall verb does not declare) in the shatter block, and separately move the block after step 2. | `test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs` *(pending — 124/02)* | ADR-007 |
