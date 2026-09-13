@executable @cli @work @validate
Feature: A bound whose value reaches no decision refuses every proposal on it

  For a knob that nothing acts on, the null hypothesis is exactly true: moving it cannot change any
  outcome, so every commit a trial on it could ever produce is false. Refusing such a proposal before
  any evidence is gathered is therefore not a saving on cost — it removes a whole class of proposals
  from the multiple-testing stream, and it is the cheapest control available because the answer needs
  no trial to reach.

  The word is CONSUMER, and the word is the entire control. A bound has a consumer when a resolved
  value reaches a decision on a path the program actually takes. It has a reader when some line merely
  fetches it. Two of the three knobs this system declares tunable are fetched on paths that
  demonstrably execute and are then thrown away without reaching any decision — computed and
  discarded. Worded on readers, this check finds a live reader for every declared knob and refuses
  none of them, which is how the same defect has now survived twice.

  So the contract is written so that it cannot be satisfied by producing a reader, and the
  uncomfortable consequence is stated rather than tuned around: on the repository as it stands, every
  knob declared tunable is refused. That is the correct answer. A change that turns this check green
  by relaxing what counts as consumption has broken it, not fixed it.

  ADR-008 §1, §2, §3. FF-6109.

  Scenario Outline: what the program does with a bound decides the verdict
    Given a bound declared as a ceiling by a loop record
    And a program that <treatment>
    When a proposal on that bound is assessed for admissibility
    Then the proposal is <verdict>

    Examples:
      | treatment                                                       | verdict                    |
      | never resolves the bound anywhere                               | refused, naming the bound  |
      | resolves it only inside the module that declares it             | refused, naming the bound  |
      | resolves it on a path that runs, then discards the value        | refused, naming the bound  |
      | resolves it into a composed policy nothing reads it back out of | refused, naming the bound  |
      | names it only inside a diagnostic message it prints             | refused, naming the bound  |
      | names it only in a shipped asset rather than in running code    | refused, naming the bound  |
      | resolves it and lets that value decide something it governs     | admitted for consideration |

  Scenario: a refused proposal costs no evidence at all
    Given a proposal on a bound whose value reaches no decision
    When the proposal is assessed
    Then it is refused before any observation is read
    And no trial is priced for it
    And nothing accrues towards a commit on its behalf

  Scenario: the refusal names the bound and tells resolution apart from consumption
    Given a proposal refused because nothing consumes the bound
    When the refusal is read
    Then it names the bound
    And it names the record that declares that bound a ceiling
    And it states that the bound still resolves, so a pointer that resolves is not read as a caller

  Scenario: the module that declares a bound is not accepted as its own consumer
    Given a bound whose value reaches a decision only inside the module that declares it
    When admissibility is assessed
    Then the proposal is refused
    And the declaring module is not counted as a consumer

  Scenario: composing a value into a policy is not consuming it
    Given a bound resolved into a policy object that several decisions read
    And no decision that reads that object reads this bound's field
    When admissibility is assessed
    Then the proposal is refused
    And the site that composes the policy is not counted as a consumer

  Scenario: every knob declared tunable is refused today, and the count is reported
    Given the repository as it stands
    When admissibility is assessed for every knob the registry declares tunable
    Then each one is refused for want of an executed consumer
    And the result reports how many were refused rather than reporting an absence of findings

  Scenario: the assessment says what it considered, and a run over nothing says so
    Given the set of bounds declared as ceilings
    When admissibility is assessed over that set
    Then the result reports how many bounds it considered
    And an assessment that considered none reports having run on nothing

  Scenario: a knob declared tunable later is judged by the same rule
    Given a bound newly declared tunable and whose value reaches no decision
    When admissibility is assessed
    Then it is refused by the same rule
    And no case is added for it by name
