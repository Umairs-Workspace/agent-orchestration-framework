@executable @cli @work @work-stream
Feature: the refine scope has one home and one flag

  `work.loop.refine` is a mode with two members, `per-story` (the default, and today's behaviour) and
  `whole-item`. It sits in `packages/contracts/src/loop-bounds.mjs` beside `work.loop.concurrency`
  and uses the same resolver discipline: a member is answered verbatim, and anything else answers the
  default, with no trim, no case-fold and no throw. FF-6901 makes `work.loop.*` the loop's one home,
  which is why this setting is not `work.autonomous.refine` (ADR-002 §1).

  `aof work loop <ref> --refine <mode>` overrides it for one run. The resolved value is the loop
  declaration's appended key `refine`, and a resume inherits it unless `--refine` is given again.

  Scenario Outline: the config value resolves verbatim or to the default
    Given `work.loop.refine` is <configured>
    When `loopRefineFromConfig(workspace)` is called
    Then it answers `<resolved>`

    Examples:
      | configured     | resolved   |
      | unset          | per-story  |
      | `"per-story"`  | per-story  |
      | `"whole-item"` | whole-item |
      | `"Whole-Item"` | per-story  |
      | `"whole_item"` | per-story  |
      | `true`         | per-story  |

  Scenario Outline: the flag wins over the config, and an unknown value refuses
    Given `work.loop.refine` is <configured>
    When `aof work loop 143 <flag> --dry-run --json` runs
    Then <outcome>

    Examples:
      | configured     | flag                  | outcome                                                                            |
      | unset          |                       | the probe's `refine` is `per-story`                                                |
      | `"whole-item"` |                       | the probe's `refine` is `whole-item`                                               |
      | `"whole-item"` | `--refine per-story`  | the probe's `refine` is `per-story`                                                |
      | unset          | `--refine whole-item` | the probe's `refine` is `whole-item`                                               |
      | unset          | `--refine all`        | it refuses `loop-refine-unknown`, naming `per-story` and `whole-item`, before any read |

  Scenario Outline: the declaration records the mode, and a resume inherits it
    Given a halted loop on 143 whose declaration has `refine` <recorded>
    When `aof work loop 143 --resume <flag> --json` runs
    Then the resumed declaration's `refine` is `<resolved>`

    Examples:
      | recorded             | flag                  | resolved   |
      | `"whole-item"`       |                       | whole-item |
      | `"whole-item"`       | `--refine per-story`  | per-story  |
      | absent (pre-143)     |                       | per-story  |
      | absent (pre-143)     | `--refine whole-item` | whole-item |

  Scenario: a declaration built without the key is still usable
    Given a declaration built by the mesh assignment directive or the trigger declaration, which pass no `refine`
    When `readLoopDeclaration` reads it back
    Then it is usable and its `refine` is `null`, which the shell reads as the configured mode

  Scenario: the vocabulary is spelled once
    When FF-14302 (`test/arch/loop/acd-loop-refine-scope-single-home.test.mjs`) scans comment-stripped `packages/**/src`
    Then `per-story` and `whole-item` are a frozen array exported once from `packages/contracts/src/loop-bounds.mjs`
    And outside that file, `"whole-item"` is spelled once, in `engine.mjs`'s one comparison constant

  Scenario: the usage and the operator guide name the flag
    When `aof work loop --help` prints its usage
    Then it lists `--refine per-story|whole-item`
    And `docs/acd.md` names `work.loop.refine` and the `--refine` override
