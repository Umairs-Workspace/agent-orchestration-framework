@executable @cli @work @work-stream
Feature: A fourth advisory lane names each unwitnessed depends: edge, and renders no verdict on it

  The lane is one appended entry in the check-group registry (`src/work/doctor.mjs:684`, twelve
  entries today — `node -e "import('./src/work/doctor.mjs').then(m => console.log(m.CHECK_GROUPS.length))"`),
  a pure `(snapshot, ctx) => Finding[]` in the shape `src/work/doctor-rubric.mjs` and
  `src/work/doctor-loop-record.mjs` already hold. Its contract sets arrive as snapshot data from the
  engine's one impure edge (`src/work/doctor.mjs:418-467`), so the lane itself opens no file.

  Its domain is measured, not assumed. A throwaway census resolving `depends:` exactly as
  `validateWork` does — the driver level against `isDependTarget` (`src/work.mjs:476`, checked at
  `validateWork:1184-1195`) and the story level through `siblingDependencyNumber`
  (`src/work.mjs:565-571`, checked at `validateWork:1197-1208`) — finds **230** resolved edges in
  this stream: 34 witnessed by exact intersection, **14** unwitnessed, 125 unevaluable because an
  endpoint is not a story, and 57 because a story has declared no contract. Under task 00's coverage
  predicate four of the 14 turn out witnessed after all, every one of them 119-internal —
  `119/03 → 119/02`, `119/04 → 119/01`, `119/04 → 119/02`, `119/04 → 119/03` — which leaves the
  **10** this lane is expected to name here.

  The verdict is never rendered, and one of the ten is the reason. `96/03 → 96/01` is a real,
  deliberate edge with genuinely disjoint sets: `96/03` reads `src/story-contract.mjs`, which `96/01`
  reads and never writes. The instrument cannot tell that apart from a false edge, so the code states
  what was measured — `depends-edge-unwitnessed` — and the word `phantom` appears in no code, no
  message and no export of the lane. The token does survive as prose in two unrelated comments this
  story's diff passes over (`src/story-contract.mjs:18`, `src/work/doctor.mjs:179`); neither is a
  code, a message or an export, and neither needs touching.

  Severity is one module constant at `warn`, as at `src/work/doctor-rubric.mjs:99` and
  `src/work/doctor-loop-record.mjs:68`, and the acceptance horizon is never consulted — `severityFor`
  answers `error` inside it, which is the hardening an advisory lane must not do.

  What would quietly undo this: an edge class dropped from the walk, so an unwitnessed edge is
  counted as unevaluable and disappears into the denominator; the intersection computed over raw
  declared entries rather than the shared predicate, which puts the four 119 edges back as false
  reports; the lane reading `STORY.md` for itself, making its answer depend on where it ran; and
  `phantom` re-entering through a message after being kept out of the codes.

  ADR-001 §1. ADR-002 §1, §4. FF-12401.

  Scenario: an unwitnessed edge is named with both its endpoints and both its sets
    Given a story declaring `depends: [01]` and `reads: [src/a.mjs]`, and a sibling `01` declaring `files: [src/b.mjs]`
    When `aof work doctor --json` runs over that stream
    Then exactly one `depends-edge-unwitnessed` finding names that edge
    And its message names the dependent ref and the dependency ref
    And its severity is `warn`
    And its path is inside the dependent story's own folder, so a run scoped to the dependent's milestone still reports it

  Scenario: a witnessed edge produces nothing at all
    Given a story declaring `depends: [01]` and `reads: [src/b.mjs]`, and a sibling `01` declaring `files: [src/b.mjs]`
    When the lane runs over that stream
    Then it emits no finding for that edge
    And a single shared entry is enough — the lane never grades how much of a set intersects

  Scenario Outline: how a real edge in this stream is classified
    Given the edge <edge> as `validateWork` resolves it
    When the lane classifies it
    Then it is counted as <class>

    Examples: one real edge per class the walk can reach
      | edge            | class                            | why                                                                    |
      | 119/03 → 119/00 | witnessed                        | an entry appears verbatim in both sets                                 |
      | 119/03 → 119/02 | witnessed                        | `src/commands/test.mjs` sits beneath 119/02's authored `src/commands/` |
      | 96/03 → 96/01   | unwitnessed                      | both sets present, nothing covered — and a deliberate edge nonetheless |
      | 61/05 → 61/04   | unwitnessed                      | both sets present, nothing covered                                     |
      | 01 → 00         | unchecked, reason `type`         | both endpoints are milestones, which carry no contract fields          |
      | 32 → 18         | unchecked, reason `type`         | a uat gate depending on a milestone                                    |
      | 78 → 79         | unchecked, reason `type`         | the dependent is a milestone, so `reads:` can never exist for it       |
      | 40/02 → 40/01   | unchecked, reason `undeclared`   | both are stories and at least one declares no contract                 |

  Scenario: the lane renders no verdict it cannot reach
    Given the lane's module and every finding it can emit
    When its codes, its messages and its exported names are read
    Then its codes are exactly `depends-edge-unwitnessed` and `depends-edges-unchecked`
    And the token `phantom` appears in none of them
    And no message asserts that an edge is false, unnecessary or removable

  Scenario: the lane is a function of the snapshot it is handed
    Given a literal snapshot fixture carrying every contract set as data
    When the lane runs against it twice, from two different working directories
    Then both runs produce byte-identical findings
    And the lane spells no `readFile`, no `stat`, no `process.cwd` and no clock read
