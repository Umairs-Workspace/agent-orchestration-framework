<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 48/01, the PROJECTION: the one place on the whole path where a
# session field is actually lost.
#
# THE SEAM, read at source. `readLiveSessions` (src/mesh-presence.mjs:93-110) reads
# every session record for this node, filters to live ones, and then projects each
# survivor down to EXACTLY four keys — `{ workspaceId, repo, assistant, lastPingAt }`
# (`:101-106`). Whatever story 48/00 records, the id dies here, at the first hop, and
# nothing downstream can route on it. RESEARCH §5 traced all nine hops and found this
# projection and the TypeScript mirror are the ONLY two places that need teaching;
# every other hop already passes a session entry through whole.
#
# THE FROZEN ENTRY (ADR-005), and the order IS the contract:
#   { sessionId, workspaceId, repo, assistant, lastPingAt, workspaceHasRun }
# `sessionId` leads because it is the key — mirroring the record's own `nodeId`-first
# shape. `workspaceHasRun` trails as the derived policy-input story 48/02 needs. The
# m38 four keep their RELATIVE order: this is an insertion at the head and an append
# at the tail, never a reorder — m38/ADR-001's discipline applied one level down, from
# the record to the entry.
#
# THE DEFAULT-EMPTY SET IS A CONTRACT, NOT A CONVENIENCE. `workspacesHasRun` is
# stamped from an injected `workspacesWithRuns` set that DEFAULTS TO EMPTY. With no
# set supplied every entry reports `false`, the launcher's own filter
# (src/mesh-launcher.mjs:585) still runs, and no rendered output moves — which is
# exactly what makes this story behaviour-neutral and mergeable BEFORE story 48/02
# (ADR-008). A scenario below pins that default, because losing it silently couples
# two stories that are meant to land independently.
#
# NOT ASSERTED HERE, each with an owner:
#  - deleting the launcher's subsumption filter, and what the fleet RENDERS — story
#    48/02, both halves. Until it lands the launcher still filters, and that is not
#    this task's business.
#  - the fabric hop and the typed mirror — task 01 of this story.
#  - the index — story 48/03.
#  - the structural key-order assertion over source, and the `PresenceSession`
#    declaration itself — the fitness function `acd-session-entry-frozen-wire`
#    (ARCHITECTURE.md §Fitness functions #4). Every Then below reads a value off a
#    real call to the real `readLiveSessions`.
#
# ISOLATION IS MANDATORY. Fresh `AOF_GLOBAL_HOME` temp dir per scenario — the fixture
# writes real session records, and an unisolated run corrupts the operator's live
# `~/.aof` soak. Focused runs only, never the full suite
# (`test/global-work-propagation.test.mjs` binds `:4182`, held by the live daemon).
#
# THE CLOCK IS INJECTED, ALWAYS. `readLiveSessions` takes `options.now`/
# `options.ttlSeconds`/`options.config` (`:93-97`) precisely so no scenario reads wall
# time. The TTL is the documented `DEFAULT_SESSION_TTL_SECONDS = 120`
# (src/mesh-session.mjs:34), never a number a test invented.

@executable @cli @work @distribution
Feature: a live session reaches the wire as a frozen, ordered six — carrying its id and the run fact, with both new keys always present
  In order that the id a node records is the id the control node receives — instead of dying at the first hop in a four-key projection — and that a later reader can apply a display rule without the producer having decided it
  `readLiveSessions` projects each live session record to exactly `{ sessionId, workspaceId, repo, assistant, lastPingAt, workspaceHasRun }`, in that order, with `sessionId` null rather than absent for an anonymous session and `workspaceHasRun` false unless a run set says otherwise

  Background:
    Given an isolated global mesh store (a fresh `AOF_GLOBAL_HOME` temp dir) holding session records for one node
    And an injected clock and the TTL resolved from config, so liveness is a fact of the fixture
    And "the entry" means an element of what the real `readLiveSessions` returns for that node

  # THE HEADLINE. Key ORDER is asserted as an exact ordered list, not a subset —
  # a projection that gets the keys right and the order wrong breaks the frozen-shape
  # discipline m38/ADR-001 established and is invisible to a subset check.
  Scenario: the entry is the ordered six, and the m38 four keep their relative order and their values
    Given a live session record carrying id `sess-A`, workspace `ws-1`, repo `demo`, assistant `claude-code` and a known `lastPingAt`
    When I read the live sessions for that node
    Then the entry's keys are exactly `sessionId`, `workspaceId`, `repo`, `assistant`, `lastPingAt`, `workspaceHasRun` — in that order
    And `sessionId` is exactly `sess-A`, byte-identical to the record's own
    And `workspaceId`, `repo`, `assistant` and `lastPingAt` carry exactly the values they carry today, in that relative order — the m38 four are untouched
    And no seventh key appeared, and no key from the session RECORD leaked through (`startedAt` and `nodeId` are not on the entry)
    # `startedAt` is deliberately absent: the entry is a LIVENESS projection, and
    # nothing on the wire needs a start time today. Adding it later is another
    # insertion, decided then, by whoever needs it.

  # PRESENT-AND-NULL. A reader cannot tell "this build has no session ids" from "this
  # session has none" if the key can vanish — so it never vanishes (ADR-001/ADR-005).
  Scenario Outline: both new keys are ALWAYS present, whatever the record on disk looks like
    Given a live session record of the shape <the record>
    When I read the live sessions for that node
    Then the entry has the key `sessionId` present, with the value <sessionId>
    And the entry has the key `workspaceHasRun` present, with the value <workspaceHasRun>
    And neither key is omitted, and neither is `undefined`

    Examples:
      | case                                   | the record                            | sessionId | workspaceHasRun |
      | an addressable session                 | one carrying id `sess-A`              | `sess-A`  | false           |
      | an anonymous session (post-48/00)      | one whose `sessionId` is null         | null      | false           |
      | a pre-m48 record with no id key at all | a record written before this milestone| null      | false           |
    # Row 3 is what ADR-002's "no migration" claim rests on: the projection reads
    # `record.sessionId ?? null`, so a record written by yesterday's build projects a
    # well-formed anonymous entry instead of an `undefined` that would serialise away.

  # THE DEFAULT-EMPTY SET (ADR-005/ADR-008). This is the clause that lets this story
  # merge alone, and it is asserted as behaviour, not documented as an intention.
  Scenario: with no run set supplied, every entry reports false — this story alone changes no behaviour
    Given three live sessions across two workspaces, and NO `workspacesWithRuns` supplied to the projection
    When I read the live sessions for that node
    Then every entry's `workspaceHasRun` is false
    And each entry's other five values are exactly what today's four-key projection produces for the same record, plus the id
    And nothing about which sessions appear has changed — the same records are live, the same ones are filtered

  # THE STAMP IS PER-ENTRY, NOT PER-CALL. A node with a run in one workspace and a
  # session in another is the case a per-call flag silently gets wrong.
  Scenario: the run fact is stamped per entry, in one array
    Given a live session in workspace `ws-A` and a live session in workspace `ws-B`
    And a `workspacesWithRuns` set containing only `ws-A`
    When I read the live sessions for that node
    Then the `ws-A` entry's `workspaceHasRun` is true
    And the `ws-B` entry's `workspaceHasRun` is false
    And both entries are present in the same array — the stamp describes a workspace, it never removes a session
    And two live sessions in `ws-A` BOTH report true — the fact is about the workspace, not about which session got there first

  # TTL FILTERING IS UNCHANGED. This story adds keys; it must not touch who is live.
  # The predicate itself is not re-asserted here (it is imported, and
  # `acd-session-ttl-reuses-isstale` already pins that) — only the observable outcome.
  Scenario Outline: liveness behaves exactly as it does today
    Given a session record whose age at the injected instant is <the age>
    When I read the live sessions for that node
    Then the entry is <present?>

    Examples:
      | case                      | the age            | present? |
      | comfortably live          | half the TTL       | present  |
      | exactly at the threshold  | exactly the TTL    | present  |
      | just past                 | the TTL plus 1ms   | absent   |
    # The at-the-threshold row is the strict-`>` edge (src/mesh-session.mjs:195-197).
    # It is here because a rewritten projection is exactly where someone
    # re-implements the comparison by hand.

  # THE EMPTY CASE. `sessions: []` present-never-omitted is m38's own rule and the
  # SPEC restates it; a projection rewrite is where it would quietly become undefined.
  Scenario: a node with no live sessions still yields an empty array
    Given a node with no session records at all, and a node whose only session record is expired
    When I read the live sessions for each
    Then each returns an empty array — present, never null, never undefined
    And the presence record assembled from it still carries `sessions: []` rather than omitting the key
