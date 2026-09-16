@cli @adapter @work-stream
Feature: Nothing is linked into a worktree, and no worktree is deleted by filesystem call

  This repository has the scar that makes this feature non-negotiable. A reviewing agent junctioned a
  dependency directory into a scratch worktree to avoid an install; the worktree was then removed with
  force, the removal followed the junction, and it emptied the real directory. A workspace junction
  inside it carried the delete on into a tracked source tree: 113 tracked files gone, plus uncommitted
  work across five stories, two of them already accepted. It happened twice in four hours.

  The generalised rule from that incident is the one asserted here, and it is worth restating exactly
  because the obvious paraphrase is wrong: the hazard is not the install. It is any recursive delete
  whose path crosses a link into a git-managed directory. The workspace declaration that carried it is
  still in place, so the conditions have not changed — only the practice has, and a practice is not a
  control.

  Both halves are one hazard and are held together. A link nobody creates cannot be followed, and a
  delete that does not recurse cannot follow one. Removal stays with git, which knows what a worktree
  is; no aof path recursively deletes a worktree by filesystem call.

  Sharing is still available and still cheap — it just happens OUTSIDE the tree. A package manager's
  content-addressable cache lives outside every worktree by construction, so it is named in the declared
  prepare argv rather than linked into the checkout.

  This control is GREEN ON ARRIVAL over the current tree: it is a ratchet, not a fix. That is precisely
  why it owes a probe that plants the forbidden call and observes the refusal — a census that has never
  been seen red over a tree that never held the defect proves nothing by passing.

  ADR-007 §2, §3. FF-7207. TECH_DEBT item 36.

  @executable
  Scenario Outline: no link is created whose path lies inside a worktree
    Given a source module that creates a link with <form>
    And <placement>
    When the source tree is read for link-creating calls
    Then the call is <verdict>

    Examples: every link-creating form, each with its path inside a worktree
      | form                                                | placement                           | verdict  |
      | "symlink"                                           | its path resolves inside a worktree | reported |
      | "symlinkSync"                                       | its path resolves inside a worktree | reported |
      | "link"                                              | its path resolves inside a worktree | reported |
      | "linkSync"                                          | its path resolves inside a worktree | reported |
      | "symlink" with the junction type argument           | its path resolves inside a worktree | reported |
      | "mklink" in an argument vector                      | its path resolves inside a worktree | reported |
      | "New-Item -ItemType Junction" in an argument vector | its path resolves inside a worktree | reported |

    Examples: the target side, and the call that must stay admitted
      | form      | placement                                                    | verdict  |
      | "symlink" | its target resolves inside a worktree and its path does not  | reported |
      | "symlink" | neither its path nor its target resolves inside any worktree | admitted |

  @executable
  Scenario: the worktree root is derived, not matched as a literal
    Given this control's own source
    When it is read for how a worktree path is recognised
    Then it reaches the shared worktree-path derivation by import
    And it spells no worktree path literal of its own

  @executable
  Scenario Outline: what the derivation admits as inside a worktree
    Given a project root that is not this repository's
    When <path> is classified
    Then it is <verdict> a worktree

    Examples: a keyed child, the bare root, a lookalike sibling, and a foreign root
      | path                                                                   | verdict    |
      | a path the shared derivation produces for an assignment under that root | inside     |
      | the worktrees root itself, with no keyed child beneath it              | not inside |
      | a sibling directory whose name merely begins with the root's name      | not inside |
      | a path derived the same way under a different project root             | not inside |

  @executable
  Scenario Outline: no worktree is removed by a recursive filesystem delete
    Given a source module that deletes with <call>
    And <placement>
    When the source tree is read for recursive deletes
    Then the call is <verdict>

    Examples: a recursive delete reaching a worktree
      | call                              | placement                     | verdict  |
      | "rm" with recursion requested     | its path is a worktree        | reported |
      | "rmSync" with recursion requested | its path is a worktree        | reported |
      | "rimraf"                          | its path is a worktree        | reported |
      | "rm" with recursion requested     | its path is inside a worktree | reported |

    Examples: the recursive deletes that must stay admitted
      | call                          | placement                                             | verdict  |
      | "rm" with recursion requested | its path is the worktrees root itself, not a worktree | admitted |
      | "rm" with recursion requested | its path lies outside every worktree root             | admitted |
      | "rm" with no recursion        | its path is one file inside a worktree                | admitted |

  @executable
  Scenario Outline: removal goes through git
    Given a worktree being removed <force>
    When the removal runs
    Then it is performed by git's own worktree removal
    And no filesystem delete is reached

    Examples: an unforced and a forced removal
      | force        |
      | without force |
      | with force    |

  @manual
  Scenario: the ratchet is seen red before its green is believed
    Given this control passes over the source tree as it stands
    When a link-creating call whose path resolves inside a worktree is planted under the source tree
    Then the control fails, naming the planted module and the call
    And the message it printed is recorded against this control in the verification record
    And the control passes again once the planted call is removed
