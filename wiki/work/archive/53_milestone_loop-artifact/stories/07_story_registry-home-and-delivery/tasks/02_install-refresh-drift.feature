@executable @cli @assets @distribution
Feature: What `work init` and `work update` do with a delivered record — install, refresh, drift-warn, never clobber

  This is the task that discharges the story's headline: *a consumer repo has the records for the
  loops aof runs there*. Today `aof work init` installs **zero** loop records — nothing under
  `src/bundle/` matches `*loop*` (measured) — so `loadLoops` returns `present: false`
  (`src/work-loops.mjs:503`) and `aof work loops show` reports an empty registry, while
  `build-to-green`, `verify-triage-accept` and the autonomous cascade are running in that repo the
  moment it uses aof.

  The apply machinery this rides is **kind-agnostic and already correct**, which is why ADR-013 could
  defer the split rather than invent a provenance model. `planApplyActions`
  (`src/render-plan.mjs:16-78`) classifies per output path against the install lock's hash, with no
  reference to the resource's kind: absent ⇒ `create` (`:24`); hash matches ⇒ `skip` (`:34`); a prior
  lock entry whose on-disk hash differs and no `--force` ⇒ `drift-warning` with *"previously
  generated file was modified; use --force to overwrite"* and **the file is not written** (`:38-41`);
  the same with `--force` ⇒ `update` (`:43-44`); desired content changed with no local edit ⇒
  `update` (`:48`); a withdrawn member ⇒ `delete` (`:71`), unless it was locally modified, in which
  case `drift-warning` *"stale generated file was modified; not deleting"* (`:75`).
  `createLockManifest` then preserves the drifted entry (`:99-103`) — which is what makes the warning
  RECUR rather than silently resolve on the next update.

  So the consumer-edit answer needs no new mechanism and gets none: **drift-warn and leave**. That is
  the frozen rule (ADR-013), and it is the same rule every other delivered file already lives under.
  A consumer who wants a different `ceiling` does not edit the record; they set the config key the
  record's `config:` pointer already names — task 04 owns that half.

  The coverage gap this task closes is real and measured: `test/work-update.test.mjs` drives its
  entire create / skip / update / drift / force / delete matrix over `fixtureMember(id)` at `:117`,
  which is `kind: "agent"` — **no template and no asset has ever been driven through drift or
  delete**. Nine records are the first asset family to need it, so each row below is asserted for the
  asset kind specifically rather than inherited by analogy. `test/roundtrip-install-proof.test.mjs`
  already installs into a temp repo and is the natural home for the init half. ADR-012 §5–§6, ADR-013.

  Scenario: a fresh init gives a consumer repo a populated registry
    Given an empty temp repo
    When `aof work init` runs
    Then nine files exist under `<repo>/.aof/loops/`
    And each is byte-identical to its `src/bundle/loops/` source
    And loading the registry from that repo returns `present: true`
    And it returns nine nodes — seven `kind: loop` and two `kind: actor`
    And it returns zero findings at `severity: "error"`
    And `aof work loops show` in that repo reports nine nodes, not an empty registry

  Scenario: the install is content-addressed in the lock, one entry per record
    Given the repo after init
    When the install lock is read
    Then it carries one entry per installed record
    And each entry's `path` is `.aof/loops/<slug>.md`
    And each entry's `hash` is the sha256 of the installed bytes
    And each entry's `resource.kind` is `asset`

  Scenario: `work update` creates the records in a repo whose lock predates them
    Given a repo inited from a bundle with no loop records, so its lock has no `.aof/loops/` entries
    When `aof work update` runs against the bundle that carries them
    Then each of the nine is planned `create`
    And the reason is that the file does not exist
    And after the update the registry loads nine nodes
    And this is the upgrade path every existing consumer takes — the records arrive without a re-init

  Scenario: an unchanged record is skipped, not rewritten
    Given a repo whose installed records match the bundle
    When `aof work update` runs
    Then each of the nine is planned `skip`
    And the reason is that the content already matches the desired output
    And no record's mtime changes

  Scenario: an edited record is drift-warned and LEFT — never clobbered
    Given a consumer has edited `.aof/loops/build-to-green.md`
    When `aof work update` runs without `--force`
    Then that record is planned `drift-warning`
    And the file is not written
    And the consumer's edit survives byte-for-byte
    And the other eight records are unaffected by the one drifted record
    And the lock preserves the drifted entry, so the warning recurs on the next update rather than silently resolving

  Scenario: `--force` overwrites a drifted record, and says so
    Given a consumer has edited `.aof/loops/build-to-green.md`
    When `aof work update --force` runs
    Then that record is planned `update`
    And the reason names that a drifted generated file is being overwritten because `--force` was provided
    And after it the file is byte-identical to the bundle source
    And the consumer's edit is gone — which is the point of an explicit clobber

  Scenario: a record whose SHIPPED content changed is refreshed like any other bundle file
    Given a repo whose installed records are unmodified
    And aof ships a corrected `run-resilience.md`
    When `aof work update` runs
    Then that record is planned `update`
    And the reason is that the generated content changed
    And no `--force` is required, because nothing local was overwritten

  Scenario: a withdrawn record is deleted, unless the consumer edited it
    Given a repo carrying a record aof no longer ships
    When `aof work update` runs
    Then an unmodified stale record is planned `delete`
    And a locally-modified stale record is planned `drift-warning` and is NOT deleted
    And an already-absent stale record is planned `skip`

  Scenario: the records are visible to git in the consumer's repo
    Given a temp repo with a git repository initialised and the records installed
    When each installed record is checked against the repo's ignore rules
    Then none is ignored
    And aof's own `.aof/.gitignore` baseline names only derived runtime artifacts, so it does not cover `.aof/loops/`
    And a loop record therefore lands in a PR diff, which is the reviewability property 52/ADR-001 required and ADR-012 preserves

  Scenario: the registry a consumer gets does not depend on their `work.dir`
    Given two repos inited with `work.dir: "./wiki/work"` and `work.dir: "./docs/stream"`
    When each is loaded
    Then both report nine nodes at `<repo>/.aof/loops`
    And neither has a `loops/` directory inside its work stream

  Examples:
    | on-disk state                        | lock entry | `--force` | action          | file written? |
    | absent                               | absent     | no        | create          | yes           |
    | absent                               | present    | no        | create          | yes           |
    | matches desired                      | present    | no        | skip            | no            |
    | locally edited                       | present    | no        | drift-warning   | **no**        |
    | locally edited                       | present    | yes       | update          | yes           |
    | unmodified, desired content changed  | present    | no        | update          | yes           |
    | unmodified, member withdrawn         | present    | no        | delete          | removed       |
    | locally edited, member withdrawn     | present    | no        | drift-warning   | **no**        |
    | already absent, member withdrawn     | present    | no        | skip            | no            |

  Examples:
    | consumer command after install | before this story        | after this story             |
    | `aof work loops show`          | empty registry           | nine nodes                   |
    | `aof work loops show --json`   | `present: false`         | `present: true`, nine nodes  |
    | `aof work loops graph`         | nothing to draw          | the declared edges           |
    | `aof work loops validate`      | nothing to check         | the five structural checks run |
    | `loadLoops` `source`           | `<work.dir>/loops`       | `<root>/.aof/loops`          |
