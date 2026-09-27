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
# 55 · Anchors & the frozen set — Verification

<!--
  OPENED AT REFINE (2026-08-26), carrying the fitness register ALONE.

  Nothing has been built or verified yet, so there is no evidence, no finding and no accept
  decision to write — and an empty "None" placeholder is not information. Those three sections are
  authored by `aof:verify` as each story lands.

  The register below exists now because `ARCHITECTURE.md` DECLARES eight controls, and a declared
  control with nowhere to record its red probe is the gap `aof work doctor 55` reports as
  `verification-register-missing`. Every row's red-probe cell holds the frozen placeholder, which
  reads as a MISSING probe — the honest state at refine, and the state each row leaves the moment
  its arch-test lands and is observed failing.
-->

## Verification evidence

<!-- Per story, as each lands. Procedure + result + a `verifies →` pointer; never a restatement of
     the scenario's own outcome. All three of 55/00's task contracts are `@executable`: there is no
     `@manual` lane and no `@uat` lane in this story, so no agent-run procedure and no human
     sign-off section is written for it. -->

### 55/00 · The anchor taxonomy — 2026-08-26

**Procedure.** The story's own suites were run in isolation (`AOF_GLOBAL_HOME` per test, a throwaway
global home per case) via a focused test-array import — `node --test` on these files is a silent
false pass, and the full suite cannot run on this machine because `global-work-propagation` binds
`:4182`, which the live control daemon holds. The lane run is the story's two new suites plus every
milestone-52/53 suite this story edits, which is exactly the regression surface of an additive
widening:

`test/anchor-taxonomy.test.mjs`, `test/arch/acd-anchor-taxonomy-additive.test.mjs`,
`test/arch/acd-loop-vocabulary-closed.test.mjs`, `test/arch/acd-registry-framework-owned.test.mjs`,
`test/arch/acd-registry-single-home.test.mjs`, `test/work-loops-home-and-delivery.test.mjs`,
`test/work-loops-record.test.mjs`, `test/work-loops-registry-census.test.mjs`,
`test/work-loops-value.test.mjs`.

**Result.** 98 tests, 0 failures. Re-run after the red probes below and still 98/0, against a
`src/work-loops.mjs` proven byte-identical to its pre-probe state (`sha256:86e4c168a896015b…`).

| what was checked | procedure | result | verifies → |
|---|---|---|---|
| The two closed sets widen and the host does not | `acd-anchor-taxonomy-additive` asserts `NODE_KINDS` / `GROUND_VALUES` / `ADMITTED_KEYS.anchor` against their literals, then calls `.add()` on each and asserts no growth | green — the sets are genuinely frozen, not merely equal | `00_the-taxonomy-widens.feature` — "the closed sets are literals in the loader" |
| Nine milestone-52 records parse unedited | the nine bundle sources are copied into a temp registry and loaded; nodes counted, `error`-severity findings asserted empty, `actor:operator`'s `ground` asserted still `exogenous` | green — 9 nodes, zero errors | `00_the-taxonomy-widens.feature` — "every record the previous milestone delivered still parses" |
| `ground:` is refused on `kind: loop` at every value | a loop fixture carrying `ground: process-exit` — a value now *valid* in the enum — is loaded and its finding code asserted `loop-key-not-admitted-for-kind` | green — the refusal is on the host, not the value | `01_ground-never-on-a-loop.feature` — "a loop declaring ground is refused" |
| `observes:` admits only the three pointer schemes | an anchor whose `observes:` is `prose:docs/evidence.md` is loaded and asserted `loop-bad-value`, beside a well-formed sibling that parses | green — prose is a bad value here and a declared gap everywhere else | `01_ground-never-on-a-loop.feature` — "what an anchor may name as the authority it observes" |
| Both day-one anchors ship from one source | `renderBundleOutputs` is compared byte-for-byte with `src/bundle/loops/*.md` and with the installed `.aof/loops/*.md`; each carries the `# aof-generated: true` marker and both runtimes | green — installed bytes equal source bytes | `02_the-day-one-anchors.feature` — "the anchors ship from one source and are installed" |
| Every declared authority resolves in this repository | each anchor's `observes:` pointer is opened and the named symbol matched against an `export` in that file | green — `reportObservation` at `src/commands/grade.mjs:179`, `isStale` at `src/run-store.mjs:981` | `02_the-day-one-anchors.feature` — "every declared anchor names an authority that exists" |
| No edge exists that the record's body does not defend | every endpoint operand in each anchor's edges is required to appear in that record's prose body | green — three `data-feed` edges across two anchors, each cited | `02_the-day-one-anchors.feature` — "an anchor's prose body cites the evidence for its edges" |
| A consumer's own records survive the install | `loops-home-delivery/02` and `/03` drive `updateWork` over an edited and a consumer-authored record | green — drift-warned and left byte-intact; `--force` restores source | `02_the-day-one-anchors.feature` — "installing the anchors does not disturb a consumer's own records" |

**Citation spot-check (read, not inferred).** The two anchors' bodies claim more than their pointers
do, and each claim was opened: `compileGrade`'s non-zero-exit veto is at `src/work-grade.mjs:462`
(`exitVeto`), and `mesh-assignment-reclaim` does import the shared `isStale` rather than re-deriving
it (`src/mesh-assignment-reclaim.mjs:21`). Two anchors is a small day-one set, and that is the
discipline the contract asked for rather than a shortfall — no third anchor was declared because no
third authority was defensible.

### 55/01 · The groundedness report — 2026-08-27

**Procedure.** The story's own two suites plus every suite covering a module it edits, run through a
focused test-array import with a per-test throwaway `AOF_GLOBAL_HOME` (`node --test` on these files
is a silent false pass, and the full lane cannot run on this machine while the control daemon holds
`:4182`): `test/groundedness-report.test.mjs`, `test/arch/acd-anchor-grounding-seed.test.mjs`,
`test/arch/acd-loop-checks-pure.test.mjs`, `test/work-loops-checks.test.mjs`,
`test/work-loops-commands.test.mjs`, `test/arch/acd-loop-command-route-only.test.mjs`,
`test/arch/acd-loop-finding-envelope.test.mjs`, `test/arch/acd-loop-module-import-boundary.test.mjs`,
`test/arch/acd-loop-probe-contract.test.mjs`, `test/arch/acd-loop-registry-not-an-item-type.test.mjs`,
`test/arch/acd-work-command-cli-bijection.test.mjs`, `test/command-core-contract.test.mjs`,
`test/board-api.test.mjs`, `test/arch/acd-board-write-isolation.test.mjs`,
`test/arch/acd-loop-state-rides-the-run-record.test.mjs`. **Re-run 2026-08-27**, widened by the three
suites the `F-55-01-1` repair touches — `test/arch/acd-work-command-route-coverage.test.mjs`,
`test/board-face-contract.test.mjs`, `test/arch/acd-board-single-server.test.mjs` — because a repair
that removes a served route must be proved against the bijection it was justified by, not only
against the seam it broke.

**Result — 169 of 169, green**, on the story's own bytes after the `F-55-01-1` repair below. The first
pass of this lane (2026-08-27, before the repair) was 135/136: `arch/53 FF-5307` was red on
`src/board-ui.mjs` (`e3b4378c55a57a3f…` against the pinned `d76bfdaf42032c93…`), and the second pass
(after the story re-pinned the seam around its own route) was 169/169 with the guard moved rather than
the cause removed. The recorded result is the third: the route deleted, the pin restored to
`d76bfdaf42032c93…` — **measured, not assumed** — and the lane green with the frozen seam intact.

**Attribution proven, not assumed.** Before the repair, `src/board-ui.mjs` was restored to `HEAD` and
the identical lane re-run: **136/136**, and 55/02's lane went 48/49 → **49/49**. That measurement is
what made the route, and nothing else in the story, the whole of the red — and it is why the repair
could be a deletion rather than an investigation.

| what was checked | procedure | result | verifies → |
|---|---|---|---|
| Grounding is seeded by what a node is grounded BY, not by its kind | `acd-anchor-grounding-seed` drives `buildGroundednessReport` over `kind: actor` and `kind: anchor` hosts × all six `GROUND_VALUES` | green — same component, same members, verdict keyed on the ground value alone | `00_the-seed-widens.feature` — "what seeds ground, and what does not" |
| The component decomposition did not move | the `decomposeLoopGraph` body is sliced out of the module and sha256'd against 52's literal, then asserted to mention no grounding vocabulary | green — `14fad85dc54cbf31…`, and the body names none of ground/observes/resolution/verdict/anchor | `00_the-seed-widens.feature` — "the component decomposition is unchanged by the widening" |
| A loop no anchor feeds is named, on the real registry | `aof work loops groundedness --json` run live against this repository's installed `.aof/loops` | green — 11 components (5 anchored, 2 exogenous-only, 4 self-referential), 28 findings, four of them `loop-anchor-absent` naming `loop:autonomous-cascade`, `loop:retrospective-memory-ingest`, `loop:review-fix-rereview`, `loop:verify-triage-accept` | `01_a-loop-with-no-anchor.feature` — "a loop that no anchor feeds is named" |
| Stale sits between anchored and floating free | one authority model built twice, differing only in the injected resolution for `anchor:gate` | green — `anchored` on `true`, `stale` on `false`; the ungrounded verdict is never reached | `02_a-stale-anchor.feature` — "stale is not the same verdict as having no anchor" |
| The report is a registered command with a stable machine face | `getCommand("work:loops-groundedness")` through the registry, then the same report produced twice | green — registered, and the two `--json` outputs are byte-identical | `03_the-report-face.feature` — "the report is reachable as a registered command" |
| Resolution arrives as an argument, never as a computation | the checks source asserted free of fs/clock/process reads while `src/commands/loops-groundedness.mjs` holds `node:fs/promises` and `resolveAnchorAuthorities` | green — the impure half is at the command boundary | `03_the-report-face.feature` — "the checks receive resolution as an argument" |
| An unreadable registry is reported by name, never as green | the `registry-unreadable` path at `src/commands/loops-groundedness.mjs:121` | green — the failure is a coded state, and no component is reported anchored | `03_the-report-face.feature` — "a registry that cannot be read is reported as such, never as green" |
| The registered command is the ONLY face, after the repair | `acd-work-command-route-coverage` re-derived over the registry with `loops-groundedness` in `BOARD_DEFERRED`, both legs plus the behavioural stand-up; `src/board-ui.mjs` back at `d76bfdaf42032c93…` | green — the report is reachable in-process (`invokeRegistered`, `src/commands/loop.mjs:745`) and over the CLI, and by no HTTP door | `03_the-report-face.feature` — "the report is reachable as a registered command" |

### 55/02 · Provenance at write time — 2026-08-27

**Procedure.** Same isolated focused-lane shape: `test/provenance-at-write-time.test.mjs`,
`test/arch/acd-provenance-stamped-at-write.test.mjs`, `test/arch/acd-grade-record-envelope.test.mjs`,
`test/arch/acd-grade-bounded-single-spawn.test.mjs`, `test/grade-read-face-never-executes.test.mjs`,
`test/arch/acd-no-lease-store-run-record-untouched.test.mjs`,
`test/arch/acd-loop-state-rides-the-run-record.test.mjs`,
`test/loop-record-reaches-the-redrive.test.mjs`, `test/loop-cap-exhaustion-carries-the-record.test.mjs`.

**Result. 49 tests, 0 failures on this story's own bytes.** As the working tree stands the lane reads
48/49, and the single red is `F-55-01-1` — 55/01's unpinned board route, in a suite this story shares
rather than owns. That was not assumed: reverting `src/board-ui.mjs` alone turns this lane green
without touching a byte 55/02 wrote.

| what was checked | procedure | result | verifies → |
|---|---|---|---|
| The envelope is four frozen keys and admits no fifth | `PROVENANCE_KEYS` asserted frozen and equal to `["node","run","commit","at"]`; a compiled stamp's key list asserted identical; a stamp carrying an extra key refused at the writer | green — extra input keys are ignored at compile and refused at `assertStampedClaim` | `00_the-envelope.feature` — "the envelope carries no fifth key" |
| `run` and `commit` may be null and mean it; `node` and `at` may not | `compileProvenance({ node, run: null, commit: null, at })` compiles, and each of the four is withheld in turn | green — absence of `run`/`commit` is a value; absence of `node`/`at` is `claim-provenance-missing` naming what was missing | `00_the-envelope.feature` — "which values may be absent, and what absence means" |
| The compiler reads nothing for itself | `src/claim-provenance.mjs` asserted to carry no import at all, and none of `Date.now(`, `new Date(`, `node:fs`, `child_process`, `process.`, `git `, `transcript`, `mtime`, `readdir`, `readFile` | green — the module is a leaf with no effect source | `01_the-compiler-is-pure.feature` — "the compiler reads no clock" |
| The impure edge is what gathers | `gatherClaimProvenance` at `src/commands/grade.mjs:300`, called at `:419` and handed to `compileGrade` | green — the command collects, the leaf decides | `01_the-compiler-is-pure.feature` — "the impure edge is what gathers" |
| An unstamped claim is refused before the store is touched | `mintRun` calls `assertStampedClaim(brief.grade)` at `src/run-store.mjs:584`, ahead of the dedup read | green — a refusal cannot infer, and cannot write | `02_an-unstamped-claim-is-refused.feature` — "a refused write leaves the previous record untouched" |
| No back-fill source exists anywhere on the write path | `src/run-store.mjs` and `src/commands/grade.mjs` asserted free of `.claude/projects`, `transcript`, `.mtime`, `statSync`, `readdirSync` | green — there is nothing to guess from | `02_an-unstamped-claim-is-refused.feature` — "provenance is never derived from a transcript or a file time" |
| A reading rides the run record and accumulates | `recordAnchorReading` at `src/run-store.mjs:709` — validates the stamp before any store read, appends `[...(prior ?? []), reading]`, and never targets `.aof/loops` | green — no sidecar store, no overwrite, delivered registry untouched | `03_a-reading-rides-the-run.feature` — "readings accumulate rather than overwrite" |

### 55/03 · Raw capture before classification — 2026-08-27

**Procedure.** `test/raw-capture-before-classification.test.mjs`,
`test/arch/acd-raw-capture-before-classification.test.mjs`, `test/board-api.test.mjs`,
`test/arch/acd-board-write-isolation.test.mjs`, `test/command-core-contract.test.mjs`,
`test/arch/acd-work-command-cli-bijection.test.mjs` — the story's own two suites plus the CLI and
board faces its capture path is reached through.

**Result. 67 tests, 0 failures.**

| what was checked | procedure | result | verifies → |
|---|---|---|---|
| The verbatim write precedes the human projection, structurally | the two call sites located in `src/effects/doc-transitions.mjs` and their order asserted — `appendRawFeedback` at `:47`, `appendFeedbackBullet` at `:49` | green — the ordering is a property of the source, not of a test's timing | `00_the-raw-write-is-first.feature` — "the verbatim text is persisted before anything classifies it" |
| The raw ledger has no rewrite primitive | `src/feedback-records.mjs` writes through `appendFile(feedbackRecordPath(item), …)` at `:94`, and the module is asserted to contain no `writeFile`, `rename` or `truncate` | green — `FEEDBACK.ndjson` cannot be opened for rewrite because nothing in the module can rewrite | `00_the-raw-write-is-first.feature` — "a raw record is never opened for rewrite" |
| The capture path has no menu and cannot grow one | `work:feedback`'s input properties and CLI flags asserted equal to `ref`/`note`/`actor`/`refs`, and each of `severity`, `type`, `category`, `routing`, `destination`, `classification` asserted absent from both | green — the schema is the refusal, so a menu cannot be added by adding a flag | `01_no-menu-at-capture.feature` — "a classification argument is refused rather than accepted and ignored" |
| The bundled command never pauses to ask | `src/bundle/commands/feedback.md` asserted free of `AskUserQuestion`, and its frontmatter free of any classification flag | green — the prompt-side door offers no menu either | `01_no-menu-at-capture.feature` — "capture never pauses for input" |
| An unknown field is refused before resolution and before any write | the three offsets in `src/commands/feedback.mjs` asserted ordered: `feedback-classification-deferred` → `resolveItemExact` → `transitionFeedbackAppended` | green — the refusal names where classification belongs, and nothing has been resolved or written by then | `01_no-menu-at-capture.feature` — "the refusal explains where classification belongs" |
| There is exactly one production raw writer | every `src/**` module read and the `appendRawFeedback` call sites enumerated | green — exactly `effects/doc-transitions.mjs` and `feedback-records.mjs`: the transition and its own store | `02_triage-references-the-raw.feature` — "a classification is a separate record referencing the raw one" |
| Capture writes the ledger and the projection and nothing else | the board face posts feedback and the whole work dir is snapshot-diffed before and after | green — exactly `FEEDBACK.ndjson` and `STATE.md` change; record-doc frontmatter and item status untouched | `00_the-raw-write-is-first.feature` — "capture succeeds even when nothing downstream is ready to triage it" |

### 55/04 · The frozen set, compiled — 2026-08-27

**Procedure.** `test/frozen-set-compiled.test.mjs`, `test/arch/acd-frozen-set-compiled.test.mjs`,
`test/arch/acd-frozen-set-tamper-coded.test.mjs`, `test/claude-settings-merge.test.mjs`,
`test/bundle-claude-session-hooks.test.mjs` — the story's own three suites plus the two settings and
bundle-delivery suites its compile writes through.

**Result. 41 tests, 0 failures.**

| what was checked | procedure | result | verifies → |
|---|---|---|---|
| The frozen set is a reviewable declaration under version control | `src/bundle/frozen-set.jsonc` read and its members enumerated | green — six members: `locked-contract`, `litmus`, `tag-vocabulary`, `gate-order`, `test-isolation`, `anchors` | `00_the-declaration.feature` — "a frozen rule is declared, reviewable, and under version control" |
| Every compiled rule traces back to a declaring member | `compileFrozenSet(bundledFrozenSet())` — every hook carries `frozenMember`, every permission carries `id` + `rule`, every agent scope carries `memberId`, and the first hook's marker reads `test-isolation` | green — no aof-authored rule exists at any enforcement point without a member declaring it | `00_the-declaration.feature` — "the test-isolation rule is a compiled member rather than a hand-wired entry" |
| The fourth enforcement point is declared and honestly not compiled | `compiled.deferred` asserted equal to `["gate-order"]` | green — the mesh worker envelope has a spelling and no pretence of enforcement (ADR-004 §2) | `02_a-rule-compiles-or-refuses.feature` — "a member that cannot reach its enforcement point refuses the compile" |
| The permissions merge is surgical, in both directions | `src/claude-settings.mjs` asserted to strip `permissions` out of the patch before the top-level spread, to carry `splicePermissions`, and to have no `{ ...current, ...settingsPatch }` anywhere | green — an operator's entries survive a compile in their own positions | `01_the-permissions-merge-is-surgical.feature` — "an operator's entries keep their positions" |
| A frozen-member edit is a tamper with a name | the coded event `frozen-set-tamper` asserted present and asserted to carry `memberId: mine[FROZEN_MEMBER_MARKER]` | green — distinct from the pre-existing preference-drift warning | `03_tampering-is-a-coded-event.feature` — "a tamper is distinguishable from ordinary drift" |
| The human's way out survives, and is stated where they will see it | an entry with its ownership marker removed is recognised as claimed, and the report carries the `remove the "…" key` sentence | green — an entry the operator has taken is neither edited, retracted, re-marked, nor reported as a tamper | `03_tampering-is-a-coded-event.feature` — "removing the ownership marker hands the entry to the operator" |
| The declaration and the hook asset ride the bundle | `src/bundle/bundle.json` members resolved by id | green — `frozen-set-declaration` → `.aof/frozen-set.jsonc`, `test-isolation-guard` → `.claude/hooks/aof/guard-test-isolation.mjs` | `00_the-declaration.feature` — "removing a member removes exactly its compiled rule" |

**One thing observed live, and it is a gap rather than a defect.** This repository's own installed
hook, `.claude/hooks/aof/guard-test-isolation.mjs`, is still the pre-55 hand-wired 1,983-byte file;
the compiled member is the 5,935-byte `src/bundle/hooks/guard-test-isolation.mjs`, and a
bundle-delivered asset reaches a consumer only through `aof work update`. During this verification a
Bash call that merely *mentioned* the suite path in a `grep` was blocked by the old hook — precisely
the over-block ("an action the rule does not forbid is not blocked") the compiled member removes. The
story's charter is the declaration and its compiler, not installing into this repo, so this is carried
as a gap on the story's `OUTCOME.md` with `aof work update` as the discharge condition.

### 55/05 · L3 unlocked — 2026-08-27

**Procedure.** `test/l3-ladder-widens.test.mjs`, `test/l3-gate-computed.test.mjs`,
`test/l3-gate-refusal.test.mjs`, `test/l3-anchor-check-score.test.mjs`,
`test/arch/acd-loop-level-l3-gated.test.mjs`, `test/work-loop-level-ladder.test.mjs`,
`test/work-loop-declaration.test.mjs`, `test/work-loop-gate-order.test.mjs`,
`test/work-loop-scope-guard.test.mjs`, `test/work-loop-stop-set.test.mjs`,
`test/loop-command-refusals.test.mjs`, `test/loop-only-fail-redrives.test.mjs`,
`test/loop-ready-composed.test.mjs`, `test/loop-ready-json-key.test.mjs`,
`test/loop-ready-registry-absent.test.mjs`, `test/loop-ready-score.test.mjs`,
`test/arch/acd-loop-suite-registration.test.mjs` — the story's four suites plus 53's whole ladder,
gate-order and Loop-Ready surface, which this story re-arms rather than merely extends.

**Result. 87 tests, 0 failures.**

| what was checked | procedure | result | verifies → |
|---|---|---|---|
| The ladder is L1/L2/L3 and its locked set is empty | `LOOP_LEVELS` / `LOCKED_LOOP_LEVELS` asserted against their new literals, asserted frozen, and mutation asserted to throw | green — `["L1","L2","L3"]` and `{}`, with `push`/assign raising `TypeError` | `00_the-ladder-widens.feature` — "no level is locked any longer" |
| The obsolete lock proxy is deleted, not narrowed | `test/arch/acd-loop-level-l3-locked.test.mjs` asserted absent from disk | green — 53's third leg is gone rather than quietly passing on a premise that is now false | `00_the-ladder-widens.feature` — "the lock is removed rather than narrowed" |
| No setting, env var or flag admits L3 | the `resolveLoopLevelGate` body sliced and asserted to mention no `config`/`env`/`flag`, then a fixture workspace given `work.loop.allowL3 = true` and driven at L3 | green — refused with `loop-level-gate` and a non-empty `failingHalves`, config notwithstanding | `01_the-gate-is-computed.feature` — "no setting admits L3" |
| Both halves are gathered through the command boundary before any drive | `resolveInvocation` in `src/commands/loop.mjs` asserted to invoke `work:doctor` and `work:loops-groundedness`, then `resolveLoopLevelGate(resolved.level, l3Gate)`; `loopCommand.input` asserted closed at six properties | green — the gate reads the registry the way every other consumer does | `01_the-gate-is-computed.feature` — "the gate reads the registry through the command boundary" |
| A refused request says which half failed, and names the parts | `aof work loop 55 --level L3 --dry-run --json` run live against this workspace | green — `code: "loop-level-gate"`, `failingHalves: ["score","groundedness"]`, `score: 40` against `threshold: 100` with all six blocking checks named, and the groundedness half carrying its components verbatim | `02_a-refusal-says-which-half.feature` — "a refusal failing both halves reports both" |
| The refusal is a refusal, not a crash, and drives nothing | the same live call's payload and exit | green — a well-formed `--json` document; no run minted, nothing spawned | `02_a-refusal-says-which-half.feature` — "the refusal is not a crash" |
| The anchor check joins the score, composed rather than re-derived | `COMPOSED_CHECK_IDS` at `src/work-doctor-loop-ready.mjs:13` read, and the score recomputed over it | green — `anchor-grounding` sits beside 52's five, and the score stays a fraction over equally weighted checks (this workspace: 4/10 = 40%) | `03_the-check-joins-the-score.feature` — "the check is composed, not re-derived" |
| A qualified workspace really is admitted | the L3 fixture repository drives `loopCommand.run({ scope: "07", level: "L3" })` end to end | green — `level: "L3"`; the gate opens on earned facts, so the rung is reachable rather than unlocked on paper | `01_the-gate-is-computed.feature` — "a workspace with anchors and a passing score is admitted" |

### 55 · The milestone gate — the full-lane regression sweep — 2026-08-27

The one place the whole suite runs (`aof:verify`'s scope rule: a story runs its own scenarios; the
full lane runs once, here). **It is RED, and five of the reds are this milestone's.**

**How it was run, since the obvious way does not work here.** The suite runner self-invokes only as an
entry point and exposes its assembled `tests` array for import — the door
`acd-roundtrip-registration` already uses. A driver imported that array and ran every entry under the
same per-test throwaway `AOF_GLOBAL_HOME` the real runner uses. Run directly, the lane does not
finish: `global-work-propagation/03` binds the fixed control port `127.0.0.1:4182`, which the live
control daemon holds, and the resulting unhandled `'error'` event kills the **process** rather than
failing the test — so the run dies at test 3392 of 6905 with no summary at all. That one test is
excluded BY NAME and recorded here as an exclusion, never as a pass; everything else runs.

| measurement | result |
|---|---|
| Lane at `HEAD` (`fix/agent-layer-bounds`) | **6905 selected — 6859 pass, 46 fail, 1 excluded** |
| Lane at `main` (`747c0a8`), same driver, same exclusion | 6838 selected — 6764 pass, **74 fail**, 1 excluded |
| Attributable to this branch (fails at `HEAD`, passes or absent at `main`) | **5** — `F-55-M-1` … `F-55-M-5` |
| Pre-existing (fails at both, same cause) | 41 |
| Fixed by this branch (fails at `main`, passes at `HEAD`) | 32 |

**The baseline was measured, not argued** — a `git worktree` of `main` with this tree's
`node_modules` junctioned in, so the comparison is the same suite under the same dependencies rather
than an opinion about what ought to be pre-existing. The branch is a **net improvement** (74 → 46),
which is why the five below are recorded as findings rather than the lane being called broken.

**A set-difference over failure NAMES would have hidden one of the five, and did.**
`bundle-asset-manifest-complete/00` fails at BOTH revisions, so by name it files as pre-existing. Its
causes differ: at `HEAD` it is `80 !== 76` (a real regression — this milestone added exactly four
files under `src/bundle/`), at `main` it is `ENOENT … ui/dist` (an artifact of a fresh worktree with
no built UI). Every shared failure was therefore compared by **cause**, not by name. That is the only
divergence among the 42 shared names, and it is a genuine finding — recorded because the cheap
comparison and the correct one disagree here, and only the correct one was trusted.

`verifies →` the milestone gate itself; no task contract asserts the whole-repo lane.

#### Re-measured after the five repairs — 2026-08-27

All five are fixed inline at this gate (see `## Findings`), and the lane was re-run **twice** to
measure the result rather than infer it from the arithmetic.

| run | result |
|---|---|
| Before the repairs | 6905 selected — 6859 pass, **46 fail** |
| After, run 1 | 6905 — 6863 pass, **42 fail** |
| After, run 2 | 6905 — 6863 pass, **42 fail** |

**The five target failures are gone in both runs**, confirmed by set-difference, not by the count:
`arch/FF-6607b`, `bundle-asset-manifest-complete/00`, `arch/69 FF-6904 extension`,
`arch/47 F-47-04-ARCH-2` and `arch/69 F-69-V7` all pass. 41 pre-existing failures remain, every one
of them also failing at `main`.

**42, not the 41 the arithmetic predicts — and the extra one is a DIFFERENT test each run.** Run 1's
was `installer-place/02 install.ps1 re-install with a DIFFERENT sidecar arch…`; run 2's was
`dispatch/02 two stories dispatched together never share a tree…`. Neither appears in the `main`
baseline or in either pre-repair run, both pass in isolation on repeat, and the branch touches
neither. Recorded as `F-55-M-6`: the lane carries **one intermittent environmental failure per run**,
which is a property of running 6,905 process- and filesystem-heavy tests in a single process, not a
defect this milestone introduced. The honest floor is therefore **41 stable + 1 varying**, and the
prediction of a clean 41 was wrong — recorded because a gate that rounds its own number is the thing
this milestone exists to prevent.

#### The operator's re-verify — 2026-08-27, `aof:verify 55 --solo`

**The recorded 6863/42 was re-run rather than cited, because the tree had moved since it was taken.**
Four files under `src/`/`test/` carry mtimes of 19:11, after `VERIFICATION.md` was written at 19:07
— `src/commands/validate.mjs`, `src/ready-wave.mjs`, `src/story-contract.mjs` and
`test/story-context-contract.test.mjs`. A measurement taken before a tree changed is a measurement of
a different tree, so the lane was driven again under the same driver and the same single exclusion.

| measurement | result |
|---|---|
| Full lane, re-run 2026-08-27 19:12–19:33 | 6909 selected — **6865 pass, 43 fail**, 1 excluded |
| The five gate repairs (`F-55-M-1` … `F-55-M-5`) | **all five absent from the failure set** |
| Both previously-observed intermittents (`installer-place/02`, `dispatch/02`) | absent |
| Milestone 55's OWN lane, run scoped and separately | **66/66 pass, 0 fail** |

**The five repairs hold, confirmed by set-difference rather than by the count** — `arch/FF-6607b`,
`bundle-asset-manifest-complete/00`, `arch/69 FF-6904 extension`, `arch/47 F-47-04-ARCH-2` and
`arch/69 F-69-V7` all pass. That is the claim this accept rests on, and it is measured directly.

**55's own lane is the evidence the churn cannot touch, and it is whole:** the six stories'
behavioural suites and all eight declared controls, run together — 55/00 4+3, 55/01 5+1+3, 55/02 6+2,
55/03 7+3, 55/04 13+3+2, 55/05 2+2+2+3+5 — **66/66**, FF-5501 through FF-5508 included.

**The 43 is NOT attributable, and the reason is a finding rather than an excuse.** A concurrent
session was writing this working tree throughout the run (`F-55-M-7`): `src/work.mjs` gained 66
uncommitted lines, `scripts/test.mjs` changed, a new untracked `test/work-story-span-scope.test.mjs`
appeared, and story 83's records were rewritten. Three of the 43 are attributable to that by
measurement, not by inference:

- `arch/53 FF-5308` reports `src/work.mjs` changed against the pin `c38f47fc65310db8…`. That digest
  is **exactly** the normalised digest of `src/work.mjs` **at `HEAD`** — so the control is green on
  the committed tree and red only on the concurrent session's uncommitted addition. Milestone 55
  touches the file in neither direction: `git diff main...HEAD -- src/work.mjs` is empty, as
  `SPEC.md`'s partition says it should be.
- `66/00 parse` reports the god node at **1426** lines. `HEAD` is 1339 and the worktree read 1405
  minutes later — three different numbers for one file, which is direct evidence the tree moved
  mid-measurement. It is also red at `HEAD` (1339 against the 1,209 it demands), so it is
  pre-existing as well as unattributable.
- `arch/43 ADR-014/E7` names an unregistered suite on disk; the new untracked
  `test/work-story-span-scope.test.mjs` is one the concurrent session added.

**So the count is withheld as a verdict and the set-difference is given instead** — which is exactly
what `F-55-M-6` established two runs earlier, now for a second and stronger reason. A second
confirming run was deliberately **not** taken: the tree is still moving (last write 19:34, three
minutes before this was written), so a re-run would measure different bytes and prove nothing about
either run.

`verifies →` the milestone gate itself; no task contract asserts the whole-repo lane.

## Fitness functions

<!-- THE RED-PROBE REGISTER. This block CITES: every row resolves to a declaration in the sibling
     `ARCHITECTURE.md` `## Fitness functions` register and declares nothing of its own.

     The `red probe` cell records what was changed to make the control fail, and the message
     observed. A control must fail when the invariant it guards is broken, so the probe is that
     assertion's positive control. A guard whose passing state is "found nothing" is
     indistinguishable from a broken one by every signal except a red probe.

     Each control is owned by its subject story — 55/00 carries FF-5501; 55/01 carries FF-5502 and
     FF-5503; 55/02 carries FF-5504; 55/03 carries FF-5507; 55/04 carries FF-5505 and FF-5506;
     55/05 carries FF-5508.

     TWO OF THE EIGHT ACT ON A GUARD ALREADY IN SERVICE, and each is a different case:

     · FF-5503 EXTENDS 52's purity guard. Its `enforced by` file already exists and already passes,
       so `control-unresolved` never fires for it — which makes the red probe the ONLY evidence that
       the *extension* is armed. An extension never observed failing is indistinguishable from one
       never written.

     · FF-5508 DELETES the third leg of 53's L3-lock guard, because that leg ("no `src/` module
       carries an executing branch keyed on L3") is necessarily false once L3 executes. Its red
       probe must therefore prove the REPLACEMENT is armed — that a config key or flag reaching L3
       trips it — and not merely that the old file still passes with a leg removed. A guard that
       gets quieter is the failure mode this row exists to rule out.

     FF-5501's probe has a second obligation the others do not: the additive claim. Widening an
     enum is trivially "green" against new records, so the probe must show the guard failing when a
     record milestone 52 delivered stops parsing — that is the leg protecting nine installed files. -->

| id | control | landed | red probe (what was broken, and the message observed) |
|---|---|---|---|
| FF-5501 | The taxonomy widens additively; `ground:` never on a loop; `observes:` never prose or unknown | `test/arch/acd-anchor-taxonomy-additive.test.mjs` — 3 tests green 2026-08-26 | Three probes, one per leg, each a temporary edit to `src/work-loops.mjs` restored byte-exactly afterwards (`sha256:86e4c168a896015b…`, verified by `cmp` against the pre-probe copy). **(a) The host leg** — `ground` added to `LOOP_KEYS`: *"Expected values to be strictly equal: true !== false"* on `ADMITTED_KEYS.loop.has("ground") === false`, and the contract test lost its `loop-key-not-admitted-for-kind`, leaving `[loop-bad-value]` where it demands both. **(b) The additive leg — the one protecting the nine installed files** — `exogenous` dropped from `GROUND_VALUES`: the back-compat test went red with a `loop-bad-value` finding raised against a milestone-52 record that had parsed clean a moment earlier, and the literal-equality leg reported the six-member array short one member. **(c) The `observes:` leg** — `pointerField` given a `?? { kind: "prose" }` fallback: the contract test read `[loop-field-prose-only, loop-key-not-admitted-for-kind]` where it demands `[loop-bad-value, loop-key-not-admitted-for-kind]` — a prose-backed anchor had been silently admitted as an honest declared gap. |
| FF-5502 | Grounding is seeded by `ground:` on any permitted host; the flood and decomposition are unchanged; no sixth edge key | `test/arch/acd-anchor-grounding-seed.test.mjs` — 1 test green 2026-08-27 | **The seed made kind-keyed rather than ground-keyed.** `analyseGrounding`'s predicate in `src/work-loops-checks.mjs` narrowed from `(node.kind !== "actor" && node.kind !== "anchor")` to `node.kind !== "anchor"`, so a node bearing `ground:` on the *other* permitted host stops seeding — restored byte-exactly afterwards (`sha256:ba6692202380915a…`). Red: *"Expected values to be strictly deep-equal: + [] − ['process-exit']"* on the component's `groundClasses`, for every one of the six `GROUND_VALUES` on a `kind: actor` host. The `anchor` half of the loop stayed green throughout, which is the point of the probe — a kind-keyed seed is invisible to any test that only ever seeds anchors. |
| FF-5503 | Resolution never enters the pure checks — the resolution map is a parameter *(extends a guard in service)* | `test/arch/acd-loop-checks-pure.test.mjs` *(extended)* — 3 tests green 2026-08-27 | **The pure check made to resolve the authority itself.** `authorityResolved(resolutions, id, pointer, …)` replaced by `readFileSync(pointer.slice(pointer.indexOf(":") + 1), "utf8")` in `src/work-loops-checks.mjs` — the injected map ignored and the I/O pulled back inside the checks; restored byte-exactly (`sha256:ba6692202380915a…`). Red: *"The input was expected to not match the regular expression /node:fs|readFile|readdir|access\s*\(|stat\s*\(|process\.cwd|Date\.now|\bfetch\s*\(/"* against the checks source. 52's three original legs stayed green, so the **extension** is what caught it — which is the only evidence available that the extension is armed rather than merely written. |
| FF-5504 | Provenance stamped at write time, injected, refused when incomplete, never back-filled | `test/arch/acd-provenance-stamped-at-write.test.mjs` — 2 tests green 2026-08-27 | **The compiler given a clock and a back-fill in one line.** `if (!presentString(candidate.at)) missing.push("at");` replaced by `candidate.at = new Date().toISOString();` in `src/claim-provenance.mjs` — restored byte-exactly (`sha256:39ae7234c00bcd50…`). Red: *"the pure compiler does not read new Date("*. One edit breaks both halves ADR-003 forbids together: the leaf acquires an effect source, and an incomplete claim is completed by guesswork instead of refused. |
| FF-5505 | Every enforcement-point rule traces to a declaration; the permissions merge stays surgical | `test/arch/acd-frozen-set-compiled.test.mjs` — 3 tests green 2026-08-27 | **The destructive merge restored.** `const merged = { ...current, ...otherSettings };` → `{ ...current, ...settingsPatch }` in `src/claude-settings.mjs` — restored byte-exactly (`sha256:fceba109bd972e61…`). Red: *"the co-authored permissions merge regressed"* carrying `['the destructive top-level settingsPatch spread is present']` — the operator's permission array silently overwritten, which is the co-authorship failure this control exists for. The suite's own in-file probe case went red alongside it (*"the red probe changed the real merge line"*): its in-memory mutation is a no-op once the real line already carries the defect, so that case is a tautology guard over the assertion, not a second copy of it. |
| FF-5506 | Tamper on a frozen member is a coded event; the marker-removal escape hatch survives | `test/arch/acd-frozen-set-tamper-coded.test.mjs` — 2 tests green 2026-08-27 | **The tamper downgraded to ordinary drift.** `code: "frozen-set-tamper"` → `code: "drift-warning"` in `src/claude-settings.mjs` — restored byte-exactly (`sha256:fceba109bd972e61…`). Red: *"the coded tamper or human escape-hatch contract regressed"* carrying `['the coded tamper event is absent']`. An edit to a frozen member reported as the pre-existing preference-drift warning is exactly the quiet success ADR-004 names, and the guard refuses to let the two collapse into one code. Its in-file probe case went red for the same tautology reason as FF-5505. |
| FF-5507 | Raw capture precedes classification; no capture path accepts a classification argument | `test/arch/acd-raw-capture-before-classification.test.mjs` — 3 tests green 2026-08-27 | **A menu re-opened by one field.** `severity: { type: "string" }` added to `work:feedback`'s input properties in `src/commands/feedback.mjs` — restored byte-exactly (`sha256:e04e1bca521b95d2…`). Red: the frozen key-list equality failed, reporting `['ref','note','actor','refs','severity']` against the four the contract admits, and the per-field ban on `severity` failed with it. The refusal lives in the schema rather than in prose, so a classification cannot be re-introduced by adding a flag. |
| FF-5508 | L3 is earned, never configured; the lock's obsolete leg is deleted and the rest re-armed *(supersedes a guard in service)* | `test/arch/acd-loop-level-l3-gated.test.mjs` — 5 tests green 2026-08-27 | **Two probes, because this row supersedes a guard in service and a guard that gets quieter is the failure mode it exists to rule out.** Both on `src/work-loop.mjs`, each restored byte-exactly (`sha256:99035c81f4b0b6e3…`). **(a) A configured L3** — `if (gate?.config?.work?.loop?.allowL3) return { admitted: true, level };` planted at the head of `resolveLoopLevelGate`: *"The input was expected to not match the regular expression /\bconfig\b|process\.env|\benv\b|\bflag\b/"* over the sliced gate body — a setting that hands the rung over is caught at the source, not left to a fixture that happens to pass one. **(b) The score half neutered** — `const score = l3ScoreFailure(gate?.loopReady);` → `const score = null;`: *"The input did not match the regular expression /gate\?\.loopReady/"*, and the gate stopped refusing a 99-against-100 workspace. The replacement is armed on both halves, not merely present where 53's deleted leg used to sit. |

## Findings

<!-- THE REGISTER. One row per defect or gap, `id` ALONE in the first cell — that is what makes this
     block readable by `aof work doctor`'s `register-duplicate-id` check.

     Ids are allocated HERE, by the single writer, at the moment the finding lands — never by the
     reviewer that reported it and never from a prior read of this table. A stale read looks exactly
     like a fresh one, and concurrent story dispatch makes that the normal case; the check is the
     residue-catcher, not the prevention. -->

| id | observed | type | severity | triage | routed to | status |
|---|---|---|---|---|---|---|
| F-55-00-1 | 53's FF-5312 lost a leg rather than gaining a case. `test/arch/acd-registry-single-home.test.mjs` asserted `git ls-files -- .aof/loops` returned exactly nine paths — *"all installed records are tracked"*. That assertion is timing-coupled to the commit: the two new anchor records are on disk and not yet committed, so it went red. It was **replaced** by a per-file `git check-ignore` asserting each record is not ignored, which is a strictly weaker claim — a record installed but never `git add`ed now passes where it previously failed. | defect | non-blocker | **Defer to backlog.** Real, and narrow. On a clean CI checkout the tracked-ness is still enforced transitively: an uncommitted record does not exist in `.aof/loops` there, so the `readdir` equality against `src/bundle/loops` fails first. The loss is local-working-tree only. The honest repair is a leg that accepts *tracked or staged-and-not-ignored* rather than one that drops tracking, and it belongs with whichever story next touches this control — this story's charter is to widen a taxonomy, not to re-cut a milestone-53 guard. | backlog — next story touching `acd-registry-single-home` (55/01 or 55/04) | open |
| F-55-02-2 | **`src/run-store.mjs` lost a SECOND byte-freeze in 55/02, and `F-55-02-1` recorded only the first.** `arch/69 FF-6908` asserted the file byte-unchanged from milestone 68 (`sha256:40fd3ee61226cb3d…`, the same digest FF-5307 pinned). 55/02 needed to change the file, and the assertion was **replaced** with a narrower one — `buildRecord`'s top-level key list plus a `provenance\|anchorReadings` denylist — with the test's own name rewritten from *"run-store.mjs is byte-unchanged from milestone 68"* to *"the run record's top-level schema is unchanged…"*. Found 2026-08-27 while partitioning this milestone's commits, not at either gate. | defect | non-blocker | **Defer to backlog, and correct the record.** This one is the *least* wrong of the four and is worth saying so: a whole-file byte-freeze over a module later milestones must legitimately edit is unsustainable, the replacement keeps the control's stated intent (*"does not reshape run-store's keys, states, or transitions"*), and it kept a **planted-key probe** — so it re-aimed rather than merely quieted. Two things are still wrong with it: it is strictly weaker (the file may now change arbitrarily outside `buildRecord`'s key list), and it was done **silently** — no finding, no ADR, no note. The repair is a declaration, not a diff: the re-aim ratified where FF-6908 is declared. Byte-coverage of the file itself is already restored by `F-55-02-1`'s FF-5307 re-pin. | backlog — `aof-architect` ratifies FF-6908's re-aim; `aof:retrospective 55` gets the pattern | open |
| F-55-01-3 | The five story accept decisions written at the 2026-08-27 gate were filed under `## Verification evidence` rather than `## Accept decision`, so the record doc's own stated four-section contract (its header comment) did not hold — a reader looking for what was accepted found it in the section that answers what was *observed*. | defect | non-blocker | **Fixed inline at this gate** by moving the five blocks, verbatim and lossless, into `## Accept decision` in item order. Recorded rather than folded in silently, because the misfile is a single-writer slip in the artifact the single-writer rule exists to protect, and the retrospective is entitled to know the rule did not prevent it. | `aof:verify` (this gate) | **closed** |
| F-55-01-1 | **FIXED 2026-08-27 (inline at verify, operator's call — the 53/F-14 precedent).** The route was deleted, `src/board-ui.mjs` is back at the milestone base `d76bfdaf42032c93…` (measured, not assumed), FF-5307's pin is restored to that digest, and `loops-groundedness` joins `loops-show`/`loops-graph`/`loops-validate` in `BOARD_DEFERRED` with their reason recorded on it. Lane green at 169/169, widened to the three bijection/board suites the repair touches. **The original finding follows.** 55/01 added a `/api/work/loops-groundedness` route to `src/board-ui.mjs` (thirteen lines at `:137`) and did not re-pin 53's FF-5307 frozen board seam, so `test/arch/acd-loop-state-rides-the-run-record.test.mjs` is red — `e3b4378c55a57a3f…` against the pinned `d76bfdaf42032c93…`. Nothing consumes the route: no `ui/` reference and no test names it, and the story's own contract (`03_the-report-face.feature`) asks for a **registered command**, which `work:loops-groundedness` already is. The milestone SPEC ships no UI surface and the milestone has no `DESIGN.md`. | defect | **blocker** | **Back to `aof:continue 55/01`.** A control in service is red and the story cannot be accepted over it. Preferred repair: delete the route — unrequested, unconsumed, and its removal restores the pin with no other change, proved by controlled revert (136/136, and 55/02's lane 49/49). If the board face is genuinely wanted it is a declared scope change, and the pin is then re-pinned deliberately rather than left failing. | 55/01 — `aof:continue` | **closed** |
| F-55-01-2 | **The repair attempt reversed a decision recorded at another milestone's gate, on a premise that is false.** `F-55-01-1` came back with the route kept and 53's FF-5307 pin moved to `e3b4378c55a57a3f…` to bless it, under a comment reading *"the command/board bijection requires every registered `work:*` read to have the same in-process face."* It does not: `acd-work-command-route-coverage.test.mjs` carries a `BOARD_DEFERRED` door, and the three sibling reads `loops-show` / `loops-graph` / `loops-validate` were put inside it at 53's gate as `m53/F-14`, with a **stronger** reason than deferral — *"a served `/api/work/loops-*` would be a door no UI is permitted to open"* (m52's FF-5202 asserts `ui/` never references the loop family). So the one door the milestone had for this exact case was not read, and a frozen seam was moved instead. Neither half of `F-55-01-1`'s stated escape hatch held either: nothing consumes the route, and no scope change was declared in `SPEC.md` or `STATE.md` — which still read *"Next step is `aof:continue 55/01` to remove the route."* | defect | non-blocker | **Fixed inline at this gate** (see `F-55-01-1`) and **routed to the retrospective**, which is where its value is. It is the **third of four** instances in one milestone of a guard being edited rather than the cause removed — `F-55-00-1` dropped a leg, `F-55-02-1` dropped a pin, this one moved a pin, and `F-55-02-2` replaced a byte-freeze with something narrower — and the four together say something no single instance does: when a control in service goes red under a story's own change, the reflex is to edit the control. The countermeasure is not "check first"; it is that **a frozen seam moves only on a declaration, never on a diff** — the same shape as FF-5302's *"raising the ceiling is an ADR decision, not a diff."* | `aof:retrospective 55` — the pattern, not the instance | **closed** |
| F-55-02-1 | **FIXED 2026-08-27, in the edit it was routed to.** `src/run-store.mjs` is re-pinned in FF-5307's map at its post-55/02 digest `bac4e6d95bf9af9a…` — a new pin, not a restored stale one, because the story's change to the store is in scope — and the test's name has its "store and" restored. **The original finding follows.** 55/02 legitimately changed `src/run-store.mjs` and then **removed** its pin from FF-5307's frozen map rather than re-pinning it (`40fd3ee61226cb3d…` deleted; the test's own name lost the words "store and"). The guard lost a leg instead of gaining a case: `src/run-store.mjs` is now covered by no byte-freeze at all and may drift without FF-5307 noticing. | defect | non-blocker | **Defer to backlog.** The story's change to the run store is in scope and correct; only the maintenance of the freeze is wrong, and the repair is one line — re-pin `src/run-store.mjs` to its post-55/02 digest instead of dropping the entry. Route it with `F-55-01-1`'s repair, which re-pins the sibling `src/board-ui.mjs` entry in the same map. Recorded emphatically because this is the **second** instance in one milestone of a guard being quieted rather than re-aimed (`F-55-00-1` was the first) — the pattern, not either instance, is what goes to the retrospective. | backlog — with `F-55-01-1`'s repair (same map, same file); **status corrected to `closed` at the operator's re-verify** (`F-55-M-8`) | **closed** |
| F-55-M-1 | **FIXED 2026-08-27, inline at this gate.** 53's FF-5305 row is **amended in place** — the idiom that register already uses (four rows were “CORRECTED IN PLACE, each carrying the correction and its source” at 53/ADR-015) — recording the discharge its own row pre-authorised and RE-POINTING `enforced by` at the successor control `test/arch/acd-loop-level-l3-gated.test.mjs`. The row is not deleted: a discharged obligation that MOVED is not the same as one that never existed, and the successor asserts at `:89` that the old file is absent, so it proves this very discharge. ADR-006's Invariant prose and the register preamble carry the same note. `arch/FF-6607b` 6/6 green. **The original finding follows.** A `done` milestone is left holding a control that no longer resolves, and the control that refuses exactly this is red.** 55/05 DELETED `test/arch/acd-loop-level-l3-locked.test.mjs` (230 lines, commit `baaf3f7`) — correctly, since its third leg is necessarily false once L3 executes — but milestone **53**, `status: done`, still DECLARES `FF-5305` against that path in its `ARCHITECTURE.md` register, row marked *"MEASURED 2026-08-17: 3/3 GREEN"*. `arch/FF-6607b` (*"NO `done` item's register declares an UNRESOLVED control, marker or no marker — the accept-transition refusal"*) now fails naming `53/FF-5305 → test/arch/acd-loop-level-l3-locked.test.mjs`. Confirmed by revision: the file is present at `main` (`ccafd3f6…`) and deleted on this branch. | defect | **blocker** | **Back to `aof:continue 55/05`.** FF-5305's own row states *"Discharge condition: milestone 55"*, so recording the discharge is what was always intended and is not a scope change: drop the declaration, or re-point it at the superseding `FF-5508` / `test/arch/acd-loop-level-l3-gated.test.mjs`, in **53's** `ARCHITECTURE.md` where it is declared. What does NOT clear it is re-marking it `pending` or deleting the assertion — the same trap this milestone has now hit five times. This one is a blocker rather than a deferral because it is the accept-transition refusal itself: accepting 55 over it would be accepting the exact transition the control exists to stop. | 55/05 — fixed inline at the milestone gate | **closed** |
| F-55-M-2 | **FIXED 2026-08-27, inline at this gate.** The census literal is **moved, not softened** — 76 → 80 — which is what the control's own comment demands of it (*“that is the tripwire working as designed and is exactly why it must be moved”*). The recurrence is recorded beside the two the comment already names (m53's F-20, m69's F-69-V21), with the composition re-measured rather than arithmetic: 3 root + 8 agents + 25 commands + 14 hooks + 3 skills + 16 templates + 11 loops. The test's own NAME carried the stale `(76 files)` too, and is moved with it. 3/3 green. **The original finding follows.** The bundle grew by four files and the control that counts them was not told.** `bundle-asset-manifest-complete/00` asserts *"the real `src/bundle/**` tree carries exactly 76 files"* and reports `80 !== 76`. Measured by revision: `main` carries 76, `HEAD` carries 80, and the four added are exactly this milestone's — `src/bundle/frozen-set.jsonc` and `src/bundle/hooks/guard-test-isolation.mjs` (55/04), `src/bundle/loops/rubric-process-exit.md` and `src/bundle/loops/run-liveness.md` (55/00). | defect | non-blocker | **Defer to backlog.** The literal is a census the milestone legitimately moved, and the repair is to re-measure it to 80 — a re-aim, not a quieting, since the set-equality legs either side of it still do the real work. Recorded rather than fixed inline because it is the same class as `F-55-00-1`/`F-55-02-1` and the retrospective is entitled to the count. | fixed inline at the milestone gate | **closed** |
| F-55-M-3 | **FIXED 2026-08-27, inline at this gate, by EXTENDING the control rather than adding a file.** A sibling `guard-test-isolation.json` would have been a SECOND competing declaration of one hook entry — exactly what 55/04 exists to remove, since `frozen-set.jsonc`'s `test-isolation` member already carries `event`/`matcher`/`command`/`args`. So FF-6904 now reads BOTH declaration kinds — a sibling `.json` descriptor, or a frozen-set member whose compiled rule installs the body — normalised to one `{type, command, args}` triple and BOTH held to exec form. **Red-probed:** an undeclared body planted in `src/bundle/hooks/` still fails, naming both admissible sources; tree restored to 80 files. 5/5 green. **The original finding follows.** A hook was added to the bundle without the descriptor every other bundled hook carries.** `arch/69 FF-6904 extension (acd-artifact-sync-hook-derivation-free)` — *"every bundled hook body derives nothing, exits successfully, and is installed in exec form"* — fails on `guard-test-isolation.mjs has a bundled hook descriptor`. 55/04 shipped `src/bundle/hooks/guard-test-isolation.mjs` (181 lines) as the compiled output of the `test-isolation` frozen member; milestone 69's control requires a descriptor for each bundled hook and finds none for it. | defect | non-blocker | **Defer to backlog, with `F-55-M-2`.** The hook itself is the story's headline deliverable and is not in question; what is missing is its registration in the shape 69 already requires of every sibling. Fixing it is additive — supply the descriptor — so nothing about 55/04's contract changes. | fixed inline at the milestone gate | **closed** |
| F-55-M-4 | **FIXED 2026-08-27, inline at this gate.** The slice is replaced by `markedRegion(bundle, "---", "---")` from `test/support/source-slice.mjs` — the ONE home milestone 47 ledgered — with an explicit not-found guard on the next line, so a renamed or absent closing fence fails as NOT FOUND instead of silently asserting the classification ban over a two-character “header”. Both FF-5507 (3/3) and `arch/47 F-47-04-ARCH-2` (2/2) green; the ledger is back to zero positional slices. **The original finding follows.** A new fitness function cuts source positionally, which the ledger allows zero of.** `arch/47 F-47-04-ARCH-2 (acd-test-suite-registration)` names `test/arch/acd-raw-capture-before-classification.test.mjs` — 55/03's own arch-test, new on this branch — for *"1 positional slice(s), ledgered for 0"*: `const header = bundle.slice(0, bundle.indexOf("---", 4) + 3);`, a slice whose end is a second `indexOf` sentinel. The control's message states the cause it exists for: *"six instruments found wrong about the tree across milestones 45-47"*, an `indexOf` end assuming a declaration order nothing pins. | defect | non-blocker | **Defer to backlog.** The named fix is mechanical and already has one home — `test/support/source-slice.mjs`, whose helpers return `null` when the cut cannot be made so the caller reports NOT FOUND loudly instead of asserting over the wrong region. Worth more than its severity suggests: this milestone's subject is instruments that can be trusted, and it shipped an instrument of the exact kind milestone 47 ledgered to extinction. | fixed inline at the milestone gate | **closed** |
| F-55-M-5 | **FIXED 2026-08-27, inline at this gate, by RE-AIMING rather than re-pinning.** Re-measuring the regex to the new spelling would have restored green and left the identical tripwire for the next refactor. The control now cuts the call's own argument span by MATCHING PARENS through `matchedParenSpan` and asserts `ref: act.ref` and `run: true` WITHIN it — so extra keys are admitted (55/02's `claimRun` is legitimate provenance work) while a missing ref or a `run: false` is not, and a moved call fails as NOT FOUND. **Red-probed:** `run: true` → `run: false` in `src/commands/loop.mjs` fails with *“the grade is RUN, not read from a stale record”*; file restored byte-exactly (`cmp` clean, `git diff` empty). 3/3 green. **The original finding follows.** A milestone-69 control over the loop command's reach no longer matches the rewritten loop shell.** `arch/69 F-69-V7` (*"the loop command reaches the progress producer and decision authority"*) fails: its pinned regex `/invokeRegistered\("work:grade",\s*\{\s*ref:\s*act\.ref,\s*run:\s*true\s*\}/u` no longer matches, because 55/05 rewrote `resolveInvocation` and the loop shell around the computed L3 gate. The reach itself is not shown to be lost — the control asserts one literal call SHAPE, and the shape moved. | defect | non-blocker | **Defer to backlog, and re-aim rather than re-pin.** The honest repair is a control that asserts the loop still REACHES `work:grade` through the registry, not one pinned to an argument-object spelling that any refactor invalidates — a source-text regex over a call site is the same brittle-instrument class as `F-55-M-4`. Re-measuring the regex would restore green while preserving the defect. | fixed inline at the milestone gate | **closed** |
| F-55-M-6 | **The full lane is not exactly reproducible: every run carries one intermittent failure, and it is a different test each time.** Two post-repair runs of the identical tree both reported 42 rather than the 41 the repairs predict, and the 42nd differed — `installer-place/02 install.ps1 re-install with a DIFFERENT sidecar arch` in one, `dispatch/02 two stories dispatched together never share a tree` in the other. Both pass on repeat in isolation, neither fails at `main` or in either pre-repair run, and the branch touches neither. Both are process- and filesystem-heavy (spawned PowerShell + archive extraction; concurrent git worktrees), which is the signature of resource pressure late in a 6,905-test single-process run rather than a defect in either test. | defect | non-blocker | **Defer to backlog — not this milestone's, and named rather than absorbed.** It matters beyond its severity: the milestone gate's whole authority rests on a lane whose number is reproducible, and this one is reproducible only to ±1 with the identity of the ±1 unknown in advance. A gate cannot distinguish “the lane is clean” from “the lane is clean apart from today's flake” without knowing that, so the count alone is not a verdict — the **set-difference** is, which is how all five repairs above were confirmed. The repair is either process isolation for the spawning suites or a declared retry with the retry recorded, and it belongs with milestone 59's instrument audit. | backlog — `aof:retrospective 55`, then 59 (the instrument audit) | open |
| F-55-M-7 | **The milestone gate's full lane was measured against a working tree a CONCURRENT SESSION was writing, so its count attributes to nothing.** During the 19:12–19:33 re-run, another session building story 83 added 66 uncommitted lines to `src/work.mjs`, changed `scripts/test.mjs`, added an untracked `test/work-story-span-scope.test.mjs` and rewrote 83's records. The god node read **1426** lines to the test, **1339** at `HEAD` and **1405** in the worktree minutes later — one file, three numbers, which is the churn measured rather than suspected. Three of the 43 failures trace to it directly (`arch/53 FF-5308`, whose expected pin `c38f47fc65310db8…` is *exactly* `HEAD`'s digest; `66/00 parse`'s line count; `arch/43 ADR-014/E7`'s unregistered-suite list). | defect | non-blocker | **Defer to backlog — not this milestone's defect, and named rather than absorbed.** No failure in the set is attributable to 55: its own 66-test lane is green, and all five gate repairs are confirmed gone by set-difference. What is damaged is the GATE, not the milestone — `aof:verify`'s scope rule puts the whole repo's lane at exactly one place, and that place has no exclusive hold on the tree it measures. `F-55-M-6` said a count is not a verdict because the lane varies by ±1; this says it is not a verdict because the SUBJECT varies. The repair is a gate that measures a fixed revision — a clean checkout, or a recorded `git stash` boundary — rather than whatever the tree happens to be. | backlog — `aof:retrospective 55`, then 59 (the instrument audit), with `F-55-M-6` | open |
| F-55-M-8 | **`F-55-02-1`'s register row narrated its own repair and left its `status` cell reading `open`.** The row's observed cell has read *"FIXED 2026-08-27, in the edit it was routed to"* since the 55/01 second gate, and `STATE.md` records the same closure, but the status column was never moved off the value it carried when the finding was deferred. The repair itself is real and was confirmed at source, not from the narration: `test/arch/acd-loop-state-rides-the-run-record.test.mjs:107` carries `["src/run-store.mjs", "bac4e6d95bf9af9a…"]` in FF-5307's pin map. | defect | non-blocker | **Fixed inline at this gate** by moving the cell to `closed` and citing this id in its routed-to column. Recorded rather than corrected silently, for the same reason `F-55-01-3` was: it is a single-writer slip in the artifact the single-writer rule exists to protect, and a register whose status column disagrees with its own prose is a register a check cannot read. The class is now twice in one milestone, which is the retrospective's material and not this row's. | `aof:verify` (this gate) | **closed** |

**Not recorded as findings, and why.** `aof work validate` reports one stream issue —
`78/SPEC.md — depends "79" does not resolve to a milestone/uat item`. It is pre-existing and not
this story's: `79` is a **story**, not a milestone, and neither `78` nor `79` is touched on this
branch (`git diff main...HEAD` over both is empty). `aof work doctor 55` reports
`control-unresolved` at warn for FF-5502/5504/5505/5506/5507/5508 and
`verification-missing-red-probe` at error for the same seven rows minus 5503 — those are the six
unbuilt stories of this milestone, and each clears when its own story lands its arch-test. Neither
class blocks 55/00.

**Re-read at 2026-08-27, when 55/01–05 landed.** `aof work doctor 55` now reports **no
`control-unresolved` at either severity** — all eight declared controls resolve to a file that
exists — and the seven `verification-missing-red-probe` errors clear with the register above. What
remains is three classes, none of them a finding: `numbering-gap` (stream-level, ten missing top-level
numbers between 00 and 82), `control-runner-unchecked` and `rubric-join-unchecked` (both say a
*configuration* is absent — `work.controls.runners` and `work.rubric.report` — so a leg did not run,
which is a gap in this repo's config rather than a defect in the milestone), and the same pre-existing
`78 → 79` depends edge argued above. Separately, `wiki/work/83_story_agent-layer-bounds/` carries an
uncommitted `RETROSPECTIVE.md` deletion and a `STORY.md` body rewrite on this branch; 83 is a
different item, still `in-review`, and its retrospective was written before its accept, so its removal
is not a regression on a shipped record and is not this milestone's finding.

**Re-read at the MILESTONE gate, 2026-08-27.** The three classes argued above still stand and none
has moved: `numbering-gap`, the `control-runner-unchecked`/`rubric-join-unchecked` pair (both report a
missing *configuration*, not a defect), and the pre-existing `78 → 79` depends edge — re-verified at
this gate rather than re-read, and `79` is indeed a **story**, with `git diff main...HEAD` over both
`78` and `79` empty. `aof work doctor 55` adds one new warn, `mtime-ahead-of-updated` on 55/00, which
was true and is now fixed: 55/00's `OUTCOME.md` was legitimately edited on 2026-08-27 when 55/01
discharged two of its gaps, while its `STORY.md` still read `updated: 2026-08-26`; the date is bumped.

**The `pending` marker on FF-5508 is cleared in `ARCHITECTURE.md`**, because its arch-test landed with
55/05. This is the sanctioned clearing — the file resolves — and not a re-marking.

**What the milestone gate found that no story gate could.** The five findings above exist because the
full lane runs exactly once, here. Each story ran its own scoped lane and was green on it; all five
regressions are in controls owned by OTHER milestones (53, 69 ×2, 47, and the bundle census), which no
story's scoped lane runs. This is the documented trade in `aof:verify`'s own scope rule — *"a poisoning
story is caught at the gate, not immediately, and may need rework after being marked done. That is the
intended trade, not an oversight"* — being paid in full, by five stories already marked done.

## Accept decision

### 55/00 · The anchor taxonomy — **ACCEPTED** 2026-08-26

The close criteria, each checked rather than assumed:

- **Scenarios green.** 98/98 across the story's own two suites and the seven milestone-52/53 suites
  it edits. The suite was scoped to the story, not widened to the repo: the full lane runs once at
  the milestone gate, and it cannot run on this machine anyway while the control daemon holds `:4182`.
- **FF-5501 is armed, not merely present.** All three legs were driven red on purpose and the source
  restored byte-exactly — see the register row. The additive leg in particular was proven to fail
  when a milestone-52 record stops parsing, which is the leg that protects the nine installed files.
- **`aof work doctor 55/00`** reports no `control-unresolved` at either severity and no
  `verification-missing-red-probe`. Its two warns (`numbering-gap`, `rubric-join-unchecked`) are
  stream- and config-level, not story-level.
- **`aof work validate`** is clean over the whole `55` subtree; its single issue is the pre-existing
  `78 → 79` depends edge, argued above.
- **No blocker finding is open.** `F-55-00-1` is a non-blocker, deferred with a named repair.

The story delivered less code than the milestone's other five will and more care than any of them:
the widening's whole risk is what it might have broken, and the evidence above is mostly negative
space — nine records that still parse, one host that did not widen with its enum, one field where a
paragraph is still refused. Two anchors were declared and no third was invented to make a future
score look better.

### 55/01 · The groundedness report — **ACCEPTED** 2026-08-27

Declined at the first gate on `F-55-01-1`, repaired at this one, and accepted on the criteria below —
each checked rather than assumed:

- **Scenarios green.** 169/169 across the story's own two suites, every suite covering a module it
  edits, and the three bijection/board suites the repair touches. Scoped to the story, not widened to
  the repo; the full lane runs once at the milestone gate, and cannot run on this machine anyway while
  the control daemon holds `:4182`.
- **FF-5502 and FF-5503 are armed, not merely present.** Both were driven red on purpose against real
  source edits and `src/work-loops-checks.mjs` restored byte-exactly (`sha256:ba6692202380915a…`) —
  see the register. FF-5503's probe is the only available evidence that 52's purity guard was
  genuinely *extended* rather than merely re-passed, which is why it is recorded at length.
- **The blocker is closed at its cause, not around it.** The `/api/work/loops-groundedness` route is
  deleted, `src/board-ui.mjs` measured back at the milestone base `d76bfdaf42032c93…`, FF-5307's pin
  restored to that digest, and `loops-groundedness` filed in `BOARD_DEFERRED` beside its three
  siblings under the reason 53's gate recorded for them. The report keeps every face its contract
  asked for — a registered command, a frozen `--json` document, and the in-process
  `invokeRegistered` call 55/05's L3 gate makes — and gains no HTTP door.
- **`aof work doctor 55/01`** reports no `control-unresolved` at either severity and no
  `verification-missing-red-probe`. Its two warns (`numbering-gap`, `rubric-join-unchecked`) are
  stream- and config-level, not story-level.
- **`aof work validate`** carries its single pre-existing `78 → 79` depends issue, argued below the
  findings register and untouched by this branch.
- **No blocker finding is open.** `F-55-01-1`, `F-55-01-2`, `F-55-01-3` and `F-55-02-1` are all closed
  at this gate; `F-55-00-1` remains an open non-blocker with a named repair and a named home.

The story's own substance was never in doubt and is worth stating plainly, because the two gates it
took were spent entirely on a thirteen-line addition nobody asked for: the report names this
repository's four unanchored loops **by name** — `loop:autonomous-cascade`,
`loop:retrospective-memory-ingest`, `loop:review-fix-rereview`, `loop:verify-triage-accept` — over 11
components at 5 anchored / 2 exogenous-only / 4 self-referential. That is the milestone's whole
premise arriving as a fact about this repo rather than a claim about the algorithm, and it is not
flattering, which is the point.

### 55/02 · Provenance at write time — **ACCEPTED** 2026-08-27

- **Scenarios green.** 49/49 on this story's own bytes, across its two suites and the seven
  grade/run-record suites it edits. Scoped to the story, not widened to the repo. The 48/49 the
  working tree currently shows is `F-55-01-1`, in a shared suite this story neither owns nor broke —
  established by reverting `src/board-ui.mjs` alone, not by argument.
- **FF-5504 is armed.** One edit gave the pure compiler a clock and a back-fill in the same line, and
  the guard went red on it; the source was restored byte-exactly.
- **`aof work doctor 55`** reports no `control-unresolved` at either severity, and no
  `verification-missing-red-probe` once the register above landed.
- **`aof work validate`** is clean over the `55` subtree; its only issue is the pre-existing `78 → 79`
  depends edge.
- **No blocker finding is open against this story.** `F-55-02-1` is a non-blocker with a one-line
  named repair, routed to travel with `F-55-01-1`.

The story's real content is negative space: a compiler that imports nothing, a write path with no
transcript, mtime or directory listing anywhere in it, and a refusal that declines to complete what it
was not given. That is the whole point — a claim you can defend is one nothing was allowed to invent.

### 55/03 · Raw capture before classification — **ACCEPTED** 2026-08-27

- **Scenarios green.** 67/67 across the story's two suites and the CLI/board faces its capture path is
  reached through.
- **FF-5507 is armed.** Adding a single `severity` field to the capture input drove it red on the
  frozen key list and on the per-field ban; the source was restored byte-exactly.
- **`aof work doctor` / `aof work validate`** as above — clean at story level.
- **No finding is open against this story.**

The rule was already the arc's instinct and is now structural in three independent places: the schema
refuses the field, the ledger has no rewrite primitive, and the raw append is lexically before the
projection. Any one of the three could be argued away; together they mean the menu cannot ask first.

### 55/04 · The frozen set, compiled — **ACCEPTED** 2026-08-27

- **Scenarios green.** 41/41 across the story's three suites plus the settings-merge and
  bundle-delivery suites it writes through.
- **FF-5505 and FF-5506 are both armed.** Restoring the destructive permissions spread and downgrading
  the tamper code to ordinary drift each drove their guard red; `src/claude-settings.mjs` was restored
  byte-exactly after both.
- **The declared-but-not-compiled member is honest, not missing.** `compiled.deferred === ["gate-order"]`
  — the mesh worker envelope has a spelling and no pretence of enforcement, per ADR-004 §2.
- **`aof work doctor` / `aof work validate`** clean at story level; **no finding is open** against it.
- **One gap, carried rather than hidden:** this repo's own `.claude/` still runs the pre-55 hand-wired
  hook until `aof work update` installs the compiled member. Recorded on the story's `OUTCOME.md` with
  its discharge condition, and evidenced above by an over-block observed during this very session.

The milestone's claim was that one hand-wired rule could become a declaration with a compiler under
it. Six members now compile to traced hook entries, surgical permission denials and agent tool scopes,
and the one that cannot reach its enforcement point says so instead of pretending.

### 55/05 · L3 unlocked — **ACCEPTED** 2026-08-27

- **Scenarios green.** 87/87 across the story's four suites plus 53's entire ladder, gate-order and
  Loop-Ready surface — the widest story lane in this milestone, because this story re-arms a guard in
  service rather than only extending one.
- **FF-5508 is armed on both halves.** Two probes, because the row *supersedes* 53's L3 lock by
  deleting its third leg: a planted config admission was caught at the source, and neutering the score
  half was caught behaviourally. A guard that merely got quieter would have survived one probe and
  failed the other; this one failed both.
- **Earned, and observably so.** `aof work loop 55 --level L3 --dry-run --json` on this workspace
  refuses with `loop-level-gate`, `failingHalves: ["score","groundedness"]`, `score: 40` against
  `threshold: 100`, the six blocking checks named and the ungrounded components listed. The rung is
  open and this workspace has not earned it — which is the correct answer, not a defect.
- **`aof work doctor` / `aof work validate`** clean at story level; **no finding is open** against it.

The threshold left open at refine resolved to `L3_SCORE_THRESHOLD = 100` — every composed check, not a
negotiated majority. Given the milestone's subject that is the defensible reading: a rung that runs
unattended should not open on a score that already tolerates a failing instrument.

### 55 · The milestone — **READY FOR RE-VERIFY** 2026-08-27

Still not accepted here, and deliberately so: the operator asked for the repairs inline and will
re-run `aof:verify 55` themselves. `status` stays `in-progress`; `aof work status 55 done` has NOT
been run.

**The gate's DECLINE of 2026-08-27 and what answered it.** The milestone was declined earlier the same
day on a red full-lane sweep whose five attributable failures were `F-55-M-1` … `F-55-M-5`, one of
them — `F-55-M-1` — a blocker by construction rather than by judgement, since `arch/FF-6607b` *is* the
accept-transition refusal. **All five are now fixed inline**, each verified individually and then
confirmed gone from the whole lane by set-difference across two further runs.

**Every repair moved a declaration or re-aimed an instrument; none quieted a control.** That
distinction is this milestone's own subject, so it is stated per repair rather than asserted in
aggregate:

| finding | what was done, and why it is not a quieting |
|---|---|
| `F-55-M-1` | 53's FF-5305 **amended in place** to record the discharge its own row pre-authorised (*“Discharge condition: milestone 55”*), `enforced by` re-pointed at the successor `acd-loop-level-l3-gated`. The row is kept, not deleted — a discharged obligation that MOVED is not one that never existed — and the successor asserts the old file's absence, so it proves the discharge. |
| `F-55-M-2` | The census literal **moved** 76 → 80, which is what the control's own comment instructs (*“it must be moved, not softened”*), with the composition re-measured and the recurrence recorded beside the two prior ones. |
| `F-55-M-3` | FF-6904 **extended** to read the frozen-set member as a declaration. A sibling `.json` would have been a second competing source for one hook entry — the thing 55/04 exists to remove. Red-probed: an undeclared body still fails. |
| `F-55-M-4` | The positional slice **replaced** by `markedRegion` from the one home, with a not-found guard, so a missing fence fails as NOT FOUND rather than asserting the ban over the wrong region. |
| `F-55-M-5` | The pinned call-shape **re-aimed** to the reach it protects: the argument span is cut by matching parens, `ref`/`run` asserted within it, extra keys admitted. Re-measuring the regex would have restored green and preserved the tripwire. Red-probed: `run: false` fails; the file restored byte-exactly. |

**Two of the five were repaired by editing a control, and that is the distinction the milestone's own
retrospective turns on.** `F-55-M-3` and `F-55-M-5` changed an instrument rather than the code under
it — the exact act recorded nine times in this milestone as a pathology. What makes them re-aims is
not intent but the **red probe**: each was shown failing on the thing it must still catch, after the
change. A control edited without one is indistinguishable from a control quieted; a control edited
with one has been re-armed in front of a witness. The rule this milestone should carry forward is
therefore narrower and more useful than *“never edit a control”*: **a control may be re-aimed only
with a red probe recorded against its re-aimed form**, which is `FF-5503`'s reasoning generalised.

**Measured state now.** 6905 selected, **6863 pass, 42 fail**, across two runs of the identical tree.
41 are pre-existing and fail at `main` too; the 42nd is `F-55-M-6` — one intermittent environmental
failure per run, a different test each time, both passing in isolation. The branch remains a net
improvement on `main`'s 74.

**What the re-verify still has to do, and it is only the accept work:** `aof work validate 55` (PASS
at the time of writing), `aof work doctor 55` (zero errors), then the milestone `OUTCOME.md`,
`aof:retrospective 55`, `aof work memory ingest`, the `STATE.md` compaction, and
`aof work status 55 done`. No blocker finding is open. The four non-blockers deferred to backlog
(`F-55-00-1`, `F-55-02-1`, `F-55-02-2`, `F-55-M-6`) do not gate the accept, on the same footing as the
deferrals already taken at the story gates.

**Still no milestone `OUTCOME.md`.** One was drafted at the first gate and withdrawn; it stays
withdrawn until the accept actually happens, for the reason milestone 70's `R7` gives.


### 55 · The milestone — **ACCEPTED** 2026-08-27

`aof:verify 55 --solo`, the operator's re-verify. All six stories are `done`, every box in `SPEC.md`'s
`## Stories` is ticked, and **no blocker finding is open**.

| gate | result |
|---|---|
| `aof work validate 55` | **PASS — 55 is well-formed** |
| `aof work doctor 55` | **zero errors** — no `control-unresolved` at either severity, no `verification-missing-red-probe` |
| Milestone 55's own lane (6 behavioural suites + 8 controls) | **66/66 pass, 0 fail** |
| The five gate repairs `F-55-M-1` … `F-55-M-5` | **all absent from the full-lane failure set** |
| Blocker findings open | **none** |

**Every declared control resolves, and the marker was not what cleared it.** `ARCHITECTURE.md`
declares FF-5501…FF-5508; all eight name a file that exists, all eight are registered in the runner's
own labelled milestone-55 blocks, all eight are green, and every one carries a red probe performed
against a real source edit restored byte-exactly. `pending` was cleared by the arch-tests landing, not
by re-marking — which is the accept rule this gate is required to apply itself, because nothing
refuses the transition for it.

**The accept is made on the set-difference, not on the lane count, and that is stated rather than
glossed.** The full lane reports 43 failures. None is attributable to this milestone: the five that
were are confirmed gone, 55's own 66 tests are green, and three of the 43 trace by digest and by line
count to a concurrent session writing this tree during the run (`F-55-M-7`). A count taken over a
moving subject is not a measurement of anything, and the honest response is to say which failures
belong to whom rather than to quote a number that flatters or damns without evidence.

**Four non-blockers stay open and do not gate this accept**, on the same footing as the deferrals
taken at the story gates: `F-55-00-1` (53/FF-5312's tracked-ness leg, working-tree-local),
`F-55-02-2` (69/FF-6908's re-aim awaiting its declaration), `F-55-M-6` (the lane's ±1 intermittent)
and `F-55-M-7` (the gate has no exclusive hold on the tree it measures). The last two are one
subject seen twice and go to milestone 59's instrument audit together.

**What this milestone leaves true.** L3 executes and is admitted only on a Loop-Ready score of 100
with a clean groundedness report; this workspace scores **50% (5/10)** with `anchor-grounding` among
the blocking checks and four self-referential components standing, so the rung is open in the ladder
and closed here — by measurement, which is the whole point. `OUTCOME.md` is authored at this accept
and not before it (m70/`R7`), and `STATE.md` is compacted with its feedback notes graduated into
`RETROSPECTIVE.md`.
