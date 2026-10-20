---
doc: retrospective
promotionFrom: 1
---
# 164 · Every project change reaches the global store — retrospective

## R1 · The live check ran commands over a corrupt global store, and each command deepened the damage

**Kind:** blocker · **Area:** process (verify) · **Stage:** verify · **Owner:** verifier · **Raised by:** operator · **Promoted to:** none

**What happened:** The 164/01 task 02 live check ran `aof work find` in the test-bed to take a
baseline, then `aof mesh desktop run`. Every node record under `~/.aof/mesh/nodes` had been
NUL-filled since 2026-10-18 13:06Z. Each of those commands published its workspace, and each
publish rewrote that workspace's membership from the unreadable roster, leaving it with no
members. The daemon then skipped nine projects on every tick, and the check failed. The operator
read it as the verifier corrupting the store again.

**Why:** 164 made every command publish its own workspace, and the registry publish trusted a
roster that `readNodeRecords` had silently truncated (F-02). The verifier probed the target
workspace's rows, but not the shared global inputs that the publish rewrites them from.

**Lesson:** Before any live command on the real `~/.aof`, check that `~/.aof/mesh/nodes/*.json`
parse and that `global_node_workspaces` links the target workspace. A design that makes every
command write must say what each write REPLACES from shared global inputs, and refuse when those
inputs are partial.

**Refs:** VERIFICATION.md F-02 and evidence steps 6–8; ADR-004 (amended at verify).

## R2 · The pinned whole-tree censuses caught the new names and imports only at the gate, a third time

**Kind:** mistake · **Area:** contract · **Stage:** build · **Owner:** developer · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** The first regression gate went red on five censuses that no story lane
selected: the work and mesh native-import allow-lists, the 61/05 event census, FF-6108's
vocabulary and `appendEvent` seam set, and the runtime-audit source digest of `commands/doctor.mjs`.

**Why:** Each story declared the suites that test its behaviour, but not the controls that pin a
new file's imports, a new event name or a new appending seam. This is the class of m145/F-145-01
and 161/F-01 (161/01 R1), now recurring a third time.

**Lesson:** A story that adds an import to an extracted package, a new effects event name, an
`appendEvent` call site or an edit to an audited child-process file lists, in `files:`, the
census control that pins it (`test/bundle/yarn-installation.test.mjs`,
`test/grade/harness-ruling-seam.test.mjs`, `test/arch/grade/acd-harness-ruling-ledgered.test.mjs`,
`scripts/workspace-runtime-audit.json`), and its lane selects them. Three occurrences make this a
promotion candidate.

**Refs:** VERIFICATION.md F-01; REGRESSION.md row 1; m161/F-01; m145/F-145-01.

## R3 · A live-check step promised a command scope that does not exist

**Kind:** misunderstanding · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** The SPEC's outsider check and the `@manual` step asked for `aof work find` to
report another project's items "from any other workspace". `find` answers only the workspace it
runs in, so the step could never hold as written.

**Why:** The refine wrote the outsider check from the intended experience, and never read the
command's scope.

**Lesson:** Each step of a `@manual` live check names a command, and the refine reads that
command's scope before writing what it reports. Cross-project claims name fleet or the store.

**Refs:** VERIFICATION.md F-03.
