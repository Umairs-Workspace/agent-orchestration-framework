# 180/02 · aof work update rewrites an old-shape memory config to the new node, and aof work init writes only the new shape — example map

## R1 · `aof work update` moves every old memory key into the node, and touches nothing else
- E1 · `{"name":"p","resources":[],"graph":{"share":"git-refs","remote":"upstream"},"work":{"dir":"./wiki/work"},"memory":{"backend":"local","sources":["claude-auto-memory"],"graphify":{"extractionBackend":"ollama"}}}` becomes `{"name":"p","resources":[],"work":{"dir":"./wiki/work"},"memory":{"backend":"local","corpora":["work","imports","code","operator"],"graph":{"share":"git-refs","remote":"upstream"},"backends":{"graphify":{"extractionBackend":"ollama"}}}}`, with three moves reported [proposed]
- E2 · `{"name":"p","resources":[],"graph":{"share":"off"},"work":{"dir":"./wiki/work"}}` has no memory node, so `{"memory":{"graph":{"share":"off"}}}` takes the place where `graph` stood, between `resources` and `work` [proposed]
- E3 · `"sources":[]` is removed, and no `corpora` key is written [proposed]
- E4 · A config whose `work`, `mesh` and `settings` sections are set: after the update each serializes byte for byte as before [proposed]

## R2 · A config with nothing old is not written, a second run is a no-op, and a dry run writes nothing
- E5 · A new-shape config: update reports no memory move, and the file's bytes and mtime are unchanged [proposed]
- E6 · Running update twice over E1's config: the second run reports no move and writes nothing [proposed]
- E7 · `aof work update --dry-run` over E1's config lists the three moves, and the file is unchanged [proposed]

## R3 · A setting spelled both ways is reported and left exactly as written
- E8 · `{"graph":{"share":"off"},"memory":{"graph":{"share":"git-refs"},"sources":["claude-auto-memory"]}}`: the `graph` pair is reported as a conflict and both copies stay, and `sources` still moves to `corpora` [proposed]

## R4 · `aof work init` writes only the new shape, and selects `local` for a new project
- E9 · `aof work init-config` in a directory with no config writes the memory node `{"backend":"local"}` and no `sources`, `graphify` or root `graph` [stated Q1]
- E10 · `aof work init-config` over E1's old-shape config keeps `backend: "local"`, moves nothing, and leaves the old keys for update [proposed]

## Questions
- Q1 · business · answered · (Answer, 2026-10-30: `local`.) Which memory backend should `aof work init` select for a new project? Today it selects `graphify`. With graphify, every `aof memory ingest` sends the work stream (`wiki/work`) to Claude through the `claude-cli` extractor, and 177 measured that this changed 0 of 200 recalls. The milestone's SPEC says the work stream must not be sent to a hosted model by default. `local` sends nothing and serves the same records, and the `/aof:init` command text changes with it. Keeping `graphify` leaves new projects sending until the `retire-graphify-memory-backend` milestone lands. Existing projects keep whatever they selected either way.
- Q2 · technical · defaulted STATE.md · Does update also migrate the global `~/.aof/aof.config.json`? No. It migrates the project config it already reads, the one `aof work update` is run in. The global config is out of this milestone's scope.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-006 · What does update do with a config that does not parse? What it does today. `updateWork` already reads the config for the work dir and fails on unparsable JSON before this step runs, and this story does not change that.
