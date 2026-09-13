@executable @cli @work @validate
Feature: An advisory lane reports and cannot gate, and the door that accepts never runs it

  The loop's doctor rung admits a finding only when its severity is `error` and its code is in
  `DOCTOR_GATE_CODES` (`src/commands/loop.mjs:216-219`). That set is derived by filter from
  `CONTROL_FINDING_CODES` (`src/commands/loop.mjs:203-204`) — the eight frozen codes at
  `src/work/doctor-controls.mjs:68` — so a lane holding its own frozen array cannot reach the gate
  whatever severity it chooses. Three lane modules declare such an array today
  (`grep -n "FINDING_CODES = Object.freeze" src/work/doctor-*.mjs` returns `doctor-controls.mjs:68`,
  `doctor-loop-record.mjs:56`, `doctor-rubric.mjs:67`). `doctor-controls.mjs` is the single exemption,
  because its array *is* the gate's source; the census brings the advisory class to three members,
  and a class of three is what makes the fourth safe.

  Severity is a module constant per lane, never a per-call argument (`src/work/doctor-rubric.mjs:99`,
  `src/work/doctor-loop-record.mjs:68`) — which is what stops a later caller hardening one code
  without touching the array. The acceptance horizon is not consulted at all: `severityFor` answers
  `error` inside it, so a horizon-aware lane would turn every advisory warning into a blocker at
  exactly the moment nobody can clear it.

  The accepting door does not run this lane. `aof work status <ref> done` invokes `doctorWork` with
  `groups: [budgetGroup]` and refuses only on `doc-over-budget` at `error`
  (`src/commands/item-status.mjs:262-277`) — one named group, and the census is not in it.

  What would quietly undo this: one of the new codes added to `CONTROL_FINDING_CODES` "so the gate
  can see it", which is where a derived-by-filter set silently gains a member; a per-code severity
  argument introduced so one code can be hardened later; `acceptance-horizon.mjs` imported into the
  lane; a second exemption arriving beside `doctor-controls.mjs` without being named as one; and the
  ladder reading `doctor.findings` in place of `admittedDoctorFindings(...)`.

  ADR-002 §1, §2. FF-12402.

  Scenario: a stream full of census findings stops no loop
    Given a work stream over which the depends lane reports 10 unwitnessed edges and its unchecked finding
    When `aof work loop` walks the gate ladder for an item in that stream
    Then the `work:doctor` rung reports zero admitted findings
    And the ladder crosses to the next step exactly as it does on a stream with no depends findings
    And no halt names a depends code

  Scenario Outline: what the doctor rung admits
    Given a doctor finding with code <code> at severity <severity>
    When the loop's doctor rung filters the run's findings
    Then it is <admitted>

    Examples: the two mechanisms — the code set and the severity — and which one does the work
      | code                          | severity | admitted | why                                                          |
      | depends-edge-unwitnessed      | warn     | no       | not in the admitted set, and not an error either             |
      | depends-edges-unchecked       | warn     | no       | same, and it reports a leg that did not run                  |
      | depends-edges-unchecked       | error    | no       | the code is not admitted, so severity is not what protects it |
      | scenario-unjoined             | warn     | no       | the rubric lane's own array, disjoint from the controls'     |
      | loop-record-unsigned          | warn     | no       | the loop-record lane's own array, disjoint likewise          |
      | control-unregistered          | error    | yes      | a controls code at error — the gate still gates              |
      | control-unregistered          | warn     | no       | an admitted code below error is not admitted                 |
      | verification-register-missing | error    | no       | filtered out of the admitted set by its `verification-` prefix |
      | control-runner-unchecked      | error    | no       | filtered out by name, being a leg that did not run           |
      | staged-control                | error    | yes      | a controls code at error                                     |

  Scenario: acceptance runs one named group, and this is not it
    Given a story whose milestone the depends lane reports unwitnessed edges for
    When `aof work status <ref> done` is invoked for that story
    Then the acceptance preflight runs the budget group and no other
    And the only code that can refuse the transition is `doc-over-budget` at `error`
    And the transition succeeds with the depends findings still outstanding

  Scenario: every finding the lane can make is a warning
    Given every finding the depends lane can emit, over a fixture that reaches each of its codes
    When their severities are read
    Then every one is `warn`
    And the lane's severity is one module constant rather than a value any caller supplies
    And an item inside the acceptance horizon gets the same severity as one outside it

  Scenario: the exemption is named, and the gate is still capable of gating
    Given every check-group lane that declares its own frozen finding-code array
    When each is compared against `CONTROL_FINDING_CODES`
    Then `src/work/doctor-controls.mjs` is the one lane whose array is that set, and it is named as the exemption
    And every other such lane's codes are absent from the loop's admitted set
    And the admitted set is non-empty, so the walk above is a passing gate rather than a disabled one
