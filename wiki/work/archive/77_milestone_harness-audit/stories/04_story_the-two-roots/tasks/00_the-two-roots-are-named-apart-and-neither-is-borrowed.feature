@executable @cli @work @validate
Feature: The audit finds its own programs where aof was installed, and reads its subject where it was pointed

  In this repository the workspace under audit IS the aof checkout, so the two roots are one
  directory. Every child program resolves, every register row runs, and the command is green. That
  green is not evidence — it is the single arrangement in which this defect cannot appear. What is
  owed here is a control that drives the two roots APART, which is the one shape this repository
  cannot produce on its own.

  Anywhere else neither child program exists. Every register row reports evidence-unrunnable naming a
  path that was never going to be there, the registration sweep reports
  audit-runtime-membership-unavailable for the same reason, and the sweep closes with
  evidence-none-reproduced. So `aof work audit --strict` fails in every governed project, on aof's own
  file layout, drowning whatever the rules actually found — an audit reporting that the instruments
  are broken when what is missing is the audit's own toolkit.

  So: two words, two meanings, neither borrowed. `repoRoot` keeps its meaning and is renamed nowhere.
  It is the SUBJECT root — the cited controls, the register, the runner, the suite population, the
  audited loop registry and any audited settings file. The TOOLKIT root is where aof's own programs
  live, derived once from the module's own URL.

  The prescribed fix is only half of one, and the measurement is why. Deriving a root cannot find a
  file that was never shipped: the payload is a copy of `src/` and carries no `scripts/` directory at
  all, so a derived root still misses a driver living under `scripts/`. The derivation is necessary
  and it is not sufficient — the sibling task moves the program to where the copy goes.

  One derivation, one home. A second module deriving a root for the same purpose is how two roots
  quietly become three, and how the next reader learns that either word may mean either thing. That
  is reported by a gate rather than watched for by a reviewer.

  What this does not do, stated so the omission reads as a decision: it does not re-home the bounded
  spawn seam, and it adds no new caller of it.

  ADR-002 §1, §2, §2a, §3. FF-7706. TECH_DEBT 70, 72.

  Scenario Outline: with the two roots apart, every child program comes from the toolkit root
    Given a toolkit root and a subject root that are different directories
    When the audit runs the lane that starts <program>
    Then the path it started resolves under the toolkit root
    And no path it started resolves under the subject root

    Examples: every program the family starts, driven with the roots apart
      | program                                             |
      | the suite probe the census points at a runner       |
      | the control driver the evidence lane points at a control |

  Scenario Outline: with the two roots apart, the subject is not dragged along with the toolkit
    Given a toolkit root and a subject root that are different directories
    When the audit locates <input>
    Then it resolves under the subject root
    And it does not resolve under the toolkit root

    Examples: everything the subject root has always meant
      | input                                                    |
      | the runner the census points its child at                |
      | a control a register row cites                           |
      | the register that row was read from                      |
      | the suite population the census walks                    |
      | the item population the scope resolves against           |
    And any settings file, loop registry or register the audit reads from the workspace under audit is located against the subject root, whatever else changed

  Scenario Outline: the toolkit root has one derivation and one home
    Given <planted> planted in a module of ours
    When the source tree is read for a derivation of the toolkit root
    Then the planted derivation is reported by the file that holds it
    And with nothing planted exactly one derivation is found, in one file

    Examples: the ways a root grows a second home
      | planted                                                                          |
      | a second module deriving a root from its own module URL to locate aof's programs |
      | a family module computing the toolkit root inline instead of calling the one home |
      | a second exported name for the same root                                          |

  Scenario Outline: no module in the family joins a program path onto the subject root
    Given <planted> planted in a module of the audit family
    When the family is read for a program path joined onto the subject root
    Then the planted join is reported by the file that holds it
    And with nothing planted no such join is found

    Examples: the joins that make the toolkit borrow the subject's root
      | planted                                                                     |
      | a join of the suite probe's path onto the subject root                      |
      | a join of the control driver's path onto the subject root                   |
      | a resolve of a program path against the subject root defaulting to the cwd  |
      | a join of a third program's path onto the subject root                      |

  Scenario: where the two roots coincide the audit's answer does not move
    Given a workspace under audit that is itself the aof checkout, so the two roots are one directory
    When the audit is run with every child program resolved from the toolkit root, and again with every one resolved from the subject root
    Then the findings, their codes, their severities, their paths and their order are identical
    And the read records, their counts and their floors are identical
    And the stated limits are identical
    And the two answers are equal field for field

  Scenario Outline: a governed project that is not an aof checkout gets an audit of its own instruments
    Given a governed workspace carrying an ACD bundle, a fitness register and its own controls, and no aof source tree of its own
    When the audit runs over it
    Then <lane> starts its child program from the toolkit root
    And no finding it reports names aof's own child program at a path under that workspace
    And <outcome>

    Examples: the two lanes that start a child, and what each answers once its program is found
      | lane              | outcome                                                                  |
      | the evidence lane | the rows it read carry a verdict produced by an execution                |
      | the census        | registration is decided for the suites it walked rather than left undecided |

  Scenario Outline: `repoRoot` keeps its meaning and is renamed nowhere
    Given the audit family after the two roots are named apart
    When <site> is read
    Then the value it holds is the workspace under audit
    And it is still called `repoRoot` there

    Examples: the sites that carry the subject root
      | site                                                        |
      | the census lane's own parameter                             |
      | the evidence lane's own parameter                           |
      | the call that resolves a cited control                      |
      | the call that resolves the runner                           |
      | the working directory each child is started in              |
