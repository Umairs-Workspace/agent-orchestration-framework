# 169/01 · Integration packages are self-contained — Outcome

## Delivered

### Integration contribution seam
An integration package exports one contribution (`id`, `name`, `assets`, `commands`) and reaches core only through `packages/core/src/integrations.mjs`, the one core module that may import an integration package (FF-16901; Notion is the one named exception).

### Integration-owned bundle members
`readDescriptor()` appends each contribution's `assets/bundle.json` members to core's and reads their text from the owning package, both in dev and payload installs (the package's `assets/`) and in a packaged binary (`bundle/packages/<name>/` in the sidecar). A member id that core already declares is refused at load.
- **The packaged-binary sidecar is filled by `install-local.mjs` / `build-sea.mjs`** — the reader is tested against a hand-laid sidecar; the writers are not yet exercised by a test.

### The integration's render follows `work.integrations.<id>`
An integration's resources and assets render only when the project config has `work.integrations.<id>` (an empty object is enough) and are removed as aof-managed files on the next `aof work update` once it is gone; core's members are never gated.

### Hyperagent is an integration, not a runtime
The model knows exactly claude, codex and opencode; `--runtime hyperagent` is an unsupported runtime, and `packages/core/assets` holds no Hyperagent command, skill, planner instructions or variant (FF-16902).

### The plan-branch check runs on Windows
`aof work integrations hyperagent check` extracts a plan branch into a temporary checkout with a forward-slash `--prefix`, validates it there and removes it.

## Gaps

### Sidecar writer coverage
- **Status:** open
- **Discharge condition:** a payload install from this tree shows `aof --version` with the new build id, and `aof work integrations hyperagent package` run from it writes a package the doctor reads as `current`; or a test covers the sidecar copy.
The sidecar copy of an integration's assets in `install-local.mjs` and `build-sea.mjs` has no test of its own (169/VERIFICATION F-02). Since 169/02 the `package` verb reads its planner files through that copy too.

### Integration hooks and templates
- **Status:** open
- **Discharge condition:** an integration ships a hook or template, at which point the gate must cover those kinds too.
The `work.integrations` gate drops an integration's resources and assets only; an integration's hooks and templates would render ungated (169/VERIFICATION F-03).
