@executable @cli @work @validate
Feature: A run answers with a resolution, leaves every byte of the tree where it found it, and starts nothing

  This command is a read, and not the guarded kind. There is no write path into the workspace for an
  option to open and no launch for an option to withhold, which is why the flag a reader looks for
  first is absent: a dry run advertises a wet one, and an operator who reads the help would learn
  something false about what running this can do to their repository.

  That it cannot launch is structural rather than careful, and it is worth saying plainly because a
  reasonable implementer will try. The loop has exactly one launcher, reachable only by a caller from
  outside it; a registered command that asks the registry for the loop gets a promptly-returning probe
  and drives nothing. A face that wanted to launch would have to start a process of its own or open a
  second door onto the loop's body. So this face answers with the argv, and whoever called it runs
  that argv — a crontab line, a build step, a dispatch tick.

  The claim is about the tree under report — its files, its configuration, its record of what has
  happened — and that boundary is stated rather than assumed, because machinery a read reaches on its
  way sits outside it. That exemption holds only for as long as nothing out there carries state back
  in, which is why the run-it-twice scenario below belongs to this criterion rather than sitting
  beside it as a nicety.

  A wrong implementation slips past a reading of the code rather than past a run. A path assembled
  from a variable resolves somewhere no reader can see, so the only honest proof is taken from the
  outside: list the tree and every byte of it, run the command in both renderings, list it again, and
  compare the two lists and every byte. The second honest part is running twice, because a write that
  is merely idempotent survives a single comparison and is still a write.

  The plausible wrong turns are all small and all comfortable to write. A cache of the compiled
  declaration written beside it. A note of this resolution kept so the next run can say what changed.
  A line appended to the record because something worth counting was counted. Each makes the second
  run over an unchanged tree say something the first did not.

  ADR-003 §1, §2. ADR-001 §2. ADR-008 §1, §2. FF-6303. FF-6301.

  Scenario Outline: whatever the run resolves, the tree is as it was
    Given a workspace tree and a run of the trigger face that <situation>
    When the run finishes
    Then no file in that tree exists that did not exist before it
    And no file in that tree that existed before it has changed
    And no file in that tree that existed before it has been removed

    Examples: the paths on which a writer would most plausibly appear
      | situation                                                     |
      | resolved every trigger the declaration declares               |
      | resolved the one trigger it was named on the command line     |
      | was given a signal and resolved it to a scope                 |
      | refused a trigger asking for a level the gate would not admit |
      | refused a signal naming a source that is not declared         |
      | ran over a declaration that declares no trigger at all        |
      | rendered its answer for a human reader                        |
      | rendered its answer machine-readably                          |
      | could not obtain a gate reading at all                        |
      | ran twice in succession over the same tree                    |

  Scenario: nothing accumulates between runs, inside the tree or outside it
    Given a resolution produced over a workspace tree
    When the command is run again over the same tree with nothing else changed
    Then the second run states the same resolutions and the same refusals as the first
    And no record left by the first run exists for the second to read
    And nothing written outside that tree carries state from the first run into the second

  Scenario: no configuration moves, and nothing is recorded as having happened
    Given a work tree carrying its configuration and a record of what has happened
    When a run resolves every declared trigger over it
    Then the configuration holds the values it held before the run
    And the record carries nothing the run added
    And no event is raised for the run having happened

  Scenario: the run starts nothing and schedules nothing
    Given a declaration whose triggers all resolve
    When the run finishes
    Then no process was started by it
    And no loop was entered by it
    And nothing has been scheduled to run later
    And the run returns its answer without waiting on work it started

  Scenario: what the caller is handed is what the caller runs
    Given a resolved trigger
    When its resolution is read
    Then it carries the argv that would run the loop
    And running that argv is left to the caller
    And nothing in the report claims the loop has been run

  Scenario Outline: the options this face offers, and the ones it does not
    Given a caller invoking the trigger face with <option>
    When the invocation is read
    Then it is <outcome>

    Examples: each absent option would advertise a capability that does not exist
      | option                                       | outcome                                                 |
      | machine-readable output                      | accepted, and renders the object the human face renders |
      | a trigger named on the command line          | accepted, and narrows the answer to that trigger        |
      | a signal                                     | accepted, and resolved against the declaration          |
      | a dry run                                    | refused as an option this command does not accept       |
      | strictness                                   | refused as an option this command does not accept       |
      | an instruction to run what it resolved       | refused as an option this command does not accept       |
      | an instruction to write the resolution down  | refused as an option this command does not accept       |

  Scenario: there is no dry face, because there is no wet one
    Given a caller asking the trigger face not to write
    When the invocation is read
    Then it is refused as an option this command does not accept
    And a run made without that option writes nothing into the tree either

  Scenario: no option this face accepts opens a path to running the loop
    Given a declaration whose triggers all resolve
    When a run is made with each option the face accepts, in turn
    Then no one of those runs starts a process
    And no one of those runs enters a loop
    And each of them answers with a resolution and nothing else
