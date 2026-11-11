# 189/00 · Build brief

## Mechanism

A second member in `@aof/learning`'s `assets/bundle.json`, copied from `teach`'s shape:
`kind: command`, `runtimes: ["claude"]`, `commandNamespace: "aof"`, `mapped: false`. 188's
practices registry already appends every member of the fragment, so no core module changes. Then
`aof work update` renders `.claude/commands/aof/grill-me.md`, and the censuses that count commands
move by one.

`grill-me.md`'s frame follows `explain.md`'s shape: a `<read_only>` region that says what it never
does, then `<config>`, `<process>` and `<output>`. Leave `<checks>` and `<summary>` as named, empty
regions with a one-line placeholder, for 01 to fill. Cut regions at line start, not first occurrence
(188 review 03 routing (c)).

FF-18901 copies `acd-continue-builds-only.test.mjs`'s structure. It exports a pure check over prompt
text, so the red-probe rows run it over planted text without touching the file. The verb allowlist is
matched on the `aof <verb>` token, so a prose phrase like "a passing review" never trips it.

## Known traps

- 188/02 found its write set short by about ten census files. This story's `files:` lists all of
  them, but run the impacted gate early. `graphify-out/graph.json` is fresh as of refine, so the gate
  may narrow this time.
- The arch command directory is at its ceiling (32). Its budget row moves to 33 with a reason, as
  188 did three times.
- `.opencode/` is tracked but outside this repo's lock (188 review 00 (b)). A Claude-only member
  needs no OpenCode render, so leave it alone.

## Verification

The bundle suite and FF-18901 are green, with one red probe recorded in VERIFICATION.md's register.
`aof work update --dry-run` plans `.claude/commands/aof/grill-me.md` and nothing for Codex.

## Out of scope

The check conversation itself (01), and Codex and OpenCode (ADR-001 §2).
