@executable @cli @adapter @planning
Feature: the registry resolves one adapter, which locates the skill by path, writes the drawing instructions and turns a source into an SVG

  WHY. ADR-002 keeps the generator behind one registry and one adapter, so swapping tools is one
  config value plus one file. The adapter owns three things aof cannot know: where the tool lives
  (`locate`), what to tell the drawing agent (`instructions`) and how its source becomes an SVG
  (`toSvg`, the plugin's documented procedure done in Node). `readBack: null` reserves the
  direction of travel the SPEC names without building it.

  Measured at refine: the plugin is installed project-scoped for ANOTHER repo, not enabled here,
  and the architect has no `Skill` tool. `locate` therefore reads the plugin registry for any scope
  and hands back an absolute `SKILL.md` path that any agent with `Read` can follow.

  RULINGS (QA, 2026-09-23).
  (1) `locate` takes `home` as input and never reads `os.homedir()` itself. The suites run against
      a fixture home. They never read the real `~/.claude`, and they never read the real plugin
      tree: each `toSvg` fixture below is a literal HTML string in the suite, named for reference only.
  (2) An unreadable or malformed `installed_plugins.json` is the same answer as an absent one: fall
      through to the marketplace clone, then `diagram-generator-missing`. It is never a throw.
  (3) "Newest" means the greatest `lastUpdated`. An entry whose `SKILL.md` is missing on disk is
      skipped, not chosen.
  (4) The `instructions` contract pins CONTENT, not wording. The adapter owns the prose.
  (5) `toSvg` is pure over text and deterministic: the same source gives byte-identical output.

  Background:
    Given `src/diagrams/generators.mjs` is imported directly
    And a fixture home `H` in a fresh temp directory

  Scenario: the registry holds one adapter, keyed by its own id, with the whole contract
    When `generatorIds()` is asked
    Then it deep-equals `["diagram-design"]`
    And `generatorFor("diagram-design")` has exactly the keys `id`, `sourceExt`, `locate`, `instructions`, `toSvg` and `readBack`
    And its `id` is `"diagram-design"`, its `sourceExt` is `".html"` and its `readBack` is `null`
    And the adapter object is frozen
    And `generatorFor("mermaid")` answers `null`

  Scenario Outline: locate finds the newest installed skill of any scope, then the marketplace clone
    Given `H` holds <registry>
    And `H` holds <marketplace>
    When `generatorFor("diagram-design").locate({ home: H })` is asked
    Then it answers <answer>

    Examples:
      | registry                                                                                                       | marketplace                   | answer                                                         |
      | one `project`-scope entry for another repo, `installPath` `A`, with `A/skills/diagram-design/SKILL.md` present | no clone                      | `{ ok: true, skill: <abs A/skills/diagram-design/SKILL.md> }`  |
      | two entries: `A` (`lastUpdated` 2026-01-01) and `B` (2026-06-01), both with a `SKILL.md`                       | no clone                      | `{ ok: true, skill: <abs B/…/SKILL.md> }`                      |
      | two entries: `A` (2026-01-01, `SKILL.md` present) and `B` (2026-06-01, `SKILL.md` missing)                     | no clone                      | `{ ok: true, skill: <abs A/…/SKILL.md> }`                      |
      | no `diagram-design@diagram-design` entry                                                                       | a clone with its `SKILL.md`   | `{ ok: true, skill: <abs clone/skills/diagram-design/SKILL.md> }` |
      | an `installed_plugins.json` that is not JSON                                                                   | a clone with its `SKILL.md`   | `{ ok: true, skill: <abs clone/…/SKILL.md> }`                  |
      | no `installed_plugins.json` at all                                                                             | no clone                      | `{ ok: false, code: "diagram-generator-missing", fix }`        |

  Scenario: a missing generator says how to get it, and aof installs nothing
    Given `H` holds no registry and no clone
    When `locate({ home: H })` is asked
    Then its `fix` names both `/plugin` commands that add the marketplace and install the plugin
    And a recursive listing of `H` afterwards deep-equals the listing before

  Scenario: the instructions carry the paths, the style, the brief and the limits
    When `instructions({ brief: "Draw the seam.", paths: { source: "<abs P>/wiki/work/133_m/diagrams/ADR-002-generator-seam.html" }, style: "<abs P>/.aof/diagrams/style.md", skill: "<abs skill>" })` is asked
    Then the text contains the absolute skill path and the absolute style path
    And it contains the brief verbatim and the absolute source path
    And it says to skip the skill's onboarding step and not to pause for confirmation
    And it says to write only the source file and not to export
    And every path in it is absolute

  Scenario: with no style, the instructions use the shipped guide and still skip onboarding
    When `instructions` is asked with `style: null`
    Then the text names no style file path
    And it says to use the skill's shipped style guide as-is and to skip its onboarding step

  Scenario Outline: toSvg follows the plugin's export procedure
    Given the literal fixture source <fixture>
    When `toSvg(text)` is asked
    Then it answers <outcome>

    Examples:
      | fixture                                                                                 | outcome                                                                                                   |
      | `one-svg.html`: one `<svg viewBox="0 0 1000 480">` with no `xmlns`, and a Google Fonts `<link href>` carrying two `&`s | an SVG starting `<?xml version="1.0" encoding="UTF-8"?>`, whose root carries `xmlns="http://www.w3.org/2000/svg"` and `viewBox="0 0 1000 480"`, with one `<defs>` holding a `@import` of that font URL with each `&` as `&amp;` |
      | `has-defs.html`: an SVG that already has a `<defs>`                                     | the `@import` merged into that `<defs>`; the output has exactly one `<defs>`                              |
      | `rgba.html`: `fill="rgba(45, 49, 66, 0.03)"`, `stroke="rgba(11,13,11,.5)"`, `fill="transparent"` | `fill="#2d3142" fill-opacity="0.03"`, `stroke="#0b0d0b" stroke-opacity=".5"`, `fill="none"`              |
      | `two-svgs.html`: two `<svg>` blocks                                                     | only the first block                                                                                     |
      | `aria.html`: `role="img"`, `aria-labelledby` and a first-child `<title>`/`<desc>`       | all four preserved exactly                                                                                |
      | `no-svg.html`: no `<svg>`                                                               | a coded refusal `diagram-source-no-svg`                                                                   |
      | `no-viewbox.html`: an `<svg>` with no `viewBox`                                         | a coded refusal `diagram-svg-no-viewbox`                                                                  |

  Scenario: the SVG is deterministic and parses as XML
    Given the fixture `one-svg.html`
    When `toSvg` is asked twice
    Then both answers are byte-identical
    And the answer parses as well-formed XML
