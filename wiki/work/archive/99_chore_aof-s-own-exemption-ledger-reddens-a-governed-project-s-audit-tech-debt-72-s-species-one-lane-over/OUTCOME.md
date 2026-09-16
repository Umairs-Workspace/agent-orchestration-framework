# 99 · aof's own exemption ledger reddens a governed project's audit — TECH_DEBT 72's species, one lane over — Outcome

## Delivered

### Exemption ledger scoped to the project it describes
`runCensus`'s `baseline` defaults to `null` and resolves to `UNREGISTERED_BASELINE` only when
`ledgerApplies(repoRoot)` holds, so `aof work audit` over any project that is not aof reports no
`audit-baseline-stale` finding for aof's own suites.

### Project identity, not install directory, decides the ledger
`ledgerApplies` matches the subject against `LEDGER_PROJECT` by directory identity with the install
or by the subject's own manifest name, so a payload install at `~/.aof/bin` — which ships `src/` and
no `test/` — still applies the ledger when it audits aof's own repository.

### `isToolkitRoot` as the toolkit's own root predicate
`src/work-audit/toolkit.mjs` exports `isToolkitRoot(subjectRoot, toolkit)`, a pure predicate deciding
by `path.relative`, so drive-letter and separator comparison is Node's single answer rather than each
caller's.

### A named baseline is honoured as given
A caller that passes `baseline` to `runCensus` receives exactly that list regardless of the subject
root, so the injection seam the audit lane's tests drive is unchanged.

## Gaps

### Config path to a project's own exemption ledger
- **Status:** open
- **Discharge condition:** a `.aof/aof.config.json` key that reaches `runCensus`'s `baseline`
  parameter for the audited workspace.

`runCensus` accepts an injected `baseline`, but no configuration surface reaches it, so a governed
project cannot declare exemptions of its own — its only ledger is the one aof applies to itself.
