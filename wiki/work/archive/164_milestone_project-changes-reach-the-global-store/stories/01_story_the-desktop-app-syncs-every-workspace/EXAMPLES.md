# 164/01 · The desktop app syncs every workspace and catches up when it starts — example map

## R1 · While the app runs, every registered workspace is synced on every tick
- E1 · The aof and aof-test-repo workspaces are registered on node-7297, and the daemon was launched from a folder with no aof config; I hand-edit a status in aof-test-repo: within one tick the store holds the edit [proposed]
- E2 · Two workspaces are registered and only one changed since the last tick: only the changed one is marked and published [proposed]
- E3 · The launch folder is itself a registered workspace: it is synced once per tick, not twice [proposed]

## R2 · A workspace that cannot be synced is reported and skipped; the tick goes on
- E4 · A registered workspace's folder has been deleted: the tick reports it skipped (`workdir-missing`) and syncs the others [proposed]
- E5 · A registered workspace is not mesh-propagating (no `mesh.enabled`, no `mesh.repo.published`): it is skipped and reported, and nothing is written for it [proposed]
- E6 · The store cannot be opened on this tick: a warning is emitted, the daemon stays up, and the next tick tries again [proposed]

## R3 · A change made while the app was off lands when it starts
- E7 · The app is stopped; I `git pull` two commits into aof-test-repo and hand-edit 164/00 in aof; I start the app: both changes are in the store before the first tick fires [proposed]
- E8 · Nothing changed while the app was off: the start pass marks nothing [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-004 · Which workspaces does the tick cover? `resolveAggregationWorkspaces`: the registered set, plus the launch cwd when it is a workspace.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-004 · How is a missing or non-propagating workspace handled? Skipped, and reported through the launcher's warning sink.
