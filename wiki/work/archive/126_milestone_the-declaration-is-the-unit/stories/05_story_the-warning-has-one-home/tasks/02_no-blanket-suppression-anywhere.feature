@executable @cli @work @work-stream
Feature: No blanket suppression anywhere — no --no-warnings, --disable-warning or NODE_OPTIONS warning flag in src, bin, scripts, the bundle or package.json

  `node --disable-warning=ExperimentalWarning` works on this Node and hides every experimental
  warning; `--no-warnings` hides the deprecations too. Both are one line away at all times — in
  `bin/aof.mjs`, in `scripts/sea-entry.mjs`, in a `NODE_OPTIONS` export in a hook, in
  `package.json` scripts — and both are the wrong fix. `SPEC §Scope` refuses them by name, and the
  measured absence today (`grep -rn "NODE_OPTIONS|NODE_NO_WARNINGS|disable-warning|no-warnings"`
  over `src/ bin/ scripts/ package.json` → nothing, re-measured at the feasibility pass) is a
  property to hold, not a fact to assume.

  Two things measured at the QA pass. `NODE_NO_WARNINGS=1` is the same blanket wearing an env var
  and is swept with the rest, though FF-12608's list does not name that form. And the suite already
  spawns the CLI with `--no-warnings` in exactly three places under `test/` (`cli-context.mjs:34`,
  `cli-child-process.test.mjs:87`, `acd-cli-entry-executes.test.mjs:26`, the last also setting
  `NODE_NO_WARNINGS=1`, as some twenty other suites do) — all outside the swept roots, so they
  stay; but the stderr scenario below must build its child's environment rather than borrow one of
  theirs, or the flag makes it vacuous. Today that command writes 2 lines / 170 bytes to stderr and
  still exits 0 with a parseable document, which is the red this turns green.

  HOW A FILE IS READ BEFORE IT IS JUDGED, because the two `.md` rows cannot be driven any other
  way. `stripComments` (`test/support/source-slice.mjs`) is a JAVASCRIPT scanner: it removes `//`
  and `/* */` while leaving string, template and regex content intact, and it has no model of
  Markdown at all — measured at the feasibility pass, it truncates a prose `https://nodejs.org/…`
  at the `//`, and it reads a fenced block and the paragraph beside it identically. So the sweep
  this story owns reads a `.mjs`, `.json` or `.jsonc` file through `stripComments`, and reads a
  `.md` file as its FENCED CODE BLOCKS ONLY — prose outside every fence is not swept. One sweep,
  one rule, driven by both scenarios below. (Five bundle files carry fences today, so the `.md` leg
  is not vacuous on the real tree.)

  What would quietly undo this: a reviewer "simplifying" the leaf to a launcher flag; a CI script
  adding `--no-warnings` to quiet its log; and a bundled command telling an agent to export
  `NODE_OPTIONS`.

  ADR-008 §4. FF-12608.

  Scenario: the tree holds no blanket suppression
    Given `src/`, `bin/`, `scripts/`, `src/bundle/` and `package.json`
    When the sweep below runs over them
    Then no file among them is an offender

  Scenario Outline: the sweep decides what a blanket suppression is
    Given a synthetic tree holding <text> in <file>
    When the same sweep runs over it
    Then that file is <verdict>

    Examples:
      | text                                                        | file                       | verdict         |
      | `--no-warnings`                                             | `scripts/x.mjs`            | an offender     |
      | `--disable-warning=ExperimentalWarning`                     | `bin/x.mjs`                | an offender     |
      | `--disable-warning DeprecationWarning`                      | `bin/x.mjs`                | an offender     |
      | `NODE_OPTIONS=--no-warnings`                                | `package.json` scripts     | an offender     |
      | `NODE_NO_WARNINGS=1`                                        | `src/x.mjs`                | an offender     |
      | `NODE_OPTIONS="--max-old-space-size=4096"`                  | `scripts/x.mjs`            | not an offender |
      | `--no-warnings` in a `//` comment                           | `src/x.mjs`                | not an offender |
      | `--no-warnings` inside a fenced code block                  | `src/bundle/commands/x.md` | an offender     |
      | `--no-warnings` in prose outside every fence, forbidding it | `src/bundle/commands/x.md` | not an offender |
      | `--no-warnings`                                             | `test/x.test.mjs`          | not an offender |

  Scenario: a command that opens the store prints nothing to stderr
    Given a temporary global home and a fixture workspace
    When `aof work find <ref> --json` runs as a child process whose environment is built without `NODE_NO_WARNINGS` and without `NODE_OPTIONS`, and whose argv carries no warning flag
    Then stderr is empty
    And it exits 0 and stdout parses as one document
