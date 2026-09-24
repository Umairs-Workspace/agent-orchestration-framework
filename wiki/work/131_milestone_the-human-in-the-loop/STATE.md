---
doc: state
---
<!--
  Milestone STATE.md — answers ONE question: where are we, and what happened?
  Owner: product-owner (single writer). Identity is inherited from the folder; the canonical
  status lives on SPEC.md frontmatter and on each STORY.md. This is the running NARRATIVE.
  Compacted at Accept: durable decisions graduate to ADRs / the next SPEC; the blow-by-blow archives.
-->
# 131 · The human in the loop — State

## Progress

<!-- Story-by-story, mirroring the SPEC Stories list. -->

- [ ] 01 the question is read and recorded
- [ ] 02 the notifier and its channels
- [ ] 03 the session waits and the loop keeps going
- [ ] 04 the answer reaches the session
- [ ] 05 the board shows the question and takes the answer
- [ ] 06 the register
- [ ] 07 the live run (`@manual`)

## Notes & decisions in flight

- **Refined 2026-09-23 (orchestrated, loop-driven, run `20260923T164345609Z-0000`).** Researcher →
  `RESEARCH.md` (R1–R10); designer → `DESIGN.md`; architect → `ARCHITECTURE.md` (ADR-001…006,
  FF-13101…13109 declared `pending — 131/06`, an ADR-003 sequence diagram); PO → seven stories and
  the scaffolded `VERIFICATION.md` register. Story contracts are authored at each story's own refine.
- **RATIFIED (PO): the live-PTY wait is not built — park-then-resume is primary (ADR-001 §2).** The
  SPEC's scope said "the driver keeps the PTY alive". The architect departed, on measured grounds:
  the only answered ask on record (127/02) was a `--resume` re-drive that finished in four minutes;
  typing into a turn-ended claude PTY from outside is 42's open finding (the bytes arrive, claude does
  not react); a lane's PTY lives in a child process with no input channel (R3); and 69/ADR-007's
  amendment says a held PTY double-books capacity. The objective's verifiable outcome — "the session
  continues from where it stopped" — is met by resuming the SAME session with the answer typed as its
  first input; the WAIT (record kept `running`, heartbeat, the bound, the account row) belongs to the
  run's owner, not the process. Ratified; reversible as an additive mode if a live-PTY input path is
  ever proven. The SPEC's "through the terminal-input path" is likewise replaced by the ask file
  (local) and `mesh:terminal-resume` (worker).
- **RATIFIED (PO): a mesh-worker ask is answerable but not surfaced.** Its question lives on the
  worker; carrying it to the control changes the frozen assignment wire. The board shows it as
  "question unreadable" and no Discord ask fires for it. The SPEC's outcome is a LOCAL loop's ask, so
  the verifiable outcome is untouched. **Follow-up item (scope, not debt):** carry the worker's ask
  to the control and notify it — to be captured as its own item once 131 has run live.
- **RATIFIED (PO): seven stories, not six** — the proposed 01 split into read-and-record (01) and the
  wait (03, absorbing the proposed 03), plus a register story (06), as 130 did. The SPEC's
  `## Stories` is rewritten to the seven.
- **Default decisions taken (unattended refine):** (1) **no mocks** — the operator was not present to
  supply one, so DESIGN.md's binding checklists are the conformance source of truth for the card, the
  Discord message and the terminal line; (2) **no security specialist fanned out** (agent-cost rule) —
  the threat points are ruled inline in the ADRs: control characters refused in an answer (bracketed
  paste escape), a loopback-`Host` check on both write faces (DNS rebinding), the webhook URL read
  only from the env var `urlEnv` names (default `AOF_DISCORD_WEBHOOK_URL`) and never logged, the
  question never rendered as Markdown; a SECURITY.md can be added at 04's refine if the operator wants
  one; (3) the wait's bound is `scheduleToCloseMs` counted from the ask, restarted on `--resume`
  (ADR-001, DEFAULT DECISION); (4) a waiting lane keeps its slot (ADR-004, DEFAULT DECISION).
- **Shared-checkout hazard for 01:** `src/run-store.mjs` carries an UNCOMMITTED 130 edit in this
  tree (2026-09-23). It must be committed by its owner before 131/01 re-pins that file's `53/FF-5307`
  digest, or the two re-pins collide.

- **01 contract authored 2026-09-23 (orchestrated, loop-driven, run `20260923T173003685Z-0000`).**
  Six tasks: the reader, the producer paragraph, the ask file, answer sanitation, the `asks` key,
  and the reclaim skip with the charge. The PO wrote the scenarios, QA the case matrix, and the
  developer checked feasibility. Two rulings came out of review. `NEEDS_INPUT_SENTINEL` moves to
  `observe.mjs` beside `HUMAN_INPUT_TOOL_NAMES`, and the driver re-exports both. `parkRunAsk`
  re-stamps a parked, unanswered ask, because `--resume` re-enters the wait. `files:` gained
  `run-store-spend` and `run-status-document-frozen`, both of which pin sixteen keys. It dropped
  `work-observe.test.mjs`, an unregistered suite, and the reader cases moved to the driver
  transcript suite. **For 06:** FF-13102's "JSON.parse plus `stop_reason`" sweep must exempt
  `defaultSpawnRuntime`, whose codex stdout parse at driver `:1580` is not a transcript scan.
  **Measured:** FF-5307 is red in the working tree now, because 130's uncommitted `carriedBrief`
  edit moved the `src/run-store.mjs` digest away from the pin, which matches HEAD.
- **Open, QA flag (not re-opened):** ADR-003 §2 stores C1 controls verbatim. U+009B is an 8-bit
  CSI. It is harmless in a UTF-8 terminal but untested inside the bracketed paste. This is for
  04's refine or security review, and the ADR stands until then.

- **02 contract authored 2026-09-23 (orchestrated, loop-driven, run `20260923T175357487Z-0000`).**
  Seven tasks: the family founded and registered, the form, the `work.notify` schema and resolver,
  the envelope, the Discord renderer, delivery, and the accept site. The PO wrote the scenarios, QA
  the case matrix, and the developer checked feasibility; all seven are feasible. **Amendment,
  ratified in the authoring beat (03 PO ruling 3):** `stop` carries a fourth key, `ref`, the
  halting item, because for loop events the envelope's `ref` is the scope and DESIGN §3's halt
  line needs "at <ref>". The eleven envelope keys do not move. **For 03:** fill `stop.ref` at the
  `loop-halted` site. **For 04:** `outcome.by` is the actor NAME string (QA 01 ruling 3), so the
  `session-answered` site passes `by.actor`, not the `{ actor, via, node }` object. **For 06:**
  FF-13108's byte-identity is a shared PREFIX (`headline(e)`, plus ` <cost>` except for
  `loop-halted`), not whole-line equality (01 PO ruling 7, QA ruling 6). Developer ruling
  ratified: the task 06 accepts pass `gateOverride`, and the title comes from the resolved item
  row, because `transitionItemStatus` returns `{ ref, status, from }`. `files:` gained two
  suites (`notify-form`, `notify-discord`) and `reads:` the gate and budget fixtures.
  **Measured:** `acd-source-directory-budget` is red over the live tree now because of lane
  137's uncommitted files (`src/work` 45/44, `test/bundle` 33/32, `test/memory` 12/11,
  `test/work/gate` 11/10). Task 00's live-tree steps wait on 137 raising those rows.

- **03 contract authored 2026-09-23 (orchestrated, loop-driven, run `20260923T182322675Z-0000`).**
  Seven tasks: the composer (`awaitAnswer`, `parkedHalt`, `askWait`), the three primary sites, the
  waiting lane, `work:drive --answer`, `--resume` re-entry, the account, and the loop's own
  notices. The PO wrote the scenarios, QA the case matrix, and the developer checked feasibility;
  all seven are feasible with the changes ruled in. **Rulings that move the design (each ratified in
  its task):**
  (1) The production wait is a REF'D `setTimeout` per check, because an unref'd wait lets the loop
  exit on `beforeExit`, 129's silent-death class. `createAskPoll` is not on the owner's path.
  (2) The retry ladder answers `{ phaseRun, parked }` and never halts on a park, because the wave
  and the shell give a park different meanings.
  (3) A drain parks a waiting lane silently, and an answer already in the file wins, except at
  level 2.
  (4) On `--resume`, live ownership is read off the last ask's `parkedAt`, not the clock.
  (5) A parked entry carries FIVE keys (`question` added) so the halt can print the ask block. The
  block prints after any halt carrying `parked`.
  (6) The heartbeat enqueue moves to one export, `enqueueHeartbeat`, in
  `src/run-heartbeat-consumption.mjs`, and `69/FF-6903`'s wave leg is re-aimed at it.
  (7) `runLoopLaunch` and a `ctx.onLoopEnd` sink fire `loop-halted`.
  (8) `readLoopDeclarationRun` joins `src/work/loop.mjs`, after 01's edit there.
  (9) An answered run's spend is settled from the waiting drive's first baseline. After a
  `--resume` re-entry the pre-ask turn goes uncharged, which is stated.
  `files:` gained `src/run-heartbeat-consumption.mjs`, `src/work/loop.mjs` and the FF-6903 suite.
  `reads:` gained the stops fixture (`loop-command-probe`). **For 01:** after this ruling,
  `createAskPoll` has no owner-side consumer. Its build should confirm a reader or drop it, not
  ship a dead export. **For 06:** FF-13101's importers include `src/commands/drive.mjs`, and both
  `ask.mjs` and `drive.mjs` read states only through a destructured `ASK_STATES`. FF-13105's skip
  goes through `isParkedHalt`. FF-6903 is already re-aimed by 03. **Size (developer's
  estimate):** `loop.mjs` about +80–90 and `wave.mjs` about +80, above the ADR's ~50 and ≤ 40.
  Those figures predate the re-entry contract, so review measures the delta.

- **04 contract authored 2026-09-23 (orchestrated, loop-driven, run `20260923T190633757Z-0000`).**
  Five tasks: the verb, the board route behind one hoisted admission, the loopback predicate on
  both faces, the mesh leg, and the sweep's waiting row. The PO wrote the scenarios, QA the case
  matrix (263 Examples rows), and the developer checked feasibility; all five are feasible with
  the rulings ratified in each task. One scenario was corrected: the act face over a waiting run
  refuses the store's `no-retryable-run`, not `duplicate-run`. **Rulings that move the design,
  ratified in the authoring beat:** (1) AMENDS ADR-003 §5c — `answer` on `mesh:terminal-resume`
  is an OBJECT `{ text, by, askedAt }`, so who answered and when the worker parked reach the
  worker's record; and the control router (`src/mesh/terminal-input.mjs`) is a hop the ADR
  missed — it rebuilds the DOWN frame key by key, so it joins `files:`. (2) `session-answered`'s
  `elapsedMs` is the WAIT (`answeredAt − askedAt`, floored at 0, `null` without an `askedAt`), a
  departure from ADR-005 §3 for this one event: the verb cannot see a lane's record. (3) `as` is
  bounded at 80 code points with no control character, else `answer-actor-invalid` (400): the
  actor rides Discord's line 1 and the public run record. (4) `readJsonBody` refuses a non-object
  body `invalid-body` (400) on EVERY board write route, fixing today's 500 in the file this story
  touches. (5) Board write routes match on pathname, so a non-POST answers 405 as the fleet does;
  `acd-board-write-isolation`'s POST detection is re-based on `admitWriteRequest(` calls. (6) On
  the mesh leg `runId` is `confirmedRunId ?? null`, a worker-refused resume is thrown as
  `terminal-resume-not-started` (409), and the render names no node. (7) The sweep's row reads
  `NEEDS YOUR ANSWER`, because FF-13108 gives `waiting on you` one home. (8) **No `/aof:answer`
  bundle wrapper, by design:** the verb is the OPERATOR's, and a driven session must never answer
  its own question. **For 03's build (a finding, not a re-open):** open each ask under
  `resolveWorkspaceId(ctx.workspace)` over the primary checkout — never `config.mesh.workspaceId
  ?? null` as 130's stop request reads it — or no answer finds its ask in an unpinned workspace.
  **For 06:** FF-13101's ask-state-word sweep must exempt `resume.mjs`'s `delivery` literals and
  its retry-readiness `"parked"`; FF-13109's four `admitWriteRequest(` call sites are pinned by
  01's source scenario. **For 05:** `workApi.answer` posts `{ ref, text, actor }` and may read
  `answer-actor-invalid`, `invalid-body` and `non-loopback-host` back. **Watch item for 07:** a
  stale `answered` ask file (an owner that died before `clearAsk`) shadows a live mesh
  `needs-input` ask on the same ref until the loop's `--resume` clears it — ruled, not built.
  **Measured:** `worker-execution.mjs` must stay at EXACTLY 1,914 (the ratchet is equality) — the
  net-zero edit is named in 03; `resume.mjs` grows by about 175 lines to about 415, for the
  architect's review. `files:` gained the router and three suites (two board suites POST feedback
  with no Origin and would red under the hoist; the cli-bijection probe list); `reads:` gained
  five.

- **05 contract authored 2026-09-23 (orchestrated, loop-driven, run `20260923T201115663Z-0000`).**
  Five tasks: the ask fact on the list row, `askCardState` and the relabel, the card and its
  client and mount, the board row and the `ui/` pin, and a `@manual` Chromium render judged by the
  designer. The PO wrote the scenarios, QA the case matrix (161 rows), and the developer checked
  feasibility; all five are feasible with the rulings ratified in each task. **Rulings that move
  the design, ratified in the authoring beat:** (1) AMENDS ADR-006 §2: the ask fact has THIRTEEN
  keys, with `scope` last, because a parked receipt read back after a reload has no answer document
  to name `aof work loop <scope> --resume` from. (2) A mesh ask exists exactly where 04's mesh leg
  accepts an answer (`active`, `running`, `needs-input`, a `sessionId`, with scope inheritance);
  its `askedAt` is the assignment's `updated_at`, so its wait restarts on every re-sent running
  frame (stated, not fixed). (3) The card has no Loading state, because the ask rides the list row
  and the card fetches nothing (a departure from DESIGN §1). (4) The answered heading is
  `eventPhrase(session-answered)` upper-cased; `PARKED — UNANSWERED` stays DESIGN's own word.
  (5) The card remounts per ask, keyed `${runId}:${askedAt}` locally and `mesh:<sessionId>` for a
  worker. (6) An `askedAt` tie breaks by the higher `runId`. **For 01's build:** `answerAsk` breaks
  the tie the same way, or the card and the verb pick different asks. **For 04's build:** export
  the mesh leg's acceptance predicate, and `list.mjs` imports it rather than spelling it twice.
  **For 06:** the card renders TWO `<button` elements (Send and the show-all toggle), so
  FF-13109's "one button" counts the SEND button, the one that calls `workApi.answer`.
  **For 07:** DESIGN's subjective `@uat` read of the card is taken on the live board there. No
  config edits are needed: a scratch probe showed `tsc -b` and `vite build` resolve
  `../../../src/notify/form.mjs`, and no arch test fences the `ui → src` import today. `files:`
  gained `VERIFICATION.md` and the story's `evidence/` folder; `reads:` gained the files the
  build edits and the dependency contracts.

- **Framed 2026-09-16** from 129/06's live run on 127: the loop halted `session-needs-input` at
  127/02 with only a session id on the line; the question (27 doctor findings and a shell loop to
  run) was in the transcript, answered by hand outside the session, and the re-drive finished in
  four minutes. The operator's direction: "the loop can't just die if it needs my input … we need
  a better way", and "support things like Discord channel notifications — ensure infrastructure
  for external messaging is in place". The SPEC carries the measured table; nothing is decided here.
- **What the ARCHITECTURE must settle, in order:** (1) keeping the PTY alive on the sentinel
  without breaking 69/05's parked fallback — one driver, two waits; (2) the one reader of "the
  question" (the transcript's last assistant message — never the PTY buffer); (3) the answer's
  transport — the terminal-input path (m38) reused for a LOCAL session, which today targets a
  worker by node id; (4) the notifier's envelope and channel registry — one shape, renderers per
  channel, Discord webhook first, delivery best-effort and degrade-by-name; (5) where the secret
  lives (config vs env) and what the config-key controls (FF-7101's species) require of it.
- **Read against Gothelf, *The last cheap moment: optimizing human-in-the-loop AI workflows*
  (2026-09-23, <https://www.linkedin.com/pulse/last-cheap-moment-optimizing-human-in-the-loop-ai-jeff-gothelf-izjse/>).**
  The article places a planned checkpoint one step before the work becomes expensive to reverse,
  and names four ways a human checkpoint fails: the reviewer gets the output without the
  rationale; the checkpoint lands after the expensive work; approval is the fast, rewarded path;
  and volume teaches the reviewer to skim. Its test of a checkpoint: can the reviewer say what
  they would change, why, and what it affects downstream — and does the work proceed regardless?
  Three lessons went into the SPEC's scope today: the **form of the ask** (decision, options,
  pick, consequence before the sentinel — the threshold for asking untouched); **`phase` and
  `elapsedMs` on the envelope** (a refine-time question is the cheap moment, a build-time one the
  expensive fallback; the specification-by-example research note of the same day routes
  business-rule questions through this channel at the head of the Contract stage, which is where
  the article would put the checkpoint); and **`session-parked-unanswered` / `session-answered`
  as firing points** (a lane that parks unanswered under `refine_first` is not a loop halt, so
  nothing else would tell the operator — the article's cautionary tale is a month of unattended
  agents). Two stay here as design notes, not scope:
  - **No fast path on the reply.** The article's "does the work proceed regardless?" test 131
    passes by construction, because the session waits. Keep it that way on the board: the reply
    box is free text, there is no default "continue" button, and the answer is recorded verbatim
    so a later reader can tell a decision from a nudge. The SPEC's outcome paragraph and story 02
    now both say the answer text lands on the record (they disagreed before today).
  - **Count the asks, then ratchet them into rules.** Volume is what makes a reviewer skim, and
    under `refine_first` several lanes can ask at once. The measured ask (doctor findings and
    git-ignored residue) was a policy question, not a judgment call, and should have been a
    documented default. The record shape story 02 lands must leave asks and answers readable as
    retrospective input; a recurring class of ask is a retro finding that becomes a rule or a
    config default, not a question asked again. The retrospective's job, not this milestone's.
  - **What does not transfer:** "delete a checkpoint that fails the test" is about planned
    approvals — aof's are the refine review stop and the `--autonomous` end-of-cascade review,
    not anything here.
  - **Adds a sixth item to the list above:** (6) the form of the ask — the paragraph the producer
    requests before the sentinel, and how a renderer fits it under a channel's cap with the link
    carrying the rest.

## Feedback (for retro)

<!-- Raw, attributed entries; triaged into VERIFICATION.md / RETROSPECTIVE.md at aof:verify. -->

- **(architect, refine 2026-09-23)** `aof diagram export` answered `png.ok: true` for a PNG that
  rendered an XML parse-error page — the cause a `--` inside an SVG comment; nothing in the plan's
  `instructions` warns of it. Fixed and re-exported by hand.
- **(architect, refine 2026-09-23)** `deriveStoryContract` called without `allSuites` proposes
  invented test paths (`test/<basename>.test.mjs`); replaced with the real suites by hand.
- **(PO, refine 04, 2026-09-23)** The ARCHITECTURE's per-story `files:` for 04 missed one hop
  (`src/mesh/terminal-input.mjs` rebuilds the resume DOWN frame key by key) and two suites that
  POST feedback with no Origin. Neither is import coupling: the first is a data hop, the second
  an HTTP contract. Both were found by reading the code and the fixtures, one by the PO and one
  by the developer — the derive tool cannot see either kind.
- **(PO, refine 04, 2026-09-23)** Three ruling blocks per feature cost about 90 lines each;
  features 00 and 03 reached 298 and 295 of the 300-line doc budget, and the last two
  ratifications had to go inline on an existing line. A per-feature budget row for rulings, or a
  ruling block that replaces rather than appends, would remove that squeeze.

## Verification

<!-- Pointers, not restatements. -->
- [ ] `@executable` suite green
- [ ] Fitness functions green
- [ ] `@manual` live run recorded
