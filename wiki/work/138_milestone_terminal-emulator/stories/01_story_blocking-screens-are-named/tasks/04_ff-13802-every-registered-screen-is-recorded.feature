@executable @cli @work @work-stream
Feature: FF-13802 — every registered screen is recorded, every recording is recognised as its own screen, and the input box is never a dialog

  ADR-002 §1, ADR-003 §1, §2, §4 and §7. `test/arch/terminal/acd-screen-registry-is-recorded.test.mjs`
  lands with this story, exports `archTests` and is registered by one import and one spread in
  `test/arch/terminal/index.mjs` (the 119/ADR-010 harness shape). It guards what task 01 proves
  today against the next entry or the next re-capture.

  RULINGS (PO, 2026-09-27). (1) The control reads the live registry and the live fixture directory,
  and asserts: every entry has `test/fixtures/claude-screens/<id>.json`; every fixture file names a
  registered id; every fixture's `claude` field is a version string or begins `synthetic:`;
  rendered through `screen.mjs`, each fixture is recognised by its own entry and, among the
  frame-deciding entries, by no other (task 01, PO ruling 5); `ready` recognises no fixture of a
  `consent` or `fail` entry; and every `consent` entry has a non-empty `option` that is an item of
  its own fixture's menu, as the door reads the menu (ADR-003 §4 as amended 2026-09-27: the door
  navigates to the option, so the option need not be the highlighted default). (2) Each assertion is proved not vacuous by a plant against a copy
  of the registry or of the fixture list, never by editing the live files (the m03 self-check).
  (3) The red probe of the live control goes in `VERIFICATION.md`'s fitness register: what was
  changed, and the message observed. The `pending` token on FF-13802's register row in
  `ARCHITECTURE.md` is removed when the file lands.

  RULINGS (QA, 2026-09-27). (1) A violation names the entry or the fixture and the rule it broke.
  One plant may break two rules (a `ready` that claims a dialog breaks exclusivity and the
  input-box rule), so a case asserts the violation it planted, not a total. (2) The plants cover
  each rule at least once.

  Scenario: the live registry and recordings are green
    When `node scripts/test.mjs --only test/arch/terminal/acd-screen-registry-is-recorded.test.mjs` is run under an isolated `AOF_GLOBAL_HOME`
    Then it runs a non-zero number of cases and exits 0

  Scenario Outline: each breach turns the control red, naming what broke
    Given a copy of the registry and the fixtures with <plant>
    When FF-13802's detector is asked of that copy
    Then it reports a violation naming <named>

    Examples:
      | plant                                                                                  | named                                                  |
      | an entry `update-notice` added with no recording                                        | `update-notice` and the missing recording              |
      | a recording `orphan.json` added that no entry names                                     | `orphan.json` and the missing entry                    |
      | `login.json`'s `claude` field removed                                                   | `login.json` and the missing version                   |
      | `login`'s recogniser replaced by one that also claims `first-run.json`                  | `first-run.json`, `first-run` and `login`              |
      | `ready`'s recogniser replaced by one that answers yes wherever a row contains `❯`       | `ready`, `first-run.json` and the input-box rule       |
      | `trust`'s `option` set to the empty string                                              | `trust` and its missing option                         |
      | `trust`'s `option` set to `Always trust this folder`                                    | `trust` and the option absent from its menu            |

  Scenario: the register and the evidence are brought up to date
    When the story is handed to review
    Then FF-13802's row in `ARCHITECTURE.md`'s register no longer carries `pending`, and `VERIFICATION.md`'s FF-13802 row holds a red probe and its message
