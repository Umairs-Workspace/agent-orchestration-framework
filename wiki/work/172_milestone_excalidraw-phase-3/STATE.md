---
doc: state
---
# 172 · Excalidraw phase 3 — State

## Progress

- [x] Refined 2026-10-27 (`aof:refine 172 --autonomous`, solo): RESEARCH Q1, ADR-001..003, DESIGN with
  committed mocks, five stories
- [ ] 00 · the architect answers in a headless session — contracted (172/00 Q1 answered: 10 minutes)
- [ ] 01 · every conversation in one panel — contracted (172/01 Q1: the panel; Q2: the drafted mocks)
- [ ] 02 · the answer streams into its thread — contracted
- [ ] 03 · the diagram surface has no terminal — contracted
- [ ] 04 · a right-click leaves the drawing true — contracted

## Notes & decisions in flight

- Framed on 2026-10-25 at 171's accept, from the operator's UAT verdict ("next milestone can be
  streaming + UI overhaul", with a proper design first) and 171 VERIFICATION F-171-03 and F-171-04.
- **Blocking unknown resolved by measurement** (RESEARCH Q1): a headless stream-json `claude` holds a
  conversation across turns and streams its answer in deltas on this machine's login. One small
  paid probe (haiku, two turns) was run at refine.
- **Codebase graph unavailable:** `aof graph build .` ended `graphify-timeout` after 600 s
  (2026-10-27). Story boundaries were drawn from the importers of each boundary module (grep), and
  each story's `files:` carries the suites and controls that import or pin what it changes (171
  RETROSPECTIVE R2).
- **Recalls.** Architect recall `3f0c9a6e-2b7d-4f55-9b1e-6c2a8d04e1a7` (five ADRs; verdicts in
  ARCHITECTURE's preamble). PO recall `8b52d7c1-94e3-4a0f-a6d2-1f7e3c9b5a20` returned nothing.
- **Mocks drafted at refine** by the main session as designer (`mocks/conversation.html`, rendered
  with headless Chromium); the operator accepted them on 2026-10-27 (172/01 Q2).

### Default decisions taken (technical; each recorded where it applies)

- The session's model and effort are the refine phase's session launch (ADR-001 §3; 172/00 Q2).
- The architect's tools: Read, Grep, Glob, Write, `Bash(aof diagram scene:*)`; anything else is
  denied in the turn (ADR-002 §2; 172/00 Q3).
- An ended session is not resumed; streamed text is never stored (ADR-001 §4, ADR-002 §4).
- The env scrub is the loop driver's one predicate, hoisted into `session-model.mjs` (ADR-001 §3).
- One test seam, `AOF_ARCHITECT_EXECUTABLE`, for the browser smoke's stand-in (ADR-001 §5).
- The thread open on load, auto-follow while streaming, the stopped-turn line (DESIGN).
- The diagram dock's modules are removed in their own story (03), after the surface stops using them.

## Feedback (for retro)

### 172/00 — build and review close (2026-10-27, solo)

- **The declared write set was incomplete (refine).** FF-7106 named two tracked renders missing from
  `files:` (`.agents/skills/aof-diagram-review/agents/openai.yaml`,
  `.codex/aof/workflows/workflow-contract.md`). The build also wrote four files nobody had declared:
  `packages/core/assets/manifest.json` and `.aof/aof.lock.json` (both derived), plus
  `packages/core/assets/variants/codex/workflow.md`. That last one is a **fourth copy of the
  diagram-review prose**, the source the codex skill renders from; refine named three renders and
  missed it. All five are now declared on the story. Lesson: a command's tracked renders are not
  its only copies — the codex variant is a second source.
- **The conditional prose could not be read by the model (task 03).** The first draft of the
  diagram-review paragraph applied "in a conversation", and a session cannot tell it is in one,
  because the invocation is identical. The real run answered with `respond` first and then wrote a
  different summary. The paragraph is now unconditional. 171 R1, testing against a real session
  before review closes, caught it.
- **Routed at close — `story (operator)` (Q3):** execution now holds three copies of the
  owned-process tree kill (`codex-app-server.mjs` `terminateOwned`, `session-driver.mjs`, and
  `conversation-session.mjs` `terminateTree`). Shape: hoist one `terminateProcessTree(child)` into
  an execution leaf that all three import. It was not fixed at this close because it edits two
  modules outside this story and raises the `execution/src` budget again.
- **Recorded (Q5):** the architect's session ran a bare `mktemp -d`, outside
  `Bash(aof diagram scene:*)`, without a denial, and its `Write` grant is not path-scoped (it wrote
  its input files under `/tmp`). Logged in VERIFICATION's register for triage at verify.
- **Recorded (Q5):** `aof test --scope impacted --story 172/00` widened to most of the tree (the
  story declares 40+ paths, several of them new) and was still running at 89 minutes on the Mac.
  It was stopped, and its scope was covered by focused runs of every declared suite.
- **Recorded (Q5), not caused by 172:** on macOS, `/var` vs `/private/var` reds the 171 stamp-via-CLI
  case (`diagram-scene-review.test.mjs`) and FF-5301's two-hop laundering probe; four opencode
  renders (`aof-architect`, `add-diagram`, `explain`, `review`) differ from a fresh render. The
  shared tree also holds another session's uncommitted graph/knowledge work (174), which reds
  FF-11904 on four layers that are not 172's.
- **Doctor advisory:** 172/00's example map holds six rules, over the limit of four, so the story is
  large. It built in one pass, with no rounds lost to no-progress.

## Verification

- [ ] `@executable` suite green
- [ ] Fitness functions green (FF-17201, FF-17202 — both pending, story 00)
- [ ] `@manual` signed off
- [ ] `@uat` — 02 task 03 (a live answer streams into the thread)
