# 101 · Committed Generated Markdown Under Wiki Work Has No Eol Pin — Outcome

## Delivered

### The committed loop document is byte-stable across platforms
`wiki/work/loops.md` is pinned `text eol=lf` in `.gitattributes:86`, so it checks out LF on every
platform and `acd-loop-document-current` compares the committed bytes against the composer's LF
output rather than against a `core.autocrlf=true` checkout's CRLF.

### The eol pin carries its own guard
`test/arch/acd-loop-document-eol-pinned.test.mjs` asserts through `git check-attr` that
`wiki/work/loops.md` answers `eol=lf`, so deleting the `.gitattributes` rule now reds on every
platform instead of only on a Windows checkout.

### The pin is path-scoped, and the scoping is asserted
The rule covers the one generated projection, not a `wiki/work/**/*.md` glob: the hand-authored
record docs under the work directory still answer `unspecified`, including
`wiki/work/26_.../SPEC.md`, which is `acd-runs-eol-pinned`'s non-vacuity control — and that
scoping is itself an assertion, so a widening of the rule reds rather than silently making that
proof vacuous.

## Assumptions

- **git is the attribute authority** — the guard asserts through `git check-attr`, git's own
  matcher, so it holds for whatever git actually does with the pattern rather than for what a
  literal read of `.gitattributes` suggests.
- **The pin is what the drift guard needs** — `acd-loop-document-current`'s contract is
  regenerate == committed byte-for-byte, and the composer always emits LF.

## Gaps

### The source tree carries no eol pin
- **Status:** open
- **Discharge condition:** a control comes to read `src/**` bytes for identity — at which point the
  files it reads need the same pin the loop document has.
`src/**` is unpinned, so every module is LF in the index and CRLF in a `core.autocrlf=true`
checkout. No rendered byte depends on it and no control reads it (`78/VERIFICATION.md` **F-78-J**),
so nothing reds today; a pin there would be a rule with no gate behind it.
