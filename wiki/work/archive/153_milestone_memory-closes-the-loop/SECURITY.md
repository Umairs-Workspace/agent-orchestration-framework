# 153 · Security design review (solo)

Scope: recall observation input and promotion-target reads. No personal-data source, credential
store, network retrieval, new backend or automatic application is introduced.

| Boundary | Failure | Control and verification ownership |
|---|---|---|
| Caller JSON → item ledger | Unknown shape, partial verdicts, duplicate identity, wrong item or replay changes evidence | Story 01 validates before mutation, resolves exact local ownership, serialises replay/append and preserves bytes on refusal; FF-15301 includes a mixed-reader negative probe. |
| Source metadata → tune target reader | Absolute path, traversal, symlink escape or generated prompt is read as an authored target | Story 05 validates syntax and realpath containment before content access; the CLI fixture instruments the reader to prove rejected targets are never read. |
| Proposal text → workspace | A lesson becomes an unapproved edit or command | Story 05 returns data only, leaves applier absent and preserves the existing read-only tune control. Lesson prose is data, never shell input. |
| Recalled text → workflow judgment | Retrieved prose is treated as permission or a pre-filled success verdict | Story 04 requires the deciding role's explicit verdict, preserves source attribution and never defaults a verdict to honoured. |

No security implementation or fitness test was written at refine. Existing read-only control and
the declared consumer control land with their owning stories; red probes are owed in VERIFICATION.
