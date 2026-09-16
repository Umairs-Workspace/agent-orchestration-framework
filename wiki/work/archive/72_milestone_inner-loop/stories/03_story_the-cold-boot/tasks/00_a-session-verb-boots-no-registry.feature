@executable @cli @work @work-stream
Feature: A session verb loads what a session verb needs

  A presence ping fires on every prompt an operator types. It writes a small record and exits. What it
  costs today is the entire command surface: importing the registry pulls all 88 command modules, and
  that import alone is 324–351 ms of the CLI's 363–384 ms — against 150 ms for the whole process when
  only the session module is loaded.

  So the claim is structural and narrow: the registry is not in the static import closure of the CLI
  entry, nor of the session module. The face module goes with it, for the same reason and no other —
  it reaches the registry, and it measures the same. The workspace module stays exactly where it is —
  16 ms, and moving it would be churn dressed as a fix — so the walk that must not find the registry
  must still find that one, which is also what stops an empty walk from passing.

  A lazy import is the trap here. Deferring the registry behind a dynamic import satisfies a closure
  walk and changes nothing at runtime if the hot path then awaits it: the same 88 modules, the same
  milliseconds, a different spelling. So the dynamic import is not forbidden — it IS the fix — and what
  is enumerated instead is where it may sit: never in the session module's closure, and never awaited
  before the session arm has dispatched. Today the route table is resolved above that arm, so hoisting
  it is half the change and not a tidy-up.

  What this feature deliberately does NOT assert is a duration. A wall-clock leg reds on a slow machine
  and proves nothing about the tree; the milliseconds above are the evidence for the decision, not the
  test. Its absence is asserted, so the next author reaching for a timing assertion finds a stated
  reason instead of a gap.

  ADR-005 §1, §2. FF-7205.

  Background:
    Given a static import closure is what an entry reaches by following its static relative imports recursively, wherever those modules live, and never by sweeping a directory

  Scenario Outline: what a static import closure may and may not reach
    Given <entry>
    When its static import closure is walked
    Then the <module> is <verdict> that closure

    Examples: the closure matrix — the two modules that reach the registry, out of both closures
      | entry              | module           | verdict     |
      | the CLI entry      | command registry | absent from |
      | the CLI entry      | face module      | absent from |
      | the session module | command registry | absent from |
      | the session module | face module      | absent from |

    Examples: the two-sided rows — what the same walk must still find, so an empty walk cannot pass
      | entry              | module           | verdict    |
      | the CLI entry      | workspace module | present in |
      | the CLI entry      | session module   | present in |
      | the session module | workspace module | present in |

  Scenario: the walk is transitive, not a read of the entry's own import list
    Given a module the entry reaches only through an intermediate import
    When the closure is walked
    Then that module is reported in the closure

  Scenario Outline: where a dynamic import of the registry may sit
    Given a dynamic import of the registry <placed>
    When the control runs
    Then it <verdict>

    Examples: the lazy-import matrix — a deferred registry costs the same once the hot path awaits it
      | placed                                                      | verdict                     |
      | in the session module                                       | fails, naming that module   |
      | in a module the session module's closure reaches            | fails, naming that module   |
      | in the CLI entry, awaited before the session arm dispatches | fails, naming the CLI entry |
      | in the CLI entry, on a dispatch arm below the session arm   | passes                      |
      | in the CLI entry, inside the help listing                   | passes                      |

  Scenario: the session arm is dispatched before any registry use
    Given the command-line entry module
    When its dispatch order is read
    Then the session arm is positioned above every use of the registry
    And no route is resolved before the session arm has dispatched

  Scenario Outline: each session verb still does what it did before
    Given "<verb>" invoked the way an editor hook invokes it, with <identity> resolved
    When it runs
    Then it <outcome>
    And it reports success

    Examples: the session-verb behaviour matrix — the three verbs, unchanged by this story
      | verb  | identity                   | outcome                                                   |
      | start | workspace, repo, assistant | records an open session for that assistant and repo       |
      | ping  | workspace, assistant       | refreshes the last-seen time of that assistant's session  |
      | end   | workspace, assistant       | removes only its own session leaf, leaving siblings alone |

  Scenario Outline: the refusals a session verb made before, it still makes
    Given a session verb invoked as <invocation>
    When it runs
    Then it refuses with code "<code>"
    And no session record is written

    Examples: the refusal matrix — the boundaries the verb already owned
      | invocation                               | code                          |
      | no verb at all                           | invalid-input                 |
      | a verb that is not start, ping or end    | unknown-subcommand            |
      | an option the verb does not declare      | invalid-input                 |
      | "ping" with no workspace resolvable      | session-arg-missing-workspace |
      | "start" with no repo resolvable          | session-arg-missing-repo      |
      | a hook payload whose cwd is no workspace | session-cwd-not-workspace     |

  Scenario Outline: this control asserts no wall-clock duration
    Given this control's own source
    When it is read for <spelling>
    Then none is found

    Examples: the timing spellings this control must not contain
      | spelling                                      |
      | a clock reading                               |
      | an elapsed-time subtraction                   |
      | a comparison of a measured duration to a bound |
