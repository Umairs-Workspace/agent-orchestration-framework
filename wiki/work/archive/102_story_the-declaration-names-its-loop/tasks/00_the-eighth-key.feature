@executable @cli @work @work-stream
Feature: The eighth key — the declaration names the loop it belongs to

  Milestone 53's declaration envelope carries seven keys — `loopRunId`, `scope`, `level`, `cap`,
  `phase`, `cycle`, `startedAt` — and no loop id. Milestone 78's projection joins a run to a
  registry loop on `brief.loop.id`. Measured at 78's gate and again here: `buildLoopDeclaration`
  (`src/work-loop.mjs:903-923`) returns exactly those seven, `declarationOf`
  (`src/loop-record.mjs:78-82`) requires `loopRunId` AND `id`, and 0 of the 64 run records under
  `wiki/work` carry a `brief.loop` at all. `scope` is a work-ref range and `level` is L1/L2/L3;
  neither ever resolves to a registry record. That is finding **F-78-A**, and this task closes its
  producer half.

  **This SUPERSEDES a delivered criterion, deliberately and in the open.**
  `53/01/tasks/05_declaration-and-resume.feature` says *"no eighth key appears for any input"* and
  *"the envelope's key set is still exactly the frozen seven"*. That feature is delivered and is
  therefore immutable: it is not edited, not annotated and not tagged. The new rule lives here, in
  the accepting item's own contract — the same move `55/05/tasks/00_the-ladder-widens.feature` made
  when it opened the L3 rung 53 had locked, and the control that pinned the old rule is retired in
  the same diff that makes it false rather than narrowed until it passes again.

  **The eighth key is appended LAST**, which is this repository's additive-supersession discipline
  and not a taste: `src/run-store.mjs` grew its record from nine keys to thirteen to fourteen to
  fifteen to sixteen by appending, so every earlier key kept its name, meaning and serialised
  position and every older record read forward. The seven are untouched here for the same reason.

  **A declaration cannot be built without one.** The engine refuses an absent or unshaped id rather
  than carrying it through the way it carries `loopRunId`, because the defect this story exists to
  close is precisely a key with no producer — everything above it builds, goes green, and reports on
  nothing (78/R1). A passthrough would let a later edit to the shell drop the id and leave a
  declaration that still resumes, still validates and silently returns coverage to zero. The refusal
  makes that a red seam instead of a quiet regression. `LOOP_REFUSALS` gains a sixth member, appended
  last, by the same additive discipline that already took it from the four `53/02/tasks/01` names to
  today's five when 55 added `loop-level-gate`.

  **The engine stays pure and stays blind to the registry.** It opens no file, reads no clock and
  loads no loop records; the id arrives as an input, the way `loopRunId` and `startedAt` do. Whether
  that id resolves to a declared node is a different question, asked by the reader (`tasks/02`) and
  pinned against the shipped registry by a check (`tasks/01`) — never by the engine.

  Scenario: the envelope carries eight keys and the original seven are where they were
    Given an admitted invocation at scope `53`, level `L2`, cap 3, driving `continue` at cycle 2
    And the loop id `loop:autonomous-cascade`
    When the engine builds the declaration
    Then its key set is exactly `loopRunId`, `scope`, `level`, `cap`, `phase`, `cycle`, `startedAt`, `id`
    And the first seven keys hold the same values, in the same order, as they did before this change
    And no ninth key appears for any input

  Scenario: the eighth key serialises last, in every process
    Given a declaration built from the same input twice in two processes
    When each is serialised
    Then `id` is the final key in both
    And the two serialisations are byte-identical

  Scenario: the loop id is an input, carried through verbatim
    Given the loop id `loop:autonomous-cascade` supplied by the caller
    When the engine builds the declaration
    Then `id` is byte-identical to its input
    And the engine loaded no loop registry to obtain it
    And the engine minted no id of its own

  Scenario: a declaration cannot be built without a loop id
    Given an otherwise admitted invocation carrying no `id`
    When the engine is asked for a declaration
    Then no envelope is built
    And the decision is a refusal naming the missing loop id
    And the same answer is given for an empty string and for a non-string

  Scenario: the id is checked for SHAPE, never for registry membership
    Given the loop id `loop:no-such-loop`, which no registry declares
    When the engine builds the declaration
    Then the envelope is built and carries that id
    And nothing here consults a registry to decide it
    And what happens to an undeclared id is the reader's answer, not the engine's

  Scenario: the refusal set gains exactly one member, appended last
    Given the exported loop refusal set after this change
    When its members are read
    Then it carries the five prior codes unchanged, in their prior order
    And the new code is the sixth and final member

  Scenario: an earlier guard still decides first
    Given an invocation carrying no `id` and also a refused scope, level or cap
    When the engine is asked for a declaration
    Then the decision is the scope, level or cap refusal — unchanged from before this change
    And the missing-id refusal never masks a guard that was already deciding

  Scenario: the resume reader still recovers exactly five keys
    Given a most-recent declaration carrying all eight keys
    When the engine reads it for a resume
    Then the recovered declaration carries `loopRunId`, `scope`, `level`, `cap` and `startedAt`
    And it carries no `id`
    And it carries no `phase` and no `cycle`

  Scenario: a run minted before this change still resumes
    Given the most recent run in scope carries a seven-key declaration with no `id`
    When the engine reads it for a resume
    Then the declaration is usable and the resume inherits its level, cap, loop run id and start instant
    And the absent `id` makes no difference to what a resume recovers

  Examples:
    | envelope key | value                                                             | new |
    | loopRunId    | minted once per invocation by the caller; inherited on a resume   | no  |
    | scope        | the admitted scope string, verbatim                               | no  |
    | level        | the resolved `L1`, `L2` or `L3`                                   | no  |
    | cap          | the resolved gate-retry ceiling, read never chosen                | no  |
    | phase        | `refine`, `continue` or `verify` — which phase THIS run is        | no  |
    | cycle        | the 1-based cycle index for this `(ref, phase)`                   | no  |
    | startedAt    | the LOOP's start instant, ISO-8601 Z, supplied by the caller      | no  |
    | id           | the registry id of the loop this run belongs to, supplied by the caller | yes |

  Examples:
    | supplied `id`             | outcome                                            |
    | `loop:autonomous-cascade` | built, carried through verbatim                    |
    | `loop:no-such-loop`       | built — membership is not the engine's question    |
    | absent                    | refused, naming the missing loop id                |
    | empty string              | refused, naming the missing loop id                |
    | a non-string              | refused, naming the missing loop id                |
