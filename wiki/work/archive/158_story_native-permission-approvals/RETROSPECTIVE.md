---
doc: retrospective
promotionFrom: 1
---
# 158 · Native permission approvals — retrospective

## R1 · Include the controls that measure a changed owner

**Kind:** mistake · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** main-session verification · **Promoted to:** none

**What happened:** The full gate exposed missing ownership for the session directory
budget and enclosing process audit digests. An existing 25 ms native deadline test
also expired during setup. The completed impacted run had ten failures; narrow
repairs and a detached full rerun reduced that count to zero.

**Why:** The initial declaration followed implementation owners but omitted the
controls measuring those owners. The tiny timing budget included native setup,
so machine load could prevent reaching the behavior the assertion intended to test.

**Lesson:** Include control and audit owners before freezing the candidate, and
separate setup time from the behavior being tested. Report the earlier red gate
and bounded retries rather than treating repaired diagnostics as a full green.

**Refs:** STATE.md, Continuation progress; VERIFICATION.md, Continuation diagnostics;
runs/node-7297/20261011T193120275Z-0002.json; 154/R2 (related scope/freeze lesson).

Domain recall preceded triage. Recurrence returned qualifying null (score 0.101442,
threshold 0.23); no recurrence or completed prevention is claimed. The definitive
post-refresh delivery recall returned the three terminal discovery/refinement/build
runs, with the open verifier absent. It supersedes an early read made while ingest
was finishing; both returned the same three identities. Observability was refreshed
by the CLI but attributed no agent sessions, so native cost and stalls are unavailable.
The lesson is grounded in the retained STATE closure record.
