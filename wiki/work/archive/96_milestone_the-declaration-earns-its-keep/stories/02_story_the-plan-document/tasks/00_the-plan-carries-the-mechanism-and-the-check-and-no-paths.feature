@executable @docs @work @scaffold
Feature: The plan carries the mechanism and the check, and restates no path the frontmatter already holds

  The vendor guidance names four things a useful spec carries: the files and interfaces involved, what
  is out of scope, and an end-to-end verification step. Two of those four are already `reads:` and
  `files:`, machine-readable, consumed by `ready-wave.mjs`, checked by `validate.mjs` and now derived
  by story 01. The two this document adds are **the mechanism** — the seam, in a few sentences — and
  **the verification step**, which is the one thing a builder currently infers rather than being told.

  So the file table has ONE home and it is the frontmatter. A `PLAN.md` carrying the table would be
  the second list; the third would be whichever agent transcribed it, which is 15/R1's measured
  species — *"a sanctioned count generalised in two places usually lives in a third"* — arriving on
  schedule. The ban is total: no `files:` or `reads:` key, no path-shaped literal under a source root,
  no table whose header names a file column, and no prose enumeration standing in for one.

  The ban also does most of the length work. A document forbidden from listing files has little left
  to be long about, and the one-page limit stops being a style rule enforced by nagging. SWE-agent's
  published ablations on the 300-instance SWE-bench Lite subset measured a 100-line file window
  resolving 18.0% against 12.7% for the whole file, and the last five observations resolving 18.0%
  against 15.0% for full history. More context measured worse, twice, on one benchmark. An architect
  who cannot fit a page is describing a story that should have been split — which is a sizing signal
  this stream has nowhere else.

  The template's own marker placement is a known trap, recorded rather than rediscovered: a leading
  `aof-generated` comment placed BEFORE frontmatter breaks frontmatter parsing silently. If this
  document carries frontmatter, the marker goes after it.

  What would quietly undo this: a "summary of files touched" section added because a reader asked for
  one; a mechanism paragraph that names every file it touches inline, which is the table wearing
  prose; and a second `PLAN.md` shape appearing in the stream that the template never taught.

  ADR-005. FF-9603.

  Scenario: the shipped template carries the two things and no third
    Given the shipped story plan template
    When it is read
    Then it carries a section for the mechanism
    And it carries a section for the verification step
    And it carries a section for what is out of scope
    And it carries no file table

  Scenario Outline: the restatement ban, driven over the shapes a table wears
    Given a plan document containing <content>
    When it is checked against the restatement ban
    Then it is <outcome>

    Examples: four spellings of the same second list, and two that are not one
      | content                                                        | outcome  |
      | a `files:` key                                                 | refused  |
      | a `reads:` key                                                 | refused  |
      | a markdown table whose header names a file column              | refused  |
      | a bullet list of paths under a source root                     | refused  |
      | a single inline reference to one module inside a sentence about the seam | admitted |
      | a reference to the story's own frontmatter as the file table   | admitted |

  Scenario: the ban is a property of the stream, not of one file
    Given every plan document present in the work tree
    When each is checked against the restatement ban
    Then each is admitted

  Scenario: the template's generated marker does not break frontmatter parsing
    Given the shipped story plan template
    When its frontmatter is parsed
    Then the parse succeeds
    And any generated marker comment appears after the frontmatter block

  Scenario: the template is a declared member of the installed bundle
    Given a project into which the bundle has been installed
    When the installed template tree is read
    Then the story plan template is present at its declared path
    And it matches the shipped source template
