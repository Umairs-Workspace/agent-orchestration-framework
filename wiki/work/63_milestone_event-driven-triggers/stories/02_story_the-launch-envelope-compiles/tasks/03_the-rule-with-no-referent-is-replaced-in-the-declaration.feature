@executable @cli @assets @distribution
Feature: The rule with no referent is replaced, in the declaration, by a launch a runner can resolve

  The rule this member has carried is a spelling with no referent. It reads like a rule and behaves like
  a comment: no runtime accepts the argument it names, so honouring it literally would break every
  launch, and honouring it by ignoring it is enforcement in name only. A declaration is reviewable
  exactly to the extent that its members can be checked against something real, and a member whose rule
  names nothing cannot be checked against anything.

  So the change is a change to the declaration, and the whole point is that a reviewer sees it there. A
  rule that moved into code while the declaration kept its old spelling would satisfy every test written
  about behaviour and fail the one thing a frozen set is for — being the artifact a person reads to
  learn what is enforced.

  The member's identity does not move with its rule. Its id, what it protects and the enforcement point
  that carries it are already read as a pair by a delivered guard, and a re-declaration that renamed the
  member or re-pointed it would be closing the record rather than the gap it was opened for.

  Two copies, one declaration. The copy a workspace runs is installed from the copy aof ships, and a
  change that reached only the shipped source would leave every workspace that has not updated resolving
  the old spelling — which is the drift this delivery path exists to prevent, and the failure that hides
  longest because both files exist and both parse.

  ADR-005 §1, §4. FF-6305.

  Scenario: the envelope member's rule names a program and the arguments that carry it
    Given the frozen set aof ships
    When the envelope member's rule is read
    Then it names a program a runner can resolve
    And it names the leading arguments an unattended run may carry
    And it names no argument the runtime would reject

  Scenario Outline: what the re-declaration keeps and what it changes
    Given the envelope member before and after the re-declaration
    When <field> is compared
    Then it is <outcome>

    Examples: one field changes and the member's identity does not
      | field                     | outcome                                     |
      | its id                    | unchanged                                   |
      | what it protects          | unchanged                                   |
      | its enforcement point     | unchanged                                   |
      | its ownership marker      | unchanged                                   |
      | its rule                  | a launch shape in place of a bare argument  |

  Scenario: the declaration a workspace runs is the declaration aof ships
    Given the declaration in the bundle and the copy installed in this workspace
    When the two are read as bytes
    Then they are identical
    And the envelope member's rule is the same rule in both

  Scenario: a workspace updated from the bundle carries the re-declared member
    Given a workspace holding the previous declaration
    When the bundle is installed over it
    Then the envelope member in that workspace names the re-declared launch
    And no other member changes

  Scenario: the rule is load-bearing rather than decorative
    Given a workspace whose envelope member declares a launch of its own
    When an unattended launch is resolved there
    Then the answer follows what that workspace declares
    And it does not follow a launch fixed anywhere outside the declaration

  Scenario: the member is still a line a reviewer can retract
    Given the frozen set aof ships
    When the envelope member is removed from the declaration
    Then the compiled set produces no unattended launch shape
    And every other enforcement point compiles exactly as it did
