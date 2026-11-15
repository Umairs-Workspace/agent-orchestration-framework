# 193/02 · The operator says who they are — Outcome

## Delivered

### The operator profile
`work.operator` holds a free-text `role` of at most 500 characters and an `expertise` map from domain to `expert`, `working` or `new`. The schema and the config validator accept it in a project's `.aof/aof.config.json` and in the global `~/.aof/aof.config.json`, and name each malformed value.

### A project overrides the machine-wide default, key by key
`loadWorkspace` lays the global `work.operator` under the project's. The project's `role` replaces the global one, and its `expertise` entries replace the global entry for the same domain and leave the others standing.

### A domain nobody listed is new
`operatorLevel` answers a domain the resolved profile does not list as `new`.

### The profile has one home
`@aof/contracts/operator-profile` is the only runtime module that spells the three levels or reads `work.operator` from a config (FF-19203). Core, the doctor and `init-config` all ask it.

### The resolved profile is readable, with its source
`aof project show` (and `--json`) answers the resolved role and each domain's level, each with the file it came from: the project or the global config.

## Assumptions

- **The project's `work` is an object or absent** — for a project config whose `work` is any other value (which the validator refuses), `project show` names the global profile while the loaded workspace carries none.
