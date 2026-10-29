# 175/00 · Quit reaps the whole tree on macOS — example map

## R1 · Every kill the supervisor makes reaches the whole process group
- E1 · `mesh serve --serve` leads group 4101 and `mesh ui` leads group 4102; Quit is chosen: each group gets SIGTERM, both are gone within 1 s, and no SIGKILL is sent [proposed]
- E2 · Group 4101 is still alive 5 s after its SIGTERM: it gets SIGKILL, and group 4102, already gone, gets nothing more [proposed]
- E3 · A declaration's `work loop` leads group 4210 at Quit: it is signalled with the daemons, by the same ladder [proposed]
- E7 · A declaration's Stop reaches its last rung while its loop's `claude` child is alive in group 4210: both the loop and that child are killed [proposed]

## R2 · A terminate request, and the OS's own quit, are a Quit
- E4 · `kill -TERM <app pid>`: the app exits 0, and its groups are reaped as in E1 [proposed]
- E5 · The operator logs out: the app does not hold up the logout, and no `aof` process is left in the ended session [proposed]

## R3 · Closing the window still only hides it
- E6 · The window's `✕` is clicked: the window hides, the menu-bar icon stays, and both daemons keep running [proposed]

## R4 · The menu-bar icon is the way in
- E8 · Left-clicking the menu-bar icon opens the menu, and its Show window item opens the window [stated Q2]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-001 · How long is the grace between SIGTERM and SIGKILL? 5 s.
- Q2 · business · answered · On a Mac, what should a left-click on the menu-bar icon do? Today on Windows a left-click shows the window and a right-click opens the menu. Mac menu-bar apps usually open their menu on a left-click. (a) The left-click opens the menu, which has Show window; this is the Mac convention and needs one extra click to reach the window. (b) Keep the Windows behaviour: the left-click shows the window, and the menu is a right-click or Control-click; this is the same on both machines but unusual on a Mac. Answer (2026-10-28): (a) the left-click opens the menu.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-001 · Is a supervisor crash contained? No. It is deferred to ROADMAP.md, and the runbook gives the recovery.
