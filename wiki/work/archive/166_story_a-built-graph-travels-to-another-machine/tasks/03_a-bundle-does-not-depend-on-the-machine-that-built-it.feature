@cli @work @distribution
Feature: A graph bundle does not depend on the machine that built it — no source-machine path travels, and the carried cache still hits across CRLF and LF checkouts

  WHY. Measured at refine (graphify 0.8.44, this repo's graph): "graph.json", "manifest.json" and
  the AST cache are keyed by repo-relative path, so they travel as they are. Two files do not:
  "cache/stat-index.json" is keyed by the ABSOLUTE path of every file (a size-and-mtime shortcut
  that only ever skips a re-hash), and ".graphify_root" holds the absolute root of the last build.
  The second measured fact matters more for this operator's machines: the Windows clone checks
  out CRLF ("core.autocrlf=true") while WSL and the Mac check out LF. graphify's cache key is
  sha256 over the raw bytes, then a NUL, then the lower-cased relative path (for a ".md" file,
  the bytes below the frontmatter), so every key differs across those checkouts and a carried
  cache would never hit. Extraction itself was measured identical for a CRLF and an LF copy of
  the same file, so re-keying an entry to the receiving clone's bytes is sound.

  THE FIXTURE BELOW: a source repo at "<tmp>/win/aof" whose text files are CRLF, a clone at
  "<tmp>/wsl/aof" of the same commit whose text files are LF, and a hand-built
  "graphify-out/cache/ast/v0.8.44/" in the source keyed by graphify's formula over the CRLF bytes
  of "packages/a.mjs" and "docs/b.md".

  Rule: R4 · A bundle does not depend on the machine that built it

    @executable
    Scenario: E12 · no path from the source machine reaches the receiver's graph
      When the source repo exports to "<tmp>/carry/aof.graph" and the clone imports it
      Then no file in the bundle contains the string "<tmp>/win/aof", in either slash direction
      And the bundle holds no "cache/stat-index.json"
      And the clone's "graphify-out/.graphify_root" names the clone's own root
      And no file in the clone's "graphify-out/" contains the string "<tmp>/win/aof"

    @executable
    Scenario Outline: E15 · import re-keys the carried cache to the receiving clone's line endings
      Given the source's cache holds the entry for "<file>" under its CRLF key
      When the clone imports the bundle
      Then the clone's "cache/ast/v0.8.44/" holds that entry under the key graphify computes over the clone's LF bytes of "<file>"
      And the entry's content is byte-identical to the source's
      And the import result counts it under "rekeyed"

      Examples:
        | example | file           |
        | E15     | packages/a.mjs |
        |         | docs/b.md      |

    @executable
    Scenario Outline: an entry is carried only when it maps to a file this clone holds
      Given <case>
      When the clone imports the bundle
      Then <outcome>

      Examples:
        | case                                                                        | outcome                                                               |
        | the clone holds "packages/a.mjs" with the same line endings as the source   | the entry keeps its key and is counted under "kept"                   |
        | the clone's "packages/a.mjs" differs in content, not only in line endings   | the entry is dropped and counted under "dropped", and graphify re-extracts that one file |
        | the source's cache names "packages/gone.mjs", which the clone does not hold | the entry is dropped and counted under "dropped"                      |

    @manual
    Scenario: the carry works end to end from the Windows control node to the WSL worker
      Given "aof graph build ." has run on the Windows clone and "aof graph export" wrote a bundle
      And the WSL clone ("~/source/aof", LF checkout) is at the same commit with no "graphify-out/"
      When the bundle is imported there and "aof graph build . --json" runs in the WSL clone
      Then the build reports "unchanged": true and adds no entry to "graphify-out/cache/ast/"
      And "aof graph impact packages/knowledge/src/graphify.mjs --json" there answers the same dependents as on Windows
      And the timings, the import result and both impact answers are recorded in VERIFICATION.md
