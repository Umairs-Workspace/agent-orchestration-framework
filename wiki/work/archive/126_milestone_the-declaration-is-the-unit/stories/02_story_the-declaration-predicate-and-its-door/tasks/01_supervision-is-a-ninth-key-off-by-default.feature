@executable @cli @work @work-stream
Feature: Supervision is a ninth key, off by default — set by --supervised, inherited on --resume, projected as a sixth recoverable key, and never listed unless asked for

  `buildLoopDeclaration` (`src/work/loop.mjs:1130-1161`) returns eight keys, the eighth (`id`)
  appended last by 102/00 under the additive-supersession discipline; `usableDeclaration`
  (`:1164-1168`) requires five; `recoverableDeclaration` (`:1179-1189`) projects exactly those
  five — so a ninth key added anywhere else never survives `readLoopDeclaration` (`:1190-1196`).
  `resolveLoopResume` (`:1198-1222`) applies one rule to level and cap: an explicit flag wins, an
  absent one inherits, and it re-projects through `recoverableDeclaration` on the way out, so a
  sixth projected key rides `lastDeclaration` for free. The shell's flag surface is three places —
  `input.properties` (`src/commands/loop.mjs:2035-2043`), `cli.spec.flags` (`:2052-2059`) and
  `cli.argv` (`:2060-2067`) — and the input schema is closed (`additionalProperties: false`).
  Eight `brief.loop` records exist on disk today (measured at refine — `grep -rl '"loop"'
  wiki/work --include=*.json` returns 8); none carries the key.

  A DECLARED BOOLEAN FLAG IS PRESENCE-ONLY. `parseSpecArgv` (`src/spine/face.mjs:47-80`) binds a
  boolean flag to `true` on sight and never reads its inline value, and an undeclared flag is a
  coded `unknown-flag` refusal at 400 rather than a stringly option. That is why `--supervised=false`
  opts IN and `--no-supervised` is refused: both are facts about the one flag parser, not choices
  this story makes, and stating them here is what stops a builder inventing a negation.

  `SPEC §Out of scope` names why the default is off: auto-resume without an opt-in means every
  login silently spends tokens re-entering whatever was open when the lid closed.

  What would quietly undo this: the key added to `buildLoopDeclaration` but not to the recovery
  projection (it reads back `false` forever); `usableDeclaration` extended to six so every
  declaration on disk becomes unusable; a config allow-list beside the declaration (53/ADR-004's
  sibling store); a `--no-supervised` negation invented to pair with the flag; and `supervised`
  defaulting to `true` "so it works".

  ADR-004 §5-§6. 102/00. 53/ADR-004. FF-12604.

  Scenario Outline: the envelope gains a ninth key, last, and only `true` raises it
    Given a loop declaration built with supervision input <input>
    When its keys are listed
    Then there are nine, the first eight in their existing order and holding their existing values
    And the ninth is `supervised` with value <value>

    Examples: an opt-in fails closed — a value that is not the boolean `true` is not an opt-in
      | input             | value |
      | no key at all     | false |
      | `true`            | true  |
      | `false`           | false |
      | `null`            | false |
      | the string `true` | false |
      | the number `1`    | false |

  Scenario Outline: the key survives recovery, and the usability requirement stays at five
    Given run records whose newest `brief.loop` is <record>
    When `readLoopDeclaration` recovers the latest
    Then the recovered declaration is <recovered>
    And a recovered declaration's keys are `loopRunId`, `scope`, `level`, `cap`, `startedAt` and `supervised`, in that order, with `supervised` appended last

    Examples: six projected keys, five required — every declaration already on disk stays readable
      | record                                                  | recovered                                              |
      | nine keys with `supervised` true                        | six keys, `supervised` true                            |
      | nine keys with `supervised` false                       | six keys, `supervised` false                           |
      | the eight keys shipped today, with no `supervised`      | six keys, `supervised` false                           |
      | nine keys with `supervised` spelled as the string `true` | six keys, `supervised` false — the projection fails closed too |
      | exactly the five required keys and nothing else          | six keys, `supervised` false                           |
      | the five required keys plus an unknown tenth key         | six keys — the unknown key is not projected            |
      | nine keys but missing `cap`                              | the newest usable OLDER record's declaration, projected |
      | nine keys, and no older record is usable                 | nothing recovered                                      |
      | absent — the record carries no `brief.loop`              | nothing recovered                                      |
      | a string rather than an object                           | nothing recovered                                      |

  Scenario: the five-key requirement is not widened, and what is already on disk stays readable
    Given every `brief.loop` this repository's own run records carry, discovered by walking them rather than listed here
    When each is put to `usableDeclaration` and then recovered
    Then every one is usable, and every one that names no `supervised` recovers with `supervised` false
    And `usableDeclaration`'s required set is still exactly `loopRunId`, `scope`, `level`, `cap` and `startedAt`
    And the walk found at least the eight records measured at refine, so this leg has a subject

  Scenario Outline: --supervised is a launch flag and --resume inherits it
    Given a prior declaration on disk that is <prior>
    When `aof work loop <scope> <flags>` mints its runs
    Then each minted run's `brief.loop.supervised` is <minted>

    Examples: the explicit-wins, absent-inherits rule level and cap already use — no new grammar
      | prior                             | flags                    | minted    |
      | absent                            | (none)                   | false     |
      | absent                            | `--supervised`           | true      |
      | absent                            | `--resume`               | false     |
      | supervised                        | `--resume`               | true      |
      | unsupervised                      | `--resume`               | false     |
      | unsupervised                      | `--resume --supervised`  | true      |
      | supervised                        | `--resume --supervised`  | true      |
      | an eight-key record with no key   | `--resume`               | false     |
      | absent                            | `--supervised=false`     | true      |
      | absent                            | `--no-supervised`        | refused `unknown-flag` at 400, and nothing is minted |

  Scenario: the flag lands in three places and the probe is untouched
    Given the registered `work:loop` command
    When its input schema, `cli.spec.flags` and `cli.argv` are inspected
    Then `supervised` is a declared boolean in all three, and the input schema is still closed
    And `cli.spec.usage` names it
    And `aof work loop <scope> --supervised --json` returns the probe document with its ten keys unchanged and mints nothing
    And the probe's `resumable` still carries exactly `stranded` and `lastDeclaration`, and `lastDeclaration` is the six-key projection

  Scenario: an unsupervised declaration yields no row, whatever its run says
    Given a declaration with `supervised` false whose latest run is `failed runtime_offline` at attempt 1
    When the decider is asked
    Then no row is returned for it
    And the same fixture with `supervised` true returns one row, so the opt-in is what decides
