@executable @cli @work @validate
Feature: validate checks that a backlog item's slug edge names a backlog item, and that the backlog's slug edges form no cycle

  WHY VALIDATE, AND WHY NOW. Until this story a backlog item's `depends:` was a planning note that
  validate never read (127/01 task 03), because nothing wrote edges between backlog items: an
  entry naming a backlog slug was refused at promotion. Shatter now writes them in batch, one PRD
  at a time, and its own step says the validate that follows must be green. A slug edge has two
  failure modes nothing else reports in time. A TYPO (`gama`) is found only when the dependent is
  promoted, as `promote-depends-unresolved`. A CYCLE is never resolvable: each item on it waits on
  another item on it, so every promote on the cycle is refused `promote-depends-backlog` for ever.

  THE RULE — ONLY THE NEW KIND OF EDGE IS CHECKED. On a backlog row (`number: null`), an entry that
  is not all digits is a slug edge, split by the one predicate task 02 lands.

    resolves   it equals the slug of a backlog row, exactly. A leaf at any group depth counts.
    dangling   anything else. The finding names the entry. When a numbered row that a
               `depends:` may name (`isDependTarget` — live or archived, never a nested story)
               carries that slug, it also says how the edge is written:
               `depends "<entry>" names no backlog item — "<entry>" is <NN> in the stream, so the edge is written <NN>`
               and otherwise:
               `depends "<entry>" names no backlog item — an edge to another backlog item is its slug, and an edge to a stream item is its number`
    cycle      the resolved slug edges of the backlog, keyed by slug, must be acyclic. One
               finding per stream, `depends cycle: a → b → a` — the same prefix as the driver
               and sibling cycles — filed at `<work>/backlog`, whatever the validate scope. The
               graph is built in slug order, so the same backlog always names a cycle the same way.

  A NUMERIC entry on a backlog row is still unchecked. It is the operator's note, the shift engine
  keeps it current, and promotion checks it — so every row of 127/01 task 03's delivered outline
  keeps its answer. The backlog graph is a SEPARATE graph, as the per-parent story graphs are: no
  backlog row joins the driver graph, no key is `NaN`, and `nextWork` and the doctor depends lane
  (whose census is over scheduled edges) do not see a backlog slug edge at all.

  Findings keep validate's `{ path, problem }` shape. A dangling entry is filed at its source's
  record doc. `src/work.mjs` gains no import, and the string `intake` stays out of it (FF-12704).
  Cases land on `test/work/stream/work-backlog-archive-enumerate.test.mjs`, beside 127/01 task 03's.

  What would quietly undo this: resolving a slug edge against every row's slug rather than the
  backlog's (a live `alpha` would then satisfy it); folding backlog nodes into the driver graph;
  checking numeric backlog entries (127/01's delivered rows would go red); filing the cycle at a
  scoped item so `aof work validate 10` loses it.

  Scenario Outline: a slug entry on a backlog row must name a backlog item
    Given the three-root fixture, with <source> declaring `depends: <depends>`
    When `validateWork` runs
    Then it reports <finding>

    Examples: 127/01's delivered backlog rows keep their answer, and a dangling slug is new
      | source                                     | depends       | finding                                                                                                                                  | why                                                   |
      | `backlog/ideas/milestone_delta/SPEC.md`    | [gamma]       | nothing                                                                                                                                  | a slug naming a backlog item — 127/01's row, still    |
      | `backlog/chore_gamma/CHORE.md`             | [delta, 05]   | nothing                                                                                                                                  | 127/01's row, still — a number on a backlog row is not checked |
      | `backlog/ideas/milestone_delta/SPEC.md`    | [99]          | nothing                                                                                                                                  | 127/01's row, still                                   |
      | `backlog/ideas/milestone_delta/SPEC.md`    | [11]          | nothing                                                                                                                                  | 127/01's row, still                                   |
      | `backlog/ideas/milestone_delta/SPEC.md`    | [epsilon]     | nothing                                                                                                                                  | a leaf two groups deep resolves                       |
      | `backlog/ideas/milestone_delta/SPEC.md`    | [gama]        | `depends "gama" names no backlog item — an edge to another backlog item is its slug, and an edge to a stream item is its number`         | the typo a batch author makes (headline)              |
      | `backlog/ideas/milestone_delta/SPEC.md`    | [alpha]       | `depends "alpha" names no backlog item — "alpha" is 10 in the stream, so the edge is written 10`                                          | a live item is named by its number                    |
      | `backlog/ideas/milestone_delta/SPEC.md`    | [zeta]        | `depends "zeta" names no backlog item — "zeta" is 05 in the stream, so the edge is written 05`                                            | an archived item too                                  |
      | `backlog/ideas/milestone_delta/SPEC.md`    | [alpha-one]   | the generic message, naming `alpha-one`                                                                                                  | a nested story is never a `depends:` target           |
      | `backlog/ideas/milestone_delta/SPEC.md`    | [Gamma]       | the generic message, naming `Gamma`                                                                                                      | exact is exact                                        |
      | `backlog/ideas/later/spike_epsilon/SPIKE.md` | [gamma, gama] | the generic message naming `gama`, once, and nothing for `gamma`                                                                       | each entry is judged alone                            |

  Scenario: a cycle among backlog slug edges is reported once, at the backlog root
    Given the three-root fixture, with delta declaring `depends: [gamma]`, gamma `depends: [epsilon]` and epsilon `depends: [delta]`
    When `validateWork` runs
    Then it reports exactly one cycle finding, `depends cycle: delta → gamma → epsilon → delta`, at `<work>/backlog`
    And `aof work promote delta`, `aof work promote gamma` and `aof work promote epsilon` are each refused `promote-depends-backlog`

  Scenario Outline: a cycle is reported whatever the scope and whatever its length
    Given the three-root fixture, with <edges>
    When `aof work validate <scope> --json` runs
    Then it reports the finding `depends cycle: <cycle>` at `<work>/backlog`

    Examples:
      | edges                                                  | scope | cycle                   | why                                         |
      | delta declaring `depends: [delta]`                     | delta | delta → delta           | a self-edge is a cycle of one               |
      | delta declaring `depends: [gamma]`, gamma `[delta]`    | 10    | delta → gamma → delta   | a stream-level fact survives a scoped run   |

  Scenario: a resolved slug edge is not a scheduling edge
    Given the three-root fixture, with delta declaring `depends: [gamma]`
    When `aof work next --json` runs and the doctor depends lane runs
    Then `next` answers exactly what it answers without the edge
    And the depends lane's four census counts are those it reports without the edge

  Scenario: a target leaves the backlog by promotion or by deletion, never by archiving
    Given the three-root fixture, with delta declaring `depends: [gamma]`
    When `aof work archive gamma --json` runs
    Then it is refused with code `archive-backlog-ref`, and `backlog/chore_gamma` is still in the backlog
    When `backlog/chore_gamma` is deleted and `validateWork` runs
    Then it reports the generic dangling message naming `gamma`, at `backlog/ideas/milestone_delta/SPEC.md`
    And `aof work promote delta --json` is refused with code `promote-depends-unresolved`, naming `gamma`
