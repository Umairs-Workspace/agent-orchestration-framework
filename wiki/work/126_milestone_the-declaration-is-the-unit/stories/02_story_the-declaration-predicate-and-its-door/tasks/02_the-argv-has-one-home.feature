@executable @cli @work @work-stream
Feature: The argv has one home — a zero-import leaf composes ["work","loop",…] and spells every flag once, and both the trigger face and the declarations producer import it

  `LOOP_INPUT_KEYS` (`src/commands/trigger.mjs:150`), `LEVEL_FLAG` (`:160`), `loopInputOf`
  (`:213-217`) and `argvFor` (`:219-221`) live inside a registered command module. TECH_DEBT item
  26 measures what importing one registered command module from another does: it closes the
  registry TDZ ring. `src/loop-bounds.mjs` is the precedent for the shape this needs — 30
  dependents, 0 imports. Those four move to a zero-import leaf, `src/loop-argv.mjs`, which gains a
  `RESUME_FLAG` spelled once. `RESOLVED_TRIGGER_KEYS` (`:145`) does NOT move: it enumerates the
  trigger row's four keys, which is the face's own contract and no part of the loop's input.

  63/ADR-001's rule stands, and it is why the route is a PARAMETER rather than a constant in the
  leaf: `src/commands/trigger.mjs:511-518` reads `work:loop`'s own `cli.route` off its
  registration through a deferred dynamic import and refuses `trigger-loop-unregistered` when the
  registry answers for no such command, so the argv's leading tokens ARE the command the registry
  answers for. A leaf that spelled `["work","loop"]` itself would retire that reading. The
  declarations producer reaches the route the same deferred way, which is the idiom that keeps
  the ring open.

  THE SHAPE THIS CONTRACT EXPECTS, stated once so `tasks/03`'s builder agrees:
  `argvFor(route, input, options = {})` → a frozen array, where `input` is `{ scope, level }` and
  `options.resume === true` appends `RESUME_FLAG`. Called with two arguments it composes exactly
  what it composes today, which is what makes the trigger face's move a move and not a change.

  63/ADR-001's other half also stands: the resolution's whole output is one `work:loop` input plus
  the argv that carries it — ONE OBJECT, TWO RENDERINGS, derived not assembled. Two controls pin
  the composer today (`test/arch/loop/acd-trigger-is-a-caller-not-a-coordinator.test.mjs:38`,
  `test/arch/loop/acd-trigger-is-non-vacuous-over-this-repo.test.mjs:29`) and
  `test/loop/trigger-command.test.mjs:27` exercises the face; all three follow the composer by
  re-pointing an import specifier and nothing else.

  What would quietly undo this: the producer spelling `["work","loop",scope,"--resume"]` inline
  "just this once"; a `--resume` literal in two files; a flag the leaf spells that `work:loop` does
  not declare (parsed as an unknown flag and refused at the door); the leaf importing the command
  registry to look the flags up, which is the ring again; and the leaf growing a scope check,
  which would be a second grammar beside `decideLoopScope`.

  ADR-005 §4. 63/ADR-001. TECH_DEBT 26. FF-12605.

  Scenario Outline: the leaf composes one argv from one declaration
    Given `work:loop`'s own declared `cli.route`, read from the registry
    And a recovered declaration with scope <scope>, level <level> and cap <cap>
    When the leaf composes its argv with resume <resume>
    Then the result is <argv>
    And no token names the cap, and composing twice from the same declaration yields the same array

    Examples: both admitted scope forms, every level, and the resume flag spelled once
      | scope      | level  | cap | resume | argv                                                    |
      | `124`      | `L2`   | 3   | yes    | `["work","loop","124","--level","L2","--resume"]`       |
      | `120-130`  | `L1`   | 3   | yes    | `["work","loop","120-130","--level","L1","--resume"]`   |
      | `124`      | `L3`   | 5   | yes    | `["work","loop","124","--level","L3","--resume"]`       |
      | `124`      | `L2`   | 3   | no     | `["work","loop","124","--level","L2"]`                  |
      | `120-130`  | `L2`   | 3   | no     | `["work","loop","120-130","--level","L2"]`              |

    Examples: an absent level emits neither the flag nor a value token; a scope the grammar refuses is composed verbatim, because a check here would be a second scope grammar beside `decideLoopScope` — and `work:loop` refuses it at its own door anyway
      | scope      | level  | cap | resume | argv                                                    |
      | `124`      | absent | 3   | yes    | `["work","loop","124","--resume"]`                      |
      | `53/02`    | `L2`   | 3   | yes    | `["work","loop","53/02","--level","L2","--resume"]`     |
      | `130-120`  | `L2`   | 3   | no     | `["work","loop","130-120","--level","L2"]`              |

  Scenario: L3 is composable and the leaf validates nothing
    Given `LOCKED_LOOP_LEVELS` is empty, so `resolveLoopLevel` admits every member of `LOOP_LEVELS`
    When the leaf is asked for each of `L1`, `L2` and `L3`
    Then each composes its own `--level` value, and the leaf consults no level vocabulary to do it
    And the leaf refuses nothing and returns no refusal shape, because `decideLoopScope` and `resolveLoopLevel` are where a refused scope or level is answered

  Scenario: the leaf has zero project imports and is the only composer
    Given the source tree under `src/`
    When it is inspected with comments stripped
    Then `src/loop-argv.mjs` carries no `import` statement of any kind, and it imports cleanly in a fresh process
    And the only `["work","loop"]` array in `src/**`'s modules is `work:loop`'s own declared `cli.route`
    And `--level` and `--resume` are each BOUND TO A CONSTANT in exactly one module, the leaf — the loop's own usage and resume-hint strings (`src/commands/loop.mjs:2023`, `:2052`) bind neither and are untouched
    And `src/commands/mesh/identity.mjs` contains no `--` flag literal
    And `src/commands/trigger.mjs` imports `argvFor`, `loopInputOf`, `LEVEL_FLAG` and `LOOP_INPUT_KEYS` from the leaf, re-declares none of them, and still exports `RESOLVED_TRIGGER_KEYS` itself
    And every composed argv opens with `work:loop`'s own declared `cli.route`

  Scenario Outline: every flag the leaf spells is one work:loop declares
    Given the token <token>, which the leaf can emit
    When it is checked against `work:loop`'s `cli.spec.flags` and its input schema
    Then it is declared in both, carrying input key <input key>
    And no other token the leaf can emit begins with `--`

    Examples: two tokens, and the list is exhaustive — a third would be a flag parsed as unknown
      | token       | input key   |
      | `--level`   | `level`     |
      | `--resume`  | `resume`    |

  Scenario: the trigger face composes exactly what it composed before the move
    Given the trigger declaration fixture the delivered suite resolves today
    When `aof work trigger <trigger> --json` runs after the composer has moved
    Then the resolved row's argv is `["work","loop","63","--level","L1"]` — the literal `test/loop/trigger-command.test.mjs:289` already pins
    And the resolved row still carries exactly the four keys `trigger`, `scope`, `level` and `argv`
    And the face still refuses `trigger-loop-unregistered` when the registry answers for no `work:loop`
    And the two 63 controls and the trigger suite are green with only their import specifier changed — no assertion added, none dropped
    And the trigger family's own invariants — no spawn, no write, no timer — are asserted over the same family they were asserted over before, the leaf being no member of it
