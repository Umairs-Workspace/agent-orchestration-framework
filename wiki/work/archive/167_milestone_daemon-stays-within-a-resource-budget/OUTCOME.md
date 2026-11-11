# 167 · The daemon stays within a resource budget — Outcome

## Delivered

### The serving daemon holds its idle budget on a tree as large as aof's
On the Windows control node and in Linux, `mesh serve` idles under the 2% budget over a 1,800-doc tree with the motivating faults planted, and both daemons hold the 10% viewer-open budget with a viewer polling. This is proven by the soak (m167/04), which is one unit of the whole-tree regression gate. What makes it hold at the milestone level is the four stories together: a tree that has not changed is not walked (m167/07), not parsed (m167/01), not re-walked for runs (m167/06), and a permanent fault is not retried (m167/03).

### A daemon's cost is visible, attributed and watched from outside
What a daemon spends its time on is named by cause and workspace in `aof mesh status --json` and `aof work doctor` (m167/00), and an idle view asks almost nothing of it (m167/02). The desktop shows a sustained overrun and never acts on it (m167/05). The motivating 17-hour burn would now show in all three.

## Assumptions

- **Workers inherit the code, not the proof** — the Mac and WSL workers run the same daemon, but the budget is proven on the control node only (SPEC, out of scope).
- **The desktop supervisor's own status poll is outside both daemons** — it spawns `aof mesh status --json` every 3 s, a fresh Node process that neither the meter nor the guard sees.

## Gaps

### The desktop guard, observed live
- **Status:** open
- **Discharge condition:** a debug desktop build is restarted, and a daemon held over budget for more than 5 minutes turns the tray degraded and logs its entering line.
The guard is proven only in `cargo test` (m167/F-08).

### The supervisor's status poll is unmeasured
- **Status:** open
- **Discharge condition:** the cost of the desktop's 3-second `mesh status --json` spawn is measured, and it is either under budget or moved into a daemon.
It was named at refine and left out of scope.
