@executable @cli @adapter @validate
Feature: The runner is declared by the project, or there is no run

  aof is installed into repositories that are not this one. `scripts/test.mjs` is this repo's script
  and exists in none of them, so a command that hard-codes it works here and lies everywhere else.
  Story 87 is what that failure looks like when it ships: a predicate whose subject was this
  repository's suite travelled anyway and refused other repos' own build commands.

  The cheap way to be wrong is a default. A fallback to `npm test` when nothing is declared reads as
  helpful and is not: it runs a program nobody named, in a repo that may not have it, and the operator
  learns what aof assumed only from the failure. So the absence of a declaration is an ANSWER — a
  coded refusal naming the key — and never a substitute program.

  The second thing that would slip past is a default that lives as text rather than as a branch. A
  program name spelled anywhere in `src/` is a default waiting for a caller, so the claim here is a
  census over the tree and not merely a behavioural check of one path: no `"npm"`, `"vitest"`,
  `"pytest"`, `"yarn"` or `"pnpm"` literal sits in an executable position.

  The third is a second reader. `work.test.*` resolved in two places is two answers that agree until
  they do not — the same species `src/loop-bounds.mjs` exists to prevent for `work.loop.*`. One module
  reads these keys, and it is this one.

  ADR-001 §1, §2. FF-7201.

  Scenario Outline: a declared runner resolves to a program that exists, before anything is launched
    Given a project that declares a test runner whose command is <declared>
    When the toolchain declaration is resolved
    Then the resolved toolchain carries the program, its invariant argument prefix, its selection template and its deadline
    And the resolved program is <resolved>
    And the resolved program is a path that exists
    And the bounded spawn seam was not called

    Examples: the forms a declared command may take, every one resolved in FRONT of the seam's door
      | declared                                                  | resolved                                           |
      | a bare name found on a PATH entry                         | the absolute path of the file PATH found           |
      | a bare name whose executable carries a platform extension | the extended file that exists, never the bare name |
      | an absolute path to an existing program                   | that same path, unaltered                          |
      | a path relative to the project root                       | the absolute path under the project root           |

  Scenario Outline: the shapes a declaration fails in, and the answer each one gets
    Given a project whose configuration <shape>
    When the toolchain declaration is resolved
    Then the result is a coded refusal
    And the refusal names <names>
    And the bounded spawn seam was not called
    And no program is substituted for the one that was not declared

    Examples: absence — the code is test-runner-undeclared, and the answer names the key rather than guessing a program
      | shape                                                | names             |
      | is empty                                             | the key work.test |
      | holds a work section with no test declaration        | the key work.test |
      | declares work.test as null                           | the key work.test |
      | declares work.test as a string rather than an object | the key work.test |

    Examples: declared but not usable — ONE code of its own, distinct from the undeclared one, and the message names the field
      | shape                                                 | names                |
      | declares work.test with no command                    | work.test.command    |
      | declares a command that is not a string               | work.test.command    |
      | declares a command that is the empty string           | work.test.command    |
      | declares args that are not an array                   | work.test.args       |
      | declares args holding an element that is not a string | work.test.args       |
      | declares selectArgs that are not an array             | work.test.selectArgs |
      | declares no deadlineMs                                | work.test.deadlineMs |
      | declares deadlineMs as 0                              | work.test.deadlineMs |
      | declares deadlineMs as -1                             | work.test.deadlineMs |
      | declares deadlineMs as the string "900000"            | work.test.deadlineMs |

    Examples: the OTHER declaration this module compiles — the worktree prepare step, whose ABSENCE is silent but whose FAULTS are not
      | shape                                                        | names                          |
      | declares work.worktree.prepare with no command               | work.worktree.prepare.command    |
      | declares a prepare command that is not a string              | work.worktree.prepare.command    |
      | declares prepare args that are not an array                  | work.worktree.prepare.args       |
      | declares no deadlineMs on the prepare step                   | work.worktree.prepare.deadlineMs |
      | declares the prepare deadlineMs as 0                         | work.worktree.prepare.deadlineMs |
      | declares the prepare deadlineMs as -1                        | work.worktree.prepare.deadlineMs |

    Examples: well-formed and resolving to nothing — a THIRD code of its own, for the case the seam's door would meet as a missing file
      | shape                                                                  | names                   |
      | declares a command that is on no PATH entry and at no path             | the command as declared |
      | declares a command naming a directory rather than a file               | the command as declared |
      | declares a relative command that does not exist under the project root | the command as declared |

  Scenario: the two declarations this module compiles differ in ABSENCE and agree in FAULT
    Given a configuration declaring neither a test runner nor a worktree prepare step
    When both declarations are resolved
    Then the absent test runner is a coded refusal naming its key
    And the absent prepare step is no refusal at all, and no warning
    And nothing is launched for either
    Given a configuration whose prepare step is present and does not compile
    When it is resolved
    Then it is a coded refusal raised where the declaration is compiled, not at the launch
    And that refusal is told apart from the prepare step being absent

  Scenario: the three refusals are three different answers
    Given nothing declared, a declaration missing its command, and a command that resolves nowhere
    When each is resolved
    Then each carries a code
    And no two of the three codes are the same
    And the code for nothing declared is test-runner-undeclared
    And every field fault within one declaration shares the one code, separated by the field its message names

  Scenario Outline: a program name planted in an executable position fails the census
    Given "<name>" planted under the source tree as the command handed to the bounded spawn seam
    When the source tree is censused for a test-runner program name in an executable position
    Then the census fails
    And it names the file the literal was planted in

    Examples: the five names a declaration may supply — the red this census owes, one plant per name
      | name   |
      | npm    |
      | vitest |
      | pytest |
      | yarn   |
      | pnpm   |

  Scenario Outline: the shapes that spell a program name without being one, and stay admitted
    Given the source tree as it stands, in which <shape>
    When the source tree is censused for a test-runner program name in an executable position
    Then the census passes
    And that occurrence is not reported

    Examples: measured at HEAD — a census that fires on these is a census somebody switches off
      | shape                                                                              |
      | src/packages.mjs holds "npm" as a member of the package source-type enum           |
      | src/frameworks.mjs builds an npm: package-source string                            |
      | src/frameworks.mjs sets npm_config_* environment keys                              |
      | src/work-observe.mjs names runners in a comment about what it must not match       |
      | src/board-serve.mjs prints an npm --prefix instruction inside a message to a human |

  Scenario Outline: each configuration key has exactly one reader in the source tree
    Given every module under the source tree
    When they are read for a use of <key>
    Then the only module that uses it is the toolchain module

    Examples: the keys this module owns — the worktree keys included, though nothing in this story consumes them
      | key                   |
      | work.test.command     |
      | work.test.args        |
      | work.test.selectArgs  |
      | work.test.roots       |
      | work.test.deadlineMs  |
      | work.worktree.prepare |

  Scenario: the one-reader census is drivable, and a mention is not a read
    Given a second module under the source tree that reads work.test.command from a configuration object
    When the source tree is censused
    Then the census fails naming that second module
    When that read is replaced by the same key named in that module's comment
    Then the census passes
    And this repository's own configuration file, its tests and its contracts are not censused as source modules
