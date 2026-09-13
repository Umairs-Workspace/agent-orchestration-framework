@docs @work @design
Feature: The render runs through the cached Chromium, and this milestone says so in its own contract
  In order that the render lane uses a path that actually works here
  the bundled commands must name the cached-Chromium render invocation rather than `npx playwright`,
  and this contract must state that it supersedes the render-mechanism clause milestone 07 delivered.

  # THE SUPERSESSION IS STATED HERE, which is the only place it may be stated: the render mechanism
  # in force is the cached Chromium driven directly (`--headless=new`, `--screenshot=<absolute
  # forward-slash path>`), superseding the render-mechanism clause of 07/ADR-002 as carried by
  # 07/02's tasks 01 and 03. Those delivered .feature files are IMMUTABLE and are not touched by this
  # story; 07's verdict contract (CONFORMS / GAPS / INCONCLUSIVE) is untouched. The arch tests are
  # code and are amended (ADR-005 §2).
  #
  # Contract, not restated: the absence of `npx playwright` across the bundle, the survival of QA's
  # own Playwright lane, Playwright's absence from package.json, and that no file under wiki/work/07_*
  # is written by this milestone are all FF-7102.

  Background:
    Given a resolved base URL, a resolved renderer and a surface with a Route

  @executable
  Scenario Outline: the render invocation the commands name
    When "<command>" is read
    Then its design step names exactly one render invocation
    And that invocation drives the resolved renderer with "--headless=new"
    And it passes the output path to "--screenshot="
    And it passes the breakpoint's width to "--window-size="

    Examples:
      | command                         |
      | src/bundle/commands/continue.md |
      | src/bundle/commands/verify.md   |

  @executable
  Scenario Outline: each breakpoint is rendered at its own width
    Given a surface rendered at the <breakpoint> breakpoint
    When the render invocation is composed
    Then the width passed to "--window-size=" is <width>
    And the resulting image's width is <width>

    Examples:
      | breakpoint | width |
      | mobile     | 390   |
      | tablet     | 768   |
      | desktop    | 1280  |
      | a DESIGN-declared override | the width DESIGN declared |

  @executable
  Scenario Outline: the output path the render is given
    Given an output path expressed as <given>
    When the render invocation is composed
    Then the path passed to "--screenshot=" is <passed>

    Examples:
      | given                                   | passed                                 |
      | an absolute path with forward slashes   | that path, unchanged                   |
      | a path relative to the working directory | the same path, made absolute          |
      | an absolute path with backslashes       | the same path, with forward slashes    |
      | an absolute path containing a space     | that path, absolute and forward-slashed |

  @executable
  Scenario: one screenshot per surface per breakpoint, at that breakpoint's width
    When a surface is rendered
    Then one screenshot is produced for each breakpoint the surface is rendered at
    And each screenshot's width is the breakpoint it was taken at
    And each is written to its own output path

  @executable
  Scenario Outline: what the lane does when the render itself fails
    Given the render invocation <failure>
    When the lane reads its result
    Then the verdict is INCONCLUSIVE
    And the failure is recorded as the reason
    And no verdict is inferred from reading the component code

    Examples:
      | failure                                        |
      | exits non-zero                                 |
      | exits zero but writes no file at the named path |
      | writes a zero-byte file                        |
      | does not return within the step's own wait     |

  @executable
  Scenario: a successful render is what the designer is handed
    Given the render succeeded
    When the design lane continues
    Then the designer is handed the screenshot path or paths and the conformance baseline
    And the designer is not asked to run the browser itself

  @manual
  Scenario: a real surface renders on this machine
    When the cached-Chromium invocation is run against a served surface
    Then a screenshot file is produced at the named path
    And the designer returns a region-by-region verdict from it
