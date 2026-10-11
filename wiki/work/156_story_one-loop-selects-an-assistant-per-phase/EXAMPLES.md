---
doc: examples
---
# 156 examples

| Case | Input / trigger | Observable result | Evidence |
| --- | --- | --- | --- |
| E1 | Only model flags: Sonnet/high with a phased Astra/high override; no runtime configuration | Assistants inferred per phase; one pinned mixed plan; no Claude alias checked against the Codex catalogue | Runtime selection and invocation parser tests |
| E2 | One mixed loop over an unrefined task | Codex refines, Claude builds and verifies; each session has its native runtime record | CLI lifecycle mixed regression |
| E3 | Stop after refine, edit project runtime/model, resume | Continue remains Claude/Sonnet/high; explicit conflicting flags refuse | CLI lifecycle mixed-resume regression |
| E4 | Mixed plan reaches a worker and refine-first wave | Complete plan survives handoff; lane session records project the continue selection; both asset sets are prepared | Ownership, wave and dispatch tests |
| E5 | Unknown/ambiguous model, unavailable model/effort, runtime flag, or corrupted plan | Named refusal before launch; no fallback or plan replacement | Runtime selection and native phase tests |
| E6 | Save neutral phase models/efforts with existing project settings | Assistants inferred; unrelated fields preserved; malformed saves leave bytes unchanged | Config editor tests and UI build |
| E7 | Scripted implementation keeps failing its task tests | Bound is reached; verification is not driven | CLI lifecycle mixed failure regression |

Live model execution and browser visual acceptance remain separate from these
scripted/structural checks; see VERIFICATION.md for the environment prerequisite.
