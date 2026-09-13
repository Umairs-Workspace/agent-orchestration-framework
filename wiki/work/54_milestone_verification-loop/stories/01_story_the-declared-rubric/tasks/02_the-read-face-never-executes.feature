@executable @cli @work @validate
Feature: The read face never executes — the bare verb is a plan, `--run` is the only door

  **This rule is not stylistic, and the cost of getting it wrong is measured.**
  `acd-work-command-cli-bijection` spawns `aof work <sub> --json` as a **real subprocess from inside
  this repo's own test suite** (`:326`, via `spawnCliSync`), over every registry-derived `work:*`
  subcommand. A `work:grade` whose bare face executed the declared rubric would therefore make this
  repo's test suite **spawn itself** — and, with a board route, make a page load spawn a test run,
  because `acd-work-command-route-coverage` stands the server up and hits every served route.

  The house already states the rule in that gate's own comment — *"this real subprocess gate can
  never start an interactive agent"* — and `work:resume` is the shipped precedent: its **bare sweep
  is the read** (`{ resumed: false, pending: [] }`, exit 0) while a ref **acts**
  (`src/commands/resume.mjs:123-149`). `work:grade` inverts nothing; it moves the act behind an
  explicit flag instead of behind an absent positional, because the positional here is the item
  under grade and cannot also be the mode switch.

  **The five registry-derived gates this story trips are enumerated, per `m19/R1`** — an ADR that
  registers a `work:*` command must name every one, and this contract is where they become
  observable. Two need a change (`argsFor`'s case; the `BOARD_DEFERRED` membership), one needs the
  new arch suites **imported and spread** (TECH_DEBT item 50: an imported-but-never-spread suite is
  invisible to the registration guard, so the spread is checked by eye at review), and two —
  `acd-command-route-derived` and `acd-launcher-seam` — need nothing, but are **verified at build,
  never assumed**.

  **What lands here and what does not, so a null is not read as a defect.** The **reader** of the
  last recorded grade lands with this story; the **writer** is **54/03** (ADR-008 §3 puts
  `brief.grade` on the run through `transitionRunStart`'s `edge.brief`, and those call sites are
  54/03's). Until 54/03 lands, every repo reads *no grade recorded yet* — the honest answer, and the
  scenarios below pin it as such rather than leaving it to look like a broken read.

  ADR-003 §3, §4, §6; ADR-008 §3.

  Scenario: the bare verb reports the plan and executes nothing
    Given a project that declares a `work.rubric`
    When `aof work grade <ref>` is run without `--run`
    Then the output reports the argv that WOULD run, its working directory, the report path and the floor
    And no process was launched
    And the declared report path is neither created nor modified
    And the command exits 0

  Scenario: the bare verb reports the last recorded grade, and says so when there is none
    Given a project that declares a `work.rubric`
    And no grade has ever been recorded for the item
    When `aof work grade <ref>` is run without `--run`
    Then the output states that no grade has been recorded for that item
    And it does not present the plan as though it were a result
    And the verdict field of a never-recorded grade is not reported as `pass`

  Scenario: a recorded grade is reported back verbatim by the read face
    Given a project whose item carries a previously recorded grade
    When `aof work grade <ref>` is run without `--run`
    Then the output reports that grade's verdict, its codes and its observed case counts
    And it reports when the grade was taken
    And nothing about the recorded grade was recomputed by reading it

  Scenario: `--run` is the only door to execution
    Given a project that declares a `work.rubric`
    When the command is invoked with `--run`
    Then exactly one process is launched
    And invoking the same command without `--run` launches none
    And no other flag, positional or environment variable reaches the spawn

  Scenario: the machine face of the bare verb is one parseable document at exit 0
    Given the bijection gate's fixture project, which declares no `work.rubric`
    When `aof work grade 03 --json` is spawned as a real subprocess
    Then it exits 0
    And its standard output parses as exactly one JSON document
    And no process was launched by it
    And the document reports `rubric-unconfigured` rather than an error

  Scenario: the command is registered once, and is CLI-reachable by its declared route
    Given the command registry
    When the registered `work:*` commands are listed
    Then `work:grade` appears exactly once
    And it carries a non-null cli adapter with an argv function and a render function
    And it is reachable through its declared route `work grade`
    And it declares no launcher seam

  Scenario: the command is a documented board-deferred member with no served route
    Given the board server standing on a project that declares a `work.rubric`
    When every served `/api/work/*` route is requested
    Then no route serves the grade
    And `work:grade` is a member of the board-deferred carve-out with its reason recorded beside it
    And a board page load launches no process

  Scenario: the grade still reaches the board, on the run record and through the existing read
    Given a project whose item carries a recorded grade on its run
    When the board's run status for that item is read
    Then the grade's verdict and codes are present in what it returns
    And `src/board-ui.mjs` was not edited to make that true
    And no file under `ui/` was edited to make that true

  Scenario: no prompt-layer wrapper is added for this command
    Given the shipped bundle commands
    When the bundle is searched for a wrapper naming the grade verb
    Then no new `/aof:*` wrapper file exists for it
    And no file under `src/bundle/commands/` was edited by this story
