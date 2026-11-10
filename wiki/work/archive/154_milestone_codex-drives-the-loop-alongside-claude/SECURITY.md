---
doc: security
---
# 154 · Session and rendering trust boundaries

## Assets & trust boundaries

- Repository files, operator configuration, credentials and execution permissions.
- Untrusted model/protocol output entering AOF's run, ask and usage stores.
- An authenticated answer channel naming one run versus permission to execute a command.
- Repository-controlled generated paths versus user-owned configuration and filesystem paths.
- A remote worker's capability advertisement versus the runtime actually launched.

## Threats & mitigations

| id | threat | defended by | status |
|---|---|---|---|
| T1 | Protocol output or a business answer grants command/file permissions | ADR-004; FF-15403; story 02 protocol-refusal scenarios | pending |
| T2 | A stale/wrong-run answer resumes another native session | ADR-002, ADR-004; story 06 durable-answer scenarios | pending |
| T3 | Generated paths escape the workspace or overwrite unowned configuration | ADR-005; FF-15404; stories 03 and 04 | pending |
| T4 | Logs expose credentials, unbounded output exhausts memory | ADR-003; story 02 malformed/oversized-message and redaction scenarios | pending |
| T5 | Worker mismatch silently launches Claude or invents a resumable identity | ADR-007; story 07 capability and resume scenarios | pending |
| T6 | Replayed usage inflates accounting or missing values become false zeroes | ADR-007; FF-15406; story 08 usage scenarios | pending |

## Residual risk

Native assistant and hook behavior changes across releases; story 11's live compatibility matrix
must cover the declared versions and operating systems before support is advertised. Existing
credential stores remain managed by Codex. AOF must neither inspect them nor broaden their access.
No new compliance obligation or personal-data processing feature is introduced; no separate
COMPLIANCE document is warranted by this scope.
