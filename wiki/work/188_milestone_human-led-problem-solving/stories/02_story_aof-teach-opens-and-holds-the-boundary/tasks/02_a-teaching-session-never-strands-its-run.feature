@bug @finding-F-02 @executable @docs @work-stream
Feature: a teaching session never leaves its run open for the next command to trip on

  WHY. At `aof:verify 188` (finding F-02), a live `/aof:teach 00` session minted its run, taught
  over two turns and ended with the run still `running`. `teach.md` step 7 closes the run only
  "when the human stops, when the scenarios are green, or at a hand-off", and a session that simply
  ends does none of these. The human then built the story and ran `/aof:review 00`, which is the
  hand-back ADR-003 §5 names, and review's mint was refused `duplicate-run`. The run had no
  heartbeat, so it was not stale and nothing reclaimed it. The human had to close it by hand with
  `aof work run-complete 00 --outcome done --run <id>` before review could start.
  How the run stops stranding (closing it in the command turn, or having the next operator-led
  mint reclaim it) is the build's to choose. These rows pin the behaviour, read against
  `packages/learning/assets/commands/teach.md` and `packages/core/assets/commands/review.md`.

  Rule: R1 · The hand-back to review is never refused by the teaching session's own run

    Scenario: E1 · a session that ends without stop, green or hand-off strands no open run
      When `teach.md` is read
      Then it says no teaching run is still open when a session that never said stop, went green or handed off simply ends
      And the run it closes is still closed `done`, never `failed`

    Scenario: E2 · review after a teaching session is not refused by that session's run
      Given a story whose teaching session ended without stop, green or hand-off
      When `/aof:review <ref>` mints its run
      Then the mint is not refused `duplicate-run` by the teaching session's run
      And the review names `aof:teach` as the origin of the hand-built story's run and status move, not `aof:manual`
