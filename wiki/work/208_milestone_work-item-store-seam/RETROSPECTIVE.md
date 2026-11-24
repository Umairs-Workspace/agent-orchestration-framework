---
doc: retrospective
promotionFrom: 1
---
# 208 · Work items are read and written through one store interface, with today's files as its first store — retrospective

Both lessons are milestone-level: each one played out across the stories rather than inside one.
No story surfaced a lesson of its own, so no story folder carries a retrospective.

## R1 · Every story's first whole-tree gate was red only on pins the seam had moved

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner (verify) · **Promoted to:** none

**What happened:** All six stories reached a green gate only after at least one complete full-tree round that failed on pinned controls alone, with no behavioural defect:

- **208/00:** two import censuses.
- **208/01:** five controls and two syntax pins.
- **208/02:** a reclaim control's argument pin.
- **208/03:** a module-count ratchet, the registry's async shape, a positional slice and a line citation.
- **208/04:** the projection module's line ceiling.
- **208/05:** a worker line ceiling, the package-port inventory and nine source fingerprints.

Each round took about 20 minutes. Several of these pins were found only after an earlier gate had been cancelled, so they surfaced one round at a time.

**Why:** A cross-cutting seam moves imports, lines and call shapes into files whose census controls live under `test/arch`. Those controls were not in any story's `reads:` or `files:`, and each story had to add them before editing. The impacted selector widened every story to the whole tree, so the cheapest place to see an architecture red was a 20-minute run.

**Lesson:** Before the first full gate on a story that touches a shared seam, run the architecture suites alone, which takes minutes, and repair every pin they name. At refine, name the census and ceiling controls such a story will move in its `files:`. A whole-tree round should find behaviour, not bookkeeping.

**Refs:** STATE.md at `d4b12bfa` "Verification" (each story's build rounds); ./VERIFICATION.md "Story build and review".

## R2 · The first build attempt stalled in full-suite verification and was abandoned

**Kind:** blocker · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** product-owner (verify) · **Promoted to:** none

**What happened:** The first `aof:continue 208` attempt also added a baseline prerequisite that the workflow did not require. Its widened full-suite run failed first on sandbox restrictions. An unrestricted retry then stalled for more than 35 minutes: a grading child hung in macOS `_dyld_start`, and the parent ignored SIGTERM and needed SIGKILL. Runs `20261124T104225994Z-0002` (208) and `20261124T104236333Z-0000` (208/00) closed `failed` with `verification-stalled`, and no implementation survived. The resumed build ran every later gate through the sharded runner in a detached snapshot checkout, and each finished in 19 to 22 minutes.

**Why:** The full suite ran unsharded in the live checkout, with a step the workflow never asked for. A single hung child had no unit limit to end it. The cause of the hang was not found.

**Lesson:** When a story's impacted gate widens to the whole tree, run it from the start through the sharded runner in a clean detached snapshot, with `AOF_GLOBAL_HOME` isolated. Do not add prerequisites the workflow does not name. A hang there costs one unit, not the attempt.

**Refs:** STATE.md at `d4b12bfa` "Continue attempt on 2026-11-24" and "Notes & decisions in flight" (the removed prerequisite).
