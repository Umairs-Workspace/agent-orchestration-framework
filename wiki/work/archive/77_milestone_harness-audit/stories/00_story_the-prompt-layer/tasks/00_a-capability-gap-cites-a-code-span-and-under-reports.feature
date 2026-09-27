@executable @cli @work @validate
Feature: An instruction ordering a role to run a program it was never granted is a finding, and everything less certain than that is silence

  A subagent told to run a verb its `tools:` never granted does not fail loudly. It reads the
  instruction, cannot obey it, and continues — so the failure surfaces as a step that quietly did not
  happen. One instance is live and has been for as long as this repository has run the command:
  `refine.md:102-109` orders the **PO** to run `aof work memory recall … --block`, and
  `aof-product-owner.md:5` grants no `Bash`.

  The obvious detector was built and measured first, and it is the reason for every narrow gate
  below. Any code span whose first token is a program name, attributed to any role word in the
  sentence, produced **17 findings over this corpus, of which zero were the true one**:
  `aof-product-owner` matches `^aof`, `aof:verify` is a slash command rather than a program, and
  *"spawn `aof-designer`"* instructs the orchestrator rather than the designer.

  So the evidence is narrowed four ways. Only a backticked CODE SPAN is evidence — a rule that reads
  English reads `aof-designer.md:16,20`'s *"has no `Bash`; you are structurally read-only"* as an
  instruction. The span's first token must be in a CLOSED eight-member program map **and be followed
  by a space and an argument** — the space is what excludes an agent id and a slash command by
  construction rather than by an exception list. The clause must order the reader to RUN it, because
  a document that mentions a command is not a document that orders one. And attribution is exactly
  ONE bolded role word through a declared eight-row role map: zero, or two or more, reports nothing.

  What comes out the far end is deliberately small: **33 documents → 165 program-shaped spans → 5
  attributed → 1 finding, 0 false positives.** This rule will miss a gap written in prose, one
  attributed to a role named without bold, and any capability that is not `Bash`; those misses are
  chosen, and the lane says so in its own output rather than here.

  Two normalisations are required and both were measured. A markdown code span WRAPS ACROSS LINES —
  the live instance breaks between `` `aof work memory` `` and `` `recall "…" --block` `` — so
  whitespace is collapsed per paragraph before anything is split, and a line-oriented reader misses
  the only true positive in the corpus. And clauses split at `. ! ? ;`, because the live instance
  shares ONE SENTENCE with the architect's; at sentence granularity two role words appear, the
  ambiguity rule fires, and the finding is dropped.

  What would quietly undo this: a second row in the program map — a bare tool-name token such as
  `` `Edit` `` in prose, the shape chore 76 already closed; an exception list in place of the space
  rule; and a second place to read a role's grant, when the agent document's own `tools:`
  frontmatter is the only home.

  Severity is not this rule's to choose. It follows the audited configuration's routing for the role
  the finding names — supplied among the lane's inputs, never read from a key — which is why the one
  live finding lands at `warn` here and at `error` only where a project spawns its product owner.

  ADR-003 §1, §2, §3, §4, §5. ADR-008 §4. FF-7701.

  Scenario: the live shape — a role ordered to run a program its grant never included
    Given an installed prompt layer whose command document orders the **product owner** to run `aof work memory recall "…" --block`
    And an agent document for that role whose `tools:` frontmatter grants no `Bash`
    When the prompt-layer lane runs over that corpus
    Then one `audit-agent-capability-gap` finding is returned
    And it names the document carrying the instruction
    And it carries the clause that ordered the run
    And it names the role the instruction was attributed to
    And it names `Bash` as the capability that role's grant does not include

  Scenario Outline: the program map is closed, and a first token outside it names no capability
    Given a clause ordering a role granted no `Bash` to run the code span <span>
    When the prompt-layer lane runs over that corpus
    Then <outcome>

    Examples: the eight programs the map admits, and three it refuses
      | span                                     | outcome                                     |
      | `aof work memory recall "…" --block`     | one `audit-agent-capability-gap` is returned |
      | `npm test`                               | one `audit-agent-capability-gap` is returned |
      | `npx playwright test`                    | one `audit-agent-capability-gap` is returned |
      | `node scripts/test.mjs`                  | one `audit-agent-capability-gap` is returned |
      | `git status`                             | one `audit-agent-capability-gap` is returned |
      | `bash scripts/deploy-wsl.sh`             | one `audit-agent-capability-gap` is returned |
      | `pwsh -Command "…"`                      | one `audit-agent-capability-gap` is returned |
      | `sh -c "…"`                              | one `audit-agent-capability-gap` is returned |
      | `docker compose up`                      | no finding is returned                      |
      | `make check`                             | no finding is returned                      |
      | `curl https://example.test`              | no finding is returned                      |

  Scenario Outline: only a backticked span shaped like a program plus an argument, in a clause ordering a run, is evidence
    Given a clause attributed to exactly one role granted no `Bash`, carrying <construction>
    When the prompt-layer lane runs over that corpus
    Then <outcome>

    Examples: the shapes refused by construction rather than by an exception list
      | construction                                                              | outcome                                     |
      | the code span `aof work audit`, in a clause ordering the reader to run it  | one `audit-agent-capability-gap` is returned |
      | the code span `aof-designer`, an agent id with no space and no argument    | no finding is returned                      |
      | the code span `aof:verify`, a slash command with no space and no argument  | no finding is returned                      |
      | the code span `aof`, a program name with no argument after it              | no finding is returned                      |
      | the code span `Bash` inside the negative prose *"has no `Bash`"*           | no finding is returned                      |
      | the words aof work audit written as prose, with no backticks at all        | no finding is returned                      |
      | the code span `git log`, in a clause that mentions it and orders no run    | no finding is returned                      |

  Scenario Outline: attribution admits exactly one bolded role word from the declared role map
    Given a clause ordering a run of `aof work audit`, whose role words are <role words>
    And every role named in that clause is granted no `Bash`
    When the prompt-layer lane runs over that corpus
    Then <outcome>

    Examples: zero, one and many — only one attributes
      | role words                                             | outcome                                            |
      | one bolded word naming a role in the declared map      | one finding is returned, naming that role          |
      | no role word at all                                    | no finding is returned                             |
      | one role word from the declared map, not bolded        | no finding is returned                             |
      | one bolded word naming no role in the declared map     | no finding is returned                             |
      | two bolded words naming roles in the declared map      | no finding is returned                             |
      | three bolded words naming roles in the declared map    | no finding is returned                             |

  Scenario: an agent's own document attributes to itself, with no role word in the clause
    Given an agent document whose `tools:` frontmatter grants no `Bash`
    And a clause in that same document ordering its reader to run `aof work audit`, naming no role at all
    When the prompt-layer lane runs over that corpus
    Then one `audit-agent-capability-gap` finding is returned
    And it names that agent as the role
    And the same clause placed in a command document that names no role yields no finding

  Scenario: a code span broken across two source lines is one span
    Given a document carrying the span `aof work memory recall "…" --block` wrapped across two lines, the break falling between `memory` and `recall`
    And an agent document for the **product owner** granting no `Bash`
    When the prompt-layer lane runs over that corpus
    Then one `audit-agent-capability-gap` finding is returned, naming that role and `Bash`
    And the same corpus with that span on a single line returns the same one finding

  Scenario Outline: a clause ends at a sentence terminator or a semicolon, and nowhere else
    Given one sentence ordering the **architect** to run one command and the **product owner** to run another, the two separated by <separator>
    And the architect is granted `Bash` and the product owner is not
    When the prompt-layer lane runs over that corpus
    Then <outcome>
    And no finding names the architect, whose clause was satisfied

    Examples: the four separators that split a clause, and two that do not
      | separator            | outcome                                                        |
      | a semicolon          | one finding is returned, naming the product owner              |
      | a full stop          | one finding is returned, naming the product owner              |
      | a question mark      | one finding is returned, naming the product owner              |
      | an exclamation mark  | one finding is returned, naming the product owner              |
      | a comma              | no finding is returned — one clause carrying two role words    |
      | an em dash           | no finding is returned — one clause carrying two role words    |

  Scenario Outline: the grant is the agent document's own `tools:` frontmatter and nothing else
    Given an agent document whose reader is ordered to run `aof work audit`, and whose grant is <grant>
    When the prompt-layer lane runs over that corpus
    Then <outcome>

    Examples: one home for the grant, driven from both sides
      | grant                                                                              | outcome                                     |
      | a `tools:` frontmatter listing `Bash` among others                                 | no finding is returned                      |
      | a `tools:` frontmatter listing Read, Grep, Glob and Write, and no `Bash`            | one finding is returned, naming `Bash`      |
      | no `tools:` key in the frontmatter at all                                          | one finding is returned, naming `Bash`      |
      | no `tools:` key, and a prose sentence in the body saying the role may run commands | one finding is returned, naming `Bash`      |
      | no `tools:` key, and a second document elsewhere in the corpus listing `Bash` for that role | one finding is returned, naming `Bash` |

  Scenario Outline: severity follows the audited configuration's routing for the role the finding names
    Given a synthetic prompt corpus carrying a capability gap, with no aof configuration file beneath its root
    And a role routing supplied among the lane's inputs that routes that role <routing>
    When the prompt-layer lane runs over that corpus
    Then the finding's severity is <severity>

    Examples: the ladder fixed per code, not chosen per construction site
      | routing                     | severity |
      | as a spawned agent          | error    |
      | inline, to the main session | warn     |

  Scenario: a corpus whose every instruction is satisfied yields no capability finding
    Given a prompt corpus in which every clause ordering a run names a role whose `tools:` frontmatter grants `Bash`
    When the prompt-layer lane runs over that corpus
    Then no `audit-agent-capability-gap` finding is returned
    And a read record is returned all the same, reporting how many documents were read
    And that count is the number of documents the corpus holds
