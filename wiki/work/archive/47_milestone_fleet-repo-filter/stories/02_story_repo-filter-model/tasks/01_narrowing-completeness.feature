<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 47/02, ADR-004: THE COMPLETENESS RULE. The narrowing covers EVERY
# collection on the payload that carries workspace identity, and a collection that
# carries none is DECLARED machine-wide rather than silently passed through. This task
# varies THE PAYLOAD and holds the URL constant — the `?repo=` contract that produces the
# value is task 00, and what `scope` and `repo` mean together is task 02.
#
# WHY THIS IS THE STORY'S CENTRAL CLAIM. SPEC states the rule and states no mechanism:
# *"A filter that narrows one region and not another is worse than none."* The failure it
# describes is invisible from the inside — a region rendering the whole mesh underneath a
# chip that says the view is filtered — and it does not happen in the milestone where
# someone is thinking about it. It happens in the next one. `filterToWorkspace` SPREADS
# its input (`scope.mjs:164`, `{ ...status }`), so a collection added to the payload is
# silently exempt on the day it is added. ADR-004's four clauses are the rule that closes
# that, and the rows below are the rule made checkable one collection at a time.
#
# LITMUS: every Then is confirmable by an outsider without reading source. This module is
# PURE, so the black-box channel is `node:test` importing `ui/src/fleet/scope.mjs`,
# handing `filterToWorkspace` a payload literal, and asserting on the RETURNED VALUE — no
# bundler, no DOM, no React harness (this repo has none). Every Then below is "narrow
# this payload by this id, read these rows back". The payload literals are the shape
# `shapeGlobalStatus` (`src/global-mesh-query.mjs:269-291`) actually emits, read at
# source 2026-08-10; no field below is invented.
#
# THE ONE EXPORT THIS TASK READS, spelled as ADR-001 §Decision row 3, ADR-002 and
# `test/arch/acd-fleet-filter-every-region.test.mjs:39` spell it:
#
#     filterToWorkspace(status, workspaceId) → status   — the ONE production narrowing
#
# It EXISTS TODAY (`scope.mjs:162`), is TYPED today (`scope.d.mts:44`) and is PINNED
# today (`test/fleet-scope.test.mjs:184,199`) — and `Fleet.tsx` has never imported it.
# ADR-002 promotes it from a tested orphan to the one production narrowing; this task is
# where the contract it will then honour is written down in full. Two of its clauses are
# NOT satisfied by the shipped implementation and are the actual build here: clause 3's
# diagnostics ruling (scenario 4) and the degenerate-input completeness of scenario 6.
#
# NOT ASSERTED HERE — three claims owned elsewhere:
#   (a) THE COMPLETENESS RATCHET — that an array-typed collection ADDED to
#       `GlobalMeshStatus` in `ui/src/fleet/api.ts` must be narrowed or placed on the
#       declared machine-wide list. That is a structural sweep over the wire TYPE and it
#       is `test/arch/acd-fleet-filter-every-region.test.mjs`, assertion 1. It is what
#       makes this rule survive milestones 49 and 50; the scenarios below are what make
#       it true TODAY, for the collections that exist.
#   (b) THE SEAM — that the narrowing is applied ONCE, inside `Fleet()`, BEFORE
#       `pageState` and BEFORE `<GlobalScopeView>`, and never inside a region. Same file,
#       assertion 3, EXPECTED RED until story 47/03 lands. It is a source read and it is
#       47/03's build, not this story's: this module cannot know how many times it is
#       called.
#   (c) THAT THE FILTER NEVER REACHES THE WIRE — `acd-fleet-filter-read-only`, three
#       assertions, green on arrival.
#
# DELIBERATE OVERLAP, NAMED RATHER THAN HIDDEN. Assertion 2 of
# `acd-fleet-filter-every-region` is not a structural sweep at all — it is a BEHAVIOURAL
# lane living in an arch file: it builds a payload literal, calls `filterToWorkspace` and
# asserts on returned rows (generic rule 1, the node membership list, non-mutation, the
# absent-filter no-op, a null payload, and the unknown-filter empty). Every one of those
# is a task-feature claim, and the scenarios below are its contract; where the two ever
# differ, THIS FILE IS THE CONTRACT and that assertion is a sample of it.
#
#   FINDING F-47-02-QA-2 (design-gap, low) — A BEHAVIOURAL LANE INSIDE A FITNESS FUNCTION
#   WILL BE READ AS STRUCTURE by the next author, and will be the half that gets "fixed"
#   when the two disagree. The live evidence is in that file already: its fixture carries
#   a `diagnostics` block and asserts NOTHING about it, which is precisely the clause
#   ADR-004 rules on at length (scenario 4 below) — so the detector that reads as "every
#   region is covered" is silent on the one COMPOUND collection in the milestone, the one
#   whose completeness took a ruling of its own to settle (F-47-02-QA-3, now closed). QA
#   recommends the behavioural half move here at build time, leaving the arch file the
#   two claims only it can make (the wire-type ratchet and the seam). Not a blocker: the
#   duplication is correct today and costs a second failure, not a wrong one.
#
# FEASIBILITY — checked at source 2026-08-10, at `d71d508`, and every claim below was
# executed in plain node while authoring:
#   1. `filterToWorkspace` narrows `workspaces`, `items` and `nodes` today and spreads
#      everything else. Scenarios 1, 2, 3 and 5 are GREEN on the shipped implementation;
#      they are written anyway because they are the contract the promotion in ADR-002
#      makes load-bearing for the first time, and because rows in them (row identity,
#      row order, the membership boundary cases) are not pinned anywhere today.
#   2. Scenario 4 is RED and is the build. Measured: `filterToWorkspace(status, "alpha")
#      .diagnostics === status.diagnostics` — the block rides through by reference, so
#      `diagnosticsSummary` reports the WHOLE MESH's skipped-workspace and projection-
#      error counts under a filter. That is the defect, settled: see the ruling at that
#      scenario.
#   3. Scenario 6 is RED in one row: a payload whose `nodes` rows carry no `workspaceIds`
#      key already answers `[]` without throwing (measured), but a payload MISSING a
#      collection answers with that key ADDED as `[]` — so the narrowed payload is not
#      key-for-key the payload it was handed. That is stated as an expectation below
#      rather than asserted away, because a build that "fixed" it by omitting the key
#      would hand a region `undefined` where it expects an array.
#   4. `stalenessSeconds` IS on the wire (`global-mesh-query.mjs:278`) and is NOT declared
#      on `GlobalMeshStatus` in `api.ts` — deliberately, per that type's own comment. It
#      is a scalar, so ADR-004 clause 4 covers it and scenario 3 pins it. Recorded here
#      because it means the completeness RATCHET reads a type that is already measurably
#      behind its own wire: see FINDING F-47-02-QA-4 in the refine report.
#   5. NOT A SCENARIO, BUT A CONSTRAINT THIS TASK HANDS TO 47/03: DESIGN's per-region
#      `<n> of <N>` summaries need the UN-narrowed total, and `filterToWorkspace` returns
#      only the narrowed payload. The seam must therefore keep BOTH payloads in hand.
#      Nothing in this task changes to accommodate it — it is named so 47/03 does not
#      discover it late and reach for a second narrowing call to recover `N`.

@ui @work @work-stream @distribution
Feature: the narrowing covers every collection that carries workspace identity, and any collection that carries none is declared machine-wide rather than silently passed through
  In order that a page saying it is filtered to one repo is telling the truth about every region on it — and that the region milestone 49 adds is narrowed on the day it is added, by an author who never read this rule
  the one narrowing must filter every collection whose rows carry a workspace id, keep a node by MEMBERSHIP, leave the response's own scalars alone, and answer for a collection carrying no workspace identity by a stated rule rather than by omission

  Background:
    Given `ui/src/fleet/scope.mjs` imported directly by `node:test` under plain node — no bundler, no DOM, no React
    And a global-shaped payload of the shape `shapeGlobalStatus` emits: `scope`, `workspaceId`, `stalenessSeconds`, `workspaces[]`, `items[]`, `nodes[]` and a `diagnostics` block
    And that payload carries TWO published workspaces, "alpha" and "beta", each with a milestone row and story rows, and a node roster spanning both
    And every Then below is read off the value `filterToWorkspace` returned — never off a source file, and never off a rendered component

  # Headline 1, clause 1: a collection whose rows carry a workspace identity is narrowed
  # by it. The rows are one per COLLECTION rather than one per region, because the rule
  # is about the payload and the regions are downstream of it.
  @executable
  Scenario Outline: every collection whose rows carry a workspace identity narrows to the filtered repo
    When I narrow the payload to "alpha"
    Then collection <collection> carries exactly <kept>
    And it carries none of <dropped>
    And the surviving rows appear in the payload's own order — the narrowing SELECTS rows, it never sorts, dedupes or rebuilds them

    Examples:
      | case                                                                       | collection                    | kept                                | dropped                        |
      | the workspaces summary — rows carry `workspaceId` (clause 1)               | `workspaces`                  | the alpha workspace row             | the beta workspace row         |
      | the milestone rows the fleet's card list projects from                     | `items` (type "milestone")    | alpha's milestone                   | beta's milestone               |
      | the STORY rows in that same array, which the cards' story dots count       | `items` (type "story")        | alpha's stories                     | beta's stories                 |
      | the TASK rows in that same array — the stream is complete, and stays so    | `items` (type "task")         | alpha's tasks                       | beta's tasks                   |
      | the node roster — rows carry a `workspaceIds` membership list (clause 2)   | `nodes`                       | the nodes that are members of alpha | the nodes that are not         |
    # ROWS 2, 3 AND 4 ARE ONE ARRAY, and they are listed separately because a build that
    # narrowed only what it could see rendered would filter milestone rows and forget the
    # rest — and `milestoneCardModels` (`scope.mjs:129`) reads its stories out of the
    # SAME array, so a half-narrowed `items` produces a card for alpha carrying beta's
    # story counts. That is the "narrows one region and not another" defect wearing a
    # disguise: one region, two workspaces, one card.
    #
    # THE ORDER CLAUSE is not decoration. DESIGN's picker renders "one row per workspace
    # on the payload, IN THE PAYLOAD'S OWN ORDER" (§Surface 1, S1-C) and every region
    # renders the array it is handed, so a narrowing that reordered would silently
    # re-rank the page for no stated reason.

  # Headline 1 continued: narrowing SELECTS rows; it does not rebuild them. Every fact
  # attached to a row upstream must arrive at the region intact, or the filter becomes a
  # data-loss step that only shows up on the cards the operator filtered TO.
  @executable
  Scenario: a surviving row is the same row, with every attached fact intact
    Given alpha's milestone row carries an `assignment` attachment, the cache-provenance pair `reportedBy` / `syncedAt`, and a `parent`
    And an alpha node row carries a `presence` record, an `assignments` array and a `fabric` block
    When I narrow the payload to "alpha"
    Then the surviving milestone row still carries its `assignment`, its `reportedBy`, its `syncedAt` and its `parent`, with the same values
    And the surviving node row still carries its `presence`, its `assignments` and its `fabric`, with the same values
    And no surviving row has gained a key it did not have
    And `milestoneCardModels` over the narrowed `items` yields the same card for alpha — same story total, same done/in-review/blocked tallies — as it yields over the un-narrowed payload
    And `nodePanelFacts` over a surviving node yields the same facts it yields over that node before the filter
    # THE LAST TWO THENS ARE THE ONES AN OPERATOR WOULD NOTICE. The assignment chip, the
    # story dots, the terminal control and the current-work line are all derived from
    # attachments on the row; a narrowing that projected rows down to their identity
    # would empty every card on the page it was supposed to be showing. Asserting through
    # the two existing projections rather than field-by-field is deliberate — they are
    # what the surface actually calls, so the claim survives a field being added later.

  # Headline 2, clause 2: MEMBERSHIP. A node is in the filtered repo if it is a member of
  # it — and this DIVERGES from the server's `?scope=local`, deliberately, permanently,
  # and with both behaviours pinned by tests so neither is "fixed" into the other.
  @executable
  Scenario Outline: a node is kept by MEMBERSHIP, and liveness is never part of the question
    When I narrow the payload to "alpha"
    Then the node <node> is <verdict>

    Examples:
      | case                                                                     | node                                              | verdict |
      | a member of alpha only                                                   | `workspaceIds: ["alpha"]`                         | kept    |
      | a member of alpha AND beta — membership, not exclusivity                 | `workspaceIds: ["alpha", "beta"]`                 | kept    |
      | a member of beta only                                                    | `workspaceIds: ["beta"]`                          | dropped |
      | a node that is a member of nothing — an enrolled machine that has published no workspace | `workspaceIds: []`                | dropped |
      | a node row carrying NO `workspaceIds` key at all — an older descriptor    | no `workspaceIds` key                             | dropped |
      | a STALE member — freshness is not membership                             | `workspaceIds: ["alpha"]`, `freshness: "stale"`   | kept    |
      | a NEVER-BEAT member, carrying no `presence` key                          | `workspaceIds: ["alpha"]`, no `presence`          | kept    |
      | a member whose id differs from alpha's only in case                      | `workspaceIds: ["ALPHA"]`                         | dropped |
    # ROWS 6 AND 7 ARE THE ROWS THAT KEEP THIS A FILTER AND NOT A HEALTH CHECK. The
    # roster's job is to say which machines are working on this repo; a stale or
    # never-beat machine that IS a member is still an answer to that question, and
    # dropping it would hide exactly the machine an operator is looking for when they
    # filter. It is the same discipline `assignableNodeOptions` already states in its own
    # header ("a stale-but-known node stays an option ... the verb's node-known gate keys
    # on a global_nodes row, NOT on liveness").
    #
    # THE DIVERGENCE FROM `?scope=local`, stated here because this is the file a later
    # author will read when they try to unify the two. `src/global-node-registry.mjs:
    # 170-172` says in terms that the roster "is never workspace-filtered (a workspaceId
    # scopes WORK ITEMS, not the node roster)", and
    # `acd-mesh-ui-local-filter-preserves-status` pins that behaviourally — BOTH node-a
    # and node-b surface under `--local`. ADR-004 rule 2 rules the OPPOSITE for the repo
    # filter and says why: "local" asks about the DAEMON's workspace and a roster is a
    # machine fact, while a repo filter asks *which machines are working on this repo*,
    # and answering with every machine is not a filter. TWO NARROWINGS, ONE STORE COLUMN,
    # TWO CORRECT ANSWERS. Neither test may be changed to agree with the other.

  # Headline 3, clause 4: SCALARS ARE NOT COLLECTIONS. They describe the response, not its
  # rows, and a narrowing that touched them would make the payload lie about how it was
  # produced.
  @executable
  Scenario Outline: the response's own scalars ride through unchanged
    When I narrow the payload to "alpha"
    Then <scalar> on the answer is byte-identical to <scalar> on the payload

    Examples:
      | case                                                                        | scalar               |
      | which SCOPE produced this payload — the client never rewrites the server's answer | `scope`         |
      | the workspace the SERVER narrowed to, when it narrowed (`?scope=local`)     | `workspaceId`        |
      | the cache-freshness WINDOW the whole payload is read against                | `stalenessSeconds`   |
    # `scope` MATTERS MOST. Under `?scope=local` the payload arrives labelled "local", and
    # a client-side repo filter must not relabel it — the empty state and the banner both
    # name every narrowing in force (ADR-005/ADR-007), and they read that label. A
    # narrowing that overwrote it would make the page unable to say which two narrowings
    # produced the nothing it is showing, which is the single failure SPEC names.
    #
    # `stalenessSeconds` IS ON THE WIRE AND NOT ON THE TYPE (`global-mesh-query.mjs:278`
    # emits it; `api.ts`'s `GlobalMeshStatus` deliberately does not spell it). It is
    # pinned here because it is the scalar most likely to be lost by a build that
    # rebuilt the envelope from the type instead of spreading the payload.

  # Headline 4, clause 3: A COLLECTION CARRYING NO WORKSPACE IDENTITY IS DECLARED, NEVER
  # SILENTLY PASSED THROUGH. `diagnostics` is the only case-3 candidate on today's
  # payload, and it is a COMPOUND — which is why ADR-004 rules on it explicitly rather
  # than leaving it to the story.
  #
  # F-47-02-QA-3 IS CLOSED — RULED FOR ADR-004, AND DESIGN IS AMENDED TO MATCH. QA raised
  # this block as a contradiction between two documents dated the same day; the ruling is
  # that the COMPOUND reading stands, and DESIGN §Surface 2 now carries it rather than the
  # blanket exemption it carried before. The two documents now say one thing:
  #
  #   ADR-004: "`diagnostics` is ruled here rather than left to the story ... It is a
  #   compound: `skippedWorkspaces[]` and `projectionErrors[]` carry `workspaceId` and
  #   are therefore CASE 1 — NARROWED; `projectedAt`, `databasePath` and
  #   `descriptorErrors[]` ... are CASE 3(a) — machine-wide and declared ... The region
  #   says WHICH OF ITS NUMBERS ARE FILTERED."
  #
  #   DESIGN §Surface 2, "R4's strip, fact by fact (ADR-004's completeness rule applied to
  #   the one compound region)": `Projection: updated <t>` UNCHANGED (case 3(a)), `<n> of
  #   <N> disabled/skipped workspaces` NARROWED (case 1), `<N> descriptor errors`
  #   UNCHANGED (case 3(a)) — under the header summary `projection health is mesh-wide ·
  #   skipped workspaces narrowed`, and the rule that "Diagnostics is the one PARTIAL
  #   exemption, and it says which half is which ... an exemption stated more broadly than
  #   it is true is that same defect wearing a label."
  #
  # THIS SCENARIO IS THE DATA HALF OF THAT ONE RULING, and it is no longer hedged. The
  # copy half — which of the strip's numbers wears `<n> of <N>` — is DESIGN's table above
  # and is built and judged in story 47/03. `projectionErrors` is narrowed here and is not
  # in DESIGN's strip because the strip does not render it; a count nobody displays is
  # still a count `diagnosticsSummary` computes, and it is narrowed by the same clause for
  # the same reason.
  @executable
  Scenario Outline: the diagnostics compound is narrowed where its rows carry a workspace, and machine-wide where they do not
    Given the diagnostics block carries a skipped-workspace row for alpha and one for beta, a projection-error row for alpha and one for beta, and a descriptor-error row whose only identity is a file path
    When I narrow the payload to "alpha"
    Then <member> is <verdict>
    And the `diagnostics` block itself is still present on the answer — a filtered view is never left unable to say whether its own data is fresh
    And `diagnosticsSummary` over the narrowed payload reports the narrowed counts for skipped workspaces and projection errors, and the un-narrowed count for descriptor errors

    Examples:
      | case                                                                     | member                             | verdict                                            |
      | rows carry `workspaceId` — clause 1                                      | `diagnostics.skippedWorkspaces`    | narrowed: alpha's row survives, beta's does not     |
      | rows carry `workspaceId` — clause 1                                      | `diagnostics.projectionErrors`     | narrowed: alpha's row survives, beta's does not     |
      | rows carry a descriptor `path`, never a workspace — clause 3(a)          | `diagnostics.descriptorErrors`     | machine-wide: every row survives, unchanged         |
      | a scalar describing the projection's own freshness                       | `diagnostics.projectedAt`          | machine-wide: byte-identical                       |
      | a scalar describing the store                                            | `diagnostics.databasePath`         | machine-wide: byte-identical                       |
      | a scalar describing when this response was generated                     | `diagnostics.generatedAt`          | machine-wide: byte-identical                       |
    # MEASURED TODAY: `filterToWorkspace(status, "alpha").diagnostics === status
    # .diagnostics` — the block rides through BY REFERENCE, so `diagnosticsSummary`
    # currently reports the whole mesh's counts under a filter. Rows 1 and 2 are
    # therefore RED and are the build; rows 3–6 are green today and are pinned so that a
    # build satisfying rows 1 and 2 cannot over-reach and narrow the rest — which is the
    # half DESIGN's amended R4 strip depends on, since `Projection: updated <t>` and
    # `<N> descriptor errors` render WITHOUT an `<n> of <N>` precisely because they did
    # not move.
    #
    # THE `descriptorErrors` ROW IS NOT AN EXEMPTION-BY-CONVENIENCE. Its rows carry a
    # descriptor `path` and an `id` — a NODE identity, not a workspace one — so there is
    # no per-repo meaning to narrow by. ADR-004's own answer to that shape, stated for
    # `boards`, is that the fix belongs at the PRODUCER if the fact is genuinely
    # per-workspace; nobody claims it is here.

  # Headline 5: an UNKNOWN filter narrows to ZERO. It is never a silent fallback to the
  # whole mesh, because that renders every region under a chip saying the view is
  # filtered — "a lie the operator cannot see" (ADR-003).
  @executable
  Scenario Outline: a filter naming nothing on the payload narrows every collection to zero
    When I narrow the payload to <value>
    Then `workspaces`, `items` and `nodes` are all empty
    And the payload's scalars still ride through unchanged, so the page still knows which scope produced it
    And `isEmptyStatus` of the answer is true
    And the payload handed in is unchanged — every collection still carries every row it carried

    Examples:
      | case                                                                          | value                     |
      | an id from another mesh, or a workspace that has been deleted                 | "no-such-workspace"       |
      | the workspace's NAME instead of its id — why ADR-003 refuses the mutable name | "lark-guard"              |
      | the workspace's `projectRoot` — why ADR-003 refuses the machine-local path    | "C:/Source/umami/aof"     |
      | a real id differing only in case — ids are compared exactly                   | "ALPHA"                   |
      | a real id with a trailing character, as a truncated paste produces            | "alphax"                  |
    # ROWS 2 AND 3 ARE ADR-003's TWO REJECTED IDENTITIES, made behavioural. They are what
    # a well-meaning operator types when they hand-edit the URL, and what a well-meaning
    # BUILD would accept if it matched on anything but `workspaceId`. Both must reach the
    # unknown state, because a filter that resolved a NAME would break the moment someone
    # renamed their project — silently, and at a distance.
    #
    # `isEmptyStatus` STAYING TRUE HERE IS THE HANDOFF TO TASK 02, and it is only HALF
    # the handoff. An unknown filter and an idle mesh are the same emptiness — that is
    # DG-47-3's stated trap, and what distinguishes them is the copy. The sharper half is
    # produced by the row ABOVE this scenario rather than by it: narrowing to a KNOWN but
    # QUIET workspace leaves that workspace's OWN row standing, so the narrowed payload is
    # `{ workspaces: [one row], items: [], nodes: [] }` and `isEmptyStatus` answers FALSE
    # (measured). The page then renders POPULATED where DG-47-3 requires
    # `empty (filtered)`. That output is this task's; the state and the sentence it is
    # owed are pinned in task 02, scenario 6.

  # Totality. The narrowing runs on the render path, on every poll tick, over whatever
  # payload is current — including the ones that have not arrived, the ones a partial
  # wire produced, and the boundary value task 00 exists to keep away from it.
  @executable
  Scenario Outline: the degenerate inputs answer rather than throw, and none of them half-applies
    When I call `filterToWorkspace(<payload>, <filter>)`
    Then the answer is <answer>
    And the call does not throw
    And the payload handed in is deep-equal to what it was before the call — the poll loop re-narrows the same object shape on every tick, and a mutating narrowing would corrupt the payload it was handed

    Examples:
      | case                                                                          | payload                          | filter        | answer                                                             |
      | NO FILTER — a total no-op, and the SAME object back                           | the two-workspace payload        | null          | the payload itself, unchanged                                      |
      | an undefined filter — the same no-op                                          | the two-workspace payload        | undefined     | the payload itself, unchanged                                      |
      | THE BOUNDARY VALUE TASK 00 EXISTS TO PREVENT                                  | the two-workspace payload        | ""            | every collection EMPTY — `""` is a filter nothing matches, not "no filter" |
      | no payload yet — before the first load lands                                  | null                             | "alpha"       | null                                                               |
      | an undefined payload                                                          | undefined                        | "alpha"       | undefined                                                          |
      | a partial wire missing `items` and `nodes` entirely                           | `{ scope, workspaces }`          | "alpha"       | the narrowed workspaces, plus `items` and `nodes` present as EMPTY ARRAYS |
      | a payload whose node rows carry no `workspaceIds`                             | nodes without `workspaceIds`     | "alpha"       | `nodes` empty                                                      |
      | a payload carrying an EXTRA collection this module has never heard of         | plus `widgets: [...]`            | "alpha"       | `widgets` rides through UNCHANGED — and that is the gap the arch test's ratchet exists to catch before it ships |
    # ROW 3 IS THE CROSS-TASK LOCK. `""` is not a no-op and must never become one: the
    # no-op branch tests `workspaceId == null` (measured — `""` does not satisfy it), so
    # a payload narrowed by `""` empties every region. The correct fix is at the READ
    # side, where task 00 pins `repoFromSearch` to answer `null` and never `""`. Making
    # THIS function treat `""` as absent would be the second copy of one rule, in the
    # module ADR-001 exists to keep single — and it would mask a genuinely broken caller.
    #
    # ROW 6 IS AN EXPECTATION, NOT AN ACCIDENT (measured: a payload carrying only
    # `scope` and `workspaces` comes back carrying `items: []` and `nodes: []`). The
    # answer therefore has MORE keys than the input. That is the right behaviour — every
    # region is handed an array rather than `undefined` — and it is stated so a build
    # does not "tidy" it into omitting the key and hand a region nothing to map over.
    #
    # ROW 8 IS THE HONEST STATEMENT OF THIS FUNCTION'S LIMIT, and it is why the ratchet
    # in `acd-fleet-filter-every-region` is not redundant with this file. A collection
    # nobody narrowed rides through, silently, and no BEHAVIOURAL test can know it should
    # not have — the failure is only visible against the wire TYPE. Structure catches
    # what behaviour cannot see; that is the division of labour, stated at the one row
    # where it bites.
