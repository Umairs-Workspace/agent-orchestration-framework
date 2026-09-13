<!-- aof-generated: refine (Three Amigos — PO headline Scenarios, QA Examples + litmus) -->

# Task feature — STORY 47/02, ADR-005 + ADR-007: COMPOSITION AND COPY. `scope` and `repo`
# are DIFFERENT QUESTIONS and they compose by INTERSECTION — neither overrides the other
# — and each distinct way of arriving at nothing gets its own true sentence. This task
# varies THE TWO NARROWINGS TOGETHER: the URL contract that carries them is task 00, and
# the completeness of the narrowing itself is task 01.
#
# WHY THE COMPOSITION NEEDED A DECISION AT ALL. Two narrowings that have never been
# composed will be composed by whoever writes the first `if` that needs them both, and
# the two tempting answers are both wrong in a way an operator cannot see. "Last one
# wins" produces a URL carrying a parameter that does nothing. "Repo wins over scope"
# produces the same thing with a rule written in one ADR and visible nowhere on screen.
# ADR-005 rules INTERSECTION, and names the consequence rather than leaving it to be
# discovered: `?scope=local&repo=<a different workspace>` renders EMPTY, AND THAT IS
# CORRECT — the operator asked for the daemon's workspace AND a different repo.
#
# WHY THE COPY IS IN THE SAME TASK AS THE COMPOSITION, and not with the surface. Because
# the empty state is the only place the composition is VISIBLE, and DG-47-3 is exactly
# the failure of splitting them: `pageState` names four states and `isEmptyStatus` reads
# a payload's arrays, so filtering a populated payload down to a workspace it does not
# carry renders `empty`, whose copy says *"No mesh-enabled workspaces have published
# yet"* — a FALSE STATEMENT ABOUT THE MESH, produced by the operator's own filter, and
# precisely the outcome SPEC forbids. The distinction cannot live in the emptiness
# predicate (it is filter-agnostic by design and stays so); it lives in the copy's
# inputs. That is one function, and it is here.
#
# LITMUS: every Then is confirmable by an outsider without reading source. This module is
# PURE, so the black-box channel is `node:test` importing `ui/src/fleet/scope.mjs` and
# asserting on RETURNED VALUES — no bundler, no DOM, no React harness (this repo has
# none). Every Then below is "call this exported function with these narrowings, read
# this returned value". Copy is asserted as STRINGS, which is the strongest black-box
# statement available about a sentence and the reason the copy is a pure function at all.
#
# THE EXPORTS THIS TASK READS. Four already exist and are unchanged in name:
#
#     filterToWorkspace(status, workspaceId)   — the ONE narrowing (task 01)
#     isEmptyStatus(status)                    — the shipped emptiness predicate; whether
#                                                the FILTERED question is answered by
#                                                extending it or beside it is the build's
#                                                call — see scenario 6
#     pageState({ loading, error, status })    — the four page states, unchanged
#     scopeFromSearch / repoFromSearch / withRepoParam   — the URL pair (task 00)
#
# and one CHANGES SHAPE, which is the one thing in this story nobody has pinned:
#
#     emptyStateCopy(narrowings) → { heading, body }
#       narrowings = {
#         scope,     "global" | "local" — the scope that produced the payload, read off
#                    the payload's own `scope` scalar (never re-derived from the URL)
#         repo,      the RAW requested value, or null when no filter is in force
#         resolved,  the matching workspace's display NAME when the payload carries the
#                    id; null when a payload HAS landed and does not carry it; ABSENT
#                    when no payload has landed yet — DG-47-3's "not yet known"
#       }
#
# THAT RECORD IS QA'S PROPOSAL, NOT AN ADR'S, exactly as m45/01's surface names were.
# ADR-007 fixes that `emptyStateCopy` "gains the filtered cases rather than acquiring a
# sibling" and that there are "four distinct copies"; DESIGN fixes the four headings and
# three of the bodies. Neither fixes the argument or the return shape, and a Then cannot
# be confirmed against an unnamed one. WHAT IS NOT NEGOTIABLE WHATEVER THE SPELLING:
# four cases; heading and body pairwise distinct; the two UNFILTERED bodies byte-
# identical to today's two strings and the two unfiltered headings byte-identical to the
# ones `EmptyFleet` renders today; every filtered copy naming the value the operator
# typed; ONE home in `scope.mjs`; and NO filtered heading left as inline JSX in
# `Fleet.tsx` — which is the very thing DG-47-1 is re-homing away from.
#
# F-47-02-QA-5 IS CLOSED — RULED AS QA RECOMMENDED, and the record is here because the
# shape it settles is the one every scenario below reads. What was measured at `d71d508`:
# `scope.mjs:104` returns the BODY only, and the HEADING is inline JSX at
# `Fleet.tsx:1523-1525` (`scope === "local" ? "No nodes in the group yet" : "No
# mesh-enabled workspaces yet"`), consumed at `Fleet.tsx:1518` — so DESIGN's filtered
# states, which pin a HEADING and a BODY each, could not be expressed without changing
# what the function returns. THE RULING:
#   - the `{ heading, body }` shape above is ACCEPTED, for all four cases;
#   - **story 47/03 makes the one-line `Fleet.tsx` change** that consumes it, as part of
#     the empty-state branch DG-47-1 has it rewriting anyway. **47/02 still touches only
#     `ui/src/fleet/scope.mjs` and `ui/src/fleet/scope.d.mts`**, so STORY.md's "zero blast
#     radius … imported by no new caller" and its parallel-eligibility with 47/01 both
#     stand as written;
#   - the two lanes in `test/fleet-scope.test.mjs` that read the returned value as a
#     string read `.body` instead. THE STRINGS THEY ASSERT ON ARE UNCHANGED — that is
#     amending a test, not weakening one, and scenarios 4 and 5 below hold it to that.
# A second export beside `emptyStateCopy` stays foreclosed (ADR-007, in terms), as does a
# polymorphic return: a function with two return types would leave the heading inline for
# the unfiltered cases and re-homed for the filtered ones, i.e. two homes for one fact.
#
# NOT ASSERTED HERE — five claims with their owners:
#   (a) that the empty state and the chip are RENDERED, hoisted above the state ternary,
#       present in all four page states, and that the recovery reads `Show all repos` —
#       DG-47-1 and DESIGN §Surface 2, built by story 47/03 and judged by its `@uat`
#       design-conformance lane. This task fixes WHAT THE SENTENCE SAYS; where it
#       appears and what it looks like is not a claim a pure function can make.
#   (b) that the scope control and the filter are mounted in every page state —
#       `acd-mesh-ui-scope-visible` (m34/ADR-006), which gains a second subject in 47/03
#       and must stay green.
#   (c) the narrowing seam's placement (one call, before `pageState`, before the region
#       fan-out) — `test/arch/acd-fleet-filter-every-region.test.mjs` assertion 3.
#   (d) that `src/` is not edited and `?scope=`'s server behaviour is untouched —
#       `acd-fleet-filter-read-only`, plus `acd-mesh-ui-local-filter-preserves-status`
#       and `mesh-ui-read-only-contract`, all of which must stay green WITHOUT BEING
#       TOUCHED. That is ADR-002's invariant and the milestone's cheapest promise to keep.
#   (e) `scope=local`'s RETIREMENT. ADR-005 states a measurable three-part condition and
#       this milestone does not act on it. Nothing below asserts anything about it.
#
# FEASIBILITY — checked at source 2026-08-10, at `d71d508`, everything executed in plain
# node while authoring:
#   1. The two existing strings were read back from the running module, not transcribed
#      from a document, and are quoted verbatim in scenario 4.
#   2. `isEmptyStatus` already answers true for a payload narrowed to an UNKNOWN value
#      (measured), and FALSE for one narrowed to a known-but-quiet workspace, whose own
#      `workspaces` row survives the narrowing — so scenario 6's second trap is not
#      only real today, it is the one that renders a page that looks like it is working.
#   3. The composition itself needs no new mechanism: the server applies `scope`, the
#      client applies `repo` to whatever it was served, and "intersection" is what those
#      two steps already are. Scenarios 1 and 2 are therefore about proving the ABSENCE
#      of a precedence rule, which is why row 5 of scenario 1 (a `--local` server with no
#      `?scope=` in the URL at all) matters more than it looks.
#   4. The multi-narrowing BODY is the one string DESIGN does not pin — it pins the
#      heading exemplar only. Scenario 3 asserts the distinguishing PROPERTY for that one
#      cell rather than inventing a sentence: see FINDING F-47-02-QA-6.

@ui @work @distribution
Feature: `scope` and `repo` compose by intersection, and every way of arriving at nothing says which nothing it is
  In order that an operator who has narrowed twice can read both narrowings off one page and one sentence — and that a filter matching nothing never claims the mesh is idle, empty or broken
  the two narrowings must intersect with neither overriding the other, and the copy for an empty view must name every narrowing that produced it and say the one true thing about it

  Background:
    Given `ui/src/fleet/scope.mjs` imported directly by `node:test` under plain node — no bundler, no DOM, no React
    And the SERVER applies `scope` before the payload is served — `?scope=local` resolves to the workspace the DAEMON was started in, a fact the client cannot compute and does not know
    And the CLIENT applies `repo` to whatever payload it was served, and nothing else
    And "the daemon's own workspace" below is alpha, and beta is a second published workspace the operator could name

  # Headline 1: the four composed cases, and there is no fifth. ADR-005 names each of
  # these in terms; the rows are its own consequences turned into inputs and outputs.
  @executable
  Scenario Outline: `scope` and `repo` intersect — neither overrides the other, and an empty intersection is a correct answer
    Given the server served <payload>
    When the client narrows it by <repo>
    Then the result is <outcome>
    And the payload's `scope` scalar is unchanged — the client never relabels which scope produced what it was given
    And neither narrowing has been dropped: reading the address back still yields <scope read back> and <repo read back>

    Examples:
      | case                                                                          | payload                                          | repo    | outcome                                                              | scope read back | repo read back |
      | `?scope=global&repo=<id>` — the ordinary case, and what the filter is FOR     | the global payload, alpha and beta               | "alpha" | alpha's rows only, in every collection                               | "global"        | "alpha"        |
      | `?scope=local&repo=<the daemon's own workspace>` — NOT a no-op, because the roster was never scoped | the local payload, narrowed by the server to alpha, carrying the MACHINE-WIDE roster | "alpha" | the collections the server already narrowed (`workspaces`, `items`, the workspace-carrying `diagnostics` rows) are unchanged, AND the machine-wide roster narrows to alpha's members — the repo filter is the FIRST narrowing the roster receives | "local" | "alpha" |
      | `?scope=local&repo=<a DIFFERENT workspace>`, roster HAS members of it          | the local payload, narrowed by the server to alpha, carrying the MACHINE-WIDE roster | "beta"  | `workspaces`, `items` and the narrowed `diagnostics` rows are empty, AND the roster carries beta's member nodes — so the page state is `populated`, not `empty`: the surviving rows ARE the answer to "which machines are working on beta" | "local" | "beta" |
      | `?scope=local&repo=<a DIFFERENT workspace>`, roster has NO member of it        | the local payload, narrowed by the server to alpha, whose roster names no beta member | "beta" | every collection empty, the page state is `empty`, and the copy is the OUT-OF-SCOPE one — never the unknown-value one, because a scope-narrowed payload was never served the mesh and cannot speak for it | "local" | "beta" |
      | `?scope=global&repo=<a value the payload does not carry>`                     | the global payload, alpha and beta               | "zzz"   | every collection empty — and this is the ONLY row where the unknown-value accusation is permitted, because only here was the client served the whole mesh | "global"        | "zzz"          |
      | a `--local`-STARTED server, with NO `?scope=` in the URL at all, plus a repo   | the local payload, narrowed by the server to alpha, labelled `scope: "local"`, carrying the MACHINE-WIDE roster | "beta" | exactly as the two `scope=local&repo=beta` rows above — `populated` when the roster carries a beta member, `empty` with the OUT-OF-SCOPE copy when it does not | "global" (the URL's default) | "beta" |
    # ROWS 2, 3, 4 AND 6 AMENDED AT BUILD (PO, 2026-08-10) under ADR-010, which corrects
    # ADR-005's two named composed consequences. Row 3 was split into the two rows that
    # are now 3 and 4. What was wrong and why it matters:
    #
    #   The SERVER NEVER NARROWS THE NODE ROSTER — not under `?scope=local`, not ever.
    #   Three sources say so: `src/global-node-registry.mjs:170-172` ("nodes are a
    #   MACHINE-WIDE fact: the roster is never workspace-filtered"), the seam's own comment
    #   at `src/mesh-ui-serve.mjs:552-554`, and the green behavioural pin in
    #   `test/arch/acd-mesh-ui-local-filter-preserves-status.test.mjs:94`.
    #
    # So under ADR-004 rule 2 the repo filter is the FIRST and ONLY narrowing the roster
    # ever receives, and two of ADR-005's consequences are false of the payload the
    # producer actually emits: the "no-op intersection" row drops three of five roster rows
    # (measured), and the "renders EMPTY" row renders beta's member machines. ADR-010 rules
    # that ADR-004 rule 2 governs, that "intersection" is PER COLLECTION — a collection
    # whose two narrowings differ in REACH can be the only survivor, and that is
    # intersection working rather than failing — and that the client may never gate a
    # collection by `scope` or by `status.workspaceId`.
    #
    # THE PATHOLOGICAL CASE IS STILL DELIBERATELY NOT AN ERROR. The operator asked for two
    # things that do not overlap; the honest answer is whatever each collection's own
    # narrowings leave, said out loud, with both reasons named (scenario 3) and one click
    # from resolution (scenario 9). It is never "the last one wins" and never a silent drop
    # of one — a URL in which one parameter quietly disables another cannot be read by the
    # person who pasted it. What ADR-010 adds is that a PARTIAL intersection is a third
    # answer beside "everything" and "nothing", and it owes the operator a notice (47/03)
    # rather than an empty state that would hide the very rows answering the filter.
    #
    # ROW 6 IS THE ROW THAT PROVES THERE IS NO PRECEDENCE RULE. A server started with
    # `--local` narrows with NO `?scope=` in the URL (`mesh-ui-serve.mjs:556` —
    # `scope === "local"` wins over any request parameter), so the URL's scope reads back
    # as the documented default "global" while the PAYLOAD is labelled "local". A client
    # that composed by comparing the two URL parameters would get this case exactly
    # backwards; a client that narrows whatever it was served gets it right without
    # knowing the first narrowing happened. THAT is what "they compose" has to mean, and
    # it is why the copy reads the payload's `scope` scalar and not the URL's.

  # Headline 2: the direction of the composition. A repo filter can only ever REMOVE
  # rows from what the scope already selected. Stated as a property over the whole
  # payload rather than a row count, so no future collection escapes it.
  @executable
  Scenario: a repo filter can only ever narrow further — it never widens a scoped payload
    Given a global payload carrying alpha and beta, and a local payload the server already narrowed to alpha
    When each is narrowed by any of "alpha", "beta", "zzz" and null
    Then for every collection, the rows of the answer are a SUBSET of the rows of the payload it was handed — same objects, no additions
    And there is no value of `repo` for which the answer carries a row the payload did not carry
    And narrowing the local payload by alpha — the workspace the server already narrowed to — leaves the server-narrowed collections exactly as they were, and narrows the machine-wide roster to alpha's members, which is the first narrowing that roster has received
    And narrowing either payload by null yields the payload itself
    # THE "SUBSET, SAME OBJECTS" CLAUSE is what makes "intersection" a checkable word
    # rather than a description. A client-side narrowing that re-fetched, merged, or
    # back-filled from a previous payload would break it — and would be the first step
    # toward the two narrowings disagreeing about what the page is showing.

  # Headline 3: the HEADING names EVERY narrowing in force, in the order they were
  # applied — scope, then repo (ADR-005/ADR-007). "A heading that named one of two
  # reasons would be a half-truth in exactly the state the SPEC is about" (DESIGN).
  @executable
  Scenario Outline: the empty-state heading names every narrowing in force
    Given a page with nothing to show, under <narrowings in force>
    When I call `emptyStateCopy` with scope <scope>, repo <repo> and resolved <resolved>
    Then its heading is <heading>

    Examples:
      | case                                                              | narrowings in force  | scope    | repo    | resolved      | heading                                                  |
      | nothing has published anywhere, no narrowing at all               | none                 | "global" | null    | —             | "No mesh-enabled workspaces yet"                         |
      | scope only — the pre-existing local empty state, unchanged        | scope                | "local"  | null    | —             | "No nodes in the group yet"                              |
      | the repo is ON the mesh and quiet                                 | repo                 | "global" | "alpha" | "lark-guard"  | "Nothing published for this repo yet"                    |
      | the payload carries nothing that publishes as this value          | repo                 | "global" | "zzz"   | null          | "No repo matches this filter"                            |
      | BOTH narrowings, and they do not intersect                        | scope + repo         | "local"  | "beta"  | null          | "Nothing matches Local scope and this repo"              |
      | BOTH narrowings, and the repo IS the daemon's own quiet workspace | scope + repo         | "local"  | "alpha" | "lark-guard"  | a heading naming BOTH the Local scope and the repo       |
    # ROWS 1 AND 2 ARE TODAY'S TWO HEADINGS, byte-for-byte, read off `Fleet.tsx:
    # 1523-1525` where they are inline JSX today. They move home in this story; they do
    # not change a character. DESIGN says so in terms ("the two existing strings are
    # unchanged"), and a build that "improved" one while re-homing it would be changing
    # shipped product copy inside a refactor.
    #
    # ROW 5's HEADING IS DESIGN'S OWN EXEMPLAR, quoted verbatim. Row 6 is the same rule
    # applied to the other composed case, and DESIGN gives no exemplar for it — so the
    # cell asserts the PROPERTY (both narrowings named) rather than inventing a sentence.
    # See FINDING F-47-02-QA-6.
    #
    # `scope: "global"` IS NOT A NARROWING and never appears in a heading. It is the
    # default (m34/ADR-006) and DESIGN's banner shows a scope chip "only when
    # `scope=local`". A heading that announced the global scope would be announcing the
    # absence of a narrowing, which is the covert-signal shape DG-20 forbids from the
    # other direction.

  # Headline 3 continued: the BODY says the one true thing about that narrowing. Three of
  # the four are pinned verbatim by DESIGN and are quoted here byte-for-byte.
  @executable
  Scenario Outline: the empty-state body says the one true thing, and names the value the operator typed
    When I call `emptyStateCopy` with scope <scope>, repo <repo> and resolved <resolved>
    Then its body is <body>

    Examples:
      | case                                     | scope    | repo    | resolved      | body                                                                                                                              |
      | unfiltered, global — unchanged           | "global" | null    | —             | "No mesh-enabled workspaces have published yet. Enable mesh on a workspace (config.mesh.enabled) and it will appear here."         |
      | unfiltered, local — unchanged            | "local"  | null    | —             | "No nodes in the group yet. Enrol a machine to bring it onto the mesh."                                                            |
      | the repo is on the mesh and quiet        | "global" | "alpha" | "lark-guard"  | "lark-guard is on the mesh but has published no milestones and no nodes. The rest of the fleet is still there."                    |
      | the payload carries no such publisher    | "global" | "zzz"   | null          | "Nothing on this mesh publishes as zzz. It may not have published yet, or the id may belong to another mesh."                      |
      | both narrowings, no intersection         | "local"  | "beta"  | null          | a sentence naming BOTH narrowings and saying the INTERSECTION is what is empty rather than either half of it — and which is NOT the unknown-value body, verbatim or in substance (ADR-010 clause 5: a scope-narrowed payload was never served the mesh and may not speak for it) — DESIGN pins the exemplar |
    # ROWS 1 AND 2 WERE READ BACK FROM THE RUNNING MODULE while authoring, not transcribed
    # from a document — they are `emptyStateCopy("global")` and `emptyStateCopy("local")`
    # exactly as the shipped build answers them today.
    #
    # ROW 3 AMENDED AT BUILD (PO, 2026-08-10) — it read "no milestones, nodes or boards",
    # pre-ADR-006 wording this reconciliation missed while claiming to quote DESIGN
    # byte-for-byte. DESIGN §Surface 2 (`DESIGN.md:851`, and `:855-856` in terms: "Naming
    # boards there would send the operator looking for a region ADR-006 deleted"),
    # `47/03 tasks/02:129` and `mocks/PROMPT.md:238` all carry "no milestones and no
    # nodes"; three sources against one stale cell is a transcription defect, not a design
    # question. The developer flagged it and refused to edit the contract, which is right.
    #
    # ROW 3 USES THE RESOLVED NAME AND ROW 4 USES THE RAW VALUE, and the asymmetry is
    # ADR-003's cost being repaid: the URL carries an opaque id, so when it resolves the
    # operator is shown the NAME they recognise, and when it does not the raw value is
    # the only honest thing to show. Row 3 saying "9db1fd84f5895e38 is on the mesh" would
    # be true and useless; row 4 inventing a name would be a lie.
    #
    # FINDING F-47-02-QA-6 (design-gap, LOW) — DESIGN pins the composed HEADING's
    # exemplar and no composed BODY. Row 5 therefore asserts the property rather than a
    # string, per the house rule that QA does not invent product copy. The cheapest close
    # is one sentence added to DESIGN §Surface 2's empty table; it is not a blocker,
    # because the property is confirmable as written.

  # Headline 4: four copies, four different facts — and the pairwise distinctness is the
  # assertion, because "four copies" is satisfied by four strings that say the same thing.
  @executable
  Scenario: the four copies are genuinely four, and none of them says anything untrue
    When I read all four copies — unfiltered, the quiet known repo, the unknown value, and the non-intersecting pair
    Then their four headings are pairwise distinct, and their four bodies are pairwise distinct
    And the unfiltered global body is byte-identical to the string the shipped build answers for `emptyStateCopy("global")` today
    And the unfiltered local body is byte-identical to the string it answers for `emptyStateCopy("local")` today
    And no copy contains the words "broken" or "failed" — a filter matching nothing is a true and ordinary answer, not a fault, and this is m34's rule extended rather than re-decided
    And NEITHER FILTERED COPY claims that nothing has published anywhere — the false statement about the mesh that DG-47-3 exists to prevent
    And the quiet-repo copy does not claim the value is unknown, and the unknown-value copy does not claim the repo is quiet
    And the composed body and the unknown-value body differ FOR THE SAME RAW VALUE — pairwise distinctness read off four copies each carrying a different value is satisfied by one rule wearing four coats, which is the substitution this clause exists to catch (ADR-010 clause 6)
    And every filtered copy contains, verbatim and however it is spelled, the value it is ABOUT — the raw value the operator typed wherever that value is what the sentence asserts a fact about, and the resolved name only in the quiet-repo copy, which is the one case a name exists to resolve to
    And no copy names a colour, a glyph, a control's position or a page region — a sentence that describes its own presentation is a sentence that goes stale in the next redesign
    # THE "VERBATIM VALUE" CLAUSE covers the values task 00's tables prove can arrive: a
    # 16-hex id, a value carrying a slash, a non-ASCII value, and a value that looks like
    # markup. The copy is a string and the surface renders it in `mono` (DESIGN); a copy
    # function that truncated, escaped or ellipsised the value here would be making a
    # presentation decision inside a sentence, and would hide the one fact the operator
    # needs to recognise their own typo.
    #
    # CLAUSE AMENDED AT BUILD (PO, 2026-08-10) — it read "every filtered copy contains the
    # value the operator TYPED", which the quiet-repo copy cannot satisfy: scenario 3 row 3
    # carries the resolved NAME, and this file's own comment forty lines up rules that
    # asymmetry deliberate ("Row 3 saying `9db1fd84f5895e38 is on the mesh` would be true
    # and useless"). Two clauses of one feature contradicting each other is a defect in the
    # feature, not a choice for the build. Re-expressed as the value each copy is ABOUT,
    # which is the only reading under which both clauses hold — and it stays an assertion
    # about verbatim rendering rather than being weakened into a property nothing checks.

  # Headline 5: DG-47-3 — WHICH NOTHING IS THIS. The three nothings are three different
  # facts owed three different sentences. What they are NOT is distinguishable by counting
  # rows — and one of them is not recognised as a nothing at all by the predicate that
  # ships today.
  #
  # ############################################################################
  # THE GAP THIS SCENARIO CLOSES — measured on the shipped module (2026-08-10, `d71d508`)
  # and reported by QA on story 47/03:
  #
  #     filterToWorkspace(status, "<a KNOWN, published, but QUIET workspace>")
  #        → { workspaces: [that one row], items: [], nodes: [] }
  #     isEmptyStatus(that) → FALSE      pageState({…, status: that}) → "populated"
  #
  # The workspace the operator filtered TO is itself a row in `workspaces`, so the
  # narrowed payload is never all-empty and the page renders POPULATED — one card above
  # two empty regions — exactly where DG-47-3's second condition requires
  # `empty (filtered)` and the sentence "<name> is on the mesh but has published no
  # milestones and no nodes." DG-47-3's own diagnosis names the UNKNOWN filter as the
  # trap; the known-but-quiet filter is the same trap one step earlier, and it is the
  # worse of the two, because it renders a page that looks like it is working.
  #
  # THE MECHANISM IS THE BUILD'S CALL and is deliberately not pinned: a filter-aware
  # emptiness question, a changed rule for the existing predicate, or a further input to
  # `pageState` are all admissible answers. WHAT IS PINNED IS THE OBSERVABLE — for each of
  # the three nothings the module answers the state `empty` and the copy that is true of
  # it, from THE NARROWED PAYLOAD AND THE NARROWINGS IN FORCE ALONE. Rows 4 and 5 are the
  # guard rails, and they are why "just make the predicate ignore `workspaces`" is not a
  # free answer: it would flip an UNFILTERED mesh carrying one published-but-quiet
  # workspace from `populated` to `empty` (measured: it reads `populated` today), changing
  # a page this milestone does not touch.
  # ############################################################################
  @executable
  Scenario Outline: the three nothings all read `empty`, and the quiet-but-known repo is one of them
    Given <payload>, with <narrowings in force>
    When the module is asked which page state to render
    Then the page state is <state>
    And the copy offered for that state is <copy>
    And the answer is reached from the narrowed payload and the narrowings alone — no second fetch, no un-narrowed payload and no `window` is an input to the question

    Examples:
      | case                                                                                       | payload                                                                                                      | narrowings in force | state       | copy                                     |
      | an idle mesh — nothing has published anywhere                                                | an all-empty payload                                                                                         | none                | "empty"     | the unfiltered copy for that scope       |
      | the filter names a value the payload does not carry                                        | a populated payload narrowed by "zzz"                                                                        | repo "zzz"          | "empty"     | the unknown-value copy                   |
      | THE GAP — the filter names a KNOWN workspace that is on the mesh and has published nothing  | a populated payload narrowed by "alpha", whose own workspaces row stands while its items and nodes are empty  | repo "alpha"        | "empty"     | the quiet-repo copy, naming "lark-guard" |
      | GUARD — the SAME payload shape with no filter in force                                      | an un-narrowed mesh carrying one published workspace, no items and no nodes                                   | none                | "populated" | none is asked for                        |
      | GUARD — a filter naming a workspace that DOES carry work                                    | a populated payload narrowed by "beta", which carries a milestone and a node                                  | repo "beta"         | "populated" | none is asked for                        |
      | THE FOURTH NOTHING — a SCOPE-narrowed payload filtered to a repo it does not reach          | a payload the server narrowed to alpha, whose roster names no beta member, narrowed by "beta"                 | scope "local", repo "beta" | "empty" | the OUT-OF-SCOPE copy — and NEVER the unknown-value copy |
    # ROW 6 ADDED AT BUILD (PO, 2026-08-10) under ADR-010 clause 5. Rows 1-5 are all
    # GLOBAL-payload cases, so between them they never exercise the one state where
    # "zero workspace rows survived" is AMBIGUOUS. ADR-009 made the surviving `workspaces`
    # row the KNOWN/UNKNOWN discriminator, which is sound on a global payload — there, only
    # the repo filter can remove a row. Under `scope=local` the SERVER already removed every
    # other row, so "zero survived" collapses *the scope excluded it* and *the mesh does not
    # have it* into one answer, and the page ends up asserting "Nothing on this mesh
    # publishes as beta" about a workspace that demonstrably publishes on this mesh
    # (measured). That is SPEC's own defect arriving through the door ADR-009 opened, and
    # this row is the gate on it. The discriminator is no longer the surviving row alone:
    # `resolved == null` means UNKNOWN only when the payload's `workspaceId` scalar is null,
    # i.e. only when the client was served the whole mesh.
    #
    # ROW 3 IS THE ONLY ROW THAT IS RED TODAY, and it is red as `populated` rather than as
    # a missing sentence — which is why no scenario written before this ruling caught it.
    # Rows 1 and 2 already answer `empty` on the shipped predicate; rows 4 and 5 already
    # answer `populated`. A build that closes row 3 by loosening the emptiness rule for
    # everyone breaks row 4; so does one that treats "one workspace row and nothing else"
    # as empty regardless of narrowing. The narrowings have to be part of the question.
    #
    # ROW 5 IS THE NON-VACUITY HALF. Without it, "answer `empty` whenever a repo filter is
    # in force" passes rows 1–4 and turns every filtered page into an empty state.

  # Headline 5 continued: whatever mechanism answers scenario 6, it may not disturb the
  # four states or the three sentences.
  @executable
  Scenario: the four page states and the three empty sentences survive whatever answers the filtered emptiness question
    Given the three nothings of scenario 6, and an unfiltered mesh carrying one published workspace and no work
    Then `pageState` still yields exactly one of "loading", "error", "empty" and "populated" — this milestone adds no fifth state and renames none of the four
    And the unfiltered mesh still reads "populated", exactly as the shipped build reads it today
    And a null status with nothing loading and no error still reads "empty", as it does today
    And the three empty answers carry three different headings and three different bodies
    And the copy for the idle mesh is byte-identical to the one the shipped build answers today, for the same scope
    And the copy for the quiet-but-known repo does not say the mesh is empty, and the copy for the unknown value does not say the repo is quiet
    # THE THIRD THEN IS THE ONE A "FILTER-AWARE PREDICATE" MOST EASILY BREAKS. A helper
    # that answered from the narrowings would still have to answer for a payload that
    # never arrived — `pageState({ loading: false, error: null, status: null })` is "empty"
    # today, measured — which is the state scenario 8's first row is about.

  # Headline 5 continued: "not yet known is not not found" — DESIGN's own clause, and the
  # one it says is easy to get backwards.
  @executable
  Scenario Outline: a filter whose payload has not landed is UNRESOLVED, never UNKNOWN
    Given the URL carries a repo filter and <payload state>
    When I call `emptyStateCopy` with that scope, that repo and resolved <resolved>
    Then the copy is <copy>
    And it does not state that nothing on this mesh publishes as that value

    Examples:
      | case                                                                 | payload state                            | resolved | copy                                                            |
      | no payload has landed yet — the first load is still in flight        | no payload                               | absent   | NOT the unknown-value copy                                      |
      | a payload landed and does not carry the id, and it is the WHOLE MESH | a populated GLOBAL payload without that id | null   | the unknown-value copy — the accusation is now true, and only here (ADR-010 clause 5: a scope-narrowed payload gets the OUT-OF-SCOPE copy, because it was never served the mesh it would be speaking for) |
      | a payload landed and carries the id, which has published nothing     | a populated payload carrying that id     | a name   | the quiet-repo copy                                             |
    # THE THREE-VALUED `resolved` IS THE MECHANISM, and it is why the input is a record
    # rather than a boolean. ABSENT means "not yet known", null means "known not to be
    # there", and a name means "found". A boolean collapses the first two, and the
    # collapse has one visible consequence: DESIGN's dashed unavailable treatment and the
    # sentence that goes with it would be applied to a perfectly valid filter for as long
    # as the first fetch takes. "A loading state that accuses a valid filter of being
    # unknown is a defect" — DESIGN, DG-47-3, in terms.
    #
    # ROW 1's STATE IS REACHABLE, not theoretical: `pageState({ loading: false, error:
    # null, status: null })` answers "empty" (measured — `isEmptyStatus(null)` is true),
    # so the empty card renders over a payload that never arrived without an error being
    # set. The CHIP's neutral-vs-dashed form under the same rule is DESIGN §Surface 1's
    # loading state and belongs to story 47/03.

  # Headline 6: the recovery. "Why am I looking at nothing" and "how do I stop" are one
  # question, and the second half is a URL operation these helpers own. What the button
  # LOOKS like and where it sits is 47/03's; what clearing DOES is here.
  @executable
  Scenario: clearing from a non-intersecting view returns the operator to exactly the view they had, minus the filter
    Given the address `/fleet?scope=local&repo=beta`, whose narrowings do not intersect
    # THE "AND WHOSE PAGE IS EMPTY" CLAUSE WAS DROPPED AT BUILD (PO, 2026-08-10) under
    # ADR-010: the page is NOT empty when the machine-wide roster carries a beta member,
    # and this scenario is about the ADDRESS, not the page state. Every assertion below
    # holds either way, which is why the clause could be removed rather than split.
    And the copy for that state names both narrowings
    When the filter is cleared through the clear form of `withRepoParam`
    Then the resulting search is exactly "?scope=local" — the scope narrowing the operator chose SURVIVES the clear
    And `repoFromSearch` of it returns null, so the narrowing is a no-op and the payload renders exactly as `scope=local` renders it
    And `scopeFromSearch` of it still returns "local"
    And the copy for the resulting state, if it is still empty, is the UNFILTERED local copy — byte-identical to what the shipped build answers today
    And nothing in that search names `repo`, in any form — no bare "?", no naked "repo="
    # THIS IS ADR-005's "NEITHER CONTROL CLEARS THE OTHER" seen from the recovery side,
    # and it is the clause an operator meets at the worst moment. A clear that also reset
    # the scope would silently widen the view past what they asked for, and they would
    # have no way to tell which of their two narrowings the page had discarded. The
    # mechanism that guarantees it is task 00's copy-and-set; this scenario is the
    # composed consequence, asserted where the two narrowings actually meet.
