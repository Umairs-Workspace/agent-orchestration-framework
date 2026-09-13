@executable @cli @work @work-stream
Feature: A declared path the graph does not know widens the run, because the test the developer is about to write does not exist yet

  This is the case that looked like the design's hard problem and is already solved by the rule it
  plugs into. A story declares `test/x.test.mjs` in `files:` before anyone has written it. The graph
  was built before that file existed, so it reports `present: false` — the file's dependents are
  UNKNOWN. Recording unknown as "none affected" is the mistake the selector's own header names, and
  the invariant that prevents it is one-directional and absolute:

    Coupling the graph knows narrows the run. Coupling the graph does not know widens it.

  So nothing new handles this case. A declared path outside the graph widens under an existing
  widening reason, exactly as a file created this turn already does on the git path — the shape the
  changed-set producer already accounts for by including untracked files. What this contract asserts
  is that the new input CANNOT smuggle a narrowing past that rule: no fifth widening reason, no
  narrowing path, and no flag to disable the widening.

  The absence of a flag is asserted rather than merely observed. `--no-widen` or `--strict-scope`
  would be asked for within a week by someone who knows their change is local, and used by an agent
  that does not. Selection becomes worthless not by being slow but by being confidently wrong once,
  because an agent handed a subset derived from a gap has been told a falsehood in the shape of an
  answer and will not find out.

  What would quietly undo this: a fifth reason added to carry "declared but absent"; treating a
  declared path that does not exist on disk as a path to drop rather than as coupling not yet known;
  and reporting a widened run without naming which file widened it, which makes the widening
  invisible and therefore the first thing someone optimises away.

  ADR-007 §3. FF-9604.

  Scenario: a declared suite the graph has never seen widens the run
    Given a graph that reports `present: false` for a suite named in the story's `files:`
    When `aof test --scope impacted --story <ref>` runs
    Then the run is widened
    And the widening names that file
    And the widening reason is an existing member of the frozen reason set

  Scenario: a declared source module the graph has never seen widens the run
    Given a graph that reports `present: false` for a source module named in the story's `files:`
    When `aof test --scope impacted --story <ref>` runs
    Then the run is widened
    And the widening names that file

  Scenario Outline: known coupling narrows, unknown coupling widens
    Given a planted graph in which the story's declared files are <coverage>
    When `aof test --scope impacted --story <ref>` runs
    Then the run <outcome>

    Examples: the invariant, driven from both ends
      | coverage                                            | outcome                                        |
      | all covered, each with a registered dependent suite | selects those suites and does not widen        |
      | all covered, one with no dependent suite at all     | widens, naming that file                       |
      | one not covered by the graph                        | widens, naming that file                       |
      | none covered by the graph                           | widens, naming each file                       |

  Scenario Outline: the two absences that are not coverage gaps still widen
    Given the graph artifact is <artifact>
    When `aof test --scope impacted --story <ref>` runs
    Then the run is widened under an existing widening reason
    And it is not reported as a narrowed run

    Examples: no artifact and a broken one are both unknowns
      | artifact               |
      | absent                 |
      | present but unreadable |

  Scenario: the frozen reason set does not grow
    Given the selector's exported widening reasons
    When they are read after this story lands
    Then there are four
    And they are the four that were there before

  Scenario: no narrowing path enters the selector with the new input
    Given the module set of this story
    When it is examined
    Then no flag, option or configuration key suppresses a widening
    And no module drops a declared path because it does not exist on disk

  Scenario: the run reports the scope it actually ran as
    Given a run that widened
    When its result is rendered
    Then it states that the run widened
    And it names each file that widened it
    And it does not report itself as a whole-tree gate
