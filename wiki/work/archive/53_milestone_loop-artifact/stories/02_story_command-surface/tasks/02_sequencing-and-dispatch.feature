@executable @cli @work @work-stream
Feature: The drive path — sequence via `work:next`, dispatch by the frozen phase map, drive to terminal

  This is the loop body: the thing `cli.launch` returns when neither `--json` nor `--dry-run` was
  asked for. It asks `work:next <scope>`, dispatches the answer through ADR-005 §5's frozen phase
  map, drives that phase through a `work:drive-<phase>` command, and asks again — until the scope
  is done or a stop condition halts it. The sequencing rule is a subtraction, not an addition:
  the loop NEVER re-implements `nextWork`'s walk and never filters its answer (ADR-003 §2), so it
  cannot create a ready-return at which a candidacy, lease or item-lock guard could be forgotten,
  and `src/work.mjs` is not edited by this milestone at all.

  The phase map is DISPATCH, not phase logic (ADR-009 §5): it decides WHICH existing prompt to
  run next and nothing about what that prompt does. Its two predicates come from ONE registered
  command each — `work:tasks` for "has this story authored tasks" and for the `@uat` count
  (`src/commands/tasks.mjs:44-49`), and `work:list` for "does this milestone have stories, and
  are they all done" (the same rows `work:next`'s own walk reads). Never a hand-rolled feature
  parse, never `work-doctor.mjs`'s `hasTaskFiles` — one door, one answer.

  THE SEAM, and the one fixture mechanic that makes a loop testable at all. Every scenario drives
  the launcher body in-process over a temp-`AOF_GLOBAL_HOME` fixture work stream with
  `test/support/mesh-worker-terminal-fixture.mjs`'s `{ptySpawn, which}` injected through the
  declared seam `ctx.agentSessionDriverOptions` (ADR-010 §2). The scripted
  pty's `onWrite` handler is where the fixture's "agent" ACTS: it reads the command line the
  driver typed and applies the effect that phase would have had — writing `status: done` into the
  story's record doc, or authoring a task feature — before emitting the completion sentinel.
  Without that, the fixture stream never advances, `work:next` answers with the same ref forever,
  and the loop has no fixed point to reach. What is asserted is the ORDERED sequence of spawn
  calls and typed command lines the fixture recorded, plus the run history each item ends with.
  Mechanised as `test/loop-command-sequencing.test.mjs`, imported AND spread in `scripts/test.mjs`
  inside this story's own labelled `// milestone 53 / story 02` block, so the evidence lands with
  the contract rather than after it (ADR-011 §1, TECH_DEBT item 48).
  ADR-005 §5, ADR-003 §2, ADR-002 §2, ADR-009 §5, ADR-010 §2/§4/§6, RESEARCH §Q3 and §Q8.

  Scenario: the loop drives exactly the ref `work:next` named, then asks again
    Given a fixture stream whose milestone `03` holds stories `03/01` (in-progress, tasks authored) and `03/02` (not-started, tasks authored)
    And a scripted agent that marks the story it is handed `done`
    When I run the loop body for scope `03`
    Then the first typed command line is `/aof:continue 03/01`
    And after that session settles the loop asks `work:next 03` again
    And the next typed command line is `/aof:continue 03/02`
    And no session is ever spawned for a ref `work:next` did not return
    And no `done` item is driven a second time

  Scenario: a range scope drives across milestones in the stream's own order
    Given a fixture stream with milestones `50`, `51` and `52`, each holding one ready story
    And a scripted agent that marks each story it is handed `done`
    When I run the loop body for scope `50-52`
    Then the drives occur in driver-number order — 50's story, then 51's, then 52's
    And every ref driven lies inside the range
    And the loop terminates when `work:next 50-52` answers done

  Scenario: a driver scope drives only its own milestone, with ready work elsewhere in the stream
    Given a fixture stream in which milestone `02` also holds ready work
    When I run the loop body for scope `03`
    Then every ref driven belongs to milestone `03`
    And nothing under milestone `02` is spawned, minted or written
    And this is the scope guard's whole point: `nextWork` would have offered `02`'s work to an unscoped walk

  Scenario: the frozen phase map dispatches each ready shape to its own prompt
    Given fixtures for each ready shape in the table below
    When I run the loop body over each
    Then the first typed command line is the one the table names
    And a milestone with no stories is refined, never continued
    And a story with no task features is refined, never continued
    And a milestone whose stories are all done is verified, never continued

  Scenario: a blocked answer halts the loop and names what it waits on
    Given a fixture stream where milestone `03` declares `depends: [02]` and `02` is not done
    When I run the loop body for scope `03`
    Then zero spawn calls are recorded
    And no run record is minted
    And the loop halts with the stop `dependency-blocked`
    And the human report names `03` and the unmet driver `02`, exactly as `work:next` returned them in `waitingOn`
    And the `waitingOn` list is `work:next`'s own, not a re-derived one

  Scenario: a finished scope exits cleanly, having driven nothing
    Given a fixture stream in which every item of milestone `03` is `done`
    When I run the loop body for scope `03`
    Then zero spawn calls are recorded
    And zero run records are minted
    And the loop reports the scope done and exits without a stop condition

  Scenario: an answer the loop cannot drive is never driven — `held` halts as `dependency-blocked`
    Given a fixture stream in which every actionable item of milestone `03` is held by another node's assignment
    And `aof work next 03 --json` therefore answers `state: "held"` with its `skipped` rows
    When I run the loop body for scope `03`
    Then zero spawn calls are recorded
    And zero run records are minted
    And the loop halts with the stop `dependency-blocked` — no ninth stop is invented for it (ADR-010 §4)
    And the producer names `work:next` returning `state: "held"`, which is what tells it apart from the `blocked` producer
    And the `skipped` rows are reported to the operator unchanged, each naming its holder
    And the loop never drives a ref `work:next` did not offer

  Scenario: the loop drives phases, and `work:next` decides the order — never the reverse
    Given a fixture stream whose story `03/01` is ready and whose milestone `03` has a second, later story
    And a scripted agent that marks `03/01` done
    When I run the loop body for scope `03`
    Then the loop never chooses a ref by reading the stream itself
    And every drive in the recorded sequence was preceded by a `work:next 03` answer naming that ref
    And the count of `work:next` asks is at least the count of drives plus one — the last ask is what ends the loop

  Scenario: one item, one phase at a time — the drives are serial
    Given a fixture stream with three ready stories under milestone `03`
    And a scripted agent that marks each story it is handed `done`
    When I run the loop body for scope `03`
    Then at no point are two sessions live at once at the injected seam
    And each spawn is recorded only after the previous session settled

  Scenario: a driven phase leaves a terminal run record behind it
    Given the fixture stream and a scripted agent that marks `03/01` done
    When I run the loop body for scope `03`
    And I run `aof work run-status 03/01 --json`
    Then the run the loop minted for that phase is terminal — `done`, not `running`
    And no run is left non-terminal when the loop exits without a stop
    And a second phase on the same item was therefore never refused `duplicate-run`

  Examples: the frozen phase map (ADR-005 §5), transcribed from `autonomous.md:60-81` without addition
    | ready item                             | condition                              | act                | typed command line   |
    | milestone                              | `work:list` shows no stories under it  | drive refine       | /aof:refine 03       |
    | story                                  | `work:tasks` returns `tasks: []`       | drive refine       | /aof:refine 03/01    |
    | story                                  | has tasks, status is not done          | drive continue     | /aof:continue 03/01  |
    | milestone                              | every story under it is done           | drive verify       | /aof:verify 03       |
    | uat session                            | ready                                  | halt uat-gate      | (nothing spawned)    |
    | story, after its verify                | any task reports `counts.uat > 0`      | halt uat-gate      | (nothing spawned)    |
    | spike                                  | ready                                  | halt unmapped-item-type | (nothing spawned) |
    | chore                                  | ready                                  | halt unmapped-item-type | (nothing spawned) |

  Examples: where each predicate comes from — one door, one answer (ADR-005 §5)
    | predicate                              | door        | never                                          |
    | has this story authored tasks          | work:tasks  | work-doctor.mjs's `hasTaskFiles`               |
    | does this story carry a @uat scenario  | work:tasks  | a second parse beside `src/feature-parse.mjs`  |
    | does this milestone have stories       | work:list   | a directory walk inside the loop               |
    | are this milestone's stories all done  | work:list   | a second status read                           |
    | which ref is next, and is it blocked   | work:next   | a re-implementation of `nextWork`'s walk       |
    | is the stream well-formed at the gate  | work:validate | a hand-rolled structural check                |

  Examples: what `work:next` answered, and what the loop did about it
    | work:next state | detail                        | drives | halts with          | run records minted |
    | ready           | story 03/01, tasks authored   | 1      | (none)              | 1                  |
    | ready           | milestone 03, no stories      | 1      | (none)              | 1                  |
    | ready           | uat session 04                | 0      | uat-gate            | 0                  |
    | ready           | spike 05                      | 0      | unmapped-item-type  | 0                  |
    | blocked         | waitingOn ["02"]              | 0      | dependency-blocked  | 0                  |
    | held            | every candidate held elsewhere| 0      | dependency-blocked  | 0                  |
    | done            | nothing actionable            | 0      | (none — clean exit) | 0                  |
