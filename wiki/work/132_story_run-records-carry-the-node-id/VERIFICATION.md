---
doc: verification
---
# 132 · Run records carry the node id, not the node name — Verification

Scrub note: this evidence is committed, so every hostname-derived id is written `<hostname-id>`
(this machine), `<wsl-hostname-id>` and `<mac-hostname-id>` rather than spelled.

## Verification evidence

### Tasks 00–03 — the focused `@executable` lanes

- **`AOF_GLOBAL_HOME=$(mktemp -d) node scripts/test.mjs --only <14 files>`** (2026-09-23) — every
  test file in `STORY.md` `files:` plus the identity/fabric arch neighbours
  (`acd-mesh-identity-not-committed`, `acd-fabric-single-seam`, `acd-global-node-identity-home`):
  **93 ok, 0 not ok, exit 0**. Story-scoped by design; the whole-tree run belongs to a gate, not here.
  `verifies → tasks/00_the-derivation-never-spells-the-hostname.feature`,
  `tasks/01_a-legacy-id-is-never-silently-rehomed.feature`,
  `tasks/02_the-node-record-carries-the-join-key.feature`,
  `tasks/03_no-run-record-names-a-machine.feature`
- **The task 03 control's red probe is in its own suite**: `self-check — the scan is non-vacuous and
  fires on a planted machine name` and `a planted segment that is not opaque and not baselined
  fails, naming the segment and the file` both ran green, i.e. the planted violation was observed
  red. (The story is parentless with no `ARCHITECTURE.md`, so there is no `FF-NN` register to cite.)

### Task 05 — the F-2 fix (`@bug @finding-F-2`)

- **`node scripts/test.mjs --only test/mesh/identity/mesh-identity-cli-face.test.mjs`**, isolated —
  13 ok, 0 not ok, including the five `132/05` scenarios. **Red probe:** with the envelope return
  disabled (`if (false && renamedFrom != null)`), three of them failed: the control-node report, the
  shared-scan comparison and the text face. The two preserved-behaviour scenarios stayed green, as
  they should. The fix was then restored. `verifies → tasks/05_a-rename-reports-what-it-strands.feature`
- **The story lane after the fix** — the 14 files above, plus `acd-mesh-command-cli-bijection` and
  every `test/arch/command/*` control: 215 ok and 1 not ok. The failure was FF-11903 (`acd-cited-path-resolves`),
  whose `git log --diff-filter=R` call errored with no message under that concurrent run; alone it
  passes 9/9. Deployed: `aof --version` → `payload f76c153+dirty.20260923T093910`, with
  `identity.mjs` byte-equal to the source.

### Task 04 — the `@manual` run on the control node (2026-09-23, 00:00–00:20 UTC)

`verifies → tasks/04_a-real-run-on-this-node-names-no-machine.feature` — every step below was read at
the source (the file on disk or a fresh CLI process), never from an earlier step's output.

- **Background.** `node scripts/install-local.mjs --skip-ui`, exit 0 → `~/.aof/bin/aof.exe --version`
  = `0.1.0 (payload 615678a+dirty.20260923T010040)`, equal to `BUILD_ID.json`. The operator quit and
  relaunched the desktop app; `mesh-ui.log` → `mesh ui running (build payload 615678a+dirty.20260923T010040)`.
  The control daemon did NOT start on that relaunch (F-2); after the fix below `mesh-serve.log` →
  `mesh serve running (node node-7297, build payload 615678a+dirty.20260923T010040)` at 00:14:14Z.
- **Re-identifies once, deliberately.** The sidecar had been hand-pinned to a post-scrub placeholder id after refine
  (F-1). Operator decision: move to the opaque form. With the sidecar and global config backed up
  (`~/.aof/mesh/backup-132-20260923T011355/`), the sidecar was restored to its pre-pin legacy shape
  `{ salt, nodeId: <hostname-id>, derivedFrom: <hostname> }`. The load-time self-heal recognises that
  shape, so nothing re-derived it. Then `aof mesh identity --reidentify --json` →
  `from: <hostname-id>`, `to: "node-7297"`, `invalidated`: `node-record` (`nodes/<hostname-id>.json`),
  `enrollment-credential` (`mesh.credential`), `control-node-nomination` (`mesh.relay.controlNode`).
  The sidecar on disk reads `nodeId: "node-7297"`. A second run → `{ from: "node-7297", to: "node-7297",
  changed: false, invalidated: [] }`. Discharged.
- **Acting on what it invalidated.** `~/.aof/aof.config.json` `mesh.nodeId`, `mesh.relay.controlNode`,
  `mesh.credential.nodeId` → `node-7297`; `aof mesh status --json` → `isControlNode: true`; the
  desktop supervisor then started `:4182` itself within ~5 s (no hand-started daemon).
- **A freshly minted run is safe to commit.** Scratch item: test-bed `aof-test-repo` `01/01`
  (`01_story_shout`, no `runs/` before). `aof work run-start 01/01 --json` → `node: "node-7297"`,
  `runId 20260923T001832160Z-0000`; on disk at `…/01_story_shout/runs/node-7297/20260923T001832160Z-0000.json`,
  whose `node` key reads `"node-7297"`. A case-insensitive grep for the hostname stem found 0 hits in
  the path and 0 in the bytes. `aof work run-complete 01/01 --outcome done` → `state: done`, path
  unchanged. Discharged.
- **History still resolves across the rename.** Before any rename, `aof work run-status 132 --json`
  answered both records ascending, `…205439255Z-0000` (`node` = `<hostname-id>`) and `…213142840Z-0001`
  (`node` = the placeholder id), each rendering its own `node`, both files at their original paths.
  Discharged. (`answeredFrom: "cache"`; the listing on disk agreed.)
- **The fleet after the id changed.** Read through `aof mesh status --json`, the fleet page's single
  data command; `:4181/?mode=fleet` answers 200. `node-7297` is listed as `role: control`,
  `stale: false`, on the new build. Before the re-identification no peer was live: the Mac has not
  been seen since 2026-07-27 (`stale: true`), and the WSL node was not seen after 2026-09-03 and had
  no daemon running. Both are still listed, under their old ids, so nothing the node saw before was
  lost. The WSL node is UNJOINED, and the reason is recorded (F-4). Rows for this machine's old ids
  (`<hostname-id>` and the placeholder id) persist as ghosts (F-3). Discharged, with F-3/F-4 recorded.
- **This story's own runs carry no machine name.** `132/runs/<hostname-id>/20260922T205439255Z-0000.json`
  (untracked, from refine) was **renamed** to `runs/node-7297/` with its `node` key rewritten to
  `node-7297`, the same hand-fix as 615678a. The hostname stem now appears in 0 paths and 0 files
  under `runs/`. `aof work run-status 132` still answers both records. `git ls-files` names no run
  record carrying a live machine name (184 then under the placeholder segment, since renamed to `runs/node-7297/`, and 5 under
  `umamis-mac-mini`, baselined). Discharged.
- **Outstanding, not assumed done.** The **WSL node** WAS re-identified with the same verb,
  `<wsl-hostname-id>` → `node-2976` (invalidated: its node record and `mesh.credential`; second run a
  no-op; the tree was synced by `scripts/deploy-wsl.sh`). It is **not re-joined and no daemon was
  started**: the guest cannot reach `192.168.1.102:4182` (F-4), so its enrollment credential is
  still keyed by the old id. The **Mac worker** is untouched. It still carries `<mac-hostname-id>`,
  and its `relay.controlNode` still names this node's old id. It needs `--reidentify`, a re-join
  and an operator-side restart. No fleet-wide migration is claimed. Discharged.

## Findings

| id | observed | type | severity | triage | routed-to | status |
|---|---|---|---|---|---|---|
| F-1 | Task 04 assumed a hostname-derived sidecar, but the control node was hand-pinned to a post-scrub placeholder id (615678a) after refine; `--reidentify` refuses a pinned id. | contract-drift | blocker | operator chose the opaque form; the sidecar was restored to its legacy shape and re-identified with the real verb | operator | closed |
| F-2 | `aof mesh identity --name` changes a node's id without the invalidation report `--reidentify` gives. The 09-22 hand-pin left `mesh.relay.controlNode` naming the old id, so `isControlNode` read false and the desktop supervisor never started `:4182`. The operator's relaunch (00:08:54Z) came up without a control daemon and said nothing about it; any restart after the pin would have done the same. "Re-identification is one deliberate edge" does not hold while `--name` is a second, silent one. | defect | blocker | fixed in this item (task 05): a `--name` that moves an id answers the re-identification envelope through the scan `--reidentify` uses, and repairs nothing (task 01 ruling 4) | 132 task 05 | closed |
| F-3 | No verb retires a node record keyed by an old id. `--reidentify` names `nodes/<old>.json` as stale, but the row stays in the fleet, and the direct fabric marks it `online: true` because its address still resolves. | gap | non-blocker | pending operator triage | operator | open |
| F-4 | The WSL guest cannot reach `192.168.1.102` (a TCP probe to `:4182` and `:135` both time out; the vEthernet gateway `172.27.144.1:135` answers). `.claude/rules/build-deploy-restart.md` records the opposite (measured 2026-07-27). `:4182` binds loopback + LAN only, so the WSL node cannot enroll. | environment | non-blocker | operator: host networking (weak-host / `mirrored` WSL networking) or a control bind that includes the vEthernet address | operator | open |

## Accept decision

**ACCEPTED** (2026-09-23). Tasks 00–05 are discharged. F-1 and F-2 are closed. F-3 and F-4 are open non-blockers
for the operator. `aof work validate 132` passes, and `aof work doctor 132` reports no `control-unresolved`.
