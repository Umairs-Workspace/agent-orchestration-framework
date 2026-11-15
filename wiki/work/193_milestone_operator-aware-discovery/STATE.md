---
doc: state
---
# 193 · Discovery researches the domain before it asks — State

## Progress

- 2026-11-12 — Captured in the backlog and promoted (appended, as 192).
- 2026-11-12 — Refined (`aof:refine 192 --autonomous`, as it was numbered then; solo, run `20261112T162305759Z-0000`, no
  session id: the live store did not answer). ARCHITECTURE ADR-001–007, FF-19201–19203 declared
  `pending`, five stories with example maps, contracts and build briefs. No story's map held a
  business question, so nothing was asked and no story waits at the Contract gate.
- 2026-11-12 — Re-cut the same day at the operator's review of that refinement (run
  `20261112T174956662Z-0001`). The operator's steer: the commands are getting long, and in some
  projects this approach is not needed, so make it an extension and make commands buildable.
  What changed: the practice is opt-in (`work.examples.operatorAware`); its prose ships as
  fragments of the specification-by-example practice; milestone 192 (buildable-commands) was
  captured and promoted to deliver slots and fragments, and this milestone now `depends: [192]`.
  Story 00 lost its template task and is code only. Story 03 was renamed and re-cut around the
  switch. Story 04 was re-cut against the render. ADR-003 §8–§9, ADR-004, ADR-005 §5, ADR-006 and
  ADR-007 were revised in place, and FF-19204 was added. Nothing had been built.
- 2026-11-12 — Status returned to `not-started` (`aof work status 193 not-started`): an
  `in-progress` driver with an unmet dependency is a doctor error, and nothing here is being built
  while 192 is open. The refinement stands; `aof:continue 193` picks it up once 192 is done.
- 2026-11-12 — Renumbered 192 → 193, and buildable-commands 193 → 192, so the numbers follow the
  build order (operator's request). `aof work renumber` through a free parking number, 194:
  192 → 194, 193 → 192, 194 → 193. Its two run records now carry `itemRef: "193"`. The verb also
  rewrote a pixel ratio, `192/408`, in three archived docs of milestones 46 and 49 as if it were a
  ref; those were restored to their committed bytes.
- Waves once 192 is done: 00 and 02; then 01 and 03; then 04. `aof work next 193` answers
  `blocked` until then. Only 04 needs 192, but a story cannot name another milestone in
  `depends:`, so the edge is on the milestone.
- 2026-11-14 — 192 accepted. Story 04 re-refined against 192 as delivered (`aof:refine 193/04`,
  solo, run `20261114T160938432Z-0000`, no session id). 192 kept 04's guessed file layout but keys
  a fragment by its practice, not its own keys, so ADR-006 §2 was amended and §8 added:
  operator-aware discovery is a second practice of the package, `operator-aware`, on when
  `work.examples.enabled` and `work.examples.operatorAware` both hold `true`; its fragments replace,
  rather than sit beside, every discovery fragment that says `business` (the beat, the
  formulation, the cascade, the hand-back, the Codex entry rule, the PO and architect briefs); two
  new core slots (`config.roles`, `ownership.research`). 04's `files:` gained the three suites that
  pin the shipped practice list and the lock; its PLAN, Notes and task 04 were re-cut to match.
  Stories 00–03 needed no re-refine; 03's "sixth module" became the seventh (192 added
  `contribution.mjs`). The run's mint moved 04 to `in-progress`; it was returned to `not-started`
  (`aof work status 193/04 not-started`), since nothing in it is built before 00–03.
- 2026-11-15 — 193/00 built and reviewed (`aof:continue 193/00-02`, solo, run
  `20261115T200243309Z-0000`). Every map in the tree (143, the default template included) parses to
  its old value plus `finding: null`, and `aof work doctor 189/00` answers exactly what it did.
- 2026-11-15 — 193/01 built and reviewed (same session, run `20261115T201543437Z-0000`). The lane
  judges a question by its class and reports `example-research-unanchored`; the probe and the door
  read the research document through one `researchDocOf`. FF-19202 green.
- 2026-11-15 — 193/02 built and reviewed (same session, run `20261115T203255352Z-0000`).
  `@aof/contracts/operator-profile` is the one home of `work.operator`; `loadWorkspace` lays the
  global block under the project's, and `aof project show` answers each value with its source.
  FF-19203 green. 193/00–02 now wait at the Review gate; 03 and 04 were outside this span.
- 2026-11-15 — 193/03 built and reviewed (`aof:continue 193`, solo, milestone run
  `20261115T213412804Z-0002`, story run `20261115T213428582Z-0000`). `work.examples.operatorAware`
  validates and resolves through `operatorAwareFromConfig`, from the project's config only;
  `aof work init-config` gained `--operator-aware`, `--operator-role`, `--expertise` and `--global`;
  `operator-lane.mjs` reports `operator-profile-undeclared` once, at the work directory, and
  `aof work update` and the turn-on print the same line from the same function. 28 new cases green.
- 2026-11-15 — 193/04 built and reviewed (same session, story run `20261115T220642882Z-0001`).
  `operator-aware` is the package's second practice, on `work.examples.enabled` and
  `work.examples.operatorAware` together. Its fragments replace every discovery fragment that said
  `business` and fill two new core slots (`config.roles`, `ownership.research`), and its template
  variants teach the map's `domain`/`policy`/`researched` forms and the finding's form. FF-19204
  green with four planted leaks red. This checkout (switch off) plans no change on update.
  193/00–04 now all wait at the Review gate.
- 2026-11-15 — `aof:verify 193`: 193/00–04 accepted. Story lanes run by file, 705 cases green;
  FF-19201–19204 each red-probed on real source and restored; `aof work validate` PASS; no
  `control-unresolved`. One non-blocker, `F-01` (the Codex preamble's `business` label), deferred
  to `backlog/story_codex-preamble-says-policy-where-operator-aware-is-on`. Outcomes written for all
  five, and a retrospective each. The milestone's live run and its regression gate are next.
- 2026-11-15 — The live run, the milestone's `@manual` check, holds. A real `/aof:refine 00/00` in a
  scratch project, with the switch on and `uk-residential-lettings: new`:
  - researched Q1–Q3 as F1–F3, with legislation.gov.uk sources;
  - returned them as one batch with no token;
  - asked only Q4 and Q5 (`policy`), each with `Background:` and `I would pick:`.

  F-02–F-07 were logged; none is a blocker. Accept waits on the commit and
  `aof work regression-gate 193`.

## Notes & decisions in flight

- 2026-11-12 — Captured from an operator conversation. In domain-heavy projects (fraud, property
  management, regulatory), refine asks the operator questions as if they were the domain specialist.
  The root cause is the two-label question taxonomy: `business` conflates domain fact with operator
  policy, and an unplaceable question defaults to "ask the human". Items 1–4 of that conversation's
  proposal (split the labels, research first, the operator profile, the explain-first question
  shape) are in scope. The glossary, "not mine to decide" routing, the quality lints and profile
  learning are deferred to a follow-up.
- 2026-11-12 — Default decisions taken at refine (technical, documented in the ADR named):
  - **`business` stays in the grammar and reads as `policy`** (ADR-001 §1). No delivered map is
    rewritten. The parser still reads an unknown class as `business`; "unplaceable is `domain`" is
    the PO's labelling rule.
  - **A finding is a `## F<n> ·` heading in the research document with a `- **Source:**` line**
    (ADR-001 §6). A milestone's story cites the milestone's `RESEARCH.md`; a standalone story
    cites one in its own folder.
  - **The citation is checked by code; the batch is not** (ADR-002 §2, ADR-004 §6). A
    `researched F<n>` with no sourced finding is `example-research-unanchored` and stops the
    build. The batch carries no map token, so the doctor cannot tell whether the operator saw it.
    Refine still asks it, and an unanswered batch leaves the story at the Contract gate.
  - **The profile's one home is `@aof/contracts`, merged global-under-project by `loadWorkspace`,
    and read by a session through `aof project show --json`** (ADR-003 §3–§6).
  - **An item names its domains as `domains: [...]` in its record doc's frontmatter** (ADR-003
    §8). The PO writes the key at refine; no template gains it. The word also names the tag group
    `work.tags.domains`; the beat's prose tells them apart.
  - **A question takes its domain's level; one the PO cannot attribute takes the lowest level
    among the item's domains, and `new` when it names none** (ADR-004 §3).
  - **One researcher pass per refine writes every finding** (ADR-004 §4).
  - **`Background:` counts toward a driven ask's 1,500 characters** (ADR-005 §3).
  - **The switch is `work.examples.operatorAware`, in the project's config only** (ADR-006 §1).
    Rendered commands are committed, so a render must not depend on the machine. The name is a
    default the operator may change before 03 is built.
  - **The switch gates prose and one warning, never the map's grammar or its gate** (ADR-002 §6,
    ADR-006 §3). A map written while it was on is still judged after it is turned off.
  - **`aof work init-config` turns it on and writes the profile** (`--operator-aware`,
    `--operator-role`, `--expertise`, `--global`), and a profile flag replaces what it names
    (ADR-006 §4).
  - **`aof:init` does not ask for the role** (ADR-006 §7). It renders before any config exists,
    so in a new project the switch is off. This drops a line of the SPEC as first captured.
  - **The warning is repeated by `aof work update` and by the turn-on itself** (ADR-006 §5).
  - **No standing notice in a project that left the switch off** (ADR-006 §6). That a practice
    exists is 192's to say, in its update's list of optional practices.
  - **04's fragment paths are a guess** until 192 is refined (193/04, Notes). Settled
    2026-11-14: 192 kept the layout (ADR-006 §8).
- 2026-11-14 — Default decisions taken at 04's re-refine (technical, ADR-006 §8):
  - **The practice id is `operator-aware`**, declared beside `discovery` in the package's
    `bundle.json`, with both keys. The id and its one-line summary are defaults the operator may
    change before 04 is built; keep the summary short (192 F-04, the list's width).
  - **Every discovery fragment that says `business` is replaced, not added to**, so a render never
    teaches both vocabularies. The QA fragment names no label and stands.
  - **The formulation fragment is replaced too**, to carry a `researched` example under its rule
    as it carries an agreed one (ADR-002).
  - **Two slots are added to core: `config.roles` and `ownership.research`**, both inline.
- 2026-11-12 — Diagram not drawn: `diagram-generator-missing` (ADR-004). The brief is kept;
  `aof:add-diagram 193` draws it once the `diagram-design` plugin is installed.
- 2026-11-12 — Recall. Architect, `9a62a92f-ba18-464b-b96b-b22b40aa696a`: five ADRs, no near-miss;
  154/ADR-002 honoured (ADR-003). PO, `81ab7638-b609-41c1-9b3c-528eb4acbd15`: empty.

## Feedback (for retro)

- 2026-11-15 · 193/00 · review close · **recorded** — *an open `domain` question passes the lane
  until 01.* Before 00, `domain` read as `business` with `bad-class`, so a map using it was refused.
  After 00 it is admitted, and the lane still asks `openBusinessQuestions`, which counts `policy` and
  `business` but not `domain`. No map in the tree says `domain` yet, and 01 (next in this span)
  moves the lane onto `openQuestions`. Check at 01's review that it did. **Resolved at 01:** the
  lane asks `openQuestions`, and `examples/193-01 00` covers an open `domain` question.
- 2026-11-15 · 193/00 · review close · **recorded** — *a finding heading inside a fenced code block
  is read as a finding.* `readFindings` skips `<!-- -->` blocks, as the contract asks, but not
  fences. If 04's `RESEARCH.md` template variant shows the form in a fence rather than a comment,
  the example becomes a real `F<n>`.
- 2026-11-15 · 193/00 · build · **declared read/write set incomplete** — four 134 fixtures in
  `test/examples/doctor-examples-lane.test.mjs` (3 rows and the `bad-class` reason row) and
  `test/examples/continue-door-examples.test.mjs` (1 row) used `policy` as their example of a class
  the grammar refuses. ADR-001 admits it, so they were changed to `regulatory`, which keeps what
  each case tests. Neither file was in 00's `files:`. Also, the README in `files:` widens
  `aof test --scope impacted --story 193/00` to all 1285 suites (`not-in-graph`), which this machine
  cannot run. The affected suites were run by file instead.
- 2026-11-15 · 193/01 · review close · **recorded** (Nit) — `openBusinessQuestions` has no
  runtime caller now that the lane asks `openQuestions`. It stays exported because 134/02's and
  193/00's suites assert it. Drop it or keep it when the map's API is next touched.
- 2026-11-15 · 193/01 · review close · **recorded** (Nit) — the lane's `example-research-unanchored`
  messages spell the heading form (`"## F3 · "`) in prose. FF-19201 holds only id builders and
  labels, so this is legal, but it is a second spelling of the form a reader sees.
- 2026-11-15 · 193/01 · build · **declared read/write set incomplete** — `map.mjs` (00's) gained
  `finding` on `untracedExamples`' answer, so the lane can name the finding an untraced researched
  example cites (E10). `test/examples/doctor-examples-lane.test.mjs` now exports `ABSENT`, which
  FF-19202 imports. Neither was in 01's `files:`.
- 2026-11-15 · 193/02 · review close · **recorded** (Nit) — `project show` describes the profile
  from the two raw files, while `loadWorkspace` lays the global block under the project's only when
  the project's `work` is an object or absent. For a project whose `work` is some other value (a
  config the validator already refuses), `project show` names the global profile and the loaded
  workspace carries none.
- 2026-11-15 · 193/00–02 · build · **tests run by file, not by story scope** — on this MacBook
  `aof test --scope impacted --story` plans 1285 suites for 00 (README `not-in-graph`), 1162 for
  01 (the lane's importers) and all 1287 for 02 (`packages/contracts/package.json`, the schema and
  the README widen it). The full suite cannot run on this machine, so each story's affected suites
  were run by file (`test/examples`, `test/arch/examples`, the package suites, schema,
  config-inspect, the directory budget, the controls-never-execute audit and the child-process
  smoke): 370 cases, 0 failing. The milestone's regression gate at `aof:verify` still owes the
  whole tree.
- 2026-11-15 · 193/03 · build · **declared read/write set incomplete** — FF-19203 lets no module
  but the leaf touch `work.operator`, so the write half of "a flag replaces what it names" is the
  leaf's: `correctOperatorProfile` in `packages/contracts/src/operator-profile.mjs` (02's), with a
  line in `packages/contracts/README.md`. FF-5905 (`test/arch/audit/acd-controls-never-execute.test.mjs`)
  names every doctor lane module and pins the doctor's composition line, so the operator lane was
  named there as the fifteenth. `test/examples/doctor-examples-lane.test.mjs` (01's) asserted that
  only the practice-render lane follows the examples lane; it now names the operator lane between
  them. None was in 03's `files:`.
- 2026-11-15 · 193/02 · found at 03 · **fixed** — `node scripts/workspace-boundaries.mjs` was red
  since 02: its runtime audit is keyed on a digest of the whole of `config-inspect.mjs`, and 02's
  edit staled both entries (`spawnSync` of the locator and of `git ls-files`). 02's review ran no
  boundary check. Both entries were re-stamped in `scripts/workspace-runtime-audit.json`, with the
  reason extended; neither call nor its argv changed.
- 2026-11-15 · 193/03 · review close · **fixed** — `initConfig` reported the switch by reading
  `work.examples.operatorAware` itself, a second reader beside the resolver the gate's comment says
  every code reader asks. It now reports `operatorAwareFromConfig(config)`.
- 2026-11-15 · 193/03 · review close · **fixed** — `--global` resolved the global home from
  `process.env`, while the config-inspect bindings take an `options.env`. `initConfig` now takes
  `env` and passes it, so an in-process caller with its own environment writes its own home.
- 2026-11-15 · 193/03 · review close · **recorded** (Nit) — `--operator-aware off` prints "run
  `aof work update` to render it", which reads oddly for turning a practice off.
- 2026-11-15 · 193/03 · review close · **recorded** (Nit) — the `Unknown work command` examples in
  `packages/core/src/cli.mjs` still show `init-config`'s old usage, without the four new flags.
- 2026-11-15 · 193/03 · review close · **recorded** (Nit) — `--global` over a global config that
  is not JSON fails with the parser's error rather than a coded refusal. `loadWorkspace` reads such
  a file as `{}`; a writer must not, or it would overwrite whatever the operator has there.
- 2026-11-15 · 193/03 · build · **tests run by file** — the same machine limit as 00–02. Run by
  file: the story's four suites (`examples-config-gate`, `operator-profile`, core's `work-init`
  and `work-update`), the specification-by-example package suites, the 116 `test/arch` suites that
  sweep source, FF-5905, application assembly, config-inspect, schema, the init-config and intake
  suites, the test-layout update suite and the command census: 1080 cases, 0 failing; 135 again
  after the review's two fixes. `node scripts/workspace-boundaries.mjs` clean.
- 2026-11-15 · 193/04 · build · **process** — the near-miss recall ran after the build had
  begun, not before it (22:31Z, run minted 22:06Z). Two of its five lessons bore on the build and
  were honoured: the batch's specimen keeps clear of the token grammar (m52 R2), and FF-19204 got
  planted leaks because equality alone would have gone vacuously green (m123 R3).
- 2026-11-15 · 193/04 · build · **FF-19204 is three legs, not one** — byte equality with a
  render whose bundle drops the practice cannot see prose planted in core, which both renders
  carry. The control also refuses any sentence only an operator-aware fragment holds, and any
  slot marker a render leaves behind; members are stripped by the file they ship under
  `operator-aware/`, so one relabelled into `discovery` is still caught. The register says so.
- 2026-11-15 · 193/02–03 · found at 04 · **fixed** — FF-16004's pinned module ceiling for
  `aof work find` was still 756; the operator-profile leaf (02) and the operator lane (03) put the
  registry's synchronous assembly at 758. Raised in `test/arch/command/acd-cli-entry-executes.test.mjs`
  with the reason, by the convention its row records.
- 2026-11-15 · 193/04 · build · **declared read/write set incomplete** — the FF-16004 ceiling row
  above and FF-19204's line in `ARCHITECTURE.md` were outside 04's `files:`. Conversely, the
  shipped manifest, the lock and the nine rendered copies in `files:` did not change: both new
  slots render to nothing, so this checkout's renders are byte-for-byte what they were.
- 2026-11-15 · 193/04 · review close · **story (operator)** — core's Codex execution contract,
  rendered at the head of every Codex agent, says "A driven business question retains its map
  token", operator-aware on included. Saying `policy` there needs a practice slot in that
  preamble; writing it into core would change every project's render (FF-19204). Shape: a slot in
  the preamble and an operator-aware fragment that fills it.
- 2026-11-15 · 193/04 · build · **tests run by file** — the story's new suite (56 cases), FF-19204,
  every `test/examples`, `test/bundle`, `test/arch/{examples,practices,command}` suite, the 116
  source-sweeping arch suites, the package and core suites, and the install round-trips: 1713
  cases. Failing, none of them this change's: core-workspace ×3 and yarn-installation ×3 (red on a
  clean HEAD, recorded 2026-11-14), and `release-fingerprint-pin` ×3, which fails alone too, in gpg
  itself (`keydb_search failed: Operation timed out`), over files no story here touches.
  FF-16004 was the tenth, fixed above. The milestone regression gate is still owed at verify.
- 2026-11-15 · 193 · build · **the live run is owed** — the `@manual` check under Verification (a
  real `aof:refine` with the switch on and a domain at `new`) needs a project with the switch on;
  nothing here turns it on in this checkout (PLAN, out of scope). It is `aof:verify`'s.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green — register in `VERIFICATION.md`
- [x] `@manual` — the live run (ADR-007). In a project with operator-aware discovery on, declare a
  profile that lists one domain as `new`, name that domain on a milestone, and run `aof:refine` on a story with
  at least one real fact and one real decision in it. Read at the source: every `domain` question
  in the story's `EXAMPLES.md` is `researched F<n>` with a sourced finding in `RESEARCH.md`, or was
  relabelled `policy`; every question the operator received carried `Background:` and
  `I would pick:`; no question reached them that the cited source answers. Needs all five stories.
