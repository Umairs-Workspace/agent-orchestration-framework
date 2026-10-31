---
doc: retrospective
promotionFrom: 1
---
# 02 · The desktop verbs install, run and stop the app on macOS — retrospective

## R1 · An OS integration claim was relied on before it was measured

**Kind:** misunderstanding · **Area:** architecture · **Stage:** verify · **Owner:** architect · **Raised by:** operator · **Promoted to:** none

**What happened:** The operator asked for the Login Items entry to read "AOF Desktop". Adding `AssociatedBundleIdentifiers` to the plist and naming the bundle did not change it. Measured after a re-register, the entry was still a `legacy agent` named after the executable. The executable was renamed instead.

**Why:** macOS attributes a LaunchAgent to its app only under a shared Developer Team ID, and an ad-hoc-signed app has none.

**Lesson:** Measure an OS integration claim on the real OS before building on it, especially one that may depend on signing.

**Refs:** VERIFICATION `## Findings` F-05; ADR-002 §1–§2 (amended).

## R2 · `run` kickstarted a stale launchd job and reported success

**Kind:** mistake · **Area:** architecture · **Stage:** refine · **Owner:** architect · **Raised by:** product-owner · **Promoted to:** none

**What happened:** After the rename, `install --autostart` rewrote the plist, but `run` kickstarted the job launchd still had loaded, which pointed at the old executable. The spawn failed (`EX_CONFIG`), while the kickstart exited 0, so `run` reported "Started".

**Why:** ADR-003 assumed a loaded job reads its plist at each start. A loaded job keeps its loaded definition until it is booted out and bootstrapped.

**Lesson:** When a verb rewrites a launchd plist, reload the job from it, and confirm a start by the job's state, not by the exit code of the request.

**Refs:** VERIFICATION `## Findings` F-08; commit `6d4dd410`.
