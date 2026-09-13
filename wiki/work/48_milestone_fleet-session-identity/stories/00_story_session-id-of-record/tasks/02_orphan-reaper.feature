<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 48/00, the LIFECYCLE half: a session that dies without saying
# so must leave disk, and the only thing that can be relied on to notice is the TTL.
#
# THE GAP, measured (RESEARCH §4). Nothing removes a session record. `isSessionLive`
# (src/mesh-session.mjs:195-197) is a pure READ-TIME filter that never touches disk;
# `readLiveSessions` (src/mesh-presence.mjs:93-110) filters and returns survivors
# without deleting; `endSession` (`:178-184`) is the codebase's ONLY unlink of a
# session record and has exactly ONE call site — the `aof session end` verb
# (src/commands/mesh-session.mjs:295). `src/mesh-store.mjs`, which sweeps other
# partitions, has no reference to `sessions` at all. So a crashed, force-killed or
# powered-off session leaves a file behind forever: invisible to every live read,
# never removed.
#
# WHY IT STOPS BEING HYGIENE AND BECOMES LOAD-BEARING (ADR-006): RESEARCH §1 found
# that **Codex has no `SessionEnd` event at all** — a product gap, not a missing
# wire-up — so for Codex the TTL is the only end-of-life signal by construction. And
# task 01's per-session key makes the leak one file per dead SESSION rather than one
# per `(node, workspace, assistant)` triple.
#
# THE DECISION THIS FEATURE PINS: `end` is an OPTIMISATION, never the mechanism.
# `reapExpiredSessions(workspace, nodeId, options)` lives in `src/mesh-session.mjs`
# (the module that already owns the records and the only unlink) and runs at the WRITE
# seam — `startSession`/`pingSession` reap before they write. Reads stay pure; no
# daemon, no schedule, no launcher edit, and it runs on the node that OWNS the records
# (no other node can see them, and a control node reaping a peer's would make it a
# second authority over liveness).
#
# NOT ASSERTED HERE, each with an owner:
#  - the id ladder (task 00) and the per-session key (task 01). This task PLANTS
#    records rather than deriving them.
#  - the structural claims — that the reap path imports the shared predicate and
#    contains no second staleness comparison, that it sweeps only this node's leaves,
#    that `start`/`ping` invoke it — are the fitness function `acd-session-orphan-reaped`
#    (ARCHITECTURE.md §Fitness functions #3). Every Then below is a file that exists
#    or does not exist after a real command ran.
#
# ISOLATION IS MANDATORY, and here it is doubly so: this feature DELETES files. A
# fresh `AOF_GLOBAL_HOME` temp dir per scenario. An unisolated run would reap the
# operator's real `~/.aof` session records mid-soak. Focused runs only, never the full
# suite (`test/global-work-propagation.test.mjs` binds `:4182`, held by the live daemon).
#
# THE TTL IS THE DOCUMENTED ONE, REUSED: `DEFAULT_SESSION_TTL_SECONDS = 120`
# (src/mesh-session.mjs:34) via `resolveSessionTtlSeconds` (`:42-48`). No scenario
# invents a threshold; a scenario that needs a short TTL sets
# `config.mesh.session.ttlSeconds` and says so.

@executable @cli @work @distribution
Feature: a session that expires leaves disk — swept by the owning node, at the write seam, under the one shared liveness predicate
  In order that a crashed assistant, a killed Codex session that can never fire an end event, and a machine powered off mid-session all converge on the same outcome instead of accumulating files nobody ever removes
  a TTL-expired session record is unlinked by the node that owns it, on its next session start or ping, using the same liveness predicate every other surface uses — and a failure to reap never fails the session write

  Background:
    Given an isolated global mesh store (a fresh `AOF_GLOBAL_HOME` temp dir) and a real aof workspace on disk
    And the session TTL resolved from config, with an injected clock so "expired" is a fact of the fixture and not of wall time
    And "reaped" means the record file is gone from the sessions directory

  # THE HEADLINE. One real ping is enough — no daemon, no schedule.
  Scenario: an expired record is gone from disk after one real session ping
    Given a planted session record for THIS node whose `lastPingAt` is older than the TTL
    And a planted session record for THIS node whose `lastPingAt` is inside the TTL
    When I run `aof session ping` for some other session on this node
    Then the expired record's file is gone from disk
    And the in-TTL record's file is still there, byte-identical to before the command ran
    And the ping's own record was written normally — the sweep is a side-effect of the write, never a replacement for it

  # THE MIGRATION, AND IT IS THE WHOLE OF IT (ADR-002/ADR-006). A pre-m48 leaf is a
  # 3-part name written by a build that had no session id. There is no migration code
  # because it expires like anything else — but "no migration code" is a claim, and
  # this row is what turns it into a fact. The live soak on this machine has real
  # records of exactly this shape.
  Scenario: a pre-m48 three-part record is reaped by the same sweep — this is the migration
    Given a planted record whose file name is the OLD three-part form (node, workspace, assistant — no session segment) and whose `lastPingAt` is older than the TTL
    When I run `aof session ping` on this node
    Then that three-part file is gone from disk
    And no new file was created to replace it, and nothing was rewritten in place — an old record is removed, never upgraded
    And a pre-m48 three-part record that is still INSIDE the TTL survives untouched and still reads as a live, anonymous session
    # The survival clause matters as much as the removal: a deploy must not blind a
    # node to the sessions that were live across it.

  # OWNERSHIP. Session records live in the node's own global mesh home; a sweep that
  # reached past its own node would be a second authority over another machine's
  # liveness (ADR-003, ADR-006).
  Scenario: the sweep touches only this node's records
    Given a planted EXPIRED record for THIS node
    And a planted EXPIRED record whose node segment is a DIFFERENT node's id
    When I run `aof session ping` on this node
    Then this node's expired record is gone
    And the other node's expired record is still on disk, byte-identical — untouched, however stale it looks from here

  # THE BOUNDARY. `isStale` is a STRICT `>` (the documented edge, reused verbatim by
  # `isSessionLive` at :195-197). A record AT the TTL is still live. The reap must
  # agree with every other reader — that is the entire reason the predicate is
  # imported rather than re-expressed.
  Scenario Outline: the reap and every other reader agree about the same record, at the edge
    Given a planted record whose age is <the age>
    When I run `aof session ping` on this node
    Then the record is <on disk?>
    And the real `readLiveSessions` at that same instant reports it <live?> — the two never disagree about one record

    Examples:
      | case                          | the age                  | on disk?      | live? |
      | comfortably live              | half the TTL             | still there   | live      |
      | exactly at the threshold      | exactly the TTL          | still there   | live      |
      | one millisecond past          | the TTL plus 1ms         | gone          | not live  |
      | long dead                     | ten times the TTL        | gone          | not live  |
    # Row 2 is the one a hand-rolled `>=` fails while passing every other row, which is
    # why it is here and why the predicate is imported.

  # ONE CLOCK PER INVOCATION (ADR-006). A record must not be judged live by the read
  # and dead by the reap inside one command.
  Scenario: the reap and the read in one invocation share one instant
    Given a planted record whose age at the injected instant is exactly the TTL — the live edge
    When I run one `aof session ping` with that instant injected
    Then the record is still on disk and still reported live by the read in that same invocation
    And no scenario in this feature relies on wall-clock time passing during the test

  # FAILURE ISOLATION. A session `start`/`ping` must not fail because a stale
  # neighbour could not be deleted — the sweep is opportunistic, the write is not.
  Scenario: a reap that cannot delete never fails the session write
    Given an expired record whose removal will fail (a locked or unlinkable file, or an injected failing unlink)
    When I run `aof session ping` on this node
    Then the command SUCCEEDS with its normal envelope and exit code
    And the ping's own record was written correctly
    And the failure was reported through the coded-degrade channel rather than swallowed silently or thrown
    # FEASIBILITY, flagged for the build rather than assumed: whether an injectable
    # failing-unlink seam exists today is unverified at refine time. On Windows a real
    # open handle is the natural way to make an unlink fail; if neither is workable,
    # this scenario needs an injected `unlink` seam on `reapExpiredSessions`'s options —
    # which is a small, honest addition, NOT a reason to drop the scenario. The
    # degrade-channel clause follows the m42 item-3 discipline every other silent catch
    # in this module already follows (`reportDegrade`).

  # IDEMPOTENCE + THE ACCEPTED RESIDUAL (ADR-006, stated rather than hidden).
  Scenario: reaping twice is a no-op, and a quiet machine keeps its orphans
    Given a sessions directory that has just been swept
    When I run `aof session ping` again at the same injected instant
    Then nothing further is removed and the command succeeds
    And a node on which NO further session ever starts or pings still holds its expired records — bounded at one file per dead session, invisible to every live read, and harmless
    # That residual is the deliberate trade ADR-006 names: buying it away would cost a
    # daemon, a schedule, or a read-that-writes — each a worse structure than the leak.
