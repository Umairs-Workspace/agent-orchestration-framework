<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 48/00, the KEY half: one live session, one record. Today two
# are one, and either one's `end` kills the other's liveness.
#
# THE BUG, measured (RESEARCH §3) and read at source. `sessionLeaf(nodeId,
# workspaceId, assistant)` (src/mesh-session.mjs:65-67) composes a THREE-part leaf,
# and `sessionRecordPath` (`:74-76`) turns it into exactly one file. So two `claude`
# sessions open in the same repo on the same node resolve to the SAME path:
# `pingSession` (`:157-171`) upserts blindly over whichever wrote last, and
# `endSession` (`:178-184`) unlinks the shared leaf — so quitting one session marks
# the other dead while it is still running. This is not a corner case; it is the
# ordinary shape of working in two panes on one repo.
#
# THE FIX (ADR-002): the leaf gains a FOURTH component, the session id. An anonymous
# session (ADR-001, `sessionId: null`) contributes an EMPTY segment — a trailing `~` —
# so it still has exactly one well-formed path and pre-m48 records remain readable.
# The record itself is re-frozen at SEVEN ordered keys, `sessionId` inserted after
# `assistant` and before the `startedAt`/`lastPingAt` timestamp pair.
#
# NOT ASSERTED HERE, each with an owner:
#  - where the id comes from and that it is never invented — task 00 of this story.
#  - that a TTL-expired leaf is REMOVED from disk — task 02 of this story. This task
#    asserts records EXIST and are distinct; it never asserts anything about expiry.
#  - the structural claims (the leaf composition carries four segments; the key is
#    passed as one object; the record's frozen ordered key set) — the fitness
#    functions `acd-session-leaf-per-session` and the in-place amendment of
#    `acd-session-record-frozen` (ARCHITECTURE.md §Fitness functions #2 and #7).
#    Every Then below reads a real file or a real read-back value.
#  - the presence ENTRY's wire shape — story 48/01.
#
# ISOLATION IS MANDATORY. Fresh `AOF_GLOBAL_HOME` temp dir per scenario: these verbs
# write into the node's own global mesh home, and an unisolated run corrupts the
# operator's live `~/.aof` soak. Focused runs only, never the full suite
# (`test/global-work-propagation.test.mjs` binds `:4182`, held by the live daemon).
#
# FED BY THE REAL PRODUCER: the real `aof session` command and the real
# `readLiveSessions`, over a hermetic store. "Two records on disk" is asserted by
# listing the real sessions directory, not by inspecting a mock.

@executable @cli @work @distribution
Feature: one live session is one record — two sessions in a repo stop being one lying record, and ending one cannot end the other
  In order that an operator running two assistant sessions in the same repo sees two live sessions, and quitting one does not report the other as gone
  the session record is keyed by the session id as well as the node, workspace and assistant — so concurrent sessions are separate files, `end` removes only its own, and the record's shape is a frozen, ordered seven

  Background:
    Given an isolated global mesh store (a fresh `AOF_GLOBAL_HOME` temp dir) and a real aof workspace on disk
    And "the live sessions" means what the real `readLiveSessions` returns for this node with an injected clock

  # THE HEADLINE, and it is exactly the collision RESEARCH §3 measured.
  Scenario: two sessions in ONE repo are two records, both live at once
    Given `aof session start` has run for assistant "claude-code" in workspace "ws-1" with session id `sess-A`
    And `aof session start` has run for assistant "claude-code" in workspace "ws-1" with session id `sess-B`
    Then the sessions directory holds TWO record files, not one
    And the two file names differ from each other
    And reading each back yields its OWN `sessionId` — one `sess-A`, one `sess-B` — and each carries its own `startedAt`
    And the live sessions contain both, so a node running two sessions in one repo reports two
    # The `startedAt` clause is the part a blind upsert fails: today the second
    # `start` overwrites the first, and the first session's start time is simply lost.

  # THE CONSEQUENCE THAT BITES A REAL OPERATOR. Quitting one pane must not report the
  # other as dead.
  Scenario: ending one session leaves its sibling alive, on disk and on the next read
    Given two live sessions `sess-A` and `sess-B` for the same node, workspace and assistant
    When I run `aof session end` naming `sess-A`
    Then `sess-A`'s record file is gone from disk
    And `sess-B`'s record file is still on disk, byte-identical to before that command ran
    And the live sessions still contain `sess-B` — and no longer contain `sess-A`
    And running `aof session end` for `sess-A` a second time is a benign success that removes nothing else — ending an already-gone session was never an error and still is not

  # THE RE-FROZEN RECORD (ADR-002). Key ORDER is observable: the record is persisted
  # as pretty JSON and read back byte-equivalent (src/mesh-session.mjs:147, and the
  # persisted-opaque discipline mesh-presence.mjs:11-13 states for its own record).
  Scenario Outline: the record is the ordered seven, with `sessionId` explicitly present
    Given a session started with <the id situation>
    When I read its record file back off disk
    Then its keys are exactly `nodeId`, `workspaceId`, `repo`, `assistant`, `sessionId`, `startedAt`, `lastPingAt` — in that order
    And `sessionId` is <the stored value>
    And no key was dropped and no eighth key appeared

    Examples:
      | case                        | the id situation           | the stored value       |
      | an addressable session      | the id `sess-A` supplied   | exactly `sess-A`       |
      | an anonymous session        | no id on any channel       | explicitly `null`      |
    # The anonymous row is the one that must not degrade to an OMITTED key: a reader
    # cannot tell "this build has no session ids" from "this session has none" if the
    # key can vanish. Present-and-null is the contract (ADR-001).

  # UPSERT SEMANTICS SURVIVE THE NEW KEY, per session. `ping` without a prior `start`
  # still mints (`:157-171`) — a crash-recovered assistant self-heals on its next
  # ping — and a second ping refreshes only `lastPingAt`.
  Scenario: ping is still idempotent and still per-session
    Given no session record exists for `sess-A`
    When I run `aof session ping` naming `sess-A` with an injected clock at T0
    Then a record exists for `sess-A` with `startedAt` and `lastPingAt` both T0
    When I run `aof session ping` naming `sess-A` again at T0 plus 30 seconds
    Then that record's `lastPingAt` is T0 plus 30 seconds
    And its `startedAt` is still T0, and its `repo` is unchanged — a ping refreshes liveness, it does not restart the session
    And a ping naming `sess-B` at that same instant creates a SECOND record and does not touch `sess-A`'s bytes

  # THE ANONYMOUS SESSION IS A FULL CITIZEN — live, readable, rendered; simply not
  # addressable. It must not be a degraded second path.
  Scenario: an anonymous session is written, read and reported live like any other
    Given a session started with no id on any channel, in workspace "ws-1"
    Then exactly one record file exists for it and it is readable
    And the live sessions contain it, with `sessionId` explicitly `null`
    And starting a SECOND anonymous session for the same node, workspace and assistant resolves to that SAME one record — two nameless sessions are indistinguishable by construction, and the record does not pretend otherwise
    # That last clause is the honest limit of ADR-001, stated rather than hidden: an
    # id-less session cannot be told apart from another id-less one in the same
    # triple, so it keeps the pre-m48 collision. That is not a regression — it is
    # precisely the case the id exists to fix, and it is why Codex sessions (which
    # RESEARCH §1 could not measure an id for) are the ones to watch.

  # PATH SAFETY AT THE NEW SEGMENT. `safeSegment` (:55-57) collapses `/`, `\` and `..`
  # per component; `~` joins components (`:65-67`). An id is an OPAQUE value from
  # another system, so the leaf must stay one flat file under the partition root no
  # matter what the id contains.
  Scenario Outline: an id with awkward characters still resolves to exactly one flat record under the sessions directory
    Given a session started with the id <the id>
    Then exactly one file is created, directly under the sessions directory — no subdirectory was created and nothing was written outside it
    And reading that record back yields the id byte-identical to <the id> — the path is made safe, the VALUE is not rewritten

    Examples:
      | case                          | the id              |
      | a traversal-shaped id         | `../../escape`      |
      | a separator-bearing id        | `a/b\c`             |
      | the leaf separator itself     | `weird~id`          |
      | the ordinary UUID             | `3f2b9c14-8a7e-4d61-9f03-1c5ea77b42d9` |
    # A QA RULING FLAGGED FOR THE ARCHITECT, not decided here. `safeSegment` collapses
    # `~` in NEITHER direction, so two DIFFERENT ids could in principle compose the
    # same leaf (`a~b` in the id segment versus a segment boundary). Rows 3 and 4
    # assert only what is safe and load-bearing — one flat file, value preserved — and
    # the question "must the id segment also collapse `~`, and what happens to two ids
    # that collide after collapsing" is routed as a design gap. It must not be settled
    # by whichever behaviour the build types first. Task 00's `weird~id~here` storage
    # row is the matching evidence on the value side.
