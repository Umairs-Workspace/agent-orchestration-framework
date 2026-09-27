<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 48/00, the IDENTITY half: the assistant already tells us which
# session it is, on every hook event. This task stops throwing that away.
#
# THE SEAM, read at source. `resolveSessionIdentity({ stdinText, env })`
# (src/commands/mesh-session.mjs:54-71) ALREADY parses `session_id` off the hook's
# stdin JSON and already falls back to `CLAUDE_SESSION_ID`. Its result is bound at
# `:201` — and `identity.sessionId` is then read by nothing. Every downstream write
# (`:286`, `:291`, `:295`) passes `{ nodeId, workspaceId, repo, assistant, now }` and
# the id dies there. RESEARCH §1 measured the payload and §2 established that this id
# is the SAME Claude Code UUID the worker captures off the transcript filename
# (src/mesh-worker-execution.mjs:975-1032) and stamps onto an assignment — which is
# why ADR-001 forbids ever generating one: a fabricated id would be stable, unique,
# and unable to name the session the terminal mirror is already routing to.
#
# THE LADDER IS ORDERED, and the order is the contract (ADR-001):
#   `--session` flag  →  payload `session_id`  →  `env.CLAUDE_SESSION_ID`  →  null
# `--session` heads it because a non-hook caller — a human, CI, milestone 50's
# launcher — has no payload at all. It is a real flag, not a test seam.
#
# NOT ASSERTED HERE, and each has an owner, so no fact is claimed twice:
#  - that the record is keyed per-session and that `end` cannot kill a sibling — task
#    01 of this story.
#  - that no id GENERATOR exists anywhere on the path (a structural claim over source)
#    — the fitness function `acd-session-id-never-fabricated`
#    (ARCHITECTURE.md §Fitness functions #1). A Then that greps a source file is a
#    fitness function, not a scenario; this feature only asserts the OBSERVABLE
#    consequence (an unresolved id lands as `null`, never as a value).
#  - the presence ENTRY's six-key wire shape — story 48/01. This task never reads a
#    presence record.
#
# ISOLATION IS MANDATORY AND IT IS A LIVE HAZARD, not a formality. Every scenario runs
# under a fresh `AOF_GLOBAL_HOME` temp dir. `aof session start|ping|end` writes into
# the node's OWN global mesh home; an unisolated run writes fixtures into the
# operator's real `~/.aof` and corrupts a running soak. Focused runs only —
# `AOF_GLOBAL_HOME=$(mktemp -d) node --test test/<file>` — never the full suite
# (`test/global-work-propagation.test.mjs` binds `:4182`, which the live control
# daemon on this machine holds).
#
# FED BY THE REAL PRODUCER (m38/ADR-008). Every scenario drives the real
# `meshSessionCommand(args, ctx)` (src/commands/mesh-session.mjs:167), whose ctx
# already exposes the injected seams this needs — `env`, `stdinText`, `now`,
# `loadWorkspace`, `nodeId`, `cwd` (`:167-200`, `:282-283`). No hand-rolled fixture
# stands in for the CLI, and no scenario calls `startSession`/`pingSession` directly.

@executable @cli @work @distribution
Feature: the routable session id is READ from the assistant through one ordered ladder, and never invented
  In order that a live session can be named later by a surface that wants to reach it — using the same id the terminal mirror already routes on, not a second one we made up
  the session CLI resolves an id from the first channel that supplies one (`--session`, then the hook payload, then the environment), stores it byte-identical, and records `sessionId: null` when no channel supplies one at all

  Background:
    Given an isolated global mesh store (a fresh `AOF_GLOBAL_HOME` temp dir) and a real aof workspace on disk
    And every invocation below goes through the real `aof session` command with its injected env/stdin/clock seams
    And "the stored id" means the `sessionId` value read back off the session record the invocation wrote

  # THE HEADLINE. The ladder is an ORDER, so the rows that matter are the ones where
  # two channels disagree — a rung that loses must lose visibly.
  Scenario Outline: the first channel that supplies an id wins, and the ones below it do not get a vote
    Given the `--session` flag is <flag>
    And the hook stdin payload is <payload>
    And the environment's `CLAUDE_SESSION_ID` is <env>
    When I run `aof session start --workspace ws-1 --repo demo --assistant claude-code`
    Then the stored id is exactly <the stored id>
    And the record was written once — a losing channel neither wrote a second record nor rewrote this one

    Examples:
      | case                                       | flag      | payload                          | env       | the stored id |
      | a non-hook caller supplies it directly     | `id-flag` | absent                           | absent    | `id-flag`     |
      | flag beats a payload that disagrees        | `id-flag` | `{"session_id":"id-payload"}`    | `id-env`  | `id-flag`     |
      | the real Claude Code hook shape            | absent    | `{"session_id":"id-payload"}`    | absent    | `id-payload`  |
      | payload beats env when both are present    | absent    | `{"session_id":"id-payload"}`    | `id-env`  | `id-payload`  |
      | a malformed payload falls through to env   | absent    | `not json at all`                | `id-env`  | `id-env`      |
      | a payload with no session_id falls through | absent    | `{"cwd":"<the workspace dir>"}`  | `id-env`  | `id-env`      |
      | the env-only channel                       | absent    | absent                           | `id-env`  | `id-env`      |
    # Row 6 is the REAL measured payload shape, not a hypothetical: RESEARCH §1 (and
    # m38's own RESEARCH §2.2) established that a genuine Claude Code hook payload
    # carries `session_id` AND `cwd` — and the F4 fix at :208-247 already derives
    # workspace/repo from that `cwd`. This row proves the id ladder and that
    # derivation are independent: a payload can lose the id rung and still resolve
    # the workspace.

  # THE NEGATIVE THAT IS THE WHOLE POINT (ADR-001). "Not addressable" is a real,
  # first-class state — a session that is live and cannot be named. It must SAY so.
  Scenario: no channel supplies an id, so the record says so rather than inventing one
    Given no `--session` flag, no stdin payload and no `CLAUDE_SESSION_ID` in the environment
    When I run `aof session start --workspace ws-1 --repo demo --assistant claude-code`
    Then the command succeeds — an anonymous session is a valid session, not a refusal
    And the record on disk has the key `sessionId` PRESENT
    And its value is exactly `null` — the JSON null, and none of: a generated UUID, the string "null", the string "undefined", an empty string, the assistant name, the workspace id, or a hash of any of them
    And running the identical command a second time stores `null` again — an absent id is stable, not a value that varies per invocation
    # The second run is the cheap oracle for "was this generated": a generator
    # produces a DIFFERENT value the second time; `null` twice cannot have been made.
    # The structural proof that no generator exists on the path is delegated to
    # `acd-session-id-never-fabricated` — see the comment block.

  # BYTE-IDENTICAL STORAGE. The id's only job is to match another system's id
  # exactly; any normalisation is silent breakage that shows up two milestones later
  # as a pane that never streams.
  Scenario Outline: a supplied id is stored byte-identical — no case change, no trim, no hash, no truncation
    Given the hook stdin payload supplies the session id <the supplied id>
    When I run `aof session start --workspace ws-1 --repo demo --assistant claude-code`
    Then the stored id is byte-identical to <the supplied id> — same length, same case, same characters
    And reading the record back a second time yields the same bytes again

    Examples:
      | case                                  | the supplied id                          |
      | the real Claude Code UUID shape       | `3f2b9c14-8a7e-4d61-9f03-1c5ea77b42d9`   |
      | mixed case must survive               | `3F2b9C14-8a7E-4d61-9F03-1c5EA77B42d9`   |
      | leading/trailing space is not trimmed | `  spaced-id  `                          |
      | the leaf separator inside the value   | `weird~id~here`                          |
      | a long id is not truncated            | a 200-character id                       |
    # The `~` row is load-bearing beyond this task: `~` is the session-record leaf's
    # own separator (src/mesh-session.mjs:65-67) and `safeSegment` (`:55-57`) collapses
    # `/`, `\` and `..` but NOT `~`. The VALUE must survive whole here; what the leaf
    # does with it is task 01's subject, and task 01 has a row for it.
    # The spaced row asserts storage only — whether a whitespace-only id should be
    # REFUSED at the boundary is a separate question, flagged in task 01's comment
    # block rather than settled by whichever behaviour the build types first.

  # THE ID TRAVELS WITH ALL THREE VERBS. `end` in particular must be able to name
  # WHICH session it is ending — task 01 asserts the consequence (a sibling survives);
  # this scenario asserts the id is accepted and routed by every verb.
  Scenario Outline: start, ping and end each carry the id through the same ladder
    Given the session id `sess-abc` is supplied on <the channel>
    When I run `aof session <verb> --workspace ws-1 --repo demo --assistant claude-code`
    Then the command succeeds with its normal envelope for that verb
    And the id `sess-abc` is the one the verb acted on — the record written (start/ping) or removed (end) is the one keyed by it

    Examples:
      | case                         | verb  | the channel        |
      | start via the flag           | start | the `--session` flag |
      | ping via the payload         | ping  | the stdin payload    |
      | end via the flag             | end   | the `--session` flag |
      | ping via the environment     | ping  | `CLAUDE_SESSION_ID`  |

  # THE PRE-EXISTING REFUSALS MUST NOT MOVE. `--session` is an addition to
  # `SESSION_FLAGS` (:118); the coded refusal ladder (:249-269) is not this task's to
  # change, and a regression here is silent — a hook that starts failing writes no
  # record and nothing says why.
  Scenario Outline: adding `--session` does not disturb one existing coded refusal
    Given an invocation that is malformed in the way <case> describes
    When I run it
    Then it fails with the coded error <code> and a calm one-line message, never a stack trace
    And NO session record is written — the sole-producer discipline never emits a half-formed record

    Examples:
      | case                                     | code                          |
      | `start` with no `--workspace` and no payload | `session-arg-missing-workspace` |
      | `start` with a workspace but no `--repo`     | `session-arg-missing-repo`      |
      | `start` with no `--assistant` resolvable     | `session-arg-missing-assistant` |
      | an unrecognised flag is passed               | `invalid-input`                 |
      | a hook payload whose `cwd` is not a workspace | `session-cwd-not-workspace`    |
    # The unknown-flag row is the direct guard on this task's own change: adding
    # `--session` to `SESSION_FLAGS` must not turn the unknown-flag check into a
    # pass-through. `--sessions`, `--sess` and `--session-id` must all still be
    # `invalid-input`.
