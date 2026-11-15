# 191 · Discord drives the work from a phone — Outcome

## Delivered

### Work starts from Discord on a single-node laptop
On a laptop that is its own control node, the operator can do all of this with only Discord on a phone: start Claude in any served project and open it in the Claude app; list and end that session; start, stop and resume a supervised loop; and resume a halted loop with one tap. The operator ran each of these at the outsider check on 2026-11-15 (VERIFICATION, User sign-off). The pieces are the stories' own: m191/00 and m191/08 (the control hosts its own sessions), m191/01 (the launch), m191/02 and m191/03 (start, list and end), m191/04 (the start request), m191/05 and m191/06 (the commands) and m191/07 (the buttons).

### Every Discord action reaches the same verbs as the CLI
No Discord command or button starts a process or builds a frame of its own. Each one invokes a registered verb (`mesh:session-start|list|end`, `work:loop`, `work:answer`, `work:list`, `mesh:status`), and the verbs answer the CLI, the fleet and Discord alike (FF-19103, FF-19106, FF-19107).

## Assumptions

- **The desktop app is running on the control node** — starts and resumes are requests it honours on its next poll, and sessions are its daemons' children.
- **The project is registered with the machine's mesh** (`aof mesh repo publish`) — an unregistered project is neither offered nor served.
- **The node's `claude` is signed in, in the desktop app's own environment** — otherwise a session starts with no Remote Control link.
- **The channel has an `allow` list naming the operator** — without one, commands are refused and notifications carry no buttons.

## Gaps

### A control-local session cannot be resumed from the fleet
- **Status:** open
- **Discharge condition:** a `terminal-resume` frame for the control's own node reaches its local handler, or ADR-001 §2 rules a control-local session not resumable (191/F-04).
The router sends a resume for the control's own node to `dispatchDirective`, which refuses it as not connected.

### A loop started on a parentless story builds nothing
- **Status:** open
- **Discharge condition:** the readiness walk offers a parentless story as its own unit, or `/loop start` refuses one by name (191/F-13, m65/F-65-C).
`/loop start` on a parentless story reaches the supervisor, and the loop reports done without building.

### The supervisor relaunches a freshly started loop once
- **Status:** open
- **Discharge condition:** the supervisor reads a just-launched supervised loop as live, and launches no `--resume` copy beside it (191/F-15, m129/F-61).
About 30 s after a start, a duplicate `--resume` launch exits on the run-mint guard, so nothing runs twice.

### A multi-node control does not check workspace membership
- **Status:** open
- **Discharge condition:** the control's checkout seam also reads `global_node_workspaces` for its own membership, before a control serves workers' projects (191/F-10).
The control opens a served workspace whenever its registered folder exists on disk.
