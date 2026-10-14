---
doc: examples
---
# 156 · One loop selects an assistant per phase — example map

## R1 · Model choices alone select each phase's assistant, refusing before launch
- E1 · Only model flags: Sonnet/high with a phased Astra/high override and no runtime configuration — assistants are inferred per phase into one pinned mixed plan, and no Claude alias is checked against the Codex catalogue [proposed]
- E5 · An unknown/ambiguous model, an unavailable model/effort, a runtime flag or a corrupted plan — a named refusal before launch, with no fallback and no plan replacement [proposed]

## R2 · One loop runs every phase on its pinned selection, through resume and handoff
- E2 · One mixed loop over an unrefined task — Codex refines, Claude builds and verifies, and each session has its native runtime record [proposed]
- E3 · Stop after refine, edit the project runtime/model, resume — continue remains Claude/Sonnet/high, and explicit conflicting flags refuse [proposed]
- E4 · A mixed plan reaches a worker and a refine-first wave — the complete plan survives handoff, lane session records project the continue selection, and both asset sets are prepared [proposed]
- E7 · A scripted implementation keeps failing its task tests — the bound is reached and verification is not driven [proposed]

## R3 · Phase models and efforts are configured without assistant selectors
- E6 · Save neutral phase models/efforts over existing project settings — assistants are inferred, unrelated fields are preserved, and malformed saves leave the bytes unchanged [proposed]

<!-- Live model execution and browser visual acceptance remain separate from these
scripted/structural checks; see VERIFICATION.md for the environment prerequisite.
Evidence per example: E1/E5 runtime selection, invocation parser and native phase tests;
E2/E3/E7 CLI lifecycle mixed regressions; E4 ownership, wave and dispatch tests;
E6 config editor tests and the UI build. -->
