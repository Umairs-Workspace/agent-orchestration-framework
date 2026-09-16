@executable @cli @work @validate
Feature: work:loops validate — the findings, and the absence report

  `aof work loops validate [--json]` reports the registry's pathologies and NEVER enforces
  them: severity travels in the JSON, the exit code is 0 whenever a report was produced
  (52/ADR-007 §6). The `summary` is the consumed half — 53's Loop-Ready score reads it,
  never the render — and it carries a per-check `{ ran, findings }` map under the FIVE
  frozen check ids of 52/ADR-011 §12, IN THAT ORDER, so "ran and found nothing" is
  distinguishable from "did not run". Those five ids are exported by
  `src/work-loops-checks.mjs` — the same module that exports its own eight codes — and are
  imported by this command, never taken from the loader, which knows nothing of the checks
  (52/ADR-012 §2/B2). 52/ADR-008 freezes the envelope; 52/ADR-007 freezes the
  `{ code, severity, path, message }` finding; 52/ADR-011 §1 freezes the code set as the
  disjoint union of two lanes — 16 loader codes and 8 check codes, 24 in all, every one of
  which this surface reports and every one of which the Examples table below names.

  `ran` is the COMMAND's answer, never a check's: it is derived here from `Model.present`
  and from nothing else (52/ADR-012 §2/B3), which is what keeps the checks pure — they never
  see whether a registry exists. No registry → the checks are not invoked at all and every
  entry reads `{ ran: false, findings: 0 }`. A registry that exists → they are invoked and
  every entry reads `{ ran: true, findings: <its own count> }`, an EMPTY directory included.

  The order of `findings` is a CONTRACT, not an artefact (52/ADR-012 §3/C6): the loader lane
  first — by node `id`, then by the frozen schema's key order — followed by the five checks
  in `summary.checks` order, each check's own findings sorted by (path, code, message).

  Fixtures are hand-authored records under <work.dir>/loops/, each engineered to fire one
  named code; none of them depends on 52/03's day-one registry.

  Scenario: the JSON envelope
    Given a workspace whose <work.dir>/loops/ holds a well-formed registry
    When I run `aof work loops validate --json`
    Then exactly one JSON document is printed on stdout
    And it carries exactly the keys source, present, findings and summary
    And source is the <work.dir>/loops directory expressed relative to the invocation cwd
    And the process exits 0

  Scenario: the summary counts agree with the findings list
    Given a registry holding one schema violation and two declared gaps
    When I run `aof work loops validate --json`
    Then summary.error equals the number of findings whose severity is "error"
    And summary.warn equals the number of findings whose severity is "warn"
    And summary.error plus summary.warn equals the length of findings

  Scenario: each summary.checks counter counts ITS OWN check's findings, and the five sum to the check lane
    Given `loops/alpha.md` declares `monitoring: [loop:alpha]` — a monitoring edge onto itself
    And `loops/beta.md` declares `target-setting: [loop:beta]` — a target-setting edge onto itself
    When I run `aof work loops validate --json`
    Then summary.checks.pairing.findings counts loop:alpha's "loop-self-referential-edge" — the counter of the check whose independence requirement the self-edge tried to satisfy (52/ADR-012 §2/B1)
    And summary.checks["reference-ownership"].findings counts loop:beta's "loop-self-referential-edge", by the same rule
    And summary.checks.timescale.findings counts neither of them, and no "loop-timescale-inversion" is reported for either self-edge (52/ADR-012 §3/C1)
    And the five summary.checks findings counts sum to the number of check-lane findings in findings
    And no loader-lane finding is counted in any summary.checks entry

  Scenario: "ran and found nothing" is distinguishable from "did not run"
    Given a registry over which every structural check runs and one of them finds nothing
    When I run `aof work loops validate --json`
    Then summary.checks carries exactly the five keys grounding, pairing, reference-ownership, actuator-arbitration and timescale, in that order
    And the check that found nothing reports { ran: true, findings: 0 }
    And no entry is omitted from summary.checks to signal a zero result
    And no loader lane — schema, reference integrity, honesty — appears as a sixth entry

  Scenario: an absent registry reports every check as NOT run, by name
    Given a workspace with no <work.dir>/loops/ directory
    When I run `aof work loops validate --json`
    Then present is false
    And findings is empty
    And summary.error is 0 and summary.warn is 0
    And summary.checks still carries the same five keys, in the same order — grounding, pairing, reference-ownership, actuator-arbitration, timescale — each reporting { ran: false, findings: 0 }
    And no check was invoked at all — `ran: false` is the command's own decision, taken from present and from nothing any check returned
    And the process exits 0

  Scenario: an EMPTY but present registry reports every check as HAVING RUN, and clean
    Given a workspace whose <work.dir>/loops/ exists and holds no `.md` file
    When I run `aof work loops validate --json`
    Then present is true
    And findings is empty
    And summary.checks carries the same five keys in the same order, each reporting { ran: true, findings: 0 }
    And this answer differs from the absent-registry answer in present and in ran, never in findings
    And "the checks ran over an empty registry and found nothing" is therefore never reported as "the checks did not run"
    And the process exits 0

  Scenario: declared gaps are warn findings, and the command still exits 0
    Given `loops/alpha.md` declares `owner: unknown` and `ceiling: uncapped`
    When I run `aof work loops validate --json`
    Then findings includes a finding with code "loop-owner-unknown" and severity "warn"
    And findings includes a finding with code "loop-ceiling-uncapped" and severity "warn"
    And summary.error is 0
    And the process exits 0

  Scenario: every declared gap is visible — including a ceiling nobody could establish
    Given `loops/alpha.md` declares `ceiling: unknown`
    And `loops/beta.md` declares `ceiling: none`
    When I run `aof work loops validate --json`
    Then findings includes a finding with code "loop-ceiling-unknown" and severity "warn", anchored at `loops/alpha.md`
    And no finding is emitted for loop:beta's `ceiling: none` — a bound that provably terminates is not a gap
    And summary.error is 0
    And the process exits 0

  Scenario: a schema violation is an error finding, and the command still exits 0
    Given `loops/alpha.md` omits the required `cadence:` key
    When I run `aof work loops validate --json`
    Then findings includes a finding with code "loop-missing-field" and severity "error"
    And summary.error is 1
    And the process exits 0

  Scenario: the exit code is 0 even when every lane fires at once
    Given a registry holding a schema violation, a dangling endpoint and four declared gaps
    When I run `aof work loops validate --json`
    Then summary.error is greater than 0
    And summary.warn is greater than 0
    And the process exits 0

  Scenario: every finding is the frozen four-key envelope
    Given a registry engineered to fire a finding from each lane
    When I run `aof work loops validate --json`
    Then every finding carries exactly the keys code, severity, path and message
    And every severity is one of "warn" or "error"
    And every message is a non-empty string
    And no finding carries a `problem` key

  Scenario: the command result's finding paths are RAW ABSOLUTE and the face relativises them
    Given a registry holding one per-node schema violation
    When I invoke the command id "work:loops-validate" in-process with {}
    Then that finding's path is an absolute path, in this OS's native separator form
    When I run `aof work loops validate --json`
    Then the printed path is that same file expressed relative to the invocation cwd

  Scenario: a per-node finding anchors at the node's file, a whole-graph finding at the directory, a per-EDGE finding at its declaring node
    Given `loops/alpha.md` omits the required `cadence:` key
    And the graph holds a component with no path from any ground node
    And `loops/alpha.md` declares a `target-setting` edge to a loop whose cadence is not on a clock
    When I run `aof work loops validate --json`
    Then the "loop-missing-field" finding's path names `loops/alpha.md`
    And the "loop-graph-ungrounded-component" finding's path names the <work.dir>/loops directory
    And the "loop-timescale-not-comparable" finding's path names `loops/alpha.md` — the file the edge is DECLARED in, never the endpoint's file
    And no finding carries an absent or empty path

  Scenario: the finding list is deterministically ordered across repeated runs
    Given a registry engineered to fire at least six findings across both severities
    When I run `aof work loops validate --json` twice in the same process
    Then the two findings arrays are element-for-element identical
    When I run `aof work loops validate --json` in two separate processes
    Then the two printed findings arrays are byte-identical

  Scenario: the finding order is the frozen contract order, not an artefact of the order the lanes ran
    Given `loops/alpha.md` omits the required `cadence:` key and declares `owner: unknown`
    And `loops/beta.md` declares `ceiling: uncapped` and `optimizing: true` with no inbound `monitoring` edge
    And the graph holds a component with no path from any ground-bearing node
    When I run `aof work loops validate --json`
    Then every loader-lane finding precedes every check-lane finding, whatever their severities or their paths
    And within the loader lane loop:alpha's findings precede loop:beta's — node `id` order, never directory read order
    And within loop:alpha the "loop-missing-field" finding for `cadence` precedes the "loop-owner-unknown" finding, because `cadence` precedes `owner` in the frozen schema key order
    And the grounding check's "loop-graph-ungrounded-component" precedes the pairing check's "loop-unpaired-optimizer" — summary.checks order decides between checks, never path or severity
    And each single check's own findings are sorted by (path, code, message)
    And a second process over the same registry emits that same order

  Scenario: the human render summarises counts by severity
    Given a registry holding one schema violation and two declared gaps
    When I run `aof work loops validate`
    Then the output states the error count and the warn count
    And the output lists each finding's code and the file it is anchored at
    And the process exits 0

  Scenario: the human render states an absent registry rather than reporting a clean pass
    Given a workspace with no <work.dir>/loops/ directory
    When I run `aof work loops validate`
    Then the output states that no loop registry is declared, naming the directory it looked in
    And the output does NOT claim the registry passed
    And the process exits 0

  Examples:
    | registry state                                                     | reported code                     | severity | error findings | exit |
    | no loops/ directory                                                | (none)                            | (none)   | 0              | 0    |
    | loops/ exists, no .md files                                        | (none)                            | (none)   | 0              | 0    |
    | a well-formed loop declaring `owner: unknown`                      | loop-owner-unknown                | warn     | 0              | 0    |
    | a well-formed loop declaring `cadence: unknown`                    | loop-cadence-unknown              | warn     | 0              | 0    |
    | a well-formed loop declaring `ceiling: uncapped`                   | loop-ceiling-uncapped             | warn     | 0              | 0    |
    | a well-formed loop declaring `ceiling: unknown`                    | loop-ceiling-unknown              | warn     | 0              | 0    |
    | a well-formed loop declaring `ceiling: none`                       | (none)                            | (none)   | 0              | 0    |
    | a loop whose `measurement` is `prose:<path>`                       | loop-field-prose-only             | warn     | 0              | 0    |
    | a loop record with no `cadence:` key                               | loop-missing-field                | error    | 1              | 0    |
    | a loop whose `actuator` is a bare scalar, not a list               | loop-expected-list                | error    | 1              | 0    |
    | a loop whose `controlled` is a list, not a scalar                  | loop-expected-scalar              | error    | 1              | 0    |
    | a loop declaring `reference: []`                                   | loop-empty-list                   | error    | 1              | 0    |
    | a loop declaring `monitoring: []`                                  | loop-empty-list                   | error    | 1              | 0    |
    | a loop whose `id` is not `loop:<filename stem>`                    | loop-id-mismatch                  | error    | 1              | 0    |
    | a record carrying a key outside the schema and the five edge keys  | loop-unknown-key                  | error    | 1              | 0    |
    | a `kind: loop` record declaring `ground: exogenous`                | loop-key-not-admitted-for-kind    | error    | 1              | 0    |
    | a `kind: actor` record declaring `controlled:`                     | loop-key-not-admitted-for-kind    | error    | 1              | 0    |
    | a record whose frontmatter carries `veto/constraint: [loop:beta]`  | loop-malformed-frontmatter-line   | error    | 1              | 0    |
    | a loop declaring `cadence: periodic:soon`                          | loop-bad-value                    | error    | 1              | 0    |
    | a record whose frontmatter block cannot be parsed                  | loop-record-unparseable           | error    | 1              | 0    |
    | a loop declaring `data-feed: [loop:absent]`                        | loop-graph-dangling-endpoint      | error    | 1              | 0    |
    | a loop with `optimizing: true` and no inbound `monitoring` edge    | loop-unpaired-optimizer           | warn     | 0              | 0    |
    | a loop with no inbound `target-setting` edge                       | loop-unowned-reference            | warn     | 0              | 0    |
    | a loop declaring `monitoring:` on ITSELF                           | loop-self-referential-edge        | warn     | 0              | 0    |
    | a loop declaring `target-setting:` on ITSELF                       | loop-self-referential-edge        | warn     | 0              | 0    |
    | two loops sharing an `actuator` entry, with no `veto` arbiter      | loop-shared-actuator-unarbitrated | warn     | 0              | 0    |
    | two `periodic:` loops joined by `target-setting`, ratio under 3    | loop-timescale-inversion          | warn     | 0              | 0    |
    | a `periodic:` loop `target-setting` an `event:per-item` loop       | loop-timescale-not-comparable     | warn     | 0              | 0    |
    | a loop reachable only from an `actor` declaring `ground: exogenous`| loop-graph-grounded-exogenous-only| warn     | 0              | 0    |
    | a loop with no path from any ground-bearing node                   | loop-graph-ungrounded-component   | warn     | 0              | 0    |

  Examples: `ran`, derived by the COMMAND from present alone (52/ADR-012 §2/B3)
    | registry state                           | present | checks invoked | every summary.checks entry             | findings | exit |
    | no loops/ directory                      | false   | no             | { ran: false, findings: 0 }            | 0        | 0    |
    | loops/ exists, no .md files              | true    | yes            | { ran: true, findings: 0 }             | 0        | 0    |
    | 3 well-formed records, nothing to report | true    | yes            | { ran: true, findings: 0 }             | 0        | 0    |
    | 3 records, pathologies in both lanes     | true    | yes            | { ran: true, findings: its own count } | > 0      | 0    |

  Examples: the frozen finding order, as the relative positions one fixture pins (52/ADR-012 §3/C6)
    | position | lane   | anchored at / emitted by | code                            | why it sits there                                   |
    | 1        | loader | loops/alpha.md           | loop-missing-field              | node `id` order — alpha first; key order — cadence  |
    | 2        | loader | loops/alpha.md           | loop-owner-unknown              | same node, later key — owner                        |
    | 3        | loader | loops/beta.md            | loop-ceiling-uncapped           | next node in `id` order                             |
    | 4        | checks | grounding                | loop-graph-ungrounded-component | first id in summary.checks order, whatever its path |
    | 5        | checks | pairing                  | loop-unpaired-optimizer         | second id in summary.checks order                   |
