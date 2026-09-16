@executable @cli @work @work-stream
Feature: The frozen loop vocabulary — closed sets, exported, never widened by the data

  The loader is the single home of the loop registry's vocabulary. Every admitted key,
  node kind, edge key, pointer scheme, endpoint scheme, sentinel, cadence kind, duration
  unit, event trigger, field kind and ground class is a FROZEN LITERAL exported by the
  loader — derived from nothing, and never widened by the records being read. Admission is
  KIND-SCOPED: the union says what the vocabulary contains, and each node kind admits its
  own subset of it. A token outside its set is a finding, never silent acceptance — and so
  is a frontmatter line the parser never turns into a key at all. ADR-002 (the locked node
  contract), ADR-003 (the three pointer schemes), ADR-004 (the five edge keys and six
  endpoint schemes), ADR-005 (ground), ADR-006 (the cadence grammar), ADR-011 §2 (the
  eleven field kinds), §3 (kind-scoped admission), §4 (the dropped line).

  Background:
    Given the loop loader module

  Scenario: the loader exports eleven vocabulary sets, and the field kinds are the eleventh
    When I read the loader's exported vocabulary
    Then it is exactly eleven frozen sets — admitted keys per kind, node kinds, edge keys, pointer schemes, endpoint schemes, sentinels, cadence kinds, duration units, event triggers, field kinds and ground classes
    And the field-kind set is exported like the other ten, never held privately inside the loader
    And no twelfth set is exported, and no structural check's vocabulary is among them

  Scenario: the admitted key union is exactly the seventeen schema and edge keys
    When I read the exported admitted-key union
    Then it contains the identity keys "id", "kind", "title"
    And the control keys "controlled", "reference", "measurement", "actuator", "cadence", "ceiling", "owner", "optimizing"
    And the actor key "ground"
    And the five edge keys "data-feed", "target-setting", "monitoring", "veto", "parameter-tuning"
    And nothing else — seventeen members exactly
    And the union says what the vocabulary contains, never what one node admits

  Scenario: a "kind: loop" node admits sixteen keys, and "ground" is not one of them
    When I read the exported admitted-key set for kind "loop"
    Then it is exactly "id", "kind", "title", "controlled", "reference", "measurement", "actuator", "cadence", "ceiling", "owner", "optimizing" and the five edge keys
    And nothing else — sixteen members exactly
    And it does not contain "ground"

  Scenario: a "kind: actor" node admits nine keys, and no control field is one of them
    When I read the exported admitted-key set for kind "actor"
    Then it is exactly "id", "kind", "title", "ground" and the five edge keys
    And nothing else — nine members exactly
    And it contains none of "controlled", "reference", "measurement", "actuator", "cadence", "ceiling", "owner", "optimizing"

  Scenario: the node kinds are exactly two
    When I read the exported node-kind set
    Then it is exactly "loop" and "actor"

  Scenario: the edge keys are exactly the five, and "veto" is the single token for veto/constraint
    When I read the exported edge-key set
    Then it is exactly "data-feed", "target-setting", "monitoring", "veto", "parameter-tuning"
    And it contains no token carrying a "/" — a frontmatter key cannot express one

  Scenario: the pointer schemes are exactly three, and there is no "doc:" scheme
    When I read the exported pointer-scheme set
    Then it is exactly "module", "command", "config"
    And it does not contain "doc"
    And it does not contain "prose" — "prose:" is a sentinel, never a pointer scheme

  Scenario: the endpoint schemes are exactly six, split into two resolution tiers
    When I read the exported endpoint-scheme set
    Then it is exactly "loop", "actor", "item", "command", "config", "module"
    And "loop" and "actor" are the only two the loader resolves against declared nodes
    And "item", "command", "config", "module" are declared and syntax-checked only

  Scenario: the sentinel tokens are exactly the three standalone tokens plus the "prose:" prefix
    When I read the exported sentinel set
    Then the standalone sentinels are exactly "unknown", "uncapped", "none"
    And "prose:" is the one prefix sentinel, and it carries a path
    And no fourth standalone sentinel exists — there is no "tbd", no "null", no "declared-absent"

  Scenario: the cadence kinds and duration units are closed
    When I read the exported cadence vocabulary
    Then the cadence kinds are exactly "periodic:", "event:" and "unknown"
    And the duration units are exactly "ms", "s", "m", "h", "d"
    And "uncapped" is not a cadence kind — it belongs to "ceiling"

  Scenario: the event triggers are exactly four
    When I read the exported event-trigger set
    Then it is exactly "per-item", "per-phase", "per-milestone", "per-run-start"

  Scenario: the field kinds are exactly eleven — six of the honesty envelope and five typed
    When I read the exported field-kind set
    Then the six honesty-envelope kinds are exactly "pointer", "prose", "unknown", "uncapped", "none", "phrase"
    And the five typed kinds are exactly "periodic", "event", "ref", "flag", "enum"
    And nothing else — eleven members exactly
    And every one of the five typed kinds is distinct from every one of the four gap kinds

  Scenario: the ground classes are exactly one in this milestone
    When I read the exported ground-class set
    Then it is exactly "exogenous"

  Scenario: a key outside the union of schema keys and edge keys is reported, never ignored
    Given a record carrying the key "status: not-started"
    When the loops directory is loaded
    Then the load reports "loop-unknown-key" at severity error, naming "status"
    And the node still loads, carrying no field named "status"

  Scenario: "depends" on a loop record is an unknown key — the item graph and the loop graph never mix
    Given a record carrying the key "depends: [51]"
    When the loops directory is loaded
    Then the load reports "loop-unknown-key" at severity error, naming "depends"

  Scenario: "ground" on a loop node is a key admitted for another kind, not a key the vocabulary has never heard of
    Given a "kind: loop" record carrying "ground: exogenous"
    When the loops directory is loaded
    Then the load reports "loop-key-not-admitted-for-kind" at severity error, naming "ground" and the kind "loop"
    And it reports no "loop-unknown-key" for "ground"
    And it reports no "loop-bad-value" for "ground" — the value is fine, the kind is not
    And the node still loads, carrying no field named "ground"

  Scenario: a control field on an actor node is a key admitted for another kind
    Given a "kind: actor" record carrying "cadence: periodic:15s"
    When the loops directory is loaded
    Then the load reports "loop-key-not-admitted-for-kind" at severity error, naming "cadence" and the kind "actor"
    And it reports no "loop-unknown-key" for "cadence"
    And the node still loads, carrying no field named "cadence"
    And no "loop-missing-field" is reported for any control key on that node

  Scenario: the two admission codes are never confused — inside the union is one code, outside it is the other
    Given "a.md" declaring "kind: loop" and carrying "ground: exogenous"
    And "b.md" declaring "kind: loop" and carrying "status: not-started"
    When the loops directory is loaded
    Then "a.md" reports "loop-key-not-admitted-for-kind" and no "loop-unknown-key"
    And "b.md" reports "loop-unknown-key" and no "loop-key-not-admitted-for-kind"

  # A node whose kind the loader cannot read is KEPT, carrying kind null. Dropping it would
  # turn every endpoint that names it into a dangling finding against records that did
  # nothing wrong. With no kind to scope admission, admission falls back to the union of both
  # kinds' sets, so a key that would be fine under one kind is never reported on top of it.
  Scenario: a "kind" outside the closed set is a bad value, and admission falls back to the union
    Given a record declaring "kind: anchor" and carrying "ground: exogenous", "cadence: periodic:15s" and "status: draft"
    When the loops directory is loaded
    Then the load reports "loop-bad-value" at severity error, naming "kind"
    And the node is carried in the model with kind null — never dropped, and never defaulted to "loop" or "actor"
    And no "loop-key-not-admitted-for-kind" is reported for "ground" or for "cadence"
    And "status" is still reported as "loop-unknown-key" — the union is what a kindless node is read against

  # A key the frontmatter grammar cannot express never reaches the model at all — and the
  # SPEC's own "veto/constraint" phrasing is the likeliest way to write one. Silence there
  # would be the one authoring slip the closed vocabulary cannot see.
  Scenario: a frontmatter line that produces no key is reported, never dropped in silence
    Given a record whose frontmatter carries the line "veto/constraint: [loop:autonomous-cascade]"
    When the loops directory is loaded
    Then the load reports "loop-malformed-frontmatter-line" at severity error, quoting the line
    And the node carries no key named "veto/constraint"
    And the node carries no "veto" edge invented from it
    And no "loop:autonomous-cascade" endpoint appears anywhere on that node

  Scenario: a key that reached the model and a line that never became one are different findings
    Given "a.md" carrying the line "veto/constraint: [loop:x]"
    And "b.md" carrying the line "veto-constraint: [loop:x]"
    When the loops directory is loaded
    Then "a.md" reports "loop-malformed-frontmatter-line" and no "loop-unknown-key"
    And "b.md" reports "loop-unknown-key" naming "veto-constraint" and no "loop-malformed-frontmatter-line"

  Scenario: a blank line and a "#" comment inside the frontmatter are not malformed
    Given a valid record whose frontmatter carries a blank line and the comment line "# evidence: RESEARCH §Q1.5"
    When the loops directory is loaded
    Then no "loop-malformed-frontmatter-line" is reported
    And the node loads with zero error-severity findings

  # A line is re-scanned only when it is TOP-LEVEL: non-blank, not a "#" comment, not
  # indented, and not beginning with "-". Indented lines and "- " lines belong to the key
  # above them, so one block-list slip stays one finding instead of one plus N.
  Scenario: an indented continuation line is never reported on its own
    Given a record whose "reference:" key is followed by the indented lines "  - module:src/run-store.mjs#isRetryable" and "  - command:work:next"
    And the same record carrying the top-level line "veto/constraint: [loop:autonomous-cascade]"
    When the loops directory is loaded
    Then no "loop-malformed-frontmatter-line" is reported for either indented line
    And exactly one "loop-malformed-frontmatter-line" is reported, quoting the top-level "veto/constraint:" line
    And exactly one finding is reported for "reference"

  Scenario: the exported sets are literals, not accumulated from the data being read
    Given the exported admitted-key set captured before any load
    And a record carrying the novel key "watchdog: [loop:x]"
    When the loops directory is loaded
    Then the load reports "loop-unknown-key" for "watchdog"
    And the exported admitted-key set is byte-identical to the set captured before the load
    And "watchdog" is not a member of it

  Scenario: the exported sets cannot be widened at runtime
    When I attempt to add a member to any exported vocabulary set
    Then the set's membership is unchanged
    And a subsequent load classifies the attempted member exactly as it did before

  # Every out-of-vocabulary token, and the code it produces. Each row is one record
  # authored with one offending token, everything else valid. "kind-scoped key" rows carry
  # a key the vocabulary knows but this node's kind does not admit; "frontmatter line" rows
  # carry a line the parser never turns into a key.
  Examples:
    | vocabulary       | token as authored                     | expected finding                | severity |
    | admitted key     | status: not-started                   | loop-unknown-key                | error    |
    | admitted key     | depends: [51]                         | loop-unknown-key                | error    |
    | admitted key     | Kind: loop                            | loop-unknown-key                | error    |
    | edge key         | feedback: [loop:x]                    | loop-unknown-key                | error    |
    | edge key         | veto-constraint: [loop:x]             | loop-unknown-key                | error    |
    | kind-scoped key  | ground: exogenous (on kind: loop)     | loop-key-not-admitted-for-kind  | error    |
    | kind-scoped key  | controlled: run state (on kind: actor)| loop-key-not-admitted-for-kind  | error    |
    | kind-scoped key  | cadence: periodic:15s (on kind: actor)| loop-key-not-admitted-for-kind  | error    |
    | kind-scoped key  | optimizing: true (on kind: actor)     | loop-key-not-admitted-for-kind  | error    |
    | kind-scoped key  | monitoring: [loop:x] (on kind: actor) | (none — edges admit on both)    | —        |
    | kind-scoped key  | ground: exogenous (kind unreadable)   | (none — union admission)        | —        |
    | frontmatter line | veto/constraint: [loop:x]             | loop-malformed-frontmatter-line | error    |
    | frontmatter line | target setting: [loop:x]              | loop-malformed-frontmatter-line | error    |
    | frontmatter line | owner actor:product-owner             | loop-malformed-frontmatter-line | error    |
    | frontmatter line | # evidence: RESEARCH §Q1.5            | (none — a comment)              | —        |
    | frontmatter line | (a blank line)                        | (none)                          | —        |
    | frontmatter line | "  - module:a.mjs#b" (indented)       | (none — a continuation)         | —        |
    | frontmatter line | "  veto: [loop:x]" (indented)         | (none — a continuation)         | —        |
    | frontmatter line | "- loop:x" (top-level, leading -)     | (none — a continuation)         | —        |
    | node kind        | kind: anchor                          | loop-bad-value                  | error    |
    | node kind        | kind: Loop                            | loop-bad-value                  | error    |
    | pointer scheme   | reference: [doc:src/x.md]             | loop-bad-value                  | error    |
    | pointer scheme   | reference: [file:src/x.mjs#y]         | loop-bad-value                  | error    |
    | endpoint scheme  | data-feed: [node:autonomous-cascade]  | loop-bad-value                  | error    |
    | sentinel         | ceiling: tbd                          | loop-bad-value                  | error    |
    | sentinel         | owner: uncapped                       | loop-bad-value                  | error    |
    | cadence kind     | cadence: hourly                       | loop-bad-value                  | error    |
    | cadence kind     | cadence: uncapped                     | loop-bad-value                  | error    |
    | duration unit    | cadence: periodic:2w                  | loop-bad-value                  | error    |
    | event trigger    | cadence: event:per-sprint             | loop-bad-value                  | error    |
    | ground class     | ground: measured                      | loop-bad-value                  | error    |

  # "Kind: loop" is the one row that fires twice: the capitalised key is outside the
  # admitted set, AND the required lower-case "kind" is then absent.
  Scenario: a capitalised key is an unknown key and leaves the real key missing
    Given a record declaring "Kind: loop" and no "kind" key
    When the loops directory is loaded
    Then the load reports "loop-unknown-key" naming "Kind"
    And the load reports "loop-missing-field" naming "kind"
