---
doc: verification
---
<!--
  Milestone VERIFICATION.md — answers ONE question: is this item truly done, and what is the
  evidence? Written at `aof:verify`, per story as each lands. Owner: product-owner — the SINGLE
  WRITER. Evidence agents REPORT; they never author here.
  Scaffolded at refine (2026-09-23) so the fitness register exists for story 06's red probes; every
  row below reads pending with an em-dash probe (129's convention) until its control lands and is observed failing.
-->
# 131 · The human in the loop — Verification

## Verification evidence

<!-- One entry per lane that ran, per story as each lands. For each `@manual` scenario record the
     PROCEDURE, the RESULT and a `verifies →` pointer at the scenario it discharges. -->

### 131/05 task 04 — the card renders to its checklist (`@manual`, build-time run, 2026-09-24, solo)

**Procedure.** `npm run ui:build` (exit 0) built this checkout's `ui/dist`. A scratch fixture W (pinned
`mesh.workspaceId: "w1"`, `mesh.nodeId: "node-7297"`; milestone `03`, story `03/01`) ran under an
isolated aof home H. Nothing touched `~/.aof` or a live daemon. The board was this checkout's
`serveBoard({ projectDir: W, port: 0, repoRoot })`, run IN-PROCESS on an ephemeral port by the render
script and closed at its end. This departs from ruling 5's spawned `aof work ui` under the
never-start-processes rule, and serves the same tree's `ui/dist`. The cached ms-playwright Chromium
(`chromium-1234`, `--headless=new --remote-debugging-port`) was driven over CDP (`Page.navigate`
through `about:blank`, `Emulation.setDeviceMetricsOverride`, `Input.insertText`, `Fetch.requestPaused`,
`Page.captureScreenshot`). Asks were written through 01's `openAsk`/`parkAsk`. The CLI answers were
`AOF_GLOBAL_HOME=H node src/cli.mjs work answer 03/01 "<text>" --as umami` (exit 0 each). The worker
row was seeded with `insertAssignment` + `updateAssignmentState(running, needs-input)`. Under solo
mode the designer's fidelity judgement was made in-session against DESIGN §1's binding checklist.

**Result — every state, both frames** (`stories/05_…/evidence/`):

| state | screenshots (1280×800 · 760×520) | verdict |
|---|---|---|
| waiting, two-line question, 12 min | `01-waiting-two-lines-*.png` | CONFORMS: no toggle, `Send answer` disabled, empty reply, no placeholder |
| waiting, 40 lines | `02-waiting-40-lines-clamped-*.png` | CONFORMS: clamped at 6 lines under `Show the full question` |
| 40 lines, toggle clicked | `03-waiting-40-lines-expanded-*.png` | CONFORMS: full height, `Show less`, the body scrolls |
| `question: null` | `04-waiting-unreadable-*.png` | CONFORMS: dashed box, reply usable |
| `take b` typed, POST held at `Fetch.requestPaused` | `05-sending-*.png` | CONFORMS: `readOnly=true`, `aria-busy=true`, `Sending…` |
| answered by `umami` from the CLI | `06-answered-by-umami-*.png` | CONFORMS: `✓ Answered by umami · 12m — the session is resuming`, the answer verbatim |
| parked, asked 3h 10m, parked 1h | `07-parked-*.png` | CONFORMS after one fix (below) |
| parked, then answered | `08-parked-then-answered-*.png` | CONFORMS: `… — resumes with the loop (aof work loop 03 --resume)` |
| answered by the CLI after the board polled (list GETs held), then Send | `09-refused-after-poll-*.png` | CONFORMS: `✕ Not sent — the session is no longer waiting` in `mono text-xs text-accent`, `title` = the server sentence, the text `take c — not b` kept, Send enabled |
| a worker's `needs-input` row, no ask file | `12-worker-needs-input-*.png` | CONFORMS: `7m · on node-2976`, `… Delivered to node-2976.`, header `Open terminal — node-2976` |

GAPS fixed in this story and re-rendered (PO ruling 2). The first `07-parked` render at 1280 broke
`PARKED — UNANSWERED` over two lines beside the long cost. The heading row now wraps the cost onto
its own line (`flex-wrap`), and the heading is `whitespace-nowrap`. Every state was re-captured after
the fix.

**End to end** (verifies → "an answer typed on the board lands verbatim…"). `take b —\n  keep the
tests` was typed and sent. The file read back from disk: `state=answered`, `answer` byte-equal, `by`
`{"actor":"you","via":"board","node":"node-7297"}`. The receipt held after 2 list polls
(`10-e2e-receipt-held-1280x800.png`) and was gone on the first poll after the file was removed.
**Refusal** (verifies → "a refusal keeps the words…"): row 09 above. **No ask** (verifies → "with
no ask the panel is unchanged"): the panel's `outerHTML` was captured from this checkout's build
BEFORE any `ui/src` edit (`00-no-ask-base.panel.html`, `00-no-ask-base-1280x800.png`). After the
card, with the ask file removed, it is byte-identical (3,122 vs 3,122 characters,
`11-no-ask-after.panel.html`, `11-no-ask-after-1280x800.png`).

**At the accept, pending** (verifies → the two diff scenarios, developer ruling 8). The story is
not committed, so "from the story's base to its last commit" has no range yet. Measured on the
working tree: `git diff --numstat -- ui/src/board/DetailPanel.tsx` → `2	0`. The pin control's
working-tree diff (`129	79`) also carries 01's and 04's uncommitted re-pins. 05's own lines are
only the `ui/` digest literal and its comment, the digest's lift into `assertUiFrozen`, and the
one-character case. The `src/run-store.mjs` and `src/board-ui.mjs` pins are 01's and 04's, untouched
by 05. `aof:verify` reads both again over the committed range.

### 131/08 — the messaging CLI (`@executable`, `aof:verify 131/08`, 2026-09-25)

**Story lane.** Under a fresh `AOF_GLOBAL_HOME`, `node scripts/test.mjs --only test/notify/index.mjs
test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs test/arch/testing/acd-source-directory-budget.test.mjs`
→ exit 0, 84 ok, 0 not ok. Every scenario of tasks 00–05 has its own named `131/08 taskNN` case,
and FF-13106's five cases, FF-13107–FF-13109 and FF-11904 are green. The controls this story crosses
also ran green in two more isolated runs, 61 ok and 0 not ok: `command-core-contract`,
`acd-command-route-derived`, `acd-work-command-cli-bijection`, `acd-work-command-route-coverage`,
`acd-command-namespace`, `acd-command-layer-imports-downward`, `acd-console-log-confined`, and the
three FF-7205 static-closure controls (verifies → tasks 00–05).

**Hand probe, source CLI, temp project, fresh global home** (PLAN's verification step). The fixture
URL was piped into `messaging init discord`, which exited 0 and printed `Stored … at <path>`. Then
`enable discord` exited 0 and wrote exactly `work.notify.channels.discord = { type: "discord" }`.
With a second fixture URL in `AOF_DISCORD_WEBHOOK_URL`, `status --json` answered `stored: true`,
`envOverride.set: true` and `project.enabled: true`. Across all four outputs, grep for both
token segments found 0 hits. `init discord <url-in-argv>` exited 1 with a message that does not
contain the token (verifies → tasks 02–04).

**Live send, no restart.** A `127.0.0.1:0` server answered 204, and its URL was written with
`writeMessagingSecret`. A separate CLI process ran `work status 01 done --gate-override "hand probe
131/08 verify"` over a committed fixture milestone with `discord` enabled and no env var set. The
result was exit 0 and ONE POST, to the stored path, with the body `**01 — accepted**`,
`allowed_mentions: { parse: [] }`. The token was not in the CLI output (verifies → task 05).

### 131/01–06 — the story lanes (`@executable`, `aof:verify 131`, 2026-09-25)

**Procedure.** One isolated run, under a fresh `AOF_GLOBAL_HOME` (`mktemp -d`):
`node scripts/test.mjs --only <the union of every *.test.mjs in 01–06's files:> test/notify/index.mjs`,
which is 48 suites plus the notify index. No whole-tree run was done. That is the milestone gate's
job, and the shared checkout is dirty.

**Result.** First pass: exit 1, 923 ok, 1 not ok. The red was `131/01 task04 — asks is assigned on
a run record only by run-store.mjs, and only in its five homes`, with *commands\list.mjs assigns an
asks key* (F-131-05). It was fixed in the gate, and `run-store-record.test.mjs` was re-run
alone: exit 0, and the case is ok. The per-story case counts in the first pass were 01: 40, 02: 78,
03: 40, 04: 64 and 05: 28. 06's 34 cases carry FF ids rather than a story prefix: FF-13101 5, FF-13102 4,
FF-13103 3, FF-13104 4, FF-13105 4, FF-13106 5, FF-13107 3, FF-13108 3, FF-13109 3. Every case of
the nine controls is green (verifies → 01–06, every `@executable` task; 06 task 00).

**Gates.** `aof work validate 131` → `PASS — 131 is well-formed.` `aof work doctor 131` reports no
`control-unresolved` at either severity and no `verification-missing-red-probe`. Its warnings are
`cache-incomplete`, `control-runner-unchecked`, `rubric-join-unchecked` ×7 and
`depends-edge-unwitnessed` 07 → 08 (07's, open until its re-refine).

**Run records.** Every `runs/` directory under 131 is `node-7297` (9 directories), so no machine
name has landed since F-131-01. The live sidecar read `"nodeId": "<machine-name>"` at that point. F-131-02 was later discharged by the
operator's `--reidentify`.

**05's accept-time diff scenarios — pending, not discharged** (verifies → 05 task 04, the last two
scenarios). 131 is uncommitted, so there is no "story base → last commit" range. On the working
tree: `git diff --numstat -- ui/src/board/DetailPanel.tsx` gives `2	0`, and
`test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs` gives `129	79`, which also carries 01's and
04's re-pins. This matches 05's build-time reading. 05 holds `in-review` until the range exists
(F-131-07).

## Fitness functions

<!-- THE RED-PROBE REGISTER. Every row CITES a declaration in the sibling `ARCHITECTURE.md`
     `## Fitness functions` register and declares nothing of its own. The `red probe` cell records what
     was changed to make the control fail, and the message observed; an untouched placeholder cell is a
     MISSING red probe, never a recorded one. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13101 | `test/arch/loop/acd-loop-ask-single-home.test.mjs` | green (2026-09-25; 5 cases) | **(1)** `export const probeAskPath = (id) => path.join(globalMeshPaths().meshRoot, "loop-asks", id);` appended to `src/commands/list.mjs` → ONE case red, only FF-13101's: *loop-asks appears only in src/loop/ask-request.mjs — spelled by: src/commands/list.mjs, src/loop/ask-request.mjs*. **(2)** Non-vacuity: the control's needle `HOME` misspelled `src/loop/ask-requests.mjs` → THREE cases red, only FF-13101's, the last: *the sweep finds the module and at least three importers: src/loop/ask-requests.mjs was NOT found, 0 importer(s) resolved (none)*. Both reverted from memory, byte-identical. |
| FF-13102 | `test/arch/loop/acd-loop-ask-single-home.test.mjs` | green (2026-09-25; 4 cases) | A `probeTranscriptScan(text)` that splits lines, `JSON.parse`s each and reads `record.message.stop_reason` appended to `src/agent-session-driver.mjs` → ONE case red, only FF-13102's: *no other src/\*\* module both JSON.parses transcript lines and reads stop_reason — found in: src/agent-session-driver.mjs*. Reverted, byte-identical. |
| FF-13103 | `test/arch/loop/acd-loop-ask-single-home.test.mjs` | green (2026-09-25; 3 cases) | The skip `if (openLastAsk(run.asks) != null) continue;` dropped from `staleRunningRuns` in `src/run-store.mjs` → ONE case red, only FF-13103's: *transitionStaleRunsReclaimed over a stale running run whose last ask is unanswered leaves it byte-unchanged*. Reverted, byte-identical. |
| FF-13104 | `test/arch/loop/acd-loop-ask-waits-in-place.test.mjs` | green (2026-09-25; 4 cases) | `admitAnswer`'s session comparison (`\|\| record.sessionId !== answer.sessionId`) dropped in `src/commands/drive.mjs`, so a foreign session is accepted → ONE case red, only FF-13104's: *a foreign session: work:drive-continue refuses drive-answer-not-own before any mint or spawn — it answered no refusal (it ran)*. Reverted, byte-identical. |
| FF-13105 | `test/arch/loop/acd-loop-ask-waits-in-place.test.mjs` | green (2026-09-25; 4 cases) | `if (laneAsk == null) return { halt: { act: haltDecision("session-needs-input", ref, "driver:needs-input") } };` inserted at the head of `wave.mjs`'s `waitInLane` → ONE case red, only FF-13105's: *"session-needs-input" reaches haltDecision only inside ask.mjs's parkedHalt — spelled in src/loop/wave.mjs (in runWaveBuild)*. Reverted, byte-identical. Before the build this leg was red over the delivered tree at `src/loop/cycle.mjs:1079` (the standing-stop verify branch, 131/03's); fixed on 03's authority by routing that halt through `parkedHalt` — same act, same `sessionId` detail. |
| FF-13106 | `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs` | green (2026-09-25; 5 cases — the fifth, the store-path leg, added by 131/08's amendment) | **As amended at 131/08** (the env-read leg admits `readMessagingSecret(`, called by `notify.mjs` alone; a new store-path leg): `import path from "node:path"; export const probeStorePath = () => path.join(process.cwd(), "messaging", "discord.secret");` appended to `src/commands/messaging/messaging.mjs` → ONE case red, only the store-path leg: *the messaging store's path is spelled only in src/notify/secret.mjs — a second home joins it in src/commands/messaging/messaging.mjs*; the other four FF-13106 cases stayed green. Reverted from a copy, byte-identical (`git diff --no-index` empty). The leg also drives the same probe through its shipped detector in-process on every run. **As first registered:** the failure degrade in `src/notify/notify.mjs` changed to `` `… failed to deliver (${detail}) to ${url}` `` → ONE case red, only FF-13106's: *no degrade message contains the URL — a degrade call's message names it: src/notify/notify.mjs: degrade("notify-delivery-failed", …(${detail}) to ${url}`, url)*. The fixture leg stays green under this probe — `degrade()`'s redaction pass strips the URL — which is why the control carries the structural degrade-message leg: it is the leg the register's probe reds. Reverted, byte-identical. |
| FF-13107 | `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs` | green (2026-09-25; 3 cases) | **(1)** `export async function probeNotify(workspace, envelope) { await notify(workspace, envelope); }` appended to `src/loop/wave.mjs` → ONE case red, only FF-13107's: *every notify( call under src/ is one of the six sites in ADR-005 §4 — not one: src/loop/wave.mjs ?*. **(2)** Non-vacuity: the control's needle misspelled `notfy` → TWO cases red, only FF-13107's: *the sweep finds six sites — it found 0 (none)*. Both reverted, byte-identical. |
| FF-13108 | `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs` | green (2026-09-25; 3 cases) | `export function formatElapsed(ms: number): string { … }` appended to `ui/src/board/api.ts` → ONE case red, only FF-13108's: *formatElapsed is defined in no module but src/notify/form.mjs — defined in src/notify/form.mjs, ui/src/board/api.ts*. Reverted, byte-identical. |
| FF-13109 | `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs` | green (2026-09-25; 3 cases) | The resync door's `const body = await readJsonBody(request);` moved above its `admitWriteRequest(` in `src/board-ui.mjs` → ONE case red, only FF-13109's: *every POST branch calls admitWriteRequest( before readJsonBody( — /api/work/resync reads its body first*. Reverted, byte-identical. |

Each probe ran in a fresh process over all three files under its own isolated `AOF_GLOBAL_HOME`, and
its subject was restored from memory, never by `git checkout` (the subjects carry uncommitted
01–05 work); a post-run sha1 check confirmed every subject byte-identical. Standing controls outside
the three files were not run under the probes (task 01 ruling 4 makes that optional).

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-131-01 | 08's two run records were written at `runs/<machine-name>/` with `"node": "<machine-name>"`, a machine name. | defect | medium | Moved to `runs/node-7297/` with the `node` key rewritten in this gate, before any commit, as F-133-05 did (both files untracked). | story 08 | closed |
| F-131-02 | The live `~/.aof/mesh/identity.json` was rewritten at 2026-09-25 09:57 to `nodeId: "<machine-name>"`, `derivedFrom: "<hostname>"`, with the pin dropped. The 132 backup holds a pinned id. Current `src/node-identity.mjs` derives only `node-<hash>`, so a stale build wrote it. Every run on this machine now records a machine name, including 07's live run. | defect | high | Non-blocker for 08: not 08's code, and a global file, so it was not touched here. The operator re-pins the sidecar with `aof mesh identity`. Must be discharged before 07's procedure runs. Discharged 2026-09-25 13:08: the operator ran `aof mesh identity --reidentify` (`Re-identified <machine-name> → node-7297`), and the sidecar reads `"nodeId": "node-7297"` at the source. | operator | closed |
| F-131-03 | FF-11903 is red: 57 unresolved `src/` citations against a ceiling of 55. None is 08's. The citations come from other stories' uncommitted evidence (07's fixture, FF-13101's non-vacuity probe). | defect | medium | Inherited, non-blocker for 08. Repair at the milestone gate. | m131 | open |
| F-131-04 | `messaging status` over a malformed `.aof/aof.config.json` exits 1 (`Invalid JSON in <path>`), while task 04 ruling 4 says it "exits 0 whatever it finds". | test-gap | low | PO ruling: upheld as built. A malformed config is not one of status's three facts. The error names the file and leaks nothing. | story 08 | closed |
| F-131-05 | 01's own sweep (`run-store-record.test.mjs`, "asks is assigned … only in its five homes") was red over the delivered tree. It matched `{ asks: await readWorkspaceAsks(ctx), … }` in `src/commands/list.mjs`, which is the options argument of 05's contracted `applyAskOverlay(rows, { asks, workspaceId })`, not a run record. 05's close ran "every suite that reads a changed file", and missed this one because a `src/`-wide text sweep reads every file without importing any. | defect | medium | Fixed in the gate. The sweep exempts that one call by its exact spelling, so any other `asks:` in `list.mjs` still reds. Re-run green. | story 01 | closed |
| F-131-06 | `createAskPoll` (01 task 02) ships with no consumer. 03 ruled the owner's wait a ref'd `setTimeout` over `readAsk`. Its unref'd interval is 129's silent-death shape if anything ever adopts it. The removal was made and then reverted, because amending 01 task 02's three poll scenarios and rulings (8) and QA (3) was not permitted in this session. Code and contract agree as shipped. | debt | low | Non-blocker. The operator rules: drop it (amend 01 task 02, then remove the export and its test case) or keep it. | operator | open |
| F-131-07 | 05 task 04's last two scenarios read `git diff` "from the story's base to its last commit". None of 131 is committed, so no range exists. The working-tree reading matches the build's (`2 0`; `129 79` shared with 01/04). | gap | medium | Blocks 05's accept only. 05 holds `in-review` until 131 is committed on a branch. The diffs are then read and recorded, and 05 is accepted. | operator (commit) | open |
| F-131-08 | The loopback-`Host` check (04, ADR-006 §3) closes DNS rebinding for WRITES only. A rebinding page can still READ the board's GET routes (`/api/work/doc` and the others). Recorded by 04's review. | security | low | Non-blocker. Outside this milestone's rulings, deferred to backlog as input for a board threat model. | backlog | open |
