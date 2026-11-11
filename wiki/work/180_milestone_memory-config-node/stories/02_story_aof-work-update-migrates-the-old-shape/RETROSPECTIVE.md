---
doc: retrospective
promotionFrom: 1
---
# 02 · aof work update rewrites an old-shape memory config to the new node, and aof work init writes only the new shape — retrospective

## R1 · Re-rendering the bundle ran the new migration on this repository's own config

**Kind:** near-miss · **Area:** process · **Stage:** build · **Owner:** developer · **Raised by:** developer · **Promoted to:** none

**What happened:** Re-rendering the init asset with `aof work update` ran the new memory migration on
this repository's `.aof/aof.config.json`, which holds a root `graph: { "share": "git-refs" }`. The
installed payload the daemons run reads only the root `graph`, so a migration before the deploy
would have turned graph sharing off. The config was restored byte for byte after each update.

**Why:** The tool that renders the bundle is the tool the story changes, so every re-render in
this repository is also a run of the new behaviour against live config.

**Lesson:** When a story changes what `aof work update` writes, snapshot the host repository's
config before each re-render and restore it afterwards. Migrate the host only after the payload
that reads the new shape is installed.

**Refs:** milestone STATE `## Feedback (for retro)` (180/02, the re-render); 180/ADR-006.
