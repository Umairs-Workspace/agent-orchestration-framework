@executable @ui @work @board
Feature: The diagram dock's posture author and the terminal's later-input seam leave with the dock

  WHY. m171/ADR-005 gave the terminal control one seam — a later input typed into a running session —
  and the diagram surface a posture author for its dock. ADR-003 §4 retires the dock: once the
  surface renders none (story 02), both have no caller, and a seam nothing calls is a seam someone
  will re-wire by accident. Removing them is only finished when every control that listed them
  agrees.

  Scenario: the diagram surface holds no dock module
    When the files of "apps/ui/src/diagram" are listed
    Then they are "DiagramSurface.tsx", "diagram-address.mjs" and "diagram-address.d.mts"
    And no source file under "apps" or "packages" imports "diagram/dock-mount"

  Scenario: the terminal control takes no later input
    When the props of the terminal control are read
    Then none is named "laterInputs", "onLaterInput" or "onSessionReady"
    And "input-policy.mjs" exports no "flushLaterInputs"

  Scenario: the mount's own command is still typed once the session is ready
    Given a terminal control whose mount carries the command "/aof:refine 07"
    When the session's screen first shows its ready input box
    Then the command is typed once, as one paste and a separate Enter

  Scenario: the surface table lists only the surfaces that render a terminal
    When the input-constraint control reads its surface table
    Then it holds the fleet page, the board dock and the terminals home
    And it holds no row for the diagram editor

  Scenario Outline: each control that named the dock agrees it is gone
    When <control> runs
    Then it passes with no entry for the diagram dock

    Examples:
      | control                                                   |
      | the posture-home sweep of invariant 4                     |
      | the UI directory budget's "diagram" row                   |
      | the source directory budget's "apps/ui/src/diagram" row   |
      | the terminal control boundary test                        |
