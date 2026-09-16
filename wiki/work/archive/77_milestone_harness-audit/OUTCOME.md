# 77 · Harness audit — doctor for the machine, not the record — Outcome

<!--
  OUTCOME.md — what this item now delivers, the assumptions that delivery rests on, and the gaps it
  declared but did not fill. Authored EXCLUSIVELY by aof:verify at Accept (ADR-004) — never at insert,
  never by a developer/evidence subagent (verify owns record docs). States product STATE ("the system
  now IS X"), never motive ("we built X because Y" — that reasoning belongs in RETROSPECTIVE.md). This
  is an ADDITIONAL artifact: it carries no identity frontmatter and is never this item's record doc.
-->

<!-- MILESTONE-LEVEL. Each story states its own capability whole in its own OUTCOME; what follows is
     what is true of `aof work audit` AS A COMMAND that no single story's outcome states alone. Where
     a story owns a capability outright it is CITED (`m77/SS`), never restated. -->

## Delivered

### `aof work audit` audits the machine, not only the record
`aof work audit` carries **seven lanes and 33 finding codes**, four lanes and seven codes of them
added here, and its subject is now the harness that produces the records rather than the records
themselves — the sibling `aof work doctor` never grew, and `59/FF-5905` still refuses a shared code
between the two.

### The rules travel
Every rule this milestone adds runs against an **audited project's** installed layer rather than
against this checkout, and the command's own child programs resolve against the toolkit root while
its subject resolves against the audited root — so `aof work audit --strict` runs in a governed
project that is not an aof checkout at all (`m77/04`).

### The audit is clean over its own repository, and every error leg measures zero
`aof work audit --strict` exits **zero** here: 337 findings, all `warn`, with every error leg of the
seven codes added measuring zero on arrival. The 337 are a standing measurement of this repository —
262 duplicated prompt-document pairs, 9 capability gaps, 6 unwired seams, 5 undeclared bounds and 1
bound off the reference — not a backlog the command failed to clear.

### The command's report states what it could not see
Every lane declares a **read floor** and every text-basis sweep returns a **limit** naming its own
blindness, both enforced from the registry rather than per lane, so a lane that looked at nothing
cannot report the same thing as a lane that found nothing (`m77/00`, `m77/02`, `m77/05`).

### Three bespoke local gates became travelling rules
The capability gap, the duplicated instruction and the hook twin were each gated in this repository
alone before this milestone; each now has a form that runs wherever the bundle is installed, and the
repo-local gates they came from (`72/FF-7206` in particular) are unweakened and still in service.

### A versioned reference corpus ships in the payload
`src/harness-reference.mjs` carries six bounds other systems declare, each with a source URL and a
`checked` date, and the audit **joins** a project's declared bounds against it offline — the corpus
travels with `src/`, and the program that rewrites it is reachable from no CLI door (`m77/03`).

### The audit's code space is derived, so a fourth lane cannot arrive outside the disjointness check
`AUDITABLE_CODES` is computed from `REPORT_LANES` rather than enumerated, and the control that
asserts disjointness from doctor's codes reads that derived set — a lane added tomorrow is inside the
check on arrival (`m77/05`).

### Two ledgered debts are closed
`TECH_DEBT` items **70** and **72** are discharged: every program the audit family spawns is under
`src/`, named in one enumeration, and resolved against the toolkit root.

## Assumptions

- **The audited project installs an ACD prompt layer and a settings file** — the prompt-layer and
  hook-wiring lanes report `audit-ran-on-nothing` at `error` against a bare directory, which is those
  lanes' floors working rather than a failure; any project carrying an ACD bundle has both
  populations.
- **A grant is expressed as a `tools:` frontmatter key** — the capability rule reads that key and no
  other, so a runtime declaring its grant another way is reported as granting nothing (see the gap
  below).
- **A code graph artifact exists and is current** — the seam lane never builds one; without it, or
  for a candidate the graph does not hold, it reports a stated limit and never a clean seam.
- **The reference corpus's freshness is the installed payload's property, not the audited project's**
  — a stale corpus is a fact about the aof version in use, and the finding says so.
- **`--strict`'s exit code is the only thing `--strict` changes** — the finding set is identical at
  both settings.

## Gaps

### A grant expressed in a key other than `tools:`
- **Status:** open
- **Discharge condition:** a per-runtime grant source with its own acceptance criteria — a rule that
  reads Codex's absent key and OpenCode's `permission:` block as grants, rather than as silence.
The capability rule reads `tools:` alone. Measured on this repository, 6 of its 9 findings name a
role whose grant **is** declared, in a key the rule does not read; 3 are the true instance. The
lane's own limit states its under-reporting and is silent on this direction.

### `UNREGISTERED_BASELINE` is aof's own suite list, checked against the audited workspace
- **Status:** open
- **Discharge condition:** chore **99** — the exemption ledger stops being joined onto a subject that
  was never going to hold aof's suites.
A governed project receives `audit-baseline-stale` at **error** for suites it was never going to
have — measured, 2 of 6 error findings over a fixture workspace. `acd-audit-travels-two-roots` pins
the exception, so the control fails the day the chore lands rather than tolerating it silently.

### The reference corpus was authored, never re-fetched
- **Status:** open
- **Discharge condition:** chore **98** — one hand-run of `scripts/refresh-harness-reference.mjs`,
  confirming each row against its source.
Every row's `checked: 2026-09-03` records the day it was written. The audit path may not reach the
network by construction, so only the hand-run refresh can turn those dates into confirmations.

### The bounds join anchors its findings at a payload path
- **Status:** open
- **Discharge condition:** an anchor that resolves in the audited project, or a finding shape that
  carries no path for a corpus-side cause.
`report.address()` resolves a finding's `path` against the audited root, so the reference leg's
anchor (`src/harness-reference.mjs`) names a file that is not there in a governed project. The
message carries the truth; the rendered anchor does not.

### The scenario→case traceability join has no report to read
- **Status:** open
- **Discharge condition:** `work.rubric.report.path` declared in `.aof/aof.config.json`, pointing at
  the tier's TAP output.
`work.rubric.report` declares a format and a floor but no path, so `aof work doctor` reports
`rubric-join-unchecked` for every story and this milestone's 150 `@executable` scenarios are joined
to executed cases by nobody. The gate reports that it did not look, which is not the same as green.

### `FF-6601` still reads an error message inside an object literal as a keyword table
- **Status:** open
- **Discharge condition:** milestone 66's shape-3 narrowing, so a prose message is not a grammar.
This milestone moved its own message out of the way rather than narrowing another milestone's
control at its own accept gate. The gate's header still says an error message is exempt, and its
implementation still says otherwise, so the next module writing a Gherkin keyword into a message
string reds it.
