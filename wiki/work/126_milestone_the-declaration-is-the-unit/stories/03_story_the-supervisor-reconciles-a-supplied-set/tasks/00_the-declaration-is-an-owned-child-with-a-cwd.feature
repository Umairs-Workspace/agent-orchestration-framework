@executable @ui @distribution @adapter
Feature: The declaration is an owned child with a cwd — the supervised child gains an id, owned strings and a working directory, and the poll parses declarations additively

  `SupervisedChild { label: &'static str, argv: Vec<&'static str> }`
  (`app/desktop/crates/core/src/supervision.rs:17-30`) can only name the two mesh daemons; a row
  from the poll has owned strings and a working directory. `MeshStatus`
  (`app/desktop/crates/core/src/status.rs:188-210`) parses `nodes`, `boards` (`#[serde(default)]`,
  and typed `Vec<serde_json::Value>` because the app interprets none of it — `:192-193`) and
  `is_control_node`; serde skips unknown keys, and `#[serde(default)]` is the house idiom for an
  additive one. `supervision_set(is_control_node)` (`supervision.rs:36-42`) is the `match` the
  milestone SPEC says must go — superseded, in the open, by a set composed from the two statically
  seeded daemons plus the rows the poll supplies. The two daemons keep their constructors.

  THE SHAPE ON THE WIRE IS 126/02's, AND IT IS AN OBJECT. `--declarations` adds exactly one key,
  `declarations`, whose value is `{ rows, skipped }` — `rows` the declaration rows, `skipped` the
  resolver's unreadable-workspace list, which the supervisor reads not at all and must not choke on
  (126/02 `tasks/03`). A parser that expected `declarations` to BE the array would read zero rows
  forever against the real producer, which is the failure this line exists to prevent. Each row's
  key set is exactly `id`, `label`, `argv`, `cwd`, `scope`, `level` and `cap`.

  A row is spawnable or it is not a row. `id`, `argv` and `cwd` are REQUIRED — an unaddressable row
  can be neither started nor stopped, an argv-less row has nothing to spawn, and a `cwd`-less one
  would inherit the supervisor's own launch directory, which under login autostart is TECH_DEBT
  item 4's measured `C:\WINDOWS\system32` shape (ADR-005 §5). `label`, `scope`, `level` and `cap`
  are display-only and optional. A supplied argv must be a `work loop` argv: ADR-006 §8's roster is
  the SOURCE-level allow-list of four verbs, and a supplied argv is data no Node source sweep can
  see, so the runtime admission is made here — at the parse, in the core crate, where `cargo test`
  reaches it — and nowhere else. A declaration is a loop, so the runtime gate admits `["work",
  "loop", …]` and nothing else; it is narrower than the source roster, not a second copy of it.
  A row that fails any of this is dropped from the set; the rest of the document survives it.

  ONE STRUCT, ONE GATE, AND HOW THAT IS BUILDABLE. Serde's derive cannot drop a bad element, and a
  second wire-shaped struct beside `SupervisedChild` is the duplication this task forbids — so the
  admitted idiom is the one `boards` already uses: carry the rows opaquely (`#[serde(default)]`,
  `serde_json::Value`), and project them through ONE filtering accessor on the parsed document, the
  way `Node::session_line_parts()` (`status.rs:157-169`) already projects a filtered view. That
  accessor is the parse's gate and the only gate; nothing downstream re-tests a row.

  WHERE EACH STEP IS OBSERVED. Steps about VALUES — the constructors, the composed set, the parse,
  the surviving/dropped rows — are `cargo test` in `crates/core`, which is the only Rust lane that
  runs (`scripts/test.mjs:183-215`). Steps that begin "the Rust source" are the Node sweep over
  `app/desktop/**/*.rs` with comments stripped (FF-12606's own leg,
  `test/arch/ui/acd-desktop-supervises-a-supplied-set.test.mjs`).

  What would quietly undo this: a `Declaration` struct beside `SupervisedChild` (two shapes for one
  thing); the daemons re-derived from `is_control_node` inside the new function; a parser that
  fails the whole `mesh status` document when `declarations` is absent OR when one row is
  malformed, so the fleet view goes blank on an older aof or on one bad row; a parser that reads
  `declarations` as the array rather than as `{ rows, skipped }`; a row's `cwd` dropped on the way
  to the child; and a second admission rule at the spawn, so a refused row has two homes.

  ADR-006 §1, §8. ADR-005 §3, §5, §7. 36/ADR-002. FF-12606.

  Scenario: a child carries an id, owned strings and an optional working directory
    Given the core crate's supervised-child type
    When the two daemon constructors are called
    Then each returns an owned child with its reserved id — `mesh-serve` and `mesh-ui` — its existing label and argv, and no working directory
    When a child is built from a declaration row
    Then it carries the row's id, label, argv and `cwd`
    And the Rust source carries no second struct describing a supervised child

  Scenario: the set is composed, not matched
    Given the two seeded daemons and three declaration rows from a parsed status
    When the supervised set is composed
    Then it holds the daemons first and the three declarations after them, in row order
    And the Rust source selects no supervised set by matching on `is_control_node`

  Scenario: the fleet document is never lost to the new key
    Given a `mesh status --json` document with no `declarations` key at all
    When it is parsed
    Then the parse succeeds and the declaration set is empty
    And `nodes`, `boards` and `is_control_node` read exactly as they do today
    And the same holds for a document whose `declarations` is `{ "rows": [], "skipped": [] }`
    And the same holds for a document whose `declarations` carries only a non-empty `skipped`

  Scenario Outline: which supplied rows become declarations
    Given a `mesh status --json` document whose `declarations.rows` carries one well-formed row and one row <row>
    When it is parsed
    Then the parse succeeds and `nodes`, `boards` and `is_control_node` read as they do today
    And the declaration set holds <rows> row(s)

    Examples: rows that survive
      | row                                       | rows | why                                                        |
      | carrying an extra unknown key             | 2    | serde ignores it — the additive-growth idiom, unchanged    |
      | with no `label`                           | 2    | display only; the child can label itself from its argv     |
      | with no `scope`, no `level` and no `cap`  | 2    | display only, and the supervisor interprets none of them   |
      | whose `cwd` contains spaces               | 2    | a path is a value, not a command line                      |

    Examples: rows that are dropped, the rest of the document surviving
      | row                                       | rows | why                                                        |
      | with no `id`                              | 1    | unaddressable — it could be neither started nor stopped    |
      | with no `argv`                            | 1    | there is nothing to spawn                                  |
      | with an empty `argv`                      | 1    | no verb at all, so nothing an allow-list admits            |
      | whose argv is `["work","tune","62"]`      | 1    | a declaration is a loop; the runtime gate admits `work loop` alone |
      | whose argv is `["mesh","serve","--serve"]` | 1   | the daemons are seeded, never supplied (ADR-005 §7)        |
      | with no `cwd`                             | 1    | it would inherit the supervisor's own directory (ADR-005 §5) |
      | whose `argv` is a string, not an array    | 1    | one ill-typed row is dropped, never a failed document      |

  Scenario: a dropped row is dropped once, at the parse
    Given a document whose only rows are one with an empty argv and one with no `cwd`
    When it is parsed and the supervised set is composed
    Then the set is exactly the two seeded daemons
    And the Rust source re-tests no row's argv or `cwd` after the parse — the parse is the one gate
