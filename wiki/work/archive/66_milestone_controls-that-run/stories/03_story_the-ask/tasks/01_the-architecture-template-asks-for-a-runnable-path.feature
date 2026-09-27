@docs @assets @distribution
Feature: ACD asks for a control it can resolve, at the moment the control is declared

  A CHECK WITH NO ASK IS A TRAP. ACD's gates are met by agents reading `src/bundle/` prompts and
  templates. A refusal that no prompt ever asked for arrives as a surprise at `validate`, and the
  agent's only recovery is to guess. That is the finding's §1b shape seen from the other side — a
  cure prescribed in a retrospective, called "one command", which nobody ran, in the milestone that then
  shipped 38× the defect density of the milestone the lesson was written about.

  THE SHIPPED TEMPLATE IS PART OF THE DEFECT. `src/bundle/templates/milestone/ARCHITECTURE.md:35-37`
  renders a fitness table WITH NO ID COLUMN — so ACD asks architects to declare invariants it gave
  them no way to name, and 40 of 43 fitness tables in this repo duly carry no ids. A register with
  no ids declares nothing and can be checked for nothing.

  ACD ALSO ASKS FOR GUARDS AHEAD OF THEIR SUBJECT WITH NOWHERE TO PUT THEM. That instruction is
  right, and the hole it falls into is measured: 8 of 13 staged guards changed on contact with a
  runner. The instrument this task ships is the declaration itself — id, invariant, intended path,
  source ADR — as the reviewable artifact, with the `pending` token as the honest way to say a
  control is known-absent. Not a staging folder, which is prohibited.

  THE FIFTH ASK IS THE CITATION FORM (ADR-009/I). `register-dangling-citation` is an `error`, and
  ADR-007 §1 forbids a refusal with no ask — so the cross-file form and "cite only ids that
  resolve" ship here beside the other four. The `m` prefix is optional because both spellings are
  real in this tree: 430 citations written `m52/ADR-007` against 1,756 bare `52/ADR-007`.

  # Verification split per scenario. A rule's PRESENCE in a named file, the frozen wording it is
  # written in, and the detectability of its removal are all machine-readable, so they are
  # @executable. The one @manual scenario is a human reading two prompts side by side for whether
  # they AGREE in effect — a judgment no assertion makes, and the honest residue once the shared
  # sentence is pinned byte-for-byte below.

  @executable
  Scenario Outline: each rule lands in the file whose reader must obey it
    Given the shipped bundle once this task lands
    When I read "<file>"
    Then it carries the rule that "<rule>"
    And the same rule present only in some OTHER bundle file does not satisfy this row

    Examples:
      | file                                  | rule                                                                              |
      | `templates/milestone/ARCHITECTURE.md` | the fitness table's first column is `id`, and the id stands alone in its cell      |
      | `templates/milestone/ARCHITECTURE.md` | each row names the INTENDED PATH of the arch-test that will enforce the invariant  |
      | `templates/milestone/ARCHITECTURE.md` | a control whose file has not landed carries the token `pending` in its own entry   |
      | `templates/milestone/ARCHITECTURE.md` | another item's id is cited as `m?<itemRef>/<ID>`, and only ids that resolve are cited |
      | `commands/refine.md`                  | a declared control must resolve to a path a runner can see                         |
      | `commands/refine.md`                  | a test-shaped file under the work tree is NOT that place                           |
      | `commands/refine.md`                  | the token `pending` is how a guard authored ahead of its subject is declared        |
      | `commands/refine.md`                  | cite only ids that resolve, in the cross-file form the check answers                |
      | `agents/aof-architect.md`             | the same four: id-first declaration, intended path, the `pending` token, and the citation form |

  @executable
  Scenario: the shared rule is one sentence, not two paraphrases
    Given the declare-where-a-runner-can-see-it rule as it ships in `commands/refine.md` and `agents/aof-architect.md`
    Then the rule sentence is byte-identical in both files
    And a paraphrase in either is reported, because two wordings of one rule become two rules within a milestone

  @executable
  Scenario: `pending` is a dated statement of a known-absent control, not a parking space
    Given an architect declaring a guard at refine, before its subject exists
    When they read the shipped guidance
    Then it tells them to declare the intended path and carry the `pending` token in that declaration's own entry
    And it tells them the token is what the marker is, so no cell position or bullet shape is prescribed
    And it tells them a `pending` control reports at warn while the item is open, and is not admitted once the item is done
    And it tells them not to park the file anywhere under the work tree in the meantime

  @executable
  Scenario: the citation form the ask teaches is the form the check resolves
    Given `register-dangling-citation` refuses an id that does not resolve
    When an architect reads the shipped guidance on citing another item's id
    Then it teaches the cross-file form with the `m` prefix optional, which is the form story 66/02 answers
    And it says a bare id is addressable only inside its own item's documents, so a cross-item citation carries the ref
    And an ask that taught only one of the two real spellings would refuse work it had told an author to write

  @executable
  Scenario Outline: the guidance is explicit about which places count
    Given the shipped guidance on where a declared control lives
    Then "<place>" is described as "<ruling>"

    Examples:
      | place                                                | ruling                                                                    |
      | a path in the runnable test tree, named by a runner  | the place a control belongs                                               |
      | a test-shaped file under `work.dir`                  | prohibited — the staging folder this milestone refuses                    |
      | a `reference/` file renamed out of every glob        | the one admitted exception, a RETIRED suite rather than a staged one      |
      | an invariant with no path at all                     | not a declaration a reviewer or a check can act on                        |
      | a path that does not exist yet, its entry carrying the `pending` token | admitted while the item is open, refused at accept       |

  @executable
  Scenario: the architecture template's placeholder row declares nothing
    Given the shipped `ARCHITECTURE.md` template's fitness table
    Then its placeholder id cell is a bracketed placeholder rather than an id in the frozen namespace
    And a freshly-scaffolded document therefore declares no control it was never given

  @executable
  Scenario Outline: no refusal exists that the bundle never asked for
    Given the eight doctor codes frozen in ADR-003 §5
    When "<code>" is raised against an author's work
    Then the ask that would have prevented it is carried by "<asked by>"

    Examples:
      | code                           | asked by                                                                                        |
      | register-duplicate-id          | `commands/verify.md` and the five reviewing agents, per task 02                                 |
      | register-dangling-citation     | the citation form — this task's fifth ask, in the architecture template, `commands/refine.md` and `agents/aof-architect.md` |
      | verification-register-missing  | `templates/milestone/VERIFICATION.md`, per task 00                                              |
      | verification-missing-red-probe | `templates/milestone/VERIFICATION.md` and `commands/verify.md`                                  |
      | control-unresolved             | `commands/refine.md`, `agents/aof-architect.md` and the architecture template                   |
      | control-unregistered           | `commands/refine.md` and `agents/aof-architect.md`                                              |
      | control-runner-unchecked       | nothing, and correctly so: it is always a warn about the checker's own coverage, never a refusal an author could have prevented |
      | staged-control                 | `commands/refine.md`, in the prohibition on a staging folder                                    |

  @executable
  Scenario: the guard asserting the ask has itself been seen to fail
    Given the guard that asserts these rules are present in the bundle
    When a copy of one named file has its rule sentence removed
    Then the guard fails, naming that file and that rule
    And the same words present in a DIFFERENT bundle file do not keep it green, because a token found anywhere is the vacuous guard this milestone exists to refuse

  @manual
  Scenario: the two prompts are read side by side, because two asks that disagree are worse than one
    Given `commands/refine.md` and `agents/aof-architect.md` once this task lands
    When an architect reads both in one sitting
    Then neither qualifies, narrows nor contradicts the other's version of the rule
    And a disagreement is a finding against this task rather than a matter of preference
