# 189/03 · Build brief

## Mechanism

`packages/learning/pilot/` holds three documents and two packs. Each pack is a self-contained aof
project: an `.aof/aof.config.json`, a small fixture codebase of a few modules the participant has not
seen (experienced developers, 03 Q1), and one standalone refined story. The story has its
`STORY.md`, an `EXAMPLES.md` and one `@executable` task feature, and its specs sit under the pack's
`test/` as `*.spec.mjs`. The pack also holds `reference/`, a solution file with the same path as the
stub, and `FACILITATOR.md`, with the held-out items, their answers and the delayed item.

The two packs should be the same kind of work in different domains: for example, one change to a
small CLI's argument parsing, and one to a small library's formatting rules. The scenario count,
the module count and the size of the change should match.

`pilot-kit.suite.mjs` copies each pack to a temporary directory, runs `node --test` over its specs,
swaps the reference in, and runs them again. It reads `CHECK_KINDS` and `CHECK_RESULTS` from
`@aof/learning/vocabulary` and does not spell them again. `aof work validate` runs inside the copy,
with `AOF_GLOBAL_HOME` isolated.

## Known traps

- The participant is the operator (04 Q1). Keep held-out content out of every document they review
  at 03: the protocol and the stories may name an item's kind, never its content.
- Do not name a pack file `*.test.mjs` or `*.suite.mjs`, and do not register the packs in any index.
- The directory budget needs rows for `packages/learning/pilot` and its packs, each with a stated
  reason.

## Verification

`pilot-kit.suite.mjs` is green, and both packs are red then green in it. The protocol is reviewed
against the SPEC's measure list.

## Out of scope

Running the pilot, and the report (04).
