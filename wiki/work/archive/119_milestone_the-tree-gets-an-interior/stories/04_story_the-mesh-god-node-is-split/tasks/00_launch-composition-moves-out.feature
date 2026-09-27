@executable @cli @work @distribution
Feature: Launch composition leaves the worker — the composer, its two codes, and the directive's own `command`/`launch` reads

  Item 83's seam 2 is the cheapest first cut because it is already shaped for one: **81 lines**
  (`sed -n '179,243p;1393,1408p' src/mesh/worker-execution.mjs | wc -l`), of which **29 are code**
  against 49 of comment (the same `awk` comment/code census ARCHITECTURE's table runs). It is 63/03's
  own +85, fenced correctly when it landed, and it touches nothing the rest of the handler owns: a
  declaration read off the workspace root, a scope read off the frame, and a refusal or an options
  bag handed back.

  This is a SUBTRACTION. The composer moves; it does not come to exist twice. Every coded outcome the
  worker has today is emitted from the same call site, in the same order, before any worktree or run
  exists. The 56 dependents never reached this seam — `composeDirectiveLaunchOptions` is
  module-private, and `ASSIGNMENT_LOOP_LAUNCH_UNDECLARED` / `ASSIGNMENT_LOOP_LAUNCH_SCOPELESS` are
  the only exported names on it, riding the parent's re-export (task 02 holds that surface).

  The hazard is measured, and it is a control rather than the code.
  `acd-assignment-resolves-to-a-loop-call` asserts FOUR positive matches over the worker's source at
  `:280-287` — `compileFrozenSet(await readFrozenSet(…)).unattendedLaunch`, `declaredLaunch:
  declared`, `program: declared.program`, `args: [...declared.args, scope]`. Moving the composer reds
  all four at once, which is LOUD and is fixed in this diff: ADR-003 calls that a control doing its
  job. The silent half is the dangerous one. That suite freezes `MESH_FILES` at three files
  (`:51-55`) and sweeps exactly those for a second slash-command speller, a program literal and a
  `--level` token. Leave the list at three and the module that now composes the launch is swept by
  nothing — a `{ program: "aof", args: [...] }` literal could be authored in the new home and no
  control in this tree would see it. That is ADR-003 §4's vacuity arriving through a refactor instead
  of a rename.

  What would quietly undo this: the parent keeping one `directive.launch` read "just for the brief";
  the new module importing the parent back for a constant; `MESH_FILES` left at three; and the
  composer re-exported AND re-defined, which reads as a clean move in a diff and is a copy.

  ADR-007 (seam 2), ADR-005, ADR-002 (intra-family, which is what makes this legal at all). FF-11907.

  Scenario: an unattended loop directive composes the launch it composes today
    Given a directive carrying a `launch` whose `scope` names a ready item
    And a workspace whose frozen set declares an unattended launch
    When the worker handles that directive
    Then the composed launch's program is the declared program
    And its argv is the declared arguments followed by that scope, in that order
    And every key the control put on the sent launch reaches the driver as it was sent
    And the spawn options bag takes exactly one spread from the composer, and reads no launch of its own

  Scenario Outline: the composer answers with a refusal or with options, and a refusal spawns nothing
    Given a directive whose `launch` is <launch>
    And a workspace whose frozen set <declaration>
    When the worker handles that directive
    Then the assignment settles failed with code <code>
    And no worktree is created, no run is minted, and no session is spawned in its place

    Examples: the worker's own two codes — never the launch seam's three admission codes
      | launch             | declaration                   | code                              |
      | `{ scope: "119" }` | admits no unattended launch   | assignment-loop-launch-undeclared |
      | `{ scope: "119" }` | will not read or will not compile | the declaring module's own code |
      | `{}`               | declares an unattended launch | assignment-loop-launch-scopeless  |
      | `null`             | declares an unattended launch | assignment-loop-launch-scopeless  |
      | `{ scope: "" }`    | declares an unattended launch | assignment-loop-launch-scopeless  |
      | `{ scope: 7 }`     | declares an unattended launch | assignment-loop-launch-scopeless  |

  Scenario Outline: the directive's `command` and `launch` are read once, in the extracted reader
    Given a directive frame that carries <frame>
    When the worker handles that directive
    Then the composition <outcome>

    Examples: presence, never truthiness — the `?? <empty>` species stays closed across the move
      | frame                           | outcome                                                  |
      | no `launch` key at all          | is skipped, and the session path stays byte-identical    |
      | `launch: null`, the key present | runs, and refuses scopeless                              |
      | `launch: {}`                    | runs, and refuses scopeless                              |
      | no `command` key                | reads null, and the session is still spawned with nothing typed |
      | `command: ""`                   | reads null, and the session is still spawned             |
      | `command: "/aof:refine 119/04"` | reads that string verbatim, and no module re-spells it   |

  Scenario: the reads have one home, and the parent no longer performs them
    Given the split has landed
    When `src/mesh/worker-execution.mjs` is read with its comments stripped through the one stripper
    Then it spells no `directive.launch`, no `directive.command`, and no `Object.hasOwn(directive, "launch")`
    And it defines neither `composeDirectiveLaunchOptions` nor either launch code
    And it obtains the command, the launch presence and the launch value from the extracted module
    And `phaseBriefContext` still receives the already-read command string as an argument, reading no frame

  Scenario: the delivered launch controls follow the code, and none of them sweeps an empty subject
    Given `acd-assignment-resolves-to-a-loop-call`'s frozen file list and its four positive matches
    When the composer's new home has landed
    Then that list names the new home alongside the modules it names today
    And the four positive matches are asserted against the file that now composes the launch
    And each sweep asserts it read a non-empty subject, so a move reds it instead of emptying it
    And a planted `{ program: "aof", args: [...] }` literal in the new home trips the detector

  Scenario: the extracted module is a leaf of its parent, never a peer
    Given the extracted launch-composition module inside `src/mesh/`
    When its static and dynamic import specifiers are read
    Then none of them resolves to `src/mesh/worker-execution.mjs`
    And none of them reaches it through a third module
