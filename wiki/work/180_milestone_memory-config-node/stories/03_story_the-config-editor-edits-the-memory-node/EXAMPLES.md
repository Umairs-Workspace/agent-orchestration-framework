# 180/03 · The config editor has a Memory section that shows the node in the new shape and saves only the new shape — example map

## R1 · The Memory section shows the node in the new shape, and names each old key the config still uses
- E1 · Config `{"memory":{"backend":"local"}}`: the textarea shows `{"backend":"local"}`, the sidebar count is `1`, and there is no notice [proposed]
- E2 · Config `{"graph":{"share":"git-refs"},"memory":{"backend":"local","sources":["claude-auto-memory"]}}`: the textarea shows `{"backend":"local","corpora":["work","imports","code","operator"],"graph":{"share":"git-refs"}}`, and the notice lists `memory.sources → memory.corpora` and `graph.share → memory.graph.share` [proposed]
- E3 · A config with no `memory` key: the textarea shows `{}`, and the count is `0` [proposed]

## R2 · Saving writes only the new shape and leaves every other section as it was
- E4 · Saving E2's textarea unchanged: the file's `memory` node is the shown node, and it has no `sources` key and no root `graph` [proposed]
- E5 · A config whose `work`, `mesh` and `resources` sections are set: after a Memory save each of those serializes byte for byte as before [proposed]

## R3 · An invalid or conflicting node is refused with the reader's own diagnostic, and nothing is written
- E6 · Saving `{"corpora":["work","code"]}`: the message reads the `invalid-memory-corpora` refusal, the file is unchanged, and the draft is kept [proposed]
- E7 · Config `{"graph":{"share":"off"},"memory":{"graph":{"share":"off"}}}`: the textarea shows `{"graph":{"share":"off"}}` as written, and the validation panel shows `memory-config-conflict` naming `graph` and `memory.graph` [proposed]

## Questions
- Q1 · technical · defaulted DESIGN.md · Does saving rewrite the old keys in the file? Yes. The section shows the new shape, so saving writes it. That is the same rewrite `aof work update` makes, and the notice says so before the save.
- Q2 · technical · defaulted DESIGN.md · Is the section shown in global scope? No. Sections are edited in project scope only, as today.
- Q3 · technical · defaulted ARCHITECTURE.md#adr-001 · On a conflicting config, which spelling does a save keep? The textarea's node. The root `graph` that the conflict names is removed, because the operator saved what they saw.
