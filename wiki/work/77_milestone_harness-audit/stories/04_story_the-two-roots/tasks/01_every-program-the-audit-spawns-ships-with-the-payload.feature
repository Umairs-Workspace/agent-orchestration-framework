@executable @cli @work @validate
Feature: Every program the audit starts lives where the payload carries it, and one enumeration knows them all

  Deriving a toolkit root is half the fix, and the half that cannot work alone. A payload install is a
  copy of `src/` and nothing else of the source tree — the live install has no `scripts/` directory at
  all. A root derived from the module's own URL still points at a directory the driver was never
  copied into, so the program has to move to where the copy goes.

  `src/work-audit-probe.mjs` is the exact precedent and already travels. Its whole job is the dynamic
  import the family may not hold, which is why it is a PROGRAM the family starts rather than a module
  the family loads — the same reason, and the same home, the driver now takes.

  The move closes an enumeration hole as a side effect, and the closure is claimed rather than hoped.
  The discovery half of the spawned-program rule skips a named path that does not resolve under
  `src/`, on the stated ground that the runner the census points a child at is an arbitrary SUBJECT.
  A program under `scripts/` therefore falls to nobody: it may start children of its own, be imported
  by the family, or vanish entirely, and the gate stays green through all three. A program under
  `src/` is inside that discovery and belongs in the family's spawned-program enumeration — one home
  again, and no program discoverable by nobody.

  The fixture is where the change is proved, not merely exercised. Today it plants a real copy of the
  driver inside the fixture repository, at the path the subject root resolves. Once the driver comes
  from the toolkit, a fixture repository with NO driver in it is the honest test — and the fixture's
  purpose is preserved exactly as it was written: a real driver runs, never a stand-in.

  Behaviour does not move with the file. The driver produces the same verdicts, the same compared
  messages and the same case counts as before; only its home changed. Anything else would be a second
  change riding an intended one.

  One seam, still. Every child comes from the one bounded spawn — an argument vector, never a shell,
  with a deadline always. This task adds no second route and no new caller, and it does not re-home
  the seam itself; that omission is a decision, not an oversight.

  ADR-002 §2, §2a, §3. FF-7706. TECH_DEBT 70, 72.

  Scenario Outline: every program the family starts is carried by the payload
    Given a payload install, which is a copy of `src/` and carries no `scripts/` directory
    When the family starts <program>
    Then the path it started resolves under `src/`
    And that path is present in the payload install
    And the program runs from there rather than from the workspace under audit

    Examples: every program the family can start
      | program                                                  |
      | the suite probe the census points at a runner            |
      | the control driver the evidence lane points at a control |

  Scenario Outline: every program the family starts is named in one enumeration
    Given <planted> planted
    When the family's spawned-program enumeration is read against the programs the family starts
    Then the planted case is reported, naming the file that holds it
    And with nothing planted every program the family starts is named in the enumeration, and each is on disk

    Examples: the ways an enumeration stops knowing its own population
      | planted                                                              |
      | a program under `src/` the family starts and the enumeration omits   |
      | a program the enumeration names that is not on disk                  |
      | a program the enumeration names that a family module imports         |
      | a program the enumeration names that starts a child of its own       |

  Scenario Outline: the moved driver produces the evidence result it produced before the move
    Given a register row citing <control>
    When the evidence lane re-runs it with the driver at its new home
    Then <unchanged>
    And the finding it yields carries the same code and the same severity as before the move

    Examples: the outcomes the driver produces, held fixed across the move
      | control                                | unchanged                                                       |
      | a control whose cases all pass         | the verdict, the observed case count, and the absence of a message |
      | a control that fails with a known message | the verdict and the exact message the comparison was given   |
      | a control that outlives its deadline   | the deadline outcome, the bound it names, and the command attempted |
      | a control whose path resolves to nothing | the unrunnable outcome and the path it reports having tried   |

  Scenario: the evidence fixture plants no driver in the subject repository, and a real driver still runs
    Given a fixture repository built for the evidence lane
    When the evidence lane runs over it
    Then the fixture repository contains no copy of the control driver
    And the program that ran is the shipped driver resolved from the toolkit root
    And it is a real driver rather than a stand-in
    And the lane's results over that fixture are the results it produced while the driver sat inside it

  Scenario Outline: a governed project's audit closes on what it found, not on aof's own layout
    Given a governed workspace that is not an aof checkout, carrying a fitness register and its own controls
    When the audit runs over it and <case>
    Then neither evidence-unrunnable nor evidence-none-reproduced is reported for want of aof's own driver
    And the evidence lane's answer is decided by <decided by>

    Examples: what the evidence lane answers once the toolkit is found
      | case                                              | decided by                                     |
      | every cited control reproduces its recorded result | those reproductions, and no finding is raised  |
      | one cited control contradicts its recorded result  | that contradiction, named                      |
      | one cited control is absent from that workspace    | that workspace's own missing control, named    |
      | no register row cites any control                  | there being no rows to close a sweep over      |

  Scenario: the toolkit root is not the whole of what stops a strict audit elsewhere
    Given a governed workspace that is not an aof checkout
    When the audit runs over it with every child program resolved from the toolkit root
    Then no finding names aof's own child program at a path beneath that workspace
    And every remaining error-severity finding is about that workspace's own population rather than aof's file layout, and each one names what it swept, the count it got and the floor it missed

  Scenario Outline: the change opens no second route to a child process
    Given <planted> planted in a module of the audit family
    When the family is read for a route to a child process
    Then the planted route is reported by the file that holds it
    And with nothing planted every child the family starts comes from the one bounded seam

    Examples: the second spawn routes that must not exist
      | planted                                                            |
      | a second call to the platform's process-starting API               |
      | an import of the process module by a family module other than the seam |
      | a synchronous child-starting call anywhere in the family's closure  |
      | a child started with a command line for a shell rather than an argument vector |

  Scenario: the one seam starts a child by argument vector, never a shell, and always under a deadline
    Given a program the family starts
    When it is started
    Then it goes through the one bounded seam
    And it is given an argument vector rather than a command line for a shell
    And a deadline is armed whatever the caller supplied, including nothing, zero or a negative
    And a child that outlives its deadline is killed, and the result names the bound and what was attempted

  Scenario Outline: a program the payload does not carry cannot be named as a spawn target
    Given a spawn target named at <path>
    When the family is asked to start it
    Then it is <reported>

    Examples: where a spawn target may and may not live
      | path                                               | reported                                                          |
      | under `src/`, carried by the payload               | started, resolved from the toolkit root                           |
      | under `scripts/`, which the payload does not carry | refused, naming the path and the reason, and never silently attempted |
      | outside the toolkit root entirely                  | refused, naming the path and the reason, and never silently attempted |
      | under `src/` but absent from disk                  | not started, naming the command attempted and why it did not start |
    And a spawn target the payload does not carry is reported by the gate that reads the family, whether or not one is ever named
