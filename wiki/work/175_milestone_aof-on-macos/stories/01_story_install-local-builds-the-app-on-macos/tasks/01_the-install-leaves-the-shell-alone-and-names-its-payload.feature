@executable @cli @distribution @adapter
Feature: The install leaves the shell alone and names its payload

  WHY. On the Mac the `aof` on PATH is an `npm link` into the checkout, so code changes are live
  at the terminal; the daemons run the payload in `~/.aof/bin` (ADR-002 §6). The install must not
  put `~/.aof/bin` ahead of the link, and the payload it lands must be checkable at the source.

  Rule: R3 · The install leaves the shell alone and names its payload

    Scenario: E5 · no shell profile is written
      Given an isolated HOME holding ".zshrc" and ".bash_profile"
      And an install dir that already holds a launcher, so no SEA build runs
      When "node scripts/install-local.mjs --skip-ui --install-dir <dir>" runs with that HOME
      Then ".zshrc" and ".bash_profile" are byte-identical to before
      And no ".bashrc" or ".profile" was created

    Scenario: the payload install stamps the build it placed
      Given an install dir that already holds a launcher
      When the payload is installed into it
      Then "<dir>/BUILD_ID.json" names a buildId of the form "<sha>[+dirty].<yyyymmddThhmmss>"
      And its sourceRepo is this checkout
