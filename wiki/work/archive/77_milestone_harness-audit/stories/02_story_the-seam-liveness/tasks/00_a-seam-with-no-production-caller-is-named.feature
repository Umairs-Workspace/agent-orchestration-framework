@executable @cli @work @validate
Feature: A seam with no production caller is named, and a caller under a test root does not wire it

  A bound that exists only in prose is the thing this rule exists to catch. `dispatchReadySet` with
  no caller, and `run-store.heartbeat()` behind an eight-day zombie run, were both found by a
  research arc a quarter after they stopped being reached. A command can ask the same question on
  every run, for the price of reading an artifact something else already built.

  The question is narrow and it is answerable. A source module on disk that exports something, whose
  dependents in the code graph are empty, is a seam no production caller reaches. Measured at the
  decision point: 148 top-level `src/*.mjs`, 0 absent from the graph, 2 with no dependents at all,
  and 6 with only test dependents. A population of roughly five, at `warn` — small enough to read,
  real enough to act on.

  A caller under a test root does not wire a seam. The requirement's own words are "an exported
  function with no non-test caller", and the graph makes the exclusion doubly worth having: it
  reports `test/arch/acd-migrate-command-cli-bijection.test.mjs` as a *dependency* of four `src/`
  modules, which is noise pointing the wrong way. A dependency is not a dependent, and neither of
  them wires anything by being a test file.

  The index is answered ONCE. Coupling for one path costs ~80 ms against the live 17 MB artifact and
  fifty paths cost ~400 ms, so a call per candidate over ~150 of them would be ~12 s in a command
  that has to stay cheap enough for an agent to run without thinking about it. One inverted pass over
  one normalised graph answers every candidate, and the answer may not depend on how many were asked.

  Two things would quietly undo this rule. The first is an exemption ledger: a control that STORES a
  fact about the tree sends its next bill to a stranger, and this repository already carries six such
  carriers in three families (TECH_DEBT item 81). The second is a floor taken over what the GRAPH
  covers rather than over what is on disk — graphify is an optional integration, and a lane whose
  floor breach reds a build in every project that never installed it is a rule punishing projects for
  a tool they were never obliged to have.

  So the sweep is source modules on disk, the finding is one code at one severity, and the path it
  names is project-root-relative with forward slashes, so two machines report one string.

  ADR-006 §1a, §3, §5. ADR-008 §4. FF-7704. 72/ADR-002 §1.

  Scenario: an exported module the graph gives no dependents is named, with what it strands
    Given a source module on disk under src/ that exports a function
    And a code graph that holds it with no dependents
    When the seam lane is run
    Then one finding is reported, coded audit-seam-unwired at warn
    And it names that module
    And it names the export it strands
    And no other finding is reported

  Scenario Outline: only a caller outside every declared test root wires a seam
    Given a source module on disk under src/ that exports a function
    And a code graph in which its only dependents are <dependents>
    When the seam lane is run
    Then the module <verdict>

    Examples: each declared test root is driven, and a production caller is the contrast
      | dependents                                        | verdict                             |
      | one file under test/                              | is named as an unwired seam at warn |
      | one file under test/arch/                         | is named as an unwired seam at warn |
      | one file under test/integration/                  | is named as an unwired seam at warn |
      | files under all three declared test roots         | is named as an unwired seam at warn |
      | one module under src/                             | is not named                        |
      | one module under src/ and one under test/arch/    | is not named                        |
      | one module under src/ whose own name holds "test" | is not named                        |
      | one file under a root that is declared nowhere    | is not named                        |

  Scenario Outline: a dependency is not a dependent, so the graph's observed noise cannot wire a seam
    Given a source module on disk under src/ that exports a function
    And a code graph in which the only other file it touches is <relation>
    When the seam lane is run
    Then the module <verdict>

    Examples: the direction of the edge decides, and the noisy direction decides nothing
      | relation                                                  | verdict                             |
      | a dependent under src/                                    | is not named                        |
      | a dependency under src/                                   | is named as an unwired seam at warn |
      | a dependency that is a test file — the noise as observed  | is named as an unwired seam at warn |
      | a dependent that is a test file                           | is named as an unwired seam at warn |

  Scenario Outline: the finding names what is stranded, not merely the file that holds it
    Given an unwired source module on disk that <exports>
    When the seam lane is run
    Then the one finding names <named>

    Examples: the stranded surface is what a reader has to act on
      | exports                            | named                |
      | exports one function               | that function's name |
      | exports three functions            | all three names      |
      | exports one const and one function | both names           |
      | has only a default export          | the default export   |

  Scenario Outline: the finding names the module by a project-root-relative path with forward slashes
    Given a project root whose own absolute path is spelled with the platform's separator
    And an unwired source module on disk at <location>
    When the seam lane is run
    Then the finding names <path>
    And it names no absolute path
    And the path it names holds no backslash

    Examples: one string, whichever machine ran it
      | location                        | path                |
      | the top of src/                 | src/sync.mjs        |
      | a subdirectory of src/          | src/notion/sync.mjs |
      | two directories deep under src/ | src/a/b/seam.mjs    |

  Scenario: fifty candidates give the answer of fifty single-candidate runs
    Given fifty source modules on disk, each exporting a function, and one code graph
    When the seam lane is run once over all fifty
    Then its findings are exactly the findings of fifty single-candidate runs combined
    And no finding appears twice

  Scenario Outline: the graph is walked ONCE for the whole candidate set, never once per candidate
    Given <count> source modules on disk, each exporting a function
    And one normalised code graph handed to the lane, instrumented so that each walk of its edges is counted
    When the seam lane is run over all of them
    Then the edges are walked a number of times that does not grow with the candidate count
    And it returns the same findings as the same lane run once per candidate

    Examples: the counts this repository actually presents
      | count |
      | 50    |
      | 150   |

  Scenario: the sweep counts source modules on disk, never modules the graph covers
    Given twenty source modules on disk under src/
    And a code graph holding three of them
    When the seam lane is run
    Then the read record counts twenty
    And its floor is greater than zero
    And no audit-ran-on-nothing finding is reported

  Scenario: this lane's OWN vocabulary is one code at one severity
    Given every finding the seam lane raises from its own rule, the shared read-floor finding excluded — that one belongs to the audit's read contract and to no lane
    When each is read
    Then its code is audit-seam-unwired
    And its severity is warn
    And no finding carries a second code or a second severity
    And the code set this lane declares holds that one code and nothing else
