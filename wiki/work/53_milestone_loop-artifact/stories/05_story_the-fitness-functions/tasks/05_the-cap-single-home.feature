@executable @cli @work @validate
Feature: The cap's single home — `acd-loop-cap-single-home` catches a new default, a fourth spelling and a prose loop that stayed

  One gate over three subjects that only look unrelated: who reads the gate-retry ceiling, what
  they fall back to when it is absent, and whether the document that used to own the loop still
  does. All three are the same failure — two homes for one rule — which is the disease this
  milestone exists to cure, and which would be at its worst if the milestone that moved the loop
  into code left the prose copy beside it.

  THE ROW'S READER SET IS MEASURED WRONG AND THE GATE MUST CARRY THE MEASURED ONE. FF-5310 says
  the pre-existing set is `{src/commands/run-retry.mjs, src/commands/resume.mjs}`. Measured at
  HEAD on 2026-08-15 there are THREE: `src/commands/run-retry.mjs:62`,
  `src/commands/resume.mjs:119` and `src/commands/run-start.mjs:200`
  (`config.work?.autonomous?.maxAttempts ?? 3`, feeding `shouldRetry` on the reclaimed-prior
  edge). A gate armed at the row's two-member set is RED at HEAD for a reason that has nothing
  to do with milestone 53 — which is precisely the "red because unbuilt is indistinguishable
  from red because broken" window this story exists to avoid. The gate is armed at the measured
  four — the three pre-existing plus `src/commands/loop.mjs` — and carries a self-check that
  fails if a recorded reader no longer exists, so the set is re-measured rather than trusted.

  AND THE SET IS OF RESOLUTION SITES, NOT OF PROPERTY MENTIONS (ADR-015 §6, ruling the
  contradiction this feature raised at build time). The sweep predicate was a bare property-access
  match, and it is RED at HEAD on a fifth module — `src/work-doctor-loop-ready.mjs:32` — which is
  the scorer ADR-007 §4 and ADR-010 §12 *require* to read the declaration for `cap-declared`. The
  two acts are different, and the difference is visible in one character. A RESOLVER supplies a
  default and yields a number: all four end `?? 3` and feed a retry decision. The scorer reads
  `const declaredCap = config?.work?.autonomous?.maxAttempts;` with NO `??` at all, and uses it for
  exactly two things — the predicate `Number.isInteger(declaredCap) && declaredCap >= 0` (`:33`)
  and the evidence string (`:56-57`). Its `FALLBACK_MAX_ATTEMPTS = 3` (`:21`) is never a
  resolution; it appears only inside the failing evidence text, which is precisely what ADR-010 §12
  ruled. So the scorer is the INSPECTOR of the declaration and is structurally incapable of being a
  second home for the number, because it never yields one. The gate already contains the
  discriminator — its second leg matches `…maxAttempts[^\n;]*\?\?\s*3` — it simply defined its
  population by property access instead of by that form. Two closed sets now, not one: the
  RESOLUTION set is the measured four, and the DECLARATION-INSPECTOR set is exactly
  `{src/work-doctor-loop-ready.mjs}`, admitted by name with a leg pinning that its read carries no
  `??`. ADR-009 §1 is untouched — the inspector chooses no value.

  THE SWEEP IS SCOPED TO `.mjs`, AND THE REASON IS AN INTERLOCK RATHER THAN A PREFERENCE.
  `src/bundle/commands/autonomous.md` names `maxAttempts` today (`:14`, `:90`) and is itself
  under `src/`. An unscoped `src/**` sweep would therefore report the prompt as a fifth reader
  and put this gate's two legs in contradiction with each other; and after 53/04 lands it would
  pass only because the prose leg happened to clear it. The reader-set leg reads `src/**/*.mjs`;
  the prose leg reads the prompt. Two subjects, two instruments, neither standing in for the
  other.

  THE DELETION LIST IS WIDER THAN ADR-008 §1 NAMED, and the gate is armed at the measured one.
  `aof work next` appears at ELEVEN sites in the prompt: seven leave with `<process>` and
  `<stop_conditions>`, and FOUR are outside them — the frontmatter `description` (`:2`),
  `<objective>` (`:8`), the `<config>` range bullet (`:18`) and `<progress_tracking>` (`:146`).
  `maxAttempts` (`:14`) and `heartbeatStaleMs` (`:15`) survive in a block ADR-008 §1 says STAYS,
  so both are named for deletion too. And FF-5310's original "exactly once" is STRUCK: ADR-008
  §1's own replacement text names `aof work loop` TWICE — the invocation and the
  `aof work loop <range> --resume` hint 53/04's acceptance separately requires — so a developer
  implementing the ADR verbatim would have shipped a change this row failed. The leg is now
  "names `aof work loop` at least once as its body, and names no other command for driving the
  range" (ADR-010 §21).

  Comments are stripped on both sides, in the form each subject actually uses: line and block
  comments for the modules, HTML comments for the markdown prompt.

  ADR-008 §1–§4; ADR-009 §1; ADR-010 §12, §20 and §21; ADR-015 §6; the `## Fitness functions` row
  FF-5310.

  Scenario: the set of src modules RESOLVING the cap key is exactly the measured four
    Given every `src/**/*.mjs` module with comments stripped
    When each is swept for the `work.autonomous.maxAttempts` RESOLUTION form — the access with a `??` default adjacent to it
    Then the reporting set is exactly `src/commands/run-retry.mjs`, `src/commands/resume.mjs`, `src/commands/run-start.mjs` and `src/commands/loop.mjs`
    And the comparison is exact set equality in both directions
    And a bare property-access predicate is NOT what defines the population — it reports `src/work-doctor-loop-ready.mjs`, which resolves nothing, and would put this gate's two legs in contradiction with each other (ADR-015 §6)
    And the sweep reports the number of modules it read, so a zero-module sweep fails

  Scenario: declaration inspection is a separate admitted act with exactly one member
    Given the sweep's matches partitioned by whether a `??` default FOLLOWS THE ACCESS ITSELF — adjacency, not "somewhere on the matching line"
    And the reason is measured: `run-retry.mjs:62` and `loop.mjs:150` each carry a `??` BEFORE the access (`input.maxAttempts ??`, `input?.cap ??`), so a line-anywhere predicate reads the wrong thing, and the sibling `autonomous?.heartbeatStaleMs` already wraps its `??` onto the next line at `loop.mjs:354-355` — a line-scoped predicate would one day fail a re-wrapped resolver with the INSPECTOR's message
    When the no-default partition is read
    Then it is exactly `src/work-doctor-loop-ready.mjs`, admitted by name as the `cap-declared` inspector ADR-007 §4 and ADR-010 §12 require
    And the comparison is exact set equality in both directions, so a second unadmitted no-default reader fails, naming it
    And that module's read carries no `??` — it yields a boolean and an evidence string, never a number, which is why it cannot be a second home for the bound
    And a `??` appearing on that line makes it a fifth RESOLUTION site and fails the gate, naming the module and the line
    And its `FALLBACK_MAX_ATTEMPTS` is admitted only inside the failing evidence text — the same constant used to resolve a value fails the gate

  Scenario: a fifth RESOLVER fails the gate
    Given `ctx.workspace.config?.work?.autonomous?.maxAttempts ?? 3` added to another `src/` module
    When the sweep runs
    Then the gate fails, naming the module and the line
    And the message states that a new resolution site is a second home for the bound, not a convenience
    And it fails identically whichever partition the new module would otherwise fall into — supplying a default is what makes it a resolver

  Scenario: a resolver that disappears fails the gate as a stale record
    Given `src/commands/run-start.mjs` no longer resolving the cap key
    When the recorded set is compared with the measured set
    Then the gate fails, naming the recorded resolver that no longer reads it
    And the message says the record may now be reduced — a recorded reader with no subject is how a fifth one later slips in unnoticed
    And the admitted inspector carries the same self-check: if `src/work-doctor-loop-ready.mjs` stops reading the declaration, its admission has no subject and fails

  Scenario: every resolver's fallback literal is 3
    Given each module in the RESOLUTION set
    When its fallback for the cap key is read
    Then the literal is 3
    And a resolver falling back to any other literal fails the gate, naming the module and the literal
    And a module reading the key with no fallback at all is not a resolver — it lands in the declaration-inspector partition and fails THERE unless it is the one admitted inspector, so an unadmitted no-default read is still a failure, at the leg that can name what it is

  Scenario: no new config key is introduced under work.autonomous
    Given every `src/**/*.mjs` module with comments stripped
    When the `work.autonomous.*` keys they read are collected
    Then the collected key set is exactly `maxAttempts` and `heartbeatStaleMs`, both PRE-EXISTING and both named — measured at HEAD 2026-08-17 as `maxAttempts` ×5 and `heartbeatStaleMs` ×4 (`loop.mjs:131`, `:354`, `resume.mjs:120`, `run-start.mjs:78`)
    And the set is closed by exact equality, so this milestone adding a key fails and so does a key silently disappearing
    And a gate that FILTERS `heartbeatStaleMs` out unnamed fails its own self-check — an undeclared filter is a permission nobody can audit, which is the class ADR-015 ruled six times, and the honest form is a two-member closed set rather than a one-member set with a hidden exception
    And a module reading `work.autonomous.maxCycles` fails the gate, naming the key and the module
    And it fails identically for a new key read under any other spelling of the same access path

  Scenario: the loop command reads the cap and never chooses one
    Given `src/commands/loop.mjs` with comments stripped
    When it is read
    Then it resolves the ceiling from the cap key with the literal 3 as its fallback
    And it declares no cap constant of its own
    And a module-scope `const DEFAULT_CAP = 5` in the loop command fails the gate, naming the constant

  Scenario: the autonomous prompt carries none of the loop-shell tokens it owns today
    Given `src/bundle/commands/autonomous.md` with HTML comments stripped
    When it is swept for the seven loop-shell tokens
    Then none of `Loop until`, `aof work next`, `aof work run-start`, `run-retry`, `maxAttempts`, `heartbeatStaleMs` or `stop_conditions` appears
    And `aof work next` is gone from ALL ELEVEN of its sites, including the four outside `<process>`/`<stop_conditions>` — the frontmatter `description` (`:2`), `<objective>` (`:8`), the `<config>` range bullet (`:18`) and `<progress_tracking>` (`:146`)
    And `maxAttempts` (`:14`) and `heartbeatStaleMs` (`:15`) are gone from the `<config>` block that otherwise stays — the cap and the staleness threshold are the shell's (ADR-010 §21)
    And each token planted back into the prompt fails the gate, naming the token and its line
    And a token inside a stripped HTML comment does not fail it

  Scenario: the prompt names `aof work loop` at least once, as its body, and names no other command for driving the range
    Given the prompt with HTML comments stripped
    When `aof work loop` is counted
    Then it appears at least once
    And zero occurrences fail the gate — a prompt that deleted its loop and named no replacement is worse than the prose loop it removed
    And TWO occurrences PASS: ADR-008 §1's replacement text names the invocation and the `--resume` hint, so the row's original "exactly once" would have failed a verbatim implementation (ADR-010 §21)
    And any other command named for driving the range fails the gate, naming it — one body, not a second procedure
    And the rejection is driven by rows `CAP-MUT-14` and `CAP-MUT-15`; merely checking the seven deletion tokens does not prove the closed alternate-driver rule

  Scenario: the prompt keeps what is not loop shell
    Given the prompt with HTML comments stripped
    When it is read
    Then the `--solo` execution-mode resolution is still present
    And the `--ship` step is still present
    And a prompt that dropped either fails the gate, naming the block that went missing

  Scenario: the bundle manifest gains no loop or drive member
    Given `src/bundle/bundle.json`
    When its command members are read
    Then no member is named `loop`
    And no member matches the `drive-*` shape
    And `autonomous` is still a member — the door coexists, only its body changed
    And a `/aof:loop` member added to the manifest fails the gate, naming it
    And a `/aof:drive-continue` member fails the same way

  Scenario: the sibling phase prompts are byte-unchanged
    Given `src/bundle/commands/refine.md`, `continue.md` and `verify.md`
    When their bytes are compared with the milestone's base
    Then all three are identical
    And the gate reports the three files it compared, so a renamed prompt fails as "not found"

  Scenario: the reader-set sweep and the prose sweep read different subjects and neither substitutes for the other
    Given `src/bundle/commands/autonomous.md`, which is under `src/` and is not a `.mjs` module
    When the reader-set sweep runs
    Then the prompt is not a member of the swept module set
    And the reader-set leg would pass unchanged if the prompt still named `maxAttempts`
    And the prose leg is the one and only leg that answers for the prompt

  Examples:
    | planted violation                                                  | what the gate reports                                          |
    | a fifth `src/` module RESOLVING the cap key with `?? 3`             | the module and the line                                        |
    | a `??` default added to `src/work-doctor-loop-ready.mjs:32`'s read  | the module and the line — a fifth RESOLUTION site              |
    | the sweep population defined by bare property access                | the scorer as a fifth reader — the two legs contradict         |
    | a resolver's `?? 3` re-wrapped, under a line-scoped predicate       | the INSPECTOR's message on a resolver — the wrong leg          |
    | a resolver's `?? 3` re-wrapped onto the next line                   | nothing — adjacency spans the wrap, it is still a resolver     |
    | `run-retry.mjs:62`'s preceding `??` read as the cap's default       | the module as a resolver on a `??` that is not the cap's       |
    | a second unadmitted no-default reader of the cap key                | the module — the inspector set has exactly one member          |
    | the admitted inspector reading the declaration with no `??`         | nothing — declaration inspection is an admitted act            |
    | `FALLBACK_MAX_ATTEMPTS` used to resolve rather than to report       | the module and the line — the inspector became a resolver      |
    | a recorded resolver that no longer resolves the cap key             | the stale record entry                                         |
    | `src/work-doctor-loop-ready.mjs` no longer reading the declaration  | the stale admission — the inspector's own self-check           |
    | `?? 5` as a resolver's fallback                                     | the module and the literal                                     |
    | an unadmitted `src/` module reading the cap key with no `??`        | the module, at the inspector-partition leg                     |
    | `work.autonomous.maxCycles` read anywhere in `src/`                 | the new key and the module                                     |
    | `heartbeatStaleMs` no longer read anywhere in `src/`                | the lost member of the closed two-key set                      |
    | the gate filtering `heartbeatStaleMs` out unnamed                   | the undeclared filter — a permission nobody can audit          |
    | `const DEFAULT_CAP = 5` in `src/commands/loop.mjs`                  | the constant                                                   |
    | `Loop until` back in `autonomous.md`                                | the token and its line                                         |
    | `aof work next` back in `autonomous.md`                             | the token and its line                                         |
    | `aof work run-start` back in `autonomous.md`                        | the token and its line                                         |
    | `run-retry` back in `autonomous.md`                                 | the token and its line                                         |
    | `maxAttempts` back in `autonomous.md`                               | the token and its line                                         |
    | `heartbeatStaleMs` back in `autonomous.md`                          | the token and its line                                         |
    | `stop_conditions` back in `autonomous.md`                           | the token and its line                                         |
    | `aof work next` left at any of its four sites outside the two blocks | the token and its line (ADR-010 §21)                          |
    | any of the seven inside a stripped HTML comment                     | nothing — prose, not instruction                               |
    | `aof work loop` absent from `autonomous.md`                         | zero occurrences — the prompt names no replacement             |
    | `aof work loop` named twice in `autonomous.md`                      | nothing — the invocation and the `--resume` hint (ADR-010 §21) |
    | a second command named for driving the range in `autonomous.md`     | the command it named                                           |
    | the `--solo` block deleted from `autonomous.md`                     | the missing block                                              |
    | the `--ship` step deleted from `autonomous.md`                      | the missing block                                              |
    | a `loop` member added to `src/bundle/bundle.json`                   | the member                                                     |
    | a `drive-continue` member added to `src/bundle/bundle.json`         | the member                                                     |
    | the `autonomous` member removed from `src/bundle/bundle.json`       | the removed member — the door coexists                         |
    | `src/bundle/commands/continue.md` edited                            | the changed file                                               |
    | the reader-set sweep reading zero modules                           | the floor, before any set comparison                           |

  Examples: stable evidence ownership for cap parsing and alternate-driver rejection
    | row id          | mutation / positive control                                                   | expected observation                                                    | executable owner                                  |
    | CAP-MUT-01      | a fifth module carries a cap access followed by `?? 3`                        | named fifth resolver                                                    | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-02      | the declared inspector's cap access gains a following `?? 3`                  | inspector becomes a forbidden fifth resolver                            | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-PC-01       | a resolver's following `?? 3` wraps onto the next line                        | still classified as a resolver                                          | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-PC-02       | an unrelated `??` precedes the cap access on the same statement               | preceding operator is ignored; classification follows the cap access    | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-03      | an unadmitted no-default cap reader is planted                                | named second declaration inspector                                      | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-PC-03       | the sole admitted inspector reads the declaration without `??`                | no violation                                                            | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-04      | a recorded resolver no longer resolves the key                                | named stale permission                                                   | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-05      | the admitted inspector no longer reads the declaration                        | named stale permission                                                   | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-06      | a resolver falls back with `?? 5`                                              | named module and wrong literal                                           | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-07      | `work.autonomous.maxCycles` is read                                            | named extra closed-set key and module                                    | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-08      | `heartbeatStaleMs` disappears from all source modules                          | named missing closed-set key                                             | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-09      | a private `DEFAULT_CAP` is declared in the loop command                        | named private default                                                    | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-10      | any one of the seven shell tokens is restored to non-comment prompt text       | token and line                                                           | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-PC-04       | any shell token appears only inside a stripped HTML comment                    | no violation                                                            | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-11      | `aof work loop` is absent from the prompt body                                 | zero driving-command occurrences                                        | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-PC-05       | prompt contains the invocation plus the `--resume` hint                        | two `aof work loop` occurrences accepted                                | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-12      | `aof work next` is planted as an alternate command for driving the range       | named alternate driver, even if all other shell tokens remain absent    | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-13      | `aof work run-start` is planted as an alternate command for driving the range  | named alternate driver, even if `aof work loop` is still present        | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-14      | another `aof work <verb>` is labelled as the command that drives the range     | extracted alternate command                                             | test/arch/acd-loop-cap-single-home.test.mjs       |
    | CAP-MUT-15      | a second range-driving command is placed beside the valid loop invocation      | both driving commands; closed one-body rule fails                        | test/arch/acd-loop-cap-single-home.test.mjs       |

  The owner must extract the command or command-labelled instruction that drives the range; the
  seven-token denylist alone cannot discharge `CAP-MUT-14`/`CAP-MUT-15`. Its current
  `indexOf(";")` sentinel-ended positional slice is independently forbidden by task 00 and must be
  replaced during build with the shared structural source-slice helper; this contract refinement
  deliberately does not implement or waive that fix. All other rows above are owned by
  `test/arch/acd-loop-cap-single-home.test.mjs`; their literal mutation/control cell is the stable
  evidence handle.
