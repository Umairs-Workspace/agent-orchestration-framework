@executable @cli @adapter @distribution
Feature: The answer rides mesh status behind a flag — the flagless document is byte-identical, --declarations adds exactly one key, each row carries its workspace's own cwd, and skips are carried verbatim

  36/ADR-004 §2: the supervisor reads fleet data through exactly one command, `mesh status --json`
  (`acd-desktop-single-data-path` forbids a second data-bearing verb and any direct read of
  `.aof/`). `mesh:status` (`src/commands/mesh/identity.mjs:236-373`) is the house example of
  additive growth — `boards` and `isControlNode` were both appended to a frozen `{ nodes }`, so
  its result holds exactly `nodes`, `boards` and `isControlNode` today — and
  `acd-mesh-command-cli-bijection` spawns `["mesh","status","--json"]` (`:103`) and needs no edit
  for an optional flag. Its input schema is closed (`properties: { now }`,
  `additionalProperties: false`) and its `cli.argv` (`:389-392`) takes positionals only, so the
  flag lands in the same three places every flag does.

  This node's workspaces come from `resolveNodeWorkspaces(nodeId)` (`src/mesh/presence.mjs:191-241`),
  which returns `{ ok, workspaces, skipped }`. `workspaces` carries `{ workspaceId, workDir,
  projectRoot }`; `skipped` names each `no-descriptor` / `workdir-missing` / `not-a-directory` row
  so a zero-workspace answer cannot masquerade as "nothing to do". `ok` is FALSE only when the
  resolver could not answer at all — the projection store would not open, or the query threw — and
  it returns empty `workspaces` AND empty `skipped` in that case, which is exactly why it cannot be
  read as an empty node. The node id is the `localId` marker `mesh:status` already resolves purely
  off `config.mesh.nodeId` (`:267`); no second identity derivation, and no mint.

  Per workspace the items come from `listItems(workDir)` (`src/work.mjs:392-421`) and the records
  from `readRuns(item)` (`src/run-store.mjs:637`), which is what makes a fixture cheap: a temp repo
  with an `ITEM_RE`-named folder and a `runs/<runId>.json` carrying a `brief.loop` is a workspace
  holding a declaration on disk.

  Measured at refine: the naive answer costs 167.3 ms over 410 items and 105 run records. Paid by
  every caller unconditionally at the supervisor's 3 s cadence, that is ~5.6% of a core; behind a
  flag asked every tenth tick it is ~0.6%. That saving is only real if the flagless path does not
  ENUMERATE either — a producer that walks the workspaces and then declines to emit the key has
  paid the whole 167 ms. Disk is the authority for a local run — TECH_DEBT item 19 measures a
  cached row that read `running` for two days after its run finished.

  What would quietly undo this: the key computed unconditionally, or the enumeration done
  unconditionally and only the key withheld; a second verb `aof work declarations`; rows without
  `cwd`, so a login-autostarted supervisor spawns from `C:\WINDOWS\system32` (TECH_DEBT item 4's
  measured shape); records read from the worker-streamed projection; `skipped` dropped so an
  unresolvable workspace reads as an empty node; and a resolver that did not answer degraded into
  the standalone fallback, which would report this node's own workspace as the fleet's whole truth.

  ADR-005 §1-§3, §5-§8. 36/ADR-004. FF-12605.

  Scenario Outline: without the flag the document is byte-identical
    Given a node with two registered workspaces, one holding a supervised declaration whose latest run is reclaimed
    And this node <control>
    When `aof mesh status --json` runs
    Then the document's keys are exactly `nodes`, `boards` and `isControlNode`, holding the values they held before the flag existed
    And it carries no `declarations` key
    And no workspace was enumerated and no run record was read — the resolver and `readRuns` were never called

    Examples: the marker the flagless document already carries never changes what it holds
      | control              |
      | is a control node    |
      | is not a control node |

  Scenario: with the flag the document gains exactly one key
    Given the same fixture
    When `aof mesh status --json --declarations` runs
    Then the document with its `declarations` key removed deep-equals the flagless document, and `declarations` is the only key added
    And `declarations`' own keys are exactly `ok`, `rows` and `skipped`
    And `ok` is true, and `rows` holds one row for the reclaimed supervised declaration
    And that row's key set is exactly `id`, `label`, `argv`, `cwd`, `scope`, `level` and `cap`
    And its `id` is the declaration's `loopRunId`, its `label` names the scope, and its `argv` deep-equals what `tasks/02`'s leaf composes for that declaration with resume
    And two runs over the unchanged fixture return the identical `declarations` value

  Scenario: the flag lands in three places and changes nothing else about the verb
    Given the registered `mesh:status` command
    When its input schema, `cli.spec.flags` and `cli.argv` are inspected
    Then `declarations` is a declared boolean in all three, the input schema is still closed, and `cli.spec.usage` names it
    And `cli.render` is unchanged, so the human face prints the same nodes and boards it printed before
    And `invoke("mesh:status", { declarations: true }, ctx)` returns the same document the CLI face emits for `--declarations --json`

  Scenario Outline: the workspace set is enumerated through the resolver, and its skips are carried verbatim
    Given a node whose membership is <membership>
    When `aof mesh status --json --declarations` runs
    Then `declarations.ok` is <ok>
    And `declarations.rows` holds <rows>
    And `declarations.skipped` holds <skips>, each carrying the resolver's own `workspaceId`, `workDir` and `reason`

    Examples: zero, one and many — and a workspace that could not be resolved is never an empty node
      | membership                                                    | ok    | rows                                             | skips                    |
      | no membership rows at all, the resolver answering             | true  | the rows of the command's own workspace          | none                     |
      | one member, resolvable, holding no declaration on disk        | true  | none                                             | none                     |
      | one member, resolvable, holding only unsupervised declarations | true | none                                             | none                     |
      | one member, resolvable, holding one listed declaration        | true  | one row                                          | none                     |
      | two members, both resolvable, both holding a listed declaration | true | two rows, in the resolver's workspace order, no two sharing an `id` | none |
      | two members, one holding two listed declarations              | true  | three rows                                       | none                     |
      | one resolvable member and one with no descriptor row          | true  | the resolvable member's rows                     | one, `no-descriptor`     |
      | one resolvable member and one whose work dir does not exist   | true  | the resolvable member's rows                     | one, `workdir-missing`   |
      | one resolvable member and one whose work dir is a file        | true  | the resolvable member's rows                     | one, `not-a-directory`   |
      | three members, one of each skip reason                        | true  | none                                             | three, one reason each   |
      | a membership the resolver cannot read at all                  | false | none                                             | none                     |

  Scenario: the standalone fallback answers a resolver that answered, never one that did not
    Given a node with no membership rows at all, where the resolver returns `ok` true with empty `workspaces` and empty `skipped`
    When the flag is asked
    Then the command's own `ctx.workspace` is the single member, and its declarations are the rows
    Given instead a node whose projection store will not open, where the resolver returns `ok` false
    When the flag is asked
    Then `ok` is false, `rows` is empty and `skipped` is empty
    And the command's own workspace is NOT read, so a resolver that did not answer is never dressed as a standalone node

  Scenario: each row's cwd is its descriptor's own projectRoot
    Given two workspaces whose descriptors' `projectRoot` values differ from each other and from the process's working directory
    When both hold a listed declaration
    Then each row's `cwd` equals its own descriptor's `projectRoot`
    And neither equals `process.cwd()`

  Scenario: no second command exists for this answer
    Given the command registry
    When `listCommands()` is asked for its ids
    Then no `work:declarations` or `mesh:declarations` command is registered
    And `mesh:status` is the only command whose result can carry `declarations`

  Scenario: the records come from disk
    Given a workspace whose global work projection holds a `running` row for an item whose disk run record reads `failed runtime_offline`
    When the flag is asked
    Then the row is listed on the strength of the disk record
    And the producer reaches `readRuns` and reaches no cached-row reader
