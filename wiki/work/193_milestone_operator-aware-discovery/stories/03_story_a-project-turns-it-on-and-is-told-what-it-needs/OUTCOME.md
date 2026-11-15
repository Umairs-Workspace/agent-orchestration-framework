# 193/03 · A project turns it on and is told what it needs — Outcome

## Delivered

### Operator-aware discovery is off unless a project turns it on
`work.examples.operatorAware` is a boolean in the schema and the validator. `operatorAwareFromConfig` resolves it from the project's own config only: it is on only for a literal `true` there, and a value set in the global config does not turn it on.

### `init-config` turns it on and writes the operator's own words
`aof work init-config` takes `--operator-aware on|off`, `--operator-role <text>`, `--expertise <domain>=<level>,…` and `--global`. A profile flag replaces exactly the value it names, written through the profile's one home. `--global` writes the profile to the global config resolved from the caller's environment.

### The doctor says once that no profile is declared
With the switch on and no `work.operator` in the project or the global config, `aof work doctor` reports one `operator-profile-undeclared` warning, at the work directory, from its own lane (`operator-lane.mjs`). With the switch off it reports nothing.

### The update and the turn-on say it too
`aof work update` and `aof work init-config --operator-aware on` print the same sentence as the doctor, from the same function, when the switch is on with no profile.

## Assumptions

- **The global config is valid JSON when `--global` writes it** — over a global config that does not parse, `--global` fails with the parser's error, not a coded refusal, and writes nothing.
