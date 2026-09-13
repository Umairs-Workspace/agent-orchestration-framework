@executable @cli @work @distribution
Feature: Repo admission leaves the worker — the join, the clone-on-miss, and the scoped-checkout repoint move together or not at all

  Item 83's seam 1 is the largest single block: **551 lines**
  (`sed -n '370,648p;767,931p;1421,1527p' src/mesh/worker-execution.mjs | wc -l`), **253 code / 256
  comment** by the same `awk` census. It is one question asked once — *may this worker run this
  workspace's work, and where?* — answered by the marker/membership join, then by clone-on-miss when
  the join misses, then by pointing `ws` at the assigned workspace's own checkout.

  The cut is not free-standing the way seam 2 is, and the shape it must take was measured rather than
  assumed. The handler's block closes over eight injected seams (`openStore`,
  `globalWorkStoreOptions`, `cloneExec`, `requestCloneCredential`, `requestCloneUrl`,
  `resolveWorkspaceCloneUrl`, `resolveNow`, `nodeId`) and it **reassigns `ws` twice** — the in-memory
  published-marker overlay at `:1479`, and the foreign-workspace repoint at `:1516`. So the extracted
  entry point cannot be a void call: it answers with the workspace it resolved, or with a refusal, in
  `composeDirectiveLaunchOptions`'s own delivered idiom, and the handler keeps sole ownership of
  reporting the failure and settling the assignment. That is what keeps the coded outcomes identical
  while the decision moves.

  Three delivered controls read the parent's source text, and only ONE of them will notice.
  `acd-assignment-repo-availability-loud:44-48` searches for `workerHasRepo(` before `addWorktree(`
  and pushes a problem when either offset is `-1`, so the guard leaving the file reds it **loudly** —
  the good case. `acd-worker-clone-target-scoped:40-67` is the bad one: every leg is a negative, and
  its single positive leg is gated on `hasClone` at `:59`. With the clone gone from the parent,
  `hasClone` is false and the whole detector passes over a file that contains no clone — the
  invariant is asserted over nothing, permanently, and its own self-check cannot catch it because
  that check runs over planted strings rather than over the real subject.
  `acd-worker-clone-no-credential-persisted` is half of each: `assertHelperResetControl:120-129` is
  positive and reds, while `assertStructural:60-104` (no `credential.helper store`, no
  `extraheader`/`Authorization`, no `process.env.<X> =`, no `Object.assign(process.env, …)`) goes
  silent exactly the same way. Repairing only the loud legs is the failure this contract exists to
  prevent.

  What would quietly undo this: the parent keeping one `workerHasRepo` call for a log line; the clone
  controls left pointed at a parent that no longer clones; the extracted module importing the parent
  back for its failure reporter; and `buildAskpassShim` / the redaction helper copied rather than
  imported by the push path, which stays in the parent as seam 3 and is out of scope here.

  ADR-007 (seam 1), ADR-005, ADR-003 §4, ADR-002. FF-11907.

  Scenario Outline: the admission join answers the same way it answers today
    Given a local `mesh.repo.published` marker that is <marker>
    And a `global_node_workspaces` row for this node and workspace that is <membership>
    When the worker asks whether it holds the repo for that workspace
    Then admission is <outcome>

    Examples: both facts, or a miss — either half missing is a miss, and a fault is never a throw
      | marker                              | membership       | outcome  |
      | published for this workspaceId      | present          | admitted |
      | published for this workspaceId      | absent           | a miss   |
      | published for a DIFFERENT workspaceId | present        | a miss   |
      | absent, or `published` not true     | present          | a miss   |
      | published with no workspaceId key   | present          | admitted |
      | published for this workspaceId      | store unreadable | a miss   |

  Scenario Outline: clone-on-miss resolves its source in three tiers and settles with the same codes
    Given the join missed for this workspace
    And this worker's own config clone url is <own>
    And a control-node pull that <pull>
    And this worker's local registry clone url is <registry>
    When the worker handles the directive
    Then the outcome is <outcome>
    And no worktree is created on any refusing path

    Examples: the tiers in order, and every coded settle preserved verbatim
      | own          | pull                 | registry | outcome                                                          |
      | well-formed  | is never attempted   | absent   | the clone runs from this worker's own config                     |
      | absent       | answers a url        | absent   | the clone runs from the pulled url                               |
      | absent       | throws or refuses    | a url    | the fault is reported, then the clone runs from the registry     |
      | absent       | answers nothing      | absent   | failed, code assignment-repo-unavailable, nothing cloned         |
      | blank or malformed | answers nothing | absent   | failed, code assignment-repo-unavailable, nothing cloned         |
      | well-formed  | is never attempted   | absent   | a throwing clone settles failed on the clone's own code          |
      | well-formed  | is never attempted   | absent   | a clone that leaves the join still false settles assignment-repo-unavailable naming the resolved url |

  Scenario Outline: the repo the worker runs is scoped by workspace, never by the daemon's launch cwd
    Given a directive whose workspaceId <relation> this launcher's own workspace
    And a scoped checkout that <checkout>
    When admission completes
    Then the workspace every downstream seam operates on is <resolved>

    Examples: the 2026-07-24 soak's two failure modes stay closed across the split
      | relation      | checkout                        | resolved                                    |
      | equals        | is not consulted                | the launcher's own workspace, untouched     |
      | differs from  | loads                           | the scoped checkout for that workspaceId    |
      | differs from  | was left by a prior run, no clone this tick | the scoped checkout for that workspaceId |
      | differs from  | cannot be loaded                | nothing — failed, code assignment-checkout-unresolved, no worktree |

  Scenario: the guard still precedes the worktree, and the control that says so still says so
    Given admission now happens in an extracted module
    When the delivered repo-availability control is run
    Then it asserts the admission call precedes the `addWorktree(` call site across the split
    And it still reds on a planted worktree-before-guard ordering
    And it still reds on a miss branch that reports no coded literal

  Scenario: the credential controls are asserted over the module that now clones
    Given the clone, its askpass shim and its redaction have left the parent
    When the clone-target and no-credential-persisted controls are run
    Then each names the file that now performs the clone
    And each asserts it read a subject containing a clone, so neither can pass over a file without one
    And a planted `os.tmpdir()` target, a planted `credential.helper store`, a planted `clone --config http.extraHeader` and a planted write onto `process.env` each still trip their detector
    And the ambient credential.helper reset and `GIT_TERMINAL_PROMPT` remain asserted as present

  Scenario: the extracted module is a leaf of its parent, never a peer
    Given the extracted repo-admission module inside `src/mesh/`
    When its static and dynamic import specifiers are read
    Then none of them resolves to `src/mesh/worker-execution.mjs`
    And none of them reaches it through a third module
    And the parent obtains the checkout-path seam its withdraw, resume and recovery handlers still call by importing it from this module rather than by defining it again
