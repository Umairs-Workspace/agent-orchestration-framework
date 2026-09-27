@executable @cli @work @work-stream
Feature: The lane states its denominator once per run, with its two exclusions kept apart

  A report that names ten edges and says nothing about the 182 it could not read describes 21% of the
  graph in a voice that sounds like all of it. Measured over this stream, the four counts are 38
  witnessed, 10 unwitnessed, 125 unevaluable by type and 57 unevaluable for want of a declaration,
  against 230 considered. The two exclusions are two different facts with two different remedies.
  The 125 are permanent by construction: `reads:` and `files:` exist only on `STORY.md`, so every
  milestone, uat, spike and chore endpoint is out of domain forever. The 57 are a debt time can
  clear — 71 of this stream's 303 stories carry the keys today
  (`grep -rl --include=STORY.md -E "^(files|reads):" wiki/work | wc -l`).

  One finding, not 182. `depends-edges-unchecked` is this family's existing honest-no-op idiom —
  `rubric-join-unchecked` (`src/work/doctor-rubric.mjs:67-76`), itself quoting
  `roadmap-folder-mismatch` — with one deliberate difference: the rubric lane emits its no-op once
  per item that has something to check (`src/work/doctor-rubric.mjs:214`), and this one emits once
  for the whole run. 182 warnings on day one is the wall of inherited red `78/ADR-007` refuses by
  name, and the noise that made `observability/report.md` unread.

  The counts are an identity, not a summary — `witnessed + unwitnessed + unchecked(type) +
  unchecked(undeclared) = considered`, over exactly the edge set `validateWork` resolves. A census
  whose parts do not sum to its whole can drop an edge class in silence, and the identity has already
  caught one: ADR-001's table records 124 by type, which leaves 48 + 124 + 57 = 229 of 230. The
  missing edge is `78 → 79`, a milestone depending on a parentless story. Under the two-bucket split
  the ADR itself mandates it belongs to `type` — its dependent can never carry `reads:` — so the type
  count is **125**, and the identity closes.

  The finding anchors at the work-stream root, which the engine's scope filter always passes through
  (`src/work/doctor.mjs:793-809`), so `aof work doctor 119` still reads the whole denominator rather
  than a scoped fraction of it.

  What would quietly undo this: the unchecked finding made conditional on there being at least one
  unwitnessed edge, so a clean stream reports nothing and reads as fully covered; the two reasons
  summed into one number for readability, merging a permanent design boundary with a shrinking debt;
  a fifth exclusion added to the walk with no counter of its own, so the identity keeps closing while
  an edge class vanishes; and the finding anchored on an item folder, where a scoped run drops it.

  ADR-001 §2, §3. FF-12401.

  Scenario: however many edges are excluded, it is one finding
    Given a stream in which 182 resolved `depends:` edges could not be evaluated
    When `aof work doctor --json` runs over it
    Then exactly one finding carries the code `depends-edges-unchecked`
    And no finding of that code names a single edge
    And its severity is `warn`
    And its path is the work-stream root

  Scenario Outline: the four counts close over the whole edge set
    Given a snapshot whose resolved edges are <considered> in total
    When the lane classifies them
    Then it reports <witnessed> witnessed, <unwitnessed> unwitnessed, <type> unchecked by type and <undeclared> unchecked as undeclared
    And those four numbers sum to <considered>
    And it emits <findings> `depends-edges-unchecked` finding for the run

    Examples: literal fixtures, including the two ends
      | fixture                             | considered | witnessed | unwitnessed | type | undeclared | findings |
      | all four classes present            | 4          | 1         | 1           | 1    | 1          | 1        |
      | every edge evaluable                | 2          | 1         | 1           | 0    | 0          | 0        |
      | no edge evaluable at all            | 3          | 0         | 0           | 2    | 1          | 1        |
      | every edge witnessed                | 2          | 2         | 0           | 0    | 0          | 0        |
      | nothing witnessed, nothing excluded | 2          | 0         | 2           | 0    | 0          | 0        |
      | no `depends:` edge in the stream    | 0          | 0         | 0           | 0    | 0          | 0        |

  Scenario: the two exclusions are reported apart and are never summed
    Given a run whose exclusions are 125 by type and 57 by undeclared contract
    When the `depends-edges-unchecked` message is read
    Then it carries the two numbers separately, each named by its reason
    And it states that a non-story endpoint can never be evaluated, and that an undeclared contract can be
    And no single number equal to their sum stands in place of the pair

  Scenario: a stream with nothing to exclude says nothing about exclusions
    Given a stream in which every resolved `depends:` edge has both contract sets present
    When the lane runs
    Then no `depends-edges-unchecked` finding is emitted
    And any `depends-edge-unwitnessed` findings are still emitted

  Scenario: the denominator survives a scoped run
    Given this stream, and a run scoped to one milestone
    When `aof work doctor 119 --json` runs
    Then the `depends-edges-unchecked` finding is still reported
    And its four counts are the whole stream's, not the scope's
    And the per-edge findings are filtered to the scope as every item-anchored finding is

  Scenario: the census over this stream closes, and is not vacuous
    Given this repository's own work stream
    When `aof work doctor --json` runs over it
    Then the reported counts sum to the number of `depends:` edges `validateWork` resolves
    And the unchecked count is greater than zero
    And at least one edge was classified into each of the four counts
