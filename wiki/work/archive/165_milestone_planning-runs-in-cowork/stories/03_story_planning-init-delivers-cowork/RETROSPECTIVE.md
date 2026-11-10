---
doc: retrospective
promotionFrom: 1
---
# 165/03 · Planning init delivers Cowork — retrospective

## R1 · Where the packages go was defaulted as a technical question, and the operator overturned it

**Kind:** mistake · **Area:** contract · **Stage:** refine · **Owner:** product-owner · **Raised by:** operator (verify) · **Promoted to:** none

**What happened:** Refine recorded Q4 ("Where do the packages go?") as `technical · defaulted
ADR-005` and put them in each project's `.aof/cowork/`. That default then forced Q2 (keep a
per-repo `.gitignore`). At verify the operator asked why files that are the same for every
project, and that Cowork installs to the account, lived in every repo. 03 was reopened, its
contract amended (ADR-006: once, in the aof home), rebuilt and re-gated.

**Why:** The question was classified by who could answer it (an architect could), not by who
lives with the answer. The answer decides where the operator finds, uploads and cleans up
files, and what a teammate sees in their repo.

**Lesson:** A question whose answer changes where the operator finds or manages something is a
business question and is asked, even when a sensible technical default exists. And a second
question that only exists because of a default (Q2 here) is a sign the default needs asking.

**Refs:** ../../VERIFICATION.md (165/03 amendment); ../../ARCHITECTURE.md ADR-006; EXAMPLES.md Q4.

## R2 · Without the CLI, the preamble's skip rule contradicted the body's validate gate

**Kind:** mistake · **Area:** contract · **Stage:** verify · **Owner:** architect · **Raised by:** operator (`@uat` E5) · **Promoted to:** none

**What happened:** The cowork preamble said to skip every `aof` step when the CLI is absent.
Shatter's step 6 says validate must pass before it finishes. A Cowork run therefore always ended
in a state the skill itself calls blocking. Only the live run showed it. Fixed at the close: the
preamble now says a check that did not run is not a failed one, so the run marks its report
unvalidated (E12, F-04).

**Why:** The preamble was written against the steps that WRITE (number, status, commit, promote)
and read none of the steps that GATE. A missing capability changes what "done" can mean, not
only what may be written.

**Lesson:** A preamble that disables a class of steps is read against every gate in the bodies it
wraps. Each gate says what happens when its check cannot run.

**Refs:** ../../VERIFICATION.md F-04.

## R3 · A run minted with no session could not carry the operator's answer

**Kind:** near-miss (recurring) · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** verifier (doctor) · **Recurs:** 149/R1 · **Promoted to:** none

**What happened:** The rebuild's run was minted long after the prompt that invoked the phase, so
it carried no `sessionId`. The doctor's example-answers rung then read no recorded Q4 answer and
went red on four provenance findings. The run was cancelled and re-minted with `--session`, and
the answer was stamped at settle.

**Why:** The session id is readable only for seconds after the invoking prompt. A run minted
mid-conversation (here, a story reopened inside a verify) falls outside that window.

**Lesson:** A run minted anywhere but the top of a phase passes `--session` explicitly, and reads
`sessionSource` in the envelope before going on.

**Refs:** runs/node-7297/20261020T111152261Z-0001.json (cancelled), 20261020T113249125Z-0002.json.

## R4 · The write set missed the runtime audit and the command inventory

**Kind:** mistake (recurring) · **Area:** contract · **Stage:** refine · **Owner:** architect · **Raised by:** developer (importer sweep) · **Recurs:** 160/00/R1 · **Promoted to:** none

**What happened:** `scripts/workspace-runtime-audit.json` keys each reviewed spawn by a digest of
the call and of its whole source file. So every edit to `planning-init.mjs` turned its entries
stale, and 02's new clone needed entries of its own. `test/fixtures/application/command-inventory.json`
snapshots the usage and flag text this story changed. Neither was in `files:`, and both were
found by the importer sweep rather than the story's own suites. The amendment then listed the
fixture in `files:` from the start.

**Why:** Both files are keyed to the content of other files, so they change when those do, and
the plan listed only the modules whose behaviour changed.

**Lesson:** A story that edits a module containing an audited spawn lists
`workspace-runtime-audit.json`. A story that edits a CLI face lists `command-inventory.json`.

**Refs:** ../../STATE.md Feedback (165/03).
