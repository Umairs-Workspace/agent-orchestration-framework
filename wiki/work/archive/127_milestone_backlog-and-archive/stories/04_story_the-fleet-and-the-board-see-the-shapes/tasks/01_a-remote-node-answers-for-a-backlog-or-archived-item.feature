@executable @cli @work @work-stream
Feature: a node whose disk does not hold the item answers aof work find for a backlog slug or an archived number exactly as the owning node does

  The cache-first seam (`src/work/read.mjs`, 43/ADR-005) builds `work.mjs`'s `view` from the
  store's rows, and for a ref this node's disk does not hold it rebuilds an enumerator row in
  `cacheOnlyItem(row)`: `number` is DERIVED FROM THE REF — `String(row.ref).split("/")[1]`, else
  the ref itself. Over 127/01's rows that derivation is wrong twice: a backlog row's ref is its
  slug, so the rebuilt item says `number: "gamma"`, `isLiveStreamRow` answers TRUE, and a remote
  node's default `list` paints an un-numbered idea as a live driver; an archived row's `archived`
  is never rebuilt, so the same node's `next` can PROPOSE `05` and `list` shows it at the root.
  The store now carries the facts (task 00); this task makes the seam read them. `src/work/read.mjs`
  was not in this story's declared write set at breakdown — it joins it here, ratified in this
  beat (the STORY.md `files:` is the one home and is updated with it).

  THE REBUILD. `cacheOnlyItem(row)` answers, for a store row carrying `backlog` (a string —
  `""` included): `{ number: null, type, slug, name: null, dir: null, ref: row.ref, parent:
  null, backlog: row.backlog }`; for a row carrying `archived: true`: the numbered shape it
  builds today plus `archived: true`; for any other row: byte-identical to today. `name` and
  `dir` stay null — rule 4, no path is fabricated, and a backlog leaf's folder name is as
  absent here as a numbered one's. `isLiveStreamRow` therefore answers the SAME over a
  rebuilt cache row as over the owning node's disk row, which is ADR-006 §1's whole claim.

  THE OVERLAY RULE, decided here as a documented default: when this node's disk DOES hold the
  folder, `stateOverlay(row)` keeps overlaying STATUS and TITLE only. `archived` and `backlog`
  are LOCATION facts, and the seam's standing rule is that identity and location belong to the
  folder that is actually here (`stateOverlay`'s own comment; 43/02's renumber regression is
  what a cache row at an old location looks like). So a checkout that still holds `12` at the
  stream root while the owning node has archived it answers `12` as a live done row with its
  own `dir` — the honest report of a checkout that has not pulled — and never a `dir` under an
  `archive/` it does not have. The disagreement is visible, not papered over, and is the same
  class doctor's `cache-status-divergence` already reports for status.

  THE READERS — every cache-first equivalent, driven where the disk is EMPTY of the item:
  `findWorkCacheFirst(ws, "gamma")` resolves the backlog row through `findWork`'s free-text
  branch (slug match; `name` null is already tolerated); `findWorkCacheFirst(ws, "05")` answers
  the archived driver and `"05/00"` its story; `listStreamCacheFirst` default carries `gamma`
  under the backlog block and NOT `05`; with `all: true` it carries `05` and `05/00` with
  `archived: true`, after the live and backlog rows (ADR-002 §5's order); `nextWorkCacheFirst`
  scoped to `05` answers `done`, scoped to `gamma` answers nothing a walker would schedule, and
  the unscoped walk never returns either; the CLI `aof work find`, `list`, `list --all` and
  `next` over the same remote fixture agree with the in-process answers, each row stamped
  `answeredFrom: "cache"`, `reportedBy: <owner>`, `dir: null`.

  What would quietly undo this: a `cacheOnlyItem` that derives `number: null` from a NON-NUMERIC
  ref (a numbered driver is never non-numeric, but the rule would be location-blind and read
  `backlog` off a shape rather than a fact); a seam that overlays `archived` from the cache onto
  a disk row (the stale-checkout `dir` fabrication); a `findWork` branch that reads `backlog`
  (the free-text branch already matches the slug and needs no new grammar — ADR-001 §3).

  ADR-006 §1; ADR-002 §1, §2, §3, §5; 43/ADR-005 rules 3 and 4; ADR-001 §3.

  Scenario: the seam rebuilds a cache-only backlog row and a cache-only archived row in the enumerator's shape
    Given a workspace whose disk holds only `10_milestone_alpha` and `11_chore_beta`, and a hermetic store whose rows for this workspace are the three-root fixture's full projection reported by node `aof-wsl`
    When `listItemsCacheFirst(workspace)` runs
    Then the item for `gamma` is `{ number: null, type: "chore", slug: "gamma", name: null, dir: null, ref: "gamma", parent: null, backlog: "", answeredFrom: "cache", reportedBy: "aof-wsl", syncedAt: <the store's> }` and `epsilon`'s `backlog` is `"ideas/later"`
    And the item for `05` is `{ number: "05", type: "milestone", slug: "zeta", name: null, dir: null, ref: "05", parent: null, archived: true, answeredFrom: "cache", … }` and `05/00` carries `parent: "05", archived: true`
    And `isLiveStreamRow` answers `false` for `gamma`, `delta`, `epsilon`, `05`, `05/00` and `06`, and `true` for `10`, `10/00` and `11`
    And the items for `10` and `11` are the DISK's own rows (`dir` set, `name` set) with `answeredFrom: "cache"` and their cache status overlaid — byte-identical to what the seam answered before this task

  Scenario Outline: every cache-first reader answers a backlog slug or an archived number the owning node would answer, from a disk that has neither
    Given the same remote-node fixture
    When `<reader>` runs
    Then <answer>

    Examples: the readers and what each owes
      | reader                                       | answer                                                                                                                                              |
      | `findWorkCacheFirst(ws, "gamma")`            | exactly one row, `ref: "gamma"`, `number: null`, `backlog: ""`, `dir: null`, `answeredFrom: "cache"`                                                |
      | `findWorkCacheFirst(ws, "delta")`            | exactly one row, `ref: "delta"`, `type: "milestone"`, `backlog: "ideas"`                                                                           |
      | `findWorkCacheFirst(ws, "05")`               | exactly one row, `ref: "05"`, `archived: true`, `status: "done"`, `dir: null`                                                                       |
      | `findWorkCacheFirst(ws, "05/00")`            | exactly one row, `ref: "05/00"`, `parent: "05"`, `archived: true`                                                                                   |
      | `listStreamCacheFirst(ws)`                   | refs in order `10, 10/00, 11, gamma, delta, epsilon` — `gamma` carries `number: null, backlog: ""`; no row for `05`, `05/00` or `06`                 |
      | `listStreamCacheFirst(ws, { all: true })`    | refs in order `10, 10/00, 11, gamma, delta, epsilon, 05, 05/00, 06` — the last three each `archived: true`                                          |
      | `nextWorkCacheFirst(ws, "05")`               | `state: "done"` — an archived driver is finished, never proposed                                                                                    |
      | `nextWorkCacheFirst(ws)`                     | a `ref` that is neither `05`, `05/00`, `06` nor any backlog slug, and a `readySet` containing none of them                                          |

  Scenario Outline: the CLI on the remote node agrees with the seam, row for row
    Given the same remote-node fixture, its store selected through the fixture's `AOF_GLOBAL_HOME`
    When `aof work <argv> --json` runs as a child process from the workspace root
    Then <answer>

    Examples: the four verbs an outsider would run
      | argv          | answer                                                                                                                                                      |
      | find gamma    | one document `{ ref: "gamma", type: "chore", slug: "gamma", status: null, title: "Gamma", parent: null, dir: null, number: null, backlog: "", answeredFrom: "cache", reportedBy: "aof-wsl", syncedAt: … }` |
      | find 05       | one document with `ref: "05"`, `archived: true`, `dir: null`, `answeredFrom: "cache"`                                                                       |
      | list          | rows for `10, 10/00, 11, gamma, delta, epsilon` with the frozen seven keys on the first three, `number: null` + `backlog` on the last three, and no `answeredFrom` key (the frozen face strips it) |
      | list --all    | the same plus `05`, `05/00`, `06` each with `archived: true`, after `epsilon`                                                                                |
      | next          | a document whose `ref` is not `05`, `06` or a backlog slug                                                                                                   |

  Scenario: a checkout that still holds the folder at the root keeps its own location when the cache says archived
    Given a workspace whose disk holds `12_milestone_theta` (`status: done`) at the stream root, and a store row for `12` reported by `aof-control` with `archived: true, sourcePath: <…/archive/12_milestone_theta/SPEC.md>`
    When `findWorkCacheFirst(ws, "12")` and `listStreamCacheFirst(ws)` run
    Then the row for `12` carries `dir: <this checkout's>/12_milestone_theta`, NO `archived` key, `status: "done"` and `answeredFrom: "cache"` — location is the disk's, status is the cache's
    And the default listing includes `12` as a live done row, and `work:doctor` over this workspace reports it with no `cache-status-divergence` (status agrees) and no finding about its location
    And with the folder moved to `archive/12_milestone_theta` on this disk too, the same reads answer `archived: true` and a `dir` under `archive/` — the disk led, the cache agreed

  Scenario: the seam's own guarantees are unchanged by the two new shapes
    Given the remote-node fixture
    When `test/store/cache-read-seam.test.mjs`, `cache-read-boundary-holds.test.mjs` and `cache-read-control-leaves.test.mjs` run as focused suites
    Then every pre-existing case is green — a disk-answered row still carries `answeredFrom: "disk"` and nothing else, `withoutAnsweringSide` still strips exactly `ANSWERING_SIDE_KEYS`, and `work.mjs`'s four disk readers keep their exact return shape over a stream with no backlog and no archive
    And `src/work.mjs` imports nothing new — the seam consumes the enumerator's row shape and `isLiveStreamRow`; it re-derives neither
