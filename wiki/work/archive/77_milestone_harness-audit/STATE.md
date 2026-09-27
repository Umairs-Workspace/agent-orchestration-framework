---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). This is the running NARRATIVE.
-->
# 77 · Harness audit — State

## Progress

**Refined 2026-09-03** — Decide + Break-down complete; `RESEARCH.md`, `ARCHITECTURE.md` (10 ADRs, 8
fitness functions) and `VERIFICATION.md` scaffolded. **Six stories**, landing
**{00 ‖ 01 ‖ 02 ‖ 03 ‖ 04} → {05}**.

**Contract stage complete 2026-09-03** — all six contracts authored in one autonomous cascade: **16
task `.feature` files**, every scenario `@executable`. Next is the build (`aof:continue 77`).

**Build complete 2026-09-03** — all six stories built and reviewed to `in-review`; every Blocker
raised inside a story's own review round fixed in that round.

**CLOSED 2026-09-03 — accepted, after the gate refused it once.** Six stories `done`, milestone
`done`. The gate ran 279 scoped cases (green), the whole fitness tier once (1644/5, none of the five
77's), `aof work audit --strict` over this repository (exit 0, 337 findings, all `warn`), and ten red
probes across the eight declared controls. It **refused the milestone on its first pass**: two
controls owned by milestones 42 and 66 that 77's change set had turned red, neither visible from any
story's own scope. Both repaired at the gate. Full record in `VERIFICATION.md`; lessons in
`RETROSPECTIVE.md` (`R1`–`R9`); delivered state in `OUTCOME.md`.

## Notes & decisions in flight

- **Scheduled 2026-08-16**, from the research arc's own method rather than its findings: the operator
  asked whether the analysis could be made repeatable. Most of it can, deterministically, and the
  part that cannot is deliberately deferred (see the SPEC's out-of-scope).
- **The boundary against `aof work doctor` is the design decision.** Doctor audits the record; this
  audits the machine. Keeping them separate commands rather than adding 8 codes to doctor's 34 is a
  judgement — refine should test it. The argument for separate: doctor runs per work item and gates
  `aof:validate`; audit runs per **repo** and has no item scope for most of its rules. The argument
  against: two lints is two places to look. Whichever way it goes, the finding shape stays shared.
  **SETTLED at refine, and not by us: milestone 59 already made this call and shipped it.**
  `aof work audit` exists as a sibling command on doctor's finding shape, with three lanes and 26
  codes, and `59/FF-5905` refuses a shared code between the two. 77 adds lanes to it.
- **`loop-ceiling-uncapped` already exists** and is the proof of the thesis: the rule was written,
  wired to `aof work loops validate`, set to `warn`, and gates nothing — so the framework has been
  telling itself the build loop is uncapped for as long as the registry has existed, into a channel
  nobody reads. Bringing it under a command with `--strict` is most of the value.
  **AMENDED 2026-09-03:** milestone 69 shipped `FF-6902`, which hard-gates *this repo's* registry, so
  the thesis is closed locally. What remains is a governed project's own registry, and it is not a
  rule of its own — it is one row of 77/03's bounds join (`ARCHITECTURE.md#ADR-008`). The SPEC's line
  citation (`src/work-loops.mjs:299`) is also stale; the emitter is at `:696`.
- **Open question for refine: how a rule cites its seam.** …*Prefer a small explicit map over
  cleverness, and let the rule under-report rather than cry wolf.* **SETTLED — `ADR-003`, and the
  advice was right.** The naive token match was built and measured first: **17 findings, none of them
  the true one.** The shipped detector reads code spans only, through a closed one-row program map
  requiring `program + space + arg`, a *run* verb, and exactly one bolded role word per clause —
  measuring 33 docs → 165 spans → 5 attributed → **1 finding, 0 false positives**.
- **Open question for refine: where the baselines corpus lives.** `wiki/reference/` is proposed…
  **SETTLED, and against the SPEC — `ADR-007`.** The corpus ships as `src/harness-reference.mjs`.
  `scripts/install-local.mjs:243` copies `src/` recursively and the live payload carries no `wiki/`
  and no `scripts/`, so a corpus under `wiki/` cannot be read in any governed project — it would make
  the bounds rule the one rule in 77 that cannot travel. `wiki/reference/harness-baselines.md` still
  ships, as a **generated view with a stamp**, written only by the refresh program and read by
  nothing. Also settled: the word `baseline` is NOT extended — `UNREGISTERED_BASELINE` keeps it, and
  77's codes are `audit-bound-*` / `audit-reference-stale`.
- **Do not let `--refresh-baselines` onto the audit path.** …**HONOURED, and made structural rather
  than promised** (`ADR-007 §3`): it is not a flag at all but a separate hand-run program,
  `scripts/refresh-harness-reference.mjs`, that no registered command names and the audit family's
  import closure cannot reach. FF-7705 asserts it.

### Decisions taken at refine (2026-09-03)

- **Three rules dropped on evidence** — `spawn-uncapped`, `cache-prefix-unstable`,
  `prompt-config-unsatisfiable`. The first two would re-derive `69/FF-6905` and `70/FF-7004`; the
  third's flagship subject was closed by milestone 71 and a bounded re-sweep of every `work.*` key a
  prompt references found no replacement. `ARCHITECTURE.md#ADR-009` records each with the gate or item
  that discharges it. **Operator decision, taken at the refine gate.**
- **The `hook-duplicated` merge repair was moved OUT of 77, reversing an operator decision taken
  earlier the same session, on a fact that surfaced after it.** The call was initially to fix the
  merge here. Then two things landed: `72/ADR-005 §3` already refused the change on the ground that a
  collapse rule would delete this repo's own unmarked `guard-test-isolation` hook, and 72/03 deleted
  the three duplicate pairs by hand mid-session — so the repair's evidence base is **n = 0 observed
  instances** in the only repo anyone has measured. 77/01 detects; `TECH_DEBT.md` item 90 carries the
  repair, its admissible shape (non-destructive suppression), and the trigger that re-opens it.
- **77 fixes `TECH_DEBT` item 72 (in 77/04), and item 72's own prescribed fix is half wrong.**
  Deriving the toolkit root from `import.meta.url` still cannot find `scripts/drive-control.mjs`,
  because `scripts/` is not in the payload — so the driver moves to `src/work-audit-drive.mjs`,
  beside its precedent `src/work-audit-probe.mjs`, which also closes item 70's enumeration hole.
- **`RESEARCH.md` was already stale on its most load-bearing measurement when it landed** — three
  duplicate hook pairs → zero — because a sibling milestone landed the fix between the research pass
  and the architecture pass. Carried to `aof:feedback`: research over an *in-flight* sibling's subject
  needs a re-measure at the decision point, not a citation.
- **`aof:validate` reports five issues on 77/05 today, and they are CORRECT.** Its `reads:` names the five stage-1 modules that do not exist yet, and validate checks read paths against disk (`src/commands/validate.mjs:87`). The declaration is not trimmed — a read contract that omits what the story genuinely reads is the contract gap, not the fix — and the check clears as stage 1 lands. `72/02` carried the identical shape through its own refine.
- **Scheduling note that is not a dependency.** 77/02 appends to
  `test/arch/acd-codebase-grounding-{no-parse,via-commands}.test.mjs`, which milestone 72's in-flight
  build currently has modified in the working tree. No `depends:` edge is declared — the stories are
  independent — but 77/02 should land after 72's changes to those two files are committed.

### Decisions taken at the CONTRACT stage (2026-09-03) — documented defaults, `--autonomous`

Sixteen task `.feature` files were authored, six QA passes and two developer feasibility passes. The
feasibility pass declared **two contracts unbuildable as written** (77/02, 77/03) and 77/05
conditionally buildable; every blocker below was closed IN the authoring beat, by the product owner,
inline. No contract was re-opened by a second authoring agent.

- **The seam lane INVERTS the graph itself; `computeImpact` answers only "is this file present?"**
  `ADR-006 §1a` already decided one inverted pass, but FF-7704 words the constraint as *"reaches the
  artifact only through the shipped `normalizeGraph`/`computeImpact`, asserted by import"* — and
  `computeImpact` is O(paths × (nodes+edges)) **by construction**, so a single call with 150 paths
  performs 150 full edge walks. Both hold if `normalizeGraph` supplies the walk and `computeImpact`
  answers coverage. The contract's cost claim was also restated as **counted edge walks, not elapsed
  time**: a wall-clock ratio over a synthetic graph is ~1–3× and would settle green by accident.
- **`audit-ran-on-nothing` is declared LANE-NEUTRAL, and FF-7707's pairwise leg is RED ON ARRIVAL
  without that.** Measured: the code sits in BOTH `AUDIT_FINDING_CODES` (`src/work-audit/census.mjs:77`)
  and `AUDIT_LANE_FINDING_CODES` (`src/work-loops-checks.mjs:920`), and every lane raises it
  structurally through `readFinding` / `unreportedFloorFindings`. Repairing it at source needs
  `census.mjs` (77/04's sole-writer file) and `src/work-loops-checks.mjs` (in nobody's `files:`), so
  the carve-out is declared in `report.mjs`, inside 77/05's own write set, and 77/05's contract states
  it and drives it.
- **The refresh CONFIRMS a value; it never scrapes one.** A row is frozen at six fields, so it
  declares no extraction rule and *"each row's value is the value its source states"* was
  undecidable against any real page. The program fetches, reports every row it could not reach, and
  records a new value only where one is supplied.
- **The bounds lane STATES an unresolvable `config:` pointer as a limit, and `src/loop-bounds.mjs`
  stays OUT of 77/03's write set.** Measured against `.aof/loops/`: seven loops, of which
  `autonomous-cascade` and `run-resilience` point at `config:work.autonomous.maxAttempts` — a key
  `LOOP_BOUND_CONFIG_RESOLVERS` does not hold. It is resolved by a **second, private, non-exported**
  set at `src/work-loops.mjs:317`, inside the god-node the lane may not import. Widening the resolver
  would take 77/03 into the key `TECH_DEBT` item 76 already indicts as read as two unrelated bounds,
  so the lane says it cannot see those two rather than reporting them undeclared.
- **`work.agents.productOwner` has ZERO readers in `src/` today, so the face is the FIRST reader.**
  `ADR-008 §5`'s *"read today by `src/work-delegation.mjs`"* is inaccurate — that module reads
  `delegation` / `delegationModel` only (`:59-70`). The severity ladder's routing input is a new face
  resolver over `work.agents.mode` + `work.agents.productOwner`, and the six roles in ADR-003's map
  with no config key of their own are a **stated limit**, never a silent `inline`.
- **`assertLaneLimits` ADMITS a lane returning no limits today** (`limits === undefined → []`,
  `report.mjs:445`), and never sees a sweep's `basis`. So *"every `text` sweep owes a limit"* is a
  **new obligation 77/05 adds**, not an existing one re-driven; the extension-seam text above reads
  as though it were already enforced.
- **Sweep floors are INJECTABLE, defaulting to the exported constant.** Otherwise every small-corpus
  scenario in 77/00 and 77/02 also raises `audit-ran-on-nothing` at `error`, and the contract would
  be asserting two things at once.
- **The prompt-layer lane WALKS the installed corpus.** FF-7702 requires discovery through
  `RUNTIMES` / `RESOURCE_KINDS`, which has a subject only if the lane walks; what is injected is the
  subject root, the resolved role routing, the instant and the floors.

### Raised at the Contract stage and NOT closed — for triage

- **`ADR-002`'s consequence claim is HALF TRUE, and the other half is not in 77.**
  `aof work audit --strict` still cannot succeed in a governed project after the toolkit-root fix,
  because `CENSUS_SWEEPS`'s floors are **absolute** — 300 / 100 / 500
  (`src/work-audit/census.mjs:115-137`). Any workspace that is not this repo emits three
  `audit-ran-on-nothing` at `error`, and `src/commands/audit.mjs:280-286` exits 1 on any error,
  whatever the evidence lane found. Subject-relative or injectable census floors are far outside
  `ADR-010 §6`'s declared blast radius (*"`census.mjs` changes by one program-resolution line"*), so
  77/04's contract was narrowed to what 77/04 delivers and the remainder is carried here. **The same
  shape threatens 77/00, 77/01 and 77/02** in any project that has not installed the thing being
  audited — which is the population `ADR-006 §4` argues at length must not be punished, in the
  milestone whose whole thesis is that the rules travel.
- **The reference staleness window is declared NOWHERE.** `ARCHITECTURE.md` says *"a row whose
  `checked:` exceeds the declared window"* with no number and no home. The contract drives the
  boundary relative to "the declared staleness window" and names no figure. An adjacent one already
  exists and is already handed to every lane — `work.audit.anchorStaleDays`, default 90,
  `src/commands/audit.mjs:48-63`, arriving as `anchorWindowMs` — and reusing it is the obvious
  default, but no ADR says so and this refine did not decide it.
- **`RESEARCH.md` carries NO vendor defaults at all.** Its Q3 is titled "the baselines corpus" and
  answers only *where the corpus may live*. There is no defaults table, no source URL, no `checked:`
  date and no third-party system named anywhere in the file — so the SPEC's *"everyone else caps at
  250 steps and $3"* is an aspiration for what the corpus would enable, never a measurement. **77/03's
  build owes the rows themselves**, and the only vendor-side facts the research measured are
  *absences* of caps rather than caps. The declared side of the join is real and in code
  (`src/loop-bounds.mjs:5-22`).
- **An absent `matcher` key versus `matcher: ""` is undecided**, and both shapes are live —
  `spliceSettings` writes no key when the matcher is `undefined`, while `src/bundle/hooks/claude-session-start.json`
  and `.claude/settings.json` both carry `""`. `ADR-005 §2` says "the same matcher" and stops. A
  builder will otherwise decide it silently inside a comparison expression.
- **A shell-string `command` versus `command` + `args` is undecided on the same predicate.**
  `72/FF-7206` calls the two spellings equivalent; `ADR-005 §2` defines equivalence over
  `command` + `args` and does not repeat that normalisation. This is exactly the axis that decides
  whether this repo's own `guard-test-isolation` guard could ever pair with a managed `node` entry,
  so it is not academic.
- **`ADR-002`'s line citations are stale at HEAD**: `census.mjs:413` is now `:395`, `evidence.mjs:431`
  is now `:523`, and `ADR-002 §2`'s three evidence sites `:57`, `:141`, `:143` are now roughly `:63`,
  `:137`, `:143`. The prose is correct; only the coordinates moved.

## Feedback — ARCHIVED at close (2026-09-03)

**This section is closed. Its lessons have graduated and it is retained as the as-built record, not
as an inbox.** Where each strand went:

- **The process lessons → `RETROSPECTIVE.md` `R1`–`R9`** — stale research over an in-flight sibling
  (R1), a grant keyed across three renderings of one document (R2), the two `reads:` species (R3,
  R4), a relocation changing which censuses a file is in (R5), a tier run through the tool it tests
  (R6), a false-positive count read as a property (R7), a fixture validated against a belief rather
  than the loader (R8), and an empty telemetry input that is not a cheap milestone (R9).
- **The routed defects → `VERIFICATION.md` `## Findings`** — `D-01` (the `tools:`-only grant source),
  `D-05` (the incomplete `reads:` sets), `D-06` (262 duplicated pairs → TECH_DEBT 79), `D-07` (the
  corpus was authored, never re-fetched → chore 98), `D-08` (`UNREGISTERED_BASELINE` reddening a
  governed project → chore 99), `D-09` and `D-10` (both closed).
- **The two blockers the GATE raised, which this section never saw** → `VERIFICATION.md` `B-01` and
  `B-02`, both fixed at the gate. Neither was visible from any story's own scope, which is why they
  are absent from the per-story notes below and present in the retro as `R5` and `R7`.
- **The as-built design notes below are RETAINED** — the hook-equivalence axes, the `ADR-006 §1`
  vs `§1a` resolution, the `AUDITABLE_CODES`/`REPORT_LANES` ordering, `assertLaneLimits`'s new
  refusal and `resolveRoleRouting`'s first-reader status. They amend the ADRs they name and have no
  other home; a reader of those ADRs needs them.

---

Recorded by the build+review pass over the span **77/00-02** (2026-09-03, solo). Nothing here is a
Blocker — every Blocker raised in review was fixed in its own round. These are the routed
non-Blocker findings and the two contract gaps this section's own "Notes & decisions in flight"
predicted a builder would otherwise decide silently.

**The two undecided axes ADR-005 §2 left open were decided in the build, and the decisions want
ratifying at accept.** Both were named above as things "a builder will otherwise decide silently
inside a comparison expression", so they are recorded rather than buried:

- **An absent `matcher` key is read as `""`.** `hookEntries` normalises a group whose `matcher` is
  not a string to the empty matcher, so a `spliceSettings`-written group with no key and a bundle
  declaration carrying `""` pair with each other. The alternative — treating them as different
  matchers — would have made this repository's own five managed session entries unpairable with any
  copy of themselves, which is the opposite of what the rule is for.
- **A shell-string `command` and a `command` + `args` pair resolve to ONE token vector.** The command
  string is tokenised honouring quotes, the args are appended, and every token is put through the
  merge's portable-path rule. This is `72/FF-7206`'s reading, taken deliberately because the axis
  decides whether this repo's `guard-test-isolation` guard could ever pair with a managed `node`
  entry — and under this reading it still cannot, because it pairs with no managed entry at all.

**A real defect found at build, not by a test: the capability rule's grant map was keyed by agent id
ACROSS runtimes.** Measured on this repository's own installed layer, the three renderings of one
agent are not the same document — `.claude`'s carries `tools: … Bash …`, Codex's carries no `tools:`
key, and OpenCode's expresses its grant as a `permission:` block. Keyed by id alone, whichever
rendering sorted last decided the grant for all three, so a `.claude` instruction was being answered
by an OpenCode file. That is precisely the mirrored list `ADR-003 §5` forbids, one indirection along,
and it produced three false findings against the architect before the grant was scoped per runtime.
The lesson is the general one: **a rule that resolves a fact "from the document's own frontmatter"
must say WHICH document, when the corpus holds three renderings of it.**

**Routed to the operator as a story shape (no item created).** The capability rule reads a grant from
a `tools:` frontmatter key and from nowhere else, which is right for the Claude rendering and
under-serves the other two: Codex agents declare no `tools:` key at all and OpenCode declares a
`permission:` block, so every such document ordering a run is reported. Measured here: 1 capability
finding under `.claude` — the live `refine.md` → product-owner instance ADR-003 predicted, with zero
false positives — and 4 each under `.codex` and `.opencode`. The locked contract's own row ("no
`tools:` key in the frontmatter at all → one finding") makes the current behaviour correct, so this
is not a defect to fix inside 77. A per-runtime grant source needs new acceptance criteria, which is
where the loop stops and the operator starts.

**Recorded findings.**

- **The equivalence predicate now has two spellings**, and `ADR-005 §5` already ratifies why:
  `test/arch/acd-managed-hook-not-duplicated.test.mjs` holds 72's repo-local ratchet (which imports
  nothing from the merge, deliberately) and `src/work-audit/hook-wiring.mjs` holds 77's travelling
  rule (which may not import the merge either). Same species, different subjects. Noted so the next
  reader finds the reason rather than the duplication.
- **This repository's installed prompt layer carries 262 duplicated file pairs** at the shipped
  120-byte floor, almost entirely because three runtimes hold near-identical copies of ~35 documents.
  The rule reports at `warn` and never reddens `--strict`, exactly as `ADR-004`'s consequences
  anticipate. TECH_DEBT item 79 already indicts the shape; this is the number it was missing.
- **The seam lane reports 6 unwired seams and 4 unresolved candidates on this repository**, which
  matches `ADR-006 §3`'s measurement exactly — `src/sync.mjs` plus the five test-only-dependent
  modules, with `scaffold.mjs`, `clean.mjs` and `work-audit-probe.mjs` all derived away rather than
  ledgered. The 4 unresolved are 77's own new modules and `src/commands/test.mjs`, which postdate the
  `2026-09-03T02:46` graph artifact; `ADR-006`'s consequences predicted this and it resolves at
  77/05. It is reported as an UNKNOWN, never as a clean seam, which is the rule working.

**A note on `ADR-006 §1` versus `§1a`, resolved in favour of §1a.** §1 says the lane reads through
the shipped `normalizeGraph` and `computeImpact`; §1a says the dependents index is built once per run
rather than per file. Those cannot both be taken literally: `computeImpact` re-walks every edge once
per path inside its own map, so handing it the whole candidate list still costs ~150 passes. The lane
therefore imports the shipped reader (`graphJsonPath`, `readGraph`, `normalizeGraph`) and inverts the
index in one pass, which is what §1a itself calls "a different composition of the same shipped
readers, not a second reader". FF-7704 asserts the absence of `computeImpact` deliberately and says
why, so the departure is visible rather than accidental.


### 77/03 — the reference corpus and the declared bounds (2026-09-03, solo)

Routed at the close of the review pass. No Blocker survived; each item below is a recorded finding
or, where noted, a chore that now schedules the work.

- **The shipped rows were authored from published defaults and have NOT been re-fetched — their
  `checked: 2026-09-03` records the day they were WRITTEN, not a day the source was opened.** The
  audit path may not reach the network by construction (FF-7705), and the refresh is the program
  that confirms, so the honest closing move is to run it by hand once. Promoted to a chore rather
  than left as prose, because "somebody should run the refresh" is exactly the sentence that is true
  for a year. The values themselves are the published defaults for LangChain's `max_iterations`,
  the OpenAI Agents SDK's `max_turns`, GitHub Actions' `timeout-minutes`, Kubernetes' `backoffLimit`,
  Temporal's Workflow Task Timeout and Step Functions' Standard execution limit.
- **The declared `reads:` set is incomplete, and five files outside it were genuinely required.**
  `src/work-audit/seam-liveness.mjs` and its two suites (the immediate family precedent for a pure
  lane's shape, its sweep registry and its limit), `src/work-audit/report.mjs` (where a lane's read
  record becomes `audit-ran-on-nothing`, which decides the floor question), `src/work-loops-checks.mjs`
  (the existing lanes' floors, which is what makes an empty loop sweep consistent with the family
  rather than novel) and `test/support/loop-registry-fixture.mjs` (the one home for a parsed model
  over records on disk). Reported so refine repairs the set rather than the next builder rediscovering
  it.
- **A `ceiling:` POINTER is authored as a LIST, and a bare one is `loop-bad-value`.** Measured against
  the loader: `ceiling: config:work.loop.reviewRounds` never becomes a pointer entry at all, so a
  fixture written that way drives the lane's absent-ceiling path while appearing to drive its pointer
  path. Both first drafts of the pointer rows in `work-audit-declared-bounds.test.mjs` were wrong this
  way and passed for the wrong reason on two of five rows. `ceiling: [config:]` is refused outright,
  which is why the empty-key row is the one model in that suite that is hand-shaped, with the reason
  written beside it.
- **The reference side of the join anchors its findings at `src/harness-reference.mjs`, a payload
  path.** `report.address()` resolves a finding's `path` against the AUDITED project's root, so in a
  governed project that anchor names a file that is not there. The message says outright that the
  corpus ships with the installed payload and that the staleness is the payload's fact, and the
  behavioural suite asserts the audited project is never named as the cause — but the rendered
  anchor is 77/05's to confirm when it registers the lane and owns the face.
- **This repository declares five of the corpus's six bounds nowhere**, so once 77/05 registers the
  lane it will report five `audit-bound-undeclared` findings at `warn` here. That is the rule
  working rather than noise to suppress: `ADR-008 §4`'s ladder puts the reference leg at `warn`
  precisely because only the reference noticed, and every ERROR leg of this story's three codes is
  at zero in this repository on arrival. The one bound that does map — Kubernetes' `backoffLimit`
  against `work.loop.progressMaxResets` — is mapped only because the units already agree, and
  `boundConfigKeyProblems` refuses a mapping onto a knob the bounds home does not declare.


### 77/04 — the two roots (2026-09-03, solo)

Routed at the close of the review pass. No Blocker survived.

- **The audit was run END TO END over a governed workspace that is not an aof checkout, and it
  worked.** `runEvidence` over a temp fixture repository holding no driver at all confirmed its
  register row from a real execution, contradicted a red control, and named that workspace's own
  missing control — with the driver resolved from the toolkit root. `assembledSuite` pointed the
  probe (toolkit) at that workspace's own runner (subject) and decided registration for the three
  cases it assembles. Locally, `aof work audit 77` re-ran all 8 register rows through the moved
  driver: one `evidence-unrunnable`, and it names `test/arch/acd-audit-lane-registry-complete.test.mjs`,
  which is FF-7708's control and 77/05's to deliver.
- **A second instance of TECH_DEBT 72's own species was found by this story's control, and it is
  chore 99.** `UNREGISTERED_BASELINE` (`census.mjs:96`) is aof's hardcoded list of AOF's suites and
  its on-disk check runs against the AUDITED workspace, so a governed project gets
  `audit-baseline-stale` at **error** for suites it was never going to have — measured, 2 of 6 error
  findings over a fixture workspace. It is NOT fixed here: `ADR-002 §4` enumerates what 77 does not
  do and this is outside it, and a behaviour change with no contract is not a thing to smuggle into
  a bug fix. `acd-audit-travels-two-roots` PINS the exception (`ledgered.length > 0`), so the day the
  chore lands this control fails and is updated rather than quietly tolerating what it was written
  to name.
- **The driver's sentinel stopped being exported, and that is 77/04's own consequence.** Moving the
  program under `src/` put it inside 77/02's seam-liveness population, whose one derived suppression
  is "a file exporting NOTHING is a program, not a seam". A program exporting a single constant that
  nothing can import — the family may not (FF-5904) and a test that did would execute the program —
  is exactly the shape that rule would report and be wrong about. So the `export` is gone and
  FF-5906's driver-side regex reads `(?:export )?const`. The byte-identity claim it makes across the
  seam is unweakened: the claim is the BYTES, and both literals are still read from source.
- **The story's `reads:` named `scripts/drive-control.mjs`, the file the story itself moves**, and
  `aof work validate 77/04` refused on it — correctly, and it is the gate ladder earning its place
  before any reviewer was spawned. Repaired to `src/work-audit-drive.mjs`. Worth a refine-time note:
  a `reads:` entry naming a path the story RELOCATES is unsatisfiable the moment the story succeeds.
- **`wiki/work/TECH_DEBT.md` was written by this story and is not in its declared `files:` set.**
  Items 70 and 72 are both closed there, with the closure notes the story's own `Notes` promised.
  No sibling declares that file either, so nothing was contended; reported so the write set can be
  repaired rather than the next builder discovering the convention by breaking it.


### 77/05 — the lanes are registered (2026-09-03, solo)

Routed at the close of the review pass. No Blocker survived.

- **`aof work audit --strict` was RUN over this repository, and all seven lanes executed.** Measured
  at the close: `instrument-census` 0 findings (suite-population 975/300, runner-bindings 973/100,
  assembled-suite 8653/500), `evidence-re-run` 55, `registry-checks` 1, `prompt-layer` 271,
  `hook-wiring` 0, `seam-liveness` 6, `declared-bounds` 6 — **1 error and 338 warnings**, and the
  single error was `evidence-unrunnable` naming FF-7708's own control before it existed. **Re-run
  once that control was on disk: 0 error(s), 338 warning(s), and `--strict` exits ZERO.** Every error
  leg of the seven codes this milestone adds is at zero here, which is `ADR-008 §4`'s measured
  consequence holding on the composed command rather than on a fixture.
- **`AUDITABLE_CODES` moved BELOW `REPORT_LANES`, and the escalating-set binding moved with it.**
  Deriving the code space from the registry means it cannot be read before the registry exists; the
  module-scope refusal that names an escalating code no lane can emit now sits after both. Worth
  knowing before anyone moves either declaration back up: the failure mode is a TDZ
  `ReferenceError` at import, which is loud, and it is how this was found.
- **A `text`-basis sweep now OWES a limit, and that is a NEW refusal rather than a restatement.**
  `reads.mjs` has always said a text-level sweep "must state its own limit"; until this story it was
  a sentence. `assertLaneLimits` takes the lane's read records as a third argument and refuses a
  text sweep that returned none, naming the lane and the sweep. Existing two-argument callers are
  unaffected — `reads` defaults to `[]`, so nothing is owed unless a text sweep is declared.
- **The registry's SECOND refusal is new too.** An entry declaring no runner already failed loudly;
  two entries sharing ONE runner did not, and that is the same defect wearing the other face — the
  registry would report one lane's result twice under two names. `assertLaneRunnersDistinct` refuses
  both before any lane runs, so a broken registry cannot half-produce a report that reads finished.
- **A governed project with NO installed prompt layer and NO settings file will report
  `audit-ran-on-nothing` at `error` from the prompt-layer and hook-wiring lanes** — measured
  directly against a bare temporary directory. This is recorded rather than filed as a defect,
  because it is what those lanes' floors are FOR: the population is genuinely empty, "found nothing"
  and "looked at nothing" are the two facts `ADR-004 §1` exists to keep apart, and a project that
  installed no prompt layer is one the audit truly could not read. Any project carrying an ACD
  bundle has both populations. Named here so the first operator to run this in a bare repository
  reads the report as the rule working rather than as the command being broken.
- **`resolveRoleRouting` is a NEW reader of `work.agents.*`, and deliberately the only one.** No code
  read that key before — the ACD command prompts read it, in markdown — so this is a first reader
  rather than a second, and it lives at the face exactly where `ADR-008 §5` puts it. A role is
  `"agent"` only where the audited configuration says so: `mode: "solo"` routes everything inline by
  definition, and a role the configuration never mentions has not been declared as spawned, so the
  conservative rung is the inline one. That resolution is what holds this repository's live
  capability gap at `warn`, and it is asserted against the real `.aof/aof.config.json` rather than
  described.
- **`test/audit-command.test.mjs`'s harness now stubs seven lanes rather than three.** The suite's
  subject is the FACE's composition, and a lane that really read this repository would have made
  every count in it a fact about the tree — the four new stubs are the same choice 59/04 made for
  the census and the evidence lane, for the same reason.
- **An existing gate caught this story's own control cutting source positionally** — F-47-04-ARCH-2,
  via `acd-test-suite-registration`, on a `face.slice(indexOf(…), indexOf(…))`. Converted to
  `functionBody` from the one home. Recorded because it is the third milestone in which that gate
  has paid for itself on a control written by the milestone that was extending it.


## Verification

Gate run 2026-09-03 (`aof:verify 77`). Full evidence, findings and the accept decision are in
`VERIFICATION.md`; this is the summary.

- [x] `@executable` suite green — 279 cases over the milestone's 19 suite files, exit 0
- [x] Every declared control's red probe recorded — 8/8 rows, 10 probes, every restore
      byte-identical (FF-7703 and FF-7706 carry two legs each)
- [x] `aof work validate 77` PASS · `aof work doctor 77` reports no `control-unresolved` at either
      severity · `aof work audit --strict` exits **zero** (0 error / 338 warn)
- [x] Fitness functions green — **the tier refused this milestone once.** Run through
      `aof work grade 77 --run`: 10 of 1649 red. Three were self-interference from running the tier
      under `work:grade`'s own re-entrancy stamp (green standalone — an artifact of the instrument);
      five were inherited reds already carrying items (chores 91, 92, 93, 97 and milestone 96's
      in-flight stories); and **two were 77's own** — `B-01` (`work-audit-drive.mjs`'s cleanup
      `catch` entered the `src/` census when 77/04 moved the file) and `B-02` (the duplication
      finding's message trips FF-6601's keyword-table shape, the first false positive of that gate's
      `{` widening). **Both repaired at the gate**; re-run direct: **1644 ok / 5 not ok**, none of
      the five 77's.
- [x] `@manual` signed off — not applicable: all 150 scenarios are `@executable`, none `@manual`,
      none `@uat`. There is no `UAT.md` and there should not be one.

**ACCEPTED 2026-09-03.** Six stories `done`, milestone `done`. The gate refusing this once, on two
controls owned by OTHER milestones that no story's own scope could see, is the milestone's own
thesis holding over itself: the machine that produces the record was audited, and it reported.
