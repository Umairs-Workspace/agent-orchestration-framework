@executable @cli @work @scaffold
Feature: A domain nobody listed is new

  WHY. The safe reading of silence is "explain it to me" (SPEC Scope, third bullet: "`new` or
  unlisted"). So a domain the profile does not list is `new`, an undeclared profile makes every
  domain `new`, and nothing is refused for want of a profile (ADR-003 §3, §9). FF-19203 keeps the
  levels and the reading of `work.operator` in the one leaf.

  Rule: R3 · A domain nobody listed is new

    Scenario: E7 · an unlisted domain is new
      Given a resolved profile that lists only "fraud: expert"
      When the level of "tenancy-law" is asked
      Then it answers "new"
      And the level of "fraud" answers "expert"

    Scenario: E8 · with no profile anywhere, every domain is new and nothing is refused
      Given a fixture project and a global home, neither holding "work.operator"
      When "aof project validate" and "aof project show --json" run
      Then validation reports no "operator-profile-" diagnostic
      And "operator.declared" is false, with a null role and an empty expertise list
      And the level of any domain answers "new"

    Scenario Outline: declared means the profile says something
      Given a resolved profile from <block>
      When it is asked whether it is declared
      Then it answers <declared>

      Examples:
        | block                               | declared |
        | no block in either file             | false    |
        | an empty object                     | false    |
        | an empty expertise map only         | false    |
        | a role only                         | true     |
        | one expertise entry and no role     | true     |
        | a role only, in the global file     | true     |

    Scenario Outline: a level is looked up by the exact slug
      Given a resolved profile that lists "tenancy-law: working"
      When the level of "<asked>" is asked
      Then it answers "<level>"

      Examples:
        | asked        | level   |
        | tenancy-law  | working |
        | Tenancy-Law  | new     |
        | tenancy      | new     |
        | the empty string | new |

    Scenario: FF-19203 · the operator profile has one resolver
      When "test/arch/examples/acd-operator-profile-one-resolver.test.mjs" runs
      Then it fails if a runtime module other than "packages/contracts/src/operator-profile.mjs" spells the three levels as a vocabulary
      And it fails if a runtime module reads "work.operator" from a config other than through that module's resolver or merge
      And it reports the modules it swept, and fails if it found fewer than two importers of the leaf

    Scenario Outline: FF-19203 · each planted second reader turns the control red
      Given a runtime module with <planted> added
      When the FF-19203 sweep runs over that text
      Then it reports the module and the planted line

      Examples:
        | planted                                                     |
        | a literal list of "expert", "working" and "new"             |
        | a direct read of "config.work.operator.expertise"           |
        | a direct read of "config?.work?.operator?.role"             |
