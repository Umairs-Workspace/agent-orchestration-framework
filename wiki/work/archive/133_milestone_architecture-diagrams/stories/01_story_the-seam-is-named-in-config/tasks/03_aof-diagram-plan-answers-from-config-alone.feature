@executable @cli @adapter @planning
Feature: `aof diagram plan` answers from config whether to draw, where, and how

  WHY. The architect's prose (story 05) must never know which tool draws or whether drawing is on.
  It asks one command and follows the answer. ADR-004 §2 fixes the three answers and the coded
  refusals. "Off" and "the generator is not installed" are ANSWERS with exit 0, because the prose
  branches on them. A malformed request is a REFUSAL with a non-zero exit, because it is the
  caller's bug.

  RULINGS (QA, 2026-09-23).
  (1) `diagram:plan` is a registry command (`{ id, input, run, cli }`) reached as
      `aof diagram plan`, and `aof diagram` with no verb or an unknown one prints the family's
      examples and exits non-zero, like `aof graph`.
  (2) Checks run in this order, and the first failure answers: ref → off → ADR id → ADR heading →
      brief → slug → delivered → style → generator. Off comes before the ADR checks, so a project
      with diagrams off never sees a refusal about an ADR it was not going to draw.
  (3) `plan` writes NOTHING: no `diagrams/` folder and no file. Creating the folder is the drawing
      agent's first write, and an unused plan leaves the tree clean.
  (4) `paths` in the envelope are project-root-relative with forward slashes. The `instructions`
      carry the same paths as absolute paths.
  (5) A `done` item refuses with `diagram-item-delivered` (ADR-003 §4). Every other status plans.

  Background:
    Given a fixture project `P` in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And `P` holds milestone `07_milestone_m` with status `in-progress` and an `ARCHITECTURE.md` carrying `## ADR-001 — no diagram` and `## ADR-002 — seam`, whose `### Diagram` reads `Draw the seam.`
    And a fixture home `H` whose plugin registry locates a `SKILL.md`, and every command below runs with `HOME` and `USERPROFILE` pointing at `H`

  Scenario Outline: off is an answer, not a failure
    Given `P`'s config sets `work.diagrams` to <config>
    When `aof diagram plan 07 ADR-002 --slug generator-seam --json` is run in `P`
    Then it exits 0
    And the envelope deep-equals `{ enabled: false, reason: <reason> }`

    Examples:
      | config                  | reason                                         |
      | absent                  | a sentence naming `work.diagrams` as unset     |
      | `{ generator: "off" }`  | a sentence naming `work.diagrams.generator` as `off` |

  Scenario: off answers before any ADR check
    Given `P`'s config has no `work.diagrams`
    When `aof diagram plan 07 ADR-099 --slug x --json` is run in `P`
    Then it exits 0 with `enabled: false`

  Scenario: a missing generator is an answer the prose acts on
    Given `P`'s config sets `work.diagrams` to `{ generator: "diagram-design" }`
    And `H` holds no plugin registry and no marketplace clone
    When `aof diagram plan 07 ADR-002 --slug generator-seam --json` is run in `P`
    Then it exits 0
    And the envelope carries `enabled: true`, `available: false`, `code: "diagram-generator-missing"` and a non-empty `fix`

  Scenario: the plan says where and how
    Given `P`'s config sets `work.diagrams` to `{ generator: "diagram-design", style: ".aof/diagrams/style.md" }` and that file exists
    When `aof diagram plan 07 ADR-002 --slug generator-seam --json` is run in `P`
    Then it exits 0
    And the envelope carries `enabled: true`, `available: true`, `generator: "diagram-design"`, `item: "07"`, `adr: "ADR-002"` and `stem: "ADR-002-generator-seam"`
    And `paths` deep-equals `{ dir: "wiki/work/07_milestone_m/diagrams", source: "wiki/work/07_milestone_m/diagrams/ADR-002-generator-seam.html", svg: "…/ADR-002-generator-seam.svg", png: "…/ADR-002-generator-seam.png" }`
    And `brief` reads `Draw the seam.`
    And `instructions` contains the absolute forms of the source path and the style path
    And a recursive listing of `P` afterwards deep-equals the listing before

  Scenario: the human face prints the same decision
    Given the configuration of the scenario above
    When `aof diagram plan 07 ADR-002 --slug generator-seam` is run in `P` without `--json`
    Then it exits 0
    And its output names the stem, the source path and the generator
    And its output contains the instructions text

  Scenario Outline: a malformed request is a coded refusal with a non-zero exit
    Given `P`'s config sets `work.diagrams` to `{ generator: "diagram-design", style: ".aof/diagrams/style.md" }`
    And <state>
    When `aof diagram plan <ref> <adr> --slug <slug> --json` is run in `P`
    Then it exits non-zero with code <code>
    And nothing was written under `P`

    Examples:
      | state                                        | ref  | adr       | slug              | code                     |
      | the style file exists                        | `99` | `ADR-002` | `generator-seam`  | `ref-not-found`          |
      | the style file exists                        | `07` | `ADR-2`   | `generator-seam`  | `diagram-adr-invalid`    |
      | the style file exists                        | `07` | `ADR-005` | `generator-seam`  | `diagram-adr-unknown`    |
      | the style file exists                        | `07` | `ADR-001` | `no-diagram`      | `diagram-brief-missing`  |
      | the style file exists                        | `07` | `ADR-002` | `Seam`            | `diagram-slug-invalid`   |
      | the style file exists and `07` is `done`     | `07` | `ADR-002` | `generator-seam`  | `diagram-item-delivered` |
      | the style file is absent                     | `07` | `ADR-002` | `generator-seam`  | `diagram-style-missing`  |

  Scenario: an item with no ARCHITECTURE.md has no ADR to draw
    Given `P`'s config enables diagrams and milestone `08_milestone_n` has no `ARCHITECTURE.md`
    When `aof diagram plan 08 ADR-001 --slug x --json` is run in `P`
    Then it exits non-zero with code `diagram-adr-unknown`

  Scenario: the family is reachable and says what it holds
    When `aof diagram` is run with no verb, and again with the verb `draw`
    Then each exits non-zero
    And each prints examples naming `aof diagram plan` and `aof diagram export`
