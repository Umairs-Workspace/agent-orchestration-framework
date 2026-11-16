---
doc: verification
---
# 193 · Discovery researches the domain before it asks — Verification

Written at `aof:verify 193` (2026-11-15), on this MacBook, over the uncommitted working tree that
holds all five stories.

## Fitness functions

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-19201 | `test/arch/examples/acd-example-map-single-home.test.mjs` | green (193/00), 8 cases | red when `export const PROBE_LABEL = "researched F1";` is appended to `packages/specification-by-example/src/story-probe.mjs`: "no other runtime module spells a researched label or state, or builds a finding id", naming `story-probe.mjs: spells a \`researched F<n>\` label or state`. 134/FF-13402 went red beside it, as the shared detector should. 2026-11-15 |
| FF-19202 | `test/arch/examples/acd-examples-off-is-today.test.mjs` | green (193/01), 7 cases with FF-19204 and 134/FF-13403 | red when the gate line `if (!examplesEnabledFromConfig(config ?? {})) return null;` is deleted from `story-probe.mjs`: "absent", with actual `["the story row 193/01 carries the research document's text"]`. Its planted-reader outline and 134/FF-13403's two cases went red beside it. 2026-11-15 |
| FF-19203 | `test/arch/examples/acd-operator-profile-one-resolver.test.mjs` | green (193/02), 2 cases | red when `export function probeRole(config) { return config?.work?.operator?.role ?? null; }` is appended to `packages/core/src/application/bindings/work/doctor.mjs`: "no other runtime module spells the levels or reads work.operator", naming `doctor.mjs: reads work.operator from a config`. 2026-11-15 |
| FF-19204 | `test/arch/examples/acd-examples-off-is-today.test.mjs` | green (193/04) | red when the `operator-aware` practice's keys in `packages/specification-by-example/assets/bundle.json` lose `work.examples.operatorAware`, so the practice turns on with discovery alone: "{ enabled: true }", naming `refine (claude): differs from a render without the operator-aware practice`, `refine (claude): holds operator-aware prose — When \`work.examples.enabled\` and \`work.examples.operatorAware\` are both \`true\` a…` and the same two for `refine (codex)`. 2026-11-15 |

Each probe was planted in a byte copy of the real source, run with `node scripts/test-shard.mjs`,
and restored from that copy (`cmp` identical). The three controls were then re-run on the restored
tree, all green.

## Verification evidence — 193/00 to 193/04 (aof:verify, 2026-11-15)

All 21 task features are `@executable`. None is `@manual` or `@uat`, so no human was asked at
story level, and nothing here has UI. The story-scoped lanes were run by file, with
`AOF_GLOBAL_HOME` a fresh temp dir and `node scripts/test-shard.mjs <file>` per suite.
`aof test --scope impacted` widens to the full suite on this machine. Each suite is listed against
the stories whose cases it holds:

| suite | stories | cases | result |
|---|---|---|---|
| `packages/specification-by-example/test/example-map-parse.suite.mjs` | 00 | 53 | green |
| `packages/specification-by-example/test/example-trace.suite.mjs` | 01 | 11 | green |
| `test/examples/doctor-examples-lane.test.mjs` | 01, 03 | 57 | green |
| `test/examples/continue-door-examples.test.mjs` | 01 | 14 | green |
| `test/examples/operator-profile.test.mjs` | 02, 03 | 32 | green |
| `test/command/config-inspect.test.mjs` | 02 | 48 | green |
| `test/bundle/schema.test.mjs` | 02, 03 | 2 | green |
| `test/examples/examples-config-gate.test.mjs` | 03 | 14 | green |
| `packages/core/test/work-init.suite.mjs` | 03 | 34 | green |
| `packages/core/test/work-update.suite.mjs` | 03 | 52 | green |
| `packages/specification-by-example/test/operator-aware-beat.suite.mjs` | 04 | 56 | green |
| `packages/specification-by-example/test/discovery-fragments.suite.mjs` | 04 | 5 | green |
| `packages/core/test/bundle-compose.suite.mjs` | 04 | 84 | green |
| `packages/core/test/practice-render-lane.suite.mjs` | 04 | 39 | green |
| `test/examples/refine-discovery-beat.test.mjs` | 134's beat, unchanged with the switch off | 64 | green |
| `test/arch/examples/*` (7 files: FF-19201–19204, 134's controls) | 00–04 | 33 | green |
| `test/arch/practices/*` (4 files: 192's FF-19205–19208) | 04 | 61 | green |
| `test/arch/audit/acd-controls-never-execute.test.mjs` (FF-5905) | 03 | 16 | green |
| `test/arch/command/acd-cli-entry-executes.test.mjs` (FF-16004) | 02–04 | 10 | green |
| `test/arch/testing/acd-source-directory-budget.test.mjs` | 02–04 | 10 | green |

705 cases, 0 failing. `node scripts/workspace-boundaries.mjs` is clean. `aof work validate`
passes. `aof work doctor 193` reports no `control-unresolved` at either severity. Its warnings
are stream-wide or unconfigured lanes (`numbering-gap`, `control-runner-unchecked`,
`rubric-join-unchecked` ×5, `depends-edges-unchecked`).

verifies → `stories/00_story_the-map-tells-a-fact-from-a-decision/tasks/00`–`04`,
`stories/01_story_the-gate-accepts-a-cited-finding/tasks/00`–`03`,
`stories/02_story_the-operator-says-who-they-are/tasks/00`–`02`,
`stories/03_story_a-project-turns-it-on-and-is-told-what-it-needs/tasks/00`–`03`,
`stories/04_story_discovery-researches-before-it-asks/tasks/00`–`04`.

## @manual — the live run (ADR-007, milestone, 2026-11-15)

**Procedure.** A scratch project under the session scratchpad, isolated from the real `~/.aof`
(`AOF_GLOBAL_HOME` a scratch dir). The steps:
- `git init`, then `aof work init` (92 created).
- `aof work init-config`, `work.examples.enabled: true` set by hand (F-05), then
  `aof work init-config --operator-aware on --operator-role "A software engineer building a
  lettings-management tool for a small letting agency. Not a property-law specialist."
  --expertise "uk-residential-lettings=new"`.
- `aof work update`: 7 updated (refine, the PO, architect, QA and researcher briefs, and the two
  template variants). The practice list reads `on operator-aware`.
- A milestone with `domains: [uk-residential-lettings]`, promoted to `00`, and story `00/00`: "As a
  letting agent, I want the tool to remind me to protect a tenant's deposit and serve the
  prescribed information, and to apply our late-rent fee…". It holds a real fact (the 30-day
  deposit deadline) and a real decision (the agency's late-rent rate).
- `claude -p "/aof:refine 00/00"` (Claude Code, solo), 23:10:57–23:14:06Z, exit 0.

Read at the source: the story's `EXAMPLES.md`, the milestone's `RESEARCH.md`, the transcript and
`aof work doctor 00/00`.

**Result: the check holds.**
- Neither `init-config` nor `update` printed `operator-profile-undeclared`. `project show` answers
  `uk-residential-lettings: new (project)`.
- The rendered refine carries the operator-aware beat once, and no classic `business` beat.
  `business` appears only in the line that says an old map reads it as `policy`.
- Every `domain` question is `researched F<n>`: Q1 (`researched F1`, deposit deadline), Q2 (`F2`,
  prescribed information) and Q3 (`F3`, late-rent fee). No question is labelled `business`. Q4
  and Q5 are `policy · open`. Q6–Q8 are `technical`, each defaulted to a `STATE.md` decision.
  Ten examples are `[researched F<n>]` and five are `[proposed]`.
- `RESEARCH.md` holds F1–F3, each with a primary source: Housing Act 2004 s213(3), s213(5)–(6)
  and Tenant Fees Act 2019 Sch 1 para 4, all on legislation.gov.uk. The session fetched each one.
- Only Q4 (reminder lead time) and Q5 (the agency's rate within the statutory cap) reached the
  operator, each with `Background:` and `I would pick:`. No question asked what F1–F3 settle.
- The researched examples came as one batch, `00/00 · Researched examples: what research settled
  for this story`, with no `Q<n>`/`E<n>` token, and `I would pick: no objection`.
- The doctor holds no `example-research-unanchored` and no `operator-profile-undeclared`. It
  reports `example-question-open` for Q4 and Q5, which is right, because nobody has answered them.
  The story stopped at the Contract gate with no `tasks/`.

**What it does not show.** The researcher role was played inline, because the run was solo with no
`aof-researcher` spawned. `AskUserQuestion` is unavailable under `claude -p`, so the questions were
printed rather than asked through the tool. The rules the beat's prose alone carries were followed
in part (F-02, F-03).

verifies → `STATE.md` `## Verification`, the `@manual` live run. The transcript, map, research and
doctor output are kept under the session scratchpad's `live-run/`.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-01 | In a project with operator-aware discovery on, the execution contract core renders at the head of every Codex agent still says "A driven business question retains its map token and one-question-per-ask form" (`packages/core/assets/variants/codex/workflow.md`, five copies). That project's maps say `policy`, not `business`. Core cannot say `policy` there without changing every project's render (FF-19204). The 193/04 review raised this as a follow-up story. A recall over the stream's findings returned `m165/F-04`, `m165/F-02`, `m164/F-07`, `m53/F-11` and `m152/F-01`. None has this cause, so this is a distinct incident. | gap | low | non-blocker: the sentence governs the ask's form (token, one question per ask), and both still hold for a `policy` question. Only the label is stale. Defer to the backlog, in the shape the review named: a practice slot in the preamble and an `operator-aware` fragment that fills it. | backlog: `backlog/story_codex-preamble-says-policy-where-operator-aware-is-on` | open (deferred) |
| F-02 | Live run: the researched-examples batch, at level `new`, carried no `Background:` line. The beat says "at `new` each comes after a background line for its rule". Each rule was restated with its finding and source, but terms such as "prescribed information" were explained only in the session's closing summary. A recall returned no finding with this cause, so this is a distinct incident. | defect | low | non-blocker: the batch still names each finding and its source, and the operator can object to any line. No code checks the batch (ADR-004 §6), so the fix is a lint. Defer it to the follow-up milestone that holds 193's deferred question-quality lints. | backlog: `backlog/milestone_operator-aware-discovery-in-anger` | open (deferred) |
| F-03 | Live run: Q4's `Background:` claims "a penalty of 1–3 times the deposit", which is from s214 and not in `RESEARCH.md`, and "Agencies usually remind a week or so ahead", with no source. Q5's pick reason says "the usual figure in tenancy agreements", with no source. The beat asks that `Background:` name its source. A recall returned `m131/F-131-13`, an `I would pick: none` ask, which has a different cause, so this is a distinct incident. | defect | low | non-blocker: the operator's two questions are genuinely theirs, and each carries a recommendation and a sourced core fact (F1/F2, F3). Defer to the same follow-up: "a `Background:` claim that cites no finding" joins its lints. | backlog: `backlog/milestone_operator-aware-discovery-in-anger` | open (deferred) |
| F-04 | Live run: refine's closing summary said "15 examples (8 backed by the research, 7 still proposals)". The map holds 10 and 5. A recall found nothing with this cause, so this is a distinct incident. | defect | low | non-blocker, no action: it is one session's summary prose. The map, which the gate reads, is correct. | none | closed (no action) |
| F-05 | Live run: on a project with discovery off, `aof work init-config --operator-aware on` refuses with `examples-operator-aware-without-discovery`, and no `init-config` flag sets `work.examples.enabled`. Adopting the practice needs a hand edit of the JSON between two `init-config` runs. The refusal names the key to set. A recall found nothing with this cause (`m193/F-01` and `m134/F-134-06` are other surfaces), so this is a distinct incident. | gap | medium | non-blocker for 193: where discovery is already on, which is the SPEC's adoption path, the turn-on works in one command and says what a missing profile means. Discovery's own turn-on is 134's surface. Defer to a backlog story. The operator's rule that opt-in config ships with an adoption path makes this a candidate to promote soon. | backlog: `backlog/story_init-config-turns-discovery-on` | open (deferred) |
| F-06 | Live run: `aof work update`'s practice list still describes `discovery` as "asks its business questions", where `operator-aware` is on beside it. A recall returned `m193/F-01`: the same stale label, on another surface. It is cited, and this is recorded as a distinct incident. | gap | low | non-blocker: the row is a one-line summary, and the `operator-aware` row beside it is correct. Route it with F-01. | backlog: `backlog/story_codex-preamble-says-policy-where-operator-aware-is-on` | open (deferred) |
| F-07 | Live run: Claude Code warns at every session start that the rendered `.claude/settings.json` deny rules `Write(.aof/loops/**)`, `Write(.aof/acceptor-criterion.jsonc)` and `Write(.aof/acceptor-ledger.jsonl)` "are not matched by file permission checks — only Edit(path) rules are". Each sits beside an `Edit(...)` rule for the same path (`packages/core/assets/frozen-set.jsonc`), so the paths stay protected. This is not 193's surface. A recall returned no finding with this cause, so this is a distinct incident. | defect | low | non-blocker, not this milestone's: the warning is noise, and protection holds. Defer to a chore. | backlog: `backlog/chore_frozen-set-deny-rules-name-edit-only` | open (deferred) |
| F-08 | Found at the merge of `fix/loop-recovery-and-work-renumber` (2026-11-16): `arch/53 FF-5301 … reach ceilings stay exact` (`test/arch/session/acd-session-driver-mesh-blind.test.mjs`) is red at 193's own commit `178c22b1`, at 189 !== 188. 193/02 made `packages/core/src/application/bindings/work.mjs` import `@aof/contracts/operator-profile`, and that binding is in the configured worker facade's static closure, so the closure gained a leaf no one pinned. Neither 193/02's `files:` nor this verify's per-suite evidence named FF-5301's suite, so the gap shipped in the commit. A recall returned `m191/F-01`, the same control's reach ceiling missed by a zero-import leaf 191/07 added (`discord-buttons.mjs`). It has the same cause and evidence and is cited as the prior occurrence. `m70/F-02` and `m70/F-14` are earlier ones of the same class. | defect | medium | non-blocker, fixed: `operator-profile.mjs` is a pure config-read leaf that enters no driver or lifecycle module, so the fence held and only the pinned count was stale. Fixed in the merge commit `bcbac8e3`, which names the leaf and moves the ceiling (with the merged branch's awake clock and graph-normalize leaves) to 191. The suite is green there. The milestone's regression gate re-proves it before accept. A fourth occurrence makes the lesson a standing one: a story that adds an import to a module in the facade's closure declares FF-5301's suite (the class of 193/00–03 R1). | fixed: `bcbac8e3` | closed (fixed) |

## Accept decision

- **193/00 — accepted 2026-11-15.** Its five `@executable` features are green (evidence above),
  and FF-19201, the control it lands, is green with a recorded red probe. Every map in the tree
  still parses to its old value plus `finding: null` (task 03, in `example-map-parse`). There are
  no `@manual` or `@uat` scenarios and no UI. Doctor reports no `control-unresolved`.
  `RETROSPECTIVE.md` records the write-set miss in its concrete form: tests that used `policy` as
  their refused example.
- **193/01 — accepted 2026-11-15.** Its four features are green, and FF-19202 is green with a
  recorded red probe. The open-`domain`-question gap recorded at 00's review is closed: the lane
  asks `openQuestions`, and `examples/193-01 00` covers it. The two review Nits
  (`openBusinessQuestions` with no runtime caller, and the heading form spelt in a message) stay
  recorded in `STATE.md`, and neither is a defect. `RETROSPECTIVE.md` records its write-set miss:
  the producer module it extended.
- **193/02 — accepted 2026-11-15.** Its three features are green, and FF-19203 is green with a
  recorded red probe. The workspace-boundary audit it staled was fixed at 03 and is clean now.
  `RETROSPECTIVE.md` was written for that: it is the second occurrence of `m160/00` R1.
- **193/03 — accepted 2026-11-15.** Its four features are green. It declares no control of its
  own, and FF-5905, which it amended, is green. The three review Nits stay recorded in
  `STATE.md`: the `off` wording, the stale `Unknown work command` examples, and an unparseable
  global config refused by the parser rather than with a code. None is a defect against a
  scenario. `RETROSPECTIVE.md` records its write-set miss: the lane census and the one-home
  writer.
- **193/04 — accepted 2026-11-15.** Its five features are green, and FF-19204 is green with a
  recorded red probe, plus the four planted leaks in its own suite. FF-19205–19208 (192) are
  green, so the practice composes as 192 delivered it. `F-01`, the Codex preamble's stale label,
  is a non-blocker and is deferred to the backlog. `RETROSPECTIVE.md` was written for the
  late near-miss recall.

## Milestone accept decision (2026-11-15) — not yet accepted

All five stories are done. The `@manual` live run holds (above). No blocker finding is open:
F-01–F-03 and F-05–F-07 are deferred non-blockers, each routed to a backlog item, and F-04 is
closed with no action. `aof work validate` passes, and `aof work doctor 193` reports no
`control-unresolved` at either severity.

The milestone stays `in-progress`, because its regression gate has not run.
`aof work regression-gate 193` runs only on a clean checkout, and all of 193's work is
uncommitted. The order to close it:
1. Commit the milestone.
2. Run `aof work regression-gate 193` (or `--gate-override "<reason>"` if this machine cannot host
   the run).
3. Run `aof work status 193 done`, then the milestone retrospective, its `OUTCOME.md`, and the
   `STATE.md` compaction.
