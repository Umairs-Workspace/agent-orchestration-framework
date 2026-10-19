# 162 · A running loop is visible in the UI — verification

## Fitness functions

| id | enforced by | result | red probe |
| --- | --- | --- | --- |
| FF-16201 | test/arch/session/acd-loop-terminal-ingress.test.mjs; registered in test/arch/session/index.mjs | green at build (2026-10-17): static clauses over the real bridge, launcher and drive sources, plus a REAL loopback ingress driven by a real client | six plants, each asserted to land and to trip: a `0.0.0.0` host, an ungated upgrade, a reply sink on `message`, a `nodeId` read off the message, the child's id stamped on the control leg, and a drive child that no longer names its `loopRunId` |
| FF-16202 | test/arch/ui/acd-loop-pane-read-only.test.mjs; registered in test/arch/ui/index.mjs | green at build (2026-10-17): seven `loopRunId` shapes through the shipped home mount and the fleet mount, plus a sweep of `apps/ui/src` for the loop line's, the progress segment's and the threshold's homes | a home copy of `fleetLoopLines`, a re-typed `LOOP_QUIET_AFTER_MS`, and a surface re-pointed off the shared module each trip; the posture line's loop clause is pinned as shipped |

FF-16201 extends `acd-terminal-output-signal-source`: the ingress's worker forward (`frame:` in the
launcher's worker branch) is the gate's third enumerated host shape, and its producer ceiling moved
3 → 4 with this story's ADR named. Its own self-checks re-drive the ceiling at a fifth site and the
floor at one.

## Review at continue (2026-10-17, solo — every lens played inline)

Gate ladder: `aof work validate 162` clean; `aof work doctor 162` warnings only (the numbering gap is
this branch being cut from `main`, where 160/161 are not yet merged). One review round.

| lens | verdict | what it found |
| --- | --- | --- |
| architect | fixed in round 1 | **Blocker, fixed:** the ingress's address-file I/O sat in `terminal-relay-bridge.mjs`, which ADR-014 inv.3 keeps in-memory and fs-free, and the token check made the bridge a constant-time match surface where its `code ===` ENOENT checks read as a timing oracle. The file moved to the mesh store (`publishTerminalIngress` / `readTerminalIngress` / `withdrawTerminalIngress`, at `<aof home>/mesh/terminal-ingress.json`), and the bridge takes `publish` / `withdraw` / `readAddress` ports. ADR-001 §1's path, atomic write and per-start token stand unchanged. |
| QA | fixed in round 1 | E11 was driven through `spawnLaneDrive` only; it is now also asserted through the real wave (each lane's spawn carries the wave's printer and its own lane item). A re-statement beat already scheduled when a session ended could re-create the record the hook had removed; the statement now re-checks `ended` at write time. |
| craft | clean | — |
| design | INCONCLUSIVE | No DESIGN surface or mock baseline exists for the home's loop strip or the quiet tone (`text-amber-500`, the board's existing warning colour), so no render was judged. Produce a baseline to judge it. |

Recorded findings (not scheduled here; the PO registers them at `aof:verify`):

- Nit — two duration formatters spell one rule: `formatLoopDuration` (`apps/ui/src/components/loop-line.mjs`) and `formatDriveDuration` (`packages/work-loop/src/drive-status.mjs`). The UI cannot import the loop package, so each surface keeps its own.
- Nit — `packages/work-loop/src/commands/drive.mjs` gained the loop stream (~100 lines); it is the next extraction if the drive grows again.
- Nit — E8's warning tone is asserted as the line's `quiet` flag; the rendered class is not asserted.

Measured along the way: the importer sweep (5,666 cases over every suite index that reaches the changed
seams) surfaced only key-list and count pins this story moves — the session record's ninth key, the
loop entry's three, the producer count 3 → 4, the worker facade's configured closure 159 → 163 — plus
the desktop's captured fixtures, re-captured through the real producer (`view_model.rs`, eight
entries, `"loopRunId": null` appended and nothing else).

## Pending — operator-gated

- `@uat` (task 00) — the operator watches running loops stream on both machines. Needs the payload
  installed on the control node and the WSL worker and both daemons restarted.
