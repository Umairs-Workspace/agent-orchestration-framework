@executable @cli @work @work-stream
Feature: STATE.md merges by union, and only STATE.md

  ADR-002 §5. Two lanes appending to one milestone's `STATE.md` (`## Notes`, `## Feedback (for
  retro)`) at the same base is the COMMON case of a wave, and a textual conflict on an append-only
  narrative would halt every wave. `.gitattributes` gains exactly one line —
  `wiki/work/**/STATE.md merge=union` — git's built-in union driver, which keeps both sides of a
  conflicting hunk in ours-then-theirs order. STATE.md's frontmatter is `doc: state` alone, so
  there is no `updated:` line for a union to duplicate. Nothing else is union-merged: `TECH_DEBT.md`
  carries numbered entries a union would duplicate, `VERIFICATION.md` is a single-writer register,
  `loops.md` is a byte-compared projection, a task `.feature` is a contract — every one of those
  still conflicts and halts (task 02). The attribute names neither `text` nor `eol`, so
  `acd-runs-eol-pinned`'s `unspecified` control file (`SPEC.md`) stays unspecified for `text`
  and `eol`, and the `.sh` pin is untouched. Proven with git's own matcher (`git check-attr`) and
  git's own merge, never a literal grep of the attributes file.

  Background:
    Given this repository's `.gitattributes`

  Scenario Outline: the union attribute matches the real STATE.md paths and nothing beside them
    When `git check-attr merge -- <path>` is asked in this repository
    Then it reports `<path>: merge: <merge>`

    Examples:
      | path                                                       | merge       |
      | `wiki/work/127_m/STATE.md`                                 | union       |
      | `wiki/work/127_m/stories/02_s/STATE.md`                    | union       |
      | `wiki/work/STATE.md`                                       | union       |
      | `wiki/work/127_m/SPEC.md`                                  | unspecified |
      | `wiki/work/TECH_DEBT.md`                                   | unspecified |
      | `wiki/work/127_m/VERIFICATION.md`                          | unspecified |
      | `wiki/work/loops.md`                                       | unspecified |
      | `wiki/work/127_m/stories/02_s/tasks/00_t.feature`          | unspecified |
      | `STATE.md`                                                 | unspecified |
      | `wiki/work/127_m/STATE.md.bak`                             | unspecified |

  Scenario Outline: text and eol stay as they were
    When `git check-attr text eol -- <path>` is asked in this repository
    Then both report `<path>: text: <text>` and `<path>: eol: <eol>`
    And `test/arch/bundle/acd-runs-eol-pinned.test.mjs` is green unchanged

    Examples:
      | path                                                      | text        | eol         |
      | `wiki/work/26_milestone_distributed-runs-leasing/SPEC.md` | unspecified | unspecified |
      | `wiki/work/127_m/STATE.md`                                | unspecified | unspecified |
      | `scripts/deploy-wsl.sh`                                   | set         | lf          |

  Scenario Outline: two lanes' edits to one STATE.md merge clean under union, both kept
    Given a fixture repository committing this repository's `.gitattributes` and a `wiki/work/127_m/STATE.md` whose frontmatter is `doc: state` alone, ending in `## Notes` then `- base note`, at base B0
    And lane A for `127/01` <lane A> and lane B for `127/02` <lane B>, each in one commit from B0
    When lane A is merged into `main` and then lane B is merged into `main` through `mergeDispatchLaneHome`
    Then the first merge answers `"fast-forwarded"` and the second answers `"merged"`, and `git rev-parse -q --verify MERGE_HEAD` exits non-zero
    And `main`'s `STATE.md` <result> and contains no `<<<<<<<`, `=======` or `>>>>>>>` line
    And `main`'s `STATE.md` begins with exactly one `---` / `doc: state` / `---` block

    Examples:
      | lane A                                        | lane B                                          | result                                                                     |
      | appends `- A's note` after `- base note`      | appends `- B's note` after `- base note`        | ends `- base note`, `- A's note`, `- B's note` in that order               |
      | appends `- same` after `- base note`          | appends `- same` after `- base note`            | ends `- base note`, `- same` — one copy                                    |
      | appends `- A's note` under `## Notes`         | appends `- B's feedback` under a new `## Feedback (for retro)` | contains both `- A's note` and `- B's feedback` |
      | rewrites `- base note` as `- base note A`     | rewrites `- base note` as `- base note B`       | contains `- base note A` then `- base note B` and no `- base note` line    |

  Scenario Outline: a same-hunk collision on a non-union record doc still conflicts
    Given a fixture repository committing this repository's `.gitattributes` and a tracked `<doc>` at base B0
    And lane A for `127/01` <lane A> and lane B for `127/02` <lane B>, each in one commit from B0
    When lane A is merged and then lane B is merged through `mergeDispatchLaneHome`
    Then the second merge answers `{ outcome: "conflict", code: "lane-merge-conflict", ref: "127/02" }`
    And `git rev-parse -q --verify MERGE_HEAD` in the primary exits non-zero and `git show main:<doc>` is byte-identical to `git show aof/mesh/127-01:<doc>`
    And `git rev-parse aof/mesh/127-02` is lane B's tip and no file in the primary contains a conflict marker

    Examples:
      | doc                                              | lane A                                  | lane B                                  |
      | `wiki/work/127_m/VERIFICATION.md`                | rewrites the `F-1` row as `F-1 \| A`    | rewrites the `F-1` row as `F-1 \| B`    |
      | `wiki/work/127_m/VERIFICATION.md`                | appends a row `F-2 \| A` after `F-1`    | appends a row `F-2 \| B` after `F-1`    |
      | `wiki/work/TECH_DEBT.md`                         | appends `## 5. A` at the end            | appends `## 5. B` at the end            |
      | `wiki/work/127_m/stories/02_s/tasks/00_t.feature` | rewrites the `Then` line as `Then A`    | rewrites the `Then` line as `Then B`    |

  Scenario: the attributes file carries exactly one merge attribute
    When every non-comment line of `.gitattributes` is read
    Then exactly one carries the token `merge=`, and that line is `wiki/work/**/STATE.md merge=union`
    And every other non-comment line names only `text` and `eol` attributes, as before this story
    And the line may be preceded by a comment block in the file's own style
