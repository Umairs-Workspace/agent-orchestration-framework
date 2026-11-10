---
doc: architecture
---
# 189 · The human can check understanding separately from shipping success — Architecture

Decided at refine, 2026-11-01, solo (the main session played the architect). Inputs: SPEC Objective
and Scope, 188's ADR-004 (the `@aof/learning` package and the practices registry), ADR-005 (the
boundary is instruction), ADR-006 (the pedagogy vocabulary) and ADR-007 (Claude Code only), spike
187's Finding (the line between assisted and unaided work is instruction-level inside one session),
150's `aof:explain` read-only contract, and the PRD's Q4/Q5.

## Memory recall: what was surfaced, and what it changed

- Architect (recall `c0ed33b0-d717-4398-913d-ae983c9ff0f2`): `aof memory recall "understanding check
  separate from delivery sign-off session-local feedback no learner store" --area architecture
  --block` returned five ADRs: m05/ADR-007, m55/ADR-005, m172/ADR-001, m38/ADR-003 and m12/ADR-001.
  None bears on these decisions. m55/ADR-005 (write the raw human input verbatim first) is the
  nearest, and it is irrelevant here because a check writes no input at all (ADR-002).
- PO (recall `6e759284-b30b-4803-b74a-a58a225ec302`): the item-scoped recall returned an empty block.
- The lesson that shaped the boundary came from the record, as the SPEC cites it: 158 treated an
  approval message as human acceptance, so no learning answer here ever writes a delivery record.

## ADR-001 — A check is its own Claude-only command in `@aof/learning`

### Decision

1. **A check is a command of its own, `aof:grill-me <ref>`** (operator, 189/00 Q1), shipped by
   `@aof/learning` as a second member of the package's `assets/bundle.json`, beside `teach`. It
   reaches the bundle through 188's practices registry (`packages/core/src/practices.mjs`). No
   registry, seam or core module is added. "A check" stays the SPEC's word for one exercise and for
   the session; `grill-me` is only the command's name. The prompt's tone stays the SPEC's anyway:
   no grade, no ranking, and every check can be skipped.
2. **It is Claude Code only**, as `teach` is: `runtimes: ["claude"]` with `mapped: false`
   (188/ADR-007 as built). Spike 187 measured the assisted/unaided line on Claude Code only, and the
   help ladder a check reuses is teaching's. The README row says Codex and OpenCode render no `grill-me`.
3. **It is not a flag on `teach` or `manual`.** A check is offered after any build: one a human wrote
   while being taught, one they wrote from `aof:manual`'s guide, or one an agent built. The pilot
   (ADR-005) compares the first two, so the check cannot belong to either.

### Alternatives considered

- **A closing region inside `teach.md`.** Rejected: a manual build could not be checked, and every
  teaching session would carry a check conversation it may never run (188's Feedback lesson).
- **A core command.** Rejected by the operator's ruling (188 SPEC Objective): the learning module
  holds 180's checks.

## ADR-002 — A check writes nothing and moves nothing

### Decision

1. **A check enters through no door, mints no run, moves no status and writes no file.** It is
   `aof:explain`'s contract (150): it runs only the read verbs `aof work find`, `aof work doc`,
   `aof work list` and `aof work tasks`, plus `Read`, `Grep` and `Glob` on the story's record and its
   `files:`. Its `allowed-tools` carry no `Edit` and no `Write`.
2. **So nothing it observes can reach a gate.** There is no record for `aof work status`, a review,
   `@uat` or `aof:verify` to read, and none of them is told to read the terminal. Passing a check,
   accepting a hint, granting a tool permission and passing a contract stay four different events.
3. **Exercises are printed in the terminal, never written.** A faulty example or a changed
   requirement is a short, disposable snippet in the reply. No seeded defect is ever placed in
   project source. A human who wants to run one copies it into a scratch directory of their own,
   outside the project.
4. **A check runs no project code and no tests.** The observable outcome a prediction is compared
   against is one the human produces by running the code themselves, or the contract's own example.
5. **What it accepts.** A refined story or a standalone task, at any status. A milestone names its
   stories from `aof work list <ref>` and checks none. An unrefined story (no `reads:`, or untagged
   tasks) is sent to `aof:refine <ref>`. These refusals are prose rather than door code: a check that
   wrongly carried on would still write nothing.

### Consequences

`aof work observe` cannot index a check session, because no run carries its session id. That is the
point: learning feedback is session-local (SPEC Scope), and no learner profile or answer store exists.

## ADR-003 — Unaided first, help pulled, every result labelled

### Decision

1. **`packages/learning/src/vocabulary.mjs` gains two frozen lists**, beside 188's three:
   - `CHECK_KINDS`: explain a design choice, predict an unseen input, diagnose a faulty example,
     adapt to a changed requirement.
   - `CHECK_RESULTS`: consistent with the reference, partly consistent, not consistent, unclear,
     skipped, unmeasured.
   The help a result records is a `HELP_LADDER` rung, or `none`, or `answer revealed`. No new word is
   minted for help.
2. **Every check starts unaided.** The human answers first. Help is pulled one rung at a time, as in
   teaching, and the answer is revealed only on request. Each result records the strongest help
   given before the human's final answer.
3. **Each kind has a stated reference, grounded in the record:**
   - explain: the reasons the ADR in the story's `reads:` gives for the choice;
   - predict: the outcome the contract's example or scenario states, or the output the human observes
     when they run it;
   - diagnose: the defect the session seeded, which it names after the human answers;
   - adapt: the session's reading of the code under `files:`, labelled a hypothesis (188's Mislead
     control) and checked against the source.
   A kind with no grounded reference for this story is `unmeasured`, and is never counted as passed.
4. **Confidence and fluency are not evidence.** An ambiguous answer gets one follow-up question, and
   if it stays ambiguous the result is `unclear`. A check never issues a mastery verdict, a score or a
   grade. A human who disagrees with a result has the disagreement shown beside it; the session does
   not argue it away.
5. **Feedback names the observed gap and one next practice opportunity**, grounded in the story (a
   scenario to reread, an example to predict, a file to trace).
6. `grill-me.md` is pinned to the lists by FF-18902, a second leg in FF-17903's file: the subject is the
   same, the pedagogy's one home, so it takes no new arch-test file.

## ADR-004 — Shipping and understanding are reported apart

### Decision

1. **A check closes with a summary of two halves, never merged into one verdict.**
   - **Shipping**, read from the record: the story's status and what it means (in progress: not
     reviewed; in review: the review was clean; done: accepted). Scenario results only when the human
     ran the tests in this session; otherwise `not observed by this check`.
   - **Understanding**: one line per check, giving its kind, the help used, the result, the gap
     observed and the next practice opportunity.
2. **Help during the build is reported only when this session saw it.** A check invoked in the same
   session as `aof:teach` reads the rung labels teaching printed ("Conceptual hint: …"). Otherwise it
   says `help during the build: not observed by this session`, and never guesses.
3. **The limits are printed every time**: the unaided/assisted line is the session's instruction
   inside one conversation, not an enforced separation (spike 187), and a passing check does not show
   durable learning.
4. **`teach.md`'s `taught:` outcome names `aof:grill-me <ref>` as an optional next step**, after
   `aof:review`. It is never a gate. `aof:manual` is left unchanged, because it renders on runtimes
   that have no check.

## ADR-005 — The pilot measures with fixed held-out items, not with `aof:grill-me`

### Context

The SPEC asks for a reproducible comparison between today's manual guide and the guided path. A
check's exercises are generated per session, so they would differ between participants and arms.

### Decision

1. **The instrument is a fixed set of held-out items, given without AI, the same way in both arms.**
   `aof:grill-me` is the product feature. It is not the pilot's measure, so the measure does not change
   with the treatment.
2. **The kit lives in `packages/learning/pilot/`**: a protocol, two comparable task packs and an
   observation sheet. The first audience is **experienced developers learning an unfamiliar
   codebase** (operator, 189/03 Q1, the PRD's Q4), so each pack is a small existing fixture project
   the participant has not seen, with one refined story to build inside it. Each pack holds the
   project, the story, a stub, a reference solution, and its held-out items (explain, predict,
   diagnose, adapt, with facilitator answers). A pack's tests are named `*.spec.mjs`, so no
   repository runner collects them.
3. **The design is counterbalanced where the sample allows it.** With two or more participants, half
   build pack A manually and pack B taught, and the other half the reverse. With one, the order is
   drawn before the first session and recorded, and the report says the order effect is
   unseparated. The protocol records baseline knowledge, help used, assisted completion and quality,
   immediate unaided items, time and perceived effort, and **a delayed unaided item about a week
   later** (operator, 189/04 Q2).
4. **Coded observations only.** The sheet records results, help levels, times and ratings, never a
   participant's raw answer or transcript. The kit sends nothing anywhere.
5. **Audience and budget are the operator's** (PRD Q4/Q5), and both are answered: experienced
   developers (189/03 Q1), and **n = 1, the operator, at about $10 of model spend** (189/04 Q1). The
   protocol records both before the first session. The report states the audience, sample size,
   missing observations and limitations, and claims no efficacy beyond what it measured: at n = 1 it
   is a feasibility pilot of the kit, not a comparison that generalises.
   - **The participant must not see the held-out items first.** The participant is the operator, so
     the items and their answers sit in each pack's `FACILITATOR.md`, which the agent review lanes
     judge at 03 and the operator does not open until that pack's sessions are done. If they were
     opened, the report says so, and those items count as `unmeasured`.
6. A package suite, `pilot-kit.suite.mjs`, holds the kit reproducible: each pack is red on its stub
   and green on its reference, and the two packs carry the same number of scenarios and held-out
   items. It is a story's executable scenario, not a declared control: the kit is research material,
   not a structure the code depends on.

## ADR-006 — Five stories: a command, its guidance, a walk, a kit, a pilot

The cut follows the coupling `aof graph impact` reported (graph built 2026-11-01T02:45:32Z,
code-only, 21,327 nodes). `vocabulary.mjs` has two dependents (`teach-guide.suite.mjs` and FF-17903).
`contribution.mjs` has one (`practices.mjs`). `practices.mjs` feeds `bundle.mjs` and
`sea-asset-manifest.mjs`. `bundle.json` and the command prompts are not in the graph, so their
coupling was read from 188/02's declared and found write sets instead.

| story | depends | why the edge |
|---|---|---|
| 00 · `aof:grill-me` ships for Claude Code and writes nothing | — | — |
| 01 · a check separates unaided from assisted and reports both halves | 00 | both write `grill-me.md` and the package's test index |
| 02 · a real check session keeps the halves apart | 01 | it walks what 00–01 render |
| 03 · the pilot kit is reproducible | — | it writes only `packages/learning/pilot/` and its own suite |
| 04 · the pilot runs and is reported | 02, 03 | it uses the walked command and the kit |

03 runs beside 00–02. It shares only `packages/learning/test/index.mjs` with them, which is one line
of a registry.

## Fitness functions

| id | invariant | enforced by (arch-test) | from |
|---|---|---|---|
| FF-18901 | **A check writes nothing.** `grill-me.md`'s `allowed-tools` carry no `Edit` or `Write`, and the only `aof` verbs it spells are `work find`, `work doc`, `work list` and `work tasks`. It names no `run-start`, `run-complete`, `work status`, `work continue`, `work feedback` or `aof test`. | `test/arch/command/acd-grill-me-writes-nothing.test.mjs` — pending (189/00) | ADR-002 §1–§4 |
| FF-18902 | **The check vocabulary has one home.** Every `CHECK_KINDS` and `CHECK_RESULTS` entry appears in `grill-me.md`. Every rung it names is a `HELP_LADDER` entry. Its `<summary>` region never spells `mastery`, `score` or `grade`. | `test/arch/command/acd-teach-vocabulary-one-home.test.mjs` (a second leg beside FF-17903) — pending (189/01) | ADR-003 §1, §4, §6 |

FF-18901 is a new file in `test/arch/command`, whose budget row moves 32 → 33 with its reason: the
read-only promise of a learning command is a layer rule over a prompt, the twin of FF-17901. Neither
control lands in `test/arch/bundle`, which FF-12405 leg 10 holds at a ceiling that may only fall, or in
`packages/learning/test`, where a `*.suite.mjs` file is not a path the control audit can see.
