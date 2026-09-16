@docs @assets @distribution
Feature: VERIFICATION.md gains the schema it has never had

  THE ROOT ITEM OF THE FINDING. ACD ships no `VERIFICATION.md` template at all —
  `src/bundle/templates/milestone/` holds ARCHITECTURE, COMPLIANCE, DESIGN, OUTCOME, RESEARCH,
  SECURITY, SPEC, STATE and UAT, and nothing else — while `work:doctor` checks only that the file
  exists and is non-empty (`src/work-doctor.mjs:109`). Nothing has ever parsed it. You cannot add a
  "this control was observed failing" field to an evidence model that has no fields.

  THE SCHEMA IS NOT AN INVENTION; IT PROMOTES THE MEASURED MAJORITY. Across the 50
  `VERIFICATION.md` files that exist in this repo, counted by heading prefix at any level
  (re-measured 2026-08-15): 46 carry Verification evidence, 46 Accept decision, 44 Findings — and
  44 / 44 / 42 restricted to an exact `## ` h2. The majority holds under either method, which is
  why this contract pins the SECTIONS and never the counts. The Findings columns are ALREADY
  prescribed in prose by the shipped prompt — "id, observed, type, severity, triage, routed-to,
  status" (`src/bundle/commands/verify.md:99`). The template writes down what ACD already does, and
  adds the one section that is new.

  THE NEW SECTION IS THE FITNESS REGISTER, whose columns are `id`, `enforced by`, `result` and `red
  probe`, the probe cell recording what was changed to make the control fail and the message
  observed. The discipline already exists in code and is invisible to the record: 164 of ACD's 287
  arch tests carry a non-vacuity lane, while 0 of 50 verification documents mention a red probe in
  any form. This template is what lets the record say what the code already does.

  THE FINDINGS REGISTER FREEZES THE ID IN FIRST POSITION (ADR-001), which is what makes the
  duplicate-id and dangling-citation checks buildable against it. Existing documents are
  grandfathered and none is rewritten.

  # Verification split per scenario (the mixed-lane idiom). Every claim over the SHIPPED BYTES is
  # @executable — a heading, a table header, a manifest entry, a placeholder literal and an install
  # action are all machine-readable. The single @manual scenario is a human reading prose for what
  # it PROMISES, which no assertion decides; it is the honest residue of ADR-005 §4.

  @executable
  Scenario Outline: the template takes its place in the bundle's own machinery
    Given the bundle as it ships once this task lands
    When I read "<artifact>"
    Then "<expectation>"

    Examples:
      | artifact                          | expectation                                                                                                    |
      | `src/bundle/templates/milestone/` | it holds ten files — the nine shipped today plus `VERIFICATION.md`                                             |
      | `src/bundle/bundle.json`          | it is UNCHANGED: the `milestone` member declares a DIR, so every file inside it is a declared member already    |
      | `src/bundle/manifest.json`        | it gains exactly one entry, at `.aof/templates/work/milestone/VERIFICATION.md`, whose hash is a `sha256:` digest |
      | the template's first line         | the `---` opening `doc: verification` frontmatter — the key 47 of the 50 existing documents already carry       |
      | the template's own bytes          | no `aof-generated` marker: the render prepends it and the scaffold strips it, so a shipped copy carries none    |

  @executable
  Scenario Outline: a frozen section heading is the exact wording, never a paraphrase
    Given the shipped `VERIFICATION.md` template
    Then it carries the heading "<heading>" spelled exactly, at h2
    And "<near miss>" does not satisfy that section

    Examples:
      | heading                  | near miss              |
      | ## Verification evidence | ## Evidence            |
      | ## Fitness functions     | ## Fitness register    |
      | ## Findings              | ## Findings and triage |
      | ## Accept decision       | ## Acceptance          |

  @executable
  Scenario: the fitness register's header row is a frozen literal
    Given the shipped template's fitness register
    Then its header row is `| id | enforced by | result | red probe |`, in that order
    And the probe column's guidance asks for what was changed to make the control fail and the message observed
    And the id cell holds the id alone, so each row is a declaration under the rule story 66/01 ships

  @executable
  Scenario: the findings register's header row is the seven columns already prescribed in prose
    Given the shipped template's findings register
    Then its header row is `| id | observed | type | severity | triage | routed-to | status |`, in that order
    And those are the same seven, in the same order, that `src/bundle/commands/verify.md:99` prescribes
    And the id stands alone in the first cell, which is what makes the duplicate-id check buildable against it

  @executable
  Scenario Outline: the template's own placeholder rows declare nothing
    Given the shipped template read by the declaration recogniser story 66/01 ships
    When "<placeholder>" is scanned
    Then it yields no declaration, so a freshly-rendered document declares no control it was never given

    Examples:
      | placeholder                                                          |
      | the fitness register's placeholder row, whose id cell reads `<FF-NN>` |
      | the findings register's placeholder row, whose id cell reads `<F-NN>` |
      | any sample register quoted inside a fenced block in the template      |

  @executable
  Scenario: an untouched placeholder is a missing red probe, not a recorded one
    Given a rendered document whose probe cell still holds the template's placeholder text
    Then the shape check reads it as a MISSING red probe
    And the placeholder is one literal shared by the template and the check, never two similar strings that can drift apart

  @executable
  Scenario Outline: what install does to each file, given what is already on disk
    Given a repo carrying the bundle in state "<prior state>"
    When "<command>" runs
    Then "<file>" is "<outcome>"

    Examples:
      | command          | file                                            | prior state                                | outcome                                                     |
      | aof work init    | `.aof/templates/work/milestone/VERIFICATION.md` | a repo with no ACD install                 | created alongside the other milestone templates             |
      | aof work update  | `.aof/templates/work/milestone/VERIFICATION.md` | installed before this task, so absent      | created                                                     |
      | aof work update  | `.aof/templates/work/milestone/VERIFICATION.md` | present and byte-identical to the render   | left unchanged                                              |
      | aof work update  | `.aof/templates/work/milestone/VERIFICATION.md` | present and locally edited                 | preserved and reported as drift, never clobbered without `--force` |
      | aof work update  | a milestone's own `VERIFICATION.md` under `work.dir` | present                               | never written: a record document is not a managed install path |

  @executable
  Scenario: the 50 documents already in this repo are untouched by the template's arrival
    Given the 50 `VERIFICATION.md` files under `work.dir`
    When the template ships
    Then every one of them is byte-identical to what it was before
    And a document under an accepted item cannot become a gating finding, because the horizon rules it immutable

  @executable
  Scenario Outline: the template states plainly what the red-probe field cannot catch
    Given the shipped template's scope note
    Then it names "<limit>" as outside what the field catches

    Examples:
      | limit                                                                                     |
      | a fabricated probe, which no declarative model catches                                    |
      | any assertion that is not a declared control, so the obligation reaches `FF-NN` ids alone |
      | whether the probe was performed on the bytes that actually shipped                        |

  @manual
  Scenario: a reviewer reads the template for what it promises
    Given a reviewer reading the shipped template end to end
    When they weigh its wording against its own scope note
    Then no sentence claims that a recorded probe proves the assertion was ever really run
    And an overreaching promise is a finding against this task, because the honesty of the ask IS the deliverable
