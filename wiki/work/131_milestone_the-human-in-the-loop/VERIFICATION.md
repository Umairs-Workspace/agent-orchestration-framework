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

**At the accept, over the committed range** (`aof:verify 131`, 2026-09-25; verifies → the two diff
scenarios). 131 was committed per range. `48ac161` holds 01–04 and 08. `8f00b4a` is 05 alone, so its
base is `48ac161`. `eb26477` holds 06 and the records.

```
$ git diff --numstat 48ac161..8f00b4a -- ui/src/board/DetailPanel.tsx
2	0	ui/src/board/DetailPanel.tsx
$ git diff --numstat 48ac161..8f00b4a -- test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
114	76	test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs
```

The panel's diff is the two added lines. In the pin file, no line naming `src/run-store.mjs` or
`src/board-ui.mjs` changes in the range, so both pins stay as 01 and 04 left them. The non-comment
changes are the `ui/` digest literal (`93286a26…` → `c470fea8…`), the lift of the digest loop into
`uiTreePairs`/`assertUiFrozen`, and the one-character case. The lift and the case are 05 task 03's
own contract (its ruling 6). PO reading: the scenario's "only the `ui/` digest literal and its
comment" holds for every line that is not task 03's contracted lift. 05's lane was re-run on the
committed state under a fresh `AOF_GLOBAL_HOME`, with `AskCard.tsx` now tracked rather than
intent-to-add: 6 suites, 87 ok, 0 not ok, exit 0.

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

### 131/09 — the bot posts (build-time evidence, `aof:continue 131/09-12 --solo`, 2026-09-25)

**Story lane.** Under a fresh `AOF_GLOBAL_HOME`, `node scripts/test.mjs --only` over
`test/notify/notify-{discord,channels,messaging}.test.mjs` gave exit 0, 63 ok, 0 not ok. Each 09
scenario has its own named `131/09 taskNN` case (16 of them). `acd-loop-ask-reaches-every-face` gave
exit 0, 17 ok: FF-13106's five cases as amended, FF-13110's three new cases, and FF-13107–FF-13109.
Five suites outside 09's declared `files:` also built webhook-era notify fixtures (`urlEnv` plus a
webhook URL): `acd-loop-ask-waits-in-place`, `loop-command-reconcile`, `loop-command-stops`,
`loop-command-wave` and `run-session-limit-resume`. Their fixtures were moved to a synthetic bot token
with `channelId` and `tokenEnv`, and their run gave exit 0, 170 ok, 0 not ok (verifies → tasks 00–03, 05).

**Task 04, the guide walk (`@manual`, agent-run).** The source CLI (`node bin/aof.mjs`) ran under a
temp global home and a temp project, with the synthetic fixture token.
- `init discord`, token piped: exit 0 and three lines — `Stored the Discord bot token … at
  <home>/messaging/discord.secret.`, `Invite the bot to your server:
  https://discord.com/oauth2/authorize?client_id=<id>&scope=bot+applications.commands&permissions=2147552320`
  and `Switch it on per project with \`aof messaging enable discord --channel <id>\`.`
- `enable discord` without `--channel`: refused, and the message names the command with
  `--channel <id>`.
- `enable discord --channel <id>`: `Enabled discord on channel <id> for this project in
  <project>/.aof/aof.config.json.`, which wrote exactly `{ "type": "discord", "channelId": "<id>" }`.
- `status`: `this machine: set (…)`, `env override AOF_DISCORD_BOT_TOKEN: not set`, `this project:
  enabled (discord → <id>)`.
- A webhook URL piped into `init`: refused, naming the bot token and the guide.

Every quoted output in the guide matches these, with `<aof home>`, `<project>`, `<application-id>`
and `<channel-id>` standing in for the values. The guide's test-send commands (PowerShell and curl)
were NOT run: they post to the live Discord API and need a real bot and channel, which 07's live run
supplies. The guide was also grepped. `api/webhooks`, a three-segment token shape
(`[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{20,}`) and 17-to-20-digit numbers each gave 0
hits, and the only 10+ digit number is the permission total `2147552320` (verifies → task 04).

### 131/10 — answer by replying in Discord (build-time evidence, `aof:continue 131/09-12 --solo`, 2026-09-25)

**Story lane.** Under a fresh `AOF_GLOBAL_HOME`, `node scripts/test.mjs --only test/notify/index.mjs
test/discord/index.mjs` gave exit 0, 99 ok, 0 not ok. Of those, 19 are the discord suites (tasks 00,
01 and 03) and 9 are 10's notify cases (tasks 02 and 04). `acd-loop-ask-answered-from-discord`,
`acd-loop-ask-reaches-every-face` and `acd-source-directory-budget` gave exit 0, 28 ok: FF-13111 and
FF-13112 green, FF-13106 as amended, and the `test/arch/loop` row at 66. The bot suite's end-to-end
case is PLAN's verification probe run as a test. A fake gateway delivers a `MESSAGE_CREATE`
replying to an indexed ask from an allowlisted user. The ask file then reads `answered` with
`by.via: "discord"`, one ✅ reaction goes out through `discordRequest`, and there is one IDENTIFY
(verifies → tasks 00–05).

**Task 06, the guide's reply section (`@manual`, agent-run).** The section's one config example
(`channelId` and `allow` as documented placeholders) was wrapped in a config document and validated
against `schemas/aof.schema.json`: valid, no errors. Each of the six refusal lines it quotes was
compared with `src/discord/replies.mjs`'s built text, with the guide's placeholders (`<ref>`,
`@<name> <how long ago>`) mapped to the source's template holes: all six match, character for
character. The guide was grepped. `api/webhooks` and a three-segment token shape each gave 0 hits.
The only 17-to-20-digit numbers are the two documented placeholders, `111111111111111111` and
`222222222222222222`, and the only other long number is the permission total (verifies → task 06).

### 131/11 — slash commands (build-time evidence, `aof:continue 131/09-12 --solo`, 2026-09-25)

**Story lane.** Every run below used a fresh `AOF_GLOBAL_HOME`.
- `test/discord/index.mjs` gave exit 0, 32 ok. 13 of those are the new `discord-commands` cases
  (tasks 00–04).
- `work-loop-declarations` gave exit 0, 20 ok. That includes the decider's five rows, the CLI
  hand-off with the five-key request listed with `--resume`, the three refusals and the three
  exclusive flags.
- `loop-command-resume` gave exit 0, 19 ok, including the relaunch that clears the resume request
  and the stop mark.
- The controls — 10's arch file with FF-13113, `acd-loop-stop-request-single-home`,
  `acd-loop-ask-reaches-every-face`, `acd-no-new-silent-catch` and `acd-purity-is-external` — gave
  exit 0, 43 ok.
- `/loop stop` and `/loop resume` ran the REAL `work:loop` over a real supervised declaration.
  The stop request read level 1, then level 2, and `honoured` for a loop that was not live. The
  resume request held its five keys. The injected spawn seam was never reached (verifies →
  tasks 00–05).

**Task 06, the guide's commands section (`@manual`, agent-run).** Each reply and refusal the section
quotes was compared with `src/discord/commands.mjs` and `src/loop/stop.mjs`, with the placeholders
(`<name>`, `<scope>`) mapped to the source's holes. The comparison covered the three `/loop stop`
sentences, the `/loop resume` line, *This channel is not an aof project channel*, the
`(discord-command-not-allowed)` and `(discord-scope-ambiguous)` endings, and the
`loop-hand-off-not-supervised` refusal naming `aof work loop <scope> --resume`. All of them match.
The guide still carries no id other than the two documented placeholders, and no token shape
(verifies → task 06).

### 131/12 — a worker's ask reaches Discord (build-time evidence, `aof:continue 131/09-12 --solo`, 2026-09-25)

**Story lane.** Every run below used a fresh `AOF_GLOBAL_HOME`.
- `blocked-run-parking` gave exit 0, 42 ok. A REAL worker park — `createMeshWorkerExecutionHandler`
  with the session's transcript under an isolated projects directory — shipped
  `ask: { question: <the four lines>, phase: "build", askedAt: <the park instant> }` on its
  `assignment.reported` step. It also covered the three key-set rows, the reader's three rows
  (whole, clipped at 8,000 code points with `…`, and `null` with one `ask-question-unreadable`),
  the journal-unavailable fallback carrying no `ask`, and `worker-execution.mjs` at 1,914 lines.
- `mesh-effects-outbox` gave exit 0, 18 ok, with nine new cases, each applying a park fact IN
  PLACE through the real `settle-assignment` reactor:
  - the row's `ask` column and `execution.ask`;
  - the overlay's three rows, and a park with no `ask` leaving the column;
  - unparseable JSON projecting `null` after one `assignment-ask-unreadable`;
  - a version-9 store gaining the column with its three rows intact, twice;
  - exactly one POST whose line 1 is `**35/00 — waiting on you** (build, 12m) · node-2976`;
  - the four edge rows (1, 1, 0, 0);
  - no checkout → no POST and one `worker-ask-unannounced`;
  - the local node kept;
  - the board's two rows through the real `work:list`.
- `discord-replies` gave exit 0, 7 ok. A Discord reply to the worker's posted question reached
  `mesh:terminal-resume` once, with `answer.by.via: "discord"`, made one `session-answered` POST
  carrying the worker's phase, and put one ✅ reaction.
- `run-session-limit-resume` gave exit 0, 48 ok. A refused resume posts nothing, and `resume.mjs`
  holds one `notify(` call. 04's "no notification on the mesh leg" row now expects the one post
  ADR-010 §5 adds.
- The store's version pins (`global-work-store`, `mesh-assignment-record`) moved from 9 to 10 with
  the reason "131/ADR-010: the ask column".
- `acd-loop-ask-reaches-every-face` gave exit 0, 19 ok, with FF-13107 at seven sites and FF-13114
  landed (verifies → tasks 00–04).

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

**05's accept-time diff scenarios — first read on the working tree** (verifies → 05 task 04, the last two
scenarios). At this point 131 was uncommitted, so there was no "story base → last commit" range. On the working
tree: `git diff --numstat -- ui/src/board/DetailPanel.tsx` gave `2	0`, and
`test/arch/loop/acd-loop-state-rides-the-run-record.test.mjs` gave `129	79`, which also carries 01's and
04's re-pins. Both were read again over the committed range (§131/05, "At the accept").

### 131/09–12 — the story lanes at the accept (`@executable`, `aof:verify 131`, 2026-09-25)

**Procedure.** One isolated run under a fresh `AOF_GLOBAL_HOME` (`mktemp -d`):
`node scripts/test.mjs --only` over 41 entries. They were `test/notify/index.mjs`,
`test/discord/index.mjs`, `test/arch/loop/index.mjs` and every other `*.test.mjs` in 09–12's
`files:`. They also included the three pins 11 and 12 moved outside those lists
(`acd-park-published-once-after-exit`, `acd-loop-level-l3-gated`, `loop-command-probe`), 11's two
controls (`acd-no-new-silent-catch`, `acd-purity-is-external`) and the launcher suites that call
`startLauncher`. `global-work-propagation` was excluded because it binds the live `:4182`. No
whole-tree run was done, because that is the milestone gate's job.

**Result.** Exit 1, with 1,007 ok and 1 not ok. The red was 03's `131/03 task02 — an unanswered lane
parks unmerged and committed, …`, with `'lane-open-failed' !== 'session-needs-input'`: a lane
fixture's worktree failed to open under the run's load. `loop-command-wave.test.mjs` was re-run alone
under a fresh home, gave exit 0 and 47 ok, and the case was ok. This is contention in a spawn-heavy
suite, not a regression, so no finding is logged. FF-13106 (as amended at 09 and 10), FF-13107 (seven
sites) and FF-13110–FF-13114 are green inside that run (verifies → 09 tasks 00–03 and 05, 10 tasks
00–05, 11 tasks 00–05, 12 tasks 00–04). The `@manual` guide walks (09/04, 10/06, 11/06) stand as
recorded above, and this accept re-ran none of them.

**Gates.** `aof work validate 131` → `PASS — 131 is well-formed.` `aof work doctor 131` reported no
`control-unresolved` at either severity, no `verification-missing-red-probe` and no
`register-duplicate-id`. Its warnings are `story-record-missing` for 02 (clean, as stated at its
accept), `control-runner-unchecked`, `rubric-join-unchecked` ×11, and `depends-edge-unwitnessed`
07 → 11 and 07 → 12 (07's, open until its re-refine).

### 131/13 — test and allow from the CLI (`@executable` + `@manual`, `aof:verify 131`, 2026-09-26)

**Story lane.** Two isolated runs, each under a fresh `AOF_GLOBAL_HOME`.
- `test/notify/index.mjs`, `test/discord/index.mjs`, `loop-command-stops`, `mesh-effects-outbox`,
  `acd-loop-ask-reaches-every-face`, `acd-loop-ask-answered-from-discord`,
  `run-session-limit-resume` and `acd-source-directory-budget`: exit 0, 270 ok. Of those, 8 cases
  are 13's (`131/13 task00` ×2, `131/13 task01` ×6), and 08's registration cases now read the verb
  list and count five.
- The command-registry controls (`acd-work-command-cli-bijection`, `acd-command-route-derived`,
  `acd-work-command-route-coverage`, `acd-command-namespace`, `acd-command-layer-imports-downward`,
  `acd-console-log-confined`, `acd-no-new-silent-catch`, `acd-purity-is-external`,
  `command-core-contract` and the FF-7205 closures), plus the suites that post through `notify`
  (`loop-command-wave`, `-reconcile`, `-resume`, `acd-loop-ask-waits-in-place`,
  `blocked-run-parking`, `work-loop-declarations`): exit 0, 254 ok.

FF-13106 (the token is read only in `notify.mjs`), FF-13107 (seven `notify(` sites) and FF-13110
(`Bot ` only in `discord.mjs`) are green over the new send, which is not a `notify(` call and
reaches the wire only through `discordRequest`. FF-13108 caught the first draft's test message
spelling "waiting on you" outside `form.mjs`, and the body now reads "Nothing needs an answer."
(verifies → 13 tasks 00 and 01, every `@executable` scenario).

**Hand probe, source CLI, temp project, fresh home** (verifies → 13/00, 13/01). `enable discord
--channel <id> --allow <A>,<B>` exited 0 and printed `Added 2 user ids to the answer list of
"discord" (2 may answer by reply).`. Re-running with `<A>` printed `Everyone named by --allow
already answers …`. `--allow 12` was refused `messaging-allow-invalid`, and the file was unchanged.
`status` printed `discord → <id>, 2 may answer by reply`. `test discord` with no token exited 1,
naming `aof messaging init discord`. `--help` lists `aof messaging test <type>` after `status`.
The operator then ran `aof messaging test discord` in this repository against the live bot, and the
message arrived ("aof test works", 2026-09-26). That prompted ruling (7), the project on line 1.

**The guide walk (`@manual`, agent-run; verifies → 13/01's last scenario).** Step 3 of
`wiki/architecture/discord-notifications.md` now shows `--allow` with the two output lines the
probe printed, character for character, and the `messaging-allow-invalid` refusal. Step 4 shows
`aof messaging test discord`, its `Posted the Discord test message to discord → <channel-id>
(message <message-id>).` line, which matches the verb's render, and the 401/403/404 table, which
matches `testHint`. The allowlist section no longer says there is no verb, and the message-format
section shows ` · <project>` before the node. The manual PowerShell and curl send commands are gone,
replaced by the verb.

### 131/14 — one channel, several projects (`@executable`, `aof:verify 131`, 2026-09-26)

**Story lane.** Under a fresh `AOF_GLOBAL_HOME`, `node scripts/test.mjs --only` over `test/discord/index.mjs`, `acd-loop-ask-answered-from-discord`, `acd-loop-stop-request-single-home`, `work-loop-declarations` and `loop-command-stops` gave exit 0 and 119 ok (verifies → 14/00, every scenario). The case `131/14 task00` runs stop and resume against the project with the loop, none, and one project. 11/01's ambiguity case now injects `hasLoopOn` for a real tie. FF-13113 is green with the deferred `stop.mjs` import.

**Live fold** (verifies → 14/00 ruling 7): `resolveNodeWorkspaces("node-7297")` gave workspace `52294b307214c27d` as `…\aof-test-repo\.aof\mesh\dispatch-worktrees\dispatch-04-00`, and `foldDispatchWorktree` folded it to `C:\Source\umami\aof-test-repo`. The other five members are unchanged.

### 131/07 — the live run (`@manual`, operator and agent at the source, 2026-09-26)

**Procedure.** 07 was re-refined for the bot (`98f84b9`), and task 00 was redone (payload
`761961f+dirty.20260925T220438`, then `d965255`, `457420d` and `6fca0bb` as fixes landed). The
operator stored the bot token, invited the bot, enabled the test-bed on the channel with `--allow`
(131/13), checked it with `aof messaging test discord`, and restarted the desktop app. They then ran
`aof work loop 03`, `--resume` twice, `aof work loop 05`, and `aof work loop 04 --supervised`, and
answered in Discord, on the board, and (by the agent at the operator's request) from the CLI.
Every observation was read at its source (the ask files, the run records, the transcripts, the diag
logs and the daemon logs) and pasted into STATE `## 131/07`, **Run log so far**. The procedure's
`______` slots were not filled one by one: the run log carries each observation with its source and
instant, and names the leg it discharges.

**Result, leg by leg** (verifies → 07/01, each scenario named):
- **PRECONDITION:** both `daemon-started` lines name the build, and `mesh-serve.log` holds no
  `discord-*` degrade since. `messaging status` reads `set`, `not set`, and `enabled (discord → <id>, 1
  may answer by reply)` (agent read, 2026-09-26). `/` listed the bot's commands, since `/status` and
  `/asks` answered.
- **Leg 1:** three asks reached T1 and the bot within the minute, with line 1 `**03/0X — waiting on
  you** (build, 1m) · aof-test-repo · node-7297` and the reply-able action line (operator screenshot).
  The ask files and records read `waiting`, `phase build`, and `question` the session's last message.
  **Not measured:** the bot message ids, so the "within 10 s by id" instant was not derived. The
  screenshots show the minute, not an instant.
- **Leg 2:** `Lane 03/02 — drive … settle: done … merge: merged` (13:55:46–49Z) while 03/00 and
  03/03 stood unanswered, with no `halted on` line. `/asks` listed both with jump links. `/status`
  listed them after F-131-11's fix. The heartbeat advanced 13:55:32Z → 14:00:33Z between reads five
  minutes apart. T1 repeated 03/03's row after 15 minutes (15:31:22Z, then 15:46:22Z).
- **Leg 3 (CLI):** on milestone 03's verify ask, the envelope read `ok, runId, delivery waiting, state
  answered, by { you, cli, node-7297 }`, and T1 printed `03 — answered by you` 0.5 s later.
- **Leg 4 (board):** on 05/00's second ask, the ask file read `answered`, `by.via board`, and the same
  session. The card showed DESIGN §1's answered state (operator screenshot).
- **Leg 5 (Discord reply):** on 03/01 (twice), 03/00 (a parked ask), 03/03 (twice) and 05/00 and
  05/01. Each got ✅, the bot's `answered by @umami_b` message, the answer verbatim on the record, and
  the same session re-driven.
- **A parked session resumed with its answer, the same session:** 03/00, at 15:17Z.
- **Leg 6:** `Accepted milestone 03.` / `03 — loop done.` / `exit code=0` (17:51:11Z), and
  `SPEC.md status: done`. The merged records carry every ask, and `loop-asks/` holds none of them.
  **Not measured:** the bot's `**03 — accepted**` message was not screenshotted.
- **Leg 7:** `/loop resume scope:04` and `/loop stop scope:04`, with no `workspace:` (131/14). The
  supervisor relaunched `--resume` on the new payload, and the stop request read `level 1 requested`
  by the bot's daemon.

**The legs ran on different refs than the contract names.** The operator answered 03/01 by Discord,
not the board, and 03's asks were all answered in Discord. The CLI leg landed on 03's verify ask, and
the board leg needed fixture 05 (`a840e78`). Each path's observations are the ones the contract
names, taken on another story.

**What the live run found**, each in `## Findings`: F-131-11 (fixed, `/status`), F-131-12 (lane
append conflicts, workaround plus backlog), F-131-13 and F-131-15 (the form of the ask),
F-131-14 (two elapsed clocks), F-131-17 (fixed, the resumed-redraw kill), F-131-18 (lane shadowing,
fixed for the bot in 14), and F-131-19 (the supervisor relaunch that cleared a stop). It also led to
two new stories: 13 (test and allow from the CLI) and 14 (one channel, several projects).

## Fitness functions

<!-- THE RED-PROBE REGISTER. Every row CITES a declaration in the sibling `ARCHITECTURE.md`
     `## Fitness functions` register and declares nothing of its own. The `red probe` cell records what
     was changed to make the control fail, and the message observed; an untouched placeholder cell is a
     MISSING red probe, never a recorded one. -->

| id | enforced by | result | red probe |
|---|---|---|---|
| FF-13101 | `test/arch/loop/acd-loop-ask-single-home.test.mjs` | green (2026-09-25; 5 cases) | **(1)** `export const probeAskPath = (id) => path.join(globalMeshPaths().meshRoot, "loop-asks", id);` appended to `src/commands/list.mjs` → ONE case red, only FF-13101's: *loop-asks appears only in src/loop/ask-request.mjs — spelled by: src/commands/list.mjs, src/loop/ask-request.mjs*. **(2)** Non-vacuity: the control's needle `HOME` misspelled `src/loop/ask-request**s**.mjs` → THREE cases red, only FF-13101's, the last: *the sweep finds the module and at least three importers: src/loop/ask-request**s**.mjs was NOT found, 0 importer(s) resolved (none)*. Both reverted from memory, byte-identical. |
| FF-13102 | `test/arch/loop/acd-loop-ask-single-home.test.mjs` | green (2026-09-25; 4 cases) | A `probeTranscriptScan(text)` that splits lines, `JSON.parse`s each and reads `record.message.stop_reason` appended to `src/agent-session-driver.mjs` → ONE case red, only FF-13102's: *no other src/\*\* module both JSON.parses transcript lines and reads stop_reason — found in: src/agent-session-driver.mjs*. Reverted, byte-identical. |
| FF-13103 | `test/arch/loop/acd-loop-ask-single-home.test.mjs` | green (2026-09-25; 3 cases) | The skip `if (openLastAsk(run.asks) != null) continue;` dropped from `staleRunningRuns` in `src/run-store.mjs` → ONE case red, only FF-13103's: *transitionStaleRunsReclaimed over a stale running run whose last ask is unanswered leaves it byte-unchanged*. Reverted, byte-identical. |
| FF-13104 | `test/arch/loop/acd-loop-ask-waits-in-place.test.mjs` | green (2026-09-25; 4 cases) | `admitAnswer`'s session comparison (`\|\| record.sessionId !== answer.sessionId`) dropped in `src/commands/drive.mjs`, so a foreign session is accepted → ONE case red, only FF-13104's: *a foreign session: work:drive-continue refuses drive-answer-not-own before any mint or spawn — it answered no refusal (it ran)*. Reverted, byte-identical. |
| FF-13105 | `test/arch/loop/acd-loop-ask-waits-in-place.test.mjs` | green (2026-09-25; 4 cases) | `if (laneAsk == null) return { halt: { act: haltDecision("session-needs-input", ref, "driver:needs-input") } };` inserted at the head of `wave.mjs`'s `waitInLane` → ONE case red, only FF-13105's: *"session-needs-input" reaches haltDecision only inside ask.mjs's parkedHalt — spelled in src/loop/wave.mjs (in runWaveBuild)*. Reverted, byte-identical. Before the build this leg was red over the delivered tree at `src/loop/cycle.mjs:1079` (the standing-stop verify branch, 131/03's); fixed on 03's authority by routing that halt through `parkedHalt` — same act, same `sessionId` detail. |
| FF-13106 | `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs` | green (2026-09-25; 5 cases, re-observed at 131/09's amendment) | **As amended at 131/09** (ADR-007: a channel has `channelId` and `tokenEnv`, and no `url`, `webhook`, `token` or `urlEnv`; the token is read only as `env[<tokenEnv>]` or through `readMessagingSecret`; no degrade message holds it). **(a)** `"urlEnv": { "type": "string" },` inserted before the discord channel's `tokenEnv` in `schemas/aof.schema.json` → ONE case red, the schema leg: *a channel has channelId and tokenEnv and no url, webhook, token or urlEnv property at any level — found urlEnv: the bot token is the credential (ADR-007 §3)*. **(b)** The failure degrade in `src/notify/notify.mjs` changed to `` `… failed to deliver (${detail}) with ${token}` `` → ONE case red, the read leg: *no degrade message contains the token — a degrade call's message names it: src/notify/notify.mjs: degrade("notify-delivery-failed", `notify channel "${channel.name}" failed to deliver (${detail}) with ${token}`, token)*. Each probe ran in a fresh process under its own isolated `AOF_GLOBAL_HOME`, and its subject was restored from memory (`git diff --stat` unchanged afterwards). **As amended at 131/08** (the env-read leg admits `readMessagingSecret(`, called by `notify.mjs` alone; a new store-path leg): `import path from "node:path"; export const probeStorePath = () => path.join(process.cwd(), "messaging", "discord.secret");` appended to `src/commands/messaging/messaging.mjs` → ONE case red, only the store-path leg: *the messaging store's path is spelled only in src/notify/secret.mjs — a second home joins it in src/commands/messaging/messaging.mjs*; the other four FF-13106 cases stayed green. Reverted from a copy, byte-identical (`git diff --no-index` empty). The leg also drives the same probe through its shipped detector in-process on every run. **As first registered:** the failure degrade in `src/notify/notify.mjs` changed to `` `… failed to deliver (${detail}) to ${url}` `` → ONE case red, only FF-13106's: *no degrade message contains the URL — a degrade call's message names it: src/notify/notify.mjs: degrade("notify-delivery-failed", …(${detail}) to ${url}`, url)*. The fixture leg stays green under this probe — `degrade()`'s redaction pass strips the URL — which is why the control carries the structural degrade-message leg: it is the leg the register's probe reds. Reverted, byte-identical. |
| FF-13107 | `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs` | green (2026-09-25; 3 cases, re-observed at 131/12's amendment to seven sites) | **As amended at 131/12:** a second `notify(ctx.workspace, buildNotifyEnvelope("session-answered", …), {})` call was added to `answerThroughWorker` in `src/commands/resume.mjs` → the structural case red: *every notify( call under src/ is one of the seven sites (ADR-005 §4, ADR-010 §4) — not one: src/commands/resume.mjs ?*. Restored from memory. **As first registered:** **(1)** `export async function probeNotify(workspace, envelope) { await notify(workspace, envelope); }` appended to `src/loop/wave.mjs` → ONE case red, only FF-13107's: *every notify( call under src/ is one of the six sites in ADR-005 §4 — not one: src/loop/wave.mjs ?*. **(2)** Non-vacuity: the control's needle misspelled `notfy` → TWO cases red, only FF-13107's: *the sweep finds six sites — it found 0 (none)*. Both reverted, byte-identical. |
| FF-13108 | `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs` | green (2026-09-25; 3 cases) | `export function formatElapsed(ms: number): string { … }` appended to `ui/src/board/api.ts` → ONE case red, only FF-13108's: *formatElapsed is defined in no module but src/notify/form.mjs — defined in src/notify/form.mjs, ui/src/board/api.ts*. Reverted, byte-identical. |
| FF-13109 | `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs` | green (2026-09-25; 3 cases) | The resync door's `const body = await readJsonBody(request);` moved above its `admitWriteRequest(` in `src/board-ui.mjs` → ONE case red, only FF-13109's: *every POST branch calls admitWriteRequest( before readJsonBody( — /api/work/resync reads its body first*. Reverted, byte-identical. |
| FF-13110 | `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs` | green (2026-09-25, 131/09; 3 cases) | `` export const probeHeaders = (token) => ({ authorization: `Bot ${token}` }); `` appended to `src/notify/notify.mjs` → ONE case red, only FF-13110's structural leg: *a string opening "Bot " (the Authorization value) is spelled only in src/notify/discord.mjs — found in src/notify/discord.mjs, src/notify/notify.mjs*. The leg also drives the same probe through its shipped detector in-process on every run. Restored from a copy, and the `git diff --stat` was unchanged. |
| FF-13111 | `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` | green (2026-09-25, 131/10; 3 cases) | **(1)** In `src/discord/gateway.mjs`, `const resuming = sessionId != null && resumeUrl != null;` was changed to `const resuming = false;` (IDENTIFY on every reconnect) → ONE case red, the resume fixture: *a drop after READY resumes: no second IDENTIFY — found 2 IDENTIFY frames*. **(2)** `import { WebSocket } from "ws";` and `export const probeSocket = () => new WebSocket("wss://gateway.example.test");` were added to `src/discord/replies.mjs` → ONE case red, the structural leg: *the gateway socket is built only in src/discord/gateway.mjs — built in src/discord/gateway.mjs, src/discord/replies.mjs*. The leg also drives probe (2) through its shipped detector in-process on every run. Each probe ran in a fresh process under its own isolated `AOF_GLOBAL_HOME`, and its subject was restored from memory. |
| FF-13112 | `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` | green (2026-09-25, 131/10; 2 cases) | **(1)** `if (!allow.includes(message.author?.id)) {` was changed to `if (false) {` in `src/discord/replies.mjs` (the allowlist check skipped) → ONE case red, the fixture: *the non-allowlisted user 333333333333333333 left the ask waiting*. **(2)** `answerAsk` was added to `replies.mjs`'s import from `../loop/ask-request.mjs`, and re-exported → ONE case red, the structural leg: *src/discord/\*\* imports no write export of src/loop/ask-request.mjs and nothing from src/run-store.mjs — found src/discord/replies.mjs: answerAsk from src/loop/ask-request.mjs*. The leg also drives probe (2) through its shipped detector in-process on every run. Each subject was restored from memory. |
| FF-13113 | `test/arch/loop/acd-loop-ask-answered-from-discord.test.mjs` | green (2026-09-25, 131/11; 2 cases) | **(1)** `await answerCommand(interaction, command, context);` was inserted ahead of the deferral in `handleInteraction` (`src/discord/commands.mjs`), so it dispatches before the `type: 5` callback → ONE case red, the fixture: */status dispatched before its type 5 callback — the deferral must be the first thing sent (ADR-009 §4): invoke work:list → POST …/callback → …*. **(2)** `import { spawn } from "node:child_process";` was prepended to `commands.mjs` → ONE case red, the structural leg: *src/discord/\*\* imports no node:child_process — found in src/discord/commands.mjs*. **(3)** `context.invoke("work:drive", …)` was appended to `commands.mjs` → the structural leg red: *every invoke( in src/discord/commands.mjs names work:list or work:loop — it also names work:drive*. **(4)** `path.join(meshRoot, "loop-resumes")` was appended to `src/mesh/declarations.mjs` → the structural leg red: *the literal "loop-resumes" is spelled only in src/loop/stop-request.mjs — spelled in src/loop/stop-request.mjs, src/mesh/declarations.mjs*. Probes (2) and (3) are also driven through the shipped detectors in-process on every run. Each subject was restored from memory. |
| FF-13114 | `test/arch/loop/acd-loop-ask-reaches-every-face.test.mjs` | green (2026-09-25, 131/12; 2 cases) | **(1)** The edge check was dropped in `settleAssignment` (`src/effects/table.mjs`), with `if (park && !wasWaiting && before != null)` changed to `if (park && before != null)` → BOTH cases red. The structural case: *…and only behind the edge: the row was not already waiting (ADR-010 §4)*. The fixture: *the redelivered park posts nothing — found the second POST: ["**35/00 — waiting on you** (build, 12m) · node-2976"]*. **(2)** `reportAssignmentSettled` was changed to put `ask: <the park test> ? ask : null` on every payload (probed before the carriage was folded onto its payload line to hold `transitionAssignmentState` at the `:272` a shipped loop record cites; the assertion it reds is unchanged) → the fixture red: *the done payload's key set is unchanged — no ask on a report that is not the park*. Each subject was restored from memory. |

Each probe ran in a fresh process over all three files under its own isolated `AOF_GLOBAL_HOME`, and
its subject was restored from memory, never by `git checkout` (the subjects carry uncommitted
01–05 work); a post-run sha1 check confirmed every subject byte-identical. Standing controls outside
the three files were not run under the probes (task 01 ruling 4 makes that optional).

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-131-01 | 08's two run records were written at `runs/<machine-name>/` with `"node": "<machine-name>"`, a machine name. | defect | medium | Moved to `runs/node-7297/` with the `node` key rewritten in this gate, before any commit, as F-133-05 did (both files untracked). | story 08 | closed |
| F-131-02 | The live `~/.aof/mesh/identity.json` was rewritten at 2026-09-25 09:57 to `nodeId: "<machine-name>"`, `derivedFrom: "<hostname>"`, with the pin dropped. The 132 backup holds a pinned id. Current `src/node-identity.mjs` derives only `node-<hash>`, so a stale build wrote it. Every run on this machine now records a machine name, including 07's live run. | defect | high | Non-blocker for 08: not 08's code, and a global file, so it was not touched here. The operator re-pins the sidecar with `aof mesh identity`. Must be discharged before 07's procedure runs. Discharged 2026-09-25 13:08: the operator ran `aof mesh identity --reidentify` (`Re-identified <machine-name> → node-7297`), and the sidecar reads `"nodeId": "node-7297"` at the source. | operator | closed |
| F-131-03 | FF-11903 is red: 57 unresolved `src/` citations against a ceiling of 55. None is 08's. The citations come from other stories' uncommitted evidence (07's fixture, FF-13101's non-vacuity probe). | defect | medium | Inherited, non-blocker for 08. Repaired at `aof:verify 131` (2026-09-25). The four were 131's own text: the test-bed helper names in STATE, now written without a `src/` path, and FF-13101's misspelled probe path, now marked `ask-request**s**`, which the extractor's class does not read as a citation. `acd-cited-path-resolves` was re-run alone and passed. | m131 | closed |
| F-131-04 | `messaging status` over a malformed `.aof/aof.config.json` exits 1 (`Invalid JSON in <path>`), while task 04 ruling 4 says it "exits 0 whatever it finds". | test-gap | low | PO ruling: upheld as built. A malformed config is not one of status's three facts. The error names the file and leaks nothing. | story 08 | closed |
| F-131-05 | 01's own sweep (`run-store-record.test.mjs`, "asks is assigned … only in its five homes") was red over the delivered tree. It matched `{ asks: await readWorkspaceAsks(ctx), … }` in `src/commands/list.mjs`, which is the options argument of 05's contracted `applyAskOverlay(rows, { asks, workspaceId })`, not a run record. 05's close ran "every suite that reads a changed file", and missed this one because a `src/`-wide text sweep reads every file without importing any. | defect | medium | Fixed in the gate. The sweep exempts that one call by its exact spelling, so any other `asks:` in `list.mjs` still reds. Re-run green. | story 01 | closed |
| F-131-06 | `createAskPoll` (01 task 02) ships with no consumer. 03 ruled the owner's wait a ref'd `setTimeout` over `readAsk`. Its unref'd interval is 129's silent-death shape if anything ever adopts it. The removal was made and then reverted, because amending 01 task 02's three poll scenarios and rulings (8) and QA (3) was not permitted in this session. Code and contract agree as shipped. | debt | low | Non-blocker. PO ruling at `aof:verify 131` (2026-09-25): KEEP as shipped. Code and 01 task 02's delivered contract agree, and a delivered `.feature` is not amended to delete a working, tested export. The hazard is only an unref'd interval if some owner adopts it. Such an adopter's review checks for it, and FF-13101 keeps `loop-asks` in one home. | story 01 | closed |
| F-131-07 | 05 task 04's last two scenarios read `git diff` "from the story's base to its last commit". None of 131 is committed, so no range exists. The working-tree reading matches the build's (`2 0`; `129 79` shared with 01/04). | gap | medium | Blocks 05's accept only. Discharged 2026-09-25: 131 was committed per range on `127-129` (05 = `8f00b4a` over `48ac161`), and both diffs were read and recorded under §131/05. | operator (commit) | closed |
| F-131-08 | The loopback-`Host` check (04, ADR-006 §3) closes DNS rebinding for WRITES only. A rebinding page can still READ the board's GET routes (`/api/work/doc` and the others). Recorded by 04's review. | security | low | Non-blocker. Outside this milestone's rulings, deferred to backlog as input for a board threat model. | backlog | open |
| F-131-09 | On a quiet board (nothing executing, no resync watching), a NEW ask appears only on the next load or sync. The 5 s silent poll arms only once a row already carries an ask (05's `Board.tsx` fix). The Discord ping is what sends the operator to the board. | gap | low | Non-blocker. The board's sync-gated policy was not changed on 05's authority. 07's live run observes it (leg 4 opens the item after the ping), and the retro decides. | story 07 (observe) | open |
| F-131-10 | The whole-tree gate at `fef237c` was red on one case alone: `53/00 task03 — any movement anywhere in the session tree restarts the quiet stretch`. It was green alone twice (33/33), and the same case went red once in 129 gate history. Cause, read in `defaultWatchTranscriptCompletion` (`src/agent-session-driver.mjs`): `tick` awaits the tree mtime and the transcript read, then calls `now()`. A tick that began before the test bumps the mtime and advances the virtual clock reads the OLD mtime, then judges quiet at the NEW instant, and settles. Under whole-tree load that interleaving happens. | defect | low | Non-blocker: a race in 53 test timing, not 131 behaviour, and outside 131 files. The fix is to take `now()` once at the top of `tick`, before either read, so a poll judges quiet at the instant it observed. That change is to a heavily pinned driver and is routed to backlog. The gate is re-run. | backlog (53 driver) | open |
| F-131-11 | At 07 leg 2 (2026-09-26 13:54Z), `/status` in the live channel listed the milestone `03` but none of its three waiting stories. `/asks` listed 03/00 and 03/03 correctly. Cause: `renderStatus` kept only `status === "in-progress"` rows, and a lane story reads `not-started` in the primary until its lane merges. Its waiting ask rides the row all the same. | defect | medium | Blocker for 07 leg 2, routed to story 11 and fixed in the run. `/status` also keeps any row whose ask is `waiting` or `parked`. A new `131/11 task02 (F-131-11)` case pins it, and the discord suites are green (41). The payload is re-installed. The bot picks it up at the next desktop restart, and leg 2 re-runs `/status` after it. | story 11 | closed |
| F-131-12 | At 07 (2026-09-26 14:02:36Z) the live loop halted `lane-merge-conflict at 03/01`: lanes 03/01 and 03/02 had each appended retro notes to the end of milestone 03 `STATE.md` `## Feedback (for retro)`, and the second merge home conflicted on that shared append. The halt behaved as ADR-004 says: the wave drained, 03/00 and 03/03 parked and said so, and the questions were printed with the answer command. | defect | medium | Non-blocker for 131, which does not own lane merges. For 07, the conflict was resolved in the lane as the union of both blocks (`3c629c9` on `aof/mesh/03-01`), and the loop resumes. Routed to backlog as a 129 lane-merge item: parallel lanes that append to one milestone record conflict every time. Either merge-home unions append-only sections, or a lane writes its notes to its own story. It recurred on the resume, at 03/00 (tip `dc92b13`). Workaround for the live run: git's built-in `union` merge driver for `wiki/work/**/STATE.md`, set in the test-bed's `.git/info/attributes`, which every lane worktree shares. With it `git merge-tree` resolves the 03/00 merge clean. The product fix routed with it: aof renders that attribute into `.gitattributes` for the work tree, so no repository meets this. | backlog (129 merge-home) | open |
| F-131-13 | At 07, 03/01 asked for a reserved choice (upper, lower or title), and its four-line ask said `I would pick: none`, since the contract forbids a pick. The operator answered `Go for none`, the session re-asked, and got `I agree with you: none of them`. It was built as unchanged text, which is outside the contract. The lane recorded the lesson itself. | gap | low | Non-blocker. The form of the ask (131/01, `NEEDS_INPUT_INSTRUCTION`) lets an agreeable pick line stand in for the question: when the choice is reserved, the pick line should ask for the answer itself (reply with one of …). Routed to backlog as input for the next change to the producer paragraph. | backlog (131/01 form) | open |
| F-131-14 | At 07 (2026-09-26 15:56Z), `/status` showed `03/03 — waiting on you (build, 24m)` while T1's 15:46Z row for the same ask read `(build, 1h 57m)`. T1 and Discord carry the envelope's `elapsedMs`, the attempt's wall time since the run was created (ADR-005 §3). `/status` and the board card count from the ask file's `askedAt`, which `--resume` re-stamps (01's ruling) — here 15:31:22Z. | gap | low | Non-blocker. Each face is as ruled, but one question shows two elapsed times, and nothing on either face says which clock it is. Routed to backlog: one clock for the ask's elapsed on every face, or a label naming it. | backlog (131/05, ADR-005 §3) | open |
| F-131-15 | At 07 (2026-09-26 18:41 local), milestone 03's verify session asked how to pass the accept door (a regression gate or an override). It named its own pick, `(a)`. The operator replied by Discord, `Do you really need to ask me this? Proceed with best judgement`, and the resumed session asked the same question again. | gap | medium | Non-blocker for 131. The form of the ask (131/01) has no delegation answer, so a session that is told to use its judgement asks again, and a question costs the operator two round trips. Routed to backlog with F-131-13: when the operator delegates, the session takes the pick it already named. | backlog (131/01 form) | open |
| F-131-17 | At 07 (2026-09-26), 05/01's first ask was answered (`"0"`, Discord, 18:11:15Z) and the same session `a88e0a97…` resumed and worked: it read `STATE.md` at 18:11:43.9Z and ran `aof work status …` at 18:11:44.7Z, with the result at 18:11:49.7Z. At 18:11:55.8Z the lane child came back as a needs-input document and terminated the PTY mid-turn (node-pty `AttachConsole failed` on the kill). The loop opened a second ask on run `20260926T180715198Z-0000` with `question: null`. The transcript's last assistant record is an ANSWERED `Bash` call, which `readTranscriptTerminalOutcome` reads as still working, so the needs-input did not come from the transcript reader. | defect | high | Fixed in the run (2026-09-26). CAUSE: the driver scanned its WHOLE PTY output for the `NEEDS_INPUT` line (`containsNeedsInputSentinel(buffer)`). A resumed claude re-renders the conversation, whose parked turn ends on a genuine sentinel, so a redraw re-printed the OLD line, and the driver settled needs-input and killed the working session. The transcript (line 89, `No response requested.` at the 18:16Z resume) confirms the kill. FIX: on a resumed session the PTY sentinel is not read, and the transcript watch decides from `resumedSinceOffset`. Two cases pin it (`131 F-131-17 —` resumed redraw settles nothing; a fresh sentinel still settles), red-probed: without the gate the resumed case reads `{"outcome":"needs-input","sessionId":"parked-session"}`. The session, driver and driving suites are green (1,127 ok, beside FF-5311 which the runner-timing revert cleared). | story 03 | closed |
| F-131-18 | At 07 leg 7 (2026-09-26 19:17 local), `/loop stop scope:04` was refused `discord-scope-ambiguous`, naming `aof, dispatch-04-00`. The operator's aof repository is on the same channel with the operator allowed, which is by design (ADR-009 §3). But the test-bed appeared as its LANE worktree: `resolveNodeWorkspaces("node-7297")` resolved workspace `52294b307214c27d` to `…aof-test-repo.aofmeshdispatch-worktreesdispatch-04-00`, not the test-bed root. A lane session's presence overwrites the workspace's project root, as another repository's lane also showed. | defect | medium | Non-blocker. The operator targets it with `workspace:52294b307214c27d`. Fixed for the bot in 131/14: the served list folds each member home through `foldDispatchWorktree`, and live the test-bed resolves to `C:\Source\umami\aof-test-repo` again. Presence itself is unchanged. The bot's served workspaces (11, ADR-009 §2) should resolve a workspace to its primary checkout, never a dispatch worktree, and presence should not let a lane's root replace the primary's. Routed to story 11 and mesh presence, in the backlog. | backlog (11 / presence) | open |
| F-131-19 | At 07 (2026-09-26), `aof work loop 04 --stop` against the live supervised loop 04 answered `request drain, state requested` and wrote `~/.aof/mesh/loop-stops/98fdd0ae-….json` at 18:21Z. By 18:29Z the file was gone, and loop 04 (pid 142368, still driving 04/00) had printed no halt. A second `--stop` answered `drain` again, not `cancel`, so the first request was deleted rather than honoured. Loop 05's request, stopped the same way, stayed and was honoured. | defect | medium | Non-blocker for 131, which does not own the stop request (130). A stop request for a live loop vanished before that loop read it. CAUSE, measured in `loop-diag.04.2026-09-26T18-30-23-768Z.log`: at 18:30:23Z the SUPERVISOR relaunched `work loop 04 --level L2 --resume` while the original loop was still live. That launch printed `Cleared stop request for 98fdd0ae… (requested, level 1) — resumed.` and exited code 1 a second later. Two defects compose: the supervisor judged a live supervised loop resumable, and a `--resume` launch clears a stop request that the live loop has not honoured. The re-issued request held, and loop 04 halted on it. Routed to backlog (130 stop request / desktop supervisor). | backlog (130) | open |
