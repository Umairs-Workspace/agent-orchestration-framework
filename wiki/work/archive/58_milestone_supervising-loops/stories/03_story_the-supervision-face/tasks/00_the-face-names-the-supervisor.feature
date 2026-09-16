@executable @cli @work @work-stream
Feature: work:loops show — the layer a loop declares, and the node that sets its reference

  `aof work loops show [--id <node-id>] [--json]` lists the registry one record at a time —
  `id · kind · title` — and says nothing about supervision, because until this milestone nothing in
  the model carried it. "Who may change this loop's target?" is answered today by opening fourteen
  records and reading their frontmatter by eye.

  This story puts both supervision facts on the face. Each line gains the layer the loop DECLARED
  and the node that sets its reference; every node in the `--json` form gains `referenceSetters` —
  the ids of the nodes declaring an inbound `target-setting` edge to it, in id order, `[]` when
  nobody does. The setter is COMPUTED from the declared edges, never read from a key a record could
  set about itself, and it is computed over the WHOLE registry, so `--id` narrows what is printed
  and never the answer. The first three segments of every line are unchanged.

  The restraint: this face reports and does not judge. An undeclared layer renders as no layer, never
  as a default the record did not declare; a missing setter is stated in words, never as a blank
  segment and never as an invented owner; a setter declared by a kind that may not set one is still
  named, because hiding it would hide the defect. Whether any of that is a FINDING belongs to
  `aof work loops validate`, and this command's exit code does not move.

  ADR-001 §1/§2/§6 · ADR-002 §1/§2/§7 · ADR-003 §2/§6 · ADR-006 §1 · FF-5806

  Scenario: reading a loop names the layer it declares and the node that sets its reference
    Given `loops/mgr.md` declares `id: loop:mgr`, `layer: management` and `target-setting: [loop:build]`
    And `loops/build.md` declares `id: loop:build`, `title: Build` and `layer: operational`
    When I run `aof work loops show`
    Then loop:build's line is exactly `loop:build · loop · Build · layer operational · reference set by loop:mgr`
    And its first three segments are the id, the kind and the title, unchanged by this story
    And the header line still states how many nodes were found, in which directory
    And the process exits 0

  Scenario: a loop whose reference nobody sets says so in words
    Given `loops/orphan.md` declares `id: loop:orphan`, `title: Orphan` and `layer: governance`
    And no record declares a `target-setting` edge naming loop:orphan
    When I run `aof work loops show`
    Then loop:orphan's line is exactly `loop:orphan · loop · Orphan · layer governance · no declared reference-setter`
    And the line carries no empty segment and no placeholder id
    When I run `aof work loops show --json`
    Then loop:orphan's referenceSetters is [] — an empty list, never null, never absent, never a fabricated id

  Scenario: a loop that declares no layer is given none
    Given `loops/build.md` declares `id: loop:build` and `title: Build` and no `layer:` key
    And `loops/mgr.md` declares `target-setting: [loop:build]`
    When I run `aof work loops show`
    Then loop:build's line is exactly `loop:build · loop · Build · reference set by loop:mgr`
    And no layer word appears on that line — no value is supplied as a default
    When I run `aof work loops show --json`
    Then loop:build's fields carries no `layer` key at all
    And loop:build's referenceSetters is ["loop:mgr"]

  Scenario: a kind that has no layer axis renders no layer, and is named only when something sets it
    Given `loops/arb.md` declares `id: arbiter:trade-off`, `kind: arbiter` and `title: Trade-off`
    And `loops/operator.md` declares `id: actor:operator`, `kind: actor` and `target-setting: [arbiter:trade-off]`
    When I run `aof work loops show`
    Then arbiter:trade-off's line is exactly `arbiter:trade-off · arbiter · Trade-off · reference set by actor:operator`
    And actor:operator's line ends at its title
    And no line for a kind other than `loop` carries a layer word

  Scenario: the absence is stated in words where it is a defect, and nowhere else
    Given records declaring one anchor, one watcher and one arbiter, none of them the target of a `target-setting` edge
    And `loops/orphan.md` declares `id: loop:orphan` and is the target of none either
    When I run `aof work loops show`
    Then only loop:orphan's line carries `no declared reference-setter`
    And the anchor, watcher and arbiter lines end at their titles
    When I run `aof work loops show --json`
    Then all four of those nodes carry `referenceSetters: []` — the machine face states the absence uniformly, the human face states it where a missing setter means something

  Scenario: the machine face is a shape a caller can depend on
    Given a registry holding one node of each declared kind
    When I run `aof work loops show --json`
    Then exactly one JSON document is printed on stdout, carrying the keys source, present and nodes
    And every node carries id, kind, title, fields, edges, path and referenceSetters
    And every node's referenceSetters is an array of declared node id STRINGS — never an endpoint object, never a title, never null
    And no node's referenceSetters contains that node's own id
    And the six node keys shipped before this story carry exactly what they carried before it

  Scenario: the human and machine faces carry the same answer, node by node
    Given a registry of 6 records in which 3 nodes have a declared setter and 3 have none
    When I run `aof work loops show` and `aof work loops show --json` over that registry
    Then for every node the ids named after `reference set by` are exactly that node's referenceSetters, in the same order
    And every node whose line says `no declared reference-setter` carries `referenceSetters: []`
    And every layer word printed on a line is the raw value of that node's fields.layer

  Scenario: reading one node agrees with reading the whole registry
    Given `loops/mgr.md` declares `target-setting: [loop:build]`
    When I run `aof work loops show --id loop:build --json`
    Then nodes has exactly 1 entry
    And loop:build's referenceSetters is ["loop:mgr"] — although loop:mgr's own record is not in the output
    And that entry is identical to loop:build's entry in the unfiltered `aof work loops show --json`
    And `--id` narrows what is printed, never what is computed

  Scenario: two nodes setting one reference are both named, in id order
    Given `loops/mgr.md` declares `id: loop:mgr` and `target-setting: [loop:build]`
    And `loops/operator.md` declares `id: actor:operator`, `kind: actor` and `target-setting: [loop:build]`
    When I run `aof work loops show --json`
    Then loop:build's referenceSetters is ["actor:operator", "loop:mgr"] — both, in id order
    And that order is unchanged when the two records are authored in the opposite order
    And the human line names both, separated by ", ", in that same order
    And neither is silently dropped in favour of the other

  Scenario: a loop pointing a target-setting edge at itself is not its own supervisor
    Given `loops/solo.md` declares `id: loop:solo` and `target-setting: [loop:solo]`
    When I run `aof work loops show --json`
    Then loop:solo's referenceSetters is []
    And its human line says `no declared reference-setter`
    And `aof work loops validate` over the same registry reports loop:solo as unowned — the face and the check agree on what a self-edge is worth

  Scenario: `owner:` is a different fact and the face never conflates the two
    Given `loops/orphan.md` declares `id: loop:orphan` and `owner: actor:root`
    And no record declares a `target-setting` edge naming loop:orphan
    When I run `aof work loops show --json`
    Then loop:orphan's referenceSetters is []
    And its fields.owner is unchanged, still carrying actor:root
    And its human line says `no declared reference-setter` although an owner is declared — two adjacent facts, reported apart

  Scenario: a setter declared by a kind that may not set one is still named
    Given `loops/eye.md` declares `id: watcher:eye`, `kind: watcher` and `target-setting: [loop:build]`
    When I run `aof work loops show --json`
    Then loop:build's referenceSetters is ["watcher:eye"] — the declaration is reported as it stands
    And nothing on the face marks that declaration good or bad
    And the process exits 0 — `aof work loops validate` is where such a declaration is judged

  Scenario: an absent registry is untouched by this story
    Given a workspace with no <work.dir>/loops/ directory
    When I run `aof work loops show`
    Then the output states that no loop registry is declared, naming the directory it looked in
    And no layer text and no reference-setter text is printed
    And the process exits 0

  Scenario Outline: what the registry declares is what the face reports
    Given a record declaring `kind: <kind>` with layer <layer>, whose reference is set by <sets its reference>
    When I run `aof work loops show` and `aof work loops show --json`
    Then that node's line carries exactly `<segments after the title>` after its title
    And its referenceSetters is <referenceSetters>

    Examples: the four declared/absent combinations for a loop, the multi-setter case, the self-edge, and the kinds that have no layer axis — proving the face reports only what the registry declares, invents no default, and states an absence in words only where a missing setter is a defect
      | kind    | layer          | sets its reference      | segments after the title                                  | referenceSetters           |
      | loop    | operational    | loop:mgr                | · layer operational · reference set by loop:mgr           | ["loop:mgr"]               |
      | loop    | governance     | (nobody)                | · layer governance · no declared reference-setter         | []                         |
      | loop    | (undeclared)   | actor:root              | · reference set by actor:root                             | ["actor:root"]             |
      | loop    | (undeclared)   | (nobody)                | · no declared reference-setter                            | []                         |
      | loop    | management     | actor:root and loop:mgr | · layer management · reference set by actor:root, loop:mgr | ["actor:root", "loop:mgr"] |
      | loop    | operational    | its own id, only        | · layer operational · no declared reference-setter        | []                         |
      | arbiter | (not admitted) | actor:operator          | · reference set by actor:operator                         | ["actor:operator"]         |
      | arbiter | (not admitted) | (nobody)                | (nothing)                                                 | []                         |
      | actor   | (not admitted) | (nobody)                | (nothing)                                                 | []                         |
      | anchor  | (not admitted) | (nobody)                | (nothing)                                                 | []                         |
      | watcher | (not admitted) | (nobody)                | (nothing)                                                 | []                         |
