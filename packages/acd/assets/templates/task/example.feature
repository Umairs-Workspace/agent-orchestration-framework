# Task feature — answers ONE question: what is observably true when this task is done?
# Lives at  <story>/tasks/NN_<slug>.feature  inside a story, OR as a standalone NN_task_<slug>/ item (adhoc).
# Owner: product-owner, co-authored Three Amigos (PO writes the headline Scenarios; QA writes the
#   Examples tables; developer checks feasibility).
#
# NO user story here — that belongs to the parent STORY.md. Use an optional one-line objective.
# Membership in a story/milestone is STRUCTURAL (the folder + parent), never a tag.
#
# LITMUS for every line: could a black-box tester confirm this WITHOUT reading the source?
#   yes -> observable outcome, keep it.   no -> a decision/invariant, move it (ADR / fitness function).
#
# SIZE IS PART OF THE CONTRACT. This template is ~45 lines; past 150 you are writing prose, past 300
#   it is a defect. Rationale, vocabulary and design history live in ARCHITECTURE.md / DESIGN.md —
#   cite them by reference (ADR-008, DESIGN S4.1), never by quotation (a copy is a second source of
#   truth that goes stale where it sits). Push enumeration into Examples tables, not prose.
#
# Tags: exactly one VERIFICATION tag (@executable | @manual) + layer/refinement/domain from project config.
#   @executable -> mapped to a passing test, enforced by the traceability lint.
#   @manual     -> verified by a procedure in the milestone UAT.md (which points back with `verifies →`).

@<layer> @<refinement> @<domain> @executable
Feature: <task name — one coherent unit of work>
  In order to <the objective this task serves>
  the system must <the capability>          # optional goal line — NOT a user story

  Background:
    Given <a shared precondition stated as an observable fact>

  # A headline Scenario: one of the few behaviours that define "done".
  Scenario: <a single observable behaviour>
    When <an action>
    Then <an observable result — black-box confirmable>

  # A Scenario Outline: the test-case MATRIX. Keep the template readable; push the enumeration
  # (every status code, boundary, malformed input) into the Examples table.
  Scenario Outline: <behaviour> maps <input> to <result>
    When <action with <input>>
    Then it yields <result>

    Examples:
      | input    | result          |
      | <case a> | <expected a>    |
      | <edge>   | <expected edge> |

  # A @manual scenario: same shape, verified by a human; its procedure lives in the milestone UAT.md.
  @manual
  Scenario: <something only a human / live environment can confirm>
    When <action in the real environment>
    Then <observable result a human checks>
