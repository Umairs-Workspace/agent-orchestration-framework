## Feedback (for retro)

- refine run-start's live-store rung attributed a CONCURRENT session (e8aa871f…) instead of this one (4d37af59…), so the example-map doctor read the wrong transcript and reported every stated answer unanchored. Recovered by run-complete --outcome failed --reason session-misattributed and re-minting with --session <id>. The live-store rung can pick another session's prompt inside its 120 s window. — Raised by: product-owner
