@manual @cli @work @memory
Feature: On a real node, the block is picked

  WHY. Every other scenario in this story runs against a stand-in. Only the real `claude`, signed
  in the way this node signs in, can show that the launch is accepted, that the subscription
  sign-in is used, and that the call leaves nothing behind for `aof work observe` to count. The
  daemons' environment is checked too, because a `claude` that resolves but is not signed in there
  is what burned runs before.

  Rule: R1 · The pick is one `claude` call at the project's model, run outside the project

    Scenario: E3 · a real recall is picked and leaves no session behind
      Given this project's own memory index, and the real "claude", signed in
      And a listing of "~/.claude/projects" taken beforehand
      When "aof memory recall 'worktree node_modules junction' --kind near-miss --block" runs in a terminal
      Then it prints at most 5 record lines, or nothing, within 20 seconds
      And stderr is empty
      And "~/.claude/projects" holds no directory it did not hold before

    Scenario: the same recall works in the environment the daemons get
      Given the environment a supervised daemon is started with on this node, as the deploy rules describe it
      When the same recall runs in that environment
      Then it prints a picked block, or stderr names the miss and the block is the lexical top 5
      And either way the exit code is 0
