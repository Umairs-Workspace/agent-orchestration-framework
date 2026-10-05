@executable @cli @docs @work @work-stream
Feature: the repair session is a fourth drive phase with its own command

  WHY. The loop never loads the session driver; it reaches a session only by spawning
  `aof work drive <phase>`. So the repair session is a fourth phase driver, `work:drive-repair`,
  beside refine, continue and verify. It types one bundle command, `/aof:repair`, whose prose is
  what keeps an unattended repair from doing harm.

  The session runs on the `continue` phase's resolved model and effort. `SESSION_PHASES` and the
  per-phase session grammar are unchanged.

  Rule: R1 · A lane halt is handed to a fresh session to repair, unless repair is turned off

    Scenario: the repair driver types the repair command with the hand-over file
      Given a hand-over file `<aof home>/loop-repairs/R9.json` for a halt at `03/03`
      When `aof work drive repair 03/03 --run R9 --halt <aof home>/loop-repairs/R9.json --json` runs
      Then the session is launched in the primary checkout and typed `/aof:repair 03/03 <aof home>/loop-repairs/R9.json`
      And it is launched on the model and effort `continue` resolves to for this run

    Scenario Outline: the repair driver refuses what it cannot act on, before any session starts
      When `aof work drive <args>` runs
      Then it is refused `<code>` and no session is launched

      Examples:
        | args                                             | code                         |
        | repair 03/03 --run R9 --json                     | drive-repair-halt-required   |
        | repair 03/03 --run R9 --halt missing.json --json | drive-repair-halt-unreadable |
        | continue 03/03 --run R9 --halt h.json --json     | drive-halt-repair-only       |

    Scenario: the work-loop package contributes four phase drivers
      When the work-loop contribution is composed
      Then its commands are `work:loop`, `work:drive-refine`, `work:drive-continue`, `work:drive-verify` and `work:drive-repair`
      And `aof work drive repair` is routed to `work:drive-repair`

    Scenario Outline: the repair command's prose holds each rule an unattended repair needs
      When the bundle command `packages/core/assets/commands/repair.md` is read
      Then it says <rule>

      Examples:
        | rule                                                                                                        |
        | it reads the hand-over file named in its arguments, and the loop-diag log the file names                    |
        | it works in the primary checkout, and in the lane worktree only when the file names one                      |
        | it never discards a commit: no `reset --hard`, `rebase`, `push --force`, `branch -f`, `checkout -B`          |
        | it never commits, stashes or discards the operator's uncommitted changes in the primary; a cause that is the operator's own work ends the repair failed, naming the paths |
        | it never edits a delivered `.feature`                                                                         |
        | it never runs `aof work loop`; the loop resumes itself                                                       |
        | it ends by stating the cause it found and what it changed, or why it could not repair                       |

    Scenario: the repair command reaches every runtime the bundle renders
      When `aof work update --dry-run --json` runs at the repository root
      Then `.claude/commands/aof/repair.md`, `.codex/skills/aof-repair/SKILL.md` and `.opencode/commands/aof/repair.md` are each reported `skip`
      And `packages/core/assets/manifest.json` lists `commands/repair.md`
