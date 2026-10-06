@cli @work @work-stream @executable
Feature: resolution and inspection

  Rule: R1 · Execution selection is explicit and recorded independently of installed assets

    Scenario: E1 · Installing both assistants retains the Claude default
      Given runtimes "claude" and "codex" are installed with no execution-runtime setting
      When effective configuration is inspected
      Then the next execution runtime is "claude" with source "default"
      And installation and cross-assistant delegation are reported separately
    
    Scenario Outline: Runtime selection has visible precedence
      Given the runtime flag is "<flag>" and project loop runtime is "<config>"
      When a new run's execution is resolved
      Then the selected runtime is "<runtime>" with source "<source>"
    
      Examples:
        | flag   | config | runtime | source  |
        | absent | absent | claude  | default |
        | absent | codex  | codex   | project |
        | claude | codex  | claude  | flag    |
        | codex  | claude | codex   | flag    |
    
    Scenario Outline: Incompatible settings refuse before launch
      Given a Codex selection with "<setting>"
      When the operator inspects or launches it
      Then the diagnostic names the incompatible setting and its source
      And no assistant is silently substituted
    
      Examples:
        | setting                                      |
        | a Claude-only model alias                    |
        | an effort not supported by the chosen model  |
        | an unknown execution runtime                 |
        | a malformed runtime-scoped phase map         |
    
    Scenario: Phase settings and role settings remain distinct
      Given separate Codex phase-session and reviewer-role model settings
      And legacy Claude settings exist
      When effective settings for both runtimes are inspected
      Then each phase and role reports its own resolved value and source
      And scoped Claude settings override only matching legacy Claude values
      And Codex inherits no legacy Claude model aliases

