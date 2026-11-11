@executable @cli @work @work-stream
Feature: a string flag can be given more than once

  `parseSpecArgv` (`packages/core/src/application/bindings/spine/face.mjs`) keeps the last value of a
  repeated string flag. A flag spec may now declare `repeatable: true`. Such a flag collects every
  value in the order given, inline (`--model=opus`) or spaced (`--model opus`), into an array. A
  non-repeatable flag still keeps its last value.

  One defect is fixed for every string flag: the inline form splits with `split("=", 2)`, which
  DROPS everything after a second `=`. So `--model=refine=opus` reads as `refine`. The inline value
  is now everything after the first `=`.

  Scenario Outline: a repeatable flag collects every value in order
    Given a command spec whose `model` flag is `{ type: "string", repeatable: true }`
    When `parseSpecArgv(<argv>, spec)` is called
    Then `options.model` is <collected>

    Examples:
      | argv                                                              | collected                                  |
      | `["143", "--model", "opus"]`                                      | `["opus"]`                                 |
      | `["143", "--model", "sonnet:high", "--model", "verify=fable"]`    | `["sonnet:high", "verify=fable"]`          |
      | `["143", "--model=refine=opus:xhigh", "--model", "verify=fable"]` | `["refine=opus:xhigh", "verify=fable"]`    |
      | `["143"]`                                                         | absent                                     |

  Scenario Outline: an inline value keeps everything after the first =
    Given a command spec whose `model` flag is `{ type: "string", repeatable: true }` and whose `level` flag is `{ type: "string" }`
    When `parseSpecArgv([<arg>], spec)` is called
    Then `options.<key>` is <value>

    Examples:
      | arg                     | key   | value             |
      | `"--model=refine=opus"`  | model | `["refine=opus"]`  |
      | `"--level=a=b"`          | level | `"a=b"`           |

  Scenario: a non-repeatable string flag keeps its last value, as today
    Given a command spec whose `level` flag is `{ type: "string" }`
    When `parseSpecArgv(["--level", "L1", "--level", "L2"], spec)` is called
    Then `options.level` is `"L2"`

  Scenario: a repeatable flag with no value still refuses
    Given a command spec whose `model` flag is `{ type: "string", repeatable: true }`
    When `parseSpecArgv(["--model"], spec)` is called
    Then it refuses with the code `missing-flag-value`
