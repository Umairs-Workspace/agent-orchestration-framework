@executable @cli @work @work-stream
Feature: A story's declared write set supplies the changed set, beside git and never instead of the selector

  Milestone 72 shipped the selector, and this story adds an input to it. `selectSuites` decides which
  suites run; `src/work-test-changed.mjs` produces the changed set from git through one bounded seam;
  `aof test --scope impacted|file|all` is the face, and it refuses an absent scope rather than
  defaulting one. This story adds a second producer beside the git one — a story's own `files:` — and
  calls the selector unchanged.

  The declaration is the right input because it is already machine-readable, already checked by
  `validate`, and already consumed by `ready-wave.mjs`; this makes it pay for a third time. It must
  not come from prose, and it must not be enumerated at refine, because the architect cannot name the
  test files the developer is about to write.

  The set is read through the existing parser — `storyContractList` and `resolveStoryContractPath` —
  and never through a second parse of frontmatter. There are three homes for that declaration today
  and adding a fourth reader is how they start to disagree about a comment on an entry, a backslash
  path, or an anchored citation.

  Two changed-set sources in one run is two answers, so `--story` and `--since` are mutually
  exclusive. Picking one silently would be a narrowing chosen by the tool, which is the one thing this
  family forbids. And a `--story` naming an unresolvable ref is a REFUSAL naming it — never an empty
  changed set, which would render as "nothing affected" and select nothing.

  What would quietly undo this: reading `files:` with a fresh regex; accepting a story ref and
  resolving it by slug so a typo runs the wrong story's suites; and treating a story with an empty
  `files:` as a story with no impact rather than as a story whose declaration says nothing.

  ADR-007 §1, §2, §4. FF-9604.

  Scenario: the declared write set becomes the changed set
    Given a story whose `files:` names two source modules
    When `aof test --scope impacted --story <ref>` runs
    Then the changed set handed to the selector is those two modules
    And no git command is invoked to produce it

  Scenario: the declaration is read through the existing parser
    Given the module producing the declared changed set
    When it is examined
    Then it reads the story's declaration through the shipped contract parser
    And it holds no second parse of frontmatter

  Scenario Outline: the declaration's own parsing quirks are inherited, not re-decided
    Given a story whose `files:` entry is <entry>
    When the declared changed set is produced
    Then it is <outcome>

    Examples: one parser, so one answer per shape
      | entry                                  | outcome                                            |
      | a plain path in a block list           | included                                           |
      | a plain path in an inline list         | included                                           |
      | a path followed by a YAML comment      | included, with the comment excluded from the path  |
      | a path written with backslashes        | refused with the parser's own message              |

  Scenario Outline: two sources are refused, and an unresolvable one is named
    Given the invocation <invocation>
    When `aof test` runs
    Then it <outcome>

    Examples: a refusal, never a silently chosen source
      | invocation                                        | outcome                                                   |
      | `--scope impacted --story <ref>`                  | selects from the story's declared set                     |
      | `--scope impacted --since <rev>`                  | selects from git's changed set                            |
      | `--scope impacted --story <ref> --since <rev>`    | is refused, naming both sources                           |
      | `--scope impacted --story <unresolvable ref>`     | is refused, naming the ref                                |
      | `--scope file --story <ref>`                      | is refused: `--story` narrows the impacted scope only     |

  Scenario: a story whose declaration is empty says so
    Given a story whose `files:` is empty
    When `aof test --scope impacted --story <ref>` runs
    Then it is refused as an empty changed set
    And no runner is launched
    And the refusal is distinguishable from a run that selected nothing

  Scenario: the ref resolves exactly, never by slug guess
    Given a story ref that is a near-miss for an existing story's slug
    When `aof test --scope impacted --story <ref>` runs
    Then it is refused
    And no other story's declaration is used
