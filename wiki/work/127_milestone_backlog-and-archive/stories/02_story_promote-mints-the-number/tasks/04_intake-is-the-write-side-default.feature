@executable @cli @work @work-stream
Feature: work.intake is read on the write side only, promote ships its wrapper, and a phase door refuses a backlog ref

  `work.intake: "backlog" | "stream"` says where `aof:add-*` lands a new item; absent reads as
  `"stream"` so an existing project is unchanged without a migration (ADR-005 §1, the rejected
  alternative); only the exact string `"backlog"` selects the backlog — absent, `"stream"` or any
  other value reads as `"stream"`, and `initConfig` never rewrites a value it finds. The key is
  READ in three places and nowhere on the read side: the `aof:add-*`
  prompts (task 05), the config half of init, and `promote`'s not-found text. `listItems`,
  `findWork`, `listStream`, `nextWork`, `validateWork`, doctor and the board read `backlog/` and
  `archive/` whenever they exist, under either setting (ADR-005 §2, FF-12704). No `src` module
  outside the allow-list contains the token `intake` at all.

  THE CONFIG HALF OF INIT. `aof work init` renders the bundle and writes the lock; the config is
  written by `initConfig` (`src/work/init.mjs:263`, `aof work init-config`, chore 51's fill-don't-
  clobber merge) — so THAT is where `"backlog"` is written, and ONLY into a config this call
  CREATES (`created === true`). An existing config with the key absent is left absent: filling
  `"backlog"` into it would silently change where its next item lands, which is exactly what
  "absent ⇒ stream" exists to prevent. An existing `"stream"` or `"backlog"` is kept. The result
  envelope gains `intakeWritten: true|false`, the same shape `backendWritten` / `tagsWritten` use.
  `/aof:init` therefore lands a fresh repository on the backlog with no prompt edit (`aof work init
  --with-headroom` creates the config before init-config runs, so that path stays on stream — the
  same fill-don't-clobber rule, not an exception). The face's `--json` projection
  (`src/commands/init-update.mjs`) carries `intakeWritten`.

  PROMOTE'S ONE READ OF THE KEY is the refusal text: when `promote <slug>` finds no backlog row AND
  the project's intake is `"stream"` (or absent), the `promote-not-found` message adds one sentence
  — nothing is born in the backlog under `work.intake: "stream"`; set it to `"backlog"` or add the
  item under `backlog/` by hand. Under `"backlog"` the sentence is absent. A stray backlog leaf in a
  `"stream"` project still promotes: the read side is mode-less, and so is the verb.

  THE WRAPPER. `src/bundle/commands/promote.md` is a `command` member of `src/bundle/bundle.json`
  (`id: promote`, `commandNamespace: aof`, runtimes claude + opencode, like `insert-*`), so
  `aof work update` renders `/aof:promote` — `.claude/commands/aof/promote.md`,
  `.opencode/commands/aof/promote.md` and the codex twin `.codex/skills/aof-promote/SKILL.md` —
  and `src/bundle/manifest.json` carries the three hashes. The prompt: resolve the slug with
  `aof work find <slug> --json`, run `aof work promote <slug> [--at P] --json` (never hand-move a
  folder, never hand-write `number:`), surface the count-gate exactly as `insert-*.md` do, report
  the minted ref, and hand off to `aof:refine <NN>` (milestone / story) or to the item's own record
  doc (chore / spike / uat — worked directly, closed by `aof:verify`). The `work:*`-implies-wrapper
  rule that FF m41/R5 enforces for `insert-*` is extended to `promote` by the same registry-derived
  control.

  A PHASE DOOR REFUSES A BACKLOG REF. `aof work refine|continue|verify <ref>`
  (`createPhaseDoorCommand`, `src/commands/continue.mjs:190`) decides WHERE a phase runs and may
  dispatch it to a worker. A number must be minted where the operator is, on the control node, by
  the one verb — a promote inside a dispatched run would mint from the worker's copy of the stream,
  and two nodes can mint the same number. So a ref that resolves (through the door's own
  `resolveItemExact`) to a row with `number: null` is refused up front as `phase-backlog-ref`
  (409): "`<slug>` is a backlog item — `aof work promote <slug>` first; a mint is never
  dispatched." No overlay is read, no status is moved, no assignment is minted. The door's
  resolution is EXACT, as it always was: `DELTA`, `delt` and `ideas/delta` resolve to no row and
  are answered as before this story, not refused — only a ref that IS a backlog row's `ref` (its
  slug, verbatim) meets the new code. The operator's door is the PROMPT (`/aof:refine <slug>`),
  whose step 0 promotes locally and continues with the minted ref (task 05). The loop hands the
  door live rows only (FF-12706), so it never meets this.

  What would quietly undo this: `initConfig` filling `"backlog"` into an EXISTING config's hole; a
  `listItems`/`nextWork` branch on `intake`; a promote.mjs that refuses under `"stream"`; a door
  that promotes on the operator's behalf; a `promote.md` that computes a number.

  ADR-005 §1, §2; ADR-003 §1, §7; chore 51; m41 R5; FF-12704; FF-12706.

  Scenario: a config born from init-config carries intake backlog
    Given a fresh directory with no `.aof/aof.config.json`
    When `aof work init-config . --json` runs
    Then the written config carries `work.intake: "backlog"` beside the memory backend, and the envelope reports `created: true, intakeWritten: true`

  Scenario Outline: an existing config is never re-pointed
    Given a directory whose `.aof/aof.config.json` carries <before>
    When `aof work init-config . --layers @cli --json` runs
    Then the config's `work.intake` is <after> and the envelope reports `intakeWritten: false`
    And no key changes other than the two chore 51 already fills into a hole (`memory.backend`, `work.tags`)

    Examples:
      | before                        | after   | why                                                     |
      | `work: { dir: "./wiki/work" }` | absent  | an absent key stays absent — it reads as stream          |
      | `work: { intake: "stream" }`  | stream  | an explicit choice is kept                              |
      | `work: { intake: "backlog" }` | backlog | already chosen                                          |
      | no `work` block at all        | absent  | the config exists, so nothing is filled                 |

  Scenario: the read side answers the same under either setting and when the key is absent
    Given the three-root fixture in three copies: intake absent, `"stream"`, and `"backlog"`
    When `aof work list --json`, `aof work find gamma --json`, `aof work find 05 --json`, `aof work next --json` and `aof work validate --json` run over each
    Then every answer is byte-identical across the three copies (`dir` values aside) — the backlog rows listed, gamma resolving as a backlog row, 05 resolving as archived, next proposing the same ref, validate reporting the same findings

  Scenario: promote's not-found text explains a stream-intake project
    Given the three-root fixture with `work.intake: "stream"`
    When `aof work promote nothing-here` runs
    Then it is refused with code `promote-not-found`, and the message names `work.intake: "stream"` and says nothing is born in the backlog under it
    When the same runs with `work.intake: "backlog"`
    Then the message carries no mention of `intake`
    When `aof work promote gamma` runs with `work.intake: "stream"`
    Then it proceeds — a leaf that exists is promoted whatever the intake says

  Scenario: the token lives on the write side only
    Given `src/**` with comments stripped
    When every file containing the token `intake` (as a word) is listed
    Then the list is a subset of `src/work/init.mjs`, `src/commands/init-update.mjs` (the face that projects `intakeWritten`), `src/commands/promote.mjs` and `src/bundle/commands/*.md`, and `init.mjs` and `promote.mjs` each contain it at least once
    And `src/work.mjs`, `src/work/doctor.mjs`, `src/work/doctor-*.mjs`, `src/work/loops.mjs`, `src/commands/list.mjs`, `next.mjs`, `recent.mjs`, `find.mjs`, `read.mjs`, `doc.mjs`, `src/board-ui.mjs` and `src/global-work-store.mjs` contain it zero times
    And `src/commands/insert-shared.mjs` contains it zero times — the aliases pass through the backlog under either setting and read nothing

  Scenario: promote ships its wrapper and the parity control covers it
    Given the bundle descriptor and the rendered install
    When the `command` members are read and `aof work update` runs
    Then a member `{ id: "promote", kind: "command", file: "commands/promote.md", commandNamespace: "aof" }` exists
    And `.claude/commands/aof/promote.md`, `.opencode/commands/aof/promote.md` and `.codex/skills/aof-promote/SKILL.md` are rendered and git-tracked; the claude and codex renders carry hashes in `src/bundle/manifest.json` (the manifest covers those two runtimes only) and `.aof/aof.lock.json` records the member
    And the m41 R5 parity control, widened to `work:promote` as well as `work:insert-*`, is green — and red when the member is removed from the descriptor

  Scenario: the promote prompt computes nothing
    Given `src/bundle/commands/promote.md`
    When its text is read
    Then it contains `aof work promote` and `--json`, and no phrase computing a number (`max`, `+ 1`, `NN + 1`)
    And it names `aof:refine <NN>` as the next step for a milestone or story and the record doc for a chore, spike or uat

  Scenario: a phase door refuses a backlog ref before it decides where to run
    Given the three-root fixture
    When `aof work refine delta --json` runs
    Then it is refused with code `phase-backlog-ref` naming `aof work promote delta`, exits 1 through the generic face, and `backlog/ideas/milestone_delta/SPEC.md` still reads `status: not-started`
    And `aof work continue gamma` and `aof work verify epsilon` are refused with the same code
    When `aof work refine 10 --json` runs
    Then it answers exactly as before this story — `where: "local"`, `command: "/aof:refine 10"` — the door is unchanged for a numbered ref

  Scenario: the door is refused even when the slug also matches a live item by substring
    Given the three-root fixture, plus a live `13_milestone_delta-lake`
    When `aof work refine delta --json` runs
    Then it is refused with code `phase-backlog-ref` — the exact-slug backlog row is what the ref names

  Scenario Outline: the door refuses exactly the refs that resolve, exactly, to a backlog row
    Given the three-root fixture
    When `aof work <door> <ref> --json` runs
    Then the result is <result>

    Examples: each door, each ref form
      | door     | ref          | result                                                          | why                                                                        |
      | continue | epsilon      | refused `phase-backlog-ref` naming `aof work promote epsilon`   | a leaf two groups deep, through the door a spike has instead of refine     |
      | verify   | gamma        | refused `phase-backlog-ref` naming `aof work promote gamma`     | the third door                                                             |
      | refine   | DELTA        | answers exactly as before this story, not `phase-backlog-ref`   | the door resolves EXACTLY — `DELTA` is no row's ref                        |
      | refine   | delt         | answers exactly as before this story, not `phase-backlog-ref`   | a substring is not an exact ref                                            |
      | refine   | ideas/delta  | answers exactly as before this story, not `phase-backlog-ref`   | a group path is not a ref                                                  |
      | continue | 10/00        | `where: "local"`, `command: "/aof:continue 10/00"`, as before   | a story ref is a live row                                                  |
      | verify   | 10/00-00     | answers exactly as before this story                            | a span is live scope, never a backlog row                                  |
      | refine   | 05           | answers exactly as before this story                            | an archived ref is numbered — this story adds no rule for it               |
      | refine   | 12           | answers exactly as before this story                            | a number nothing holds resolves to no row, and no row is not a backlog row |
      | refine   | nothing-here | answers exactly as before this story                            | unknown free text resolves to no row                                       |
