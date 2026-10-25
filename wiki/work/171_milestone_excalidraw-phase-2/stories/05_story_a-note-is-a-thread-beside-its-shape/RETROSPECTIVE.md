---
doc: retrospective
promotionFrom: 1
---
# 05 · A note is a thread beside its shape — retrospective

## R1 · The SDK shadows two console tokens inside its container

**Kind:** mistake · **Area:** code · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** The pin's `bg-primary` drew Excalidraw's purple, and 171/00's hover and 171/01's
tiles used the SDK's grey — found only by reading screenshot 14. Inside `.excalidraw`, the SDK
defines `--color-primary` and `--color-muted`.

**Why:** aof's chrome inherited the nearest token definition, which inside the SDK is the SDK's.

**Lesson:** aof's chrome roots inside the SDK re-declare the console tokens they use from the document
root (`consoleTokens`), and the smoke asserts a computed colour.

**Refs:** STATE `## Feedback (for retro)` (171/05); 171/R4.
