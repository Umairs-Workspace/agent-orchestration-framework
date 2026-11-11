# 180/01 · The memory node holds backend, corpora, graph and per-engine settings, and one module reads it in either spelling — example map

## R1 · Each setting has one home: the new spelling is read, the old one is read with a warning naming the new key, and both at once is refused
- E1 · `{"memory":{"backend":"local","graph":{"share":"git-refs"}}}`: sharing is on through `origin`, and nothing is reported as legacy [proposed]
- E2 · `{"graph":{"share":"git-refs","remote":"upstream"},"memory":{"backend":"local"}}`: sharing is on through `upstream`, and two legacy entries are reported, `graph.share → memory.graph.share` and `graph.remote → memory.graph.remote` [proposed]
- E3 · `{"graph":{"share":"off"},"memory":{"graph":{"share":"off"}}}`: refused with `memory-config-conflict` naming `graph` and `memory.graph`, although the two values agree [proposed]
- E4 · `{"memory":{"sources":["claude-autosave"]}}`: refused with `invalid-memory-sources` at path `memory.sources.0`, the key the author wrote [proposed]

## R2 · `corpora` names what memory serves: absent means work, imports and code, and only operator may be left out
- E5 · No `corpora` key: memory serves `work`, `imports` and `code`, reported as `default` [proposed]
- E6 · `"corpora":["work","imports","code","operator"]`: the operator's Claude auto-memory entries are indexed, exactly as `"sources":["claude-auto-memory"]` indexes them today [proposed]
- E7 · `"corpora":["work","code"]`: refused with `invalid-memory-corpora`, naming `imports` as always served and `memory.backend: "none"` as the way to turn memory off [proposed]
- E8 · `"corpora":["work","imports","code","planning"]`: refused with `invalid-memory-corpora` at `memory.corpora.3`, listing the four corpora aof knows [proposed]

## R3 · Engine settings sit under `backends`, the code graph's sharing under `memory.graph`, and no key configures egress
- E9 · `"backends":{"graphify":{"extractionBackend":"ollama"}}` with `backend: "graphify"`: status reports extractor `ollama`, source `project setting`, path `memory.backends.graphify.extractionBackend` [proposed]
- E10 · `"backends":{"graphify":{"extractionBackend":"codex"}}` with `backend: "local"`: refused with `invalid-memory-extraction-backend`, although graphify is not the active backend [proposed]
- E11 · `"backends":{"cognee":{}}`: refused, because `cognee` is not a registered engine [proposed]
- E12 · `"memory":{"graph":{"share":"git-refs"},"egress":"local-only"}`: refused by the schema, because no egress key exists [proposed]

## R4 · The faces print the new paths, and no other command's output changes
- E13 · `aof memory status` over a new-shape config adds exactly one line, `corpora: work, imports, code (default)`, and over a legacy config also prints one line per legacy key [proposed]
- E14 · `aof project doctor` over a legacy config lists a `memory-config-legacy` warning for `memory.sources`, and its `config-valid` check is still `ok` [proposed]
- E15 · `aof memory recall "pin line endings" --block` prints byte-identical output whether the config spells `sources` or `corpora` [proposed]

## Questions
- Q1 · technical · defaulted ARCHITECTURE.md#adr-002 · Can a corpus be turned off by leaving it out of `corpora`? No. The SPEC puts changing a key's meaning out of scope, and refusing the omission keeps every future meaning open.
- Q2 · technical · defaulted ARCHITECTURE.md#adr-001 · When both spellings of one setting are present and agree, is that accepted? No. Two homes is the defect, so it is refused with `memory-config-conflict`.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-001 · Where does the legacy warning appear? In config inspection, project doctor and memory status. Never in `recall`, `ingest`, `--block` or the graph verbs, whose output scripts parse.
- Q4 · technical · defaulted ARCHITECTURE.md#adr-005 · Is egress a per-corpus setting? No. It stays a reported classification, and the schema holds no egress key.
