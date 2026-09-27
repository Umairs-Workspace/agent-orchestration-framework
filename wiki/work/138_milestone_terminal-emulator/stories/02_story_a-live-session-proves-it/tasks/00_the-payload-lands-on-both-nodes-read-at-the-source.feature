@manual @cli @work @distribution
Feature: the payload lands on this node and the WSL node, with the emulator in both, read at the source

  ADR-001 §4 and §8, `.claude/rules/build-deploy-restart.md`. 00 and 01 are merged, and the deploy is
  the file-copy install from the main checkout, pushed to the WSL node in the same run. The WSL
  node reinstalls natively because `package-lock.json` changed. Every leg of this story runs a CLI
  verb or a script, which loads the payload at each call, so no daemon needs restarting for it. The
  desktop restart stays the operator's, whenever they want the daemons on the new build.

  RULINGS (PO, 2026-09-27). (1) The builder works in the MAIN checkout, never a dispatch worktree:
  a worktree has no `ui/dist` and no installed dependency tree. (2) The builder starts no daemon
  and restarts nothing. `STATE.md` records "installed, restart pending (operator)". (3) The Mac
  worker is not measured. `STATE.md` records that it needs `npm ci` after its pull, and that until
  then it logs `screen-model-unavailable` once and runs the byte gate, which is ADR-001 §4 working.
  (4) Every output is pasted as printed into `VERIFICATION.md`, with the repository's scrub applied
  (the private-terms guard refuses real spellings).

  RULINGS (QA, 2026-09-27). (1) "Read at the source" means the installed files and the running
  launcher, never the repository tree. (2) A wrong build shows as `embedded` in the version, a
  build id that differs from `BUILD_ID.json`, a missing `@xterm/headless` beside the payload, or a
  distro stamp still holding the old lock sha. Any one of them stops the story, and the builder
  records which.

  Background:
    Given 138/00 and 138/01 are `done` and merged on the milestone branch, and the main checkout is at that commit with a clean `git status`

  Scenario: the payload is installed and pushed to the WSL node in one run
    When `node scripts/install-local.mjs --wsl --skip-ui` runs from the main checkout
    Then it exits 0, and its output, pasted, shows the payload copy, the `BUILD_ID.json` stamp and the WSL sync
    And the distro-side deploy reports a native reinstall, because the lock's sha changed

  Scenario: this node runs the new payload
    When `~/.aof/bin/aof.exe --version` runs
    Then it prints `0.1.0 (payload <buildId>)`, where `<buildId>` is the `buildId` in `~/.aof/bin/BUILD_ID.json`, both pasted

  Scenario: the emulator is beside the payload on this node
    When the `package.json` of the `@xterm/headless` copy the payload resolves is read
    Then its `version` is `6.0.0`, pasted with its path

  Scenario: the WSL node has the emulator, installed natively
    When, in the distro, the deploy stamp `~/source/aof/.aof-wsl-deploy` and `~/source/aof/node_modules/@xterm/headless/package.json` are read
    Then the stamp holds the main checkout's `package-lock.json` sha, and the package's `version` is `6.0.0`, both pasted
    And the distro's `node`, importing `@xterm/headless` from `~/source/aof`, finds a `Terminal` constructor, its output pasted

  Scenario: what is left to the operator is written down
    When the builder finishes this task
    Then `STATE.md` records "installed, restart pending (operator)" and the Mac's `npm ci`, each as an open item for the operator
