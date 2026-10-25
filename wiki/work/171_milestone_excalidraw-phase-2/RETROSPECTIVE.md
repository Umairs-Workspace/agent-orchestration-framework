---
doc: retrospective
promotionFrom: 1
---
# 171 · Excalidraw phase 2 — retrospective

What running phase 2 taught: the conversation worked only once the operator drove it live, and the
whole-tree gate, not the story lanes, was what found the rest.

## R1 · The dock typed into claude by its own rule and repeated two defects the driver had already fixed

**Kind:** mistake · **Area:** architecture · **Stage:** verify · **Owner:** architect · **Raised by:** operator · **Promoted to:** control:138/FF-13801

**What happened:** At the `@uat`, "Request a first draft" typed its invocation into the dock and
never submitted it. The dock typed on the session's first painted bytes, before claude's REPL
mounted; once it waited for the REPL, its `text\r` in one write landed as a new line. Both were
solved in the loop's session driver in September — readiness observed from the TUI (2026-09-27) and
one paste then a separate Enter (70/06) — and both had to be fixed again here.

**Why:** The driver's rule lived in `@aof/execution`, which the browser cannot import, so 171/04
wrote the dock's own typing without meeting it. The smoke answers the dock's socket itself and never
runs a real TUI, so it could not show either defect.

**Lesson:** Before a new surface types into a live TUI, find the rule that already types into one
and give it a home both can import; then test against a real session at least once before review
closes. The readiness gate and the paste framing now have one home, `@aof/contracts/tui-ready`,
which FF-13801 holds as the only place the markers are spelled.

**Refs:** VERIFICATION `@finding-F-171-01`; 171/04 task 00 `@bug @finding-F-171-01`.

## R2 · Six reds lived in readers outside every story's lane, and only the whole-tree gate ran them

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** developer · **Raised by:** verifier · **Promoted to:** none

**What happened:** Every story closed green on its own test files, and the milestone's focused lane
ran 350 cases green. The first gate was red on six controls none of them ran: 171/02 put `node:fs`
and two silent catches in the board transport and stacked a pin comment past a window another
suite measures; 03 and 05 declared a bundle member without two of its tracked renders; and the
verify fix for R1 raised `aof work find`'s module count. The second gate then found the verify's own
repair had left a suite without its watcher.

**Why:** The write sets were derived by hand from `graph impact` and the ADRs, and every story grew
its `files:` during the build; the controls that pin a file's digest, imports, catch count or
module count read it from suites named nowhere in the story.

**Lesson:** Before a story's review closes, run every suite that imports or pins each changed source
module (the importer sweep), not only the story's own files — the controls that fail are the ones
the story never names. At verify, sweep again after every repair.

**Refs:** `REGRESSION.md` rows at 9b5d01c1 and d1b0e4e8; STATE `## Feedback (for retro)`.

## R3 · The gate's package suites timed out on a temp directory of 59,649 entries

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** verifier · **Raised by:** verifier · **Promoted to:** none

**What happened:** The second gate's `command-core/workspace packages pass their package-local
suites` timed out on its solo retry (`spawnSync ETIMEDOUT`, a 90 s budget). `%TEMP%` held 59,649
entries, about 50,000 of them stale `evals-*` folders some suite never removes; with the operator's
go 41,408 were cleared and the third gate was green.

**Why:** The native suites run 70–80 s standalone, so a loaded machine and a bloated temp directory
push them past the budget; nothing removes the leaked folders.

**Lesson:** Check `%TEMP%`'s size before a gate, and clear stale test folders with the operator's go
rather than raising the budget; the suite that leaks `evals-*` folders is a defect to find.

**Refs:** `REGRESSION.md` row at d1b0e4e8.

## R4 · Excalidraw's document handlers and CSS tokens reach into aof's fields inside its container

**Kind:** mistake · **Area:** code · **Stage:** verify · **Owner:** developer · **Raised by:** operator · **Promoted to:** none

**What happened:** At the `@uat`, typing a space in the canvas Ask architect field closed it: the
SDK's document-level keyup clears the selection on a space when the active tool is not the selection
tool, and the field closes when the selection changes. Earlier, 171/05 found the SDK's
`--color-primary` and `--color-muted` drawing aof's pin and tiles in the SDK's colours.

**Why:** The SDK guards its keydown for inputs but not its keyup, and defines tokens on its own
container; aof's fields stopped keydown only, and inherited the tokens.

**Lesson:** A field or popover aof renders inside the SDK's container stops keydown AND keyup and
re-declares the console tokens it uses; a browser check that types a space would have shown it.

**Refs:** VERIFICATION `@finding-F-171-02`; STATE `## Feedback (for retro)` (171/05).
