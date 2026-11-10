# 146 · A capture can skip the backlog — build plan

## Mechanism

The seam is the intake step every top-level add prompt already carries ("Then the intake decides
whether it stays there", step 3 or 4). Today it branches on `work.intake` alone: `"backlog"` keeps
the capture, `"stream"` or an absent key runs `aof work promote <slug> --json`. Add one condition in
front of that branch: when the arguments carry `--in-stream`, run the same promote straight after
the scaffold, whatever `work.intake` says. No `--at`: the item is appended at the tail.

The scaffold step does not change. The capture is still written under `backlog/` first, so the one
mint stays `aof work promote` (127/ADR-003 §1) and the prompt never works out a number (FF-12703
leg (e) sweeps for that).

Parsing (EXAMPLES.md Q4, the default): `--in-stream` may appear anywhere in the arguments and is
removed before the slug and title are derived, the same way `in <group>` and `depends NN` are
consumed. Add it to each prompt's `argument-hint` as `[--in-stream]`.

The output section gains the switch case: report the minted ref, and the next step is the one the
stream path already names (`aof:refine <NN>` for a milestone or story; work the record doc and
`aof:verify <NN>` for a chore, spike or uat). A promote refusal is a stop: report it, and the item
stays in the backlog where it was scaffolded (promote.md step 4).

`add-story.md` applies the switch to a standalone story only — the existing "A NESTED story is not
promoted" sentence already covers the nested path; do not add a rule for it.

Then regenerate: `aof work update` renders the 15 copies and refreshes the lock; the bundle-manifest
generator (not `aof work update`) refreshes `manifest.json`. Commit the sources and the renders together.

## Verification step

The repo test runner with `--only` over the story's suite (its `files:` set) and the FF-12703 and
FF-12704 arch-tests (its `reads:` set), with `AOF_GLOBAL_HOME` isolated. Then `aof work update --dry-run --json` from the repo root must
report all 15 add-prompt copies as `skip`.

Task 01 (`@manual`): in a scratch copy of a project with `work.intake: "backlog"`, follow the
rendered `add-story` prompt with `--in-stream` and confirm the folder is `NN_story_<slug>` at the
work root. A capture that still sits in `backlog/` means the switch is described but not wired into
the intake step.

## Out of scope

- A position (`--in-stream at P`) — the operator settled tail-only; `aof:insert-*` and
  `aof:promote … at P` own placement.
- A reverse switch that keeps a capture in the backlog under a stream intake — dropped at refine.
- `add-task.md` and nested stories — neither has a stream number.
- Any CLI or `work.intake` reader change — FF-12704 keeps the key on the write side, and the
  prompts are already on its allow-list.
