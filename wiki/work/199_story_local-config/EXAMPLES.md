# 199 · Each person keeps their own settings in an uncommitted local config — example map
<!--
Drafted 2026-11-17 by the PO at refine's discovery beat. Grounding, measured the same day:
- Global and project config are layered in one place, loadWorkspace in
  packages/core/src/application/bindings/work.mjs:185-195 (mesh, notify channels, operator profile).
- Three read-merge-write copies of readConfig (work/delegation.mjs:45, work/headroom.mjs:66,
  work/orchestrator.mjs:123) read the project file raw. The render reads only the project file
  (192/ADR-003).
- A loop lane is a full checkout of committed files only (packages/mesh/src/worktrees.mjs:31), so an
  untracked local file is not in it.
Q1's answer (an allow-list) folds the earlier "a render is never changed" rule into R2: no
allow-listed key reaches a render. Provenance and loop lanes are folded into R1, the one rule about
which value wins and where it came from.
-->

## R1 · A key in the local file wins over the project file, which wins over the machine-wide file; each block keeps its own merge, and every value says which file it came from
- E1 · The project file says the operator's role is "Builds the mesh", and Sam's local file says "Product owner, new to the codebase": discovery pitches Sam's questions as "Product owner, new to the codebase" [proposed]
- E2 · The project says expertise mesh=expert, ui=working, and the local file says ui=new: Sam reads as mesh=expert, ui=new [proposed]
- E3 · There is no local file: every value is exactly what it is today [proposed]
- E4 · Sam's local file sets the operator role: config inspection lists `work.operator.role` as coming from the local file [proposed]
- E5 · Sam starts `aof work loop` from a checkout whose local role is "Product owner": the lane's discovery questions are pitched at "Product owner", though the lane's worktree has no local file of its own [proposed]

## R2 · The local file holds only the per-person keys `work.operator`, `work.notify.channels` and `work.agents.session.effort`
- E6 · The local file sets `work.operator`: it is honoured [stated Q1]
- E7 · The local file sets `work.intake: "stream"` while the project says `"backlog"`: the validator refuses it, names the key, and says it belongs in the project file [stated Q1]
- E8 · The local file sets `work.examples.enabled: true`: it is refused the same way, so no rendered command, and no runtime gate, ever differs between teammates [stated Q1]

## R3 · The local file is never committed
- E9 · `aof work init` or `aof work update` in a repository whose `.aof/.gitignore` lacks the entry: it adds `aof.config.local.json` [proposed]
- E10 · Git tracks `.aof/aof.config.local.json`: `aof work doctor` warns, and names `git rm --cached` as the fix [proposed]

## R4 · The operator profile is written to the local file by default
- E11 · Sam runs `aof work init-config --operator-role "Product owner"` with no local file yet: the file is created, the role is written to it, and the project file is unchanged [stated Q2]
- E12 · Sam runs the same command with `--project`: the role is written to the committed project file [stated Q2]
- E13 · A repository whose committed project file already holds `work.operator` (a one-person repository today): it is still read, beneath any local file [stated Q2]

## Questions
- Q1 · business · answered · Should the local file accept only an allow-list of per-person keys (proposed: `work.operator`, `work.notify.channels`, `work.agents.session.effort`), refusing anything else, or accept any key and report each override? Answer: the allow-list.
- Q2 · business · answered · Where does `init-config` write the operator profile by default: the local file always (the project file only with `--project`), or the project file unless `--local` is given? Answer: the local file, with `--project` for the committed file.
- Q3 · technical · defaulted STORY.md#notes · How does a lane find its starting checkout's local file? By resolving the main checkout through git's common directory, as the story's Notes say.
- Q4 · technical · defaulted STORY.md#notes · Where is the local layer applied? On top, in the one seam that already layers global under project (loadWorkspace).
- Q5 · technical · defaulted STORY.md#notes · How do tests supply a local file? As a fixture in the project directory under test, with `AOF_GLOBAL_HOME` isolated as today; it never reads a real checkout.
