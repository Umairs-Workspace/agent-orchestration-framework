# 204/01 · Apply's merges keep the user's entries — build plan

Advisory and the builder's own. The task features are the contract.

## Mechanism

The seam is the predicate that decides whether an output is co-authored. Today it asks for the
Codex runtime first. Make it a question about the path alone (ADR-002 §1), and give the render
plan one branch for co-authored outputs, whatever their runtime. That branch takes the steps
Codex's take now: the target preflight, the journal entry before the write, and ownership on the
lock entry. Keep the journal file and its format. Only which outputs enter it changes.

`CLAUDE.md` then takes the existing guidance merge unchanged. Its legacy branch (a prior entry
with no ownership and an unedited file) already gives E9.

`.mcp.json` needs a new merge beside the hooks merge, and the hooks merge is the template:
- parse both sides, refusing unparseable JSON;
- remove the servers recorded in prior ownership, refusing when one was edited;
- refuse when a desired id is already the user's;
- append aof's servers after the user's, and record each by id with the hash of its JSON;
- return the current text untouched when the value did not change.

Retraction (an output leaving the plan) must work for the new kind too, because story 02's clean
calls the same retraction.

Then add the `assets-merge` lane. `USER_FILES` holds the user's file at every merge point as
ADR-001 §3 lists, with the texts the map gives. The variant fixtures (`guide` on opencode only, a
user `docs` server) are derived from story 00's `EVERY_KIND` in this lane module, never copied.

## Verification step

Seam first: a render-plan or Codex ownership case for each of E6, E7, E9 and E11, then the
FF-20401 case. Then `node scripts/golden.mjs --lane assets-merge --update`, read every baseline,
and `--lane assets-apply --update`. That lane's diff must be only the `CLAUDE.md` block, the
ownership on two lock entries, and two journal entries. Run the 203 lanes. Neither should move,
because `work init` renders no `CLAUDE.md` or `.mcp.json`, and if one does, stop and look. Then
check the tree is clean after a second `--update`.

## Out of scope

- Clean. Story 02 retracts what this story records.
- `.claude/.gitignore` and the root `.gitignore`. Both are already kept.
- Two runtimes writing one `AGENTS.md`. It is held as a refusal (ADR-006 §2).

## Known traps

- The refusal must happen in planning, before any write. The executor refuses on the first
  `conflict` action, and the settings merge and the lock write come after it. The tree after a
  refused apply is the starting files exactly.
- A JSON merge that reserialises an unchanged user file is a diff the user did not ask for. The
  hooks merge returns `current` when the value is unchanged. Do the same.
- Opencode's `AGENTS.md` and Codex's resolve to the same path. They still collide in grouping
  (ADR-006 §2). Only a doc on opencode alone reaches the merge.
- The new lane is two more children of the golden test directory. Move its budget row by two.
