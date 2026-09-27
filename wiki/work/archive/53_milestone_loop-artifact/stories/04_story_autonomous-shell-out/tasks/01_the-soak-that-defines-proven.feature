@uat @cli @work @work-stream
Feature: The operator watches one real milestone through the shell, and the shell's account of why it stopped matches theirs

  The milestone's human gate, and the only scenario in it. ADR-008 §3 defines "proven" and the
  definition is deliberately narrow: `aof work loop <NN> --level L2` drives ONE real milestone on
  this repo's own stream from `not-started` to `done`, OR halts at exactly ONE genuine gate,
  observed by the operator, with the halt's stop id matching the operator's own reading of why it
  stopped. That last clause is what makes this a human lane rather than an agent-runnable one.
  ADR-008 §3 calls it a `@manual` lane; it is tagged `@uat` here, and the reason is the acceptance
  criterion itself — no agent can sign off "the stop id matched what I thought was happening",
  because the thing being compared is a human's independent reading of a live run against the
  machine's coded account of it. An agent asked to make that comparison would be reading the stop
  id and then agreeing with it, which measures nothing. The comparison is therefore run BLIND: the
  operator writes down why they believe it stopped BEFORE they read the shell's stop id, and the
  two are compared afterwards. This gate is the discharge condition for DELETING
  `src/bundle/commands/autonomous.md` — until it is signed off the prompt stays (ADR-008 §1/§3) —
  and the deletion is a later chore, not part of this milestone, carrying its own named
  precondition: `resolveDirectivePhase`'s `"autonomous"` return becomes a dangling directive the
  moment the prompt goes and must be superseded in the same diff (ADR-002 §4). Signing this off
  authorises the chore to be raised; it does not authorise the deletion, and it is not a review of
  the shell's internals — every structural claim about the loop belongs to FF-5301…FF-5311.
  This lane deliberately has NO suite file, and that is a design decision rather than an omission
  (ADR-011 §1): a human's blind reading is not mechanisable. The story's `@executable` evidence is
  `test/autonomous-shell-out-prompt.test.mjs` (task 00), registered in this story's own labelled
  `// milestone 53 / story 04` block.
  MIGRATION (the shrinking-`@uat` rule): this drops to `@manual` when a full L2 drive over a
  fixture stream, through the injected spawn seam, can assert the emitted stop id against a
  fixture-declared expected halt — leaving only "on real hardware, with real agents, against real
  work" as the human part; and it retires entirely when milestone 54's verification loop supplies a
  structured account of the halt that a machine can compare. Neither has been observed once yet,
  which is why the gate is still here.

  Background:
    Given stories 53/00 through 53/03 are done, so `aof work loop` exists as a registered command
    And this story's prompt change is installed, so `/aof:autonomous` renders the human shell-out `aof work loop <NN> --level L2` without `--json`
    And the payload is deployed with `node scripts/install-local.mjs` and the desktop app restarted, per the repo's build-and-restart rule
    And `aof --version` reports `payload <buildId>` matching the deployed tree — an `embedded` mode or a stale build id means the change under test is not the one running, and the soak is void
    And a REAL milestone on this repo's own stream at `status: not-started`, whose completion the operator actually wants — never a throwaway fixture
    And the operator is present at the terminal for the whole run, because a foreground loop nobody watched proves nothing about what it did

  Scenario: the operator drives one real milestone with the shell and accepts, or refuses, the shell's account of the halt
    Given the operator has written down, before starting: the exact command line, the build id, the milestone ref, and that milestone's current `status:`
    When the operator runs `aof work loop <NN> --level L2` and watches it to its end
    Then the loop drives only items inside `<NN>` — an item driven from outside the named scope is a FAIL, and the loudest one
    And the operator confirms they intervened in nothing: starting it, and at most running the resume command it printed once, is the whole of their participation — a status fixed by hand, a wedged session killed, or a phase re-driven manually makes this run inadmissible rather than failed, and it is re-run
    And on the drive-through path the milestone reaches `status: done` from `not-started` with no halt at all, which is a PASS
    And on the halt path the loop halts exactly ONCE, and the operator FIRST writes down, in their own words and without looking, why they believe it stopped
    And only then do they read the shell's halt line — its stop id, the ref it halted on, and the exact resume command
    And that halt line is the human launcher's authoritative report, not a read-only JSON probe the prompt mistook for execution
    And the operator confirms the stop id names the same thing their own reading named — a disagreement is a FAIL, and it is this gate's whole subject: the shell reporting `dependency-blocked` at what the operator can see is a human sign-off gate is the failure being tested for
    And the operator confirms the stop id is one of the shell's declared stop conditions — an uncoded stop, a bare stack trace, a silent exit, or a hang with no account is a FAIL
    And the operator confirms the halt was a GENUINE gate — something that really did need a human or really was blocked — and not the shell giving up on work it could have driven, which is a FAIL
    And the operator runs the printed resume command once: it must pick the stream up where the stream now stands, not restart the range and not error, or that is a FAIL
    And the operator confirms `/aof:autonomous <NN>` is still installed with its argument hints intact and its body naming the shell — a door that vanished, or one still carrying the prose loop, is a FAIL
    And the operator records the verdict, the evidence below, and their name and the date, in this milestone's `VERIFICATION.md`
    And the sign-off states what it discharges — that deleting the prose prompt may now be raised as a chore — and what it does not: the deletion itself, which is not this milestone's and carries the `resolveDirectivePhase` supersession as its precondition

  Examples: the observed outcome, and the verdict it earns
    | what the operator observed                                                            | halts | stop id vs. their own reading | verdict                                            |
    | the milestone went `not-started` → `done`, no halt, no intervention                   | 0     | n/a                           | PASS — the drive-through path                      |
    | halted once at a human sign-off gate the operator agrees needs a human                | 1     | matches                       | PASS — the genuine-gate path                       |
    | halted once on a dependency the operator agrees is genuinely not done                 | 1     | matches                       | PASS — the genuine-gate path                       |
    | halted once after repeated gate failures the operator agrees were real                | 1     | matches                       | PASS — the genuine-gate path                       |
    | halted once because an agent asked a question the operator agrees needed answering    | 1     | matches                       | PASS — the genuine-gate path                       |
    | halted once; the operator read a human gate, the shell said a blocked dependency      | 1     | DISAGREES                     | FAIL — the machine's account is wrong              |
    | halted once; the shell named a stop the operator cannot map onto anything they saw    | 1     | DISAGREES                     | FAIL — the account is unreadable                   |
    | halted once with a stop id outside the shell's declared set                            | 1     | n/a                           | FAIL — the stop set is meant to be closed          |
    | halted once with no stop id at all — a trace, a bare exit, a hang                     | 1     | n/a                           | FAIL — a stop with no account is not a gate        |
    | halted on something the operator judges it could have driven itself                   | 1     | matches the words, not the fact | FAIL — a correct label on a premature stop       |
    | halted, resumed with the printed command, halted again elsewhere                      | 2     | —                             | not a PASS of this gate as defined — record and re-run |
    | the printed resume command errored, or restarted the range from its first item        | —     | —                             | FAIL — the resume contract is part of the halt     |
    | drove an item outside the named scope                                                 | —     | —                             | FAIL — the scope guard is the point of the refusal |
    | passed a human sign-off gate without stopping                                         | 0     | —                             | FAIL — self-signing a human gate                   |
    | re-drove the gate more times than the resolved ceiling before stopping                | —     | —                             | FAIL — the cap the whole milestone exists to enforce |
    | the operator had to fix a status, kill a session, or re-drive a phase by hand         | —     | —                             | INADMISSIBLE — re-run; not a verdict either way    |
    | `aof --version` showed `embedded` or a stale build id                                 | —     | —                             | VOID — the change under test was not the one running |

  Examples: the evidence recorded, and the order it is recorded in
    | # | evidence                                                                   | when it is written                          |
    | 1 | the exact command line, including the scope and `--level L2`               | before the run                              |
    | 2 | `aof --version`'s mode and build id                                        | before the run                              |
    | 3 | the milestone ref and its `status:` at the start                           | before the run                              |
    | 4 | the operator's own reading of why it stopped, in their own words           | at the halt, BEFORE the stop id is read     |
    | 5 | the shell's halt line — stop id, ref, resume command — quoted verbatim     | immediately after 4, never before it        |
    | 6 | whether 4 and 5 name the same thing, and the operator's judgement of why   | after 5                                     |
    | 7 | the result of running the printed resume command once                      | after 6, on the halt path only              |
    | 8 | the milestone's `status:` at the end, and the items the shell says it drove | after the run                               |
    | 9 | the verdict, the operator's name and the date, in `VERIFICATION.md`        | last                                        |

  Examples: the stop the shell reports, and the operator reading that MATCHES it
    | stop id                | the operator's own words that count as a match                                      |
    | `uat-gate`             | "it stopped because something here needs me to sign it off"                          |
    | `dependency-blocked`   | "it stopped because the next thing is waiting on something that isn't done"          |
    | `cap-exhausted`        | "it stopped because it kept failing the gate and gave up rather than thrash"          |
    | `session-needs-input`  | "it stopped because the agent asked me a question it couldn't safely answer itself"  |
    | `run-not-retryable`    | "it stopped because the agent's output was bad — not because the machine fell over"  |
    | `retry-parked`         | "it stopped because we hit the API limit and it's waiting until the reset"           |
    | `unmapped-item-type`   | "it stopped because the next item is a kind it has no phase for"                     |
    | `operator-interrupt`   | "it stopped because I interrupted it"                                                |
