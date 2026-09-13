@executable @docs @work @work-stream
Feature: The two actor nodes — the exogenous root, and the agent role that is not ground

  The day-one registry's two `kind: actor` records. `loops/operator.md` carries the arc's single
  `ground: exogenous` marker — the human owns which things are worth controlling — and
  `loops/product-owner.md` carries no `ground:` key at all, because an agent role is not contact
  with reality. Both are records of declared content: what the file says, not how the loader reads
  it. Admission is KIND-SCOPED (ADR-011 §3): an actor record admits `id`, `kind`, `title`, `ground`
  and the five edge keys and nothing else; a `kind: loop` record admits the seven control fields and
  never `ground:`. Either violation is `loop-key-not-admitted-for-kind` (error) — not
  `loop-unknown-key`, and never silence — and the shipped registry triggers none.
  ADR-005 §1, ADR-004 §2, ADR-010 rows 8-9, ADR-011 §3 and §5, ADR-012 §6/F3 (which pins the
  product-owner edge set closed and the operator edge set only to its cited floor — the rest is
  OQ-1, deliberately open until the record is authored).

  Scenario: the operator record declares the exogenous root
    Given the day-one registry authored under <work.dir>/loops/ (here wiki/work/loops/)
    When I read loops/operator.md
    Then it declares id "actor:operator"
    And it declares kind "actor"
    And it declares a one-line title
    And it declares ground "exogenous" — the only value ADR-005 admits in this milestone

  Scenario: the operator is the only ground-bearing node in the registry
    Given the nine records under <work.dir>/loops/
    When I collect every record that declares a `ground:` key
    Then the collection holds exactly one record
    And that record is loops/operator.md
    And no record whose kind is "loop" declares a `ground:` key
    And a `ground:` on a `kind: loop` record would be `loop-key-not-admitted-for-kind` (error, ADR-011 §3), so the shipped registry reports that code zero times

  Scenario: the product-owner record declares no ground at all
    Given the day-one registry under <work.dir>/loops/
    When I read loops/product-owner.md
    Then it declares id "actor:product-owner"
    And it declares kind "actor"
    And it declares a one-line title
    And the key `ground:` is absent from the record — not "ground: unknown", not any other value
    And its prose body states why the key is absent: an agent role is not exogenous ground

  Scenario: neither actor node carries the loop-only control fields
    Given loops/operator.md and loops/product-owner.md
    When I read every frontmatter key each declares
    Then neither declares controlled, reference, measurement, actuator, cadence, ceiling, owner or optimizing
    And the only keys either declares are id, kind, title, ground (operator only) and edge keys
    And a control field on either actor would be `loop-key-not-admitted-for-kind` (error, ADR-011 §3) — the symmetric case of `ground:` on a loop, under one rule
    And neither substitutes a sentinel for a field its kind does not admit: no "cadence: unknown", no "owner: unknown", no "ceiling: none" on an actor

  Scenario: every target-setting edge the operator declares is defended in its prose body
    Given loops/operator.md declares one or more `target-setting` endpoints
    When I read the record's prose body
    Then every declared endpoint is named in the body
    And every declared endpoint carries a `path:line` or `RESEARCH §` citation for why the operator sets that reference
    And no endpoint is declared that the body does not cite — a fabricated edge is the same failure as a fabricated owner
    And the declared set contains at least `loop:autonomous-cascade` — the floor ADR-012 §6/F3 pins, the one exogenous target-setting act this repo evidences: the operator chooses the range the cascade drives
    And every endpoint beyond that floor carries its own `path:line` citation in the body, and an endpoint the body cannot cite is not declared
    And no endpoint is declared in order to raise the registry's grounded-component count — on day one most components are ungrounded and that is the correct output (ADR-012 §6/F3)
    And every edge list either actor declares carries at least one endpoint — `[]` is `loop-empty-list` (error, ADR-011 §5), and a node with no edges of a type omits the key entirely

  Scenario: the product-owner's edge set is exactly the one relation RESEARCH cited
    Given loops/product-owner.md
    When I read every edge key it declares
    Then it declares `target-setting` with exactly one endpoint, loop:verify-triage-accept
    And it declares no second `target-setting` endpoint
    And it declares no `data-feed`, `monitoring`, `veto` or `parameter-tuning` edge at all
    And its prose body cites src/bundle/commands/verify.md:92 for that single edge — the PO triages findings, and verify-triage-accept is the only one of the seven loops with a named owner
    And the record declares no edge to any of the other six loops, all of which stay ungrounded from this node (ADR-012 §6/F3)

  Scenario: the product-owner record exists because a loop names it
    Given the nine records under <work.dir>/loops/
    When I collect every `owner:` value that is not "unknown"
    Then the collection holds exactly one value, "actor:product-owner"
    And it is declared by loops/verify-triage-accept.md, citing src/bundle/commands/verify.md:92
    And loops/product-owner.md is the record that value names, so the owner names no absent node

  Examples:
    | record                       | declared id         | kind  | `ground:` key       | what the row encodes                          |
    | loops/operator.md            | actor:operator      | actor | present — exogenous | the arc's single ground node (ADR-005 §1)     |
    | loops/product-owner.md       | actor:product-owner | actor | absent              | an agent role is not contact with reality     |
    | each of the seven loops/*.md | loop:<file stem>    | loop  | absent              | `ground:` is admitted on `kind: actor` only   |

  Examples:
    | frontmatter key                                                     | on `kind: actor`            | on `kind: loop` | what the shipped registry declares                   |
    | id · kind · title                                                   | required                    | required        | present on all nine records                          |
    | ground                                                              | optional — `exogenous` only | NOT admitted    | present on loops/operator.md only                    |
    | controlled · reference · measurement · actuator                     | NOT admitted                | required        | absent from both actors, present on all seven loops  |
    | cadence · ceiling · owner · optimizing                              | NOT admitted                | required        | absent from both actors, present on all seven loops  |
    | the five edge keys                                                  | optional                    | optional        | declared only where the prose body cites the relation |
    | a key admitted for the OTHER kind                                   | loop-key-not-admitted-for-kind (error) | loop-key-not-admitted-for-kind (error) | 0 occurrences  |
    | a key outside the global union                                      | loop-unknown-key (error)    | loop-unknown-key (error) | 0 occurrences                               |

  Examples:
    | actor node          | `target-setting` endpoints                                    | other edge keys | pinned how                                        |
    | actor:product-owner | exactly [loop:verify-triage-accept]                           | none declared   | closed set — ADR-012 §6/F3                        |
    | actor:operator      | at least [loop:autonomous-cascade], each further one cited    | none declared unless the body cites it | floor only — the rest is OQ-1, open until authoring |
