# 204/00 · Every asset kind applies to its committed baseline — build plan

Advisory and the builder's own. The task features are the contract.

## Mechanism

Two pieces: a lane as data over 203's harness, and one fix in the Codex TOML merge.

**The lane.** Copy the shape of 203's init lane. The lane module exports the lane and also
`EVERY_KIND`, the fixture as a map from project path to text, because stories 01 and 02 import it.
Write the config as formatted JSON from an object literal, so it reads like ADR-001 §1. The asset
bodies sit where `assets add` puts them (`.aof/assets/<plural>/<id>/<KIND>.md`, one line of body
each). The workflow's body is a file too. A runtime-alone scenario's argv is `assets apply
--runtime <one> --json`. Register the lane and its suite as 203's stories did.

**The TOML fix.** `mergeToml` collects additions per table, then inserts each at an offset. Into
an empty file every insertion lands at offset 0, and the reverse-offset application then reverses
their order, so the top-level `model` line ends up after the last table header. Insert top-level
additions before the first table header, and break offset ties so the result keeps the render's
order. Then make the re-index after the merge check that every owned entry sits under the table its
key names, refusing otherwise. Prove it at the seam first: a case in the Codex ownership suite
merging `model` plus two server tables into an empty file, parsed back by the same index. Over a
user's file that already has a top-level key, the placement is already right, as measured. Keep
that case green too.

Then write the baselines once with `node scripts/golden.mjs --lane assets-apply --update`, and
read `every-kind`'s Codex config before committing.

## Verification step

From a clean state: `node scripts/golden.mjs --lane assets-apply` passes, a second `--update`
writes nothing, and `git status` is clean. Run the 203 lanes too
(`node scripts/golden.mjs --lane work-init` and `--lane work-update`). If one moves, its diff
must be the TOML placement and nothing else. Run the Codex ownership suite by file.

## Out of scope

- `CLAUDE.md` and `.mcp.json` as merges. That is story 01, and it moves this lane's baselines.
- Stopping a single-runtime apply from writing Claude settings or Codex's config (ADR-006 §3).
  Hold what it writes.
- `--global`. Story 03.

## Known traps

- A command on Codex makes apply refuse the whole config (`unsupported-runtime-capability`). The
  fixture's command names claude and opencode only.
- An unscoped rule renders to the root `AGENTS.md` for Codex and collides with the project doc.
  The rule's `paths: ["src"]` is what keeps it apart.
- `assets apply` without `--runtime` takes the config's `runtimes`. Keep all three there.
- The lane suite and the lane module are two new children of the golden test directory. Move its
  budget row by two in this diff.
