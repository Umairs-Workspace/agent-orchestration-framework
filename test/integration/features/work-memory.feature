Feature: Work memory — the seam's door rides the route table
  `aof work memory <verb>` was the CLI's one deliberately-unrouted work door
  (42/WAVE-D-MIGRATION d1 wave 2): a `subcommand === "memory"` ladder branch
  delegating wholesale to the seam's own face. Story 128 registers it —
  `work:memory`, route `work memory` — so it inherits command-spine.feature's
  contract (route dispatch, flag-spec refusal, the one --json envelope, the exit
  policy) and the integration README's ritual: a migrated verb lands WITH its
  scenario. The seam keeps its parsing rules and its verb gate; the generic face
  prints. These three rows are task 00's last scenario, and they pin what a
  bare fixture answers: no `memory.backend` declared ≡ the `none` backend
  (05/ADR-002), so `status` is honest zero and nothing is indexed or written.

  Scenario: the status verb renders its one line on a bare fixture
    Given a work stream with milestone "03" titled "Board"
    When I run `work memory status`
    Then the command should succeed
    And stdout should contain `memory: backend=none records=0`

  Scenario: the status verb answers --json with the seam's status object
    Given a work stream with milestone "03" titled "Board"
    When I run `work memory status --json`
    Then the command should succeed
    And the JSON result field "backend" should be "none"
    And the JSON result field "recordCount" should be 0

  Scenario: an unknown verb is the seam's refusal, naming the verb, at exit 1
    Given a work stream with milestone "03" titled "Board"
    When I run `work memory bogus`
    Then the command should fail
    And stderr should contain `Unknown memory verb "bogus".`
    And stderr should contain `Usage: aof work memory <verb>`
