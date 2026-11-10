# 135 · Key examples in the contract — Outcome

## Delivered

### What a person agreed in discovery reaches the executable contract and stays there
With `work.examples.enabled` on and an applicable map, refine writes a story's contract as one `Rule: R<n> · …` per map rule, with the key examples as headline `Scenario: E<n> · …` under it (m135/05). The parser reads the rules (m135/02), and the board shows them (m135/03). An agreed example that leaves the contract is an `example-untraced` error, and the build stays refused until the example is restored (m135/04). All of it ships from `@aof/specification-by-example` (m135/01).

### 135's own contracts are the trace's first real subjects
Stories 03, 04 and 05 are formulated in this form from their own maps, so the live work stream carries ruled contracts. 135/04's stated E8 is traced at accept: delete its scenario and the doctor names it.

## Assumptions

- **Nothing written before 135 is held to the trace** — `Rule:` and the trace apply to contracts formulated after this milestone. Every delivered feature, and every story without a map, lints as it did.
- **No governed project here uses a third-party Gherkin runner** — aof's own step binding was measured and binds scenarios under `Rule:` unchanged. One feature per rule is the named fallback for a runner that does not (ADR-002 §3).
