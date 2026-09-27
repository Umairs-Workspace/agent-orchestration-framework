@executable @cli @work @work-stream
Feature: aof work archive <NN> moves a done driver's folder, name verbatim, under archive/

  An accepted item keeps its folder at the stream root beside the live ones, because its number is
  its identity (3,102 citations resolve by number — SPEC) and renumbering is not on the table.
  Identity is a number, not a location (ADR-002): the same `ITEM_RE` resolves `12_milestone_theta`
  wherever the folder sits, and 127/01 already enumerates `<workDir>/archive/` as the third root with
  every row stamped `archived: true`. This task adds the MOVE (ADR-004 §1-§2). It adds no visibility
  rule — which readers keep seeing an archived row and which stop is 01's predicate, and this task
  only proves the move did not disturb it.

  THE VERB. `work:archive` in `src/commands/archive.mjs`, registered in `src/command-core.mjs`
  (`cli.route: ["work", "archive"]`, usage `aof work archive <NN> | --done [--yes] [--json]`). The
  flag vocabulary is its OWN — `done`, `yes`, and `force` as the alias of `yes` the whole family
  keeps — declared in this module, because `INSERT_FLAGS` lives in `insert-shared.mjs` and FF-12705
  forbids that import. The registry's hand-kept ledgers learn the id CONSCIOUSLY, exactly as 127/02
  did for `promote`: the command-core contract's exact `WORK_IDS`; the CLI bijection's per-verb case
  (a probe that REFUSES cleanly — `aof work archive 999 --json` over the bijection fixture is
  `archive-not-found` as one parseable `{ ok:false, error, code }` document, and `archive` joins the
  verbs for which exit 1 is acceptable, because a probe that SUCCEEDED would move a folder); the
  route-coverage `BOARD_DEFERRED` carve-out (a mechanical CLI act over the operator's own tree; no
  board affordance was asked for, and a served `/api/work/archive` would let the board host move
  folders in a checkout it does not own); and the source-directory budget, where `src/commands`
  stands at its ceiling of 68 with allowance 0 and goes to 69 with a STATED why — the path is
  contract-bound (ADR-004 §1 and FF-12705 name `src/commands/archive.mjs`), and the `src/commands/work/`
  row refuses a second lone member that is not the fold. `src/work` goes 41 → 42 for the engine
  (task 03), `test/work/stream` 33 → 34 and `test/arch/work` 48 → 49 for this story's two suites.

  THE FACE IS THIN. `archive.mjs` resolves, refuses, selects (task 02) and renders; the MOVE and the
  link rewrite are `archiveItems` in `src/work/archive.mjs` (the engine, `reindex.mjs`'s twin —
  task 03 says why the engine is not inside the command), reached ONLY through the stream seam
  `transitionStreamArchived` (`src/effects/stream-transitions.mjs`: the item lock in front, the
  engine as the fact, `stream.archived` as the event, the publish as its one reactor). The verb
  runs no git command and spawns nothing (the delivered `acd-work-command-no-subprocess` control
  holds it); the renames it performs are what `git status` reports as renames afterwards.

  RESOLUTION. `<NN>` resolves through `findWork` (127/ADR-002 §3 — a resolving reader, so an
  archived or backlog ref still answers, which is what lets the refusals below NAME what they found).
  Exactly one row must match a TOP-LEVEL numbered driver at the stream root, whatever its type
  (`milestone`, `chore`, `spike`, `uat`, or a standalone top-level `story`), with `status: done`.
  Every refusal is a CODED `commandError` (08/ADR-003) and lands BEFORE any write — resolution and
  every check below are pure reads, so a refused archive leaves the whole work tree byte-identical:
    · no argument and no `--done` → `archive-missing-ref` (400);
    · `<NN>` and `--done` together → `archive-both-forms` (400);
    · nothing matches → `archive-not-found` (404);
    · a nested story ref (`NN/SS`) → `archive-not-a-driver` (400): "a story moves with its milestone";
    · a backlog row (`number: null`) → `archive-backlog-ref` (400), pointing at `aof work promote`;
    · a row already `archived: true` → `archive-already-archived` (409), naming `archive/<name>`;
    · a driver whose status is anything but `done` → `archive-not-done` (409), NAMING the status —
      `in-progress`, `in-review`, `blocked`, `not-started` are each spelled back;
    · `<workDir>/archive/<name>` already exists while the row is not archived (a hand-made collision)
      → `archive-destination-exists` (409).
  A `done` MILESTONE is checked on its OWN status only: its stories move with it whatever they say
  (the accept door already refuses a milestone `done` over an undone story — 96/ADR-008 — so a
  contrary tree is hand-edited, and the archive is not the place to re-litigate it).

  THE MOVE IS A RENAME, NEVER A COPY: `<workDir>/<name>` → `<workDir>/archive/<name>`, the folder
  name verbatim, `archive/` created on first use. `runs/`, `tasks/`, `stories/`, `mocks/`,
  `reference/` and every other file travel as they are. The record doc is NOT opened for writing:
  `status: done` stays, `updated:` is NOT bumped (archiving is placement, not authorship — the same
  rule 127/02 gives promotion), no frontmatter is reserialised, and no `number:` line is written
  anywhere (41/ADR-001, FF-12705). The ONLY bytes that change are the relative prose links that
  cross the archive line, task 01's contract; a file with no such link keeps its mtime.

  THE ENVELOPE (`--json`): `{ archived: [{ ref, type, slug, name, from, to }], rewritten: [{ path,
  links }] }` — `archived` in number order (one entry for `<NN>`), `from`/`to` the folder's old and
  new absolute paths (native in-process, forward-slashed on stdout — 127/02's rule), `rewritten` one
  entry per FILE that changed, `path` work-dir-relative and forward-slashed at the file's NEW
  location (`archive/12_milestone_theta/SPEC.md`, `11_chore_beta/CHORE.md`, `TECH_DEBT.md`), `links`
  the count of link occurrences rewritten in it, ordered by path. The render is one line:
  `Archived 12 → archive/12_milestone_theta (4 link(s) rewritten in 3 file(s)).`

  THE FIXTURE is 127/01's three-root fixture (`buildThreeRootFixture`, exported by
  `test/work/stream/work-backlog-archive-enumerate.test.mjs`) EXTENDED by this story's own
  `buildArchiveFixture` in `test/work/stream/work-archive-is-a-move.test.mjs`, which adds through
  the same `writeItem`: `12_milestone_theta` (`status: done`, with `stories/00_story_theta-one`
  `done`, a `runs/.heartbeats.ndjson`, a `tasks/00_theta.feature`, a `STATE.md` written with CRLF
  line endings, and a `reference/retired.mjs`); `13_chore_iota` (`status: done`); and the prose links
  task 01 enumerates. `11_chore_beta` is written with `depends: [12]`. Reads before and after the
  move go through the real CLI as a child process (the fixture's `runCli`) or `invoke(...)` with
  the fixture workspace, never a hand-rolled walk.

  What would quietly undo this: a copy-then-delete that leaves `runs/` behind; a move that bumps
  `updated:` or reserialises the frontmatter; a resolution that filters out archived rows (so the
  409 could not name where the folder is); a face that imports `insert-shared.mjs` for its flags.

  ADR-004 §1, §2, §5; ADR-002 §3; 41/ADR-001; 08/ADR-003; FF-12705.

  Scenario: archiving a done milestone moves its folder verbatim under archive/
    Given the archive fixture
    When `aof work archive 12 --json` runs from the fixture root
    Then the folder `12_milestone_theta` no longer exists at the stream root and `archive/12_milestone_theta` exists
    And `archive/12_milestone_theta/stories/00_story_theta-one/STORY.md`, `archive/12_milestone_theta/runs/.heartbeats.ndjson`, `archive/12_milestone_theta/tasks/00_theta.feature` and `archive/12_milestone_theta/reference/retired.mjs` all exist, each byte-identical to the file it was before the move
    And `archive/12_milestone_theta/SPEC.md` differs from its pre-move bytes ONLY on the link lines task 01 names — its frontmatter block, `status: done` and `updated:` line are byte-identical
    And the envelope is `{ archived: [{ ref: "12", type: "milestone", slug: "theta", name: "12_milestone_theta", from: <root>/12_milestone_theta, to: <root>/archive/12_milestone_theta }], rewritten: [...] }` with `from`/`to` forward-slashed
    And the render (without `--json`) is exactly one line `Archived 12 → archive/12_milestone_theta (<N> link(s) rewritten in <M> file(s)).` with N and M task 01's counts
    And no `number:` line anywhere under the work dir changed, and `git status --porcelain` over the fixture (initialised as a repository before the move) reports renames for the moved folder and modifications for exactly the files `rewritten` names

  Scenario: every reader that resolves by ref still answers for the archived item, and every walker that answers "what is next" does not
    Given the archive fixture, after `aof work archive 12`
    When `aof work find 12 --json`, `aof work find 12/00 --json`, `aof work doc 12 SPEC`, `aof work validate --json`, `aof work doctor 12 --json`, `aof work next --json`, `aof work list --json` and `aof work list --all --json` each run
    Then `find 12` answers one row `{ ref: "12", type: "milestone", slug: "theta", status: "done", parent: null, archived: true }` whose `dir` ends in `archive/12_milestone_theta`, and `find 12/00` answers the story with `archived: true` and `parent: "12"`
    And `doc 12 SPEC` prints the moved SPEC.md
    And `validate` reports no finding naming `12_milestone_theta` and no finding it did not report before the move; `doctor 12` reports no finding it did not report before the move
    And `next` proposes nothing under `12`, the default `list` carries no row for `12` or `12/00`, and `list --all` carries both with `archived: true`
    And `aof work next 11 --json` still answers `state: "ready"` for `11` — its `depends: [12]` is satisfied by the archived `done` driver exactly as it was before the move

  Scenario Outline: every refusal is coded, names what it found, and lands before any write
    Given the archive fixture, with <precondition>
    When `aof work archive <argv> --json` runs
    Then the process exits 1 with exactly one document `{ ok: false, error: <message>, code: "<code>" }` on stdout
    And every file and folder under the work dir is byte-identical to before, `archive/` included

    Examples: the refusals, in the order the verb checks them
      | precondition                                                                           | argv          | code                        | message names                                                          |
      | nothing changed                                                                        |               | archive-missing-ref         | the usage `aof work archive <NN> \| --done`                            |
      | nothing changed                                                                        | 12 --done     | archive-both-forms          | that `<NN>` and `--done` are two forms of one verb                     |
      | nothing changed                                                                        | 99            | archive-not-found           | `99`                                                                   |
      | nothing changed                                                                        | 12/00         | archive-not-a-driver        | `12/00` and that a story moves with its milestone                      |
      | nothing changed                                                                        | gamma         | archive-backlog-ref         | `gamma`, `backlog/chore_gamma` and `aof work promote`                  |
      | nothing changed                                                                        | 05            | archive-already-archived    | `05` and `archive/05_milestone_zeta`                                   |
      | `10_milestone_alpha` (`status: in-progress`)                                           | 10            | archive-not-done            | `10` and the status `in-progress`                                      |
      | `11_chore_beta` rewritten to `status: in-review`                                       | 11            | archive-not-done            | `11` and the status `in-review`                                        |
      | `11_chore_beta` rewritten to `status: blocked`                                         | 11            | archive-not-done            | `11` and the status `blocked`                                          |
      | `11_chore_beta` left at `status: not-started`                                          | 11            | archive-not-done            | `11` and the status `not-started`                                      |
      | an empty folder `archive/12_milestone_theta` created by hand                           | 12            | archive-destination-exists  | `archive/12_milestone_theta`                                           |
      | `12_milestone_theta/SPEC.md` rewritten with its `status:` line deleted                 | 12            | archive-not-done            | `12` and that the record doc carries no status                         |

  Scenario Outline: the verb answers every top-level driver type, and only a top-level driver
    Given the archive fixture, plus a done top-level <type> written as `<folder>` at the stream root
    When `aof work archive <ref> --json` runs
    Then the envelope's `archived[0]` is `{ ref: "<ref>", type: "<type>", slug: "<slug>", name: "<folder>", ... }` and `archive/<folder>` exists with its record doc byte-identical
    And `aof work find <ref> --json` answers the row with `archived: true` and `status: "done"`

    Examples: one of each driver type the stream admits
      | type      | folder                | ref | slug  |
      | chore     | 13_chore_iota         | 13  | iota  |
      | spike     | 14_spike_kappa        | 14  | kappa |
      | uat       | 15_uat_lambda         | 15  | lambda|
      | story     | 16_story_mu           | 16  | mu    |
      | milestone | 12_milestone_theta    | 12  | theta |

  Scenario: the verb is registered, and every hand-kept ledger learned it consciously
    Given the delivered registry
    When `listCommands()` is read, and the four ledgers are run as focused suites
    Then `work:archive` is registered with `cli.route: ["work", "archive"]` and its `cli.spec.flags` are exactly `{ done, yes, force }` declared in `src/commands/archive.mjs` — the module carries no import of `insert-shared.mjs`
    And `test/command/command-core-contract.test.mjs`'s `WORK_IDS` names `work:archive`; `test/arch/work/acd-work-command-cli-bijection.test.mjs` drives `["work", "archive", "999", "--json"]` and accepts exit 1 for it; `test/arch/work/acd-work-command-route-coverage.test.mjs`'s `BOARD_DEFERRED` names `archive` with its reason
    And `test/arch/testing/acd-source-directory-budget.test.mjs` reads `src/commands` at ceiling 69, `src/work` at 42, `test/work/stream` at 34 and `test/arch/work` at 49, each row's `why` naming 127/03 and the file that moved it
    And `aof work archive 12 --at 3 --json` is refused by the generic face as an unknown flag, its message carrying the usage `aof work archive <NN> | --done [--yes] [--json]`
