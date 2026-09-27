---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: is this item truly done, and what is the
  evidence? Written at `aof:verify`, per story as each lands. Owner: product-owner — the SINGLE
  WRITER. Evidence agents REPORT; they never author here.
  Four sections: the evidence, the fitness register (the red probe per declared control), the
  findings, and the accept decision. Write only the sections that have content — the absence of a
  section is information, and an empty "None" placeholder is not.
-->
# 57 · Paired loops — Verification

<!--
  OPENED AT REFINE (2026-08-27), carrying the fitness register ALONE.

  Nothing has been built or verified yet, so there is no evidence, no finding and no accept
  decision to write — and an empty "None" placeholder is not information. Those three sections are
  authored by `aof:verify` as each story lands.

  The register below exists now because `ARCHITECTURE.md` DECLARES eight controls, and a declared
  control with nowhere to record its red probe is the gap `aof work doctor 57` reports as
  `verification-register-missing`. Every row's red-probe cell holds the frozen placeholder, which
  reads as a MISSING probe — the honest state at refine, and the state each row leaves the moment
  its arch-test lands and is observed failing.

  SIX OF THE EIGHT carry `pending` in their ARCHITECTURE declaration because their arch-test file
  does not exist yet. Two do not: FF-5702 and FF-5703 extend guards already in service, so their
  cited files resolve today and `control-unresolved` will never fire for them. That makes the red
  probe the ONLY evidence those two extensions are armed — an extension never observed failing is
  indistinguishable from one never written.
-->

## Verification evidence

<!-- Per story, as each lands. Procedure + result + a `verifies →` pointer; never a restatement of
     the scenario's own outcome. All four of 57/00's task contracts are `@executable`: there is no
     `@manual` lane and no `@uat` lane in this story, and no DESIGN surface, so no agent-run
     procedure, no design-conformance render and no human sign-off section is written for it. -->

### 57/00 · The watcher node — 2026-08-27

**Procedure.** Focused test-array import with a per-test throwaway `AOF_GLOBAL_HOME` — `node --test`
on these files is a silent false pass, and the full lane cannot run on this machine while the live
control daemon holds `:4182`. The lane is the story's own two suites plus every suite that asserts a
vocabulary this widening touches and every suite over the registry the widened loader feeds:
`test/watcher-node.test.mjs`, `test/arch/acd-watcher-taxonomy-additive.test.mjs`,
`test/arch/acd-anchor-taxonomy-additive.test.mjs`, `test/arch/acd-loop-vocabulary-closed.test.mjs`,
`test/arch/acd-registry-framework-owned.test.mjs`, `test/work-loops-record.test.mjs`,
`test/work-loops-checks.test.mjs`, `test/work-loops-registry-census.test.mjs`,
`test/work-loops-commands.test.mjs`, `test/work-loops-coverage-ledger.test.mjs`,
`test/work-loops-value.test.mjs`, `test/work-loops-resolved-ceilings.test.mjs`,
`test/work-loops-home-and-delivery.test.mjs`, the four `l3-*` suites and the four `loop-ready-*`
suites.

**Result.** 207 tests, 0 failures (198 behavioural across 17 suites + 9 across the four arch suites).
The whole registered fitness lane — 1226 of the suite's 6926 entries — was also run: 5 red, **none
of them this story's**, each attributed in `## Findings` below. The suite was scoped to the story
rather than widened to the repo: the full lane runs once at the milestone gate.

| what was checked | procedure | result | verifies → |
|---|---|---|---|
| The fourth kind parses, and the three that exist are untouched | a `kind: watcher` fixture is loaded and its node kind read off the model; a loop/actor/anchor trio is loaded beside it | green — `watcher` is a node kind; the trio parses with zero findings | `00_a-fourth-kind.feature` — "a watcher record parses as a node of its own kind", "the three existing kinds are unchanged" |
| The eleven records shipped before the widening parse with zero new findings | the eleven `src/bundle/loops/*.md` sources are copied into a temp registry and loaded; node count and the full finding signature (`file:code:key`) compared against the frozen pre-widening list | green — 11 nodes, 18 findings, code-for-code and key-for-key identical | `00_a-fourth-kind.feature` — "every record already on disk parses with zero new findings" |
| The vocabulary is still closed | `observer` and `monitor` fixtures are loaded, and the six-row outline driven through the loader | green — each is `loop-bad-value` naming `kind`, and no node is parsed as the unrecognised kind | `00_a-fourth-kind.feature` — "an unrecognised kind is still refused", "what the kind vocabulary admits" |
| A watcher must declare its counter, its determinism and its measurement | each of the six required fields is omitted in turn and the loader's finding read | green — exactly one `loop-missing-field` per omission, naming the omitted key | `01_what-a-watcher-must-declare.feature` — "which fields a watcher must carry" |
| An absent determinism is a missing field, not a default | a watcher with `counter` and `measurement` but no `determinism` is loaded, and the parsed node inspected | green — `loop-missing-field` names `determinism`, and `"determinism" in node.fields` is `false` — no value is invented | `01_what-a-watcher-must-declare.feature` — "an absent determinism is a missing field, not a default" |
| `determinism:` admits two literals and nothing else | `counter`, `judge`, `deterministic`, `unknown`, `true` driven through the loader | green — the first two parse clean, the rest are `loop-bad-value` naming `determinism` | `01_what-a-watcher-must-declare.feature` — "what determinism admits" |
| `counter:` is a phrase, and only a phrase | eight values driven through — the three pointer schemes, `prose:`, the three sentinels and the empty string | green — each is `loop-bad-value` and drops the field; only a free phrase parses | `01_what-a-watcher-must-declare.feature` — "a complete watcher declares its counter, its determinism and its measurement" (the architect-review leg) |
| A prose-backed measurement reuses the loop's finding rather than gaining a variant | a watcher whose `measurement:` is `[prose:…]` is loaded and the finding code list read | green — the single finding is `loop-field-prose-only`, message `measurement is backed only by prose:` | `01_what-a-watcher-must-declare.feature` — "a prose-backed measurement is named as prose-backed, as it is for a loop" |
| A watcher has no vocabulary for acting, and the refusal is the loader's | a watcher declaring `actuator` is loaded with **no check called**, and `ADMITTED_KEYS.watcher.has("actuator")` asserted `false` | green — one `loop-key-not-admitted-for-kind` naming `actuator`, present before any check runs, and the key never reaches `node.fields` | `02_a-watcher-cannot-declare-an-actuator.feature` — "a watcher declaring an actuator is refused", "the refusal is the loader's, not a check's" |
| The refusal is scoped to the kind, not to the key | a loop declaring an actuator is loaded; then `controlled`, `ceiling` and `optimizing` are each tried on a watcher | green — the loop raises nothing against `actuator`; all four control keys are refused for the watcher | `02_a-watcher-cannot-declare-an-actuator.feature` — "a loop may still declare an actuator", "which control keys a watcher may carry" |
| The pairing is the existing outbound `monitoring` edge, and no sixth key exists | a watcher declaring `monitoring: [loop:watched]` is loaded; `EDGE_KEYS` asserted equal to 52's five literals | green — the edge is on the watcher, the named loop is its endpoint, and the watched loop carries no `watcher` field and no reverse edge | `03_the-pairing-is-the-edge-that-exists.feature` — "a watcher declares the loop it watches", "loading the edge does not synthesize a reverse declaration on the watched loop" |
| A loop cannot name its own watcher | a loop record carrying `watcher: watcher:watch` is loaded | green — `loop-unknown-key` names it, and neither a field nor an edge survives on the parsed loop | `03_the-pairing-is-the-edge-that-exists.feature` — "a loop attempting to name its own watcher is refused" |
| The existing graph findings still reach a watcher's edges | a watcher pointing at an id no record declares; then a watcher declaring two monitoring endpoints | green — `loop-graph-dangling-endpoint` names `loop:missing`; both loops are endpoints of the one watcher | `03_the-pairing-is-the-edge-that-exists.feature` — "an edge to an endpoint that does not exist is still dangling", "a watcher may watch more than one loop" |

**Boundary spot-check (measured, not inferred).** The story claims it ships no check, and the claim
was driven rather than read. An `optimizing: true` loop loaded beside a `kind: watcher` node
declaring `monitoring: [loop:opt]`, passed to `checkPairing` directly, returns
`loop-unpaired-optimizer` **unchanged** — byte-identical to the same registry with the watcher
removed. The grammar parses and the edge is on the model; no verdict moves until 57/01 reads it.
That is the contracted boundary holding, and it is carried as an open gap in this story's
`OUTCOME.md` rather than left implicit.

### 57/01 · Independence computed, and the gate — 2026-08-28

**Procedure.** Focused test-array import with a per-test throwaway `AOF_GLOBAL_HOME` — `node --test`
on these files is a silent false pass, and the full lane cannot run on this machine while the live
control daemon holds `:4182`. The lane is the story's own suite plus this story's two EXTENDED
controls, the registry suites the widened checks feed, milestone 57's other landed fitness functions,
and the command-registry lane (this story adds a deterministic step to the validate procedure and
edits a command face): `test/watcher-independence-gate.test.mjs`,
`test/arch/acd-loop-checks-pure.test.mjs`, `test/arch/acd-loop-finding-envelope.test.mjs`,
`test/work-loops-checks.test.mjs`, `test/work-loops-commands.test.mjs`,
`test/work-loops-registry-census.test.mjs`, `test/work-loops-record.test.mjs`,
`test/watcher-node.test.mjs`, `test/pairing-table.test.mjs`,
`test/arch/acd-loop-vocabulary-closed.test.mjs`, `test/arch/acd-registry-framework-owned.test.mjs`,
`test/arch/acd-anchor-taxonomy-additive.test.mjs`, `test/arch/acd-loop-suite-registration.test.mjs`,
`test/arch/acd-watcher-taxonomy-additive.test.mjs`,
`test/arch/acd-feature-parse-examples-additive.test.mjs`,
`test/arch/acd-ratchet-pure-and-discharge-scoped.test.mjs`,
`test/arch/acd-watcher-counter-resolves.test.mjs`, `test/arch/acd-day-one-pairing-complete.test.mjs`,
`test/arch/acd-work-command-cli-bijection.test.mjs`,
`test/arch/acd-work-command-route-coverage.test.mjs`,
`test/arch/acd-test-suite-registration.test.mjs`, `test/arch/acd-roundtrip-registration.test.mjs`,
`test/command-core-contract.test.mjs`. All four task contracts are `@executable`: there is no
`@manual` lane, no `@uat` lane and no DESIGN surface in this story, so no agent-run procedure, no
design-conformance render and no human sign-off section is written for it.

**Result.** **195 tests, 0 failures.** The story's own suite is 6 entries — one per task contract
(00–03) plus a traceability entry asserting that all **30 scenarios and 16 example rows** map to the
four task suites. The suite is imported **and spread** in `scripts/test.mjs` (ADR-007 §6's
registration rule, the one 56 measured 117 entries de-armed by), and `acd-loop-suite-registration` is
in the lane above and green. The suite was scoped to the story rather than widened to the repo: the
full lane runs once at the milestone gate.

| what was checked | procedure | result | verifies → |
|---|---|---|---|
| Measurement overlap is exact, per watched loop, and deduplicated | a watcher and loop sharing a measurement pointer; then disjoint sets; then one-of-several overlapping; then a repeated pointer; then a watcher watching two loops and sharing with one | green — the finding names watcher and loop, fires on a single overlap, is raised exactly once per watcher-loop pair, and is silent on disjoint sets | `00_a-watcher-that-reads-the-optimizers-own-number.feature` — its first five scenarios |
| An overlapping watcher still counts as pairing | a loop watched only by a watcher that shares its measurement | green — the shared-measurement finding is raised and **no** unpaired-optimizer finding is raised for that loop; the two verdicts are separate | `00_…own-number.feature` — "the finding is separate from the unpaired-optimizer finding" |
| The independence answer is model-only | a registry whose measurement pointers name files that do not exist | green — the answer is unchanged and nothing on disk is read to produce it | `00_…own-number.feature` — "the check reads only the parsed records" |
| A judging watcher sharing the loop's actuator is named; a deterministic one has no authority to share | an agent-definition actuator shared, then differing, then a pointer-backed watcher, then per-pair scoping | green — the shared-actuator finding names watcher, loop and the shared agent definition; it is silent for a different authority and for a pointer-backed measurement, and is judged per watcher-loop pair | `01_the-maker-does-not-grade-itself.feature` — its first four scenarios |
| Every judge is reported, and the judge census never gates | two judging watchers (one independent), then a registry whose only finding is a judge report, then a deterministic watcher | green — both judges are reported; the run reports **no errors** and the judge is a **warning**; a deterministic watcher is never named a judge | `01_…grade-itself.feature` — "every judging watcher is reported…", "the judge report does not gate", "a deterministic watcher is not reported as a judge" |
| A counter equal to the controlled variable is named, and the comparison normalizes | a restating counter; then one differing only in spacing and case; then a genuinely different counter | green — the finding names the watcher, fires through normalization, and is silent on a real counter | `02_the-counter-is-a-different-quantity.feature` — its first three scenarios |
| A deterministic claim must be backed by something code can run | a `determinism: counter` watcher citing prose; then a command pointer; then command+module; then a judging watcher citing prose; then the four-row outline | green — the not-deterministic finding names the watcher **and** the prose authority; command and module pointers hold; a **config** pointer and a prose authority are each refused; a judge may point at prose | `02_…different-quantity.feature` — its remaining scenarios and the `what a deterministic watcher may cite` outline (4 rows) |
| An unpaired optimizing loop fails the run, and a paired one passes | a registry with an unwatched optimizing loop, then one where every optimizer is watched independently | green — an error is reported and **the exit is a failure**; then no errors and **the exit is a success** | `03_an-unpaired-optimizer-fails-the-run.feature` — its first two scenarios |
| A non-optimizing loop is never required to have a watcher | a registry with an unwatched non-optimizing loop | green — no unpaired-optimizer finding names it | `03_…fails-the-run.feature` — "a loop that does not optimize is never required to have a watcher" |
| No inherited red — the story's hard constraint | the twelve-row severity outline, plus a fixture producing warning and error findings inherited from 52 and 55 | green — the five promoted codes report `error` and `loop-watcher-is-judge` reports `warning`, while every inherited check **and loader** code retains its prior severity (`loop-record-unparseable`/`loop-missing-field` stay `error`; `loop-owner-unknown`/`loop-field-prose-only`/`loop-unowned-reference`/`loop-timescale-inversion` stay `warn`) | `03_…fails-the-run.feature` — "inherited findings outside the gating set retain their severity" and the `which codes gate and which report` outline (12 rows) |
| The two faces project one finding result, and the exit lives only on the face | the human and JSON faces read over the same erroring registry; then the checks called directly | green — both faces expose the same codes and severities; the checks return findings and decide **no** exit code, and reading `cli.exit(result)` leaves the result byte-identical | `03_…fails-the-run.feature` — "the human and machine faces project the same finding result", "the exit decision lives on the face, not in the check" |
| `aof:validate` runs the loop registry gate as its own deterministic step | the validate procedure text is read and its step order asserted | green — `aof work validate` → `aof work loops validate` → `aof work doctor` in fixed order, the gate is not smuggled into `work validate`, and the non-zero exit is stated as surfaced to the operator | `03_…fails-the-run.feature` — "the aof validate procedure runs the loop registry gate" |

**The gate is armed on the real tree, and that was driven rather than read.** A gate that never fires
and a tree that is genuinely clean produce the same `0 error(s)` line, so both directions were
measured on this repository's own registry:

- **Clean.** `aof work loops validate` reports **0 error(s), 39 warning(s)** and **exits 0**. The
  three `loop-unpaired-optimizer` lines the story was written against (`loop:build-to-green`,
  `loop:review-fix-rereview`, `loop:autonomous-cascade`, measured 2026-08-27) are **gone** — 57/05's
  records supply the edges and this story's widening is what lets `checkPairing` see them.
- **Red.** Re-aiming one shipped watcher's edge in a throwaway copy of `.aof/loops`
  (`build-to-green-watcher.md`, `monitoring: [loop:build-to-green]` → `[loop:run-resilience]`, a real
  non-optimizing loop) yields `error · loop-unpaired-optimizer · loop:build-to-green is optimizing
  without inbound monitoring from another node` and **exit 1**. The edge was **re-aimed rather than
  deleted** for the reason `FF-5708`'s cell already records: deleting it trips the watcher-side leg
  first and never reaches the loop-side one.
- **No inherited red, live.** All 39 remaining findings are `warn`, across nine inherited codes. The
  gate promoted exactly its five codes and turned nothing else red — ADR-003 §2's hard constraint,
  measured on the tree rather than on a fixture.

**The delivered wrapper did not carry the gate, and the ordinary install path had never been walked.**
*verifies →* `tasks/03`, scenario *"the aof validate procedure runs the loop registry gate"*. That
scenario is green against `src/bundle/commands/validate.md` — the bundle **source**. The wrapper that
actually runs, `.claude/commands/aof/validate.md`, carried no loop-gate step at all, and neither did
the `.opencode` or `.codex` faces. Logged as `F-57-01-2` and fixed at this gate; it is the same defect
class as `F-57-05-1`, and it was caught by the same question (does the shipped artifact match the
source the test reads?) rather than by any control.

### 57/02 · Examples rows in the parser — 2026-08-27

**Procedure.** Focused test-array import with a per-run throwaway `AOF_GLOBAL_HOME` — `node --test`
on these files is a silent false pass, and the full lane cannot run on this machine while the live
control daemon holds `:4182`. The lane is the story's own two suites plus every suite that reads
this parser or a module that reads it — a widened **consumer** lane rather than the repo's whole
suite, because the blast radius named in the story is the parser's three production dependents:
`test/feature-parse-examples.test.mjs`, `test/arch/acd-feature-parse-examples-additive.test.mjs`,
`test/feature-parse-strict.test.mjs`, `test/arch/acd-feature-parser-single-home.test.mjs`,
`test/work-validate-contract-parses.test.mjs`, `test/rubric-join-is-declared.test.mjs`,
`test/rubric-lane-reads-and-never-runs.test.mjs`, `test/rubric-miss-is-reported-unjoined.test.mjs`,
`test/brief-carries-the-contract.test.mjs`, `test/brief-pinned-to-the-stream.test.mjs`,
`test/arch/acd-grade-subject-is-emitted.test.mjs`, `test/arch/acd-controls-never-execute.test.mjs`,
`test/cli-face-contract.test.mjs`.

**Result.** 162 tests across 13 suites; the story's own three entries green, and **6 red, none of
them this story's**. That attribution was **measured, not argued**: with `src/feature-parse.mjs`
replaced by its HEAD bytes the *identical six* are red, and the file was restored byte-exactly
afterwards (`sha256:cd75542ac3b95e1b…`, compared after restore). Each red is attributed in
`## Findings` below. The suite was scoped to the story rather than widened to the repo: the full
lane runs once at the milestone gate.

| what was checked | procedure | result | verifies → |
|---|---|---|---|
| An Outline reports each Examples block — caption, data-row count, and the line the caption opened on | a two-block outline is parsed and the whole `examples` list deep-compared, then each block's rows enumerated as the substitutions a runner would execute | green — `[{header:"primary caption",rows:2,line:7},{header:"second caption",rows:3,line:14}]`, enumerating five executions and no header | `00_a-scenario-reports-its-rows.feature` — "an outline reports its rows", "the caption and the line are reported", "several examples blocks are reported in order" |
| The column-header row is not counted as a case | tables of 3 and 4 pipe-lines, each with a header row, are counted | green — 2 and 3 rows: the count is one below the table's line count in both | `00_a-scenario-reports-its-rows.feature` — "the column-header row is not counted as a case", "what contributes a row" (the `header row` case) |
| A commented row contributes nothing, and a blank line neither counts nor closes the block | an Examples table carrying `# \| ignored \|` and a blank line between two data rows | green — 2 rows from a block whose table spans a comment and a blank line; both are `is not counted` and the row after the blank is still `is counted` | `00_a-scenario-reports-its-rows.feature` — "a commented row is not counted", "what contributes a row" (the `blank line`, `commented line`, `second data row` cases) |
| An Outline with no table and a plain Scenario both report an empty LIST, never an absence | both shapes parsed and their `examples` compared against `[]`, and `Array.isArray` asserted for every scenario in the corpus | green — `[]` for both, and an array on all 5,384 scenarios in the tree | `00_a-scenario-reports-its-rows.feature` — "an outline with no examples table reports an empty list", "a plain scenario reports an empty list" |
| Pipe-delimited lines inside a docstring are not an Examples table | a docstring containing `Examples:` and pipe lines is parsed | green — 0 rows; docstring bodies are consumed as data before the table branch is reached | `00_a-scenario-reports-its-rows.feature` — "a table inside a docstring is not an examples table" |
| A block is bounded by the next step, not left open to the end of the file | `Examples: header only` followed by a header row, then a step, then a stray pipe line | green — `{header:"header only",rows:0}`; the line after the step contributes nothing | `00_a-scenario-reports-its-rows.feature` — "a table inside a docstring is not an examples table" (the bounding leg of the same edge case) |
| The five existing keys and the litmus verdict are identical for **every** feature in the tree | the pre-widening parser is reconstructed by stripping the `ADR-005` marker blocks, and both parsers run over every `.feature` under `wiki/work`, deep-compared per file with `examples` removed | green — 803 files, 5,384 scenarios, deep-equal file by file; every scenario's key order is exactly `name, outline, lane, verification, line, examples` | `01_nothing-else-moves.feature` — "every feature in the tree parses to the same five keys", "the litmus answers are unchanged", "feature-level and scenario-level tags are unchanged" |
| The same differential against the REAL pre-story bytes, not a reconstruction | `git show HEAD:src/feature-parse.mjs` imported alongside the current parser, both run over the whole corpus | green — 803 files, **0 mismatches**; and the hole the story exists to close is now measurable: **1,069 Outlines, 1,217 Examples blocks, 5,333 data rows** visible where the count was 0 | `01_nothing-else-moves.feature` — the stronger form of "the same five keys"; this is what discharges `F-57-02-1` at this gate |
| Prose after an Examples table is still not a violation, and a step after one is still in step position | both shapes driven directly through the parser, not inferred from the corpus | green — `structural: []` for a narrative paragraph following a table, and `[]` again for a scenario whose steps follow one; both scenarios parse | `01_nothing-else-moves.feature` — "prose after an examples table is still not a violation", "a step after an examples table is still in step position" |
| No consumer of the parser is edited by this milestone | `git status` on the three dependents, and `git log 22519e9..HEAD` per file against the milestone base | green — all three unmodified in the working tree; `src/commands/tasks.mjs` and `src/work-doctor-rubric.mjs` carry **zero** commits since the base, and `src/work.mjs`'s single commit is `830e4f9` — item 84's story-span ref, not 57's | `01_nothing-else-moves.feature` — "no consumer of the parser is edited by this milestone" |


### 57/03 · The contract-integrity ratchet — 2026-08-28

**Procedure.** Focused test-array import with a per-test throwaway `AOF_GLOBAL_HOME` — `node --test`
on these files is a silent false pass, and the full lane cannot run on this machine while the live
control daemon holds `:4182`. The lane is the story's own suite plus milestone 57's landed fitness
functions: `test/work-ratchet.test.mjs`,
`test/arch/acd-ratchet-pure-and-discharge-scoped.test.mjs`,
`test/arch/acd-watcher-taxonomy-additive.test.mjs`,
`test/arch/acd-feature-parse-examples-additive.test.mjs`, `test/arch/acd-loop-checks-pure.test.mjs`
and `test/arch/acd-loop-finding-envelope.test.mjs`. All five task contracts are `@executable`: there
is no `@manual` lane, no `@uat` lane and no DESIGN surface in this story, so no agent-run procedure,
no design-conformance render and no human sign-off section is written for it.

**Result (after the fix below).** 17 tests, 0 failures — 6 behavioural (one per task contract,
00–05) and 11 across the five arch suites. The command-registry lane was re-run because the fix
edits a command module and renames a registered suite: `acd-test-suite-registration`,
`acd-roundtrip-registration`, `acd-work-command-cli-bijection`, `acd-work-command-route-coverage`
and `command-core-contract` — 39 tests, 0 failures. The suite was scoped to the story rather than
widened to the repo: the full lane runs once at the milestone gate.

**Discharge scoping, measured against the real register.** *verifies →*
`tasks/04_discharge-by-pre-existing-authority.feature`, scenario *"the justification comment is never
read"*. The command boundary harvests a fired finding's citations with
`adrIdsOnly(after)` — a regex over the **whole head text of the weakened artifact, comments
included**. Driving the delivered engine with a real closed→open weakening
(`assert.deepEqual(actual, ["a", "b"])` → `assert.ok(actual.includes("a"))`) in a file whose header
comment reads `// milestone 57 / story 03 — the contract-integrity ratchet (ADR-004).`, against
**this milestone's own `ARCHITECTURE.md` bytes**, returns `disposition: "discharged"`,
`authority: "ADR-004"`. The contract's stated outcome for that scenario is *fired*. Population for
the shape: **663 of 944** `test/**/*.mjs` files in this repository (70%) already carry an `ADR-NNN`
token, overwhelmingly in exactly such a header comment. Logged as `F-57-03-1`.

**The fix, and the same measurement re-run against it.** *verifies →*
`tasks/05_the-citation-must-be-pre-existing-and-owned.feature` (`@bug`, `@finding-F-57-03-1`) — the
new task contract, authored here and green. ADR-004 §5's first qualifier is now implemented on both
halves it was missing. **Timing:** the boundary harvests citations from the artifact's text **at the
base commit** (`adrIdsOnly(before)`), never head — so a comment written *with* a weakening cannot be
an input, which is what makes *"the ratchet never reads the justification comment"* structural
rather than a promise. **Scope:** a citation discharges only when it **names the owning item**
(`57/ADR-007`, `m57/` admitted); a bare `ADR-007` no longer resolves, because every milestone
numbers its register from 001 and a bare id would clear against whichever register the walk reached.
The identical observation that returned `discharged` above now returns **`fired`**, with the
harvested `ADR-004` recorded under `citations` and no `authority`.

**A defect the fix's own contract caught.** The first run of task 05 failed `'03' !== '57'`: the
owning ref was taken from the register-bearing folder's own number, so a story-level register would
have been named `03` rather than `57/03`. It is now built from the numbered segments between the
work dir and that ancestor — the documented `m?<itemRef>/<ID>` spelling. Recorded because the
scenario that caught it was written before the code it judged, which is the ordering this milestone
is about.

### 57/04 · Escape and intervention counters — 2026-08-28

**Procedure.** Focused test-array import with a per-run throwaway `AOF_GLOBAL_HOME` — `node --test`
on these files is a silent false pass, and the full lane cannot run on this machine while the live
control daemon holds `:4182`. The lane is the story's own two suites plus milestone 57's landed
fitness functions: `test/work-counters.test.mjs`,
`test/arch/acd-work-counters-read-only.test.mjs`, `test/arch/acd-watcher-taxonomy-additive.test.mjs`,
`test/arch/acd-feature-parse-examples-additive.test.mjs`,
`test/arch/acd-ratchet-pure-and-discharge-scoped.test.mjs`, `test/arch/acd-loop-checks-pure.test.mjs`
and `test/arch/acd-loop-finding-envelope.test.mjs`. All three task contracts are `@executable`: there
is no `@manual` lane, no `@uat` lane and no DESIGN surface in this story, so no agent-run procedure,
no design-conformance render and no human sign-off section is written for it.

**Result.** 16 tests, 0 failures — 3 behavioural (one per task contract, 00–02) and 13 across the six
arch suites. The command-registry lane was re-run because the story registers a new command and edits
`src/command-core.mjs`: `acd-test-suite-registration`, `acd-roundtrip-registration`,
`acd-work-command-cli-bijection`, `acd-work-command-route-coverage` and `command-core-contract` —
39 tests, 0 failures. The suite was scoped to the story rather than widened to the repo: the full
lane runs once at the milestone gate.

**No red probe is owed, and that is a reading of the register rather than an omission.** `57/04`'s
row in the story partition names two files and **no `FF-NNNN`**; the `ARCHITECTURE.md` diff for this
story adds no register row, and the three `control-unresolved` warnings `aof work doctor 57` reports
(`FF-5706`, `FF-5707`, `FF-5708`) are all still-`pending` declarations over `57/05`'s and the
milestone's surfaces. The probe obligation reaches declared `FF-NNNN` ids alone, so the
`## Fitness functions` register below is untouched by this story.

**What the story did land is half of `FF-5707`, from the counter's side.** *verifies →* all three task
contracts' `FF-5707` citation. `test/arch/acd-work-counters-read-only.test.mjs` asserts the resolvable
end of the pointer — `countFindingEscapes` and `countInterventions` are exported symbols, `work:counters`
is one `id` and one `route` in the registry, and `src/command-core.mjs` imports and spreads it exactly
once. The declared control `test/arch/acd-watcher-counter-resolves.test.mjs` is still absent, because
its other end — a `kind: watcher` record whose `measurement` names this command — does not exist until
`57/05`. The declaration stays `pending`, uncorrected here on purpose.

**The payoff scenario, measured against the real repository rather than a fixture.** *verifies →*
`tasks/02_absent-data-is-not-a-good-score.feature`, scenarios *"no runs recorded is not zero
interventions"* and *"no feedback recorded is not zero escapes"*. `aof work counters 57` on this
checkout returns:

```
Loop counter-metrics for 57:
  finding escapes: cannot measure (feedback-absent; 3 item(s) unmeasured)
  interventions: cannot measure (runs-absent; 7 item(s) unmeasured)
```

Milestone 57 has no feedback ledger and no run records, and the delivered counter says so and emits
**no `count` key at all** — `Object.hasOwn(result.escape, "count")` is `false` on the unmeasurable
branch, so a consumer cannot read a zero that was never measured. This is the one behaviour the
milestone's own pairing gate would otherwise be satisfiable by, and it was confirmed on live records
rather than only on the injected ones.

**The command boundary, driven directly on the measured branch.** The behavioural suite drives the
pure engine; `renderCounter`, the JSON adapter and the per-item envelope are reached by no test. Driving
`countersCommand.cli.render`/`.json` over a two-item observation (one accepted item with one
pre-acceptance and one post-acceptance finding, and a `r1 → r2` retry lineage; one in-progress item
with neither) returns `escape.count 1 / feedbackRecords 2`, `intervention.count 1 / runs 2 / rate 0.5`,
`missing ["57/01"]`, and the retry classified `kind: "retry"`. The render reads
`interventions: 1 across 2 runs; 1 item(s) unmeasured` — correct, and the escape line is not (`F-57-04-2`).

**The resume classification checked against the real run shape, not the fixture's.** *verifies →*
`tasks/01_the-cascade-that-needed-a-hand.feature`, scenario *"a resumed run is an intervention"*. The
counter reports `resume` when the run a retry points at carries `resumeAfter`, which is only correct if
a park-then-resume actually mints a second record. It does: `applyTransition` writes `resumeAfter` onto
the parked record (`src/run-store.mjs:769`) and the retry mints a fresh run with
`attempt = prior.attempt + 1, retryOf = prior.runId` (`src/run-store.mjs:934`). A resume is therefore
reachable by the `retryOf` branch, and the distinction between `retry` and `resume` is a real property
of the lineage rather than a fixture convention.

### 57/05 · The pairing table — 2026-08-28

**The story's own lane is green, scoped to the story.** *verifies →* `tasks/00_the-framework-ships-its-own-watchers.feature` and `tasks/01_the-registry-passes-its-own-gate.feature`, both `@executable`. 9 tests, 0 failures: 5 behavioural (`test/pairing-table.test.mjs`) and 4 across the story's two declared controls. The adjacent registry guards this story's three new records now flow through were re-run because the records enter a corpus those guards read whole — `work-loops-record` (35), `watcher-node` (4), `acd-registry-framework-owned` (3), `acd-anchor-taxonomy-additive` (3), `acd-loop-vocabulary-closed` (2), `acd-watcher-taxonomy-additive` (1), `acd-loop-checks-pure` (3), `acd-loop-finding-envelope` (3) — **63 tests, 0 failures** in total. The suite was scoped to the story rather than widened to the repo: the full lane runs once at the milestone gate.

**The install path was driven, not asserted.** *verifies →* `tasks/00`, scenario *"the records install by the ordinary update path"*. The behavioural suite synthesises the bundle into a temp repo exactly as `init` does, runs `updateWork` against it, and reads `.aof/loops/` off disk — the three watcher files are there. The ownership marker is a behaviour rather than a comment: appending an operator line to an installed watcher and re-running `updateWork` classifies it `drift-warning` and the operator's text survives, so the framework-owned records are not silently overwritten.

**The independence legs pass on merit rather than by omission, checked field by field.** *verifies →* `tasks/01`, all five finding-code scenarios. Each watcher's `measurement` is a `command:` pointer disjoint from the loop's own; each `counter` differs from the watched loop's `controlled`; `actuator` is absent from `watcher.fields` entirely (the kind admits no such key); every `determinism` is `counter`, so no shipped watcher is a judge; and no `controlled:` or `counter:` anywhere in the registry names an arch-failure count (ADR-006 §2).

**`GATING_CODES` does not exist yet, and the control says "zero error-severity findings" instead.** `FF-5708`'s third leg is declared as *"zero findings whose code is in `GATING_CODES`"*; that set is `57/01`'s, and `57/01` is `blocked` behind this story (ADR-007 §6). The landed control asserts the reachable proxy — `model.findings.filter((f) => f.severity === "error")` is empty — and the behavioural scenario adds the complement: the inherited `loop-owner-unknown` / `loop-field-prose-only` warns are still present and still `warn`, so the clean result is not a registry that stopped being read. The declared wording becomes literally checkable when `57/01` lands its severity map; recorded here so the next reader does not mistake the proxy for the declaration.

**The framework's own installed registry was measured directly, and the first measurement failed.** `loadLoops(".aof")` found **11 nodes, 0 watchers**: the three records shipped in `src/bundle/loops/` and were never installed into `aof`'s own `.aof/loops/`. Raised as `F-57-05-1`, fixed inline, and re-measured — **14 nodes, 3 watchers**, each carrying the right `monitoring` edge, zero error-severity findings, and all 14 `.aof/loops/` bundle members byte-identical to their sources (the installed shas are `414ca321…`, `b0c64487…`, `f8587c64…` — the same bytes the red probes above ran against).

**The discharge was measured on the two halves separately, because they belong to different stories.** `57/00`'s `OUTCOME.md` declares two gaps, and only one of them is this story's:

| 57/00 gap | discharge condition | state after this fix |
|---|---|---|
| *No watcher exists in the shipped registry* | **57/05** ships the day-one pairing table | **discharged** — `.aof/loops/` holds 14 records including three watchers, each with a resolving `monitoring` edge at its optimizer |
| *A watcher's `monitoring` edge moves no verdict* | **57/01** widens the graph decomposition and `checkPairing` to read `kind: watcher` nodes | **still open, and not this story's** — `isGraphNode` (`src/work-loops-checks.mjs:103`) admits `loop`/`actor`/`anchor` and not `watcher`, so the check filters the installed watchers out before it counts |

That second row is a **correction to this story's own first verify pass**, recorded rather than quietly amended. `F-57-05-1` was raised citing *"`aof work loops validate` still names all three optimizing loops"* as its evidence. That command still names all three after the fix — because of the 57/01 gap in the row above, not because the fix failed. The half of that evidence which was genuinely `57/05`'s is the registry census (11 nodes / 0 watchers → 14 / 3), and it moved.

**What 57/01 will see, simulated over the now-installed registry.** `checkPairing` today returns **3** unpaired optimizers. Re-running its own logic with watchers admitted to the node set — the one change ADR-007 assigns to `57/01` — returns **0**. So the pairing table is complete and inert, exactly as designed: the records are in place, and the verdict moves when `57/01` teaches the check to read them. The install is what makes that gate land green rather than red.


**The recurrence control, landed as an EXTENSION of a guard already in service.** `F-57-05-1` was invisible to every existing check, and that gap is the durable half of the finding: `FF-5313` asserts bundle→**render** parity, and `tasks/00`'s install scenario installs into a **temp** repo — it proves the path works and cannot see that the path was never walked here. `test/arch/acd-registry-framework-owned.test.mjs` (`FF-5313`, milestone 53) gained a leg asserting every `.aof/loops/` bundle member is present on disk **and byte-identical** to its `src/bundle/loops/` source. It EXTENDS the host rather than adding a sibling — the milestone's own precedent for `FF-5702`/`FF-5703` — and it lands on the subject `FF-5313` already declares (delivered loop records are framework-owned asset members). It is also the comparison `.gitattributes` was already written for: the `.aof/loops/*.md text eol=lf` pin says in its own comment that installed records are *"byte-compared with their LF-pinned bundle source"*, a comparison nothing performed until now.

**Red-probed on both legs, because a new assertion owes one** — each restored byte-exactly, the leg re-run green on the restored bytes (`.aof/loops/build-to-green-watcher.md` `sha256:414ca321ad832885…`). **(1) The F-57-05-1 shape exactly.** The installed copy deleted — red: *"every shipped loop record is installed in .aof/loops/"*. This is the probe that matters: the control is red on the precise defect that was shipped, so it would have caught it. **(2) Drift rather than absence.** An operator line appended to the installed copy — red: *"every installed loop record is byte-identical to its bundle source"*. Probe (1) never reaches this leg. Recorded here rather than as a new `FF-NNNN` row: promoting it to its own declared control is an architect's call on the register, and the leg is armed either way.

**The dead assertion was removed, not re-marked.** `F-57-05-2`'s unreachable self-watch line is gone from `FF-5708`, following `57/03`'s precedent with its unreachable `owner === ""` guard. The invariant is not left unguarded, and that was confirmed by probe rather than by reading: with the line removed, aiming a watcher's `monitoring` edge at itself is still refused — `watcher` is not in `ENDPOINT_SCHEMES`, so `monitoring: [watcher:…]` is ungrammatical, the loader raises `loop-bad-value` at **ERROR** severity, and `FF-5708`'s zero-error leg goes red on it. The removed line contributed nothing it was not already getting.

**Final lane, after both fixes.** 64 tests, 0 failures — the 63 above plus the new `FF-5313` leg. `aof work validate 57/05` PASSes and `aof work doctor 57/05` reports no `control-unresolved` and no `verification-missing-red-probe` at either severity.

### 57 · Milestone gate — 2026-08-28

All six stories read `done`. This is the gate the per-story lanes deliberately defer to: the process
runs the **full** suite once, here, because per-story runs cannot see a story that poisons a control
belonging to another milestone. It found two, and they are `F-57-M-1` and `F-57-M-4`.

**The full suite, run once, on this working tree.** `node ./scripts/test.mjs` under an isolated
`AOF_GLOBAL_HOME`: **7,050 pass, 56 fail** (plus `cargo test` 85/85 and `cargo check`, both green).
The port the suite needs was free and the desktop supervisor was not running, so this is the whole
lane rather than a subset.

**Attribution of all 56, because a red lane proves nothing until each line has an owner.** Thirteen
are this milestone's, one was self-inflicted at this gate, and forty-two are inherited:

| cause | count | owner |
|---|---|---|
| `src/bundle/manifest.json` never re-derived after 57/01's and 57/05's bundle changes | 7 | 57 — **fixed at this gate** (`F-57-M-3`) |
| the `src/bundle/**` census literal not moved with the tree it counts (79 → 82) | 2 | 57 — **fixed at this gate** (`F-57-M-2`) |
| `src/commands/counters.mjs` opens a second home for `work.autonomous.maxAttempts` | 3 | 57/04 — **open blocker** (`F-57-M-1`) |
| 57/03's ratchet modules spell the `ADR-\d` id grammar a second and third time | 1 | 57/03 — **open blocker** (`F-57-M-4`) |
| `57/03` added a sixth silent-catch site to milestone 42's shrink-only ratchet | 0 | 57/03 — **fixed at this gate** (`F-57-M-8`); it moves no failure count, because that control was already red on five inherited sites |
| `test/arch/acd-oracle-is-a-message-not-a-count.test.mjs` unregistered — the FF-5706 control was authored DURING this run | 1 | self-inflicted at this gate; cleared by registering it |
| inherited, red on `main` before this milestone | 42 | routed, see below |

**THE INHERITED 42 ARE MEASURED, NOT INFERRED — and the first attempt at this row was WRONG.** The
attribution above originally read the 42 off commit dates, off which file each assertion named, and
off `F-57-00-2`'s enumeration, because no `main` baseline had been taken. It named
`work-init/runtime` and `agent-model-override` as this branch's own unfinished work, attributing
them to `5038d5c5`. **Both fail identically on `main`**, so neither claim was true. A `main`
baseline was then run — the branch fully committed, `main` checked out in place, the suite run, the
branch restored — and the two failure sets differenced:

- `main`: **6,925 pass / 47 fail**. This tree: **7,066 pass / 42 fail**.
- Failing here and **not** on `main`: **none**. This branch introduces no failing test.
- Failing on `main` and **not** here: **five** — four `claude-settings/03` legs (story 87's surface)
  and `70/05 task02`, a guard over the real work stream whose input these new items changed.
- Two inherited failures have their MAGNITUDE moved by branch commits without being caused by them:
  `arch/53 FF-5308` is red on `main` at digest `c38f47fc…` and red here at `c6f08960…`, and
  `66/00 parse`'s shrink-only mark reads 1,339 lines on `main` against 1,405 here. Already red,
  moved further — which is a different claim from "broke it", and the first pass made the wrong one.

**This is `R3` a third time, committed by the node that wrote `R3`.** The lesson says re-reading a
finding's enumeration is not re-measuring it; `F-57-M-8` was found by applying it to one control,
and the other forty-one were left on inference. Recorded here rather than quietly corrected, because
the correction is the evidence for the lesson.

**The inherited 42, each checked rather than assumed.** Milestone 53's `FF-5308` and milestone 66's
five re-measurement legs are already registered as `F-57-00-1`, `F-57-02-2` and `F-57-02-3`. The
memory-backend read census (`arch/ADR-002`, `arch/graphify-backend-selection`), `arch/m42-item-3`'s
silent-catch baseline and `arch/FF-6601`'s second Gherkin recogniser are `F-57-00-2` — and both of
those last two were RE-MEASURED here rather than re-read, which is the difference that mattered:
`FF-6601`'s second home is `src/phase-brief.mjs`, not a 57 module, but `m42-item-3`'s offender list
had grown a SIXTH entry since that finding enumerated it, and the sixth was `57/03`'s
(`F-57-M-8`, fixed here). The other five are inherited. The two `autonomous-shell-out/distribution` pins are `F-57-M-5`, measured red at `HEAD`
before this milestone. The remaining 22 are the milestone-38 mesh clone/credential block plus
`global-work-propagation/03`, `worktree-cleanup-retention/03` and the two m38-06 terminal-pane legs —
none touches a surface 57 owns.

**Milestone 57's own lane is green in that run, end to end.** `watcher-node`, `watcher-independence`
(all 30 scenarios and 16 example rows), `57/02 task 00–01` + `FF-5704`, `57/03 task 00–05` +
`FF-5705` ×2, `57/04`'s counters + `acd-work-counters-read-only`, `57/05`'s pairing table +
`FF-5707`/`FF-5708`, and the new `FF-5706` — no `not ok` line names a milestone-57 test.

**The headline claim, measured on aof's own tree rather than on a fixture.** `aof work loops validate`
over `.aof/loops/` reports **0 errors, 39 warnings, exit 0**, and **zero** `loop-unpaired-optimizer`.
At refine the same command over the same registry reported 39 warnings *including three*
`loop-unpaired-optimizer` — `loop:build-to-green`, `loop:review-fix-rereview`,
`loop:autonomous-cascade`. The count of warnings is unchanged and the composition is not: the three
unpaired-optimizer lines are gone and three inherited honesty warnings on the new watcher records take
their place. `loop-watcher-is-judge` fires **0** times — all three shipped watchers are
`determinism: counter`. This is the milestone's whole objective as a fact about the tree.
*verifies →* `57/01 tasks/03`, `57/05 tasks/01`.

**Both new commands driven end to end, against this milestone itself.**
`aof work counters 57` → `finding escapes: cannot measure (feedback-absent; 6 item(s) unmeasured)` /
`interventions: cannot measure (runs-absent; 7 item(s) unmeasured)`, exit 0 — the counter refuses to
report a zero it never measured, which is the property the pairing gate rests on.
`aof work ratchet 57/00` resolves its base to `824981b7` and reports `contract: clear` over a real
population (**19 scenarios + 23 Examples rows = 42**, before and after), `closed-set: unclassified`,
`marker: clear`, `compensating-assertion: clear`. `aof work ratchet 57/03` and `57/05` both return
`ratchet-base-unresolved` with **no legs computed** and exit 1 — the designed refusal, reached here
for the real reason (their record documents have not been committed while reading `in-progress`).
`aof work ratchet 57` exposes `F-57-M-6`. *verifies →* `57/03 tasks/00–05`, `57/04 tasks/00–02`.

**No `@manual`, no `@uat`, no DESIGN surface.** All 22 scenarios across the six stories are
`@executable`; the tag census over `stories/` returns `@executable` 22, `@manual` 0, `@uat` 0. There
is no `DESIGN.md` and no frontend surface in this milestone, so no design-conformance render, no
`aof-designer` hand-off and no human sign-off section is written — and their absence is a measured
fact, not an omission.

**RE-MEASURED AFTER THE FOUR FIXES, on the full lane, twice.** `7,066 pass / 42 fail`, and the two
runs report a byte-identical failure set — 56 → 42, which is exactly the thirteen this milestone owned
plus the one this gate inflicted on itself. **Not one of the 42 is attributable to milestone 57**, and
that is a measurement rather than a re-reading: `arch/m42-item-3`'s offender list, which
`F-57-00-2` enumerated at five, now names five again — `commands/ratchet.mjs` left it (`F-57-M-8`).
`cargo test` (85/85) and `cargo check` are green. `aof work validate 57` PASSes; `aof work doctor 57`
reports no error at either severity and Loop-Ready has moved 50% → 60%, now clearing L1.

**A property of the suite worth recording, because it cost two runs.** `global-work-propagation`
binds `127.0.0.1:4182` and the runner process does not always exit after the lane completes — a run
that has printed its last line can still hold the port, so the NEXT full run dies on `EADDRINUSE`
several thousand tests in. Twice here. The failing run is not evidence about the tree; it is evidence
about the previous run's teardown, and reading it as the former is the trap.

**Run solo.** `--solo` was passed, so every role was played inline in this session rather than
dispatched to `aof-developer`/`aof-qa`; no evidence subagent wrote to any record document.

## Fitness functions

<!-- THE RED-PROBE REGISTER. This block CITES: every row resolves to a declaration in the sibling
     `ARCHITECTURE.md` `## Fitness functions` register and declares nothing of its own.

     The `red probe` cell records what was changed to make the control fail, and the message
     observed. A control must fail when the invariant it guards is broken, so the probe is that
     assertion's positive control. A guard whose passing state is "found nothing" is
     indistinguishable from a broken one by every signal except a red probe.

     SEVEN OF THE EIGHT are owned by a subject story — 57/00 carries FF-5701; 57/01 carries FF-5702
     and FF-5703; 57/02 carries FF-5704; 57/03 carries FF-5705; 57/05 carries FF-5707 and FF-5708.

     THE EIGHTH IS THE MILESTONE'S OWN, and the correction is `F-57-03-4` settled at this gate.
     FF-5706 was written here as 57/03's, and no story can carry it: its §1 leg spans 57/03's AND
     57/04's new modules, and its §2 leg is over 57/05's `src/bundle/loops/`. It is a milestone-level
     control, landed at the milestone gate and registered in its own labelled runner block.

     TWO OF THE EIGHT ACT ON A GUARD ALREADY IN SERVICE, and each needs a probe that proves the
     EXTENSION rather than the host:

     · FF-5702 extends 52's purity guard (`acd-loop-checks-pure`). 52's own legs must stay green
       while the new leg goes red, or the probe has demonstrated nothing about this milestone.
     · FF-5703 extends 52's finding-envelope guard (`acd-loop-finding-envelope`). Its probe must
       show the guard failing when a code's severity is wrong — not merely that the envelope's
       four keys are still present, which is what the host already asserted.

     FF-5701's probe has a second obligation the others do not: the ADDITIVE claim. Widening an enum
     is trivially green against new records, so the probe must show the guard failing when a record
     milestone 52 or 55 delivered stops parsing — that is the leg protecting eleven installed files.

     FF-5708's probe has the inverse obligation: it asserts a CLEAN registry, and a guard that
     passes because it looked at nothing is the failure mode 56 documented at scale. Its probe must
     show it going red when a shipped watcher's monitoring edge is removed. -->

| id | control | landed | red probe (what was broken, and the message observed) |
|---|---|---|---|
| FF-5701 | The watcher kind widens additively; no `actuator` key is admitted for it; `determinism` admits two literals with no default | `test/arch/acd-watcher-taxonomy-additive.test.mjs` — 1 test green 2026-08-27 | **Five probes, one per leg**, each a temporary edit to `src/work-loops.mjs` restored byte-exactly afterwards (`sha256:c7a2d1b3eb99ab3c…`, compared after restore; the control re-run green on the restored bytes). **(1) A prior kind deleted rather than joined.** `NODE_KINDS` → `frozenSet("loop", "actor", "watcher")` — red: *"Expected values to be strictly deep-equal … - 'anchor'"*. **(2) THE ADDITIVE LEG, reached on its own.** Kind vocabulary left untouched and `ANCHOR_KEYS` stripped of `"observes"`, so milestone 55's two shipped anchors stop parsing — red on the eleven-record signature: *"+ 'rubric-process-exit.md:loop-unknown-key:?', + 'run-liveness.md:loop-unknown-key:?'"*. Probe (1) never reaches this assertion, which is why the leg protecting the eleven installed files needed its own probe. **(3) The absent key admitted.** `WATCHER_KEYS` gained `"actuator"` — red against the frozen watcher key set: *"+ 'actuator'"*. **(4) A third determinism literal.** `DETERMINISM_VALUES` → `frozenSet("counter", "judge", "estimate")` — red: *"The input did not match the regular expression /const DETERMINISM_VALUES = frozenSet…/"*. **(5) The no-default rule dropped.** `determinism` removed from `REQUIRED_BY_KIND.watcher` — red on the missing-field leg: *"determinism"*. |
| FF-5702 | Independence is computed, and the checks stay a pure leaf with zero imports *(extends a guard in service)* | `test/arch/acd-loop-checks-pure.test.mjs` *(extended)* — 1 new test green 2026-08-28, alongside 52's and 55's three host legs. This declaration never carried a `pending` marker (the cited file was already in service), which is exactly why the red probe is the only evidence the EXTENSION is armed. | **Four probes, each a temporary edit restored byte-exactly afterwards and the control re-run green on the restored bytes (`src/work-loops.mjs` `sha256:c7a2d1b3eb99ab3c…`, `src/work-loops-checks.mjs` `sha256:c66b892668ea6419…`, both compared after restore).** **(1) A watcher may assert its own independence.** `"independence"` added to `WATCHER_KEYS` — red: *"a watcher cannot assert its own independence"*. **(2) The watched loop may claim a watcher.** `"watcher"` added to `LOOP_KEYS` — red: *"the watched loop cannot claim a watcher"*. Together these are the ADR-002 leg that refuses a DECLARED independence: the same failure 55/ADR-002 refused when it computed the missing anchor edge instead of requiring a key. **(3) NON-VACUITY, reached on its own.** The shared-measurement leg was short-circuited (`if (sharedMeasurements.length > 0)` → `if (false)`) so the census loses one code without any key set changing — red: *"all four watcher independence/reporting legs are reachable over literal parsed records"*. Probes (1) and (2) never reach this assertion, which is the one holding the legs to a fixture whose cited paths do not exist on disk. **(4) The model-only leg, and an honest limit.** An independence leg was given an ambient read (`process.cwd()`) — red on FF-5702's own purity regex, **and simultaneously on 55's `FF-5503` host leg**. Unlike (1)–(3), this probe is NOT extension-only: it demonstrates the host guard and the extension together, and is recorded that way rather than claimed as evidence about the extension alone. Probes (1)–(3) each left all three host legs green, which is what the register's own note asks the FF-5702 probe to show. |
| FF-5703 | Severity is a property of the code; only this milestone's codes gate; the exit lives only on the face *(extends a guard in service)* | `test/arch/acd-loop-finding-envelope.test.mjs` *(extended)* — 1 new test green 2026-08-28, alongside 52's four `FF-5209` legs. This declaration never carried a `pending` marker (the cited file was already in service), which is exactly why the red probe is the only evidence the EXTENSION is armed. | **Four probes, each restored byte-exactly and the control re-run green on the restored bytes (`src/work-loops-checks.mjs` `sha256:c66b892668ea6419…`, `src/commands/loops-validate.mjs` `sha256:bee0b3a99c2058f1…`, both compared after restore).** **(1) The frozen gating set grows.** `"loop-self-referential-edge"` added to `GATING_CODES` — red on the frozen-set deep-equal, and red a second time on 52's `FF-5209` oracle, which now sees an inherited code reporting `error`. **(2) THE SEVERITY LEG — a code's severity is WRONG, not merely its envelope keys missing.** The finding constructor was reverted to one hardcoded severity (`severity: GATING_CODES.has(code) ? "error" : "warn"` → `severity: "warn"`) — red: *"The input did not match the regular expression /severity:\s*GATING_CODES\.has\(code\)…/"*, and red on the `FF-5209` oracle where `loop-unpaired-optimizer` comes back `warn`. This is precisely the probe the register's own note demands — the host guard already asserted the envelope's four keys and would not have moved. **(3) THE EXIT LEG on the face.** `exit: (result) => (result.summary.error > 0 ? 1 : 0)` → `exit: () => 0` — red: *"the face fails when the unchanged result reports an error"* and on the exit regex. **(4) The exit migrates INTO the pure check module** — `export const exit = (findings) => …` added to `src/work-loops-checks.mjs`: red, *"the pure check module decides no process exit"*. **A probe that found the leg narrower than it reads.** Aimed first at `exitFor`, then at `gateExitCode` setting `process.exitCode = 1`, the control stayed **green** both times — the assertion is spelled `/\bexit\b/u` and the trailing word boundary excludes every compound spelling. The invariant is not unguarded (the shipped module contains no exit decision and the behavioural contract drives the face's half), but the leg catches one identifier rather than the family. Recorded as `F-57-01-1` rather than left as a leg that reads stronger than it is. |
| FF-5704 | The parser widens additively — the five existing scenario keys and the litmus fields are unchanged, and no consumer is edited | `test/arch/acd-feature-parse-examples-additive.test.mjs` — 1 test green 2026-08-27 | **Four probes, one per leg**, each restored byte-exactly and the control re-run green on the restored bytes (`src/feature-parse.mjs` `sha256:cd75542ac3b95e1b…`, `src/work.mjs` compared after restore). **(1) An existing key moves.** `scenario.outline = true` added inside the widening — red on the per-file differential: *"+ outline: true, − outline: false"*. **(2) THE LITMUS LEG, reached on its own.** The widening made a table line call `openRegion(lineNumber)`, so free text moved without touching a scenario key — red: *"+ freeTextLines: 29, − freeTextLines: 2"*. Probe (1) never reaches this assertion. **(3) The new key stops being a list.** `examples` assigned only for Outlines, so a plain scenario carries none — red: *"…00_resolve-by-ref.feature: examples array"*. **(4) A consumer becomes aware of the key.** `src/work.mjs` gained a line reading `s.examples.length` — red: *"src/work.mjs remains unaware of the additive key"*. |
| FF-5705 | The ratchet is pure over injected inputs; discharge is scoped to the owning item's register at the base commit; no justification comment is read | `test/arch/acd-ratchet-pure-and-discharge-scoped.test.mjs` — 3 tests green 2026-08-28. The declared file now exists (`F-57-03-3` closed by landing it, never by re-marking `pending`), and the `pending` marker is dropped from its `ARCHITECTURE.md` declaration. **AMENDED at the milestone gate** (`F-57-M-4`): the frozen import set admits `./declared-id.mjs` as a third member and the control gained the admission's own condition as a leg — the admitted leaf must import nothing and reach no I/O, and the engine may take only the ADR id fragment from it. | **Six probes, one per leg**, each a temporary edit restored byte-exactly afterwards and the control re-run green on the restored bytes (`src/work-ratchet.mjs` `sha256:eb67fdf4f9a4cf4e…`, `src/commands/ratchet.mjs` `sha256:27b83cdbaaf2c349…`, both compared after restore). **(1) The engine gains a filesystem read.** `import { readFile } from "node:fs/promises";` added to `src/work-ratchet.mjs` — red on the frozen import set: *"Expected values to be strictly deep-equal … + 'node:fs/promises', './feature-parse.mjs'"*. **(2) The boundary stops handing the completed observation to the pure engine.** The call site became `evaluateRatchet({ ...observation, baseCommit: resolvedBase.commit })` — red: *"The input did not match the regular expression /evaluateRatchet\(observation\)/u"*. **(3) The no-base refusal stops exiting non-zero.** `exit: (result) => (result.ok ? 0 : 1)` → `exit: () => 0` — red: *"Expected values to be strictly equal: 0 !== 1"*. **(4) THE TIMING LEG, reached on its own.** The boundary reverted to `citationsByPath[file] = adrIdsOnly(after)` — red: *"The input did not match the regular expression /citationsByPath\[file\] = adrIdsOnly\(before\)/u"*. Probes (1)–(3) never reach this assertion; it is the half that keeps a comment written WITH the weakening out of the inputs. **(5) THE SCOPE LEG, reached on its own.** The owner match was dropped from the discharge resolver (`cited.find((citation) => authorities.has(citation.id))`) — red on the bare-id row: *"+ 'discharged'"*. This is the assertion that refuses `F-57-03-1`'s measured bypass. **(6) An unresolved owner falls back to a default.** `String(owningItemRef ?? "")` → `String(owningItemRef ?? "57")` — red: *"+ 'discharged'"*. **FOUR MORE at the milestone gate, for the amendment — a widened frozen set that is not itself probed is a set that has stopped being frozen.** **(7) The widened set is still CLOSED.** A fourth import (`./work-counters.mjs`) added to the engine — red on the three-member deep-equal. **(8) THE ADMISSION IS CHECKED, NOT TRUSTED.** `import path from "node:path";` prepended to `src/declared-id.mjs`, the newly admitted leaf — red: *"the admitted import is a zero-import leaf — the engine's purity cannot be laundered through it"*. This is the leg that stops one admitted import laundering an arbitrary dependency tree in behind it, and probe (7) never reaches it. **(9) THE BORROW STAYS NARROW.** The engine given `headingCaptureRe("ADR")` — red: *"The input was expected to not match /headingCaptureRe|headingSplitRe|qualifiedRefsIn|QUALIFIED_REF/"*. The narrowness is the invariant: the leaf's own header records that the shipped ADR form carries no `\b` deliberately, so adopting its whole heading regex would change `authorityIds`' behaviour. **(10) The engine re-spells the fragment.** `idForm("ADR").id` → the `"ADR-\\d+"` literal — red here on the fragment leg **and simultaneously on `66/FF-6604`**, which is the defect this amendment exists to close. **A probe that found dead code rather than a leg.** The first aim of (6) mutated a separate `owner === ""` guard and NOTHING went red — the guard was unreachable, because a parsed citation's item is either `null` or a digit string and neither equals `""`. The guard was removed rather than left as an unprobeable branch, and (6) re-aimed at the assertion it was supposed to protect. |
| FF-5706 | No oracle in this milestone is a count, and no record declares an arch-failure count as its metric | `test/arch/acd-oracle-is-a-message-not-a-count.test.mjs` — 2 tests green 2026-08-28. Landed at the MILESTONE gate, not by a story: `F-57-03-4` established that no story can carry it, and the accept rule admits no `pending` marker here, so what cleared it was landing the declared file. Registered in its own labelled block in `scripts/test.mjs` (imported **and** spread, per ADR-007 §5). | **Seven probes**, each a temporary edit to the SUBJECT — never to the control — restored byte-exactly afterwards and the control re-run green on the restored bytes (`src/work-ratchet.mjs` `sha256:eb67fdf4f9a4cf4e…`, `src/commands/ratchet.mjs` `sha256:27b83cdbaaf2c349…`, `src/work-counters.mjs` `sha256:083a8c23bc1efe7a…`, `src/commands/counters.mjs` `sha256:94899489c4d0a489…`, `src/bundle/loops/build-to-green-watcher.md` `sha256:414ca321ad832885…`, `src/bundle/loops/run-liveness.md` `sha256:289f0a4ad21b46fe…`, each compared after restore). **(1) A test-runner surface.** `import { run } from "node:test";` appended to `src/work-ratchet.mjs` — red: *"names a test-runner surface — a module that reads a runner's report is one step from an oracle over its tallies"*. **(2) A tally IDENTIFIER.** `const failureCount = 0;` appended to `src/commands/ratchet.mjs` — red: *"carries a pass/fail tally identifier"*. This is the leg that separates a COUNT from a STATE: the vocabulary requires an explicit count noun welded to the pass/fail word, so `failureReason`, `terminalFailure` and `state === "failed"` — all live in these modules — are deliberately not tallies and none of them reddens it. **(3) THE COMPARISON LEG, left side.** `const worse = failures.length > 0;` appended to `src/work-counters.mjs` — red: *"compares the length of a pass/fail collection"*. Probe (2) never reaches this assertion: `failures` carries no count suffix. **(4) The comparison leg, RIGHT side, reached on its own.** `const worse = 0 < failures.length;` appended to `src/commands/counters.mjs` — red on the mirror. Probe (3) never reaches it; a one-sided regex would have read as guarding both. **(5) NON-VACUITY of §1.** `src/work-ratchet.mjs` truncated to `// stub` — red: *"read 7 bytes — the module was actually walked"*. Without this leg a renamed or emptied module would pass every §1 assertion by having nothing to match. **(6) ADR-006 §2 — the banned metric.** `counter: whether the acceptance criteria got smaller` → `counter: the count of failing fitness functions` on `build-to-green-watcher.md` — red: *"counter declares an arch-failure count — the one metric 56 proved is IMPROVED by banking real violations"*. **(7) NON-VACUITY of §2.** One shipped record moved aside — red: *"the shipped registry loaded 13 nodes"*, the census floor. Probes (1)–(6) all iterate a population; a registry that loaded nothing would satisfy §2 in silence. **The §2 overlap with `FF-5708`'s third test is deliberate and is recorded at the control's head:** FF-5706 is DECLARED as enforcing both legs, so the file its declaration cites must enforce both — a control that silently delegates half of itself reads as landed while half of it is unguarded, which is `F-57-03-2`'s shape exactly. |
| FF-5707 | Every declared counter resolves to a registered command or an exported symbol, and none resolves into the work tree | `test/arch/acd-watcher-counter-resolves.test.mjs` — 1 test green 2026-08-28. The declared file now exists and the `pending` marker is dropped from its `ARCHITECTURE.md` declaration; `aof work doctor 57` no longer reports it. | **Five probes, one per leg**, each restored byte-exactly and the control re-run green on the restored bytes (shas in `FF-5708`'s cell). **(1) The pointer names no registered command.** `measurement: [command:work:ratchet]` → `[command:work:ratchett]` — red: *"watcher:build-to-green-watcher: command:work:ratchett names no registered command"*. This is the leg that makes the pointer a resolution rather than a spelling. **(2) A prose pointer while `determinism: counter`.** `measurement: [command:work:counters]` → `[prose:src/commands/counters.mjs]` — red: *"measurement entry prose:src/commands/counters.mjs is a pointer, not prose … 'prose' !== 'pointer'"*. **(3) The reviewable counter phrase drifts.** `counter: how often a run needed a retry or a hand` → `counter: retries` — red: *"+ 'retries', − 'how often a run needed a retry or a hand'"*. The counter-metric wording is the reviewable half (ADR-001 §4), so it is pinned rather than merely non-empty. **(4) Determinism flipped to judge.** `determinism: counter` → `judge` — red: *"'judge' !== 'counter'"*. **(5) NON-VACUITY, reached on its own.** `kind: watcher` → `kind: actor` on one record, so the census loses it without any pointer changing — red: *"expected the three shipped watchers, found 2 … 2 !== 3"*. Probes (1)–(4) all iterate the census; without this one a census that found nothing would pass every other leg silently. |
| FF-5708 | The day-one pairing table is complete, and the shipped registry produces zero gating findings | `test/arch/acd-day-one-pairing-complete.test.mjs` — 3 tests green 2026-08-28. The declared file now exists and the `pending` marker is dropped from its `ARCHITECTURE.md` declaration; `aof work doctor 57` no longer reports it. | **Ten probes across the two controls**, each a temporary edit to one shipped record restored byte-exactly afterwards and the control re-run green on the restored bytes (`build-to-green-watcher.md` `sha256:414ca321ad832885…`, `review-fix-rereview-watcher.md` `sha256:b0c644879458ae86…`, `autonomous-cascade-watcher.md` `sha256:f8587c64b80e3ea1…`, all three compared after restore). **(1) THE INVERSE OBLIGATION — the watcher side.** `monitoring: [loop:autonomous-cascade]` deleted outright — red: *"watcher:autonomous-cascade-watcher: watches at least one loop"*. **(2) THE INVERSE OBLIGATION — the LOOP side, reached on its own.** Probe (1) does NOT reach the assertion that mirrors `loop-unpaired-optimizer`: it trips the watcher-side `monitoring.length >= 1` first and returns. So the edge was **re-aimed** rather than removed — `monitoring: [loop:autonomous-cascade]` → `[loop:run-resilience]`, a real non-optimizing loop — leaving `watches at least one loop` satisfied while the optimizer loses its only inbound edge. Red on the leg that matters: *"loop:autonomous-cascade: has an inbound monitoring edge from a watcher"*. This is the probe the register's own inverse-obligation note asks for; probe (1) alone would have demonstrated the weaker claim. **(3) Shared measurement.** `measurement: [command:work:counters]` → `[prose:src/bundle/commands/code-review.md]`, the artifact the watched loop already reads — red: *"watcher:review-fix-rereview-watcher: measurement is a command pointer … + undefined, − 'command'"*. **(4) The counter restates the controlled variable.** `counter: findings raised after the item was accepted` → `counter: open review findings`, the loop's own `controlled:` — red: *"counter differs from loop:review-fix-rereview's controlled"*. **(5) ADR-006 §2 — an arch-failure count as the metric.** `counter: whether the acceptance criteria got smaller` → `counter: the count of failing fitness functions` — red: *"watcher:build-to-green-watcher: counter is not an arch-failure count"*. **A probe that found an unreachable assertion rather than a leg.** The self-watch aim (`monitoring: [watcher:build-to-green-watcher]`) went red on the registry's error-severity leg (`loop-bad-value`) and never reached `assert.notEqual(edge.raw, watcher.id)` — that assertion is dead code, because the `kind === "loop"` guard on the same edge runs first and a watcher's own id always resolves to a node of kind `watcher`. Recorded as `F-57-05-2` rather than silently left as an unprobeable branch. |

## Findings

<!-- The register. The `id` ALONE in the first cell, allocated HERE by the single writer at the
     moment of landing — never read-then-allocated, because a stale read looks exactly like a fresh
     one. Every finding below was observed while verifying 57/00; none of them is 57/00's code, and
     that attribution is the finding rather than an aside. -->

| id | observed | type | severity | triage | routed to | status |
|---|---|---|---|---|---|---|
| F-57-00-1 | **Milestone 53's `FF-5308` is red on `main`, and the widening that broke it landed in a sibling story's commit.** `arch/53 FF-5308 (acd-loop-scope-guard)` pins `inRange` in `src/work.mjs` byte-identical to its milestone base; commit `830e4f9` (*"feat(work): a story span `NN/MM-PP` is a ref that find and next both admit"*) appended a `parseStorySpan` branch to that exact function, moving the digest `0d32be8b255cea94…` → `c6f089601bf6f872…`. The guard's own message names the rule it is enforcing: *"widening it here rather than in the milestone that pays item 49 is what this leg refuses"*. Not 57/00 code — 57/00 touches `src/work-loops.mjs` alone — and 57/00's own lane is green with or without it. | regression | blocker (for item 84) | route to the owning item; it must not be accepted red | `84` (story span ref, unaccepted) | open |
| F-57-00-2 | **Four fitness functions are red on `main` from before this milestone, and a story gate is where that stops being invisible.** `arch/ADR-002` and `arch/graphify-backend-selection` both report `config.memory?.backend` read in 7 locations against a declared 1 (`commands/init-update.mjs`, `work-init.mjs` ×5, `work-memory.mjs`); `arch/m42-item-3` reports 5 new silent-catch sites over baseline (`board-worker-stream.mjs`, `bundle/hooks/run-heartbeat-enqueue.mjs`, `commands/mesh-terminal-resume.mjs`, `mesh-launcher-lock.mjs`, `work-observe.mjs`); `arch/FF-6601` reports a second Gherkin recogniser under `src/`. Every file named was last committed between 2026-06-21 and 2026-08-24 — all before this story — so none is attributable to 57/00. | baseline-drift | non-blocker | defer to backlog; each needs its owning milestone to re-pin or repair, not a re-measure here | backlog | open |
| F-57-00-3 | **`aof work validate` over the whole stream reports one issue: `78` declares `depends: [52, 53, 79]` and `79` is a story, not a milestone or uat item.** Pre-existing and unrelated to this story; `aof work validate 57/00` and `aof work validate 57` both PASS. | stream-hygiene | non-blocker | defer; the edge is 78's to re-point or drop | `78` | open |
| F-57-02-1 | **`FF-5704`'s differential reconstructs its "before" by stripping this story's own `// BEGIN/END ADR-005 examples` markers from the CURRENT source, so an edit made OUTSIDE those markers moves both sides of the comparison together and is invisible to the control.** This is not hypothetical: the story's own diff contains one such edit — the push site was refactored from `scenarios.push({…})` to `const scenario = {…}; scenarios.push(scenario);`, outside any marker. The two are semantically identical, and that was established by measurement rather than by reading: an independent differential against the real HEAD bytes over the whole corpus (803 files, 5,384 scenarios) reports **0 mismatches**. What is missing is a STANDING control saying so — the HEAD differential was run once, here, by hand. | control-scope | non-blocker | defer to backlog; the control's stated scope ("before and after **the widening**") is honest as written, and widening it to "before and after **the story**" needs a pinned base commit, which is `57/03`'s ratchet subject rather than a parser change | backlog | open |
| F-57-02-2 | **Milestone 66's three re-measurement contracts are red on `main` because the state they enumerate has moved, exactly as their own failure messages predict.** `wiki/work/53_.../01_story_loop-engine/tasks/04_gate-order-and-cap.feature` — the single live file 66/00 pinned as unparseable — now parses with `structural: []` (it was repaired), and milestone 53's status is `done`, not the `in-progress` the contract enumerates. The messages name the remedy: *"IF THIS IS RED because that file was REPAIRED, this is a re-measurement notice: record the new population … it is not a parser defect."* Verified independent of this story: identically red with `src/feature-parse.mjs` at its HEAD bytes. | baseline-drift | non-blocker | defer; 66 owns the table and must re-measure it — the contract enumerates by re-measurement, never by recall | `66` | open |
| F-57-02-3 | **Milestone 66's two shrink-only marks on `src/work.mjs` are red from growth committed before this story.** The file is 1,405 lines against 66/00's `1,209` shrink-only mark, and its exported-signature set has moved. Attribution by commit: `830e4f9`, `8167486` and `0a22fb1` are the only commits to touch it, all landed before 57/02, and `src/work.mjs` is byte-identical between HEAD and this working tree. Same growth `F-57-00-1` attributes to `830e4f9` against milestone 53's `FF-5308`; this is a second, distinct pair of controls reporting it. | baseline-drift | non-blocker | defer; 66 must re-pin or repair its marks. The blocker half of this growth is already routed — see `F-57-00-1`, open against item `84` | `66` | open |
| F-57-03-1 | **Discharge clears against any `ADR-NNN` token anywhere in the weakened file — the header comment included — so the qualifier ADR-004 §5 calls "cited by the weakened artifact" is, in this repository, satisfied by boilerplate.** The boundary harvests with `adrIdsOnly(after)`, a regex over the whole head text; `citationsFor` then accepts any harvested id that resolves as a heading in the owning register at base. Measured, not argued: a real closed→open weakening in a file headed `// milestone 57 / story 03 — the contract-integrity ratchet (ADR-004).`, run against this milestone's own `ARCHITECTURE.md` bytes, returns `disposition: "discharged"`, `authority: "ADR-004"` — where the contract's stated outcome is *fired*. **663 of 944** test files here (70%) already carry such a token, and `ADR-001`–`ADR-010` are the standard numbering in every milestone's register, so the discharge is available to nearly every weakening this ratchet can see. Two of §5's three qualifiers (owning register, at base commit) are implemented; the third is not, and it is the one 56's review measured as load-bearing — *"the rule reads true repo-wide and clears virtually every weakening"*. Directly contradicts `tasks/04` scenario *"the justification comment is never read"*, whose Then is *"the leg is reported as fired"*. | contract-violation | **blocker** | new `@bug` (+ `@finding-F-57-03-1`) task scenario landed as `tasks/05_the-citation-must-be-pre-existing-and-owned.feature`, then fixed: the citation is harvested from the artifact at the BASE commit and must NAME the owning item. The identical observation now returns `fired` | `57/03` | closed 2026-08-28 |
| F-57-03-2 | **`FF-5705` declares three legs and enforces two; the unenforced one is exactly the leg `F-57-03-1` breaks.** The control asserts the engine's frozen import set, the absence of `node:fs`/`child_process`/`process` in the engine, and that the boundary calls `evaluateRatchet(observation)` — but nothing reaches *"no code path reads a comment out of the weakened artifact"*. Established by probe rather than by reading: the two enforced legs each went red under a targeted mutation and the control stayed **green** with the measured comment-harvest bypass in place, so there is no mutation of the citation harvest that this control refuses. A declared invariant with no assertion is a `pending` control that reads as landed. | control-gap | **blocker** | fixed with `F-57-03-1` — the control gained the third leg (`discharge reads the base text and only a citation naming the owning item clears`) and it is red-probed twice, once per half. A third probe found an unreachable guard, which was removed rather than left unprobeable | `57/03` (architect) | closed 2026-08-28 |
| F-57-03-3 | **`FF-5705`'s declaration cites `test/arch/acd-ratchet-pure-and-discharge-scoped.test.mjs`, which is not a file on disk.** The control that landed is `test/arch/acd-ratchet-engine-pure.test.mjs`. `aof work doctor 57` reports it as `control-unresolved`, downgraded to `warn` by the standing `pending` marker — and a warn-only doctor result does not fail `aof work validate`, which PASSes for `57/03`. Left uncorrected here deliberately: the register entry is rewritten by the `F-57-03-2` fix (the file gains a leg and may be renamed to match its declaration), so correcting the citation now is churn ahead of that change. What clears it is landing the declared file or amending the declaration — never re-marking it `pending`. | record-drift | **blocker** (accept rule) | closed by LANDING the declared file: the control was renamed to `test/arch/acd-ratchet-pure-and-discharge-scoped.test.mjs`, its `ARCHITECTURE.md` `pending` marker dropped, and `scripts/test.mjs` re-pointed. `aof work doctor 57` no longer reports it | `57/03` (architect) | closed 2026-08-28 |
| F-57-03-4 | **`FF-5706` is assigned to `57/03` by this document's own ownership note, but half of it is over `57/05`'s surface and it has not landed.** The note reads *"57/03 carries FF-5705 and FF-5706"*; `FF-5706`'s second leg is *"no record in `src/bundle/loops/` declares an arch-failure count"*, and the story partition gives `src/bundle/loops/` to `57/05`. Its first leg (*no module added by 57 compares a pass/fail tally*) is checkable against `57/03`'s two modules today and holds — neither `src/work-ratchet.mjs` nor `src/commands/ratchet.mjs` compares a tally to decide a gate's health; the ratchet's own oracle is a disposition, not a count. So the control cannot be completed by this story, and its ownership row is the thing that is wrong. | ownership | non-blocker | re-assign `FF-5706` to `57/05`, or split it into the per-story leg and the registry leg — settled at the MILESTONE gate, which is where a milestone-level register is the single writer's to correct. Neither re-assignment nor a split was needed: no story can carry the control, so it is the milestone's own, and the accept rule admits no `pending` here. The declared file was LANDED (`test/arch/acd-oracle-is-a-message-not-a-count.test.mjs`), registered in its own labelled runner block, red-probed on seven legs, and the `pending` marker dropped from its `ARCHITECTURE.md` declaration. This document's ownership note is corrected with it | `57` (architect) | closed 2026-08-28 |
| F-57-04-1 | **The escape counter's defining moment is `updated:`, which is not acceptance — and the story's own rule says that makes it unmeasurable.** `src/commands/counters.mjs:27` reads `acceptedAt: meta.status === "done" ? meta.updated ?? null : null`. No work record carries an acceptance timestamp: `acceptedAt` appears in `src/` only inside this story's own two modules, and `aof work status <ref> done` stamps `updated:`, the same field every other status move and the process's own "bump `updated:` on every record you touch by hand" rule also write. So the moment the whole counter is defined against drifts forward with unrelated edits, and the drift can only ever *remove* escapes — a bias toward the flattering number, which is the failure class `tasks/02` exists to refuse. Measured over this repository: of **284** accepted records, **109** were committed to after the commit that set `status: done`, and in **3** the `updated:` value itself moved forward (`13/SPEC.md` 2026-06-23 → 2026-06-25; `55/00/STORY.md` 2026-08-26 → 2026-08-27; `73/STORY.md` 2026-08-16 → 2026-08-20). Any finding raised against `55/00` on 2026-08-27 is now silently not an escape. The engine's comment discloses the *coarseness* of a date-granular stamp and treats it conservatively (`T23:59:59.999Z`); it does not disclose that the stamp is not the acceptance moment. | proxy-substitution | non-blocker | defer to backlog. Closing it needs a recorded acceptance fact, and this story forbids itself exactly that (*"adding writes to make a counter possible is 68's territory"*) — so the fix is a work-record field with a writer, owned by whoever adds it, after which this counter reads it instead. Meanwhile the counter still refuses to report a fake zero, which is the property the pairing gate rests on | backlog | open |
| F-57-04-2 | **The escape line of the CLI render prints a property key as English.** `renderCounter(counter, noun, denominator)` uses its third argument as both the object key and the display noun, which reads correctly for the intervention line (`runs`) and not for the escape line, whose denominator key is `feedbackRecords`. Driven directly on the measured branch, the delivered command emits `finding escapes: 1 across 2 feedbackRecords`. Reached by no test: the behavioural suite drives the pure engine only, and `test/arch/acd-work-counters-read-only.test.mjs` asserts the module's structure, not its output. The `--json` envelope is unaffected. | presentation | non-blocker | defer to backlog; the fix is a separate display noun beside the key, and no consumer parses the rendered line | backlog | open |
| F-57-05-1 | **The three watcher records ship in the bundle and are not installed in `aof`'s own registry, so the framework still fails the rule this story exists to make it satisfy.** Measured on this checkout, not inferred: `loadLoops(".aof")` returns **11 nodes, 0 watchers**, and `aof work loops validate` still prints `loop-unpaired-optimizer` for `loop:autonomous-cascade`, `loop:build-to-green` and `loop:review-fix-rereview` — the identical three lines `57/00`'s `OUTCOME.md` recorded as its open gap, whose **discharge condition names this story**. The delivered diff adds `src/bundle/loops/*-watcher.md` ×3 and three `bundle.json` members and stops there; every prior commit to touch `src/bundle/loops/` shipped the installed copy in the same commit (`8aa65d3`, 55/00: 4 files, 2 records, both halves). The behavioural scenario *"the records install by the ordinary update path"* is green because it installs into a **temp** repo — it proves the path works, and cannot see that the path was never walked here. No control catches the class: `FF-5313` asserts bundle→render parity, never bundle→`.aof/loops/` parity. | delivery-gap | **blocker** | **fixed inline at this verify** — the three records were installed byte-identically into `.aof/loops/` (`414ca321…`, `b0c64487…`, `f8587c64…`), taking the registry census from **11 nodes / 0 watchers to 14 / 3** with zero error findings and all 14 members byte-identical. **One half of the evidence above was mis-attributed and is corrected here rather than amended away:** `aof work loops validate` still prints the three `loop-unpaired-optimizer` lines after the fix, because `isGraphNode` (`src/work-loops-checks.mjs:103`) admits `loop`/`actor`/`anchor` and not `watcher` — that is `57/00`'s SECOND gap, whose discharge condition is `57/01`, not this story. The half that was genuinely `57/05`'s is the census, and it moved. Simulating `57/01`'s widening over the now-installed registry returns **0** unpaired, so the install is what makes that gate land green. The recurrence control landed too: `FF-5313` gained a bundle→`.aof/loops/` byte-parity leg, red-probed on the exact shape of this defect. Original close condition, for the record: land `.aof/loops/{build-to-green,review-fix-rereview,autonomous-cascade}-watcher.md` byte-identical to their `src/bundle/loops/` sources — the three files a scoped install writes, and nothing else (a full `aof work update --dry-run` here also wants `.aof/templates/work/story/STORY.md`, `.claude/hooks/aof/run-heartbeat-enqueue.mjs` and `.aof/frozen-set.jsonc`, none of them this milestone's). Recommended alongside, an architect's call on shape: a standing control asserting every `.aof/loops/*` bundle member is present and byte-identical on disk, so the next record cannot ship half-installed. The urgency is `57/01`, which is `blocked` behind this story and turns `loop-unpaired-optimizer` into an **error**: accepting `57/05` unblocks the gate onto a tree that fails it — the exact hazard the story's own Notes and ADR-007 §6 ordering edge exist to avoid. | `57/05` (developer) | closed 2026-08-28 |
| F-57-05-2 | **`FF-5708` carries an assertion no mutation can reach.** `assert.notEqual(edge.raw, watcher.id, "…does not watch itself (ADR-001 §7)")` sits behind `assert.equal(nodes.get(edge.raw)?.kind, "loop")` on the same edge, so reaching it requires the watcher's own id to resolve to a node of kind `loop` — impossible, since that id resolves to the watcher. Established by probe, not by reading: aiming a watcher's `monitoring` edge at itself went red on the registry's error-severity leg (`loop-bad-value`) and the self-watch assertion was never evaluated; a reachability read of the loaded model then confirmed `nodes.get("watcher:build-to-green-watcher").kind === "watcher"`. Same class as `57/03`'s probe (6), which found an unreachable `owner === ""` guard and removed it. The invariant itself is not unguarded — a self-referential watcher edge is refused earlier and louder, by the loader — so nothing ships unprotected; what is wrong is a line that reads as a leg and is not one. | control-gap | non-blocker | **fixed inline at this verify** — the assertion was REMOVED rather than re-aimed, following `57/03`'s precedent with its unreachable `owner === ""` guard. Re-aiming could not have worked: reaching it needs a self-referential `monitoring` edge, and `watcher` is not in `ENDPOINT_SCHEMES`, so `monitoring: [watcher:…]` is ungrammatical in the first place. Confirmed by probe that the invariant stays guarded without it — the loader raises `loop-bad-value` at **ERROR** severity on that shape and `FF-5708`'s zero-error leg goes red on it, which is what the removed line was redundantly duplicating. A comment at the site records why there is deliberately no assertion there. | `57/05` (architect) | closed 2026-08-28 |
| F-57-01-1 | **`FF-5703`'s exit-ownership leg is spelled `/\bexit\b/u` and catches one identifier rather than the family it reads as.** The assertion is `assert.doesNotMatch(checksSource, /\bexit\b/u, "the pure check module decides no process exit")`. Established by probe, not by reading: adding `export const exitFor = (findings) => (findings.some((f) => f.severity === "error") ? 1 : 0);` to `src/work-loops-checks.mjs` left the control **green**, and so did `export const gateExitCode = (findings) => { if (findings.some((f) => f.severity === "error")) process.exitCode = 1; };` — the pure check module can literally set the process exit code and this leg does not move. Only a bare `exit` identifier reddens it. Nothing else covers the gap: 52's `FF-5205` and 55's `FF-5503` purity regexes enumerate `node:fs`/`readFile`/`process.cwd`/`Date.now` and never `process.exit`, and the behavioural contract drives the FACE's half (`cli.exit(result)` is correct and side-effect-free) rather than the check's. ADR-003 §5's claim that the exit lives only on the face is therefore half-guarded. Nothing ships wrong — the delivered module contains no exit decision — so this is a control that reads stronger than it is, not an unprotected invariant. | control-gap | non-blocker | **deliberately NOT fixed at this verify, and the reason is evidence.** The fix was written (strip comments, then match `/exit/iu`, which reddens on all three spellings — measured) and then **reverted**, because `test/arch/acd-loop-finding-envelope.test.mjs` is one of the two accepted milestone-52 suites behind 53's ACCEPT-02 diff ceiling: every region that may move carries an explicit `grantedBy`, and `acd-loop-suite-registration` went red on the edit — *"the two accepted milestone-52 suites carry ONLY their pinned narrowed assertions; every other byte is digest-frozen"*. The ceiling's own note names the hazard exactly (*"an absolute digest taken at HEAD certifies whatever is already there, including a breach it was written to catch"*), so advancing the residue over my own verify-time edit would have been that hazard rather than a fix. The remedy is an architect's: widen the leg, declare the region with its `grantedBy`, and advance ACCEPT-02's residue as one reviewed act. **The ceiling catching this is the instrument working**, and is recorded as such. | `57` (architect) | open |
| F-57-01-2 | **The `/aof:validate` wrapper that actually runs carried no loop-registry gate — the bundle source did, and only the bundle source is read by the test.** `tasks/03` scenario *"the aof validate procedure runs the loop registry gate"* asserts against `src/bundle/commands/validate.md`. Measured on this checkout: `.claude/commands/aof/validate.md` contained **zero** occurrences of `aof work loops validate` and stepped straight from `aof work validate` to `aof work doctor`; `.opencode/commands/aof/validate.md` and `.codex/skills/aof-validate/SKILL.md` likewise. So the delivered procedure — the one an operator or an agent session actually executes — did not run the gate this story exists to arm, while its contract was green. Identical in class to `F-57-05-1`: a green test against a bundle source whose install path was never walked, and no control asserts bundle→wrapper parity for commands (the `FF-5313` leg `F-57-05-1` added covers `.aof/loops/` only). | delivery-gap | **blocker** | **fixed inline at this verify.** The wrapper was rendered through the ordinary path — `aof work init` into a temp repo, whose `.claude/commands/aof/validate.md` was diffed against the installed one to confirm the change set is exactly this story's (the loop-gate step, the renumbering it forces, the loop lane in the report, the two-hard-gates PASS rule, and nothing else) before installing. `.opencode` and `.codex` were rendered by their measured transforms, each verified against an up-to-date pair first (opencode = `description:`-only frontmatter + the identical body; codex = its fixed preamble + the claude body verbatim). A **scoped** install, not `aof work update`, for `F-57-05-1`'s reason: a full update also rewrites 28 unrelated bundle members. Confirmed at the source rather than by inspection — the installer itself now reports *Would keep* for all three faces. Recurrence control recommended, an architect's call on shape: the `FF-5313` bundle→disk parity leg extended from `.aof/loops/` to the command wrappers, so the next command change cannot ship half-installed. | `57/01` | closed 2026-08-28 |
| F-57-01-3 | **`57/00`'s `OUTCOME.md` still declares its watcher gap `open` after `F-57-05-1` discharged it.** The gap *"No watcher exists in the shipped registry"* names its discharge condition as *"57/05 ships the day-one pairing table"*, and its body states `.aof/loops/` holds eleven records and no watcher. `F-57-05-1` installed the three watcher records at `57/05`'s accept, taking the census to 14 nodes / 3 watchers, but the gap's `Status:` was not flipped. `aof work memory ingest` unions every item's records into one recall surface, so the next milestone's refine recalls open debt that no longer exists. (The two gaps whose discharge condition names `57/01` are discharged by this accept, in the same file.) | record-drift | non-blocker | defer; `57/05` owns the flip — it is that story's discharge, recorded at its accept, and rewriting another story's outcome beyond this story's own discharge scope is not a verify-time edit here. **Closed at the milestone gate instead — see `F-57-M-7`**: `57/05` accepted without making the flip, and the milestone gate is where this milestone's records have one writer | `57/00` (fixed) | closed 2026-08-28 |
| F-57-01-4 | **28 bundle members are stale on disk after this story's three are installed.** Measured with `aof work update --dry-run`: 9 under `.claude/` (six agent definitions, `add-story`, `code-review`, `feedback`), 9 under `.opencode/`, 9 under `.codex/`, plus `.aof/templates/work/story/STORY.md`. None is `57/01`'s and none is `57`'s — they are other milestones' command and agent changes whose install path was never walked, the same class `F-57-01-2` and `F-57-05-1` each found one instance of. The systemic reading is that bundle→disk drift is the repository's normal state rather than an incident, because nothing gates it. | baseline-drift | non-blocker | defer to backlog; the remedy is one `aof work update` pass (a chore-shaped act touching several milestones' files, not `57/01`'s to perform) plus the standing parity control recommended in `F-57-01-2` | backlog | open |
| F-57-M-1 | **`57/04`'s command boundary opens a SECOND HOME for the autonomous attempt ceiling, and three fitness functions in two other milestones go red naming the file.** `src/commands/counters.mjs:73` reads `ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 3`. Milestone 53's `FF-5310` pins the resolver set for that key to exactly four modules (`run-retry`, `resume`, `run-start`, `loop`) and milestone 69's `FF-6901` extends the same classifier; both report *"CAP-MUT-01/02: src/commands/counters.mjs RESOLVES work.autonomous.maxAttempts — a new resolution site is a second home for the bound, not a convenience. Supplying a default is what makes a module a resolver."* Three tests red, all naming this one line. **Invisible to `57/04`'s own lane by construction**: the story ran its own scenarios and its own `acd-work-counters-read-only` control, and neither is the cap classifier — this is precisely the class the process defers to the milestone gate. **The obvious fix is the one this milestone exists to refuse** — adding the file to `EXPECTED_READERS` is editing the control to admit the violation. Neither remaining shape is admitted either: dropping the `?? 3` makes the module an *inspector*, which `CAP-MUT-03` closes to one admitted module. So the invariant, not the code, is what has to move, and that is another milestone's register. | regression | **blocker** | **fixed at this gate, and the recorded set was NOT widened.** `src/commands/run-retry.mjs` — the verb that spends an attempt, and already one of the four admitted resolvers — now carries its cap read inside an exported `resolveAttemptCeiling(config)`, which IS its recorded resolver site (the literal 3 stays in the statement the read belongs to). `src/commands/counters.mjs` imports it and spells the key nowhere, so it is no longer a cap site at all. The bound keeps four homes and the counter's classification and a retry's actual ceiling are now the same number by construction rather than by two modules agreeing. Three controls green. Red-probed three ways, so the green is the fix's and not an admission's: re-spelling the key in the counter reds all three legs again; `resolveAttemptCeiling` returning a bare `3` reds them as a stale permission (`CAP-MUT-04`); and a `?? 5` fallback reds them as a second literal bound (`CAP-MUT-06`) | `57/04` (fixed) | closed 2026-08-28 |
| F-57-M-2 | **`57/05` grew `src/bundle/**` from 79 files to 82 without moving the census literal that counts it, and two suites went red in other milestones' names.** `test/bundle-asset-manifest-complete.test.mjs:81` asserted `direct.length === 79`; story 87's *asset census that counts the bundle tree* cross-checks that literal against the real tree and reported *"re-measured to the smaller tree: 79 !== 82"*. The three new files are exactly `57/05`'s watcher records (loops 11 → 14); every other category is unmoved. **The recurrence is the finding, not the count.** That file's own note has argued the rule — *"THE LITERAL MOVES IN THE SAME DIFF AS THE TREE"* — through four prior recurrences it names by hand (`d5cea70`, milestone 53's gate, milestone 69's `F-69-V21`, milestone 55's `F-55-M-2`, story 87). This is the fifth move, and the fourth time the diff that caused it did not pay it: a prose reminder addressed to each future author has now been obeyed by the causing diff zero times out of five. | baseline-drift | **blocker** | **fixed at this gate**, by the remedy the note itself mandates — the literal moved to the new truth (79 → 82), not relaxed to a bound, with a dated entry appended in the file's own convention. Both suites green. The durable half, that a prose reminder is the wrong instrument for a census which must move with its subject, is routed to `aof:retrospective` rather than argued a sixth time | `57` (fixed) | closed 2026-08-28 |
| F-57-M-3 | **The derived bundle manifest was never re-derived after this milestone changed the bundle, and seven gates were red over a file nobody edited.** `src/bundle/manifest.json` is generated (`scripts/generate-bundle-manifest.mjs`, whose header reads *"Run after changing any bundle body; a fitness function fails CI if the shipped manifest drifts from the rendered bundle"*). `57/05` appended three asset members to `src/bundle/bundle.json` and `57/01` rewrote `src/bundle/commands/validate.md`; the manifest stayed at its committed 100 entries against a rendered set of 103. Seven red: `bundle/manifest` ×2, `arch/ADR-002` (manifest hashes, membership) ×2, `migrate-cmd/distribution`, `80/00 outcome-home`, `verification-template`. (`87/00` and `bundle-asset-manifest-complete/00` were red beside them for the neighbouring reason and belong to `F-57-M-2`.) **The manifest is not a record either story is asked to hand-edit**, which is exactly why neither noticed: it is derived, so the diff that changes the bundle must re-derive it, and nothing says so at the moment of the change. | record-drift | **blocker** | **fixed at this gate** by re-running the generator. The regenerated diff is exactly this milestone's change set and nothing else — the three watcher asset entries plus the two `validate` faces' content addresses (`claude` command, `codex` skill); measured against `HEAD`, no third entry moves. Recurrence control recommended, an architect's call on shape: extend the `FF-5313` bundle→disk parity leg `F-57-01-2` already asks for, so the shipped manifest must equal a fresh render | `57` (fixed) | closed 2026-08-28 |
| F-57-M-4 | **`57/03`'s two new modules spell the `ADR-\d` id grammar a second and third time, and milestone 66's one-home rule goes red naming both.** `arch/FF-6604` (`acd-declared-id-single-home`) requires exactly one module under `src/` to carry an id pattern — `src/declared-id.mjs` — and reports `src/commands/ratchet.mjs` and `src/work-ratchet.mjs` beside it. Three literal spellings: `work-ratchet.mjs:96` (the citation form), `:106` (the heading matcher), `commands/ratchet.mjs:141` (the citation harvest). **The pattern is load-bearing where it sits** — the discharge resolver's whole job is reading `ADR-NNN` citations — so the remedy is to reach the grammar by import rather than to delete it, and `src/declared-id.mjs` already exports `ID_FORMS`, `headingCaptureRe`, `QUALIFIED_REF` and `qualifiedRefsIn`, which are the three shapes re-spelled here. **But that import is itself pinned**: `FF-5705` freezes `src/work-ratchet.mjs`'s import set to `./feature-parse.mjs` and `./work-doctor-rubric.mjs`, so the fix moves two registers in one act — 66's one-home claim and this milestone's own frozen-import claim. | regression | **blocker** | **fixed at this gate.** All three sites now compose from `idForm("ADR").id`, the fragment in 66's one home; the surrounding shapes are unchanged, so `authorityIds` and the citation harvest behave byte-identically — which matters, because the leaf's ADR form deliberately carries no `\b` and adopting its whole heading regex would newly admit `## ADR-001a`. `FF-5705`'s frozen import set is widened by one to `./declared-id.mjs` and **stays closed at three**, with the admission's condition landed as a NEW LEG of `FF-5705` rather than taken on trust: the admitted leaf must import nothing and reach no I/O, and the engine may take only the fragment. `ARCHITECTURE.md`'s `FF-5705` declaration is amended to say so. Red-probed four ways (7–10 in that control's cell), including the inverse — re-spelling the fragment reds `FF-6604` and `FF-5705` together | `57/03` (fixed) | closed 2026-08-28 |
| F-57-M-5 | **Two `autonomous-shell-out/distribution` legs are red from pins that were already stale at `HEAD`, before this milestone touched anything.** One asserts `entries.length === 96` over the whole manifest; the manifest committed at `HEAD` carries **100**. The other pins the `continue` command's content address at `b2a34c2b…`; the manifest at `HEAD` already records `5e09633b…`. Both measured with `git show HEAD:src/bundle/manifest.json`, so neither reading depends on this working tree. This milestone moves the first from 100 to 103 and does not touch `src/bundle/commands/continue.md` at all. **Deliberately NOT re-pinned here**: re-pinning would bury a drift that predates this milestone under a milestone-57 edit, and the honest record is that the contract has been red for longer than these numbers alone show. | baseline-drift | non-blocker | defer; the owning item re-pins or repairs. Same class as `F-57-02-2`/`F-57-02-3`, and `F-57-M-2`'s rule applies when it does — move the literal to the new truth, never relax it to a bound | backlog (owning item) | open |
| F-57-M-6 | **`aof work ratchet <milestone>` reports `contract: clear (0 → 0)` — a clean bill from a measurement that read nothing.** The boundary gathers features from `<itemDir>/tasks/**` alone (`src/commands/ratchet.mjs:117`) and a milestone folder has no `tasks/`, so `aof work ratchet 57` returns `contract: clear` over a before/after of zero for an item whose six stories carry 22 `@executable` scenarios. Measured rather than reasoned: the same command at `57/00` reports a real population (19 scenarios + 23 Examples rows = 42) and the milestone reports 0. **This is the exact failure mode its sibling story refused by contract** — `57/04 tasks/02` is named *absent data is not a good score*, and `aof work counters 57` correctly answers `cannot measure` for the same milestone in the same session. The build loop's counter has no `unmeasurable` disposition, so an empty scope is indistinguishable from a contract that held. It does not weaken the shipped pairing, whose watcher measures per story. | contract-gap | non-blocker | defer to backlog; the fix is either descending into child items (matching `work:counters`' scope rule) or a fourth disposition for an empty population — a contract decision for `57/03`'s owner, not a verify-time edit | backlog (`57/03`) | open |
| F-57-M-7 | **`57/00`'s `OUTCOME.md` still declared its first gap `open` after `57/05` discharged it.** Raised as `F-57-01-3` at `57/01`'s accept and deferred to `57/05`, which then accepted without making the flip. The gap *"No watcher exists in the shipped registry"* names its discharge condition as *"57/05 ships the day-one pairing table"*; that landed at `F-57-05-1`, and the body still read *".aof/loops/ holds eleven records and no watcher"*. Deferred twice is how a record stays wrong. | record-drift | non-blocker | **fixed at this gate** — the milestone gate is the last point at which the milestone's own records are the single writer's to correct. Status flipped to `discharged`, carrying the measured census (14 records, 3 watchers, byte-identical to their bundle sources) in the same shape `57/00`'s second gap already uses. `F-57-01-3` closes with it | `57/00` (fixed) | closed 2026-08-28 |
| F-57-M-8 | **`57/03` added a SIXTH silent-catch site to milestone 42's shrink-only ratchet, and this document under-reported it at the first gate.** `arch/m42-item-3` bans a statement-empty `catch` body anywhere under `src/` outside a three-file sanctioned floor, and `resolveRatchetBase` (`src/commands/ratchet.mjs`) carried one — a `catch {}` holding only a comment, falling through to the function's trailing `return null`. **The under-report is the sharper half.** `F-57-00-2` enumerated this control's offenders at `57/00`'s accept, when `src/commands/ratchet.mjs` did not yet exist, and named five files; the sixth arrived with `57/03` and was inherited *by this document* rather than re-measured, so the first milestone-gate pass counted the whole red line as inherited. Re-reading a finding's enumeration is not the same as re-measuring it, and only the re-measure sees a list that has grown. | regression | **blocker** | **fixed at this gate**, and inside the control's own stated carve-out rather than around it: the refusal is now RETURNED from the catch (`return null;`) instead of falling through, which is the *"catch body with at least one statement — those return a value the caller branches on"* shape the control exempts by name. Nothing is swallowed — the caller emits `ratchet-base-unresolved` with exit 1 and no legs computed. Red-probed: restoring the statement-empty body reds the control naming `commands/ratchet.mjs` exactly, and the file was restored byte-exactly. `arch/m42-item-3` stays red on the FIVE inherited sites `F-57-00-2` names, and milestone 57 now contributes none of them | `57/03` (fixed) | closed 2026-08-28 |
## Accept decision

### 57/00 · The watcher node — **ACCEPTED** 2026-08-27

The close criteria, each checked rather than assumed:

- **Scenarios green, scoped to the story.** 207 tests, 0 failures across the story's own two suites,
  the four prior-milestone suites this widening edits, and every suite over the registry the widened
  loader feeds. Every scenario in all four task contracts traces to a named assertion — the mapping
  is the evidence table above, row by row, and no scenario is covered only by inference.
- **`FF-5701` is armed, not merely present.** Five probes, each restored byte-exactly
  (`sha256:c7a2d1b3eb99ab3c…`, compared after restore, and the control re-run green). The additive
  leg was reached **on its own** — with the kind vocabulary left untouched, so that the probe proves
  the eleven-record signature and not the enum assertion standing in front of it.
- **The story's contracted boundary was measured, not read.** `checkPairing` returns
  `loop-unpaired-optimizer` for an optimizing loop whether or not a watcher declares a `monitoring`
  edge at it. The story said it ships no check; it ships no check.
- **`aof work doctor 57/00`** reports no `control-unresolved` at either severity — `FF-5701`'s cited
  file has landed, and its `pending` marker is dropped from the `ARCHITECTURE.md` declaration at this
  gate. Its two warns (`numbering-gap`, `rubric-join-unchecked`) are stream- and config-level.
- **`aof work validate 57/00`** — PASS. `aof work validate 57` — PASS. The one stream-wide issue is
  `F-57-00-3`, argued above.
- **No blocker finding is open against 57/00.** `F-57-00-1` is a blocker for item `84` and is routed
  there; `F-57-00-2` and `F-57-00-3` are non-blockers. None of the three is this story's code, and
  each was attributed by measurement — last-commit dates on every file named, and the specific
  commit and digest transition for the regression.

What the story delivered is mostly a shape that refuses things. The load-bearing choice is an
**absence**: a watcher has no `actuator` key, so "this watcher does not act on what it watches" is
enforced by the existing `loop-key-not-admitted-for-kind` and cannot drift out of step with the rest
of the schema. The second is a **refused convenience**: `determinism` has no default, so a record
that does not say how its number is made is incomplete rather than quietly assumed to be judged. The
third is a **key that was not added**: the pairing is 52's `monitoring` edge, outbound from the
watcher, so a watched loop still declares nothing and cannot fabricate its own supervision.

The honest limit, and it is recorded as a gap rather than a caveat: nothing is written in this
grammar yet. `.aof/loops/` holds eleven records and no watcher, all three optimizing loops are still
unpaired, and no verdict anywhere moves because a watcher exists. 57/01 reads the vocabulary and
57/05 writes records in it; this story froze the language they are both written in, which is exactly
what it said it would do.

### 57/01 · Independence computed, and the gate — **ACCEPTED** 2026-08-28

The close criteria, each checked rather than assumed:

- **The story's own lane is green, scoped to the story.** 195 tests, 0 failures across 23 suites —
  the four task contracts (30 scenarios, 16 example rows, traceability asserted), this story's two
  declared controls, the registry suites the widened checks feed, milestone 57's other landed
  fitness functions, and the command-registry lane. The full lane runs once at the milestone gate,
  not per story.
- **Both declared controls landed and are red-probed.** `FF-5702` and `FF-5703` were the two
  declarations in this milestone whose cited files already resolved, so `control-unresolved` could
  never have fired for them and the red probe was the **only** available evidence they were armed
  rather than merely present. Eight probes are recorded above, each restored byte-exactly with the
  control re-run green on the restored bytes. Two of them carry the obligations the register's own
  note set: FF-5702's probes (1)–(3) redden the extension while leaving 52's and 55's host legs
  green, and FF-5703's probe (2) reddens on a **wrong severity** rather than on a missing envelope
  key. Neither declaration ever carried a `pending` marker, because both cited files were already
  in service — which is the whole reason the probe, not the declaration, is the evidence here.
- **The gate is armed on the real tree, in both directions.** `aof work loops validate` reports
  0 errors / 39 warnings and exits 0 on this repository; re-aiming one shipped watcher's monitoring
  edge produces `error · loop-unpaired-optimizer` and exit 1. The three unpaired optimizers the
  story was written against are gone, which is the whole objective — `checkPairing` no longer
  filters `watcher` out of the graph, so 57/05's records finally move a verdict.
- **No inherited red, measured live rather than on a fixture.** All 39 remaining findings are
  `warn`, across nine inherited codes; the five promoted codes are the only ones that gate, and
  every loader code keeps the severity it already had. ADR-003 §2's hard constraint holds on the
  tree, which is the form that matters — a gate that lights up a wall of unrelated red is a gate
  that gets switched off.
- **`aof work validate 57/01` PASSes**, and `aof work doctor 57` reports no `control-unresolved` and
  no `verification-missing-red-probe` for either of this story's controls at **either** severity.
  One `verification-missing-red-probe` remains for `FF-5706` and one `control-unresolved` warning
  for the same id: that control is `pending`, is not this story's (`F-57-03-4` already routes its
  ownership to the architect), and is the milestone gate's to clear, not this story's.
- **One blocker was found and closed here, and it was a delivery gap rather than a code defect.**
  `F-57-01-2`: every one of this story's contracts was green while the `/aof:validate` wrapper that
  actually runs carried no loop-registry step, because the contract reads the bundle source and the
  install path had never been walked. All three runtime faces were rendered and installed through
  their own paths, and the installer now certifies each as up to date. That this is the second
  instance in one milestone — `F-57-05-1` was the first, and `F-57-01-4` measures 28 more stale
  bundle members — is the lesson worth carrying, and the three rows carry it into the milestone
  retrospective, which this milestone writes at its own close rather than per story.

**Deliberately not fixed here, and that restraint is itself part of the record.** `F-57-01-1` found
`FF-5703`'s exit-ownership leg narrower than it reads: the check module can set `process.exitCode`
and the control stays green. The fix was written, measured working, and then reverted, because the
file is behind 53's ACCEPT-02 diff ceiling and advancing that digest over my own verify-time edit is
precisely the hazard the ceiling was built to refuse. The ceiling caught it. It goes to the
architect with the measurement attached, which is slower and correct.

Two of `57/00`'s three declared gaps are discharged by this accept — the ones whose discharge
condition names this story — and marked so in that story's `OUTCOME.md` with the evidence. The
third is `57/05`'s and is logged as `F-57-01-3` rather than edited from here.

`status: done`, set with `aof work status 57/01 done`; the box is ticked in the milestone
`SPEC.md` `## Stories`.

### 57/02 · Examples rows in the parser — **ACCEPTED** 2026-08-27

The close criteria, each checked rather than assumed:

- **Scenarios green, scoped to the story.** Every scenario in both task contracts traces to a named
  assertion in the evidence table above, row by row — including the two a corpus differential would
  have covered only by construction (`prose after an examples table`, `a step after an examples
  table`), which were driven directly instead. No scenario is covered only by inference.
- **The additive claim was measured against the REAL pre-story bytes, not only the reconstruction
  the control uses.** `git show HEAD:src/feature-parse.mjs` was imported beside the current parser
  and both run over all 803 feature files: **0 mismatches**. That is what makes ADR-005 §2 — *the
  five existing keys are unchanged in name, order and value for every input* — a measurement rather
  than an argument, and it is why `F-57-02-1` is recorded as a gap in the control rather than a
  doubt about the change.
- **The hole the story exists to close is now measurable.** 1,069 Outlines carrying 1,217 Examples
  blocks and **5,333 data rows** are visible to `parseFeature` where the count was 0. Spike 56
  measured 1,044 Outlines of 5,194 scenarios; the tree has since grown to 1,069 of 5,384 and the 20%
  figure holds.
- **`FF-5704` is armed, not merely present.** Four probes, one per leg, each restored byte-exactly
  with the control re-run green on the restored bytes. The litmus leg was reached **on its own** — a
  probe that moves free text without touching a scenario key — so it proves the litmus comparison
  rather than the key comparison standing in front of it. The consumer leg was probed by editing
  `src/work.mjs` itself.
- **No consumer is edited.** All three dependents are unmodified in the working tree;
  `src/commands/tasks.mjs` and `src/work-doctor-rubric.mjs` carry no commit since the milestone base,
  and `src/work.mjs`'s one commit is item 84's, not this milestone's. `executableScenariosOf` is
  untouched, as ADR-005 §4 requires.
- **`aof work doctor 57/02`** reports no `control-unresolved` at either severity; `FF-5704`'s cited
  file has landed and its `pending` marker is dropped from the `ARCHITECTURE.md` declaration at this
  gate. Its two warns (`numbering-gap`, `rubric-join-unchecked`) are stream- and config-level.
- **`aof work validate 57/02`** — PASS.
- **No blocker finding is open against 57/02.** Six suites in the widened consumer lane are red;
  every one is red identically with the parser reverted to its HEAD bytes, and that measurement is
  what attributes them elsewhere — `F-57-02-2` and `F-57-02-3` to milestone 66, and `arch/FF-6601`'s
  second Gherkin recogniser (`src/phase-brief.mjs`, last committed 2026-08-24) to the already-open
  `F-57-00-2`.

What the story delivered is a **count that did not exist**. The parser has always read `Examples:` as
a structural header and thrown the table away; it now carries the rows as data, so deleting a row
from an Examples table is, for the first time in this repository, a visible reduction of an
acceptance criterion. Two choices carry the weight. The row count **excludes the column-header row**,
so an Outline is never reported one criterion richer than it is — the direction a ratchet must not be
wrong in. And an Outline with no table yields `[]` rather than `null`, so `57/03`'s ratchet counts a
zero instead of branching on an absence.

The honest limit, recorded as a gap rather than a caveat: nothing reads the new key. All three
production consumers are byte-identical, `executableScenariosOf` still defines an executable scenario
without reference to rows, and no count anywhere in `aof` changes because `examples` exists. `57/03`
is the consumer; this story landed the shape it will be built against, which is exactly what it said
it would do.

### 57/03 · The contract-integrity ratchet — **ACCEPTED** 2026-08-28

`aof work validate 57/03` PASSes, `aof work doctor 57` reports neither `control-unresolved` nor
`verification-missing-red-probe` for `FF-5705`, and the story's lane is green: 17 tests over six task
contracts and five arch suites, plus 39 across the command-registry lane the fix touches. The three
blockers raised at first verification are closed in the record above.

This story was not accepted on its first pass, and the reason is worth keeping. Every task contract
was green and `validate` PASSed while the story's headline safeguard was bypassable by a header
comment that 70% of this repository's test files already carry. Nothing in the automated lane could
have said so: the contract's own scenario for it (*"the justification comment is never read"*) had no
assertion behind it, and `FF-5705` declared the leg without reaching it. What found it was running
the delivered resolver against the real register and reading the disposition it returned.

The fix implements ADR-004 §5's first qualifier on both halves it was missing. **Timing** — citations
are read from the artifact at the base commit, so a comment authored with a weakening is not in the
text being read; the prohibition is now structural rather than promised. **Scope** — a citation
discharges only when it names the owning item, so the "owning item's register" qualifier finally does
work; without it every milestone's `ADR-001`–`ADR-010` numbering made the register interchangeable.
`FF-5705` now carries six probes over three legs, each observed red on the leg it targets.

Two things are recorded because they are evidence about the method rather than about the code. The
new contract caught a defect in its own fix on first run — the owning ref was a folder number, not
the `m?<itemRef>/<ID>` ref — which is the scenario-before-code ordering this milestone exists to
defend. And a probe aimed at a guard found dead code instead of a leg: the guard was unreachable, so
it was removed rather than left as a branch no probe can redden. An unprobeable guard is the same
failure as an unasserted invariant, one level down.

`F-57-03-4` stays open and does not gate this story: `FF-5706`'s ownership is an architect's call on
the milestone register, and its second leg is over `57/05`'s surface. `57/03`'s own half of it holds
— neither delivered module compares a pass/fail tally to decide a gate's health; the ratchet's oracle
is a disposition, not a count.

What the story delivers stands as built: base resolution refuses rather than guessing, the contract
leg counts Examples rows as the criteria they are, the marker leg is as narrow as 56 measured, the
compensating-assertion exemption is a leg, and the engine is pure over injected observations with
every repository read at the command boundary.

### 57/04 · Escape and intervention counters — **ACCEPTED** 2026-08-28

`aof work validate 57/04` PASSes, `aof work doctor 57/04` reports no `control-unresolved` at either
severity, and the story's lane is green: 16 tests over three task contracts and six arch suites, plus
39 across the command-registry lane the new command touches. Neither finding raised here is a blocker.

The accept rule was applied rather than assumed. `57/04` declares **no** fitness function — its row in
the story partition names two source files and no `FF-NNNN`, and its `ARCHITECTURE.md` diff adds no
register row — so there is no control of its own left unresolved and no red probe owed. The three
`control-unresolved` warnings still standing at the milestone (`FF-5706`, `FF-5707`, `FF-5708`) are
`57/05`'s and the milestone's, and re-marking them is not what clears them.

What the story delivers is what it promised: two counters computed by arithmetic over records this
system already writes, and no new write anywhere. The engine imports nothing and reaches no
filesystem, clock or process; every record read happens at the command boundary; and both counters
were confirmed non-mutating on the observations handed to them.

The property worth recording is the one `tasks/02` exists for, and it was confirmed on live records
rather than on fixtures alone. `aof work counters 57` over this checkout reports **cannot measure** on
both counters and emits no `count` key at all, because milestone 57 has no feedback ledger and no run
records. An instrument that answered `0` there would have handed the pairing gate a perfect score for
a loop nobody has ever measured — and the delivered one refuses to, on the real tree.

`F-57-04-1` is recorded as the honest limit of that refusal, and it is a limit rather than a defect in
the arithmetic. The counter can distinguish "no data" from "zero"; it cannot distinguish acceptance
from the last time somebody edited the record, because this system has never written the former down.
The substitution is conservative in the same direction the story's own comment describes, its measured
incidence here is 3 records in 284, and closing it needs a new recorded fact — which is precisely what
this story was told not to add. It is routed to backlog with the fix named, not left implicit.

`F-57-04-2` is a display defect on a surface no test reaches, found by driving the delivered command's
own render rather than by reading it.

Half of `FF-5707` now holds from the counter's side — the command is registered, the symbols are
exported, and `src/command-core.mjs` wires it exactly once — which is what lets `57/05` declare
`determinism: counter` with a `measurement` pointer that resolves. The declared control stays
`pending` because its other end does not exist yet.

### 57/05 · The pairing table — **ACCEPTED** 2026-08-28

`aof work validate 57/05` PASSes, `aof work doctor 57/05` reports no `control-unresolved` and no
`verification-missing-red-probe` at either severity, and the story's lane is green: 64 tests over two
task contracts, its two declared controls, and the registry guards its three new records now flow
through. Both declared controls landed, the `pending` markers were dropped from their
`ARCHITECTURE.md` declarations, and both are armed — `FF-5707` on five probes and `FF-5708` on five,
each observed red on the leg it targets and each restored byte-exactly with the control re-run green
on the restored bytes.

**This story was declined on its first pass and accepted on its second, and the reason is worth
keeping.** Everything was green then too. The three watcher records shipped in `src/bundle/loops/`
and were never installed into `aof`'s own `.aof/loops/`, so the framework kept declaring a pairing
rule its own registry did not satisfy — the story's title says *shipped* and its user story says the
milestone's claim becomes *"a fact about the tree rather than a capability"*, and as first delivered
it was still a capability. Nothing failed. `tasks/00`'s install scenario is honestly green because it
installs into a **temp** repo: it proves the path works and cannot see that the path was never walked
here. What caught it was measuring the framework's own registry directly instead of trusting a green
suite about it.

**The fix, and the boundary of what it discharges.** The three records are installed byte-identically
(`414ca321…`, `b0c64487…`, `f8587c64…`), taking the census from 11 nodes / 0 watchers to 14 / 3 with
zero error-severity findings. That discharges `57/00`'s first declared gap, whose discharge condition
names this story. It does **not** discharge `57/00`'s second — a watcher's `monitoring` edge still
moves no verdict, because `isGraphNode` admits `loop`/`actor`/`anchor` and not `watcher`, and that
gap's discharge condition is `57/01`. The table is complete and inert, which is exactly the designed
state: `checkPairing` returns 3 unpaired today and **0** when its own logic is re-run with watchers
admitted, so the install is what makes `57/01`'s gate land green rather than red.

**A correction to this document, recorded rather than amended away.** `F-57-05-1` was raised citing
*"`aof work loops validate` still names all three optimizing loops"*. That command still names all
three after the fix — for the 57/01 reason above, not because the fix failed. The half of that
evidence that was genuinely `57/05`'s is the registry census, and it moved. The blocker call itself
stands: without the install, `57/01` would widen the check, still find no watchers, and go red.

**The class is now caught, not just this instance.** `F-57-05-1` was invisible to every existing
control. `FF-5313` — a guard already in service over exactly this subject — gained a leg asserting
every `.aof/loops/` bundle member is present and byte-identical to its source. It extends the host
rather than adding a sibling, following the milestone's own precedent for `FF-5702`/`FF-5703`, and it
is the comparison `.gitattributes` was already written for. Red-probed on both legs, and probe (1) is
the deleted-installed-copy shape — the control is red on the precise defect that shipped. Promoting it
to its own `FF-NNNN` row is an architect's call on the register; the leg is armed either way.

`F-57-05-2` was fixed by REMOVAL, not by re-aiming, and the distinction is the finding. Reaching the
self-watch assertion needs a self-referential `monitoring` edge, and `watcher` is not in
`ENDPOINT_SCHEMES` — the shape is ungrammatical, so no mutation could ever have reached it. Confirmed
by probe that the invariant survives without it: the loader raises `loop-bad-value` at ERROR severity
and `FF-5708`'s zero-error leg goes red, which is what the dead line was duplicating. Same class as
`57/03`'s unreachable `owner === ""` guard, and handled the same way.

`F-57-03-4` stays open and does not gate this story, but this story's probe (5) settles half of it by
measurement: `FF-5706`'s registry leg — *no record in `src/bundle/loops/` declares an arch-failure
count* — **is** enforced today, by `FF-5708`'s third test, red-probed on `counter: the count of
failing fitness functions`. What is missing is the file `FF-5706` declares, not the coverage. That is
an argument for splitting the control rather than re-assigning it, and it remains the architect's call.


### 57 · Paired loops — **ACCEPTED** 2026-08-28

**This milestone was DECLINED on its first gate pass and accepted on its second, and the decline is
kept rather than replaced.** The first pass found the milestone red-lighting controls belonging to
other milestones — the class a story's own verify cannot see — and the record of that is the evidence
that the gate does something. Three regressions were found; a fourth (`F-57-M-8`) was found only
because the first pass's own attribution was re-measured instead of re-read.

**Every gate is green or accounted for.** `aof work validate 57` PASSes. `aof work doctor 57`
reports no error at either severity — no `control-unresolved`, no `verification-missing-red-probe`,
no `register-duplicate-id` — and Loop-Ready moved 50% → 60%, now clearing L1. The full suite is
**7,066 pass / 42 fail**, run twice on the final tree with an identical failure set, and **not one of
the 42 is attributable to milestone 57**; each is enumerated and owned in the evidence above.
`cargo test` (85/85) and `cargo check` are green.

**All eight declared controls have landed, none carries `pending`, and every one is red-probed** —
FF-5701 (5 probes), FF-5702 (4), FF-5703 (4), FF-5704 (4), FF-5705 (6 + 4 for the gate's amendment),
FF-5706 (7, landed here), FF-5707 (5), FF-5708 (10). Forty-nine probes, each restored byte-exactly
with its control re-run green on the restored bytes.

**The four regressions, and why each fix is a fix rather than an admission.** Every one had an
obvious green-making edit that was the move this milestone exists to refuse, and none was taken:

- **`F-57-M-1`** — `57/04` opened a second home for `work.autonomous.maxAttempts`. The recorded
  resolver set was **not** widened. `src/commands/run-retry.mjs` — already one of the four, and the
  verb that spends an attempt — now carries its cap read inside an exported `resolveAttemptCeiling`,
  and the counter imports it. The bound keeps four homes, and the counter's classification and a
  retry's real ceiling are now the same number by construction.
- **`F-57-M-4`** — `57/03` spelled the `ADR-\d` grammar a second and third time. All three sites
  compose from `idForm("ADR").id`, the fragment in 66's one home. `FF-5705`'s frozen import set is
  widened by one and **stays closed at three** — and the admission's condition landed as a NEW LEG of
  `FF-5705` rather than as trust: the admitted leaf must import nothing and reach no I/O, and the
  engine may take only the fragment, never the leaf's heading recogniser (which would have changed
  `authorityIds`' behaviour). Widening a frozen set without probing it is how a frozen set stops
  being frozen, so the widened set has its own probe.
- **`F-57-M-8`** — `57/03`'s statement-empty `catch` in `resolveRatchetBase`. Fixed inside milestone
  42's own stated carve-out: the refusal is returned from the catch, which is the shape that control
  exempts by name, and the caller still emits `ratchet-base-unresolved` with exit 1.
- **`F-57-M-3`** and **`F-57-M-2`** — the derived manifest re-derived, and the bundle census literal
  moved 79 → 82 by the rule its own file states in capitals.

**`FF-5706` was the accept-rule blocker, and it was cleared the only way the rule allows.** A
declared control that does not resolve is not admitted at accept, marker or no marker. Dropping the
declaration was not available — ADR-006 §2 says in terms that the ban is *"enforced as a fitness
function over the shipped registry, not as guidance"* — so the file was landed, registered in its own
labelled runner block, and probed on seven legs. It also settles `F-57-03-4`: a control whose §1
spans two stories' modules and whose §2 is over a third's belongs to no story, so it is the
milestone's.

**The headline claim is a fact about this tree, not a capability it has.** `aof work loops validate`
over `.aof/loops/` reports **0 errors, 39 warnings, exit 0**, and **zero** `loop-unpaired-optimizer`
— against three at refine over the same registry. `loop-watcher-is-judge` fires zero times: all
three shipped watchers are `determinism: counter`. That distinction is the one `57/05` was declined
over on its own first pass, and it holds at the milestone level too.

**`F-57-00-1` stays open and is deliberately not counted against this milestone.** It is milestone
53's `FF-5308` broken by commit `830e4f9`, which belongs to item `84` — the reverse direction of the
four above, routed to `84` under the same rule that governed them: it must not be accepted red.

**Ten findings stay open, none a blocker**, each routed to an owner outside this milestone or to the
backlog: `F-57-00-1` (item 84), `F-57-00-2`/`F-57-02-2`/`F-57-02-3`/`F-57-M-5` (other milestones'
re-measurement contracts), `F-57-00-3` (item 78), `F-57-01-1` (the ACCEPT-02 diff ceiling refusing a
verify-time edit, which is the instrument working), `F-57-01-4`, `F-57-04-1`, `F-57-04-2` and
`F-57-M-6` (backlog).

**What the gate cost, and what it bought.** Four regressions reached `done` stories before anything
saw them, because a story's verify runs its own scenarios and cannot see a control it poisons
elsewhere. That is the documented trade, and it was paid in full: the rework landed on accepted items.
The cheap half of the remedy — running the ARCHITECTURE lane at the story gate, which is fast and
cross-cutting, while still deferring the behavioural lane — is routed to `aof:retrospective`.

Accepted with `aof work status 57 done`.
