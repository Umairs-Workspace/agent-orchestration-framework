@docs @assets @distribution
Feature: A reviewer reports findings unnumbered, and the single writer allocates on landing

  THE SHARPEST MECHANISM IN THE INVESTIGATION. An architect EXECUTED the read-based countermeasure —
  read the register's last entry, saw `D-28`, allocated `D-29` — and collided anyway, because
  `D-29` had been allocated hours earlier by the same author in a concurrent lane. "A stale read
  looks exactly like a fresh one." The countermeasure is not weak against this; it is UNSOUND, and
  no restatement of it can be made safe under fan-out. Five collisions followed, in three different
  registers.

  THIS REPO NOW RECOMMENDS THE FAN-OUT THAT PRODUCES THE HAZARD. Story 65 made concurrent story
  dispatch a first-class answer — `aof work next` returns a ready set and each lane is isolated in
  its own worktree. It correctly owns the FILE hazard. It owns none of the REGISTER hazard, and
  milestone 66 is the first item built under it.

  OF THE THREE FIXES PRICED IN THE FINDING, THIS ONE NEEDS NO MECHANISM. Orchestrator-assigned
  ranges need an allocator and strand on a crashed lane. Content-addressed ids are immune by
  construction, unreadable, and would require migrating every existing register. Unnumbered findings
  numbered on landing need only a rule — and a reviewer was observed arriving at it independently:
  "report findings and let the owner file them — already the correct posture, and what kept the file
  consistent."

  THE RULE IS ABSENT FROM EXACTLY THE PROMPTS THAT NEED IT. `src/bundle/commands/verify.md:99-102`
  prescribes the findings columns and says nothing about who allocates an id, and none of the five
  reviewing agents is told to report unnumbered. This task is three paragraphs across six bundle
  files and no code.

  # Verification split per scenario. Presence of the rule in a NAMED file, its frozen wording, the
  # membership of the five-agent set and the detectability of its removal are machine-readable, so
  # they are @executable. The one @manual scenario is a human reading a prompt end to end for
  # whether it still leaves a reviewer EXPECTING to supply a number — an effect two literally
  # compatible sentences can still produce together.

  @executable
  Scenario Outline: each reviewing agent is told to report unnumbered
    Given the reviewing agent "<agent>"
    When its prompt is read
    Then it says to report findings unnumbered, as an ordered list, one line each
    And it nowhere tells the reviewer to read a register, take its last id, or allocate the next one

    Examples:
      | agent                     |
      | `agents/aof-architect.md` |
      | `agents/aof-qa.md`        |
      | `agents/aof-security.md`  |
      | `agents/aof-compliance.md`|
      | `agents/aof-designer.md`  |

  @executable
  Scenario: the reviewing set is exactly those five, named rather than counted
    Given the eight agents the bundle declares
    Then exactly five of them report findings into a register: architect, qa, security, compliance and designer
    And developer, product-owner and researcher are outside the rule, because they do not report into it
    And the five are named in the guard, so a sixth reviewer added later without the rule fails instead of passing unnoticed

  @executable
  Scenario: the rule is one frozen sentence across the six files
    Given the id-allocation rule as it ships
    Then the reviewer-side sentence is byte-identical in all five reviewing agents
    And `commands/verify.md` carries the writer-side sentence, which is the other half of the same rule
    And five paraphrases would be five rules, which is the collision arriving by a different road

  @executable
  Scenario Outline: a prompt that already tells a reviewer to cite a finding tag is reconciled with the rule
    Given "<file>" tells a reviewer today to route a finding with a `@finding-` tag
    When this task lands
    Then it says the id — and therefore the tag — is applied by the writer once the finding is landed, never chosen by the reviewer
    And a reviewer following that prompt end to end is never asked to invent a number

    Examples:
      | file                       |
      | `agents/aof-qa.md`         |
      | `agents/aof-security.md`   |
      | `agents/aof-compliance.md` |

  @executable
  Scenario: wherever the seven findings columns are restated, the allocation rule travels with them
    Given the two bundle files that restate the columns today — `commands/verify.md` and `agents/aof-qa.md`
    Then each of them says who fills the `id` column, and when
    And a file that restates the columns without the rule is exactly the drift this scenario exists to catch

  @executable
  Scenario: the verify prompt names the single writer and the moment of allocation
    Given `commands/verify.md`, the prompt that owns the findings register
    When it is read
    Then it says the single writer allocates ids at the moment of landing them in the register
    And it identifies that writer as the product owner, already the sole author of the record documents
    And it says a stale read is impossible because there is no second reader, so nobody is asked to check first

  @executable
  Scenario: the rule is stated as the prevention and the check as the residue
    Given the duplicate-id check shipping in story 66/02
    When the guidance describes the two together
    Then it says the rule prevents the collision and the check proves the rule held
    And it does not present the check as sufficient alone, because a check reports a collision two lanes have already written

  @executable
  Scenario: no code is required to make this true
    Given the rule lives in the shipped prompts
    When this task lands
    Then no module under `src/` outside `src/bundle/` changes
    And no dispatcher becomes responsible for a document convention

  @executable
  Scenario: the absence of the rule is detected rather than assumed
    Given the guard asserting the rule is present in all six files
    When the sentence is removed from any ONE of them
    Then the guard fails, naming that file
    And a guard still green with the sentence in only five of six is itself the defect this milestone exists to find

  @manual
  Scenario: a reviewer reads one prompt end to end and is left expecting no number
    Given any one of the five reviewing agents once this task lands
    When a reviewer reads it in a single sitting
    Then nothing in it asks for a number, and nothing implies one is expected of them
    And the judgment is a human read, because two instructions can agree literally and still conflict in effect
