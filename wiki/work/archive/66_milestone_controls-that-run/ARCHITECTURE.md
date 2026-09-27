---
doc: architecture
---
<!-- Milestone ARCHITECTURE.md — ONE question: how did we decide to build it, and why that way? Owner: architect.
     A log of ADRs: numbered, IMMUTABLE, superseded-not-edited. NO observable behaviour (→ task .feature files). -->
# 66 · Controls That Run — Architecture Decisions

> **Inputs.** This milestone's `SPEC.md`/`STATE.md` (the two tensions, ruled in ADR-001/ADR-006); upstream `FINDING-acd-executable-gate.md` §2/§4/§5b/§6/§7/§8. Neighbour **53** (in-progress) holds the most declared-but-unlanded controls, so it is this milestone's first subject.
>
> **Graph grounding (actual edges, not inference).** `aof graph build .` — at refine **10,787 / 25,997**, no topology change; at 66/02's review **11,021 / 26,508**; at 66/03's **11,071 nodes / 26,627 edges**, `builtAt 2026-08-16T02:25:02.853Z`, egress none. `aof graph impact`: `src/work.mjs` **243 dependents**; `src/feature-parse.mjs` **1**, 0 deps; `src/memory/local-indexing.mjs` **24** (2 source, 22 test); `src/work-doctor.mjs` **12**; `src/work-doctor-controls.mjs` **6 in / 2 out**, both out-edges zero-import leaves — ROUND 3/3's inversion as an EDGE rather than an intention. Every claim below is one of these edges.
>
> **Memory recall (role-scoped, `--area architecture`, plus the operator set), each honoured or departed from in writing.** **m52/ADR-007** → **HALF HONOURED** (ADR-003): purity + envelope verbatim, containment deliberately broken — m52 added a *second store*; 66 only tightens reads both commands already perform. **m39/ADR-005** → **HONOURED** by ADR-005. **m45/R5** → **HONOURED in form, VIOLATED SIX TIMES in fact** (ADR-009/A, /K; ADR-010/E; ADR-011/E; ADR-012). **m22/R1** → FF-6607. **m47/R9** → named lists, never counts. **m05/ADR-007** → **HONOURED and extended** by ADR-001/ADR-008: the frozen forms are the two `parseRetrospective` (`local-indexing.mjs:107`) and `parseArchitecture` (`:160`) already implement.

---

## ADR-001: A DECLARATION is an id in first position on a block-level line inside a frozen register block — everything else, everywhere else, is a CITATION; existing registers are grandfathered, never migrated

**Status:** Accepted
**Date:** 2026-08-15

**Context.** `STATE.md` names this "the hard part, not the check", and the finding priced it: the
duplicate/dangling check ran at **33% precision as worded** and **100% once two conventions were added** —
*declarations live only in the register file*, and *"next free id" is a reservation, not a citation*
(§5b). Its table concluded only the `### D-1 · <title>` heading form was machine-recognisable.

aof's own tree is worse than the finding's subject, and better documented. Measured 2026-08-15 over 67
milestone folders:

| register | files | forms in use |
|---|---|---|
| `ARCHITECTURE.md` fitness functions | 47 files, **43** with a `## Fitness functions` heading | **3** carry `FF-NN` ids at all (m37, m52, m53); the other 40 declare invariants with **no id**; the shipped template (`src/bundle/templates/milestone/ARCHITECTURE.md:35-37`) has **no id column** |
| `VERIFICATION.md` findings | 50 files, **43** with a `## Findings` heading | **four** id forms: `\| F-NN` ×101, `\| **F-NN` ×49, `### F-NN` ×33, `- **F-NN` ×26 |
| ADR blocks (47 files) and `RETROSPECTIVE.md` lessons (44) | 91 | **one each, and both already machine-parsed**: `splitSections(text, /^#{2,3}\s+ADR-\d+/)` at `src/memory/local-indexing.mjs:160`, and `/^#{2,3}\s+R\d+\b/` at `:107` |

Two facts decide this. **(a) aof already owns a declaration grammar and already parses it** — memory's two
parsers accept `#{2,3} <ID> [:·—–-]? <title>` and have since m05/ADR-007. Inventing a second grammar puts
a third copy of "what a declared id looks like" into a codebase whose umbrella debt is *"nothing has one
home"* (`TECH_DEBT.md` item 0). **(b) The heading form cannot simply be extended to FF/F**: the dominant
existing form for both is a table row (150 of ~230 F-NN occurrences; all 29 FF-NN occurrences), and a
table row is not intrinsically unrecognisable — the finding's "no" describes how the downstream authored
it, not a property of markdown.

**Decision.** The rule is about **position**, not prefix.

**1 — A REGISTER BLOCK is the region of a record document opened by a frozen h2 heading**, ending at the
next h2 or `---`. The frozen set for 66 is exactly two: `## Fitness functions` in `ARCHITECTURE.md`, and
`## Findings` in `VERIFICATION.md`/`SESSION.md`. A register block exists only in its own register file —
never in `STATE.md`, a `SPEC.md`, or a task feature.

**2 — A DECLARATION is a block-level line inside a register block whose FIRST token is the id**, with
nothing before it but the line's structural prefix. The two admitted prefixes are the two markdown block
anchors already in service — a heading and a table row's first cell — with optional `**` emphasis:

```
DECLARATION := /^(?:#{2,3}[ \t]+|\|[ \t]*)\*{0,2}(<ID>)\*{0,2}[ \t]*(?:\||[:·—–-]|$)/
<ID>        := (FF|F|D|R|ADR)-[0-9]+[A-Za-z0-9-]*      # the id namespace, frozen; extended by ADR only
```
**3 — Fenced code blocks are SKIPPED, both for the block opener and for declarations.** Measured today:
**0** fenced lines across 47 `ARCHITECTURE.md`, 50 `VERIFICATION.md`, their `STATE`/`SPEC` siblings and the
shipped templates match either pattern — so the rule is **prospective, and its trigger is already named**:
66/03 ships a `VERIFICATION.md` template *whose body is a register*, and the `ARCHITECTURE.md` template's
own placeholder table (`:35-37`) is a register nobody declared. A recogniser ignoring fences would read a
sample quoted inside an ADR, or a template's placeholder row, as a declaration.

**4 — Everything else is a citation.** The finding's two required conventions are consequences of rule 2,
not extra rules, which is what makes rule 2 worth freezing:
- `### D-17 is now LIVE, and sharper than the ledger said` in a `STATE.md` — *outside a register block*,
  therefore a citation (§5b false positive 1, dissolved).
- `**Next free id is D-37.**` — inside the block, but the id is **not** in first position, therefore a
  citation (false positive 2, dissolved). A reservation needs no special case.

**5 — The id is unique within its register file; a cross-file citation is `<itemRef>/<ID>`.** `52/FF-5204`
resolves; a bare `FF-5204` resolves only inside m52's register. This reuses the `NN/SS` ref grammar
`findWork` already answers, and keeps per-milestone id spaces (`FF-52NN`, `FF-66NN`) legal.

**6 — Existing registers are GRANDFATHERED, not migrated.** Nothing rewrites 47 `ARCHITECTURE.md`s or 50
`VERIFICATION.md`s. Two mechanisms carry the cost, both house idiom: the **acceptance horizon** (ADR-002)
means an accepted register is never a finding, and a pre-existing population that would otherwise be noise
is carried as a **named, shrink-only baseline** (m47/R9). A register declaring **no ids at all** — the 40
fitness tables with no id column — declares nothing and is compliant by construction; it acquires
obligations only when it acquires ids.

**7 — The grammar has ONE home.** A new leaf `src/declared-id.mjs` (no imports) exports the frozen regex,
the id namespace and the register-block heading set. `parseRetrospective` and `parseArchitecture` build
their `headerRe` **from it** instead of from two inline literals. `local-indexing.mjs` has **24
dependents, 22 of them test suites** (graph) — not the risk here, the regression net: the same records
must come out, and 22 suites say so.

**Alternatives considered.**
- *Heading form only, migrating the FF and F registers* — **rejected on measured cost and on
  immutability.** It invalidates 29 FF rows and 150 F-NN cells in documents this repo holds immutable, and
  a rule whose first act makes 43 accepted registers non-compliant is silenced within a week — the
  finding's own C0 lesson (§5a: aof's six *legitimate* control characters), applied to markdown.
- *Form-tolerant recogniser (heading OR bullet OR table row OR bold prose)* — **rejected: that is exactly
  the 33%-precision configuration the finding measured.** Tolerating `- **F-28 · ⛔ BLOCKER…**` is what
  makes a STATE heading and a reservation indistinguishable from a declaration. The bullet form (26
  occurrences) is deliberately not admitted; it is grandfathered by rule 6 and is not what new work uses.
- *Content-addressed ids* — **rejected**, as the finding does (§6): immune by construction, unreadable,
  and every existing register would need migration.
- *A `registers:` frontmatter key listing declarations as data* — **rejected**: the prose table and the
  frontmatter list would drift invisibly — the class of defect this milestone exists to close.

**Consequences.** The duplicate-id and dangling-citation checks become buildable for **every** register at
once rather than one at a time (§5b's blocker, removed). One further consequence is recorded so a later
milestone can take it additively and this one is not tempted: because `FF-NN`/`F-NN` now match the grammar
memory already parses, indexing them as recallable records is a `buildRecords` composition (m39/ADR-002's
`parseOutcome` precedent). **66 does not do this**; nothing here depends on it.

**Invariant.** The declaration grammar, the id namespace and the register-block heading set are frozen
literals exported from exactly one module (`src/declared-id.mjs`); no second copy exists in `src/`,
including in `src/memory/local-indexing.mjs`; fenced regions are excluded; and memory's records are
byte-identical across the extraction. (Enforced by `acd-register-declaration-form`,
`acd-declared-id-single-home`.)

---

## ADR-002: The ACCEPTANCE HORIZON — a check over a record document may only produce a GATING finding while its item is OPEN; an accepted record is immutable, therefore un-actionable, therefore never an error

**Status:** Accepted
**Date:** 2026-08-15

**Context.** Two measurements make every other decision here unlandable without this one.

**(a) `aof work validate` has no severity and exits 1 on ANY finding** (`src/commands/validate.mjs:71`;
the envelope is `{path, problem}`, `src/work.mjs:793`). A strict Gherkin parse added there is a hard,
whole-stream gate.

**(b) The corpus is not clean.** Over all **653** `.feature` files in `wiki/work`: **13 files carry 35
lines a strict Gherkin parse rejects** — free text in step position, either a wrapped step continuation or
a description sentence beginning `And`/`Given`/`When`. That is **2.0%** against the downstream milestone's
89% (33 of 37): the corpus is healthy and the gate is still unlandable, because **12 of the 13 belong to
milestones whose status is `done`** (00, 04, 37, 38, 43, 49, 52). A delivered `.feature` is immutable — no
edit, no annotation, no `@superseded` tag — so a finding on those twelve is a permanent red no legal act
can clear.

The thirteenth is the argument: `53/01/tasks/04_gate-order-and-cap.feature` carries **17 of the 35 lines**,
under a milestone that is `in-progress` and a story that is `not-started`. Live, fixable, and exactly
where a contract gate should bite.

**Decision.** One predicate, one home, used by every check this milestone lands.

1. **A record document belonging to an item whose `status` is `done` is IMMUTABLE.** No check emits
   `severity: "error"` against it, and `validateWork` emits no finding at all against its `.feature` files.
2. **Inside the horizon (status ≠ `done`), a violation is an ERROR** and gates — through `validate`'s exit
   1, or doctor's "any error → non-zero regardless of `--strict`" (m15/ADR-002, pinned by
   `test/arch/acd-doctor-strict-exit.test.mjs:1-13`).
3. **Outside the horizon the same fact is reported at `warn`** by `work:doctor`, and is invisible to
   `validate`. Advisory by default, visible under `--strict`, gating never.
4. **Where the pre-existing population would swamp the signal it is a NAMED shrink-only baseline** — never
   a count (m47/R9), never a blanket exemption. Measured populations: 12 `.feature` files (rule 1 covers
   them — the predicate is the lifecycle, so no list is needed) and **20 dangling `test/arch/…` citations
   across seven `done` milestones** (ADR-004), which *do* need a list, because there the fact stays worth
   reporting after acceptance.
5. **The predicate has exactly one implementation**, exported once, imported by both lanes. Two copies of
   "is this item still open" is how `ITEM_RE` came to exist in four places — a scar `src/work-doctor.mjs:37-43`
   narrates in its own comment.

**Alternatives considered.**
- *Gate the whole stream and fix the 13 files* — **rejected**: 12 of the 13 edits are forbidden.
- *Gate the whole stream with a named 13-file exemption* — **rejected**: the list could never be paid
  down, so it is a lifecycle fact wearing a baseline's clothes, and m47/R9's rule is that a baseline is
  reviewed by re-measuring it.
- *Report everything at `warn` and gate nothing* — **rejected** by `SPEC §Objective`: "each of those is a
  refusal with a named finding." A contract that does not parse must refuse inside the horizon.
- *Scope by date (`created` after this milestone) rather than lifecycle* — **rejected**: a date boundary
  goes stale, while `status: done` is the exact statement of "this record may no longer be edited".

**Consequences.** Story 66/00's gate, run today, reports **one file** and grandfathers twelve — landable on
day one. The cost is named: **a defect that lands and is accepted is invisible to the gating lane
forever**, which is why rule 3 exists and why ADR-004 carries a baseline rather than leaning on the horizon
alone. Written as a milestone rule rather than a clause inside three checks, because every future ACD check
asks the same question.

**Invariant.** Exactly one exported predicate decides the horizon; every check calls it; no check emits
`severity: "error"` for a path under a `done` item; no code path in `src/` writes a `.feature`. (Enforced
by `acd-acceptance-horizon-single-predicate`.)

---

## ADR-003: The contract parse lands in `validateWork` by making `src/feature-parse.mjs` the ONE parser; every other check lands in `work:doctor`'s existing check-group registry as ONE new lane — `work.checks` and a bundle gate hook are deferred, named

**Status:** Accepted
**Date:** 2026-08-15

**Context.** The finding offers three attachment points (§4): doctor gains checks; `validate` gains a
project-declared `work.checks` list; a named gate in the bundle hooks. It also records that `validate`
"reads exactly one config key — `config.work.tags` — and has no plugin, hook, or registered-check seam of
any kind" (§1c). Confirmed at source: `validateWork` (`src/work.mjs:790-966`) is a closed function.

The recall hit **m52/ADR-007** rules the opposite of what this milestone must do, and it was right there
for a reason that does not transfer. m52 introduced a **second record store** the god-node had no reason
to know about; extending `validateWork` would have dragged a new vocabulary into a 240-dependent file to
serve a directory `listItems` deliberately skips (`src/work.mjs:287`). This milestone adds **no store and
no vocabulary**. It increases the strictness of reads those commands *already perform*: `validateWork`
already opens every `.feature` (`:932-939`), and doctor's snapshot already reads `VERIFICATION.md` and
`ARCHITECTURE.md` in full (`CONVENTION_DOCS`, `src/work-doctor.mjs:109`; `fileState` reads the text at
`:126-133` and returns only `{present, nonEmpty, lines}`, discarding it). Both reads exist; both throw
away exactly what this milestone needs.

**Decision.**

**1 — The contract parse lands in `validateWork`, and the parser is single-sourced.** `checkFeatureTags`
(`src/work.mjs:719-755`) is a 37-line line scanner; `src/feature-parse.mjs` is a 56-line leaf whose own
header says it *"mirrors the hand-rolled parse in `work.mjs`'s `checkFeatureTags` — the repo deliberately
hand-parses Gherkin rather than take a dependency"* (`:1-4`). **Two parsers of one artifact, with the
duplication ledgered in a comment.** So: `parseFeature(text)` becomes the one reader, keeping its current
return shape **additively** (blast radius exactly one module — `src/commands/tasks.mjs`, graph) and gaining
a structural-findings list; `checkFeatureTags` becomes a thin caller. **The net effect on the god-node is
a deletion** — the tag rules stay, the scanning leaves, no signature moves, 243 dependents unaffected. The
strictness is *an increase on an existing read, not a new one* (§7 item 6), landing in the leaf with 1
dependent rather than the node with 243.

**2 — Every other check lands in `work:doctor`, through the seam it already has.** `CHECK_GROUPS`
(`src/work-doctor.mjs:411-426`) is an append-only array of pure `(snapshot, ctx) => Finding[]` functions;
`duplicate-driver-number` (`:377-398`) is already the duplicate-id check for one register, and
`src/work-doctor-freshness.mjs:12` records the convention that a seed check is not re-implemented
elsewhere. This milestone appends **one** entry.

**3 — ONE new module, not three.** `src/work-doctor-controls.mjs` holds all three groups: three modules
would be three new files in a `src/` root already at **115 `.mjs` files** (TECH_DEBT item 10 measured 108;
m52 measured 112), and three stories appending to one array is merge friction with no independence gain
(`65/STORY.md:69-74` measures that cost).

**4 — The snapshot extension rides reads that already happen.** `buildSnapshot` (`:242`) gains, per item,
the **text** `fileState` already read and discarded, plus the one genuinely new I/O: an existence probe per
declared control path and a read of the declared runner files. All I/O stays at the snapshot boundary and
**the groups stay pure** (m52/ADR-007's surviving half, verbatim), so they are testable against literal
snapshots with no filesystem.

**5 — The envelope is doctor's and the code set is frozen** (m52/ADR-007, verbatim):
`Finding = { code, severity: "warn"|"error", path, message }`, `path` a raw absolute in OS-native form,
the face relativises. Exported from `src/work-doctor-controls.mjs`, exactly eight codes:

```
register lane      register-duplicate-id · register-dangling-citation
verification lane  verification-register-missing · verification-missing-red-probe
control lane       control-unresolved · control-unregistered · control-runner-unchecked · staged-control
```
Severity is not per-code: it is ADR-002's predicate. Inside the horizon → `error`; outside → `warn`;
`control-runner-unchecked` is always `warn` (it reports that a leg did not run — ADR-004).

**6 — Deferred, with the trigger named.** `work.checks` (§4 option 2) is a **plugin architecture**;
`SPEC §Scope` does not ask for one, and it would let a project register a check aof cannot reason about in
the one command with no severity to express doubt. **Deferred until a project asks for a check aof does not
ship.** A bundle gate hook (§4 option 3) is deferred with it: the seam exists (`src/bundle/hooks/`) but
every hook shipped today is lifecycle or artifact-sync, so a gate-shaped hook is a new class of thing, and
the two gates ACD already owns are enough to prove the model first. The retro-lesson→check graduation (§7
item 3) is deferred for the same reason and is the natural successor once `work.checks` exists.

**Alternatives considered.**
- *Put the contract parse in doctor too, keeping `work.mjs` untouched (m52/ADR-007 literally)* —
  **rejected on two counts.** `SPEC §Scope` says "linted at `validate`", and a contract that does not
  parse must **refuse**, which doctor is designed not to do. More decisively it would create a second
  reader of `tasks/*.feature`, splitting "is this contract valid?" across two commands — TECH_DEBT item
  51's exact live shape ("doctor counts any file, `work:tasks` counts `.feature` files").
- *Fold the register/verification/control checks into `validateWork` as well* — **rejected**: no severity,
  so ADR-002's warn tier is inexpressible and all 20 grandfathered citations become a hard whole-stream
  red; plus an edit to a 243-dependent file for facts doctor's envelope was built to carry (m15/ADR-001).
- *Duplicate the Gherkin parse rather than single-source it* — **rejected**, and it is the alternative most
  likely to be reached for by accident: it is the smaller diff, and the third copy of one derivation.
  *One module per check group* — **rejected**: three root-level siblings for ~80 lines each.

**Consequences.** `src/work.mjs` is edited by one story and gets shorter. Doctor's lane count goes 4 → 5,
which is the ratchet in the health note below. The frozen eight codes are a consumed contract the moment
66/02 lands. Nothing here can gate on a record nobody may edit.

**Invariant.** `src/feature-parse.mjs` is the only module under `src/` that recognises a Gherkin keyword,
and `src/work.mjs` carries no `Feature:`/`Scenario:`/step-keyword regex; `src/work-doctor-controls.mjs`
exports only pure `(snapshot, ctx) => Finding[]` groups, imports no `node:fs`/`node:child_process`/
`node:process`, reads no clock, and its exported code array is exactly the eight above, each reachable by a
fixture. (Enforced by `acd-feature-parser-single-home`, `acd-controls-never-execute`,
`acd-controls-finding-envelope`.)

---

## ADR-004: "Located where a runner can see it" is a TWO-LEG resolution — the path exists (universal) and a declared runner names it (project-declared, an honest no-op when unconfigured) — and the REGISTER ENTRY is the staging artifact, which is why a staging folder is prohibited

**Status:** Accepted
**Date:** 2026-08-15

**Context.** The finding's largest measurement: **8 of 13 staged fitness functions changed on contact with
a runner** (one +124%), because the staging convention parks them where no test glob can see them (§2),
and *"the projects following AOF's advice most closely are the ones hitting the hole"* (§3). ACD asks for
guards authored ahead of their subject and gives them nowhere to run. Every common runner has
`test.fails`/`xfail`; ACD has no concept for it.

Three facts from aof's own tree shape the rule.

**(a) aof has no staging folder and does not need one.** Zero `*.test.*`/`*.spec.*` files exist anywhere
under `wiki/`. The 32 `.mjs` files under `wiki/work/` are the *retirement* convention — m35's
`reference/retired-dispatch-tests/`, deliberately renamed out of every glob. The prohibition costs aof
nothing today and is a ratchet against importing the downstream's habit.

**(b) aof's failure mode is not a staging folder — it is a citation that never resolved.** Its
`ARCHITECTURE.md` registers cite **215 distinct `test/arch/…` paths; 183 resolve; 32 do not.** By
milestone: **13 in m53 (in-progress)** — the legitimate declared-ahead-of-subject state — and **20 across
seven `done` milestones**: 22 (1 of 4 cited), 23 (4/7), 24 (1/7), 26 (7/12), 27 (5/7), 36 (1/6), 49 (1/10).
At least two of the twenty are honest: `acd-sync-root-set` and `acd-claim-relay-independent` were
*deliberately retired with their eliminated subjects* (TECH_DEBT item 5). An immutable ADR citing a
legitimately retired test is a **permanent** dangling citation no legal edit can clear — which is why
ADR-002's horizon alone is not enough here and a named baseline is.

**(c) "A runner can see it" is not a glob in this repo.** Both runners register by **explicit import +
spread** (`scripts/test.mjs`, `scripts/test-unit.mjs`). Measured: 287 suites in `test/arch/`, all named by
one of the two — and exactly one, `test/arch/work-content-free-discovery.test.mjs`, named *only* by
`scripts/test-unit.mjs`. A rule reading one runner would false-positive on it today. The existing gate,
`test/arch/acd-test-suite-registration.test.mjs:151`, is a substring search over both runners' text and
therefore cannot see an imported-but-never-spread suite — ledgered as TECH_DEBT item 50 (origin: item 17).

**Decision.**

**1 — A control resolves when BOTH legs pass, and each leg reports itself.**
- **Leg A — the path exists.** The cited path, resolved repo-relative from the project root, is a file on
  disk. Universal, needs no configuration, works in every project. A miss is `control-unresolved`.
- **Leg B — a declared runner names it.** `config.work.controls.runners` lists runner files; the check
  reads them as text and asserts the cited file's basename appears. A miss is `control-unregistered`.
  **When the key is absent leg B does not run and says so** — `control-runner-unchecked` (warn, always),
  never a silent pass. House idiom verbatim: `roadmap-folder-mismatch` is *"an honest NO-OP until a
  structured, machine-parseable milestone index is configured (`config.work.roadmap`)"*
  (`src/work-doctor-freshness.mjs:9-11`).

**2 — ACD never executes anything.** Leg A is `stat`; leg B is a text read. No spawn, no dynamic `import()`
of the cited module (importing executes its module scope), no test run. `SPEC §Scope` out-of-scope item 1,
held structurally rather than by intention.

**3 — THE REGISTER ENTRY IS THE STAGING ARTIFACT.** This closes §2's hole without ACD gaining a
red-tolerant runner, and it is what aof already does: m52 authored nine invariants in its register and
landed their mechanisation later, in the runnable tree, never in a docs folder. Generalised:
- At refine a fitness function is declared in `ARCHITECTURE.md`: id, invariant, **intended path**, source
  ADR. That declaration is the reviewable artifact; the invariant is enforced by review until CI.
- The file lands **in the runnable tree, registered in a runner, green** — when its subject exists.
- A declaration whose file has not landed declares itself `pending` (`(pending)` after the cited path).
  Inside the horizon `pending` reports at `warn` (`control-unresolved`, downgraded) — **this is ACD's
  `xfail`**: a declarative, time-boxed statement that a control is known-absent, instead of an invisible
  absence. At `status: done` it is not admitted — a milestone cannot be accepted holding a pending
  control. That is the discharge, and the whole mechanism.

**4 — A staging folder is prohibited.** No `*.test.*`/`*.spec.*` under `<work.dir>/**` (`staged-control`).
The one admitted exception shape is aof's own: a retired suite renamed out of every glob under a
milestone's `reference/` directory (32 such files today).

**5 — The 20 grandfathered citations are a NAMED shrink-only baseline**, each with its milestone and
whether its subject was retired or never landed, so the twenty are visible and payable and the twenty-first
fails. Never a count (m47/R9); never a blanket `done` exemption, because unlike a `.feature` a dangling
citation stays worth reporting after acceptance.

**6 — 66 does not fix TECH_DEBT item 50.** Leg B uses the same substring predicate and inherits the same
hole. Stated rather than absorbed: the fix is a name-set assertion over the *assembled* suite, whose first
run "will find whatever is currently unspread across ~250 arch gates", and which item 50 itself says
"wants a story of its own". 66 makes the hole no worse and does not pretend to close it.

**Alternatives considered.**
- *Give ACD a red-tolerant staging lane (a `@pending` glob a runner includes but does not fail on)* —
  **rejected: that is a test runner**, out of scope by construction; and a lane that never fails is a lane
  nobody reads, re-creating the defect at one remove.
- *Require the file to exist from declaration (no `pending`)* — **rejected**: it forbids authoring a guard
  at refine, the discipline ACD exists to ask for, and puts m53's thirteen legitimate declarations in
  permanent violation mid-flight.
- *Resolve leg B by globbing a configured test-path pattern* — **rejected for this repo, admitted as a
  future widening**: aof's runners are explicit-import, so a glob would report all 287 suites as visible,
  including one no runner names; a gate wrong in the safe direction is still wrong (m45/R5). *Import the
  cited module and assert it exports a runnable array* — **rejected**: importing executes module scope,
  which is ACD running a project's test code.

**Consequences.** A milestone can no longer be accepted while declaring a control that does not exist —
the discharge is mechanical, not a promise. Milestone 53, mid-flight with 13 declared-and-unlanded
controls, is the first subject and will carry 13 `pending` markers or 13 landed files at its accept.
Projects with no `work.controls.runners` get leg A free and a truthful "leg B did not run" — never a false
green.

**Invariant.** `src/work-doctor-controls.mjs` performs no process spawn, no dynamic `import()`, and no
filesystem read outside the snapshot; no `*.test.*`/`*.spec.*` file exists under `<work.dir>/**`; every FF
declared in this milestone's register resolves under both legs. (Enforced by `acd-controls-never-execute`,
`acd-no-staged-control`, `acd-milestone-66-controls-resolve`.)

---

## ADR-005: `VERIFICATION.md` gains a shipped template whose fitness register requires a RED PROBE per declared control — with the scope boundary written in m39/ADR-005's shape, because a fabricated probe is not catchable

**Status:** Accepted
**Date:** 2026-08-15

**Context.** The finding's root item: aof ships **no `VERIFICATION.md` template at all** — confirmed,
`src/bundle/templates/milestone/` holds ARCHITECTURE, COMPLIANCE, DESIGN, OUTCOME, RESEARCH, SECURITY,
SPEC, STATE, UAT and nothing else — while doctor checks only that the file exists and is non-empty
(`src/work-doctor.mjs:109`). "You cannot add a *control was observed failing* field to an evidence model
that has no fields."

The schema is not an invention. Across the 50 `VERIFICATION.md` files that exist: **46 carry `##
Verification evidence`, 46 carry `## Accept decision`, 43 carry `## Findings`**, and the Findings columns
are already prescribed in prose by the shipped prompt — *"id, observed, type, severity, triage, routed-to,
status"* (`src/bundle/commands/verify.md:99`). The template promotes the majority convention.

The red-probe discipline is likewise already practised — in code, invisible to the record. **164 of aof's
287 arch tests (57%) carry a self-check / non-vacuity / planted-defect lane**;
`acd-no-internal-project-names.test.mjs:132-155` is the model ("a guard whose passing state is *found
nothing* is indistinguishable from a broken one by every signal except a red probe"). Against that, **0 of
50 `VERIFICATION.md` files mention a red probe in any form**. The practice exists; the model cannot say so.

**Decision.**

**1 — Ship `src/bundle/templates/milestone/VERIFICATION.md`** with four sections — three the measured
majority (`## Verification evidence`, `## Findings`, `## Accept decision`) and one new, a fitness register
whose columns are `id | enforced by | result | red probe`, the red-probe cell recording *what was changed
to make it fail and the message observed*. `## Findings` freezes `verify.md:99`'s seven columns with the
id **alone in the first cell** (ADR-001).

**2 — The obligation is per DECLARED CONTROL, and it is a resolvable citation between two registers.** For
each `FF-NN` declared in the item's `ARCHITECTURE.md` fitness register, the item's `VERIFICATION.md`
fitness register must carry a row with the same id and a non-empty, non-placeholder red-probe cell, before
the item may be `done`. Absent register → `verification-register-missing`; declared id missing or its probe
empty → `verification-missing-red-probe`. Both under ADR-002's horizon.

**3 — Doctor checks SHAPE, never content** — the trick `duplicate-driver-number` already plays (§8):
presence of the row and of a non-empty cell that is not the template placeholder, with no
natural-language judgment of whether a failure message is plausible.

**4 — The honest scope boundary, in m39/ADR-005's shape.** What this catches: an assertion **nobody has
ever seen fail** — the single property shared by all four measured guard defects (§8) and by the
four-of-five its architect's own audit found "green for the wrong reason". What it does **not** catch,
stated plainly so it is never read as a promise:
- **A fabricated red probe.** No declarative model can catch one. `SPEC §Scope` settles this; the
  mitigation is not more schema — it is that a fabricated failure message is a *specific, checkable lie in
  a document a reviewer reads*, where today's absence is invisible. A smaller surface, not a closed one.
- **Any assertion that is not a declared control.** The obligation reaches `FF-NN` ids and nothing else —
  no claim over every scenario in every `.feature`, or any assertion inside a behavioural suite.
  Extending it there would be the mutation-testing-shaped promise the SPEC rejects, at a cost ACD cannot
  pay.
- **Whether the probe was performed on the shipped assertion.** The row says a probe happened; nothing
  ties it to the bytes that landed.

**Alternatives considered.**
- *A `red probe` column on the `ARCHITECTURE.md` fitness table instead* — **rejected**: a register authored
  at refine cannot record a build-time observation without being edited later, and an ADR-bearing document
  is immutable. Declaration and evidence are different documents on purpose.
- *Require a red probe per `@executable` scenario* — **rejected** on cost and honesty: 653 features' worth
  of obligation for a claim ACD cannot shape-check, met with boilerplate within one milestone.
- *Have doctor judge the plausibility of the recorded message* — **rejected**: an LLM judgment inside a
  deterministic check, and the PRD's own "LLM judges prefer their own outputs" failure.

**Consequences.** `src/bundle/` gains its first occurrence of the falsifiability vocabulary the finding
counted at zero across eight terms. Milestones 37, 52 and 53 are the only items carrying `FF-NN` ids; 37
and 52 are `done`, so the obligation reaches m53 alone, inside its horizon. The template is additive to
`src/bundle/bundle.json` and `manifest.json`, both already gated by `acd-bundle-membership` and
`acd-bundle-manifest-hashes`.

**Invariant.** The shipped `VERIFICATION.md` template carries the four frozen section headings and the two
frozen table headers; the red-probe obligation is checked by shape only — no code path in
`src/work-doctor-controls.mjs` inspects the semantics of a probe cell. (Enforced by
`acd-verification-template-shape`.)

---

## ADR-006: The id race is IN SCOPE as a RULE, owned by story 66/03 — reviewers report findings unnumbered, the single writer allocates on landing, and the duplicate-id check is the residue-catcher, not the prevention

**Status:** Accepted
**Date:** 2026-08-15

**Context.** Finding §6 is the sharpest mechanism in the investigation: the architect *executed* the
read-based countermeasure — read the register's last entry, saw `D-28`, allocated `D-29` — and collided
anyway, because `D-29` had been allocated hours earlier in a concurrent lane. *"A stale read looks exactly
like a fresh one."* The countermeasure is not weak; it is **unsound**. Of the three fixes priced —
orchestrator ranges (needs an allocator, strands on a crashed lane), content-addressed ids (immune,
unreadable, needs migration), and **unnumbered findings numbered on landing** (needs no mechanism, only a
rule) — the third is recommended.

Two facts make this the milestone's business rather than a note. **(a) Story 65 made concurrent dispatch
real in this repo**, so aof now recommends the fan-out that produces the hazard and this milestone is the
first built under it (`SPEC §Dependencies`). **(b) The rule is absent from the prompts that need it**:
`verify.md:99-102` prescribes the Findings columns and says nothing about who allocates an id, and none of
the five reviewing agents (`aof-architect`, `aof-qa`, `aof-security`, `aof-compliance`, `aof-designer`) is
told to report unnumbered.

**Decision.** **In scope, as a rule, owned by story 66/03** (the authoring-guidance story).

1. **A reviewer reports findings UNNUMBERED** — an ordered list, one line each. The reviewing agent
   prompts say so.
2. **The single writer allocates ids at the moment of landing them in the register.** For a
   `VERIFICATION.md` that is the product owner running `aof:verify`, already the sole author of record
   docs. One writer, one file, one allocation point — a stale read is impossible because there is no
   second reader.
3. **`register-duplicate-id` is the residue-catcher, not the prevention.** Both are needed, and the
   finding says why: the rule prevents the collision, the check proves the rule held.

**Why 66/03 and not 66/02.** The rule is prose in `src/bundle/`, the check is code in `src/`; putting them
together gives 66/02 a bundle edit it does not need and splits 66/03's single subject — *what ACD asks
authors to do* — across two stories.

**Alternatives considered.**
- *Defer the rule and ship only the check* — **rejected**: it ships an alarm with no prevention, in the
  milestone whose thesis is that a control depending on somebody remembering is a wish. A check cannot
  prevent a collision; it reports one after two lanes have already written.
- *Orchestrator-assigned id ranges per lane* — **rejected** on the finding's own pricing, and it would make
  `aof work dispatch` responsible for a document convention. *Content-addressed ids* — **rejected**:
  unreadable, and every register would need migration (ADR-001 rule 6 exists to avoid that).

**Consequences.** Three paragraphs across six bundle files and no code. It also removes a reason for a
reviewing agent to read a register during a concurrent build — a small reduction in cross-lane coupling at
exactly the moment 65 made lanes concurrent.

**Invariant.** No arch-test: this is an authoring rule, enforced by the prompts that carry it and by
`register-duplicate-id` as its residue-catcher. Its presence in the shipped prompts is asserted by FF-6608.

---

## ADR-007: Every rule this milestone lands ships its AUTHORING GUIDANCE in the same milestone, and each story lands its OWN fitness functions — there is no late "the fitness functions" story

**Status:** Accepted
**Date:** 2026-08-15

**Context.** Two failure shapes this milestone would otherwise commit against itself. **(a) A check with
no ask is a trap.** ACD's gates are met by agents reading `src/bundle/` prompts and templates; a refusal no
prompt asks for arrives as a surprise at `validate`, and the agent's recovery is to guess — finding §1b's
shape from the other side (a cure prescribed in a retrospective, called "one command", which nobody ran).
**(b) Deferring the mechanisation to a late story is what this milestone exists to stop.** m52 put all nine
arch-tests in a final story (`52/04`) for a reasonable stated purpose — avoiding a long RED window in which
"red because unbuilt" is indistinguishable from "red because broken". ADR-004 now supplies the correct
instrument for that window (a declared `pending` control), and TECH_DEBT item 48 records the cost:
*"three stories accepted on fixtures that are not on disk."*

**Decision.**

1. **Each story lands its own fitness functions** — in `test/arch/`, registered in a runner, green, with a
   red probe recorded in `VERIFICATION.md`. No `NN_story_the-fitness-functions`. Where a guard's subject
   genuinely does not exist yet it is a **declared `pending` control** (ADR-004 §3), never a parked file.
2. **Every rule ships its ask in the same milestone**, in story 66/03: the `VERIFICATION.md` template
   (ADR-005); the `ARCHITECTURE.md` template's fitness table gaining an `id` column and the
   intended-path/`pending` convention (ADR-001, ADR-004); the id-allocation rule in `verify.md` and the
   five reviewing agents (ADR-006); the declare-where-a-runner-can-see-it rule in `refine.md` and
   `aof-architect.md`.
3. **The consequence is asserted, not trusted** — FF-6608 requires the vocabulary the checks enforce to be
   present in `src/bundle/`, which is also the literal discharge of the finding's zero-count table (§1b:
   eight falsifiability terms, 0 files each).

**Alternatives considered.**
- *Follow m52 and land the arch-tests in a final story* — **rejected** on item 48's measured outcome and on
  self-consistency: the milestone would ask every project to do what it declined to do itself.
- *Ship the checks now, the guidance in a follow-on* — **rejected**: it guarantees a window in which ACD
  refuses work for a rule it never asked for, and the follow-on is the kind of item nothing is red without.
  *Ship the guidance and defer the checks* — **rejected**: the status quo the finding measured ("against
  this class recall is not a form of enforcement at all").

**Consequences.** No story here is a pure test story; every story's diff carries its own evidence. 66/03 is
the only story touching `src/bundle/`, so the descriptor and manifest have exactly one editor.

---

## ADR-008: Closure round one — the id namespace is a closed set of FORMS with `R<n>` unhyphenated (superseding ADR-001 §2), the ref prefix is optional (superseding §5), the leaf serves memory's parsers but never its block predicate (scoping §7), openers normalise, register blocks are declaring-or-citing, and dotted ids are a declared silent hole

**Status:** Accepted
**Date:** 2026-08-15

**Context.** QA's Three-Amigos pass on 66/01 measured six conflicts with ADR-001, one making §7's re-home
**unbuildable**. Every number below was re-measured independently; **three differ from QA's and the
difference is recorded rather than smoothed** (259 not 261 lessons, 340 not 341 ADRs, 44 not 45 exact
`## Findings`). ADR-001 is **not edited** — this is the house closure form (m52/ADR-011…013).

| # | Ruling | Measured basis |
|---|---|---|
| **1** | **The id namespace is a closed set of FORMS, not one pattern** — `ADR-<n>` · `FF-<n>[suffix]` · `F-<n>[suffix]` · `D-<n>[suffix]` · **`R<n>`, no hyphen**. `DECLARATION` alternates over them. **Supersedes ADR-001 §2.** Both parsers build `headerRe` from the leaf (`parseArchitecture` ← `ADR`, `parseRetrospective` ← `R`), each byte-identical to today's literal, so **no record moves** and FF-6604's "no id pattern in `local-indexing.mjs`" stands unweakened | `## R<n>` lesson headings: **259 bare, 0 hyphenated**; `## ADR-NNN`: **340 of 340** conform. ADR-001 §2's single pattern returns **0** lesson records — memory would lose 259 of 599 |
| **2** | **The leaf exports two independent things and memory imports only the first**: `ID_FORMS` (whole-document) and the `DECLARATION` recogniser + register-block predicate (register-scoped, 66/02 only). **The block rule scopes the declaration recogniser, never memory's document parsers**; an import of the block predicate by `local-indexing.mjs` is a defect, not a shortcut. **Scopes ADR-001 §7** | **0 of 340** ADR and **0 of 259** lesson headings sit inside a register block — they are whole-document structures |
| **3** | **The opener is matched case-insensitively with a trailing parenthetical stripped**, and nothing else normalises. **ADR-001 §1's "43" was measured with a case-insensitive prefix grep and is corrected to 37 exact / 45 normalised.** `## Story NN findings` ×4 stays OUT — a per-story sub-register is grandfathered by §6, never renamed | exact: **37** `## Fitness functions`, **44** `## Findings`; near-misses recovered by the rule: `## Fitness Functions` ×2, `## Fitness functions (…)` ×6, `## Findings (added at re-open)` ×1 |
| **4** | **A register block is DECLARING or CITING.** `## Fitness functions` in `ARCHITECTURE.md` and `## Findings` in `VERIFICATION.md`/`SESSION.md` **declare**; `## Fitness functions` in `VERIFICATION.md` (ADR-005 §1's red-probe register) **cites** — its rows must resolve to a declaration in the sibling `ARCHITECTURE.md` register and never declare one. This is what keeps one id to one declaration while evidence lives in its own document | ADR-001 §1 and ADR-005 §1 were silently inconsistent; 66/02's duplicate/dangling semantics turn on it |
| **5** | **The `m` prefix is admitted: a cross-file ref is `m?<itemRef>/<ID>`. Supersedes ADR-001 §5.** QA read the `m` form as dominant; it is in fact the minority — but 430 citations dangling on first run would discredit the check on the day it ships, and the prefix costs one optional character | across every `.md`/`.feature` under `wiki/work`: **430** `m52/ADR-007` form, **1,756** bare `52/ADR-007` form |
| **6** | **Dotted ids declare nothing, deliberately — a DECLARED silent hole.** `.` stays outside the namespace because `F-05` and `F-05.1` have a relationship the check cannot know, so duplicate detection over them would be wrong in both directions. Bounded, not open-ended: every instance is inside a `done` item, and the horizon means no open item can add one unseen | **18** distinct dotted ids in declaration position (`F-05.1`…`F-06.6`, `F-38.05`), all in `done` items |

**66/01's re-home is buildable as amended.** The blocking clause was §7's "build their `headerRe` from it"
read against a single hyphenated pattern; with ruling 1 the leaf exports the two forms the corpus uses, so
the substitution is byte-identical at both call sites, and FF-6604's differential assertion is the proof.

**Invariant.** `ID_FORMS` is a frozen closed set, one entry per namespace member; `src/declared-id.mjs`
exports the forms and the register-block predicate as **separate** bindings, and `local-indexing.mjs`
imports only the forms. (Enforced by `acd-declared-id-single-home`.)

---

## ADR-009: Closure round two — a "no code path does X" invariant must be measured against HEAD before it is frozen (A), `pending` is a token not a position (B), the refusal bites at the accept TRANSITION (C), and `register-dangling-citation` resolves QUALIFIED citations only (D)

**Status:** Accepted
**Date:** 2026-08-15

**Context.** The 66/00, 66/02 and 66/03 Three-Amigos passes raised eleven items; **two were declared
controls that fail on arrival** — this milestone's thesis turned on itself. All eleven re-measured here;
**two of my own measurements were wrong and are corrected**. ADR bodies are not edited.

| # | Ruling | Basis |
|---|---|---|
| **A** | **FF-6602's invariant was FALSE at HEAD and is corrected in the register** to *"no code path in `src/` opens an **existing** `.feature` for writing"* — `src/commands/migrate-folder.mjs:225-229` is a **create-only scaffold** and is named in the row as the single admitted write site (a named site, never a count — m47/R9). **The ratchet, and it is the milestone's own lesson third time round: a "no code path does X" invariant is a MEASUREMENT, and may not be frozen until it has been run against HEAD and the result recorded in its row.** Every row below now carries that result | `writeFile(path.join(tasksDir, \`…\.feature\`), renderTaskFeature(…))` at `:225-229`, inside the migrate scaffold's `try` |
| **B** | **`pending` is a TOKEN in the declaration's own entry, not a position in it.** ADR-004 §3's `(pending)`-after-the-path form was written for the bullet shape; a table row carries the same token in any cell. **66's own nine rows are corrected** from "RED until 66/0N" to the literal `pending`, so FF-6607's resolve leg passes on day one instead of firing nine findings | all nine `test/arch/…` citations in this register were unmarked under §3's literal reading |
| **C** | **Ratified as QA wrote it: the refusal bites at the ACCEPT TRANSITION, while the item is still open.** ADR-002 §1 (no `error` against a `done` item) and ADR-004 §3 (`pending` inadmissible at `done`) are then both true, because the check runs *before* the transition, on an open item, as its precondition | the two clauses are otherwise contradictory; 66/02 codes against this |
| **D** | **`register-dangling-citation` resolves QUALIFIED citations only** — `m?<itemRef>/<ID>` — plus bare ids **inside their own item's documents**. A bare cross-item id has no addressable target, so reporting it dangling asserts what the model cannot know. Scoping is the difference between an unlandable check and a landable one | qualified citations **1,762, of which 61 unresolved** (mostly authoring noise: `08/ADR-00n`, items `007`+`ADR-008`, `1`+`F-2`) versus an unscoped universe of **8,250** bare `ADR-NNN` + **345** `FF-NN` over 555 files |
| **E·F·G** | **The horizon, three corrections.** **E:** ADR-002 §3's warn tier is **scoped to doctor-lane facts**; there is **no ninth code**, so the grandfathered `.feature` population is silent in the gating lane **by design** — a doctor parse code would be a second reader of `.feature` files, the TECH_DEBT-51 shape ADR-003 already rejected. **F:** the horizon follows **the owning item's own status** — a task feature's is its **story**, a milestone record doc's is the milestone, so `66/00` freezes at its own accept while `66` stays open. **G:** §3's "gating never" overclaims — **the horizon owns severity, the FACE owns the exit code**; a `warn` under `--strict` exits non-zero, which is doctor's policy, not a contradiction | `validateWork` has no severity (`src/work.mjs:793`); FF-6606 pins the code set at eight; `acd-doctor-strict-exit.test.mjs:1-13` cell (c) |
| **H·I·J** | **The cross-story contract and the cardinalities.** **H:** the placeholder token is **frozen here** (`<what was changed to make it fail, and the message observed>`) rather than bought with a `depends` edge — freezing is what ADR-001 §2 already does for the grammar, and it keeps 66/03 dependency-free. **I:** the citation form `m?<itemRef>/<ID>` and "cite only ids that resolve" **become a fifth ask in 66/03** (ADR-007 §2), because `register-dangling-citation` is an `error` and ADR-007 §1 forbids a refusal with no ask. **J:** confirmed — `control-runner-unchecked` fires **once per item**; `control-unregistered` is **suppressed when leg A failed**; a declaration citing two paths resolves only when **both** do; and a **stale `pending`** on a landed control is **a declared no-op**, not a ninth code, because the resolution check already answers what the marker claims | m53+m66 alone would emit 22 warns under per-control cardinality; FF-6607 is the two-path case |

**A and B are resolved in this document**, not deferred: FF-6602's invariant now matches HEAD, every row
carries its measured state, the nine `pending` markers are in place, and **K routes to `66/VERIFICATION.md`**.

---

## ADR-010: Closure round three — a dotted id DECLARES nothing in every form (ADR-008 ruling 6 unweakened), but on the CITING side the dot splits by form: `ADR-NNN.4`/`R4.1` are CLAUSE POINTERS into a declared id, `FF`/`F`/`D` dotted ids cite nothing — so the guard rides the register-scoped branches only, and the lookbehind takes the dot with it

**Status:** Accepted
**Date:** 2026-08-16

**Context.** 66/01's developer contested round 1's blanket dot guard. Every number below was re-run over **1,221**
files under `wiki/work` **from a script file, each constructed pattern printed beside its result** — round 1's came
through `node -e`, which is why it was wrong (ruling E). ADR bodies are not edited; the form is ADR-008/ADR-009's.

| # | Ruling | Measured basis (re-run 2026-08-16) |
|---|---|---|
| **A** | **The DECLARATION side is unchanged and uniform: a dotted id declares nothing, in every form.** This is **ADR-008 ruling 6, standing unweakened and un-scoped** — nothing here supersedes or narrows it. It needs no dot rule of its own, because the run-on guard `(?![A-Za-z0-9-])` already refuses `F-05.1` structurally: the character after the id is `.`, which is not the separator the declaration shape requires. **The declaration side is form-blind; only the citing side splits.** | dotted ids in declaration position: **17 distinct, every one an `F`**, in exactly two items — `43_milestone_mesh-artifact-authority` (15: `F-05.1`…`F-06.10`) and `38_milestone_cross-machine-worker-execution` (2: `F-38.05`, `F-38.06`) — **both `done`**, so ruling 6's "bounded, and the horizon means no open item adds one unseen" re-measures true. **0** `ADR`, **0** `R`, **0** `FF`, **0** `D`. ADR-008 recorded **18**; under the shipped `declaredIdOn` it is **17**, and the difference is the counting instrument, not the ruling |
| **B** | **The CITING side splits by form, and the split is the measurement, not a preference.** `<id>.<digit>` is a **CLAUSE POINTER** after `ADR`/`R` (the base id resolves; the `.4` names a clause inside it) and an **ambiguous dotted id** after `FF`/`F`/`D` (cites nothing). So the dot guard is baked into the **register-scoped branches only** — `dotGuarded` at `src/declared-id.mjs:240` — never trailed across the whole alternation. **A blanket guard is not a stricter version of this; it is an unbounded SILENT COVERAGE HOLE**, hiding resolving citations from `register-dangling-citation` forever, which is the opposite of the defect 66/02 exists to report | qualified refs, `(?<![-\w])`: **no guard 2,401 · blanket 2,366 (−35) · per-branch 2,400 (−1)**. The 35 blanket drops are **{ADR 30, R 4, F 1}** and **34 of 35 RESOLVE** — `26/ADR-003`, `26/ADR-008`, `27/ADR-001`, `27/ADR-004`, `27/ADR-006`, `33/ADR-004`, `m33/ADR-002`, plus the four `R` clause pointers in `43_…/stories/{01,04}/STORY.md` (named apart, per D). The single per-branch drop is the **one** that does not: `4/F-06.5` (`43_…/VERIFICATION.md:1115`), base `F-06` **not declared** — ruling 6's population exactly, cited across a milestone boundary |
| **C** | **Why form-dependent is principled, and how it re-measures.** Ruling 6's hazard is real — `F-05` and `F-05.1` may be **sibling findings**, and the hand-numbered `F`/`FF`/`D` registers do split ids that way (15 of them in m43 alone). `ADR-NNN` and `R<n>` have **no dotted id form anywhere in this corpus**, so a `.4` after them can only be a clause. **The rule therefore follows from which registers admit sub-numbering** — and it carries its own trigger: **the day a dotted `ADR` or `R` id is DECLARED, ruling A already refuses it and this ruling is revisited.** | dotted ids in prose, anywhere: `ADR` **26** distinct, `R` **18**, `F` **19**, `FF` **0**, `D` **0** — so every dotted `ADR`/`R` in the corpus is a clause pointer and none is an id |
| **D** | **The lookbehind extends by the same reasoning: `(?<![-\w.])`.** A dot is an ID-CONTINUATION character here, so a hyphen-only lookbehind lets a clause pointer's own digits open an item ref. **And the fix changed the shape of ruling B: at the shipped lookbehind the per-branch guard drops NOTHING — its whole measured population is already removed — so it is now PROSPECTIVE, while a blanket guard still hides 29 resolving `ADR` clause pointers.** **The residual hole, named rather than left to be found:** a clause pointer INTO a register-scoped id (`52/FF-5204.3`) is invisible to the dangling check — measured **0** today | the dot removes exactly **7** fabricated citations and adds none — items `3`+`ADR-006` (from `ADR-004.3/ADR-006`), `2`+`ADR-016`, `4`+`ADR-005`, `5`+`R1`, `1`+`R4`, `2`+`R4`, `4`+`R4`; six resolve **silently wrong**, one dangles. **Every specimen is written APART (`item`+`id`, never joined), because writing one joined plants it in this register as a real citation — one of the seven dangles, and `acd-register-declaration-form`'s own lane fails on any of them: measured, twice, while drafting this row.** 2,400 → **2,393**, a strict subset. At `(?<![-\w.])`: **no guard 2,393 · blanket 2,364 (−29, all `ADR`, 8 distinct refs) · per-branch 2,393 (−0)** |
| **E** | **THE RATCHET THIS ROUND EARNED, in ADR-009/A's shape and extending it twice.** (i) Round 1's comment called the blanket guard *"ruling 6 applied to the citing side"* — an over-reading of an immutable ruling, which **review ENDORSED**; so ADR-009/A's "a claim about this tree may not be frozen until it has been run against HEAD and recorded" now binds **the reviewer as well as the author**, and m45/R5 is **violated a fourth time**. (ii) **A regex measurement taken through `node -e` — or a shell heredoc — is NOT EVIDENCE**: both silently drop a backslash level, and a no-op `String.replace` returns a false zero that looks like a clean result. **A measured regex claim in this milestone is admissible only from a script FILE that prints the constructed pattern beside its result.** Both halves are lessons for `66/RETROSPECTIVE.md`, and this row is the pin | the false zero is reproducible: the same six-cell matrix run through a heredoc returned `refs 0` in every cell with `\d` degraded to `d` in the printed pattern — the printed pattern is what made it visible, and is why printing it is now the rule |

---

## ADR-011: Closure round four — the bare half of `register-dangling-citation` is DISCHARGED at the one STRUCTURALLY IDENTIFIED bare position (a citing register entry) and free-prose policing is REFUSED as unlandable, this document's own two dangling specimens are an admitted named population, a snapshot fact gathered by a RECURSIVE walk belongs to the item that OWNS the path, and the ACCEPT REFUSAL is unbuilt-but-buildable with its invariant corrected from "no pending MARKER at `done`" to "no UNRESOLVED control at `done`"

**Status:** Accepted
**Date:** 2026-08-16

**Context.** 66/02's build reported two rows of `01_a-register-declares-once.feature` INFEASIBLE and flagged rather than
edited, which is correct. Every figure below is the ARCHITECT's own re-run, **from a script FILE printing each pattern**.

| # | Ruling | Measured basis (architect's re-run, 2026-08-16) |
|---|---|---|
| **A** | **The bare half of ADR-009/D is DISCHARGED, not dropped — at the one bare position a document's own STRUCTURE identifies: a CITING register entry** (ADR-008 ruling 4), whose row asserts by position that the id is its own item's. **Free-prose bare-id policing is REFUSED, and the two rows asking for it are superseded here** rather than by editing a contract. The refusal is a PRECISION measurement, not a preference | shipped scoping: **1,744** policed qualified citations, **14** dangling (**0.80%**), each naming an id and the act that clears it. Free prose adds **329** (file, id) pairs at the literal reading and still **135** at the tightest narrowing anyone has proposed — of which **304 / 131** stand in `done` items no legal edit can clear. On the LIVE milestone it is **0% precise**: **20** pairs at the literal reading, **2** at the tightest, and not one is a citation — id PATTERNS, bare cross-item ids the row above them puts out of the universe, and ids quoted while *describing* the two dissolved false positives. The 33%-precision configuration this milestone exists to refuse, restated at zero |
| **B** | **And the two rows contradict two ACCEPTED scenarios of their own story, which is what makes this a CONTRACT defect rather than a build gap.** A contract cannot ask for a finding its own settling scenario forbids | (i) that feature's last scenario requires every finding to name something *"a legal edit could declare or correct"*, and the `done`-item population is cleared by no legal act — ADR-002 §1 immutability plus ADR-008 ruling 3's never-renamed per-story sub-registers; (ii) `00_one-lane-that-reads-and-never-runs.feature`'s last scenario FREEZES the new-read budget at one probe per cited path and one read per runner file, and the row's own placement is a `STATE.md`, outside doctor's document set — **62** items carry one, so the row costs 62 new reads |
| **C** | **This document's OWN two dangling citations are an ADMITTED, NAMED population** — ADR-009/D's two noise specimens (its `Basis` cell), written before ADR-010/D's write-specimens-apart rule and sealed inside an immutable body, so no legal edit clears them: `error` while 66 is open, `warn` at `done`, LISTED never counted (m47/R9), reviewed by re-measuring. **The cheap alternative is refused WITH its measurement**, and ADR-010/D's rule is the ratchet that stops a third | "a citation inside a code span is a specimen, not a citation" would blind the check to **778 of 1,744** qualified citations (**44.6%**) — precisely the unbounded SILENT COVERAGE HOLE ADR-010/B already refused, in a corpus where 44% of all citations are written in backticks. Both specimens are themselves inside code spans, which is why the shortcut is tempting and why it is wrong |
| **D** | **THE RATCHET THIS ROUND EARNED: a snapshot fact gathered by a RECURSIVE walk must be attributed to the item that OWNS the path**, because the horizon is per-owning-item (ADR-009/F). It generalises past `stagedControls` to every future recursive measurement, and m45/R5 is violated a fifth time — a lane named for the horizon that does not apply the horizon's own ownership rule | `scanItemTree` collects test-shaped names over the whole subtree and the snapshot stamps them onto EVERY enclosing item, so one file yields two findings and the engine's code+path+message de-dupe keeps the FIRST. Measured over a temp fixture: a staged control under a **`done` story inside an open milestone** is reported at **`error`** — an error against a path under a `done` item, which ADR-002's own invariant forbids — and under a `done` milestone the open story's `error` is silently lost. **0** such files today, so it is LATENT: a rule and a fix, never a ninth code |
| **E** | **THE ACCEPT REFUSAL IS UNBUILT, is NOT infeasible, and its INVARIANT SHAPE IS CORRECTED HERE: a `done` item's register declares no UNRESOLVED control — marker or no marker.** ADR-004 §3's "a `pending` control is not admitted at `done`" reads as a claim about the MARKER; taken literally it is the wrong gate. **Where it bites is a FITNESS FUNCTION, ACD's third gate, and that is forced rather than chosen:** doctor cannot carry a PROSPECTIVE claim (it reports the state it is given, and after the transition ADR-002 §1 forbids `error` — which is precisely why ADR-009/C put the check *before* the transition), a ninth code is an ADR act that would still exit 0 at `warn`, `validateWork` has no severity (ADR-003 §6), and aof has NO transition hook at all — a status is frontmatter an agent edits. So the refusal is a red suite: **66/02 lands the lane** in `acd-milestone-66-controls-resolve.test.mjs` (its own file, over `fitnessDeclarations` it already exports — no lane code, no ninth code, no new snapshot read), and **the ask becomes a SIXTH one in 66/03** (`verify.md`'s "require PASS"), because ADR-007 §1 forbids a refusal no prompt asks for | QA's table, re-run: while the marker stands the finding is `control-unresolved@warn` at **in-progress, in-review AND done** alike, and doctor exits **0** without `--strict`; `aof:verify` step 4 gates on `aof:validate`, which states that a warn-only doctor result **does not fail the skill**. So nothing refuses the transition — the mechanism ADR-004 §3 calls *"the discharge, and the whole mechanism"* is absent. **The corrected invariant is buildable GREEN ON ARRIVAL:** over 37 declarations in the 4 registers carrying ids, a gate "no `done` item declares an unresolved control" reports **0** violations (m37 **7/7** resolve, m52 **9/9**) — and it bites immediately where it must, because **m53 carries 13 unresolved declarations and every one is UNMARKED**, which a marker-shaped gate would wave straight through at the first real accept. `--strict` is refused as the carrier for the same reason ROUND 3/4 refused a transitive purity rule: it gates on all 17 unrelated warns and is red on arrival |
| **F** | **Three neighbouring rows of `01_a-register-declares-once.feature` now pass VACUOUSLY, and are NAMED rather than superseded** — `:78`, `:80` and `:81` all answer "none" because the lane polices no bare prose at all, not for the reasons their text gives, and `:78` lost its only discriminating partner when ruling A superseded `:79`. Their VERDICTS stay true, so nothing is withdrawn; what is withdrawn is the claim that they DISCRIMINATE. The discrimination they were written for now lives where the lane actually decides — the citing-register-entry branch, driven both ways by FF-6606's fixture — and m45/R5 is the reason this is written down instead of left green | a row whose passing state cannot be falsified is the defect this milestone exists to refuse; naming three of them in the milestone's own contract is that rule applied to itself, and costs one clause against the review that would otherwise re-derive it |


---

## ADR-012: Closure round five — a joined SPECIMEN in an accepted ADR body is a RENDERING defect whose repair to ADR-010/D's `item`+`id` form is LEGAL under a mechanical no-claim-moved test (superseding ADR-011/C), the ADR-body carve-out is REFUSED at 37.9% as ADR-011/C's own shortcut at the same scale, ADR-010/D's write-apart rule becomes a SEVENTH ask, and a missing red probe at the accept is the register being completed by the accepting act

**Status:** Accepted
**Date:** 2026-08-16

**Context.** 66 could not pass the gate 66 shipped. Live over `wiki/work`: `66/ARCHITECTURE.md` carries two
`register-dangling-citation` at **`error`** — items `007`+`ADR-008` and `1`+`F-2` (written APART per ruling C,
which is this row obeying its own rule), both in ADR-009/D's `Basis` cell.
ADR-009/C runs the check BEFORE the transition, so 66 is still open and both gate; ADR-011/E's sixth ask
requires PASS; and no prompt names an act that clears one. **ADR-011/C is the defect**: it froze *"no legal
edit clears them — `error` while 66 is open"* without ever running the accept, which is ADR-009/A's own
ratchet violated a **SIXTH** time, in the milestone that ratcheted it. A waiver clause is refused outright,
not weighed: it is the first instrument a future project would reach for, and this milestone exists to
refuse it. ADR bodies are not edited; rulings A–D are the house closure form (ADR-008…ADR-011).

| # | Ruling | Measured basis (architect's re-run, 2026-08-16, from a script FILE) |
|---|---|---|
| **A** | **A joined SPECIMEN in an accepted ADR body is a RENDERING defect, not a decision, and repairing it to ADR-010/D's `item`+`id` form is LEGAL. Supersedes ADR-011/C's "no legal edit clears them".** Immutability protects a document's CLAIMS, not its bytes — a token that manufactures a citation the document never asserted is a defect in what the bytes RENDER, and repairing it withdraws nothing. **The licence is MECHANICAL, never a judgment call, and that is exactly what stops it becoming the waiver refused above:** legal only when `registerDeclarations` and `registerEntries` are byte-equal before and after, `qualifiedRefsIn` loses EXACTLY the repaired tokens and gains none, every lost token is UNRESOLVED, and the reader sees the same specimen. Anything failing that test is an amendment: superseded, never edited. **It cannot recur** — ADR-010/D is the prevention and ruling C ships it | the two tokens quote NOTHING in this tree. Their origins are `02_…/RETROSPECTIVE.md:31`'s `ADR-007/ADR-008` and `03_…/RETROSPECTIVE.md:13`'s `F-1/F-2` — slash-joined ID PAIRS which under the SHIPPED lookbehind yield **`[]`**, measured both. The cell transcribed the PRE-ADR-010/D grammar's OUTPUT; ADR-010/D withdrew that output (2,400 → **2,393**, a strict subset) and FF-6603 already records *"TWO of ADR-009/D's 'authoring noise' examples were this artifact, not noise"*. The repair removes RESIDUE OF A WITHDRAWN MEASUREMENT, not evidence. Delta: refs **41 → 39**, removed exactly items `007`+`ADR-008` and `1`+`F-2` at `:604`, added **0**, declarations and entries byte-equal, **line count 700 → 700** |
| **B** | **The "a citation inside an immutable ADR body is not actionable" carve-out is REFUSED, and refused WITH its number** — it is ADR-011/C's code-span shortcut at the SAME SCALE, so admitting it to rescue ADR-011/C would be incoherent with the refusal that ruling rests on. Downgrading to `warn` rather than silence does not save it: ADR bodies are this corpus's highest-density citation site, so the rule un-gates the check exactly where it is worth most, and forever | ONE universe, every qualified citation under `wiki/work` = **2,421**. Inside an ADR body: **917 (37.9%)**. Inside a backtick code span: **837 (34.6%)** — the population ADR-011/C refused as *"precisely the unbounded SILENT COVERAGE HOLE ADR-010/B already refused"*. The carve-out that would rescue **2** findings blinds **917** |
| **C** | **ADR-010/D's write-apart rule becomes a SEVENTH ASK in 66/03** — `refine.md`, `aof-architect.md` and the `ARCHITECTURE.md` template: *when you QUOTE an id that does not resolve, write it APART (`item`+`id`), never joined — a joined specimen plants a real citation in your own register*. **This deadlock IS the refusal ADR-007 §1 forbids**: the check shipped, the prevention was frozen in an ADR, and the ask was never written, so the architect who authored ADR-009/D had no rule to follow and the next project's architect still would not | `grep` over `src/bundle/` for the rule: **0 files**, measured at this review. The five shipped citation asks say *"cite only ids that resolve"* and say nothing about quoting one that does NOT — the precise gap that produced this row, and the last unshipped rule of ADR-007 §2 |
| **D** | **`verification-missing-red-probe` for FF-6608 at the accept is CORRECT, not a chicken-and-egg.** The register is COMPLETED BY THE ACCEPTING ACT: ADR-009/C puts the check before the transition, on an open item, precisely so the single writer writes the row and re-runs. A gate is circular only when the clearing act is unavailable to the actor holding it; here the actor IS the writer, and the finding is the ask arriving on time | `aof work doctor 66` error set, live: **3** — two `register-dangling-citation` (cleared by A) and this one. m66's remaining findings are all `warn`: 3 × `mtime-ahead-of-updated`, 1 × `control-runner-unchecked` (leg B honestly not run — this repo declares no `work.controls.runners`) |
---

## Fitness functions

<!-- DOGFOODS ADR-001/ADR-008/ADR-010: the id is ALONE in the first cell, so every row DECLARES and every FF-66NN elsewhere CITES; unlanded ⇒ `pending` (ADR-009/B); every row owes a red probe (ADR-005). HARNESS: `{name, run}`. -->

| id | invariant | enforced by (arch-test) | measured at HEAD (ADR-009/A) | from |
|---|---|---|---|---|
| **FF-6601** | **One Gherkin parser.** `src/feature-parse.mjs` is the only module under `src/` recognising a Gherkin keyword; `src/work.mjs` carries no `Feature:`/`Scenario:`/step-keyword regex and reaches the grammar only by import. | `test/arch/acd-feature-parser-single-home.test.mjs` **(pending — 66/00)** — comment-stripped source scan of `src/**` for the keyword-regex shapes asserting exactly one home; import-statement parse of `work.mjs`. Non-vacuity: a planted keyword regex in a second module is detected **ROUND 3/9 — the scan distinguishes a RECOGNISER (a pattern TESTED against input) from a RENDERER (a keyword emitted in a template literal): `src/commands/migrate-folder.mjs:571-580` renders `Feature:`/`Scenario:`/`Given ` into a scaffold and is named-and-excluded, or a bare keyword-string scan reports THREE homes and the gate is wrong about the tree.** | **two recognisers** (`work.mjs:719-755`, `feature-parse.mjs:18-55`) **+ one renderer** (`migrate-folder.mjs:571-580`) — FALSE at HEAD; 66/00 makes it true | ADR-003 |
| **FF-6602** | **The acceptance horizon has ONE home and never gates an immutable record.** A single exported predicate decides it; every check calls it; no `severity:"error"` finding is emitted for a path under a `done` item; **no code path in `src/` opens an EXISTING `.feature` for writing** (create-only scaffolding is admitted — ADR-009/A). **Create-only is made STRUCTURAL, not narrated: the admitted site carries `{ flag: "wx" }` (ROUND 3/10) — `writeFile(p,t,"utf8")` truncates, so without the flag the claim is a property of surrounding control flow and no static gate can decide it.** | `test/arch/acd-acceptance-horizon-single-predicate.test.mjs` **(pending — 66/00)** — import the predicate, assert by source scan it is the only implementation; enumerate every `.feature` write site in `src/` and assert each is create-only, with `src/commands/migrate-folder.mjs:225-229` the single **named** admitted site; drive both lanes over two fixtures differing only in `status`. Non-vacuity: the same planted violation yields `warn` under `done` and `error` under open, and a planted overwrite-an-existing-feature site is detected **ROUND 3/10 — assert the flag AT the call rather than reasoning about its callers; a planted flagless `.feature` write fails.** | **one write site, create-only** (`migrate-folder.mjs:225-229`); zero overwrite sites — the corrected invariant is TRUE at HEAD | ADR-002, ADR-009 |
| **FF-6603** | **A declaration is id-first inside a frozen register block; fenced regions are skipped; the opener normalises.** `ID_FORMS`, the register-block set and each block's DECLARING/CITING kind are frozen exported literals. **Resolution is against the UNION (ROUND 3/1): register-block declarations for `FF`/`F`/`D`, and memory's WHOLE-DOCUMENT headings for `ADR`/`R`. HTML comment blocks are skipped alongside fences (ROUND 3/11).** | `test/arch/acd-register-declaration-form.test.mjs` **(pending — 66/01)** — set-equality against the ADR-001/ADR-008 literals, plus **seven** planted negatives: four measured (a STATE heading naming an id; `**Next free id is D-37.**`; a bullet entry; a cell holding id-plus-prose), one prospective (a `## Fitness functions` heading inside a fence — measured 0 today, ADR-001 §3), and two from ADR-008 (a dotted `F-05.1`; a row in a **citing** block) — against four positives: `## ADR-001:`, `## R1 —` (**the bare-`R` form, 259 in corpus**), a table-cell FF row, and an `m52/ADR-007` ref **ROUND 3/1+2+11 — three mechanisation rulings, each measured: (a) resolving `ADR`/`R` against register blocks only makes EVERY qualified citation dangle — 1,302 (citation, file) pairs, 125 at error — which is the scoping defect the last scenario of `01_a-register-declares-once.feature` exists to refuse; the union takes it to 88 pairs. (b) The qualified-ref grammar takes a lookbehind on the item ref, or it mis-reads the house's own slash-joined id pairs (`ADR-001/ADR-008` → item `001`; `F-1/F-2` → item `1`) — 125 such pairs, and TWO of ADR-009/D's "authoring noise" examples were this artifact, not noise. **ADR-010/D extends that class to `(?<![-\w.])`, and ADR-010/B scopes the dot guard to the register-scoped branches; the shipped grammar is `src/declared-id.mjs:240-245`.** (c) A multi-line `<!-- … -->` sits inside a register block in EVERY shipped template and in this very register; measured 0 declaration-shaped lines inside a comment today, so it is prospective with the same trigger as the fence rule.** | **345 `ADR` + 275 `R` headings conform — 100% of them, under the shipped capture; 0 whole-document heading sits inside a register block; 2,407 qualified citations, of which 24 unresolved (citation, file) pairs / 27 occurrences** — re-measured at HEAD 2026-08-16 under the union + ADR-010's grammar, this document included (round 1 read 57 pairs; the literal reading, 1,302) | ADR-001, ADR-008, ADR-010 |
| **FF-6604** | **The grammar has one home, the two exports are separate, and the extraction changed no record.** `src/memory/local-indexing.mjs` holds no id pattern of its own, builds both `headerRe`s from `ID_FORMS`, and **imports no register-block predicate** (ADR-008 §2). **`ID_FORMS` carries the SEPARATOR CLASS `[:·—–-]` as well as the id shape (ROUND 3/6): each parser holds TWO literals — split at `:107`/`:160` and capture head at `:111`/`:166` — and "holds no id pattern of its own" reaches all four, or the re-home is half done.** | `test/arch/acd-declared-id-single-home.test.mjs` **(pending — 66/01)** — source scan for a second copy; import-binding parse asserting memory takes the forms and not the block predicate; **differential** comparison of `buildRecords` over a frozen corpus, before vs after, asserting the **599** records (340 adr + 259 lesson) are byte-identical **ROUND 3/7+8 — the differential carries NO CONSTANT and is a SELF-COMPARISON: hold the four pre-extraction literals as local constants (a test is code; the no-second-copy invariant is scoped to `src/`), walk the corpus, and assert section splits and `(id, title, line)` captures are set-equal to the shipped composition, with a non-vacuity floor of `adr > 0 && lesson > 0`. A stored count is unrunnable here and was also WRONG: `buildRecords` returns 342 adr + 258 lesson = **600**, not 599 — it filters `type === "milestone" && parent == null` (`:611-613`), so a top-level STORY's retrospective (`29_story_migrate-command`) is never read; and the adr half moved from 340 to 342 when ADR-008 and ADR-009 were appended to this very register. **The walk is over the REAL `wiki/work`, because all 22 dependent suites plant temp-dir fixtures and a re-home defect here is a SILENT SHRINK — fewer records, not wrong ones — which every one of them stays green through.** | **600 records (342 adr + 258 lesson)** measured in isolation, and moving — which is why the assertion is a set-equality, not a number | ADR-001, ADR-008 |
| **FF-6605** | **The controls lane reads, never runs, and is pure.** No `node:child_process`/`node:fs`/`node:process` import, no dynamic `import()`, no clock; every export is `(snapshot, ctx) => Finding[]`; the same snapshot yields byte-identical findings in-process and in a fresh process. **Purity is over DIRECT imports plus a named leaf allowlist (ROUND 3/4), and the controls lane is a TRUE LEAF that takes item identity from the snapshot ROWS rather than importing `ITEM_RE`/`isDriver` — so the dependency direction INVERTS: the spine imports the leaf to learn which paths to probe (ROUND 3/3).** | `test/arch/acd-controls-never-execute.test.mjs` **(pending — 66/02)** — transitive import-graph walk (so a one-hop laundering module cannot satisfy it); arity/shape assertions over a literal snapshot; double-run + subprocess determinism **ROUND 3/3+4 — a transitive walk is unsatisfiable alongside the house idiom and would fail on arrival: both existing lanes import the spine (`work-doctor-freshness.mjs:19`) and the spine imports `node:fs/promises` (`work-doctor.mjs:23`), so every lane reaches `node:fs` in one hop. The allowlist names the only admitted leaf, `src/acceptance-horizon.mjs`, whose zero imports are themselves asserted here.** | both existing doctor lanes reach `node:fs` transitively via the spine — a transitive rule would be RED on arrival; the direct rule is true today and 66/02 must keep it so | ADR-003, ADR-004 |
| **FF-6606** | **The finding envelope and code set are frozen and exhaustively reachable.** Every finding is exactly `{code, severity, path, message}` with a non-empty raw-absolute `path`; the exported code array is exactly the eight of ADR-003 §5; each of the eight is produced by a fixture — an unreachable code is as much a defect as an unfrozen one. | `test/arch/acd-controls-finding-envelope.test.mjs` **(pending — 66/02)** — set-equality on the code array; drive the groups over fixtures engineered to fire all eight; assert key set, severity domain, `path.isAbsolute` | module absent; the eight codes live only in ADR-003 §5 until 66/02 | ADR-003 |
| **FF-6607** | **No staged control, and this milestone's own controls resolve.** Zero `*.test.*`/`*.spec.*` under `<work.dir>/**` (the `reference/` retirement convention, renamed out of every glob, stays admitted as the one exception shape); every `FF-66NN` declared here passes both ADR-004 legs. **The 20-entry baseline is DROPPED (ROUND 3/5): re-measured, **0 of 20** of those rows carry an id in first position, and m49's sits outside its `## Fitness functions` block entirely — so under ADR-001 §2 none is a declaration and under §6 that register "declares nothing and is compliant by construction". A baseline suppressing findings that cannot fire is a control whose passing state cannot be falsified — the exact defect this milestone exists to refuse — and §6's grandfathering already covers the population at zero cost.** | `test/arch/acd-no-staged-control.test.mjs` **(pending — 66/02)** + `test/arch/acd-milestone-66-controls-resolve.test.mjs` **(pending — 66/02)** — the second parses THIS register with the shipped ADR-001 recogniser, so a row added here without a file fails immediately (m22/R1's own-coverage rule) **ROUND 3/12 — two silent holes named rather than discovered: (a) `wiki/work/02_milestone_planning-init/UAT.md:68` holds a `## Findings` register in a `UAT.md`, outside the frozen file set, so its rows declare nothing; (b) the doctor lane's `staged-control` walk can ride `newestFileMtimeMs` (`work-doctor.mjs:87-104`, which already recurses and `stat`s every file and discards the names) but that runs PER ITEM DIR (`:291`), so files directly under `<work.dir>` and under orphan folders are never seen — the shipped predicate is NARROWER than this arch-test's `**`, which is a difference, not a contradiction, and is stated so neither is mistaken for the other.** | **staged-control leg GREEN (0 test-shaped files under `wiki/`)** and must STAY green; the resolve leg greens as each `pending` clears | ADR-004, ADR-007 |
| **FF-6608** | **The bundle asks for what the checks enforce.** `src/bundle/` names the red-probe field, the declaration form, the `pending` convention and the unnumbered-findings rule; the shipped `VERIFICATION.md` template carries the four frozen headings and two frozen table headers. Discharges the finding's measured zero (eight terms, 0 files each). | `test/arch/acd-verification-template-shape.test.mjs` **(pending — 66/03)** — frozen-token presence over `src/bundle/**` with the token set exported and set-equal to the ADR-005/006 literals; template heading + header assertions | **0 of 8 falsifiability terms present in `src/bundle/`** — the finding's measured zero | ADR-005, ADR-006, ADR-007 |

---

## Story partition (REVISED from `SPEC.md`, with the reason)

**SPEC cut by CHECK**, and three of its four checks land in one new module and one shared array — `CHECK_GROUPS` and `src/work-doctor-controls.mjs` (ADR-003 §3). Three stories appending to one array is merge friction wearing an independence claim (`65/STORY.md:69-74`). **The revision cuts by SEAM**, on the graph.

| # | Story | Outcome | `depends` | Primary files | Graph-derived coupling justification |
|---|---|---|---|---|---|
| **66/00** | **`contract-parses`** — a `.feature` that does not parse is a refusal at `validate`, inside the acceptance horizon | `[]` | `src/feature-parse.mjs` (the one parser + structural findings), `src/work.mjs` (`checkFeatureTags` → thin caller; the horizon predicate), `test/work-validate.test.mjs`, new `test/feature-parse-strict.test.mjs`, FF-6601 + FF-6602 arch-tests, `scripts/test.mjs` (its own registrations) **+ `src/acceptance-horizon.mjs` — a new ZERO-IMPORT leaf (ROUND 3/3) carrying the predicate AND `VALID_STATUS` (moved from `src/work.mjs:49`, or the five lifecycle words get a second copy).** | Touches the **243-dependent** god node and **nothing else in the milestone touches it**. Its convergence with `src/feature-parse.mjs` (**1 dependent, 0 deps**) is what keeps it independent rather than threatening it: the derivation moves *out* of the hot file into the coldest leaf in the tree, so the diff is smaller, the blast radius is one module, and the duplication ledgered at `src/feature-parse.mjs:1-4` is discharged rather than tripled | **ROUND 3/3 — the horizon predicate CANNOT live in `src/work.mjs`: that file imports `node:path`/`node:os`/`node:fs/promises`/`node:fs` (`:13-16`), so 66/02 importing it from there fails FF-6605 on arrival. A zero-import leaf makes ADR-002 §5's "exactly one implementation" a fact of the module graph rather than of discipline, and 66/00's contract already permits it — `01_the-acceptance-horizon.feature:36-40` says "exported from exactly one module" and names none — so this is a partition change, never a delivered-feature edit.**
| **66/01** | **`declaration-form`** — one machine-recognisable declaration form, with one home, shared with the parser memory already runs | `[]` | `src/declared-id.mjs` (new leaf, 0 imports), `src/memory/local-indexing.mjs` (two inline regexes → imports), new `test/declared-id.test.mjs`, FF-6603 + FF-6604 arch-tests, `scripts/test.mjs` | Shares **no file** with 66/00, 66/02 or 66/03. Its one pre-existing edit is to a module with **24 dependents, 22 of them test suites** — an unusually strong net for a mechanical extraction; the 2 source dependents (`local-backend`, `graphify-backend`) consume records whose bytes must not change, which is FF-6604's differential assertion |
| **66/02** | **`the-controls-lane`** — `doctor` gains one lane carrying all three register/verification/resolution checks, with a frozen eight-code envelope | `[66/00, 66/01]` | `src/work-doctor-controls.mjs` (new; three pure groups), `src/work-doctor.mjs` (snapshot extension + one `CHECK_GROUPS` entry), new `test/work-doctor-controls.test.mjs`, FF-6605 + FF-6606 + FF-6607 arch-tests, `scripts/test.mjs` | **The single editor of the milestone's only shared edit point.** Imports `src/declared-id.mjs` (66/01) and the horizon predicate (66/00) — both real source-side import edges, so both `depends` edges are declared rather than wished away. Touches neither `src/work.mjs` nor `src/bundle/**`. Its snapshot extension rides reads that already happen (`src/work-doctor.mjs:109`, `:126-133`), so no existing group changes its source or signature | **ROUND 3/3 — the dependency direction INVERTS: `src/work-doctor-controls.mjs` is a true leaf taking item identity from the snapshot ROWS, and the spine imports IT to learn which paths to probe. ROUND 3/13 — THE DAY-ONE RED IS NOT 66/02's: with the lane landed, doctor exits non-zero on this repo with ~25 errors — `control-unresolved` ×13 (m53's thirteen declarations carry no `pending` marker) and `verification-register-missing` ×2 (neither m53 nor m66 has a `VERIFICATION.md` yet). **m53's accept owns the marking act**, the same act ADR-009/B performed on this register; 66's own is discharged by 66/03 shipping the template and 66's verify authoring it. 66/02's contract states this rather than absorbing it — a lane is not responsible for the findings it makes visible.**
| **66/03** | **`the-ask`** — ACD ships the `VERIFICATION.md` schema and asks authors for the declaration form, the red probe, `pending`, and unnumbered findings | `[]` | `src/bundle/templates/milestone/VERIFICATION.md` (new), `src/bundle/templates/milestone/ARCHITECTURE.md` (fitness table gains an `id` column + the intended-path/`pending` convention), `src/bundle/commands/verify.md`, `refine.md`, `src/bundle/agents/aof-architect.md` + the four other reviewing agents, `src/bundle/bundle.json` + `manifest.json` (regenerated), FF-6608 arch-test | **Zero source coupling** — no `src/*.mjs` imports anything under `src/bundle/`. The maximal-parallelism story; starts immediately. Its content is pinned by the frozen blocks in ADR-001 §2, ADR-005 §1 and ADR-006, so it and 66/02 build against the same paper contract without waiting on each other — the m52/00 ∥ 52/03 arrangement, for the same reason |

**Parallelism (the honest ready set).** 66/00, 66/01 and 66/03 start concurrently; **66/02 joins when 00 and 01 land** — critical path `max(66/00, 66/01) → 66/02`, two waves not four, the first real exercise of 65's ready set. `depends` goes from `02,03 ← 01` to `02 ← 00,01`; no `SPEC §Scope` deliverable is dropped.
**Accepted contracts are superseded HERE in the accepting item**, never by editing a delivered feature: `01_tag-vocabulary.feature`'s line scan becomes a **parse** after 66/00; three rows plus one scenario of 66/02's contract are ruled in ADR-011; and one clause of `66/03/tasks/00`'s frozen-header row — *"so each row is a declaration"* — is superseded by ADR-008 ruling 4, that block CITING (its verdict stands, its reason does not).

---

## Codebase-health note (measured, and routed)

**Better.** 66/00 collapses the two Gherkin parsers its leaf had *ledgered in a comment*; 66/01 does the same for the declaration grammar; 66/02 homes `severityFor` (F-09), deleting both test copies. **Worse, with the ratchet:** three leaves join `src/`'s flat root — **108** at TECH_DEBT item 10 → **112** at m52 → **115** before → **118** at 66/03's review (where `src/` is untouched: this story is bundle-only, measured); family extension under `TECH_DEBT.md` **items 0 and 10**, so **no new entry**. `test/` root **430 → 433** and `test/arch/` **295 → 296** are the same family (item 10 already cites `test/arch/`'s count). **The ratchet:** doctor's lane modules go 4 → **5** (re-measured); **the SIXTH folds the family into `src/work-doctor/`.** **Cited not re-filed:** items **50**, **48**, **24**.
**Carried forward:** registers cite **224** distinct `test/arch/…` paths, **34 unresolved (item, path) pairs** — 13 in m53, **20 in `done` milestones**, carried by ADR-001 §6 and NOT a baseline: **0 of the 20 rows carry an id in first position** (ROUND 3/5, re-measured TRUE). **Routed at 66/03's review, not filed here:** this repo's OWN installed bundle copies drift from `src/bundle/` and **nothing measures it** (identical **84/86** at HEAD → **69/87 + 1 absent** after 66/03; `acd-bundle-manifest-hashes` measures manifest↔source, a different pair), and that gate reports only its FIRST mismatch (it named one path while **11** were stale) — both to `TECH_DEBT.md`, the second as an extension of item **27**.
**Size:** the budget is **700** lines; **every closure ADR was paid for by compressing framing** — ADR-012 by rewrapping this preamble, the partition intro, the parallelism note and this one, verified through the real `budgetGroup`.
