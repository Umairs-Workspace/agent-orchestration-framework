@manual @cli @work @distribution
Feature: the dependency lands approved, pinned exactly, installed frozen with scripts off, and audited clean

  ADR-001 §8. `@xterm/headless` `6.0.0` becomes a runtime dependency: MIT, no dependencies of its
  own, the same 6.0.0 as the board's `@xterm/xterm`. AGENTS.md (Supply-Chain Safety) makes the
  operator's explicit approval the first gate, and nothing in this story can go green without the
  package present, so this task is first and blocks every other.

  RULINGS (PO, 2026-09-27). (1) The approval is the operator's words, quoted in the milestone
  `STATE.md` with its date before `package.json` changes. A refine review that approves this story
  is not that approval. (2) Lifecycle scripts stay off for the install (`--ignore-scripts`), and
  no install-script exception is added. (3) `package.json` and `package-lock.json` are the only
  files this task writes. (4) Every command's output is pasted into `VERIFICATION.md` as it
  printed, not paraphrased.

  RULINGS (QA, 2026-09-27). (1) "Exactly" means the spec string `6.0.0`: no `^`, no `~`, no range.
  (2) The lock entry's `integrity` is pasted, so a later install that resolves a different
  tarball shows as a diff on that line. (3) `npm ls` is read from the repository root, where the
  payload installer reads the production closure.

  Scenario: the operator approves before anything is installed
    Given the milestone `STATE.md` records no approval of `@xterm/headless`
    When the builder reaches this task
    Then the builder asks the operator to approve `@xterm/headless@6.0.0` as a runtime dependency, naming its licence, its size and its lack of dependencies from RESEARCH Q1
    And `package.json` is unchanged until the approval is quoted in `STATE.md` with its date

  Scenario: the package is pinned exactly in runtime dependencies
    Given the operator's approval is quoted in `STATE.md`
    When `package.json` is read
    Then `dependencies["@xterm/headless"]` is the string `6.0.0`
    And `devDependencies` does not name `@xterm/headless`

  Scenario: the lock resolves one copy, with no dependencies of its own
    When `package-lock.json` is read
    Then `packages["node_modules/@xterm/headless"]` has `version` `6.0.0` and `license` `MIT`, and its `integrity` is pasted
    And that entry has no `dependencies` field, and no other `packages` key ends in `@xterm/headless`

  Scenario: the install is frozen and runs no lifecycle script
    When `npm ci --ignore-scripts` is run at the repository root
    Then it exits 0, and its output is pasted
    And `npm ls @xterm/headless --omit=dev` prints `@xterm/headless@6.0.0` once, with no child below it

  Scenario: the supply-chain audit comes back clean
    When `node scripts/supply-chain-audit.mjs` is run after the install
    Then it exits 0 and reports no finding, and its output is pasted
