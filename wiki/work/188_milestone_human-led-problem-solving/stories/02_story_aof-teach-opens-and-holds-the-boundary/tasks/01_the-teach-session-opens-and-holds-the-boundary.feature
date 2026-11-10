@executable @docs @work-stream
Feature: the teaching session opens by saying what the human owns, and holds that on every turn

  WHY. Spike 178 refuted the follow-up turn: asked to "just write the implementation", a manual
  session edited source silently (P2). AOF adds no enforcement engine (ADR-005 §1), so `teach.md`
  holds the line in prose on every turn, and it tells the human that the line is instruction, not a
  lock. Rows land in `packages/learning/test/teach-frame.suite.mjs`, read against
  `packages/learning/assets/commands/teach.md`.

  Rule: R1 · The session opens by talking to the person, and tells its bookkeeping when asked
    Amended at the `@uat` (F-14): the recited banner was written for an auditor, not a learner.

    Scenario: E1 · the opening is a short structured header, then the first question
      When `teach.md` is read
      Then it says the session opens with five labelled parts in order (Teaching mode, Objective, The work, Where it stands, First question), each a line or two
      And the Teaching mode part names the exits `aof:continue <ref>` and `aof:manual <ref>`
      And it says the opening names no run record, sync queue, test scope, permission setting, command internals or ADR, fitness-function or finding id, and prints no outcome line

    Scenario: E10 · what AOF writes is told when asked, and never denied
      When `teach.md` is read
      Then it says that asked what AOF does or writes, the session names the status move, `runs/<node>/*.json`, `.aof/artifact-sync-queue.ndjson` and a hand-off's `STATE.md` entry
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
      Then it says that when the human asks whether the boundary is enforced, or relies on it as a lock, the session tells them it is its instruction and not an enforced restriction, and never claims enforcement
      And it names a project-level `permissions.deny` on `Edit` and `Write` as the operator's own option, which does not cover shell writes

  Rule: R4 · The session talks to a person (F-14)

    Scenario: E7 · the human sees none of AOF's machinery
      When `teach.md` is read
      Then it says the reader is a person who wants to learn, never a reviewer checking compliance
      And it says the human is shown no run ids or paths, no test-scope flags and no ADR, fitness-function or finding ids
      And it says the session never asks a comprehension check for its own sake

    Scenario: E8 · the story's own tests run once, and only its results are told
      When `teach.md` is read
      Then it says the session runs `aof test --scope file` over the story's existing test files once, never widened to the repository and never re-run to shorten its output
      And it says a failure outside the story's files is not reported to the human

    Scenario: E9 · the first turn ends on its question
      When `teach.md` is read
      Then it says the command's own turn ends on its first question with no outcome line, and an outcome is said when the session reaches it

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
