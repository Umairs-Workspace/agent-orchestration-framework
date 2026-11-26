# 209/04 · Daemon board access — example map

## R1 · The board check runs with the daemon's account and environment
- E1 · The terminal's az is signed in but the LaunchAgent's PATH has no signed-in az. The board-access check fails and says the daemon environment cannot sign in [proposed]
- E2 · Token minting succeeds in the daemon environment but the account cannot read the board's area (HTTP 403). The check fails and names board access, not sign-in [proposed]
- E3 · Sign-in and the board read both succeed in the daemon environment. The check passes and names the board it read [proposed]

## R2 · A project that keeps its tracking in files is never probed
- E4 · The node's only workspace has no work.store. The check reports -- and no board probe runs [proposed]
- E5 · The node serves one board workspace and one file workspace. Only the board workspace is probed and named [proposed]

## Questions
- Q1 · technical · defaulted ADR-004 · How does the check run in the daemon's environment? It runs the installed aof's read-only "work board-access" verb in that environment and reads its JSON answer.
- Q2 · technical · defaulted ADR-004 · Which environment is the daemon's when no LaunchAgent is registered? On Windows and WSL the supervisor inherits the environment "mesh desktop run" starts from, so the check uses the current one. On a Mac with no LaunchAgent it reports -- as daemon-claude-authenticated does.
- Q3 · technical · defaulted ADR-004 · Does a failed check refuse "mesh desktop run"? No. Both verbs report the preflight and neither refuses on a failure.
