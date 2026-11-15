@executable @cli @work @validate
Feature: An install with no record is told once to update

  WHY. Every project already on aof was rendered before a render recorded anything. Its commands
  hold both practices' prose whatever its config says, and the doctor cannot tell what they were
  built with. It says so once, and the update it asks for is also where the project first reads
  the list of what it could turn on (ADR-006 §3).

  "OLD" is a scratch project whose lock has a "work" section with no "practices", as every
  install made before this milestone does.

  Rule: R3 · An install made before practices were recorded is told once to update

    Scenario: E7 · an install with no record gets one warning, and the update clears it
      When the doctor runs in OLD
      Then it reports exactly one "practice-render-unrecorded" finding, with severity "warn"
      And its message says the install does not record which practices its commands were rendered with
      And it ends "Run `aof work update`."
      When "aof work update" runs, and then the doctor
      Then the doctor reports no "practice-render-unrecorded" finding

    Scenario Outline: with no record, nothing is called stale
      Given OLD's config sets "work.examples.enabled" to <value>
      When the doctor runs in OLD
      Then it reports one "practice-render-unrecorded" finding
      And it reports no "practice-render-stale" finding

      Examples:
        | value  |
        | true   |
        | absent |

    Scenario: the warning does not fail the doctor
      When the doctor runs in OLD
      Then no finding it reports for the render has severity "error"

    Scenario: a project that never installed the bundle gets nothing
      Given a project whose lock has no "work" section
      When the doctor runs
      Then it reports no "practice-render-unrecorded" and no "practice-render-stale" finding

    Scenario: a record that names a practice the bundle no longer declares is ignored
      Given a project whose record holds "retired: true" beside the declared practices
      When the doctor runs
      Then it reports nothing for "retired"

    Scenario: a practice declared since the last render counts as rendered off
      Given a project whose record holds "discovery" and not "build-brief"
      And its config sets "work.plan.enabled" to true
      When the doctor runs
      Then it reports one "practice-render-stale" error naming "work.plan.enabled"

    Scenario: this checkout has a record and nothing to report
      When the doctor runs in this checkout
      Then it reports no "practice-render-unrecorded" and no "practice-render-stale" finding
