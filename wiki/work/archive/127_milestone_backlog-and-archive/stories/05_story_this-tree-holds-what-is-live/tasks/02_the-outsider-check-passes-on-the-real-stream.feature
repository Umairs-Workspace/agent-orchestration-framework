@executable @cli @work @work-stream
Feature: the outsider's check passes on the real stream — the root is a short list of live items, every reader that resolves by ref still answers for an archived item, every walker that answers "what is next" does not, and no link resolves worse than before

  The SPEC's last paragraph is what an outsider verifies; 03 proved the verb on a fixture, and
  this task is the same check over `wiki/work` itself, AFTER task 01's move, as a suite that
  stays green for as long as the tree keeps the shape this milestone gave it. It reads the real
  tree and writes nothing to it: every read goes through the real CLI as a child process from
  the repository root (`spawnCliSync`, the way `cache-authority-own-disk-read` reads this
  repo), under an isolated `AOF_GLOBAL_HOME` so the live cache is never opened, or through the
  real board face (`handleWorkApi`, `projectDir: <repo root>`). It runs in the `test/work/stream`
  lane (`work-this-tree-holds-what-is-live.test.mjs`, registered in the lane's index; the
  `test/work/stream` budget row raises 34 → 35 with this file stated, the same way 03 raised
  it) and nowhere near the full suite: run it as `node scripts/test.mjs --only <file>`.

  A CHECK OVER THE REAL TREE NAMES REAL ITEMS. `52` (`loop-registry-and-graph`, `done`, six
  stories, `ARCHITECTURE.md` + `VERIFICATION.md` + `RETROSPECTIVE.md`) is the SPEC's own example
  and the archived milestone every reader is asked about. `32` (`uat_whole-mesh-acceptance`,
  `blocked`, `depends: [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28]` — eleven `done` milestones,
  all archived by task 01) is the live item whose gate is satisfied ONLY through archived
  drivers: it is `ready` today and must be `ready` after. `127`, `129`, `130` are the live
  milestones. `42_structural-overhaul` stays at the root and is invisible to every reader.
  Each is asserted BY REF and by status read off its own record doc, never by a count of
  folders that the next accept would move — the ONE hard-coded count is the ratchet below.

  THE LINK RATCHET. 03/01's invariant — every relative link resolves to the same path after
  the move as before — was proved on the fixture. Over the real tree the test cannot see
  "before", so it pins what the developer MEASURES at the build, immediately before task 01's
  move, by the same syntactic scan 03/01 specifies (inline `](…)` links with a relative target
  under `wiki/work/**/*.md`, resolved against the file's directory, existence checked): the
  count RESOLVING, and the count of links in all. Both are module constants with the date and
  the commit they were measured at, and the test asserts the post-move resolving count is `>=`
  the pinned one and the total is `==` — a moved link that stopped resolving is the one thing
  the move could break, and a link the move invented would be the other. The retired `.mjs`
  suites under `35_…/reference/retired-dispatch-tests/` are `.mjs`, not `.md`, and their
  broken `import` is ADR-004 §3's accepted cost, outside the scan.

  THE TWO PATH-READERS (03/03: `acd-tune-carries-no-second-rule` reads `62/04`,
  `acd-declared-program-single-speller` reads `72/00`; `62` and `72` are both archived by task
  01) are run as focused suites over the moved tree and are green — the first move that would
  have reddened them is this one.

  What would quietly undo this: a suite that copies the tree first (the copy is task 00's
  instrument; THIS check is over the tree itself); a check keyed on `125` archived folders (the
  next accept moves the count); opening the live global home (a cache-answered `find` proves
  the cache, not the tree — every read here is `answeredFrom: "disk"`); reading `52` through
  `listItems` in-process rather than the CLI an outsider would run.

  SPEC §Objective (the outsider check); ADR-002 §2, §3; ADR-004 §3; 03/00, 03/01, 03/03; FF-12706.

  Scenario: the root of the work directory is a short list of live items, and the archive holds only done drivers
    Given the repository root after task 01's move, and an isolated global home
    When `ls wiki/work` and `aof work list --all --json` are read
    Then every folder at `wiki/work` that matches `ITEM_RE` has a record-doc `status:` that is not `done` — today `127`, `129`, `130` (`in-progress`) and `32` (`blocked`) — and no `ITEM_RE` folder at the root is `done`
    And every folder under `wiki/work/archive/` matches `ITEM_RE`, is a top-level driver (a milestone, chore, spike, uat or standalone story — never a `stories/` child at that level), and its record doc reads `status: done`
    And `aof work list --all --json` carries every archived driver and story with `archived: true`, after every live and backlog row, and carries no `archived: true` row whose `status` is not `done`
    And `wiki/work/42_structural-overhaul` exists at the root and appears in no row of `list --all` — it is not an item

  Scenario Outline: every reader that resolves by ref answers for the archived milestone 52 from disk
    Given the repository root after the move, and an isolated global home
    When `aof work <argv> --json` runs as a child process from the repository root
    Then <answer>

    Examples: the readers ADR-002 §3 names, over the SPEC's own example
      | argv               | answer                                                                                                                                       |
      | find 52            | one row `{ ref: "52", type: "milestone", slug: "loop-registry-and-graph", status: "done", parent: null, archived: true, answeredFrom: "disk" }` whose `dir` ends in `wiki/work/archive/52_milestone_loop-registry-and-graph` |
      | find 52/00         | one row with `parent: "52"`, `archived: true`, `status: "done"`, `dir` under the archived folder                                              |
      | doc 52 SPEC        | the moved `SPEC.md`, byte-identical to `wiki/work/archive/52_milestone_loop-registry-and-graph/SPEC.md`                                       |
      | doctor 52          | no `error`-level finding, and no finding whose code is `control-unresolved` for a control the register says landed                            |
      | validate 52        | `[]`                                                                                                                                         |
      | validate           | `[]` — the whole tree, archive included                                                                                                       |

  Scenario: every walker that answers "what is next" never proposes an archived item, and a live gate satisfied only by archived drivers is still ready
    Given the repository root after the move
    When `aof work next --json`, `aof work next 32 --json`, `aof work list --json` and `aof work list --all --json` run
    Then the unscoped `next`'s `ref` and every `readySet` entry is a live row — none is `52`, any `NN` under `archive/`, or any backlog slug
    And `next 32` answers `state: "ready"` for `32` with no `waitingOn` — its eleven dependencies are `done` drivers under `archive/`, and an archived dependency is satisfied, not missing (ADR-003 §6, ADR-002 §3)
    And the default `list` carries no `archived: true` row and no row for `52`, while `list --all` carries `52` and its six stories
    And the `aof:recent` prompt reads through `work:list`'s default (127/01), so it sees no archived row either — there is no `aof work read` or `aof work recent` verb; the SPEC's "read 52" is `doc 52 SPEC` above

  Scenario: the board face over the real repository excludes the archive by default and includes it on the parameter
    Given the real face bound to the repository root (`handleWorkApi`, `projectDir: <repo root>`), and an isolated global home
    When `GET /api/work/list` and `GET /api/work/list?includeArchived=1` are requested
    Then the first envelope's `items` holds `127`, `129`, `130`, `32` and their stories, no `archived: true` row, and `deriveBoard(items).milestones` has exactly three entries
    And the second holds those plus every archived driver and story with `archived: true`, `52` among them, and `deriveBoard(items).archivedMilestones` equals the number of archived milestone rows in `aof work list --all --json`

  Scenario: no relative link resolves worse than it did before the move, and no link was invented
    Given the module constants `LINKS_BEFORE = { total: <measured>, resolving: <measured> }` recorded by the developer immediately before task 01's move, with the date and commit
    When every `.md` file under `wiki/work` (all three roots) is scanned for inline relative links by 03/01's rule and each target is resolved against its file's directory
    Then the total equals `LINKS_BEFORE.total` and the resolving count is `>= LINKS_BEFORE.resolving`
    And every link whose target is under `wiki/work/archive/` resolves to an existing file, and no link under `wiki/work/**` targets a root path `wiki/work/<NN>_…` whose folder now lives under `archive/`
    And the four links in `wiki/memory.md` into `work/archive/05_milestone_work-memory/…` resolve

  Scenario: the two runtime path-readers survive the archive of the items they read
    Given the repository after the move
    When `test/arch/planning/acd-tune-carries-no-second-rule.test.mjs` and `test/arch/command/acd-declared-program-single-speller.test.mjs` run as focused suites
    Then both are green, and `grep -rnE "wiki/work/[0-9]+_" src test scripts --include=*.mjs` finds no match that `readFile`s, `existsSync`s or `import`s a path under a root-level item folder — 03/03's classification holds over the moved tree

  Scenario: the budget row and the lane index name this suite
    Given the delivered tree
    When `test/arch/testing/acd-source-directory-budget.test.mjs` and `test/work/stream/index.mjs` are read
    Then the `test/work/stream` row's ceiling is `35` with a `why` naming 127/05 and this file, and the index imports and spreads `workThisTreeHoldsWhatIsLiveTests`
    And `node scripts/test.mjs --only test/work/stream/work-this-tree-holds-what-is-live.test.mjs` is green under an isolated global home
