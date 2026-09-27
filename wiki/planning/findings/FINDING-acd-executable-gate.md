# FINDING · Does AOF have an executable-gate problem?

**Investigation, 2026-08-15.** Subject: the AOF framework.

**Evidence:** milestone **352** of a downstream work stream, sampled against the 32 other items in
that stream. That project is internal and is not named here; every citation below is a **work-item
reference** (`352`, `350/R19`, `F-28`, `D-31`), which resolves only for a reader with access to it.
Product nouns, vendor names and source paths from that codebase are deliberately omitted — the
findings are about AOF, and none of them needs the subject matter to land.

> Every number below was produced by running something. Where I ran a check and its first result was
> wrong, that is recorded rather than corrected silently — this investigation is an instance of the
> thing it investigates, and a finding that hides its own red probe would be arguing against itself.

---

## Verdict

**The claim is upheld, with one correction and one sharpening.**

AOF's quality model is declarative, and `aof work validate` cannot distinguish a control that works
from a control that exists. But the root defect is narrower and more fixable than "there is no
executable layer":

1. **AOF ships no schema for the document that carries the evidence.** There is no `VERIFICATION.md`
   template in the bundle at all. `aof work doctor` checks that the file *exists and is non-empty*
   and nothing ever parses it. You cannot add a "control was observed failing" field to an evidence
   model that has no fields.
2. **AOF's own staging convention makes a fitness function unrunnable by construction** — not by
   discipline failure. This is the largest single defect found, and it is entirely AOF's.
3. **The primitives AOF is missing, it has already built twice** — `duplicate-driver-number` in
   `doctor`, `loop-graph-dangling-endpoint` in `work loops`. Both are scoped to one register. The gap
   is generalisation, not invention.

**The correction:** "no mechanism to promote a retrospective lesson into something that runs" is
true, but the more damaging fact is stronger than absence. In 352 the lesson **was** promoted — into
memory, recalled, cited by id, and declared *"Honoured"* in the architecture document — and then
violated **inside the paragraph that cited it**. Recall is not a weak version of enforcement; against
this failure class it is not a version of enforcement at all.

---

## 1 · The evidence, verified

### 1a · Three vacuous guards shipped green in one story — confirmed

All four findings are in `352/VERIFICATION.md`, and the milestone's own framing is that this "is the
milestone's governing failure shape."

| Finding | The defect | Why green was uninformative |
|---|---|---|
| **F-28** | Four `\b` word boundaries in a prohibition guard were literal `0x08` bytes | Pattern can never match. A prohibition guard's *expected* state is green, so a vacuous ban is indistinguishable from a working one by every signal except a red probe |
| **F-30** | A guard's `export[^\n]*\bsymbol\b` clause cannot cross a newline | False red on its positive control **and** a ban clause matching nothing. **Its first execution under the runner was at story 06's verify** — it had been probed with a standalone script and staged, never run |
| **F-31** | A function's two exclusions had **no test at all** | Deleting either exclusion left the whole suite green while the UI promised the opposite in its own first sentence |
| **F-32** | A required conformance render was fed hand-written literals | The predicate it exists to check was never called |

The project's own count is higher than the four: `352/STATE.md` records the architect auditing itself
at **N=5, and "FOUR OF THE FIVE WERE GREEN FOR THE WRONG REASON."**

**This is not project misuse.** The project detected all five, wrote the remedy, and applied it. What
it could not do is make the remedy run.

### 1b · The same lessons prescribed and re-prescribed — confirmed, and worse than stated

Milestone **350**'s `RETROSPECTIVE.md` carries R1–R21. Three are the direct ancestors of 352's
failures: **R19** (two guards took the same id), **R9** (contract `.feature` files are prose
artifacts and are never parsed), **R2** (a discovery-based guard with no positive control fails
plausibly).

All three were recalled. All three recurred.

- **R9 → 352:** **33 of 37** contract `.feature` files did not parse; 189 wrapped step continuation
  lines. The retro had prescribed the cure and called it "one command". *"Nobody ran it, so 352
  shipped 38× the defect density of the milestone the lesson was written about."*
- **R19 → 352:** `352/ARCHITECTURE.md` recalls m350 R19 in a memory table and marks it
  **"Honoured."** A later line in the same document corrects itself: *"the count sentence went stale
  the moment guards were added, **which is m350 R19 happening inside the paragraph that cites it**."*
  Five collisions followed, in three different registers.
- **The fourth collision is the one that settles the mechanism.** The architect *executed* the
  countermeasure — read the register's last entry, saw `D-28`, allocated `D-29` — and collided
  anyway, because `D-29` had been allocated hours earlier by the same author in a concurrent lane.
  *"A stale read looks exactly like a fresh one."* The countermeasure is not weak here; it is
  **unsound**, and no restatement can repair it.

**Does AOF have any mechanism by which a retrospective produces an artifact that runs?** Measured: no.

- `aof work memory ingest` → `reindex: 718 record(s)`. It makes `R<n>` entries **recallable**. Recall
  ends at a prompt.
- The bundle's vocabulary for falsifiability, measured by file count across `src/bundle/`:

  | term | files |
  |---|---|
  | `red probe` / `red-probe` | 0 |
  | `seen red` | 0 |
  | `vacuous` | 0 |
  | `positive control` / `negative control` | 0 |
  | `falsifi*` | 0 |
  | `must fail` | 0 |
  | `observed failing` | 0 |
  | `probe` | 0 |

  The three hits for `mutation` are `work-mutation` and "every mutation checks tenant ownership" —
  data mutation, not mutation testing.

**AOF does not ask for a red probe even as advice.** The red-probe discipline visible in 352 is the
project's own invention, arrived at independently after the failures.

### 1c · The id race — confirmed, and AOF already owns half the fix

`aof work validate` emits exactly seven classes of finding. Enumerated from every `add()` call site
in `src/work.mjs`: tag vocabulary; verification-tag count per scenario; missing/empty record doc;
digest-doc rules; frontmatter↔folder agreement; `depends` resolution; `depends` cycles. **No
duplicate-id check. No cross-file citation resolution.** It reads exactly one config key —
`config.work.tags` — and has no plugin, hook, or registered-check seam of any kind.

But the primitives exist elsewhere in AOF:

- `aof work doctor` has 22 codes, one of which is **`duplicate-driver-number`** — the duplicate-id
  check, scoped to work-item folder numbers.
- `aof work loops validate` has **`loop-graph-dangling-endpoint`** — *"Endpoint does not name a
  declared node"*. The dangling-citation check, scoped to the loops registry.

So the answer to *"what would it take to add?"* is: **generalise two checks AOF has already written.**

### 1d · Measure but do not gate — confirmed, and it is unfinished, not deliberate

The evidence milestone's auto-derived observability report computes stalls, dead air (6h06m, 24% of
span), parallelism factor, token spend and infra kills. Measured on AOF's side:
`src/work-observe.mjs` and `src/commands/observe.mjs` **write** the report; no module reads it, and
no gate consumes any figure in it.

I judge this **unfinished rather than deliberate**, on one piece of evidence: story 65 of this repo
(`concurrent-story-dispatch`, `a9f94a3`) exists *because* a human read that report and acted on the
1.00× parallelism figure. The measure→decide path works and has produced real work; it is simply
routed through a person. Nothing records that separation as a decision — there is no ADR arguing for
it — which is what distinguishes an unfinished seam from a designed one.

---

## 2 · The largest finding: a staged fitness function cannot run, by construction

This was not in the brief, and it subsumes much of what was.

352 staged 15 guards in a `fitness-functions/` folder **inside its milestone documentation tree**.
Its ARCHITECTURE.md states the reason plainly, and **the reason is sound**:

> "a test that cannot be green today lands **in that story's commit**, which is why the staged files
> sit in this folder rather than in [the arch-test tree]."

A guard written before its subject exists would be a permanent red in CI. So it is parked. Measured
consequence:

- Every test-runner include glob in that repo is package-relative `tests/**` or `src/**`. **The
  documentation tree is in no test glob.** A staged fitness function is a test file that no runner
  can see.
- Fate of 352's 15 staged guards, by byte-comparison against the executed arch-test tree:

  | outcome | count | detail |
  |---|---|---|
  | landed **byte-identical** | 5 | copied unchanged |
  | landed **diverged** | 8 | grew on contact with a runner: +124% (211→474 lines), +59% (313→499), +56% (209→327) |
  | **never landed** | 2 | staged for stories that had not been built |

**Eight of the thirteen guards that landed had to change to run.** That is the measurement of the gap
between a guard-as-prose and a guard-as-control, and it is not a discipline number — it is what
happens when the authoring step has no execution step available to it.

**This is an AOF defect.** AOF invented the fitness-function concept, told architects to author them
during refine (before the subject exists), and gave them nowhere to run. Every test runner in common
use has a construct for "this test must currently fail" — `test.fails`, `xfail`, an inverted
assertion. AOF has no concept for it, so projects invent a docs folder instead.

---

## 3 · Is 352 representative?

**Partly, and the exception is the more interesting result.**

- Fitness functions are declared across the stream: **135 unique `FF-NN` ids over 16 milestones**
  (from 3 to 22 per milestone).
- But the **staging folder appears in only two milestones**: 350 (2 files) and 352 (15). Everywhere
  else, guards were authored directly into the runnable arch-test tree — **90 executable arch tests**
  exist across that repo.

So "staged but never run" is **not** endemic. It concentrates exactly where a milestone tried to
author guards *ahead of* the code — which is the discipline AOF explicitly asks for at refine. **The
projects following AOF's advice most closely are the ones hitting the hole.** That is the signature
of a design hole rather than a discipline problem: the failure correlates with compliance.

Retrospectives exist for 17 of 33 items, so the lesson-capture half of the loop is genuinely in use.
It is the lesson-*discharge* half that has no mechanism.

---

## 4 · Where an executable gate would attach

`aof work validate` is a closed function — one config key, no seam. But AOF **already ships an
executable seam**: `src/bundle/hooks/` (`artifact-sync-enqueue.mjs` plus session-lifecycle JSON),
merged into the project's `.claude/settings.json` by `src/claude-settings.mjs`. Every hook it ships
today is lifecycle or artifact sync. **None is a gate.**

Three attachment points, cheapest first:

1. **`doctor` gains checks** (no new surface). It already carries `duplicate-driver-number` and the
   whole warn/fail vocabulary. This is where a duplicate-id and dangling-citation check belong.
2. **`validate` gains a project-declared check list** — `work.checks: [...]` in `.aof/aof.config.json`,
   each naming a module the project owns, run at the same gate. This is the smallest change that lets
   a project register a check without AOF knowing what it checks.
3. **A named gate in the bundle hooks** — the seam exists; only a gate-shaped hook is missing.

---

## 5 · The right primitive for "seen red"

I built and ran the two candidate detectors rather than reasoning about them.

### 5a · The C0 control-character scan (catches F-28's whole class)

Red-probed both directions. Reconstructed F-28's mechanism faithfully — a tool-call parameter is a
JSON string, `\b` is one of JSON's eight legal escapes, so a single-backslash `\b` decodes silently
to `U+0008`:

```
bytes: 63 6f 6e 73 74 20 62 61 6e 6e 65 64 20 3d 20 5b 2f 08 6d 6f 76 65 64 08 2f
                                                          ▲                 ▲
                                              U+0008, rendering as \b everywhere
```

Detector **fires** on the planted defect, **silent** on the correctly-escaped control. Then measured
against real corpora:

| corpus | files | flagged | verdict |
|---|---|---|---|
| the evidence project's source tree | 7,878 | 2 | both in generated report bundles — **0 false positives in hand-written source** |
| **aof itself** (`src/` + `test/` + `wiki/`) | 2,334 | **6** | **all 6 legitimate** |

Those six matter more than the zero. In AOF's own repo, every hit is a *deliberate* control
character: `\x00`/`\x01` used as join separators in three record-key builders, an ANSI-escape replay
fixture (`^[[2J`), and a "non-JSON garbage bytes" resilience fixture.

**So a bare "no C0 anywhere" rule would be exempted into uselessness in AOF's own tree within a
week** — the precise failure 352 names elsewhere (*"a guard that goes red on formatting is a guard
people learn to silence"*). The correct rule is narrower: **C0 inside a regex or pattern literal**, or
a **shrink-only ratchet** against a recorded baseline — the shape AOF already uses in
`acd-no-new-silent-catch`.

One more measured detail, and it is the finding in miniature: the command 352's STATE prescribes,
`grep -P '[\x00-\x08...]'`, **fails on this operator's own control node** —
`grep: -P supports only unibyte and UTF-8 locales`. A prescribed one-command fix that does not run on
the machine it was prescribed on is advice-not-wired at the smallest possible scale.

### 5b · The duplicate-id / dangling-citation check (proposed 4×, never built)

I built it as 352 worded it — *"assert the debt register has no duplicate `### D-NN` heading, and
that every `D-NN` cited under a milestone folder resolves to one."*

**First run: 3 hits, 1 real. Precision 33%.**

- `D-31` — **true positive.** Cited five times including *"ledgered as D-31"*, declared nowhere. This
  is the exact defect 352 flagged by hand.
- `D-17` — false positive. The second "declaration" is a STATE heading *about* it: `### D-17 is now
  LIVE, and sharper than the ledger said`.
- `D-37` — false positive. The "citation" is `**Next free id is D-37.**` — a reservation.

Adding two conventions — **declarations live only in the register file**, and **"next free id" is a
reservation, not a citation** — makes it exact:

```
# declarations=35  duplicates=0  dangling=1
DANGLING  D-31  first cited 352/ARCHITECTURE.md
```

**35 declarations, zero false positives, and it reproduces the milestone's hand-found defect. 346ms
over the whole 33-item stream.**

But it works for **one** of the three registers that collided, because the three declare entries
differently:

| register | declaration form | machine-recognisable |
|---|---|---|
| `D-NN` (debt register) | `### D-1 · <title>` heading | **yes** |
| `F-NN` (VERIFICATION) | `- **F-28 · ⛔ BLOCKER …**` bullet | no |
| `FF-NN` (ARCHITECTURE) | `\| **FF-1** \| <invariant> \|` table row | no |

**The missing primitive is not the check — it is the declaration convention.** And that is AOF's to
own, because AOF owns the document conventions and currently ships no `VERIFICATION.md` template at
all.

---

## 6 · Should AOF own the concurrency hazard it creates?

**Yes, and this repo has just increased the debt.** Story 65 (`a9f94a3`) makes concurrent story
dispatch a first-class CLI answer — `aof work next` returns a ready set, `aof work dispatch` isolates
each lane in its own worktree. It correctly owns the *file* hazard (a partition's independence claim
is unreliable, so worktrees are mandatory). It owns none of the *register* hazard.

352's fourth collision proves a read-based convention cannot be made safe under fan-out. Of the three
candidate fixes:

- **Orchestrator-assigned ranges** — works, but needs an allocator and fails on a crashed lane.
- **Unnumbered findings, numbered on landing** — needs no mechanism, only a rule, and 352 observed a
  reviewer arriving at it independently (*"report findings and let the owner file them — already the
  correct posture, and what kept the file consistent"*). **Recommended.**
- **Content-addressed ids** — immune by construction, but unreadable, and every existing register
  would have to be migrated.

The rule costs nothing and the check catches the residue. Both are needed: the rule prevents the
collision, the check proves the rule held.

---

## 7 · Scope boundary — what AOF owns

| # | Defect | Owner | Smallest mechanism that would have caught it |
|---|---|---|---|
| 1 | `\b` → `U+0008` decode | **Tool layer, not AOF.** JSON's escape table; AOF cannot fix it | AOF **can** detect it: a C0-in-pattern-literal ratchet. Cheap, red-probed, 0 false positives on hand-written source — but must be narrow, or AOF's own 6 legitimate uses will get it silenced |
| 2 | Staged fitness function never executed | **AOF.** It asks for guards authored ahead of their subject and provides no way to run one | Require that a declared control resolves to a path a runner can see, and carries a recorded red observation |
| 3 | Lesson prescribed, never wired | **AOF.** `memory ingest` is the only retro→future path and it terminates in a prompt | A retrospective lesson that names a **check module** graduates it into `work.checks`; `doctor` then reports any `R<n>` that prescribes a check with no artifact |
| 4 | Id collision under fan-out | **AOF.** It recommends the fan-out | (a) contract: reviewers report unnumbered, the single writer allocates; (b) generalise `duplicate-driver-number` to any declared register |
| 5 | Dangling `D-31` citation | **AOF.** It owns the document conventions | Generalise `loop-graph-dangling-endpoint` beyond the loops registry — **measured exact once declarations are conventionalised** |
| 6 | 33/37 `.feature` files unparseable | **AOF.** It defines the contract artifact and never parses it | Parse every authored `.feature` at `validate`. AOF already walks them for tags — `checkFeatureTags` is a line scanner — so this is a strictness increase on an existing read, not a new one |
| 7 | `VERIFICATION.md` unschematised | **AOF.** The root of the evidence question | Ship a template with a required evidence shape (below) |
| 8 | Observability gates nothing | **AOF**, but low priority | Leave it. It is working through a human and produced story 65 |

---

## 8 · Recommendation: does the evidence model need "control was observed failing"?

**Yes — but as a required field on a schema that does not yet exist, not as a new subsystem.**

Argue it against the alternatives:

- **Mutation testing** is the strongest instrument and the wrong one here. It would have caught F-31
  and F-32 (delete an exclusion, suite stays green). It would **not** have caught F-28 or F-30: a
  vacuous regex is not a mutation of the code under test, it is a defect in the assertion itself, and
  mutation testing assumes the assertions are sound. It is also the most expensive option by an order
  of magnitude, and AOF cannot run a project's mutation tool.
- **A vacuity/control-character linter** is cheapest and catches the narrowest slice — F-28's class
  only. Necessary, not sufficient. Ship it as a ratchet.
- **A required red-probe field** catches all four of 352's guard defects, because all four share one
  property: *nobody had ever seen the assertion fail.* It costs one line per assertion and needs no
  new tooling — the project already did this by hand and it worked every time it was applied.

**So: require it, and make the requirement structural rather than exhortatory.**

The `VERIFICATION.md` template AOF does not currently ship should require, for each new assertion, a
recorded **failing observation** — what was changed to make it fail, and the failure message
observed. 352 produced exactly this shape unprompted, and it reads well:

> Probed red both ways: `expected 4 to be 3`, `expected 5 to be 3`.

`doctor` can then check the *shape* (an evidence entry claiming a new assertion carries a red-probe
line) without understanding the content — which is the same trick `duplicate-driver-number` already
plays.

**What this cannot catch, stated plainly:** a fabricated red probe. Nothing in a declarative model
can. The mitigation is not more schema — it is that a fabricated failure message is a specific,
checkable lie in a document a reviewer reads, whereas today's absence is invisible. That is a real
reduction in the attack surface, not a closure of it.

### The unifying idea

AOF does not need an executable layer. It needs to treat a **control** as a resolvable citation with
three properties — **declared once**, **located where a runner can see it**, **carrying a recorded
red observation**. All three are checkable declaratively, at gates AOF already has, without AOF ever
executing a project's tests.

### Build order

1. **Structurally lint every authored `.feature` at `validate`.** *Measured: would have caught 33 of
   37 files in one milestone.*
2. **Declaration convention for registers** + generalise `duplicate-driver-number` and
   `loop-graph-dangling-endpoint` to any register. *Measured: 346ms, exact, catches D-31.*
3. **`VERIFICATION.md` template with a required red-probe field**, shape-checked by `doctor`.
4. **A declared fitness function must resolve to a runnable path.** *Measured: 8 of 13 staged guards
   changed on contact with a runner.*
5. **C0-in-pattern ratchet.** *Measured: red-probed; must stay narrow or it will be silenced.*

Items 1 and 2 are gates AOF can add without a project changing anything. Items 3 and 4 change what
AOF asks projects to produce. Item 5 is cheap and must stay narrow.

---

## Appendix · What I ran

| Measurement | Method | Result |
|---|---|---|
| `validate`'s finding vocabulary | enumerated every `add()` in `src/work.mjs` | 7 classes; no id or citation check |
| `doctor`'s vocabulary | enumerated every `code:` in `src/work-doctor*.mjs` | 22 codes; `duplicate-driver-number` present |
| Falsifiability vocabulary in the bundle | file-count per term over `src/bundle/` | 0 for all 8 terms |
| `VERIFICATION.md` template | listed `src/bundle/templates/*` | does not exist |
| Staged-vs-landed guards | byte-diff, 352's 15 staged files | 5 identical / 8 diverged / 2 never landed |
| Staging folder reachability | read every test-runner include glob | documentation tree in none |
| Stream-wide FF census | unique `FF-NN` per ARCHITECTURE.md | 135 across 16 milestones; staging folder in 2 |
| C0 detector | red probe + 2 corpora | fires on planted defect; 2/7,878 (both generated), 6/2,334 (aof, all legitimate) |
| Register check | built as 352 specified, then refined | 33% precision as worded; 100% with 2 conventions added; catches D-31 in 346ms |
| Observability consumers | grep for readers of the report | none |
