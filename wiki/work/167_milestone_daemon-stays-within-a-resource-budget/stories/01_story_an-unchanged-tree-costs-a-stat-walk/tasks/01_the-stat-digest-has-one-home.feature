@executable @cli @work @distribution
Feature: The stat digest has one home

  WHY. The sync pass already fingerprinted a work tree by `(path, size, mtimeMs)` to decide
  whether to look (164/ADR-002), but that function lived in the mesh package, where the work
  reader cannot reach it. A second copy would be two answers to "has this tree changed". It now
  lives with the one enumerator of the tree, and the sync pass imports it.

  Background:
    Given a generated work tree "aof" of 1800 record docs

  Rule: R3 · The stat digest has one home

    Scenario: E6 · the sync pass and the read memo agree on a tree's digest
      When the sync pass's stat gate and the stream read both fingerprint "aof"
      Then they compute the same digest

    Scenario Outline: the digest moves exactly when a record doc's stat moves
      Given the digest of "aof" has been taken
      When <change>
      Then the digest of "aof" <moves>

      Examples:
        | change                                                    | moves         |
        | nothing is changed                                        | is unchanged  |
        | one STORY.md is rewritten with different content          | changes       |
        | one task .feature is added                                | changes       |
        | a file that is neither a .md nor a .feature is added      | is unchanged  |

    Scenario: the sync pass still skips an unchanged workspace after the move
      Given workspace "aof" was synced and nothing has changed since
      When the sync pass runs for "aof"
      Then it reports the workspace unmoved without reading a record doc
