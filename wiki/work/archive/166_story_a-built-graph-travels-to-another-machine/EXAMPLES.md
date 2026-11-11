
# 166 · A built graph travels to another machine — example map
<!--
Measured at refine (2026-10-20, graphify 0.8.44 store copy, this repo's graphify-out, 29 MB):
graph.json and manifest.json key every file by its repo-relative path; the AST cache
(cache/ast/v<graphify-version>/<sha256>.json) keys by content hash + relative path, so it is
portable as-is. Two files are machine-local: cache/stat-index.json (keyed by ABSOLUTE path, a
size+mtime fast path that only ever skips a re-hash) and .graphify_root (the absolute scan root
of the last build; aof always names the root to `graphify update`, so it never reads it).
graphify deletes cache/ast/v* folders that are not its own version on its next run.
-->

## R1 · Export writes the codebase graph to the path the operator names
- E1 · With a built graph, `aof graph export D:/carry/aof.graph` writes one bundle file at that path holding graph.json, manifest.json, GRAPH_REPORT.md and graphify's cache, stamped with the source commit, the build time and the graphify version [proposed]
- E2 · `aof graph export` with no path is refused (`graph-export-no-path`); nothing is written [stated Q1]
- E3 · With no graph built yet, `aof graph export D:/carry/aof.graph` is refused (`graph-export-no-graph`), and the message names `aof graph build .` [proposed]
- E4 · `D:/carry/aof.graph` already exists: refused (`graph-export-target-exists`) unless `--force` is given [stated Q2]

## R2 · Import restores a bundle from the path the operator names, into the project it was built from
- E5 · On a clone with no graph, at the commit the bundle was built from, `aof graph import /mnt/usb/aof.graph` lays the bundle out at `<projectRoot>/graphify-out/`, and the next `aof graph build .` reuses the carried cache: no file is re-extracted, and it reports "Already current" [proposed]
- E6 · The clone already has a graph: refused (`graph-import-graph-exists`) unless `--force` is given; with `--force` the old graph is replaced whole, never merged [stated Q2]
- E7 · `/mnt/usb/aof.graph` does not exist, or is not an aof graph bundle: refused (`graph-import-not-a-bundle`); any graph already in the clone is left byte-identical [proposed]
- E8 · A bundle truncated mid-copy is refused the same way: nothing half-written is left in `graphify-out/` [proposed]
- E13 · A bundle exported from a project whose `mesh.workspaceId` is `9db1fd84f5895e38` is imported into a project with a different workspaceId: refused (`graph-import-wrong-project`), naming both projects, and `--force` does not override it [stated Q4]

## R3 · The receiver is told how stale the graph it imported is
- E9 · The bundle was built at commit `a816d6d`, and the clone's HEAD is 12 commits ahead of it: import reports the source commit, the graph's age and "12 commits behind HEAD" [proposed]
- E10 · The source commit is not in this clone (never fetched): import reports the commit and the age, and says the commit is not in this clone [proposed]
- E11 · The bundle was built by graphify 0.8.44 and this machine runs 0.9.5: import succeeds, and it warns that graphify will discard the carried cache, so the next build re-extracts everything [stated Q3]
- E14 · After the import, `aof graph impact` reports the build time the bundle was stamped with, never the time of the import [proposed]

## R4 · A bundle does not depend on the machine that built it
- E12 · Exported from `C:\Source\umami\aof` and imported into `/home/umami/source/aof`: no path from the source machine appears anywhere in the receiver's `graphify-out/` (`cache/stat-index.json` is left out, and `.graphify_root` is written for the receiving clone) [proposed]
- E15 · Exported from the Windows clone (CRLF working copy) and imported into the WSL clone (LF working copy) at the same commit: the next `aof graph build .` re-extracts no file, because import re-keys the carried cache to the receiving clone's line endings [proposed]

## Questions
- Q1 · business · answered · Must the bundle path always be given, or does export fall back to a default file when it is left out?
- Q2 · business · answered · When the target already holds something (the export file, or the clone's current graph), refuse unless --force, or overwrite?
- Q3 · business · answered · A bundle from a different graphify version: import it with a warning, or refuse it?
- Q4 · business · answered · A bundle from a different project: refuse it, or import it with a warning?
- Q5 · technical · defaulted PLAN.md · The bundle is one gzip file aof writes with node:zlib, not a folder and not a tar: no new dependency, and the file copies over USB, scp or a synced drive
- Q6 · technical · defaulted PLAN.md · Project identity is `mesh.workspaceId` from the committed config; a project with no workspaceId is identified by its root commit
- Q7 · technical · defaulted PLAN.md · Import stages into a sibling folder and renames it over `graphify-out/` only when the whole bundle has read cleanly
- Q8 · technical · defaulted PLAN.md · Import re-keys each carried cache entry by recomputing graphify's content key over the receiving clone's bytes (measured: a CRLF and an LF copy of a file extract identically; only the key differs)
