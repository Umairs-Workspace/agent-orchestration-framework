@executable @cli @work @work-stream
Feature: a backlog slug is promoted, then looped at its number

  Today `aof work loop <slug>` refuses with `loop-scope-unsupported`, because the loop scope admits
  only `NN` and `NN-MM` (`decideLoopScope`, `packages/work-loop/src/engine.mjs`). After this task the
  loop shell resolves such a scope with `resolveItemExact` (the exact resolver the refine/continue
  door uses) before it decides the scope. A
  row with `number: null` is a backlog item. The shell promotes it through the registered
  `work:promote`, which appends it, and runs at the `created.ref` the promotion answers. Promotion
  never goes through any other path (FF-14301).

  The declaration on every run the loop mints gains the appended key `promotedFrom`: the slug, or
  `null` when the scope was a number.

  Scenario: a backlog milestone is promoted and the loop runs at the number it was given
    Given a workspace whose stream ends at 143, and a backlog milestone `widget-sync` with no stories
    When `aof work loop widget-sync --json` runs
    Then `widget-sync` is promoted to `144` and its folder is `144_milestone_widget-sync`
    And the loop's first drive is `refine 144`
    And the declaration on that drive's run has `scope` `"144"` and `promotedFrom` `"widget-sync"`
    And the narration prints `Promoted widget-sync → 144.` before the first drive

  Scenario Outline: the scope is resolved before the scope grammar runs
    Given <row>
    When `aof work loop <scope> --json` runs
    Then <outcome>

    Examples:
      | row                                                   | scope       | outcome                                                                                   |
      | `widget-sync` is a backlog milestone                  | widget-sync | it is promoted and looped at its new number                                               |
      | `144` is a live milestone                             | 144         | nothing is promoted, and `promotedFrom` is `null`                                         |
      | `143-144` is a live range                             | 143-144     | nothing is promoted, and `promotedFrom` is `null`                                         |
      | no row resolves `nonesuch`                            | nonesuch    | it refuses `loop-scope-unsupported`, unchanged from today, and nothing is written         |
      | `widget-sync` is a backlog milestone                  | WIDGET-SYNC | it refuses `loop-scope-unsupported`: the door's exact resolver is used, nothing is guessed |

  Scenario: a promote refusal is the loop's refusal, and nothing is minted
    Given a backlog milestone `widget-sync` whose `depends:` names another backlog item
    When `aof work loop widget-sync --json` runs
    Then it refuses with the code `promote-depends-backlog` and the promotion's own message
    And `widget-sync` is still in the backlog, and no run record is written

  Scenario: a declaration built without the new key is still usable
    Given a declaration built by the mesh assignment directive or the trigger declaration, which pass no `promotedFrom`
    When `readLoopDeclaration` reads it back
    Then it is usable and its `promotedFrom` is `null`
    And a declaration written before 143, which has no `promotedFrom` key, reads back the same way

  Scenario: the loop reaches promotion only through the registered command
    When FF-14301 (`test/arch/loop/acd-loop-promotes-through-the-one-door.test.mjs`) scans `packages/work-loop/src/`
    Then no module there imports from `packages/work/src/promote/` or `packages/work/src/commands/promote.mjs`
    And the loop shell names the promotion only as `invokeRegistered("work:promote", …)`

  Scenario: the usage and the operator guide name the new scope form
    When `aof work loop --help` prints its usage
    Then the scope reads `<driver|NN-MM|backlog-slug>`
    And `docs/acd.md` says that a backlog slug is promoted first, and that a later `--resume` names the number
