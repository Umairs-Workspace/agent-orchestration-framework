@executable @cli @adapter @planning
Feature: `work.diagrams` names the generator, absent means off, and one reader answers for every consumer

  WHY. ADR-001 makes the diagram step a config choice: a project opts in by writing
  `work.diagrams`, turns it off with `generator: "off"`, and changes tools by changing one value.
  That only holds if there is exactly ONE reader. A second reader that defaulted differently would
  make `aof diagram plan` draw while the doctor lane believed PNG was not owed, or the other way
  round. So `resolveWorkDiagrams(config)` sits beside `planEnabledFromConfig` in
  `src/config-inspect.mjs`, and `validateWorkDiagrams` sits beside `validateWorkPlan` in
  `validateWork`, the idiom `work.plan` already uses.

  RULINGS (QA, 2026-09-23).
  (1) An absent key and `generator: "off"` resolve to the SAME frozen answer: `enabled: false`,
      `generator: "off"`. Off has one spelling in the resolved shape, so no consumer branches on
      `null` versus `"off"`.
  (2) `formats` defaults to `["svg", "png"]` and is returned in that canonical order whatever
      order the config wrote it in. Order is not a meaning.
  (3) An unknown key inside `work.diagrams` is an ERROR, not ignored. A misspelt `format` would
      otherwise silently take the default, and "I set it and nothing changed" is the worst
      failure a config key can have.
  (4) The resolver is total: a config that fails validation still resolves (to off), so a
      consumer never throws on a bad config. The error is the validator's to report.
  (5) The validator checks the SHAPE of `style` (a relative path that stays inside the project).
      Whether the file exists is `aof diagram plan`'s question (`diagram-style-missing`), because
      config validation must not depend on the working tree.
  (6) The registered ids in an error message come from `generatorIds()`. This module never spells
      a generator's name (FF-13301).

  Background:
    Given a fixture project `P` in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And `validateConfig` and `resolveWorkDiagrams` are imported from `src/config-inspect.mjs`

  Scenario Outline: the one reader resolves every legal shape
    Given `P`'s `.aof/aof.config.json` sets `work.diagrams` to <config>
    When `resolveWorkDiagrams` is asked for `P`'s config
    Then it deep-equals <resolved>
    And the answer is frozen

    Examples:
      | config                                                                  | resolved                                                                                                   |
      | absent                                                                  | `{ enabled: false, generator: "off", formats: ["svg","png"], style: null, browser: null }`                |
      | `{ generator: "off" }`                                                  | `{ enabled: false, generator: "off", formats: ["svg","png"], style: null, browser: null }`                |
      | `{ generator: "diagram-design" }`                                       | `{ enabled: true, generator: "diagram-design", formats: ["svg","png"], style: null, browser: null }`      |
      | `{ generator: "diagram-design", formats: ["svg"] }`                     | `{ enabled: true, generator: "diagram-design", formats: ["svg"], style: null, browser: null }`            |
      | `{ generator: "diagram-design", formats: ["png","svg"] }`               | `{ enabled: true, generator: "diagram-design", formats: ["svg","png"], style: null, browser: null }`      |
      | `{ generator: "diagram-design", style: ".aof/diagrams/style.md" }`      | `{ enabled: true, generator: "diagram-design", formats: ["svg","png"], style: ".aof/diagrams/style.md", browser: null }` |
      | `{ generator: "diagram-design", browser: "C:/Tools/chrome.exe" }`       | `{ enabled: true, generator: "diagram-design", formats: ["svg","png"], style: null, browser: "C:/Tools/chrome.exe" }` |

  Scenario: an absent key raises no diagnostic, so existing projects are unchanged
    Given `P`'s config carries a `work` object with no `diagrams` key
    When `validateConfig(P)` is run
    Then no diagnostic's `path` starts with `work.diagrams`

  Scenario Outline: a bad shape is a coded error, and still resolves to off
    Given `P`'s `.aof/aof.config.json` sets `work.diagrams` to <config>
    When `validateConfig(P)` is run
    Then exactly one diagnostic has severity `error`, path <path> and code <code>
    And `resolveWorkDiagrams` for the same config answers `enabled: false`

    Examples:
      | config                                                           | path                        | code                        |
      | `"diagram-design"`                                               | `work.diagrams`             | `diagrams-bad-shape`        |
      | `{ formats: ["svg"] }`                                           | `work.diagrams.generator`   | `diagrams-generator-required` |
      | `{ generator: "mermaid" }`                                       | `work.diagrams.generator`   | `diagrams-generator-unknown` |
      | `{ generator: "diagram-design", formats: ["png"] }`              | `work.diagrams.formats`     | `diagrams-formats-invalid`  |
      | `{ generator: "diagram-design", formats: ["svg","pdf"] }`        | `work.diagrams.formats`     | `diagrams-formats-invalid`  |
      | `{ generator: "diagram-design", formats: ["svg","svg"] }`        | `work.diagrams.formats`     | `diagrams-formats-invalid`  |
      | `{ generator: "diagram-design", formats: [] }`                   | `work.diagrams.formats`     | `diagrams-formats-invalid`  |
      | `{ generator: "diagram-design", style: "../outside/style.md" }`  | `work.diagrams.style`       | `diagrams-style-invalid`    |
      | `{ generator: "diagram-design", style: "C:/abs/style.md" }`      | `work.diagrams.style`       | `diagrams-style-invalid`    |
      | `{ generator: "diagram-design", browser: "chrome.exe" }`         | `work.diagrams.browser`     | `diagrams-browser-invalid`  |
      | `{ generator: "diagram-design", format: ["svg"] }`               | `work.diagrams.format`      | `diagrams-key-unknown`      |

  Scenario: an unknown generator is refused by naming what is registered, never by falling back
    Given `P`'s config sets `work.diagrams` to `{ generator: "mermaid" }`
    When `validateConfig(P)` is run
    Then the `diagrams-generator-unknown` message names `mermaid`
    And it lists every id `generatorIds()` returns, followed by `off`
    And `resolveWorkDiagrams` answers `generator: "off"`, not `"diagram-design"`

  Scenario: a style path that does not exist is not a config error
    Given `P`'s config sets `work.diagrams.style` to `.aof/diagrams/style.md` and that file is absent
    When `validateConfig(P)` is run
    Then no diagnostic's `path` starts with `work.diagrams`

  Scenario: the schema describes the same object
    When `schemas/aof.schema.json` is read
    Then `work.diagrams` is an object with exactly the properties `generator`, `formats`, `style` and `browser`, and `additionalProperties: false`
    And `formats` is an array of unique items from `svg` and `png`
    And each shape in the resolver's examples above validates against it
