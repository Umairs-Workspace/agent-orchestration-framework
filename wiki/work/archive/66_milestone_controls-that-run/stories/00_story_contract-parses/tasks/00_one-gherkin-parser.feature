@executable @cli @work @validate
Feature: One Gherkin parser, and the god node gets shorter

  ACD hand-parses Gherkin twice. `src/feature-parse.mjs` (56 lines) says so in its own header —
  "mirrors the hand-rolled parse in `work.mjs`'s `checkFeatureTags` — the repo deliberately
  hand-parses Gherkin rather than take a dependency" (`:1-4`) — and `checkFeatureTags`
  (`src/work.mjs:719-755`) is the 37-line line scanner it mirrors. Two readers of one artifact,
  with the duplication ledgered in a comment and never discharged.

  MEASURED AT HEAD, 2026-08-15 (`aof graph impact`). `src/feature-parse.mjs`: 1 dependent
  (`src/commands/tasks.mjs`), 0 dependencies — the coldest leaf in the tree. `src/work.mjs`: 243
  dependents, 1,212 lines — the god node. This task moves the derivation from the hot file to the
  cold leaf, so the net effect on `src/work.mjs` is a DELETION: the tag rules stay, the scanning
  leaves, and no exported signature moves.

  THE THIRD COPY IS THE FAILURE MODE. ADR-003 names duplicating the parse as "the alternative most
  likely to be reached for by accident: it is the smaller diff, and the third copy of one
  derivation." This task is the one that must not take it.

  ADDITIVE RETURN SHAPE. `parseFeature(text)` today returns `{feature, scenarios:[{name, outline,
  lane}]}`. Its one consumer reads exactly those keys. The structural findings are a NEW key; every
  existing key keeps its meaning, so the blast radius is one module and the board endpoint that
  reads it is untouched.

  THE FALSE POSITIVE IS THE RISK WORTH MEASURING (QA, 2026-08-15). A rule that rejects a LEGAL
  construct is a whole-stream red nobody can clear — the same defect as gating an immutable record,
  arriving from the other side. So the accept table below is drawn from the corpus, never from
  imagination. Over 665 `.feature` files in `wiki/work`: 530 carry a `Background:`, 444 a
  `Scenario Outline:`, 526 an `Examples:`, 527 a data table (7,349 rows), 571 a comment line
  (25,441 of them — 12 beginning with a step keyword after the `#`), 2 a `"""` docstring, 3 a `But`
  step, 510 a feature-level tag line, 108 an indented scenario-level one. 567 of the 665 are CRLF.

  Scenario: the Gherkin grammar has exactly one home under src/
    Given `src/feature-parse.mjs` and `src/work.mjs` both recognise Gherkin keywords today
    When this task lands
    Then `src/feature-parse.mjs` is the only module under `src/` carrying a `Feature:`/`Scenario:`/step-keyword regex
    And `src/work.mjs` reaches the grammar only by importing it

  Scenario: parseFeature keeps every key its consumer already reads
    Given `src/commands/tasks.mjs` reads `feature` and `scenarios[].{name, outline, lane}`
    When `parseFeature` gains structural findings
    Then those keys carry the same values they carried before, for every file in the corpus
    And the findings arrive under a new key, so no consumer changes to keep working

  Scenario: a file that does not parse still answers the board
    Given a `.feature` carrying free text in step position, and a caller asking for its scenarios
    When `parseFeature` reads it
    Then the scenarios it can recognise are still returned, with their names and lanes
    And the structural finding is reported beside them, never instead of them

  Scenario: the tag rules are preserved exactly, and stay in validate's vocabulary
    Given `checkFeatureTags` today reports an unknown tag, a milestone-membership tag, and a scenario whose verification-tag count is not exactly 1
    When it becomes a thin caller over the one parser
    Then each of those three findings is still reported, with its wording unchanged
    And the tag vocabulary is still sourced from `config.work.tags`, the one config key validate reads

  Scenario: the god node gets shorter, and its 243 dependents are untouched
    Given `src/work.mjs` has 243 dependents measured from the codebase graph
    When the scanning moves to the leaf
    Then `src/work.mjs` is shorter than before
    And no exported signature of `src/work.mjs` is added, removed, renamed or re-typed

  Scenario: the parser stays pure, so it is testable without a filesystem
    Given callers pass file text to `parseFeature`
    Then the module imports no `node:fs`, spawns no process and reads no clock
    And the same text yields byte-identical output on every call

  Scenario Outline: free text in step position is ONE structural finding, naming the line that opened it
    Given the shape "<shape>" in `<file>`
    When the file is parsed
    Then exactly one structural finding is produced for that file
    And it names line <line>, not the whole file, because a verdict on a 90-line contract is not actionable
    And it is distinguishable from a tag finding, because the two are fixed differently

    Examples: every row is a real line in `wiki/work` at HEAD; each cited file is under a `done` milestone, so the citation cannot go stale
      | shape                                                                       | file                                                    | line | free-text lines |
      | a `Given` in a `Background:` wrapped onto a second indented line             | 00/00/tasks/00_resolve-by-ref.feature                   | 8    | 2               |
      | a `When` inside a scenario wrapped onto a second indented line               | 49/01/tasks/00_the-line-deduplicates-and-counts.feature | 195  | 1               |
      | a step whose keyword carries a comma, so `And,` is never the keyword `And `  | 04/02/tasks/02_roundtrip-signoff.feature                | 36   | 1               |
      | a narrative sentence in the Feature description beginning `And `             | 52/00/tasks/02_field-value-grammar.feature              | 12   | 4               |
      | the same shape, swallowing the rest of a long narrative into step position   | 53/01/tasks/04_gate-order-and-cap.feature               | 20   | 18              |
      | steps at file level under a comment block, with no `Scenario:`/`Background:` | 27/02/tasks/02_assign-affordance.feature                | 113  | 3               |

  Scenario Outline: a construct the corpus already uses is never a structural finding
    Given a `.feature` carrying <construct>
    When the file is parsed
    Then no structural finding is produced
    And its scenarios, their names and their lanes are reported exactly as they are today

    Examples: false-positive protection — the population each row would break, over the 665 files measured 2026-08-15
      | construct                                                             | files |
      | a Feature narrative block of free prose sentences                     | 665   |
      | a blank line anywhere                                                 | 665   |
      | a `Background:` and its steps                                         | 530   |
      | a `Scenario Outline:` with its `Examples:` table                      | 444   |
      | a data table under a step                                             | 527   |
      | a comment line                                                        | 571   |
      | a comment line beginning with a step keyword, as `# When the pin ...` | 12    |
      | a `"""` docstring holding markdown headings and blank lines           | 2     |
      | a `But` step                                                          | 3     |
      | a feature-level tag line above `Feature:`                             | 510   |
      | an indented scenario-level tag line                                   | 108   |
      | CRLF line endings                                                     | 567   |
      | LF line endings                                                       | 98    |

  TWO BOUNDARIES ARE DECIDED HERE BECAUSE THE CORPUS FORCES THEM, MEASURED AT REFINE. **The keyword
  match is case-sensitive** — Gherkin's own answer, and folding case takes the population from 16
  files / 47 lines to 67 files / 492 lines, firing on ~18 live files rather than one, because 46 files
  carry a narrative line beginning `and …`. **A step keyword after an `Examples:` table, inside the
  same scenario, is admitted** — 8 lines across `49/03/tasks/00_the-fourth-host.feature` and
  `02_invariant-4-amended.feature`, a live authoring idiom (a trailing assertion applying to all
  Examples rows) that real Gherkin rejects. The per-milestone table in `tasks/02` already depends on
  this reading: it records m49 as 2 files, which holds only if the shape is legal. Written down so
  the table's number is a decision rather than an accident.

  Scenario Outline: the boundary is decided here rather than discovered later
    Given <input>
    When the file is parsed
    Then <outcome>

    Examples: each measured 0 times in the corpus, so each row is a decision this contract makes rather than a fact it records
      | input                                                                      | outcome                                                                                     |
      | an empty file                                                              | no structural finding — an empty contract is not free text in step position                 |
      | tag lines and no `Feature:` line                                           | no structural finding — outside this rule's scope, stated so it is never read as covered    |
      | a `Feature:` line and no scenario at all                                   | no structural finding, for the same reason                                                  |
      | a narrative line whose first word merely starts with a keyword, "Whenever" | no structural finding — the keyword needs its trailing space                                |
      | a narrative line carrying a step keyword mid-sentence                      | no structural finding — position decides, never presence                                    |
      | a step keyword inside a `"""` docstring body                               | no structural finding — a docstring body is data                                            |
      | a step keyword inside a table cell                                         | no structural finding — a table row is data                                                 |

    Examples: the one boundary the corpus DOES force, and the keyword case, both decided here
      | input                                                                      | outcome                                                                                     |
      | a step keyword on a line after an `Examples:` table, inside the same scenario | no structural finding — a live aof authoring idiom, 8 lines across `49/03/tasks/00` and `02`, admitted deliberately though real Gherkin rejects it |
      | a narrative line beginning `and ` in lower case                            | no structural finding — the keyword match is CASE-SENSITIVE                                 |
      | a narrative line beginning `And ` in title case                            | a structural finding — the same words, in the case Gherkin reserves                          |
