@executable @docs @work @work-stream
Feature: The four ACD phase loops — declared honestly, with the gaps declared rather than filled

  build-to-green, review→fix→re-review, verify→triage→accept and the autonomous cascade: the four
  loops whose authority is mostly a prompt file. Their records are where ADR-002's sentinels earn
  their keep — `unknown` (no evidence found) and `uncapped` (evidence found that no bound exists)
  are different declarations on different keys, and `prose:` names the paragraph a reviewer can
  open rather than dressing it up as a pointer. Every field value below is RESEARCH §Q1's, not an
  estimate. These four are also where ADR-011 §10's authoring rule bites hardest: an ACTUATOR names
  the NARROWEST ARTIFACT THAT ACTS — an agent definition or a defining symbol — never the
  orchestrating phase prompt. The shared-actuator check is exact-match and scheme-agnostic, so
  citing `prose:src/bundle/commands/continue.md` as the actuator of two loops would make the
  day-one shared-actuator finding a CITATION ARTIFACT rather than a real shared lever; the check is
  unchanged and the risk is closed here, on the authoring side.
  ADR-002, ADR-003, ADR-006, ADR-010 rows 1-4, ADR-011 §5, §6 and §10, ADR-012 §6/F2 and §6/F4.

  Scenario: build-to-green declares an uncapped ceiling and an unknown owner as two different facts
    Given the day-one registry under <work.dir>/loops/
    When I read loops/build-to-green.md
    Then it declares ceiling "uncapped"
    And it declares owner "unknown"
    And the token `unknown` appears on no key of this record other than owner
    And the token `uncapped` appears on no key of this record other than ceiling
    And its prose body carries a `path:line` citation for the uncapped claim (wiki/planning/PRD-acd-loop-engineering.md:58)
    And its prose body carries no citation for owner, because RESEARCH found no owner authority to cite

  Scenario: review-fix-rereview declares the same two states on its own evidence
    Given the day-one registry under <work.dir>/loops/
    When I read loops/review-fix-rereview.md
    Then it declares ceiling "uncapped"
    And it declares owner "unknown"
    And its prose body cites src/bundle/commands/continue.md as the prompt in which no cap, turn limit or timeout appears
    And it declares neither "ceiling: unknown" nor "owner: uncapped" — the two sentinels never swap keys

  Scenario: the uncapped pair declare measurement as prose, never as a fabricated pointer
    Given loops/build-to-green.md and loops/review-fix-rereview.md
    When I read each record's `measurement` list
    Then every entry is `prose:src/bundle/commands/continue.md` — the prompt that is their only authority
    And neither declares a `module:`, `command:` or `config:` pointer for measurement
    And neither declares "measurement: unknown"
    And neither entry carries a line number — `prose:` names a path, and the line lives in the prose body's citation
    And this reading is the `measurement` key ONLY: the phase prompt is genuinely where "green" is defined, whereas ADR-011 §10 forbids that same file on `actuator`

  Scenario: the uncapped pair name the artifact that acts, never the phase prompt that orchestrates it
    Given loops/build-to-green.md and loops/review-fix-rereview.md
    When I read each record's `actuator` list
    Then every entry names the narrowest artifact that acts — an agent definition or a defining symbol
    And each names `prose:src/bundle/agents/aof-developer.md`, the agent both loops actuate through (cited at src/bundle/commands/continue.md:56-57 and :66)
    And neither declares `prose:src/bundle/commands/continue.md` as an actuator — that file orchestrates the phase, it does not act
    And neither entry is rewritten as a `module:` pointer under ADR-012 §6/F2's clarification: that rule names the narrowest EXPORTED symbol on the path to the act, and the act here is an agent definition with no exported symbol on its path
    And the two entries are byte-identical, so the exact-match check sees ONE shared lever rather than two coarse citations of a phase prompt
    And each record's prose body cites the line at which the phase prompt hands the work to that agent, so the narrowing is defensible from evidence

  Scenario: the shared actuator is a real shared lever and its arbiter is really absent
    Given loops/build-to-green.md and loops/review-fix-rereview.md declare a byte-identical actuator entry
    When I read every `veto` edge declared anywhere in the registry
    Then no single node declares a `veto` edge to both loops
    And neither of the two contending loops is declared as the arbiter of the set it belongs to — an arbiter must be a non-member (ADR-011 §9)
    And no `veto` edge is authored for the purpose of quieting the check, which would be a fabricated edge under ADR-005's closing warning
    And the resulting `loop-shared-actuator-unarbitrated` finding is the true absence of an arbiter — PRD §Context failure 3, made computable, and 58's inbox

  Scenario: the ceiling axis and the cadence axis stay separate on the uncapped pair
    Given loops/build-to-green.md and loops/review-fix-rereview.md
    When I read each record's `cadence`
    Then each declares a cadence in the `event:` family with a trigger from the closed set (ADR-006 §1)
    And neither declares `periodic:` — RESEARCH measured no clock for either
    And neither declares "cadence: uncapped" — `uncapped` is a ceiling value and is not admitted on cadence

  Scenario: verify-triage-accept declares the one owner RESEARCH found, and a ceiling of `none`
    Given the day-one registry under <work.dir>/loops/
    When I read loops/verify-triage-accept.md
    Then it declares owner "actor:product-owner"
    And its prose body cites src/bundle/commands/verify.md:92 for that owner
    And it declares ceiling "none" — the body runs once per trigger and terminates by construction
    And it declares neither "ceiling: uncapped" nor "ceiling: unknown" — `none` is the opposite of uncapped, and `unknown` now warns in its own right (`loop-ceiling-unknown`, ADR-011 §6)
    And it declares cadence "event:per-item", citing src/bundle/commands/verify.md:3

  Scenario: the autonomous cascade declares a registered command and a config key
    Given the day-one registry under <work.dir>/loops/
    When I read loops/autonomous-cascade.md
    Then its `reference` names `command:work:next`
    And its `measurement` names `command:work:next`
    And its `ceiling` names `config:work.autonomous.maxAttempts`
    And `work:next` is an id registered in `COMMANDS`, which is what makes it authorable as a `command:` pointer (ADR-011 §13)
    And no declared field value states the ceiling's numeric default — the number lives in the config the pointer names
    And it declares owner "unknown"
    And it declares no `periodic:` cadence — an attempt ceiling is a bound, not a rate (ADR-002)

  Scenario: three of the four declare optimizing true, and each body says why on its own terms
    Given loops/build-to-green.md, loops/review-fix-rereview.md, loops/verify-triage-accept.md and loops/autonomous-cascade.md
    When I read each record's `optimizing` value and its prose body
    Then loops/build-to-green.md declares optimizing true, its body naming the metric it pushes to an extremum (scenarios-green) and the actuator that can edit that metric
    And loops/review-fix-rereview.md declares optimizing true, its body naming open findings as the metric it drives toward zero through an actuator that influences the count
    And loops/autonomous-cascade.md declares optimizing true, its body naming items-reaching-done as the metric it drives up
    And loops/verify-triage-accept.md declares optimizing false, its body naming it a regulator: an acceptance gate holds a variable at a reference rather than pushing a metric to an extremum
    And each of the four bodies carries its own optimizer/regulator justification in prose, because `optimizing` is the only field with no evidential anchor and no check can re-derive it (ADR-012 §6/F4)
    And loops/review-fix-rereview.md and loops/verify-triage-accept.md each write out the boundary between them in their own body — both drive findings toward zero, and the distinguishing reason is that one iterates while the other is a terminal gate — so a later reader re-derives the boundary instead of re-litigating it
    And each value is the literal true or false, never a sentinel and never a quoted string

  Scenario: no ACD phase loop declares `unknown` for a machinery field, or an empty list for anything
    Given loops/build-to-green.md, loops/review-fix-rereview.md, loops/verify-triage-accept.md and loops/autonomous-cascade.md
    When I read each record's controlled, reference, measurement and actuator
    Then no entry on any of the four is the token `unknown`
    And every entry is a `module:`/`command:`/`config:` pointer, or a `prose:<path>` a reviewer can open, or — on `controlled` only — a phrase
    And every one of the four declares all four keys, so no gap is expressed by omission
    And no list any of the four declares is empty — `reference: []`, `measurement: []`, `actuator: []`, `ceiling: []` and an empty edge list are all `loop-empty-list` (error, ADR-011 §5), which is the hole that would otherwise let an aspirational loop pass by declaring nothing
    And none of the four declares `ceiling: unknown` — each ceiling is evidenced as `uncapped`, `none` or a pointer, and a `ceiling: unknown` would now warn rather than pass silently

  Examples:
    | loop                       | owner               | ceiling                            | measurement kind                        | optimizing |
    | loop:build-to-green        | unknown             | uncapped                           | prose:src/bundle/commands/continue.md   | true       |
    | loop:review-fix-rereview   | unknown             | uncapped                           | prose:src/bundle/commands/continue.md   | true       |
    | loop:verify-triage-accept  | actor:product-owner | none                               | prose:src/bundle/commands/verify.md     | false      |
    | loop:autonomous-cascade    | unknown             | config:work.autonomous.maxAttempts | command:work:next                       | true       |

  Examples:
    | loop                                | the actuator entry names                                              | it must NOT name                                    | what the row protects                                              |
    | loop:build-to-green                 | prose:src/bundle/agents/aof-developer.md — the agent definition that acts | prose:src/bundle/commands/continue.md            | the narrowest artifact that acts (ADR-011 §10)                     |
    | loop:review-fix-rereview            | the same entry, byte-identical — one shared lever, not two citations  | prose:src/bundle/commands/continue.md               | a real collision, so the finding is signal not a citation artifact |
    | every other record in the registry  | an agent definition or a defining symbol                              | the phase prompt that merely orchestrates it        | one authoring rule, applied to all nine records                    |
