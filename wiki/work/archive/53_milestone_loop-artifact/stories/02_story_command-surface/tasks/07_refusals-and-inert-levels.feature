@executable @cli @work @work-stream
Feature: The loops that do nothing — a coded scope refusal, a locked L3, and an L1 that writes nothing

  Three ways this command declines to act, and all three are LOUD. `aof work loop 53/02` is
  `loop-scope-unsupported` (ADR-003 §1) because `nextWork`'s own scope parser fails OPEN — a
  story ref matches no admitted form and falls through to "every driver"
  (`src/work.mjs:847-860`), so a loop handed `53/02` would cheerfully start driving milestone 12.
  A read that fails open is a silent-green; a LOOP that fails open starts sessions against work
  nobody named. The refusal names both admitted forms and points at `aof work drive <phase> <ref>`
  — the way to drive one story, which needs no `nextWork` and therefore has no scope problem.
  An INVERTED range is refused too, and this contract said the opposite until ADR-010 §1 ruled on
  it: 53/01's guard wins and `53-52` is `loop-scope-unsupported`. The reason is the same
  silent-green class — `inRange` (`src/work.mjs:849-853`) builds `num >= 53 && num <= 52`, a
  predicate matching NOTHING, so `nextWork` falls through its entire driver walk and returns
  `{state:"done"}` (`src/work.mjs:1011`) over a stream it never had a candidate in. Reporting
  `done` for a range the walk never entered is exactly what this guard exists to close, and it is
  worse inside a loop than inside a read. `53-53` stays admitted — one driver is a legitimate
  range, an empty one is not — so the guard refuses arithmetic as well as form, still over the
  same string, still reading no stream.
  `--level L3` is `loop-level-locked` naming milestone 55 (ADR-006 §1), because an unattended
  loop without anchored measurements is the configuration the literature has repeatedly measured
  failing, and a lock that is a sentence in a document is exactly the unenforceable guarantee this
  milestone exists to replace. And `--level L1` acts, but writes nothing at all: it enumerates the
  scope ONCE through `work:list`, reports the act an L2 loop would take per item, and leaves every
  file untouched (ADR-006 §3 as corrected by ADR-010 §8 — under a read-only level nothing changes,
  so `work:next` is a fixed point and a walk that re-asked it would never terminate).

  All three are asserted the same way — at the seam that would have done the damage. Every
  scenario runs over a temp-`AOF_GLOBAL_HOME` fixture stream that carries genuinely ready work,
  with `test/support/mesh-worker-terminal-fixture.mjs`'s `{ptySpawn, which}` injected through the
  declared seam `ctx.agentSessionDriverOptions` (ADR-010 §2), so "nothing was spawned" is the
  recorded call count of a seam that WOULD have spawned, and
  "nothing was written" is the fixture's run records and record-doc frontmatter read back after.
  A refusal over an empty fixture would prove nothing.

  Note on precedence, because it is decidable and someone will ask: the level is judged BEFORE
  the scope is resolved (ADR-006 §1), so a locked level and an inadmissible scope in one
  invocation is `loop-level-locked`. And the level vocabulary is exact — `LOOP_LEVELS` is a frozen
  two-member set, so `l2` is not `L2`, it is `loop-level-unknown`.
  Mechanised as `test/loop-command-refusals.test.mjs`, imported AND spread in `scripts/test.mjs`
  inside this story's own labelled `// milestone 53 / story 02` block, so the evidence lands with
  the contract rather than after it (ADR-011 §1, TECH_DEBT item 48).
  ADR-003 §1 and §3, ADR-006 §1–§4, ADR-005 §3, ADR-010 §1/§2/§8, RESEARCH §Q3.

  Scenario: a story-shaped scope is a coded, zero-side-effect refusal
    Given a fixture stream with ready work under milestones `03` and `04`
    And the injected `{ptySpawn, which}` pair, with `claude` resolving
    When I run `aof work loop 03/01 --json`
    Then exactly one JSON document is printed on stdout and it parses
    And it carries `ok: false` and the code `loop-scope-unsupported`
    And it names both admitted forms — a driver number, and an `NN-MM` range
    And it names `aof work drive <phase> <ref>` as the way to drive one story
    And zero spawn calls are recorded
    And no run record was minted anywhere in the fixture
    And no item's status frontmatter changed
    And the process exits non-zero

  Scenario: the same refusal, rendered for a human
    Given the same fixture
    When I run `aof work loop 03/01`
    Then the output states that the scope form is not supported, naming `03/01`
    And it names both admitted forms and the `aof work drive` alternative
    And it prints no raw JSON document and no stack trace
    And zero spawn calls are recorded
    And the process exits non-zero

  Scenario: the refusal is decided before the stream is even walked
    Given a fixture stream whose first ready item would be driven immediately by an admitted scope
    When I run `aof work loop 03/01 --json`
    Then no `work:next` answer appears in the output
    And nothing was spawned, minted or written
    And the refusal is the whole answer

  Scenario: `--level L3` is locked, and the lock names its unlocker
    Given the same fixture
    When I run `aof work loop 03 --level L3 --json`
    Then exactly one JSON document is printed carrying `ok: false` and the code `loop-level-locked`
    And it names milestone 55 as the unlocker
    And it states the reason — L3 requires 55's anchored measurements and enforced frozen set
    And zero spawn calls are recorded and no run record was minted
    When I run `aof work loop 03 --level L3`
    Then the human output states the same three facts and prints no raw JSON

  Scenario: an unrecognised level is its own code, and the vocabulary is exact
    Given the same fixture
    When I run `aof work loop 03 --level L4 --json`
    Then the document carries `ok: false` and the code `loop-level-unknown`
    And it names the two levels this shell runs — L1 and L2
    When I run `aof work loop 03 --level l2 --json`
    Then the document carries `ok: false` and the code `loop-level-unknown`
    And nothing was spawned, minted or written by either run

  Scenario: the level is judged before the scope
    Given the same fixture
    When I run `aof work loop 03/01 --level L3 --json`
    Then the code is `loop-level-locked`, not `loop-scope-unsupported`
    And nothing was spawned, minted or written

  Scenario: L2 is the default, and the absence of `--level` is never a silent downgrade
    Given the same fixture
    When I run `aof work loop 03 --json`
    Then `level` is `L2`
    And the document is the ordinary probe, not a refusal
    And an operator who typed no level gets what `/aof:autonomous` has always meant

  Scenario: an L1 loop reports what an L2 loop would do, per item, and writes nothing
    Given a fixture stream whose milestone `03` holds a story with no tasks, a story with tasks, and a story that is done
    And the injected `{ptySpawn, which}` pair, with `claude` resolving
    When I run the loop body for scope `03` with `--level L1`
    Then the report names each item an L2 loop would act on, with the act it would take
    And the story with no tasks is reported as `drive refine`
    And the story with tasks is reported as `drive continue`
    And the done story is not reported as an act at all
    And zero spawn calls are recorded
    And no run record exists that did not exist before
    And no item's status frontmatter changed
    And the walk terminates — the report ends and the process exits

  Scenario: an L1 loop reports the halt an L2 loop would take, without halting anything
    Given a fixture stream whose scope holds a ready uat session and a ready spike
    When I run the loop body for scope `03-06` with `--level L1`
    Then the uat session is reported as `halt uat-gate`
    And the spike is reported as `halt unmapped-item-type`
    And nothing was spawned, minted or written

  Scenario: an L1 loop still reads the gate, and reading is all it does
    Given a fixture stream carrying one validation finding under `03/01`
    When I run the loop body for scope `03` with `--level L1`
    Then the report may name the outstanding findings for that item
    And the findings are `work:validate`'s own, unchanged
    And nothing was spawned, minted or written

  Scenario: `--level L1 --json` is the probe, at L1
    Given the same fixture
    When I run `aof work loop 03 --level L1 --json`
    Then the document carries `level: "L1"` and the frozen key set
    And `driven` is empty
    And zero spawn calls are recorded
    And the process exits 0

  Examples: the scope vocabulary — two admitted forms, everything else refused (ADR-003 §1)
    | scope argument | admitted | code                    | note                                               |
    | 03             | yes      | (none)                  | one driver                                         |
    | 53             | yes      | (none)                  | one driver                                         |
    | 0053           | yes      | (none)                  | `^\d+$` — leading zeros are still a driver number  |
    | 50-53          | yes      | (none)                  | an inclusive range                                 |
    | 53-53          | yes      | (none)                  | a one-member range                                 |
    | 53-52          | no       | loop-scope-unsupported  | inverted — matches no driver, so `work:next` would answer done over a stream it never walked (ADR-010 §1) |
    | 53/02          | no       | loop-scope-unsupported  | the defect this guard exists for                   |
    | 03/01          | no       | loop-scope-unsupported  | the defect this guard exists for                   |
    | 53/02/01       | no       | loop-scope-unsupported  |                                                    |
    | (none given)   | no       | loop-scope-unsupported  | an empty scope is not an admitted form             |
    | loop-artifact  | no       | loop-scope-unsupported  | a slug is not a scope                              |
    | abc            | no       | loop-scope-unsupported  |                                                    |
    | 53-            | no       | loop-scope-unsupported  | a half range                                       |
    | -53            | no       | loop-scope-unsupported  |                                                    |
    | 53..55         | no       | loop-scope-unsupported  | the wrong range spelling                           |
    | 53,54          | no       | loop-scope-unsupported  |                                                    |

  Examples: the level vocabulary — two executable, one locked, everything else unknown (ADR-006 §1)
    | `--level` | outcome            | code               | names          | spawns | mints |
    | (absent)  | runs at L2         | (none)             | —              | as L2  | as L2 |
    | L1        | runs at L1         | (none)             | —              | 0      | 0     |
    | L2        | runs at L2         | (none)             | —              | as L2  | as L2 |
    | L3        | refused            | loop-level-locked  | milestone 55   | 0      | 0     |
    | L4        | refused            | loop-level-unknown | L1 and L2      | 0      | 0     |
    | l2        | refused            | loop-level-unknown | L1 and L2      | 0      | 0     |
    | (empty)   | refused            | loop-level-unknown | L1 and L2      | 0      | 0     |

  Examples: precedence between the two refusals
    | argv                                     | code                   |
    | aof work loop 03/01 --json               | loop-scope-unsupported |
    | aof work loop 03 --level L3 --json       | loop-level-locked      |
    | aof work loop 03/01 --level L3 --json    | loop-level-locked      |
    | aof work loop 03/01 --level L4 --json    | loop-level-unknown     |

  Examples: what an L1 loop does and does not touch (ADR-006 §3)
    | act                          | at L1 | proven by                                        |
    | enumerate through `work:list` | once  | one report row per in-scope actionable item      |
    | ask `work:next`              | at most once | the "what would be offered first" row, never a re-ask |
    | ask `work:tasks`             | yes   | the refine-vs-continue split in the report        |
    | ask `work:validate`          | yes   | the findings the report may name                  |
    | report the act L2 would take | yes   | one row per in-scope actionable item              |
    | spawn a session              | no    | the injected ptySpawn's call count is 0           |
    | mint a run record            | no    | `work:run-status` per item, unchanged             |
    | write a status               | no    | every record doc's frontmatter, unchanged         |
    | write any file               | no    | the fixture tree's file list and bytes, unchanged |
