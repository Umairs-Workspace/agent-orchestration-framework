# 132 · Run records carry the node id, not the node name — Outcome

## Delivered

### Opaque derived node ids
A derived node id is `node-<installHash(salt)>` whatever the machine is called; the hostname is recorded as `derivedFrom` and never spelled into the id, and a pinned id still wins verbatim.

- **Two installs never share a salt** — the salt is a per-install `randomUUID()`, and a collision widens the same hash rather than reaching for the hostname.

### Legacy ids are recognised, and moved only on purpose
The load-time self-heal leaves a hostname-stem id untouched; `aof mesh identity --reidentify` is the explicit move to the opaque form and refuses a pinned id.

### Re-identification says what it strands
Both `--reidentify` and a `--name` that moves an existing id answer `{ from, to, changed, invalidated, record }` from one shared scan. The scan names the old id's node record, its enrollment credential (config and registry roster) and its control-node nomination, and neither verb repairs any of them.

- **The operator re-points what is reported** — a control node whose `mesh.relay.controlNode` still names its old id reads `isControlNode: false` at its next start, and the desktop supervisor then starts no `:4182`.

### The fabric joins on the declared machine name
A node record carries `hostname` (the machine name, kept in the aof home) beside `host` (the dial address), and `resolvePeers` joins fabric peers on it rather than on the id's spelling.

### Tracked run records name no machine
`test/arch/mesh/acd-run-records-name-no-machine.test.mjs` passes only when every tracked `runs/<node>/` segment and every record's `node` key is opaque or baselined. The baseline holds `umamis-mac-mini` → 5 alone and may only shrink.

### This control node runs as `node-7297`
The Windows control node's id is `node-7297`, and the tree's former placeholder segment (184 files) now sits under `runs/node-7297/`.

## Gaps

### The worker nodes still carry hostname-derived ids
- **Status:** open
- **Discharge condition:** the Mac worker and the WSL node each re-identified, re-joined, and listed in the fleet under an opaque id.
The WSL node is re-identified (`node-2976`) but not re-joined, because the guest cannot reach the control node's LAN address (132/F-4). The Mac is untouched.

### Node records under a retired id stay in the fleet
- **Status:** open
- **Discharge condition:** a verb that retires the node record (and presence) of an id a re-identification moved away from.
`--reidentify` names the old record as stale, but nothing removes it, and the direct fabric marks it online while its address resolves (132/F-3).
