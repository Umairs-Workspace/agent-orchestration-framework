<objective>
**The operator builds, and this session hands them a guide.** `$aof-continue` decides which agents
build a story; `$aof-manual` says the operator does. Start the story through the build door, run its
tests once, print a guide to building it, close the run and hand the operator to `$aof-review <ref>`.
Build nothing.
</objective>

<config>
Read `.aof/aof.config.json` → `work.dir`. Parse `$ARGUMENTS` into one item **ref**.

**This command takes no mode flag.** `--solo` and `--orchestrated` decide which agents build, and
here the operator builds, which leaves no agent to choose: either one is contradictory. STOP before
the door is called and before any run is minted, and report it. `--thinking <level>` is a stop for
the same reason — nothing here spawns a role whose effort it could set.
</config>

<process>
1. **Enter through the build door — this command's first act.** Run
   `aof work continue <ref> --manual --json`. The door's refusals are code, not this prose, and the
   door makes the starting status move. **Nothing is minted after a door refusal**, and nothing else
   in this process runs:
   - **One story or one task, never more.** A `continue-manual-not-a-story` refusal for a milestone
     or a `NN/MM-PP` span runs `aof work next <ref> --json` and names the ready stories it answers,
     to take one at a time as `$aof-manual <story>`. Mint nothing, move nothing, and stop.
   - A `continue-manual-remote` refusal means the decision would send the story to another node; a
     manual session runs here, where the operator builds. Report it and stop.
   - Any other refusal (`phase-backlog-ref`, `ref-not-found`, a before-build check) is reported as the
     door gave it, and the session stops.
   - An answer `where: "running"` says where the story already runs. Say where, and stop — watching
     is not building.
   - An answer `where: "local"` names this command in its `command`, and the story is started.
     Carry on.
2. **Never carry on an agent build.** This session does not walk the re-entry sweep and never runs
   `aof work resume`: a lineage an agent left is not the operator's to inherit. Nothing here reads a
   mode from a run record or a transcript, so **a resumed session is not a manual session until
   `$aof-manual <ref>` is invoked again**.
3. **Read the story exactly as continue's story lane step 1 reads it, and no wider** — its `reads:`
   set under `continue`'s `<read_depth>`, and its task features. A story whose `reads:` is absent,
   or whose tasks are thin or untagged, halts and sends the operator to `$aof-refine <ref>`, exactly
   as step 1 does.
4. **Mint the run with `aof work run-start <ref> --json` before the guide is printed** — continue's
   story lane step 2, whose `run.started` reactor would start a story the door had not. **The
   session writes no status move of its own.** A `duplicate-run` refusal from
   `aof work run-start <ref> --json` means another run on this story is still open — an agent's, or
   a phase that died. Report it and the session stops: it never resumes or settles that run.
5. **Every manual run runs `aof test --scope impacted --story <ref>` once, before the guide** — the
   first run and every re-run alike, so the guide is always headed by what is still red.
6. **Print the guide, with its parts in this order:**
   - the scenarios still red, by name;
   - the user story;
   - each task file with its scenario names, read from `aof work tasks <ref> --json`;
   - every `reads:` entry and every `files:` entry, each with one line on why it matters;
   - the test files among `files:`, and the command `aof test --scope impacted --story <ref>` that
     gates them;
   - the build plan's mechanism and known traps, when the story has a `PLAN.md`;
   - an order to take the tasks in, with the reason for it.

   When every scenario is green the guide says so, and names `$aof-review <ref>` as the next step.
7. **The guide is printed in the terminal only**, and no guide file is written to the story folder:
   a re-run prints it again, current, from the same sources.
8. **Build nothing.** No `aof-developer` is spawned, and no file outside the item's own folder is
   written. No gate ladder is walked and no reviewer is spawned: reviewing the operator's build is
   `$aof-review`'s.
9. **Close the run with `aof work run-complete <ref> --outcome done` after the guide is printed**,
   then stop. Never `--outcome failed`: `run.completed` rolls a failed story back to `not-started`,
   which would undo the story the operator just started.
</process>

<hand_off>
**A hand-off to an agent is whole-story, and it is written down.** When the human asks, in any turn,
to hand the story to an agent, the session appends a hand-off entry under
`## Notes & decisions in flight` in the item's `STATE.md` — **the STATE is the parent milestone's for
a nested story, and the story's own for a standalone one.** The entry opens
`- <date> — Hand-off <ref> from manual:`, then lists the `files:` the human changed, their commits
since the run was minted, and the scenarios green and red at that moment (run
`aof test --scope impacted --story <ref>` for them). The entry is a record in the item's own folder,
never a write under `files:`.

**A standalone task has no `STATE.md`, so its hand-off is reported in the terminal and nothing is
written.**

If this session's run is still open, close it `done`. The session then names `$aof-continue <ref>`
and does not run it: the agent's build is a new session, which reads the entry at its story lane's
step 1. The entry informs that build; it never confers a mode.
</hand_off>

<output>
Report which outcome this was, and the command that follows it:

- **guided: `<ref>` is yours to build** — the guide was printed and nothing was built. Next:
  `$aof-review <ref>`, once the operator's build is green — never `$aof-verify`.
- **handed off: `<ref>` to an agent** — the hand-off entry was written (or, for a standalone task,
  reported). Next: `$aof-continue <ref>`.
- **stopped: refused at the door** — name the refusal code, and for a milestone or span the ready
  stories to take one at a time. Nothing was minted.
- **stopped: `<ref>` unrefined** — its contract is not authored/tagged. Next: `$aof-refine <ref>`.
- **stopped: a run is open** — `run-start` answered `duplicate-run`. Name the open run, and say this
  session did not carry it on.
</output>