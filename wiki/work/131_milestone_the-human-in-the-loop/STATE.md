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

- [x] 01 the question is read and recorded
- [x] 02 the notifier and its channels
- [x] 03 the session waits and the loop keeps going
- [x] 04 the answer reaches the session
- [x] 05 the board shows the question and takes the answer
- [x] 06 the register
- [ ] 07 the live run (`@manual`) — waits on 08
- [x] 08 the messaging CLI

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

## 131/07 · The live run — read at the source (operator procedure, pending)

**SUPERSEDED IN PART (2026-09-25):** the operator ruled the env-var setup out; 131/08 adds
`aof messaging init discord` + `enable discord`, and 07 now depends on it. Task 01's PRECONDITION below
(the user env var and the restart for it) is re-authored at 07's re-refine; the install, fixture and
config of task 00 are re-done after 08 lands. Do NOT run the procedure below until then.

Task 00 (the agent's half) is done and pasted below. Task 01 is the operator's, and its slots are
empty. 131/07 stays `in-progress` until every slot is filled; `aof:verify 131` reads this section.
Paths are scrubbed (`umami`); paste the same way.

### Task 00 — the stage is set (agent, 2026-09-25, run `20260925T085625727Z-0003`)

verifies → `00` "the payload is installed from the main checkout and read at the source".
`node scripts/install-local.mjs` from the main checkout `C:\Source\umami\aof` (branch `127-129`),
no flags, exit 0: `ui:build : yes`, `synced src/`, `synced ui/dist (3 files)`,
`stamped BUILD_ID.json (cf10030+dirty.20260925T095735)`. **The payload is the WORKING TREE:** 131's
code (`src/notify/`, `src/loop/ask*.mjs`, the 01–06 edits) is still uncommitted, so `+dirty` is
what carries it. Then:

```
> ~/.aof/bin/aof.exe --version
0.1.0 (payload cf10030+dirty.20260925T095735)
> Get-Content ~/.aof/bin/BUILD_ID.json
{
  "buildId": "cf10030+dirty.20260925T095735",
  "installedAt": "2026-09-25T08:57:35.726Z",
  "sourceRepo": "C:\\Source\\umami\\aof"
}
> ~/.aof/bin/aof.exe work answer --help
Unknown flag "--help" for work:answer.

Usage: aof work answer <ref> "<text>" [--as <actor>] [--json]
> ~/.aof/bin/aof.exe work loop --help
Unknown flag "--help" for work:loop.

Usage: aof work loop <driver|NN-MM> [--level L1|L2|L3] [--cap N] [--review-claims JSON] [--resume] [--stop] [--dry-run] [--quiet] [--supervised] [--json]
```

Both usage lines carry the named flags; `--help` itself is refused as an unknown flag, exit 1
(recorded under Feedback). **Installed, restart pending (operator).** The builder did not restart
the desktop app.

verifies → `00` "the test-bed carries a refined fixture milestone" and "the test-bed's config".
Test-bed `C:\Source\umami\aof-test-repo`, branch `131-07-ask-target`, commit `77382d0`. It holds
`03_milestone_ask-target` with three `not-started` stories, no `depends:`, each one refined task:
`00_story_joiner` (`src/joinWords.mjs`, `test/joinWords.test.mjs`; the task reserves the separator),
`01_story_labeller` (`src/label.mjs`, `test/label.test.mjs`; the task reserves the case) and
`02_story_counter` (`src/countWords.mjs`, `test/countWords.test.mjs`; reserves nothing). No
scenario, example or note spells a separator or a case. Config: `work.loop.concurrency:
"refine_first"`; `work.notify: { "channels": { "discord": { "type": "discord" } } }`; neither
dispatch-concurrency key set (default bound 3).

```
> aof work validate 03            (test-bed root)
PASS — 03 is well-formed.
> aof work next 03 --through-review --json      → wave: 03/00, 03/01, 03/02; heldSet: []
> aof work dispatch --list --json               → "bound": 3
> aof work loop 03 --dry-run
03 — L2, cap 3: drive continue 03/00.
> git status --short              (test-bed, after the commit)
                                  (empty)
```

The dry-run answers `continue`, not `refine`: the fixture arrives refined.

verifies → `00` "no webhook URL is written anywhere".

```
> git grep -n "discord.com/api/webhooks"        (test-bed, incl. --untracked)     → nothing, exit 1
> git grep -n "discord.com/api/webhooks" -- src .aof   (main, incl. --untracked) → nothing, exit 1
> git grep -nE "discord(app)?\.com/api/webhooks/[0-9]{17,20}/[A-Za-z0-9_-]{40,}"
                                  (main and test-bed, incl. --untracked)           → nothing, exit 1
> git grep -n "discord.com/api/webhooks"        (main, whole tree)               → 16 lines, exit 0
```

**The whole-tree literal grep in the main checkout does NOT print nothing.** All 16 hits are fixture
literals that 131's own contract and suites spell on purpose (`…/webhooks/131/lanes`,
`…/111/secret-token`, `…/1/abc`, in `test/loop/*`, `test/run/*`, 02's and 04's task features and
FF-13106's row). No real-shaped webhook exists anywhere, and FF-13106's own scope (`src/**`,
`.aof/`) is clean. This is a contract defect in task 00's `Then`, flagged and not changed (Feedback).
The builder never read, printed or wrote `AOF_DISCORD_WEBHOOK_URL`'s value.

### Task 01 — the live run (OPERATOR — procedure and paste slots)

**Scope is `03` in the test-bed, never `00`**, whose items have no stories on disk. Paste each
source verbatim per RULING (1): diag lines keep their ISO stamp, files are pasted whole with
`Get-Content`, and a terminal answer is preceded by `Get-Date -Format o`. A Discord message is its
copied text plus its message id; its instant is
`[DateTimeOffset]::FromUnixTimeMilliseconds(([long]<id> -shr 22) + 1420070400000).ToString("o")`.
Never paste, type or show the webhook URL.

**Record once, reuse in every leg:**
- `<buildId>` = `cf10030+dirty.20260925T095735` (task 00)
- `<log>` = the path T1's stderr announces — slot: `______`
- `<runA>` / `<sA>` (03/00) — slot: `______`
- `<runB>` / `<sB>` (03/01) — slot: `______`
- `<recA>` = `<test-bed>/.aof/mesh/dispatch-worktrees/dispatch-03-00/wiki/work/03_milestone_ask-target/stories/00_story_joiner/runs/node-7297/<runA>.json`
- `<recB>` = the same under `dispatch-03-01/…/01_story_labeller/…/<runB>.json`
- The ask files are `~/.aof/mesh/loop-asks/<run>.json`. A transcript is found with
  `Get-ChildItem ~/.claude/projects -Recurse -Filter <sX>.jsonl`.

**Set-up faults and findings.** A set-up fault from task 01's first table is noted here, fixed as its
remedy says, and the precondition is re-checked from the top; no leg is recorded. A failure from its
second table is recorded as a failed leg with the evidence and reported unnumbered, routed to the
story the table names; leave the loop alone (no hand kill). Log: `______`

**P. PRECONDITION** (before any leg) — verifies → `01` "PRECONDITION — the secret is in the operator's environment…"
1. Set `AOF_DISCORD_WEBHOOK_URL` as a USER environment variable.
2. Quit the desktop app from its own UI, then relaunch it with `aof mesh desktop run`. Never use
   `Stop-Process -Force` or `taskkill`.
3. Open T1 and T2 fresh in the test-bed root. Run `[bool]$env:AOF_DISCORD_WEBHOOK_URL` in each.
4. Read the newest `daemon-started` entry of `~/.aof/mesh/logs/mesh-serve.log` and `mesh-ui.log`.

- Then both `daemon-started` entries name `build payload <buildId>` with an `at` after the relaunch — paste: `______`
- And `[bool]$env:AOF_DISCORD_WEBHOOK_URL` prints `True` in T1 and in T2 — paste: `______`
- And `~/.aof/bin/aof.exe --version` in T2 prints `0.1.0 (payload <buildId>)` — paste: `______`

**1. Leg 1 — the question reaches you** (verifies → `01` leg 1). In T1 run `aof work loop 03`. Record `<log>`. Wait for
`Lane 03/00 — mint: run <runA> …`, then for `03/00 — waiting on you (build, <elapsed>): …`.

- Then Discord's message starts `**03/00 — waiting on you** (build, <elapsed>)`, its body is the ask and its action line is ``Answer: `aof work answer 03/00 "…"` `` — paste text + message id: `______`
- And the id-derived instant is within 10 s of the row's `<log>` instant — paste both instants: `______`
- And `<log>` has no `notify-` line between the row and the message — paste: `______`
- And the ask file for `<runA>` reads `"state": "waiting"`, `"ref": "03/00"`, `"phase": "build"`, `"sessionId": "<sA>"`, and a `question` identical to the last assistant message of `<sA>.jsonl` — paste both: `______`
- And `<recA>` reads `"state": "running"`, and its last `asks` entry has that `question`, `askedAt` set, and `answer`/`answeredAt`/`parkedAt` null — paste whole: `______`

**2. Leg 2 — the other lane keeps going** (verifies → `01` leg 2). Do not answer yet. Wait for a `Lane 03/02 — …` line in
`<log>` after the row's instant. Read `<recA>` twice, a minute apart.

- Then that `Lane 03/02 — …` line, with its instant, and T1 shows no `halted on` line — paste: `______`
- And T1 repeats 03/00's row with a larger elapsed — paste both rows with instants: `______`
- And `<recA>`'s `heartbeatAt` advanced between the reads while `state` stayed `running` — paste both: `______`

**3. Leg 3 — the CLI answer** (verifies → `01` leg 3). In T2: `Get-Date -Format o`, then
`aof work answer 03/00 "<your own words>" --json`.

- Then the envelope reads `"ok": true`, `"runId": "<runA>"`, `"delivery": "waiting"`, `"state": "answered"`, `by` = `{ "actor": "you", "via": "cli", "node": "node-7297" }` — paste: `______`
- And within 5 s T1 prints `03/00 — answered by you (build, <elapsed>)` — paste with its `<log>` instant: `______`
- And Discord's message starts `**03/00 — answered by you** (build, <elapsed>)`, has the answer verbatim as its body, and ends `The session is resuming.` — paste text + message id: `______`
- And `<sA>.jsonl` gains a user turn holding the answer verbatim, stamped after it — paste: `______`
- And `<recA>`'s last `asks` entry reads the answer verbatim, `"by": "you"` and `answeredAt` set, and `sessionId` is still `<sA>` — paste: `______`
- Then `aof work answer 03/00 "a second answer" --json`, run while the ask file still reads `answered`, exits non-zero with `ask-already-answered` naming `you`, and `<recA>` is unchanged — paste both: `______`

**4. Leg 4 — the board answer** (verifies → `01` leg 4). Wait for 03/01's `waiting on you` row and its Discord message (as in
leg 1). Open 03/01 on the board, reached your usual way.

- Then the detail panel opens with the ask card: `WAITING ON YOU`, `build · <elapsed>`, the question as plain text identical to the ask file's `question`, `Your answer`, an empty textarea with no placeholder, and one disabled `Send answer` — paste: `______`
- And the card and its state, described, with the instant — describe: `______`
- Then, after typing your own words and pressing `Send answer`, the card shows `✓ Answered by <who> · <elapsed> — the session is resuming` and the answer verbatim below — paste: `______`
- And the ask file for `<runB>`, read DURING the re-drive, reads `"state": "answered"`, the answer verbatim, `by.via` `"board"` — paste whole: `______`
- And T1 prints `03/01 — answered by <who> (build, <elapsed>)` and Discord carries the matching `answered by` message — paste both: `______`
- And `<sB>.jsonl` gains a user turn holding the answer verbatim, and `<recB>`'s last `asks` entry reads it with `answeredAt` set and `sessionId` still `<sB>` — paste both: `______`

**5. Leg 5 — the loop finishes** (verifies → `01` leg 5). Let it run to its end.

- Then T1's last line is `03 — loop done.`, `<log>` ends `exit code=0` and holds no `halted on` line — paste with instants: `______`
- And the test-bed's `03_milestone_ask-target/SPEC.md` reads `status: done`, Discord carries `**03 — accepted**` with the title, and there is no `loop halted` message — paste both: `______`
- And the merged run records of 03/00 and 03/01, read in the test-bed root, each carry exactly one `asks` entry (question, answer verbatim, `by`, `askedAt`, `answeredAt`, `parkedAt` null) — paste whole: `______`
- And the merged run records of 03/02 carry `"asks": []` — paste: `______`
- And `Get-ChildItem ~/.aof/mesh/loop-asks/` lists no file for `<runA>` or `<runB>` — paste: `______`

**6. Close-out** (verifies → `01` "every observation is in STATE.md"; checked by `aof:verify 131`)
- Then every scenario above has its procedure as run, instants, message ids, files and records, pasted per RULING (1) and scrubbed per RULING (4) — check: `______`
- And each block carries its `verifies →` pointer — check: `______`
- And no block carries the webhook URL — check: `______`

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
- **(developer + review, build 01, 2026-09-24, solo)** Review close for 131/01, with no Blockers.
  (1) RECORDED: `createAskPoll` ships with no consumer. 01's task 02 contract requires it, and 03's
  refine ruled the owner waits on a ref'd `setTimeout` instead, so 03 either finds it a reader or
  amends 01's contract to drop it. (2) FIXED at close: `run-liveness.md` cited
  `src/run-store.mjs:969-983` for `isStale`. That range was already stale at HEAD, pointing at
  `recordSessionId`'s tail. It is re-cited to the export's own lines, beside the `readRuns` and
  `isStale` anchors the 17th key moved. The loop records were re-rendered with `aof work update
  --force`, which also cleared 134/03's hand-edited installed copies, and `src/bundle/manifest.json`
  was regenerated. (3) The read set was incomplete, and the report goes to refine: 01's `files:`
  missed the three loop records, their installed copies, the shipped manifest and the lock (FF-5810
  pins run-store line anchors), and the story's own `PLAN.md`. (4) Pre-existing at HEAD: every 131
  `PLAN.md` restated declared paths (FF-9603). 01's and 02's are fixed, and 03–05's will be fixed
  at their builds. FF-11903's citation ceiling (57/55) is 131's own not-yet-built modules and closes
  as 02 and 03 land. (5) Not 131's: `acd-no-internal-project-names` is red on 134's uncommitted
  `STATE.md` in the shared checkout.
- **(developer + review, build 02, 2026-09-24, solo)** Review close for 131/02, with no Blockers
  and nothing routed. The PLAN's hand probe was run with a real `fetch` against a loopback server.
  On 204 it made exactly one POST, whose content was `**90 — accepted**\nProbe milestone`. On 500
  the accept still moved to `done`, with one `notify-delivery-failed` and no URL in the sink.
  `sendDiscord` hands its caller only an error's NAME, through an `onError` callback, because the
  send's four-key answer cannot carry it and the degrade message must name it. FIXED at close:
  02's `PLAN.md` restated four declared suite paths (FF-9603). The full arch set is 2,036 green
  after 02. The two reds left are 03's own `PLAN.md`, fixed at its build, and 134's uncommitted
  `STATE.md`.
- **(developer + review, build 03, 2026-09-24, solo)** Review close for 131/03, with no Blockers.
  (1) RECORDED, size: the plan asked review to measure the delta. `src/commands/loop.mjs` grew by
  about +200 lines, against the estimated +80–90, and `wave.mjs` by about +160 (estimated +80). The
  extra in the shell is `runLoopLaunch` and the death notice (task 06), the pre-walk halt site, the
  `ask` context and the parked-halt plumbing. The primary re-entry (about 70 lines) was moved OUT of
  the shell. RULING DEPARTURE (task 04, ruling 17): `reenterPrimaryAsks` lives in
  `src/loop/cycle.mjs`, not `src/loop/ask.mjs`, because the composer cannot import the ladder that
  imports it. Its two leaves, `reenterStandingAsks` and `sweepStaleAsks`, do live in `ask.mjs`.
  (2) RECORDED, craft: `runLoopBody`'s walk is now an inner closure, so that `ctx.onLoopEnd` fires
  once on every returned state. It was left at its old indentation rather than churning about 750
  lines. (3) RECORDED for 06: `createAskPoll` (01) still has no consumer, because the production wait
  is a ref'd timeout (task 00, ruling 13). 06 either amends 01's contract to drop it or finds it a
  reader. (4) FIXED at close: the ask file's `sessionId` is the fallback when a re-entered run's
  record never learned its session. The immediate-park fixture now reads the real ask file, so an
  answer already on disk wins, as in production. (5) Found by the gate: FF-12905 (the ladder is
  handed its path) and FF-6901 (one heartbeat default) were fixed before review. (6) Re-aims by
  ruling, with assertions not weakened: 12 needs-input cases inject the immediate park. The
  reclaim seeds strip their asks (task 02 ruling 11, task 04 ruling 7). The frozen-halt `sessionId`
  now reads the parked entry. FF-6903's wave leg is aimed at `enqueueHeartbeat`. FF-12602 gains
  `ask.mjs`. (7) QA coverage: every scenario group has cases, but a few outline tables are covered
  by representative rows rather than every row. Those are task 02's lane-bound and re-spawn-env
  rows, task 04's budget-not-consulted rows, and task 01's re-drive-under-stop rows. That is recorded
  here and flagged in the hand-back.
- **(developer + review, build 04, 2026-09-24, solo)** Review close for 131/04, with no Blockers.
  Every Outline row of the five tasks is walked, not only representative rows. That is 283 cases
  across the story's suites, and the arch set is green except the reds noted at (6).
  (1) FIXED at close, a latent crash found by task 01's `invalid-body` rows: the three phase doors
  `return handlePhaseDoor(…)` from inside `handleWorkApi`'s `try` without `await`. A body-reader
  rejection therefore escaped the catch as an unhandled rejection and took the board server down.
  This was already true before this story for malformed JSON sent to a door. They now
  `return await`.
  (2) The read set was incomplete; this goes to refine. FF-12603 leg 6
  (`test/arch/run/acd-run-status-renders-the-record.test.mjs`, outside `files:`) reads each
  board-ui re-pin within a fixed character window. The comment that task 01 ruling 15 prescribes
  pushed the 127/04 and 133/04 entries out of reach. On the 133/04 precedent, a 131/04 leg was
  stacked and the two earlier windows widened.
  (3) RECORDED, craft: `resume.mjs` now holds a second copy of `loop.mjs`'s four-line deferred
  `invokeRegistered`. The import ring forces it, and `src/commands/` is at its 69-file cap, so the
  helper has no shared home. The verb takes its aof home from 03's `askEnvFor`, so there is one
  spelling of that rule.
  (4) RECORDED for security and the retro: the loopback Host check closes rebinding for WRITES
  only (ADR-006 §3, "a safe method has no side effect to forge"). A rebinding page can still READ
  the board's GET routes (`/api/work/doc` and the others), because its reads are same-origin from
  its own point of view. This is not debt under this milestone's rulings, but it is a real
  confidentiality gap for a later threat model.
  (5) The PLAN's hand probe ran in-process: `serveSetupUi` on a fixture, driven over `node:http`,
  rather than a spawned `aof work ui`, under the never-start-processes rule. A same-origin POST read
  back `answered`, `via: "board"`. `Host: evil.example:1` with a matching Origin read 403
  `non-loopback-host`. A GET to a write path read 405 with `Allow: POST`.
  (6) FIXED: 04's `PLAN.md` restated five declared paths (FF-9603). 05's is still red and is fixed
  at its build. Reds that are not 131's: `acd-no-internal-project-names` is red on
  `src/work/dispatch.mjs` and `test/work/lifecycle/work-dispatch-lanes.test.mjs` (committed at HEAD
  6c4d81a) and on 134's uncommitted `STATE.md`.
- **(developer + review, build 05, 2026-09-24, solo)** Review close for 131/05, with no Blockers.
  Every Outline row of tasks 00–03 is walked. The `@manual` task 04 ran at build time. Its evidence,
  with all states CONFORMS at both frames after one GAPS fix, is in `VERIFICATION.md` §131/05.
  (1) FIXED, a product gap the render found: the board re-fetched its list only while an item was
  executing or a resync was watching. A dispatch lane's run record lives in its worktree, so the
  primary checkout's probe never sees it. A shown card would therefore never have tracked its answer
  or left with the ask. `Board.tsx` (outside `files:`) now also arms the silent 5 s poll while any
  row carries an ask. RECORDED for 07's live run and the retro: a NEW ask on a quiet board
  (nothing executing) still appears only on the next load or sync. The Discord ping is what sends
  the operator there, and the board's sync-gated policy was not changed on this story's authority.
  (2) Contract ruling 12 was exercised: 04's mesh predicate moved to ONE home,
  `awaitsAnswer` in `src/board-mesh-execution.mjs` (outside `files:`). `resume.mjs` and `list.mjs`
  both import it, so the card is never offered where the verb would refuse.
  (3) The read set was incomplete; this goes to refine. Five readers outside `files:` moved with
  their subjects: `test/ui/fleet-scope.test.mjs` (the 130/06 and 133/04 re-pin windows, pushed out
  by 01's and 04's stacked comments); `test/ui/terminals-home-route.test.mjs` (`DetailPanel.tsx`
  996 → 998); `test/work/stream/work-archive-is-a-move.test.mjs` (its regex over 04's widened exit-1
  list); `test/arch/run/acd-run-status-renders-the-record.test.mjs` (04, see above); and
  `Board.tsx`. The first three were regressions of 01 and 04 that those stories' focused sets did
  not run. They were found by running every suite that reads a changed file (30 files, only the
  foreign 130 red).
  (4) RULING DEPARTURES, stated: `useId` was dropped for a ref-derived field id, because the
  board harness's React stub lacks it. The heading row gained `flex-wrap` and `whitespace-nowrap`
  (the GAPS fix). The task 04 board ran in-process (`serveBoard`, port 0) instead of a spawned
  `aof work ui`. The `ui/` pin was measured with `AskCard.tsx` intent-to-added (`git add -N`,
  ruling 7), which is an index entry only; nothing is committed.
  (5) FF-9603: 05's `PLAN.md` restatement was fixed, and the stream is FF-9603-green. Arch: 2,040
  green, and the one red is the foreign disclosure control.
- **(continue, walk halted, 2026-09-24, solo)** The walk stopped at 131/06, and 07 depends on it.
  06's contract is unauthored: its `## Tasks` says the features are "authored at the story's own
  refine", and there is no `tasks/` and no `PLAN.md`. `aof work next` still offered it as ready.
  Its run was minted before the contract was read, then closed `cancelled` (run
  `20260924T220057080Z-0000`), and 06 was moved back to `not-started` by hand, because the failure
  rollback fires only on `failed`. The milestone run `20260924T181318341Z-0001` was closed
  `cancelled` too, so no stranded run is left; 131 stays `in-progress`. Next: `aof:refine 131/06`,
  then `aof:continue 131` for 06 and the operator-gated `@manual` 07. For refine to carry: 01's
  `createAskPoll` still has no consumer, and FF-13109's button count must be of the SEND button
  (the card holds two `<button` elements).

- **(refine 131/06, 2026-09-25, solo)** 06's contract is authored as two tasks in 130/05's
  shape. Every register clause was measured against the delivered tree of 01–05 first, and the
  deltas were ruled on in the contract, when it was authored:
  (1) FF-13102: `ask.mjs` reaches the reader through `readAskQuestion` (from `observe.mjs`), not
  `readLastAssistantTurn` directly.
  (2) FF-13108: `commands/loop.mjs` reaches `form.mjs` through `ask.mjs`'s `askBlockLines`, so
  the direct importers are `ask.mjs`, `discord.mjs` and `action.mjs`.
  (3) FF-13109: "one `<button`" means one SEND button; the clamp toggle is DESIGN's.
  (4) FF-13108's own red probe (a second `formatElapsed`) was seen by no leg, so a
  `formatElapsed`-one-home leg was added.
  **OPEN for 131/03 (in review), fix before 06 builds:** `src/loop/cycle.mjs:1079`, the
  stop-standing verify branch, mints `haltDecision("session-needs-input", …)` outside
  `ask.mjs`'s `parkedHalt`. FF-13105 reds on it as written. Fix: route the branch through
  `ask.mjs`.
  Also still open from the walk: 01's `createAskPoll` has no consumer.
  Observed, not this item's: 130's ARCHITECTURE still carries seven `pending — 130/05` markers,
  so 06 now drops its own markers as it lands them.

- **(continue 131/06, 2026-09-25, solo)** Built, gated and reviewed. 06 is now `in-review`.
  Nine controls landed in three files: 33 `arch/131` cases, registered by import and spread. The
  `test/arch/loop` row moved 62 → 65. Every probe from task 01 was observed to red its own
  control and no other, and each is recorded in VERIFICATION's register. ARCHITECTURE carries no
  `pending — 131/06` token. `aof work doctor 131` reports no `control-unresolved` and no
  `verification-missing-red-probe`. The standing set is 118/118 green. The loop suites (stops,
  resume, sequencing, narration) are 85/85.
  (1) The OPEN item for 131/03 above is FIXED, on 03's authority, in `src/loop/cycle.mjs` (outside
  06's `files:`). The standing-stop verify branch now spells its halt through `parkedHalt`, with the
  same act and the same `sessionId` detail, so FF-13105's one-spelling leg holds as written.
  (2) FF-13106's register probe ("log the URL in the failure degrade") would leave a fixture-only
  control GREEN, because `degrade()`'s redaction pass strips the URL. It was measured that way. The
  control therefore carries a structural degrade-message leg, and that leg is the one the probe
  reds. Retro lesson: a probe whose mutation a backstop absorbs needs a leg upstream of the
  backstop.
  (3) Probes were applied and restored from memory, never with `git checkout`, because the
  subjects carry uncommitted 01–05 work. A sha1 check confirmed each subject byte-identical. Three
  subjects are CRLF (`run-store.mjs`, `wave.mjs`, `board-ui.mjs`), and a probe script must honour
  that or its mutation silently fails to apply.
  (4) The read set was incomplete; this goes to refine. Read outside `reads:`: the 130 sibling
  `acd-loop-stop-settles-the-run.test.mjs` (the harness shape), `test/support/mesh-ui-assign-fixture.mjs`
  and `src/setup-ui.mjs` (FF-13109's two-face fixture), `src/run-heartbeat-consumption.mjs`
  (FF-13105's heartbeat leg) and `test/mesh/ui/mesh-ui-serve.test.mjs`.
  RECORDED, not fixed (a Nit): the per-file sweep helpers (`srcUnits`, `resolved`, `assertRead`)
  now exist in six sibling arch files (130's three and 131's three). Lifting them into
  `test/support/` would touch 130's delivered files, so it was not done on this story's authority.
  Still open from the walk: 01's `createAskPoll` has no consumer.

- **(refine 131/07, 2026-09-25, solo)** 07's contract is two `@manual` tasks in 130/06's shape.
  00 is the agent's half: install from the main checkout (not `--skip-ui`, because 05 changed `ui/`),
  a fixture `03_milestone_ask-target` on the standing test-bed, and the procedure with its paste slots
  here, then `NEEDS_INPUT`. 01 is the operator's live run, in five legs: the ask on Discord within
  10 s, measured from the message id; the `03/02` lane driving during the wait; the CLI answer; the
  board answer; and `03 — loop done.`. Rulings taken in the contract:
  (1) Two of the fixture's stories reserve one choice to the operator in their own text, because
  131 leaves WHEN a session asks untouched. A session that decides anyway is a set-up fault and
  re-run on a fresh fixture, never a finding.
  (2) The webhook URL is checked only as `[bool]$env:AOF_DISCORD_WEBHOOK_URL`, and never pasted.
  (3) A second CLI answer is refused `ask-already-answered`, which was measured in
  `answerAsk` before it was written in.
  (4) Discord line 1 is asserted by its prefix, because `renderDiscord` appends ` · <node>` when the
  node resolves.
  (5) A park at the bound is out of 07. It was already seen live on a source build, when a sibling
  lane's merge conflict parked a waiting lane (STORY Notes), and forcing it here would need a
  shortened bound on a real loop.

- **(continue 131/07 task 00, 2026-09-25, solo, run `20260925T085625727Z-0003`)** The agent's half
  is done and handed back (see `## 131/07 · The live run`). Four things for verify and the retro:
  (1) **Contract defect, flagged and not changed:** task 00's "`git grep -n "discord.com/api/webhooks"`
  … in the main checkout … prints nothing and exit 1" cannot hold in this repository. 131's own
  suites and task features spell fixture URLs on purpose (16 hits: `…/131/lanes`,
  `…/111/secret-token`, `…/1/abc`). Its intent (no real webhook written anywhere) was measured with
  a real-shape regex and FF-13106's own `src/` and `.aof/` scope, all clean. The acceptance for
  verify: read that line as "no real-shaped URL", or record it as an amendment.
  (2) RECORDED (Nit): `aof work answer --help` and `aof work loop --help` are refused
  `Unknown flag "--help"`, exit 1. The usage line prints anyway, so the scenario's content is met.
  The refusal is CLI-wide (not 131's), so this is a note, not a finding against 01–06.
  (3) A fixture from an earlier, pre-contract attempt was on the test-bed branch
  `131-07-ask-target`, uncommitted, with the stories UNREFINED and the reservation in STORY.md. That
  shape drives REFINE in the primary (ADR-004 §3). It was rewritten to the contract (one task each,
  reservation in the task, disjoint `files:`) and committed as `77382d0`.
  (4) The read set was incomplete; this goes to refine. Read outside `reads:`: `src/loop-bounds.mjs`
  and `src/work/dispatch.mjs` (the lane bound's default), `src/notify/notify.mjs` (the `urlEnv`
  default), the test-bed's fixture 02 (a refined story's shape), and `.githooks/pre-commit.mjs`
  (which scrub the paths need).
- **(refine 131/08, 2026-09-25, solo)** 08's contract is six `@executable` tasks. ADR-005 §1 is
  AMENDED in place (marked `AMENDED at 131/08`), and so are its Invariant and FF-13106's register
  row. The URL is kept in `<global home>/messaging/discord.secret`, owner-only and written
  atomically, and `src/notify/secret.mjs` is the ONE module that knows that path. On every send,
  `env[urlEnv]` wins as the override, then the store, with nothing cached, so no restart is
  needed. `enable`/`disable` write only `work.notify`, through delegation's `readConfig`/`writeConfig`.
  Rulings taken in the contract:
  (1) The family is `src/commands/messaging/`, a one-member EXEMPTION like `diagram`. The
  `src/commands` row is 69/69 and refuses a flat sibling.
  (2) The store's home is the PROCESS's global home, never one derived from `notify`'s injected
  `env`. Otherwise a test's `env: {}` would read the real `~/.aof`.
  (3) Any positional after the type is refused `messaging-secret-in-argv`, whatever it holds. The
  face already never echoes `--url=<value>` (it names only the flag).
  (4) The hidden prompt is `@inquirer/prompts`' `password`, which is already a dependency, so no
  install is needed.
  (5) `enable` writes even when this machine has no URL stored (the config is committed and read
  on other machines too), and says so. It is idempotent over a hand-named channel of the type.
  (6) No verb removes the stored URL. Deleting the file is the machine-wide removal, and
  `disable` is per project.
  The graph proposal was partial: `graphify-out` was built 2026-09-23, before `src/notify/`
  existed, so the notify files read as unknown coupling. `command-core.mjs` is a hub, and its
  ~200 proposed dependents were subtracted to the route and contract controls this story crosses.
  For 07's re-refine: its PRECONDITION becomes `aof messaging init discord` plus
  `aof messaging enable discord`. Doctor warns `depends-edge-unwitnessed` 07 → 08 until 07's
  `reads:` names what it uses from 08.
- **131/08 build + review (2026-09-25, `aof:continue 131/08 --solo`).** Built green in two rounds
  (round 1: 2 failing, both in the new FF-13106 leg's own code; round 2: 0). Solo review, one round,
  no Blocker. Fixed at the close: `secretInArgv` told an `enable`/`disable` caller to "paste the URL
  at the prompt" of a verb that never prompts; every verb now points at `init`. Two helpers were
  un-exported. POSIX modes were measured on the WSL distro (Linux, a Linux-filesystem home): file
  `600`, dir `700`, re-applied over `644`/`755`. On win32 the case takes ruling 3's no-mode branch.
  Findings recorded here, not fixed:
  (1) **Inherited red, not 08's.** FF-11903 (`acd-cited-path-resolves`) reads 57 unresolved `src/`
  citations against a ceiling of 55. The four from this milestone are in other stories' uncommitted
  evidence: `src/joinWords.mjs`, `src/label.mjs` and `src/countWords.mjs` (this file, 07's procedure
  fixture), and `src/loop/ask-requests.mjs` (VERIFICATION FF-13101's non-vacuity probe). Nothing
  08 wrote is on the list. The whole-tree gate at `aof:verify 131` will red on it.
  (2) `aof messaging status` inside a project whose `.aof/aof.config.json` is malformed JSON exits
  non-zero (`readConfig` throws `malformed-json`). Task 04 ruling 4 says status "exits 0 whatever it
  finds". A malformed config is not one of its three facts, so this was judged out of the ruling's
  scope and left alone. The call is recorded here so verify can overrule it.
  (3) `init` reads stdin until the first newline or EOF, so an open pipe that never writes a line
  waits. This is the stdin contract (task 02), stated here so it is not found by surprise.
- **(`aof:verify 131`, 2026-09-25)** Stories 01, 02, 03, 04 and 06 are ACCEPTED on their story lanes.
  The run covered 48 suites plus the notify index in one isolated run: 924 green after one gate fix (F-131-05, 01's
  sweep tripped by 05's `list.mjs`). Each carries OUTCOME.md, and 01, 03, 04 and 06 carry a
  RETROSPECTIVE.md (02 was clean). **The milestone door is NOT reached**, for four reasons: (1) 05 holds `in-review` until 131 is
  committed, because its two diff scenarios need a range (F-131-07). (2) 07 is the operator's, after its re-refine for
  08's `messaging` precondition and after F-131-02's identity re-pin. (3) `aof work regression-gate 131` needs a
  clean checkout, and this one carries 130/134/137 work. (4) F-131-03 (FF-11903 57/55) reds that gate.
  F-131-06 (`createAskPoll`) waits on the operator's ruling.
## Verification

<!-- Pointers, not restatements. -->
- [x] `@executable` story lanes 01–06 green (VERIFICATION `### 131/01–06`); the whole-tree `aof work regression-gate 131` is not yet run
- [x] Fitness functions green: FF-13101…13109, 34 cases, every red probe recorded
- [ ] `@manual` live run recorded (131/07, operator)
- [x] 05's accept-time diffs over its committed range `48ac161..8f00b4a` (F-131-07 closed)
