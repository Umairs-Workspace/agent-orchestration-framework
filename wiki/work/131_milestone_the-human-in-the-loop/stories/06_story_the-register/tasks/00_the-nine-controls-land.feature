@executable @cli @work @validate
Feature: the nine controls land in three files under test/arch/loop, registered by import and spread, with the row raised by exactly that count

  ARCHITECTURE `## Fitness functions`, 119/ADR-010's harness shape. Three files export
  `archTests` (an array of `{ name, run }`) and are registered by one import + one spread each in
  `test/arch/loop/index.mjs` — never `readdir`-discovered. Each control has its STRUCTURAL leg
  (resolved specifiers through `test/support/module-family.mjs` — FF-11901's one extractor — and
  comment-stripped sweeps through `read-src-files.mjs` / `source-slice.mjs`), its FIXTURE leg (the
  delivered code driven under an isolated home), and a NON-VACUITY leg (a sweep that finds nothing
  reds). The `test/arch/loop` row rises by exactly the three files, its `why` naming each and which
  of the directory's three subjects (registry / record / ladder) it is. Every standing control the
  register cites stays green.

  RULINGS (refine, 2026-09-25, solo — raised while authoring this contract and ratified in it,
  measured against the delivered tree of 01–05):
  (1) The register governs every clause below. Where a clause does not hold over the tree, the
      control is built as written and reds; the fix belongs to the story that owns the subject
      file, never a narrowing here. One clause fails at refine. FF-13105's one-spelling leg is red
      at `src/loop/cycle.mjs:1079`: when a stop is already standing (03's task-01 ruling 9), the
      verify branch mints `haltDecision("session-needs-input", …)` itself. That fix is 131/03's:
      route the branch through `ask.mjs`.
  (2) FF-13102: `src/loop/ask.mjs` reaches the one reader through `readAskQuestion`, imported from
      `src/work/observe.mjs`, which itself calls `readLastAssistantTurn`. The leg asserts that
      `ask.mjs` imports from `observe.mjs` by resolved specifier and walks no transcript itself. The
      driver imports `readLastAssistantTurn` by name.
  (3) FF-13108: `src/commands/loop.mjs` renders the ask block through `askBlockLines` in
      `ask.mjs`. So the direct importer set of `form.mjs` is `ask.mjs`, `discord.mjs` and
      `ui/src/board/action.mjs`. The leg asserts those three, and asserts that `commands/loop.mjs`
      spells no event phrase and no elapsed ladder of its own.
  (4) FF-13109: DESIGN keeps the clamp toggle (`Show the full question` / `Show less`) as a
      link-idiom `<button`. So "one `<button`" means ONE button whose `onClick` reaches `send(`.
      The card may have exactly one other button: the toggle, whose `onClick` only calls
      `setExpanded`. A third `<button` reds.
  (5) FF-13105 names its sites, not a count (130/05 retro R2): the shell (`commands/loop.mjs`),
      `cycle.mjs`'s retry and verify branches, and `wave.mjs`'s lane branch each call
      `awaitAnswer(`. The `--resume` re-entry in `cycle.mjs` is a fifth caller, and the leg allows
      it.
  (6) FF-13101: the ask record is written only by `openRunAsk`, `parkRunAsk` and `answerRunAsk`.
      Two other `asks:` keys in `run-store.mjs` are the record's shape, not writes of an ask, and
      the sweep allows exactly those two: the mint's `asks: []` and the read-forward normaliser.
      Its ask-state leg keys on `ASK_STATES` and on `state` compared against the three words on an
      ask record. It never bans the bare English words.
  (7) FF-13107: the `notify(` sweep strips comments first (`worker-stream-client.mjs` names
      `notify()` in prose only). It excludes the definition in `src/notify/notify.mjs` and matches
      calls to the imported binding.
  (8) The row delta is the invariant: the row rises by exactly +3 over whatever it reads at build
      (62 at refine). The count of files on disk and the ceiling agree in both directions.
  (9) FF-13108's red probe is a second `formatElapsed` in `ui/src/board/`. None of the register's
      legs sees that: a local helper imports nothing and need not spell `waiting on you`. The
      elapsed ladder's one home, which ADR-006 §1 states, is therefore a leg of this control: no
      `src/**` or `ui/src/**` module but `form.mjs` defines `formatElapsed`.

  Background:
    Given the delivered tree with stories 01–05 landed, under an isolated `AOF_GLOBAL_HOME`

  Scenario Outline: each control is a registered arch-test that passes over the delivered tree
    When `node scripts/test.mjs --only test/arch/loop/<file>` runs
    Then every case named `arch/131 <id>` passes
    And `test/arch/loop/index.mjs` imports `archTests` from `./<file>` and spreads it once

    Examples:
      | file                                         | id                          |
      | `acd-loop-ask-single-home.test.mjs`          | FF-13101, FF-13102, FF-13103 |
      | `acd-loop-ask-waits-in-place.test.mjs`       | FF-13104, FF-13105          |
      | `acd-loop-ask-reaches-every-face.test.mjs`   | FF-13106, FF-13107, FF-13108, FF-13109 |

  Scenario: the three files are registered by import and spread, and nothing is readdir-discovered
    When `test/arch/loop/index.mjs` is read after the three files land
    Then it carries exactly three new `import { archTests as … } from "./<file>"` lines and exactly three new spreads, APPENDED after `...acdLoopStopReachesEveryFaceTests` under one `milestone 131 / story 06` comment, with nothing above them re-ordered
    And the file contains no `readdir`, `readdirSync`, `glob` or computed `import(`
    And every case named `arch/131 <id>` is reachable exactly once, and `scripts/test.mjs` is byte-unchanged by the arrival

  Scenario: FF-13101 — the ask has one home
    When its legs run
    Then over a comment-stripped sweep of `src/**` the literal `loop-asks` appears only in `src/loop/ask-request.mjs`, and no module joins `meshRoot` with an `ask` literal
    And `src/loop/ask.mjs`, `src/commands/resume.mjs` and `src/commands/list.mjs` each import `src/loop/ask-request.mjs` by RESOLVED specifier
    And `asks` is written only inside `openRunAsk`, `parkRunAsk` and `answerRunAsk`, under ruling (6)
    And `answerAsk` refuses `answer-control-chars` for `"ok\u001b[201~rm"`, `answer-empty` for `"  "`, and `ask-already-answered` on a second answer
    And the non-vacuity leg finds the module and at least three importers, and reds when it finds fewer

  Scenario: FF-13102 — one reader of the question
    When its legs run
    Then `readLastAssistantTurn` is defined in `src/work/observe.mjs`, the driver imports it, and `ask.mjs` imports its reader from `observe.mjs`, under ruling (2)
    And no other `src/**` module both `JSON.parse`s transcript lines and reads `stop_reason`
    And the driver's export set stays at 17 (`53/FF-5302`)
    And `NEEDS_INPUT_INSTRUCTION` embeds the sentinel, carries `Decision needed:`, `Options:`, `I would pick:` and `What the answer changes:`, and keeps the "genuine judgment call" sentence
    And an `end_turn` transcript fixture answers its text minus the sentinel line, and a pending `AskUserQuestion` fixture answers its questions and option labels

  Scenario: FF-13103 — a waiting run is recorded, not reclaimed and not charged
    When its fixture legs run
    Then a minted record carries 17 keys with `asks` last and `[]`, and a 16-key record reads forward with `asks: []`
    And `transitionStaleRunsReclaimed` over a stale `running` run whose last ask is unanswered leaves it byte-unchanged, and reclaims the same run once the ask is answered
    And `attemptElapsedMs` over a run with a 3 h ask interval equals `attemptElapsedMs` over the same run without it

  Scenario: FF-13104 — an answer reaches a session only as a resumed command
    When its legs run
    Then `src/mesh/terminal-input.mjs`, `src/terminal-ws.mjs` and `src/agent-session-driver.mjs` import neither `src/loop/ask-request.mjs` nor `src/loop/ask.mjs`, and `src/commands/resume.mjs` imports no terminal-input module
    And the driver has no branch that skips `stopForOutcome` for `needs-input`
    And `work:drive-continue` with `--answer` whose `runId` is not the lent run refuses `drive-answer-not-own` before any mint or spawn
    And with its own run, the fake PTY receives `resumeSessionId` equal to the ask's session and a typed body byte-identical to the answer

  Scenario: FF-13105 — a waiting lane does not halt the wave
    When its fixture leg runs over `test/support/loop/lane-fixture.mjs` with two lanes, one answering needs-input
    Then the other lane closes and merges
    And the waiting lane's record carries the ask and a heartbeat newer than the ask, and `waiting on you` is narrated
    And writing `answered` makes the lane re-drive with `--answer` and settle `done`, and the ask file is gone
    And with an immediate-park `askWait` the lane closes `parked` and unmerged, `session-parked-unanswered` is notified once, and the halt is `session-needs-input` only after the other lane merged

  Scenario: FF-13105 — the halt has one spelling and every site composes the wait
    When its structural leg runs
    Then `haltDecision("session-needs-input"` appears over a comment-stripped `src/**` sweep only inside `parkedHalt` in `src/loop/ask.mjs`
    And each site under ruling (5) calls `awaitAnswer(`
    And `LOOP_STOPS` in `src/work/loop.mjs` is unchanged

  Scenario: FF-13106 — the notifier is best-effort and the secret is never committed
    When its legs run
    Then the `work.notify` schema is closed, a channel has `urlEnv` and no `url`, `webhook` or `token` property at any level
    And `.aof/aof.config.json` and `src/**` contain no `discord.com/api/webhooks` literal, and inside `src/notify/` the URL is read only as `env[<urlEnv>]`
    And `notify` against a fetch that throws, returns 500, returns 429, or hangs past the bound resolves `{ delivered: [], failed: [name] }`, never rejects, and no degrade message carries the URL
    And `renderDiscord` over a 3,000-character ask with an open fence is at most 2,000 characters, keeps line 1, the action line and the link, balances the fence, and sets `allowed_mentions: { parse: [] }`

  Scenario: FF-13107 — six firing points, one envelope
    When its structural leg runs
    Then every `notify(` call under `src/` is one of the six ADR-005 §4 sites, enumerated by file and event literal, under ruling (7)
    And each envelope comes from `buildNotifyEnvelope`, whose keys deep-equal the eleven, and `EVENTS` holds seven
    And the non-vacuity leg finds six sites, and reds when it finds fewer

  Scenario: FF-13108 — one form on every face
    When its legs run
    Then `src/notify/form.mjs` has zero imports and its direct importers are the three under ruling (3)
    And the phrase `waiting on you` is spelled in no other comment-stripped `src/**` or `ui/src/**` module, and `formatElapsed` is defined in no module but `src/notify/form.mjs`, under ruling (9)
    And the only import specifier in `ui/src/**` that resolves outside `ui/src` is `../../../src/notify/form.mjs` in `ui/src/board/action.mjs`
    And for one envelope, `accountLine` and the Discord line 1 share a byte-identical `<ref> — <phrase> (<phase>, <elapsed>)`

  Scenario: FF-13109 — the answer route is guarded and the card has no fast path
    When its legs run
    Then in `src/board-ui.mjs` every `POST` branch calls `admitWriteRequest(` before `readJsonBody(`, and the `/api/work/answer` branch reads exactly `body.ref`, `body.text` and `body.actor`
    And `admitWriteRequest` in `src/board-ui.mjs` and in `src/mesh/ui-serve.mjs` calls `isLoopbackHost(`, and a request with `Host: evil.example:1234` and a matching `Origin` is refused `non-loopback-host` on both faces
    And `ui/src/**` holds exactly one `fetch("/api/work/answer"`
    And `ui/src/board/AskCard.tsx` imports no `Markdown`, sets no `placeholder`, keys on `item.ask`, and holds its buttons under ruling (4)

  Scenario: the budget row moves once and agrees with the tree in both directions
    When `node scripts/test.mjs --only test/arch/testing/acd-source-directory-budget.test.mjs` runs
    Then the `test/arch/loop` row's ceiling is its pre-build value plus exactly 3, and its `why` names the three files and the subject each guards
    And the control is green — the row is neither over- nor under-raised

  Scenario: the standing controls stay green
    When `node scripts/test.mjs --only` runs over `acd-session-driver-single-home`, `acd-loop-narrates-in-flight`, `acd-loop-stop-settles-the-run`, `acd-loop-family-boundary`, `acd-loop-module-import-boundary`, `acd-loop-suite-registration`, `acd-loop-state-rides-the-run-record`, `acd-clock-counts-attempts`, `acd-worker-driver-no-headless-print`, `acd-slot-before-admission`, `acd-work-command-route-coverage`, `acd-board-write-isolation`, `acd-ui-directory-budget`, `acd-ui-surface-file-budget`, `acd-no-new-silent-catch`
    Then every case passes
