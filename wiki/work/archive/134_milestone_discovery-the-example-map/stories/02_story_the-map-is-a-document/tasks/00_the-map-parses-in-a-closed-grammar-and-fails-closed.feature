@executable @cli @work @validate
Feature: The example map parses in one closed grammar, and anything it does not admit is reported, never skipped

  WHY. ADR-001 puts a story's example map in a sibling `EXAMPLES.md`, written by an agent and read
  by code: the doctor lane (04), the continue door (04) and the discovery prose (05) all judge the
  same text. They can only agree if ONE pure module reads it. `parseExampleMap(text)` in
  `src/work-examples/map.mjs` is that module. It takes the text and returns a frozen value, and it
  reads no file, no config and no clock. The grammar is closed: a misspelt label such as
  `[confirmd]` is a malformed line the gate reports, never a line the parser drops (ADR-001 §2). A
  question whose class the grammar does not admit reads as `business` (ADR-004 §2a), so a typo can
  only make the gate stricter.

  The grammar, as ADR-001 §2 writes it: a rule is the heading `## R<n> · <the rule>`; under it,
  an example is `- E<n> · <real values> → <observable outcome> [<provenance>]`, where the
  provenance is `proposed`, `confirmed` or `stated Q<n>`; the one `## Questions` section holds
  `- Q<n> · <class> · <state> · <the question>`, where the class is `business` or `technical` and
  the state is `open`, `asked`, `answered` or `defaulted <pointer>`. A story with no rules to map
  has a body of the one line `Not applicable: <reason>.` An optional frontmatter block and one
  `# ` title line may precede the body.

  RULINGS (QA, 2026-09-24).
  (1) The field separator is ` · ` (U+00B7, one space either side). Labels, classes, states and
      the `Questions` heading are exact and case-sensitive.
  (2) A line is known by its marker: `## R`, `- E` or `- Q` followed by a digit, `## Questions`,
      or `Not applicable:`. A line with no marker, or whose id is not followed by ` · ` (a ` - `
      or pipe separator), is `unknown-line`.
  (3) Ids are `R<n>`, `E<n>`, `Q<n>`, n a positive integer with no leading zero (`E0` and `E01`
      are `bad-id`). Ids are unique across the whole map, so E numbering is map-wide; a later use
      of an id is `duplicate-id`.
  (4) Admitted beside the grammar, and read as nothing: blank lines; one frontmatter block fenced
      by `---` from line 1 (contents not checked); one `# ` title before the first rule; whole-line
      comments and multi-line `<!-- -->` blocks (contents not read). An unclosed fence or comment
      is `unknown-line` on its opener, and the lines after it parse as body. Every other line,
      a second title and a heading such as `## Notes` included, is `unknown-line`.
  (5) An example's text is the rest of the line after its id; the text before its provenance is
      non-empty (else
      `unknown-line`) and ends in exactly one bracketed provenance (else `bad-provenance`). The
      `→` is not checked: whether the wording holds real values is the review's judgement. The
      provenance is the line's LAST bracketed group; a bracket earlier in the text is text,
      unless it holds a provenance label, when the line is `bad-provenance` (two labels are never
      read as one) (PO, 2026-09-24).
      `[stated Q<n>]` naming no question in the map is `stated-names-no-question`, and the example
      still reads `stated Q<n>`.
  (6) A question is read by position: id, class, state, then the text (the rest of the line, which
      may itself hold ` · `, and may be empty: an empty question is still a question, so it is
      never dropped from the gate). A class not admitted reads `business` (`bad-class`); a state not
      admitted reads `open` (`bad-state`). `defaulted` takes exactly one pointer token, and bare
      `defaulted` is `bad-state`. `defaulted <pointer>` on a business question parses clean.
  (7) Placement is judged first, then the fields left to right, and a line reports ONE entry, for
      its first failure. A malformed line yields no parsed item, except a `bad-class` or
      `bad-state` question (read fail closed) and a `stated-names-no-question` example.
  (8) `## Questions` appears at most once; a second is `duplicate-section`, and the questions after
      it still parse. Rules may follow it. An example outside a rule is `misplaced-example`; a
      question outside the Questions section is `misplaced-question`.
  (9) Not applicable is a body of exactly one line `Not applicable: <reason>`, the reason
      non-empty (a trailing period is part of it, and optional), else `bad-not-applicable`. With
      any rule, example or question it is `not-applicable-with-rules`, and `notApplicable` is
      null. A body with no rule, question, declaration or other malformed line is one `empty-map`
      entry, at the text's last line (a final newline adds none), or line 1 for the empty text.
  (10) An entry is `{ line, text, reason }`: the 1-based line of the original text and the line as
      written, in line order. The reasons are the frozen `MALFORMED_REASONS`, exactly and in this
      order: `unknown-line`, `bad-id`, `duplicate-id`, `bad-provenance`, `stated-names-no-question`,
      `bad-class`, `bad-state`, `misplaced-example`, `misplaced-question`, `duplicate-section`,
      `bad-not-applicable`, `not-applicable-with-rules`, `empty-map`.
  (11) A value that is not a string throws `TypeError`; every string returns. CRLF reads as LF.

  Background:
    Given `parseExampleMap`, the frozen arrays `PROVENANCE`, `QUESTION_STATES` and `QUESTION_CLASSES`, and the string `EXAMPLES_DOC` are imported from `src/work-examples/map.mjs`
    And every map text below is held in memory, and no file is written or read

  Scenario: the vocabularies are exactly the ones ADR-001 and ADR-004 name, and frozen
    When the three exported arrays and `EXAMPLES_DOC` are read
    Then `PROVENANCE` deep-equals `["proposed", "confirmed", "stated"]`
    And `QUESTION_STATES` deep-equals `["open", "asked", "answered", "defaulted"]`
    And `QUESTION_CLASSES` deep-equals `["business", "technical"]`
    And each array is frozen, and `ruled` is in none of them
    And `EXAMPLES_DOC` is the string `EXAMPLES.md`, the one spelling of the map's file name in the source tree

  Scenario: the malformed reasons are a closed, frozen vocabulary
    Given `MALFORMED_REASONS` is imported from `src/work-examples/map.mjs`
    When it is read
    Then it deep-equals the thirteen reasons of ruling (10), in that order, and it is frozen
    And every reason any scenario in this feature reports is one of them

  Scenario: a well-formed map parses into its rules, examples and questions, with line numbers
    Given the map text in ADR-001 §2: one rule R1 with examples E1 `[proposed]`, E2 `[confirmed]` and E3 `[stated Q1]`, and a `## Questions` section holding Q1 `business · answered`, Q2 `business · open` and Q3 `technical · defaulted ADR-004`
    When `parseExampleMap` parses it
    Then the value has one rule, `R1`, carrying its sentence and the three examples in order
    And E3's provenance is `stated`, naming the question `Q1`, and E1's and E2's name no question
    And the three questions carry their class, their state, and for Q3 the pointer `ADR-004`
    And every rule, example and question carries the 1-based line of the file it was read from
    And `malformed` is empty, `notApplicable` is null, and the whole value is deeply frozen

  Scenario Outline: an example's provenance label is read exactly, and anything else is malformed — <label>
    Given a map whose one rule holds the example line `- E1 · a loan in arrears → not offered <label>`, and whose `## Questions` section holds `- Q1 · business · answered · who may borrow?`
    When `parseExampleMap` parses it
    Then the example's provenance reads <provenance>
    And `malformed` holds <malformed>

    Examples:
      | label                    | provenance           | malformed |
      | `[proposed]`             | `proposed`           | nothing   |
      | `[confirmed]`            | `confirmed`          | nothing   |
      | `[stated Q1]`            | `stated`, Q1         | nothing   |
      | `[confirmd]`             | none: not an example | one entry for the line, reason `bad-provenance` |
      | `[Proposed]`             | none: not an example | one entry for the line, reason `bad-provenance` |
      | `[ruled]`                | none: not an example | one entry for the line, reason `bad-provenance` |
      | `[stated]`               | none: not an example | one entry for the line, reason `bad-provenance` |
      | `[stated Q]`             | none: not an example | one entry for the line, reason `bad-provenance` |
      | `[stated Q01]`           | none: not an example | one entry for the line, reason `bad-provenance` |
      | `[proposed] [confirmed]` | none: not an example | one entry for the line, reason `bad-provenance` |
      | `[proposed].`            | none: not an example | one entry for the line, reason `bad-provenance` |
      | an empty label           | none: not an example | one entry for the line, reason `bad-provenance` |
      | `[stated Q9]`            | `stated`, Q9         | one entry for the line, reason `stated-names-no-question` |
      | `[draft] [proposed]`     | `proposed`, text keeping `[draft]` | nothing |

  Scenario Outline: a question's class fails closed to business — <line>
    Given a map with one rule, one example and the `## Questions` line <line>
    When `parseExampleMap` parses it
    Then the question reads class <class> and state <state>
    And `malformed` holds <malformed>

    Examples:
      | line                                                    | class      | state                          | malformed |
      | `- Q1 · technical · open · which seam?`                 | `technical`| `open`                         | nothing   |
      | `- Q1 · policy · answered · who pays?`                  | `business` | `answered`                     | one entry, reason `bad-class` |
      | `- Q1 · Business · answered · who pays?`                | `business` | `answered`                     | one entry, reason `bad-class` |
      | `- Q3 · answered · who pays?`                           | `business` | `open`                         | one entry, reason `bad-class` |
      | `- Q1 · business - open - who pays?`                    | `business` | `open`                         | one entry, reason `bad-class` |
      | `- Q1 · business · asked · who pays?`                   | `business` | `asked`                        | nothing   |
      | `- Q1 · business · Answered · who pays?`                | `business` | `open`                         | one entry, reason `bad-state` |
      | `- Q1 · technical · defaulted ADR-004 · which seam?`    | `technical`| `defaulted`, pointer `ADR-004` | nothing   |
      | `- Q1 · business · defaulted ADR-004 · who pays?`       | `business` | `defaulted`, pointer `ADR-004` | nothing   |
      | `- Q1 · technical · defaulted · which seam?`            | `technical`| `open`                         | one entry, reason `bad-state` |
      | `- Q1 · technical · defaulted ADR-004 §2 · which seam?` | `technical`| `open`                         | one entry, reason `bad-state` |
      | `- Q1 · business · open · who pays · and when?`         | `business` | `open`, text `who pays · and when?` | nothing |

  Scenario Outline: a line the grammar does not admit is reported with its line and a reason — <case>
    Given a map text that is well formed except for <case>
    When `parseExampleMap` parses it
    Then `malformed` holds exactly one entry, carrying the offending line's 1-based number, its text and the reason <reason>
    And every well-formed line around it still parses

    Examples:
      | case                                              | reason                     |
      | a one-line prose paragraph under a rule           | `unknown-line`             |
      | an example line before the first rule             | `misplaced-example`        |
      | two examples both numbered E2, under two rules    | `duplicate-id`             |
      | an example `[stated Q9]` in a map with no Q9      | `stated-names-no-question` |
      | a second `# ` title line after the first          | `unknown-line`             |
      | a `## Notes` heading after the questions          | `unknown-line`             |
      | a `---` line after the first rule                 | `unknown-line`             |
      | a `<!--` opener after the last line, never closed | `unknown-line`             |
      | a second `## Questions` heading holding one more question | `duplicate-section` |
      | an example line under `## Questions`              | `misplaced-example`        |
      | a question line before the first rule            | `misplaced-question`       |

  Scenario Outline: an id or a separator the grammar does not admit is reported — <line>
    Given the map of the rule `## R1 · a loan in arrears is not offered`, its example `- E1 · active loan, two payments in arrears → not offered [proposed]`, and a `## Questions` section holding `- Q1 · business · answered · who may borrow?`
    And the line <line> is inserted <where>
    When `parseExampleMap` parses it
    Then `malformed` holds exactly one entry, carrying the inserted line's number, its text and the reason <reason>

    Examples:
      | line                                          | where               | reason               |
      | `## R0 · a second rule`                       | after the questions | `bad-id`             |
      | `- E01 · two loans → not offered [proposed]`  | under R1            | `bad-id`             |
      | `- E01 · two loans → not offered [confirmd]`  | under R1            | `bad-id`             |
      | `- Q01 · business · open · who pays?`         | under Questions     | `bad-id`             |
      | `## R1 · the same rule again`                 | after the questions | `duplicate-id`       |
      | `- Q1 · technical · open · which seam?`       | under Questions     | `duplicate-id`       |
      | `- E2 - two loans → not offered [proposed]`   | under R1            | `unknown-line`       |
      | `- E2 \| two loans → not offered [proposed]`  | under R1            | `unknown-line`       |
      | `- E2 · [proposed]`                           | under R1            | `unknown-line`       |
      | `## r2 · a second rule`                       | after the questions | `unknown-line`       |
      | `## questions`                                | after the questions | `unknown-line`       |
      | `not applicable: a rename`                    | after the title     | `unknown-line`       |
      | `- Q2 · policy · open · who pays?`            | under R1            | `misplaced-question` |

  Scenario Outline: a line the grammar admits beside the map is read as nothing — <case>
    Given the map of R1, E1 and Q1 above, with <case>
    When `parseExampleMap` parses it
    Then `malformed` is empty
    And its rules, examples and questions are those of the map without it, line numbers apart

    Examples:
      | case                                                                        |
      | a blank line between every two lines                                        |
      | a frontmatter block holding `owner: [not, checked]`                         |
      | no frontmatter and no title                                                 |
      | the whole-line comment `<!-- one rule per heading -->` under R1             |
      | a three-line comment block holding `## Notes` and `- E9 · x [confirmd]`     |

  Scenario: a rule may follow the Questions section, and a stated example may name a question above it
    Given the map of the lines `## Questions`, `- Q1 · business · answered · who may borrow?`, `## R1 · a loan in arrears is not offered` and `- E1 · active loan, two payments in arrears → not offered [stated Q1]`, in that order
    When `parseExampleMap` parses it
    Then R1 holds E1, whose provenance is `stated`, naming the question `Q1`
    And `malformed` is empty

  Scenario Outline: the one-line not-applicable map — <case>
    Given a map whose body, after the frontmatter and the title, is <body>
    When `parseExampleMap` parses it
    Then `notApplicable` reads <notApplicable>
    And `malformed` holds <malformed>

    Examples:
      | case                     | body                                                     | notApplicable                        | malformed |
      | the declaration alone    | `Not applicable: a rename with no rule a person owns.`   | the reason `a rename with no rule a person owns.` | nothing |
      | the declaration and a rule | the declaration, then `## R1 · a rule` with one example | null                                 | one entry for the declaration, reason `not-applicable-with-rules` |
      | no trailing period       | `Not applicable: a rename`                               | the reason `a rename`                | nothing |
      | an empty reason          | `Not applicable:`                                        | null                                 | one entry for the declaration, reason `bad-not-applicable` |
      | a blank reason           | `Not applicable:   `                                     | null                                 | one entry for the declaration, reason `bad-not-applicable` |
      | the declaration and a question | the declaration, then `## Questions` holding `- Q1 · business · open · who pays?` | null | one entry for the declaration, reason `not-applicable-with-rules` |
      | prose alone              | `This story has no rules.`                               | null                                 | one entry for the prose, reason `unknown-line`, and no `empty-map` |

  Scenario Outline: a map with nothing in it is one empty-map entry — <text>
    Given the map text <text>
    When `parseExampleMap` parses it
    Then `malformed` holds exactly one entry, reason `empty-map`, at line <line>
    And `notApplicable` is null and there are no rules and no questions

    Examples:
      | text                                                                                 | line |
      | the empty string                                                                     | 1    |
      | `---`, `doc: examples`, `---` and `# 134/02 · Example map`, with a final newline    | 4    |
      | that frontmatter and title, a blank line and `<!-- write the map here -->`           | 6    |

  Scenario Outline: a value that is not a string is refused — <value>
    When `parseExampleMap` is called with <value>
    Then it throws a `TypeError`

    Examples:
      | value                             |
      | `undefined`                       |
      | `null`                            |
      | `42`                              |
      | a `Buffer` of a well-formed map   |

  Scenario: parsing is total and pure
    Given any string, including the empty string, a text with CRLF line endings and a text of only a frontmatter block
    When `parseExampleMap` parses it twice
    Then it returns a value both times and never throws, and the two values deep-equal
    And a text with CRLF line endings parses to the same value as the same text with LF endings
    And the source of `src/work-examples/map.mjs` has no `import` statement at all
