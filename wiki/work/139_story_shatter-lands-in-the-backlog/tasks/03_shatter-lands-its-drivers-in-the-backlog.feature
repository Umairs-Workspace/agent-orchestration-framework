@executable @docs @planning @scaffold
Feature: the shatter prompt writes backlog drivers with slug edges, and leaves the number to promotion under either intake

  WHAT THE PROMPT SAYS TODAY (`src/bundle/commands/shatter.md`). Step 2: "Number every driver as the
  next contiguous block in `work.dir`". Step 3: a spike is `NN_spike_<slug>/SPIKE.md`. Step 5:
  `depends: [NN, …]`, "backward-only (a driver depends only on lower-numbered items)", and "number
  the spike **below** the milestone it gates". Its `<config>` never reads `work.intake`. That is the
  prompt arithmetic 127/ADR-003 §1 removed from every `aof:add-*` prompt, still living in the one
  prompt that mints the most numbers at once.

  WHAT IT SAYS AFTER. One authoring path, as `aof:add-milestone` has.

    <config>   reads `work.intake`; absent reads as `"stream"`, and only the exact string `"backlog"`
               selects the backlog — the sentence `aof:add-milestone` carries.
    step 2     the drivers are ordered in PRD order, a spike before the milestone it gates. No
               number is worked out: deciding one is `aof work promote`'s job (41/ADR-002).
    step 3     each driver is `<work.dir>/backlog/[<group>/]<type>_<slug>/`, whatever the intake,
               with a bare `number:` and a `# <Title>` heading carrying no number prefix. The group
               comes only from an `in <group/path>` argument; none is invented.
    step 5     an edge to another driver of THIS shatter is that driver's slug, and only ever
               to one earlier in PRD order. An edge to an item already in the stream is its
               number, as before. The spike gate is the consumer's slug edge to the spike.
    step 6     the validate that must be green now checks the slug edges resolve and form no
               cycle (task 01) — the self-check is no longer the prompt's alone.
    step 7     (new) the intake decides whether they stay. Under `"backlog"` they stay, and each is
               scheduled later with `aof:promote <slug>` — promotion refuses one ahead of what it
               waits on and rewrites the edges as each lands (task 00). Under `"stream"`, run
               `aof work promote <slug> --json` over every driver in PRD order, reporting each minted
               ref; a refusal is a stop, and the drivers not yet promoted stay in the backlog.
    output     reports slugs (and, under `"stream"`, the minted refs); next is `aof:promote <slug>`
               in PRD order, or `aof:refine <NN>` under `"stream"`.

  `src/bundle/commands/promote.md` gains the other half. Step 2 says the verb also rewrites the
  slug edges other backlog items hold on the promoted item. `<progress_tracking>` names those other
  docs' `depends:` lines as the one write outside the promoted folder.

  WHAT MUST NOT MOVE. FF-12405 (`test/arch/memory/acd-learning-edge-reaches-every-cut.test.mjs`)
  pins shatter's recall block: exactly one `aof work memory` invocation, the PO as the only
  spawned role, `aof-researcher` as the only other role token, no `aof-architect` anywhere, the
  recall between step 1's seam and step 2. The recall block is left byte-identical, and the steps
  keep their numbering order. FF-12405 is the control for all of that; no case here restates it.
  The three tracked renders of each edited prompt are refreshed by `aof work update` rather than by
  hand, and the manifest and lock are regenerated with them. FF-12405's mirror legs hold shatter's
  three renders; nothing holds promote's on disk, so the last outline does. `.md` prompts are
  allow-listed for `intake` (FF-12704).

  Cases land on `test/planning/planning-prd.test.mjs`, shatter's own suite. They read the source
  prompt, as 124/02's did — by structure and token, never by whole sentences.

  What would quietly undo this: any `NN_` folder shape or "next contiguous block" left in the
  process; a `depends: [NN, …]` instruction for an edge between two drivers of one shatter; a group
  defaulted to the PRD's name; the stream branch promoting in any order but the PRD's; a mirror
  edited by hand.

  Scenario: the prompt reads the intake and works out no number
    Given the source prompt `src/bundle/commands/shatter.md`
    When its `<config>` and `<process>` are read
    Then `<config>` names `work.intake` and states that an absent key reads as `"stream"`
    And no line of `<process>` contains "contiguous block", `NN_`, "lower-numbered" or "number the spike"
    And step 2 says the drivers are ordered in PRD order and names `aof work promote` as the verb that decides a number

  Scenario: every driver is written into the backlog, under either intake
    Given the source prompt `src/bundle/commands/shatter.md`
    When step 3 is read
    Then it names the folder `<work.dir>/backlog/[<group>/]<type>_<slug>/` and says it holds whatever `work.intake` is set to
    And it says the record doc carries a bare `number:` and a heading with no number prefix
    And the frontmatter `argument-hint` offers `in <group/path>`, and no line of the prompt names the PRD as a default group

  Scenario Outline: step 5 writes each kind of edge in its own form
    Given the source prompt `src/bundle/commands/shatter.md`
    When step 5 is read
    Then it says an edge to <target> is written as <form>

    Examples:
      | target                                            | form                                       |
      | another driver of the same shatter                | that driver's slug, only to an earlier one in PRD order |
      | an item already in the stream                     | its number                                 |
      | the spike a milestone waits on                    | the spike's slug, with the spike placed before the milestone |

  Scenario: the intake decides only whether the drivers stay
    Given the source prompt `src/bundle/commands/shatter.md`
    When the step after the graph check is read
    Then under `"backlog"` it says the drivers stay and are scheduled with `aof:promote <slug>`
    And under `"stream"` it says to run `aof work promote <slug> --json` over every driver in PRD order
    And it says a promote refusal is a stop that leaves the remaining drivers in the backlog

  Scenario: the promote prompt names the rewrite
    Given the source prompt `src/bundle/commands/promote.md`
    When step 2 and `<progress_tracking>` are read
    Then step 2 says the verb rewrites the other backlog items' slug edges on the promoted item to its minted number
    And `<progress_tracking>` names those `depends:` lines as the one write outside the promoted folder

  Scenario Outline: every tracked render of the promote prompt matches a fresh render
    Given the tracked render <path>
    When the bundle is re-rendered from `src/bundle/commands/promote.md`
    Then the file's content hash on disk equals its re-render's

    Examples: shatter's three renders are FF-12405's mirror legs; promote's disk renders are asserted nowhere else
      | path                                 | why                                                              |
      | .claude/commands/aof/promote.md      | `acd-bundle-manifest-hashes` hashes the re-render, never the disk |
      | .codex/skills/aof-promote/SKILL.md   | the same                                                         |
      | .opencode/commands/aof/promote.md    | the manifest holds no `.opencode/` entry at all                  |
