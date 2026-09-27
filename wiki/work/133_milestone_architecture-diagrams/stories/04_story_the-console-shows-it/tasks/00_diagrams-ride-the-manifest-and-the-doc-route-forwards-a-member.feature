@executable @cli @work @board
Feature: a diagram's SVG is a member of the artifact manifest, and the doc route forwards the member it is asked for

  WHY. A diagram drawn on a worker must reach the console on the control node the way every other
  record does. ADR-007 §2 puts it on the ONE path already built for that: the artifact manifest's
  directory kind, which `TASKS` (`tasks/*.feature`) uses today. One entry,
  `{ name: "DIAGRAMS", dir: "diagrams", ext: ".svg" }`, makes `work:doc <ref> DIAGRAMS <member>`
  requestable, streamed by the worker's sync and held by the cache, with no new route and no new
  reader. Measured at refine: `/api/work/doc` passes only `{ ref, doc }` and drops any `member`
  param, so a member could never be asked for from the board. The fix is one forwarded key.

  RULINGS (QA, 2026-09-23).
  (1) Only the SVG rides. The HTML source needs fonts and a browser frame, and the PNG is binary.
      `.html`, `.png` and anything nested one level deeper are outside the set (ADR-007 §1).
  (2) The route forwards `member` only when the param is present and non-blank. A request without
      one is byte-identical to today's, so every existing caller is unchanged.
  (3) An absent diagram is an ABSENT doc (the shape an absent `VERIFICATION.md` answers), not a
      thrown error, so the board can draw its "missing" figure without a special case.

  Background:
    Given `WORK_ITEM_ARTIFACTS` and `artifactForRelativePath` are imported from `src/work/artifacts.mjs`
    And a fixture project `P` in a fresh temp directory, with `AOF_GLOBAL_HOME` set to another fresh temp directory
    And `P` holds milestone `07_milestone_m` whose `diagrams/` holds `ADR-002-seam.html`, `ADR-002-seam.svg` and `ADR-002-seam.png`

  Scenario: the manifest holds one diagrams entry, after TASKS
    When `WORK_ITEM_ARTIFACTS` is read
    Then exactly one entry has `dir: "diagrams"`, and it deep-equals `{ name: "DIAGRAMS", dir: "diagrams", ext: ".svg" }`
    And it is the last entry, after `TASKS`
    And every entry that was there before keeps its value and its relative order
    And `WORK_ITEM_DOC_FILES` is unchanged

  Scenario Outline: membership is the SVG, one level deep
    When `artifactForRelativePath(<path>)` is asked
    Then it answers <answer>

    Examples:
      | path                               | answer                                            |
      | `"diagrams/ADR-002-seam.svg"`      | `{ name: "DIAGRAMS", member: "ADR-002-seam.svg" }` |
      | `"diagrams\\ADR-002-seam.svg"`     | `{ name: "DIAGRAMS", member: "ADR-002-seam.svg" }` |
      | `"diagrams/ADR-002-seam.html"`     | `null`                                            |
      | `"diagrams/ADR-002-seam.png"`      | `null`                                            |
      | `"diagrams/old/ADR-002-seam.svg"`  | `null`                                            |
      | `"diagrams/ADR-002-seam.SVG"`      | `null`                                            |
      | `"tasks/00_a.feature"`             | `{ name: "TASKS", member: "00_a.feature" }`       |

  Scenario: the doc command answers a diagram member
    When `aof work doc 07 DIAGRAMS ADR-002-seam.svg --json` is run in `P`
    Then it exits 0
    And its body is the bytes of `P/wiki/work/07_milestone_m/diagrams/ADR-002-seam.svg`

  Scenario Outline: what the doc command refuses or reports absent
    When `work:doc` is asked for `{ ref: "07", doc: "DIAGRAMS", member: <member> }` in `P`
    Then it answers <answer>

    Examples:
      | member                   | answer                                         |
      | `"ADR-009-none.svg"`     | an absent doc, not a thrown error              |
      | `"ADR-002-seam.html"`    | the coded refusal a `TASKS` member outside its extension gets today |
      | omitted                  | the coded refusal a `TASKS` request with no member gets today       |

  Scenario Outline: the board route forwards the member, and only when there is one
    Given the board face is served over `P` on an ephemeral port
    When `GET /api/work/doc` is requested with <query>
    Then the response is <response>

    Examples:
      | query                                            | response                                                        |
      | `ref=07&doc=DIAGRAMS&member=ADR-002-seam.svg`    | 200, whose body is the SVG's bytes                              |
      | `ref=07&doc=DIAGRAMS&member=%20`                 | the same coded refusal as `work:doc` with no member             |
      | `ref=07&doc=SPEC`                                | byte-identical to the response before this change               |

  Scenario: a worker streams the SVG and never the source or the PNG
    Given the artifact sync's enumeration of `07_milestone_m`
    When the members it would stream are listed
    Then they include `diagrams/ADR-002-seam.svg` under `DIAGRAMS`
    And they include neither `diagrams/ADR-002-seam.html` nor `diagrams/ADR-002-seam.png`

  Scenario: a diagram another node reported is answered from the cache, with its provenance
    Given the global store holds a `DIAGRAMS` member `ADR-002-seam.svg` for `07`, reported by node `node-a1b2`, and `P` holds no such file
    When `work:doc` is asked for that member
    Then it answers the cached body, with `reportedBy: "node-a1b2"` and the row's `syncedAt`
