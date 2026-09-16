@executable @docs @work @work-stream
Feature: The prompt hands over — one command named as its body, and no second copy of the rules to follow

  The document a model reads when an operator types `/aof:autonomous <range>`. Today that
  document IS the loop: it tells the model to ask `aof work next`, maps the answer to a phase,
  wraps each item in run verbs, counts retries against a config cap, and lists the conditions on
  which to hand back — none of it enforced by anything other than the model choosing to comply.
  After this story the same document names ONE command as the work it delegates and carries no
  second account of the loop's rules, because two homes for one rule is the disease this
  milestone exists to cure (ADR-008 §1). The DOOR is untouched: same id, same bundle membership,
  same argument hints, same callers, and no `/aof:loop` or `/aof:drive-*` beside it, because
  `/aof:autonomous` already IS the shell's prompt-side door (ADR-008 §2/§4). Two things in the
  document are not loop shell and stay, re-anchored on what the shell reports: the `--solo`
  execution-mode resolution and the `--ship` post-accept `aof:code-review` step. The cap keeps
  one home and this document is no longer it (ADR-009 §1). Each phase's what-to-do stays its own
  prompt, byte-for-byte (ADR-009 §5). And `resolveDirectivePhase` is not opened at all — which is
  precisely why a milestone continue BECOMES a loop with zero code change (ADR-002 §4), the one
  consequence of this story that is observable outside the document itself. Every scenario below
  is an observation a reader of the shipped prompt (or a caller of the door that names it) can
  make; the comment-stripped token grep is FF-5310's leg, not this file's — these are the
  reader's. The delegated command is the HUMAN launcher, `aof work loop <range> --level L2`, without
  `--json`; 53/02's machine face stays a read-only probe. Where a Then says "finds no answer here", it means the document offers the reader no
  procedure to follow for that question — the answer moved into the shell, and a reader who went
  looking for a second copy would come back empty-handed.
  Mechanised as `test/autonomous-shell-out-prompt.test.mjs` — the bundle-reader legs, the door legs,
  the spawned `aof work continue <ref> --json` leg and the child-process launcher/probe matrix in one
  suite — imported AND spread in
  `scripts/test.mjs` inside this story's own labelled `// milestone 53 / story 04` block, so the
  evidence lands with the contract rather than after it (ADR-011 §1, TECH_DEBT item 48).
  The launcher child inherits a temp `PATH` with two hermetic leaves: `aof` launches this checkout's
  `bin/aof.mjs`, and `claude` records
  the prompt it receives and exits cleanly, while the production face, provider resolution, PTY,
  driver, command registry and run store remain real. This is not a new production seam and is not
  the in-process `ctx.agentSessionDriverOptions` seam. Pre/post fixture file-and-byte snapshots plus
  the provider log distinguish a real drive from a probe. Each Examples table is an executable case
  inventory: parameterisation is welcome, but every row must be identifiable in assertions; a
  string-presence test cannot substitute for any child-process row.

  Background:
    Given the bundle member `autonomous` as `loadBundle()` parses it — its `description`, its `argument-hint`, and its body
    And the rendered `.claude/commands/aof/autonomous.md` that `renderBundleOutputs(loadBundle(), { runtimes: ["claude"] })` produces — the bytes a session actually reads
    And the bundle descriptor as `readDescriptor()` returns it
    And a temp fixture work stream under an isolated `AOF_GLOBAL_HOME`, for the spawned `aof work continue <ref> --json` reads

  # ---------------------------------------------------------------- what the reader IS told

  Scenario: the prompt delegates the range to exactly one command, and it is the shell
    Given a reader who has just been handed `/aof:autonomous 50-53`
    When they read the document for what to run
    Then they are told to run `aof work loop` with the range, at `--level L2`, without `--json`
    And that is the ONLY command the document offers for driving the range
    And the only other command it names at all is `aof:code-review <NN>`, which is the `--ship` PR act, not a loop act
    And nothing in the document offers a way to drive the range without it
    And the prompt states that `--json` is the read-only probe, never the way it launches work

  Scenario: the exact command in the prompt enters launcher mode and drives real work
    Given a black-box fixture stream with one ready item and temp-PATH `aof` and Claude executables that launch this checkout and record/complete its phase
    When a child process executes exactly `aof work loop <range> --level L2` as the prompt says
    Then the child enters the launcher rather than returning the machine probe
    And at least one run record is minted for the item the shell drove
    And the temp provider log proves the phase command was actually driven
    And the authoritative human report names that driven ref and phase
    And the same command with `--json` remains read-only, carries `driven: []`, makes no provider call, and leaves every fixture file and byte unchanged

  Scenario: the prompt tells the reader not to re-implement what it just delegated
    When a reader looks for permission to sequence, dispatch, gate or retry by hand
    Then the document tells them not to re-implement the loop, the phase mapping, the gate, the retry or the stop conditions
    And it says whose they are: the shell's
    And the instruction names all five, so a reader cannot read it as covering only the sequencing

  Scenario: the reader is told what to report, and every field of it comes from the shell
    Given the shell has returned
    When the reader writes their report
    Then they report the items the shell says it drove
    And when the shell completes they report only the accepted milestone refs the shell names
    And on a halt they report the shell's stop id, the ref it halted on, and the exact resume command the shell printed
    And every one of those four facts is quoted from the shell's output, not computed by the reader
    And the report ends with the first item still needing a human and that resume command — the same closing contract the door had before
    And the exercised human-report case ids exactly equal the report matrix's declared set

  Scenario: the human launcher reports a halt completely enough for the prompt to quote it
    Given a black-box fixture whose next condition is a deterministic shell halt
    When a child process executes exactly `aof work loop <range> --level L2`
    Then stdout names the shell's stop id and the ref where it halted
    And stdout names the exact `aof work loop <range> --resume` command
    And the report is the launcher's account — no second prompt-owned stop classification is present
    And no JSON probe document is substituted for the human launch report

  Scenario: wrapper-only arguments do not silently change the delegated command
    Given each advertised-argument combination in the delegated-command matrix below
    When a reader constructs the one shell command
    Then the command equals the matrix value byte-for-byte
    And only `--max-attempts N` adds shell input, as `--cap N`
    And `--solo` and `--ship` remain wrapper actions and append no shell flag

  # ------------------------------------------------------- what the reader can NO LONGER find

  Scenario: a reader asking "which phase do I run for this item?" finds no answer here
    Given a reader holding a ready item — a milestone with no stories, a story with no tasks, a story with tasks, a spike, a chore
    When they look in the document for what to do with it
    Then there is no per-item-type mapping to consult
    And the document does not tell them to ask what is next, branch on the answer, or act on a ref
    And the phase map they are missing is the shell's frozen dispatch table (ADR-005 §5), which is why the document no longer carries one

  Scenario: a reader asking "how many times do I retry the gate?" finds no number here
    When a reader looks for the fix-loop ceiling
    Then the document states no ceiling, in prose or as a number
    And it does not tell them to read a cap out of config
    And an operator's `--max-attempts N` is forwarded to the shell rather than counted by the reader
    And the resolved ceiling is the shell's single home for it (ADR-009 §1), so a reader who followed this document could not disagree with the shell about it

  Scenario: a reader asking "when do I hand control back?" finds no stop list here
    When a reader looks for the conditions on which to stop
    Then the document carries no list of stop conditions to judge against
    And it does not ask the reader to decide whether a scenario is wrong or infeasible, or whether a decision can be safely defaulted
    And those two judgements reach the shell as a needs-input session instead (ADR-005 §4), which is why the document no longer asks the reader to make them
    And the reader's only stopping instruction is to report the stop the shell reported

  Scenario: a reader asking "how do I track and recover an attempt?" finds no run verbs here
    When a reader looks for how to open, close, retry or reclaim a run
    Then the document names no run-tracking verb to call
    And it gives no failure-reason vocabulary to classify an outcome into
    And it does not describe reclaiming a stale run before starting
    And the reader records nothing — the run the shell mints is the record, read back through the run-status face the board already uses

  Scenario: the anti-loop GUIDANCE goes and the anti-loop GUARD is untouched
    When a reader looks for the policy about declining a self-triggering hand-off
    Then the document carries no such policy to apply
    And no scenario in this story asserts anything about the run store's duplicate-run guard, which is unchanged and still refuses a second non-terminal run per item
    And the distinction is the point: the guidance lived in this document and leaves with it; the guard never lived here

  Scenario: nothing in the document sends the reader back to an earlier step
    When a reader follows the document from its first instruction to its last
    Then they pass each instruction at most once
    And no step directs them to repeat an earlier one
    And no step is conditioned on a state the reader would have to re-derive by asking what is next

  Scenario: the reader is not asked to track the loop's position
    When a reader looks for how to know where the run got to
    Then the document does not describe a resume index, a per-item progress ledger, or a rule for when to mark an item complete
    And position is not a fact this document owns: the shell re-derives it from the stream on every tick (ADR-004 §1)
    And the one-line description of the door likewise no longer advertises the prompt as the thing driving the range item by item

  # ------------------------------------------------------------------------- what SURVIVES

  Scenario: `--solo` still resolves an execution mode, and the document promises nothing the shell cannot keep
    Given a reader resolving how roles are played for this run
    When they read the surviving execution-mode guidance
    Then `work.agents.mode` is still the source and `--solo` still overrides it for this run
    And the resolved mode still governs the roles this session plays itself
    And the document no longer instructs appending `--solo` to a delegated `/aof:refine`, `/aof:continue` or `/aof:verify` — this prompt delegates to none of them
    And the document does not claim the mode reaches the sessions the shell drives; the shell's input contract carries no execution mode (ADR-005 §3), and a promise the shell cannot keep is exactly the unenforceable instruction this story exists to remove

  Scenario: `--ship` still opens the PR, triggered by what the shell reported
    Given `--ship` in the arguments
    When the shell reports a milestone in the range accepted
    Then the reader runs `aof:code-review <NN>` for that milestone
    And it merges only if `work.codeReview.autoComplete` is set
    And the trigger is the shell's report of acceptance, never a loop this prompt ran
    And when the shell halts instead, no `aof:code-review` runs for a milestone it did not accept

  Scenario: every argument the door advertises still works
    Given the member's `argument-hint` as `loadBundle()` parses it
    Then it still offers `<range — NN-MM or NN>`, `[--ship]`, `[--max-attempts N]` and `[--solo]`
    And each of the four has a stated effect in the body — none is advertised and then unhandled
    And the range is still accepted in both admitted forms, a single `NN` and an inclusive `NN-MM`
    And a reader who typed the command exactly as the hint describes it before this story types the same thing after it

  Scenario: the config the document reads narrows to exactly what its survivors need
    When a reader collects the config keys the document tells them to read
    Then they read the execution-mode key `--solo` resolves against
    And they read the auto-complete key `--ship` resolves against
    And they read nothing else — every other key the document used to read belonged to the loop and left with it
    And in particular no attempt ceiling and no staleness threshold is read here

  # ------------------------------------------------------------------------------ the DOOR

  Scenario: the door keeps its identity — same id, same file, same namespace, same invocation
    Given the bundle descriptor
    Then the `autonomous` member is still declared, still `kind: command`, still `file: commands/autonomous.md`, still under the `aof` namespace, still for the `claude` runtime
    And it still renders to `.claude/commands/aof/autonomous.md`
    And the rendered member still carries `aof-invocation: /aof:autonomous`
    And an operator who typed `/aof:autonomous 53` before this story types the same thing after it and reaches the same door

  Scenario: no second door to the same act ships
    Given the bundle descriptor
    Then no member is declared with the id `loop`
    And no member is declared with an id beginning `drive-`
    And the command-member set is exactly the pre-existing set — this story adds none and removes none
    And an operator looking for `/aof:loop` finds nothing, because the act already has a door

  Scenario: the three phase prompts are untouched
    Given the rendered `refine`, `continue` and `verify` command members
    Then each is byte-identical to its pre-change render — its content-address is unchanged
    And none of them gains a shell-out, a loop, or a mention of the shell
    And a session running `/aof:refine`, `/aof:continue` or `/aof:verify` is given exactly the instructions it was given before this story
    And the shell became code while each phase's what-to-do stayed its own prompt (ADR-009 §5)

  Scenario: the edit ships through the bundle machinery with no machinery change
    Given the edited source and a regenerated shipped manifest
    When the bundle is re-rendered
    Then the shipped manifest's entries for `.claude/commands/aof/autonomous.md` and for its mapped `.codex/skills/aof-autonomous/SKILL.md` are both true content addresses of what the one authored source renders to
    And both of those addresses differ from the pre-change addresses recorded with this story — content moved each hash with no manual bump
    And rendering the bundle into a clean target writes a `.claude/commands/aof/autonomous.md` whose body is the edited source body
    And exactly TWO rendered paths' content-addresses move in this story's diff — `.claude/commands/aof/autonomous.md` and the mapped `.codex/skills/aof-autonomous/SKILL.md`, both derived from the one authored source (`src/work-bundle-runtime.mjs:13-23`, `:55-59`) — and no third
    And neither the bundle loader nor the bundle descriptor was edited to make any of that true

  Scenario: a milestone continue resolves to this door — unchanged, and therefore now a loop
    Given a fixture stream with milestone `03` and story `03/01`, no mesh configured
    When `aof work continue 03 --json` is spawned against it
    Then it answers `where: "local"` with the command `/aof:autonomous 03`
    And `aof work continue 03/01 --json` still answers `/aof:continue 03/01` — only a milestone continue cascades
    And `aof work refine 03 --json` and `aof work verify 03 --json` still answer `/aof:refine 03` and `/aof:verify 03` — only the continue verb resolves a directive
    And an unresolvable ref still degrades to the single phase rather than blocking the act
    And no line of the phase-door module changed to make this true: the milestone continue means what it always meant, and what it names is now the shell

  Examples: delegated command, exactly, for each wrapper argument combination
    | case | wrapper invocation                                      | exact delegated command                         |
    | c01  | `/aof:autonomous 03`                                    | `aof work loop 03 --level L2`                    |
    | c02  | `/aof:autonomous 03-05`                                 | `aof work loop 03-05 --level L2`                 |
    | c03  | `/aof:autonomous 03 --max-attempts 5`                   | `aof work loop 03 --level L2 --cap 5`            |
    | c04  | `/aof:autonomous 03 --solo`                             | `aof work loop 03 --level L2`                    |
    | c05  | `/aof:autonomous 03 --ship`                             | `aof work loop 03 --level L2`                    |
    | c06  | `/aof:autonomous 03 --solo --ship --max-attempts 5`     | `aof work loop 03 --level L2 --cap 5`            |

  Examples: child-process launcher/probe evidence — exact argv, real face, observable consequence
    | case | exact child command                            | fixture condition                 | provider calls | run ledger                    | stdout evidence                                      |
    | b01  | `aof work loop 03 --level L2`                  | ready `03/01`, fixture cap 1       | at least 1     | at least one new run for 03/01 | human lines name `03/01` and its driven phase        |
    | b02  | `aof work loop 04 --level L2`                  | ready uat `04`                     | 0              | unchanged                     | plain human line names `uat-gate`, `04`, and resume  |
    | b03  | `aof work loop 03 --level L2 --json`           | ready `03/01`                      | 0              | unchanged                     | one JSON document with `driven: []` and drive act    |
    | b04  | `aof work loop 03 --level L2`                  | milestone `03` ready for verify    | 1              | one completed verify run      | human lines name driven verify and accepted `03`     |

  Examples: facts the human report supplies for the wrapper to quote
    | case | outcome       | driven account                     | completion account             | halt account                                  |
    | h01  | work driven   | each driven ref and phase           | n/a                            | n/a                                           |
    | h02  | completed     | each driven ref and phase, if any   | accepted milestone refs named | n/a                                           |
    | h03  | halted        | each driven ref and phase, if any   | n/a                            | stop id, halted ref, exact `<range> --resume` |

  Examples: the question a reader brings, and where its answer lives after this story
    | reader's question                              | answered in the prompt? | whose answer it is now                          |
    | what do I run for this range                   | yes                     | `aof work loop <range> --level L2`               |
    | which phase for a ready milestone with no stories | no                   | the shell's frozen dispatch table (ADR-005 §5)   |
    | which phase for a story whose tasks are unauthored | no                   | the shell's frozen dispatch table                |
    | which phase for a story with tasks, not done   | no                      | the shell's frozen dispatch table                |
    | what to do with a ready spike or chore         | no                      | the shell halts and names the gap (ADR-005 §5)   |
    | how many gate retries before giving up         | no                      | the shell's resolved cap, one home (ADR-009 §1)  |
    | when to hand control back                      | no                      | the shell's closed stop set (ADR-005 §4)         |
    | how to record and recover an attempt           | no                      | the run store, through the shell                 |
    | whether to decline a self-triggering hand-off  | no                      | the run store's duplicate-run guard, unchanged   |
    | how to reclaim a stranded run before starting  | no                      | the shell's resume (ADR-004 §3)                  |
    | what to report when it finishes or halts       | yes                     | quoted from the shell: items driven, stop id, ref, resume command |
    | roles played inline or spawned                 | yes                     | `work.agents.mode`, overridden by `--solo` for this session |
    | whether to open a PR after acceptance          | yes                     | `--ship` → `aof:code-review <NN>`                |

  Examples: the config keys the document tells a reader to read
    | config key                             | before   | after    | why                                              |
    | `work.agents` (mode)                   | read     | read     | `--solo` resolution survives                     |
    | `work.codeReview.autoComplete`         | read     | read     | `--ship` survives                                |
    | `work.autonomous.maxAttempts`          | read     | NOT read | the cap has one home and it is the shell         |
    | `work.autonomous.heartbeatStaleMs`     | read     | NOT read | the reclaim is the shell's                       |

  Examples: the advertised arguments, and what each one does now
    | argument                | still accepted | what it does after this story                                              |
    | `NN` (a single driver)  | yes            | the shell's scope, verbatim                                                |
    | `NN-MM` (a range)       | yes            | the shell's scope, verbatim                                                |
    | `--ship`                | yes            | after the shell reports acceptance, `aof:code-review <NN>`                 |
    | `--max-attempts N`      | yes            | forwarded to the shell's cap input; the prompt counts nothing              |
    | `--solo`                | yes            | this session's role-execution mode; it does not reach the shell's sessions |
    | anything else           | as before      | this story changes no argument parsing                                     |

  Examples: what moves in the bundle and what does not
    | bundle member                          | declared id / file / namespace | rendered content-address |
    | `autonomous`                           | unchanged                      | MOVES — the body changed |
    | `refine`                               | unchanged                      | unchanged                |
    | `continue`                             | unchanged                      | unchanged                |
    | `verify`                               | unchanged                      | unchanged                |
    | every other command member             | unchanged                      | unchanged                |
    | `loop`                                 | absent — none is added         | n/a                      |
    | `drive-refine` / `drive-continue` / `drive-verify` | absent — none is added | n/a                |

  Examples: what `aof work continue` resolves to, measured on a fixture stream
    | spawned command                  | item type       | resolved command      |
    | `aof work continue 03 --json`    | milestone       | `/aof:autonomous 03`  |
    | `aof work continue 03/01 --json` | story           | `/aof:continue 03/01` |
    | `aof work continue 99 --json`    | unresolvable    | `/aof:continue 99`    |
    | `aof work refine 03 --json`      | milestone       | `/aof:refine 03`      |
    | `aof work verify 03 --json`      | milestone       | `/aof:verify 03`      |
