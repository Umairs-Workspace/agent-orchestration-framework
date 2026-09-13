@executable @cli @work @validate
Feature: The rubric is declared — an argv, its environment, its scope and its report

  aof does not know that this repo's suite must run under `AOF_GLOBAL_HOME`, that
  `global-work-propagation` cannot bind a port a live daemon already holds, or that the full suite
  is unsafe on the control node. **It must not guess.** The hazards are the project's to declare;
  aof's job is to run precisely what was declared, and to say so plainly when the declaration will
  not carry a run.

  The home is a sibling **subtree**, not a sibling meaning: `work.controls.runners`
  (`src/work-doctor-controls.mjs:93`) answers a different question — *which files register controls*
  — and its leg B opens each entry **as a file** (`work-doctor.mjs:439-450`). Overloading it with
  commands would break that leg. `m48/ADR-003`'s rule, cited by `70/ADR-005`: two facts, two homes,
  no join. Measured at HEAD, this repo sets no `work.controls` key at all and `aof work doctor 70`
  reports `control-runner-unchecked` today — the honest no-op, live, and this task must leave it
  reading exactly that.

  ```jsonc
  work.rubric = {
    command: ["node", "<the project's runner>"],     // ARGV ARRAY. Never a shell string.
    args:    { ref: "--scope" },                     // OPTIONAL. Absent ⇒ the runner runs whole.
    env:     { "AOF_GLOBAL_HOME": "…" },             // What the runner NEEDS.
    report:  { format: "tap", path: "…", floor: 1 }, // WHERE, in WHICH format, and the FLOOR.
  }
  ```

  **Two contract rulings taken here, because ADR-004 leaves them open — and neither amends the
  ADR** (54/00's precedent: a contract may settle a shape the ADR did not reach; promoting the rule
  into the ADR is an architect act, not a refine one).

  **(1) A `work.rubric` that is PRESENT but unusable is `runner-spawn-failed`, not
  `rubric-unconfigured`.** The two are opposites in the loop, and conflating them is the expensive
  mistake: ADR-007 §3 makes `rubric-unconfigured` the one `indeterminate` that **proceeds exactly as
  today**, so routing a mis-typed declaration there would silently swallow it — a project that tried
  to declare a rubric and got the shape wrong would meet the same behaviour as one that never tried.
  A declaration that exists and cannot be launched is *a runner aof could not launch*, which is that
  code's own stated meaning (ADR-005 §3), and it **halts**. No tenth code is invented: FF-5403 pins
  `GRADE_CODES` by set-equality on the frozen nine.

  **(2) The child INHERITS the ambient environment, the declared `env` is overlaid on it, and aof
  contributes exactly one variable of its own — ADR-003 §5's re-entrancy stamp.** *"The environment
  is DECLARED, never inferred"* (ADR-004 §2) governs what **aof** supplies, not whether `PATH`
  exists: a child with an emptied environment cannot resolve `node`, and `graphifySpawnOptions`
  (`src/graphify.mjs:210-218`) — the envelope ADR-005 §5 names as this spawn's shape — overrides
  `env` nowhere. What the rule forbids is aof inventing a variable the project did not ask for.

  ADR-004 §1–§4; ADR-005 §3.

  Scenario: the declared argv is what runs, element for element
    Given a project whose `work.rubric.command` declares a program and its arguments as an array
    When the rubric is graded with `--run`
    Then the process launched is that program with exactly those arguments, in that order
    And the record reports the command that was actually run
    And no element of the declaration was split, joined or re-quoted on the way to the child

  Scenario: an argument that looks like shell is an argument, not shell
    Given a project whose `work.rubric.command` carries an argument containing shell metacharacters
    When the rubric is graded with `--run`
    Then that argument reaches the runner as one argument, its characters verbatim
    And nothing in it was interpreted as a redirection, a pipeline or a second command
    And the grade is decided by the report the runner wrote, not by a shell's exit status

  Scenario Outline: a declaration that cannot carry a run is refused, and refusing is not proceeding
    Given a project whose `work.rubric` is present and whose `command` is <declaration>
    When the rubric is graded with `--run`
    Then the verdict reads `indeterminate`
    And the codes contain `runner-spawn-failed`
    And the codes do not contain `rubric-unconfigured`
    And no process was launched

    Examples: present, and unusable
      | declaration                                    |
      | a single string rather than an array           |
      | an empty array                                 |
      | an array whose first element is not a program  |
      | absent, while other `work.rubric` keys are set |

  Scenario: scope is declared, and an absent scope runs the suite whole KNOWINGLY
    Given a project whose `work.rubric` declares no `args.ref`
    When the plan for an item is read
    Then the planned argv carries no scope argument
    And the plan states that the runner will run whole
    And a reader can tell the whole-suite run was the declaration's choice rather than aof's

  Scenario: a declared scope flag carries the item's own ref
    Given a project whose `work.rubric.args.ref` declares a scope flag
    When the plan for an item is read
    Then the planned argv carries that flag followed by the item's ref
    And the flag appears exactly once
    And planning the same rubric for a different item changes only the ref that follows it

  Scenario: the declared environment reaches the runner, and aof adds one variable of its own
    Given a project whose `work.rubric.env` declares a variable the runner needs
    When the rubric is graded with `--run`
    Then the runner observes that variable with the declared value
    And a variable of the same name already in the ambient environment is overridden by the declared one
    And the ambient environment is otherwise still visible to the runner
    And the only variable aof contributed that the project did not declare is the re-entrancy stamp

  Scenario: the report declaration says where, in what format, and how little is too little
    Given a project whose `work.rubric.report` declares a format, a path and a floor
    When the plan for an item is read
    Then the plan names the format the report will be read in
    And the plan names the absolute path the report is expected at, resolved from the workspace root
    And the plan names the floor the observed case count must reach
    And planning creates, reads and deletes nothing at that path

  Scenario: `work.controls.runners` keeps its meaning, its readers and its findings
    Given a project that declares a `work.rubric`
    And that project sets no `work.controls.runners`
    When `aof work doctor` is run over that project
    Then its findings are the same findings it reported before the rubric was declared
    And the controls lane still reports `control-runner-unchecked`
    And no finding treats a `work.rubric` entry as a file to open

  Scenario: the two keys are read apart, and neither is derived from the other
    Given a project that declares both a `work.rubric` and a `work.controls.runners`
    When `aof work doctor` is run over that project
    And the rubric's plan is read
    Then the controls lane reports over the `work.controls.runners` entries only
    And the plan is built from the `work.rubric` entries only
    And removing either key leaves the other's answer unchanged
