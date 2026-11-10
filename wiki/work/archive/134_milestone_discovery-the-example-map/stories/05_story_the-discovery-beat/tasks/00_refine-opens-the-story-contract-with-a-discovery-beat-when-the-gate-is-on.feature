@executable @docs @work @planning
Feature: refine's story Contract opens with a discovery beat when the examples gate is on, and stops before any headline Scenario while a business question is open

  WHY. SPEC: "Before the Three Amigos formulate a story, the story gets an example map … The
  business questions go to a person, and the story cannot reach build while one is open." The
  beat is prose at the head of the story Contract in `src/bundle/commands/refine.md`. It is
  conditional on `work.examples.enabled`, the same shape as the `PLAN.md` block, so a project that
  has not turned it on is refined exactly as today (ADR-006 §3). The PO drafts `EXAMPLES.md`; the
  architect reviews every `technical` label (ADR-004 §1); the MAIN session asks the business
  questions through `AskUserQuestion`, each opening with its map token (ADR-003 §2), because a
  subagent has never called the tool (RESEARCH R2) and the answer is anchored to the run's own
  session. Then refine asks doctor, and an error-severity `example-*` finding stops the stage
  before the first headline Scenario, with no `tasks/` written (ADR-005 §5).

  The map's grammar and its token are 02's. The beat teaches them by pointing at the template and
  showing the token's shape once. It does not restate the parser's rules in a second form.

  RULINGS (QA, 2026-09-24).
  (1) This suite reads the refine SOURCE and its three rendered copies, and pins the passage's
      content, not its wording (133/05's precedent). "One passage" is measured: inside the story
      Contract, `work.examples.enabled` and `EXAMPLES.md` appear in one contiguous passage.
  (2) "On" is the boolean `true` alone, the resolver's reading (02/02 ruling 1). A beat run on a
      value the resolver reads as off would write a map the lane never checks (04 is silent with
      the gate off), so the doctor stop would pass an open question.
  (3) The token is taught by one worked question per form, and story 02's `readMapToken` must read
      each back. A spelling the reader drops (a bracketed or trailing token) leaves the person's
      answer anchoring nothing.
  (4) Which answer licenses a label is taught by token (02/01 ruling 2): `confirmed` by the answer
      to the example's `<ref> E<n>`; `stated Q<n>` and an `answered` question by the answer to the
      question's `<ref> Q<n>`.
  (5) The stop is read by severity, not by code. The passage need not name the three error codes
      (04 ratified five codes, three of them errors); it must say a warn does not stop the stage.
  (6) The template is named by its installed path, `.aof/templates/work/story/EXAMPLES.md`, as
      every other bundle scaffold names its template: a consumer project has no `src/bundle/`.
  (7) Which class and state count as open is 02/01's and 04's. The passage states the policy line
      once and does not re-enumerate the matrix. Who drafts in orchestrated mode follows the
      project's existing PO setting; the one invariant pinned is that the main session asks.

  RULINGS (developer, 2026-09-24).
  (1) The story Contract runs from its `- **story — Contract (Three Amigos):**` bullet to the
      `--autonomous` block's bold lead. The passage runs from its paragraph naming
      `work.examples.enabled` to the section's next bold-led paragraph, so its parts are bullets
      or plain paragraphs. Today "PO writes the headline Scenarios" is that bullet's own first
      line, so the build moves it below the passage.
  (2) A worked question text is a code span with a numeric story ref, such as `7/2 Q1 · …`:
      `readMapToken` reads a `<story ref>` placeholder as null, so the token's shape and the
      worked texts are separate spans.
  (3) The stop rows' codes and severities are row data. 04's lane lands after this story (ADR-007
      wave order), so this suite imports nothing from it.

  Background:
    Given `src/bundle/commands/refine.md` is read from this checkout

  Scenario: the beat opens the story Contract, before the headline Scenarios are written
    When the story Contract section of refine is read
    Then it holds one discovery passage that names `work.examples.enabled` and `EXAMPLES.md`
    And that passage comes before the instruction that the PO writes the headline Scenarios

  Scenario: with the gate off or absent, the beat does not run and refine writes what it writes today
    When the discovery passage is read
    Then it says the gate defaults to off, and that when it is absent or false no `EXAMPLES.md` is written and no question is asked
    And it says nothing else in the Contract changes when the gate is off

  Scenario Outline: the beat runs only when the gate is the boolean true — <value>
    When the discovery passage is read
    Then by its gate sentence, `work.examples.enabled` set to <value> <runs>

    Examples:
      | value                  | runs                  |
      | nothing (absent)       | does not run the beat |
      | `false`                | does not run the beat |
      | the string `"true"`    | does not run the beat |
      | `true`                 | runs the beat         |

  Scenario: the PO drafts the map from the user story and the SPEC
    When the discovery passage is read
    Then it says the PO drafts `EXAMPLES.md` in the story's folder, from the story's user story and the milestone SPEC, before any `.feature`
    And it says the map holds the rules, two or three key examples per rule with real values including the awkward edge, and every question the PO cannot answer from the record
    And it says every example the PO writes is `proposed`, and only a person's recorded answer makes one `confirmed` or `stated`
    And it points at the `EXAMPLES.md` story template as the map's form
    And it says a story with no rule a person owns declares the map not applicable in one line

  Scenario: the passage teaches the map by its template, and restates no line of the grammar
    When the discovery passage is read
    Then it names the template as `.aof/templates/work/story/EXAMPLES.md`
    And it holds no line that opens as a map line does: `## R`, `- E` or `- Q` followed by a digit

  Scenario Outline: the passage names the answer that licenses each label a person stands behind — <label>
    When the discovery passage is read
    Then it says <label> is written only after the person's recorded answer to <token>

    Examples:
      | label                        | token                                  |
      | an example's `confirmed`     | the example's own token, `<story ref> E<n>` |
      | an example's `stated Q<n>`   | the question's token, `<story ref> Q<n>`    |
      | a question's `answered`      | the question's token, `<story ref> Q<n>`    |

  Scenario: the architect reviews every technical label before any question is asked
    When the discovery passage is read
    Then it says the architect reviews every question the PO labelled `technical`, and relabels one that is really policy as `business`
    And it says a technical question may take a documented default, recorded as `defaulted <pointer>`, and a business question never does

  Scenario: the main session asks each business question through AskUserQuestion, with its map token at the head
    When the discovery passage is read
    Then it says the business questions are asked through `AskUserQuestion` by the main session, in solo and in orchestrated mode alike
    And it says each question opens with its token, `<story ref> Q<n>`, or `<story ref> E<n>` when a proposed example is put to the person to confirm
    And it says the answer is written into the map by the agent, and it is the harness's record of the answer, not the map, that makes the label hold

  Scenario Outline: the token the passage teaches is one the reader reads back — <form>
    When the discovery passage is read
    Then it shows one worked question text that opens with a <form> token
    And `readMapToken` from `src/work-examples/map.mjs` reads that text to a story ref and an id beginning `<letter>`

    Examples:
      | form                                                   | letter |
      | question token, put to a person                        | Q      |
      | example token, a proposed example put to confirm       | E      |

  Scenario: the stage stops on doctor's error before the first headline Scenario
    When the discovery passage is read
    Then it says refine runs `aof work doctor <story> --json` after the questions are asked
    And it says any error-severity `example-*` finding stops the Contract stage before the first headline Scenario, and no `tasks/` is written

  Scenario Outline: the stop is read by severity, not by code — <code>
    When the discovery passage is read
    Then by its stop sentence, a <severity> finding coded <code> <outcome>

    Examples:
      | code                            | severity | outcome                                                   |
      | `example-question-open`         | error    | stops the stage, and no `tasks/` is written               |
      | `example-provenance-unanchored` | error    | stops the stage, and no `tasks/` is written               |
      | `example-map-malformed`         | error    | stops the stage, and no `tasks/` is written               |
      | `example-rule-no-example`       | warn     | does not stop the stage                                   |
      | `example-map-too-many-rules`    | warn     | does not stop the stage                                   |

  Scenario: the doctor command the beat names is a command that exists
    When `aof work doctor` is looked up in the command registry
    Then it resolves to a registered command
    And the `--json` flag the passage passes to it is one the command accepts

  Scenario Outline: every rendered copy of refine carries the beat and matches a fresh render — <copy>
    When <copy> is read
    Then it contains the discovery passage
    And it is byte-identical to what `aof work update` renders from the current source

    Examples:
      | copy                                |
      | `.claude/commands/aof/refine.md`    |
      | `.codex/skills/aof-refine/SKILL.md` |
      | `.opencode/commands/aof/refine.md`  |
