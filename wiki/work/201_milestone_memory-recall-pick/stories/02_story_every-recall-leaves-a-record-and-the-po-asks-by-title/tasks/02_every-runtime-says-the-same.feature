@executable @docs @assets @memory
Feature: Every runtime says the same

  WHY. A command lives in more than one place: the bundle's source, the authored Codex variant,
  and the renders a project tracks for Claude, Codex and opencode. An edge edited in one and not
  the others means a Codex session still asks the empty question (commit b3cc77a7 shows the full
  set a prompt edit touches). The five edges this story leaves alone must read as they did.

  Background:
    Given the bundle rendered for the runtimes "claude", "codex" and "opencode"

  Rule: R3 · Every runtime's command says the same thing

    Scenario Outline: E7 · every runtime's refine command carries the title recall
      Then the "<runtime>" refine command tells the PO to recall by the item's title
      And it carries no PO recall with "--item <ref> --block"

      Examples:
        | runtime  |
        | claude   |
        | codex    |
        | opencode |

    Scenario Outline: E8 · every runtime's retrospective command carries both captures
      Then the "<runtime>" retrospective command names the edges "retrospective-domain" and "retrospective-evidence"
      And it does not say the evidence step records no recall observation

      Examples:
        | runtime  |
        | claude   |
        | codex    |
        | opencode |

    Scenario Outline: the tracked renders are the ones a fresh render writes
      Then every tracked "<runtime>" render of the refine and retrospective commands equals a fresh render of the bundle
      And the lock and the manifest agree with the rendered files

      Examples:
        | runtime  |
        | claude   |
        | codex    |
        | opencode |

    Scenario: every recall a command runs has its capture
      Then every "aof memory recall" in a bundled command is followed by a capture that names its own edge
      And the edges named across the bundle are exactly "shatter-po", "refine-architect", "refine-po", "continue-developer", "continue-episodic", "verify-finding", "retrospective-domain" and "retrospective-evidence"

    Scenario: the memory page lists the edges as they now are
      Then "wiki/memory.md" lists "refine-po" as a recall on the item's title with no item filter
      And it lists "retrospective-domain" and "retrospective-evidence" among the decision edges
