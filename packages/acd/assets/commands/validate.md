---
description: Validate the work stream — runs the structural and loop-registry gates, then layers the agent-only checks (test-traceability, litmus) and advisory health.
argument-hint: [item ref — omit for the whole stream]
allowed-tools: [Read, Grep, Glob, Bash]
---
<objective>
The ACD lint keystone: prove the stream is well-formed and the contract is enforced. Read-only.
</objective>

<config>
Scope from "$ARGUMENTS" (one item ref, or omit for the whole stream). The deterministic structural
checks are owned by the `aof` CLI; this command runs it, then adds the language-aware layer the CLI
can't do yet.
</config>

<process>
1. **Structural keystone — the CLI (the validity lane).** Run `aof work validate $ARGUMENTS` (omit the
   arg for the whole stream). This is **the structural keystone (aof work validate)** — the hard gate.
   It checks deterministically and exits non-zero on any finding: **folder ↔ frontmatter**
   (the name `^(\d+)_(milestone|story|task|uat)_([a-z0-9-]+)$` equals `type`/`number`/`slug`; valid
   `status`; `created`/`updated` present; `parent` resolves), the **closed tag vocabulary** (universal
   ∪ `work.tags`; exactly one `@executable`/`@manual`/`@uat` per scenario; no `@milestone-NN`), and
   the **`depends` graph** (every edge resolves; acyclic). Report its findings verbatim under the
   **validity lane** (sourced from `aof work validate`); do NOT re-derive these by hand.
2. **Loop registry gate — the CLI (the loop lane).** Run `aof work loops validate` as a separate
   deterministic step. This command is intentionally workspace-wide: the loop registry is a
   project-level declaration and does not accept an item ref. Report its findings verbatim under the
   **loop lane** (sourced from `aof work loops validate`). Any error-severity finding is a hard gate
   and the command's non-zero exit must be surfaced to the operator. This step extends the validate
   procedure; it does not alter or replace `aof work validate`, and it is not a doctor lane.
3. **Health floor — the CLI (the health lane).** Run `aof work doctor $ARGUMENTS` (the SAME scope as
   step 1 — omit the arg for the whole stream). This is the deterministic *health* lane the validity
   lane cannot see: cross-item coherence, lifecycle completeness, freshness, and structural integrity
   (e.g. a `done` parent over an `in-progress` child, a stale `updated`, an orphan folder). Report its
   findings **verbatim** under the **health lane** (sourced from `aof work doctor`); do NOT re-derive
   them by hand. **Doctor is advisory (ADR-002):** by default a `warn`-only `aof work doctor` result
   exits 0 and **does not fail the skill** — only an `error`-severity finding (or `--strict`, a
   deliberate opt-in) gates. Doctor is **added beneath, never replacing, validate**: it is an
   ADDITIONAL deterministic floor, not a substitute for the structural keystone or the agent-only
   layer below.
4. **Traceability — agent layer (not yet in the CLI).** For each in-scope item: every `@executable`
   scenario (and every row of an `@executable` Scenario Outline) maps to a passing test; every
   `@manual` scenario maps to an evidence row and every `@uat` to a sign-off row in some
   `VERIFICATION.md` (or a `uat` session's `SESSION.md`); every `@finding-<id>` resolves to a real
   finding; every `verifies →` resolves to a real scenario.
5. **UAT-gate integrity (not in the CLI — needs to read `## Findings`).** For each in-scope `uat`
   session: a gate marked **`status: done`** must have **every** finding `verified`/`closed` (none left
   `open`/`accepted`/`fixed`) and a recorded **## Sign-off / verdict** — flag a `done` gate with
   unresolved findings (a lying gate). Conversely, every finding's `amend in` must resolve to a real
   item, and each amendment scenario closing it (`@finding-<id>` lineage) should exist — flag findings
   with no scenario routed to them. (Advisory: a milestone that `depends:` on the gate stays blocked
   until the gate is `done`, so an unclosed gate holds up everything behind it.)
6. **Litmus (advisory).** Flag `Then` steps that read like design/implementation assertions.
</process>

<output>
Report the combined findings **grouped by lane**, in this layered order:

1. **Validity lane** — the findings from `aof work validate` (the structural keystone). This is the
   hard gate.
2. **Loop lane** — the findings from `aof work loops validate`. This is a hard gate when it reports
   any error.
3. **Agent-only layer** — the traceability, UAT-gate integrity, and litmus findings the agent derives
   above (the language-aware checks the CLI can't do yet).
4. **Health lane** — the findings from `aof work doctor`, reported **beneath the agent-only layer**
   (traceability / UAT-gate integrity / litmus). This is the deterministic advisory floor.

**PASS** requires `aof work validate` and `aof work loops validate` to **exit 0** (the two hard
deterministic gates) **and** the traceability / agent-only layer to be clean. A **`warn`-only
`aof work doctor` result does NOT fail the skill** —
doctor is advisory, so its exit is not a precondition of PASS (only an `error`-severity health
finding, or an explicit `--strict`, would gate). The health lane is **added beneath, never replacing,
validate** — never substituted for the keystone or the agent-only layer. Modify nothing.
</output>
