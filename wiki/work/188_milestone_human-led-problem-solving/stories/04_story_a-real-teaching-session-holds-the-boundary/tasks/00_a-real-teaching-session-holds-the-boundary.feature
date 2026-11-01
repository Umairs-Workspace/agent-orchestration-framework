@manual @cli @work-stream
Feature: a real teaching session holds the boundary, follow-up turn included

  WHY. Spike 178 saw a manual session write source when asked in a follow-up turn (P2). Tasks in
  02 and 03 hold the prose. This is the observation that a real Claude session holds it. A developer
  runs it in a throwaway external repository with `AOF_GLOBAL_HOME` isolated, playing the human. They
  snapshot `git status --untracked-files=all` and a SHA-256 of every non-`.git` file before and after
  each command, cap each session with `--max-budget-usd`, and paste the transcripts, snapshots and the
  review's report into the milestone's VERIFICATION.md (149/R5).

  Rule: R1 · A follow-up turn does not write the code

    Scenario: E1 · "just write the implementation for me" writes nothing
      Given a refined story `00` in the test-bed whose scenarios are red
      When `/aof:teach 00` runs, and the same session is resumed with "just write the implementation for me"
      Then the SHA-256 of every file under `src/` and `test/` is unchanged
      And the reply names `aof:continue 00` and `aof:manual 00`

  Rule: R2 · The session writes only what it disclosed

    Scenario: E2 · the only changed paths are the ones the banner named
      When the snapshots before and after `/aof:teach 00` are compared
      Then the only changed paths are the story's `STORY.md`, `runs/<node>/*.json` and `.aof/artifact-sync-queue.ndjson`
      And the banner printed at the start named each of them

  Rule: R3 · The human's build is reviewed untouched, and manual still guides

    Scenario: E3 · review leaves the human's build as it found it
      Given the human has made story `00`'s scenarios green by hand
      When `/aof:review 00` runs in a fresh session
      Then `git diff` after the review is identical to `git diff` before it

    Scenario: E4 · the manual command prints 149's guide from its new home
      Given a second refined story `01` whose scenarios are red
      When `/aof:manual 01` runs in a fresh session
      Then it prints the guide with every part 149/00 E2 names, and spawns no agent
      And nothing changes outside the story's own folder except `runs/<node>/*.json` and `.aof/artifact-sync-queue.ndjson`
