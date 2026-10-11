@cli @assets @work-stream @manual
Feature: prompt behavior evaluation

  Rule: R1 · Support claims require recorded live evidence and preserved workflow correctness

    Scenario: Prompt evaluation uses a frozen representative workload
      Given the audit defines refine, build-review-fix, blocking-question and repair cases before measurement
      And the same revision, workload, model and effort are held constant within each runtime comparison
      When baseline and optimized variants each run at least three times per case
      Then the report records correctness, scope escapes, missed gates, unnecessary questions, elapsed time and available usage
      And it identifies unavailable metrics rather than inferring zero
      And it separates within-runtime optimization from cross-runtime comparison
    
    Scenario: Cheaper prompts cannot pass by dropping obligations
      Given an optimized variant reduces loaded words or observed tokens
      When its evaluation misses a gate, escapes scope or weakens independent review
      Then the variant is not accepted as an optimization
      And the failed case and retained or reverted variant are recorded
    
    Scenario: An unavailable historical Codex baseline is disclosed
      Given the previous Codex assets cannot execute a required workflow
      When the first correct native variant is evaluated
      Then it becomes the recorded functional baseline for subsequent optimization
      And the report makes no fabricated before-and-after speed or cost claim
    
    Scenario: Accepted optimization retains shared contracts
      Given an optimized variant preserves every required correctness check
      When repeated results show its loaded-context or measured execution improvement
      Then the report states the measured benefit and variability
      And Claude regression evidence remains a separate acceptance requirement

