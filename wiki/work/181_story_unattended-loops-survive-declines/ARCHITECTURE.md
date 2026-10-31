---
doc: architecture
---
# 181 · Decisions

## ADR-001 — Phase completion records execution, independently of acceptance

A phase session is complete when its procedure has run, all children have settled, and its verdict, findings and routing are recorded. A negative verdict is a successful execution of that procedure. This applies to every phase. Share this instruction between the Codex structured-result prompt and Claude's PTY completion instruction; keep their existing wire formats. Codex complete maps to done, while failed/phase_failed means the procedure could not be carried out. Do not reinterpret historical failures or mine prose to turn them green.

## ADR-002 — Verify records developer handback in lifecycle status

On a story blocker decline, verify creates the bug task and records its findings, then calls aof work status <ref> in-progress. The live loop already re-reads status after verify and respects that explicit handback. Keep the engine unchanged; the integration regression confirms this existing behavior. Keep 129/ADR-001 §4: a genuinely in-review story still enters the review gate, on restart and in the same process. No task checkbox, binding, or prose heuristic changes review status. Missing human sign-off alone does not imply developer handback. Preserve existing attempt caps. A declined story handed back during a refine_first verify pass can be repaired by the existing primary continue path.

Alternatives rejected: treating every unticked/unbound task as a validate failure would change the contract for refined/unbuilt work; reading Blocker prose in the engine would create another source of lifecycle truth.

## ADR-003 — Check rubric command shape before session launch

Move the existing usableCommand and declaredRubric pure predicates to the grade leaf and retain them on the grade command tools interface. Doctor reports a configuration error, anchored to the stream root so scoped calls retain it. Loop invocation checks the same predicate before promotion, runtime discovery or session launch, including dry-run and resume. This does not extend the existing doctor review gate's admitted-code set or execute a rubric during preflight. Grade keeps runner-spawn-failed for an unusable declaration. An absent rubric keeps its existing no-op behavior.

This is argv-shape validation, not executable discovery. Rubrics use shell: false; Windows .cmd shims need a direct executable invocation, such as node plus a JavaScript entry point.

The loop shell size ceiling increases from 2219 to 2223 lines for the four-line invocation guard. The predicate is shared in the grade leaf; the shell only turns an unusable declaration into its command refusal before any side effects. This bounded input check belongs at the existing invocation door, so a new shell module or second validation policy would add indirection without reducing responsibility. The existing shell-size fitness check records the reason and retains the ceiling.

The two existing rubric single-spawner fitness checks now share a syntax-aware detector in test/support/grade-fixture.mjs. This distinguishes configuration reads from diagnostic strings and process calls from RegExp.exec, retaining direct, namespace and aliased process-call probes. The command-shape refactor must not weaken the single-spawn invariant or be mistaken for a second spawn.
