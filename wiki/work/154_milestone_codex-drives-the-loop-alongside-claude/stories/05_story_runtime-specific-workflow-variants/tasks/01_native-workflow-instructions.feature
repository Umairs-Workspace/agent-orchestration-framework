@cli @adapter @distribution @executable
Feature: native workflow instructions

  Rule: R1 · Runtime variants preserve shared workflow gates and use native invocation

    Scenario: E1 · Codex refine contains usable native instructions
      Given the shipped refine procedure is rendered for Codex
      When its entry skill and referenced procedure are inspected
      Then they specify native skill invocation and supported question handling
      And they do not instruct Codex to use Claude slash commands or "/effort"
      And required scope, ownership and review gates remain present
    
    Scenario Outline: High-risk procedures preserve their workflow obligations
      Given the "<procedure>" procedure is rendered for each assistant
      When a fixture follows its entry and only its declared supporting references
      Then it can find "<obligation>" without loading unrelated procedures
    
      Examples:
        | procedure   | obligation                                      |
        | refine      | decisions, examples, contracts and final review  |
        | continue    | declared scope, tests, independent review, bounds |
        | verify      | evidence and honest acceptance                  |
        | review      | independent review and bounded rereviews        |
        | repair      | handover diagnosis and bounded repair           |
        | retrospective | shared memory recall and ingest vocabulary    |
        | delegate    | distinct primary runtime and optional delegation |
    
    Scenario: The full shipped inventory has a reviewable runtime audit
      Given all roles, procedures and skills listed by the shipped descriptor
      When the runtime prompt audit is recorded
      Then every member has a keep, adapt or extract decision with its reason
      And the audit records tool availability, permission claims, loaded context and referenced files
      And removed repetition is not counted as a correctness improvement without later behavioral evidence

