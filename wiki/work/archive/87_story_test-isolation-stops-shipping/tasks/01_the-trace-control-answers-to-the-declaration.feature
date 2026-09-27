@executable @cli @assets @distribution
Feature: The trace control answers to the declaration, never to a census of what happened to ship

  THE CONTROL WAS PINNED TO A LITERAL ITS OWN INVARIANT NEVER CLAIMED. 55/FF-5505 reads: no
  framework-authored rule exists at any enforcement point without a member declaring it. What its
  arch-test actually asserts is that the compiled hook set is non-empty and that the first hook in it
  carries one named member's id — a census of the set that shipped, not the universal the register
  declares. Withdraw the only hook member and the control breaks loudly, which is correct and is
  where this task starts.

  THE TEMPTING REPAIR IS THE ONE SPIKE 82 EXISTS TO CATCH. Relaxing the assertion to "every compiled
  hook traces to a member" is vacuously true over an empty set: the control would go green, report
  as enforced, and hold nothing. A control that cannot distinguish "nothing violated this" from
  "there was nothing to check" is worse than no control, because a register entry says it is armed.

  THE REPAIR IS TO DERIVE THE EXPECTATION FROM THE DECLARATION. An enforcement point no member names
  compiles to nothing and is asserted to compile to nothing; a point a member does name must produce
  output carrying that member's id. The control then binds the moment anyone declares a hook member
  again, without anybody remembering to re-arm it — which is the property the pinned literal never
  had, since it would have gone on asserting one withdrawn id forever.

  A DECLARATION WITH NO HOOK MEMBER MUST NOT MEAN A COMPILER WITH NO HOOK PATH. The hook branch — its
  marker, its surgical splice into a co-authored settings file, its retraction when the member leaves,
  its coded tamper — was only ever exercised through whatever the bundle happened to ship. It is now
  exercised through a hook-shaped member built for the purpose, so the coverage stays with the
  compiler that owns the behaviour rather than with a declaration that may change under it. That is
  the leg keeping the compiler honest for the next hook member anyone declares.

  THE CENSUS CONTROLS ARE RE-MEASURED, NOT SOFTENED. Three of them enumerate exact sets: the member
  ids in order, the ids that reached an enforcement point, and the file count of the bundle tree.
  Each has now been moved three times by a legitimate change and the note in the third one argues its
  own case — the tripwire firing is it working. Moving a literal to the new truth keeps the tripwire;
  relaxing it to a lower bound throws it away, and this task does the former in all three.

  ADR-004 IS NOT REOPENED. Declaring-without-compiling is already the frozen set's own pattern: the
  worker launch envelope is declared, reported as deferred, and honest about compiling to nothing.
  What changes is that a point with no member at all becomes as legible as one that is declared and
  deferred, instead of being invisible.

  55/ADR-004. 55/FF-5505.

  Scenario: every compiled rule still traces to the member that declared it
    Given the declaration the framework ships
    When it is compiled
    Then every rule produced at every enforcement point carries the id of the member that declared it
    And no rule is produced at any enforcement point that no member declared

  Scenario: an enforcement point no member names compiles to nothing, and the control says so
    Given a declaration in which no member names the tool-call hook enforcement point
    When it is compiled
    Then no hook entry is produced
    And the control reports that point as named by no member rather than as satisfied

  Scenario: a declared hook member compiles, is marked, and retracts with its declaration
    Given a declaration carrying one hook-shaped member and a settings file with an operator's own entries
    When it is compiled into that settings file
    Then exactly one hook entry appears, carrying its member's id
    And the operator's entries at the same event survive in their own positions
    And removing that member from the declaration removes exactly that entry and nothing else

  Scenario: editing a compiled hook member is still a tamper with a name
    Given a settings file whose framework-owned hook entry has been edited
    When the declaration is compiled again
    Then the change is reported as a tamper carrying the member's id
    And an entry whose ownership marker was removed is left to its operator instead

  Scenario: the census controls read the withdrawn set and stay exact
    Given the controls that enumerate the declaration's members, the ids that reached an enforcement point, and the bundle's file count
    When each is read
    Then each asserts an exact set or an exact count rather than a lower bound
    And each reads the set that ships after the withdrawal

  Scenario Outline: red probe — the re-aimed control fails on every way a trace can break
    Given <planted defect>
    When the control runs
    Then it fails, reporting <what it names>

    Examples: one row per enforcement point, plus the anti-vacuity leg the re-aim exists for
      | planted defect                                              | what it names                                            |
      | a compiled hook stripped of its member id                   | a rule at an enforcement point that no member declared   |
      | a compiled permission denial stripped of its member id      | the same untraced rule, at the second compiled point     |
      | a compiled agent tool scope stripped of its member id       | the same untraced rule, at the third compiled point      |
      | a hook member present in the declaration and absent from the compiled output | a declared member that reached no enforcement point |
      | an empty compiled hook set while a member names that point  | a declared hook member that compiled to nothing          |
      | a member id added to the declaration and not to the census  | the census literal disagreeing with the declaration      |
