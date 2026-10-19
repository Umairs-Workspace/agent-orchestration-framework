# 160/04 · The gate launches clean and dies with its session — example map

## R1 · The gate's suite inherits none of the session's GIT, CLAUDE or AOF variables
- E1 · A gate launched from VS Code with GIT_ASKPASS set: the suite's environment has no GIT_ASKPASS, and the clone-credential cases run as they do from a plain shell [proposed]
- E2 · A gate launched by a driven session carrying AOF_RUN_ID, AOF_RUN_ITEM_DIR and CLAUDECODE: none of the three reaches the suite, and the gate's keep-alive still beats [proposed]
- E3 · A gate launched with AOF_GLOBAL_HOME=/tmp/gh and git_dir=/x in lower case: AOF_GLOBAL_HOME reaches the suite, and git_dir does not [proposed]

## R2 · A stopped loop leaves no suite running
- E4 · A loop cancelled while its verify session's gate is 4 minutes into the suite: within a minute no unit process is left, and REGRESSION.md gains no row [proposed]
- E5 · A loop drained while its verify session's gate runs: the gate finishes and writes its row [proposed]
- E6 · A gate run by hand outside any loop: it watches no run, and runs to its end [proposed]

## Questions
- Q1 · technical · defaulted ADR-005 · Does a stopped gate write a row? No. A stop is not a test result, and the run record already carries the stop.
- Q2 · technical · defaulted ADR-005 · Which variables are removed? Every GIT_*, every CLAUDE*, and every AOF_* except AOF_GLOBAL_HOME, matched case-insensitively.
- Q3 · technical · defaulted ADR-005 · How does the gate learn of the stop? From its own run record, on the keep-alive beat. It reads no stop request.

<!--
No business question remains. The record answers each one: the SPEC names the variables and
the stop, and the 130 stop levels say what drain and cancel mean. The architect reviewed Q1 to Q3
as engineering choices.
-->
