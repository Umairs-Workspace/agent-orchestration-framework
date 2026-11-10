---
type: story
number: 162
slug: a-running-loop-is-visible-in-the-ui
doc: retrospective
created: 2026-10-22
updated: 2026-10-22
schema: 1
aofVersion: 0.1.0
---
# 162 · Retrospective

The build was sound: every `@executable` scenario and both controls held at verify (633 cases), and
the live run showed the drive child stating its session exactly as designed. Every lesson below comes
from the accept leg — two days of it — and most of that time went on the environment, not the code.

## R1 — A later item's regression hid this story's surface, and the precondition did not see it

**Kind:** near-miss · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** main-session verification

The `@uat` precondition was measured as "the daemon runs a build that contains 162, and its ingress is
open". Both held, and the home still read "Nothing is running" over a live loop. 164 had changed the
daemon tick to publish only on change, so a quiet tree stopped refreshing `global_nodes.last_seen_at`
and every live node read `stale` after 60 s (F-05). 162's own tests could not catch it: they pass a
fixture payload to the home, not the status route over a quiet store.

**Carry:** for a UI `@uat`, measure the precondition where the UI reads it — fetch the route the page
fetches (`/api/mesh/status`) and check the nodes read `live` — not only that the daemon is up.

## R2 — Three environment faults stood between the build and the check, each found one at a time

**Kind:** blocker · **Area:** architecture · **Stage:** verify · **Owner:** mesh launcher owner · **Raised by:** main-session verification

The control node's `mesh.address` still named a LAN lease it no longer held, so its serve bound an
address nobody could reach. The worker dials the control's host from its **roster copy**, not
`relay.url`, and that copy is only refreshed over the stream it could not open — it can never heal
by itself. And the worker's `claude` login had expired, which would have burned every drive it took.
Each surfaced only after the previous one was fixed.

**Carry:** a mesh `@uat` preflight checks, in order, before any loop starts: the control binds an
address the worker can reach; the worker's roster host for the control equals that address; and
`claude -p` answers in the worker's daemon environment. The roster-copy deadlock is a defect worth
its own item: a worker should fall back to `relay.url` when its roster target cannot be dialled.

## R3 — The obvious one-home fix fought four fences that were each right

**Kind:** misunderstanding · **Area:** architecture · **Stage:** verify · **Owner:** architect · **Raised by:** main-session verification

F-01's "one formatter home in `@aof/messaging/form`" tripped 131/02's six-export form, the work-loop
kernel's import allowlist, arch/48's standalone copy of `loop-line.mjs`, and a module ceiling. Each
fence encoded a real decision (the form is the shape of an ask; the kernel imports no sibling; the line
module is copyable). Widening all four to land a two-line formatter would have bent four controls to
fit the code. Two copies held to agree by a control was the honest shape.

**Carry:** when a one-home move trips other items' controls, read what each control protects before
proposing to widen it; a fenced twin is a valid answer.

## R4 — A verify worktree outside the scratchpad was removed by another session

**Kind:** mistake · **Area:** process · **Stage:** verify · **Owner:** product-owner · **Raised by:** main-session verification

The sibling worktree `../aof-162-verify` disappeared mid-leg — another session's worktree clean-up —
taking one uncommitted edit with it. The committed work survived on the branch.

**Carry:** keep a verify worktree under this session's scratchpad, and commit at every finding.
