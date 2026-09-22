@executable @cli @work @work-stream
Feature: One live-row predicate decides which walkers filter, and the resolving readers do not

  With task 00 a row may be un-numbered (backlog) or archived. The SPEC names which readers keep
  seeing archived rows and which stop; without one home for that rule each "what is next" walker
  would grow its own filter, and they would drift. `src/work.mjs` exports `isLiveStreamRow(row)` ⇔
  `row.number != null && row.archived !== true` (ADR-002 §1) — defined over ENUMERATOR rows, which
  always carry `number`. It is the only place the two flags are read as a scheduling question.

  Who walks the stream to answer "what is next", re-read at the source rather than taken from
  ADR-002 §2's list — one entry is corrected here, in this authoring beat:

    nextWork                 src/work.mjs:1347 — `drivers = items.filter(isDriver)` (`:1349`) is the
                             walk; `dependTargets` (`:1357`) is NOT filtered through the predicate — an
                             archived dependency is `done` and satisfies the edge; it carries only the
                             `number != null` guard FF-12702 requires (`:1362` parses `d.number`).
    listStream (default)     src/work.mjs:946 — `--all` includes the archive; backlog rows are in the
                             DEFAULT listing ("what is live" includes what is waiting), sorted after
                             the live rows by group path then slug; archived rows last, by number
                             (ADR-002 §5). `src/work/read.mjs:317` threads the option; `src/commands/
                             list.mjs` gains the `--all` flag (input `all: boolean`).
    recent                   src/bundle/commands/recent.md — a PROMPT whose step 1 today says
                             "Enumerate top-level items (folders `NN_type_slug`)": its own walk. It
                             enumerates through `aof work list --json` instead, and so inherits the
                             predicate.
    the loop                 NOT `src/work/loops.mjs` — that file is the loop DECLARATION registry
                             (`.aof/loops/*.md`, `loadLoops` `:940`) and never enumerates a work item.
                             The loop shell reaches the stream only through registered commands —
                             `work:next` (`src/commands/loop.mjs:919`) and `work:list` (`:796`, `:803`)
                             — both of which pass through the predicate; `src/commands/loop.mjs`
                             imports only `loadWorkspace` from `work.mjs` and `src/work/loop.mjs`
                             imports nothing from it. It is covered by those two legs and asserted to
                             stay that way.

  The resolving readers do NOT filter on `archived` (ADR-002 §3): `findWork` (`:878`), `read`, `doc`,
  `memory ingest` (`src/memory/local-indexing.mjs` — its `items` are `listItems`'s), depends
  resolution (`siblingGate`, `doctor-depends`), `validateWork`, `doctor`. `findWork` resolves a
  backlog slug through its existing free-text branch (`:908-914`) — no new grammar.

  THE ROW SHAPES `listStream` AND `findWork` EMIT — decided here because eight suites freeze the
  seven-key row `{ ref, type, slug, status, title, parent, dir }` (m03/ADR-002; `acd-work-list-contract`
  and seven more) and DESIGN.md §facts and ADR-006 §1 already assume the widening: a live row keeps
  exactly the seven keys, byte-identical to today; a backlog row carries the seven PLUS `number: null`
  and `backlog: "<group>"`; an archived row carries the seven PLUS `archived: true`. Nothing else
  changes on any row, and no consumer learns a second field name.

  What would quietly undo this: a `.filter(r => !r.archived)` in `findWork` (the red probe); a
  status-based exclusion (`status === "done"`) standing in for the predicate — an archived row is
  invisible to `next` regardless of its status; `list --all` implemented in the command face over
  the seven-key row rather than in `listStream`; a `number` key appearing on a live row.

  ADR-002 §1, §2, §3, §5. FF-12706.

  Scenario: the predicate has one home and one truth table
    Given `src/work.mjs`
    When `isLiveStreamRow` is called over enumerator rows
    Then a root row (`number: "10"`, no `archived`) is live
    And a backlog row (`number: null`) is not live
    And an archived row (`number: "05", archived: true`) is not live
    And no other src file reads `.archived` as a scheduling question — the token `.archived` appears in `src/**` only in `src/work.mjs`, and there only inside the bodies of `isLiveStreamRow`, `listItems`, `listStream` and `findWork` (nothing in src carries it today)

  Scenario Outline: the predicate over every combination of the two flags
    Given an enumerator row whose `number` is <number> and whose `archived` is <archived>
    When `isLiveStreamRow` is asked
    Then it answers <live>

    Examples: number present or null × archived absent, true or false
      | number | archived | live  | why                                                        |
      | "10"   | absent   | true  | a root driver                                              |
      | "00"   | absent   | true  | `"00"` is a string, not a falsy number — row `00` exists   |
      | "10"   | false    | true  | only `=== true` archives                                   |
      | "05"   | true     | false | an archived driver                                         |
      | null   | absent   | false | a backlog row                                              |
      | null   | true     | false | both flags — never enumerated, still not live              |
      | null   | false    | false | the number decides before the flag                         |
      | absent | absent   | false | `!= null` is loose: a row with no `number` key is not live |

  Scenario: next never proposes a backlog row or an archived row, whatever its status
    Given the three-root fixture, with `archive/06_chore_eta` set to `not-started`
    When `nextWork` walks the whole stream
    Then the ready set names `10/00` and `11`, in that order
    And it names neither `delta` (a backlog milestone with no stories, which the pre-story walk would offer as "needs break-down") nor `gamma`, `epsilon`, `05` or `06`
    And `06` is absent because it is archived, not because of its status

  Scenario: an archived dependency satisfies the edge it is named in
    Given the three-root fixture, where `11_chore_beta` declares `depends: [05]` and `05` is archived and `done`
    When `nextWork` walks the stream
    Then `11` is ready, not blocked
    And `aof work next --json` over the same fixture reports the same ready set, so the face adds no filter of its own

  Scenario Outline: an edge is scored by its target's status, wherever the target lives
    Given the three-root fixture, with `11_chore_beta` declaring `depends: <depends>` and <target>
    When `nextWork` walks the whole stream
    Then `11` is <state>

    Examples: an archived target, a backlog slug, and the unchanged live case
      | depends | target                       | state                      | why                                                                    |
      | [05]    | `05` archived, `done`        | ready                      | the headline                                                           |
      | [06]    | `06` archived, `not-started` | blocked, waiting on `06`   | the archive is a location, not a status — the target's own status gates |
      | [gamma] | `gamma` a backlog chore      | blocked, waiting on `gamma` | a slug resolves no number; validate reports the edge (task 03)        |
      | [10]    | `10` live, `in-progress`     | blocked, waiting on `10`   | unchanged                                                              |
      | []      | none                         | ready                      | unchanged                                                              |

  Scenario: the default listing holds the live rows and the backlog, and --all adds the archive
    Given the three-root fixture
    When `listStream` is called with no option
    Then its rows are, in order, `10`, `10/00`, `11`, then `gamma`, `delta`, `epsilon`
    And no row from `archive/` is present
    When `listStream` is called with `all: true`
    Then its rows are those six followed by `05`, `05/00`, `06`
    And `aof work list --json` and `aof work list --all --json` emit exactly those two arrays, byte-stable across two runs

  Scenario Outline: the mixed listing sorts live by number, backlog by group path then slug, archived by number
    Given the three-root fixture, plus <added>
    When `listStream` is called with `all: true`
    Then the refs after `10`, `10/00`, `11` are exactly <tail>
    And the default call answers the same rows with every `archive/` row removed
    And the group path and the slug are compared as plain strings in code-point order — `<` on the two strings, never `localeCompare` — so `--json` is byte-identical on every OS and locale

    Examples: each added leaf lands where the rule puts it, and nowhere else
      | added                                            | tail                                            | why                                                                          |
      | nothing                                          | gamma, delta, epsilon, 05, 05/00, 06            | the headline: "" before `ideas` before `ideas/later`; the archive by number  |
      | backlog/ideas/chore_apple                        | gamma, apple, delta, epsilon, 05, 05/00, 06     | same group, by slug — the type plays no part                                 |
      | backlog/chore_aardvark                           | aardvark, gamma, delta, epsilon, 05, 05/00, 06  | the root group precedes every named group; within it, by slug               |
      | backlog/zzz/milestone_aaa                        | gamma, delta, epsilon, aaa, 05, 05/00, 06       | group path before slug: `zzz` after `ideas/later` although `aaa` sorts first |
      | backlog/ideas/early/uat_omega                    | gamma, delta, omega, epsilon, 05, 05/00, 06     | `ideas/early` before `ideas/later`                                           |
      | archive/03_chore_old                             | gamma, delta, epsilon, 03, 05, 05/00, 06        | archived by number, after every backlog row however low the number           |
      | archive/20_milestone_omega/stories/00_story_last | gamma, delta, epsilon, 05, 05/00, 06, 20, 20/00 | an archived milestone is followed by its stories, as a live one is           |

  Scenario: the row shapes are the frozen seven, widened only where the root is new
    Given the three-root fixture
    When `listStream(…, { all: true })` and `findWork` are read
    Then every row for `10`, `10/00` and `11` has exactly the keys `ref, type, slug, status, title, parent, dir`
    And the row for `delta` has those seven plus `number: null` and `backlog: "ideas"`, with `ref: "delta"` and `parent: null`
    And the row for `05` has those seven plus `archived: true`, with `ref: "05"` and `dir` under `archive/`
    And `test/arch/work/acd-work-list-contract.test.mjs` and `test/store/cache-read-boundary-holds.test.mjs` pass unchanged

  Scenario: find, read and depends resolution see all three roots as one stream
    Given the three-root fixture
    When `findWork` is asked for `05`, `05/00`, `delta` and `gamma`
    Then each answers exactly one row, and the answer for `05` carries `archived: true` with its `status: "done"` read from the archived SPEC
    And `aof work doc 05 SPEC --json` and `aof work doc delta SPEC --json` each answer from the row's `dir` — the "read" the SPEC names is this verb
    And `siblingGate` and the doctor depends lane resolve `depends: [05]` on `11` as satisfied
    And `memory ingest` over the fixture indexes `archive/05_milestone_zeta/RETROSPECTIVE.md` under `item: "05"`

  Scenario Outline: findWork resolves every ref form over the three roots through the grammar it already has
    Given the three-root fixture
    When `findWork` is asked for `<ref>`
    Then it answers <count> rows, whose refs are exactly <refs>

    Examples: number, pair, span and free text, over live, backlog and archived rows
      | ref             | count | refs              | why                                                                      |
      | 05              | 1     | 05                | a bare number resolves an archived driver, `archived: true`              |
      | 5               | 1     | 05                | leading zeros are not identity, as today                                 |
      | 05/00           | 1     | 05/00             | the pair form over an archived story                                     |
      | 05/00-00        | 1     | 05/00             | the span form over an archived milestone                                 |
      | 06              | 1     | 06                | an archived chore                                                        |
      | delta           | 1     | delta             | a backlog slug through the free-text branch, `number: null`, `backlog: "ideas"` |
      | gam             | 1     | gamma             | free text is a substring                                                 |
      | milestone_delta | 1     | delta             | the folder `name` matches too, as at the root                            |
      | zeta            | 2     | 05, 05/00         | `zeta-one` contains `zeta` — as `alpha` answers `10, 10/00` today        |
      | eta             | 4     | 11, 05, 05/00, 06 | `beta`, `zeta`, `zeta-one`, `eta` — the substring rule is unchanged      |
      | ideas           | 0     | none              | a group is not a row and not a ref form                                  |
      | ideas/delta     | 0     | none              | no new grammar: a group-qualified ref matches nothing                    |
      | 07              | 0     | none              | no root holds that number                                                |

  Scenario: recent enumerates through the listing, not through its own walk
    Given `src/bundle/commands/recent.md`
    When its process section is read
    Then step 1 runs `aof work list --json` (and `--all` when the operator asks for the archive) rather than enumerating `NN_type_slug` folders
    And the string `NN_type_slug` no longer appears as an enumeration instruction in the file

  Scenario: the walkers reference the predicate and the loop has no walk of its own
    Given the arch-test `test/arch/work/acd-next-walkers-exclude-archived.test.mjs`, registered in `test/arch/work/index.mjs`
    When it reads the source and drives the three-root fixture
    Then `nextWork` and `listStream`'s default path each reference `isLiveStreamRow` textually
    And `src/commands/loop.mjs` and `src/work/loop.mjs` import none of `listItems`, `listStream`, `findWork` or `nextWork` from `src/work.mjs`, so the loop's only views of the stream are the registered `work:next` and `work:list`, which filter
    And `findWork`, `validateWork` and `src/work/doctor.mjs` contain no `archived` filter
    And driven over the fixture, `nextWork` and the default `listStream` return no archived row while `findWork("05")` returns one with `archived: true`
    And the control passes at HEAD

