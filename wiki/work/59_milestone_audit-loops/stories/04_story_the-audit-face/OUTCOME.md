# 04 · The audit face — Outcome

## Delivered

### One command over every instrument
`aof work audit [scope] [--json] [--strict]` is registered on the same command core `work:doctor`
sits on, with a derived route and a CLI↔registry bijection, and runs every lane in the audit's lane
registry: the census, the evidence re-run and the registry checks. The report says which lanes ran
and what each of them read. A scope narrows what is audited and is named in the report; a scope that
matches nothing produces an empty report rather than an error.

### `--strict` is the door into the gate, and it promotes nothing
`work:audit` exits 0 on an error finding without the flag and 0 on a warning even under it, gating
only on `--strict` **and** an error. That is deliberately not `work:doctor`'s policy, which gates on
an error either way and promotes a warning under `--strict`: the two tables differ in exactly the
cells `error`/no-flag and `warn`/`--strict`. The finding set is identical with and without the flag
on both commands, and `--json`'s `healthy` agrees with the exit code.

### Bad news is addressed to the reference-owner and never to the audited loop
Every finding carries `about` (the instrument) and `to` (who hears). The addressee is computed: the
instrument resolves to the loops that own it, each owner's `target-setting` source is the audience,
and any candidate that is itself an owner is subtracted. Over the shipped registry no finding's
addressee is a loop that owns the instrument the finding is about, and addressing does not vary with
severity — severity says how bad, addressing says who hears.

### An escalation channel the audited loop cannot absorb
A finding whose code is in the escalating set reaches the auditor's declared `escalation:` actor as a
**second** addressee, with the owner's copy still present. Where no reference-owner resolves, the
finding escalates rather than being dropped. The bypass terminates at an actor whose `ground:` is
exogenous, never at another loop.

### A day-one auditor, shipped and admissible
`src/bundle/loops/instrument-audit.md` is the framework's own auditor, written in 59/00's grammar.
Every pointer in its `audits:` resolves to a file, a registered command or a declared node and none
is a work item; its `measurement` is a registered command and cites no document as its authority; it
declares no `reporting` edge to anything in its own `audits:`; and the shipped registry produces zero
gating findings. Its cadence is declared (`event:per-milestone`) and nothing schedules it — the audit
is runnable on demand and the record says so rather than implying a scheduler that does not exist.

### Every declared limit is stated in the face, in one shape across all lanes
A lane's limit — the sentence saying what this run could not see — is one record
(`src/work-audit/reads.mjs`: `LIMIT_KEYS`, `limitRecord`, `limitDeclarationProblems`), complete by
construction, refused at construction and again at lane assembly. The human face renders every
declared limit with its own text, attributed to the lane and the sweep it qualifies; the two faces
carry the same limits; and a clean lane still states its limit, which is the case the limit exists
for.

## Assumptions

- **The audit is declared, not scheduled** — the frozen five-row cost ladder is a delivered
  acceptance criterion (54/FF-5409) and gains no `work:audit` rung here, so the cadence on the
  auditor's record is honoured by a later trigger and by nothing today.
- **A bare run is expensive by design** — the census spawns a child that imports the whole assembled
  suite, and the evidence lane one bounded child per (register row, cited control) across every item
  carrying an `ARCHITECTURE.md`. The task contract requires every registered lane to run on a bare
  invocation, so the cost is disclosed in the report's limits rather than bounded by default.
- **Addressing rests on the registry's `target-setting` edges being right** — the resolver is correct
  transitively, and the control checks the shipped registry rather than the function alone, so a bad
  edge is caught as a finding about the registry rather than hidden by a correct resolver.

## Gaps

### Nothing triggers the audit at its declared cadence
- **Status:** open
- **Discharge condition:** milestone 63 lands the event trigger that honours `event:per-milestone`.
The auditor declares how often its instruments should be checked and no scheduler exists; until then
the audit runs when an operator or a loop invokes the verb.

### A bare run's cost is disclosed rather than bounded
- **Status:** open
- **Discharge condition:** a ruling at milestone 77, which extends this same command, on whether a
bare run should be bounded by default or whether the cost should be printed before it is paid.
59/02's own note reserves the expensive tier for an explicit scope while the task contract requires
every lane to run bare; the contract won, and the report's limits are the only mitigation.
