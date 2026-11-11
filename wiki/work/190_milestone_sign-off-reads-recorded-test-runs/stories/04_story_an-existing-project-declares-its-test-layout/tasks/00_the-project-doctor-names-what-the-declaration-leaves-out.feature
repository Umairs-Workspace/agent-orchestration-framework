@executable @cli @work @validate
Feature: the project doctor names what the test declaration leaves out

  WHY. Every key 190 added keeps the old behaviour when it is absent. A missing declaration never
  narrows, which is right for the code, but it means a project already on aof would take 190 through
  `aof work update` and keep widening to the whole tree, with nothing to say so. This repo's own
  pre-190 declaration left 265 package-owned suites outside the predicate (ADR-008). The check is a
  sibling of `managed-tool` and `notion-auth` in `aof project doctor`. It reads the declaration
  through `toolchain.mjs` and the tracked files from git, and decides membership through
  `isSuiteFile` alone (FF-19006). It is `ok` or `warning`, never `error`, and every warning names
  `/aof:map-tests`.
  The cases plant a config and a git tree in a scratch directory under an isolated `AOF_GLOBAL_HOME`.

  Rule: R1 · The project doctor names what the test declaration leaves out, with its repair

    Scenario: E1 · test files outside the declared roots and suffixes are named
      Given `work.test` declares `roots: ["test"]` and no `suiteSuffixes`
      And the tree tracks `test/a.test.mjs`, 3 files under `packages/work/test/` ending `.suite.mjs` and 2 under `packages/core/test/` ending `.test.mjs`
      When `aof project doctor --json` runs
      Then its checks hold one `test-layout-suites` at severity `warning`
      And the message counts 5 files and lists `packages/work/test` (3) before `packages/core/test` (2)
      And the message names `/aof:map-tests`

    Scenario: E2 · a declaration that covers every test file is ok
      Given `work.test` declares the roots `test`, `packages/work/test` and `packages/core/test` and the suffixes `.test.mjs` and `.suite.mjs`
      And the same tree
      When `aof project doctor --json` runs
      Then `test-layout-suites` is at severity `ok`

    Scenario Outline: the language-neutral name set finds a test file outside the predicate
      Given `work.test` declares `roots: ["src"]` and no `suiteSuffixes`
      And the tree tracks <file>
      When `aof project doctor --json` runs
      Then `test-layout-suites` is a `warning` that counts <file>

      Examples:
        | example | file                          |
        | E3      | `src/cart.spec.ts`            |
        |         | `src/cart_test.go`            |
        |         | `tests/test_cart.py`          |
        |         | `src/__tests__/cart.js`       |

    Scenario: E4 · a test-shaped file a coupling accounts for is not counted
      Given `work.test` declares `roots: ["test"]` and a coupling whose `paths` are `["test/fixtures/**"]`
      And the tree tracks `test/fixtures/app/login.spec.ts` and nothing else test-shaped outside the predicate
      When `aof project doctor --json` runs
      Then `test-layout-suites` is at severity `ok`

    Scenario: a test-shaped file under the work dir is not counted
      Given the tree tracks `wiki/work/12_milestone_x/probe.test.mjs`, and `work.dir` is `wiki/work`
      When `aof project doctor --json` runs
      Then `test-layout-suites` does not count it

    Scenario: E5 · absent couplings are a question nobody has answered
      Given `work.test` declares no `couplings`
      When `aof project doctor --json` runs
      Then `test-layout-couplings` is a `warning` saying every changed document widens the run, naming `/aof:map-tests`

    Scenario: E6 · empty couplings are the considered answer
      Given `work.test.couplings` is `[]`
      When `aof project doctor --json` runs
      Then `test-layout-couplings` is at severity `ok`

    Scenario Outline: E7 · a declared gate that cannot resume is named
      Given `work.test.gate` declares `args` and `jobsArgs` and <declared>
      When `aof project doctor --json` runs
      Then `test-layout-resume` is a `warning` saying a stopped gate re-runs the whole tree, naming `/aof:map-tests`

      Examples:
        | declared                         |
        | neither `reportArgs` nor `filesArgs` |
        | `reportArgs` without `filesArgs` |
        | `filesArgs` without `reportArgs` |

    Scenario: a gate declaring both templates is ok
      Given `work.test.gate` declares `reportArgs` with `{report}` and `filesArgs` with `{files}`
      When `aof project doctor --json` runs
      Then `test-layout-resume` is at severity `ok`

    Scenario: E8 · no gate, no resume check
      Given `work.test` declares no `gate`
      When `aof project doctor --json` runs
      Then no check has the id `test-layout-resume`

    Scenario Outline: E9 · an undeclared or malformed declaration emits nothing
      Given `work.test` is <state>
      When `aof project doctor --json` runs
      Then no check id starts with `test-layout-`
      And the doctor's overall health is what it was without the family

      Examples:
        | state                                       |
        | absent                                      |
        | declared with `suiteSuffixes: ["test.mjs"]` |

    Scenario: a directory that is not a git checkout is not a finding
      Given `work.test` declares `roots: ["test"]` and the project directory is not a git checkout
      When `aof project doctor --json` runs
      Then `test-layout-suites` is at severity `ok` and says the tracked files could not be listed
      And the doctor does not fail
