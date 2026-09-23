# 132 · Build brief

Advisory, for the builder. The contract is the task `.feature` scenarios; nothing here binds, and
a deviation from it is not a finding. The read and write sets live in `STORY.md`'s frontmatter and
are not repeated here.

## The mechanism

One seam carries this whole story: `deriveNodeId`'s five-rule precedence chain. Rule (1) — a pinned
or previously-persisted `config.mesh.nodeId` wins verbatim — is untouched, and it is what keeps
`--name` working and the WSL node's chosen name intact. Rule (2), "else the sanitized hostname
stem", is the disclosure, and retiring it collapses rules (2), (3) and (4) into one: the opaque
`node-<installHash(salt)>` form becomes the only derived shape, the empty-stem case stops being
special, and the collision arm survives only as a widening of the same hash. Because `salt` is a
`randomUUID()` minted per install, two installs on one machine already differ — which is the
hostname-collision problem the WSL node has (`/etc/wsl.conf` pins `hostname = aof-wsl` as the belt
to this braces) dissolving rather than being solved again.

Everything else in the story is a consequence of that one change, and each consequence is a place
where something currently reads the id's SPELLING rather than its identity:

- **The fabric join** matches a peer's Tailscale `HostName` against an index seeded partly from the
  id itself. An opaque id matches nothing there, and the record's `host` field cannot cover for it
  because it holds the advertised dial address when `--address` is pinned. The node record gains a
  declared machine name to join on. It lives in the aof home, so a name there is not a disclosure —
  that asymmetry is the whole point of the story and worth keeping in view while editing.
- **The self-heal** asks `isDerivationOf` whether a stored id is still producible under current
  rules, and re-derives when it is not. Change the rules and every live node answers "no" at the
  next workspace load — which every daemon, board face and CLI door performs. The predicate must
  keep recognising the legacy shapes; a second, narrower predicate answers the new question of
  whether an id is safe to commit. Splitting the two questions is what keeps the heal's existing
  triggers (a copied `.aof`, F-3302's rule change) working untouched.
- **Re-identification** is then a verb, not an emergent behaviour, and it reports the enrollment
  credential and node record keyed by the old id rather than quietly repairing them.

The run store is deliberately NOT in the write set. It already takes the node as injected data and
its read already unions node subdirectories by name, so old `runs/<hostname>/` folders keep
resolving with no migration. If a change starts to look necessary there, the seam has been cut in
the wrong place.

## The verification step

The end-to-end proof is task 04, and it is the only thing that actually demonstrates the story:
deploy with `node scripts/install-local.mjs --skip-ui`, have the **operator** quit and relaunch the
desktop app (never a force-kill, never a hand-started daemon), then re-identify this node, mint a
real run through the live CLI, and read the record on disk. The folder segment, the `node` key and
the fleet's peer join are all read at the source in a fresh process — an earlier step's output is
not evidence for a later one. Confirm too that `aof work run-status` still answers records from
both the old and the new segment, because that union is the claim that no history was lost.

Before that, the focused suites: run the identity, fabric and arch lanes through
`node scripts/test.mjs --only <files>` with `AOF_GLOBAL_HOME` set to a fresh temp dir. Never the
full suite on this machine.

## Out of scope

- Migrating the Mac worker and the WSL node. Both need the same verb and an operator-side restart;
  task 04 records them as outstanding and does not block on them.
- The loop's `--no-verify` lane commit (127/R7, routed to 129). This story removes the disclosure
  at its source rather than closing that gap.
- Scrubbing or renaming the 189 already-tracked records under the post-scrub placeholder segments.
  They carry no live machine name; the ratchet baselines them and only shrinks.
- Widening `.aof/private-terms.json` or the guard that reads it. It is a separate control and stays
  separate — putting a machine name into it would defeat its own design.
