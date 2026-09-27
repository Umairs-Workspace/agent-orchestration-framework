@executable @cli @work @work-stream
Feature: The registry stops saying "uncapped", and a ceiling that points at nothing is a finding

  The loop registry already models this exactly right. `ceiling:` is one of the eight control keys,
  its grammar is closed, and `loop-ceiling-uncapped` already reports an uncapped declaration. Two
  framework records answer `uncapped` today — `build-to-green` and `review-fix-rereview` — and the
  finding is a `warn` gating nothing, which is the honest state for a registry describing a runtime
  that genuinely had no bound.

  This task is the other half: the runtime gets bounds (this story's siblings), so the records stop
  describing an unbounded one. Build-to-green's ceiling becomes the failure-to-progress rule rather
  than an iteration count — the success terminator "all scenarios green" already exists and is
  correct; what was missing was a FAILURE bound.

  The records are FRAMEWORK records: their source is `src/bundle/loops/*.md` and they are installed
  by `aof work update`. They are edited in aof, never in the installed copy, and per-project values
  go behind a `config:` pointer rather than being restated as numbers.

  The second half of this contract exists because a pointer is only a declaration if it resolves. A
  `ceiling:` naming a config key nothing reads is indistinguishable from `uncapped` at runtime and
  strictly worse in a review, because it reads as answered.

  ADR-001. FF-6902.

  Scenario: no framework loop record declares an uncapped ceiling
    Given every loop record the framework ships
    When their ceilings are read
    Then none of them is uncapped

  Scenario: the build loop's ceiling is a progress rule, not an iteration count
    Given the build-to-green record
    When its ceiling is read
    Then it points at the failure-to-progress authority
    And it does not restate a numeric round count

  Scenario: the review loop's ceiling points at the configured round count
    Given the review-fix-rereview record
    When its ceiling is read
    Then it points at the config key that carries the round count
    And the number itself appears in the config authority, not in the record

  Scenario: a ceiling pointing at a config key nothing resolves is refused
    Given a loop record whose ceiling names a config key with no resolver
    When the registry is validated
    Then a finding is reported against that record
    And the finding names the unresolvable pointer

  Scenario Outline: the ceiling grammar, and which forms count as declared
    Given a loop record whose ceiling reads <ceiling>
    When the registry is validated
    Then it is <verdict>

    Examples: the closed grammar, with this milestone's addition
      | ceiling                              | verdict                                  |
      | none                                 | declared — the pass terminates by construction |
      | a config pointer that resolves       | declared                                 |
      | a module pointer that resolves       | declared                                 |
      | uncapped                             | reported — nothing bounds it             |
      | unknown                              | reported — nothing was found             |
      | a config pointer that resolves to nothing | reported — it reads answered and is not |

  Scenario: an installed project inherits resolved ceilings
    Given a workspace with the framework records freshly installed
    When the registry is validated in that workspace
    Then no uncapped-ceiling finding is reported against a framework record
    And a record the project authored itself is judged by the same rule
