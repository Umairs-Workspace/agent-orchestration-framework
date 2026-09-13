@executable @cli @work @validate @bug @finding-F-52-04-H
Feature: The coverage ledger and the corrected evidence — 323 scenarios traced by a checker, not by a claim

  `test/work-loops-coverage-ledger.test.mjs`, registered in `scripts/test.mjs`, plus the registration of
  the five suites this story lands and the correction of the milestone's `VERIFICATION.md`.

  THE ACCEPTANCE CRITERION THIS TASK EXISTS FOR is the story's hardest: *"Coverage is traced scenario by
  scenario, not asserted in aggregate: for each of the 323 scenarios, either a deciding assertion, or an
  explicit, justified exclusion recorded in the story."* A prose table asserting that is exactly the
  species of evidence this whole story was raised against — `VERIFICATION.md` already claims fifteen
  fixtures were green and nothing can re-run the claim. So the ledger is CODE: each suite exports a
  `coverage` object beside its tests, and a checker re-derives the truth from the `.feature` files on
  every run. Green means every one of the 323 has a named assertion or a resolving exclusion. It cannot
  be true on Tuesday and unfalsifiable on Wednesday.

  THE 461 ROWS, measured at refine and not accounted for by the criterion as written. The fifteen
  features contain **no `Scenario Outline` at all** — every `Examples:` block is attached to the FEATURE.
  So the 28 tables and their 461 data rows are not scenarios, and a ledger honest to the letter of
  "323 scenarios" would trace none of them, while most of the discrimination lives there: 76 rows in
  `02_field-value-grammar`, 48 in `04_timescale-comparability`, 41 in `03_pointer-endpoint-syntax`, 30 in
  `01_loops-validate`. The ledger therefore traces rows at TABLE granularity with the row count parsed
  from the feature and cross-checked against a literal — 28 assertions that close 461 rows.
  (Corrected at `aof:verify`, F-52-05-D: the refine-time figure of 24 was a miscount, measured four
  ways at build and agreeing at 28. The two load-bearing numbers, 323 scenarios and 461 rows, are
  unchanged and exact.)

  THE NON-VACUITY LEG COMES FIRST, and the ordering is deliberate. If the scenario parser stops matching,
  every set-equality below is green over the empty set — a ledger that reports total coverage of nothing.
  That is TECH_DEBT item 5's species inside the instrument built to close it, so the parsed counts are
  asserted against literal oracles before anything else runs.

  THE REGISTRATION TRAPS, both measured at refine against
  `test/arch/acd-loop-finding-envelope.test.mjs`. Its roster leg reads `test/arch/` filtered by
  `acd-loop-` and deep-equals the result against a literal nine, so a tenth file so named reds an
  accepted gate; and it asserts the m52/story-04 import block terminates immediately after its ninth
  import and that no `...acdLoop` spread follows the ninth. This story's suites therefore live in
  `test/` without that prefix, take their own labelled block, and export aliases that do not begin
  `acdLoop`. A build that discovers this as a mystery red has spent the refine.

  ADR-013/C5 (a baseline is reviewed by re-measuring it), m43 ADR-014/E7 (a suite no runner imports is
  no gate), TECH_DEBT items 5 and 48, F-52-04-H.

  Scenario: the parsed counts are checked against literal oracles before anything is concluded
    Given the fifteen covered feature files
    When the checker parses each for its scenario titles and its Examples data rows
    Then the parsed scenario counts equal the literal oracle, feature by feature, summing to 323
    And the parsed table row counts equal the literal oracle, table by table, summing to 461 across 28 tables
    And a parser that matched nothing fails here rather than reporting total coverage

  Scenario: every scenario is either decided or excluded, and nothing else
    Given each suite's exported coverage object
    When the union of its decided and excluded titles is compared with the titles parsed from its features
    Then the two sets are equal
    And a title claimed by the ledger that no feature declares fails the check
    And a title declared by a feature that the ledger does not carry fails the check

  Scenario: a decided scenario names an assertion that exists
    Given every title in a suite's decided set
    When each is looked for among that module's own test names
    Then every decided title is named by at least one test
    And a ledger cannot claim a scenario no assertion mentions

  Scenario: every Examples table is traced by a case array of the parsed length
    Given each covered feature's Examples tables in file order
    When each is compared with the suite's case array for that table
    Then each case array's length equals the row count parsed from the feature
    And the case array is the one the parameterised test iterates, so a table cannot be traced by an unused literal

  Scenario: an exclusion carries a class, a reason and a pointer that resolves
    Given every excluded entry across the five suites
    When each is checked
    Then its class is one of structural-duplicate, not-black-box or duplicate-claim
    And its reason is non-empty
    And a structural-duplicate names a test that one of the nine loop fitness functions actually exports, looked up rather than trusted
    And a duplicate-claim names a title that appears in some suite's decided set
    And an exclusion whose pointer does not resolve fails the check — an exclusion is a claim, not a comment

  Scenario: the exclusions are shrink-only
    Given a literal ceiling per exclusion class
    When the ledger is measured
    Then each class holds no more entries than its ceiling
    And a ceiling that is now higher than the measured count fails, so ground gained is kept
    And paying an exclusion down is a visible edit to the ceiling rather than a number quietly moving

  Scenario: the story's exclusion table and the code agree
    Given the exclusion table recorded in this story's STORY.md
    When it is parsed and compared with the union of every suite's excluded entries
    Then the two agree, entry for entry
    And the document cannot drift into decoration while the code moves

  Scenario: every suite this story lands is registered, and no orphan is introduced
    Given the five behavioural suites, this checker, and the shared fixture helper
    When the repo's suite-registration gate runs
    Then every suite file is named by the main runner's source text
    And the unregistered baseline is unchanged — this story adds no entry to it
    And the fixture helper is not a suite, so it is correctly outside the gate's sweep

  Scenario: registration honours the two shapes an accepted gate already pins
    Given the new suites registered in the main runner
    When the loop fitness functions run
    Then no new file under "test/arch/" is named with the "acd-loop-" prefix
    And the milestone-52 story-04 import block still terminates immediately after its ninth import
    And no spread beginning "acdLoop" follows the ninth
    And this story's imports and spreads sit in their own labelled milestone-52 story-05 block

  Scenario: the milestone's evidence names suites that exist, not fixtures that ran
    Given the VERIFICATION.md sections for stories 00, 01 and 02
    When each feature's evidence line is read
    Then each names a suite path that exists on disk and is registered
    And no evidence line rests on a narrative "fixture … green" claim
    And each says which of that feature's scenarios are decided by a fitness function instead, so the split is legible
    And the three stories stay accepted — this corrects their evidence, it does not reopen them

  Scenario: the milestone's own verification box can be ticked honestly
    Given STATE.md's Verification section
    When the executable-suite box is read
    Then it is ticked
    And it names the suites rather than asserting greenness
    And TECH_DEBT item 48 is closed against them, with its ratchet left open as the aof-product item it is

  Scenario: a suite that goes red over shipped behaviour is a finding, not a licence
    Given a suite assertion that disagrees with the code it drives
    When the disagreement is triaged
    Then the ADR and the .feature decide which side is wrong
    And a confirmed source defect is fixed here and recorded against the milestone
    And no scenario is rewritten to match the code, and no ADR is edited to match a suite

  # THE LEDGER'S OWN SHAPE. Each row is one leg of the checker and what fails it — the checker is itself
  # an instrument, so each leg names the failure it exists to produce.
  Examples:
    | leg                        | what it re-derives                                                  | what fails it                                                             |
    | 1 non-vacuity              | scenario titles and Examples rows parsed from the fifteen features   | a parser that stops matching; a literal oracle that no longer holds        |
    | 2 set equality             | decided ∪ excluded against the parsed titles                          | a scenario with no entry; an entry naming no scenario                     |
    | 3 decided implies asserted | each decided title against its module's test names                    | a ledger claiming a scenario no test mentions                             |
    | 4 table granularity        | each case array's length against the parsed row count                 | a table traced by a literal the test never iterates                       |
    | 5 exclusions resolve       | class, reason, and the named gate test or decided title               | an exclusion by gate NAME rather than by an assertion that exists         |
    | 6 shrink-only              | the per-class exclusion count against a literal ceiling               | a new exclusion above the ceiling; a ceiling left above the measured count |

  # THE EVIDENCE CORRECTION, file by file. The left column is what is on disk today; the right is what
  # the milestone's acceptance must be able to rest on.
  Examples:
    | record                                     | today                                                            | after this task                                                        |
    | VERIFICATION.md · story 00, five features   | "Loader/model fixture … green", no path                          | the record and value suite paths, plus the FF-decided split             |
    | VERIFICATION.md · story 01, six features    | "Timescale fixture: exhaustive 6×6 matrix … green", no path      | the checks suite path, plus FF-5205/FF-5206/FF-5209's owned scenarios   |
    | VERIFICATION.md · story 02, four features   | "Graph fixture … byte-identical fresh-process Mermaid green"     | the command family suite path, plus FF-5207/FF-5208's owned scenarios   |
    | STATE.md · Verification                     | "@executable suite green — NOT met for 00/01/02"                 | ticked, naming the suites                                               |
    | TECH_DEBT.md · item 48                      | open                                                             | closed against the landed suites; its aof-product ratchet left open      |
