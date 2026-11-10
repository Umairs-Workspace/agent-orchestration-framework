@cli @planning @distribution
Feature: One verb writes the Hyperagent package to the aof home, and no project renders it

  WHY. Hyperagent reads no repository folder. A skill reaches it only by upload, and the upload
  lands on the account, the same for every project. So the files belong in one place on the
  machine, rebuilt by one verb that says what to upload, the way the Cowork packages are.

  @executable
  Rule: R1 · One verb writes the package under the aof home, and nothing in the project

    Scenario: E1 · the package verb writes the planner instructions and the seven skills
      When "aof work integrations hyperagent package" runs
      Then "hyperagent/AGENT.md" and "hyperagent/skills/<id>/SKILL.md" for each of the seven planning skills are written under the aof home, byte-identical to the package's own files

    Scenario: E2 · it writes nothing inside the project
      When "aof work integrations hyperagent package" runs in a project
      Then no file in the project changes

    Scenario: E3 · a re-run rebuilds the folder whole
      Given the aof home's "hyperagent/" folder holds a file aof did not write
      When "aof work integrations hyperagent package" runs again
      Then the folder holds exactly the package's files

    Scenario: E4 · a dry run names every path and writes nothing
      When "aof work integrations hyperagent package --dry-run" runs
      Then each path it would write is printed, and nothing is written

    Scenario: E5 · the hand-over names each file to upload and claims no upload
      When "aof work integrations hyperagent package" runs
      Then it prints the Hyperagent upload steps naming the agent instructions and every "SKILL.md" by its full path, and never says that anything was uploaded

    Scenario: E6 · package is registered beside the other four verbs
      When the application's commands are listed
      Then "hyperagent:brief", "hyperagent:result", "hyperagent:check", "hyperagent:doctor" and "hyperagent:package" are among them

  @executable
  Rule: R2 · A project render holds no Hyperagent planning file

    Scenario: E7 · enabling the integration renders /aof:hyperplan alone
      Given a project whose config has "work.integrations.hyperagent": {}
      When "aof work init" runs
      Then "/aof:hyperplan" is written and nothing is written under ".hyperagent/"

  @manual
  Rule: R3 · A repository that rendered the old files loses them on update

    Scenario: E8 · this repository's own .hyperagent/ leaves on the next update
      Given this repository, whose lock records the eight ".hyperagent/" files of the earlier render
      When "aof work update" runs
      Then those eight files are removed as aof-managed files, and nothing else under the runtime roots changes

  @executable
  Rule: R4 · The doctor reads the package where the verb writes it

    Scenario Outline: the doctor reports the package's state
      Given the aof home's Hyperagent package is <state>
      When "aof work integrations hyperagent doctor" runs
      Then it reports the package as "<report>", and <hint>

      Examples:
        | example | state                                    | report  | hint                          |
        | E9      | absent                                   | missing | a hint names the package verb |
        |         | different from the installed aof's files | stale   | a hint names the package verb |
        |         | identical to the installed aof's files   | current | no hint names the package verb |
