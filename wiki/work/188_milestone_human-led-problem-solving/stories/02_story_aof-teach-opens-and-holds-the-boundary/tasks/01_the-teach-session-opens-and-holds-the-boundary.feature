@executable @docs @work-stream
Feature: the teaching session opens by saying what the human owns, and holds that on every turn

  WHY. Spike 178 refuted the follow-up turn: asked to "just write the implementation", a manual
  session edited source silently (P2). AOF adds no enforcement engine (ADR-005 §1), so `teach.md`
  holds the line in prose on every turn, and it tells the human that the line is instruction, not a
  lock. Rows land in `packages/learning/test/teach-frame.suite.mjs`, read against
  `packages/learning/assets/commands/teach.md`.

  Rule: R1 · The session opens by saying what the human owns and what AOF will write

    Scenario: E1 · the opening banner names the mode, the owner and every write
      When `teach.md` is read
      Then it says the session opens with a banner naming the mode as teaching
      And the banner says the human owns every file under the story's `files:`
      And the banner says AOF may run `aof test --scope impacted --story <ref>`, mint and close the run, and read the record
      And the banner names the writes: the status move, `runs/<node>/*.json` and `.aof/artifact-sync-queue.ndjson`
      And it says the session is never described as making no writes

  Rule: R2 · No turn of a teaching session writes the human's code

    Scenario: E2 · "just write it" is answered with the exits, never by complying
      When `teach.md` is read
      Then it says that in every turn of the session, not only the first, AOF edits no file under `files:`, spawns no developer and applies no fix
      And it says a request to write the code, at any rung and in any wording, is answered by naming `aof:continue <ref>` and `aof:manual <ref>`

    Scenario: E3 · the strongest help is explanation in the terminal
      When `teach.md` is read
      Then it says every rung of help is given in the terminal and none writes a file

    Scenario: E4 · a resumed session is not a teaching session
      When `teach.md` is read
      Then it says a resumed or re-entered session is not a teaching session until `aof:teach <ref>` is invoked again
      And it says no mode is read from a run record or a transcript

    Scenario: the boundary is claimed honestly
      When `teach.md` is read
      Then it says the boundary is the session's instruction and not an enforced restriction
      And it names a project-level `permissions.deny` on `Edit` and `Write` as the operator's own option, which does not cover shell writes

  Rule: R3 · The teaching session hands the build back to review

    Scenario: E5 · a green build hands back to review
      When `teach.md` is read
      Then its hand-back is `taught: <ref> is yours to build`, naming `aof:review <ref>` next and never `aof:verify`

    Scenario: E6 · a hand-off to an agent is written into STATE first
      When `teach.md` is read
      Then it says that when the human asks to hand the story to an agent, the session appends `- <date> — Hand-off <ref> from teach:` under `## Notes & decisions in flight` in the item's `STATE.md`, listing the changed `files:`, the commits since the run was minted, and the scenarios green and red
      And it says the session then closes its run `done` and names `aof:continue <ref>`, saying the build will start from the human's files and report each human-written line it changes

    Scenario Outline: the teach command holds each entry and run rule
      When `teach.md` is read
      Then it says <rule>

      Examples:
        | rule                                                                                                                     |
        | its first act is `aof work continue <ref> --teach --json`, and a door refusal ends the session with nothing minted       |
        | a `continue-teach-not-a-story` refusal runs `aof work next <ref> --json` and names the ready stories                     |
        | it does not walk the re-entry sweep and never runs `aof work resume`                                                     |
        | the run is minted with `aof work run-start <ref> --json` before anything is printed                                      |
        | the run is closed with `aof work run-complete <ref> --outcome done`, never `failed`                                      |
        | a story whose `reads:` is absent, or whose tasks are thin or untagged, halts and sends the operator to `aof:refine <ref>` |
