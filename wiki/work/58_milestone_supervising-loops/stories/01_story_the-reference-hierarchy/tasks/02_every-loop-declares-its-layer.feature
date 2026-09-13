@executable @cli @assets @validate
Feature: Every loop declares the timescale it runs at

  A hierarchy needs a second axis. The first says who sets whose reference; without the second,
  nothing says whether the node above turns slower than the node below — and an outer loop that is
  not slower than its inner loop does not supervise it, it fights it.

  Every declared loop now carries the layer it runs at: operational, management or governance. The
  declaration is not taken on trust. Six of the seven trigger on a scope — a run start, a phase, an
  item, a milestone — and that scope corroborates the layer they claim. The seventh runs on a clock,
  a clock says nothing about scope, and its record argues its layer instead of claiming a
  corroboration it does not have. An uncorroborated layer is admissible only where it is argued, and
  the registry ships exactly one.

  The restraint is that the layer belongs to cycles and to nothing else. A node with no cadence has
  no place on this axis and declares none, and no duration is derived from a layer or from a trigger.

  ADR-002 §1, §3, §4, §7. FF-5806.

  Scenario: every declared loop carries a layer
    Given the registry as it ships
    When it is loaded
    Then every declared loop declares a layer

  Scenario: a declared layer is one of the three the vocabulary admits
    Given the registry as it ships
    When each declared layer is read
    Then it is operational, management or governance

  Scenario: a declared layer agrees with the scope its cadence names
    Given the registry as it ships
    When a loop's cadence names a scope
    Then the layer it declares is the layer that scope implies

  Scenario: exactly one layer rests on argument, and its record makes the argument
    Given the registry as it ships
    When the loops whose cadence names no scope are counted
    Then there is exactly one, and its own record defends the layer it declares

  Scenario: a node that is not a loop declares no layer
    Given the registry as it ships
    When the actor, anchor, watcher and arbiter records are read
    Then none of them declares a layer

  Scenario: a loop that sets another loop's reference sits exactly one layer above it
    Given the registry as it ships
    When each edge between two loops is read
    Then the loop setting the reference is one layer slower than the loop receiving it

  Scenario: no loop sets the reference of a loop at its own layer or a slower one
    Given the registry as it ships
    When each edge between two loops is read
    Then no loop receives its reference from a loop at its own layer or below it

  Scenario: a layer never becomes a duration
    Given the registry as it ships
    When two loops are compared on this axis
    Then they are compared by order alone and no interval is derived from either

  Scenario Outline: the day-one layer assignment
    Given the registry as it ships
    When <loop> is examined
    Then its cadence is <cadence>, its layer is <layer>, and that layer is <standing>

    Examples: seven loops on three layers — six layers corroborated by the scope the cadence names, one argued in its own record and named here
      | loop                             | cadence               | layer       | standing                     |
      | loop:build-to-green              | event:per-phase       | operational | corroborated by its scope    |
      | loop:review-fix-rereview         | event:per-phase       | operational | corroborated by its scope    |
      | loop:run-resilience              | event:per-run-start   | operational | corroborated by its scope    |
      | loop:mesh-assignment-reclaim     | periodic:15s          | operational | argued in its own record     |
      | loop:autonomous-cascade          | event:per-item        | management  | corroborated by its scope    |
      | loop:verify-triage-accept        | event:per-item        | management  | corroborated by its scope    |
      | loop:retrospective-memory-ingest | event:per-milestone   | governance  | corroborated by its scope    |
