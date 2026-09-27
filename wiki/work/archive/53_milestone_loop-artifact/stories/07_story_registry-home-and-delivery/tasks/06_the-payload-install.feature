@manual @cli @assets @distribution
Feature: The deployed binary really installs the records — the one claim no tmpdir fixture can make

  Every `@executable` scenario in this story exercises the bundle through its **dev** branch:
  `readAssetText("bundle", …)` reading real files under `src/bundle/`. That proves the render, the
  manifest, the plan and the apply are correct. It does not prove that a **deployed** `aof` installs
  nine records into a repo it has never seen, because the deployed program reaches its bundle through
  a different door — the payload at `~/.aof/bin/src/`, or, for a release artifact, the embedded asset
  map built by `scripts/sea-asset-manifest.mjs`. `test/bundle-asset-manifest-complete.test.mjs`
  proves the map *enumerates* the nine files; nothing in the suite proves a built program *writes*
  them. That gap is a build-and-run, not an assertion, which is why this lane is `@manual` and not a
  fixture — it is the "green tests ≠ running system" case the project's deploy rules exist for.

  The second claim here is one no fixture can own either. This story's `@executable` git leg proves
  that **aof's own** ignore baseline does not hide `.aof/loops/` — it names only derived runtime
  artifacts. It cannot prove anything about an arbitrary consumer whose repo-root `.gitignore`
  already carries `.aof/` or `**/loops/`; that is a property of repositories aof does not own. One
  real foreign repo is the honest evidence, and this project keeps a standing one.

  **Run it against the payload, not the working tree.** A bare `aof` on PATH is an npm symlink into
  this working tree, so it would execute uncommitted `src/` and prove nothing about a deploy. Deploy
  first (`node scripts/install-local.mjs --skip-ui` — the file-copy payload path; no `--sea`, which
  is only for a launcher-bootstrap change or a release artefact), then verify at the source: an
  `aof --version` reporting `payload <buildId>` rather than `embedded`, and a stale buildId meaning
  the payload did not land. The desktop app supervises the daemons and is **not** restarted by the
  agent running this lane — nothing here needs a daemon; if a restart is ever wanted, the operator
  performs it.

  Evidence for each scenario is recorded in the milestone's `VERIFICATION.md` with the command run,
  the buildId it ran under, and the output — not a claim that it passed.

  Scenario: the deployed payload installs the registry into a repo it has never seen
    Given `node scripts/install-local.mjs --skip-ui` has run and `aof --version` reports a payload build matching this change
    And a scratch repository that has never had aof installed
    When `aof work init` is run in it
    Then nine files exist under its `.aof/loops/`
    And each is byte-identical to the corresponding `src/bundle/loops/` record
    And none begins with the template stamp
    And `aof work loops show` in that repo reports nine nodes
    And `aof work loops validate` reports no error-severity finding
    And the buildId under which this ran is recorded alongside the output

  Scenario: an existing consumer repo gains the records from `work update` alone
    Given the standing test-bed repository, which was inited before this story shipped and has no `.aof/loops/`
    When `aof work update` is run in it
    Then the nine records are created
    And nothing else in its `.aof/` is rewritten beyond the lock
    And its `aof work loops show` goes from an empty registry to nine nodes
    And re-running `aof work update` immediately afterwards reports no further change

  Scenario: a real foreign repository does not hide the records from git
    Given the standing test-bed repository after the records are installed
    When each installed record is checked against that repository's own ignore rules
    Then none is ignored
    And the records appear as untracked additions ready to be committed
    And if any consumer-side rule DID hide them, that is recorded as a finding rather than worked around

  Scenario: a consumer's edited record survives a real update, and says so
    Given a record edited in the test-bed repository
    When `aof work update` is run
    Then the command reports a drift warning naming that record
    And the file on disk is unchanged
    And running `aof work update` again reports the same warning, rather than silently resolving it

  Scenario: aof's own installed registry matches what it ships, on the deployed build
    Given this repository after the deploy
    When `aof work update` is run here
    Then all nine records are reported unchanged
    And `.aof/loops/` is byte-identical to `src/bundle/loops/`
    And `aof work loops show` here reports the same nine nodes the suites assert

  Examples:
    | claim                                                | provable in a tmpdir? | why |
    | render / manifest / plan / apply are correct         | yes                   | the dev bundle branch is what the suites read |
    | aof's own ignore baseline does not hide the records  | yes                   | the baseline is aof's own, and asserted |
    | a DEPLOYED program writes the nine files             | **no**                | needs an install + a real `aof work init` |
    | an arbitrary consumer's `.gitignore` does not hide them | **no**             | a property of repos aof does not own |
    | a release SEA binary carries them                    | **no**                | release-time; the asset map is enumerated, not exercised |

  Examples:
    | step                                   | command                                        |
    | deploy the payload                     | `node scripts/install-local.mjs --skip-ui`     |
    | verify the deploy landed               | `aof --version` → `payload <buildId>`          |
    | fresh install                          | `aof work init` in a scratch repo              |
    | existing consumer refresh              | `aof work update` in the test-bed repo         |
    | read the registry                      | `aof work loops show`                          |
    | check the structural findings          | `aof work loops validate`                      |
