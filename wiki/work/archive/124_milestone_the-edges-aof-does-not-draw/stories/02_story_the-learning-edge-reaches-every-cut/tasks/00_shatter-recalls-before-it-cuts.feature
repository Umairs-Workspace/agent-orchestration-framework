@executable @docs @planning @memory
Feature: shatter recalls once per PRD, keyed to the seam, before it identifies the drivers

  `grep -c "recall\|memory" src/bundle/commands/shatter.md` is **0** (grep exits 1), confirmed by
  reading all `wc -l` = **110** lines. Across the whole bundle, `grep -rn -o "aof work memory[^\`]*"
  src/bundle/commands/*.md` returns **6** invocations in **4** files — `assimilate-code.md:75`
  (ingest), `continue.md:259` (recall `--kind near-miss --block`), `refine.md:122` and `:124`, and
  `verify.md:162` and `:212` (ingest). The outermost splitter is the one carrier missing.

  A verbatim port of `refine.md:121-128` is structurally wrong, and both reasons are readable in
  `shatter.md` itself. `shatter.md:38` spawns **only** `aof-product-owner`, so the block's architect
  clause (`--area architecture --block`) would attach to a role the `<process>` never declares. And
  the PO clause spells `--item <ref>` against an already-existing milestone, while shatter **mints**
  drivers — no ref exists until step 3 writes one (`shatter.md:57-66`), and the recall has to run at
  step 1's seam read (`shatter.md:41-44`) to reach step 2's partition (`shatter.md:45-56`) at all.
  ADR-007 §1-§3.

  The role read has a trap that a naive sweep falls into. `grep -o "aof-[a-z-]*" src/bundle/commands/
  shatter.md` returns **two** roles, not one: `aof-product-owner` (the spawn, `:38`) and
  `aof-researcher` (`:53`, prose about what `aof:refine` does later — not a spawn). The claim is
  about what the `<process>` SPAWNS.

  The acknowledgement home has a measured gap. ADR-007 §4 names `## Scope` for a boundary and
  `## Dependencies` for an edge; `.aof/templates/work/milestone/SPEC.md` declares
  `## Objective:23 ## Scope:28 ## Stories:36 ## Dependencies:45`, but
  `.aof/templates/work/spike/SPIKE.md` declares `## Question:29 ## Timebox:36 ## Investigation:44
  ## Finding:51 ## Outcome / Next:58` — **neither `## Scope` nor `## Dependencies`**. A clause that
  sends a spike's acknowledgement to `## Scope` names a heading a `SPIKE.md` does not have.

  Markdown wraps commands mid-token: `refine.md:122` ends at `aof work memory` and `:123` begins
  `recall "<the decision in a few words>" --area architecture --block`. Any reading of an invocation
  here is over joined lines.

  What would quietly undo this: a recall placed after `shatter.md:45` (it runs once the cut is made
  and cannot change it, ADR-007 §1); a per-driver loop instead of one per PRD; `--item` or `--area`
  reintroduced because refine spells them; the acknowledgement clause dropped, leaving a recall whose
  output has nowhere to land; a role read that counts `:53`'s prose mention as a spawn; and the block
  landing in a generated mirror while `src/bundle/commands/shatter.md` stays at 0 matches.

  ADR-007 §1-§5. FF-12405.

  Scenario: shatter carries exactly one memory invocation, and it is a PO recall
    Given `src/bundle/commands/shatter.md` after this story
    When its `aof work memory` invocations are read over joined lines
    Then there is exactly one, and its verb is `recall`
    And the block introducing it names `aof-product-owner` as the role that runs it
    And no clause in the file names an architect running a recall

  Scenario: the recall runs before the cut, not after it
    Given the invocation's line number in `src/bundle/commands/shatter.md`
    When it is compared with the numbered steps of `<process>`
    Then it sits after step 1's seam read (`shatter.md:41-44`) and before step 2's heading `2. **Identify the drivers` (`shatter.md:45`)
    And step 2 is still the first step that partitions the initiative
    And the six numbered steps keep their existing order and subjects

  Scenario: one recall per PRD, never one per driver
    Given the block that introduces the invocation
    When it is read for what governs how often the recall runs
    Then it states the recall runs once for the PRD session
    And no phrase attaches it to each identified driver
    And the file holds no second `aof work memory recall`

  Scenario Outline: the flags the form spells, and the two it must not
    Given the shatter recall invocation
    When it is compared token by token against <expectation>
    Then the token <token> is <expectation> in the invocation

    Examples: the decided form — ADR-007 §3
      | token           | expectation | why                                                             |
      | `recall`        | present     | the verb; the block reads memory, never rebuilds it             |
      | `--block`       | present     | the compact injection projection a command pastes into context  |
      | `--item`        | absent      | no driver ref exists until `shatter.md:57-66` mints one         |
      | `--area`        | absent      | a milestone-level cut is cross-cutting (ADR-007 §3)             |
      | `--kind`        | absent      | not narrowed to one record type, unlike `continue.md:259`       |

  Scenario: the query is keyed to the seam, not to an item
    Given the quoted query the invocation carries
    When it is read as a placeholder an agent fills
    Then it names the PRD's objective and scope words — the read-out `readSeam` pins (`shatter.md:41-44`)
    And it contains no item-ref placeholder such as `<ref>` or `NN`

  Scenario Outline: the acknowledgement lands in a section the driver's own template declares
    Given the acknowledgement clause of the shatter block
    When each `## ` heading it names is looked up in the shipped template for <driver type>
    Then every heading it names for that type is present in <template>

    Examples: the two driver types shatter frames — ADR-004
      | driver type | record doc | template                                | headings that template declares                                 |
      | milestone   | SPEC.md    | .aof/templates/work/milestone/SPEC.md   | Objective, Scope, Stories, Dependencies                         |
      | spike       | SPIKE.md   | .aof/templates/work/spike/SPIKE.md      | Question, Timebox, Investigation, Finding, Outcome / Next       |

  Scenario: the acknowledgement is an outcome, not an option
    Given the block after the invocation
    When it is read for what happens to a surfaced near-miss
    Then it requires the near-miss to be honoured or consciously departed from, in the record doc of each driver whose framing it changed
    And it names no escape to `ARCHITECTURE.md` or `STATE.md`, neither of which exists at framing time

  Scenario: the empty case is stated and it is a proceed
    Given the block's closing sentence
    When memory returns nothing
    Then the block says an empty block means nothing to surface (memory may be off) and to proceed unchanged
    And the recall itself is unconditional — no clause makes running it depend on memory being enabled

  Scenario: the roles the command spawns are unchanged
    Given `src/bundle/commands/shatter.md` before and after this story
    When the roles its `<process>` spawns are compared
    Then both spawn exactly `aof-product-owner` (`shatter.md:38`)
    And the mention of `aof-researcher` at `shatter.md:53` is still prose about `aof:refine`, spawning nothing

  Scenario: refine is read, never written
    Given `src/bundle/commands/refine.md` before this story
    When it is compared with itself after this story
    Then it is byte-identical
    And its block at `refine.md:121-128` still carries both invocations — the architect's at `:122-123` and the PO's at `:124-125`

  Scenario: the diff to shatter is the added block and nothing else
    Given `src/bundle/commands/shatter.md` before and after
    When every line outside the added block is compared
    Then each is byte-identical
    And the frontmatter `description`, `argument-hint` and `allowed-tools` are unchanged
    And `<objective>`, `<config>`, `<guardrails>` and `<output>` are unchanged
